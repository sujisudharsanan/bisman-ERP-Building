-- ============================================================================
-- MIGRATION VERIFICATION QUERIES
-- ============================================================================
-- 
-- Run this script to verify that all security migrations have been applied.
-- Execute with: psql $DATABASE_URL -f tools/verify_migrations.sql
--
-- Expected: All queries should return results confirming the schema is correct.
-- 
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '🔍 BISMAN ERP - Migration Verification'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''

-- ============================================================================
-- 1. TIMESTAMP COLUMNS VERIFICATION
-- ============================================================================
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '📅 1. Verifying created_at/updated_at columns on key tables'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    t.table_name,
    CASE WHEN c_created.column_name IS NOT NULL THEN '✅' ELSE '❌' END AS has_created_at,
    CASE WHEN c_updated.column_name IS NOT NULL THEN '✅' ELSE '❌' END AS has_updated_at,
    c_created.data_type AS created_at_type,
    c_updated.data_type AS updated_at_type,
    c_created.column_default AS created_at_default
FROM information_schema.tables t
LEFT JOIN information_schema.columns c_created 
    ON t.table_name = c_created.table_name 
    AND t.table_schema = c_created.table_schema
    AND c_created.column_name = 'created_at'
LEFT JOIN information_schema.columns c_updated 
    ON t.table_name = c_updated.table_name 
    AND t.table_schema = c_updated.table_schema
    AND c_updated.column_name = 'updated_at'
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'users',
        'users_enhanced',
        'user_sessions',
        'clients',
        'payment_requests',
        'invoices',
        'agreements',
        'orders',
        'inventory_items',
        'financial_transactions',
        'rbac_roles',
        'rbac_permissions',
        'rbac_user_roles',
        'audit_logs_dml'
    )
ORDER BY t.table_name;

-- Summary of missing timestamp columns
\echo ''
\echo 'Tables MISSING timestamp columns:'
SELECT table_name, 
       string_agg(missing_column, ', ') AS missing_columns
FROM (
    SELECT t.table_name, 'created_at' AS missing_column
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name IN ('users', 'users_enhanced', 'clients', 'payment_requests', 'invoices')
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c 
            WHERE c.table_name = t.table_name 
            AND c.table_schema = 'public' 
            AND c.column_name = 'created_at'
        )
    UNION ALL
    SELECT t.table_name, 'updated_at' AS missing_column
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND t.table_name IN ('users', 'users_enhanced', 'clients', 'payment_requests', 'invoices')
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c 
            WHERE c.table_name = t.table_name 
            AND c.table_schema = 'public' 
            AND c.column_name = 'updated_at'
        )
) AS missing
GROUP BY table_name;

-- ============================================================================
-- 2. VERSION COLUMN VERIFICATION (Optimistic Locking)
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '🔢 2. Verifying version columns for optimistic locking'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    t.table_name,
    CASE WHEN c.column_name IS NOT NULL THEN '✅' ELSE '❌' END AS has_version,
    c.data_type,
    c.column_default
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
    AND c.column_name = 'version'
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name IN (
        'users_enhanced',
        'payment_requests',
        'invoices',
        'agreements',
        'orders'
    )
ORDER BY t.table_name;

-- ============================================================================
-- 3. CITEXT EMAIL VERIFICATION
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '📧 3. Verifying email columns use CITEXT for case-insensitive matching'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    table_name,
    column_name,
    udt_name AS data_type,
    CASE 
        WHEN udt_name = 'citext' THEN '✅ CITEXT'
        WHEN udt_name IN ('varchar', 'text', 'character varying') THEN '⚠️ Should be CITEXT'
        ELSE '❓ Unknown'
    END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'email'
    AND table_name IN ('users', 'users_enhanced', 'clients')
ORDER BY table_name;

-- Check if citext extension is installed
\echo ''
\echo 'CITEXT extension status:'
SELECT 
    extname,
    extversion,
    '✅ Installed' AS status
