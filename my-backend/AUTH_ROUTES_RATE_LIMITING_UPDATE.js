/**
 * AUTH ROUTES UPDATE - Apply Rate Limiting to Authentication Endpoints
 * 
 * This file shows how to integrate rate limiting into your auth routes
 * Copy these changes to: my-backend/routes/auth.js
 */

// ============================================================================
// STEP 1: Add rate limiter imports at the top of auth.js
// ============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// ADD THESE IMPORTS:
const {
  strictLoginLimiter,
  moderateAuthLimiter
} = require('../middleware/advancedRateLimiter');

const prisma = new PrismaClient();
const router = express.Router();

// ... rest of your existing code ...

// ============================================================================
// STEP 2: Apply rate limiters to authentication endpoints
// ============================================================================

/**
 * LOGIN ENDPOINT - Strict rate limiting (5 attempts per 15 minutes)
 * 
 * OLD CODE:
 * router.post('/login', async (req, res) => { ... });
 * 
 * NEW CODE (add strictLoginLimiter middleware):
 */
router.post('/login', strictLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    console.log(`🔐 Login attempt for: ${email}`);

    // ... rest of your existing login logic ...

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * REGISTER ENDPOINT - Strict rate limiting (5 attempts per 15 minutes)
 * Prevents automated account creation attacks
 * 
 * NEW CODE:
 */
router.post('/register', strictLoginLimiter, async (req, res) => {
  // ... your existing register logic ...
});

/**
 * PASSWORD RESET REQUEST - Strict rate limiting
 * Prevents email bombing attacks
 */
router.post('/password-reset/request', strictLoginLimiter, async (req, res) => {
  // ... your existing password reset request logic ...
});

/**
 * PASSWORD RESET CONFIRM - Strict rate limiting
 * Prevents brute force attacks on reset tokens
 */
router.post('/password-reset/confirm', strictLoginLimiter, async (req, res) => {
  // ... your existing password reset confirm logic ...
});

/**
 * TOKEN REFRESH - Moderate rate limiting (20 attempts per 10 minutes)
 * More lenient since this is used by legitimate apps frequently
 * 
 * OLD CODE:
 * router.post('/refresh-token', async (req, res) => { ... });
 * 
 * NEW CODE:
 */
router.post('/refresh-token', moderateAuthLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    // ... rest of your existing refresh token logic ...

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * LOGOUT - Moderate rate limiting
 * Generally safe, but rate limit to prevent abuse
 */
router.post('/logout', moderateAuthLimiter, async (req, res) => {
  // ... your existing logout logic ...
});

/**
 * VERIFY EMAIL - Moderate rate limiting
 * Prevents resend abuse
 */
router.post('/verify-email', moderateAuthLimiter, async (req, res) => {
  // ... your existing email verification logic ...
});

/**
 * CHANGE PASSWORD (for authenticated users) - Moderate rate limiting
 * Prevents rapid password change attacks on compromised accounts
 */
router.post('/change-password', moderateAuthLimiter, async (req, res) => {
  // ... your existing change password logic ...
});

// ============================================================================
// STEP 3: Optional - Add IP-based blocking for persistent attackers
// ============================================================================

/**
 * Middleware to check if IP should be blocked based on violation history
 * Add this BEFORE rate limiters for maximum protection
 */
const checkIPReputation = async (req, res, next) => {
  try {
    const ip = 
      req.headers['cf-connecting-ip'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    
    // Check if this IP has excessive violations in last 24 hours
    const recentViolations = await prisma.rateLimitViolation.count({
      where: {
        ip_address: ip,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    
    // Block if more than 20 violations in 24 hours
    if (recentViolations > 20) {
      console.warn(`🚨 [Security] Blocking repeat offender IP: ${ip} (${recentViolations} violations)`);
      
      return res.status(403).json({
        error: 'Access Forbidden',
        message: 'Your IP has been temporarily blocked due to suspicious activity',
        type: 'IP_BLOCKED'
      });
    }
    
    next();
  } catch (error) {
    // If check fails, allow through (fail open)
    console.error('[Security] IP reputation check failed:', error);
    next();
  }
};

// Apply to critical endpoints:
// router.post('/login', checkIPReputation, strictLoginLimiter, async (req, res) => { ... });

// ============================================================================
// STEP 4: Optional - Add user-specific rate limiting
// ============================================================================

/**
 * For authenticated endpoints, you can add user-specific rate limiting
 * This prevents account compromise scenarios where attacker has valid token
 */
const userSpecificRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 requests per hour per user
  keyGenerator: (req) => {
    // Use user ID instead of IP if authenticated
    return req.user?.id ? `user:${req.user.id}` : req.ip;
  },
  handler: (req, res) => {
    console.warn(`🚨 [RateLimit] User ${req.user?.id} exceeded limit`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'You have made too many requests. Please try again later.',
      type: 'USER_RATE_LIMIT'
    });
  }
});

// Example usage on authenticated endpoints:
// router.post('/some-authenticated-route', authenticate, userSpecificRateLimit, async (req, res) => { ... });

module.exports = router;

// ============================================================================
// VERIFICATION CHECKLIST
// ============================================================================

/**
 * [ ] strictLoginLimiter applied to:
 *     - POST /login
 *     - POST /register
 *     - POST /password-reset/request
 *     - POST /password-reset/confirm
 * 
 * [ ] moderateAuthLimiter applied to:
 *     - POST /refresh-token
 *     - POST /logout
 *     - POST /verify-email
 *     - POST /change-password
 * 
 * [ ] Optional IP reputation checking added
 * [ ] Optional user-specific rate limiting added
 * [ ] Server restarted to apply changes
 * [ ] Tested login with 6 wrong attempts (should get 429 after 5)
 * 
 * TESTING COMMANDS:
 * 
 * 1. Test login rate limit:
 *    for i in {1..6}; do 
 *      curl -X POST http://localhost:3001/api/auth/login \
 *        -H "Content-Type: application/json" \
 *        -d '{"email":"test@test.com","password":"wrong"}' \
 *        -w "\nStatus: %{http_code}\n"; 
 *      sleep 1; 
 *    done
 * 
 * 2. Test token refresh rate limit:
 *    for i in {1..25}; do 
 *      curl -X POST http://localhost:3001/api/auth/refresh-token \
 *        -H "Content-Type: application/json" \
 *        -d '{"refreshToken":"invalid"}' \
 *        -s -o /dev/null -w "%{http_code} "; 
 *    done
 * 
 * 3. Check violation logs:
 *    psql $DATABASE_URL -c "SELECT * FROM rate_limit_violations ORDER BY timestamp DESC LIMIT 10;"
 * 
 * EXPECTED BEHAVIOR:
 * - First 5 login attempts: 401 Unauthorized
 * - 6th login attempt: 429 Too Many Requests
 * - After 15 minutes: Rate limit resets
 * - Rate limit info in response headers:
 *   - RateLimit-Limit: 5
 *   - RateLimit-Remaining: 4, 3, 2, 1, 0
 *   - RateLimit-Reset: [timestamp]
 */
