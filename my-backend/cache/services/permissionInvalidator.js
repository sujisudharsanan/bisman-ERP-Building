/**
 * Permission Invalidation Helper
 * 
 * Safely invalidates permission cache keys when roles/permissions change.
 * Uses Redis SCAN for safe pattern matching (no KEYS in production).
 * Publishes invalidation messages for multi-node environments.
 * 
 * @module cache/services/permissionInvalidator
 */

const { redis, isEnabled } = require('../redisClient');
const { NS, permUserKey, permRoleKey } = require('../namespaces');
const { getPrisma } = require('../../lib/prisma');

const prisma = getPrisma();

// Batch size for SCAN operations
const SCAN_BATCH_SIZE = 100;

/**
 * Safely scan Redis keys matching a pattern using SCAN
 * (KEYS command blocks Redis and should not be used in production)
 * 
 * @param {string} pattern - Key pattern to match (e.g., 'perm:user:*')
 * @returns {Promise<string[]>} Array of matching keys
 */
async function safeScanKeys(pattern) {
  if (!isEnabled()) {
    return [];
  }

  const keys = [];
  let cursor = '0';

  try {
    do {
      const [nextCursor, batch] = await redis.scan(
        cursor,
        'MATCH', pattern,
        'COUNT', SCAN_BATCH_SIZE
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    return keys;
  } catch (error) {
    console.error('[permissionInvalidator] SCAN error:', error.message);
    return [];
  }
}

/**
 * Invalidate a single user's permission cache
 * 
 * @param {number|string} userId - User ID
 * @returns {Promise<boolean>}
 */
async function invalidateUser(userId) {
  if (!isEnabled()) {
    return true;
  }

  try {
    const key = permUserKey(userId);
    await redis.del(key);
    console.log(`[permissionInvalidator] Invalidated user: ${userId}`);
    return true;
  } catch (error) {
    console.error('[permissionInvalidator] invalidateUser error:', error.message);
    return false;
  }
}

/**
 * Invalidate a role's permission cache AND all users with that role
 * 
 * @param {number|string} roleId - Role ID
 * @returns {Promise<{roleDeleted: boolean, usersInvalidated: number}>}
 */
async function invalidateRole(roleId) {
  const result = {
    roleDeleted: false,
    usersInvalidated: 0,
    userIds: []
  };

  try {
    // 1. Delete the role's permission cache
    if (isEnabled()) {
      const roleKey = permRoleKey(roleId);
      await redis.del(roleKey);
      result.roleDeleted = true;
    }

    // 2. Find all users with this role from database
    let userIds = [];
    try {
      // Try RBAC tables first
      const rbacUsers = await prisma.$queryRaw`
        SELECT DISTINCT user_id FROM rbac_user_roles WHERE role_id = ${parseInt(roleId)}
      `;
      userIds = rbacUsers.map(u => u.user_id);
    } catch (e) {
      // Fallback: try users_enhanced with role column
      try {
        const users = await prisma.$queryRaw`
          SELECT id FROM users_enhanced WHERE role = (
            SELECT name FROM rbac_roles WHERE id = ${parseInt(roleId)}
          )
        `;
        userIds = users.map(u => u.id);
      } catch (e2) {
        console.warn('[permissionInvalidator] Could not find users for role:', e2.message);
      }
    }

    // 3. Invalidate each user's permission cache
    if (isEnabled() && userIds.length > 0) {
      const userKeys = userIds.map(id => permUserKey(id));
      await redis.del(...userKeys);
      result.usersInvalidated = userIds.length;
      result.userIds = userIds;
    }

    // 4. Publish invalidation message for other nodes
    if (isEnabled()) {
      await redis.publish(NS.CHANNEL_PERMISSIONS, JSON.stringify({
        type: 'role',
        roleId,
        userIds,
        timestamp: Date.now(),
        source: process.env.HOSTNAME || process.pid
      }));
    }

    console.log(`[permissionInvalidator] Invalidated role ${roleId}, ${result.usersInvalidated} users`);
    return result;
  } catch (error) {
    console.error('[permissionInvalidator] invalidateRole error:', error.message);
    return result;
  }
}

/**
 * Invalidate all permission caches (use sparingly!)
 * Uses SCAN for safe iteration
 * 
 * @returns {Promise<{keysDeleted: number}>}
 */
async function invalidateAll() {
  if (!isEnabled()) {
    return { keysDeleted: 0 };
  }

  try {
    // Scan for all permission keys
    const userKeys = await safeScanKeys('perm:user:*');
    const roleKeys = await safeScanKeys('perm:role:*');
    const allKeys = [...userKeys, ...roleKeys];

    if (allKeys.length > 0) {
      // Delete in batches to avoid blocking
      for (let i = 0; i < allKeys.length; i += 100) {
        const batch = allKeys.slice(i, i + 100);
        await redis.del(...batch);
      }
    }

    // Publish broadcast invalidation
    await redis.publish(NS.CHANNEL_PERMISSIONS, JSON.stringify({
      type: 'all',
      timestamp: Date.now(),
      source: process.env.HOSTNAME || process.pid
    }));

    console.log(`[permissionInvalidator] Invalidated all permissions: ${allKeys.length} keys`);
    return { keysDeleted: allKeys.length };
  } catch (error) {
    console.error('[permissionInvalidator] invalidateAll error:', error.message);
    return { keysDeleted: 0 };
  }
}

/**
 * Invalidate permissions for multiple users (batch operation)
 * 
 * @param {Array<number|string>} userIds - Array of user IDs
 * @returns {Promise<number>} Number of keys deleted
 */
async function invalidateUsers(userIds) {
  if (!isEnabled() || !userIds?.length) {
    return 0;
  }

  try {
    const keys = userIds.map(id => permUserKey(id));
    
    // Delete in batches
    let deleted = 0;
    for (let i = 0; i < keys.length; i += 100) {
      const batch = keys.slice(i, i + 100);
      const result = await redis.del(...batch);
      deleted += result;
    }

    // Publish batch invalidation
    await redis.publish(NS.CHANNEL_PERMISSIONS, JSON.stringify({
      type: 'users',
      userIds,
      timestamp: Date.now(),
      source: process.env.HOSTNAME || process.pid
    }));

    console.log(`[permissionInvalidator] Invalidated ${deleted} user permission caches`);
    return deleted;
  } catch (error) {
    console.error('[permissionInvalidator] invalidateUsers error:', error.message);
    return 0;
  }
}

/**
 * Invalidate permissions for users matching a criteria
 * 
 * @param {Object} criteria - Query criteria
 * @param {string} criteria.role - Role name
 * @param {string} criteria.tenantId - Tenant ID
 * @returns {Promise<number>} Number of users invalidated
 */
async function invalidateUsersByCriteria(criteria) {
  try {
    let userIds = [];

    if (criteria.role) {
      const users = await prisma.$queryRaw`
        SELECT id FROM users_enhanced WHERE role = ${criteria.role}
      `;
      userIds = users.map(u => u.id);
    } else if (criteria.tenantId) {
      const users = await prisma.$queryRaw`
        SELECT id FROM users_enhanced WHERE tenant_id = ${criteria.tenantId}::uuid
      `;
      userIds = users.map(u => u.id);
    }

    if (userIds.length > 0) {
      return await invalidateUsers(userIds);
    }

    return 0;
  } catch (error) {
    console.error('[permissionInvalidator] invalidateUsersByCriteria error:', error.message);
    return 0;
  }
}

/**
 * Get cache statistics for permissions
 * 
 * @returns {Promise<Object>} Cache stats
 */
async function getCacheStats() {
  if (!isEnabled()) {
    return { enabled: false };
  }

  try {
    const userKeys = await safeScanKeys('perm:user:*');
    const roleKeys = await safeScanKeys('perm:role:*');

    // Sample TTLs
    const sampleTtls = [];
    for (const key of userKeys.slice(0, 10)) {
      const ttl = await redis.ttl(key);
      sampleTtls.push({ key, ttl });
    }

    return {
      enabled: true,
      userCacheCount: userKeys.length,
      roleCacheCount: roleKeys.length,
      totalKeys: userKeys.length + roleKeys.length,
      sampleTtls
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Subscribe to permission invalidation channel
 * Call this on app startup for each node
 * 
 * @param {Function} onInvalidate - Callback when invalidation received
 */
async function subscribeToInvalidations(onInvalidate) {
  if (!isEnabled()) {
    console.log('[permissionInvalidator] Redis not enabled, skipping subscription');
    return;
  }

  const Redis = require('ioredis');
  const subscriber = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  });

  subscriber.subscribe(NS.CHANNEL_PERMISSIONS, (err) => {
    if (err) {
      console.error('[permissionInvalidator] Subscribe error:', err.message);
      return;
    }
    console.log('[permissionInvalidator] Subscribed to permission invalidations');
  });

  subscriber.on('message', async (channel, message) => {
    if (channel !== NS.CHANNEL_PERMISSIONS) return;

    try {
      const data = JSON.parse(message);
      console.log('[permissionInvalidator] Received invalidation:', data.type);

      // Handle based on type
      if (data.type === 'all') {
        // Clear all local permission caches
        const keys = await safeScanKeys('perm:*');
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else if (data.type === 'role' && data.roleId) {
        await redis.del(permRoleKey(data.roleId));
        if (data.userIds?.length) {
          const userKeys = data.userIds.map(id => permUserKey(id));
          await redis.del(...userKeys);
        }
      } else if (data.type === 'user' && data.userId) {
        await redis.del(permUserKey(data.userId));
      } else if (data.type === 'users' && data.userIds?.length) {
        const userKeys = data.userIds.map(id => permUserKey(id));
        await redis.del(...userKeys);
      }

      // Call custom handler if provided
      if (onInvalidate) {
        await onInvalidate(data);
      }
    } catch (error) {
      console.error('[permissionInvalidator] Message handler error:', error.message);
    }
  });

  return subscriber;
}

module.exports = {
  // Core invalidation
  invalidateUser,
  invalidateRole,
  invalidateUsers,
  invalidateAll,
  invalidateUsersByCriteria,

  // Utilities
  safeScanKeys,
  getCacheStats,
  subscribeToInvalidations,

  // Constants
  SCAN_BATCH_SIZE
};
