# RBAC Middleware & Bypass Detection

> Complete guide for enforcing role-based access control and detecting unauthorized access.

## Quick Start

```javascript
const { requirePermission, requireRole } = require('./middleware/rbacMiddleware');

// Protect routes
router.get('/items', authenticate, requirePermission('view', 'INVENTORY'), controller.list);
router.post('/items', authenticate, requirePermission('create', 'INVENTORY'), controller.create);
router.put('/items/:id', authenticate, requirePermission('edit', 'INVENTORY'), controller.update);
router.delete('/items/:id', authenticate, requirePermission('delete', 'INVENTORY'), controller.destroy);

// Role-based access
router.get('/admin', authenticate, requireRole('ENTERPRISE_ADMIN'), adminController.dashboard);
```

---

## 1. RBAC Middleware (`middleware/rbacMiddleware.js`)

### Permission Check Flow

```
Request → authenticate → requirePermission(action, route)
                              ↓
                    Check Redis cache (perm:user:{id})
                              ↓
                    Cache miss? → Query DB → Cache result (60s TTL)
                              ↓
                    Has permission? → next() : 403 Forbidden
```

### Available Middleware

| Middleware | Purpose | Example |
|------------|---------|---------|
| `requirePermission(action, route)` | Check specific permission | `requirePermission('edit', 'INVENTORY')` |
| `requireRole(roles)` | Check user role | `requireRole(['SUPER_ADMIN', 'ENTERPRISE_ADMIN'])` |
| `requireAnyPermission([...])` | User needs ANY of listed permissions | See below |
| `requireAllPermissions([...])` | User needs ALL listed permissions | See below |
| `revalidateOnWrite(action, route)` | Force fresh check on POST/PUT/DELETE | For sensitive writes |
| `attachPermissions` | Add user permissions to `req.permissions` | For frontend use |

### Usage Examples

```javascript
const { 
  requirePermission, 
  requireRole, 
  requireAnyPermission,
  requireAllPermissions,
  revalidateOnWrite,
  attachPermissions 
} = require('./middleware/rbacMiddleware');

// Basic permission check
router.get('/payments', 
  authenticate, 
  requirePermission('view', 'PAYMENTS'), 
  paymentController.list
);

// Multiple roles allowed
router.get('/reports', 
  authenticate, 
  requireRole(['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN']), 
  reportController.generate
);

// Any of these permissions grants access
router.get('/dashboard', 
  authenticate, 
  requireAnyPermission([
    { route: 'DASHBOARD', action: 'view' },
    { route: 'REPORTS', action: 'view' }
  ]), 
  dashboardController.index
);

// Must have ALL permissions
router.post('/bulk-approve', 
  authenticate, 
  requireAllPermissions([
    { route: 'PAYMENTS', action: 'edit' },
    { route: 'APPROVALS', action: 'create' }
  ]), 
  approvalController.bulkApprove
);

// Force fresh permission check on writes (bypass cache)
router.delete('/users/:id', 
  authenticate, 
  revalidateOnWrite('delete', 'USERS'), 
  userController.destroy
);

// Attach permissions for frontend to consume
router.get('/me', 
  authenticate, 
  attachPermissions, 
  (req, res) => {
    res.json({ 
      user: req.user, 
      permissions: req.permissions 
    });
  }
);
```

---

## 2. Permission Cache (Redis)

### Key Pattern
```
perm:user:{userId} → JSON { permissions: {...}, cachedAt: timestamp }
```

### TTL: 60 seconds (short for security)

### Invalidation

```javascript
const { invalidateUserPermissions, invalidateRolePermissions } = require('./middleware/rbacMiddleware');

// When a user's role changes
await invalidateUserPermissions(userId);

// When a role's permissions change (affects all users with that role)
await invalidateRolePermissions(roleId);

// Nuclear option - clear all permission caches
await invalidateAllPermissions();
```

### PUB/SUB Broadcast

Permission invalidations are broadcast to all app nodes:

```javascript
// Automatically happens when you call invalidateUserPermissions()
redis.publish('permissions:invalidate', JSON.stringify({ 
  type: 'user', 
  userId: 123 
}));

// Other nodes subscribe and clear their local cache
```

---

## 3. Bypass Detection

### Symptoms of Permission Bypass

| Symptom | Likely Cause |
|---------|--------------|
| Pages accessible without login | Missing `authenticate` middleware |
| Users see data they shouldn't | Missing `requirePermission` middleware |
| Stale permissions after role change | Cache not invalidated |
| Unknown DB users in pg_stat_activity | Leaked credentials or backdoor |
| Raw SQL in controllers/routes | Bypassing service layer |

### Detection Service

