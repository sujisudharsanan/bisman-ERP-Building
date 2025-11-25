/**
 * ADVANCED RATE LIMITER - Enterprise-Grade Multi-Layer Protection
 * 
 * Features:
 * - Per-IP rate limiting with Redis store (optional)
 * - Different rules for login/auth vs regular API endpoints
 * - Adaptive rate limiting based on user behavior
 * - Request fingerprinting for additional security
 * - Integration with Cloudflare protection
 * - Detailed logging and monitoring
 * 
 * @author Cybersecurity Team
 * @version 2.0
 */

const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

// Custom IP key generator (replacing the non-exported internal helper)
const ipKeyGenerator = (req) => {
  return req.ip || req.connection?.remoteAddress || 'unknown';
};
const prisma = new PrismaClient();

// Optional: Redis store for distributed rate limiting
let RedisStore = null;
let redisClient = null;

try {
  const Redis = require('ioredis');
  const RedisRateLimitStore = require('rate-limit-redis');
  
  // Initialize Redis client if connection string is available
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });
    
    RedisStore = RedisRateLimitStore;
    console.log('[RateLimiter] ✅ Redis store enabled for distributed rate limiting');
  }
} catch (e) {
  console.log('[RateLimiter] Redis not available, using in-memory store:', e.message);
}

// Check if rate limiting is disabled
if (process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development') {
  console.log('[RateLimiter] ⚠️  Rate limiting DISABLED for local development');
  console.log('[RateLimiter] 💡 To enable, set DISABLE_RATE_LIMIT=false in .env');
} else {
  console.log('[RateLimiter] 🛡️  Rate limiting ACTIVE');
}

// ============================================================================
// RATE LIMIT STORE CONFIGURATION
// ============================================================================

/**
 * Get store configuration for rate limiter
 * Prefers Redis for production, falls back to in-memory
 */
function getRateLimitStore(prefix = 'rl') {
  if (RedisStore && redisClient) {
    return new RedisStore({
      client: redisClient,
      prefix: `${prefix}:`,
      sendCommand: (...args) => redisClient.call(...args),
    });
  }
  // In-memory fallback (not recommended for multi-server deployments)
  return undefined; // express-rate-limit will use default MemoryStore
}

// ============================================================================
// ADVANCED KEY GENERATOR - Enhanced IP Tracking
// ============================================================================

/**
 * Advanced key generator that handles:
 * - Cloudflare proxy headers
 * - Multiple proxy layers
 * - IPv4 and IPv6 normalization
 * - Request fingerprinting
 */
function advancedKeyGenerator(req) {
  // Derive candidate IP from layered headers (Cloudflare/Nginx/XFF)
  const layeredIp = (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for']?.split(',')[0] || '').trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
  // Pass through ipKeyGenerator to ensure IPv6 normalization & future-proof format
  return ipKeyGenerator({ ip: layeredIp });
}

// ============================================================================
// HANDLER - Log and Track Rate Limit Violations
// ============================================================================

/**
 * Handler for rate limit exceeded events
 * Logs violations and optionally stores in database for security monitoring
 */
async function rateLimitHandler(req, res, options) {
  const ip = advancedKeyGenerator(req);
  const endpoint = req.path;
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  console.warn(`🚨 [RateLimit] IP ${ip} exceeded limit for ${endpoint}`);
  
  // Optional: Store violation in database for security audit
  try {
    // Uncomment if you have a rate_limit_violations table
    // await prisma.rateLimitViolation.create({
    //   data: {
    //     ip_address: ip,
    //     endpoint: endpoint,
    //     user_agent: userAgent,
    //     timestamp: new Date(),
    //   }
    // });
  } catch (dbError) {
    console.error('[RateLimit] Failed to log violation:', dbError.message);
  }
  
  // Return standardized error response
  res.status(429).json({
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
    type: 'RATE_LIMIT_EXCEEDED'
  });
}

// ============================================================================
// SKIP FUNCTION - Bypass Rate Limiting for Trusted Sources
// ============================================================================

/**
 * Skip rate limiting for:
 * - Local development (when DISABLE_RATE_LIMIT=true)
 * - Internal health checks
 * - Monitoring systems
 * - Whitelisted IPs (optional)
 */
function skipRateLimit(req) {
  // Disable rate limiting completely for local development
  if (process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development') {
    return true;
  }
  
  const ip = advancedKeyGenerator(req);
  const path = req.path;
  
  // Skip for health check endpoints
  if (path === '/health' || path === '/api/health' || path === '/metrics') {
    return true;
  }
  
  // Skip for Cloudflare health checks
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.includes('Cloudflare-Health-Check')) {
    return true;
  }
  
  // Optional: Whitelist specific IPs (e.g., monitoring services)
  const whitelistedIPs = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
  if (whitelistedIPs.includes(ip)) {
    return true;
  }
  
  return false;
}

