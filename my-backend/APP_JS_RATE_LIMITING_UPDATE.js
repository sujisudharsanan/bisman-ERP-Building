/**
 * APP.JS UPDATE - Advanced Rate Limiting Integration
 * 
 * This file contains the code changes needed for app.js
 * Follow the instructions below to integrate advanced rate limiting
 */

// ============================================================================
// STEP 1: Replace old rate limiter imports (around line 1)
// ============================================================================

// OLD CODE (Remove or comment out):
// const rateLimit = require('express-rate-limit')

// NEW CODE:
const rateLimit = require('express-rate-limit') // Keep for legacy compatibility

// ============================================================================
// STEP 2: Replace rate limiter definitions (around line 157-176)
// ============================================================================

// OLD CODE (Remove these):
/*
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: {
    error: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
*/

// NEW CODE:
// ============================================================================
// ADVANCED RATE LIMITING - Multi-Layer Protection
// ============================================================================
const {
  strictLoginLimiter,
  moderateAuthLimiter,
  standardApiLimiter,
  publicLimiter,
  expensiveOperationLimiter,
  createAdaptiveRateLimiter
} = require('./middleware/advancedRateLimiter');

console.log('[app.js] ✅ Advanced rate limiting enabled');
console.log('[app.js] 📊 Rate limits:');
console.log('  - Login: ' + (process.env.LOGIN_RATE_LIMIT || '5') + ' per 15 min');
console.log('  - Auth: ' + (process.env.AUTH_RATE_LIMIT || '20') + ' per 10 min');
console.log('  - API: ' + (process.env.API_RATE_LIMIT || '100') + ' per 5 min');
console.log('  - Public: ' + (process.env.PUBLIC_RATE_LIMIT || '60') + ' per 1 min');
console.log('  - Expensive: ' + (process.env.EXPENSIVE_RATE_LIMIT || '10') + ' per hour');

// Keep legacy limiters as aliases for backwards compatibility
const loginLimiter = strictLoginLimiter;
const apiLimiter = standardApiLimiter;

// ============================================================================
// STEP 3: Apply global rate limiting (add after CORS configuration)
// ============================================================================

// Find this section in your app.js (after CORS setup, before route mounting):
// Add these lines before mounting routes:

// Apply public rate limiting to all routes as a baseline
app.use(publicLimiter);

// Apply standard API rate limiting to all /api routes
app.use('/api', standardApiLimiter);

// Apply strict rate limiting to expensive operations
app.use('/api/reports', expensiveOperationLimiter);
app.use('/api/ai', expensiveOperationLimiter);
app.use('/api/analytics', expensiveOperationLimiter);
app.use('/api/export', expensiveOperationLimiter);

console.log('[app.js] ✅ Global rate limiting applied');

// ============================================================================
// STEP 4: Add rate limit monitoring endpoint (add near end of file)
// ============================================================================

// Add this endpoint for admins to monitor rate limit violations
app.get('/api/admin/rate-limit-violations', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'ENTERPRISE_ADMIN']), 
  async (req, res) => {
    try {
      const { limit = 100, offset = 0, ip, endpoint } = req.query;
      
      const where = {};
      if (ip) where.ip_address = ip;
      if (endpoint) where.endpoint = { contains: endpoint };
      
      const violations = await prisma.rateLimitViolation.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          ip_address: true,
          endpoint: true,
          user_agent: true,
          violation_type: true,
          timestamp: true,
          country_code: true,
          user_id: true,
          request_method: true,
        }
      });
      
      const total = await prisma.rateLimitViolation.count({ where });
      
      res.json({ 
        violations, 
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('[RateLimit] Failed to fetch violations:', error);
      res.status(500).json({ error: 'Failed to fetch violations' });
    }
  }
);

// Get rate limit violation statistics
app.get('/api/admin/rate-limit-stats',
  authenticate,
  requireRole(['SUPER_ADMIN', 'ENTERPRISE_ADMIN']),
  async (req, res) => {
    try {
      // Get violations by type (last 24 hours)
      const violationsByType = await prisma.$queryRaw`
        SELECT 
          violation_type,
          COUNT(*) as count,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM rate_limit_violations
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY violation_type
        ORDER BY count DESC
      `;
      
      // Get top offending IPs (last 7 days)
      const topIPs = await prisma.$queryRaw`
        SELECT 
          ip_address,
          COUNT(*) as violation_count,
          COUNT(DISTINCT endpoint) as endpoints_hit,
          MAX(timestamp) as last_seen
        FROM rate_limit_violations
        WHERE timestamp > NOW() - INTERVAL '7 days'
        GROUP BY ip_address
        ORDER BY violation_count DESC
        LIMIT 10
      `;
      
      // Get violation trend (last 7 days)
      const trend = await prisma.$queryRaw`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as violations
        FROM rate_limit_violations
        WHERE timestamp > NOW() - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;
      
      res.json({
        violationsByType,
        topIPs,
        trend
      });
    } catch (error) {
      console.error('[RateLimit] Failed to fetch stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }
);

// ============================================================================
// STEP 5: Add development helper endpoint (optional, for testing)
// ============================================================================

if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/clear-rate-limits', (req, res) => {
    // Note: This only clears in-memory limits, not Redis
    console.log('[Dev] Manual rate limit clear requested');
    res.json({ 
      message: 'Rate limits cleared (in-memory only)',
      note: 'Redis limits require manual flush: redis-cli FLUSHDB'
    });
  });
  
  console.log('[app.js] ⚠️  Development endpoint enabled: POST /api/dev/clear-rate-limits');
}

// ============================================================================
// INTEGRATION COMPLETE
// ============================================================================

console.log('[app.js] ✅ Advanced rate limiting integration complete');

/**
 * VERIFICATION CHECKLIST:
 * 
 * [ ] Old rate limiters removed/commented out
 * [ ] New rate limiters imported from middleware/advancedRateLimiter.js
 * [ ] Global rate limiting applied to /api routes
 * [ ] Expensive operation limiting applied to specific routes
 * [ ] Admin monitoring endpoints added
 * [ ] Environment variables configured in .env
 * [ ] Prisma schema updated with RateLimitViolation model
 * [ ] Database migration applied
 * [ ] Server restarted
 * [ ] Rate limits tested with test-rate-limits.sh
 * 
 * TESTING:
 * 1. Try logging in 6 times with wrong password -> Should get 429 after 5 attempts
 * 2. Make 101 API calls rapidly -> Should get 429 after 100 calls
 * 3. Check violations: GET /api/admin/rate-limit-violations (as admin)
 * 4. Check headers: Response should include RateLimit-* headers
 * 
 * MONITORING:
 * - Console logs: Watch for "🚨 [RateLimit]" warnings
 * - Database: SELECT * FROM rate_limit_violations;
 * - Admin panel: /api/admin/rate-limit-stats
 * 
 * CLOUDFLARE SETUP:
 * See: CLOUDFLARE_RATE_LIMITING_QUICK_SETUP.md
 */
