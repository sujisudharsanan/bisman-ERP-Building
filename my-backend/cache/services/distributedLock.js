/**
 * Distributed Lock Service
 * 
 * Redis-backed distributed locking with:
 * - Atomic acquire/release using SET NX EX
 * - Owner identification for safe release
 * - TTL to prevent deadlocks
 * - Lock extension for long operations
 * 
 * Key pattern: lock:{resource}:{id} → string (owner) TTL = 30s
 * 
 * @module cache/services/distributedLock
 */

const { redis, isEnabled } = require('../redisClient');
const { lockKey, NS } = require('../namespaces');
const crypto = require('crypto');

// Default lock TTL (30 seconds)
const DEFAULT_LOCK_TTL = 30;

// Maximum lock wait time (10 seconds)
const DEFAULT_WAIT_TIMEOUT = 10000;

// Retry interval when waiting for lock (100ms)
const RETRY_INTERVAL = 100;

/**
 * Generate a unique owner identifier
 * Combines hostname/process info with random token
 */
function generateOwnerId() {
  const hostname = process.env.HOSTNAME || process.env.POD_NAME || 'local';
  const pid = process.pid;
  const random = crypto.randomBytes(8).toString('hex');
  return `${hostname}:${pid}:${random}`;
}

/**
 * Acquire a distributed lock
 * 
 * @param {string} resource - Resource type (task, approval, payment)
 * @param {string|number} id - Resource identifier
 * @param {Object} options - Lock options
 * @param {number} options.ttlSeconds - Lock TTL in seconds (default: 30)
 * @param {string} options.owner - Custom owner identifier
 * @param {boolean} options.wait - Whether to wait for lock (default: false)
 * @param {number} options.waitTimeout - Max time to wait in ms (default: 10000)
 * @returns {Promise<{acquired: boolean, owner: string, key: string} | null>}
 */
async function acquire(resource, id, options = {}) {
  if (!isEnabled()) {
    // Return mock lock when Redis is disabled
    const owner = options.owner || generateOwnerId();
    return { 
      acquired: true, 
      owner, 
      key: lockKey(resource, id),
      source: 'disabled'
    };
  }

  const {
    ttlSeconds = DEFAULT_LOCK_TTL,
    owner = generateOwnerId(),
    wait = false,
    waitTimeout = DEFAULT_WAIT_TIMEOUT
  } = options;

  const key = lockKey(resource, id);

  try {
    // Try to acquire lock with SET NX EX (atomic)
    const result = await redis.set(key, owner, 'EX', ttlSeconds, 'NX');

    if (result === 'OK') {
      return { acquired: true, owner, key, source: 'redis' };
    }

    // Lock already held - check if we should wait
    if (wait) {
      return await waitForLock(resource, id, { ttlSeconds, owner, waitTimeout });
    }

    // Get current owner for debugging
    const currentOwner = await redis.get(key);
    return { 
      acquired: false, 
      owner, 
      key, 
      heldBy: currentOwner,
      source: 'redis'
    };
  } catch (error) {
    console.warn('[distributedLock] acquire error:', error.message);
    // Fail-open: allow operation when Redis fails
    return { 
      acquired: true, 
      owner, 
      key, 
      source: 'error'
    };
  }
}

/**
 * Wait for a lock to become available
 */
async function waitForLock(resource, id, options) {
  const { ttlSeconds, owner, waitTimeout } = options;
  const key = lockKey(resource, id);
  const startTime = Date.now();

  while (Date.now() - startTime < waitTimeout) {
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));

    try {
      const result = await redis.set(key, owner, 'EX', ttlSeconds, 'NX');
      
      if (result === 'OK') {
        return { acquired: true, owner, key, waitedMs: Date.now() - startTime };
      }
    } catch (error) {
      console.warn('[distributedLock] waitForLock error:', error.message);
    }
  }

  // Timeout - couldn't acquire lock
  const currentOwner = await redis.get(key).catch(() => 'unknown');
  return { 
    acquired: false, 
    owner, 
    key, 
    heldBy: currentOwner,
    timedOut: true
  };
}

/**
 * Release a distributed lock (safe - only owner can release)
 * 
 * @param {string} resource - Resource type
 * @param {string|number} id - Resource identifier
 * @param {string} owner - Owner identifier (must match lock owner)
 * @returns {Promise<boolean>}
 */
