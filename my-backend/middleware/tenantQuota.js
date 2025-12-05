/**
 * Tenant Quota Middleware
 * ========================
 * 
 * Redis-backed per-tenant rate limiting with plan-based quotas.
 * 
 * Features:
 * - Per-minute and per-day rate limits
 * - Plan-based quotas (free/pro/enterprise)
 * - Redis-backed counters with automatic TTL
 * - Graceful fallback when Redis is unavailable
 * - Admin override support
 * - Rate limit headers (X-RateLimit-*)
 * 
 * Usage:
 *   const { tenantQuota } = require('./middleware/tenantQuota');
 *   app.use(tenantQuota);
 * 
 * Environment:
 *   REDIS_URL=redis://localhost:6379
 *   QUOTA_FREE_PER_MINUTE=60
 *   QUOTA_FREE_PER_DAY=5000
 *   QUOTA_PRO_PER_MINUTE=300
 *   QUOTA_PRO_PER_DAY=50000
 *   QUOTA_ENTERPRISE_PER_MINUTE=1000
 *   QUOTA_ENTERPRISE_PER_DAY=500000
 * 
 * @module middleware/tenantQuota
 */

const Redis = require('ioredis');
const { getPrimary } = require('../lib/prismaClients');

// ============================================================================
// REDIS CONNECTION
// ============================================================================

let redis = null;
let redisAvailable = false;

function getRedis() {
  if (redis) return redis;
  
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5000,
    });
    
    redis.on('ready', () => {
      redisAvailable = true;
      console.log('[tenantQuota] Redis connected');
    });
    
    redis.on('error', (err) => {
      console.error('[tenantQuota] Redis error:', err.message);
      redisAvailable = false;
    });
    
    redis.on('close', () => {
      redisAvailable = false;
    });
    
    // Connect
    redis.connect().catch((err) => {
      console.error('[tenantQuota] Redis connection failed:', err.message);
    });
    
  } catch (error) {
    console.error('[tenantQuota] Failed to create Redis client:', error.message);
  }
  
  return redis;
}

// ============================================================================
// DEFAULT QUOTAS BY PLAN
// ============================================================================

const DEFAULT_QUOTAS = {
  free: {
    perMinute: parseInt(process.env.QUOTA_FREE_PER_MINUTE || '60', 10),
    perDay: parseInt(process.env.QUOTA_FREE_PER_DAY || '5000', 10),
    storageBytesLimit: 1073741824, // 1GB
    activeUsersLimit: 5,
  },
  pro: {
    perMinute: parseInt(process.env.QUOTA_PRO_PER_MINUTE || '300', 10),
    perDay: parseInt(process.env.QUOTA_PRO_PER_DAY || '50000', 10),
    storageBytesLimit: 10737418240, // 10GB
    activeUsersLimit: 25,
  },
  enterprise: {
    perMinute: parseInt(process.env.QUOTA_ENTERPRISE_PER_MINUTE || '1000', 10),
    perDay: parseInt(process.env.QUOTA_ENTERPRISE_PER_DAY || '500000', 10),
    storageBytesLimit: 107374182400, // 100GB
    activeUsersLimit: -1, // unlimited
  },
};

// ============================================================================
// QUOTA CACHE
// ============================================================================

const quotaCache = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Get quota for a tenant (with caching)
 */
async function getTenantQuota(tenantId) {
  // Check cache first
  const cached = quotaCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.quota;
  }
  
  // Try to fetch from database
  try {
    const prisma = getPrimary();
    if (prisma) {
      const tenantQuota = await prisma.tenantQuota.findUnique({
        where: { tenantId },
      });
      
      if (tenantQuota) {
        const quota = {
          plan: tenantQuota.plan,
          perMinute: tenantQuota.apiCallsPerMinute,
          perDay: tenantQuota.apiCallsPerDay,
          storageBytesLimit: Number(tenantQuota.storageBytesLimit),
          activeUsersLimit: tenantQuota.activeUsersLimit,
          isUnlimited: tenantQuota.isUnlimited,
          customLimits: tenantQuota.customLimits,
        };
        
        // Apply custom limits if defined
        if (quota.customLimits) {
          Object.assign(quota, quota.customLimits);
        }
        
        // Cache it
        quotaCache.set(tenantId, { quota, timestamp: Date.now() });
        
        return quota;
      }
    }
  } catch (error) {
    console.error('[tenantQuota] Error fetching quota:', error.message);
  }
  
  // Try Redis cache
  try {
    const redis = getRedis();
    if (redis && redisAvailable) {
      const cached = await redis.get(`quota:config:${tenantId}`);
      if (cached) {
        const quota = JSON.parse(cached);
        quotaCache.set(tenantId, { quota, timestamp: Date.now() });
        return quota;
      }
    }
  } catch (error) {
    console.error('[tenantQuota] Redis cache error:', error.message);
  }
  
  // Return default free tier
  return { ...DEFAULT_QUOTAS.free, plan: 'free', isUnlimited: false };
}