FROM pg_extension 
WHERE extname = 'citext'
UNION ALL
SELECT 
    'citext' AS extname,
    NULL AS extversion,
    '❌ NOT Installed - Run: CREATE EXTENSION IF NOT EXISTS citext;' AS status
WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'citext');

-- ============================================================================
-- 4. FOREIGN KEY CONSTRAINTS
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '🔗 4. Foreign Key constraints for payment_requests'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    tc.constraint_name,
    tc.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'payment_requests'
ORDER BY tc.constraint_name;

\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '🔗 4b. Foreign Key constraints for users_enhanced'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    tc.constraint_name,
    tc.table_name AS from_table,
    kcu.column_name AS from_column,
    ccu.table_name AS to_table,
    ccu.column_name AS to_column,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'users_enhanced'
ORDER BY tc.constraint_name;

-- ============================================================================
-- 5. INDEX VERIFICATION
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '📑 5. Security & Performance Indexes'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        -- Audit log indexes
        indexname LIKE '%audit%'
        OR indexname LIKE '%dml%'
        -- User/Session indexes
        OR indexname LIKE '%user%'
        OR indexname LIKE '%session%'
        -- Tenant indexes
        OR indexname LIKE '%tenant%'
        -- Performance indexes
        OR indexname LIKE '%created_at%'
        OR indexname LIKE '%updated_at%'
        -- RBAC indexes
        OR indexname LIKE '%rbac%'
        OR indexname LIKE '%perm%'
        OR indexname LIKE '%role%'
        -- Payment indexes
        OR indexname LIKE '%payment%'
    )
ORDER BY tablename, indexname;

-- Count indexes per table
\echo ''
\echo 'Index count per security-related table:'
SELECT 
    tablename,
    COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'users_enhanced', 'user_sessions',
        'payment_requests', 'clients', 'audit_logs_dml',
        'rbac_roles', 'rbac_permissions', 'rbac_user_roles'
    )
GROUP BY tablename
ORDER BY index_count DESC;

-- ============================================================================
-- 6. SPECIFIC SECURITY INDEXES CHECK
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '🔐 6. Required Security Indexes (from migration 013)'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    indexname,
    CASE WHEN indexname IS NOT NULL THEN '✅' ELSE '❌' END AS exists,
    tablename,
    CASE 
        WHEN indexdef LIKE '%USING btree%' THEN 'BTREE'
        WHEN indexdef LIKE '%USING hash%' THEN 'HASH'
        WHEN indexdef LIKE '%USING gin%' THEN 'GIN'
        WHEN indexdef LIKE '%USING gist%' THEN 'GIST'
        ELSE 'OTHER'
    END AS index_type
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname IN (
        'idx_audit_logs_dml_created_at',
        'idx_audit_logs_dml_table_name',
        'idx_audit_logs_dml_service_name',
        'idx_audit_logs_dml_user_id',
        'idx_user_sessions_user_id',
        'idx_user_sessions_token_hash',
        'idx_user_sessions_expires_at',
        'idx_payment_requests_tenant_id',
        'idx_payment_requests_status',
        'idx_payment_requests_created_at',
        'idx_users_enhanced_email',
        'idx_users_enhanced_tenant_id',
        'idx_rbac_user_roles_user_id',
        'idx_rbac_user_roles_role_id',
        'idx_rbac_permissions_role_id'
    )
ORDER BY tablename, indexname;

-- List missing indexes
\echo ''
\echo 'MISSING required indexes:'
SELECT unnest(ARRAY[
    'idx_audit_logs_dml_created_at',
    'idx_audit_logs_dml_table_name',
    'idx_audit_logs_dml_service_name',
    'idx_user_sessions_user_id',
    'idx_user_sessions_token_hash',
    'idx_payment_requests_tenant_id',
    'idx_users_enhanced_email',
    'idx_rbac_user_roles_user_id'
]) AS required_index
EXCEPT
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';

