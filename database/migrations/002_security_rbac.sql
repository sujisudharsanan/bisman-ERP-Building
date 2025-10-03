-- Security and RBAC Implementation
-- Migration: 002_security_rbac
-- Purpose: Complete role-based access control and security setup
-- Author: System
-- Date: 2025-10-03

BEGIN;

-- =============================================
-- CREATE MISSING ROLES
-- =============================================

-- Create the missing erp_app role
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_app') THEN
        CREATE ROLE erp_app WITH LOGIN PASSWORD 'SecureAppPassword2025!';
        COMMENT ON ROLE erp_app IS 'Application role for ERP system connections';
    END IF;
END $$;

-- Ensure proper role permissions
ALTER ROLE erp_admin CREATEDB CREATEROLE;
ALTER ROLE erp_app NOCREATEDB NOCREATEROLE;
ALTER ROLE erp_readonly NOLOGIN NOCREATEDB NOCREATEROLE;

-- =============================================
-- GRANT SCHEMA AND TABLE PERMISSIONS
-- =============================================

-- Grant usage on erp schema to all roles
GRANT USAGE ON SCHEMA erp TO erp_admin, erp_app, erp_readonly;
GRANT USAGE ON SCHEMA public TO erp_admin, erp_app, erp_readonly;

-- Grant sequence usage for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA erp TO erp_admin, erp_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO erp_admin, erp_app;

-- Admin role - full access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA erp TO erp_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA erp TO erp_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA erp TO erp_admin;

-- App role - CRUD operations on business tables, read-only on config tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.users TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.user_sessions TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.customers TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.vendors TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.products TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.sales_orders TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.sales_order_details TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.purchase_orders TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.purchase_order_details TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.inventory_movements TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.companies TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.departments TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.pumps TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE erp.tanks TO erp_app;

-- Read-only access to configuration tables
GRANT SELECT ON TABLE erp.roles TO erp_app;
GRANT SELECT ON TABLE erp.chart_of_accounts TO erp_app;
GRANT SELECT ON TABLE erp.currency TO erp_app;
GRANT SELECT ON TABLE erp.exchange_rates TO erp_app;
GRANT SELECT ON TABLE erp.product_categories TO erp_app;
GRANT SELECT ON TABLE erp.fuel_types TO erp_app;

-- Audit log - insert only for app role
GRANT SELECT, INSERT ON TABLE erp.audit_logs_new TO erp_app;

-- Readonly role - read access only
GRANT SELECT ON ALL TABLES IN SCHEMA erp TO erp_readonly;

-- Grant permissions on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA erp GRANT ALL PRIVILEGES ON TABLES TO erp_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp GRANT SELECT ON TABLES TO erp_readonly;

-- =============================================
-- CREATE AUDIT FUNCTIONS AND TRIGGERS
-- =============================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION erp.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_row erp.audit_logs_new%ROWTYPE;
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := '{}';
    col_name TEXT;
    old_val TEXT;
    new_val TEXT;
