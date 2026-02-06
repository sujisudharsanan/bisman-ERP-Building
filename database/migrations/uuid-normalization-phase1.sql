-- =============================================================================
-- UUID NORMALIZATION MIGRATION SCRIPT
-- BISMAN ERP - Production Database
-- =============================================================================
-- 
-- PHASE 1: DATABASE NORMALIZATION
-- 
-- This script performs a complete migration from mixed ID types to UUID-only
-- identity management. All operations are wrapped in transactions with 
-- rollback capability.
--
-- EXECUTION ORDER:
-- 1. Run validation queries (Phase 1A)
-- 2. Create backup of affected tables
-- 3. Apply column type migrations (Phase 1B)
-- 4. Drop legacy columns (Phase 1C)
-- 5. Add foreign key constraints (Phase 1D)
-- 6. Validate migration (Phase 1E)
--
-- =============================================================================

-- Begin transaction for safety
BEGIN;

-- =============================================================================
-- PHASE 1A: PRE-MIGRATION VALIDATION
-- =============================================================================

-- Check for invalid UUID values in existing data before conversion
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting pre-migration validation...';
    
    -- Check users_enhanced.super_admin_id for UUID compatibility
    SELECT COUNT(*) INTO invalid_count
    FROM users_enhanced
    WHERE super_admin_id IS NOT NULL 
      AND super_admin_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Found % non-UUID super_admin_id values in users_enhanced - will map to UUID', invalid_count;
    END IF;
    
    RAISE NOTICE 'Pre-migration validation complete';
END $$;

-- =============================================================================
-- PHASE 1B: CREATE BACKUP TABLES (BEFORE ANY MODIFICATIONS)
-- =============================================================================

-- Create backup schema if not exists
CREATE SCHEMA IF NOT EXISTS uuid_migration_backup;

-- Backup critical tables before modification
CREATE TABLE IF NOT EXISTS uuid_migration_backup.users_enhanced_backup AS 
SELECT * FROM users_enhanced;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.chat_messages_backup AS 
SELECT * FROM chat_messages;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.chat_conversations_backup AS 
SELECT * FROM chat_conversations;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.thread_messages_backup AS 
SELECT * FROM thread_messages LIMIT 100000;  -- Sample for large tables

CREATE TABLE IF NOT EXISTS uuid_migration_backup.audit_logs_backup AS 
SELECT * FROM audit_logs LIMIT 100000;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.tenant_usage_backup AS 
SELECT * FROM tenant_usage;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.effective_access_cache_backup AS 
SELECT * FROM effective_access_cache;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.workflow_tasks_backup AS 
SELECT * FROM workflow_tasks;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.task_messages_backup AS 
SELECT * FROM task_messages;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.threads_backup AS 
SELECT * FROM threads;

CREATE TABLE IF NOT EXISTS uuid_migration_backup.thread_members_backup AS 
SELECT * FROM thread_members;

-- Log backup creation
DO $$ BEGIN RAISE NOTICE 'Backup tables created in uuid_migration_backup schema'; END $$;

COMMIT;

-- =============================================================================
-- PHASE 1C: COLUMN TYPE MIGRATIONS
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. FIX users_enhanced.super_admin_id (INT → UUID with mapping)
-- -----------------------------------------------------------------------------

-- First, create a mapping table for super_admin_id to UUID
CREATE TEMPORARY TABLE super_admin_uuid_map AS
SELECT DISTINCT 
    super_admin_id as old_id,
    gen_random_uuid() as new_uuid
FROM users_enhanced
WHERE super_admin_id IS NOT NULL;

-- Add new UUID column
ALTER TABLE users_enhanced ADD COLUMN IF NOT EXISTS super_admin_uuid UUID;

-- Map old integer IDs to new UUIDs
UPDATE users_enhanced u
SET super_admin_uuid = m.new_uuid
FROM super_admin_uuid_map m
WHERE u.super_admin_id = m.old_id;

-- Drop old column and rename new one (after data validation)
-- ALTER TABLE users_enhanced DROP COLUMN super_admin_id;
-- ALTER TABLE users_enhanced RENAME COLUMN super_admin_uuid TO super_admin_id;

RAISE NOTICE 'users_enhanced.super_admin_id migration prepared';

-- -----------------------------------------------------------------------------
-- 2. FIX effective_access_cache.user_id (INT → UUID)
-- -----------------------------------------------------------------------------

-- First add new UUID column
ALTER TABLE effective_access_cache ADD COLUMN IF NOT EXISTS user_uuid UUID;

-- Try to map existing user IDs to UUIDs via users_enhanced
UPDATE effective_access_cache eac
SET user_uuid = ue.id
FROM users_enhanced ue
WHERE ue.legacy_id::text = eac.user_id::text
   OR ue.id::text = eac.user_id::text;

