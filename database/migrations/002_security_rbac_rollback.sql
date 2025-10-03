-- Rollback Script for Security and RBAC Implementation
-- Migration: 002_security_rbac ROLLBACK
-- Purpose: Rollback all changes made by 002_security_rbac.sql
-- Author: System
-- Date: 2025-10-03

BEGIN;

-- =============================================
-- REMOVE ROW LEVEL SECURITY POLICIES
-- =============================================

DROP POLICY IF EXISTS users_select_policy ON erp.users;
DROP POLICY IF EXISTS users_modify_policy ON erp.users;
DROP POLICY IF EXISTS audit_logs_select_policy ON erp.audit_logs_new;

-- Disable RLS on tables (only if they were enabled by our migration)
ALTER TABLE erp.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE erp.user_sessions DISABLE ROW LEVEL SECURITY;

-- Note: audit_logs_new table will be dropped by the schema rollback

-- =============================================
-- REVOKE PERMISSIONS
-- =============================================

-- Revoke permissions from erp_app role
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA erp FROM erp_app;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA erp FROM erp_app;
REVOKE USAGE ON SCHEMA erp FROM erp_app;

-- Revoke permissions from erp_readonly role
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA erp FROM erp_readonly;
REVOKE USAGE ON SCHEMA erp FROM erp_readonly;

-- Reset default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA erp REVOKE ALL PRIVILEGES ON TABLES FROM erp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp REVOKE ALL PRIVILEGES ON TABLES FROM erp_readonly;

-- =============================================
-- DROP ROLES (ONLY NEW ONES)
-- =============================================

-- Only drop erp_app role if it was created by our migration
-- Keep erp_admin and erp_readonly as they existed before
DROP ROLE IF EXISTS erp_app;

-- Reset role attributes to original state (if needed)
-- Note: We won't modify erp_admin and erp_readonly as they existed before

-- =============================================
-- DROP SECURITY FUNCTIONS
-- =============================================

DROP FUNCTION IF EXISTS erp.set_app_context(UUID, TEXT, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS erp.validate_session(TEXT) CASCADE;

-- =============================================
-- REMOVE AUDIT TRIGGERS (from security migration)
-- =============================================

-- Note: The audit triggers for business tables will be removed by the main schema rollback
-- This section handles any security-specific triggers

DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Remove any password change triggers
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE trigger_schema = 'erp'
        AND trigger_name LIKE 'password_change_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON erp.%I', 
                      trigger_record.trigger_name, 
                      trigger_record.event_object_table);
    END LOOP;
END $$;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Run these to verify security rollback was successful:
/*
SELECT 'Remaining roles:' as info;
SELECT rolname FROM pg_roles WHERE rolname LIKE 'erp_%' ORDER BY rolname;

SELECT 'Remaining RLS policies:' as info;
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'erp';

SELECT 'Remaining security functions:' as info;
SELECT proname FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'erp' 
AND proname IN ('set_app_context', 'validate_session');
*/
