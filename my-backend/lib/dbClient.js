/**
 * Database Client with Read/Write Routing
 * =========================================
 * 
 * Smart query router that automatically routes reads to replicas and writes to primary.
 * Includes failover logic, health checks, and read-after-write consistency support.
 * 
 * Usage:
 *   const db = require('./lib/dbClient');
 * 
 *   // Explicit routing
 *   const users = await db.read.user.findMany();      // Uses replica
 *   const user = await db.write.user.create({...});   // Uses primary
 * 
 *   // Force primary for read-after-write
 *   const freshData = await db.primary.user.findUnique({...});
 * 
 *   // Transactions (always primary)
 *   await db.transaction(async (tx) => {
 *     await tx.user.create({...});
 *     await tx.order.create({...});
 *   });
 * 
 * @module lib/dbClient
 */

const { getPrimary, getReplica, hasReplicaConfigured } = require('./prismaClients');

// ============================================================================
// HEALTH TRACKING
// ============================================================================

const replicaHealth = {
  healthy: true,
  lastCheck: Date.now(),
  lastError: null,
  consecutiveFailures: 0,
  cooldownUntil: 0,
  totalFailovers: 0,
};

const HEALTH_CONFIG = {
  maxConsecutiveFailures: 3,      // Failures before marking unhealthy
  cooldownMs: 30000,              // 30 seconds cooldown after failures
  healthCheckIntervalMs: 10000,   // Check health every 10 seconds
  queryTimeoutMs: 5000,           // Timeout for health check query
};

/**
 * Check if replica is currently available
 */
function isReplicaAvailable() {
  // No replica configured
  if (!hasReplicaConfigured()) {
    return false;
  }

  // In cooldown period
  if (Date.now() < replicaHealth.cooldownUntil) {
    return false;
  }

  return replicaHealth.healthy;
}

/**
 * Mark replica as failed
 */
function markReplicaFailed(error) {
  replicaHealth.consecutiveFailures++;
  replicaHealth.lastError = error?.message || 'Unknown error';
  replicaHealth.lastCheck = Date.now();

  if (replicaHealth.consecutiveFailures >= HEALTH_CONFIG.maxConsecutiveFailures) {
    replicaHealth.healthy = false;
    replicaHealth.cooldownUntil = Date.now() + HEALTH_CONFIG.cooldownMs;
    replicaHealth.totalFailovers++;
    
    console.warn(`[dbClient] Replica marked unhealthy after ${replicaHealth.consecutiveFailures} failures. ` +
                 `Cooldown until ${new Date(replicaHealth.cooldownUntil).toISOString()}`);
  }
}

/**
 * Mark replica as healthy
 */
function markReplicaHealthy() {
  if (!replicaHealth.healthy) {
    console.log('[dbClient] Replica recovered and marked healthy');
  }
  replicaHealth.healthy = true;
  replicaHealth.consecutiveFailures = 0;
  replicaHealth.lastError = null;
  replicaHealth.lastCheck = Date.now();
}

/**
 * Get replica health status
 */
function getReplicaHealth() {
  return {
    ...replicaHealth,
    replicaConfigured: hasReplicaConfigured(),
    available: isReplicaAvailable(),
  };
}

// ============================================================================
// HEALTH CHECK BACKGROUND TASK
// ============================================================================

let healthCheckInterval = null;

async function performHealthCheck() {
  if (!hasReplicaConfigured()) return;

  try {
    const replica = getReplica();
    if (!replica) {
      markReplicaFailed(new Error('Replica client not available'));
      return;
    }

    // Simple query to test connection
    const start = Date.now();
    await Promise.race([
      replica.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CONFIG.queryTimeoutMs)
      ),
    ]);
    
    const latency = Date.now() - start;
    
    if (process.env.LOG_HEALTH_CHECKS === 'true') {
      console.log(`[dbClient] Replica health check passed (${latency}ms)`);
    }
    
    markReplicaHealthy();
  } catch (error) {
    console.warn(`[dbClient] Replica health check failed: ${error.message}`);
    markReplicaFailed(error);
  }
}

// Start health checks if replica is configured
function startHealthChecks() {
  if (healthCheckInterval) return;
  
  if (hasReplicaConfigured()) {
    healthCheckInterval = setInterval(performHealthCheck, HEALTH_CONFIG.healthCheckIntervalMs);
    // Initial check
    performHealthCheck();
  }
}

// Stop health checks
function stopHealthChecks() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// ============================================================================
// QUERY ROUTING
// ============================================================================

