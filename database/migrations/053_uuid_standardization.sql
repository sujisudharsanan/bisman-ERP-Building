-- ============================================================================
-- Migration 053: UUID Standardization for Core Tables
-- ============================================================================
-- Purpose: Migrate all ID columns to UUID for consistency with users_enhanced
-- 
-- Tables affected:
--   - chat_conversations (id: INT → UUID, user_id: VARCHAR → UUID)
--   - chat_messages (id: INT → UUID, conversation_id: UUID, user_id: UUID)
--   - workflow_tasks (id: INT → UUID, creator_id/assignee_id/approver_id: TEXT → UUID)
--   - task_requests (id: INT → UUID)
--   - task_messages (id: INT → UUID, task_id: UUID, sender_id: UUID)
--   - threads (id: TEXT → UUID)
--   - thread_messages (id: TEXT → UUID)
--   - rbac_user_permissions (user_id: TEXT → UUID)
--
-- Strategy:
--   1. Add new UUID columns with suffix _uuid
--   2. Populate UUID columns with generated UUIDs
--   3. Update foreign key references
--   4. Drop old constraints
--   5. Rename columns
--   6. Add new constraints
--
-- IMPORTANT: Run this in a transaction and backup first!
-- ============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PHASE 1: CHAT_CONVERSATIONS
-- ============================================================================

-- 1.1 Add UUID columns
ALTER TABLE chat_conversations 
  ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

-- 1.2 Populate UUIDs
UPDATE chat_conversations SET id_uuid = uuid_generate_v4() WHERE id_uuid IS NULL;

-- 1.3 Try to link user_id to users_enhanced (if valid UUID format)
UPDATE chat_conversations cc
SET user_id_uuid = ue.id
FROM users_enhanced ue
WHERE cc.user_id = ue.id::text
  AND cc.user_id_uuid IS NULL;

-- 1.4 For remaining non-matching user_ids, try to match by email or username
UPDATE chat_conversations cc
SET user_id_uuid = (
  SELECT id FROM users_enhanced WHERE email = cc.user_id OR username = cc.user_id LIMIT 1
)
WHERE cc.user_id_uuid IS NULL;

-- ============================================================================
-- PHASE 2: CHAT_MESSAGES
-- ============================================================================

-- 2.1 Add UUID columns
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS conversation_id_uuid UUID,
  ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

-- 2.2 Populate UUIDs
UPDATE chat_messages SET id_uuid = uuid_generate_v4() WHERE id_uuid IS NULL;

-- 2.3 Link conversation_id to new UUID
UPDATE chat_messages cm
SET conversation_id_uuid = cc.id_uuid
FROM chat_conversations cc
WHERE cm.conversation_id = cc.id;

-- 2.4 Link user_id to users_enhanced
UPDATE chat_messages cm
SET user_id_uuid = ue.id
FROM users_enhanced ue
WHERE cm.user_id = ue.id::text
  AND cm.user_id_uuid IS NULL;

-- ============================================================================
-- PHASE 3: WORKFLOW_TASKS
-- ============================================================================

-- 3.1 Add UUID columns
ALTER TABLE workflow_tasks
  ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS creator_id_uuid UUID,
  ADD COLUMN IF NOT EXISTS assignee_id_uuid UUID,
  ADD COLUMN IF NOT EXISTS approver_id_uuid UUID;

-- 3.2 Populate UUIDs
UPDATE workflow_tasks SET id_uuid = uuid_generate_v4() WHERE id_uuid IS NULL;

-- 3.3 Link user IDs to users_enhanced
UPDATE workflow_tasks wt
SET creator_id_uuid = ue.id
FROM users_enhanced ue
WHERE wt.creator_id = ue.id::text
  AND wt.creator_id_uuid IS NULL;

UPDATE workflow_tasks wt
SET assignee_id_uuid = ue.id
FROM users_enhanced ue
WHERE wt.assignee_id = ue.id::text
  AND wt.assignee_id_uuid IS NULL;

UPDATE workflow_tasks wt
SET approver_id_uuid = ue.id
FROM users_enhanced ue
WHERE wt.approver_id = ue.id::text
  AND wt.approver_id_uuid IS NULL;

