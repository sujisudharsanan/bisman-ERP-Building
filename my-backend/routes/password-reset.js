/**
 * ============================================================================
 * Password Reset Routes - BISMAN ERP
 * ============================================================================
 * Secure password reset implementation following OWASP best practices
 * 
 * Security Features:
 * - Tokens hashed with SHA-256 before storage
 * - Single-use tokens (marked as used after reset)
 * - Short TTL (1 hour default)
 * - Rate limiting per IP and per account
 * - Prevents user enumeration (always returns success)
 * - Audit logging (IP, user-agent)
 * - Session invalidation after password change
 * ============================================================================
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { sendPasswordResetEmail, sendPasswordChangeConfirmationEmail } = require('../services/emailService');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================================================
// Configuration
// ============================================================================
const TOKEN_TTL_HOURS = 1;
const TOKEN_BYTES = 32; // 256 bits
const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 12;

// ============================================================================
// Rate Limiting
// ============================================================================

// Rate limit for password reset requests (5 per hour per IP)
const resetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many password reset requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use X-Forwarded-For if behind proxy
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
});

// Rate limit for password reset confirmation (10 per hour per IP)
const resetConfirmLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many password reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a cryptographically secure random token
 * @returns {string} 64 hex characters (256 bits)
 */
function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Hash token using SHA-256
 * @param {string} token - Plaintext token
 * @returns {string} Hex-encoded hash
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validatePasswordStrength(password) {
  const errors = [];
  
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check rate limit per user (prevent spam on specific account)
 * @param {string} userId
 * @param {number} maxRequests
 * @param {number} windowMinutes
 * @returns {Promise<boolean>}
 */
async function checkUserRateLimit(userId, maxRequests = 5, windowMinutes = 60) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT COUNT(*) as count
       FROM password_reset_tokens
       WHERE user_id = $1
         AND created_at > CURRENT_TIMESTAMP - INTERVAL '${windowMinutes} minutes'`,
      [userId]
    );
    
    return parseInt(result.rows[0].count) < maxRequests;
  } finally {
    client.release();
  }
}

/**
 * Invalidate all user sessions (logout from all devices)
 * @param {string} userId
 */
async function invalidateUserSessions(userId) {
  const client = await pool.connect();
  try {
    // Update user's token version to invalidate all JWTs
    await client.query(
      `UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1`,
      [userId]
    );
    
    // Delete any refresh tokens (if you use them)
    await client.query(
      `DELETE FROM refresh_tokens WHERE user_id = $1`,
      [userId]
    );
    
    logger.info(`Invalidated all sessions for user ${userId} after password reset`);
  } catch (error) {
    logger.error('Error invalidating user sessions:', error);
    // Don't throw - session invalidation failure shouldn't block password reset
  } finally {
    client.release();
  }
}

// ============================================================================
// Route: POST /auth/password-reset/request
// ============================================================================
/**
 * Request a password reset link
 * 
 * Security considerations:
 * - Always returns success (prevents user enumeration)
 * - Rate limited per IP and per account
 * - Tokens are hashed before storage
 * - Previous tokens are invalidated
 */
router.post(
  '/password-reset/request',
  resetRequestLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Still return success to prevent enumeration
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }
    
    const { email } = req.body;
    const requestIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || null;
    
    const client = await pool.connect();
    
    try {
      // Check if user exists
      const userResult = await client.query(
        `SELECT id, email, username, is_active FROM users WHERE email = $1`,
        [email]
      );
      
      if (userResult.rowCount === 0) {
        // User doesn't exist - return success anyway
        logger.warn(`Password reset requested for non-existent email: ${email} from IP: ${requestIp}`);
        return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
      }
      
      const user = userResult.rows[0];
      
      // Check if account is active
      if (!user.is_active) {
        logger.warn(`Password reset requested for inactive account: ${email} from IP: ${requestIp}`);
        return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
      }
      
      // Check user-specific rate limit
      const withinRateLimit = await checkUserRateLimit(user.id);
      if (!withinRateLimit) {
        logger.warn(`Password reset rate limit exceeded for user: ${email} from IP: ${requestIp}`);
        return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
      }
      
      // Generate token
      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
      
      // Store token (trigger will invalidate previous tokens)
      await client.query(
        `INSERT INTO password_reset_tokens 
         (user_id, token_hash, expires_at, request_ip, request_user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, tokenHash, expiresAt, requestIp, userAgent]
      );
      
      // Send email with reset link
      const resetLink = `${process.env.FRONTEND_BASE_URL}/auth/reset-password?uid=${user.id}&token=${token}`;
      
      await sendPasswordResetEmail({
        to: user.email,
        username: user.username || user.email,
        resetLink,
        expiresInMinutes: TOKEN_TTL_HOURS * 60
      });
      
      logger.info(`Password reset requested for user: ${email} from IP: ${requestIp}`);
      
      // Always return success
      return res.json({ 
        success: true, 
        message: 'If an account exists, a reset link has been sent.' 
      });
      
    } catch (error) {
      logger.error('Password reset request error:', error);
      // Still return success to prevent information leakage
      return res.json({ 
        success: true, 
        message: 'If an account exists, a reset link has been sent.' 
      });
    } finally {
      client.release();
    }
  }
);