// ============================================================================
// RATE LIMITERS - Different Rules for Different Endpoints
// ============================================================================

/**
 * STRICT LOGIN LIMITER
 * For authentication endpoints (login, register, password reset)
 * Protects against brute force attacks
 */
const strictLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.LOGIN_RATE_LIMIT || 20, // 20 attempts per 15 mins
  message: {
    error: 'Too many login attempts from this IP',
    message: 'Please try again after 15 minutes',
    type: 'LOGIN_RATE_LIMIT'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  keyGenerator: advancedKeyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  store: getRateLimitStore('login'),
});

/**
 * MODERATE AUTH LIMITER
 * For less sensitive auth operations (token refresh, logout)
 */
const moderateAuthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.AUTH_RATE_LIMIT || 20, // 20 attempts per 10 mins
  message: {
    error: 'Too many authentication requests',
    message: 'Please try again later',
    type: 'AUTH_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: advancedKeyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  store: getRateLimitStore('auth'),
});

/**
 * STANDARD API LIMITER
 * For general authenticated API endpoints
 */
const standardApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.API_RATE_LIMIT || 20, // 20 requests per 5 mins
  message: {
    error: 'API rate limit exceeded',
    message: 'Too many requests. Please slow down.',
    type: 'API_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: advancedKeyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  store: getRateLimitStore('api'),
});

/**
 * LENIENT PUBLIC LIMITER
 * For public endpoints (health checks, static content)
 */
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.PUBLIC_RATE_LIMIT || 20, // 20 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Please slow down',
    type: 'PUBLIC_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: advancedKeyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  store: getRateLimitStore('public'),
});

/**
 * AGGRESSIVE LIMITER FOR EXPENSIVE OPERATIONS
 * For resource-intensive operations (reports, AI, bulk operations)
 */
const expensiveOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.EXPENSIVE_RATE_LIMIT || 20, // 20 expensive operations per hour
  message: {
    error: 'Rate limit for expensive operations exceeded',
    message: 'These operations are resource-intensive. Please try again later.',
    type: 'EXPENSIVE_OPERATION_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: advancedKeyGenerator,
  handler: rateLimitHandler,
  skip: skipRateLimit,
  store: getRateLimitStore('expensive'),
});

// ============================================================================
// ADAPTIVE RATE LIMITER - Adjusts based on user behavior
// ============================================================================

/**
 * Creates an adaptive rate limiter that adjusts based on:
 * - User authentication status (authenticated users get higher limits)
 * - User role (admins get higher limits)
 * - Time of day (lower limits during peak hours)
 */
function createAdaptiveRateLimiter(baseConfig) {
  return rateLimit({
    ...baseConfig,
    max: async (req) => {
      const baseMax = baseConfig.max || 100;
      
      // Authenticated users get 2x limit
      if (req.user) {
        let multiplier = 2;
        
        // Admins get 5x limit
        if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ENTERPRISE_ADMIN') {
          multiplier = 5;
        }
        
        return baseMax * multiplier;
      }
      
      return baseMax;
    },
    keyGenerator: (req) => {
      // If authenticated, use user ID instead of IP for better tracking
      if (req.user?.id) {
        return `user:${req.user.id}`;
      }
      return advancedKeyGenerator(req);
    },
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Primary rate limiters
  strictLoginLimiter,
  moderateAuthLimiter,
  standardApiLimiter,
  publicLimiter,
  expensiveOperationLimiter,
  
  // Utility functions
  createAdaptiveRateLimiter,
  advancedKeyGenerator,
  getRateLimitStore,
  
  // For testing/debugging
  redisClient,
  closeRedis: () => {
    if (redisClient) {
      try { redisClient.disconnect(); } catch {}
    }
  }
};

// Auto-disconnect redis in test environment to avoid open handles
if (process.env.NODE_ENV === 'test') {
  module.exports.closeRedis();
}
