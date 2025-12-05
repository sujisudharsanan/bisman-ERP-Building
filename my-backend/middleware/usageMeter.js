/**
 * Usage Metering Middleware
 * ==========================
 * 
 * Tracks API calls per tenant per day. Uses batched writes for performance.
 * 
 * Features:
 * - Batched database writes (configurable batch size and interval)
 * - In-memory buffering to reduce DB load
 * - Skips health/metrics endpoints
 * - Tracks unique active users per day
 * - Records feature-specific usage
 * 
 * Usage:
 *   const { usageMeter, flushUsageBuffer } = require('./middleware/usageMeter');
 *   app.use(usageMeter);
 * 
 * Environment:
 *   USAGE_METER_ENABLED=true
 *   USAGE_METER_BATCH_SIZE=100
 *   USAGE_METER_FLUSH_INTERVAL_MS=5000
 * 
 * @module middleware/usageMeter
 */

const { getPrimary } = require('../lib/prismaClients');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  enabled: process.env.USAGE_METER_ENABLED !== 'false',
  batchSize: parseInt(process.env.USAGE_METER_BATCH_SIZE || '100', 10),
  flushIntervalMs: parseInt(process.env.USAGE_METER_FLUSH_INTERVAL_MS || '5000', 10),
  
  // Paths to skip
  skipPaths: [
    '/api/health',
    '/api/healthz',
    '/health',
    '/healthz',
    '/metrics',
    '/api/metrics',
    '/ready',
    '/live',
    '/favicon.ico',
    '/robots.txt',
  ],
  
  // Path prefixes to skip
  skipPrefixes: [
    '/api/health/',
    '/metrics/',
    '/_next/',
    '/static/',
  ],
};

// ============================================================================
// IN-MEMORY BUFFER
// ============================================================================

/**
 * Buffer structure:
 * {
 *   "tenantId:date": {
 *     tenantId: string,
 *     date: string (YYYY-MM-DD),
 *     apiCalls: number,
 *     activeUsers: Set<string>,
 *     featureUsage: { [feature]: number },
 *   }
 * }
 */
const usageBuffer = new Map();

/**
 * Get buffer key for tenant and date
 */
