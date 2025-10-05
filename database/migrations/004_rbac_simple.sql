-- RBAC Schema - Simple Version for Existing Database
-- This creates the minimal RBAC tables needed for the system

-- Create actions table
CREATE TABLE IF NOT EXISTS actions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create routes table  
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    path VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    method VARCHAR(10) DEFAULT 'GET',
    module VARCHAR(50),
    is_protected BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(path, method)
);

-- Create permissions table (role + action + route)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    action_id INTEGER REFERENCES actions(id) ON DELETE CASCADE,
    route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, action_id, route_id)
);

-- Create user_roles table (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, role_id)
);

-- Insert default actions
INSERT INTO actions (name, description) VALUES 
('create', 'Create new resources'),
('read', 'View and read resources'), 
('update', 'Modify existing resources'),
('delete', 'Remove resources'),
('admin', 'Administrative access')
ON CONFLICT (name) DO NOTHING;

-- Insert default routes
INSERT INTO routes (path, name, description, method, module, is_protected) VALUES
('/api/auth/login', 'User Login', 'Authenticate user', 'POST', 'Authentication', false),
('/api/auth/logout', 'User Logout', 'End user session', 'POST', 'Authentication', true),
('/api/users', 'List Users', 'Get all users', 'GET', 'Users', true),
('/api/users/:id', 'Get User', 'Get user by ID', 'GET', 'Users', true),
('/api/users', 'Create User', 'Create new user', 'POST', 'Users', true),
('/api/users/:id', 'Update User', 'Update user', 'PUT', 'Users', true),
('/api/users/:id', 'Delete User', 'Delete user', 'DELETE', 'Users', true),
('/api/rbac/roles', 'List Roles', 'Get all roles', 'GET', 'RBAC', true),
('/api/rbac/permissions', 'List Permissions', 'Get permissions', 'GET', 'RBAC', true),
('/api/admin/dashboard', 'Admin Dashboard', 'Admin control panel', 'GET', 'Admin', true)
ON CONFLICT (path, method) DO NOTHING;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param INTEGER)
RETURNS TABLE(
    route_path VARCHAR,
    route_method VARCHAR,
    action_name VARCHAR,
    granted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.path as route_path,
        r.method as route_method,
        a.name as action_name,
        p.granted
    FROM permissions p
    JOIN roles role ON p.role_id = role.id
    JOIN user_roles ur ON ur.role_id = role.id
    JOIN routes r ON p.route_id = r.id
    JOIN actions a ON p.action_id = a.id
    WHERE ur.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_permissions_role_id ON permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_action_id ON permissions(action_id);
CREATE INDEX IF NOT EXISTS idx_permissions_route_id ON permissions(route_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Insert default permissions for existing ADMIN role
DO $$
DECLARE
    admin_role_id INTEGER;
    action_rec RECORD;
    route_rec RECORD;
BEGIN
    -- Get ADMIN role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'ADMIN' LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
        -- Grant all permissions to ADMIN role
        FOR action_rec IN SELECT id FROM actions LOOP
            FOR route_rec IN SELECT id FROM routes LOOP
                INSERT INTO permissions (role_id, action_id, route_id, granted)
                VALUES (admin_role_id, action_rec.id, route_rec.id, true)
                ON CONFLICT (role_id, action_id, route_id) DO UPDATE SET granted = true;
            END LOOP;
        END LOOP;
    END IF;
END $$;
