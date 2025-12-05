/**
 * ============================================================================
 * BRUTE FORCE PROTECTION WITH CAPTCHA
 * ============================================================================
 * 
 * Implements progressive security measures:
 * 1. Track failed attempts per IP and account
 * 2. Add delays after threshold exceeded
 * 3. Require CAPTCHA verification after higher threshold
 * 4. Lock out after maximum attempts
 * 
 * Configuration via environment variables:
 * - CAPTCHA_THRESHOLD: Failed attempts before CAPTCHA required (default: 3)
 * - LOCKOUT_THRESHOLD: Failed attempts before lockout (default: 10)
 * - LOCKOUT_DURATION_MINUTES: How long to lock out (default: 30)
 * - CAPTCHA_SECRET_KEY: reCAPTCHA/hCaptcha secret key
 * - CAPTCHA_PROVIDER: 'recaptcha' or 'hcaptcha' (default: recaptcha)
 * 
 * @module middleware/bruteForceProtection
 */

const crypto = require('crypto');

// In-memory store for tracking attempts (use Redis in production for multi-instance)
const attemptStore = new Map();
const lockoutStore = new Map();

// Configuration
const CONFIG = {
  CAPTCHA_THRESHOLD: parseInt(process.env.CAPTCHA_THRESHOLD) || 3,
  LOCKOUT_THRESHOLD: parseInt(process.env.LOCKOUT_THRESHOLD) || 10,
  LOCKOUT_DURATION_MS: (parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30) * 60 * 1000,
  WINDOW_MS: 15 * 60 * 1000, // 15 minute window for counting attempts
  DELAY_INCREMENT_MS: 1000,  // Add 1 second delay per failed attempt after threshold
  MAX_DELAY_MS: 30000,       // Maximum delay of 30 seconds
};

// Optional Redis client for distributed deployments
let redis = null;
try {
  const { redis: redisClient, isEnabled } = require('../cache/redisClient');
  if (isEnabled()) {
    redis = redisClient;
    console.log('[BruteForce] ✅ Using Redis for distributed tracking');
  }
} catch (e) {
  console.log('[BruteForce] Using in-memory store (single instance only)');
}

/**
 * Generate a key for tracking attempts
 */
function getAttemptKey(type, identifier) {
  return `bf:${type}:${crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 16)}`;
}

/**
 * Get attempt count from store
 */
async function getAttempts(key) {
  if (redis) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : { count: 0, firstAttempt: null };
    } catch (e) {
      console.error('[BruteForce] Redis get error:', e.message);
    }
  }
  return attemptStore.get(key) || { count: 0, firstAttempt: null };
}

/**
 * Set attempt count in store
 */
async function setAttempts(key, data) {
  if (redis) {
    try {
      await redis.setex(key, Math.ceil(CONFIG.WINDOW_MS / 1000), JSON.stringify(data));
      return;
    } catch (e) {
      console.error('[BruteForce] Redis set error:', e.message);
    }
  }
  attemptStore.set(key, data);
  
  // Clean up old entries periodically
  if (attemptStore.size > 10000) {
    const now = Date.now();
    for (const [k, v] of attemptStore) {
      if (v.firstAttempt && now - v.firstAttempt > CONFIG.WINDOW_MS) {
        attemptStore.delete(k);
      }
    }
  }
}

/**
 * Check if identifier is locked out
 */
async function isLockedOut(key) {
  if (redis) {
    try {
      const lockoutUntil = await redis.get(`lockout:${key}`);
      if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
        return parseInt(lockoutUntil);
      }
      return false;
    } catch (e) {
      console.error('[BruteForce] Redis lockout check error:', e.message);
    }
  }
  
  const lockoutUntil = lockoutStore.get(key);
  if (lockoutUntil && Date.now() < lockoutUntil) {
    return lockoutUntil;
  }
  lockoutStore.delete(key);
  return false;
}

