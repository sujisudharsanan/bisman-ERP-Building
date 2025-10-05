-- =====================================================
-- Simple RBAC Enhancement for Existing BISMAN Database
-- This script enhances your existing RBAC system
-- =====================================================

BEGIN;

-- =====================================================
-- ENHANCE EXISTING TABLES
-- =====================================================

-- Add missing columns to existing rbac_roles table
ALTER TABLE rbac_roles 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS parent_role_id INTEGER REFERENCES rbac_roles(id),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Update display_name with existing name values
UPDATE rbac_roles SET display_name = UPPER(SUBSTRING(name, 1, 1)) || LOWER(SUBSTRING(name, 2)) WHERE display_name IS NULL;

-- Add missing columns to existing rbac_routes table
ALTER TABLE rbac_routes 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'frontend',
ADD COLUMN IF NOT EXISTS method VARCHAR(10) DEFAULT 'GET',
ADD COLUMN IF NOT EXISTS module VARCHAR(100),
ADD COLUMN IF NOT EXISTS parent_route_id INTEGER REFERENCES rbac_routes(id),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_menu_item BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Update display_name with existing name values
UPDATE rbac_routes SET display_name = name WHERE display_name IS NULL;
UPDATE rbac_routes SET is_menu_item = true WHERE path NOT LIKE '/api/%';
UPDATE rbac_routes SET type = 'backend' WHERE path LIKE '/api/%';
UPDATE rbac_routes SET module = 
    CASE 
        WHEN path LIKE '%finance%' THEN 'finance'
        WHEN path LIKE '%inventory%' THEN 'inventory'
        WHEN path LIKE '%user%' OR path LIKE '%role%' THEN 'admin'
        ELSE 'core'
    END;

-- Add missing columns to rbac_actions table
ALTER TABLE rbac_actions 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update display_name with existing name values
UPDATE rbac_actions SET display_name = UPPER(SUBSTRING(name, 1, 1)) || LOWER(SUBSTRING(name, 2)) WHERE display_name IS NULL;

-- Add missing columns to rbac_permissions table
ALTER TABLE rbac_permissions 
ADD COLUMN IF NOT EXISTS name VARCHAR(200),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(250),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Generate permission names
UPDATE rbac_permissions SET name = 
    (SELECT CONCAT(LOWER(REPLACE(rt.name, ' ', '_')), '.', LOWER(ac.name))
     FROM rbac_routes rt, rbac_actions ac 
     WHERE rt.id = rbac_permissions.route_id AND ac.id = rbac_permissions.action_id)
WHERE name IS NULL;

-- Generate permission display names
UPDATE rbac_permissions SET display_name = 
    (SELECT CONCAT(rt.display_name, ' - ', ac.display_name)
     FROM rbac_routes rt, rbac_actions ac 
     WHERE rt.id = rbac_permissions.route_id AND ac.id = rbac_permissions.action_id)
WHERE display_name IS NULL;

-- Add missing columns to rbac_user_roles table
ALTER TABLE rbac_user_roles 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- =====================================================
-- CREATE ADDITIONAL TABLES FOR ENHANCED RBAC
-- =====================================================

-- Create user sessions table
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
    action VARCHAR(50) NOT NULL,
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
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Existing table indexes
CREATE INDEX IF NOT EXISTS idx_rbac_roles_name ON rbac_roles(name);
CREATE INDEX IF NOT EXISTS idx_rbac_roles_status ON rbac_roles(status);
CREATE INDEX IF NOT EXISTS idx_rbac_roles_parent ON rbac_roles(parent_role_id);

CREATE INDEX IF NOT EXISTS idx_rbac_routes_path ON rbac_routes(path);
CREATE INDEX IF NOT EXISTS idx_rbac_routes_name ON rbac_routes(name);
CREATE INDEX IF NOT EXISTS idx_rbac_routes_type ON rbac_routes(type);
CREATE INDEX IF NOT EXISTS idx_rbac_routes_module ON rbac_routes(module);

