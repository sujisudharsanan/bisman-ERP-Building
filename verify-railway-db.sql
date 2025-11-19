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

-- =============================================
-- Additional Multi-Tenant & AI Verification
-- =============================================
SELECT 'MULTI-TENANT TABLE COUNTS' as section;
SELECT 'enterprise_admins' AS table, COUNT(*) AS rows FROM enterprise_admins
UNION ALL SELECT 'super_admins', COUNT(*) FROM super_admins
UNION ALL SELECT 'clients', COUNT(*) FROM clients
UNION ALL SELECT 'modules', COUNT(*) FROM modules
UNION ALL SELECT 'module_assignments', COUNT(*) FROM module_assignments
UNION ALL SELECT 'permissions', COUNT(*) FROM permissions;

-- Check new columns on users table
SELECT 'USERS NEW COLUMNS PRESENCE' as section;
SELECT column_name FROM information_schema.columns 
WHERE table_name='users' AND column_name IN ('productType','tenant_id','super_admin_id','assignedModules','pagePermissions','profile_pic_url');

-- AI related tables
SELECT 'AI TABLES EXIST' as section;
SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('ai_analytics_cache','ai_conversations');

-- Extensions required
SELECT 'EXTENSIONS CHECK' as section;
SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto','pg_cron');

-- Password hash length sanity (should be 60 for bcrypt $2a$10$)
SELECT 'PASSWORD HASH LENGTHS' as section;
SELECT email, LENGTH(password) hash_len FROM users WHERE email IN ('finance@bisman.demo','hr@bisman.demo','admin@bisman.demo') LIMIT 10;

-- Notice for completion
DO $$ BEGIN RAISE NOTICE '✅ Extended verification complete'; END $$;
