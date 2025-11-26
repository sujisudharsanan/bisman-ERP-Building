-- ====================================================================
-- BISMAN ERP - IMPROVED MULTI-TENANT DATABASE SCHEMA
-- ====================================================================
-- Created: November 26, 2025
-- Database: PostgreSQL
-- Purpose: Normalized, secure, multi-tenant ERP schema
-- ====================================================================

-- ====================================================================
-- ENUMS
-- ====================================================================

-- User Roles
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'ENTERPRISE_ADMIN',
    'ADMIN',
    'IT_ADMIN',
    'CFO',
    'FINANCE_CONTROLLER',
    'TREASURY',
    'ACCOUNTS',
    'ACCOUNTS_PAYABLE',
    'ACCOUNTS_RECEIVABLE',
    'BANKER',
    'PROCUREMENT_OFFICER',
    'PROCUREMENT_HEAD',
    'PROCUREMENT_MANAGER',
    'SUPPLIER_MANAGER',
    'OPERATIONS_MANAGER',
    'WAREHOUSE_MANAGER',
    'LOGISTICS_MANAGER',
    'INVENTORY_CONTROLLER',
    'HUB_INCHARGE',
    'STORE_INCHARGE',
    'COMPLIANCE',
    'COMPLIANCE_OFFICER',
    'LEGAL',
    'LEGAL_HEAD',
    'RISK_MANAGER',
    'HR',
    'HR_MANAGER',
    'STAFF',
    'MANAGER',
    'USER'
);

-- Product Types
CREATE TYPE product_type AS ENUM (
    'BUSINESS_ERP',
    'PETROL_PUMP_ERP',
    'LOGISTICS_ERP',
    'RETAIL_ERP'
);

-- Address Types
CREATE TYPE address_type AS ENUM (
    'HOME',
    'OFFICE',
    'BILLING',
    'SHIPPING',
    'WAREHOUSE',
    'OTHER'
);

-- Gender
CREATE TYPE gender_type AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
);

-- ====================================================================
-- CORE TABLES
-- ====================================================================

-- Tenants/Clients Table (Multi-tenant support)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    subscription_tier VARCHAR(50),
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Indexes
    CONSTRAINT clients_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_clients_active ON clients(is_active);
CREATE INDEX idx_clients_deleted ON clients(deleted_at);

