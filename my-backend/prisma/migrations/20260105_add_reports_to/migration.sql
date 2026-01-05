-- Migration: Add reports_to column for canonical reporting hierarchy
-- Date: 2026-01-05
-- Author: Principal Systems Architect
-- Reason: Resolve PRINCIPAL_SYSTEMS_AUDIT.md findings - missing reports_to column

-- Step 1: Add reports_to column to users_enhanced
ALTER TABLE users_enhanced 
ADD COLUMN IF NOT EXISTS reports_to UUID NULL;

-- Step 2: Add self-referential FK with cycle prevention (self-reference blocked at DB level)
-- Note: Deep cycle prevention (A->B->C->A) must be handled at service level
ALTER TABLE users_enhanced 
ADD CONSTRAINT fk_users_reports_to 
FOREIGN KEY (reports_to) REFERENCES users_enhanced(id) 
ON DELETE SET NULL;

-- Step 3: Add constraint to prevent self-reference
ALTER TABLE users_enhanced
ADD CONSTRAINT chk_users_no_self_reference 
CHECK (reports_to IS NULL OR reports_to != id);

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
CREATE OR REPLACE VIEW public.users AS
SELECT 
  legacy_id AS id,
  username,
  email,
  password_hash,
  role,
  is_active,
  product_type AS "productType",
  tenant_id,
  super_admin_id,
  created_at,
  profile_pic_url,
  updated_at,
  assigned_modules AS "assignedModules",
  page_permissions AS "pagePermissions",
  business_level,
  reports_to,
  id AS uuid_id
FROM users_enhanced;
