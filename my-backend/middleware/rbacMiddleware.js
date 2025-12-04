/**
 * RBAC Middleware - Role-Based Access Control with Redis Caching
 * 
 * Production-ready middleware for enforcing permissions on every route.
 * Uses Redis cache with DB fallback and proper invalidation.
 * 
 * Key pattern: perm:user:{userId} → JSON permissions map
 * 
 * Features:
 * - Redis-cached permissions with 60s TTL
 * - DB fallback (rbac_user_roles + rbac_permissions join)
 * - PUB/SUB invalidation on permissions:invalidate channel
 * - Fail-open if Redis unavailable (security-first DB check)
 * 
 * @module middleware/rbacMiddleware
 * 
 * @example
 * // Route usage
 * router.post('/finance/invoice', requirePermission('create', 'module:finance'), createInvoice);
 * router.get('/inventory/items', requirePermission('view', 'INVENTORY'), listItems);
 */

const { getPrisma } = require('../lib/prisma');
const { permissionCache, pubsub, permUserKey, permRoleKey } = require('../cache');
const { redis, isEnabled: isRedisEnabled, subscriber } = require('../cache/redisClient');

// TTL for permission cache (60 seconds - short for security)
const PERMISSION_TTL = 60;

// Cache for route definitions (longer TTL since routes rarely change)
const ROUTE_CACHE_TTL = 300;
let routeCache = null;
let routeCacheExpiry = 0;

// Track if PUB/SUB is initialized
let pubsubInitialized = false;

/**
 * Initialize PUB/SUB subscription for permission invalidation
 * Call this once on app startup
 */
async function initializePermissionSubscription() {
  if (pubsubInitialized) return;
  if (!isRedisEnabled()) {
    console.log('[rbacMiddleware] Redis disabled, skipping PUB/SUB subscription');
    return;
  }

  try {
    // Get subscriber instance from cache module
    const sub = subscriber || (await redis.duplicate());
    
    await sub.subscribe('permissions:invalidate');
    console.log('[rbacMiddleware] Subscribed to permissions:invalidate channel');

    sub.on('message', async (channel, message) => {
      if (channel !== 'permissions:invalidate') return;

      try {
        const payload = JSON.parse(message);
        console.log('[rbacMiddleware] Received invalidation:', payload);

        if (payload.type === 'user' && payload.userId) {
          // Invalidate specific user's cache
          await redis.del(permUserKey(payload.userId));
        } else if (payload.type === 'role' && payload.roleId) {
          // Invalidate role cache and all users with that role
          await redis.del(permRoleKey(payload.roleId));
          // Note: For complete invalidation, you'd need to track role->users mapping
        } else if (payload.type === 'all') {
          // Nuclear option: clear all permission caches (use SCAN for safety)
          let cursor = '0';
          do {
            const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'perm:*', 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) {
              await redis.del(...keys);
            }
          } while (cursor !== '0');
        }
      } catch (err) {
        console.error('[rbacMiddleware] PUB/SUB message error:', err);
      }
    });

    pubsubInitialized = true;
  } catch (err) {
    console.error('[rbacMiddleware] PUB/SUB subscription failed:', err);
  }
}

// Auto-initialize on module load (non-blocking)
setImmediate(() => {
  initializePermissionSubscription().catch(() => {});
});

/**
 * Get user permissions with Redis caching and DB fallback
 * Returns a map: { 'module:action': true, 'route:action': true, ... }
 */
