-- Insert Demo Hub Incharge User for Railway
-- Date: 2025-11-14
-- Password: demo123 (hashed with bcrypt)

-- First, ensure the users table has all required columns
DO $$ 
BEGIN
    -- Add is_active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add profile_pic_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'profile_pic_url') THEN
        ALTER TABLE users ADD COLUMN profile_pic_url TEXT;
    END IF;
    
    -- Add assignedModules if missing (JSONB array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = '"assignedModules"') THEN
        ALTER TABLE users ADD COLUMN "assignedModules" JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add pagePermissions if missing (JSONB object)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = '"pagePermissions"') THEN
        ALTER TABLE users ADD COLUMN "pagePermissions" JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add productType if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = '"productType"') THEN
        ALTER TABLE users ADD COLUMN "productType" VARCHAR(50) DEFAULT 'BUSINESS_ERP';
    END IF;
    
    -- Add super_admin_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'super_admin_id') THEN
        ALTER TABLE users ADD COLUMN super_admin_id INTEGER;
    END IF;
    
    -- Add tenant_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_id' AND column_name = 'tenant_id') THEN
        ALTER TABLE users ADD COLUMN tenant_id INTEGER;
    END IF;
END $$;

-- Insert or update demo hub incharge user
-- Password hash for 'demo123'
INSERT INTO users (
    email, 
    username, 
    password,
    role,
    is_active,
    "productType",
    "assignedModules",
    "pagePermissions",
    created_at,
    updated_at
) VALUES (
    'demo_hub_incharge@bisman.demo',
    'Hub Incharge Demo',
    '$2a$10$rQZh8JqZmKZN5yYXW5x5f.xKkGvN5JqZmKZN5yYXW5x5f.xKkGvN5u',  -- bcrypt hash of 'demo123'
    'HUB_INCHARGE',
    true,
    'PETROL_PUMP_ERP',
    '["petrol_pump_management", "inventory", "sales", "common"]'::jsonb,
    '{
        "dashboard": {"view": true, "edit": true},
        "inventory": {"view": true, "edit": true},
        "sales": {"view": true, "edit": true},
        "reports": {"view": true, "edit": false}
    }'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    "productType" = EXCLUDED."productType",
    "assignedModules" = EXCLUDED."assignedModules",
    "pagePermissions" = EXCLUDED."pagePermissions",
    updated_at = NOW();

-- Verify the insert
SELECT 
    '✅ Demo User Created/Updated' as status,
    id, 
    email, 
    username, 
    role,
    "productType",
    CASE WHEN is_active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM users 
WHERE email = 'demo_hub_incharge@bisman.demo';

-- Show password info (for reference)
SELECT 
    '📝 Login Credentials' as info,
    'Email: demo_hub_incharge@bisman.demo' as email_info,
    'Password: demo123' as password_info;
