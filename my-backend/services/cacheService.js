/**
 * Cache Service - In-memory caching for frequently accessed data
 * Uses node-cache for simple, fast caching without Redis dependency
 * 
 * Cache Strategy:
 * - Roles: 10 min TTL (rarely change)
 * - Permissions: 5 min TTL (moderate change)
 * - Dashboard data: 2 min TTL (frequently updated)
 */

const NodeCache = require('node-cache');

// Create cache instances with different TTLs
const roleCache = new NodeCache({
  stdTTL: 600,        // 10 minutes
  checkperiod: 120,   // Check for expired keys every 2 minutes
  useClones: false,   // Don't clone objects (better performance)
  deleteOnExpire: true
});

const permissionCache = new NodeCache({
  stdTTL: 300,        // 5 minutes
  checkperiod: 60,
  useClones: false,
  deleteOnExpire: true
});

const dashboardCache = new NodeCache({
  stdTTL: 120,        // 2 minutes
  checkperiod: 30,
  useClones: false,
  deleteOnExpire: true
});

const generalCache = new NodeCache({
  stdTTL: 180,        // 3 minutes default
  checkperiod: 60,
  useClones: false,
  deleteOnExpire: true
});

// Cache statistics
let stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0
};

/**
 * Get cached value with automatic stats tracking
 * @param {NodeCache} cache - Cache instance
 * @param {string} key - Cache key
 * @returns {any|null} Cached value or null
 */
function get(cache, key) {
  const value = cache.get(key);
  if (value !== undefined) {
    stats.hits++;
    console.log(`[cache] HIT: ${key} (${stats.hits} total hits)`);
    return value;
  }
  stats.misses++;
  console.log(`[cache] MISS: ${key} (${stats.misses} total misses)`);
  return null;
}

/**
 * Set cached value
 * @param {NodeCache} cache - Cache instance
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Optional custom TTL in seconds
 * @returns {boolean} Success
 */
function set(cache, key, value, ttl) {
  const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value);
  if (success) {
    stats.sets++;
    console.log(`[cache] SET: ${key} (TTL: ${ttl || 'default'}s)`);
  }
  return success;
}

/**
 * Delete cached value
 * @param {NodeCache} cache - Cache instance
 * @param {string} key - Cache key
 * @returns {number} Number of deleted entries
 */
function del(cache, key) {
  const deleted = cache.del(key);
  if (deleted > 0) {
    stats.deletes++;
    console.log(`[cache] DELETE: ${key}`);
  }
  return deleted;
}

/**
 * Clear entire cache instance
 * @param {NodeCache} cache - Cache instance
 */
function flush(cache) {
  cache.flushAll();
  console.log(`[cache] FLUSH: All keys cleared`);
}

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
function getStats() {
  const hitRate = stats.hits + stats.misses > 0 
    ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2) 
    : 0;
  
  return {
    ...stats,
    hitRate: `${hitRate}%`,
    roleCache: roleCache.getStats(),
    permissionCache: permissionCache.getStats(),
    dashboardCache: dashboardCache.getStats(),
    generalCache: generalCache.getStats()
  };
}

// Role cache helpers
const roles = {
  get: (key) => get(roleCache, key),
  set: (key, value, ttl) => set(roleCache, key, value, ttl),
  del: (key) => del(roleCache, key),
  flush: () => flush(roleCache),
  
  // Specific role cache methods
  getAll: () => get(roleCache, 'all_roles'),
  setAll: (roles) => set(roleCache, 'all_roles', roles),
  getById: (id) => get(roleCache, `role:${id}`),
  setById: (id, role) => set(roleCache, `role:${id}`, role),
  invalidate: () => {
    flush(roleCache);
    console.log('[cache] All role cache invalidated');
  }
};

// Permission cache helpers
const permissions = {
  get: (key) => get(permissionCache, key),
  set: (key, value, ttl) => set(permissionCache, key, value, ttl),
  del: (key) => del(permissionCache, key),
  flush: () => flush(permissionCache),
  
  // Specific permission cache methods
  getByUser: (userId) => get(permissionCache, `user:${userId}:permissions`),
  setByUser: (userId, perms) => set(permissionCache, `user:${userId}:permissions`, perms),
  getByRole: (roleId) => get(permissionCache, `role:${roleId}:permissions`),
  setByRole: (roleId, perms) => set(permissionCache, `role:${roleId}:permissions`, perms),
  invalidateUser: (userId) => {
    del(permissionCache, `user:${userId}:permissions`);
    console.log(`[cache] User ${userId} permissions invalidated`);
  },
  invalidateRole: (roleId) => {
    del(permissionCache, `role:${roleId}:permissions`);
    console.log(`[cache] Role ${roleId} permissions invalidated`);
  }
};

// Dashboard cache helpers
const dashboard = {
  get: (key) => get(dashboardCache, key),
  set: (key, value, ttl) => set(dashboardCache, key, value, ttl),
  del: (key) => del(dashboardCache, key),
  flush: () => flush(dashboardCache),
  
  // Specific dashboard cache methods
  getMetrics: (userId) => get(dashboardCache, `user:${userId}:metrics`),
  setMetrics: (userId, metrics) => set(dashboardCache, `user:${userId}:metrics`, metrics),
  getStats: (role) => get(dashboardCache, `role:${role}:stats`),
  setStats: (role, stats) => set(dashboardCache, `role:${role}:stats`, stats)
};

// General cache helpers
const general = {
  get: (key) => get(generalCache, key),
  set: (key, value, ttl) => set(generalCache, key, value, ttl),
  del: (key) => del(generalCache, key),
  flush: () => flush(generalCache)
};

// Clear all caches
function flushAll() {
  flush(roleCache);
  flush(permissionCache);
  flush(dashboardCache);
  flush(generalCache);
  console.log('[cache] ✅ All caches cleared');
}

module.exports = {
  roles,
  permissions,
  dashboard,
  general,
  getStats,
  flushAll
};
