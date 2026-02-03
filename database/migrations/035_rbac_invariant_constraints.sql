-- ============================================================================
-- RBAC INVARIANT ENFORCEMENT - DATABASE CONSTRAINTS
-- ============================================================================
-- 
-- INVARIANT: admin_page_assignments must NEVER contain a row where the 
-- assigner lacks upstream authority over the page.
--
-- This migration adds database-level protection:
-- 1. CHECK constraint to prevent assigner_id = 0 (orphan records)
-- 2. Cleanup existing orphan records before adding constraint
--
-- Run this migration AFTER the application code is deployed with invariant
-- enforcement, so new violations are prevented at the application layer.
-- ============================================================================

-- STEP 1: Identify orphan records (assigner_id = 0)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count 
  FROM admin_page_assignments 
  WHERE assigner_id = 0;
  
  RAISE NOTICE 'Found % orphan records with assigner_id = 0', orphan_count;
END $$;

-- STEP 2: Soft-delete orphan records (preserve audit trail)
-- Instead of DELETE, set is_active = false and mark as orphaned
UPDATE admin_page_assignments
SET 
  is_active = false,
  revoked_at = NOW(),
  updated_at = NOW()
WHERE assigner_id = 0
  AND is_active = true;

-- STEP 3: Add CHECK constraint to prevent future orphans
-- This will FAIL if any active records have assigner_id <= 0
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_assigner_id_positive'
  ) THEN
    -- Verify no active violations exist
    IF EXISTS (
      SELECT 1 FROM admin_page_assignments 
      WHERE assigner_id <= 0 AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Cannot add constraint: Active records with assigner_id <= 0 still exist';
    END IF;
    
    -- Add the constraint
    ALTER TABLE admin_page_assignments 
    ADD CONSTRAINT chk_assigner_id_positive 
    CHECK (assigner_id > 0 OR is_active = false);
    
    RAISE NOTICE 'Added CHECK constraint chk_assigner_id_positive';
  ELSE
    RAISE NOTICE 'Constraint chk_assigner_id_positive already exists';
  END IF;
END $$;

-- STEP 4: Add comment documenting the invariant
COMMENT ON CONSTRAINT chk_assigner_id_positive ON admin_page_assignments IS 
'RBAC INVARIANT: Every active assignment must have a valid assigner. assigner_id=0 indicates orphan data that bypassed validation.';

-- STEP 5: Verify constraint is in place
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_assigner_id_positive'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'VERIFICATION: chk_assigner_id_positive constraint is active';
  ELSE
    RAISE WARNING 'VERIFICATION FAILED: Constraint was not created';
  END IF;
END $$;
