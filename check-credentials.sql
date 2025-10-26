-- Verify Demo Credentials in Database
-- Run this with: psql $DATABASE_URL -f check-credentials.sql

\echo '=========================================='
\echo 'Checking Demo Credentials'
\echo '=========================================='
\echo ''

-- Check if users table exists
\echo 'Checking if users table exists...'
SELECT COUNT(*) as table_exists 
FROM information_schema.tables 
WHERE table_name = 'users';
\echo ''

-- Check all demo users
\echo 'Demo Users Status:'
\echo '==================='
SELECT 
  id,
  email,
  role,
  name,
  is_active,
  created_at
FROM users 
WHERE email IN (
  'enterprise@bisman.erp',
  'rajesh@petrolpump.com',
  'amit@abclogistics.com',
  'manager@petrolpump.com',
  'staff@petrolpump.com',
  'manager@abclogistics.com',
  'staff@abclogistics.com'
)
ORDER BY 
  CASE role
    WHEN 'ENTERPRISE_ADMIN' THEN 1
    WHEN 'SUPER_ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'STAFF' THEN 4
    ELSE 5
  END,
  email;
\echo ''

-- Count by role
\echo 'Count by Role:'
\echo '=============='
SELECT 
  role,
  COUNT(*) as count
FROM users 
WHERE email IN (
  'enterprise@bisman.erp',
  'rajesh@petrolpump.com',
  'amit@abclogistics.com',
  'manager@petrolpump.com',
  'staff@petrolpump.com',
  'manager@abclogistics.com',
  'staff@abclogistics.com'
)
GROUP BY role
ORDER BY 
  CASE role
    WHEN 'ENTERPRISE_ADMIN' THEN 1
    WHEN 'SUPER_ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'STAFF' THEN 4
    ELSE 5
  END;
\echo ''

-- Check super_admins table
\echo 'Super Admin Businesses:'
\echo '======================'
SELECT 
  sa.id,
  sa.business_name,
  sa.business_type,
  u.email,
  u.name as admin_name,
  sa.subscription_status
FROM super_admins sa
JOIN users u ON sa.user_id = u.id
ORDER BY sa.created_at;
\echo ''

-- Check module assignments
\echo 'Module Assignments:'
\echo '==================='
SELECT 
  sa.business_name,
  COUNT(DISTINCT sam.module_id) as modules_assigned,
  COUNT(DISTINCT CASE WHEN sam.is_enabled THEN sam.module_id END) as modules_enabled
FROM super_admins sa
LEFT JOIN super_admin_modules sam ON sa.id = sam.super_admin_id
GROUP BY sa.business_name, sa.id
ORDER BY sa.business_name;
\echo ''

\echo '=========================================='
\echo 'Verification Complete'
\echo '=========================================='
\echo ''
\echo 'Expected Results:'
\echo '  - 1 ENTERPRISE_ADMIN'
\echo '  - 2 SUPER_ADMIN'
\echo '  - 2 MANAGER'
\echo '  - 2 STAFF'
\echo ''
\echo 'If counts do not match, run:'
\echo '  node my-backend/seed-demo-data.js'
\echo ''
