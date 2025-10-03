-- Rollback Script for Complete ERP Schema Implementation
-- Migration: 001_complete_erp_schema ROLLBACK
-- Purpose: Rollback all changes made by 001_complete_erp_schema.sql
-- Author: System
-- Date: 2025-10-03
-- WARNING: This will drop all ERP business tables and data!

BEGIN;

-- Set search path
SET search_path TO erp, public;

-- =============================================
-- DROP TRIGGERS FIRST
-- =============================================

DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Drop all audit triggers
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE trigger_schema = 'erp'
        AND trigger_name LIKE 'audit_trigger_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON erp.%I', 
                      trigger_record.trigger_name, 
                      trigger_record.event_object_table);
    END LOOP;
    
    -- Drop all timestamp triggers
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE trigger_schema = 'erp'
        AND trigger_name LIKE 'update_timestamp_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON erp.%I', 
                      trigger_record.trigger_name, 
                      trigger_record.event_object_table);
    END LOOP;
END $$;

-- =============================================
-- DROP TABLES IN REVERSE DEPENDENCY ORDER
-- =============================================

-- Drop partition tables first
DROP TABLE IF EXISTS erp.audit_logs_2025_10 CASCADE;
DROP TABLE IF EXISTS erp.audit_logs_2025_11 CASCADE;
DROP TABLE IF EXISTS erp.audit_logs_2025_12 CASCADE;
DROP TABLE IF EXISTS erp.inventory_movements_2025_10 CASCADE;
DROP TABLE IF EXISTS erp.inventory_movements_2025_11 CASCADE;
DROP TABLE IF EXISTS erp.inventory_movements_2025_12 CASCADE;

-- Drop main partitioned tables
DROP TABLE IF EXISTS erp.audit_logs_new CASCADE;
DROP TABLE IF EXISTS erp.inventory_movements CASCADE;

-- Drop detail tables (with foreign keys)
DROP TABLE IF EXISTS erp.sales_order_details CASCADE;
DROP TABLE IF EXISTS erp.purchase_order_details CASCADE;

-- Drop transaction tables
DROP TABLE IF EXISTS erp.sales_orders CASCADE;
DROP TABLE IF EXISTS erp.purchase_orders CASCADE;

-- Drop master data tables
DROP TABLE IF EXISTS erp.products CASCADE;
DROP TABLE IF EXISTS erp.product_categories CASCADE;
DROP TABLE IF EXISTS erp.customers CASCADE;
DROP TABLE IF EXISTS erp.vendors CASCADE;

-- Drop financial tables
DROP TABLE IF EXISTS erp.exchange_rates CASCADE;
DROP TABLE IF EXISTS erp.currency CASCADE;
DROP TABLE IF EXISTS erp.chart_of_accounts CASCADE;

-- =============================================
-- DROP FUNCTIONS
-- =============================================

DROP FUNCTION IF EXISTS erp.audit_trigger_function() CASCADE;
DROP FUNCTION IF EXISTS erp.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS erp.set_app_context(UUID, TEXT, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS erp.validate_session(TEXT) CASCADE;

-- =============================================
-- CLEAN UP INDEXES (if any orphaned)
-- =============================================

-- Most indexes should be dropped with tables, but clean up any remaining
DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN
        SELECT indexname
        FROM pg_indexes 
        WHERE schemaname = 'erp'
        AND indexname LIKE 'idx_%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS erp.%I', index_record.indexname);
    END LOOP;
END $$;

-- =============================================
-- NOTE: PRESERVING EXISTING TABLES
-- =============================================

-- The following tables existed before this migration and should NOT be dropped:
-- - erp.users (existing)
-- - erp.roles (existing) 
-- - erp.user_sessions (existing)
-- - erp.companies (existing)
-- - erp.departments (existing)
-- - erp.fuel_types (existing)
-- - erp.pumps (existing)
-- - erp.tanks (existing)
-- - erp.audit_logs (existing - different from audit_logs_new)

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Run these to verify rollback was successful:
/*
SELECT 'Tables remaining in ERP schema:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'erp' ORDER BY tablename;

SELECT 'Functions remaining in ERP schema:' as info;
SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'erp';

SELECT 'Triggers remaining in ERP schema:' as info;
SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'erp';
*/
