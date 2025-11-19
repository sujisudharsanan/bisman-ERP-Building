-- Create Missing Tables for Railway PostgreSQL Database
-- Generated from Prisma Schema
-- Date: 2025-11-14

-- ==========================================
-- CREATE ENTERPRISE_ADMINS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS enterprise_admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_pic_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

COMMENT ON TABLE enterprise_admins IS 'Top-level platform administrators';

-- ==========================================
-- CREATE SUPER_ADMINS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS super_admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "productType" VARCHAR(50) NOT NULL, -- PUMP_ERP | BUSINESS_ERP
    profile_pic_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_super_admins_created_by FOREIGN KEY (created_by) 
        REFERENCES enterprise_admins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_super_admins_product_type ON super_admins("productType");
CREATE INDEX IF NOT EXISTS idx_super_admins_created_by ON super_admins(created_by);

COMMENT ON TABLE super_admins IS 'Product-specific administrators (manages clients and modules)';

-- ==========================================
-- CREATE CLIENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    "productType" VARCHAR(50) NOT NULL, -- PUMP_ERP | BUSINESS_ERP
    super_admin_id INTEGER NOT NULL,
    "subscriptionPlan" VARCHAR(50) DEFAULT 'free' NOT NULL,
    "subscriptionStatus" VARCHAR(50) DEFAULT 'active' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    settings JSONB,
    logo TEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_clients_super_admin FOREIGN KEY (super_admin_id) 
        REFERENCES super_admins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clients_super_admin ON clients(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_clients_product_type ON clients("productType");

COMMENT ON TABLE clients IS 'Tenant companies/organizations';

-- ==========================================
-- CREATE MODULES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    module_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    route VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    "productType" VARCHAR(50) NOT NULL, -- PUMP_ERP | BUSINESS_ERP | ALL
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_modules_product_type ON modules("productType");
CREATE INDEX IF NOT EXISTS idx_modules_active ON modules(is_active);

COMMENT ON TABLE modules IS 'Available system modules/features';

-- ==========================================
-- CREATE MODULE_ASSIGNMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS module_assignments (
    id SERIAL PRIMARY KEY,
    super_admin_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    assigned_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    page_permissions JSONB, -- Array of assigned page IDs
    CONSTRAINT fk_module_assignments_super_admin FOREIGN KEY (super_admin_id) 
        REFERENCES super_admins(id) ON DELETE CASCADE,
    CONSTRAINT fk_module_assignments_module FOREIGN KEY (module_id) 
        REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT unique_super_admin_module UNIQUE (super_admin_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_module_assignments_super_admin ON module_assignments(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_module_assignments_module ON module_assignments(module_id);

COMMENT ON TABLE module_assignments IS 'Modules assigned to super admins';

-- ==========================================
-- CREATE PERMISSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    module_id INTEGER NOT NULL,
    can_view BOOLEAN DEFAULT false NOT NULL,
    can_create BOOLEAN DEFAULT false NOT NULL,
    can_edit BOOLEAN DEFAULT false NOT NULL,
    can_delete BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_permissions_module FOREIGN KEY (module_id) 
        REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT unique_role_module UNIQUE (role, module_id)
);

CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module_id);

COMMENT ON TABLE permissions IS 'Role-based module permissions';

-- ==========================================
-- UPDATE USERS TABLE (Add missing columns if needed)
-- ==========================================
DO $$ 
BEGIN
    -- Add productType if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'productType') THEN
        ALTER TABLE users ADD COLUMN "productType" VARCHAR(50) DEFAULT 'BUSINESS_ERP';
    END IF;
    
    -- Add tenant_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
        ALTER TABLE users ADD COLUMN tenant_id UUID;
    END IF;
    
    -- Add super_admin_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'super_admin_id') THEN
        ALTER TABLE users ADD COLUMN super_admin_id INTEGER;
    END IF;
    
    -- Add is_active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Add assignedModules if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'assignedModules') THEN
        ALTER TABLE users ADD COLUMN "assignedModules" JSONB;
    END IF;
    
    -- Add pagePermissions if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'pagePermissions') THEN
        ALTER TABLE users ADD COLUMN "pagePermissions" JSONB;
    END IF;
    
    -- Add profile_pic_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'profile_pic_url') THEN
        ALTER TABLE users ADD COLUMN profile_pic_url TEXT;
    END IF;
END $$;

-- Add foreign key constraints to users table if they don't exist
DO $$
BEGIN
    -- FK to clients (tenant_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_client' AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_client 
            FOREIGN KEY (tenant_id) REFERENCES clients(id) ON DELETE CASCADE;
    END IF;
    
    -- FK to super_admins
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_super_admin' AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_super_admin 
            FOREIGN KEY (super_admin_id) REFERENCES super_admins(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes on users table only if relevant columns exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='tenant_id'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='productType'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_product_type ON users("productType")';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='super_admin_id'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_super_admin ON users(super_admin_id)';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='users' AND column_name='is_active'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)';
    END IF;
END $$;

-- ==========================================
-- GRANT PERMISSIONS
-- ==========================================
GRANT SELECT, INSERT, UPDATE, DELETE ON enterprise_admins TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON super_admins TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON modules TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON module_assignments TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO PUBLIC;

GRANT USAGE, SELECT ON SEQUENCE enterprise_admins_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE super_admins_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE modules_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE module_assignments_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE permissions_id_seq TO PUBLIC;

-- ==========================================
-- VERIFICATION
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ==================================================';
    RAISE NOTICE '✅ Multi-Tenant Tables Created Successfully!';
    RAISE NOTICE '✅ ==================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tables created:';
    RAISE NOTICE '   - enterprise_admins';
    RAISE NOTICE '   - super_admins';
    RAISE NOTICE '   - clients';
    RAISE NOTICE '   - modules';
    RAISE NOTICE '   - module_assignments';
    RAISE NOTICE '   - permissions';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Users table updated with:';
    RAISE NOTICE '   - productType column';
    RAISE NOTICE '   - tenant_id column';
    RAISE NOTICE '   - super_admin_id column';
    RAISE NOTICE '   - is_active column';
    RAISE NOTICE '   - assignedModules column';
    RAISE NOTICE '   - pagePermissions column';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready for data seeding!';
    RAISE NOTICE '';
END $$;

-- Show table counts
SELECT 
    'enterprise_admins' as table_name, 
    COUNT(*) as row_count 
FROM enterprise_admins
UNION ALL
SELECT 'super_admins', COUNT(*) FROM super_admins
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'modules', COUNT(*) FROM modules
UNION ALL
SELECT 'users', COUNT(*) FROM users;
