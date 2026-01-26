-- ============================================================================
-- BISMAN ERP - RBAC Validation Queries (Post-Fix)
-- Generated: 2026-01-27
-- Run these queries after applying fixes to confirm system health
-- ============================================================================

-- ============================================================================
-- VALIDATION 1: No page has NULL module
-- Expected: 0 rows
-- ============================================================================
SELECT 'V1: Pages with NULL module_id' as validation;
SELECT id, page_code, display_name, route
FROM pages_master 
WHERE module_id IS NULL AND status = 'active';

-- ============================================================================
-- VALIDATION 2: No active UI page is orphan (except RESTRICTED_COMMON)
-- Expected: 0 rows
-- ============================================================================
SELECT 'V2: Orphan UI pages (no roles, not public, not common)' as validation;
SELECT p.id, p.page_code, p.display_name, p.route, m.module_code, p.category
FROM pages_master p
LEFT JOIN modules_master m ON p.module_id = m.id
LEFT JOIN role_page_access rpa ON p.id = rpa.page_id
WHERE p.status = 'active' 
  AND p.page_type = 'UI_PAGE'
  AND p.is_public = false
  AND p.category NOT IN ('PUBLIC', 'RESTRICTED_COMMON')
  AND rpa.page_id IS NULL;

-- ============================================================================
-- VALIDATION 3: No PUBLIC page has role mappings
-- Expected: 0 rows
-- ============================================================================
SELECT 'V3: PUBLIC pages with role assignments' as validation;
SELECT p.id, p.page_code, p.route, p.category, array_agg(rpa.role_name) as roles
FROM pages_master p
JOIN role_page_access rpa ON p.id = rpa.page_id
WHERE p.status = 'active' 
  AND (p.is_public = true OR p.category = 'PUBLIC')
GROUP BY p.id, p.page_code, p.route, p.category;

-- ============================================================================
-- VALIDATION 4: Sidebar only contains UI_PAGE with show_in_sidebar=true
-- Expected: 0 rows (no violations)
-- ============================================================================
SELECT 'V4: Non-UI pages in sidebar' as validation;
SELECT id, page_code, display_name, route, page_type, show_in_sidebar
FROM pages_master 
WHERE status = 'active' 
  AND show_in_sidebar = true 
  AND page_type != 'UI_PAGE';

-- ============================================================================
-- VALIDATION 5: PUBLIC pages not in sidebar
-- Expected: 0 rows
-- ============================================================================
SELECT 'V5: PUBLIC pages in sidebar' as validation;
SELECT id, page_code, display_name, route, category
FROM pages_master 
WHERE status = 'active' 
  AND show_in_sidebar = true 
  AND (category = 'PUBLIC' OR is_public = true);

-- ============================================================================
-- VALIDATION 6: PUMP module pages are inactive
-- Expected: All PUMP pages have status = 'inactive'
-- ============================================================================
SELECT 'V6: PUMP module pages status' as validation;
SELECT id, page_code, display_name, route, status, is_active, show_in_sidebar
FROM pages_master
WHERE route LIKE '/pump%' OR page_code LIKE '%PUMP%';

-- ============================================================================
-- VALIDATION 7: Module code consistency (no mixed case)
-- Expected: All module_code values are UPPER_SNAKE_CASE
-- ============================================================================
SELECT 'V7: Module code format check' as validation;
SELECT module_code, 
       CASE WHEN module_code = UPPER(module_code) THEN 'OK' ELSE 'NEEDS_FIX' END as format_check
FROM modules_master
ORDER BY module_code;

-- ============================================================================
-- VALIDATION 8: Category values are valid
-- Expected: Only known category values
-- ============================================================================
SELECT 'V8: Category distribution' as validation;
SELECT category, COUNT(*) as count
FROM pages_master
WHERE status = 'active'
GROUP BY category
ORDER BY count DESC;

-- ============================================================================
-- VALIDATION 9: Page type values are valid
-- Expected: Only UI_PAGE, REDIRECT, API_ROUTE
-- ============================================================================
SELECT 'V9: Page type distribution' as validation;
SELECT page_type, COUNT(*) as count
FROM pages_master
WHERE status = 'active'
GROUP BY page_type
ORDER BY count DESC;

-- ============================================================================
-- VALIDATION 10: Role-page assignment summary
-- Expected: All roles have at least some page assignments
-- ============================================================================
SELECT 'V10: Role assignment summary' as validation;
SELECT role_name, COUNT(*) as pages_assigned
FROM role_page_access
GROUP BY role_name
ORDER BY pages_assigned DESC;

-- ============================================================================
-- VALIDATION 11: Pages per module summary
-- Expected: Reasonable distribution across modules
-- ============================================================================
SELECT 'V11: Pages per module' as validation;
SELECT m.module_code, m.display_name, 
       COUNT(p.id) as total_pages,
       COUNT(CASE WHEN p.show_in_sidebar = true THEN 1 END) as sidebar_pages
FROM modules_master m
LEFT JOIN pages_master p ON p.module_id = m.id AND p.status = 'active'
GROUP BY m.id, m.module_code, m.display_name
ORDER BY total_pages DESC;

-- ============================================================================
-- VALIDATION 12: Sidebar pages have role assignments
-- Expected: 0 rows (all sidebar pages should be accessible by at least one role)
-- ============================================================================
SELECT 'V12: Sidebar pages without role assignments' as validation;
SELECT p.id, p.page_code, p.display_name, p.route, m.module_code
FROM pages_master p
LEFT JOIN modules_master m ON p.module_id = m.id
LEFT JOIN role_page_access rpa ON p.id = rpa.page_id
WHERE p.status = 'active' 
  AND p.show_in_sidebar = true
  AND p.is_public = false
  AND p.category NOT IN ('PUBLIC', 'RESTRICTED_COMMON')
  AND rpa.page_id IS NULL;

-- ============================================================================
-- VALIDATION 13: Duplicate routes check
-- Expected: 0 rows
-- ============================================================================
SELECT 'V13: Duplicate routes' as validation;
SELECT route, COUNT(*) as count, array_agg(id) as page_ids
FROM pages_master 
WHERE status = 'active'
GROUP BY route 
HAVING COUNT(*) > 1;

-- ============================================================================
-- FULL HEALTH SUMMARY
-- ============================================================================
SELECT 'HEALTH SUMMARY' as section;

SELECT 
  (SELECT COUNT(*) FROM pages_master WHERE status = 'active') as active_pages,
  (SELECT COUNT(*) FROM pages_master WHERE status = 'active' AND module_id IS NULL) as null_module,
  (SELECT COUNT(*) FROM pages_master WHERE status = 'active' AND show_in_sidebar = true) as sidebar_pages,
  (SELECT COUNT(DISTINCT page_id) FROM role_page_access) as pages_with_roles,
  (SELECT COUNT(DISTINCT role_name) FROM role_page_access) as unique_roles,
  (SELECT COUNT(*) FROM role_page_access) as total_assignments;

-- ============================================================================
-- END OF VALIDATION QUERIES
-- ============================================================================
