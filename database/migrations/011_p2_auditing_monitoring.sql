-- ============================================================================
-- P2 AUDITING, DETECTION & MONITORING MIGRATION
-- Priority: P2 (1-3 days)
-- Date: 2024-12-04
-- 
-- This migration addresses:
-- 1. Enhanced audit logging with service tracking
-- 2. Statement-level logging configuration
-- 3. Comprehensive DML triggers for all sensitive tables
-- 4. Service-to-table usage tracking
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCED AUDIT_LOGS TABLE
-- Add columns for service tracking and more detailed auditing
-- ============================================================================

-- 1.1 Add new columns to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS service_name VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS service_user VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS query_text TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS rows_affected INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS super_admin_id INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changed_fields TEXT[];
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS operation_context JSONB;

-- 1.2 Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_service ON audit_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(table_name, action, created_at DESC);

-- 1.3 Add comments
COMMENT ON COLUMN audit_logs.service_name IS 'Name of the service/application that made the change (backend, worker, migrator)';
COMMENT ON COLUMN audit_logs.service_user IS 'Database user used for the connection';
COMMENT ON COLUMN audit_logs.query_text IS 'The SQL query that was executed (truncated for large queries)';
COMMENT ON COLUMN audit_logs.execution_time_ms IS 'Query execution time in milliseconds';
COMMENT ON COLUMN audit_logs.rows_affected IS 'Number of rows affected by the operation';
COMMENT ON COLUMN audit_logs.request_id IS 'Unique ID for the HTTP request (for tracing)';
COMMENT ON COLUMN audit_logs.tenant_id IS 'Tenant ID for multi-tenant isolation';
COMMENT ON COLUMN audit_logs.super_admin_id IS 'Super Admin ID for ownership tracking';
COMMENT ON COLUMN audit_logs.changed_fields IS 'List of field names that were modified';
COMMENT ON COLUMN audit_logs.operation_context IS 'Additional context (endpoint, method, etc.)';

-- ============================================================================
-- PART 2: SERVICE USAGE TRACKING TABLE
-- Track which services access which tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_table_usage (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    service_user VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
    first_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    total_count BIGINT NOT NULL DEFAULT 1,
    success_count BIGINT NOT NULL DEFAULT 1,
    error_count BIGINT NOT NULL DEFAULT 0,
    avg_execution_ms NUMERIC(10,2),
    max_execution_ms INTEGER,
    UNIQUE(service_name, table_name, operation)
);

CREATE INDEX IF NOT EXISTS idx_service_usage_service ON service_table_usage(service_name);
CREATE INDEX IF NOT EXISTS idx_service_usage_table ON service_table_usage(table_name);
CREATE INDEX IF NOT EXISTS idx_service_usage_last_seen ON service_table_usage(last_seen DESC);

COMMENT ON TABLE service_table_usage IS 'Aggregated service-to-table usage statistics for monitoring';

-- ============================================================================
-- PART 3: STATEMENT LOG TABLE
-- Capture all SQL statements for analysis (optional, can be disabled)
-- ============================================================================

CREATE TABLE IF NOT EXISTS statement_logs (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100),
    service_user VARCHAR(100) NOT NULL DEFAULT CURRENT_USER,
    statement_type VARCHAR(20), -- SELECT, INSERT, UPDATE, DELETE, DDL
    table_names TEXT[], -- Tables involved in the query
    query_hash CHAR(64), -- SHA256 of query for deduplication
    query_sample TEXT, -- Sample of the query (truncated)
    execution_time_ms INTEGER,
    rows_returned INTEGER,
    rows_affected INTEGER,
    error_message TEXT,
    request_id UUID,
    user_id INTEGER,
    tenant_id UUID,
    logged_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Partition by date for easy cleanup (keep 30 days by default)
CREATE INDEX IF NOT EXISTS idx_statement_logs_logged_at ON statement_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_statement_logs_service ON statement_logs(service_name, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_statement_logs_query_hash ON statement_logs(query_hash);
CREATE INDEX IF NOT EXISTS idx_statement_logs_type ON statement_logs(statement_type);

COMMENT ON TABLE statement_logs IS 'Detailed statement-level logging for debugging and performance analysis';

-- ============================================================================
-- PART 4: SECURITY EVENTS TABLE
-- Track security-relevant events
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- LOGIN_SUCCESS, LOGIN_FAILURE, PERMISSION_DENIED, etc.
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO', -- DEBUG, INFO, WARNING, ERROR, CRITICAL
    service_name VARCHAR(100),
    user_id INTEGER,
    user_email VARCHAR(255),
    user_type VARCHAR(50), -- ENTERPRISE_ADMIN, SUPER_ADMIN, USER
    tenant_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    request_method VARCHAR(10),
    request_id UUID,
    event_details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);

