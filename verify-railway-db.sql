-- Verify Railway Database Setup
-- Date: 2025-11-14

-- Check if tables exist
SELECT 
    'TABLES CHECK' as check_type,
    COUNT(*) FILTER (WHERE table_name = 'users') as users_table,
    COUNT(*) FILTER (WHERE table_name = 'super_admins') as super_admins_table,
    COUNT(*) FILTER (WHERE table_name = 'enterprise_admins') as enterprise_admins_table,
    COUNT(*) FILTER (WHERE table_name = 'tenants') as tenants_table
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check if required columns exist in users table
SELECT 
    'USERS COLUMNS' as check_type,
    COUNT(*) FILTER (WHERE column_name = 'email') as has_email,
    COUNT(*) FILTER (WHERE column_name = 'password') as has_password,
    COUNT(*) FILTER (WHERE column_name = 'is_active') as has_is_active,
    COUNT(*) FILTER (WHERE column_name = 'role') as has_role
FROM information_schema.columns
WHERE table_name = 'users';

-- List all users (excluding passwords)
SELECT 
    'EXISTING USERS' as info,
    id, email, username, role, 
    CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM users
LIMIT 10;

-- List all super admins (excluding passwords)
SELECT 
    'EXISTING SUPER ADMINS' as info,
    id, email, name, "productType",
    CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM super_admins
LIMIT 10;

-- List all enterprise admins (excluding passwords)  
SELECT 
    'EXISTING ENTERPRISE ADMINS' as info,
    id, email, name,
    CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM enterprise_admins
LIMIT 10;

-- Check for hub_incharge user specifically
SELECT 
    'HUB INCHARGE CHECK' as info,
    COUNT(*) as found_count
FROM users
WHERE email LIKE '%hub%incharge%' OR email LIKE '%demo%hub%';

-- Show actual hub incharge users if they exist
SELECT 
    'HUB INCHARGE USERS' as info,
    id, email, username, role,
    CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM users
WHERE email LIKE '%hub%incharge%' OR email LIKE '%demo%hub%'
   OR email LIKE '%bisman.demo%';