async function release(resource, id, owner) {
  if (!isEnabled()) {
    return true;
  }

  const key = lockKey(resource, id);

  try {
    // Lua script for atomic check-and-delete
    // Only delete if the lock is still held by this owner
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(script, 1, key, owner);
    return result === 1;
  } catch (error) {
    console.warn('[distributedLock] release error:', error.message);
    return false;
  }
}

/**
 * Extend a lock's TTL (for long-running operations)
 * 
 * @param {string} resource - Resource type
 * @param {string|number} id - Resource identifier
 * @param {string} owner - Owner identifier
 * @param {number} ttlSeconds - New TTL in seconds
 * @returns {Promise<boolean>}
 */
async function extend(resource, id, owner, ttlSeconds = DEFAULT_LOCK_TTL) {
  if (!isEnabled()) {
    return true;
  }

  const key = lockKey(resource, id);

  try {
    // Lua script for atomic check-and-extend
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await redis.eval(script, 1, key, owner, ttlSeconds);
    return result === 1;
  } catch (error) {
    console.warn('[distributedLock] extend error:', error.message);
    return false;
  }
}

/**
 * Check if a resource is locked
 */
async function isLocked(resource, id) {
  if (!isEnabled()) {
    return { locked: false };
  }

  const key = lockKey(resource, id);

  try {
    const [owner, ttl] = await Promise.all([
      redis.get(key),
      redis.ttl(key)
    ]);

    return {
      locked: !!owner,
      owner: owner || null,
      ttl: ttl > 0 ? ttl : null
    };
  } catch (error) {
    console.warn('[distributedLock] isLocked error:', error.message);
    return { locked: false, error: error.message };
  }
}

/**
 * Force release a lock (admin function - use with caution)
 */
async function forceRelease(resource, id) {
  if (!isEnabled()) {
    return true;
  }

  const key = lockKey(resource, id);

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.warn('[distributedLock] forceRelease error:', error.message);
    return false;
  }
}

/**
 * Execute a function with a lock
 * Automatically acquires, executes, and releases
 * 
 * @param {string} resource - Resource type
 * @param {string|number} id - Resource identifier
 * @param {Function} fn - Function to execute
 * @param {Object} options - Lock options
 * @returns {Promise<{result: any, lockInfo: Object}>}
 */
async function withLock(resource, id, fn, options = {}) {
  const lockInfo = await acquire(resource, id, options);

  if (!lockInfo.acquired) {
    throw new Error(`Could not acquire lock for ${resource}:${id}. Held by: ${lockInfo.heldBy}`);
  }

  try {
    const result = await fn();
    return { result, lockInfo };
  } finally {
    await release(resource, id, lockInfo.owner);
  }
}

/**
 * Specialized lock functions for common resources
 */

// Task lock: lock:task:{taskId}
async function acquireTaskLock(taskId, options = {}) {
  return acquire('task', taskId, { ttlSeconds: 30, ...options });
}

async function releaseTaskLock(taskId, owner) {
  return release('task', taskId, owner);
}

// Approval lock: lock:approval:{approvalId}
async function acquireApprovalLock(approvalId, options = {}) {
  return acquire('approval', approvalId, { ttlSeconds: 60, ...options });
}

async function releaseApprovalLock(approvalId, owner) {
  return release('approval', approvalId, owner);
}

// Payment lock: lock:payment:{paymentId}
async function acquirePaymentLock(paymentId, options = {}) {
  return acquire('payment', paymentId, { ttlSeconds: 60, ...options });
}

async function releasePaymentLock(paymentId, owner) {
  return release('payment', paymentId, owner);
}

// Mutex for critical sections
async function mutex(name, fn, options = {}) {
  return withLock('mutex', name, fn, { ttlSeconds: 10, ...options });
}

module.exports = {
  // Core functions
  acquire,
  release,
  extend,
  isLocked,
  forceRelease,
  withLock,
  
  // Specialized locks
  acquireTaskLock,
  releaseTaskLock,
  acquireApprovalLock,
  releaseApprovalLock,
  acquirePaymentLock,
  releasePaymentLock,
  mutex,
  
  // Utilities
  generateOwnerId,
  
  // Constants
  DEFAULT_LOCK_TTL,
  DEFAULT_WAIT_TIMEOUT
};