-- ============================================================================
-- PHASE 4: TASK_REQUESTS
-- ============================================================================

-- 4.1 Add UUID column
ALTER TABLE task_requests
  ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS converted_task_id_uuid UUID;

-- 4.2 Populate UUIDs
UPDATE task_requests SET id_uuid = uuid_generate_v4() WHERE id_uuid IS NULL;

-- 4.3 Link converted_task_id to workflow_tasks
UPDATE task_requests tr
SET converted_task_id_uuid = wt.id_uuid
FROM workflow_tasks wt
WHERE tr.converted_task_id = wt.id;

-- ============================================================================
-- PHASE 5: TASK_MESSAGES
-- ============================================================================

-- 5.1 Add UUID columns
ALTER TABLE task_messages
  ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS task_id_uuid UUID,
  ADD COLUMN IF NOT EXISTS sender_id_uuid UUID,
  ADD COLUMN IF NOT EXISTS reply_to_id_uuid UUID;

-- 5.2 Populate UUIDs
UPDATE task_messages SET id_uuid = uuid_generate_v4() WHERE id_uuid IS NULL;

-- 5.3 Link task_id to workflow_tasks
UPDATE task_messages tm
SET task_id_uuid = wt.id_uuid
FROM workflow_tasks wt
WHERE tm.task_id = wt.id;

-- 5.4 Link sender_id to users_enhanced
UPDATE task_messages tm
SET sender_id_uuid = ue.id
FROM users_enhanced ue
WHERE tm.sender_id = ue.id::text
  AND tm.sender_id_uuid IS NULL;

-- 5.5 Link reply_to_id to itself
UPDATE task_messages tm
SET reply_to_id_uuid = tm2.id_uuid
FROM task_messages tm2
WHERE tm.reply_to_id = tm2.id;

-- ============================================================================
-- PHASE 6: THREADS (TEXT → UUID)
-- ============================================================================

-- 6.1 Add UUID column
ALTER TABLE threads
  ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT uuid_generate_v4();

-- 6.2 Try to convert existing TEXT ids to UUID if valid
UPDATE threads 
SET id_uuid = id::uuid 
WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND id_uuid IS NULL;

-- 6.3 Generate new UUIDs for non-valid ones
UPDATE threads SET id_uuid = uuid_generate_v4() WHERE id_uuid IS NULL;

-- ============================================================================
-- PHASE 7: THREAD_MESSAGES (TEXT → UUID)
-- ============================================================================

-- 7.1 Add UUID columns
ALTER TABLE thread_messages
  ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS thread_id_uuid UUID,
  ADD COLUMN IF NOT EXISTS reply_to_id_uuid UUID;

-- 7.2 Try to convert existing TEXT ids to UUID if valid
UPDATE thread_messages 
SET id_uuid = id::uuid 
WHERE id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND id_uuid IS NULL;

-- 7.3 Generate new UUIDs for non-valid ones
UPDATE thread_messages SET id_uuid = uuid_generate_v4() WHERE id_uuid IS NULL;

-- 7.4 Link thread_id to threads
UPDATE thread_messages tm
SET thread_id_uuid = t.id_uuid
FROM threads t
WHERE tm."threadId" = t.id;

-- 7.5 Link reply_to_id to itself
UPDATE thread_messages tm
SET reply_to_id_uuid = tm2.id_uuid
FROM thread_messages tm2
WHERE tm."replyToId" = tm2.id;

-- ============================================================================
-- PHASE 8: RBAC_USER_PERMISSIONS (user_id: TEXT → UUID)
-- ============================================================================

-- 8.1 Add UUID column
ALTER TABLE rbac_user_permissions
  ADD COLUMN IF NOT EXISTS user_id_uuid UUID;

-- 8.2 Link to users_enhanced
UPDATE rbac_user_permissions rup
SET user_id_uuid = ue.id
FROM users_enhanced ue
WHERE rup.user_id = ue.id::text
  AND rup.user_id_uuid IS NULL;

-- ============================================================================
-- PHASE 9: DROP OLD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Chat messages → conversations
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS fk_chat_messages_conversation;

