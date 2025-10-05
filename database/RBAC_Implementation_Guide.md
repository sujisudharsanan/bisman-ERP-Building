# RBAC Database Schema Documentation

## Overview

This RBAC (Role-Based Access Control) database schema follows international best practices for access control systems. It provides a flexible, scalable, and secure foundation for managing user permissions in enterprise applications.

## Key Features

- **Hierarchical Roles**: Support for role inheritance and hierarchy
- **Granular Permissions**: Route + Action based permission system
- **Audit Trail**: Comprehensive logging of all operations
- **Session Management**: Secure session tracking
- **Temporal Access**: Support for time-based role assignments
- **Scalable Design**: Easy to extend with new routes, actions, and roles

## Database Schema Architecture

### Core Tables

#### 1. **users** - User Management
```sql
-- Stores all system users with authentication info
id, username, email, password_hash, first_name, last_name, 
phone, status, email_verified_at, last_login_at, 
failed_login_attempts, locked_until, created_at, updated_at
```

**Key Features:**
- Unique email and username constraints
- Account lockout mechanism
- Password policy enforcement
- User status management (active, inactive, suspended, pending)

#### 2. **roles** - Role Definition
```sql
-- Defines system roles with hierarchical support
id, name, display_name, description, parent_role_id, level, 
status, is_default, created_at, updated_at
```

**Key Features:**
- Hierarchical role structure
- Default role assignment
- Role status management
- Level-based hierarchy (1=highest privilege)

#### 3. **routes** - Application Routes
```sql
-- All application routes/endpoints for permission control
id, path, name, display_name, description, type, method, 
module, parent_route_id, sort_order, is_menu_item, icon, 
is_active, created_at, updated_at
```

**Key Features:**
- Support for frontend and backend routes
- Hierarchical route structure
- Menu generation support
- Module-based organization

#### 4. **actions** - Available Actions
```sql
-- Defines what actions can be performed
id, name, display_name, description, is_active, created_at, updated_at
```

**Standard Actions:**
- `view` - Read/view access
- `create` - Create new records
- `edit` - Modify existing records
- `delete` - Delete records
- `export` - Export data
- `import` - Import data
- `approve` - Approve requests
- `reject` - Reject requests

#### 5. **permissions** - Granular Permissions
```sql
-- Links routes and actions for granular control
id, route_id, action_id, name, display_name, description, 
is_active, created_at, updated_at
```

**Permission Naming Convention:**
- Format: `{route_name}.{action_name}`
- Example: `finance.transactions.view`, `users.create`

#### 6. **role_permissions** - Role-Permission Mapping
```sql
-- Many-to-many relationship between roles and permissions
id, role_id, permission_id, granted_at, granted_by, is_active
```

#### 7. **user_roles** - User-Role Assignment
```sql
-- Many-to-many relationship between users and roles
id, user_id, role_id, assigned_at, assigned_by, expires_at, is_active
```

**Key Features:**
- Temporary role assignments with expiration
- Assignment tracking (who assigned what when)
- Multiple roles per user support

### Audit and Security Tables

#### 8. **user_sessions** - Session Management
```sql
-- Track active user sessions
id, user_id, session_token, ip_address, user_agent, 
created_at, expires_at, last_activity_at, is_active
```

#### 9. **audit_logs** - Comprehensive Audit Trail
```sql
-- Complete audit trail for all operations
id, user_id, action, table_name, record_id, old_values, 
new_values, ip_address, user_agent, session_id, created_at
```

## Permission Checking Examples

### 1. Check Specific Permission
```sql
-- Check if user has a specific permission
SELECT check_user_permission(123, 'finance.transactions.view');
```

### 2. Check Route Access
```sql
-- Check if user can perform action on route
SELECT check_user_route_access(123, '/finance/transactions', 'create');
```

### 3. Get User's Menu Items
```sql
-- Get all menu items accessible to user
SELECT * FROM user_menu_view WHERE user_id = 123 ORDER BY sort_order;
```

### 4. Get All User Permissions
```sql
-- Get comprehensive permission list for user
SELECT permission_name, route_path, action_name, role_name
FROM user_permissions_view 
WHERE user_id = 123
ORDER BY route_path, action_name;
```

## Implementation Guidelines

### Backend Implementation

#### Middleware for Route Protection
```javascript
// Express.js middleware example
function requirePermission(permissionName) {
    return async (req, res, next) => {
        const userId = req.user.id;
        const hasPermission = await checkUserPermission(userId, permissionName);
        
        if (!hasPermission) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        next();
    };
}

// Usage
app.get('/api/finance/transactions', 
    authenticate, 
    requirePermission('finance.transactions.view'), 
    getTransactions
);
```

#### Dynamic Route Checking
```javascript
function requireRouteAccess(action = 'view') {
    return async (req, res, next) => {
        const userId = req.user.id;
        const routePath = req.route.path;
        const hasAccess = await checkUserRouteAccess(userId, routePath, action);
        
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        next();
    };
}
```

### Frontend Implementation