/**
 * Set quota for a tenant (admin function)
 */
async function setTenantQuota(tenantId, plan, customLimits = null) {
  const baseQuota = DEFAULT_QUOTAS[plan] || DEFAULT_QUOTAS.free;
  
  try {
    const prisma = getPrimary();
    if (prisma) {
      await prisma.tenantQuota.upsert({
        where: { tenantId },
        update: {
          plan,
          apiCallsPerMinute: baseQuota.perMinute,
          apiCallsPerDay: baseQuota.perDay,
          storageBytesLimit: baseQuota.storageBytesLimit,
          activeUsersLimit: baseQuota.activeUsersLimit,
          customLimits,
        },
        create: {
          tenantId,
          plan,
          apiCallsPerMinute: baseQuota.perMinute,
          apiCallsPerDay: baseQuota.perDay,
          storageBytesLimit: baseQuota.storageBytesLimit,
          activeUsersLimit: baseQuota.activeUsersLimit,
          customLimits,
        },
      });
    }
    
    // Update Redis cache
    const redis = getRedis();
    if (redis && redisAvailable) {
      const quota = { ...baseQuota, plan, ...customLimits };
      await redis.setex(`quota:config:${tenantId}`, 3600, JSON.stringify(quota));
    }
    
    // Invalidate local cache
    quotaCache.delete(tenantId);
    
    return true;
  } catch (error) {
    console.error('[tenantQuota] Error setting quota:', error.message);
    return false;
  }
}

/**
 * Invalidate quota cache for a tenant
 */
function invalidateQuotaCache(tenantId) {
  quotaCache.delete(tenantId);
}

// ============================================================================
// DENYLIST
// ============================================================================

const denylist = new Set();

/**
 * Add tenant to denylist (immediate block)
 */
function addToDenylist(tenantId, reason = 'manual') {
  denylist.add(tenantId);
  console.warn(`[tenantQuota] Tenant ${tenantId} added to denylist: ${reason}`);
}

/**
 * Remove tenant from denylist
 */
function removeFromDenylist(tenantId) {
  denylist.delete(tenantId);
  console.log(`[tenantQuota] Tenant ${tenantId} removed from denylist`);
}

/**
 * Check if tenant is denylisted
 */
function isDenylisted(tenantId) {
  return denylist.has(tenantId);
}

// ============================================================================
// ADMIN BYPASS
// ============================================================================

const adminBypassTokens = new Set();

/**
 * Add admin bypass token
 */
function addAdminBypass(token) {
  adminBypassTokens.add(token);
}

/**
 * Check if request has admin bypass
 */
function hasAdminBypass(req) {
  const bypassToken = req.headers['x-quota-bypass'] || req.query.quota_bypass;
  if (bypassToken && adminBypassTokens.has(bypassToken)) {
    return true;
  }
  
  // Also bypass for super admins
  if (req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ENTERPRISE_ADMIN') {
    return true;
  }
  
  return false;
}

// ============================================================================
// RATE LIMIT KEYS
// ============================================================================

/**
 * Get Redis key for minute-based rate limit
 */
function getMinuteKey(tenantId) {
  const minute = Math.floor(Date.now() / 60000);
  return `quota:${tenantId}:min:${minute}`;
}

/**
 * Get Redis key for day-based rate limit
 */