-- Task messages → workflow_tasks
ALTER TABLE task_messages DROP CONSTRAINT IF EXISTS task_messages_task_id_fkey;
ALTER TABLE task_messages DROP CONSTRAINT IF EXISTS fk_task_messages_task;

-- Task messages self-reference
ALTER TABLE task_messages DROP CONSTRAINT IF EXISTS task_messages_reply_to_id_fkey;

-- Thread messages → threads
ALTER TABLE thread_messages DROP CONSTRAINT IF EXISTS thread_messages_threadId_fkey;
ALTER TABLE thread_messages DROP CONSTRAINT IF EXISTS "thread_messages_threadId_fkey";

-- Thread messages self-reference
ALTER TABLE thread_messages DROP CONSTRAINT IF EXISTS thread_messages_replyToId_fkey;
ALTER TABLE thread_messages DROP CONSTRAINT IF EXISTS "thread_messages_replyToId_fkey";

-- ============================================================================
-- PHASE 10: RENAME OLD COLUMNS AND NEW COLUMNS
-- ============================================================================

-- chat_conversations
ALTER TABLE chat_conversations RENAME COLUMN id TO id_old;
ALTER TABLE chat_conversations RENAME COLUMN user_id TO user_id_old;
ALTER TABLE chat_conversations RENAME COLUMN id_uuid TO id;
ALTER TABLE chat_conversations RENAME COLUMN user_id_uuid TO user_id;

-- chat_messages
ALTER TABLE chat_messages RENAME COLUMN id TO id_old;
ALTER TABLE chat_messages RENAME COLUMN conversation_id TO conversation_id_old;
ALTER TABLE chat_messages RENAME COLUMN user_id TO user_id_old;
ALTER TABLE chat_messages RENAME COLUMN id_uuid TO id;
ALTER TABLE chat_messages RENAME COLUMN conversation_id_uuid TO conversation_id;
ALTER TABLE chat_messages RENAME COLUMN user_id_uuid TO user_id;

-- workflow_tasks
ALTER TABLE workflow_tasks RENAME COLUMN id TO id_old;
ALTER TABLE workflow_tasks RENAME COLUMN creator_id TO creator_id_old;
ALTER TABLE workflow_tasks RENAME COLUMN assignee_id TO assignee_id_old;
ALTER TABLE workflow_tasks RENAME COLUMN approver_id TO approver_id_old;
ALTER TABLE workflow_tasks RENAME COLUMN id_uuid TO id;
ALTER TABLE workflow_tasks RENAME COLUMN creator_id_uuid TO creator_id;
ALTER TABLE workflow_tasks RENAME COLUMN assignee_id_uuid TO assignee_id;
ALTER TABLE workflow_tasks RENAME COLUMN approver_id_uuid TO approver_id;

-- task_requests
ALTER TABLE task_requests RENAME COLUMN id TO id_old;
ALTER TABLE task_requests RENAME COLUMN converted_task_id TO converted_task_id_old;
ALTER TABLE task_requests RENAME COLUMN id_uuid TO id;
ALTER TABLE task_requests RENAME COLUMN converted_task_id_uuid TO converted_task_id;

-- task_messages
ALTER TABLE task_messages RENAME COLUMN id TO id_old;
ALTER TABLE task_messages RENAME COLUMN task_id TO task_id_old;
ALTER TABLE task_messages RENAME COLUMN sender_id TO sender_id_old;
ALTER TABLE task_messages RENAME COLUMN reply_to_id TO reply_to_id_old;
ALTER TABLE task_messages RENAME COLUMN id_uuid TO id;
ALTER TABLE task_messages RENAME COLUMN task_id_uuid TO task_id;
ALTER TABLE task_messages RENAME COLUMN sender_id_uuid TO sender_id;
ALTER TABLE task_messages RENAME COLUMN reply_to_id_uuid TO reply_to_id;

-- threads
ALTER TABLE threads RENAME COLUMN id TO id_old;
ALTER TABLE threads RENAME COLUMN id_uuid TO id;

