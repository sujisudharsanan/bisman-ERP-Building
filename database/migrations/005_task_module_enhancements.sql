-- ============================================================================
-- Migration: Task Module Schema Enhancements
-- Version: 2025-12-11
-- Author: Copilot (sujisudharsanan/bisman-ERP-Building)
-- ============================================================================
-- 
-- This migration adds:
-- 1. task_audit_logs table for dedicated task audit logging
-- 2. Foreign key constraints for task_messages and task_attachments
-- 3. Performance index on workflow_tasks.assignee_id
--
-- PRE-REQUISITES:
-- - Run orphan check queries to ensure no orphaned messages/attachments
-- - Take database backup before running in production
--
-- ROLLBACK INSTRUCTIONS:
-- See bottom of this file for rollback SQL
-- ============================================================================

-- ============================================================================
-- PART 1: Create task_audit_logs table
-- ============================================================================
-- Purpose: Dedicated audit logging for task operations, separate from
-- the generic audit_logs table. Enables faster queries for task-specific
-- audit trails and better data isolation.

CREATE TABLE IF NOT EXISTS task_audit_logs (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,       -- e.g., 'status_change', 'create', 'update', 'delete'
  resource VARCHAR(100) NOT NULL,     -- e.g., 'task', 'task_message', 'task_attachment'
  resource_id VARCHAR(100) NOT NULL,  -- ID of the resource (task ID, etc.)
  metadata JSONB,                     -- Additional context (old_status, new_status, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for efficient lookup by resource
CREATE INDEX IF NOT EXISTS idx_task_audit_resource_id ON task_audit_logs(resource, resource_id);

-- Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_task_audit_tenant ON task_audit_logs(tenant_id);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_task_audit_created_at ON task_audit_logs(created_at);

-- ============================================================================
-- PART 2: Add foreign key constraints
-- ============================================================================
-- Purpose: Ensure referential integrity between tasks and related tables.
-- ON DELETE CASCADE ensures orphaned messages/attachments are cleaned up
-- when a task is deleted.
--
-- IMPORTANT: Before running, verify no orphaned rows exist:
--   SELECT COUNT(*) FROM task_messages tm 
--   LEFT JOIN workflow_tasks wt ON tm.task_id = wt.id 
--   WHERE wt.id IS NULL;
--
--   SELECT COUNT(*) FROM task_attachments ta 
--   LEFT JOIN workflow_tasks wt ON ta.task_id = wt.id 
--   WHERE wt.id IS NULL;

-- FK for task_messages (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_task_messages_task' 
    AND table_name = 'task_messages'
  ) THEN
    ALTER TABLE task_messages
      ADD CONSTRAINT fk_task_messages_task
      FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- FK for task_attachments (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_task_attachments_task' 
    AND table_name = 'task_attachments'
  ) THEN
    ALTER TABLE task_attachments
      ADD CONSTRAINT fk_task_attachments_task
      FOREIGN KEY (task_id) REFERENCES workflow_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Add performance indexes
-- ============================================================================
-- Purpose: Improve query performance for common access patterns

-- Index on assignee_id for filtering tasks by assignee
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_to ON workflow_tasks(assignee_id);

-- Index on creator_id for filtering tasks by creator (if not exists)
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_creator_id ON workflow_tasks(creator_id);

-- Composite index for common filter combination (tenant + status)
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_tenant_status ON workflow_tasks(tenant_id, status);

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================
-- 
-- Verify task_audit_logs table:
-- SELECT COUNT(*) FROM task_audit_logs; -- Should be 0 initially
--
-- Verify FK constraints:
-- SELECT constraint_name, table_name 
-- FROM information_schema.table_constraints 
-- WHERE constraint_type = 'FOREIGN KEY' 
-- AND table_name IN ('task_messages', 'task_attachments');
--
-- Verify indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'workflow_tasks';

-- ============================================================================
-- ROLLBACK SQL (if needed)
-- ============================================================================
/*
-- Remove indexes
DROP INDEX IF EXISTS idx_workflow_tasks_assigned_to;
DROP INDEX IF EXISTS idx_workflow_tasks_creator_id;
DROP INDEX IF EXISTS idx_workflow_tasks_tenant_status;

-- Remove FK constraints
ALTER TABLE task_messages DROP CONSTRAINT IF EXISTS fk_task_messages_task;
ALTER TABLE task_attachments DROP CONSTRAINT IF EXISTS fk_task_attachments_task;

-- Remove audit table indexes
DROP INDEX IF EXISTS idx_task_audit_resource_id;
DROP INDEX IF EXISTS idx_task_audit_tenant;
DROP INDEX IF EXISTS idx_task_audit_created_at;

-- Remove audit table
DROP TABLE IF EXISTS task_audit_logs;
*/
