-- ============================================================================
-- P1 PERMISSIONS & RBAC HARDENING MIGRATION
-- Priority: P1 (1-2 days)
-- Date: 2024-12-04
-- 
-- This migration addresses:
-- 1. Create app-specific DB users (frontend, backend, migration)
-- 2. Add explicit foreign keys, unique constraints, and enums
-- 3. Implement Row Level Security (RLS) for tenant isolation
-- 4. Security comments and documentation
-- ============================================================================

-- ============================================================================
-- PART 1: DATABASE USERS & ROLES
-- Create separate users for different application components
-- ============================================================================

-- 1.1 Create application roles (groups)
DO $$
BEGIN
    -- Read-only role for analytics/reporting
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_readonly') THEN
        CREATE ROLE bisman_readonly NOLOGIN;
    END IF;
    
    -- Application role for frontend/backend
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_app') THEN
        CREATE ROLE bisman_app NOLOGIN;
    END IF;
    
    -- Admin role for migrations and maintenance
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_admin') THEN
        CREATE ROLE bisman_admin NOLOGIN;
    END IF;
    
    -- Service role for internal services (cron, workers)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_service') THEN
        CREATE ROLE bisman_service NOLOGIN;
    END IF;
END $$;

-- 1.2 Grant permissions to roles
-- Read-only: SELECT only on all tables
GRANT USAGE ON SCHEMA public TO bisman_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bisman_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bisman_readonly;

-- App role: CRUD on most tables, no DDL
GRANT USAGE ON SCHEMA public TO bisman_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bisman_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bisman_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bisman_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO bisman_app;

-- Revoke dangerous permissions from app role
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM bisman_app;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM bisman_app;

-- Service role: Same as app + can execute functions
GRANT bisman_app TO bisman_service;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO bisman_service;

-- Admin role: Full access for migrations
GRANT ALL PRIVILEGES ON SCHEMA public TO bisman_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bisman_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bisman_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO bisman_admin;

-- 1.3 Create login users and assign roles
-- Frontend app user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_frontend') THEN
        CREATE USER bisman_frontend WITH PASSWORD 'CHANGE_ME_frontend_secure_password_123!';
    END IF;
END $$;
GRANT bisman_app TO bisman_frontend;

-- Backend API user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_backend') THEN
        CREATE USER bisman_backend WITH PASSWORD 'CHANGE_ME_backend_secure_password_456!';
    END IF;
END $$;
GRANT bisman_app TO bisman_backend;

-- Background service user (cron jobs, workers)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_worker') THEN
        CREATE USER bisman_worker WITH PASSWORD 'CHANGE_ME_worker_secure_password_789!';
    END IF;
END $$;
GRANT bisman_service TO bisman_worker;