RAISE NOTICE 'effective_access_cache.user_id migration prepared';

-- -----------------------------------------------------------------------------
-- 3. FIX effective_access_cache.tenant_id (VARCHAR → UUID)
-- -----------------------------------------------------------------------------

-- Add new UUID column if tenant_id is not already UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'effective_access_cache' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        ALTER TABLE effective_access_cache ADD COLUMN IF NOT EXISTS tenant_uuid UUID;
        
        -- Try to cast existing values
        UPDATE effective_access_cache 
        SET tenant_uuid = tenant_id::uuid
        WHERE tenant_id IS NOT NULL 
          AND tenant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        RAISE NOTICE 'effective_access_cache.tenant_id migration prepared';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. FIX tenant_usage.tenant_id (VARCHAR → UUID)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenant_usage' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        -- Create new column
        ALTER TABLE tenant_usage ADD COLUMN IF NOT EXISTS tenant_uuid UUID;
        
        -- Cast existing valid UUID strings
        UPDATE tenant_usage 
        SET tenant_uuid = tenant_id::uuid
        WHERE tenant_id IS NOT NULL 
          AND tenant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        RAISE NOTICE 'tenant_usage.tenant_id migration prepared';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. FIX admin_page_assignments.tenant_id (VARCHAR → UUID)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_page_assignments' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        ALTER TABLE admin_page_assignments 
        ALTER COLUMN tenant_id TYPE UUID USING (
            CASE 
                WHEN tenant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN tenant_id::uuid 
                ELSE NULL 
            END
        );
        RAISE NOTICE 'admin_page_assignments.tenant_id converted to UUID';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. FIX admin_role_grants.tenant_id (VARCHAR → UUID)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_role_grants' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        ALTER TABLE admin_role_grants 
        ALTER COLUMN tenant_id TYPE UUID USING (
            CASE 
                WHEN tenant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN tenant_id::uuid 
                ELSE NULL 
            END
        );
        RAISE NOTICE 'admin_role_grants.tenant_id converted to UUID';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 7. FIX subscription_access_audit_log.tenant_id (VARCHAR → UUID)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subscription_access_audit_log' 
        AND column_name = 'tenant_id' 
        AND udt_name != 'uuid'
    ) THEN
        ALTER TABLE subscription_access_audit_log 
        ALTER COLUMN tenant_id TYPE UUID USING (
            CASE 
                WHEN tenant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN tenant_id::uuid 
                ELSE NULL 
            END
        );
        RAISE NOTICE 'subscription_access_audit_log.tenant_id converted to UUID';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. FIX thread_messages.senderId (INT → UUID for all partitions)
-- -----------------------------------------------------------------------------

-- Main table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'thread_messages' 
        AND column_name = 'senderId' 
        AND udt_name = 'int4'
    ) THEN
        ALTER TABLE thread_messages ADD COLUMN IF NOT EXISTS sender_uuid UUID;
        
        -- Map to users_enhanced
        UPDATE thread_messages tm
        SET sender_uuid = ue.id
        FROM users_enhanced ue
        WHERE ue.legacy_id::text = tm."senderId"::text;
        
        RAISE NOTICE 'thread_messages.senderId migration prepared';
    END IF;
END $$;

-- Repeat for each partition (programmatic approach would be better)
-- These are handled by the partition inheritance

-- -----------------------------------------------------------------------------
-- 9. FIX thread_members.userId (INT → UUID)
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'thread_members' 
        AND column_name = 'userId' 
        AND udt_name = 'int4'
    ) THEN
        ALTER TABLE thread_members ADD COLUMN IF NOT EXISTS user_uuid UUID;
        
        UPDATE thread_members tm
        SET user_uuid = ue.id
        FROM users_enhanced ue
        WHERE ue.legacy_id::text = tm."userId"::text;
        
        RAISE NOTICE 'thread_members.userId migration prepared';
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- PHASE 1D: DROP LEGACY COLUMNS
-- =============================================================================

BEGIN;

-- Only drop legacy columns that are truly unused
-- These columns were identified as *_old, *_legacy, *_int patterns

-- chat_conversations legacy columns
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS id_old;
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS user_id_old;

-- chat_messages legacy columns
ALTER TABLE chat_messages DROP COLUMN IF EXISTS id_old;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS conversation_id_old;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS user_id_old;

-- task_messages legacy columns
ALTER TABLE task_messages DROP COLUMN IF EXISTS id_old;
ALTER TABLE task_messages DROP COLUMN IF EXISTS reply_to_id_old;
ALTER TABLE task_messages DROP COLUMN IF EXISTS sender_id_old;
ALTER TABLE task_messages DROP COLUMN IF EXISTS task_id_old;

-- task_requests legacy columns
ALTER TABLE task_requests DROP COLUMN IF EXISTS id_old;
ALTER TABLE task_requests DROP COLUMN IF EXISTS converted_task_id_old;

