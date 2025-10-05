-- Migration Script: Assign existing users to RBAC roles
-- This script maps existing user roles to the new RBAC system

-- Step 1: Map existing users to RBAC roles
INSERT INTO rbac_user_roles (user_id, role_id, assigned_at, assigned_by)
SELECT 
  u.id as user_id,
  CASE 
    WHEN u.role = 'super_admin' THEN (SELECT id FROM rbac_roles WHERE name = 'ADMIN')
    WHEN u.role = 'ADMIN' THEN (SELECT id FROM rbac_roles WHERE name = 'ADMIN')
    WHEN u.role = 'MANAGER' THEN (SELECT id FROM rbac_roles WHERE name = 'MANAGER')
    WHEN u.role = 'STAFF' THEN (SELECT id FROM rbac_roles WHERE name = 'STAFF')
    ELSE (SELECT id FROM rbac_roles WHERE name = 'USER')
  END as role_id,
  NOW() as assigned_at,
  1 as assigned_by -- Assigned by system (user ID 1)
FROM users u
WHERE u.id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Step 2: Grant appropriate permissions based on role hierarchy

-- MANAGER Role - Grant read/update permissions for most routes
INSERT INTO rbac_permissions (role_id, action_id, route_id, granted, updated_at)
SELECT 
  (SELECT id FROM rbac_roles WHERE name = 'MANAGER') as role_id,
  a.id as action_id,
  r.id as route_id,
  CASE 
    WHEN a.name IN ('read', 'update') THEN true
    WHEN a.name = 'create' AND r.module IN ('Users', 'RBAC') THEN false -- No user/rbac creation
    WHEN a.name = 'delete' THEN false -- No delete permissions
    WHEN a.name = 'admin' THEN false -- No admin permissions
    WHEN a.name = 'manage' AND r.module NOT IN ('Admin') THEN true -- Management except admin
    ELSE false
  END as granted,
  NOW() as updated_at
FROM rbac_actions a
CROSS JOIN rbac_routes r
WHERE (SELECT id FROM rbac_roles WHERE name = 'MANAGER') IS NOT NULL
ON CONFLICT (role_id, action_id, route_id) 
DO UPDATE SET granted = EXCLUDED.granted, updated_at = NOW();

-- STAFF Role - Grant read permissions and limited updates
INSERT INTO rbac_permissions (role_id, action_id, route_id, granted, updated_at)
SELECT 
  (SELECT id FROM rbac_roles WHERE name = 'STAFF') as role_id,
  a.id as action_id,
  r.id as route_id,
  CASE 
    WHEN a.name = 'read' THEN true
    WHEN a.name = 'update' AND r.module = 'Users' AND r.path LIKE '%/:id' THEN true -- Can update own profile
    WHEN a.name IN ('create', 'delete', 'admin', 'manage') THEN false
    ELSE false
  END as granted,
  NOW() as updated_at
FROM rbac_actions a
CROSS JOIN rbac_routes r
WHERE (SELECT id FROM rbac_roles WHERE name = 'STAFF') IS NOT NULL
ON CONFLICT (role_id, action_id, route_id) 
DO UPDATE SET granted = EXCLUDED.granted, updated_at = NOW();

-- USER Role - Grant minimal read permissions
INSERT INTO rbac_permissions (role_id, action_id, route_id, granted, updated_at)
SELECT 
  (SELECT id FROM rbac_roles WHERE name = 'USER') as role_id,
  a.id as action_id,
  r.id as route_id,
  CASE 
    WHEN a.name = 'read' AND r.module = 'Authentication' THEN true
    WHEN a.name = 'read' AND r.path LIKE '%/:id' AND r.module = 'Users' THEN true -- Can read own profile
    WHEN a.name IN ('create', 'update', 'delete', 'admin', 'manage') THEN false
    ELSE false
  END as granted,
  NOW() as updated_at
FROM rbac_actions a
CROSS JOIN rbac_routes r
WHERE (SELECT id FROM rbac_roles WHERE name = 'USER') IS NOT NULL
ON CONFLICT (role_id, action_id, route_id) 
DO UPDATE SET granted = EXCLUDED.granted, updated_at = NOW();

-- Step 3: Display migration results
SELECT 
  'User Role Assignments' as migration_step,
  COUNT(*) as records_created
FROM rbac_user_roles;

-- Show current user-role mappings
SELECT 
  u.id,
  u.username,
  u.email,
  u.role as old_role,
  r.name as new_rbac_role,
  ur.assigned_at
FROM users u
LEFT JOIN rbac_user_roles ur ON u.id = ur.user_id
LEFT JOIN rbac_roles r ON ur.role_id = r.id
ORDER BY u.id;
