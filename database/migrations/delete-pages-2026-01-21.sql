-- Migration: Delete pages - 2026-01-21
-- This script deactivates pages and removes their RBAC assignments
-- Run this on Railway database

BEGIN;

-- =====================================================
-- STEP 1: Deactivate pages in pages_master
-- =====================================================

UPDATE pages_master SET is_active = false, updated_at = NOW()
WHERE route IN (
  '/super-admin/system/deployment-tools',
  '/super-admin/system/fallback-recovery',
  '/super-admin/decision-load',
  '/super-admin/system/pages-roles-report',
  '/super-admin/about-me',
  '/super-admin/system/role-access-explorer',
  '/super-admin/system/system-health',
  '/super-admin/system/system-settings',
  '/dashboard/requests',
  '/system/pages-roles-report',
  '/system/clients',
  '/system/deployment-tools',
  '/system/error-logs',
  '/super-admin/subscriptions/settings',
  '/common/hr-policy',
  '/common/change-password',
  '/common/help-center'
);

-- =====================================================
-- STEP 2: Get page IDs for RBAC cleanup
-- =====================================================

-- Store page IDs in a temp table for RBAC cleanup
CREATE TEMP TABLE pages_to_delete AS
SELECT id, display_name, route FROM pages_master
WHERE route IN (
  '/super-admin/system/deployment-tools',
  '/super-admin/system/fallback-recovery',
  '/super-admin/decision-load',
  '/super-admin/system/pages-roles-report',
  '/super-admin/about-me',
  '/super-admin/system/role-access-explorer',
  '/super-admin/system/system-health',
  '/super-admin/system/system-settings',
  '/dashboard/requests',
  '/system/pages-roles-report',
  '/system/clients',
  '/system/deployment-tools',
  '/system/error-logs',
  '/super-admin/subscriptions/settings',
  '/common/hr-policy',
  '/common/change-password',
  '/common/help-center'
);

-- =====================================================
-- STEP 3: Remove RBAC assignments
-- =====================================================

-- Delete from role_page_access
DELETE FROM role_page_access 
WHERE page_id IN (SELECT id FROM pages_to_delete);

-- Delete from rbac_user_permissions (uses page_key column, not page_id)
DELETE FROM rbac_user_permissions
WHERE page_key IN (SELECT route FROM pages_to_delete);

-- =====================================================
-- STEP 4: Show what was affected
-- =====================================================

SELECT 'Deactivated pages:' as action, count(*) as count FROM pages_to_delete;

-- Cleanup temp table
DROP TABLE pages_to_delete;

COMMIT;

-- =====================================================
-- ROLLBACK PLAN (if needed):
-- =====================================================
-- UPDATE pages_master SET is_active = true WHERE route IN (...);
-- Then restore git files with: git checkout HEAD~1 -- my-frontend/src/app/...
