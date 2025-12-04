/**
 * Security Alerting Middleware
 * 
 * Real-time monitoring for security events:
 * - Failed authentication spikes
 * - Unusual access patterns
 * - Rate limit violations
 * 
 * @module middleware/securityAlerting
 */

'use strict';

const { redis, isEnabled } = require('../cache/redisClient');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Failed auth thresholds
  FAILED_AUTH_THRESHOLD: 10,       // Max failures before alert
  FAILED_AUTH_WINDOW: 300,         // 5 minutes in seconds
  
  // Forbidden access thresholds
  FORBIDDEN_THRESHOLD: 20,         // Max 403s before alert
  FORBIDDEN_WINDOW: 300,           // 5 minutes
  
  // Alert cooldown (prevent spam)
  ALERT_COOLDOWN: 300,             // 5 minutes between same alerts
  
  // Redis key prefixes
  KEY_PREFIX: 'security:alert:',
  FAILED_AUTH_PREFIX: 'failed_auth:',
  FORBIDDEN_PREFIX: 'forbidden:',
  COOLDOWN_PREFIX: 'cooldown:'
};

// ============================================================================
// ALERT HANDLERS
// ============================================================================

/**
 * Send alert to configured channels
 */
async function sendAlert(alertType, data) {
  const alert = {
    type: alertType,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ...data
  };

  // Log to console (always)
  console.error(`[SECURITY ALERT] ${alertType}:`, JSON.stringify(alert));

  // Publish to Redis channel for real-time monitoring
  if (isEnabled()) {
    try {
      await redis.publish('security:alerts', JSON.stringify(alert));
    } catch (err) {
      console.error('[securityAlerting] Failed to publish alert:', err.message);
    }
  }

  // TODO: Add integrations
  // - Slack webhook
  // - PagerDuty
  // - Email
  // - SMS for critical alerts
}

/**
 * Check if we're in cooldown for this alert type
 */
