-- =====================================================
-- RBAC Migration Script for Existing BISMAN Database
-- This script safely migrates your existing data to the new RBAC schema
-- =====================================================

-- Set transaction isolation
BEGIN;

-- =====================================================
-- BACKUP EXISTING DATA (Create backup tables)
-- =====================================================

-- Backup existing users table
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE rbac_actions_backup AS SELECT * FROM rbac_actions WHERE 1=1;
CREATE TABLE rbac_roles_backup AS SELECT * FROM rbac_roles WHERE 1=1;
CREATE TABLE rbac_permissions_backup AS SELECT * FROM rbac_permissions WHERE 1=1;
CREATE TABLE rbac_user_roles_backup AS SELECT * FROM rbac_user_roles WHERE 1=1;
CREATE TABLE rbac_routes_backup AS SELECT * FROM rbac_routes WHERE 1=1;

-- =====================================================
-- CREATE NEW RBAC TABLES (with new naming convention)
-- =====================================================

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE action_type AS ENUM ('view', 'create', 'edit', 'delete', 'export', 'import', 'approve', 'reject');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE route_type AS ENUM ('frontend', 'backend', 'api');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE role_status AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS_GRANTED', 'ACCESS_DENIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- MODIFY EXISTING TABLES TO MATCH NEW SCHEMA
-- =====================================================

-- Update users table structure
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_by INTEGER,
ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Add status column if it doesn't exist
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN status user_status DEFAULT 'active';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Update existing status values to match enum
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Add foreign key constraints
ALTER TABLE users 
ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id),
ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- =====================================================
-- CREATE NEW RBAC TABLES WITH IMPROVED NAMING
-- =====================================================

-- Rename existing tables to avoid conflicts
ALTER TABLE rbac_roles RENAME TO roles_new;
ALTER TABLE rbac_actions RENAME TO actions_new;
ALTER TABLE rbac_routes RENAME TO routes_new;
ALTER TABLE rbac_permissions RENAME TO permissions_new;
ALTER TABLE rbac_user_roles RENAME TO user_roles_new;

-- Create new roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    parent_role_id INTEGER REFERENCES roles(id),
    level INTEGER DEFAULT 1,
    status role_status DEFAULT 'active',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Create new routes table
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    path VARCHAR(500) NOT NULL,
    name VARCHAR(150) NOT NULL UNIQUE,
    display_name VARCHAR(200),
    description TEXT,
    type route_type NOT NULL DEFAULT 'frontend',
    method VARCHAR(10) DEFAULT 'GET',
    module VARCHAR(100),
    parent_route_id INTEGER REFERENCES routes(id),
    sort_order INTEGER DEFAULT 0,
    is_menu_item BOOLEAN DEFAULT FALSE,
    icon VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Create new actions table
CREATE TABLE IF NOT EXISTS actions (
    id SERIAL PRIMARY KEY,
    name action_type NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create new permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    action_id INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL UNIQUE,
    display_name VARCHAR(250),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    UNIQUE(route_id, action_id)
);

-- Create new role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, permission_id)
);

-- Create new user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_id)
);

-- Create session management table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action audit_action NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id INTEGER REFERENCES user_sessions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MIGRATE DATA FROM OLD TABLES TO NEW TABLES
-- =====================================================

-- Migrate roles
INSERT INTO roles (name, display_name, description, level, status, created_at, updated_at)
SELECT 
    LOWER(name) as name,
    name as display_name,
    description,
    CASE 
        WHEN UPPER(name) = 'SUPER_ADMIN' THEN 1
        WHEN UPPER(name) = 'ADMIN' THEN 2
        WHEN UPPER(name) = 'MANAGER' THEN 3
        WHEN UPPER(name) = 'STAFF' THEN 4
        ELSE 5
    END as level,
    'active' as status,
    created_at,
    updated_at
FROM roles_new
ON CONFLICT (name) DO NOTHING;

