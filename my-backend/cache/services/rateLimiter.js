/**
 * Rate Limiting Service
 * 
 * Redis-backed rate limiting with:
 * - Sliding window algorithm
 * - Per-endpoint configuration
 * - IP-based tracking
 * - Graceful degradation (fail-open)
 * 
 * Key pattern: rate:{ip}:{endpoint} → INT (expire = window sec)
 * 
 * @module cache/services/rateLimiter
 */

const { redis, isEnabled } = require('../redisClient');
const { rateKey } = require('../namespaces');

// Default rate limit configurations
const DEFAULT_LIMITS = {
  // Auth endpoints - stricter limits
  '/api/auth/login': { max: 5, windowSec: 60 },          // 5 per minute
  '/api/auth/register': { max: 3, windowSec: 60 },       // 3 per minute
  '/api/auth/forgot-password': { max: 3, windowSec: 300 }, // 3 per 5 min
  '/api/auth/reset-password': { max: 3, windowSec: 300 }, // 3 per 5 min
  
  // OTP endpoints
  '/api/otp/send': { max: 3, windowSec: 60 },            // 3 per minute
  '/api/otp/verify': { max: 5, windowSec: 60 },          // 5 per minute
  
  // Payment endpoints - moderate limits
  '/api/payments': { max: 30, windowSec: 60 },           // 30 per minute
  '/api/approvals': { max: 30, windowSec: 60 },          // 30 per minute
  
  // Default for all other endpoints
  default: { max: 100, windowSec: 60 }                   // 100 per minute
};

// Custom limits can be set via environment or runtime configuration
let customLimits = {};

/**
 * Set custom rate limits (e.g., from config file or admin panel)
 */
function setCustomLimits(limits) {
  customLimits = { ...customLimits, ...limits };
}

/**
 * Get rate limit configuration for an endpoint
 */
function getLimitConfig(endpoint) {
  // Check custom limits first
  if (customLimits[endpoint]) {
    return customLimits[endpoint];
  }
  
  // Check default limits
  if (DEFAULT_LIMITS[endpoint]) {
    return DEFAULT_LIMITS[endpoint];
  }
  
  // Match by prefix (e.g., /api/auth/* matches /api/auth/login)
  for (const [pattern, config] of Object.entries(DEFAULT_LIMITS)) {
    if (pattern !== 'default' && endpoint.startsWith(pattern)) {
      return config;
    }
  }
  
  return DEFAULT_LIMITS.default;
}

/**
 * Check and increment rate limit counter
 * 
 * @param {string} ip - Client IP address
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Optional overrides
 * @param {number} options.max - Max requests in window
 * @param {number} options.windowSec - Window size in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number, total: number}>}
 */
async function checkLimit(ip, endpoint, options = {}) {
  // Fail-open if Redis is not available
  if (!isEnabled()) {
    return { 
      allowed: true, 
      remaining: Infinity, 
      resetIn: 0, 
      total: 0,
      source: 'disabled'
    };
  }

  const config = { ...getLimitConfig(endpoint), ...options };
  const { max, windowSec } = config;
  const key = rateKey(ip, endpoint);

  try {
    // Atomic increment and get
    const multi = redis.multi();
    multi.incr(key);
    multi.ttl(key);
    const results = await multi.exec();

    const count = results[0][1];
    let ttl = results[1][1];

    // Set expiry on first request
    if (ttl === -1) {
      await redis.expire(key, windowSec);
      ttl = windowSec;
    }

    const allowed = count <= max;
    const remaining = Math.max(0, max - count);

    return {
      allowed,
      remaining,
      resetIn: ttl,
      total: count,
      limit: max,
      source: 'redis'
    };
  } catch (error) {
    console.warn('[rateLimiter] checkLimit error:', error.message);
    // Fail-open on error
    return { 
      allowed: true, 
      remaining: Infinity, 
      resetIn: 0, 
      total: 0,
      source: 'error'
    };
  }
}

/**
 * Check rate limit without incrementing (peek)
 */