```javascript
const bypassDetection = require('./services/bypassDetection');

// Run full security scan
const results = await bypassDetection.runFullScan();
console.log(results.summary);
// {
//   unprotectedRoutes: 3,
//   rawSqlQueries: 15,
//   staleCacheEntries: 0,
//   suspiciousConnections: 0,
//   securityEvents24h: 12
// }
console.log(results.riskLevel); // 'LOW', 'MEDIUM', 'HIGH'

// Individual scans
await bypassDetection.scanUnprotectedRoutes();
await bypassDetection.scanRawSqlUsage();
await bypassDetection.checkStaleCacheEntries();
await bypassDetection.analyzeAuditLogs();
await bypassDetection.checkDatabaseConnections();
```

### API Endpoints

```bash
# Full security scan (Enterprise Admin only)
curl -X GET /api/security/scan \
  -H "Authorization: Bearer $TOKEN"

# Scan unprotected routes
curl -X GET /api/security/routes

# Scan raw SQL usage
curl -X GET /api/security/raw-sql

# Check cache status
curl -X GET /api/security/cache

# Analyze audit logs
curl -X GET /api/security/audit

# Check DB connections
curl -X GET /api/security/connections
```

---

## 4. SQL Queries for Detection

Located in: `database/scripts/bypass_detection_queries.sql`

### Key Queries

```sql
-- 1. Queries by DB user (detect non-app users)
SELECT db_user, COUNT(*) AS query_count
FROM audit_logs_dml
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY db_user
ORDER BY query_count DESC;

-- 2. Sensitive table access
SELECT table_name, action, db_user, COUNT(*) 
FROM audit_logs_dml
WHERE table_name IN ('super_admins', 'payment_requests', 'rbac_permissions')
GROUP BY table_name, action, db_user;

-- 3. Active DB connections (flag suspicious)
SELECT pid, usename, application_name, client_addr
FROM pg_stat_activity
WHERE datname = current_database()
  AND (application_name = '' OR usename NOT LIKE 'bisman_%');

-- 4. Permission denials (users hitting 403)
SELECT user_id, COUNT(*) AS denied_count
FROM security_events
WHERE event_type = 'PERMISSION_DENIED'
GROUP BY user_id
HAVING COUNT(*) > 5;

-- 5. Cross-tenant access attempts
SELECT a.user_id, a.table_name, a.new_data->>'tenant_id' AS accessed_tenant
FROM audit_logs_dml a
JOIN users_enhanced u ON a.user_id = u.id
WHERE a.new_data->>'tenant_id' != u.tenant_id::text;
```

---

## 5. Immediate Security Checks

### 1. Find Routes Without Protection

```bash
# Search for routes without middleware
grep -rn "router\.\(get\|post\|put\|delete\)" routes/ | \
  grep -v "requirePermission\|requireRole\|authenticate"
```

### 2. Find Raw SQL in Controllers

```bash
grep -rn "\$queryRaw\|\.query(" controllers/ routes/
```

### 3. Check Redis Cache TTLs

```javascript
const redis = require('./cache/redisClient');
const keys = await redis.keys('perm:user:*');
for (const key of keys) {
  const ttl = await redis.ttl(key);
  if (ttl > 300) console.log('STALE:', key, ttl);
}
```

### 4. Monitor DB Connections

```sql
SELECT usename, application_name, client_addr, COUNT(*)
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY usename, application_name, client_addr;
```

---

## 6. Best Practices

### ✅ DO

```javascript
// Always use middleware on routes
router.post('/payments', authenticate, requirePermission('create', 'PAYMENTS'), ...);

// Invalidate cache on role/permission changes
await roleService.updateRole(roleId, data);
await invalidateRolePermissions(roleId);

// Use revalidateOnWrite for sensitive operations
router.delete('/users/:id', authenticate, revalidateOnWrite('delete', 'USERS'), ...);

// Log permission denials
console.warn(`Access denied: user=${userId} route=${route} action=${action}`);
```

### ❌ DON'T

```javascript
// Unprotected route
router.get('/sensitive-data', controller.getData); // BAD

// Client-side only checks
if (user.role === 'admin') { showButton(); } // BAD - no server check

// Cache forever
redis.set(permKey, JSON.stringify(perms)); // BAD - no TTL

// Skip cache invalidation
await prisma.rbac_user_roles.update(...); // BAD - cache stale
```

---

## 7. Files Created

| File | Purpose |
|------|---------|
| `middleware/rbacMiddleware.js` | Core RBAC enforcement middleware |
| `services/bypassDetection.js` | Security scanning service |
| `routes/security.js` | Security scan API endpoints |
| `database/scripts/bypass_detection_queries.sql` | SQL queries for audit analysis |

---

## 8. Integration Checklist

- [ ] Add `authenticate` middleware to all protected routes
- [ ] Add `requirePermission(action, route)` after authenticate
- [ ] Call `invalidateUserPermissions(userId)` when user's role changes
- [ ] Call `invalidateRolePermissions(roleId)` when role permissions change
- [ ] Subscribe to PUB/SUB on app startup: `pubsub.subscribe()`
- [ ] Run security scan weekly: `GET /api/security/scan`
- [ ] Review audit logs for suspicious patterns
- [ ] Rotate DB credentials if unexpected connections found