-- thread_messages
ALTER TABLE thread_messages RENAME COLUMN id TO id_old;
ALTER TABLE thread_messages RENAME COLUMN "threadId" TO thread_id_old;
ALTER TABLE thread_messages RENAME COLUMN "replyToId" TO reply_to_id_old;
ALTER TABLE thread_messages RENAME COLUMN id_uuid TO id;
ALTER TABLE thread_messages RENAME COLUMN thread_id_uuid TO thread_id;
ALTER TABLE thread_messages RENAME COLUMN reply_to_id_uuid TO reply_to_id;

-- rbac_user_permissions
ALTER TABLE rbac_user_permissions RENAME COLUMN user_id TO user_id_old;
ALTER TABLE rbac_user_permissions RENAME COLUMN user_id_uuid TO user_id;

-- ============================================================================
-- PHASE 11: ADD PRIMARY KEY CONSTRAINTS
-- ============================================================================

-- First drop old primary keys
ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_pkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE workflow_tasks DROP CONSTRAINT IF EXISTS workflow_tasks_pkey;
ALTER TABLE task_requests DROP CONSTRAINT IF EXISTS task_requests_pkey;
ALTER TABLE task_messages DROP CONSTRAINT IF EXISTS task_messages_pkey;
ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_pkey;
ALTER TABLE thread_messages DROP CONSTRAINT IF EXISTS thread_messages_pkey;

-- Add new primary keys
ALTER TABLE chat_conversations ADD PRIMARY KEY (id);
ALTER TABLE chat_messages ADD PRIMARY KEY (id);
ALTER TABLE workflow_tasks ADD PRIMARY KEY (id);
ALTER TABLE task_requests ADD PRIMARY KEY (id);
ALTER TABLE task_messages ADD PRIMARY KEY (id);
ALTER TABLE threads ADD PRIMARY KEY (id);
ALTER TABLE thread_messages ADD PRIMARY KEY (id);

-- ============================================================================
-- PHASE 12: ADD NEW FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Chat messages → conversations
ALTER TABLE chat_messages 
  ADD CONSTRAINT fk_chat_messages_conversation 
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;

-- Chat messages → users
ALTER TABLE chat_messages 
  ADD CONSTRAINT fk_chat_messages_user 
  FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE SET NULL;

-- Chat conversations → users
ALTER TABLE chat_conversations 
  ADD CONSTRAINT fk_chat_conversations_user 
  FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE SET NULL;

-- Task messages → workflow_tasks
ALTER TABLE task_messages 
  ADD CONSTRAINT fk_task_messages_task 
  FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE;

-- Task messages → users
ALTER TABLE task_messages 
  ADD CONSTRAINT fk_task_messages_sender 
  FOREIGN KEY (sender_id) REFERENCES users_enhanced(id) ON DELETE SET NULL;

-- Task messages self-reference
ALTER TABLE task_messages 
  ADD CONSTRAINT fk_task_messages_reply_to 
  FOREIGN KEY (reply_to_id) REFERENCES task_messages(id) ON DELETE SET NULL;

-- Thread messages → threads
ALTER TABLE thread_messages 
  ADD CONSTRAINT fk_thread_messages_thread 
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE;

-- Thread messages self-reference
ALTER TABLE thread_messages 
  ADD CONSTRAINT fk_thread_messages_reply_to 
  FOREIGN KEY (reply_to_id) REFERENCES thread_messages(id) ON DELETE SET NULL;

-- Workflow tasks → users
ALTER TABLE workflow_tasks 
  ADD CONSTRAINT fk_workflow_tasks_creator 
  FOREIGN KEY (creator_id) REFERENCES users_enhanced(id) ON DELETE SET NULL;

ALTER TABLE workflow_tasks 
  ADD CONSTRAINT fk_workflow_tasks_assignee 
  FOREIGN KEY (assignee_id) REFERENCES users_enhanced(id) ON DELETE SET NULL;

ALTER TABLE workflow_tasks 
  ADD CONSTRAINT fk_workflow_tasks_approver 
  FOREIGN KEY (approver_id) REFERENCES users_enhanced(id) ON DELETE SET NULL;

-- RBAC user permissions → users
ALTER TABLE rbac_user_permissions 
  ADD CONSTRAINT fk_rbac_user_permissions_user 
  FOREIGN KEY (user_id) REFERENCES users_enhanced(id) ON DELETE CASCADE;

-- ============================================================================
-- PHASE 13: CREATE INDEXES
-- ============================================================================