/**
 * Set lockout for identifier
 */
async function setLockout(key, untilTimestamp) {
  if (redis) {
    try {
      const ttl = Math.ceil((untilTimestamp - Date.now()) / 1000);
      await redis.setex(`lockout:${key}`, ttl, untilTimestamp.toString());
      return;
    } catch (e) {
      console.error('[BruteForce] Redis lockout set error:', e.message);
    }
  }
  lockoutStore.set(key, untilTimestamp);
}

/**
 * Clear attempts after successful login
 */
async function clearAttempts(identifier, type = 'ip') {
  const key = getAttemptKey(type, identifier);
  
  if (redis) {
    try {
      await redis.del(key);
      await redis.del(`lockout:${key}`);
      return;
    } catch (e) {
      console.error('[BruteForce] Redis clear error:', e.message);
    }
  }
  
  attemptStore.delete(key);
  lockoutStore.delete(key);
}

/**
 * Verify CAPTCHA token
 */
async function verifyCaptcha(token, clientIp) {
  if (!token) return false;
  
  const secretKey = process.env.CAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn('[BruteForce] ⚠️ No CAPTCHA_SECRET_KEY configured, skipping verification');
    return true; // Skip verification if not configured
  }
  
  const provider = process.env.CAPTCHA_PROVIDER || 'recaptcha';
  
  try {
    let verifyUrl, body;
    
    if (provider === 'hcaptcha') {
      verifyUrl = 'https://hcaptcha.com/siteverify';
      body = new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: clientIp
      });
    } else {
      // Default to reCAPTCHA
      verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
      body = new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: clientIp
      });
    }
    
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    
    const data = await response.json();
    
    if (provider === 'hcaptcha') {
      return data.success === true;
    } else {
      // reCAPTCHA v3 includes score
      return data.success === true && (data.score === undefined || data.score >= 0.5);
    }
  } catch (error) {
    console.error('[BruteForce] CAPTCHA verification error:', error.message);
    return false;
  }
}

/**
 * Brute Force Protection Middleware
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.type - 'login' or 'signup'
 * @param {Function} options.getIdentifier - Function to extract identifier from request
 */