-- ============================================================================
-- 7. ROW LEVEL SECURITY STATUS
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '🛡️  7. Row Level Security (RLS) Status'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    c.relname AS table_name,
    CASE WHEN c.relrowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END AS rls_enabled,
    CASE WHEN c.relforcerowsecurity THEN '✅ Forced' ELSE '⚠️ Not Forced' END AS rls_forced,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
    AND n.nspname = 'public'
    AND c.relname IN (
        'users', 'users_enhanced', 'user_sessions',
        'clients', 'payment_requests', 'invoices',
        'agreements', 'orders', 'inventory_items',
        'financial_transactions', 'audit_logs_dml'
    )
ORDER BY c.relname;

-- List all RLS policies
\echo ''
\echo 'RLS Policies defined:'
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd AS applies_to,
    LEFT(qual::text, 80) AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 8. AUDIT TRIGGER VERIFICATION
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '📝 8. Audit Triggers'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND (
        trigger_name LIKE '%audit%'
        OR trigger_name LIKE '%dml%'
        OR trigger_name LIKE '%log%'
    )
ORDER BY event_object_table, trigger_name;

-- Check audit function exists
\echo ''
\echo 'Audit trigger function:'
SELECT 
    proname AS function_name,
    '✅ Exists' AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname IN ('audit_dml_changes', 'log_dml_changes', 'fn_audit_trigger')
UNION ALL
SELECT 
    'audit_dml_changes' AS function_name,
    '❌ NOT FOUND' AS status
WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('audit_dml_changes', 'log_dml_changes', 'fn_audit_trigger')
);

-- ============================================================================
-- 9. TEST AUDIT TRIGGER WRITE
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '🧪 9. Test Audit Trigger (if audit_logs_dml exists)'
\echo '──────────────────────────────────────────────────────────────────────────'

-- Check recent audit entries
SELECT 
    table_name,
    operation,
    COUNT(*) AS entry_count,
    MAX(created_at) AS latest_entry
FROM audit_logs_dml
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, operation
ORDER BY latest_entry DESC
LIMIT 20;

-- Check if service_name is being captured
\echo ''
\echo 'Service names in recent audit logs:'
SELECT 
    COALESCE(service_name, '(NULL)') AS service_name,
    COUNT(*) AS entries
FROM audit_logs_dml
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service_name
ORDER BY entries DESC
LIMIT 10;

-- ============================================================================
-- 10. UNIQUE CONSTRAINTS
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '🔑 10. Unique Constraints'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'users', 'users_enhanced', 'user_sessions',
        'clients', 'rbac_roles', 'rbac_user_roles'
    )
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- 11. CHECK CONSTRAINTS
-- ============================================================================
\echo ''
\echo '──────────────────────────────────────────────────────────────────────────'
\echo '✅ 11. Check Constraints (Data Validation)'
\echo '──────────────────────────────────────────────────────────────────────────'

SELECT 
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
    AND tc.constraint_schema = cc.constraint_schema
WHERE tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'users', 'users_enhanced', 'payment_requests',
        'invoices', 'agreements'
    )
    -- Exclude NOT NULL constraints
    AND cc.check_clause NOT LIKE '%IS NOT NULL%'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- SUMMARY
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo '📊 VERIFICATION COMPLETE'
\echo '═══════════════════════════════════════════════════════════════════════════'
\echo ''
\echo 'Review the output above for any ❌ or ⚠️ markers indicating issues.'
\echo 'Run missing migrations or apply fixes as needed.'
\echo ''
\echo 'Common remediation commands:'
\echo '  - Enable RLS: ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;'
\echo '  - Add CITEXT: CREATE EXTENSION IF NOT EXISTS citext;'
\echo '  - Add index: CREATE INDEX CONCURRENTLY idx_name ON table(column);'
\echo '  - Add timestamp: ALTER TABLE <table> ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();'
\echo ''
