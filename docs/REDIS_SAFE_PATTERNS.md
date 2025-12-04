# Redis Safe Patterns & Keys

> Copyable patterns and examples for all Redis use cases in BISMAN ERP.

## Quick Reference

| Use Case | Key Pattern | Data Type | TTL |
|----------|-------------|-----------|-----|
| Session | `session:{session_id}` | HASH/JSON | 1 hour |
| User Permissions | `perm:user:{userId}` | JSON | 60s-5m |
| Role Permissions | `perm:role:{roleId}` | JSON | 5m |
| Rate Limiting | `rate:{ip}:{endpoint}` | INT | window sec |
| Distributed Lock | `lock:{resource}:{id}` | STRING | 30s |

## 1. Session Store

### Key Pattern
```
session:{session_id} → JSON { userId, tenantId, expiresAt, ... }
session:user:{userId} → SET of session_ids (for invalidation)
```

### Usage
```javascript
const { sessionCache } = require('./cache');

// Store session
await sessionCache.setSession(tokenHash, {
  user_id: 123,
  tenant_id: 'tenant-uuid',
  role: 'HUB_INCHARGE',
  expires_at: new Date(Date.now() + 3600000).toISOString()
});

// Get session (with DB fallback)
const session = await sessionCache.getSessionWithFallback(token);
// { user_id: 123, ..., source: 'cache' | 'database' }

// Invalidate on logout
await sessionCache.invalidateSession(tokenHash);

// Invalidate all user sessions (password change, role revoke)
await sessionCache.invalidateUserSessions(userId);
```

---

## 2. Permission Cache

### Key Pattern
```
perm:user:{userId} → JSON (permissions snapshot)    TTL = 60s-5m
perm:role:{roleId} → JSON (role permission set)     TTL = 5m
```

### Usage
```javascript
const { permissionCache } = require('./cache');

// Check if user has module access
const hasAccess = await permissionCache.hasModulePermission(userId, 'INVENTORY');

// Check page permission
const canEdit = await permissionCache.hasPagePermission(userId, 'inventory-items', 'edit');

// Get all permissions (with DB fallback)
const perms = await permissionCache.getUserPermissionsWithFallback(userId, 'SUPER_ADMIN');

// Invalidate on role/permission change
await permissionCache.invalidateUserPermissions(userId);
await permissionCache.invalidateRolePermissions(roleId);
```

---

## 3. Rate Limiting

### Key Pattern
```
rate:{ip}:{endpoint} → INT  (expire = window seconds)
```

### Usage
```javascript
const { rateLimiter } = require('./cache');

// Manual check
const result = await rateLimiter.checkLimit('192.168.1.1', '/api/auth/login');
// { allowed: true, remaining: 4, resetIn: 55, total: 1, limit: 5 }

// Express middleware
const router = require('express').Router();

// Pre-configured limiters
router.post('/login', rateLimiter.authLimiter, authController.login);
router.post('/register', rateLimiter.strictLimiter, authController.register);

// Custom limiter
const customLimiter = rateLimiter.createLimiter({ max: 10, windowSec: 30 });
router.get('/search', customLimiter, searchController.search);

// Reset limits (after CAPTCHA success)
await rateLimiter.resetAllLimitsForIp('192.168.1.1');
```

### Default Limits
```javascript
'/api/auth/login': { max: 5, windowSec: 60 },       // 5/min
'/api/auth/register': { max: 3, windowSec: 60 },    // 3/min
'/api/otp/send': { max: 3, windowSec: 60 },         // 3/min
'/api/payments': { max: 30, windowSec: 60 },        // 30/min
default: { max: 100, windowSec: 60 }                // 100/min
```

---

## 4. Distributed Locks

### Key Pattern
```
lock:{resource}:{id} → string (owner service)  TTL = 30s
```

### Usage
```javascript
const { distributedLock } = require('./cache');

// Acquire lock
const lock = await distributedLock.acquire('payment', paymentId);
if (!lock.acquired) {
  throw new Error(`Payment locked by: ${lock.heldBy}`);
}

try {
  // ... process payment ...
} finally {
  await distributedLock.release('payment', paymentId, lock.owner);
}

// Or use withLock helper (auto-release)
const { result } = await distributedLock.withLock('approval', approvalId, async () => {
  return await processApproval(approvalId);
});

// Specialized locks
const taskLock = await distributedLock.acquireTaskLock(taskId);
const approvalLock = await distributedLock.acquireApprovalLock(approvalId);
const paymentLock = await distributedLock.acquirePaymentLock(paymentId);

// Extend lock for long operations
await distributedLock.extend('payment', paymentId, lock.owner, 60);

// Check lock status
const status = await distributedLock.isLocked('payment', paymentId);
// { locked: true, owner: 'node1:1234:abc123', ttl: 25 }

// Mutex for critical sections
await distributedLock.mutex('daily-report', async () => {
  await generateDailyReport();
});
```