-- Chat tables
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- Workflow/Task tables
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_creator ON workflow_tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assignee ON workflow_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_task ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_sender ON task_messages(sender_id);

-- Thread tables
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread ON thread_messages(thread_id);

-- RBAC
CREATE INDEX IF NOT EXISTS idx_rbac_user_permissions_user_uuid ON rbac_user_permissions(user_id);

-- ============================================================================
-- PHASE 14: CREATE ID MAPPING TABLES (for rollback and reference)
-- ============================================================================

CREATE TABLE IF NOT EXISTS _migration_id_mapping_053 (
  table_name VARCHAR(100) NOT NULL,
  old_id TEXT NOT NULL,
  new_id UUID NOT NULL,
  migrated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (table_name, old_id)
);

-- Store mappings for rollback
INSERT INTO _migration_id_mapping_053 (table_name, old_id, new_id)
SELECT 'chat_conversations', id_old::text, id FROM chat_conversations WHERE id_old IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO _migration_id_mapping_053 (table_name, old_id, new_id)
SELECT 'chat_messages', id_old::text, id FROM chat_messages WHERE id_old IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO _migration_id_mapping_053 (table_name, old_id, new_id)
SELECT 'workflow_tasks', id_old::text, id FROM workflow_tasks WHERE id_old IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO _migration_id_mapping_053 (table_name, old_id, new_id)
SELECT 'task_requests', id_old::text, id FROM task_requests WHERE id_old IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO _migration_id_mapping_053 (table_name, old_id, new_id)
SELECT 'task_messages', id_old::text, id FROM task_messages WHERE id_old IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO _migration_id_mapping_053 (table_name, old_id, new_id)
SELECT 'threads', id_old::text, id FROM threads WHERE id_old IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO _migration_id_mapping_053 (table_name, old_id, new_id)
SELECT 'thread_messages', id_old::text, id FROM thread_messages WHERE id_old IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 15: UPDATE PRISMA SCHEMA TRACKING
-- ============================================================================

INSERT INTO schema_info (version, description, applied_at)
VALUES ('053', 'UUID standardization for core tables', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================

-- Run these to verify migration success:
/*
SELECT 
  'chat_conversations' as table_name,
  COUNT(*) as total,
  COUNT(id) as with_uuid,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as linked_users
FROM chat_conversations
UNION ALL
SELECT 
  'chat_messages',
  COUNT(*),
  COUNT(id),
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END)
FROM chat_messages
UNION ALL
SELECT 
  'workflow_tasks',
  COUNT(*),
  COUNT(id),
  COUNT(CASE WHEN creator_id IS NOT NULL THEN 1 END)
FROM workflow_tasks
UNION ALL
SELECT 
  'threads',
  COUNT(*),
  COUNT(id),
  COUNT(*)
FROM threads
UNION ALL
SELECT 
  'thread_messages',
  COUNT(*),
  COUNT(id),
  COUNT(CASE WHEN thread_id IS NOT NULL THEN 1 END)
FROM thread_messages;
*/

-- ============================================================================
-- CLEANUP (Run after verification - OPTIONAL, keep old columns for safety)
-- ============================================================================

/*
-- Only run this after confirming migration success!
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS user_id_old;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS conversation_id_old, DROP COLUMN IF EXISTS user_id_old;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS creator_id_old, DROP COLUMN IF EXISTS assignee_id_old, DROP COLUMN IF EXISTS approver_id_old;
ALTER TABLE task_requests DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS converted_task_id_old;
ALTER TABLE task_messages DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS task_id_old, DROP COLUMN IF EXISTS sender_id_old, DROP COLUMN IF EXISTS reply_to_id_old;
ALTER TABLE threads DROP COLUMN IF EXISTS id_old;
ALTER TABLE thread_messages DROP COLUMN IF EXISTS id_old, DROP COLUMN IF EXISTS thread_id_old, DROP COLUMN IF EXISTS reply_to_id_old;
ALTER TABLE rbac_user_permissions DROP COLUMN IF EXISTS user_id_old;

-- Drop mapping table after confirmed success
DROP TABLE IF EXISTS _migration_id_mapping_053;
*/
