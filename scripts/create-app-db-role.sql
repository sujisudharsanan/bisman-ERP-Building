-- ============================================================================
-- BISMAN ERP - Non-Superuser Application Role Setup
-- ============================================================================
-- This script creates a secure database role for the application.
-- The role has NO superuser privileges and CANNOT bypass RLS.
--
-- CRITICAL: Run this as superuser (postgres), then update your connection string
-- to use the new app_user role for production.
-- ============================================================================

-- Step 1: Create the application role (NO SUPERUSER, NO BYPASSRLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bisman_app') THEN
    CREATE ROLE bisman_app WITH
      LOGIN
      PASSWORD 'CHANGE_THIS_TO_SECURE_PASSWORD'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOBYPASSRLS
      NOREPLICATION
      CONNECTION LIMIT 100;
    RAISE NOTICE 'Created role: bisman_app';
  ELSE
    -- Update existing role to ensure it cannot bypass RLS
    ALTER ROLE bisman_app WITH
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOBYPASSRLS
      NOREPLICATION;
    RAISE NOTICE 'Updated role: bisman_app (ensured NOBYPASSRLS)';
  END IF;
END $$;

-- Step 2: Grant schema access
GRANT USAGE ON SCHEMA public TO bisman_app;

-- Step 3: Grant table permissions (SELECT, INSERT, UPDATE, DELETE)
-- Do NOT grant TRUNCATE, REFERENCES, TRIGGER

-- Core business tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bisman_app;

-- Sequences (for auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bisman_app;

-- Step 4: Grant function execution (for RLS context functions)
GRANT EXECUTE ON FUNCTION set_security_context(TEXT, TEXT, TEXT, TEXT, TEXT) TO bisman_app;
GRANT EXECUTE ON FUNCTION is_security_context_set() TO bisman_app;
GRANT EXECUTE ON FUNCTION log_security_access(TEXT, TEXT, TEXT, INTEGER) TO bisman_app;

-- Step 5: Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bisman_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO bisman_app;

-- Step 6: Revoke dangerous permissions explicitly
REVOKE ALL ON DATABASE railway FROM bisman_app;
GRANT CONNECT ON DATABASE railway TO bisman_app;

-- Step 7: Verify role configuration
DO $$
DECLARE
  role_info RECORD;
BEGIN
  SELECT 
    rolname,
    rolsuper,
    rolcreatedb,
    rolcreaterole,
    rolbypassrls,
    rolcanlogin
  INTO role_info
  FROM pg_roles
  WHERE rolname = 'bisman_app';
  
  IF role_info.rolsuper THEN
    RAISE EXCEPTION 'SECURITY FAILURE: bisman_app has superuser!';
  END IF;
  
  IF role_info.rolbypassrls THEN
    RAISE EXCEPTION 'SECURITY FAILURE: bisman_app can bypass RLS!';
  END IF;
  
  IF NOT role_info.rolcanlogin THEN
    RAISE EXCEPTION 'CONFIGURATION ERROR: bisman_app cannot login!';
  END IF;
  
  RAISE NOTICE '✅ Role bisman_app configured correctly:';
  RAISE NOTICE '   - SUPERUSER: %', role_info.rolsuper;
  RAISE NOTICE '   - CREATEDB: %', role_info.rolcreatedb;
  RAISE NOTICE '   - CREATEROLE: %', role_info.rolcreaterole;
  RAISE NOTICE '   - BYPASSRLS: %', role_info.rolbypassrls;
  RAISE NOTICE '   - CAN LOGIN: %', role_info.rolcanlogin;
END $$;

-- ============================================================================
-- OUTPUT: New connection string format
-- ============================================================================
-- Replace your DATABASE_URL with:
-- postgresql://bisman_app:YOUR_PASSWORD@hopper.proxy.rlwy.net:30204/railway
--
-- Keep superuser credentials ONLY for migrations and emergency admin access.
-- ============================================================================
