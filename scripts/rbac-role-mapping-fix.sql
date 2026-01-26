-- ============================================================================
-- BISMAN ERP - RBAC Role Mapping Correction Script
-- Generated: 2026-01-27
-- Purpose: Fix role→page mappings, duplicates, BASE_USER inheritance
-- Status: ALREADY APPLIED - For reference only
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add missing RESTRICTED_COMMON pages to base_user_pages
-- ============================================================================

INSERT INTO base_user_pages (page_id, created_at)
SELECT p.id, NOW()
FROM pages_master p
WHERE p.status = 'active'
  AND p.category = 'RESTRICTED_COMMON'
  AND p.id NOT IN (SELECT page_id FROM base_user_pages);

-- Expected: 5 rows (already applied)

-- ============================================================================
-- STEP 2: Remove duplicate role-page mappings (if any exist)
-- ============================================================================

-- First, identify duplicates
-- SELECT role_name, page_id, COUNT(*) 
-- FROM role_page_access 
-- GROUP BY role_name, page_id 
-- HAVING COUNT(*) > 1;

-- Remove duplicates keeping lowest ID
DELETE FROM role_page_access 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM role_page_access 
  GROUP BY role_name, page_id
);

-- ============================================================================
-- STEP 3: Remove "ALL" role mappings (if any exist)
-- ============================================================================

-- First, migrate ALL role pages to base_user_pages if not already there
INSERT INTO base_user_pages (page_id, created_at)
SELECT DISTINCT rpa.page_id, NOW()
FROM role_page_access rpa
WHERE rpa.role_name = 'ALL'
  AND rpa.page_id NOT IN (SELECT page_id FROM base_user_pages);

-- Then delete ALL role mappings
DELETE FROM role_page_access WHERE role_name = 'ALL';

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- V1: No duplicates
SELECT 'Duplicates:' as check, COUNT(*) as count
FROM (
  SELECT role_name, page_id 
  FROM role_page_access 
  GROUP BY role_name, page_id 
  HAVING COUNT(*) > 1
) t;

-- V2: No ALL role
SELECT 'ALL role mappings:' as check, COUNT(*) as count
FROM role_page_access WHERE role_name = 'ALL';

-- V3: All RESTRICTED_COMMON in base_user
SELECT 'Missing RESTRICTED_COMMON:' as check, COUNT(*) as count
FROM pages_master p
WHERE p.status = 'active' 
  AND p.category = 'RESTRICTED_COMMON'
  AND p.id NOT IN (SELECT page_id FROM base_user_pages);

-- V4: base_user_pages count
SELECT 'base_user_pages count:' as check, COUNT(*) as count
FROM base_user_pages;

-- V5: Platform isolation
SELECT 'Business roles with EA/SA:' as check, COUNT(*) as count
FROM role_page_access rpa
JOIN pages_master p ON rpa.page_id = p.id
JOIN modules_master m ON p.module_id = m.id
WHERE rpa.role_name IN ('ACCOUNTANT','ACCOUNTS','BANKER','CFO','CEO','COO','COMPLIANCE',
  'FINANCE_CONTROLLER','LEGAL','MANAGER','OPERATIONS_MANAGER','PROCUREMENT_OFFICER',
  'SALES_MANAGER','STAFF','SUPERVISOR','TREASURY','AUDITOR','BRANCH_INCHARGE')
  AND m.module_code IN ('ENTERPRISE_ADMIN', 'SUPER_ADMIN');

COMMIT;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