function bruteForceProtection(options = {}) {
  const {
    type = 'login',
    getIdentifier = (req) => req.body?.email || 'unknown'
  } = options;
  
  return async (req, res, next) => {
    // Get client IP
    const clientIp = req.headers['cf-connecting-ip'] ||
                     req.headers['x-real-ip'] ||
                     (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                     req.ip ||
                     'unknown';
    
    const identifier = getIdentifier(req);
    const ipKey = getAttemptKey('ip', clientIp);
    const accountKey = getAttemptKey('account', identifier);
    
    // Check lockout status
    const ipLockout = await isLockedOut(ipKey);
    const accountLockout = await isLockedOut(accountKey);
    
    if (ipLockout) {
      const remainingMs = ipLockout - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts',
        message: `Account temporarily locked. Try again in ${remainingMin} minute(s).`,
        errorCode: 'BRUTE_FORCE_LOCKOUT',
        retryAfter: Math.ceil(remainingMs / 1000)
      });
    }
    
    if (accountLockout) {
      const remainingMs = accountLockout - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      
      return res.status(429).json({
        success: false,
        error: 'Too many failed attempts',
        message: `Account temporarily locked. Try again in ${remainingMin} minute(s).`,
        errorCode: 'BRUTE_FORCE_LOCKOUT',
        retryAfter: Math.ceil(remainingMs / 1000)
      });
    }
    
    // Get current attempt counts
    const ipAttempts = await getAttempts(ipKey);
    const accountAttempts = await getAttempts(accountKey);
    const maxAttempts = Math.max(ipAttempts.count, accountAttempts.count);
    
    // Check if CAPTCHA is required
    if (maxAttempts >= CONFIG.CAPTCHA_THRESHOLD) {
      const captchaToken = req.body?.captchaToken || req.body?.recaptchaToken || req.body?.hcaptchaToken;
      
      if (!captchaToken) {
        return res.status(428).json({
          success: false,
          error: 'CAPTCHA required',
          message: 'Too many attempts. Please complete the CAPTCHA verification.',
          errorCode: 'CAPTCHA_REQUIRED',
          requiresCaptcha: true,
          failedAttempts: maxAttempts
        });
      }
      
      const captchaValid = await verifyCaptcha(captchaToken, clientIp);
      if (!captchaValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid CAPTCHA',
          message: 'CAPTCHA verification failed. Please try again.',
          errorCode: 'CAPTCHA_INVALID',
          requiresCaptcha: true
        });
      }
    }
    
    // Add progressive delay
    if (maxAttempts > 0) {
      const delay = Math.min(
        maxAttempts * CONFIG.DELAY_INCREMENT_MS,
        CONFIG.MAX_DELAY_MS
      );
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Attach helper methods to request for use in route handlers
    req.bruteForce = {
      clientIp,
      identifier,
      failedAttempts: maxAttempts,
      
      // Call on failed attempt
      recordFailure: async () => {
        const now = Date.now();
        
        // Update IP attempts
        const newIpAttempts = {
          count: ipAttempts.count + 1,
          firstAttempt: ipAttempts.firstAttempt || now
        };
        await setAttempts(ipKey, newIpAttempts);
        
        // Update account attempts
        const newAccountAttempts = {
          count: accountAttempts.count + 1,
          firstAttempt: accountAttempts.firstAttempt || now
        };
        await setAttempts(accountKey, newAccountAttempts);
        
        // Check for lockout
        const newMaxAttempts = Math.max(newIpAttempts.count, newAccountAttempts.count);
        if (newMaxAttempts >= CONFIG.LOCKOUT_THRESHOLD) {
          const lockoutUntil = now + CONFIG.LOCKOUT_DURATION_MS;
          await setLockout(ipKey, lockoutUntil);
          await setLockout(accountKey, lockoutUntil);
          
          console.warn(`[BruteForce] 🔒 Lockout triggered for IP ${clientIp} / account ${identifier}`);
          
          // Log security event
          try {
            const { auditService } = require('../services/auditService');
            auditService.logSecurityEvent('BRUTE_FORCE_LOCKOUT', {
              severity: 'WARNING',
              ipAddress: clientIp,
              userEmail: identifier,
              details: {
                type,
                attempts: newMaxAttempts,
                lockoutDuration: CONFIG.LOCKOUT_DURATION_MS / 60000,
                timestamp: new Date().toISOString()
              }
            }).catch(() => {});
          } catch (e) {}
          
          return { locked: true, remainingAttempts: 0 };
        }
        
        return {
          locked: false,
          remainingAttempts: CONFIG.LOCKOUT_THRESHOLD - newMaxAttempts,
          requiresCaptcha: newMaxAttempts >= CONFIG.CAPTCHA_THRESHOLD
        };
      },
      
      // Call on successful attempt
      clearAttempts: async () => {
        await clearAttempts(clientIp, 'ip');
        await clearAttempts(identifier, 'account');
      }
    };
    
    next();
  };
}

/**
 * Pre-configured middleware for login routes
 */
const loginBruteForceProtection = bruteForceProtection({
  type: 'login',
  getIdentifier: (req) => req.body?.email?.toLowerCase() || 'unknown'
});

/**
 * Pre-configured middleware for signup routes
 */
const signupBruteForceProtection = bruteForceProtection({
  type: 'signup',
  getIdentifier: (req) => req.body?.email?.toLowerCase() || req.ip || 'unknown'
});

module.exports = {
  bruteForceProtection,
  loginBruteForceProtection,
  signupBruteForceProtection,
  clearAttempts,
  verifyCaptcha,
  CONFIG
};
