-- =============================================================================
-- RBAC BYPASS DETECTION QUERIES
-- =============================================================================
-- Run these queries to detect unauthorized access patterns and permission bypass
-- Assumes P2 auditing (audit_logs_dml, security_events) is enabled
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. QUERIES BY DB USER (Detect non-app users accessing data)
-- -----------------------------------------------------------------------------
-- If you see users other than bisman_app, bisman_admin, bisman_readonly - investigate

SELECT 
    db_user,
    COUNT(*) AS query_count,
    COUNT(DISTINCT table_name) AS tables_accessed,
    array_agg(DISTINCT table_name ORDER BY table_name) AS tables_list
FROM audit_logs_dml
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY db_user
ORDER BY query_count DESC;

-- -----------------------------------------------------------------------------
-- 2. SERVICE → TABLE USAGE MAP (Who is touching what)
-- -----------------------------------------------------------------------------
-- Identify which services are accessing which tables
-- Flag if a service is accessing tables it shouldn't

SELECT 
    service_name,
    table_name,
    action,
    COUNT(*) AS access_count,
    MAX(created_at) AS last_access
FROM audit_logs_dml
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service_name, table_name, action
ORDER BY access_count DESC;

-- -----------------------------------------------------------------------------
-- 3. SENSITIVE TABLE ACCESS (Monitor high-value tables)
-- -----------------------------------------------------------------------------
-- Track who is accessing sensitive tables

SELECT 
    table_name,
    action,
    db_user,
    service_name,
    COUNT(*) AS access_count,
    array_agg(DISTINCT ip_address) AS source_ips
FROM audit_logs_dml
WHERE table_name IN (
    'super_admins',
    'enterprise_admins', 
    'users_enhanced',
    'payment_requests',
    'rbac_permissions',
    'rbac_user_roles',
    'user_sessions',
    'api_keys',
    'clients'
)
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, action, db_user, service_name
ORDER BY access_count DESC;

-- -----------------------------------------------------------------------------
-- 4. UNUSUAL ACCESS PATTERNS (Detect anomalies)
-- -----------------------------------------------------------------------------
-- Find users accessing more tables than usual

WITH user_baseline AS (
    SELECT 
        user_id,
        COUNT(DISTINCT table_name) AS tables_accessed_today
    FROM audit_logs_dml
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY user_id
),
user_average AS (
    SELECT 
        user_id,
        AVG(tables_accessed) AS avg_tables
    FROM (
        SELECT 
            user_id,
            DATE(created_at) AS access_date,
            COUNT(DISTINCT table_name) AS tables_accessed
        FROM audit_logs_dml
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY user_id, DATE(created_at)
    ) daily
    GROUP BY user_id
)
SELECT 
    b.user_id,
    b.tables_accessed_today,
    COALESCE(a.avg_tables, 0) AS avg_tables_per_day,
    CASE 
        WHEN b.tables_accessed_today > COALESCE(a.avg_tables * 2, 10) 
        THEN 'ANOMALY'
        ELSE 'NORMAL'
    END AS status
FROM user_baseline b
LEFT JOIN user_average a ON b.user_id = a.user_id
WHERE b.tables_accessed_today > COALESCE(a.avg_tables * 2, 10)
ORDER BY b.tables_accessed_today DESC;

-- -----------------------------------------------------------------------------
-- 5. FAILED PERMISSION CHECKS (From security_events)
-- -----------------------------------------------------------------------------
-- Users hitting 403 errors repeatedly

SELECT 
    user_id,
    ip_address,
    COUNT(*) AS denied_count,
    array_agg(DISTINCT details->>'route') AS denied_routes,
    MAX(created_at) AS last_attempt
FROM security_events
WHERE event_type = 'PERMISSION_DENIED'
    AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, ip_address
HAVING COUNT(*) > 5
ORDER BY denied_count DESC;

-- -----------------------------------------------------------------------------
-- 6. ACTIVE DATABASE CONNECTIONS (Detect unexpected clients)
-- -----------------------------------------------------------------------------
-- Look for unexpected application names or DB users

SELECT 
    pid,
    usename AS db_user,
    application_name,
    client_addr,
    client_hostname,
    state,
    backend_start,
    query_start,
    LEFT(query, 200) AS current_query
