/**
 * ============================================================================
 * LOGIN RATE LIMITING MIDDLEWARE
 * ============================================================================
 * 
 * Track failed login attempts and enforce rate limits
 * Features:
 * - Per-user/email tracking
 * - Per-IP tracking
 * - Automatic cleanup of old records
 * - Configurable limits and timeouts
 * - Returns 429 with retry time
 * 
 * @module middleware/loginRateLimiter
 */

const { PrismaClient } = require('@prisma/client');
const { AppError, ERROR_CODES } = require('./errorHandler');
const { extractIpAddress } = require('../utils/errorLogger');

const prisma = new PrismaClient();

// Configuration
const CONFIG = {
  MAX_ATTEMPTS: 5, // Maximum failed attempts
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  BLOCK_DURATION_MS: 15 * 60 * 1000, // Block for 15 minutes
};

/**
 * Initialize login_attempts table
 */
async function initializeLoginAttemptsTable() {
  try {
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        identifier_type VARCHAR(20) NOT NULL,
        attempt_time TIMESTAMP NOT NULL DEFAULT NOW(),
        ip_address VARCHAR(100),
        user_agent TEXT,
        success BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Create indices for faster queries
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier 
      ON login_attempts(identifier, attempt_time DESC)
    `;
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip 
      ON login_attempts(ip_address, attempt_time DESC)
    `;
    
    console.log('✅ Login attempts table initialized');
  } catch (err) {
    console.warn('⚠️ Could not initialize login_attempts table:', err.message);
  }
}

/**
 * Record a login attempt
 */
async function recordLoginAttempt(identifier, identifierType, ipAddress, userAgent, success = false) {
  try {
    await prisma.$executeRaw`
      INSERT INTO login_attempts (
        identifier, 
        identifier_type, 
        attempt_time, 
        ip_address, 
        user_agent, 
        success
      ) VALUES (
        ${identifier},
        ${identifierType},
        NOW(),
        ${ipAddress},
        ${userAgent},
        ${success}
      )
    `;
  } catch (err) {
    console.error('Failed to record login attempt:', err);
  }
}

/**
 * Get failed attempts for identifier within time window
 */
async function getFailedAttempts(identifier, identifierType, windowMs) {
  try {
    const cutoffTime = new Date(Date.now() - windowMs);
    
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE identifier = ${identifier}
        AND identifier_type = ${identifierType}
        AND attempt_time > ${cutoffTime}
        AND success = FALSE
    `;
    
    return parseInt(result[0]?.count || 0);
  } catch (err) {
    console.error('Failed to get failed attempts:', err);
    return 0;
  }
}

/**
 * Get time until user can retry
 */
async function getRetryAfter(identifier, identifierType, blockDurationMs) {
  try {
    const result = await prisma.$queryRaw`
      SELECT MAX(attempt_time) as last_attempt
      FROM login_attempts
      WHERE identifier = ${identifier}
        AND identifier_type = ${identifierType}
        AND success = FALSE
      LIMIT 1
    `;
    
    if (!result[0]?.last_attempt) {
      return 0;
    }
    
    const lastAttemptTime = new Date(result[0].last_attempt).getTime();
    const blockUntil = lastAttemptTime + blockDurationMs;
    const now = Date.now();
    
    if (now >= blockUntil) {
      return 0;
    }
    
    return Math.ceil((blockUntil - now) / 1000); // Return seconds
  } catch (err) {
    console.error('Failed to get retry after:', err);
    return 0;
  }
}

/**
 * Clear successful login attempts
 */
async function clearLoginAttempts(identifier, identifierType) {
  try {
    await prisma.$executeRaw`
      DELETE FROM login_attempts
      WHERE identifier = ${identifier}
        AND identifier_type = ${identifierType}
    `;
  } catch (err) {
    console.error('Failed to clear login attempts:', err);
  }
}

/**
 * Cleanup old login attempts (older than 24 hours)
 */
async function cleanupOldAttempts() {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    await prisma.$executeRaw`
      DELETE FROM login_attempts
      WHERE attempt_time < ${cutoffTime}
    `;
  } catch (err) {
    console.error('Failed to cleanup old attempts:', err);
  }
}

/**
 * Login Rate Limiter Middleware
 * Place BEFORE login handler
 */
async function loginRateLimiter(req, res, next) {
  // Skip rate limiting if disabled for development
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }

  try {
    const { email } = req.body;
    const ipAddress = extractIpAddress(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    if (!email) {
      return next(); // Let validation handle missing email
    }
    
    // Check email-based attempts
    const emailAttempts = await getFailedAttempts(
      email.toLowerCase(),
      'email',
      CONFIG.WINDOW_MS
    );
    
    // Check IP-based attempts
    const ipAttempts = await getFailedAttempts(
      ipAddress,
      'ip',
      CONFIG.WINDOW_MS
    );
    
    console.log(`🔒 Rate limit check - Email: ${emailAttempts}/${CONFIG.MAX_ATTEMPTS}, IP: ${ipAttempts}/${CONFIG.MAX_ATTEMPTS}`);
    
    // If either limit is exceeded, block the request
    if (emailAttempts >= CONFIG.MAX_ATTEMPTS || ipAttempts >= CONFIG.MAX_ATTEMPTS) {
      const emailRetryAfter = await getRetryAfter(
        email.toLowerCase(),
        'email',
        CONFIG.BLOCK_DURATION_MS
      );
      
      const ipRetryAfter = await getRetryAfter(
        ipAddress,
        'ip',
        CONFIG.BLOCK_DURATION_MS
      );
      
      const retryAfter = Math.max(emailRetryAfter, ipRetryAfter);
      
      console.log(`🚫 Login blocked - Retry after: ${retryAfter}s`);
      
      const error = new AppError(
        `Login limit reached. Please try again after ${Math.ceil(retryAfter / 60)} minutes.`,
        ERROR_CODES.LOGIN_LIMIT_REACHED,
        429
      );
      error.retryAfter = retryAfter;
      
      throw error;
    }
    
    // Store identifiers for later use in auth route
    req.loginTracking = {
      email: email.toLowerCase(),
      ipAddress,
      userAgent,
    };
    
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Record failed login
 * Call this from auth route when login fails
 */
async function recordFailedLogin(req) {
  const { email, ipAddress, userAgent } = req.loginTracking || {};
  
  if (email) {
    await recordLoginAttempt(email, 'email', ipAddress, userAgent, false);
  }
  
  if (ipAddress) {
    await recordLoginAttempt(ipAddress, 'ip', ipAddress, userAgent, false);
  }
}

/**
 * Record successful login
 * Call this from auth route when login succeeds
 */
async function recordSuccessfulLogin(req) {
  const { email, ipAddress, userAgent } = req.loginTracking || {};
  
  if (email) {
    await recordLoginAttempt(email, 'email', ipAddress, userAgent, true);
    await clearLoginAttempts(email, 'email');
  }
  
  if (ipAddress) {
    await clearLoginAttempts(ipAddress, 'ip');
  }
}

// Schedule cleanup every hour
setInterval(cleanupOldAttempts, 60 * 60 * 1000);

module.exports = {
  loginRateLimiter,
  recordFailedLogin,
  recordSuccessfulLogin,
  initializeLoginAttemptsTable,
  cleanupOldAttempts,
};
