-- Migration: Merge public.users into erp.users
-- Date: 2025-12-01
-- Purpose: Consolidate user tables into single erp.users with enhanced security

-- =============================================================================
-- STEP 1: Add missing columns to erp.users from public.users
-- =============================================================================

-- Multi-tenancy support
ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS super_admin_id INTEGER;

-- Role as text (in addition to role_id for flexibility)
ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS role VARCHAR(100);

-- Product and permissions
ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'BUSINESS_ERP';
ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS assigned_modules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS page_permissions JSONB DEFAULT '{}'::jsonb;

-- Profile/UI preferences
ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(50) DEFAULT 'bisman-default';

-- =============================================================================
-- STEP 2: Create indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_erp_users_email ON erp.users(email);
CREATE INDEX IF NOT EXISTS idx_erp_users_username ON erp.users(username);
CREATE INDEX IF NOT EXISTS idx_erp_users_tenant_id ON erp.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_erp_users_role ON erp.users(role);
CREATE INDEX IF NOT EXISTS idx_erp_users_is_active ON erp.users(is_active);
CREATE INDEX IF NOT EXISTS idx_erp_users_legacy_id ON erp.users(legacy_id);

-- =============================================================================
-- STEP 3: Migrate data from public.users to erp.users
-- =============================================================================

INSERT INTO erp.users (
    id,
    legacy_id,
    username,
    email,
    password_hash,
    role,
    is_active,
    tenant_id,
    super_admin_id,
    product_type,
    assigned_modules,
    page_permissions,
    profile_pic_url,
    theme_preference,
    created_at,
    updated_at,
    -- Set defaults for enhanced fields
    email_verified,
    phone_verified,
    login_attempts,
    preferences
)
SELECT 
    gen_random_uuid() as id,
    p.id as legacy_id,
    p.username,
    p.email,
    p.password as password_hash,  -- Already bcrypt hashed
    p.role,
    p.is_active,
    p.tenant_id,
    p.super_admin_id,
    p."productType" as product_type,
    COALESCE(p."assignedModules", '[]'::jsonb) as assigned_modules,
    COALESCE(p."pagePermissions", '{}'::jsonb) as page_permissions,
    p.profile_pic_url,
    COALESCE(p.theme_preference, 'bisman-default') as theme_preference,
    COALESCE(p.created_at, NOW()) as created_at,
    COALESCE(p.updated_at, NOW()) as updated_at,
    -- Default values for new security fields
    false as email_verified,
    false as phone_verified,
    0 as login_attempts,
    '{}'::jsonb as preferences
FROM public.users p
WHERE NOT EXISTS (
    SELECT 1 FROM erp.users e WHERE e.email = p.email
);

-- =============================================================================
-- STEP 4: Create a view for backward compatibility (optional)
-- =============================================================================

CREATE OR REPLACE VIEW public.users_v AS
SELECT 
    legacy_id as id,
    username,
    email,
    password_hash as password,
    role,
    is_active,
    product_type as "productType",
    tenant_id,
    super_admin_id,
    assigned_modules as "assignedModules",
    page_permissions as "pagePermissions",
    profile_pic_url,
    theme_preference,
    created_at,
    updated_at
FROM erp.users;

-- =============================================================================
-- STEP 5: Add constraints
-- =============================================================================

ALTER TABLE erp.users ALTER COLUMN email SET NOT NULL;
ALTER TABLE erp.users ALTER COLUMN is_active SET DEFAULT true;

-- Unique constraints (if not exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'erp_users_email_unique') THEN
        ALTER TABLE erp.users ADD CONSTRAINT erp_users_email_unique UNIQUE (email);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'erp_users_username_unique') THEN
        ALTER TABLE erp.users ADD CONSTRAINT erp_users_username_unique UNIQUE (username);
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERY (run after migration)
-- =============================================================================
-- SELECT COUNT(*) as total_users, 
--        COUNT(DISTINCT email) as unique_emails,
--        COUNT(DISTINCT legacy_id) as migrated_from_public
-- FROM erp.users;