FROM pg_stat_activity
WHERE datname = current_database()
    AND pid != pg_backend_pid()
ORDER BY backend_start DESC;

-- Flag suspicious: empty application_name, non-bisman users, external IPs
SELECT 
    usename,
    application_name,
    client_addr,
    COUNT(*) AS connection_count
FROM pg_stat_activity
WHERE datname = current_database()
    AND (
        application_name IS NULL 
        OR application_name = ''
        OR usename NOT LIKE 'bisman_%'
    )
GROUP BY usename, application_name, client_addr;

-- -----------------------------------------------------------------------------
-- 7. DELETE/UPDATE ON SENSITIVE TABLES (High-risk operations)
-- -----------------------------------------------------------------------------

SELECT 
    table_name,
    action,
    db_user,
    user_id,
    old_data,
    new_data,
    created_at
FROM audit_logs_dml
WHERE action IN ('DELETE', 'UPDATE')
    AND table_name IN (
        'super_admins',
        'enterprise_admins',
        'rbac_roles',
        'rbac_permissions',
        'rbac_user_roles'
    )
    AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 8. PERMISSION CACHE STATUS (Check Redis for stale entries)
-- -----------------------------------------------------------------------------
-- Run this in application code, not SQL. Included for reference.
-- 
-- const redis = require('./cache/redisClient');
-- const keys = await redis.keys('perm:user:*');
-- for (const key of keys) {
--     const ttl = await redis.ttl(key);
--     console.log(key, 'TTL:', ttl);
-- }

-- -----------------------------------------------------------------------------
-- 9. ROLE/PERMISSION CHANGES (Audit trail)
-- -----------------------------------------------------------------------------

SELECT 
    table_name,
    action,
    user_id AS changed_by,
    old_data->>'role_id' AS role_id,
    old_data->>'name' AS old_value,
    new_data->>'name' AS new_value,
    created_at
FROM audit_logs_dml
WHERE table_name IN ('rbac_roles', 'rbac_permissions', 'rbac_user_roles')
    AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- -----------------------------------------------------------------------------
-- 10. CROSS-TENANT ACCESS ATTEMPTS
-- -----------------------------------------------------------------------------
-- Detect if users are accessing data outside their tenant

SELECT 
    a.user_id,
    a.table_name,
    a.action,
    a.new_data->>'tenant_id' AS accessed_tenant,
    u.tenant_id AS user_tenant,
    a.created_at
FROM audit_logs_dml a
LEFT JOIN users_enhanced u ON a.user_id = u.id
WHERE a.new_data->>'tenant_id' IS NOT NULL
    AND a.new_data->>'tenant_id' != u.tenant_id::text
    AND a.created_at > NOW() - INTERVAL '24 hours';

-- -----------------------------------------------------------------------------
-- 11. SUMMARY DASHBOARD VIEW
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_security_dashboard AS
SELECT 
    'Unique DB Users' AS metric,
    COUNT(DISTINCT db_user)::text AS value
FROM audit_logs_dml
WHERE created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Security Events (24h)',
    COUNT(*)::text
FROM security_events
WHERE created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Permission Denials (24h)',
    COUNT(*)::text
FROM security_events
WHERE event_type = 'PERMISSION_DENIED'
    AND created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Sensitive Table Access (24h)',
    COUNT(*)::text
FROM audit_logs_dml
WHERE table_name IN ('super_admins', 'enterprise_admins', 'payment_requests', 'rbac_permissions')
    AND created_at > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'Active DB Connections',
    COUNT(*)::text
FROM pg_stat_activity
WHERE datname = current_database();

-- Query the dashboard
SELECT * FROM v_security_dashboard;

-- -----------------------------------------------------------------------------
-- 12. CLEAN UP OLD AUDIT LOGS (Maintenance)
-- -----------------------------------------------------------------------------
-- Keep 90 days of audit logs, older data moves to archive or is deleted

-- Archive old logs (if you have an archive table)
-- INSERT INTO audit_logs_dml_archive 
-- SELECT * FROM audit_logs_dml 
-- WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete old logs
-- DELETE FROM audit_logs_dml 
-- WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum the table after large deletes
-- VACUUM ANALYZE audit_logs_dml;
