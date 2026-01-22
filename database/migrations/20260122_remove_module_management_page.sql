-- Migration: Remove Module Management page from enterprise-admin
-- Date: 2026-01-22
-- Description: Removes the Module Management page from sidebar as only Role and Page allocation is needed

-- Delete the Module Management page from pages table
DELETE FROM pages 
WHERE code = 'enterprise-admin-modules' 
   OR (route = '/enterprise-admin/modules' AND module_key = 'enterprise-admin');

-- Also delete any role_pages associations for this page
DELETE FROM role_pages 
WHERE page_id IN (
    SELECT id FROM pages 
    WHERE code = 'enterprise-admin-modules'
       OR (route = '/enterprise-admin/modules' AND module_key = 'enterprise-admin')
);

-- Verify deletion
SELECT 'Remaining enterprise-admin pages:' AS info;
SELECT code, name, route FROM pages WHERE module_key = 'enterprise-admin' ORDER BY sort_order;