#### Permission-Based Component Rendering
```jsx
// React component example
function PermissionGate({ permission, children, fallback = null }) {
    const { user } = useAuth();
    const [hasPermission, setHasPermission] = useState(false);
    
    useEffect(() => {
        checkPermission(user.id, permission)
            .then(setHasPermission);
    }, [user.id, permission]);
    
    return hasPermission ? children : fallback;
}

// Usage
<PermissionGate permission="finance.transactions.create">
    <CreateTransactionButton />
</PermissionGate>
```

#### Menu Generation
```jsx
function NavigationMenu() {
    const { user } = useAuth();
    const [menuItems, setMenuItems] = useState([]);
    
    useEffect(() => {
        getUserMenuItems(user.id)
            .then(setMenuItems);
    }, [user.id]);
    
    return (
        <nav>
            {menuItems.map(item => (
                <NavLink key={item.path} to={item.path}>
                    <Icon name={item.icon} />
                    {item.display_name}
                </NavLink>
            ))}
        </nav>
    );
}
```

## Migration from Existing System

### Step 1: Data Migration
```sql
-- Migrate existing users
INSERT INTO users (username, email, password_hash, status, created_at)
SELECT username, email, password, 'active', created_at
FROM old_users_table;

-- Migrate existing roles
INSERT INTO roles (name, display_name, status, created_at)
SELECT role_name, role_display_name, 'active', created_at
FROM old_roles_table;
```

### Step 2: Permission Mapping
```sql
-- Create permissions for existing routes
INSERT INTO permissions (route_id, action_id, name, display_name)
SELECT r.id, a.id, CONCAT(r.name, '.', a.name), CONCAT(r.display_name, ' - ', a.display_name)
FROM routes r
CROSS JOIN actions a
WHERE r.is_active = true AND a.is_active = true;
```

### Step 3: Role Assignment
```sql
-- Assign users to roles based on existing system
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, CURRENT_TIMESTAMP
FROM users u
JOIN old_user_roles our ON u.email = our.user_email
JOIN roles r ON r.name = our.role_name;
```

## Security Best Practices

### 1. Input Validation
- Use parameterized queries
- Validate all user inputs
- Sanitize data before storage

### 2. Password Security
- Use bcrypt for password hashing
- Enforce strong password policies
- Implement account lockout mechanisms

### 3. Session Management
- Use secure session tokens
- Implement session expiration
- Track session activity

### 4. Audit Requirements
- Log all permission changes
- Track user access patterns
- Monitor failed access attempts

### 5. Database Security
- Enable Row Level Security (RLS) where appropriate
- Use least privilege principle
- Regular security audits

## Performance Optimization

### 1. Database Indexes
All critical columns are indexed for optimal query performance:
- User lookup indexes (email, username)
- Permission checking indexes
- Audit log indexes for reporting

### 2. Caching Strategy
```javascript
// Cache user permissions for session duration
const userPermissionsCache = new Map();

async function getUserPermissions(userId) {
    if (userPermissionsCache.has(userId)) {
        return userPermissionsCache.get(userId);
    }
    
    const permissions = await queryUserPermissions(userId);
    userPermissionsCache.set(userId, permissions);
    
    // Set cache expiration
    setTimeout(() => {
        userPermissionsCache.delete(userId);
    }, 300000); // 5 minutes
    
    return permissions;
}
```

### 3. Bulk Permission Checking
```sql
-- Check multiple permissions at once
SELECT permission_name, 
       EXISTS (
           SELECT 1 FROM user_permissions_view 
           WHERE user_id = $1 AND permission_name = p.permission_name
       ) as has_permission
FROM (VALUES 
    ('finance.view'),
    ('finance.create'),
    ('finance.edit')
) as p(permission_name);
```

## Maintenance and Administration

### 1. Regular Cleanup
```sql
-- Clean expired sessions
DELETE FROM user_sessions 
WHERE expires_at < CURRENT_TIMESTAMP AND is_active = false;

-- Archive old audit logs
INSERT INTO audit_logs_archive 
SELECT * FROM audit_logs 
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
```

### 2. Permission Analysis
```sql
-- Find unused permissions
SELECT p.name
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.permission_id IS NULL;

-- Find users without roles
SELECT u.username, u.email
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL AND u.status = 'active';
```

### 3. Security Reports
```sql
-- Users with administrative access
SELECT u.username, u.email, r.name as role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name IN ('super_admin', 'admin')
AND ur.is_active = true
AND u.status = 'active';
```

## Troubleshooting

### Common Issues

1. **Permission Not Working**
   - Check if user has active role assignment
   - Verify permission is active
   - Check role hierarchy

2. **Performance Issues**
   - Review database indexes
   - Check for N+1 query problems
   - Implement permission caching

3. **Audit Log Growth**
   - Implement log rotation
   - Archive old logs
   - Consider log retention policies

### Debug Queries

```sql
-- Debug user permissions
SELECT 
    u.username,
    r.name as role,
    p.name as permission,
    ur.is_active as role_active,
    rp.is_active as permission_active,
    ur.expires_at
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.id = $user_id;
```

This RBAC system provides a solid foundation for enterprise-level access control with room for customization and extension based on specific requirements.
