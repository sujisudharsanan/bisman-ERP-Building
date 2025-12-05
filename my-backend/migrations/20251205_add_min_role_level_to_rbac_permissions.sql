-- Migration: Add min_role_level to rbac_permissions
-- Date: 2025-12-05
-- Description: Adds min_role_level column to rbac_permissions for privilege escalation protection
--              This column defines the minimum role level required to have/assign this permission

-- ============================================
-- 1. Add min_role_level column
-- ============================================

-- Add the column with a default of 0 (no restriction)
ALTER TABLE rbac_permissions 
ADD COLUMN IF NOT EXISTS min_role_level INTEGER DEFAULT 0;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN rbac_permissions.min_role_level IS 
    'Minimum role level required to have or assign this permission. Higher = more privileged. 0 = no restriction.';

-- ============================================
-- 2. Create index for efficient role level lookups
-- ============================================

CREATE INDEX IF NOT EXISTS idx_rbac_permissions_min_role_level 
ON rbac_permissions(min_role_level);

-- ============================================
-- 3. Seed system-critical permissions with high min_role_level
--    These permissions should only be accessible to high-level admins
-- ============================================

-- First, let's identify and update critical routes that should have high min_role_level
-- Pattern: If the route involves user management, role management, or system config,
-- set min_role_level to 100 (Super Admin level)

-- Update permissions for role management routes (level 100 = Super Admin only)
UPDATE rbac_permissions p
SET min_role_level = 100
FROM rbac_routes rt
WHERE p.route_id = rt.id
  AND (
    rt.path LIKE '%/roles%'
    OR rt.path LIKE '%/privileges%'
    OR rt.path LIKE '%/permissions%'
    OR rt.path LIKE '%/rbac%'
  )
  AND p.min_role_level = 0;

-- Update permissions for user management routes (level 80 = Admin or higher)
UPDATE rbac_permissions p
SET min_role_level = 80
FROM rbac_routes rt
WHERE p.route_id = rt.id
  AND (
    rt.path LIKE '%/users%'
    OR rt.path LIKE '%/super-admin%'
    OR rt.path LIKE '%/enterprise-admin%'
  )
  AND p.min_role_level = 0;

-- Update permissions for audit/security routes (level 90 = Senior Admin)
UPDATE rbac_permissions p
SET min_role_level = 90
FROM rbac_routes rt
WHERE p.route_id = rt.id
  AND (
    rt.path LIKE '%/audit%'
    OR rt.path LIKE '%/security%'
    OR rt.path LIKE '%/logs%'
  )
  AND p.min_role_level = 0;

-- Update permissions for system configuration (level 100 = Super Admin only)
UPDATE rbac_permissions p
SET min_role_level = 100
FROM rbac_routes rt
WHERE p.route_id = rt.id
  AND (
    rt.path LIKE '%/system%'
    OR rt.path LIKE '%/config%'
    OR rt.path LIKE '%/settings%'
  )
  AND p.min_role_level = 0;

-- ============================================
-- 4. Ensure rbac_roles has appropriate level values
--    (Reference levels for the permission checks)
-- ============================================

-- Set level for Enterprise Admin if not set
UPDATE rbac_roles 
SET level = 100 
WHERE LOWER(name) LIKE '%enterprise%admin%' 
  AND (level IS NULL OR level < 100);

-- Set level for Super Admin
UPDATE rbac_roles 
SET level = 90 
WHERE LOWER(name) LIKE '%super%admin%' 
  AND LOWER(name) NOT LIKE '%enterprise%'
  AND (level IS NULL OR level < 90);

-- Set level for Admin
UPDATE rbac_roles 
SET level = 80 
WHERE LOWER(name) = 'admin' 
  AND (level IS NULL OR level < 80);

-- Set level for Manager
UPDATE rbac_roles 
SET level = 50 
WHERE LOWER(name) LIKE '%manager%' 
  AND (level IS NULL OR level < 50);

-- ============================================
-- 5. Verification Queries (run manually to confirm)
-- ============================================

-- Check column exists:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'rbac_permissions' AND column_name = 'min_role_level';

-- Check seeded permissions:
-- SELECT p.id, p.name, p.min_role_level, rt.path, r.name as role_name, r.level as role_level
-- FROM rbac_permissions p
-- LEFT JOIN rbac_routes rt ON p.route_id = rt.id
-- LEFT JOIN rbac_roles r ON p.role_id = r.id
-- WHERE p.min_role_level >= 80
-- ORDER BY p.min_role_level DESC, rt.path
-- LIMIT 20;

-- Check role levels:
-- SELECT id, name, level FROM rbac_roles ORDER BY level DESC;

-- ============================================
-- Migration Complete
-- ============================================