/**
 * Get the appropriate client for read operations
 * Falls back to primary if replica is unavailable
 */
function getReadClientWithFallback() {
  if (isReplicaAvailable()) {
    return getReplica();
  }
  
  // Fallback to primary
  if (process.env.DATABASE_REPLICA_FALLBACK !== 'false') {
    return getPrimary();
  }
  
  // If fallback disabled and replica down, return replica anyway (will error)
  return getReplica();
}

/**
 * Execute a read query with automatic failover
 */
async function executeReadWithFallback(queryFn) {
  // Try replica first if available
  if (isReplicaAvailable()) {
    try {
      const replica = getReplica();
      const result = await queryFn(replica);
      markReplicaHealthy();
      return result;
    } catch (error) {
      // Check if it's a connection error
      if (isConnectionError(error)) {
        console.warn(`[dbClient] Replica query failed, falling back to primary: ${error.message}`);
        markReplicaFailed(error);
        
        // Fall through to primary
      } else {
        // Not a connection error, rethrow
        throw error;
      }
    }
  }

  // Use primary (either as fallback or if no replica)
  const primary = getPrimary();
  return queryFn(primary);
}

/**
 * Check if an error is a connection-related error
 */
function isConnectionError(error) {
  const connectionErrors = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'Connection terminated',
    'Connection refused',
    'connection timeout',
    'read ECONNRESET',
  ];
  
  const message = error?.message || '';
  return connectionErrors.some(e => message.includes(e));
}

// ============================================================================
// READ-AFTER-WRITE CONTEXT
// ============================================================================

// AsyncLocalStorage for request-scoped context
let asyncLocalStorage;
try {
  const { AsyncLocalStorage } = require('async_hooks');
  asyncLocalStorage = new AsyncLocalStorage();
} catch {
  // Fallback for older Node versions
  asyncLocalStorage = null;
}

/**
 * Run a function with read-after-write context
 * All reads within this context will use primary
 */
function withPrimaryReads(fn) {
  if (!asyncLocalStorage) {
    return fn();
  }
  return asyncLocalStorage.run({ forcePrimary: true }, fn);
}

/**
 * Check if we're in a read-after-write context
 */
function shouldUsePrimary() {
  if (!asyncLocalStorage) return false;
  const store = asyncLocalStorage.getStore();
  return store?.forcePrimary === true;
}

/**
 * Get the appropriate read client considering context
 */
function getContextAwareReadClient() {
  if (shouldUsePrimary()) {
    return getPrimary();
  }
  return getReadClientWithFallback();
}

// ============================================================================
// PROXY-BASED API
// ============================================================================

/**
 * Create a proxy that routes to the appropriate client
 */
function createRoutingProxy(getClient) {
  return new Proxy({}, {
    get(target, prop) {
      const client = getClient();
      if (!client) {
        throw new Error('Database client not available');
      }
      return client[prop];
    },
  });
}

// ============================================================================
// TRANSACTION HELPER
// ============================================================================

/**
 * Execute a transaction (always on primary)
 */
async function transaction(fn, options = {}) {
  const primary = getPrimary();
  if (!primary) {
    throw new Error('Primary database client not available');
  }
  return primary.$transaction(fn, options);
}

/**
 * Execute interactive transaction
 */
async function interactiveTransaction(fn, options = {}) {
  const primary = getPrimary();
  if (!primary) {
    throw new Error('Primary database client not available');
  }
  
  return primary.$transaction(async (tx) => {
    return fn(tx);
  }, {
    maxWait: options.maxWait || 5000,
    timeout: options.timeout || 10000,
    ...options,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

// Start health checks on module load
startHealthChecks();

const dbClient = {
  // Explicit routing (recommended)
  read: createRoutingProxy(getContextAwareReadClient),
  write: createRoutingProxy(getPrimary),
  primary: createRoutingProxy(getPrimary),
  replica: createRoutingProxy(getReplica),

  // Direct client access
  getPrimary,
  getReplica,
  getReadClient: getContextAwareReadClient,
  getWriteClient: getPrimary,

  // Transaction helpers
  transaction,
  $transaction: transaction,
  interactiveTransaction,

  // Read-after-write helper
  withPrimaryReads,

  // Execute with automatic failover
  executeReadWithFallback,

  // Health monitoring
  getReplicaHealth,
  isReplicaAvailable,
  startHealthChecks,
  stopHealthChecks,

  // Utility
  hasReplicaConfigured,
};

module.exports = dbClient;
