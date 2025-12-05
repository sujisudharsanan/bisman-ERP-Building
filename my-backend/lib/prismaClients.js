/**
 * Prisma Client Factory with Read Replica Support
 * =================================================
 * 
 * This module creates Prisma clients for primary (read/write) and replica (read-only) databases.
 * 
 * Usage:
 *   const { prismaPrimary, prismaReplica, getPrimary, getReplica } = require('./prismaClients');
 * 
 * Environment Variables:
 *   DATABASE_URL_PRIMARY - Primary database URL (required)
 *   DATABASE_URL_REPLICA - Replica database URL (optional, falls back to primary)
 *   DATABASE_URL         - Legacy fallback (used if PRIMARY not set)
 * 
 * @module lib/prismaClients
 */

const { PrismaClient } = require('@prisma/client');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Connection pool settings
  primary: {
    connectionLimit: parseInt(process.env.PRIMARY_CONNECTION_LIMIT || '10', 10),
    poolTimeout: parseInt(process.env.PRIMARY_POOL_TIMEOUT || '10', 10),
  },
  replica: {
    connectionLimit: parseInt(process.env.REPLICA_CONNECTION_LIMIT || '20', 10),
    poolTimeout: parseInt(process.env.REPLICA_POOL_TIMEOUT || '10', 10),
  },
  // Logging
  logLevel: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'warn', 'error'],
};

// ============================================================================
// CLIENT INSTANCES
// ============================================================================

let prismaPrimary = null;
let prismaReplica = null;
let primaryConnecting = null;
let replicaConnecting = null;

/**
 * Get the database URL for primary
 */
function getPrimaryUrl() {
  return process.env.DATABASE_URL_PRIMARY || process.env.DATABASE_URL;
}

/**
 * Get the database URL for replica
 * Falls back to primary if not configured
 */
function getReplicaUrl() {
  return process.env.DATABASE_URL_REPLICA || getPrimaryUrl();
}

/**
 * Check if a separate replica is configured
 */
function hasReplicaConfigured() {
  return !!process.env.DATABASE_URL_REPLICA && 
         process.env.DATABASE_URL_REPLICA !== getPrimaryUrl();
}

/**
 * Create a Prisma client with the given configuration
 */
function createPrismaClient(url, name, poolConfig) {
  if (!url) {
    console.warn(`[prismaClients] No database URL for ${name}`);
    return null;
  }

  // Append connection pool params to URL if not present
  const urlWithPool = appendPoolParams(url, poolConfig);

  const client = new PrismaClient({
    datasources: {
      db: { url: urlWithPool },
    },
    log: config.logLevel.map(level => ({
      emit: 'event',
      level,
    })),
  });

  // Add logging with client identifier
  client.$on('query', (e) => {
    if (process.env.LOG_QUERIES === 'true') {
      console.log(`[${name}] Query: ${e.query} | Duration: ${e.duration}ms`);
    }
  });

  client.$on('error', (e) => {
    console.error(`[${name}] Error:`, e.message);
  });

  client.$on('warn', (e) => {
    console.warn(`[${name}] Warning:`, e.message);
  });

  return client;
}

/**
 * Append pool parameters to database URL
 */
function appendPoolParams(url, poolConfig) {
  try {
    const urlObj = new URL(url);
    
    // Only add if not already present
    if (!urlObj.searchParams.has('connection_limit')) {
      urlObj.searchParams.set('connection_limit', poolConfig.connectionLimit.toString());
    }
    if (!urlObj.searchParams.has('pool_timeout')) {
      urlObj.searchParams.set('pool_timeout', poolConfig.poolTimeout.toString());
    }
    
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Initialize primary client (lazy)
 */
function getPrimary() {
  if (prismaPrimary) return prismaPrimary;

  prismaPrimary = createPrismaClient(getPrimaryUrl(), 'primary', config.primary);
  
  if (prismaPrimary && !primaryConnecting) {
    primaryConnecting = prismaPrimary.$connect()
      .then(() => {
        console.log('[prismaClients] Primary database connected');
      })
      .catch((err) => {
        console.error('[prismaClients] Primary database connection failed:', err.message);
      });
  }

  // Store globally for singleton pattern
  globalThis.__prismaPrimary = prismaPrimary;

  return prismaPrimary;
}

/**
 * Initialize replica client (lazy)
 * Falls back to primary if replica not configured or fails
 */
function getReplica() {
  if (prismaReplica) return prismaReplica;

  // If no separate replica configured, use primary
  if (!hasReplicaConfigured()) {
    console.log('[prismaClients] No replica configured, using primary for reads');
    return getPrimary();
  }

  prismaReplica = createPrismaClient(getReplicaUrl(), 'replica', config.replica);

  if (prismaReplica && !replicaConnecting) {
    replicaConnecting = prismaReplica.$connect()
      .then(() => {
        console.log('[prismaClients] Replica database connected');
      })
      .catch((err) => {
        console.error('[prismaClients] Replica database connection failed:', err.message);
        console.log('[prismaClients] Will fall back to primary for reads');
      });
  }

  // Store globally for singleton pattern
  globalThis.__prismaReplica = prismaReplica;

  return prismaReplica;
}

/**
 * Disconnect all clients gracefully
 */
async function disconnectAll() {
  const promises = [];
  
  if (prismaPrimary) {
    promises.push(
      prismaPrimary.$disconnect()
        .then(() => console.log('[prismaClients] Primary disconnected'))
        .catch((err) => console.error('[prismaClients] Primary disconnect error:', err.message))
    );
  }
  
  if (prismaReplica && prismaReplica !== prismaPrimary) {
    promises.push(
      prismaReplica.$disconnect()
        .then(() => console.log('[prismaClients] Replica disconnected'))
        .catch((err) => console.error('[prismaClients] Replica disconnect error:', err.message))
    );
  }

  await Promise.all(promises);
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

// Handle process shutdown
const shutdownHandler = async () => {
  console.log('[prismaClients] Shutting down database connections...');
  await disconnectAll();
};

// Register shutdown handlers (only once)
if (!globalThis.__prismaShutdownRegistered) {
  process.on('beforeExit', shutdownHandler);
  process.on('SIGINT', async () => {
    await shutdownHandler();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await shutdownHandler();
    process.exit(0);
  });
  globalThis.__prismaShutdownRegistered = true;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Lazy getters
  getPrimary,
  getReplica,
  
  // Direct access (initialized on first access)
  get prismaPrimary() { return getPrimary(); },
  get prismaReplica() { return getReplica(); },
  
  // Utilities
  hasReplicaConfigured,
  disconnectAll,
  
  // Aliases for compatibility
  getWriteClient: getPrimary,
  getReadClient: getReplica,
};
