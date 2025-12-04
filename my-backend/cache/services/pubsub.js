/**
 * PUB/SUB Cache Invalidation Service
 * 
 * Redis PUB/SUB for distributed cache invalidation across app nodes:
 * - Publish invalidation messages when data changes
 * - Subscribe to receive invalidations from other nodes
 * - Automatic cache key cleanup on message receipt
 * 
 * Channels:
 * - permissions:invalidate - Role/permission changes
 * - sessions:invalidate - Session invalidations
 * - cache:invalidate - General cache invalidations
 * 
 * @module cache/services/pubsub
 */

const { redis, isEnabled } = require('../redisClient');
const { NS, permUserKey, permRoleKey, sessionKey } = require('../namespaces');
const Redis = require('ioredis');

// Subscriber connection (separate from main connection for PUB/SUB)
let subscriber = null;

// Message handlers by channel
const handlers = {
  [NS.CHANNEL_PERMISSIONS]: [],
  [NS.CHANNEL_SESSIONS]: [],
  [NS.CHANNEL_CACHE]: []
};

// Track subscription status
let isSubscribed = false;

/**
 * Initialize the subscriber connection
 * Must be separate from main redis connection for PUB/SUB
 */
function initSubscriber() {
  if (!isEnabled()) {
    console.log('[pubsub] Redis not enabled, PUB/SUB disabled');
    return false;
  }

  if (subscriber) {
    return true;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return false;
  }

  try {
    subscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      commandTimeout: 1200,
      lazyConnect: true,
      enableOfflineQueue: false
    });

    subscriber.on('connect', () => console.log('[pubsub] 🔌 Subscriber connected'));
    subscriber.on('ready', () => console.log('[pubsub] ✅ Subscriber ready'));
    subscriber.on('error', e => console.error('[pubsub] ❌ Subscriber error:', e.message));
    subscriber.on('end', () => {
      console.warn('[pubsub] ⚠️ Subscriber connection closed');
      isSubscribed = false;
    });

    // Handle incoming messages
    subscriber.on('message', handleMessage);

    subscriber.connect().catch(err => {
      console.warn('[pubsub] ⚠️ Subscriber connection failed:', err.message);
    });

    return true;
  } catch (error) {
    console.error('[pubsub] Failed to initialize subscriber:', error.message);
    return false;
  }
}

/**
 * Handle incoming PUB/SUB message
 */
async function handleMessage(channel, message) {
  try {
    const data = JSON.parse(message);
    console.log(`[pubsub] Received on ${channel}:`, data);

    // Execute registered handlers
    const channelHandlers = handlers[channel] || [];
    for (const handler of channelHandlers) {
      try {
        await handler(data);
      } catch (err) {
        console.error(`[pubsub] Handler error on ${channel}:`, err.message);
      }
    }

    // Built-in handlers
    if (channel === NS.CHANNEL_PERMISSIONS) {
      await handlePermissionInvalidation(data);
    } else if (channel === NS.CHANNEL_SESSIONS) {
      await handleSessionInvalidation(data);
    } else if (channel === NS.CHANNEL_CACHE) {
      await handleCacheInvalidation(data);
    }
  } catch (error) {
    console.error('[pubsub] Message parse error:', error.message);
  }
}

/**
 * Built-in handler for permission invalidation
 */
async function handlePermissionInvalidation(data) {
  const { type, id, userId, roleId } = data;

  try {
    if (type === 'user' && userId) {
      const key = permUserKey(userId);
      await redis.del(key);
      console.log(`[pubsub] Invalidated user permissions: ${key}`);
    }

    if (type === 'role' && roleId) {
      const key = permRoleKey(roleId);
      await redis.del(key);
      console.log(`[pubsub] Invalidated role permissions: ${key}`);
    }

    if (type === 'all') {
      // Invalidate all permission cache keys
      const pattern = 'perm:*';
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[pubsub] Invalidated all permissions: ${keys.length} keys`);
      }
    }
  } catch (error) {
    console.error('[pubsub] Permission invalidation error:', error.message);
  }
}

/**
 * Built-in handler for session invalidation
 */
async function handleSessionInvalidation(data) {
  const { type, sessionId, userId } = data;

  try {
    if (type === 'session' && sessionId) {
      const key = sessionKey(sessionId);
      await redis.del(key);
      console.log(`[pubsub] Invalidated session: ${key}`);
    }

    if (type === 'user' && userId) {
      // Invalidate all sessions for user
      const userSessionsKey = `session:user:${userId}`;
      const sessionIds = await redis.smembers(userSessionsKey);
      
      if (sessionIds.length > 0) {
        const sessionKeys = sessionIds.map(id => sessionKey(id));
        await redis.del(...sessionKeys, userSessionsKey);
        console.log(`[pubsub] Invalidated ${sessionIds.length} sessions for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('[pubsub] Session invalidation error:', error.message);
  }
}

/**
 * Built-in handler for general cache invalidation
 */
async function handleCacheInvalidation(data) {
  const { keys, pattern } = data;

  try {
    if (keys && Array.isArray(keys) && keys.length > 0) {
      await redis.del(...keys);
      console.log(`[pubsub] Invalidated ${keys.length} cache keys`);
    }

    if (pattern) {
      const matchedKeys = await redis.keys(pattern);
      if (matchedKeys.length > 0) {
        await redis.del(...matchedKeys);
        console.log(`[pubsub] Invalidated ${matchedKeys.length} keys matching ${pattern}`);
      }
    }
  } catch (error) {
    console.error('[pubsub] Cache invalidation error:', error.message);
  }
}

/**
 * Subscribe to invalidation channels
 */
async function subscribe() {
  if (!initSubscriber()) {
    return false;
  }

  if (isSubscribed) {
    return true;
  }

  try {
    await subscriber.subscribe(
      NS.CHANNEL_PERMISSIONS,
      NS.CHANNEL_SESSIONS,
      NS.CHANNEL_CACHE
    );
    isSubscribed = true;
    console.log('[pubsub] ✅ Subscribed to invalidation channels');
    return true;
  } catch (error) {
    console.error('[pubsub] Subscribe error:', error.message);
    return false;
  }
}

/**
 * Unsubscribe from all channels
 */
async function unsubscribe() {
  if (!subscriber || !isSubscribed) {
    return true;
  }

  try {
    await subscriber.unsubscribe();
    isSubscribed = false;
    console.log('[pubsub] ✅ Unsubscribed from all channels');
    return true;
  } catch (error) {
    console.error('[pubsub] Unsubscribe error:', error.message);
    return false;
  }
}

/**
 * Publish a permission invalidation message
 * 
 * @param {Object} data - Invalidation data
 * @param {string} data.type - 'user', 'role', or 'all'
 * @param {number} data.userId - User ID (for type='user')
 * @param {number} data.roleId - Role ID (for type='role')
 */
async function publishPermissionInvalidation(data) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const message = JSON.stringify({
      ...data,
      timestamp: Date.now(),
      source: process.env.HOSTNAME || process.pid
    });

    await redis.publish(NS.CHANNEL_PERMISSIONS, message);
    console.log('[pubsub] Published permission invalidation:', data);
    return true;
  } catch (error) {
    console.error('[pubsub] Publish error:', error.message);
    return false;
  }
}

