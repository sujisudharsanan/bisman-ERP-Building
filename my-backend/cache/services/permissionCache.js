/**
 * Permission Cache Service
 * 
 * Redis-backed permission caching with:
 * - Fast permission lookups
 * - Automatic invalidation on role/permission changes
 * - Database fallback
 * - Tenant-aware caching
 * 
 * @module cache/services/permissionCache
 */

const { redis, isEnabled } = require('../redisClient');
const { key } = require('../namespaces');
const { getPrisma } = require('../../lib/prisma');

// Namespaces
const PERM_NS = 'perm';
const PERM_USER_NS = 'perm:user';
const PERM_ROLE_NS = 'perm:role';
const PERM_MODULE_NS = 'perm:module';

// TTL settings (in seconds)
const PERMISSION_TTL = 300;      // 5 minutes for permissions
const ROLE_TTL = 600;            // 10 minutes for roles
const MODULE_TTL = 900;          // 15 minutes for modules

/**
 * Create cache key for user permissions
 */
function userPermKey(userId, module = null) {
  if (module) {
    return key(PERM_USER_NS, userId, module);
  }
  return key(PERM_USER_NS, userId);
}

/**
 * Create cache key for role permissions
 */
function rolePermKey(roleId) {
  return key(PERM_ROLE_NS, roleId);
}

/**
 * Create cache key for module assignments
 */
function moduleAssignKey(superAdminId) {
  return key(PERM_MODULE_NS, 'sa', superAdminId);
}

/**
 * Get user permissions from cache
 */
async function getUserPermissions(userId) {
  if (!isEnabled()) {
    return null;
  }

  try {
    const cacheKey = userPermKey(userId);
    const data = await redis.get(cacheKey);
    
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.warn('[permissionCache] getUserPermissions error:', error.message);
    return null;
  }
}

/**
 * Set user permissions in cache
 */
async function setUserPermissions(userId, permissions, ttlSeconds = PERMISSION_TTL) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const cacheKey = userPermKey(userId);
    const data = JSON.stringify({
      permissions,
      cached_at: Date.now()
    });
    
    await redis.setex(cacheKey, ttlSeconds, data);
    return true;
  } catch (error) {
    console.warn('[permissionCache] setUserPermissions error:', error.message);
    return false;
  }
}

/**
 * Get user permissions with database fallback
 */
async function getUserPermissionsWithFallback(userId, userType) {
  // Try cache first
  let cached = await getUserPermissions(userId);
  
  if (cached) {
    return { ...cached.permissions, source: 'cache' };
  }

  // Fallback to database
  try {
    const prisma = getPrisma();
    let permissions = {};

    if (userType === 'ENTERPRISE_ADMIN') {
      // Enterprise admins have all permissions
      permissions = {
        role: 'ENTERPRISE_ADMIN',
        modules: ['*'],
        actions: ['*'],
        isAdmin: true
      };
    } else if (userType === 'SUPER_ADMIN') {
      // Get assigned modules
      const moduleAssignments = await prisma.moduleAssignment.findMany({
        where: { super_admin_id: userId, is_active: true },
        include: { module: true }
      });

      permissions = {
        role: 'SUPER_ADMIN',
        modules: moduleAssignments.map(ma => ma.module.module_name),
        pagePermissions: moduleAssignments.reduce((acc, ma) => {
          acc[ma.module.module_name] = ma.page_permissions || [];
          return acc;
        }, {}),
        isAdmin: true
      };
    } else {
      // Regular user - get from user record
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          assignedModules: true,
          pagePermissions: true
        }
      });

      if (user) {
        permissions = {
          role: user.role,
          modules: user.assignedModules || [],
          pagePermissions: user.pagePermissions || {},
          isAdmin: false
        };
      }
    }

    // Cache for future lookups
    await setUserPermissions(userId, permissions);
    
    return { ...permissions, source: 'database' };
  } catch (error) {
    console.warn('[permissionCache] Database fallback error:', error.message);
    return null;
  }
}

/**
 * Check if user has permission for a module
 */
async function hasModulePermission(userId, userType, moduleName) {
  const permissions = await getUserPermissionsWithFallback(userId, userType);
  
  if (!permissions) {
    return false;
  }

  // Admin has all permissions
  if (permissions.modules.includes('*')) {
    return true;
  }

  return permissions.modules.includes(moduleName);
}

/**
 * Check if user has permission for a specific page/action
 */