-- Migrate routes
INSERT INTO routes (path, name, display_name, description, type, module, is_menu_item, icon, is_active, created_at, updated_at)
SELECT 
    path,
    LOWER(REPLACE(name, ' ', '_')) as name,
    name as display_name,
    description,
    CASE 
        WHEN path LIKE '/api/%' THEN 'backend'::route_type
        ELSE 'frontend'::route_type
    END as type,
    CASE 
        WHEN path LIKE '%finance%' THEN 'finance'
        WHEN path LIKE '%inventory%' THEN 'inventory'
        WHEN path LIKE '%user%' OR path LIKE '%role%' THEN 'admin'
        ELSE 'core'
    END as module,
    CASE WHEN path NOT LIKE '/api/%' THEN true ELSE false END as is_menu_item,
    icon,
    is_active,
    created_at,
    updated_at
FROM routes_new
ON CONFLICT (name) DO NOTHING;

-- Insert default actions
INSERT INTO actions (name, display_name, description) VALUES
('view', 'View', 'Permission to view/read data'),
('create', 'Create', 'Permission to create new records'),
('edit', 'Edit', 'Permission to modify existing records'),
('delete', 'Delete', 'Permission to delete records'),
('export', 'Export', 'Permission to export data'),
('import', 'Import', 'Permission to import data'),
('approve', 'Approve', 'Permission to approve requests'),
('reject', 'Reject', 'Permission to reject requests')
ON CONFLICT (name) DO NOTHING;

-- Create permissions from route and action combinations
INSERT INTO permissions (route_id, action_id, name, display_name, is_active, created_at, updated_at)
SELECT 
    r.id as route_id,
    a.id as action_id,
    CONCAT(r.name, '.', a.name) as name,
    CONCAT(r.display_name, ' - ', a.display_name) as display_name,
    true as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM routes r
CROSS JOIN actions a
WHERE r.is_active = true
ON CONFLICT (route_id, action_id) DO NOTHING;

-- Migrate user-role assignments
INSERT INTO user_roles (user_id, role_id, assigned_at, is_active)
SELECT 
    u.id as user_id,
    r.id as role_id,
    COALESCE(ur.created_at, CURRENT_TIMESTAMP) as assigned_at,
    true as is_active
FROM users u
JOIN user_roles_new ur ON u.id = ur.user_id
JOIN roles_new rn ON ur.role_id = rn.id
JOIN roles r ON LOWER(rn.name) = r.name
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Migrate role permissions from old system
INSERT INTO role_permissions (role_id, permission_id, granted_at, is_active)
SELECT DISTINCT
    r.id as role_id,
    p.id as permission_id,
    CURRENT_TIMESTAMP as granted_at,
    true as is_active
FROM roles_new rn
JOIN roles r ON LOWER(rn.name) = r.name
JOIN permissions_new pn ON rn.id = pn.role_id
JOIN routes_new ron ON pn.route_id = ron.id
JOIN routes ro ON LOWER(REPLACE(ron.name, ' ', '_')) = ro.name
JOIN actions_new an ON pn.action_id = an.id
JOIN actions a ON LOWER(an.name) = a.name::text
JOIN permissions p ON ro.id = p.route_id AND a.id = p.action_id
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Roles table indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role_id);

-- Routes table indexes
CREATE INDEX IF NOT EXISTS idx_routes_path ON routes(path);
CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
CREATE INDEX IF NOT EXISTS idx_routes_type ON routes(type);
CREATE INDEX IF NOT EXISTS idx_routes_module ON routes(module);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active);

-- Permissions table indexes
CREATE INDEX IF NOT EXISTS idx_permissions_route ON permissions(route_id);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action_id);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active);

-- Role permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_active ON role_permissions(is_active);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON user_roles(expires_at);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- CREATE TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at column
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routes_updated_at ON routes;
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CREATE VIEWS AND FUNCTIONS
-- =====================================================