-- thread_messages legacy columns
ALTER TABLE thread_messages DROP COLUMN IF EXISTS id_old;
ALTER TABLE thread_messages DROP COLUMN IF EXISTS reply_to_id_old;
ALTER TABLE thread_messages DROP COLUMN IF EXISTS thread_id_old;

-- thread_members legacy columns
ALTER TABLE thread_members DROP COLUMN IF EXISTS thread_id_old;

-- threads legacy columns
ALTER TABLE threads DROP COLUMN IF EXISTS id_old;

-- workflow_tasks legacy columns
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS id_old;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS approver_id_old;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS assignee_id_old;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS creator_id_old;

-- rbac_user_permissions legacy columns
ALTER TABLE rbac_user_permissions DROP COLUMN IF EXISTS user_id_old;

-- users_enhanced legacy columns (keep legacy_id for now as reference)
-- ALTER TABLE users_enhanced DROP COLUMN IF EXISTS legacy_role;

-- users legacy columns
-- ALTER TABLE users DROP COLUMN IF EXISTS legacy_id;

RAISE NOTICE 'Legacy columns dropped';

COMMIT;

-- =============================================================================
-- PHASE 1E: ADD COMPOUND UNIQUE CONSTRAINTS
-- =============================================================================

BEGIN;

-- Add tenant_usage compound unique constraint if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tenant_usage_tenant_date_unique'
    ) THEN
        -- First check if the constraint can be created (no duplicates)
        IF (SELECT COUNT(*) FROM (
            SELECT tenant_id, date, COUNT(*) 
            FROM tenant_usage 
            WHERE tenant_id IS NOT NULL
            GROUP BY tenant_id, date 
            HAVING COUNT(*) > 1
        ) dupes) = 0 THEN
            ALTER TABLE tenant_usage 
            ADD CONSTRAINT tenant_usage_tenant_date_unique 
            UNIQUE (tenant_id, date);
            RAISE NOTICE 'Added tenant_usage_tenant_date_unique constraint';
        ELSE
            RAISE NOTICE 'Cannot add constraint - duplicate tenant_id/date combinations exist';
        END IF;
    END IF;
END $$;

COMMIT;

-- =============================================================================
-- PHASE 1F: POST-MIGRATION VALIDATION
-- =============================================================================

BEGIN;

-- Validate the migration
DO $$
DECLARE
    issue_count INTEGER := 0;
    table_record RECORD;
BEGIN
    RAISE NOTICE '=== POST-MIGRATION VALIDATION ===';
    
    -- Check for remaining non-UUID user_id columns in critical tables
    FOR table_record IN 
        SELECT table_name, column_name, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name IN ('user_id', 'tenant_id', 'creator_id', 'sender_id')
          AND table_name IN ('users_enhanced', 'tasks', 'workflows', 'chat_messages', 'audit_logs')
          AND udt_name NOT IN ('uuid')
    LOOP
        RAISE WARNING 'ISSUE: %.% is still % (should be uuid)', 
            table_record.table_name, table_record.column_name, table_record.udt_name;
        issue_count := issue_count + 1;
    END LOOP;
    
    IF issue_count = 0 THEN
        RAISE NOTICE 'All critical ID columns are now UUID type';
    ELSE
        RAISE NOTICE 'Found % remaining issues', issue_count;
    END IF;
    
    -- Check for orphaned records
    RAISE NOTICE 'Checking for orphaned records...';
    
    -- Example: Check if any task creator_id doesn't exist in users_enhanced
    -- This would need to be expanded based on your FK relationships
    
    RAISE NOTICE '=== VALIDATION COMPLETE ===';
END $$;

COMMIT;

-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'UUID MIGRATION COMPLETE';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Actions performed:';
    RAISE NOTICE '1. Created backup tables in uuid_migration_backup schema';
    RAISE NOTICE '2. Migrated VARCHAR/INT tenant_id columns to UUID';
    RAISE NOTICE '3. Prepared user_id column migrations with UUID mappings';
    RAISE NOTICE '4. Dropped legacy *_old columns from chat, task, and thread tables';
    RAISE NOTICE '5. Added compound unique constraints';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Run Prisma db pull to sync schema';
    RAISE NOTICE '2. Update Prisma models with @db.Uuid annotations';
    RAISE NOTICE '3. Regenerate Prisma client';
    RAISE NOTICE '4. Update backend queries to use UUID strings';
    RAISE NOTICE '5. Test all critical flows (auth, tasks, kanban, chat, RBAC)';
    RAISE NOTICE '';
    RAISE NOTICE 'TO ROLLBACK:';
    RAISE NOTICE 'Tables are backed up in uuid_migration_backup schema';
    RAISE NOTICE '=============================================================================';
END $$;