async function hasPagePermission(userId, userType, moduleName, pageId) {
  const permissions = await getUserPermissionsWithFallback(userId, userType);
  
  if (!permissions) {
    return false;
  }

  // Admin has all permissions
  if (permissions.modules.includes('*')) {
    return true;
  }

  // Check module access first
  if (!permissions.modules.includes(moduleName)) {
    return false;
  }

  // Check page permission
  const pagePerms = permissions.pagePermissions?.[moduleName] || [];
  
  // Empty array means all pages allowed
  if (pagePerms.length === 0) {
    return true;
  }

  return pagePerms.includes(pageId);
}

/**
 * Get Super Admin's assigned modules from cache
 */
async function getModuleAssignments(superAdminId) {
  if (!isEnabled()) {
    return null;
  }

  try {
    const cacheKey = moduleAssignKey(superAdminId);
    const data = await redis.get(cacheKey);
    
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.warn('[permissionCache] getModuleAssignments error:', error.message);
    return null;
  }
}

/**
 * Set Super Admin's module assignments in cache
 */
async function setModuleAssignments(superAdminId, modules, ttlSeconds = MODULE_TTL) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const cacheKey = moduleAssignKey(superAdminId);
    const data = JSON.stringify({
      modules,
      cached_at: Date.now()
    });
    
    await redis.setex(cacheKey, ttlSeconds, data);
    return true;
  } catch (error) {
    console.warn('[permissionCache] setModuleAssignments error:', error.message);
    return false;
  }
}

/**
 * Get module assignments with database fallback
 */
async function getModuleAssignmentsWithFallback(superAdminId) {
  // Try cache first
  let cached = await getModuleAssignments(superAdminId);
  
  if (cached) {
    return { ...cached, source: 'cache' };
  }

  // Fallback to database
  try {
    const prisma = getPrisma();
    
    const moduleAssignments = await prisma.moduleAssignment.findMany({
      where: { super_admin_id: superAdminId, is_active: true },
      include: { module: true }
    });

    const modules = moduleAssignments.map(ma => ({
      id: ma.module.id,
      name: ma.module.module_name,
      pages: ma.page_permissions || []
    }));

    // Cache for future lookups
    await setModuleAssignments(superAdminId, modules);
    
    return { modules, source: 'database' };
  } catch (error) {
    console.warn('[permissionCache] Module assignments fallback error:', error.message);
    return null;
  }
}

/**
 * Invalidate user permissions cache
 */
async function invalidateUserPermissions(userId) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const cacheKey = userPermKey(userId);
    await redis.del(cacheKey);
    return true;
  } catch (error) {
    console.warn('[permissionCache] invalidateUserPermissions error:', error.message);
    return false;
  }
}

/**
 * Invalidate all permissions for a super admin's users
 */
async function invalidateSuperAdminPermissions(superAdminId) {
  if (!isEnabled()) {
    return 0;
  }

  try {
    // Invalidate module assignments
    const moduleKey = moduleAssignKey(superAdminId);
    await redis.del(moduleKey);

    // Get all users under this super admin and invalidate their permissions
    const prisma = getPrisma();
    const users = await prisma.user.findMany({
      where: { super_admin_id: superAdminId },
      select: { id: true }
    });

    let count = 1; // Count the module key
    for (const user of users) {
      await invalidateUserPermissions(user.id);
      count++;
    }

    return count;
  } catch (error) {
    console.warn('[permissionCache] invalidateSuperAdminPermissions error:', error.message);
    return 0;
  }
}

/**
 * Invalidate all permission caches (nuclear option)
 */
async function invalidateAllPermissions() {
  if (!isEnabled()) {
    return 0;
  }

  try {
    // Find all permission keys
    const keys = await redis.keys(`${PERM_NS}:*`);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    return keys.length;
  } catch (error) {
    console.warn('[permissionCache] invalidateAllPermissions error:', error.message);
    return 0;
  }
}

/**
 * Warm cache for a user (preload permissions)
 */
async function warmCache(userId, userType) {
  try {
    await getUserPermissionsWithFallback(userId, userType);
    return true;
  } catch (error) {
    console.warn('[permissionCache] warmCache error:', error.message);
    return false;
  }
}

module.exports = {
  getUserPermissions,
  setUserPermissions,
  getUserPermissionsWithFallback,
  hasModulePermission,
  hasPagePermission,
  getModuleAssignments,
  setModuleAssignments,
  getModuleAssignmentsWithFallback,
  invalidateUserPermissions,
  invalidateSuperAdminPermissions,
  invalidateAllPermissions,
  warmCache,
  PERMISSION_TTL,
  ROLE_TTL,
  MODULE_TTL
};
