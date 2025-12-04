-- =============================================================================
-- P4: SERVICE NAME TRACKING & ENHANCED AUDIT
-- =============================================================================
-- Sets app.service_name on connection for service-level audit tracking
-- Enhances audit_logs_dml trigger to capture service name
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Ensure audit_logs_dml has service_name column
-- -----------------------------------------------------------------------------
ALTER TABLE audit_logs_dml 
ADD COLUMN IF NOT EXISTS service_name TEXT;

ALTER TABLE audit_logs_dml 
ADD COLUMN IF NOT EXISTS query_text TEXT;

-- Index for service-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_service_name 
ON audit_logs_dml(service_name);

CREATE INDEX IF NOT EXISTS idx_audit_logs_service_table 
ON audit_logs_dml(service_name, table_name);

CREATE INDEX IF NOT EXISTS idx_audit_logs_service_time 
ON audit_logs_dml(service_name, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. Create suspicious_services table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suspicious_services (
    id SERIAL PRIMARY KEY,
    service_name TEXT NOT NULL UNIQUE,
    reason TEXT,
    severity TEXT DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    marked_by INTEGER,
    marked_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by INTEGER,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_suspicious_services_unresolved 
ON suspicious_services(service_name) WHERE resolved_at IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Enhanced audit trigger function with service name capture
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enhanced_audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB := NULL;
    new_data JSONB := NULL;
    v_user_id INTEGER := NULL;
    v_service_name TEXT := NULL;
    v_query_text TEXT := NULL;
BEGIN
    -- Capture service name from session variable
    BEGIN
        v_service_name := current_setting('app.service_name', true);
    EXCEPTION WHEN OTHERS THEN
        v_service_name := NULL;
    END;

    -- Capture user ID from session variable
    BEGIN
        v_user_id := current_setting('app.current_user_id', true)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- Capture current query (truncated)
    BEGIN
        v_query_text := LEFT(current_query(), 2000);
    EXCEPTION WHEN OTHERS THEN
        v_query_text := NULL;
    END;

    -- Build old/new data based on operation
    IF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
    ELSIF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
    END IF;

    -- Insert audit record
    INSERT INTO audit_logs_dml (
        table_name,
        action,
        old_data,
        new_data,
        db_user,
        user_id,
        service_name,
        query_text,
        ip_address,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        old_data,
        new_data,
        current_user,
        v_user_id,
        v_service_name,
        v_query_text,
        NULLIF(current_setting('app.client_ip', true), ''),
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Don't fail the main operation if audit fails
    RAISE WARNING 'Audit trigger failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 4. Helper function to set service context
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_service_context(
    p_service_name TEXT,
    p_user_id INTEGER DEFAULT NULL,
    p_client_ip TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.service_name', p_service_name, false);
    
    IF p_user_id IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', p_user_id::TEXT, false);
    END IF;
    
    IF p_client_ip IS NOT NULL THEN
        PERFORM set_config('app.client_ip', p_client_ip, false);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 5. View for service-table usage summary
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_service_table_usage AS
SELECT 
    COALESCE(service_name, 'unknown') AS service_name,
    table_name,
    array_agg(DISTINCT action ORDER BY action) AS actions,
    COUNT(*) AS total_hits,
    MAX(created_at) AS last_seen,
    MIN(created_at) AS first_seen,
    array_agg(DISTINCT db_user) AS db_users,
    COUNT(DISTINCT DATE(created_at)) AS active_days
FROM audit_logs_dml
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY COALESCE(service_name, 'unknown'), table_name
ORDER BY last_seen DESC;

-- -----------------------------------------------------------------------------
-- 6. View for sensitive table access
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_sensitive_table_access AS
SELECT 
    table_name,
    COALESCE(service_name, 'unknown') AS service_name,
    action,
    db_user,
    COUNT(*) AS hits,
    MAX(created_at) AS last_access
FROM audit_logs_dml
WHERE table_name IN (
    'super_admins', 'enterprise_admins', 'users_enhanced',
    'user_sessions', 'payment_requests', 'rbac_roles',
    'rbac_permissions', 'rbac_user_roles', 'api_keys', 'clients'
)
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, COALESCE(service_name, 'unknown'), action, db_user
ORDER BY hits DESC;

-- -----------------------------------------------------------------------------
-- 7. Function to get service usage report
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_service_usage_report(
    p_days INTEGER DEFAULT 30,
    p_service_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    service_name TEXT,
    table_count BIGINT,
    total_hits BIGINT,
    last_activity TIMESTAMP,
    sensitive_access BOOLEAN,
    top_tables JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH usage AS (
        SELECT 
            COALESCE(a.service_name, 'unknown') AS svc,
            a.table_name,
            COUNT(*) AS hits,
            MAX(a.created_at) AS last_seen
        FROM audit_logs_dml a
        WHERE a.created_at > NOW() - (p_days || ' days')::INTERVAL
          AND (p_service_name IS NULL OR COALESCE(a.service_name, 'unknown') = p_service_name)
        GROUP BY COALESCE(a.service_name, 'unknown'), a.table_name
    ),
    service_agg AS (
        SELECT 
            u.svc,
            COUNT(DISTINCT u.table_name) AS tbl_count,
            SUM(u.hits) AS total,
            MAX(u.last_seen) AS last_act,
            BOOL_OR(u.table_name IN (
                'super_admins', 'enterprise_admins', 'payment_requests',
                'rbac_permissions', 'user_sessions'
            )) AS sens_access
        FROM usage u
        GROUP BY u.svc
    )
    SELECT 
        s.svc AS service_name,
        s.tbl_count AS table_count,
        s.total AS total_hits,
        s.last_act AS last_activity,
        s.sens_access AS sensitive_access,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'table', u2.table_name,
                'hits', u2.hits
            ) ORDER BY u2.hits DESC)
            FROM usage u2
            WHERE u2.svc = s.svc
            LIMIT 10
        ) AS top_tables
    FROM service_agg s
    ORDER BY s.last_act DESC;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 8. Cleanup function for old audit logs (archive/delete)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_audit_logs(
    p_retention_days INTEGER DEFAULT 90,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    batch_deleted INTEGER;
BEGIN
    LOOP
        DELETE FROM audit_logs_dml
        WHERE id IN (
            SELECT id FROM audit_logs_dml
            WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
            LIMIT p_batch_size
        );
        
        GET DIAGNOSTICS batch_deleted = ROW_COUNT;
        deleted_count := deleted_count + batch_deleted;
        
        EXIT WHEN batch_deleted < p_batch_size;
        
        -- Small pause to reduce lock contention
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to app users
GRANT EXECUTE ON FUNCTION set_service_context TO bisman_app;
GRANT EXECUTE ON FUNCTION get_service_usage_report TO bisman_admin;
GRANT EXECUTE ON FUNCTION cleanup_audit_logs TO bisman_admin;

-- Grant view access
GRANT SELECT ON v_service_table_usage TO bisman_admin;
GRANT SELECT ON v_sensitive_table_access TO bisman_admin;

COMMENT ON FUNCTION set_service_context IS 
'Set service context (name, user_id, client_ip) for audit trail. Call at connection startup.';

COMMENT ON VIEW v_service_table_usage IS 
'30-day summary of which services accessed which tables.';

COMMENT ON VIEW v_sensitive_table_access IS 
'24-hour access log for sensitive tables only.';