function getDayKey(tenantId) {
  const day = new Date().toISOString().slice(0, 10);
  return `quota:${tenantId}:day:${day}`;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Skip paths that shouldn't be rate limited
 */
const SKIP_PATHS = [
  '/api/health',
  '/api/healthz',
  '/health',
  '/healthz',
  '/metrics',
  '/api/metrics',
];

/**
 * Tenant quota middleware
 */
async function tenantQuota(req, res, next) {
  // Skip certain paths
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }
  
  // Get tenant ID
  const tenantId = req.user?.tenant_id || 
                   req.user?.tenantId ||
                   req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return next();
  }
  
  // Check admin bypass
  if (hasAdminBypass(req)) {
    res.set('X-RateLimit-Bypass', 'admin');
    return next();
  }
  
  // Check denylist
  if (isDenylisted(tenantId)) {
    return res.status(403).json({
      error: 'tenant_blocked',
      message: 'This tenant has been blocked. Please contact support.',
    });
  }
  
  // Get quota configuration
  const quota = await getTenantQuota(tenantId);
  
  // Check if unlimited
  if (quota.isUnlimited) {
    res.set('X-RateLimit-Bypass', 'unlimited');
    return next();
  }
  
  // Check Redis availability
  const redis = getRedis();
  if (!redis || !redisAvailable) {
    // Fallback: allow request but log warning
    console.warn('[tenantQuota] Redis unavailable, allowing request');
    return next();
  }
  
  try {
    const minuteKey = getMinuteKey(tenantId);
    const dayKey = getDayKey(tenantId);
    
    // Increment both counters atomically
    const pipeline = redis.pipeline();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 70); // Slightly longer than 1 minute
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 86400); // 24 hours
    
    const results = await pipeline.exec();
    
    const minuteUsed = parseInt(results[0][1], 10);
    const dayUsed = parseInt(results[2][1], 10);
    
    // Set rate limit headers
    res.set('X-RateLimit-Limit-Minute', quota.perMinute.toString());
    res.set('X-RateLimit-Remaining-Minute', Math.max(0, quota.perMinute - minuteUsed).toString());
    res.set('X-RateLimit-Limit-Day', quota.perDay.toString());
    res.set('X-RateLimit-Remaining-Day', Math.max(0, quota.perDay - dayUsed).toString());
    res.set('X-RateLimit-Plan', quota.plan);
    
    // Check limits
    if (minuteUsed > quota.perMinute) {
      res.set('Retry-After', '60');
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please slow down.',
        limit: 'per_minute',
        limitValue: quota.perMinute,
        used: minuteUsed,
        retryAfter: 60,
      });
    }
    
    if (dayUsed > quota.perDay) {
      // Calculate seconds until midnight UTC
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCHours(24, 0, 0, 0);
      const retryAfter = Math.ceil((midnight - now) / 1000);
      
      res.set('Retry-After', retryAfter.toString());
      return res.status(429).json({
        error: 'quota_exceeded',
        message: 'Daily API quota exceeded. Please upgrade your plan or wait until tomorrow.',
        limit: 'per_day',
        limitValue: quota.perDay,
        used: dayUsed,
        retryAfter,
        upgradeUrl: '/pricing',
      });
    }
    
    next();
  } catch (error) {
    console.error('[tenantQuota] Error checking quota:', error.message);
    // On error, allow the request to proceed
    next();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current usage for a tenant
 */
async function getCurrentUsage(tenantId) {
  const redis = getRedis();
  if (!redis || !redisAvailable) {
    return null;
  }
  
  try {
    const minuteKey = getMinuteKey(tenantId);
    const dayKey = getDayKey(tenantId);
    
    const [minuteUsed, dayUsed] = await redis.mget(minuteKey, dayKey);
    
    return {
      minuteUsed: parseInt(minuteUsed || '0', 10),
      dayUsed: parseInt(dayUsed || '0', 10),
    };
  } catch (error) {
    console.error('[tenantQuota] Error getting usage:', error.message);
    return null;
  }
}

/**
 * Reset usage counters for a tenant (admin function)
 */
async function resetUsage(tenantId, scope = 'all') {
  const redis = getRedis();
  if (!redis || !redisAvailable) {
    return false;
  }
  
  try {
    const keysToDelete = [];
    
    if (scope === 'all' || scope === 'minute') {
      keysToDelete.push(getMinuteKey(tenantId));
    }
    
    if (scope === 'all' || scope === 'day') {
      keysToDelete.push(getDayKey(tenantId));
    }
    
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }
    
    return true;
  } catch (error) {
    console.error('[tenantQuota] Error resetting usage:', error.message);
    return false;
  }
}

/**
 * Get quota statistics for monitoring
 */
async function getQuotaStats() {
  const redis = getRedis();
  
  return {
    redisAvailable,
    cachedQuotas: quotaCache.size,
    denylistSize: denylist.size,
    defaultPlans: Object.keys(DEFAULT_QUOTAS),
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize Redis connection on module load
getRedis();

// Load admin bypass tokens from environment
if (process.env.QUOTA_BYPASS_TOKENS) {
  const tokens = process.env.QUOTA_BYPASS_TOKENS.split(',');
  tokens.forEach(token => adminBypassTokens.add(token.trim()));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  tenantQuota,
  getTenantQuota,
  setTenantQuota,
  invalidateQuotaCache,
  getCurrentUsage,
  resetUsage,
  addToDenylist,
  removeFromDenylist,
  isDenylisted,
  addAdminBypass,
  getQuotaStats,
  DEFAULT_QUOTAS,
};