async function getUserPermissions(userId, userType) {
  const cacheKey = permUserKey(userId);
  
  // Try Redis cache first
  if (isRedisEnabled()) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        return { permissions: data.permissions, source: 'cache', cachedAt: data.cachedAt };
      }
    } catch (err) {
      console.warn('[rbacMiddleware] Cache read error:', err.message);
    }
  }

  // Fetch from database
  const prisma = getPrisma();
  const permissions = {};

  try {
    // Enterprise Admin has all permissions
    if (userType === 'ENTERPRISE_ADMIN') {
      permissions['*:*'] = true;
      permissions._isAdmin = true;
      permissions._role = 'ENTERPRISE_ADMIN';
    } 
    // Super Admin - get from module assignments
    else if (userType === 'SUPER_ADMIN') {
      const moduleAssignments = await prisma.$queryRaw`
        SELECT m.module_name, ma.page_permissions
        FROM module_assignments ma
        JOIN modules m ON ma.module_id = m.id
        WHERE ma.super_admin_id = ${userId} AND ma.is_active = true
      `;

      permissions._role = 'SUPER_ADMIN';
      permissions._isAdmin = true;
      permissions._modules = [];

      for (const ma of moduleAssignments) {
        permissions._modules.push(ma.module_name);
        // Grant all actions on assigned modules
        permissions[`${ma.module_name}:*`] = true;
        permissions[`${ma.module_name}:view`] = true;
        permissions[`${ma.module_name}:create`] = true;
        permissions[`${ma.module_name}:edit`] = true;
        permissions[`${ma.module_name}:delete`] = true;
        
        // Page-level permissions if defined
        if (ma.page_permissions && Array.isArray(ma.page_permissions)) {
          for (const page of ma.page_permissions) {
            permissions[`${ma.module_name}:${page}:view`] = true;
          }
        }
      }
    }
    // Regular user - get from RBAC tables
    else {
      // Get user's role assignments and permissions
      const userPermissions = await prisma.$queryRaw`
        SELECT DISTINCT 
          r.name as role_name,
          rt.path as route_path,
          a.name as action_name,
          p.granted
        FROM rbac_user_roles ur
        JOIN rbac_roles r ON ur.role_id = r.id
        LEFT JOIN rbac_permissions p ON ur.role_id = p.role_id
        LEFT JOIN rbac_routes rt ON p.route_id = rt.id
        LEFT JOIN rbac_actions a ON p.action_id = a.id
        WHERE ur.user_id = ${userId}
          AND (r.status = 'active' OR r.is_active = true)
      `;

      // Also check users_enhanced table for legacy module assignments
      try {
        const userRecord = await prisma.$queryRaw`
          SELECT role, assigned_modules, page_permissions
          FROM users_enhanced
          WHERE id = ${userId}
        `;
        
        if (userRecord?.[0]) {
          permissions._role = userRecord[0].role;
          
          // Parse assigned modules
          const modules = userRecord[0].assigned_modules || [];
          if (Array.isArray(modules)) {
            permissions._modules = modules;
            for (const mod of modules) {
              permissions[`${mod}:view`] = true;
            }
          }

          // Parse page permissions
          const pagePerms = userRecord[0].page_permissions || {};
          if (typeof pagePerms === 'object') {
            for (const [page, actions] of Object.entries(pagePerms)) {
              if (Array.isArray(actions)) {
                for (const action of actions) {
                  permissions[`${page}:${action}`] = true;
                }
              }
            }
          }
        }
      } catch (e) {
        // users_enhanced might not exist
      }

      // Process RBAC permissions
      for (const perm of userPermissions) {
        if (perm.granted && perm.route_path && perm.action_name) {
          const key = `${perm.route_path}:${perm.action_name}`;
          permissions[key] = true;
        }
        if (perm.role_name) {
          permissions._role = perm.role_name;
        }
      }
    }

    // Cache the permissions
    if (isRedisEnabled()) {
      try {
        const cacheData = {
          permissions,
          cachedAt: Date.now()
        };
        await redis.setex(cacheKey, PERMISSION_TTL, JSON.stringify(cacheData));
      } catch (err) {
        console.warn('[rbacMiddleware] Cache write error:', err.message);
      }
    }

    return { permissions, source: 'database', cachedAt: Date.now() };
  } catch (error) {
    console.error('[rbacMiddleware] getUserPermissions error:', error);
    throw error;
  }
}

/**
 * Check if user has a specific permission
 */
function hasPermission(permissions, routeKey, action) {
  if (!permissions) return false;
  
  // Admin bypass
  if (permissions['*:*'] || permissions._isAdmin) {
    return true;
  }

  // Check exact match
  if (permissions[`${routeKey}:${action}`]) {
    return true;
  }

  // Check wildcard action for route
  if (permissions[`${routeKey}:*`]) {
    return true;
  }

  // Check module-level permission (e.g., INVENTORY:view)
  const parts = routeKey.split(':');
  if (parts.length > 1) {
    const module = parts[0];
    if (permissions[`${module}:*`] || permissions[`${module}:${action}`]) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware: Require specific permission on route
 * 
 * @param {string} action - Action to check (view, create, edit, delete)
 * @param {string} routeKey - Route/module key (e.g., 'INVENTORY', 'finance:payments')
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/items', requirePermission('view', 'INVENTORY'), controller.list);
 * router.post('/items', requirePermission('create', 'INVENTORY'), controller.create);
 */
function requirePermission(action, routeKey) {
  return async (req, res, next) => {
    try {
      // Must be authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.id;
      const userType = req.user.userType || req.user.roleName || req.user.role;

      // Get permissions (cached)
      const { permissions, source } = await getUserPermissions(userId, userType);

      // Check permission
      if (hasPermission(permissions, routeKey, action)) {
        // Attach permissions to request for downstream use
        req.permissions = permissions;
        req.permissionSource = source;
        return next();
      }

      // Log denied access for audit
      console.warn(`[rbacMiddleware] Access denied: user=${userId} route=${routeKey} action=${action}`);

      return res.status(403).json({
        error: 'forbidden',
        code: 'FORBIDDEN',
        required: { route: routeKey, action },
        userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[rbacMiddleware] Error:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        code: 'RBAC_ERROR'
      });
    }
  };
}

/**
 * Middleware: Require any of the specified permissions
 */
function requireAnyPermission(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.id;
      const userType = req.user.userType || req.user.roleName || req.user.role;
      const { permissions: userPerms } = await getUserPermissions(userId, userType);

      // Check if user has any of the required permissions
      for (const { route, action } of permissions) {
        if (hasPermission(userPerms, route, action)) {
          req.permissions = userPerms;
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: permissions
      });
    } catch (error) {
      console.error('[rbacMiddleware] requireAnyPermission error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed',
        code: 'RBAC_ERROR'
      });
    }
  };
}