-- Migration user (for schema changes only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_migrator') THEN
        CREATE USER bisman_migrator WITH PASSWORD 'CHANGE_ME_migrator_secure_password_000!';
    END IF;
END $$;
GRANT bisman_admin TO bisman_migrator;

-- Analytics/reporting user (read-only)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bisman_analytics') THEN
        CREATE USER bisman_analytics WITH PASSWORD 'CHANGE_ME_analytics_secure_password_111!';
    END IF;
END $$;
GRANT bisman_readonly TO bisman_analytics;

COMMENT ON ROLE bisman_readonly IS 'Read-only access for analytics and reporting';
COMMENT ON ROLE bisman_app IS 'Application CRUD access, no DDL';
COMMENT ON ROLE bisman_admin IS 'Full admin access for migrations';
COMMENT ON ROLE bisman_service IS 'Service role for background jobs';

-- ============================================================================
-- PART 2: STATUS ENUMS
-- Create proper PostgreSQL enums for status fields
-- ============================================================================

-- 2.1 Client/General Status
DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('Active', 'Inactive', 'Suspended', 'Pending', 'Archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.2 Onboarding Status
DO $$ BEGIN
    CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.3 Subscription Status
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'suspended', 'cancelled', 'expired', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.4 Subscription Plan
DO $$ BEGIN
    CREATE TYPE subscription_plan AS ENUM ('free', 'starter', 'professional', 'enterprise', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.5 Payment Request Status
DO $$ BEGIN
    CREATE TYPE payment_request_status AS ENUM (
        'DRAFT', 'PENDING', 'SUBMITTED', 'UNDER_REVIEW', 
        'APPROVED', 'REJECTED', 'PAID', 'CANCELLED', 'EXPIRED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.6 Task Status
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM (
        'PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 
        'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.7 Approval Action
DO $$ BEGIN
    CREATE TYPE approval_action AS ENUM ('APPROVED', 'REJECTED', 'RETURNED', 'ESCALATED', 'PENDING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.8 User Role Type
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
        'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN', 
        'ADMIN', 'MANAGER', 'FINANCE_CONTROLLER', 'HR_MANAGER',
        'OPERATIONS_MANAGER', 'STAFF', 'VIEWER', 'USER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.9 Call Status
DO $$ BEGIN
    CREATE TYPE call_status AS ENUM ('ringing', 'ongoing', 'ended', 'missed', 'declined', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2.10 Message Type
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'file', 'audio', 'video', 'system', 'call');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 3: MISSING FOREIGN KEYS
-- Add explicit foreign key constraints
-- ============================================================================

-- 3.1 clients → super_admins (if not exists)
DO $$ BEGIN
    ALTER TABLE clients 
    ADD CONSTRAINT fk_clients_super_admin 
    FOREIGN KEY (super_admin_id) REFERENCES super_admins(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.2 module_assignments → super_admins
DO $$ BEGIN
    ALTER TABLE module_assignments 
    ADD CONSTRAINT fk_module_assignments_super_admin 
    FOREIGN KEY (super_admin_id) REFERENCES super_admins(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.3 module_assignments → modules
DO $$ BEGIN
    ALTER TABLE module_assignments 
    ADD CONSTRAINT fk_module_assignments_module 
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.4 admin_role_assignments → rbac_roles
DO $$ BEGIN
    ALTER TABLE admin_role_assignments 
    ADD CONSTRAINT fk_admin_role_assignments_role 
    FOREIGN KEY (role_id) REFERENCES rbac_roles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.5 client_module_permissions → clients
DO $$ BEGIN
    ALTER TABLE client_module_permissions 
    ADD CONSTRAINT fk_client_module_permissions_client 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.6 client_module_permissions → modules
DO $$ BEGIN
    ALTER TABLE client_module_permissions 
    ADD CONSTRAINT fk_client_module_permissions_module 
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.7 branches → clients
DO $$ BEGIN
    ALTER TABLE branches 
    ADD CONSTRAINT fk_branches_client 
    FOREIGN KEY (tenant_id) REFERENCES clients(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.8 payment_activity_logs → payment_requests
DO $$ BEGIN
    ALTER TABLE payment_activity_logs 
    ADD CONSTRAINT fk_payment_activity_logs_request 
    FOREIGN KEY ("paymentRequestId") REFERENCES payment_requests(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 4: UNIQUE CONSTRAINTS
-- Ensure data integrity with unique constraints
-- ============================================================================

-- 4.1 Unique module assignment per super admin
DO $$ BEGIN
    ALTER TABLE module_assignments 
    ADD CONSTRAINT uq_module_assignments_super_admin_module 
    UNIQUE (super_admin_id, module_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4.2 Unique client code
DO $$ BEGIN
    ALTER TABLE clients 
    ADD CONSTRAINT uq_clients_client_code 
    UNIQUE (client_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4.3 Unique branch code per client
DO $$ BEGIN
    ALTER TABLE branches 
    ADD CONSTRAINT uq_branches_tenant_code 
    UNIQUE (tenant_id, branch_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4.4 Unique permission per role/module
DO $$ BEGIN
    ALTER TABLE permissions 
    ADD CONSTRAINT uq_permissions_role_module 
    UNIQUE (role, module_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- Implement tenant isolation at database level
-- ============================================================================

-- 5.1 Enable RLS on tenant-scoped tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_onboarding_activity ENABLE ROW LEVEL SECURITY;

-- 5.2 Create function to get current tenant context
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.tenant_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.3 Create function to get current super_admin context
CREATE OR REPLACE FUNCTION current_super_admin_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.super_admin_id', true), '')::INTEGER;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.4 Create function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(current_setting('app.is_platform_admin', true), 'false')::BOOLEAN;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5.5 RLS Policies for clients table
DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
CREATE POLICY clients_tenant_isolation ON clients
    FOR ALL
    USING (
        is_platform_admin() 
        OR super_admin_id = current_super_admin_id()
    )
    WITH CHECK (
        is_platform_admin() 
        OR super_admin_id = current_super_admin_id()
    );

-- 5.6 RLS Policies for branches table
DROP POLICY IF EXISTS branches_tenant_isolation ON branches;
CREATE POLICY branches_tenant_isolation ON branches
    FOR ALL
    USING (
        is_platform_admin()
        OR tenant_id = current_tenant_id()
        OR tenant_id IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    )
    WITH CHECK (
        is_platform_admin()
        OR tenant_id = current_tenant_id()
        OR tenant_id IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    );

-- 5.7 RLS Policies for payment_requests table
DROP POLICY IF EXISTS payment_requests_tenant_isolation ON payment_requests;
CREATE POLICY payment_requests_tenant_isolation ON payment_requests
    FOR ALL
    USING (
        is_platform_admin()
        OR "clientId" = current_tenant_id()
        OR "clientId" IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    )
    WITH CHECK (
        is_platform_admin()
        OR "clientId" = current_tenant_id()
        OR "clientId" IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    );

-- 5.8 RLS Policies for expenses table  
DROP POLICY IF EXISTS expenses_tenant_isolation ON expenses;
CREATE POLICY expenses_tenant_isolation ON expenses
    FOR ALL
    USING (
        is_platform_admin()
        OR "clientId" = current_tenant_id()
        OR "clientId" IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    )
    WITH CHECK (
        is_platform_admin()
        OR "clientId" = current_tenant_id()
        OR "clientId" IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    );

-- 5.9 RLS Policies for tasks table
DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks;
CREATE POLICY tasks_tenant_isolation ON tasks
    FOR ALL
    USING (
        is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM expenses e 
            WHERE e.id = tasks."expenseId" 
            AND (e."clientId" = current_tenant_id() 
                 OR e."clientId" IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id()))
        )
    );

-- 5.10 RLS Policies for client_usage_events
DROP POLICY IF EXISTS client_usage_events_tenant_isolation ON client_usage_events;
CREATE POLICY client_usage_events_tenant_isolation ON client_usage_events
    FOR ALL
    USING (
        is_platform_admin()
        OR client_id = current_tenant_id()
        OR client_id IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    );

-- 5.11 RLS Policies for client_daily_usage
DROP POLICY IF EXISTS client_daily_usage_tenant_isolation ON client_daily_usage;
CREATE POLICY client_daily_usage_tenant_isolation ON client_daily_usage
    FOR ALL
    USING (
        is_platform_admin()
        OR client_id = current_tenant_id()
        OR client_id IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    );

-- 5.12 RLS Policies for client_module_permissions
DROP POLICY IF EXISTS client_module_permissions_tenant_isolation ON client_module_permissions;
CREATE POLICY client_module_permissions_tenant_isolation ON client_module_permissions
    FOR ALL
    USING (
        is_platform_admin()
        OR client_id = current_tenant_id()
        OR client_id IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    );

-- 5.13 RLS Policies for client_onboarding_activity
DROP POLICY IF EXISTS client_onboarding_activity_tenant_isolation ON client_onboarding_activity;
CREATE POLICY client_onboarding_activity_tenant_isolation ON client_onboarding_activity
    FOR ALL
    USING (
        is_platform_admin()
        OR client_id = current_tenant_id()
        OR client_id IN (SELECT id FROM clients WHERE super_admin_id = current_super_admin_id())
    );

-- 5.14 Allow bisman_admin to bypass RLS (for migrations)
ALTER TABLE clients FORCE ROW LEVEL SECURITY;
ALTER TABLE branches FORCE ROW LEVEL SECURITY;
ALTER TABLE payment_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE client_usage_events FORCE ROW LEVEL SECURITY;
ALTER TABLE client_daily_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE client_module_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE client_onboarding_activity FORCE ROW LEVEL SECURITY;

-- Grant bypass to admin role
ALTER ROLE bisman_admin BYPASSRLS;
ALTER ROLE bisman_migrator BYPASSRLS;

-- ============================================================================
-- PART 6: SECURITY INDEXES
-- Add indexes to support RLS policies efficiently
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_super_admin_active 
    ON clients(super_admin_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_branches_tenant_active 
    ON branches(tenant_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_payment_requests_client 
    ON payment_requests("clientId");

CREATE INDEX IF NOT EXISTS idx_expenses_client 
    ON expenses("clientId");

CREATE INDEX IF NOT EXISTS idx_client_usage_events_client_date 
    ON client_usage_events(client_id, occurred_at DESC);

-- ============================================================================
-- PART 7: HELPER FUNCTION FOR SETTING TENANT CONTEXT
-- Application should call this before queries
-- ============================================================================

CREATE OR REPLACE FUNCTION set_tenant_context(
    p_tenant_id UUID DEFAULT NULL,
    p_super_admin_id INTEGER DEFAULT NULL,
    p_is_platform_admin BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
    IF p_tenant_id IS NOT NULL THEN
        PERFORM set_config('app.tenant_id', p_tenant_id::TEXT, true);
    ELSE
        PERFORM set_config('app.tenant_id', '', true);
    END IF;
    
    IF p_super_admin_id IS NOT NULL THEN
        PERFORM set_config('app.super_admin_id', p_super_admin_id::TEXT, true);
    ELSE
        PERFORM set_config('app.super_admin_id', '', true);
    END IF;
    
    PERFORM set_config('app.is_platform_admin', p_is_platform_admin::TEXT, true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_tenant_context IS 'Set tenant context for RLS. Call at start of each request.';

-- ============================================================================
-- PART 8: AUDIT TRIGGER FOR SENSITIVE TABLES
-- Track who modified what and when
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, created_at)
        VALUES (
            NULLIF(current_setting('app.user_id', true), '')::INTEGER,
            'DELETE',
            TG_TABLE_NAME,
            (OLD.id)::INTEGER,
            to_jsonb(OLD),
            NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, created_at)
        VALUES (
            NULLIF(current_setting('app.user_id', true), '')::INTEGER,
            'UPDATE',
            TG_TABLE_NAME,
            (NEW.id)::INTEGER,
            to_jsonb(OLD),
            to_jsonb(NEW),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, created_at)
        VALUES (
            NULLIF(current_setting('app.user_id', true), '')::INTEGER,
            'INSERT',
            TG_TABLE_NAME,
            (NEW.id)::INTEGER,
            to_jsonb(NEW),
            NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_clients ON clients;
CREATE TRIGGER audit_clients
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_super_admins ON super_admins;
CREATE TRIGGER audit_super_admins
    AFTER INSERT OR UPDATE OR DELETE ON super_admins
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_enterprise_admins ON enterprise_admins;
CREATE TRIGGER audit_enterprise_admins
    AFTER INSERT OR UPDATE OR DELETE ON enterprise_admins
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_payment_requests ON payment_requests;
CREATE TRIGGER audit_payment_requests
    AFTER INSERT OR UPDATE OR DELETE ON payment_requests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (migration_name, applied_at, applied_by)
VALUES ('010_p1_rbac_hardening', NOW(), CURRENT_USER)
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- 
-- 1. Update connection strings in .env files:
--    - Frontend: DATABASE_URL=postgres://bisman_frontend:PASSWORD@host:5432/BISMAN
--    - Backend:  DATABASE_URL=postgres://bisman_backend:PASSWORD@host:5432/BISMAN
--    - Workers:  DATABASE_URL=postgres://bisman_worker:PASSWORD@host:5432/BISMAN
--    - Migrate:  DATABASE_URL=postgres://bisman_migrator:PASSWORD@host:5432/BISMAN
--
-- 2. Change passwords for all created users!
--
-- 3. Application must call set_tenant_context() at start of each request
--
-- 4. Test RLS policies thoroughly before production deployment
--
-- ============================================================================