-- View for active user permissions
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    ro.name as role_name,
    r.path as route_path,
    r.name as route_name,
    a.name as action_name,
    p.name as permission_name,
    p.display_name as permission_display_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles ro ON ur.role_id = ro.id
JOIN role_permissions rp ON ro.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN routes r ON p.route_id = r.id
JOIN actions a ON p.action_id = a.id
WHERE ur.is_active = true
AND rp.is_active = true
AND p.is_active = true
AND r.is_active = true
AND a.is_active = true
AND u.status = 'active'
AND ro.status = 'active'
AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- View for menu items per user
CREATE OR REPLACE VIEW user_menu_view AS
SELECT DISTINCT
    u.id as user_id,
    r.path,
    r.name,
    r.display_name,
    r.icon,
    r.sort_order,
    r.module,
    r.parent_route_id
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles ro ON ur.role_id = ro.id
JOIN role_permissions rp ON ro.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN routes r ON p.route_id = r.id
JOIN actions a ON p.action_id = a.id
WHERE ur.is_active = true
AND rp.is_active = true
AND p.is_active = true
AND r.is_active = true
AND r.is_menu_item = true
AND a.name = 'view'
AND u.status = 'active'
AND ro.status = 'active'
AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id INTEGER,
    p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_permissions_view
        WHERE user_id = p_user_id
        AND permission_name = p_permission_name
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check route and action access
CREATE OR REPLACE FUNCTION check_user_route_access(
    p_user_id INTEGER,
    p_route_path VARCHAR,
    p_action_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_permissions_view
        WHERE user_id = p_user_id
        AND route_path = p_route_path
        AND action_name = p_action_name
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INSERT SAMPLE ROUTES FOR ERP SYSTEM
-- =====================================================

INSERT INTO routes (path, name, display_name, description, type, module, is_menu_item, icon, sort_order) VALUES
('/dashboard', 'dashboard', 'Dashboard', 'Main dashboard', 'frontend', 'core', true, 'dashboard', 1),
('/finance', 'finance', 'Finance', 'Finance module', 'frontend', 'finance', true, 'dollar-sign', 2),
('/finance/transactions', 'finance.transactions', 'Transactions', 'Financial transactions', 'frontend', 'finance', true, 'credit-card', 3),
('/finance/reports', 'finance.reports', 'Financial Reports', 'Financial reporting', 'frontend', 'finance', true, 'file-text', 4),
('/finance/accounts', 'finance.accounts', 'Accounts', 'Account management', 'frontend', 'finance', true, 'book', 5),
('/inventory', 'inventory', 'Inventory', 'Inventory management', 'frontend', 'inventory', true, 'package', 6),
('/inventory/items', 'inventory.items', 'Items', 'Inventory items', 'frontend', 'inventory', true, 'box', 7),
('/inventory/stock', 'inventory.stock', 'Stock Management', 'Stock level management', 'frontend', 'inventory', true, 'layers', 8),
('/users', 'users', 'User Management', 'User administration', 'frontend', 'admin', true, 'users', 9),
('/roles', 'roles', 'Role Management', 'Role administration', 'frontend', 'admin', true, 'shield', 10),
('/settings', 'settings', 'Settings', 'System settings', 'frontend', 'admin', true, 'settings', 11),
('/api/users', 'api.users', 'Users API', 'User management API', 'backend', 'admin', false, null, 0),
('/api/finance', 'api.finance', 'Finance API', 'Finance API endpoints', 'backend', 'finance', false, null, 0),
('/api/inventory', 'api.inventory', 'Inventory API', 'Inventory API endpoints', 'backend', 'inventory', false, null, 0)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- CREATE PERMISSIONS FOR ALL ROUTE-ACTION COMBINATIONS
-- =====================================================

INSERT INTO permissions (route_id, action_id, name, display_name)
SELECT 
    r.id as route_id,
    a.id as action_id,
    CONCAT(r.name, '.', a.name) as name,
    CONCAT(r.display_name, ' - ', a.display_name) as display_name
FROM routes r
CROSS JOIN actions a
WHERE r.is_active = true AND a.is_active = true
ON CONFLICT (route_id, action_id) DO NOTHING;

-- =====================================================
-- ASSIGN DEFAULT PERMISSIONS TO ROLES
-- =====================================================

-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'super_admin'),
    p.id
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin gets most permissions except super admin specific ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    p.id
FROM permissions p
WHERE p.name NOT LIKE 'api.users.delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager gets view, create, edit permissions for business modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'manager'),
    p.id
