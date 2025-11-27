-- Fix failed migration on Railway database
-- Run this in Railway PostgreSQL console

-- Step 1: Mark the failed migration as rolled back
DELETE FROM "_prisma_migrations" 
WHERE migration_name = 'add_payment_approval_system';

-- Step 2: Check if any tables from that migration exist and drop them
DROP TABLE IF EXISTS payment_approvals CASCADE;
DROP TABLE IF EXISTS payment_approval_history CASCADE;

-- Step 3: Verify migration table is clean
SELECT migration_name, finished_at, success, rolled_back_at 
FROM "_prisma_migrations" 
ORDER BY finished_at DESC 
LIMIT 10;
