/**
 * Redis Key Namespaces & Patterns
 * 
 * Consistent key structure for all Redis operations.
 * All keys follow pattern: {namespace}:{identifier}[:{sub-identifier}]
 * 
 * @module cache/namespaces
 */

// Key namespaces & helpers for structured cache keys
module.exports.NS = {
  // Business data caching
  DASHBOARD: 'dash',
  REPORT: 'report',
  PARTY: 'party',
  META: 'meta',
  TOKEN: 'token',
  
  // Session management: session:{session_id} → HASH { userId, tenantId, expiresAt }
  SESSION: 'session',
  SESSION_USER: 'session:user',      // Track all sessions for a user
  
  // Permission caching: perm:user:{userId} → JSON (permissions snapshot)
  PERMISSION: 'perm',
  PERMISSION_USER: 'perm:user',      // perm:user:{userId} → JSON    TTL = 60s-5m
  PERMISSION_ROLE: 'perm:role',      // perm:role:{roleId} → JSON    TTL = 5m
  PERMISSION_MODULE: 'perm:module',  // perm:module:{moduleId} → JSON
  
  // Rate limiting: rate:{ip}:{endpoint} → INT (expire = window sec)
  RATE: 'rate',
  RATE_LIMIT: 'rl',                  // Legacy alias
  
  // Distributed locks: lock:{resource}:{id} → string (owner) TTL = 30s
  LOCK: 'lock',
  LOCK_TASK: 'lock:task',            // lock:task:{taskId}
  LOCK_APPROVAL: 'lock:approval',    // lock:approval:{approvalId}
  LOCK_PAYMENT: 'lock:payment',      // lock:payment:{paymentId}
  
  // PUB/SUB channels
  CHANNEL_PERMISSIONS: 'permissions:invalidate',
  CHANNEL_SESSIONS: 'sessions:invalidate',
  CHANNEL_CACHE: 'cache:invalidate'
};

/**
 * Build a cache key from parts
 * @param {...string} parts - Key parts to join with ':'
 * @returns {string} Joined key
 * @example key('session', 'abc123') → 'session:abc123'
 */
module.exports.key = (...parts) => parts.filter(Boolean).join(':');

/**
 * Build a session key
 * @param {string} sessionId - Session identifier (hashed token)
 * @returns {string} session:{sessionId}
 */
module.exports.sessionKey = (sessionId) => `session:${sessionId}`;

/**
 * Build a user permission key
 * @param {string|number} userId - User ID
 * @returns {string} perm:user:{userId}
 */
module.exports.permUserKey = (userId) => `perm:user:${userId}`;

/**
 * Build a role permission key
 * @param {string|number} roleId - Role ID
 * @returns {string} perm:role:{roleId}
 */
module.exports.permRoleKey = (roleId) => `perm:role:${roleId}`;

/**
 * Build a rate limit key
 * @param {string} ip - Client IP address
 * @param {string} endpoint - API endpoint path
 * @returns {string} rate:{ip}:{endpoint}
 */
module.exports.rateKey = (ip, endpoint) => `rate:${ip}:${endpoint.replace(/\//g, '_')}`;

/**
 * Build a lock key
 * @param {string} resource - Resource type (task, approval, payment)
 * @param {string|number} id - Resource identifier
 * @returns {string} lock:{resource}:{id}
 */
module.exports.lockKey = (resource, id) => `lock:${resource}:${id}`;