FROM permissions p
WHERE (p.name LIKE 'finance.%' OR p.name LIKE 'inventory.%' OR p.name LIKE 'dashboard.%')
AND (p.name LIKE '%.view' OR p.name LIKE '%.edit' OR p.name LIKE '%.create' OR p.name LIKE '%.export')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff gets view and limited edit permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'staff'),
    p.id
FROM permissions p
WHERE (p.name LIKE '%.view' OR p.name LIKE 'finance.transactions.create')
AND p.name NOT LIKE 'users.%'
AND p.name NOT LIKE 'roles.%'
AND p.name NOT LIKE 'settings.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check migration results
DO $$
DECLARE
    user_count INTEGER;
    role_count INTEGER;
    route_count INTEGER;
    permission_count INTEGER;
    user_role_count INTEGER;
    role_permission_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO role_count FROM roles;
    SELECT COUNT(*) INTO route_count FROM routes;
    SELECT COUNT(*) INTO permission_count FROM permissions;
    SELECT COUNT(*) INTO user_role_count FROM user_roles;
    SELECT COUNT(*) INTO role_permission_count FROM role_permissions;
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Roles: %', role_count;
    RAISE NOTICE 'Routes: %', route_count;
    RAISE NOTICE 'Permissions: %', permission_count;
    RAISE NOTICE 'User-Role assignments: %', user_role_count;
    RAISE NOTICE 'Role-Permission assignments: %', role_permission_count;
END $$;

-- =====================================================
-- CLEANUP (Optional - comment out if you want to keep backups)
-- =====================================================

-- Drop old table backups after successful migration
-- DROP TABLE IF EXISTS users_backup CASCADE;
-- DROP TABLE IF EXISTS rbac_actions_backup CASCADE;
-- DROP TABLE IF EXISTS rbac_roles_backup CASCADE;
-- DROP TABLE IF EXISTS rbac_permissions_backup CASCADE;
-- DROP TABLE IF EXISTS rbac_user_roles_backup CASCADE;
-- DROP TABLE IF EXISTS rbac_routes_backup CASCADE;

-- Drop renamed tables
-- DROP TABLE IF EXISTS roles_new CASCADE;
-- DROP TABLE IF EXISTS actions_new CASCADE;
-- DROP TABLE IF EXISTS routes_new CASCADE;
-- DROP TABLE IF EXISTS permissions_new CASCADE;
-- DROP TABLE IF EXISTS user_roles_new CASCADE;

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Test permission checking for existing users
SELECT 
    u.username,
    u.email,
    COUNT(DISTINCT ur.role_id) as role_count,
    COUNT(DISTINCT p.id) as permission_count
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
LEFT JOIN role_permissions rp ON ur.role_id = rp.role_id AND rp.is_active = true
LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
WHERE u.status = 'active'
GROUP BY u.id, u.username, u.email
ORDER BY u.username;

-- Show sample permissions for first user
SELECT 
    u.username,
    r.display_name as role,
    ro.display_name as route,
    a.display_name as action,
    p.name as permission
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN routes ro ON p.route_id = ro.id
JOIN actions a ON p.action_id = a.id
WHERE ur.is_active = true
AND rp.is_active = true
AND p.is_active = true
AND u.status = 'active'
LIMIT 20;
