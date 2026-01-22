-- Migration: Remove Module Management Page from Enterprise Admin
-- Date: 2026-01-22
-- Description: Remove the deprecated /enterprise-admin/modules page as module allocation is no longer needed.
--              Only Role and Page allocation will be used going forward.

-- Remove the page record if it exists
DELETE FROM pages WHERE page_code = 'ENTERPRISE_ADMIN_MODULES';
DELETE FROM pages WHERE route = '/enterprise-admin/modules';

-- Remove any role-page mappings for this page
DELETE FROM role_pages WHERE page_id IN (
  SELECT id FROM pages WHERE page_code = 'ENTERPRISE_ADMIN_MODULES' OR route = '/enterprise-admin/modules'
);

-- Log the change
DO $$
BEGIN
  RAISE NOTICE 'Removed Module Management page (/enterprise-admin/modules) from database';
END $$;
