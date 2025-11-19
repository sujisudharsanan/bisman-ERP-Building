-- Fix Hub Incharge Password in Railway
-- Date: 2025-11-14
-- Issue: Login failing with "Invalid credentials"
-- Solution: Update password hash with fresh bcrypt hash

-- Update Hub Incharge password to demo123
UPDATE users
SET password = '$2a$10$sSOb5fx4sIgiJNq6.OfIU.q0aFJlRgIbOfTu4k6lpV0yhJxFMHbWm',
    updated_at = NOW()
WHERE email = 'demo_hub_incharge@bisman.demo';

-- Also update other regular users to use Super@123 (matching super admins)
UPDATE users
SET password = '$2a$10$Sfh0TIazw3DqTfrpdJnW1ursCbdJkPUOR2IGFnfQTGJrS8VbJhcC2',
    updated_at = NOW()
WHERE email IN (
    'finance@bisman.demo',
    'hr@bisman.demo',
    'admin@bisman.demo'
);

-- Verify updates
SELECT 
    email,
    role,
    LEFT(password, 30) || '...' as password_start,
    updated_at
FROM users
WHERE email LIKE '%@bisman.demo'
ORDER BY email;

SELECT '✅ Hub Incharge password updated successfully!' as status;
