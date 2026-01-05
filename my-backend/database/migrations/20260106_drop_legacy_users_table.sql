-- Migration: Verify and document 'users' view setup
-- Date: 2026-01-06
-- Author: System
-- Description: The 'users' object is a VIEW that maps to 'users_enhanced' table.
--              This is a compatibility layer for legacy code. No migration needed.

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify 'users' is a view (not a table)
DO $$
DECLARE
  obj_type TEXT;
BEGIN
  SELECT table_type INTO obj_type
  FROM information_schema.tables 
  WHERE table_name = 'users' AND table_schema = 'public';
  
  IF obj_type = 'VIEW' THEN
    RAISE NOTICE '✅ users is a VIEW (compatibility layer) - pointing to users_enhanced';
    RAISE NOTICE '✅ No migration needed - legacy code will work through the view';
  ELSIF obj_type = 'BASE TABLE' THEN
    RAISE WARNING '⚠️  users is still a TABLE - needs migration';
  ELSE
    RAISE NOTICE 'users object type: %', COALESCE(obj_type, 'NOT FOUND');
  END IF;
END $$;

-- Show the view definition for documentation
SELECT '=== VIEW DEFINITION ===' as info;
SELECT pg_get_viewdef('users'::regclass, true) as view_definition;

-- Count records in the canonical table
SELECT '=== RECORD COUNT ===' as info;
SELECT 
  'users_enhanced' as canonical_table,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users
FROM users_enhanced;