function getBufferKey(tenantId, date) {
  return `${tenantId}:${date}`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Increment usage in buffer
 */
function incrementUsage(tenantId, userId = null, feature = null) {
  if (!tenantId) return;
  
  const date = getTodayDate();
  const key = getBufferKey(tenantId, date);
  
  if (!usageBuffer.has(key)) {
    usageBuffer.set(key, {
      tenantId,
      date,
      apiCalls: 0,
      activeUsers: new Set(),
      featureUsage: {},
    });
  }
  
  const entry = usageBuffer.get(key);
  entry.apiCalls++;
  
  if (userId) {
    entry.activeUsers.add(userId.toString());
  }
  
  if (feature) {
    entry.featureUsage[feature] = (entry.featureUsage[feature] || 0) + 1;
  }
  
  // Check if we should flush
  if (getTotalBufferSize() >= config.batchSize) {
    flushUsageBuffer().catch(err => {
      console.error('[usageMeter] Flush error:', err.message);
    });
  }
}

/**
 * Get total number of records in buffer
 */
function getTotalBufferSize() {
  return usageBuffer.size;
}

// ============================================================================
// DATABASE FLUSH
// ============================================================================

let flushInProgress = false;
let flushInterval = null;

/**
 * Flush usage buffer to database
 */
async function flushUsageBuffer() {
  if (flushInProgress || usageBuffer.size === 0) {
    return { flushed: 0 };
  }
  
  flushInProgress = true;
  
  try {
    const prisma = getPrimary();
    if (!prisma) {
      console.warn('[usageMeter] Prisma client not available, skipping flush');
      return { flushed: 0, error: 'No database connection' };
    }
    
    // Copy and clear buffer atomically
    const entries = Array.from(usageBuffer.values());
    usageBuffer.clear();
    
    if (entries.length === 0) {
      return { flushed: 0 };
    }
    
    // Prepare upsert operations
    const operations = entries.map(entry => {
      return prisma.tenantUsage.upsert({
        where: {
          tenant_usage_tenant_date_unique: {
            tenantId: entry.tenantId,
            date: new Date(entry.date),
          },
        },
        update: {
          apiCalls: { increment: entry.apiCalls },
          activeUsers: entry.activeUsers.size,
          featureUsage: entry.featureUsage,
        },
        create: {
          tenantId: entry.tenantId,
          date: new Date(entry.date),
          apiCalls: entry.apiCalls,
          activeUsers: entry.activeUsers.size,
          featureUsage: entry.featureUsage,
        },
      });
    });
    
    // Execute all upserts in a transaction
    await prisma.$transaction(operations);
    
    if (process.env.LOG_USAGE_METER === 'true') {
      console.log(`[usageMeter] Flushed ${entries.length} usage records`);
    }
    
    return { flushed: entries.length };
  } catch (error) {
    console.error('[usageMeter] Flush failed:', error.message);
    
    // On error, we lose the data - could implement retry logic here
    return { flushed: 0, error: error.message };
  } finally {
    flushInProgress = false;
  }
}

/**
 * Start periodic flush interval
 */
function startFlushInterval() {
  if (flushInterval) return;
  
  flushInterval = setInterval(() => {
    flushUsageBuffer().catch(err => {
      console.error('[usageMeter] Periodic flush error:', err.message);
    });
  }, config.flushIntervalMs);
  
  // Ensure interval doesn't prevent process exit
  if (flushInterval.unref) {
    flushInterval.unref();
  }
}

/**
 * Stop periodic flush interval
 */
function stopFlushInterval() {
  if (flushInterval) {
    clearInterval(flushInterval);
    flushInterval = null;
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Check if path should be skipped
 */
function shouldSkipPath(path) {
  // Exact matches
  if (config.skipPaths.includes(path)) {
    return true;
  }
  
  // Prefix matches
  for (const prefix of config.skipPrefixes) {
    if (path.startsWith(prefix)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract feature name from request path
 */
function extractFeature(req) {
  // Extract feature from path like /api/products -> "products"
  const match = req.path.match(/^\/api\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Usage metering middleware
 */
function usageMeter(req, res, next) {
  // Check if enabled
  if (!config.enabled) {
    return next();
  }
  
  // Skip certain paths
  if (shouldSkipPath(req.path)) {
    return next();
  }
  
  // Get tenant ID from user or header
  const tenantId = req.user?.tenant_id || 
                   req.user?.tenantId ||
                   req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return next();
  }
  
  // Get user ID if available
  const userId = req.user?.id || req.user?.userId || null;
  
  // Extract feature from path
  const feature = extractFeature(req);
  
  // Increment usage (non-blocking)
  try {
    incrementUsage(tenantId, userId, feature);
  } catch (error) {
    // Don't fail the request if metering fails
    console.error('[usageMeter] Error incrementing usage:', error.message);
  }
  
  next();
}

// ============================================================================
// FEATURE USAGE TRACKING
// ============================================================================

/**
 * Track specific feature usage (call from routes/services)
 * @param {string} tenantId - Tenant ID
 * @param {string} feature - Feature name (e.g., 'report_generated', 'export_csv')
 * @param {string} [userId] - Optional user ID
 */
function trackFeatureUsage(tenantId, feature, userId = null) {
  if (!config.enabled || !tenantId || !feature) return;
  
  const date = getTodayDate();
  const key = getBufferKey(tenantId, date);
  
  if (!usageBuffer.has(key)) {
    usageBuffer.set(key, {
      tenantId,
      date,
      apiCalls: 0,
      activeUsers: new Set(),
      featureUsage: {},
    });
  }
  
  const entry = usageBuffer.get(key);
  entry.featureUsage[feature] = (entry.featureUsage[feature] || 0) + 1;
  
  if (userId) {
    entry.activeUsers.add(userId.toString());
  }
}

// ============================================================================
// STORAGE TRACKING
// ============================================================================

/**
 * Update storage usage for a tenant
 * @param {string} tenantId - Tenant ID
 * @param {number} bytes - Total storage bytes
 */
async function updateStorageUsage(tenantId, bytes) {
  if (!tenantId) return;
  
  try {
    const prisma = getPrimary();
    if (!prisma) return;
    
    const date = new Date(getTodayDate());
    
    await prisma.tenantUsage.upsert({
      where: {
        tenant_usage_tenant_date_unique: {
          tenantId,
          date,
        },
      },
      update: {
        storageBytes: bytes,
      },
      create: {
        tenantId,
        date,
        storageBytes: bytes,
      },
    });
  } catch (error) {
    console.error('[usageMeter] Error updating storage:', error.message);
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get current buffer statistics
 */
function getBufferStats() {
  const stats = {
    entriesInBuffer: usageBuffer.size,
    totalApiCalls: 0,
    tenants: [],
  };
  
  for (const [key, entry] of usageBuffer) {
    stats.totalApiCalls += entry.apiCalls;
    stats.tenants.push({
      tenantId: entry.tenantId,
      date: entry.date,
      apiCalls: entry.apiCalls,
      activeUsers: entry.activeUsers.size,
    });
  }
  
  return stats;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Start flush interval when module loads
if (config.enabled) {
  startFlushInterval();
  
  // Flush on process exit
  const exitHandler = async () => {
    stopFlushInterval();
    await flushUsageBuffer();
  };
  
  process.on('beforeExit', exitHandler);
  process.on('SIGINT', async () => {
    await exitHandler();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await exitHandler();
    process.exit(0);
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  usageMeter,
  flushUsageBuffer,
  trackFeatureUsage,
  updateStorageUsage,
  getBufferStats,
  startFlushInterval,
  stopFlushInterval,
  config,
};
