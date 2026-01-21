-- =====================================================
-- SQL Script to remove deprecated enterprise-admin pages
-- Pages removed:
--   - /enterprise-admin/live-dashboard
--   - /enterprise-admin/settings
--   - /enterprise-admin/support
-- 
-- Run this in the Railway PostgreSQL console or via CLI
-- =====================================================

-- First, check what will be deleted
SELECT page_code, route, display_name 
FROM pages_master 
WHERE page_code IN ('ENTERPRISE_ADMIN_LIVE_DASHBOARD', 'ENTERPRISE_ADMIN_SETTINGS', 'ENTERPRISE_ADMIN_SUPPORT')
   OR route IN ('/enterprise-admin/live-dashboard', '/enterprise-admin/settings', '/enterprise-admin/support');

-- Delete from role_pages first (if foreign keys exist)
DELETE FROM role_pages 
WHERE page_id IN (
  SELECT id FROM pages_master 
  WHERE page_code IN ('ENTERPRISE_ADMIN_LIVE_DASHBOARD', 'ENTERPRISE_ADMIN_SETTINGS', 'ENTERPRISE_ADMIN_SUPPORT')
     OR route IN ('/enterprise-admin/live-dashboard', '/enterprise-admin/settings', '/enterprise-admin/support')
);

-- Delete from subscription_pages if exists
DELETE FROM subscription_pages 
WHERE page_id IN (
  SELECT id FROM pages_master 
  WHERE page_code IN ('ENTERPRISE_ADMIN_LIVE_DASHBOARD', 'ENTERPRISE_ADMIN_SETTINGS', 'ENTERPRISE_ADMIN_SUPPORT')
     OR route IN ('/enterprise-admin/live-dashboard', '/enterprise-admin/settings', '/enterprise-admin/support')
);

-- Finally delete from pages_master
DELETE FROM pages_master 
WHERE page_code IN ('ENTERPRISE_ADMIN_LIVE_DASHBOARD', 'ENTERPRISE_ADMIN_SETTINGS', 'ENTERPRISE_ADMIN_SUPPORT')
   OR route IN ('/enterprise-admin/live-dashboard', '/enterprise-admin/settings', '/enterprise-admin/support');

-- Verify deletion
SELECT COUNT(*) as remaining FROM pages_master 
WHERE route LIKE '/enterprise-admin/live-dashboard%' 
   OR route LIKE '/enterprise-admin/settings%' 
   OR route LIKE '/enterprise-admin/support%';