// ============================================================================
// Route: POST /auth/password-reset/confirm
// ============================================================================
/**
 * Confirm password reset with token and new password
 * 
 * Security considerations:
 * - Validates token hash, expiry, and single-use
 * - Enforces strong password policy
 * - Invalidates all user sessions after reset
 * - Logs the event for audit
 */
router.post(
  '/password-reset/confirm',
  resetConfirmLimiter,
  [
    body('uid').isUUID().withMessage('Valid user ID required'),
    body('token').isLength({ min: 64, max: 64 }).withMessage('Valid token required'),
    body('newPassword').isLength({ min: PASSWORD_MIN_LENGTH }).withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request',
        details: errors.array() 
      });
    }
    
    const { uid, token, newPassword } = req.body;
    const confirmedIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || null;
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password does not meet requirements',
        details: passwordValidation.errors 
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Hash the token to compare with stored hash
      const tokenHash = hashToken(token);
      
      // Find matching token
      const tokenResult = await client.query(
        `SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email, u.username
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.user_id = $1 
           AND prt.token_hash = $2
         ORDER BY prt.created_at DESC 
         LIMIT 1`,
        [uid, tokenHash]
      );
      
      if (tokenResult.rowCount === 0) {
        await client.query('ROLLBACK');
        logger.warn(`Invalid password reset token for user: ${uid} from IP: ${confirmedIp}`);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid or expired reset token' 
        });
      }
      
      const resetToken = tokenResult.rows[0];
      
      // Check if token already used
      if (resetToken.used) {
        await client.query('ROLLBACK');
        logger.warn(`Attempted reuse of password reset token for user: ${resetToken.email} from IP: ${confirmedIp}`);
        return res.status(400).json({ 
          success: false, 
          error: 'This reset link has already been used' 
        });
      }
      
      // Check if token expired
      if (new Date() > new Date(resetToken.expires_at)) {
        await client.query('ROLLBACK');
        logger.warn(`Expired password reset token used for user: ${resetToken.email} from IP: ${confirmedIp}`);
        return res.status(400).json({ 
          success: false, 
          error: 'This reset link has expired. Please request a new one.' 
        });
      }
      
      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      
      // Update user password
      await client.query(
        `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [passwordHash, uid]
      );
      
      // Mark token as used
      await client.query(
        `UPDATE password_reset_tokens 
         SET used = true, 
             used_at = CURRENT_TIMESTAMP,
             confirmed_ip = $1,
             confirmed_user_agent = $2
         WHERE id = $3`,
        [confirmedIp, userAgent, resetToken.id]
      );
      
      await client.query('COMMIT');
      
      // Invalidate all user sessions (logout from all devices)
      await invalidateUserSessions(uid);
      
      // Send confirmation email
      await sendPasswordChangeConfirmationEmail({
        to: resetToken.email,
        username: resetToken.username || resetToken.email,
        changedAt: new Date(),
        ip: confirmedIp
      });
      
      logger.info(`Password successfully reset for user: ${resetToken.email} from IP: ${confirmedIp}`);
      
      return res.json({ 
        success: true, 
        message: 'Password has been reset successfully. Please log in with your new password.' 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Password reset confirmation error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'An error occurred while resetting your password. Please try again.' 
      });
    } finally {
      client.release();
    }
  }
);

// ============================================================================
// Route: POST /auth/password-reset/validate-token (Optional)
// ============================================================================
/**
 * Validate a reset token without using it
 * Useful for frontend to check if link is valid before showing password form
 */
router.post(
  '/password-reset/validate-token',
  [
    body('uid').isUUID().withMessage('Valid user ID required'),
    body('token').isLength({ min: 64, max: 64 }).withMessage('Valid token required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid request' 
      });
    }
    
    const { uid, token } = req.body;
    const tokenHash = hashToken(token);
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT expires_at, used
         FROM password_reset_tokens
         WHERE user_id = $1 AND token_hash = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [uid, tokenHash]
      );
      
      if (result.rowCount === 0) {
        return res.json({ valid: false, error: 'Invalid token' });
      }
      
      const resetToken = result.rows[0];
      
      if (resetToken.used) {
        return res.json({ valid: false, error: 'Token already used' });
      }
      
      if (new Date() > new Date(resetToken.expires_at)) {
        return res.json({ valid: false, error: 'Token expired' });
      }
      
      return res.json({ valid: true });
      
    } catch (error) {
      logger.error('Token validation error:', error);
      return res.status(500).json({ valid: false, error: 'Server error' });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
