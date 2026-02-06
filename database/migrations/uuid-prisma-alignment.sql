-- =============================================================================
-- PRISMA SCHEMA ALIGNMENT SQL MIGRATION
-- =============================================================================
-- 
-- This script prepares the database for Prisma schema sync.
-- Run this BEFORE running `prisma db pull`
--
-- Key changes:
-- 1. Convert VARCHAR tenant_id columns to UUID
-- 2. Add compound unique constraints
-- 3. Fix data type mismatches
--
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CONVERT VARCHAR TENANT_ID COLUMNS TO UUID
-- =============================================================================

-- effective_access_cache
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'effective_access_cache' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        -- First update invalid values to NULL
        UPDATE effective_access_cache 
        SET tenant_id = NULL
        WHERE tenant_id IS NOT NULL 
          AND tenant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        -- Then alter column
        ALTER TABLE effective_access_cache 
        ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;
        
        RAISE NOTICE 'Converted effective_access_cache.tenant_id to UUID';
    END IF;
END $$;

-- tenant_usage
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenant_usage' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        UPDATE tenant_usage 
        SET tenant_id = NULL
        WHERE tenant_id IS NOT NULL 
          AND tenant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        ALTER TABLE tenant_usage 
        ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;
        
        RAISE NOTICE 'Converted tenant_usage.tenant_id to UUID';
    END IF;
END $$;

-- admin_page_assignments
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_page_assignments' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        UPDATE admin_page_assignments 
        SET tenant_id = NULL
        WHERE tenant_id IS NOT NULL 
          AND tenant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        ALTER TABLE admin_page_assignments 
        ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;
        
        RAISE NOTICE 'Converted admin_page_assignments.tenant_id to UUID';
    END IF;
END $$;

-- admin_role_grants
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_role_grants' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        UPDATE admin_role_grants 
        SET tenant_id = NULL
        WHERE tenant_id IS NOT NULL 
          AND tenant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        ALTER TABLE admin_role_grants 
        ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;
        
        RAISE NOTICE 'Converted admin_role_grants.tenant_id to UUID';
    END IF;
END $$;

-- subscription_access_audit_log
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_access_audit_log' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        UPDATE subscription_access_audit_log 
        SET tenant_id = NULL
        WHERE tenant_id IS NOT NULL 
          AND tenant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        ALTER TABLE subscription_access_audit_log 
        ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;
        
        RAISE NOTICE 'Converted subscription_access_audit_log.tenant_id to UUID';
    END IF;
END $$;

-- =============================================================================
-- 2. ADD COMPOUND UNIQUE CONSTRAINTS
-- =============================================================================

-- tenant_usage(tenant_id, date) constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tenant_usage_tenant_date_unique'
    ) THEN
        -- Remove duplicates first
        DELETE FROM tenant_usage a USING tenant_usage b
        WHERE a.ctid < b.ctid 
          AND a.tenant_id = b.tenant_id 
          AND a.date = b.date;
        
        -- Add constraint
        ALTER TABLE tenant_usage 
        ADD CONSTRAINT tenant_usage_tenant_date_unique 
        UNIQUE (tenant_id, date);
        
        RAISE NOTICE 'Added tenant_usage_tenant_date_unique constraint';
    END IF;
END $$;

-- =============================================================================
-- 3. DROP LEGACY COLUMNS
-- =============================================================================

-- chat_conversations
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS id_old;
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS user_id_old;

-- chat_messages
ALTER TABLE chat_messages DROP COLUMN IF EXISTS id_old;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS conversation_id_old;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS user_id_old;

-- task_messages
ALTER TABLE task_messages DROP COLUMN IF EXISTS id_old;
ALTER TABLE task_messages DROP COLUMN IF EXISTS reply_to_id_old;
ALTER TABLE task_messages DROP COLUMN IF EXISTS sender_id_old;
ALTER TABLE task_messages DROP COLUMN IF EXISTS task_id_old;

-- task_requests
ALTER TABLE task_requests DROP COLUMN IF EXISTS id_old;
ALTER TABLE task_requests DROP COLUMN IF EXISTS converted_task_id_old;

