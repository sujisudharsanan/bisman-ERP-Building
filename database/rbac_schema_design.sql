-- =====================================================
-- RBAC (Role-Based Access Control) Database Schema
-- Following International Best Practices
-- =====================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS actions CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create ENUM types for better data integrity
CREATE TYPE action_type AS ENUM ('view', 'create', 'edit', 'delete', 'export', 'import', 'approve', 'reject');
CREATE TYPE route_type AS ENUM ('frontend', 'backend', 'api');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE role_status AS ENUM ('active', 'inactive');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS_GRANTED', 'ACCESS_DENIED');

-- =====================================================
-- 1. USERS TABLE
-- Stores all system users with basic information
-- =====================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- Hashed password
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    status user_status DEFAULT 'active',
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP NULL, -- Account lockout mechanism
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Add indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);

-- =====================================================
-- 2. ROLES TABLE
-- Defines system roles with hierarchical support
-- =====================================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    parent_role_id INTEGER REFERENCES roles(id), -- Hierarchical roles
    level INTEGER DEFAULT 1, -- Role hierarchy level
    status role_status DEFAULT 'active',
    is_default BOOLEAN DEFAULT FALSE, -- Default role for new users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Add indexes
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_status ON roles(status);
CREATE INDEX idx_roles_parent ON roles(parent_role_id);

-- =====================================================
-- 3. ROUTES TABLE
-- Stores all application routes/endpoints
-- =====================================================
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    path VARCHAR(500) NOT NULL, -- Route path (e.g., /dashboard/finance)
    name VARCHAR(150) NOT NULL UNIQUE, -- Route identifier (e.g., finance.dashboard)
    display_name VARCHAR(200), -- Human readable name
    description TEXT,
    type route_type NOT NULL DEFAULT 'frontend',
    method VARCHAR(10) DEFAULT 'GET', -- HTTP method for API routes
    module VARCHAR(100), -- Application module (finance, inventory, etc.)
    parent_route_id INTEGER REFERENCES routes(id), -- Hierarchical routes
    sort_order INTEGER DEFAULT 0, -- For menu ordering
    is_menu_item BOOLEAN DEFAULT FALSE, -- Should appear in navigation
    icon VARCHAR(100), -- Icon class for frontend
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Add indexes
CREATE INDEX idx_routes_path ON routes(path);
CREATE INDEX idx_routes_name ON routes(name);
CREATE INDEX idx_routes_type ON routes(type);
CREATE INDEX idx_routes_module ON routes(module);
CREATE INDEX idx_routes_active ON routes(is_active);

-- =====================================================
-- 4. ACTIONS TABLE
-- Defines available actions in the system
-- =====================================================
CREATE TABLE actions (
    id SERIAL PRIMARY KEY,
    name action_type NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. PERMISSIONS TABLE
-- Links routes and actions to define granular permissions
-- =====================================================
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    action_id INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL UNIQUE, -- e.g., "finance.dashboard.view"
    display_name VARCHAR(250),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    -- Ensure unique combination
    UNIQUE(route_id, action_id)
);

-- Add indexes
CREATE INDEX idx_permissions_route ON permissions(route_id);
CREATE INDEX idx_permissions_action ON permissions(action_id);
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_active ON permissions(is_active);

-- =====================================================
-- 6. ROLE_PERMISSIONS TABLE
-- Many-to-many relationship between roles and permissions
-- =====================================================
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure unique combination
    UNIQUE(role_id, permission_id)
);

-- Add indexes
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_active ON role_permissions(is_active);

-- =====================================================
-- 7. USER_ROLES TABLE
-- Many-to-many relationship between users and roles
-- =====================================================
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NULL, -- Optional role expiration
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure unique combination per user
    UNIQUE(user_id, role_id)
);

-- Add indexes
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);
CREATE INDEX idx_user_roles_expires ON user_roles(expires_at);