async function peekLimit(ip, endpoint) {
  if (!isEnabled()) {
    return { current: 0, limit: Infinity, remaining: Infinity };
  }

  const config = getLimitConfig(endpoint);
  const key = rateKey(ip, endpoint);

  try {
    const [count, ttl] = await Promise.all([
      redis.get(key),
      redis.ttl(key)
    ]);

    const current = parseInt(count, 10) || 0;
    const remaining = Math.max(0, config.max - current);

    return {
      current,
      limit: config.max,
      remaining,
      resetIn: ttl > 0 ? ttl : config.windowSec
    };
  } catch (error) {
    console.warn('[rateLimiter] peekLimit error:', error.message);
    return { current: 0, limit: config.max, remaining: config.max };
  }
}

/**
 * Reset rate limit for an IP/endpoint (admin function)
 */
async function resetLimit(ip, endpoint) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const key = rateKey(ip, endpoint);
    await redis.del(key);
    return true;
  } catch (error) {
    console.warn('[rateLimiter] resetLimit error:', error.message);
    return false;
  }
}

/**
 * Reset all rate limits for an IP (e.g., after successful CAPTCHA)
 */
async function resetAllLimitsForIp(ip) {
  if (!isEnabled()) {
    return 0;
  }

  try {
    // Find all keys for this IP
    const pattern = `rate:${ip}:*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    return keys.length;
  } catch (error) {
    console.warn('[rateLimiter] resetAllLimitsForIp error:', error.message);
    return 0;
  }
}

/**
 * Get current rate limit status for an IP across all endpoints
 */
async function getIpStatus(ip) {
  if (!isEnabled()) {
    return {};
  }

  try {
    const pattern = `rate:${ip}:*`;
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return {};
    }

    const status = {};
    for (const key of keys) {
      const endpoint = key.replace(`rate:${ip}:`, '').replace(/_/g, '/');
      const [count, ttl] = await Promise.all([
        redis.get(key),
        redis.ttl(key)
      ]);
      
      const config = getLimitConfig(endpoint);
      status[endpoint] = {
        current: parseInt(count, 10) || 0,
        limit: config.max,
        resetIn: ttl
      };
    }

    return status;
  } catch (error) {
    console.warn('[rateLimiter] getIpStatus error:', error.message);
    return {};
  }
}

/**
 * Express middleware for rate limiting
 * 
 * @param {Object} options - Middleware options
 * @param {string} options.keyGenerator - Function to generate rate limit key (default: req.ip)
 * @param {Function} options.onLimit - Handler when rate limit exceeded
 * @param {number} options.max - Override max requests
 * @param {number} options.windowSec - Override window size
 */
function middleware(options = {}) {
  const {
    keyGenerator = (req) => req.ip || req.connection?.remoteAddress || 'unknown',
    onLimit = null,
    ...limitOptions
  } = options;

  return async (req, res, next) => {
    const ip = keyGenerator(req);
    const endpoint = req.baseUrl + req.path;

    const result = await checkLimit(ip, endpoint, limitOptions);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': result.limit || 'unlimited',
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + (result.resetIn || 0)
    });

    if (!result.allowed) {
      if (onLimit) {
        return onLimit(req, res, next, result);
      }
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: result.resetIn
      });
    }

    next();
  };
}

/**
 * Create a rate limiter for specific endpoint(s)
 */
function createLimiter(config) {
  return middleware(config);
}

// Pre-configured limiters
const authLimiter = middleware({ max: 5, windowSec: 60 });
const strictLimiter = middleware({ max: 3, windowSec: 60 });
const standardLimiter = middleware({ max: 100, windowSec: 60 });

module.exports = {
  // Core functions
  checkLimit,
  peekLimit,
  resetLimit,
  resetAllLimitsForIp,
  getIpStatus,
  
  // Configuration
  setCustomLimits,
  getLimitConfig,
  DEFAULT_LIMITS,
  
  // Middleware
  middleware,
  createLimiter,
  
  // Pre-configured limiters
  authLimiter,
  strictLimiter,
  standardLimiter
};
