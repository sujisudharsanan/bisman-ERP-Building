-- Migration: Fix invalidate_effective_access_cache trigger type mismatch
-- The trigger was comparing integer (assignee_id) with text (user_id), causing
-- "operator does not exist: text = integer" errors when saving role pages

CREATE OR REPLACE FUNCTION invalidate_effective_access_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- When a page/role assignment changes, invalidate affected caches
  -- Cast assignee_id to text to match user_id column type (UUID format)
  UPDATE effective_access_cache 
  SET is_valid = FALSE
  WHERE user_id = COALESCE(NEW.assignee_id, OLD.assignee_id)::text
     OR tenant_id IN (
         SELECT id::text FROM clients WHERE super_admin_id = COALESCE(NEW.assignee_id, OLD.assignee_id)
        );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION invalidate_effective_access_cache() IS 
'Invalidates the effective_access_cache when admin_page_assignments changes. Fixed to cast assignee_id to text for comparison with UUID user_id.';