COMMENT ON TABLE security_events IS 'Security-relevant events for threat detection and compliance';

-- ============================================================================
-- PART 5: ENHANCED AUDIT TRIGGER FUNCTION
-- Comprehensive trigger that captures all DML changes
-- ============================================================================

CREATE OR REPLACE FUNCTION enhanced_audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
    v_user_id INTEGER;
    v_tenant_id UUID;
    v_super_admin_id INTEGER;
    v_service_name TEXT;
    v_request_id UUID;
    v_record_id INTEGER;
BEGIN
    -- Get context from session variables
    v_user_id := NULLIF(current_setting('app.user_id', true), '')::INTEGER;
    v_tenant_id := NULLIF(current_setting('app.tenant_id', true), '')::UUID;
    v_super_admin_id := NULLIF(current_setting('app.super_admin_id', true), '')::INTEGER;
    v_service_name := COALESCE(NULLIF(current_setting('app.service_name', true), ''), 'unknown');
    v_request_id := NULLIF(current_setting('app.request_id', true), '')::UUID;

    IF TG_OP = 'DELETE' THEN
        v_old_data := to_jsonb(OLD);
        v_record_id := (OLD.id)::INTEGER;
        
        INSERT INTO audit_logs (
            user_id, action, table_name, record_id, 
            old_values, service_name, service_user, 
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'DELETE', TG_TABLE_NAME, v_record_id,
            v_old_data, v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );
        
        RETURN OLD;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_record_id := (NEW.id)::INTEGER;
        
        -- Calculate changed fields
        SELECT ARRAY_AGG(key) INTO v_changed_fields
        FROM jsonb_each(v_new_data) AS new_kv(key, value)
        LEFT JOIN jsonb_each(v_old_data) AS old_kv(key, value) 
            ON new_kv.key = old_kv.key
        WHERE new_kv.value IS DISTINCT FROM old_kv.value;
        
        INSERT INTO audit_logs (
            user_id, action, table_name, record_id,
            old_values, new_values, changed_fields,
            service_name, service_user,
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'UPDATE', TG_TABLE_NAME, v_record_id,
            v_old_data, v_new_data, v_changed_fields,
            v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );
        
        RETURN NEW;
        
    ELSIF TG_OP = 'INSERT' THEN
        v_new_data := to_jsonb(NEW);
        v_record_id := (NEW.id)::INTEGER;
        
        INSERT INTO audit_logs (
            user_id, action, table_name, record_id,
            new_values, service_name, service_user,
            tenant_id, super_admin_id, request_id, created_at
        )
        VALUES (
            v_user_id, 'INSERT', TG_TABLE_NAME, v_record_id,
            v_new_data, v_service_name, current_user,
            v_tenant_id, v_super_admin_id, v_request_id, NOW()
        );
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enhanced_audit_trigger_func IS 'Comprehensive audit trigger that captures DML changes with context';

-- ============================================================================
-- PART 6: APPLY AUDIT TRIGGERS TO SENSITIVE TABLES
-- ============================================================================

