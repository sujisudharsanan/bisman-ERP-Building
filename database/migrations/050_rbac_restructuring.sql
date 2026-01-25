-- ============================================================================
-- BISMAN ERP - RBAC Restructuring Migration
-- Generated: 2026-01-25
-- Version: 1.0
-- 
-- IMPORTANT: Run in a transaction. Test on staging first.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1: SCHEMA UPDATES
-- ============================================================================

-- Add new columns to pages_master
ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'ROLE_SPECIFIC';
ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS page_type VARCHAR(20) DEFAULT 'UI_PAGE';
ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS sidebar_order INTEGER DEFAULT 999;
ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS requires_base_user BOOLEAN DEFAULT false;

-- Create BASE_USER role
INSERT INTO rbac_roles (name, display_name, description, is_system_role, is_active, created_at)
VALUES ('BASE_USER', 'Base User', 'Default permissions for all logged-in business users', true, true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Create base_user_pages table for inheritance
CREATE TABLE IF NOT EXISTS base_user_pages (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages_master(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page_id)
);

-- ============================================================================
-- PHASE 2: DEACTIVATE REDUNDANT LOGIN PAGES
-- ============================================================================

UPDATE pages_master 
SET is_active = false, show_in_sidebar = false
WHERE route IN (
  '/auth/admin-login',
  '/auth/hub-incharge-login',
  '/auth/standard-login',
  '/qa/login'
);

-- Mark /login as redirect to /auth/login
UPDATE pages_master 
SET page_type = 'REDIRECT', category = 'PUBLIC'
WHERE route = '/login';

-- ============================================================================
-- PHASE 3: SET PAGE CATEGORIES
-- ============================================================================

-- PUBLIC pages (no login required)
UPDATE pages_master SET category = 'PUBLIC'
WHERE route IN (
  '/landing', '/login', '/signup', '/access-denied', '/unauthorized',
  '/status', '/pricing', '/get-started', '/legal/agreements', 
  '/trust-security', '/privacy', '/terms', '/status/rss', '/status/subscribe',
  '/contact-sales', '/support', '/docs/sla'
) OR route LIKE '/auth/%';

-- RESTRICTED_COMMON (BASE_USER pages)
UPDATE pages_master SET category = 'RESTRICTED_COMMON', requires_base_user = true
WHERE route IN (
  '/dashboard',
  '/common/notifications',
  '/common/messages',
  '/common/calendar',
  '/common/about-me',
  '/common/user-settings',
  '/common/task-approvals',
  '/common/payment-request',
  '/common/documentation',
  '/common/security-settings',
  '/common/help-center',
  '/common/change-password',
  '/task-dashboard',
  '/tasks/create',
  '/tasks/clarifications',
  '/tasks/reviews',
  '/approvals',
  '/assistant',
  '/analytics',
  '/notifications',
  '/settings',
  '/settings/security',
  '/calendar',
  '/trace'
);

-- INTERNAL_SUPPORT pages
UPDATE pages_master SET category = 'INTERNAL_SUPPORT'
WHERE route LIKE '/internal/%' OR route LIKE '/qa/%';

-- SYSTEM_ONLY pages
UPDATE pages_master SET category = 'SYSTEM_ONLY'
WHERE route IN (
  '/system/deployment-tools',
  '/system/error-logs',
  '/system/server-logs',
  '/super-admin/system/fallback-recovery',
  '/super-admin/system/deployment-tools'
);

-- ============================================================================
-- PHASE 4: SET SIDEBAR ORDER
-- ============================================================================

-- Dashboards always first (order = 1)
UPDATE pages_master SET sidebar_order = 1 WHERE route = '/dashboard';
UPDATE pages_master SET sidebar_order = 1 WHERE route = '/enterprise-admin/dashboard';
UPDATE pages_master SET sidebar_order = 1 WHERE route = '/super-admin';
UPDATE pages_master SET sidebar_order = 1 WHERE route = '/admin/client-dashboard';

-- Common pages order
UPDATE pages_master SET sidebar_order = 2 WHERE route = '/common/notifications' OR route = '/notifications';
UPDATE pages_master SET sidebar_order = 3 WHERE route = '/common/messages';
UPDATE pages_master SET sidebar_order = 4 WHERE route = '/common/calendar' OR route = '/calendar';
UPDATE pages_master SET sidebar_order = 5 WHERE route = '/common/about-me';
UPDATE pages_master SET sidebar_order = 6 WHERE route = '/common/user-settings' OR route = '/settings';
UPDATE pages_master SET sidebar_order = 10 WHERE route = '/common/task-approvals';
UPDATE pages_master SET sidebar_order = 11 WHERE route = '/common/payment-request';
UPDATE pages_master SET sidebar_order = 20 WHERE route = '/task-dashboard';
UPDATE pages_master SET sidebar_order = 21 WHERE route = '/tasks/create';
UPDATE pages_master SET sidebar_order = 25 WHERE route = '/assistant';
UPDATE pages_master SET sidebar_order = 30 WHERE route = '/analytics';

-- ============================================================================
-- PHASE 5: POPULATE BASE_USER PAGES
-- ============================================================================

INSERT INTO base_user_pages (page_id)
SELECT id FROM pages_master 
WHERE route IN (
  '/dashboard',
  '/common/notifications',
  '/common/messages',
  '/common/calendar',
  '/common/about-me',
  '/common/user-settings',
  '/common/task-approvals',
  '/common/task-approvals/[id]',
  '/common/payment-request',
  '/common/payment-requests/create',
  '/common/documentation',
  '/common/security-settings',
  '/common/help-center',
  '/common/change-password',
  '/task-dashboard',
  '/tasks/create',
  '/tasks/clarifications',
  '/tasks/reviews',
  '/approvals',
  '/assistant',
  '/analytics',
  '/notifications',
  '/settings',
  '/settings/security',
  '/calendar',
  '/trace'
)
AND is_active = true
ON CONFLICT (page_id) DO NOTHING;

-- ============================================================================
-- PHASE 6: FIX CROSS-MODULE LEAKAGE
-- ============================================================================

-- Remove BISMAN_BILLING from /super-admin/* (28 violations found)
DELETE FROM role_page_access 
WHERE role_name = 'BISMAN_BILLING'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/super-admin%');

-- Remove BISMAN_BILLING from /admin/*
DELETE FROM role_page_access 
WHERE role_name = 'BISMAN_BILLING'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');

-- Remove BISMAN_FINANCE from /admin/*
DELETE FROM role_page_access 
WHERE role_name = 'BISMAN_FINANCE'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');

-- Remove CEO from /admin/*
DELETE FROM role_page_access 
WHERE role_name = 'CEO'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');

-- Remove CFO from /admin/*
DELETE FROM role_page_access 
WHERE role_name = 'CFO'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');

-- Remove all business roles from /enterprise-admin/*
DELETE FROM role_page_access 
WHERE role_name NOT IN ('ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN')
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/enterprise-admin%');

-- Remove all non-super-admin roles from /super-admin/*
DELETE FROM role_page_access 
WHERE role_name NOT IN ('SUPER_ADMIN', 'SYSTEM_ADMIN')
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/super-admin%');

-- Remove all non-admin roles from /admin/*
DELETE FROM role_page_access 
WHERE role_name NOT IN ('ADMIN', 'ADMIN_OPS', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN')
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');

-- ============================================================================
-- PHASE 7: REASSIGN PLATFORM ROLES
-- ============================================================================

-- ENTERPRISE_ADMIN: Only enterprise-admin pages
DELETE FROM role_page_access WHERE role_name = 'ENTERPRISE_ADMIN';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'ENTERPRISE_ADMIN', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/enterprise-admin%'
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- SUPER_ADMIN: super-admin/* and system/* pages
DELETE FROM role_page_access WHERE role_name = 'SUPER_ADMIN';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'SUPER_ADMIN', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (route LIKE '/super-admin%' OR route LIKE '/system%')
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- ADMIN: Only admin/* pages
DELETE FROM role_page_access WHERE role_name = 'ADMIN';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'ADMIN', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/admin%'
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- SYSTEM_ADMIN: All platform pages
DELETE FROM role_page_access WHERE role_name = 'SYSTEM_ADMIN';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'SYSTEM_ADMIN', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (
    route LIKE '/super-admin%' 
    OR route LIKE '/enterprise-admin%' 
    OR route LIKE '/admin%'
    OR route LIKE '/system%'
    OR route LIKE '/governance%'
    OR route LIKE '/internal%'
    OR route LIKE '/qa%'
  )
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- ============================================================================
-- PHASE 8: REASSIGN INTERNAL BISMAN ROLES
-- ============================================================================

-- BISMAN_ENGINEERING: internal/*, qa/*, system logs
DELETE FROM role_page_access WHERE role_name = 'BISMAN_ENGINEERING';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'BISMAN_ENGINEERING', id, true, true, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (
    route LIKE '/internal%'
    OR route LIKE '/qa%'
    OR route IN ('/system/error-logs', '/system/server-logs', '/system/deployment-tools')
  )
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- BISMAN_SUPPORT: internal/* only
DELETE FROM role_page_access WHERE role_name = 'BISMAN_SUPPORT';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'BISMAN_SUPPORT', id, true, false, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/internal%'
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true;

-- BISMAN_CUSTOMER_CARE: internal/* only
DELETE FROM role_page_access WHERE role_name = 'BISMAN_CUSTOMER_CARE';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'BISMAN_CUSTOMER_CARE', id, true, false, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/internal%'
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true;

-- BISMAN_BILLING: internal/* and billing/* (NOT admin or super-admin)
DELETE FROM role_page_access WHERE role_name = 'BISMAN_BILLING';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'BISMAN_BILLING', id, true, true, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (route LIKE '/internal%' OR route LIKE '/billing%')
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- BISMAN_FINANCE: internal/* and billing/*
DELETE FROM role_page_access WHERE role_name = 'BISMAN_FINANCE';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'BISMAN_FINANCE', id, true, true, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (route LIKE '/internal%' OR route LIKE '/billing%')
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- QA: qa/* only
DELETE FROM role_page_access WHERE role_name = 'QA';

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'QA', id, true, true, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/qa%'
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- ============================================================================
-- PHASE 9: TRIM BUSINESS ROLES (Remove platform pages, keep module-specific)
-- ============================================================================

-- Remove platform pages from all business roles
DELETE FROM role_page_access 
WHERE role_name IN (
  'CEO', 'CFO', 'COO', 'CTO', 
  'MANAGER', 'HR_MANAGER', 'OPERATIONS_MANAGER', 'FINANCE_CONTROLLER',
  'SUPERVISOR', 'HUB_INCHARGE', 'HUB_INCHARGE_SR', 'STORE_INCHARGE', 'STORE_INCHARGE_SR', 'BRANCH_INCHARGE',
  'ACCOUNTANT', 'AUDITOR', 'BANKER', 'COMPLIANCE', 'LEGAL', 'TREASURY', 'PROCUREMENT_OFFICER', 'ACCOUNTS', 'ACCOUNTS_PAYABLE',
  'STAFF', 'DATA_ENTRY', 'HR', 'INTERN'
)
AND page_id IN (
  SELECT id FROM pages_master 
  WHERE route LIKE '/enterprise-admin%' 
    OR route LIKE '/super-admin%' 
    OR route LIKE '/admin%'
    OR route LIKE '/internal%'
);

-- ============================================================================
-- PHASE 10: ASSIGN CFO FINANCE PAGES
-- ============================================================================

-- Ensure CFO has all finance pages
INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'CFO', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (
    route LIKE '/finance%'
    OR route LIKE '/reconciliation%'
    OR route LIKE '/settlements%'
    OR route IN ('/accounts', '/accounts-payable', '/cfo-dashboard')
  )
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- ============================================================================
-- PHASE 11: ASSIGN HR_MANAGER HR PAGES
-- ============================================================================

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'HR_MANAGER', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/hr%'
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- ============================================================================
-- PHASE 12: ASSIGN OPERATIONS_MANAGER OPERATIONS PAGES
-- ============================================================================

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'OPERATIONS_MANAGER', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (route LIKE '/operations%' OR route IN ('/store-incharge', '/operations-manager'))
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- ============================================================================
-- PHASE 13: ASSIGN COMPLIANCE PAGES
-- ============================================================================

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'COMPLIANCE', id, true, true, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (route LIKE '/compliance%' OR route LIKE '/governance%')
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'LEGAL', id, true, true, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (route LIKE '/compliance%' OR route LIKE '/legal%')
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- ============================================================================
-- PHASE 14: ASSIGN PROCUREMENT PAGES
-- ============================================================================

INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'PROCUREMENT_OFFICER', id, true, true, false, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/procurement%'
ON CONFLICT (role_name, page_id) DO UPDATE SET can_view = true, can_edit = true;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Verify page counts per role
-- SELECT role_name, COUNT(*) as page_count 
-- FROM role_page_access 
-- GROUP BY role_name 
-- ORDER BY page_count DESC;

-- Verify no cross-module leakage
-- SELECT 'EA Leakage' as check, COUNT(*) FROM role_page_access rpa
-- JOIN pages_master pm ON rpa.page_id = pm.id
-- WHERE pm.route LIKE '/enterprise-admin%' 
--   AND rpa.role_name NOT IN ('ENTERPRISE_ADMIN', 'SYSTEM_ADMIN');

-- SELECT 'SA Leakage' as check, COUNT(*) FROM role_page_access rpa
-- JOIN pages_master pm ON rpa.page_id = pm.id
-- WHERE pm.route LIKE '/super-admin%' 
--   AND rpa.role_name NOT IN ('SUPER_ADMIN', 'SYSTEM_ADMIN');

-- Verify BASE_USER pages
-- SELECT COUNT(*) as base_user_page_count FROM base_user_pages;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- If something goes wrong, rollback using:
-- ROLLBACK;
-- 
-- Or restore from backup:
-- pg_restore -d railway latest_backup.dump
-- ============================================================================
