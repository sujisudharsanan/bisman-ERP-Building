/**
 * Security Monitoring API Routes
 * 
 * Exposes real-time security monitoring data:
 * - Failed auth attempts
 * - Rate limit hits
 * - RBAC denials
 * - Audit log volume
 * - Security alerts
 * 
 * @module routes/admin/securityMonitorRoutes
 */

'use strict';

const express = require('express');
const router = express.Router();

// Import security alerting if available
let securityAlerting = null;
try {
  securityAlerting = require('../../middleware/securityAlerting');
} catch (e) {
  console.warn('[securityMonitorRoutes] Security alerting not available:', e.message);
}

// Import security monitor if available
let securityMonitor = null;
try {
  securityMonitor = require('../../cron/securityMonitor');
} catch (e) {
  console.warn('[securityMonitorRoutes] Security monitor not available:', e.message);
}

// ============================================================================
// METRICS STORAGE (In-memory for now, could be Redis-backed)
// ============================================================================

const metricsStore = {
  // Real-time counters (reset hourly)
  failedAuthAttempts: 0,
  successfulAuthAttempts: 0,
  rateLimitHits: 0,
  rbacDenials: 0,
  
  // Time-series data (last 24 hours, hourly buckets)
  hourlyMetrics: [],
  
  // Recent alerts
  recentAlerts: [],
  
  // Last check timestamps
  lastAuditVolumeCheck: null,
  lastConnectionCheck: null,
  lastCredentialCheck: null,
  
  // Audit volume
  auditLogsLastHour: 0,
  auditLogsLast24Hours: 0,
  
  // System health
  redisConnected: false,
  dbConnected: false,
  
  // Reset timestamp
  lastReset: new Date().toISOString()
};

// Reset hourly metrics
setInterval(() => {
  // Archive current hour
  metricsStore.hourlyMetrics.push({
    timestamp: new Date().toISOString(),
    failedAuth: metricsStore.failedAuthAttempts,
    successfulAuth: metricsStore.successfulAuthAttempts,
    rateLimitHits: metricsStore.rateLimitHits,
    rbacDenials: metricsStore.rbacDenials
  });
  
  // Keep only last 24 hours
  if (metricsStore.hourlyMetrics.length > 24) {
    metricsStore.hourlyMetrics.shift();
  }
  
  // Reset counters
  metricsStore.failedAuthAttempts = 0;
  metricsStore.successfulAuthAttempts = 0;
  metricsStore.rateLimitHits = 0;
  metricsStore.rbacDenials = 0;
  metricsStore.lastReset = new Date().toISOString();
}, 60 * 60 * 1000); // Every hour

// ============================================================================
// METRIC RECORDING FUNCTIONS (called by middleware)
// ============================================================================

function recordFailedAuth(ip, email) {
  metricsStore.failedAuthAttempts++;
  
  // Check if we should alert
  if (securityAlerting && metricsStore.failedAuthAttempts >= 10) {
    addAlert('AUTH_SPIKE', `${metricsStore.failedAuthAttempts} failed auth attempts in current period`, 'high');
  }
}

function recordSuccessfulAuth(userId) {
  metricsStore.successfulAuthAttempts++;
}

function recordRateLimitHit(ip, endpoint) {
  metricsStore.rateLimitHits++;
}

function recordRbacDenial(userId, resource, action) {
  metricsStore.rbacDenials++;
}

function addAlert(type, message, severity = 'medium') {
  const alert = {
    id: Date.now().toString(),
    type,
    message,
    severity,
    timestamp: new Date().toISOString(),
    acknowledged: false
  };
  
  metricsStore.recentAlerts.unshift(alert);
  
  // Keep only last 50 alerts
  if (metricsStore.recentAlerts.length > 50) {
    metricsStore.recentAlerts.pop();
  }
  
  return alert;
}

function updateAuditVolume(lastHour, last24Hours) {
  metricsStore.auditLogsLastHour = lastHour;
  metricsStore.auditLogsLast24Hours = last24Hours;
  metricsStore.lastAuditVolumeCheck = new Date().toISOString();
}

function updateConnectionStatus(redis, db) {
  metricsStore.redisConnected = redis;
  metricsStore.dbConnected = db;
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/admin/security/metrics
 * Get current security metrics snapshot
 */
router.get('/metrics', (req, res) => {
  const now = new Date();
  
  // Calculate totals from hourly metrics
  const last24hTotals = metricsStore.hourlyMetrics.reduce((acc, hour) => ({
    failedAuth: acc.failedAuth + (hour.failedAuth || 0),
    successfulAuth: acc.successfulAuth + (hour.successfulAuth || 0),
    rateLimitHits: acc.rateLimitHits + (hour.rateLimitHits || 0),
    rbacDenials: acc.rbacDenials + (hour.rbacDenials || 0)
  }), { failedAuth: 0, successfulAuth: 0, rateLimitHits: 0, rbacDenials: 0 });
  
  res.json({
    current: {
      failedAuthAttempts: metricsStore.failedAuthAttempts,
      successfulAuthAttempts: metricsStore.successfulAuthAttempts,
      rateLimitHits: metricsStore.rateLimitHits,
      rbacDenials: metricsStore.rbacDenials,
      periodStart: metricsStore.lastReset
    },
    last24Hours: last24hTotals,
    auditLogs: {
      lastHour: metricsStore.auditLogsLastHour,
      last24Hours: metricsStore.auditLogsLast24Hours,
      lastCheck: metricsStore.lastAuditVolumeCheck
    },
    systemHealth: {
      redisConnected: metricsStore.redisConnected,
      dbConnected: metricsStore.dbConnected
    },
    timestamp: now.toISOString()
  });
});

/**
 * GET /api/admin/security/alerts
 * Get recent security alerts
 */
router.get('/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const unacknowledgedOnly = req.query.unacknowledged === 'true';
  
  let alerts = metricsStore.recentAlerts;
  
  if (unacknowledgedOnly) {
    alerts = alerts.filter(a => !a.acknowledged);
  }
  
  res.json({
    alerts: alerts.slice(0, limit),
    total: metricsStore.recentAlerts.length,
    unacknowledged: metricsStore.recentAlerts.filter(a => !a.acknowledged).length
  });
});