CREATE INDEX IF NOT EXISTS idx_rbac_actions_name ON rbac_actions(name);
CREATE INDEX IF NOT EXISTS idx_rbac_actions_active ON rbac_actions(is_active);

CREATE INDEX IF NOT EXISTS idx_rbac_permissions_route ON rbac_permissions(route_id);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_action ON rbac_permissions(action_id);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_name ON rbac_permissions(name);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_active ON rbac_permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user ON rbac_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_role ON rbac_user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_active ON rbac_user_roles(is_active);

-- New table indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- CREATE VIEWS FOR EASY QUERYING
-- =====================================================

-- View for active user permissions
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    r.name as role_name,
    rt.path as route_path,
    rt.name as route_name,
    a.name as action_name,
    p.name as permission_name,
    p.display_name as permission_display_name
FROM users u
JOIN rbac_user_roles ur ON u.id = ur.user_id
JOIN rbac_roles r ON ur.role_id = r.id
JOIN rbac_permissions p ON r.id = p.role_id
JOIN rbac_routes rt ON p.route_id = rt.id
JOIN rbac_actions a ON p.action_id = a.id
WHERE COALESCE(ur.is_active, true) = true
AND COALESCE(p.is_active, true) = true
AND COALESCE(rt.is_active, true) = true
AND COALESCE(a.is_active, true) = true
AND COALESCE(r.status, 'active') = 'active'
AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- View for menu items per user
CREATE OR REPLACE VIEW user_menu_view AS
SELECT DISTINCT
    u.id as user_id,
    rt.path,
    rt.name,
    rt.display_name,
    rt.icon,
    rt.sort_order,
    rt.module,
    rt.parent_route_id
FROM users u
JOIN rbac_user_roles ur ON u.id = ur.user_id
JOIN rbac_roles r ON ur.role_id = r.id
JOIN rbac_permissions p ON r.id = p.role_id
JOIN rbac_routes rt ON p.route_id = rt.id
JOIN rbac_actions a ON p.action_id = a.id
WHERE COALESCE(ur.is_active, true) = true
AND COALESCE(p.is_active, true) = true
AND COALESCE(rt.is_active, true) = true
AND COALESCE(rt.is_menu_item, false) = true
AND a.name = 'view'
AND COALESCE(r.status, 'active') = 'active'
AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- =====================================================
-- CREATE FUNCTIONS FOR PERMISSION CHECKING
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

