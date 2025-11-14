-- Sync Local Database with Railway Passwords
-- Date: 2025-11-14
-- Purpose: Match local DB passwords with Railway production

-- Hub Incharge: Change from Demo@123 to demo123
UPDATE users
SET password = '$2a$10$sSOb5fx4sIgiJNq6.OfIU.q0aFJlRgIbOfTu4k6lpV0yhJxFMHbWm',
    updated_at = NOW()
WHERE email = 'demo_hub_incharge@bisman.demo';

-- Other regular users: Update to Super@123 (matching Railway)
UPDATE users
SET password = '$2a$10$Sfh0TIazw3DqTfrpdJnW1ursCbdJkPUOR2IGFnfQTGJrS8VbJhcC2',
    updated_at = NOW()
WHERE email IN (
    'finance@bisman.demo',
    'hr@bisman.demo',
    'admin@bisman.demo'
)
AND password != '$2a$10$Sfh0TIazw3DqTfrpdJnW1ursCbdJkPUOR2IGFnfQTGJrS8VbJhcC2';

-- Super Admins: Ensure they use Super@123
UPDATE super_admins
SET password = '$2a$10$Sfh0TIazw3DqTfrpdJnW1ursCbdJkPUOR2IGFnfQTGJrS8VbJhcC2',
    updated_at = NOW()
WHERE email IN (
    'business_superadmin@bisman.demo',
    'pump_superadmin@bisman.demo',
    'logistics_superadmin@bisman.demo'
)
AND password != '$2a$10$Sfh0TIazw3DqTfrpdJnW1ursCbdJkPUOR2IGFnfQTGJrS8VbJhcC2';

-- Enterprise Admin: Ensure enterprise123
UPDATE enterprise_admins
SET password = '$2a$10$HHq1d7O3Lu0Mz2T.5VzWr.mefTshuVW1xpa8VJn6Vp1zb/14cs4T.',
    updated_at = NOW()
WHERE email = 'enterprise@bisman.erp'
AND password != '$2a$10$HHq1d7O3Lu0Mz2T.5VzWr.mefTshuVW1xpa8VJn6Vp1zb/14cs4T.';

-- Verification
SELECT '✅ LOCAL DATABASE PASSWORDS SYNCED WITH RAILWAY' as status;
SELECT '';
SELECT 'Updated User Passwords:' as info;
SELECT 
    email,
    role,
    'demo123' as password,
    updated_at
FROM users
WHERE email = 'demo_hub_incharge@bisman.demo'
UNION ALL
SELECT 
    email,
    role,
    'Super@123' as password,
    updated_at
FROM users
WHERE email IN ('finance@bisman.demo', 'hr@bisman.demo', 'admin@bisman.demo')
ORDER BY email;