/**
 * Publish a session invalidation message
 */
async function publishSessionInvalidation(data) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const message = JSON.stringify({
      ...data,
      timestamp: Date.now(),
      source: process.env.HOSTNAME || process.pid
    });

    await redis.publish(NS.CHANNEL_SESSIONS, message);
    console.log('[pubsub] Published session invalidation:', data);
    return true;
  } catch (error) {
    console.error('[pubsub] Publish error:', error.message);
    return false;
  }
}

/**
 * Publish a general cache invalidation message
 */
async function publishCacheInvalidation(data) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const message = JSON.stringify({
      ...data,
      timestamp: Date.now(),
      source: process.env.HOSTNAME || process.pid
    });

    await redis.publish(NS.CHANNEL_CACHE, message);
    console.log('[pubsub] Published cache invalidation:', data);
    return true;
  } catch (error) {
    console.error('[pubsub] Publish error:', error.message);
    return false;
  }
}

/**
 * Register a custom handler for a channel
 */
function onMessage(channel, handler) {
  if (!handlers[channel]) {
    handlers[channel] = [];
  }
  handlers[channel].push(handler);
}

/**
 * Remove a handler from a channel
 */
function offMessage(channel, handler) {
  if (handlers[channel]) {
    const index = handlers[channel].indexOf(handler);
    if (index > -1) {
      handlers[channel].splice(index, 1);
    }
  }
}

/**
 * Convenience functions for common invalidation scenarios
 */

// Invalidate user permissions (e.g., after role change)
async function invalidateUserPermissions(userId) {
  // Local invalidation
  if (isEnabled()) {
    await redis.del(permUserKey(userId));
  }
  // Broadcast to other nodes
  return publishPermissionInvalidation({ type: 'user', userId });
}

// Invalidate role permissions (e.g., after permission update)
async function invalidateRolePermissions(roleId) {
  if (isEnabled()) {
    await redis.del(permRoleKey(roleId));
  }
  return publishPermissionInvalidation({ type: 'role', roleId });
}

// Invalidate all permissions (nuclear option)
async function invalidateAllPermissions() {
  return publishPermissionInvalidation({ type: 'all' });
}

// Invalidate a specific session
async function invalidateSession(sessionId) {
  if (isEnabled()) {
    await redis.del(sessionKey(sessionId));
  }
  return publishSessionInvalidation({ type: 'session', sessionId });
}

// Invalidate all sessions for a user (e.g., after password change)
async function invalidateUserSessions(userId) {
  return publishSessionInvalidation({ type: 'user', userId });
}

// Invalidate specific cache keys
async function invalidateKeys(keys) {
  if (isEnabled() && keys.length > 0) {
    await redis.del(...keys);
  }
  return publishCacheInvalidation({ keys });
}

// Invalidate by pattern
async function invalidatePattern(pattern) {
  return publishCacheInvalidation({ pattern });
}

/**
 * Cleanup on shutdown
 */
async function shutdown() {
  await unsubscribe();
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
}

module.exports = {
  // Lifecycle
  subscribe,
  unsubscribe,
  shutdown,
  
  // Publishing
  publishPermissionInvalidation,
  publishSessionInvalidation,
  publishCacheInvalidation,
  
  // Convenience invalidators
  invalidateUserPermissions,
  invalidateRolePermissions,
  invalidateAllPermissions,
  invalidateSession,
  invalidateUserSessions,
  invalidateKeys,
  invalidatePattern,
  
  // Custom handlers
  onMessage,
  offMessage,
  
  // State
  isSubscribed: () => isSubscribed
};
