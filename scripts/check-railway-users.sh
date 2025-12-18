#!/bin/bash

echo "🔍 Checking Railway Database Demo Users"
echo "========================================"
echo ""

# Connect to Railway database and run queries
railway connect bisman-erp-db <<'SQL'

\echo '📊 TABLE COUNTS:'
\echo ''

SELECT 
    'Enterprise Admins: ' || COUNT(*)::text as count
FROM enterprise_admins;

SELECT 
    'Super Admins: ' || COUNT(*)::text as count
FROM super_admins;

SELECT 
    'Regular Users: ' || COUNT(*)::text as count
FROM users;

\echo ''
\echo '📧 ALL DEMO USERS:'
\echo ''

SELECT 
    '1. ENTERPRISE ADMIN' as category,
    email,
    name,
    CASE WHEN is_active THEN '✓ Active' ELSE '✗ Inactive' END as status
FROM enterprise_admins
UNION ALL
SELECT 
    '2. SUPER ADMIN',
    email,
    name || ' (' || "productType" || ')',
    CASE WHEN is_active THEN '✓ Active' ELSE '✗ Inactive' END
FROM super_admins
UNION ALL
SELECT 
    '3. REGULAR USER',
    email,
    COALESCE(username, email) || ' [' || COALESCE(role, 'NO_ROLE') || ']',
    CASE WHEN is_active THEN '✓ Active' ELSE '✗ Inactive' END
FROM users
ORDER BY category, email;

\echo ''
\echo '🔑 Login with configured credentials from your secure storage'
\echo ''

SQL

echo ""
echo "✅ Check Complete!"