-- List of sensitive tables that need auditing
DO $$
DECLARE
    sensitive_tables TEXT[] := ARRAY[
        'clients',
        'super_admins', 
        'enterprise_admins',
        'users_enhanced',
        'user_kyc',
        'user_bank_accounts',
        'payment_requests',
        'expenses',
        'approvals',
        'rbac_roles',
        'rbac_permissions',
        'permissions',
        'module_assignments',
        'admin_role_assignments',
        'client_module_permissions',
        'user_sessions',
        'branches',
        'client_subscriptions'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY sensitive_tables
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
            -- Drop existing trigger if any
            EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON %I', tbl, tbl);
            
            -- Create new enhanced audit trigger
            EXECUTE format('
                CREATE TRIGGER audit_%I
                AFTER INSERT OR UPDATE OR DELETE ON %I
                FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_func()
            ', tbl, tbl);
            
            RAISE NOTICE 'Created audit trigger on table: %', tbl;
        ELSE
            RAISE NOTICE 'Table does not exist, skipping: %', tbl;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- PART 7: SERVICE USAGE TRACKING FUNCTION
-- Updates service_table_usage on each operation
-- ============================================================================

CREATE OR REPLACE FUNCTION update_service_usage(
    p_service_name TEXT,
    p_table_name TEXT,
    p_operation TEXT,
    p_execution_ms INTEGER DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO service_table_usage (
        service_name, service_user, table_name, operation,
        first_seen, last_seen, total_count, success_count, error_count,
        avg_execution_ms, max_execution_ms
    )
    VALUES (
        p_service_name, current_user, p_table_name, p_operation,
        NOW(), NOW(), 1,
        CASE WHEN p_success THEN 1 ELSE 0 END,
        CASE WHEN p_success THEN 0 ELSE 1 END,
        p_execution_ms,
        p_execution_ms
    )
    ON CONFLICT (service_name, table_name, operation) 
    DO UPDATE SET
        last_seen = NOW(),
        total_count = service_table_usage.total_count + 1,
        success_count = service_table_usage.success_count + (CASE WHEN p_success THEN 1 ELSE 0 END),
        error_count = service_table_usage.error_count + (CASE WHEN p_success THEN 0 ELSE 1 END),
        avg_execution_ms = CASE 
            WHEN p_execution_ms IS NOT NULL THEN
                (COALESCE(service_table_usage.avg_execution_ms, 0) * service_table_usage.total_count + p_execution_ms) 
                / (service_table_usage.total_count + 1)
            ELSE service_table_usage.avg_execution_ms
        END,
        max_execution_ms = GREATEST(COALESCE(service_table_usage.max_execution_ms, 0), COALESCE(p_execution_ms, 0));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_service_usage IS 'Track service-to-table usage for monitoring dashboard';

-- ============================================================================
-- PART 8: LOG SECURITY EVENT FUNCTION
-- Convenience function to log security events
-- ============================================================================

CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type TEXT,
    p_severity TEXT DEFAULT 'INFO',
    p_user_id INTEGER DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL,
    p_user_type TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_details JSONB DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_event_id BIGINT;
    v_tenant_id UUID;
    v_service_name TEXT;
    v_request_id UUID;
BEGIN
    v_tenant_id := NULLIF(current_setting('app.tenant_id', true), '')::UUID;
    v_service_name := COALESCE(NULLIF(current_setting('app.service_name', true), ''), 'unknown');
    v_request_id := NULLIF(current_setting('app.request_id', true), '')::UUID;
    
    INSERT INTO security_events (
        event_type, severity, service_name,
        user_id, user_email, user_type,
        tenant_id, ip_address, request_id,
        event_details, created_at
    )
    VALUES (
        p_event_type, p_severity, v_service_name,
        p_user_id, p_user_email, p_user_type,
        v_tenant_id, p_ip_address, v_request_id,
        p_details, NOW()
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_security_event IS 'Log security-relevant events for monitoring and alerting';

-- ============================================================================
-- PART 9: AUDIT LOG CLEANUP FUNCTION
-- Automatically cleanup old audit logs (keep 90 days by default)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE(
    audit_logs_deleted BIGINT,
    statement_logs_deleted BIGINT,
    security_events_archived BIGINT
) AS $$
DECLARE
    v_cutoff_date TIMESTAMP;
    v_audit_deleted BIGINT;
    v_statement_deleted BIGINT;
    v_security_archived BIGINT;
BEGIN
    v_cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    -- Delete old audit logs
    DELETE FROM audit_logs WHERE created_at < v_cutoff_date;
    GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;
    
    -- Delete old statement logs (keep only 30 days by default)
    DELETE FROM statement_logs WHERE logged_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_statement_deleted = ROW_COUNT;
    
    -- Archive old security events (don't delete, just mark as archived)
    -- Security events should be kept longer for compliance
    v_security_archived := 0;
    
    RETURN QUERY SELECT v_audit_deleted, v_statement_deleted, v_security_archived;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Cleanup old audit data. Run periodically via cron.';

-- ============================================================================
-- PART 10: AUDIT SUMMARY VIEWS
-- Views for the monitoring dashboard
-- ============================================================================

-- 10.1 Recent audit activity summary
CREATE OR REPLACE VIEW v_audit_summary_24h AS
SELECT 
    table_name,
    action,
    COUNT(*) as operation_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT service_name) as unique_services,
    MIN(created_at) as first_at,
    MAX(created_at) as last_at
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY table_name, action
ORDER BY operation_count DESC;

-- 10.2 Service usage summary
CREATE OR REPLACE VIEW v_service_usage_summary AS
SELECT 
    service_name,
    COUNT(DISTINCT table_name) as tables_accessed,
    SUM(total_count) as total_operations,
    SUM(error_count) as total_errors,
    ROUND(AVG(avg_execution_ms)::numeric, 2) as avg_execution_ms,
    MAX(last_seen) as last_active
FROM service_table_usage
GROUP BY service_name
ORDER BY total_operations DESC;

-- 10.3 Security events summary
CREATE OR REPLACE VIEW v_security_events_24h AS
SELECT 
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips,
    MAX(created_at) as last_occurred
FROM security_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY 
    CASE severity 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'ERROR' THEN 2 
        WHEN 'WARNING' THEN 3 
        ELSE 4 
    END,
    event_count DESC;

-- 10.4 Table activity heatmap data
CREATE OR REPLACE VIEW v_table_activity_heatmap AS
SELECT 
    table_name,
    date_trunc('hour', created_at) as hour,
    action,
    COUNT(*) as count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY table_name, date_trunc('hour', created_at), action
ORDER BY hour DESC, count DESC;

-- ============================================================================
-- PART 11: SET APPLICATION CONTEXT FUNCTION (ENHANCED)
-- Extended to include service name and request ID
-- ============================================================================

CREATE OR REPLACE FUNCTION set_audit_context(
    p_user_id INTEGER DEFAULT NULL,
    p_tenant_id UUID DEFAULT NULL,
    p_super_admin_id INTEGER DEFAULT NULL,
    p_service_name TEXT DEFAULT 'backend',
    p_request_id UUID DEFAULT NULL,
    p_is_platform_admin BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
    IF p_user_id IS NOT NULL THEN
        PERFORM set_config('app.user_id', p_user_id::TEXT, true);
    END IF;
    
    IF p_tenant_id IS NOT NULL THEN
        PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, true);
    END IF;
    
    IF p_super_admin_id IS NOT NULL THEN
        PERFORM set_config('app.super_admin_id', p_super_admin_id::TEXT, true);
    END IF;
    
    IF p_service_name IS NOT NULL THEN
        PERFORM set_config('app.service_name', p_service_name, true);
    END IF;
    
    IF p_request_id IS NOT NULL THEN
        PERFORM set_config('app.request_id', p_request_id::TEXT, true);
    END IF;
    
    PERFORM set_config('app.is_platform_admin', p_is_platform_admin::TEXT, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_audit_context IS 'Set audit context for the current transaction. Call at start of each request.';

-- ============================================================================
-- PART 12: ENABLE STATEMENT LOGGING FOR BISMAN ROLES
-- Configure log_statement for auditing purposes
-- ============================================================================

-- Note: This requires superuser and may require server restart
DO $$
BEGIN
    -- Set log_statement for app roles (will take effect for new connections)
    -- These settings are per-role and override postgresql.conf
    
    ALTER ROLE bisman_backend SET log_statement = 'mod';  -- Log INSERT/UPDATE/DELETE
    ALTER ROLE bisman_frontend SET log_statement = 'mod';
    ALTER ROLE bisman_worker SET log_statement = 'all';   -- Log everything for workers
    
    RAISE NOTICE 'Statement logging configured for bisman roles';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not configure role-level logging: %', SQLERRM;
END $$;

-- ============================================================================
-- MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (migration_name, applied_at, applied_by)
VALUES ('011_p2_auditing_monitoring', NOW(), CURRENT_USER)
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
    trigger_count INTEGER;
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count 
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE p.proname = 'enhanced_audit_trigger_func';
    
    SELECT COUNT(*) INTO table_count FROM service_table_usage;
    
    RAISE NOTICE 'P2 Audit Migration Complete:';
    RAISE NOTICE '  - Audit triggers installed: %', trigger_count;
    RAISE NOTICE '  - New tables: service_table_usage, statement_logs, security_events';
    RAISE NOTICE '  - New views: v_audit_summary_24h, v_service_usage_summary, v_security_events_24h';
END $$;
