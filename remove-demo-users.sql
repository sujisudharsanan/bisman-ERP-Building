-- ====================================================================
-- Remove Demo Users from BISMAN ERP Database
-- ====================================================================
-- Created: November 26, 2025
-- Purpose: Clean up all demo/test users from the database
--
-- WARNING: This will permanently delete demo users and related data
-- Run this on both LOCAL and RAILWAY databases
-- ====================================================================

BEGIN;

-- Step 1: Display users to be deleted (for verification)
\echo '======================================================================'
\echo 'Demo Users to be Deleted:'
\echo '======================================================================'

SELECT 
    id,
    username,
    email,
    role,
    created_at
FROM users 
WHERE 
    email LIKE '%demo%@bisman.demo' 
    OR email LIKE '%demo%@bisman.local'
    OR username LIKE 'demo_%'
ORDER BY id;

\echo ''
\echo '======================================================================'
\echo 'Starting Deletion Process...'
\echo '======================================================================'

-- Step 2: Delete related data first (to maintain referential integrity)

-- Delete user sessions
DELETE FROM user_sessions 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%demo%@bisman.demo' 
       OR email LIKE '%demo%@bisman.local'
       OR username LIKE 'demo_%'
);

\echo 'Deleted user sessions'

-- Delete user notifications (if table exists)
DELETE FROM notifications 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%demo%@bisman.demo' 
       OR email LIKE '%demo%@bisman.local'
       OR username LIKE 'demo_%'
);

\echo 'Deleted notifications'

-- Delete user audit logs (if table exists)
DELETE FROM audit_logs 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%demo%@bisman.demo' 
       OR email LIKE '%demo%@bisman.local'
       OR username LIKE 'demo_%'
);

\echo 'Deleted audit logs'

-- Delete user activities (if table exists)
DELETE FROM user_activities 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%demo%@bisman.demo' 
       OR email LIKE '%demo%@bisman.local'
       OR username LIKE 'demo_%'
);

\echo 'Deleted user activities'

-- Delete tasks assigned to or created by demo users (if table exists)
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

\echo 'Deleted tasks'

-- Delete chat messages (if table exists)
DELETE FROM chat_messages 
WHERE sender_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%demo%@bisman.demo' 
       OR email LIKE '%demo%@bisman.local'
       OR username LIKE 'demo_%'
);

\echo 'Deleted chat messages'

-- Delete refresh tokens (if table exists)
DELETE FROM refresh_tokens 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%demo%@bisman.demo' 
       OR email LIKE '%demo%@bisman.local'
       OR username LIKE 'demo_%'
);

\echo 'Deleted refresh tokens'

-- Step 3: Finally, delete the demo users themselves
DELETE FROM users 
WHERE 
    email LIKE '%demo%@bisman.demo' 
    OR email LIKE '%demo%@bisman.local'
    OR username LIKE 'demo_%';

\echo 'Deleted demo users'

-- Step 4: Display remaining users (for verification)
\echo ''
\echo '======================================================================'
\echo 'Remaining Users in Database:'
\echo '======================================================================'

SELECT 
    id,
    username,
    email,
    role,
    created_at
FROM users 
ORDER BY id;

\echo ''
\echo '======================================================================'
\echo 'Demo Users Removal Complete!'
\echo '======================================================================'

COMMIT;

-- Vacuum to reclaim space
VACUUM ANALYZE users;
VACUUM ANALYZE user_sessions;
VACUUM ANALYZE notifications;
VACUUM ANALYZE audit_logs;

\echo ''
\echo 'Database cleanup completed successfully.'
