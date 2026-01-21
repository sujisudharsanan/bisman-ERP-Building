-- Migration: Hide duplicate sidebar entries - 2026-01-21
-- Hides duplicate pages from sidebar, keeping the primary versions

BEGIN;

UPDATE pages_master 
SET show_in_sidebar = FALSE, updated_at = NOW()
WHERE route IN (
  '/system/user-management',           -- Duplicate of /super-admin/system/user-management
  '/system/backup-restore',            -- Duplicate of /super-admin/system/backup-restore
  '/system/integration-settings',      -- Duplicate of /super-admin/system/integration-settings
  '/system/system-health-dashboard',   -- Duplicate of /super-admin/system/system-health-dashboard
  '/accounts-payable',                 -- Duplicate of /finance/accounts-payable-summary
  '/production/analytics',             -- Keep /analytics as primary
  '/reconciliation',                   -- Keep /finance/bank-reconciliation
  '/calendar',                         -- Keep /common/calendar
  '/dashboard',                        -- Keep /super-admin for super admin
  '/enterprise-admin/integrations',    -- Admin-specific
  '/notifications',                    -- Keep /common/notifications
  '/admin/notifications',              -- Keep /common/notifications
  '/inventory/reports',                -- Keep /admin/reports
  '/pump-management/server-logs',      -- Keep /system/server-logs
  '/settings',                         -- Keep /admin/settings
  '/admin/task-approvals'              -- Keep /common/task-approvals
);

COMMIT;

-- =====================================================
-- ROLLBACK (if needed):
-- =====================================================
-- UPDATE pages_master 
-- SET show_in_sidebar = TRUE
-- WHERE route IN (...);
