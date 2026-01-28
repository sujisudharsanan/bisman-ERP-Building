-- Migration: Fix task status change trigger to handle integer->UUID conversion
-- Issue: workflow_tasks.creator_id is INTEGER, workflow_task_history.actor_id is UUID
-- Solution: Look up UUID from users_enhanced based on legacy_id

CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS trigger AS $$
DECLARE
  actor_uuid UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Look up UUID from users_enhanced based on legacy_id
    SELECT id INTO actor_uuid FROM users_enhanced WHERE legacy_id = NEW.creator_id LIMIT 1;
    
    -- If no UUID found, skip logging (don't fail the transaction)
    IF actor_uuid IS NOT NULL THEN
      INSERT INTO workflow_task_history (task_id, from_status, to_status, action, actor_id, actor_type)
      VALUES (NEW.id, OLD.status, NEW.status, 'STATUS_CHANGE', actor_uuid, 'USER');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists on workflow_tasks
DROP TRIGGER IF EXISTS task_status_change_trigger ON workflow_tasks;
CREATE TRIGGER task_status_change_trigger
  AFTER UPDATE ON workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_status_change();