async function isInCooldown(alertType, identifier) {
  if (!isEnabled()) return false;
  
  const key = `${CONFIG.KEY_PREFIX}${CONFIG.COOLDOWN_PREFIX}${alertType}:${identifier}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Set cooldown for alert type
 */
async function setCooldown(alertType, identifier) {
  if (!isEnabled()) return;
  
  const key = `${CONFIG.KEY_PREFIX}${CONFIG.COOLDOWN_PREFIX}${alertType}:${identifier}`;
  await redis.setex(key, CONFIG.ALERT_COOLDOWN, '1');
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Track failed authentication attempt
 * Returns true if threshold exceeded (alert triggered)
 */
async function trackFailedAuth(userId, ipAddress, reason = 'unknown') {
  if (!isEnabled()) {
    // Fallback: just log
    console.warn(`[securityAlerting] Failed auth: user=${userId}, ip=${ipAddress}, reason=${reason}`);
    return false;
  }

  const identifier = `${userId || 'anonymous'}:${ipAddress}`;
  const key = `${CONFIG.KEY_PREFIX}${CONFIG.FAILED_AUTH_PREFIX}${identifier}`;
  
  try {
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, CONFIG.FAILED_AUTH_WINDOW);
    }
    
    if (count >= CONFIG.FAILED_AUTH_THRESHOLD) {
      // Check cooldown
      if (await isInCooldown('failed_auth', identifier)) {
        return true; // Already alerted
      }
      
      // Send alert
      await sendAlert('EXCESSIVE_FAILED_AUTH', {
        userId,
        ipAddress,
        failedCount: count,
        reason,
        window: `${CONFIG.FAILED_AUTH_WINDOW}s`
      });
      
      await setCooldown('failed_auth', identifier);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('[securityAlerting] trackFailedAuth error:', err.message);
    return false;
  }
}

/**
 * Track forbidden access (403) attempts
 * Returns true if threshold exceeded
 */
async function trackForbiddenAccess(userId, ipAddress, resource) {
  if (!isEnabled()) {
    console.warn(`[securityAlerting] Forbidden access: user=${userId}, ip=${ipAddress}, resource=${resource}`);
    return false;
  }

  const identifier = `${userId || 'anonymous'}:${ipAddress}`;
  const key = `${CONFIG.KEY_PREFIX}${CONFIG.FORBIDDEN_PREFIX}${identifier}`;
  
  try {
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, CONFIG.FORBIDDEN_WINDOW);
    }
    
    if (count >= CONFIG.FORBIDDEN_THRESHOLD) {
      if (await isInCooldown('forbidden', identifier)) {
        return true;
      }
      
      await sendAlert('EXCESSIVE_FORBIDDEN_ACCESS', {
        userId,
        ipAddress,
        forbiddenCount: count,
        lastResource: resource,
        window: `${CONFIG.FORBIDDEN_WINDOW}s`
      });
      
      await setCooldown('forbidden', identifier);
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('[securityAlerting] trackForbiddenAccess error:', err.message);
    return false;
  }
}

/**
 * Track suspicious activity (generic)
 */
async function trackSuspiciousActivity(type, data) {
  await sendAlert(`SUSPICIOUS_${type.toUpperCase()}`, data);
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Middleware to track failed auth on login routes
 */
function authAttemptTracker(req, res, next) {
  const originalSend = res.send.bind(res);
  
  res.send = function(body) {
    // Check if this is a failed auth response
    if (res.statusCode === 401 || res.statusCode === 403) {
      const userId = req.body?.email || req.body?.username || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      
      trackFailedAuth(userId, ipAddress, 'login_failed').catch(err => {
        console.error('[authAttemptTracker] Error:', err.message);
      });
    }
    
    return originalSend(body);
  };
  
  next();
}

/**
 * Middleware to track 403 responses
 */
function forbiddenTracker(req, res, next) {
  const originalSend = res.send.bind(res);
  
  res.send = function(body) {
    if (res.statusCode === 403) {
      const userId = req.user?.id || req.session?.userId || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const resource = `${req.method} ${req.originalUrl}`;
      
      trackForbiddenAccess(userId, ipAddress, resource).catch(err => {
        console.error('[forbiddenTracker] Error:', err.message);
      });
    }
    
    return originalSend(body);
  };
  
  next();
}

// ============================================================================
// AUDIT VOLUME MONITORING
// ============================================================================

/**
 * Check audit log volume (run periodically)
 * Call this from a cron job
 */
async function checkAuditVolume(pool) {
  try {
    const result = await pool.query(`
      WITH current_hour AS (
        SELECT COUNT(*) as cnt
        FROM audit_logs_dml
        WHERE changed_at >= date_trunc('hour', NOW())
      ),
      previous_day_same_hour AS (
        SELECT COUNT(*) as cnt
        FROM audit_logs_dml
        WHERE changed_at >= date_trunc('hour', NOW() - INTERVAL '1 day')
          AND changed_at < date_trunc('hour', NOW() - INTERVAL '1 day') + INTERVAL '1 hour'
      )
      SELECT 
        c.cnt as current_count,
        p.cnt as previous_count,
        CASE WHEN p.cnt > 10 THEN (c.cnt::float / p.cnt * 100) ELSE 100 END as percentage
      FROM current_hour c, previous_day_same_hour p
    `);

    const { current_count, previous_count, percentage } = result.rows[0];

    // Alert if volume dropped more than 50%
    if (previous_count > 10 && percentage < 50) {
      await sendAlert('AUDIT_VOLUME_DROP', {
        currentCount: current_count,
        previousCount: previous_count,
        percentageOfNormal: Math.round(percentage),
        message: 'Audit log volume dropped significantly - possible logging failure'
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error('[checkAuditVolume] Error:', err.message);
    await sendAlert('AUDIT_CHECK_FAILED', {
      error: err.message
    });
    return false;
  }
}

/**
 * Check for unknown database connections
 */
async function checkUnknownDbConnections(pool) {
  const WHITELIST = [
    'bisman_erp_app',
    'bisman_erp_worker',
    'bisman_erp_migration',
    'pgAdmin 4',
    'pgAdmin',
    'psql',
    'prisma',
    'pg_dump',
    'pg_restore',
    'DBeaver',
    ''  // Empty string for some clients
  ];

  try {
    const result = await pool.query(`
      SELECT DISTINCT 
        application_name,
        client_addr::text,
        usename
      FROM pg_stat_activity
      WHERE application_name NOT IN (${WHITELIST.map((_, i) => `$${i + 1}`).join(',')})
        AND state = 'active'
    `, WHITELIST);

    if (result.rows.length > 0) {
      await sendAlert('UNKNOWN_DB_CONNECTION', {
        connections: result.rows,
        message: 'Unknown application connected to database'
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error('[checkUnknownDbConnections] Error:', err.message);
    return false;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Tracking functions
  trackFailedAuth,
  trackForbiddenAccess,
  trackSuspiciousActivity,
  sendAlert,
  
  // Middleware
  authAttemptTracker,
  forbiddenTracker,
  
  // Periodic checks
  checkAuditVolume,
  checkUnknownDbConnections,
  
  // Config (for testing)
  CONFIG
};