-- =====================================================
-- 8. USER_SESSIONS TABLE
-- Track user sessions for security and audit
-- =====================================================
CREATE TABLE user_sessions (
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

-- Add indexes
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- =====================================================
-- 9. AUDIT_LOGS TABLE
-- Comprehensive audit trail for all RBAC operations
-- =====================================================
CREATE TABLE audit_logs (
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

-- Add indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert default actions
INSERT INTO actions (name, display_name, description) VALUES
('view', 'View', 'Permission to view/read data'),
('create', 'Create', 'Permission to create new records'),
('edit', 'Edit', 'Permission to modify existing records'),
('delete', 'Delete', 'Permission to delete records'),
('export', 'Export', 'Permission to export data'),
('import', 'Import', 'Permission to import data'),
('approve', 'Approve', 'Permission to approve requests'),
('reject', 'Reject', 'Permission to reject requests');

-- Insert default roles
INSERT INTO roles (name, display_name, description, level) VALUES
('super_admin', 'Super Administrator', 'Full system access', 1),
('admin', 'Administrator', 'Administrative access', 2),
('manager', 'Manager', 'Management level access', 3),
('supervisor', 'Supervisor', 'Supervisory access', 4),
('staff', 'Staff', 'Standard user access', 5),
('viewer', 'Viewer', 'Read-only access', 6);

-- Insert sample routes
INSERT INTO routes (path, name, display_name, description, type, module, is_menu_item, icon) VALUES
('/dashboard', 'dashboard', 'Dashboard', 'Main dashboard', 'frontend', 'core', true, 'dashboard'),
('/finance', 'finance', 'Finance', 'Finance module', 'frontend', 'finance', true, 'dollar-sign'),
('/finance/transactions', 'finance.transactions', 'Transactions', 'Financial transactions', 'frontend', 'finance', true, 'credit-card'),
('/finance/reports', 'finance.reports', 'Financial Reports', 'Financial reporting', 'frontend', 'finance', true, 'file-text'),
('/inventory', 'inventory', 'Inventory', 'Inventory management', 'frontend', 'inventory', true, 'package'),
('/users', 'users', 'User Management', 'User administration', 'frontend', 'admin', true, 'users'),
('/roles', 'roles', 'Role Management', 'Role administration', 'frontend', 'admin', true, 'shield'),
('/api/users', 'api.users', 'Users API', 'User management API', 'backend', 'admin', false, null),
('/api/finance', 'api.finance', 'Finance API', 'Finance API endpoints', 'backend', 'finance', false, null);

-- Create permissions (route + action combinations)
INSERT INTO permissions (route_id, action_id, name, display_name)
SELECT 
    r.id as route_id,
    a.id as action_id,
    CONCAT(r.name, '.', a.name) as name,
    CONCAT(r.display_name, ' - ', a.display_name) as display_name
FROM routes r
CROSS JOIN actions a
WHERE r.is_active = true AND a.is_active = true;

-- Assign permissions to roles (example)
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'super_admin'),
    p.id
FROM permissions p;

-- Admin gets most permissions except super admin specific ones
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'admin'),
    p.id
FROM permissions p
WHERE p.name NOT LIKE '%api%' OR p.name LIKE '%.view';

-- Manager gets view and edit permissions for finance and inventory
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'manager'),
    p.id
FROM permissions p
WHERE (p.name LIKE 'finance.%' OR p.name LIKE 'inventory.%' OR p.name LIKE 'dashboard.%')
AND p.name LIKE '%.view' OR p.name LIKE '%.edit' OR p.name LIKE '%.create';

-- Staff gets view permissions for most modules
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'staff'),
    p.id
FROM permissions p
WHERE p.name LIKE '%.view'
AND p.name NOT LIKE 'users.%'
AND p.name NOT LIKE 'roles.%';

-- =====================================================
-- EXAMPLE QUERIES FOR PERMISSION CHECKING
-- =====================================================

-- Comments with example usage:

