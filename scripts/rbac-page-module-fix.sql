-- ============================================================================
-- BISMAN ERP - RBAC Page ↔ Module Mapping Fix Script
-- Generated: 2026-01-27
-- Database: Railway PostgreSQL
-- ============================================================================
-- 
-- SAFETY INSTRUCTIONS:
-- 1. Run in a transaction (BEGIN/COMMIT)
-- 2. Review affected rows before COMMIT
-- 3. Use ROLLBACK if anything looks wrong
-- 4. Keep backup before running
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Fix Module Mappings
-- ============================================================================

-- 1.1 Move /admin/billing/* pages from BILLING → ADMIN module
UPDATE pages_master 
SET module_id = (SELECT id FROM modules_master WHERE module_code = 'ADMIN'),
    updated_at = NOW()
WHERE route LIKE '/admin/billing%'
  AND module_id = (SELECT id FROM modules_master WHERE module_code = 'BILLING');

-- Check affected rows
DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 1.1: Moved % pages from BILLING to ADMIN module', affected;
END $$;

-- 1.2 Move /admin/reports from REPORTS → ADMIN module
UPDATE pages_master 
SET module_id = (SELECT id FROM modules_master WHERE module_code = 'ADMIN'),
    updated_at = NOW()
WHERE route = '/admin/reports'
  AND module_id = (SELECT id FROM modules_master WHERE module_code = 'REPORTS');

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 1.2: Moved % pages from REPORTS to ADMIN module', affected;
END $$;

-- ============================================================================
-- STEP 2: Deactivate PUMP Module Pages
-- ============================================================================

UPDATE pages_master 
SET status = 'inactive',
    is_active = false,
    show_in_sidebar = false,
    updated_at = NOW()
WHERE route LIKE '/pump%' OR page_code LIKE '%PUMP%';

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 2: Deactivated % PUMP module pages', affected;
END $$;

-- ============================================================================
-- STEP 3: Fix Category Mappings
-- ============================================================================

-- 3.1 Change /welcome/* pages from ROLE_SPECIFIC → RESTRICTED_COMMON
UPDATE pages_master 
SET category = 'RESTRICTED_COMMON',
    updated_at = NOW()
WHERE route LIKE '/welcome%'
  AND category = 'ROLE_SPECIFIC';

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 3.1: Updated % welcome pages to RESTRICTED_COMMON', affected;
END $$;

-- 3.2 Ensure all PUBLIC category pages have is_public = true
UPDATE pages_master 
SET is_public = true,
    updated_at = NOW()
WHERE category = 'PUBLIC' AND is_public = false;

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 3.2: Fixed is_public flag for % PUBLIC pages', affected;
END $$;

-- ============================================================================
-- STEP 4: Fix Orphan Pages (Assign Roles)
-- ============================================================================

-- 4.1 Assign /analytics to ADMIN, ENTERPRISE_ADMIN, SUPER_ADMIN
INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, created_at, updated_at)
SELECT role, p.id, true, false, false, NOW(), NOW()
FROM pages_master p
CROSS JOIN (VALUES ('ADMIN'), ('ENTERPRISE_ADMIN'), ('SUPER_ADMIN')) AS roles(role)
WHERE p.page_code = 'COMMON_ANALYTICS'
  AND NOT EXISTS (
    SELECT 1 FROM role_page_access rpa 
    WHERE rpa.page_id = p.id AND rpa.role_name = roles.role
  );

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 4.1: Assigned /analytics to % roles', affected;
END $$;

-- 4.2 Assign /clients/create to ADMIN, SALES_MANAGER
INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, created_at, updated_at)
SELECT role, p.id, true, true, false, NOW(), NOW()
FROM pages_master p
CROSS JOIN (VALUES ('ADMIN'), ('SALES_MANAGER')) AS roles(role)
WHERE p.page_code = 'COMMON_CLIENTS_CREATE'
  AND NOT EXISTS (
    SELECT 1 FROM role_page_access rpa 
    WHERE rpa.page_id = p.id AND rpa.role_name = roles.role
  );

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 4.2: Assigned /clients/create to % roles', affected;
END $$;

-- 4.3 Assign /enterprise-admin/activity-logs to ENTERPRISE_ADMIN
INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, created_at, updated_at)
SELECT 'ENTERPRISE_ADMIN', p.id, true, false, false, NOW(), NOW()
FROM pages_master p
WHERE p.page_code = 'ENTERPRISE_ADMIN_ACTIVITY_LOGS'
  AND NOT EXISTS (
    SELECT 1 FROM role_page_access rpa 
    WHERE rpa.page_id = p.id AND rpa.role_name = 'ENTERPRISE_ADMIN'
  );

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 4.3: Assigned /enterprise-admin/activity-logs to % roles', affected;
END $$;

-- 4.4 Assign /enterprise-admin/subscriptions to ENTERPRISE_ADMIN
INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, created_at, updated_at)
SELECT 'ENTERPRISE_ADMIN', p.id, true, true, false, NOW(), NOW()
FROM pages_master p
WHERE p.page_code = 'ENTERPRISE_ADMIN_SUBSCRIPTIONS'
  AND NOT EXISTS (
    SELECT 1 FROM role_page_access rpa 
    WHERE rpa.page_id = p.id AND rpa.role_name = 'ENTERPRISE_ADMIN'
  );

DO $$
DECLARE
  affected INT;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE 'Step 4.4: Assigned /enterprise-admin/subscriptions to % roles', affected;
END $$;

-- ============================================================================
-- STEP 5: Update Display Names for Clarity (Optional)
-- ============================================================================

-- 5.1 Make dashboard names more specific
UPDATE pages_master 
SET display_name = 'Super Admin Dashboard',
    updated_at = NOW()
WHERE page_code = 'SUPER_ADMIN_DASHBOARD' AND display_name = 'Dashboard';

UPDATE pages_master 
SET display_name = 'Admin Dashboard',
    updated_at = NOW()
WHERE page_code = 'ADMIN_DASHBOARD' AND display_name = 'Dashboard';

UPDATE pages_master 
SET display_name = 'My Dashboard',
    updated_at = NOW()
WHERE page_code = 'DASHBOARD_HOME' AND display_name = 'Dashboard';

DO $$
BEGIN
  RAISE NOTICE 'Step 5: Updated dashboard display names for clarity';
END $$;

-- ============================================================================
-- VERIFICATION BEFORE COMMIT
-- ============================================================================

-- Show summary of changes
SELECT 'VERIFICATION SUMMARY' as section;

SELECT 'Pages by Module' as check_type, module_code, COUNT(*) as count
FROM pages_master p
JOIN modules_master m ON p.module_id = m.id
WHERE p.status = 'active'
GROUP BY module_code
ORDER BY count DESC;

SELECT 'Orphan Pages Remaining' as check_type, COUNT(*) as count
FROM pages_master p
LEFT JOIN role_page_access rpa ON p.id = rpa.page_id
WHERE p.status = 'active' 
  AND p.page_type = 'UI_PAGE'
  AND p.is_public = false
  AND p.category NOT IN ('PUBLIC', 'RESTRICTED_COMMON')
  AND rpa.page_id IS NULL;

SELECT 'PUMP Pages Status' as check_type, status, COUNT(*) as count
FROM pages_master
WHERE route LIKE '/pump%' OR page_code LIKE '%PUMP%'
GROUP BY status;

-- ============================================================================
-- COMMIT OR ROLLBACK
-- ============================================================================

-- If everything looks good:
-- COMMIT;

-- If something is wrong:
-- ROLLBACK;

-- For safety, leaving as ROLLBACK by default - change to COMMIT after review
ROLLBACK;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
