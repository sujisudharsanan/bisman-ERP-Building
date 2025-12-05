/**
 * Query Router Middleware
 * ========================
 * 
 * Express middleware that automatically provides the correct database client
 * based on HTTP method (GET = replica, POST/PUT/DELETE = primary).
 * 
 * Also handles read-after-write scenarios by using primary for requests
 * that follow writes within the same session.
 * 
 * Usage:
 *   const { queryRouterMiddleware } = require('./middleware/queryRouter');
 *   app.use(queryRouterMiddleware);
 * 
 *   // In route handlers:
 *   app.get('/users', (req, res) => {
 *     const users = await req.db.user.findMany();  // Uses replica
 *   });
 * 
 *   app.post('/users', (req, res) => {
 *     const user = await req.db.user.create({...});  // Uses primary
 *   });
 * 
 * @module middleware/queryRouter
 */

const db = require('../lib/dbClient');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  // Methods that are considered writes
  writeMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  
  // Methods that are considered reads
  readMethods: ['GET', 'HEAD', 'OPTIONS'],
  
  // Cookie/header for read-after-write tracking
  writeTrackingHeader: 'X-Last-Write',
  writeTrackingCookie: 'last_write',
  
  // How long to use primary after a write (ms)
  readAfterWriteWindow: 5000, // 5 seconds
  
  // Paths that always use primary (regex patterns)
  alwaysPrimaryPaths: [
    /^\/api\/auth\//,      // Auth always needs consistency
    /^\/api\/admin\//,     // Admin operations
    /\/transaction$/,      // Explicit transaction endpoints
  ],
  
  // Paths that can safely use replica (regex patterns)
  replicaSafePaths: [
    /^\/api\/reports\//,   // Reports
    /^\/api\/analytics\//, // Analytics
    /^\/api\/search\//,    // Search
    /\/list$/,             // List endpoints
    /\/export$/,           // Export endpoints
  ],
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Query router middleware
 * Attaches appropriate database client to req.db
 */
function queryRouterMiddleware(req, res, next) {
  // Determine if this is a read or write operation
  const isWrite = config.writeMethods.includes(req.method);
  const isRead = config.readMethods.includes(req.method);
  
  // Check if we're in a read-after-write window
  const inWriteWindow = isInWriteWindow(req);
  
  // Check path-based overrides
  const forcePrimary = config.alwaysPrimaryPaths.some(p => p.test(req.path));
  const forceReplica = !forcePrimary && config.replicaSafePaths.some(p => p.test(req.path));
  
  // Determine which client to use
  let client;
  let routingReason;
  
  if (isWrite || forcePrimary || inWriteWindow) {
    client = db.write;
    routingReason = isWrite ? 'write-method' : 
                    forcePrimary ? 'force-primary-path' : 
                    'read-after-write';
  } else if (isRead) {
    if (forceReplica || db.isReplicaAvailable()) {
      client = db.read;
      routingReason = forceReplica ? 'force-replica-path' : 'read-method';
    } else {
      client = db.primary;
      routingReason = 'replica-unavailable';
    }
  } else {
    // Default to primary for unknown methods
    client = db.primary;
    routingReason = 'unknown-method';
  }
  
  // Attach to request
  req.db = client;
  req.dbRouting = {
    target: client === db.write ? 'primary' : 
            client === db.read ? 'replica' : 'primary',
    reason: routingReason,
    replicaAvailable: db.isReplicaAvailable(),
  };
  
  // Log routing decision if enabled
  if (process.env.LOG_DB_ROUTING === 'true') {
    console.log(`[queryRouter] ${req.method} ${req.path} -> ${req.dbRouting.target} (${routingReason})`);
  }
  
  // For writes, track the write timestamp
  if (isWrite) {
    const timestamp = Date.now();
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Successful write - set tracking header/cookie
        res.set(config.writeTrackingHeader, timestamp.toString());
        
        // If using cookies
        if (req.cookies) {
          res.cookie(config.writeTrackingCookie, timestamp.toString(), {
            maxAge: config.readAfterWriteWindow,
            httpOnly: true,
            sameSite: 'lax',
          });
        }
      }
    });
  }
  
  next();
}

/**
 * Check if we're within the read-after-write window
 */
function isInWriteWindow(req) {
  // Check header
  const headerTimestamp = req.get(config.writeTrackingHeader);
  if (headerTimestamp) {
    const writeTime = parseInt(headerTimestamp, 10);
    if (Date.now() - writeTime < config.readAfterWriteWindow) {
      return true;
    }
  }
  
  // Check cookie
  if (req.cookies && req.cookies[config.writeTrackingCookie]) {
    const writeTime = parseInt(req.cookies[config.writeTrackingCookie], 10);
    if (Date.now() - writeTime < config.readAfterWriteWindow) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// ROUTE DECORATORS
// ============================================================================

/**
 * Force a route handler to use primary database
 * @param {Function} handler - Express route handler
 * @returns {Function} Wrapped handler
 */
function usePrimary(handler) {
  return (req, res, next) => {
    req.db = db.primary;
    req.dbRouting = { target: 'primary', reason: 'decorator-force-primary' };
    return handler(req, res, next);
  };
}

/**
 * Force a route handler to use replica database
 * @param {Function} handler - Express route handler
 * @returns {Function} Wrapped handler
 */
function useReplica(handler) {
  return (req, res, next) => {
    req.db = db.read;
    req.dbRouting = { 
      target: db.isReplicaAvailable() ? 'replica' : 'primary', 
      reason: 'decorator-force-replica',
    };
    return handler(req, res, next);
  };
}

/**
 * Wrap a route handler to use primary for reads after any write in the handler
 * @param {Function} handler - Express route handler
 * @returns {Function} Wrapped handler
 */
function withPrimaryReads(handler) {
  return (req, res, next) => {
    return db.withPrimaryReads(() => handler(req, res, next));
  };
}

// ============================================================================
// HEALTH ENDPOINT
// ============================================================================

/**
 * Express route handler for replica health status
 */
async function replicaHealthHandler(req, res) {
  const health = db.getReplicaHealth();
  
  res.json({
    status: health.available ? 'healthy' : 'degraded',
    replica: {
      configured: health.replicaConfigured,
      available: health.available,
      healthy: health.healthy,
      consecutiveFailures: health.consecutiveFailures,
      lastError: health.lastError,
      lastCheck: new Date(health.lastCheck).toISOString(),
      totalFailovers: health.totalFailovers,
    },
    primary: {
      available: true, // Assumed always available
    },
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  queryRouterMiddleware,
  usePrimary,
  useReplica,
  withPrimaryReads,
  replicaHealthHandler,
  config,
};