/*
-- 1. Check if a user has a specific permission
SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = $user_id
    AND p.name = $permission_name
    AND ur.is_active = true
    AND rp.is_active = true
    AND u.status = 'active'
    AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
) as has_permission;

-- 2. Get all permissions for a user
SELECT DISTINCT p.name, p.display_name, r.path, a.name as action
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN routes r ON p.route_id = r.id
JOIN actions a ON p.action_id = a.id
WHERE u.id = $user_id
AND ur.is_active = true
AND rp.is_active = true
AND p.is_active = true
AND r.is_active = true
AND a.is_active = true
AND u.status = 'active'
AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- 3. Get menu items accessible to a user
SELECT DISTINCT r.path, r.name, r.display_name, r.icon, r.sort_order
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN routes r ON p.route_id = r.id
JOIN actions a ON p.action_id = a.id
WHERE u.id = $user_id
AND ur.is_active = true
AND rp.is_active = true
AND p.is_active = true
AND r.is_active = true
AND r.is_menu_item = true
AND a.name = 'view'
AND u.status = 'active'
AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
ORDER BY r.sort_order, r.display_name;

-- 4. Check route and action specific permission
SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    JOIN routes r ON p.route_id = r.id
    JOIN actions a ON p.action_id = a.id
    WHERE u.id = $user_id
    AND r.path = $route_path
    AND a.name = $action_name
    AND ur.is_active = true
    AND rp.is_active = true
    AND p.is_active = true
    AND r.is_active = true
    AND a.is_active = true
    AND u.status = 'active'
    AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
) as has_access;

-- 5. Get user roles and permissions summary
SELECT 
    u.username,
    u.email,
    ro.name as role_name,
    ro.display_name as role_display_name,
    COUNT(DISTINCT p.id) as permission_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles ro ON ur.role_id = ro.id
LEFT JOIN role_permissions rp ON ro.id = rp.role_id AND rp.is_active = true
LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = true
WHERE u.id = $user_id
AND ur.is_active = true
AND u.status = 'active'
AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
GROUP BY u.id, u.username, u.email, ro.id, ro.name, ro.display_name;
*/

-- =====================================================
-- SECURITY CONSTRAINTS AND BEST PRACTICES
-- =====================================================

-- Row Level Security (RLS) examples
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Password policy constraints
ALTER TABLE users ADD CONSTRAINT password_length_check 
CHECK (LENGTH(password_hash) >= 60); -- bcrypt hash length

-- Email format validation
ALTER TABLE users ADD CONSTRAINT email_format_check 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Username format validation
ALTER TABLE users ADD CONSTRAINT username_format_check 
CHECK (username ~* '^[A-Za-z0-9_-]{3,100}$');

-- Role name format validation
ALTER TABLE roles ADD CONSTRAINT role_name_format_check 
CHECK (name ~* '^[a-z0-9_]+$');

-- Route path validation
ALTER TABLE routes ADD CONSTRAINT route_path_format_check 
CHECK (path ~* '^/[a-zA-Z0-9/_-]*$');

-- Permission name format validation
ALTER TABLE permissions ADD CONSTRAINT permission_name_format_check 
CHECK (name ~* '^[a-z0-9_.]+$');

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active user permissions
CREATE VIEW user_permissions_view AS
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
CREATE VIEW user_menu_view AS
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

-- =====================================================
-- FUNCTIONS FOR PERMISSION CHECKING
-- =====================================================

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
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'System users with authentication and profile information';
COMMENT ON TABLE roles IS 'System roles with hierarchical support';
COMMENT ON TABLE routes IS 'Application routes and endpoints for permission control';
COMMENT ON TABLE actions IS 'Available actions that can be performed on routes';
COMMENT ON TABLE permissions IS 'Granular permissions combining routes and actions';
COMMENT ON TABLE role_permissions IS 'Many-to-many relationship between roles and permissions';
COMMENT ON TABLE user_roles IS 'Many-to-many relationship between users and roles';
COMMENT ON TABLE user_sessions IS 'Active user sessions for security tracking';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system operations';

COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password';
COMMENT ON COLUMN users.failed_login_attempts IS 'Counter for failed login attempts';
COMMENT ON COLUMN users.locked_until IS 'Account lockout timestamp';
COMMENT ON COLUMN roles.parent_role_id IS 'Supports role hierarchy';
COMMENT ON COLUMN roles.level IS 'Hierarchy level (1=highest, higher number=lower level)';
COMMENT ON COLUMN routes.parent_route_id IS 'Supports nested route structure';
COMMENT ON COLUMN routes.sort_order IS 'Menu ordering';
COMMENT ON COLUMN permissions.name IS 'Unique permission identifier (route.action format)';
COMMENT ON COLUMN user_roles.expires_at IS 'Optional role expiration for temporary access';
COMMENT ON COLUMN audit_logs.old_values IS 'JSON of values before change';
COMMENT ON COLUMN audit_logs.new_values IS 'JSON of values after change';

-- =====================================================
-- END OF RBAC SCHEMA
-- =====================================================
