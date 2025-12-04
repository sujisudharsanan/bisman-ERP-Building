/**
 * Cache Module Index
 * 
 * Exports all cache services and utilities:
 * - Session caching (session:{id} → user data)
 * - Permission caching (perm:user:{id} / perm:role:{id} → permissions)
 * - Rate limiting (rate:{ip}:{endpoint} → counter)
 * - Distributed locks (lock:{resource}:{id} → owner)
 * - PUB/SUB invalidation across nodes
 * 
 * @module cache
 */

const { redis, isEnabled, ping } = require('./redisClient');
const { NS, key, sessionKey, permUserKey, permRoleKey, rateKey, lockKey } = require('./namespaces');
const { invalidate, handleDatabaseChange } = require('./invalidation/handlers');

// Cache services
const sessionCache = require('./services/sessionCache');
const permissionCache = require('./services/permissionCache');
const rateLimiter = require('./services/rateLimiter');
const distributedLock = require('./services/distributedLock');
const pubsub = require('./services/pubsub');

// Re-export for convenience
module.exports = {
  // Core
  redis,
  isEnabled,
  ping,
  
  // Namespaces & Key Builders
  NS,
  key,
  sessionKey,
  permUserKey,
  permRoleKey,
  rateKey,
  lockKey,
  
  // Invalidation
  invalidate,
  handleDatabaseChange,
  
  // Session Cache
  sessionCache,
  
  // Permission Cache
  permissionCache,
  
  // Rate Limiter
  rateLimiter,
  
  // Distributed Lock
  distributedLock,
  
  // PUB/SUB
  pubsub,
  
  // Convenience exports from session cache
  setSession: sessionCache.setSession,
  getSession: sessionCache.getSession,
  getSessionWithFallback: sessionCache.getSessionWithFallback,
  invalidateSession: sessionCache.invalidateSession,
  invalidateUserSessions: sessionCache.invalidateUserSessions,
  
  // Convenience exports from permission cache
  getUserPermissions: permissionCache.getUserPermissions,
  setUserPermissions: permissionCache.setUserPermissions,
  getUserPermissionsWithFallback: permissionCache.getUserPermissionsWithFallback,
  hasModulePermission: permissionCache.hasModulePermission,
  hasPagePermission: permissionCache.hasPagePermission,
  invalidateUserPermissions: permissionCache.invalidateUserPermissions,
  invalidateAllPermissions: permissionCache.invalidateAllPermissions,
  
  // Convenience exports from rate limiter
  checkRateLimit: rateLimiter.checkLimit,
  rateLimitMiddleware: rateLimiter.middleware,
  authLimiter: rateLimiter.authLimiter,
  strictLimiter: rateLimiter.strictLimiter,
  
  // Convenience exports from distributed lock
  acquireLock: distributedLock.acquire,
  releaseLock: distributedLock.release,
  withLock: distributedLock.withLock,
  
  // Convenience exports from pubsub
  subscribeToInvalidations: pubsub.subscribe,
  publishInvalidation: pubsub.publishCacheInvalidation
};