BEGIN
    -- Initialize audit record
    audit_row.id := uuid_generate_v4();
    audit_row.table_name := TG_TABLE_NAME;
    audit_row.action := TG_OP;
    audit_row.timestamp := CURRENT_TIMESTAMP;
    audit_row.user_id := COALESCE(current_setting('app.current_user_id', true)::UUID, NULL);
    audit_row.session_id := current_setting('app.session_id', true);
    audit_row.ip_address := current_setting('app.client_ip', true)::INET;
    audit_row.user_agent := current_setting('app.user_agent', true);

    -- Handle different operation types
    IF TG_OP = 'DELETE' THEN
        audit_row.record_id := OLD.id::TEXT;
        audit_row.old_data := to_jsonb(OLD);
        audit_row.new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        audit_row.record_id := NEW.id::TEXT;
        audit_row.old_data := NULL;
        audit_row.new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        audit_row.record_id := NEW.id::TEXT;
        audit_row.old_data := to_jsonb(OLD);
        audit_row.new_data := to_jsonb(NEW);
        
        -- Find changed fields
        FOR col_name IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = TG_TABLE_SCHEMA 
            AND table_name = TG_TABLE_NAME
        LOOP
            EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col_name, col_name) 
            INTO old_val, new_val 
            USING OLD, NEW;
            
            IF old_val IS DISTINCT FROM new_val THEN
                changed_fields := array_append(changed_fields, col_name);
            END IF;
        END LOOP;
        
        audit_row.changed_fields := changed_fields;
    END IF;

    -- Insert audit record
    INSERT INTO erp.audit_logs_new VALUES (audit_row.*);

    -- Return appropriate value
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CREATE UPDATE TIMESTAMP TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION erp.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    NEW.updated_by := COALESCE(current_setting('app.current_user_id', true)::UUID, NEW.updated_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- APPLY TRIGGERS TO ALL BUSINESS TABLES
-- =============================================

-- List of tables that need audit and timestamp triggers
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'chart_of_accounts', 'currency', 'exchange_rates',
        'customers', 'vendors', 'product_categories', 'products',
        'sales_orders', 'sales_order_details', 'purchase_orders', 'purchase_order_details'
    ];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Drop existing triggers if they exist
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%s ON erp.%s', table_name, table_name);
        EXECUTE format('DROP TRIGGER IF EXISTS update_timestamp_%s ON erp.%s', table_name, table_name);
        
        -- Create audit trigger
        EXECUTE format('
            CREATE TRIGGER audit_trigger_%s
            AFTER INSERT OR UPDATE OR DELETE ON erp.%s
            FOR EACH ROW EXECUTE FUNCTION erp.audit_trigger_function()', table_name, table_name);
        
        -- Create timestamp update trigger (only for tables with updated_at column)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'erp' 
            AND table_name = table_names[i] 
            AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('
                CREATE TRIGGER update_timestamp_%s
                BEFORE UPDATE ON erp.%s
                FOR EACH ROW EXECUTE FUNCTION erp.update_updated_at_column()', table_name, table_name);
        END IF;
    END LOOP;
END $$;

-- =============================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =============================================

-- Enable RLS on sensitive tables
ALTER TABLE erp.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.audit_logs_new ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY users_select_policy ON erp.users
    FOR SELECT
    TO erp_app, erp_readonly
    USING (
        -- Users can see their own record or if they have admin role
        id = COALESCE(current_setting('app.current_user_id', true)::UUID, id)
        OR EXISTS (
            SELECT 1 FROM erp.users u 
            JOIN erp.roles r ON u.role_id = r.id 
            WHERE u.id = COALESCE(current_setting('app.current_user_id', true)::UUID, u.id)
            AND r.name IN ('ADMIN', 'MANAGER')
        )
    );

CREATE POLICY users_modify_policy ON erp.users
    FOR ALL
    TO erp_app
    USING (
        -- Only admins can modify users, or users can modify their own non-sensitive fields
        EXISTS (
            SELECT 1 FROM erp.users u 
            JOIN erp.roles r ON u.role_id = r.id 
            WHERE u.id = COALESCE(current_setting('app.current_user_id', true)::UUID, u.id)
            AND r.name IN ('ADMIN')
        )
    );

-- RLS Policies for audit logs
CREATE POLICY audit_logs_select_policy ON erp.audit_logs_new
    FOR SELECT
    TO erp_app, erp_readonly
    USING (
        -- Only admins and auditors can view audit logs
        EXISTS (
            SELECT 1 FROM erp.users u 
            JOIN erp.roles r ON u.role_id = r.id 
            WHERE u.id = COALESCE(current_setting('app.current_user_id', true)::UUID, u.id)
            AND r.name IN ('ADMIN', 'AUDITOR')
        )
    );

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Function to set application context
CREATE OR REPLACE FUNCTION erp.set_app_context(
    p_user_id UUID,
    p_session_id TEXT DEFAULT NULL,
    p_client_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, false);
    PERFORM set_config('app.session_id', COALESCE(p_session_id, ''), false);
    PERFORM set_config('app.client_ip', COALESCE(p_client_ip::TEXT, ''), false);
    PERFORM set_config('app.user_agent', COALESCE(p_user_agent, ''), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session
CREATE OR REPLACE FUNCTION erp.validate_session(
    p_session_token TEXT
)
RETURNS TABLE(
    user_id UUID,
    username VARCHAR(50),
    email VARCHAR(255),
    role_name VARCHAR(50),
    permissions JSONB,
    session_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        r.name,
        r.permissions,
        (s.is_active AND s.expires_at > CURRENT_TIMESTAMP)
    FROM erp.user_sessions s
    JOIN erp.users u ON s.user_id = u.id
    JOIN erp.roles r ON u.role_id = r.id
    WHERE s.session_token = p_session_token
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
