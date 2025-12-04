// Event-based cache invalidation handlers
const { redis } = require('../redisClient');
const { key, NS } = require('../namespaces');
const { invalidateUserPermissions, invalidateSuperAdminPermissions } = require('../services/permissionCache');
const { invalidateUserSessions } = require('../services/sessionCache');

const patternRegistry = {
  // Existing patterns
  PARTY_UPDATED: id => [ key(NS.PARTY, id) ],
  PARTY_BULK_IMPORT: () => ['party:*'],
  DASHBOARD_CRITICAL_METRIC_CHANGE: userId => [ `dash:core:[\"${userId}\"]` ],
  
  // Permission patterns
  USER_PERMISSIONS_CHANGED: async (userId) => {
    await invalidateUserPermissions(userId);
    return [];
  },
  ROLE_PERMISSIONS_CHANGED: async (roleId) => {
    return [`${NS.PERMISSION_ROLE}:${roleId}`, `${NS.PERMISSION}:*`];
  },
  MODULE_ASSIGNMENTS_CHANGED: async (superAdminId) => {
    await invalidateSuperAdminPermissions(superAdminId);
    return [];
  },
  
  // Session patterns
  USER_LOGGED_OUT: async (userId) => {
    await invalidateUserSessions(userId);
    return [];
  },
  USER_PASSWORD_CHANGED: async (userId) => {
    await invalidateUserSessions(userId);
    await invalidateUserPermissions(userId);
    return [];
  },
  
  // Tenant patterns
  TENANT_SETTINGS_CHANGED: (tenantId) => [`${NS.PERMISSION}:*:tenant:${tenantId}`],
  
  // Super Admin patterns
  SUPER_ADMIN_DEACTIVATED: async (superAdminId) => {
    await invalidateSuperAdminPermissions(superAdminId);
    return [];
  }
};

async function invalidate(event, payload) {
  if (!redis) return; // fail-open
  
  const handler = patternRegistry[event];
  if (!handler) return;
  
  let patterns;
  if (typeof handler === 'function') {
    const result = handler(payload);
    // Handle async handlers
    patterns = result instanceof Promise ? await result : result;
  } else {
    patterns = [];
  }
  
  // Process any returned patterns
  for (const p of patterns) {
    if (p.includes('*')) {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', p, 'COUNT', 100);
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== '0');
    } else {
      await redis.del(p);
    }
  }
}

/**
 * Invalidate cache when database triggers fire
 * Can be called from audit triggers via notify/listen
 */
async function handleDatabaseChange(tableName, action, recordId, data) {
  switch (tableName) {
    case 'users_enhanced':
      if (action !== 'INSERT') {
        await invalidate('USER_PERMISSIONS_CHANGED', recordId);
      }
      break;
      
    case 'module_assignments':
      if (data?.super_admin_id) {
        await invalidate('MODULE_ASSIGNMENTS_CHANGED', data.super_admin_id);
      }
      break;
      
    case 'permissions':
    case 'rbac_permissions':
      await invalidate('ROLE_PERMISSIONS_CHANGED', data?.role_id || recordId);
      break;
      
    case 'user_sessions':
      if (action === 'DELETE' && data?.user_id) {
        await invalidate('USER_LOGGED_OUT', data.user_id);
      }
      break;
      
    case 'super_admins':
      if (action === 'UPDATE' && data?.is_active === false) {
        await invalidate('SUPER_ADMIN_DEACTIVATED', recordId);
      }
      break;
  }
}

module.exports = { invalidate, patternRegistry, handleDatabaseChange };
