-- ═══════════════════════════════════════════════════════════════════════════════
-- PAGE SYNC RECONCILIATION SQL
-- BISMAN ERP - Page Gap Elimination
-- Generated: 2025-01-21
-- Status: APPLIED via node scripts/audit-pages.js --fix --commit
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- This SQL script fixes the broken routes identified by the page audit:
-- - Deactivates DB entries that have no corresponding page.tsx file
--
-- SAFETY: This script does NOT delete any records. It only:
--   1. Sets is_active=false for orphan entries
--   2. Sets show_in_sidebar=false for orphan entries
--
-- RESULT AFTER APPLYING:
--   ✅ 301 OK matched (FS + DB)
--   ✅ 0 FILE_ONLY (no missing DB entries)  
--   ✅ 0 Active Orphans (all orphan DB entries deactivated)
--   ℹ️ 8 DB_ONLY (inactive orphans - can be cleaned up later)
--
-- ROLLBACK INSTRUCTIONS are provided at the end.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: DEACTIVATE ORPHAN DB ENTRIES
-- These routes exist in pages_master but have no page.tsx file
-- ═══════════════════════════════════════════════════════════════════════════════

-- /auth/admin-login - No page.tsx file exists
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route = '/auth/admin-login' AND is_active = true;

-- /common/messages - No page.tsx file exists  
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route = '/common/messages' AND is_active = true;

-- /enterprise-admin/monitoring/system-health - No page.tsx file exists
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route = '/enterprise-admin/monitoring/system-health' AND is_active = true;

-- /enterprise-admin/user-usage/[id] - No page.tsx file exists (dynamic route)
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route LIKE '/enterprise-admin/user-usage%' AND is_active = true;

-- /get-started - No page.tsx file exists
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route = '/get-started' AND is_active = true;

-- /onboarding/trial - No page.tsx file exists
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route = '/onboarding/trial' AND is_active = true;

-- /onboarding/trial/quick - No page.tsx file exists
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route = '/onboarding/trial/quick' AND is_active = true;

-- /onboarding/trial/resume/[token] - No page.tsx file exists
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route LIKE '/onboarding/trial/resume%' AND is_active = true;

-- /super-admin/user-usage/[id] - No page.tsx file exists
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false, updated_at = NOW()
WHERE route LIKE '/super-admin/user-usage%' AND is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: INSERT ROOT PAGE
-- The / (home) page exists in filesystem but not in database
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO pages_master (
  page_code, 
  display_name, 
  route, 
  is_active, 
  show_in_sidebar, 
  is_public,
  layout_group,
  description,
  created_at, 
  updated_at
)
VALUES (
  'ROOT',
  'Home',
  '/',
  true,
  false,
  true,
  'common',
  'Application root/landing page',
  NOW(),
  NOW()
)
ON CONFLICT (page_code) DO UPDATE SET
  route = EXCLUDED.route,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- Run these after applying to verify the fix
-- ═══════════════════════════════════════════════════════════════════════════════

-- Check deactivated routes
-- SELECT page_code, route, is_active, show_in_sidebar FROM pages_master 
-- WHERE route IN ('/auth/admin-login', '/common/messages', '/get-started', '/onboarding/trial');

-- Check root page was inserted
-- SELECT page_code, route, is_active, is_public FROM pages_master WHERE route = '/';

-- Count active vs inactive pages
-- SELECT 
--   COUNT(*) FILTER (WHERE is_active = true) as active_pages,
--   COUNT(*) FILTER (WHERE is_active = false) as inactive_pages,
--   COUNT(*) as total_pages
-- FROM pages_master;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK SCRIPT (if needed)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- To revert the deactivations, run:
--
-- UPDATE pages_master SET is_active = true WHERE route = '/auth/admin-login';
-- UPDATE pages_master SET is_active = true WHERE route = '/common/messages';
-- UPDATE pages_master SET is_active = true WHERE route = '/enterprise-admin/monitoring/system-health';
-- UPDATE pages_master SET is_active = true WHERE route LIKE '/enterprise-admin/user-usage%';
-- UPDATE pages_master SET is_active = true WHERE route = '/get-started';
-- UPDATE pages_master SET is_active = true WHERE route = '/onboarding/trial';
-- UPDATE pages_master SET is_active = true WHERE route = '/onboarding/trial/quick';
-- UPDATE pages_master SET is_active = true WHERE route LIKE '/onboarding/trial/resume%';
-- UPDATE pages_master SET is_active = true WHERE route LIKE '/super-admin/user-usage%';
--
-- To remove the root page:
-- DELETE FROM pages_master WHERE page_code = 'ROOT';
--
-- ═══════════════════════════════════════════════════════════════════════════════