-- Super Admins Table
CREATE TABLE IF NOT EXISTS super_admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- IMPROVED USERS TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS users (
    -- Identity
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    
    -- Authentication
    password VARCHAR(255) NOT NULL,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- Authorization
    role user_role NOT NULL DEFAULT 'USER',
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMP, -- Soft delete (NULL = not deleted)
    
    -- Multi-tenant
    tenant_id UUID,
    product_type product_type NOT NULL DEFAULT 'BUSINESS_ERP',
    super_admin_id INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_username_tenant_unique UNIQUE (username, tenant_id),
    
    -- Foreign Keys
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) 
        REFERENCES clients(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_users_super_admin FOREIGN KEY (super_admin_id) 
        REFERENCES super_admins(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Users Table Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_deleted ON users(deleted_at);
CREATE INDEX idx_users_product_type ON users(product_type);
CREATE INDEX idx_users_super_admin ON users(super_admin_id);
CREATE INDEX idx_users_role ON users(role);

-- ====================================================================
-- USER PROFILE & ADDRESS TABLES
-- ====================================================================

-- User Profiles (Separate profile data)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Personal Information
    full_name VARCHAR(255),
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT false,
    date_of_birth DATE,
    gender gender_type,
    
    -- Profile Media
    profile_pic_url TEXT,
    cover_pic_url TEXT,
    
    -- Additional Info
    bio TEXT,
    department VARCHAR(100),
    designation VARCHAR(100),
    employee_id VARCHAR(50),
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT user_profiles_user_unique UNIQUE (user_id),
    CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_phone ON user_profiles(phone);

-- User Addresses (Multiple addresses per user)
CREATE TABLE IF NOT EXISTS user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Address Type
    address_type address_type NOT NULL DEFAULT 'HOME',
    
    -- Address Details
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    
    -- Status
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_user_addresses_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_user_addresses_user ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_type ON user_addresses(address_type);
CREATE INDEX idx_user_addresses_default ON user_addresses(is_default);

-- ====================================================================
-- NORMALIZED PERMISSION TABLES
-- ====================================================================

-- Modules Master Table
CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    module_key VARCHAR(100) NOT NULL UNIQUE,
    module_name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    display_order INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    product_type product_type,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_modules_key ON modules(module_key);
CREATE INDEX idx_modules_product_type ON modules(product_type);

-- User Modules (User-specific module assignments)
CREATE TABLE IF NOT EXISTS user_modules (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    module_key VARCHAR(100) NOT NULL,
    
    -- Permission
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT user_modules_user_module_unique UNIQUE (user_id, module_key),
    
    -- Foreign Keys
    CONSTRAINT fk_user_modules_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_modules_module FOREIGN KEY (module_key) 
        REFERENCES modules(module_key) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_user_modules_user ON user_modules(user_id);
CREATE INDEX idx_user_modules_module ON user_modules(module_key);
CREATE INDEX idx_user_modules_enabled ON user_modules(is_enabled);

-- Pages/Routes Master Table
CREATE TABLE IF NOT EXISTS pages (
    id SERIAL PRIMARY KEY,
    page_key VARCHAR(100) NOT NULL UNIQUE,
    route VARCHAR(255) NOT NULL,
    page_name VARCHAR(255) NOT NULL,
    description TEXT,
    module_key VARCHAR(100),
    icon VARCHAR(50),
    display_order INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    product_type product_type,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_pages_module FOREIGN KEY (module_key) 
        REFERENCES modules(module_key) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_pages_key ON pages(page_key);
CREATE INDEX idx_pages_route ON pages(route);
CREATE INDEX idx_pages_module ON pages(module_key);

-- User Page Permissions (Granular CRUD permissions)
CREATE TABLE IF NOT EXISTS user_page_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    page_key VARCHAR(100) NOT NULL,
    
    -- CRUD Permissions
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    can_approve BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT user_page_permissions_user_page_unique UNIQUE (user_id, page_key),
    
    -- Foreign Keys
    CONSTRAINT fk_user_page_permissions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_user_page_permissions_page FOREIGN KEY (page_key) 
        REFERENCES pages(page_key) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_user_page_permissions_user ON user_page_permissions(user_id);
CREATE INDEX idx_user_page_permissions_page ON user_page_permissions(page_key);

-- ====================================================================
-- AUDIT & SECURITY TABLES
-- ====================================================================

-- Login History (Track all login attempts)
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    email VARCHAR(150) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    login_status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED', 'BLOCKED'
    failure_reason VARCHAR(255),
    session_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_login_history_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_login_history_user ON login_history(user_id);
CREATE INDEX idx_login_history_email ON login_history(email);
CREATE INDEX idx_login_history_created ON login_history(created_at DESC);
CREATE INDEX idx_login_history_status ON login_history(login_status);

-- Password History (Prevent password reuse)
CREATE TABLE IF NOT EXISTS password_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    changed_by INTEGER, -- Admin who changed it (if not self)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_password_history_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_password_history_changed_by FOREIGN KEY (changed_by) 
        REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_password_history_user ON password_history(user_id);
CREATE INDEX idx_password_history_created ON password_history(created_at DESC);

-- Session Management
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- ====================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ====================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON user_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_modules_updated_at BEFORE UPDATE ON user_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_page_permissions_updated_at BEFORE UPDATE ON user_page_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- SEED DATA FOR MODULES AND PAGES
-- ====================================================================

-- Insert default modules
INSERT INTO modules (module_key, module_name, description, product_type) VALUES
    ('dashboard', 'Dashboard', 'Main dashboard and analytics', 'BUSINESS_ERP'),
    ('finance', 'Finance', 'Financial management', 'BUSINESS_ERP'),
    ('inventory', 'Inventory', 'Inventory management', 'BUSINESS_ERP'),
    ('procurement', 'Procurement', 'Procurement and purchasing', 'BUSINESS_ERP'),
    ('hr', 'Human Resources', 'HR and employee management', 'BUSINESS_ERP'),
    ('operations', 'Operations', 'Operations management', 'BUSINESS_ERP'),
    ('reports', 'Reports', 'Reports and analytics', 'BUSINESS_ERP'),
    ('settings', 'Settings', 'System settings', 'BUSINESS_ERP')
ON CONFLICT (module_key) DO NOTHING;

-- ====================================================================
-- COMMENTS FOR DOCUMENTATION
-- ====================================================================

COMMENT ON TABLE users IS 'Core users table with authentication and soft delete support';
COMMENT ON TABLE user_profiles IS 'Extended user profile information separate from auth data';
COMMENT ON TABLE user_addresses IS 'Multiple addresses per user with type categorization';
COMMENT ON TABLE user_modules IS 'User-specific module access permissions';
COMMENT ON TABLE user_page_permissions IS 'Granular CRUD permissions per page/route';
COMMENT ON TABLE login_history IS 'Complete audit trail of all login attempts';
COMMENT ON TABLE password_history IS 'Password change history for security compliance';
COMMENT ON TABLE user_sessions IS 'Active user session management with tokens';

COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN users.password_changed_at IS 'Last password change for token invalidation';
COMMENT ON COLUMN users.last_login_at IS 'Last successful login timestamp';
COMMENT ON COLUMN user_addresses.is_default IS 'Default address for shipping/billing';

-- ====================================================================
-- END OF SCHEMA
-- ====================================================================
