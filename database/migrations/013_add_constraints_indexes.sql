-- ============================================================================
-- Migration 013: Add Constraints, Indexes, and Audit Columns
-- ============================================================================
-- This migration adds:
--   1. created_at/updated_at timestamps to core tables
--   2. version columns for optimistic locking
--   3. citext extension for case-insensitive email
--   4. Foreign key constraints for referential integrity
--   5. Performance indexes for common query patterns
-- ============================================================================

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enable citext extension for case-insensitive text
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;

-- ----------------------------------------------------------------------------
-- 2. Add created_at and updated_at columns to tables
--    These columns enable audit trails and cache invalidation
-- ----------------------------------------------------------------------------

-- users_enhanced: Add audit timestamps
ALTER TABLE users_enhanced
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- clients: Add audit timestamps
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- payment_requests: Add audit timestamps
ALTER TABLE payment_requests
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- thread_messages: Add audit timestamps (created_at may already exist)
ALTER TABLE thread_messages
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- tasks: Add audit timestamps
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ----------------------------------------------------------------------------
-- 3. Add version columns for optimistic locking
--    Prevents concurrent updates from overwriting each other
-- ----------------------------------------------------------------------------

-- payment_requests: Add version for optimistic locking
ALTER TABLE payment_requests
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- tasks: Add version for optimistic locking  
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Convert email to citext for case-insensitive matching
--    Prevents duplicate emails like "User@example.com" vs "user@example.com"
-- ----------------------------------------------------------------------------

-- First, drop any existing unique constraint on email
DO $$
BEGIN
  -- Drop existing unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_enhanced_email_key' 
    AND conrelid = 'users_enhanced'::regclass
  ) THEN
    ALTER TABLE users_enhanced DROP CONSTRAINT users_enhanced_email_key;
  END IF;
  
  -- Drop existing index if it exists
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_users_enhanced_tenant_email') THEN
    DROP INDEX ix_users_enhanced_tenant_email;
  END IF;
END $$;

-- Convert email column to citext (case-insensitive text)
ALTER TABLE users_enhanced
  ALTER COLUMN email TYPE citext USING email::citext;

-- Create unique index on (tenant_id, email) for multi-tenant uniqueness
-- Each tenant can have one user with a given email
CREATE UNIQUE INDEX ix_users_enhanced_tenant_email
  ON users_enhanced(tenant_id, email);

-- ----------------------------------------------------------------------------
-- 5. Add Foreign Key constraints for referential integrity
-- ----------------------------------------------------------------------------

-- users_enhanced.tenant_id -> clients.id (RESTRICT delete to prevent orphans)
-- Check if constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_users_enhanced_tenant' 
    AND conrelid = 'users_enhanced'::regclass
  ) THEN
    ALTER TABLE users_enhanced
      ADD CONSTRAINT fk_users_enhanced_tenant
      FOREIGN KEY (tenant_id) REFERENCES clients(id)
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

-- payment_requests.clientId -> clients.id (CASCADE delete with client)
-- When a client is deleted, their payment requests are also deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_payment_requests_client' 
    AND conrelid = 'payment_requests'::regclass
  ) THEN
    ALTER TABLE payment_requests
      ADD CONSTRAINT fk_payment_requests_client
      FOREIGN KEY ("clientId") REFERENCES clients(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Create performance indexes for common query patterns
-- ----------------------------------------------------------------------------

-- Index for payment_requests: Filter by client, status, and due date
-- Supports queries like: SELECT * FROM payment_requests 
--   WHERE clientId = ? AND status = ? ORDER BY dueDate
CREATE INDEX IF NOT EXISTS ix_payment_requests_client_status_duedate
  ON payment_requests("clientId", status, "dueDate");

-- Index for thread_messages: Get messages in a thread, newest first
-- Supports queries like: SELECT * FROM thread_messages 
--   WHERE threadId = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS ix_thread_messages_thread_created
  ON thread_messages("threadId", created_at DESC);

-- Index for audit_log: Query events by time range
-- Supports queries like: SELECT * FROM audit_log 
--   WHERE event_time BETWEEN ? AND ?
CREATE INDEX IF NOT EXISTS ix_audit_event_time
  ON audit_log(event_time);

-- ----------------------------------------------------------------------------
-- 7. Create trigger function for auto-updating updated_at
-- ----------------------------------------------------------------------------

-- Function to automatically set updated_at on row updates
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users_enhanced', 'clients', 'payment_requests', 'thread_messages', 'tasks'])
  LOOP
    -- Drop existing trigger if exists
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    -- Create new trigger
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_updated_at()
    ', t, t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 8. Update existing rows with timestamps if NULL
-- ----------------------------------------------------------------------------

UPDATE users_enhanced SET created_at = NOW() WHERE created_at IS NULL;
UPDATE users_enhanced SET updated_at = NOW() WHERE updated_at IS NULL;

UPDATE clients SET created_at = NOW() WHERE created_at IS NULL;
UPDATE clients SET updated_at = NOW() WHERE updated_at IS NULL;

UPDATE payment_requests SET created_at = NOW() WHERE created_at IS NULL;
UPDATE payment_requests SET updated_at = NOW() WHERE updated_at IS NULL;

UPDATE thread_messages SET created_at = NOW() WHERE created_at IS NULL;
UPDATE thread_messages SET updated_at = NOW() WHERE updated_at IS NULL;

UPDATE tasks SET created_at = NOW() WHERE created_at IS NULL;
UPDATE tasks SET updated_at = NOW() WHERE updated_at IS NULL;

COMMIT;

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================
-- To rollback, run the following statements in a separate transaction:
-- 
-- BEGIN;
-- 
-- -- 1. Drop triggers
-- DROP TRIGGER IF EXISTS trg_users_enhanced_updated_at ON users_enhanced;
-- DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
-- DROP TRIGGER IF EXISTS trg_payment_requests_updated_at ON payment_requests;
-- DROP TRIGGER IF EXISTS trg_thread_messages_updated_at ON thread_messages;
-- DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
-- 
-- -- 2. Drop trigger function (only if no other triggers use it)
-- -- DROP FUNCTION IF EXISTS trigger_set_updated_at();
-- 
-- -- 3. Drop indexes
-- DROP INDEX IF EXISTS ix_payment_requests_client_status_duedate;
-- DROP INDEX IF EXISTS ix_thread_messages_thread_created;
-- DROP INDEX IF EXISTS ix_audit_event_time;
-- DROP INDEX IF EXISTS ix_users_enhanced_tenant_email;
-- 
-- -- 4. Drop foreign key constraints
-- ALTER TABLE users_enhanced DROP CONSTRAINT IF EXISTS fk_users_enhanced_tenant;
-- ALTER TABLE payment_requests DROP CONSTRAINT IF EXISTS fk_payment_requests_client;
-- 
-- -- 5. Revert email column to varchar (loses case-insensitivity)
-- ALTER TABLE users_enhanced ALTER COLUMN email TYPE VARCHAR(255) USING email::VARCHAR;
-- 
-- -- 6. Drop version columns
-- ALTER TABLE payment_requests DROP COLUMN IF EXISTS version;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS version;
-- 
-- -- 7. Drop timestamp columns (CAUTION: Data loss!)
-- -- Uncomment only if you want to remove audit columns entirely
-- -- ALTER TABLE users_enhanced DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
-- -- ALTER TABLE clients DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
-- -- ALTER TABLE payment_requests DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
-- -- ALTER TABLE thread_messages DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
-- -- ALTER TABLE tasks DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_at;
-- 
-- COMMIT;
-- ============================================================================
