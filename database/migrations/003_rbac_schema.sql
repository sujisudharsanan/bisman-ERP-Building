-- RBAC Schema Migration
-- Creates comprehensive role-based access control tables

BEGIN;

-- Create actions table for CRUD operations
CREATE TABLE IF NOT EXISTS actions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create routes table for frontend routes
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  path VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  module VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create permissions table for role-route-action mapping
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL,
  route_id INTEGER NOT NULL,
  action_id INTEGER NOT NULL,
  is_granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (action_id) REFERENCES actions(id) ON DELETE CASCADE,
  UNIQUE(role_id, route_id, action_id)
);

-- Create user_roles table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  assigned_by INTEGER,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  UNIQUE(user_id, role_id)
);

-- Create role_inheritance table for role hierarchy
CREATE TABLE IF NOT EXISTS role_inheritance (
  id SERIAL PRIMARY KEY,
  parent_role_id INTEGER NOT NULL,
  child_role_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (child_role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(parent_role_id, child_role_id)
);

-- Add audit columns to existing tables
ALTER TABLE roles ADD COLUMN IF NOT EXISTS slug VARCHAR(50) UNIQUE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Insert default actions
INSERT INTO actions (name, description) VALUES 
  ('VIEW', 'View/Read access to resources'),
  ('CREATE', 'Create new resources'),
  ('EDIT', 'Edit/Update existing resources'),
  ('DELETE', 'Delete existing resources'),
  ('ASSIGN', 'Assign roles or permissions')
ON CONFLICT (name) DO NOTHING;

-- Insert default roles with slugs
INSERT INTO roles (name, slug, description) VALUES 
  ('ADMIN', 'admin', 'System Administrator with full access'),
  ('MANAGER', 'manager', 'Manager with elevated permissions'),
  ('STAFF', 'staff', 'Staff with standard permissions'),
  ('USER', 'user', 'Basic user with limited permissions')
ON CONFLICT (name) DO NOTHING;

-- Update existing roles to have slugs
UPDATE roles SET slug = LOWER(name) WHERE slug IS NULL;

-- Insert default routes
INSERT INTO routes (path, name, module, description) VALUES 
  ('/dashboard', 'Dashboard', 'Core', 'Main dashboard page'),
  ('/admin', 'Admin Panel', 'Admin', 'Administration panel'),
  ('/admin/users', 'User Management', 'Admin', 'Manage system users'),
  ('/admin/roles', 'Role Management', 'Admin', 'Manage user roles'),
  ('/admin/permissions', 'Permission Management', 'Admin', 'Manage permissions'),
  ('/hub-incharge', 'Hub Incharge', 'Operations', 'Hub incharge dashboard'),
  ('/reports', 'Reports', 'Reports', 'System reports'),
  ('/settings', 'Settings', 'Core', 'System settings')
ON CONFLICT (path) DO NOTHING;

-- Grant full permissions to admin role
INSERT INTO permissions (role_id, route_id, action_id)
SELECT 
  r.id as role_id,
  rt.id as route_id,
  a.id as action_id
FROM roles r
CROSS JOIN routes rt
CROSS JOIN actions a
WHERE r.slug = 'admin'
ON CONFLICT (role_id, route_id, action_id) DO NOTHING;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_permissions_role_id ON permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_route_id ON permissions(route_id);
CREATE INDEX IF NOT EXISTS idx_permissions_action_id ON permissions(action_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_routes_module ON routes(module);
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON routes(is_active);

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param INTEGER)
RETURNS TABLE(
  route_path VARCHAR(255),
  route_name VARCHAR(100),
  action_name VARCHAR(50),
  is_granted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.path,
    rt.name,
    a.name,
    p.is_granted
  FROM user_roles ur
  JOIN permissions p ON ur.role_id = p.role_id
  JOIN routes rt ON p.route_id = rt.id
  JOIN actions a ON p.action_id = a.id
  WHERE ur.user_id = user_id_param 
    AND ur.is_active = true 
    AND rt.is_active = true;
END;
$$ LANGUAGE plpgsql;

COMMIT;
