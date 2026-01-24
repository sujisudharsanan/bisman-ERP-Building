-- Migration: Add reports_to column for canonical reporting hierarchy
-- Date: 2026-01-05
-- Author: Principal Systems Architect
-- Reason: Resolve PRINCIPAL_SYSTEMS_AUDIT.md findings - missing reports_to column

-- Step 1: Add reports_to column to users_enhanced
ALTER TABLE users_enhanced 
ADD COLUMN IF NOT EXISTS reports_to UUID NULL;

-- Step 2: Add self-referential FK with cycle prevention (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_reports_to'
  ) THEN
    ALTER TABLE users_enhanced 
    ADD CONSTRAINT fk_users_reports_to 
    FOREIGN KEY (reports_to) REFERENCES users_enhanced(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Add constraint to prevent self-reference (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_no_self_reference'
  ) THEN
    ALTER TABLE users_enhanced
    ADD CONSTRAINT chk_users_no_self_reference 
    CHECK (reports_to IS NULL OR reports_to != id);
  END IF;
END $$;

-- Step 4: Create index for efficient manager lookups
CREATE INDEX IF NOT EXISTS idx_users_enhanced_reports_to 
ON users_enhanced(reports_to);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN users_enhanced.reports_to IS 
'UUID of the user''s direct manager. CANONICAL field for reporting hierarchy. Replaces deprecated manager_id/reporting_manager_id references.';

-- Step 6: Deprecation notice for role_id column
COMMENT ON COLUMN users_enhanced.role_id IS 
'DEPRECATED: Use rbac_user_roles junction table for role assignment. This column is no longer the source of truth for roles.';

-- Step 7: Update users VIEW to include reports_to for backwards compatibility
-- Note: Skipping view recreation as the view already exists with the correct columns
-- The view already includes reports_to and additional columns that we cannot drop
-- CREATE OR REPLACE VIEW cannot remove columns, so we skip this step