---

## 5. PUB/SUB Invalidation

### Channels
```
permissions:invalidate - Role/permission changes
sessions:invalidate    - Session invalidations
cache:invalidate       - General cache invalidations
```

### Usage
```javascript
const { pubsub } = require('./cache');

// Subscribe on app startup
await pubsub.subscribe();

// Publish invalidation (broadcasts to all app nodes)
await pubsub.publishPermissionInvalidation({ 
  type: 'role', 
  roleId: 12 
});

await pubsub.publishSessionInvalidation({ 
  type: 'user', 
  userId: 123 
});

await pubsub.publishCacheInvalidation({ 
  keys: ['dash:stats:2024-01', 'report:sales:123'] 
});

// Or use convenience functions
await pubsub.invalidateUserPermissions(userId);
await pubsub.invalidateRolePermissions(roleId);
await pubsub.invalidateSession(sessionId);
await pubsub.invalidateUserSessions(userId);
await pubsub.invalidateKeys(['key1', 'key2']);
await pubsub.invalidatePattern('dash:*');

// Register custom handler
pubsub.onMessage('permissions:invalidate', async (data) => {
  console.log('Permission changed:', data);
  // Custom logic
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await pubsub.shutdown();
});
```

---

## 6. Key Builders

```javascript
const { sessionKey, permUserKey, permRoleKey, rateKey, lockKey } = require('./cache');

sessionKey('abc123')                    // 'session:abc123'
permUserKey(123)                        // 'perm:user:123'
permRoleKey(5)                          // 'perm:role:5'
rateKey('1.2.3.4', '/api/auth/login')   // 'rate:1.2.3.4:_api_auth_login'
lockKey('task', 99)                     // 'lock:task:99'
```

---

## 7. Best Practices

### ✅ DO

```javascript
// Always use short TTLs
await redis.setex(key, 300, value);  // 5 minutes

// Use explicit invalidation
await pubsub.invalidateUserPermissions(userId);

// Fail-open on Redis errors
if (!cache.isEnabled()) {
  return fetchFromDatabase();
}

// Use atomic operations for locks
await redis.set(key, owner, 'EX', 30, 'NX');

// Include source tracking
const session = await getSessionWithFallback(token);
console.log(`Session from: ${session.source}`);  // 'cache' or 'database'
```

### ❌ DON'T

```javascript
// Never cache forever
await redis.set(key, value);  // BAD - no TTL

// Don't rely solely on TTL for invalidation
// Always invalidate on data change

// Don't use DEL for locks without owner check
await redis.del(lockKey);  // BAD - could release someone else's lock

// Don't ignore cache failures
const data = await redis.get(key);
return data || null;  // BAD - should fallback to DB
```

---

## 8. Integration Example

```javascript
// middleware/auth.js
const { getSessionWithFallback, rateLimiter, pubsub } = require('../cache');

// Initialize on app start
pubsub.subscribe();

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const session = await getSessionWithFallback(token);
  
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  req.user = session.user;
  req.sessionSource = session.source;  // 'cache' or 'database'
  next();
};

// routes/auth.js
router.post('/login', rateLimiter.authLimiter, async (req, res) => {
  // ... login logic
});

router.post('/logout', authMiddleware, async (req, res) => {
  await invalidateSession(req.sessionHash);
  res.json({ success: true });
});

// services/roleService.js
async function updateRolePermissions(roleId, permissions) {
  await prisma.role.update({ where: { id: roleId }, data: { permissions } });
  
  // Invalidate all affected caches across all nodes
  await pubsub.invalidateRolePermissions(roleId);
  
  // Get all users with this role and invalidate their permission caches
  const users = await prisma.user.findMany({ where: { role_id: roleId } });
  for (const user of users) {
    await pubsub.invalidateUserPermissions(user.id);
  }
}
```

---

## 9. Monitoring

```javascript
// Check Redis health
const { ping } = require('./cache');
const health = await ping();
// { pong: 'PONG', ms: 2, enabled: true }

// Get rate limit status for IP
const status = await rateLimiter.getIpStatus('192.168.1.1');
// { '/api/auth/login': { current: 3, limit: 5, resetIn: 45 } }

// Check lock status
const lockStatus = await distributedLock.isLocked('payment', paymentId);
// { locked: true, owner: 'node1:1234:abc', ttl: 25 }
```

---

## Files Created

| File | Purpose |
|------|---------|
| `cache/namespaces.js` | Key patterns & builders |
| `cache/services/sessionCache.js` | Session management |
| `cache/services/permissionCache.js` | Permission caching |
| `cache/services/rateLimiter.js` | Rate limiting |
| `cache/services/distributedLock.js` | Distributed locks |
| `cache/services/pubsub.js` | PUB/SUB invalidation |
| `cache/index.js` | Unified exports |