-- thread_messages
ALTER TABLE thread_messages DROP COLUMN IF EXISTS id_old;
ALTER TABLE thread_messages DROP COLUMN IF EXISTS reply_to_id_old;
ALTER TABLE thread_messages DROP COLUMN IF EXISTS thread_id_old;

-- thread_members
ALTER TABLE thread_members DROP COLUMN IF EXISTS thread_id_old;

-- threads
ALTER TABLE threads DROP COLUMN IF EXISTS id_old;

-- workflow_tasks
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS id_old;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS approver_id_old;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS assignee_id_old;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS creator_id_old;

-- rbac_user_permissions
ALTER TABLE rbac_user_permissions DROP COLUMN IF EXISTS user_id_old;

RAISE NOTICE 'Dropped legacy columns';

-- =============================================================================
-- 4. FIX FOREIGN KEY TYPE MISMATCHES
-- =============================================================================

-- Fix audit_logs.session_id FK if mismatched
-- This requires careful handling due to FK constraint

-- First check if there's a mismatch
DO $$
DECLARE
    source_type text;
    target_type text;
BEGIN
    SELECT c.udt_name INTO source_type
    FROM information_schema.columns c
    WHERE c.table_name = 'audit_logs' AND c.column_name = 'session_id';
    
    SELECT c.udt_name INTO target_type
    FROM information_schema.columns c
    WHERE c.table_name = 'user_sessions' AND c.column_name = 'id';
    
    IF source_type IS DISTINCT FROM target_type THEN
        -- Drop FK constraint
        ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_session_id_fkey;
        
        -- Convert column type
        IF source_type = 'varchar' AND target_type = 'int4' THEN
            UPDATE audit_logs SET session_id = NULL 
            WHERE session_id IS NOT NULL AND session_id !~ '^\d+$';
            
            ALTER TABLE audit_logs 
            ALTER COLUMN session_id TYPE INTEGER USING session_id::integer;
        END IF;
        
        -- Recreate FK
        ALTER TABLE audit_logs 
        ADD CONSTRAINT audit_logs_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Fixed audit_logs.session_id type mismatch';
    END IF;
END $$;

-- =============================================================================
-- 5. ADD INDEXES FOR UUID COLUMNS
-- =============================================================================

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_enhanced_tenant_id 
ON users_enhanced(tenant_id);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_creator_id 
ON workflow_tasks(creator_id);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assignee_id 
ON workflow_tasks(assignee_id);

CREATE INDEX IF NOT EXISTS idx_tasks_creator_id 
ON tasks(creator_id);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id 
ON tasks(tenant_id);

-- =============================================================================
-- 6. VALIDATION QUERIES
-- =============================================================================

-- Output summary
DO $$
DECLARE
    varchar_tenant_count INTEGER;
    legacy_column_count INTEGER;
BEGIN
    -- Check for remaining VARCHAR tenant_id columns
    SELECT COUNT(*) INTO varchar_tenant_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND udt_name != 'uuid'
      AND table_name NOT LIKE '_%';
    
    -- Check for remaining legacy columns
    SELECT COUNT(*) INTO legacy_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name LIKE '%_old' OR column_name LIKE '%_legacy')
      AND table_name NOT LIKE '_%';
    
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'MIGRATION VALIDATION';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Remaining VARCHAR tenant_id columns: %', varchar_tenant_count;
    RAISE NOTICE 'Remaining legacy columns: %', legacy_column_count;
    RAISE NOTICE '=============================================================================';
END $$;

COMMIT;

-- =============================================================================
-- POST-MIGRATION STEPS:
-- =============================================================================
-- 
-- 1. Run Prisma db pull:
--    cd my-backend && npx prisma db pull
-- 
-- 2. Verify schema changes:
--    - All tenant_id fields should have @db.Uuid annotation
--    - No *_old columns should remain
-- 
-- 3. Regenerate Prisma client:
--    npx prisma generate
-- 
-- 4. Run tests:
--    npm test
-- 
-- =============================================================================