/**
 * Middleware: Require all specified permissions
 */
function requireAllPermissions(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const userId = req.user.id;
      const userType = req.user.userType || req.user.roleName || req.user.role;
      const { permissions: userPerms } = await getUserPermissions(userId, userType);

      // Check that user has ALL required permissions
      const missing = [];
      for (const { route, action } of permissions) {
        if (!hasPermission(userPerms, route, action)) {
          missing.push({ route, action });
        }
      }

      if (missing.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          missing
        });
      }

      req.permissions = userPerms;
      return next();
    } catch (error) {
      console.error('[rbacMiddleware] requireAllPermissions error:', error);
      return res.status(500).json({
        success: false,
        error: 'Permission check failed',
        code: 'RBAC_ERROR'
      });
    }
  };
}

/**
 * Middleware: Require specific role(s)
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const normalizeRole = (r) => (r || '').toString().replace(/[\s-]+/g, '_').toUpperCase();
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = normalizeRole(req.user.userType || req.user.roleName || req.user.role);

    if (normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Insufficient role',
      code: 'ROLE_REQUIRED',
      required: allowedRoles,
      current: userRole
    });
  };
}

/**
 * Middleware: Re-check permission on write operations
 * Use after authenticate but before any data modification
 */
function revalidateOnWrite(action, routeKey) {
  return async (req, res, next) => {
    // For write operations, force fresh permission check (bypass cache)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Invalidate cache and re-fetch
      if (isRedisEnabled()) {
        await redis.del(permUserKey(userId));
      }

      // Now check with fresh permissions
      return requirePermission(action, routeKey)(req, res, next);
    }

    // For read operations, use normal cached check
    return requirePermission(action, routeKey)(req, res, next);
  };
}

/**
 * Invalidate user permission cache (call on role/permission changes)
 */
async function invalidateUserPermissions(userId) {
  if (isRedisEnabled()) {
    await redis.del(permUserKey(userId));
    // Broadcast to other nodes
    await pubsub.publishPermissionInvalidation({ type: 'user', userId });
  }
}

/**
 * Invalidate role permission cache (call on role definition changes)
 */
async function invalidateRolePermissions(roleId) {
  if (isRedisEnabled()) {
    await redis.del(permRoleKey(roleId));
    await pubsub.publishPermissionInvalidation({ type: 'role', roleId });
  }
}

/**
 * Invalidate all permission caches (nuclear option)
 */
async function invalidateAllPermissions() {
  if (isRedisEnabled()) {
    const keys = await redis.keys('perm:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await pubsub.publishPermissionInvalidation({ type: 'all' });
  }
}

/**
 * Attach permissions to request (for frontend to use)
 */
async function attachPermissions(req, res, next) {
  try {
    if (req.user) {
      const userId = req.user.id;
      const userType = req.user.userType || req.user.roleName || req.user.role;
      const { permissions, source } = await getUserPermissions(userId, userType);
      req.permissions = permissions;
      req.permissionSource = source;
    }
    next();
  } catch (error) {
    console.warn('[rbacMiddleware] attachPermissions error:', error.message);
    next();
  }
}

module.exports = {
  // Core middleware
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  revalidateOnWrite,
  attachPermissions,

  // Permission helpers
  getUserPermissions,
  hasPermission,

  // Cache invalidation
  invalidateUserPermissions,
  invalidateRolePermissions,
  invalidateAllPermissions,
  
  // PUB/SUB initialization
  initializePermissionSubscription,

  // Constants
  PERMISSION_TTL
};

/* ============================================================================
 * EXAMPLE USAGE - Copy/paste into your routes
 * ============================================================================
 *
 * const { requirePermission, requireRole } = require('../middleware/rbacMiddleware');
 *
 * // Basic permission check
 * router.post('/finance/invoice', requirePermission('create', 'module:finance'), createInvoice);
 * router.get('/finance/reports', requirePermission('view', 'module:finance'), listReports);
 * router.put('/finance/invoice/:id', requirePermission('edit', 'module:finance'), updateInvoice);
 * router.delete('/finance/invoice/:id', requirePermission('delete', 'module:finance'), deleteInvoice);
 *
 * // Inventory routes
 * router.get('/inventory/items', requirePermission('view', 'INVENTORY'), listItems);
 * router.post('/inventory/items', requirePermission('create', 'INVENTORY'), createItem);
 *
 * // Role-based check (alternative)
 * router.get('/admin/users', requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), listUsers);
 *
 * // Combine multiple permissions
 * router.get('/dashboard/summary',
 *   requireAnyPermission([
 *     { route: 'dashboard', action: 'view' },
 *     { route: 'reports', action: 'view' }
 *   ]),
 *   dashboardSummary
 * );
 *
 * ============================================================================ */
