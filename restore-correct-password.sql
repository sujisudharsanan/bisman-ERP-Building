-- RESTORE CORRECT PASSWORD: Demo@123
-- Fix: Both local and Railway should use Demo@123 (the original working password)

-- Hub Incharge: RESTORE to Demo@123
UPDATE users
SET password = '$2a$10$NNxt6zbUP.84nHGMiJEFIOeqUTQJ1kFWWY5Dl0tYUjCwazwBpjv2m',
    updated_at = NOW()
WHERE email = 'demo_hub_incharge@bisman.demo';

-- Verify
SELECT 
    'Hub Incharge Password RESTORED' as status,
    email,
    'Demo@123' as password,
    LEFT(password, 40) || '...' as hash_preview
FROM users 
WHERE email = 'demo_hub_incharge@bisman.demo';