-- Function to get user's menu items
CREATE OR REPLACE FUNCTION get_user_menu_items(p_user_id INTEGER)
RETURNS TABLE (
    path VARCHAR,
    name VARCHAR,
    display_name VARCHAR,
    icon VARCHAR,
    sort_order INTEGER,
    module VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.path::VARCHAR,
        m.name::VARCHAR,
        m.display_name::VARCHAR,
        m.icon::VARCHAR,
        m.sort_order,
        m.module::VARCHAR
    FROM user_menu_view m
    WHERE m.user_id = p_user_id
    ORDER BY m.sort_order, m.display_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INSERT SAMPLE ROUTES IF NOT EXISTS
-- =====================================================

-- Insert common ERP routes
INSERT INTO rbac_routes (path, name, display_name, description, type, module, is_menu_item, icon, sort_order, is_active) VALUES
('/dashboard', 'dashboard', 'Dashboard', 'Main dashboard', 'frontend', 'core', true, 'dashboard', 1, true),
('/finance', 'finance', 'Finance', 'Finance module', 'frontend', 'finance', true, 'dollar-sign', 2, true),
('/finance/transactions', 'finance_transactions', 'Transactions', 'Financial transactions', 'frontend', 'finance', true, 'credit-card', 3, true),
('/finance/reports', 'finance_reports', 'Financial Reports', 'Financial reporting', 'frontend', 'finance', true, 'file-text', 4, true),
('/inventory', 'inventory', 'Inventory', 'Inventory management', 'frontend', 'inventory', true, 'package', 5, true),
('/users', 'users', 'User Management', 'User administration', 'frontend', 'admin', true, 'users', 6, true),
('/roles', 'roles', 'Role Management', 'Role administration', 'frontend', 'admin', true, 'shield', 7, true),
('/settings', 'settings', 'Settings', 'System settings', 'frontend', 'admin', true, 'settings', 8, true)
ON CONFLICT (name) DO NOTHING;

-- Insert default actions if not exists
INSERT INTO rbac_actions (name, display_name, description, is_active) VALUES
('view', 'View', 'Permission to view/read data', true),
('create', 'Create', 'Permission to create new records', true),
('edit', 'Edit', 'Permission to modify existing records', true),
('delete', 'Delete', 'Permission to delete records', true),
('export', 'Export', 'Permission to export data', true),
('import', 'Import', 'Permission to import data', true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- CREATE AUTOMATIC PERMISSION GENERATION
-- =====================================================

-- Create permissions for all route-action combinations that don't exist
INSERT INTO rbac_permissions (role_id, route_id, action_id, name, display_name, is_active, created_at, updated_at)
SELECT DISTINCT
    role.id as role_id,
    route.id as route_id,
    action.id as action_id,
    CONCAT(LOWER(REPLACE(route.name, ' ', '_')), '.', LOWER(action.name)) as name,
    CONCAT(route.display_name, ' - ', action.display_name) as display_name,
    true as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM rbac_roles role
CROSS JOIN rbac_routes route
CROSS JOIN rbac_actions action
WHERE NOT EXISTS (
    SELECT 1 FROM rbac_permissions p 
    WHERE p.role_id = role.id 
    AND p.route_id = route.id 
    AND p.action_id = action.id
)
AND route.is_active = true
AND action.is_active = true
AND role.status = 'active';

-- =====================================================
-- UPDATE EXISTING DATA
-- =====================================================

-- Set some default icons for routes
UPDATE rbac_routes SET icon = 
    CASE 
        WHEN name LIKE '%dashboard%' THEN 'dashboard'
        WHEN name LIKE '%finance%' THEN 'dollar-sign'
        WHEN name LIKE '%inventory%' THEN 'package'
        WHEN name LIKE '%user%' THEN 'users'
        WHEN name LIKE '%role%' THEN 'shield'
        WHEN name LIKE '%setting%' THEN 'settings'
        WHEN name LIKE '%report%' THEN 'file-text'
        ELSE 'circle'
    END
WHERE icon IS NULL;

-- Set sort order based on module priority
UPDATE rbac_routes SET sort_order = 
    CASE module
        WHEN 'core' THEN 1
        WHEN 'finance' THEN 2
        WHEN 'inventory' THEN 3
        WHEN 'admin' THEN 4
        ELSE 5
    END * 10 + id
WHERE sort_order = 0;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show migration results
SELECT 
    'Users' as table_name, 
    COUNT(*) as count 
FROM users
UNION ALL
SELECT 
    'Roles' as table_name, 
    COUNT(*) as count 
FROM rbac_roles
UNION ALL
SELECT 
    'Routes' as table_name, 
    COUNT(*) as count 
FROM rbac_routes
UNION ALL
SELECT 
    'Actions' as table_name, 
    COUNT(*) as count 
FROM rbac_actions
UNION ALL
SELECT 
    'Permissions' as table_name, 
    COUNT(*) as count 
FROM rbac_permissions
UNION ALL
SELECT 
    'User Roles' as table_name, 
    COUNT(*) as count 
FROM rbac_user_roles;

-- Show sample user permissions
SELECT 
    u.username,
    r.name as role,
    COUNT(DISTINCT p.id) as permission_count
FROM users u
LEFT JOIN rbac_user_roles ur ON u.id = ur.user_id
LEFT JOIN rbac_roles r ON ur.role_id = r.id
LEFT JOIN rbac_permissions p ON r.id = p.role_id
WHERE COALESCE(ur.is_active, true) = true
GROUP BY u.id, u.username, r.name
ORDER BY u.username, r.name;

-- Test permission checking function
SELECT 
    username,
    check_user_permission(id, 'dashboard.view') as can_view_dashboard,
    check_user_permission(id, 'finance.view') as can_view_finance
FROM users
LIMIT 5;
