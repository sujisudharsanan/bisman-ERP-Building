-- Fix Demo User Passwords in Railway
-- Date: 2025-11-14
-- Issue: Login failing with "Invalid credentials"
-- Solution: Update password hashes with correct bcrypt hashes

-- Update Super Admins password to Super@123
UPDATE super_admins 
SET password = '$2a$10$Sfh0TIazw3DqTfrpdJnW1ursCbdJkPUOR2IGFnfQTGJrS8VbJhcC2',
    updated_at = NOW()
WHERE email IN (
    'business_superadmin@bisman.demo',
    'pump_superadmin@bisman.demo',
    'logistics_superadmin@bisman.demo'
);

-- Update Enterprise Admin password to enterprise123
UPDATE enterprise_admins
SET password = '$2a$10$HHq1d7O3Lu0Mz2T.5VzWr.mefTshuVW1xpa8VJn6Vp1zb/14cs4T.',
    updated_at = NOW()
WHERE email = 'enterprise@bisman.erp';

-- Update Regular Users password to Super@123 (except hub incharge)
UPDATE users
SET password = '$2a$10$Sfh0TIazw3DqTfrpdJnW1ursCbdJkPUOR2IGFnfQTGJrS8VbJhcC2',
    updated_at = NOW()
WHERE email IN (
    'finance@bisman.demo',
    'hr@bisman.demo',
    'admin@bisman.demo'
);

-- Update Hub Incharge password to demo123
UPDATE users
SET password = '$2a$10$FUc/5qCjRpKudr9nqmP5h.iJTb7bHV05D.gtVAvaAy.CM9/MhTWhu',
    updated_at = NOW()
WHERE email = 'demo_hub_incharge@bisman.demo';

-- Verify passwords were updated
SELECT 
    '✅ Password Update Summary' as status;

SELECT 
    'Super Admins' as user_type,
    COUNT(*) as updated
FROM super_admins
WHERE email IN ('business_superadmin@bisman.demo', 'pump_superadmin@bisman.demo', 'logistics_superadmin@bisman.demo')

UNION ALL

SELECT 
    'Enterprise Admin',
    COUNT(*)
FROM enterprise_admins
WHERE email = 'enterprise@bisman.erp'

UNION ALL

SELECT 
    'Regular Users',
    COUNT(*)
FROM users
WHERE email IN ('finance@bisman.demo', 'hr@bisman.demo', 'admin@bisman.demo', 'demo_hub_incharge@bisman.demo');

SELECT '📝 Login Credentials:' as info;
SELECT 'Email: business_superadmin@bisman.demo | Password: Super@123' as credentials
UNION ALL SELECT 'Email: pump_superadmin@bisman.demo | Password: Super@123'
UNION ALL SELECT 'Email: demo_hub_incharge@bisman.demo | Password: demo123'
UNION ALL SELECT 'Email: enterprise@bisman.erp | Password: enterprise123';
