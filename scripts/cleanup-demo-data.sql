-- ============================================
-- BISMAN ERP - Production Cleanup Script
-- ============================================
-- Purpose: Remove all demo/test users and clients
-- Preserve: EnterpriseAdmins and SuperAdmins
-- Date: 2024-12-26
-- ============================================

-- SAFETY CHECKS FIRST
-- Ensure we have protected admins before proceeding

DO $$
DECLARE
    enterprise_count INTEGER;
    super_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO enterprise_count FROM enterprise_admins WHERE is_active = true;
    SELECT COUNT(*) INTO super_count FROM super_admins WHERE is_active = true;
    
    IF enterprise_count = 0 THEN
        RAISE EXCEPTION 'ABORT: No active EnterpriseAdmin found!';
    END IF;
    
    IF super_count = 0 THEN
        RAISE EXCEPTION 'ABORT: No active SuperAdmin found!';
    END IF;
    
    RAISE NOTICE 'Safety check passed: % EnterpriseAdmin(s), % SuperAdmin(s) found', enterprise_count, super_count;
END $$;

-- Store protected IDs for reference
SELECT 'PROTECTED EnterpriseAdmins:' as info;
SELECT id, email FROM enterprise_admins WHERE is_active = true;

SELECT 'PROTECTED SuperAdmins:' as info;
SELECT id, email FROM super_admins WHERE is_active = true;

-- ============================================
-- STEP 1: Count items to be deleted (preview)
-- ============================================

SELECT 'DELETION PREVIEW - USERS' as step;
SELECT COUNT(*) as users_to_delete FROM users_enhanced;

SELECT 'DELETION PREVIEW - CLIENTS' as step;
SELECT COUNT(*) as clients_to_delete FROM clients;

-- ============================================
-- STEP 2: Clean orphaned data first
-- (Tables with user_id foreign keys)
-- ============================================

BEGIN;

-- Disable triggers temporarily for cleanup
SET session_replication_role = 'replica';

-- Clean user sessions
DELETE FROM user_sessions WHERE user_id IN (SELECT legacy_id FROM users_enhanced WHERE legacy_id IS NOT NULL);
SELECT 'Deleted from user_sessions' as step, COUNT(*) as rows_deleted FROM user_sessions WHERE 1=0;

-- Clean RBAC user roles
DELETE FROM rbac_user_roles WHERE user_id IN (SELECT legacy_id FROM users_enhanced WHERE legacy_id IS NOT NULL);
DELETE FROM rbac_user_permissions WHERE user_id IN (SELECT legacy_id FROM users_enhanced WHERE legacy_id IS NOT NULL);

-- Clean recent activity
DELETE FROM recent_activity;

-- Clean chat data
DELETE FROM chat_messages;
DELETE FROM chat_conversations;
DELETE FROM chat_feedback;
DELETE FROM chat_context_slots;
DELETE FROM chat_conversation_context;

-- Clean approval data
DELETE FROM approval_audit_log;
DELETE FROM approval_stage_instances;
DELETE FROM approval_instances;
DELETE FROM approvals;
DELETE FROM approver_selection_logs;

-- Clean payment requests
DELETE FROM payment_requests;

-- Clean support sessions
DELETE FROM support_sessions;

-- Clean client-related data (cascade should handle most)
DELETE FROM client_daily_usage;
DELETE FROM client_usage_events;
DELETE FROM client_module_permissions;
DELETE FROM client_onboarding_activity;
DELETE FROM client_role_assignments;
DELETE FROM client_feature_overrides;
DELETE FROM client_subscriptions;
DELETE FROM onboarding_magic_links;

-- Clean branches (they belong to clients)
DELETE FROM branches;

-- Clean events
DELETE FROM events;

-- ============================================
-- STEP 3: Delete all regular users (users_enhanced)
-- ============================================

SELECT 'DELETING USERS...' as step;
DELETE FROM users_enhanced;

-- ============================================
-- STEP 4: Delete all clients
-- ============================================

SELECT 'DELETING CLIENTS...' as step;
DELETE FROM clients;

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- ============================================
-- STEP 5: Final Verification
-- ============================================

SELECT 'VERIFICATION - PROTECTED ADMINS' as step;

SELECT 'EnterpriseAdmins remaining:' as entity;
SELECT id, email, is_active FROM enterprise_admins;

SELECT 'SuperAdmins remaining:' as entity;
SELECT id, email, is_active FROM super_admins;

SELECT 'Users remaining:' as entity;
SELECT COUNT(*) as user_count FROM users_enhanced;

SELECT 'Clients remaining:' as entity;
SELECT COUNT(*) as client_count FROM clients;

SELECT 'CLEANUP COMPLETE' as status;
