-- =====================================================
-- BISMAN ERP - ENHANCED WORKFLOW TASK MANAGEMENT SYSTEM
-- Date: 2025-12-10
-- Description: Comprehensive task management with tenant support,
--              better status tracking, and real-time capabilities
-- =====================================================

-- 1. ALTER workflow_tasks to add missing columns
ALTER TABLE workflow_tasks 
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS assignee_id INTEGER,
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID,
  ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(10,2);

-- Update creator_id to INTEGER if it's UUID (for compatibility with users table)
-- First check if column needs modification
DO $$
BEGIN
  -- Add new integer column if creator_id is UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workflow_tasks' 
    AND column_name = 'creator_id' 
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE workflow_tasks ADD COLUMN IF NOT EXISTS creator_user_id INTEGER;
    -- Note: Data migration would be needed here in production
    RAISE NOTICE 'Added creator_user_id column for integer user references';
  END IF;
END $$;

-- 2. Create task_messages table if not exists (enhanced version)
CREATE TABLE IF NOT EXISTS task_messages (
  id SERIAL PRIMARY KEY,
  task_id UUID NOT NULL,
  tenant_id UUID,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'TEXT',
  
  -- Message metadata
  is_system_message BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Read tracking
  read_by INTEGER[] DEFAULT '{}',
  
  -- Reply support
  reply_to_id INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_task_messages_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_messages_reply FOREIGN KEY (reply_to_id) REFERENCES task_messages(id) ON DELETE SET NULL,
  
  -- Check constraints
  CONSTRAINT chk_task_message_type CHECK (message_type IN ('TEXT', 'SYSTEM', 'STATUS_CHANGE', 'ASSIGNEE_CHANGE', 'APPROVAL', 'MENTION', 'AI_RESPONSE'))
);

-- 3. Create task_attachments table (enhanced version)
CREATE TABLE IF NOT EXISTS task_attachments (
  id SERIAL PRIMARY KEY,
  task_id UUID NOT NULL,
  tenant_id UUID,
  message_id INTEGER,
  
  -- File information
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500),
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  -- Storage metadata
  storage_provider VARCHAR(50) DEFAULT 'LOCAL',
  storage_key TEXT,
  
  -- Upload metadata
  uploaded_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_task_attachments_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_attachments_message FOREIGN KEY (message_id) REFERENCES task_messages(id) ON DELETE SET NULL,
  CONSTRAINT fk_task_attachments_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Create task_participants table
CREATE TABLE IF NOT EXISTS task_participants (
  id SERIAL PRIMARY KEY,
  task_id UUID NOT NULL,
  tenant_id UUID,
  user_id INTEGER NOT NULL,
  role VARCHAR(50) DEFAULT 'VIEWER',
  
  -- Permissions
  can_edit BOOLEAN DEFAULT FALSE,
  can_comment BOOLEAN DEFAULT TRUE,
  can_approve BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  added_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_task_participants_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_participants_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Unique constraint
  CONSTRAINT uk_task_participants UNIQUE (task_id, user_id),
  
  -- Check constraints
  CONSTRAINT chk_participant_role CHECK (role IN ('VIEWER', 'COLLABORATOR', 'REVIEWER', 'APPROVER'))
);

-- 5. Create task_labels table
CREATE TABLE IF NOT EXISTS task_labels (
  id SERIAL PRIMARY KEY,
  tenant_id UUID,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT uk_task_labels_name UNIQUE (tenant_id, name)
);

-- 6. Create task_label_assignments table
CREATE TABLE IF NOT EXISTS task_label_assignments (
  task_id UUID NOT NULL,
  label_id INTEGER NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (task_id, label_id),
  CONSTRAINT fk_label_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_label_label FOREIGN KEY (label_id) REFERENCES task_labels(id) ON DELETE CASCADE
);

-- 7. Create task_watchers table (for notifications)
CREATE TABLE IF NOT EXISTS task_watchers (
  task_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  PRIMARY KEY (task_id, user_id),
  CONSTRAINT fk_watcher_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_watcher_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Create task_time_entries table
CREATE TABLE IF NOT EXISTS task_time_entries (
  id SERIAL PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  hours DECIMAL(10,2) NOT NULL,
  description TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_time_entry_task FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_time_entry_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_tenant ON workflow_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assignee ON workflow_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_priority ON workflow_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_due_date ON workflow_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_position ON workflow_tasks(status, position);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_parent ON workflow_tasks(parent_task_id);

CREATE INDEX IF NOT EXISTS idx_task_messages_task ON task_messages(task_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_sender ON task_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_task_messages_created ON task_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_messages_tenant ON task_messages(tenant_id);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_tenant ON task_attachments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_task_participants_task ON task_participants(task_id);
CREATE INDEX IF NOT EXISTS idx_task_participants_user ON task_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_task_labels_tenant ON task_labels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_task ON task_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_entries_user ON task_time_entries(user_id);

-- =====================================================
-- VIEWS for common queries
-- =====================================================
CREATE OR REPLACE VIEW v_task_summary AS
SELECT 
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.progress,
  t.due_date,
  t.tenant_id,
  t.created_at,
  t.updated_at,
  t.creator_id,
  t.assignee_id,
  creator.username as creator_name,
  creator.email as creator_email,
  assignee.username as assignee_name,
  assignee.email as assignee_email,
  (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
  (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count,
  (SELECT COUNT(*) FROM task_participants WHERE task_id = t.id) as participant_count
FROM workflow_tasks t
LEFT JOIN users creator ON t.creator_id = creator.id
LEFT JOIN users assignee ON t.assignee_id = assignee.id
WHERE t.is_archived = FALSE OR t.is_archived IS NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at on workflow_tasks
CREATE OR REPLACE FUNCTION update_workflow_tasks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_tasks_updated_at ON workflow_tasks;
CREATE TRIGGER trg_workflow_tasks_updated_at
  BEFORE UPDATE ON workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION update_workflow_tasks_timestamp();

-- Auto-create history entry on status change
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO workflow_task_history (task_id, from_status, to_status, action, actor_id, actor_type)
    VALUES (NEW.id, OLD.status, NEW.status, 'STATUS_CHANGE', NEW.creator_id::UUID, 'USER');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_status_change ON workflow_tasks;
CREATE TRIGGER trg_task_status_change
  AFTER UPDATE ON workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_status_change();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Workflow Task Management System migration completed!';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  - workflow_tasks (enhanced)';
  RAISE NOTICE '  - task_messages';
  RAISE NOTICE '  - task_attachments';
  RAISE NOTICE '  - task_participants';
  RAISE NOTICE '  - task_labels';
  RAISE NOTICE '  - task_label_assignments';
  RAISE NOTICE '  - task_watchers';
  RAISE NOTICE '  - task_time_entries';
  RAISE NOTICE 'Views: v_task_summary';
END $$;
