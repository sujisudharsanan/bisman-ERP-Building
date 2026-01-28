-- Migration: 036_fix_task_status_constraint.sql
-- Description: Update workflow_tasks status constraint to include IN_REVIEW and other missing statuses
-- Date: 2026-01-28

-- Drop old constraint
ALTER TABLE workflow_tasks DROP CONSTRAINT IF EXISTS chk_workflow_tasks_status;

-- Add new constraint with all valid statuses
ALTER TABLE workflow_tasks 
ADD CONSTRAINT chk_workflow_tasks_status 
CHECK (status IN (
  'OPEN', 
  'IN_PROGRESS', 
  'IN_REVIEW',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'DONE', 
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
  'ON_HOLD',
  'BLOCKED',
  'todo',
  'pending',
  'in_progress',
  'completed',
  'on_hold',
  'cancelled',
  'blocked',
  'review',
  'done'
));

-- Verify
SELECT pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'chk_workflow_tasks_status';
