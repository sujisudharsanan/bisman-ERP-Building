-- =====================================================
-- Working RBAC Enhancement for BISMAN Database
-- This script works with your existing table structure
-- =====================================================

-- Add missing columns that are safe to add
ALTER TABLE rbac_routes 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_menu_item BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS icon VARCHAR(100),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update display names
UPDATE rbac_routes SET display_name = name WHERE display_name IS NULL;

-- Set menu items (non-API routes)
UPDATE rbac_routes SET is_menu_item = (path NOT LIKE '/api/%');

-- Add missing columns to rbac_user_roles
ALTER TABLE rbac_user_roles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Add missing columns to rbac_permissions
ALTER TABLE rbac_permissions 
ADD COLUMN IF NOT EXISTS name VARCHAR(200),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(250),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add missing columns to rbac_roles
ALTER TABLE rbac_roles 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Update role display names
UPDATE rbac_roles SET display_name = UPPER(SUBSTRING(name, 1, 1)) || LOWER(SUBSTRING(name, 2)) WHERE display_name IS NULL;

-- Add missing columns to rbac_actions
ALTER TABLE rbac_actions 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update action display names
UPDATE rbac_actions SET display_name = UPPER(SUBSTRING(name, 1, 1)) || LOWER(SUBSTRING(name, 2)) WHERE display_name IS NULL;

-- Generate permission names
UPDATE rbac_permissions SET name = 
    (SELECT CONCAT(LOWER(REPLACE(rt.name, ' ', '_')), '.', LOWER(ac.name))
     FROM rbac_routes rt, rbac_actions ac 
     WHERE rt.id = rbac_permissions.route_id AND ac.id = rbac_permissions.action_id)
WHERE name IS NULL;

-- Generate permission display names
UPDATE rbac_permissions SET display_name = 
    (SELECT CONCAT(COALESCE(rt.display_name, rt.name), ' - ', COALESCE(ac.display_name, ac.name))
     FROM rbac_routes rt, rbac_actions ac 
     WHERE rt.id = rbac_permissions.route_id AND ac.id = rbac_permissions.action_id)
WHERE display_name IS NULL;

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rbac_routes_active ON rbac_routes(is_active);
CREATE INDEX IF NOT EXISTS idx_rbac_routes_menu ON rbac_routes(is_menu_item);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_name ON rbac_permissions(name);
CREATE INDEX IF NOT EXISTS idx_rbac_permissions_active ON rbac_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_active ON rbac_user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Create view for active user permissions
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
    COALESCE(p.display_name, CONCAT(rt.name, ' - ', a.name)) as permission_display_name
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

-- Create view for menu items
CREATE OR REPLACE VIEW user_menu_view AS
SELECT DISTINCT
    u.id as user_id,
    rt.path,
    rt.name,
    COALESCE(rt.display_name, rt.name) as display_name,
    rt.icon,
    COALESCE(rt.sort_order, 0) as sort_order,
    rt.module
FROM users u
JOIN rbac_user_roles ur ON u.id = ur.user_id
JOIN rbac_roles r ON ur.role_id = r.id
JOIN rbac_permissions p ON r.id = p.role_id
JOIN rbac_routes rt ON p.route_id = rt.id
JOIN rbac_actions a ON p.action_id = a.id
WHERE COALESCE(ur.is_active, true) = true
AND COALESCE(p.is_active, true) = true
AND COALESCE(rt.is_active, true) = true
AND COALESCE(rt.is_menu_item, true) = true
AND a.name = 'view'
AND COALESCE(r.status, 'active') = 'active'
AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP);

-- Create permission checking functions
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

-- Create route access checking function
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

-- Set some default icons and sort orders
UPDATE rbac_routes SET icon = 
    CASE 
        WHEN name LIKE '%dashboard%' THEN 'dashboard'
        WHEN name LIKE '%finance%' THEN 'dollar-sign'
        WHEN name LIKE '%inventory%' THEN 'package'
        WHEN name LIKE '%user%' THEN 'users'
        WHEN name LIKE '%role%' THEN 'shield'
        WHEN name LIKE '%setting%' THEN 'settings'
        WHEN name LIKE '%report%' THEN 'file-text'
        WHEN name LIKE '%transaction%' THEN 'credit-card'
        ELSE 'circle'
    END
WHERE icon IS NULL;

-- Set sort order based on common patterns
UPDATE rbac_routes SET sort_order = 
    CASE 
        WHEN name LIKE '%dashboard%' THEN 1
        WHEN name LIKE '%finance%' AND name NOT LIKE '%transaction%' THEN 2
        WHEN name LIKE '%transaction%' THEN 3
        WHEN name LIKE '%inventory%' THEN 4
        WHEN name LIKE '%user%' THEN 5
        WHEN name LIKE '%role%' THEN 6
        WHEN name LIKE '%setting%' THEN 7
        ELSE 8
    END
WHERE sort_order = 0;

-- Show results
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM users) as users,
    (SELECT COUNT(*) FROM rbac_roles) as roles,
    (SELECT COUNT(*) FROM rbac_routes) as routes,
    (SELECT COUNT(*) FROM rbac_actions) as actions,
    (SELECT COUNT(*) FROM rbac_permissions) as permissions,
    (SELECT COUNT(*) FROM rbac_user_roles) as user_roles;
