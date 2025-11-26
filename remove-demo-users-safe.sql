-- ====================================================================
-- Remove Demo Users from BISMAN ERP Database (SAFE VERSION)
-- ====================================================================
-- Created: November 26, 2025
-- Purpose: Clean up all demo/test users from the database
-- This version handles missing tables gracefully
-- ====================================================================

-- Display users to be deleted (for verification)
SELECT 
    '====== DEMO USERS TO BE DELETED ======' as info,
    COUNT(*) as total_users
FROM users 
WHERE 
    email LIKE '%demo%@bisman.demo' 
    OR email LIKE '%demo%@bisman.local'
    OR username LIKE 'demo_%';

SELECT 
    id,
    username,
    email,
    role
FROM users 
WHERE 
    email LIKE '%demo%@bisman.demo' 
    OR email LIKE '%demo%@bisman.local'
    OR username LIKE 'demo_%'
ORDER BY id;

-- Delete related data (with error handling)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete user sessions
    DELETE FROM user_sessions 
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE email LIKE '%demo%@bisman.demo' 
           OR email LIKE '%demo%@bisman.local'
           OR username LIKE 'demo_%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user sessions', deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping user_sessions (table may not exist)';
END $$;

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete notifications
    DELETE FROM notifications 
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE email LIKE '%demo%@bisman.demo' 
           OR email LIKE '%demo%@bisman.local'
           OR username LIKE 'demo_%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % notifications', deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping notifications (table may not exist)';
END $$;

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete audit logs
    DELETE FROM audit_logs 
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE email LIKE '%demo%@bisman.demo' 
           OR email LIKE '%demo%@bisman.local'
           OR username LIKE 'demo_%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % audit logs', deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping audit_logs (table may not exist)';
END $$;

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete user activities
    DELETE FROM user_activities 
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE email LIKE '%demo%@bisman.demo' 
           OR email LIKE '%demo%@bisman.local'
           OR username LIKE 'demo_%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % user activities', deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping user_activities (table may not exist)';
END $$;

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tasks
    DELETE FROM tasks 
    WHERE assigned_to IN (
        SELECT id FROM users 
        WHERE email LIKE '%demo%@bisman.demo' 
           OR email LIKE '%demo%@bisman.local'
           OR username LIKE 'demo_%'
    )
    OR created_by IN (
        SELECT id FROM users 
        WHERE email LIKE '%demo%@bisman.demo' 
           OR email LIKE '%demo%@bisman.local'
           OR username LIKE 'demo_%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % tasks', deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping tasks (table may not exist)';
END $$;

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete chat messages
    DELETE FROM chat_messages 
    WHERE sender_id IN (
        SELECT id FROM users 
        WHERE email LIKE '%demo%@bisman.demo' 
           OR email LIKE '%demo%@bisman.local'
           OR username LIKE 'demo_%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % chat messages', deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping chat_messages (table may not exist)';
END $$;

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete refresh tokens
    DELETE FROM refresh_tokens 
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE email LIKE '%demo%@bisman.demo' 
           OR email LIKE '%demo%@bisman.local'
           OR username LIKE 'demo_%'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % refresh tokens', deleted_count;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping refresh_tokens (table may not exist)';
END $$;

-- Delete the demo users themselves
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM users 
    WHERE 
        email LIKE '%demo%@bisman.demo' 
        OR email LIKE '%demo%@bisman.local'
        OR username LIKE 'demo_%';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '====== DELETED % DEMO USERS ======', deleted_count;
END $$;

-- Display remaining users
SELECT 
    '====== REMAINING USERS ======' as info,
    COUNT(*) as total_users
FROM users;

SELECT 
    id,
    username,
    email,
    role
FROM users 
ORDER BY id;