/**
 * POST /api/admin/security/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:id/acknowledge', (req, res) => {
  const alertId = req.params.id;
  const alert = metricsStore.recentAlerts.find(a => a.id === alertId);
  
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  alert.acknowledged = true;
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = req.user?.id || 'system';
  
  res.json({ success: true, alert });
});

/**
 * GET /api/admin/security/hourly
 * Get hourly metrics for charts
 */
router.get('/hourly', (req, res) => {
  res.json({
    metrics: metricsStore.hourlyMetrics,
    currentHour: {
      failedAuth: metricsStore.failedAuthAttempts,
      successfulAuth: metricsStore.successfulAuthAttempts,
      rateLimitHits: metricsStore.rateLimitHits,
      rbacDenials: metricsStore.rbacDenials,
      periodStart: metricsStore.lastReset
    }
  });
});

/**
 * GET /api/admin/security/status
 * Get overall security status
 */
router.get('/status', (req, res) => {
  // Determine overall status
  let status = 'healthy';
  const issues = [];
  
  // Check for concerning metrics
  if (metricsStore.failedAuthAttempts > 10) {
    status = 'warning';
    issues.push(`High failed auth attempts: ${metricsStore.failedAuthAttempts}`);
  }
  
  if (metricsStore.rateLimitHits > 50) {
    status = 'warning';
    issues.push(`High rate limit hits: ${metricsStore.rateLimitHits}`);
  }
  
  const unacknowledgedAlerts = metricsStore.recentAlerts.filter(a => !a.acknowledged);
  if (unacknowledgedAlerts.some(a => a.severity === 'high' || a.severity === 'critical')) {
    status = 'critical';
    issues.push(`Unacknowledged high-severity alerts: ${unacknowledgedAlerts.length}`);
  }
  
  if (!metricsStore.dbConnected) {
    status = 'critical';
    issues.push('Database connection lost');
  }
  
  if (!metricsStore.redisConnected) {
    status = 'warning';
    issues.push('Redis connection lost (caching disabled)');
  }
  
  // Get scheduled job status from security monitor
  const scheduledJobs = {
    auditVolumeCheck: {
      schedule: 'Every 5 minutes',
      lastRun: metricsStore.lastAuditVolumeCheck,
      status: metricsStore.lastAuditVolumeCheck ? 'active' : 'pending'
    },
    connectionCheck: {
      schedule: 'Every 1 minute',
      lastRun: metricsStore.lastConnectionCheck,
      status: metricsStore.lastConnectionCheck ? 'active' : 'pending'
    },
    credentialReminder: {
      schedule: 'Daily at 9 AM',
      lastRun: metricsStore.lastCredentialCheck,
      status: 'scheduled'
    },
    weeklySummary: {
      schedule: 'Monday at 10 AM',
      status: 'scheduled'
    }
  };
  
  res.json({
    status,
    issues,
    unacknowledgedAlerts: unacknowledgedAlerts.length,
    scheduledJobs,
    monitoring: {
      failedAuthSpike: {
        enabled: true,
        threshold: 10,
        window: '5 minutes',
        current: metricsStore.failedAuthAttempts
      },
      rateLimitSpike: {
        enabled: true,
        threshold: 50,
        window: '5 minutes',
        current: metricsStore.rateLimitHits
      },
      auditVolumeCheck: {
        enabled: true,
        schedule: 'Every 5 minutes'
      },
      credentialRotation: {
        enabled: true,
        threshold: '90 days',
        schedule: 'Daily check'
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/admin/security/test-alert
 * Create a test alert (for testing Slack/PagerDuty integration)
 */
router.post('/test-alert', (req, res) => {
  const alert = addAlert(
    'TEST_ALERT',
    'This is a test security alert - please ignore',
    'low'
  );
  
  res.json({
    success: true,
    message: 'Test alert created',
    alert
  });
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;

// Export metric recording functions for use by other middleware
module.exports.recordFailedAuth = recordFailedAuth;
module.exports.recordSuccessfulAuth = recordSuccessfulAuth;
module.exports.recordRateLimitHit = recordRateLimitHit;
module.exports.recordRbacDenial = recordRbacDenial;
module.exports.addAlert = addAlert;
module.exports.updateAuditVolume = updateAuditVolume;
module.exports.updateConnectionStatus = updateConnectionStatus;
