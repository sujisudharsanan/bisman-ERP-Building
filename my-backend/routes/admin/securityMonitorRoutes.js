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
const { getPrisma } = require('../../lib/prisma');

// Get Redis connection status
let redisClient = null;
try {
  redisClient = require('../../lib/redisClient');
} catch (e) {
  console.warn('[securityMonitorRoutes] Redis client not available:', e.message);
}

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
 * Get current security metrics snapshot from database
 */
router.get('/metrics', async (req, res) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  let dbConnected = false;
  let redisConnected = false;
  const currentMetrics = {
    failedAuthAttempts: 0,
    successfulAuthAttempts: 0,
    rateLimitHits: 0,
    rbacDenials: 0
  };
  const last24hMetrics = {
    failedAuth: 0,
    successfulAuth: 0,
    rateLimitHits: 0,
    rbacDenials: 0
  };
  const auditLogs = {
    lastHour: 0,
    last24Hours: 0,
    lastCheck: now.toISOString()
  };
  
  // Check Redis connection
  try {
    if (redisClient && redisClient.get) {
      await redisClient.get('health_check');
      redisConnected = true;
    }
  } catch {
    redisConnected = false;
  }
  
  // Query real data from database
  try {
    const prisma = getPrisma();
    
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    
    // Get current hour metrics from security_events
    const currentHourEvents = await prisma.$queryRaw`
      SELECT 
        event_type,
        COUNT(*)::int as count
      FROM security_events
      WHERE created_at >= ${oneHourAgo}
      GROUP BY event_type
    `;
    
    // Get 24h metrics from security_events
    const last24hEvents = await prisma.$queryRaw`
      SELECT 
        event_type,
        COUNT(*)::int as count
      FROM security_events
      WHERE created_at >= ${twentyFourHoursAgo}
      GROUP BY event_type
    `;
    
    // Get audit log counts
    const auditCounts = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE created_at >= ${oneHourAgo})::int as last_hour,
        COUNT(*) FILTER (WHERE created_at >= ${twentyFourHoursAgo})::int as last_24h
      FROM security_events
    `;
    
    // Parse current hour events
    currentHourEvents.forEach(row => {
      if (row.event_type === 'LOGIN_FAILURE') {
        currentMetrics.failedAuthAttempts = row.count;
      } else if (row.event_type === 'LOGIN_SUCCESS') {
        currentMetrics.successfulAuthAttempts = row.count;
      } else if (row.event_type === 'RATE_LIMIT_EXCEEDED') {
        currentMetrics.rateLimitHits = row.count;
      } else if (row.event_type === 'PERMISSION_DENIED' || row.event_type === 'RBAC_DENIAL') {
        currentMetrics.rbacDenials += row.count;
      }
    });
    
    // Parse 24h events
    last24hEvents.forEach(row => {
      if (row.event_type === 'LOGIN_FAILURE') {
        last24hMetrics.failedAuth = row.count;
      } else if (row.event_type === 'LOGIN_SUCCESS') {
        last24hMetrics.successfulAuth = row.count;
      } else if (row.event_type === 'RATE_LIMIT_EXCEEDED') {
        last24hMetrics.rateLimitHits = row.count;
      } else if (row.event_type === 'PERMISSION_DENIED' || row.event_type === 'RBAC_DENIAL') {
        last24hMetrics.rbacDenials += row.count;
      }
    });
    
    // Set audit log counts
    if (auditCounts && auditCounts[0]) {
      auditLogs.lastHour = auditCounts[0].last_hour || 0;
      auditLogs.last24Hours = auditCounts[0].last_24h || 0;
    }
    
  } catch (e) {
    console.error('[securityMonitorRoutes] Database query error:', e.message);
    dbConnected = false;
  }
  
  // Update the in-memory store with real values
  metricsStore.redisConnected = redisConnected;
  metricsStore.dbConnected = dbConnected;
  metricsStore.auditLogsLastHour = auditLogs.lastHour;
  metricsStore.auditLogsLast24Hours = auditLogs.last24Hours;
  metricsStore.lastAuditVolumeCheck = now.toISOString();
  
  res.json({
    current: {
      failedAuthAttempts: currentMetrics.failedAuthAttempts,
      successfulAuthAttempts: currentMetrics.successfulAuthAttempts,
      rateLimitHits: currentMetrics.rateLimitHits,
      rbacDenials: currentMetrics.rbacDenials,
      periodStart: oneHourAgo.toISOString()
    },
    last24Hours: last24hMetrics,
    auditLogs: auditLogs,
    systemHealth: {
      redisConnected: redisConnected,
      dbConnected: dbConnected
    },
    timestamp: now.toISOString()
  });
});

/**
 * GET /api/admin/security/alerts
 * Get recent security alerts from database
 */
router.get('/alerts', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const unacknowledgedOnly = req.query.unacknowledged === 'true';
  
  try {
    const prisma = getPrisma();
    
    // Query security events that are alert-worthy (failures, denials, etc.)
    const alertEvents = await prisma.$queryRaw`
      SELECT 
        id::text as id,
        event_type as type,
        COALESCE(event_details->>'message', 
          CASE 
            WHEN event_type = 'LOGIN_FAILURE' THEN CONCAT('Failed login attempt from ', COALESCE(user_email, 'unknown'))
            WHEN event_type = 'PERMISSION_DENIED' THEN CONCAT('Permission denied for user ', COALESCE(user_email, 'unknown'))
            WHEN event_type = 'RATE_LIMIT_EXCEEDED' THEN 'Rate limit exceeded'
            WHEN event_type = 'SUSPICIOUS_ACTIVITY' THEN 'Suspicious activity detected'
            ELSE event_type
          END
        ) as message,
        CASE 
          WHEN severity = 'ERROR' OR severity = 'CRITICAL' THEN 'high'
          WHEN severity = 'WARNING' THEN 'medium'
          ELSE 'low'
        END as severity,
        created_at as timestamp,
        COALESCE((event_details->>'acknowledged')::boolean, false) as acknowledged,
        user_email,
        ip_address::text as ip_address
      FROM security_events
      WHERE event_type IN ('LOGIN_FAILURE', 'PERMISSION_DENIED', 'RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_ACTIVITY', 'RBAC_DENIAL')
      ORDER BY created_at DESC
      LIMIT ${limit * 2}
    `;
    
    let alerts = alertEvents.map(e => ({
      id: e.id,
      type: e.type,
      message: e.message,
      severity: e.severity,
      timestamp: e.timestamp,
      acknowledged: e.acknowledged,
      userEmail: e.user_email,
      ipAddress: e.ip_address
    }));
    
    if (unacknowledgedOnly) {
      alerts = alerts.filter(a => !a.acknowledged);
    }
    
    // Also include in-memory alerts
    const memoryAlerts = metricsStore.recentAlerts.map(a => ({
      ...a,
      source: 'memory'
    }));
    
    // Combine and dedupe by id
    const allAlerts = [...alerts, ...memoryAlerts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    
    res.json({
      alerts: allAlerts,
      total: allAlerts.length,
      unacknowledged: allAlerts.filter(a => !a.acknowledged).length
    });
    
  } catch (e) {
    console.error('[securityMonitorRoutes] Alerts query error:', e.message);
    
    // Fallback to in-memory alerts
    let alerts = metricsStore.recentAlerts;
    if (unacknowledgedOnly) {
      alerts = alerts.filter(a => !a.acknowledged);
    }
    
    res.json({
      alerts: alerts.slice(0, limit),
      total: metricsStore.recentAlerts.length,
      unacknowledged: metricsStore.recentAlerts.filter(a => !a.acknowledged).length
    });
  }
});

/**
 * POST /api/admin/security/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:id/acknowledge', async (req, res) => {
  const alertId = req.params.id;
  
  // First check in-memory alerts
  const memoryAlert = metricsStore.recentAlerts.find(a => a.id === alertId);
  if (memoryAlert) {
    memoryAlert.acknowledged = true;
    memoryAlert.acknowledgedAt = new Date().toISOString();
    memoryAlert.acknowledgedBy = req.user?.id || 'system';
    return res.json({ success: true, alert: memoryAlert });
  }
  
  // Otherwise update in database
  try {
    const prisma = getPrisma();
    
    // Update the security_events record
    await prisma.$executeRaw`
      UPDATE security_events 
      SET event_details = COALESCE(event_details, '{}'::jsonb) || 
        jsonb_build_object(
          'acknowledged', true, 
          'acknowledgedAt', ${new Date().toISOString()},
          'acknowledgedBy', ${String(req.user?.id || 'system')}
        )
      WHERE id = ${BigInt(alertId)}
    `;
    
    res.json({ 
      success: true, 
      alert: { 
        id: alertId, 
        acknowledged: true,
        acknowledgedAt: new Date().toISOString()
      } 
    });
  } catch (e) {
    console.error('[securityMonitorRoutes] Acknowledge error:', e.message);
    res.status(404).json({ error: 'Alert not found or could not be acknowledged' });
  }
});

/**
 * GET /api/admin/security/hourly
 * Get hourly metrics for charts
 */
router.get('/hourly', async (req, res) => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  let hourlyData = [];
  
  try {
    const prisma = getPrisma();
    
    // Get hourly aggregated data from security_events
    const hourlyEvents = await prisma.$queryRaw`
      SELECT 
        date_trunc('hour', created_at) as hour,
        event_type,
        COUNT(*)::int as count
      FROM security_events
      WHERE created_at >= ${twentyFourHoursAgo}
      GROUP BY date_trunc('hour', created_at), event_type
      ORDER BY hour DESC
    `;
    
    // Group by hour
    const hourMap = {};
    hourlyEvents.forEach(row => {
      const hourKey = new Date(row.hour).toISOString();
      if (!hourMap[hourKey]) {
        hourMap[hourKey] = {
          timestamp: hourKey,
          failedAuth: 0,
          successfulAuth: 0,
          rateLimitHits: 0,
          rbacDenials: 0
        };
      }
      
      if (row.event_type === 'LOGIN_FAILURE') {
        hourMap[hourKey].failedAuth = row.count;
      } else if (row.event_type === 'LOGIN_SUCCESS') {
        hourMap[hourKey].successfulAuth = row.count;
      } else if (row.event_type === 'RATE_LIMIT_EXCEEDED') {
        hourMap[hourKey].rateLimitHits = row.count;
      } else if (row.event_type === 'PERMISSION_DENIED' || row.event_type === 'RBAC_DENIAL') {
        hourMap[hourKey].rbacDenials += row.count;
      }
    });
    
    hourlyData = Object.values(hourMap).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
  } catch (e) {
    console.error('[securityMonitorRoutes] Hourly query error:', e.message);
    // Fall back to in-memory data
    hourlyData = metricsStore.hourlyMetrics;
  }
  
  res.json({
    metrics: hourlyData,
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
router.get('/status', async (req, res) => {
  // First check real-time connection status
  let dbConnected = false;
  let redisConnected = false;
  let recentFailedAuth = 0;
  let recentRateLimits = 0;
  
  // Check Redis connection
  try {
    if (redisClient && redisClient.get) {
      await redisClient.get('health_check');
      redisConnected = true;
    }
  } catch {
    redisConnected = false;
  }
  
  // Check DB connection and get recent metrics
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    
    // Get recent failed auth attempts (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEvents = await prisma.$queryRaw`
      SELECT event_type, COUNT(*)::int as count
      FROM security_events
      WHERE created_at >= ${fiveMinutesAgo}
        AND event_type IN ('LOGIN_FAILURE', 'RATE_LIMIT_EXCEEDED')
      GROUP BY event_type
    `;
    
    recentEvents.forEach(row => {
      if (row.event_type === 'LOGIN_FAILURE') {
        recentFailedAuth = row.count;
      } else if (row.event_type === 'RATE_LIMIT_EXCEEDED') {
        recentRateLimits = row.count;
      }
    });
  } catch {
    dbConnected = false;
  }
  
  // Update store
  metricsStore.dbConnected = dbConnected;
  metricsStore.redisConnected = redisConnected;
  metricsStore.lastConnectionCheck = new Date().toISOString();

  // Determine overall status
  let status = 'healthy';
  const issues = [];
  
  // Check for concerning metrics
  if (recentFailedAuth > 10) {
    status = 'warning';
    issues.push(`High failed auth attempts: ${recentFailedAuth} in last 5 min`);
  }
  
  if (recentRateLimits > 50) {
    status = 'warning';
    issues.push(`High rate limit hits: ${recentRateLimits} in last 5 min`);
  }
  
  const unacknowledgedAlerts = metricsStore.recentAlerts.filter(a => !a.acknowledged);
  if (unacknowledgedAlerts.some(a => a.severity === 'high' || a.severity === 'critical')) {
    status = 'critical';
    issues.push(`Unacknowledged high-severity alerts: ${unacknowledgedAlerts.length}`);
  }
  
  if (!dbConnected) {
    status = 'critical';
    issues.push('Database connection lost');
  }
  
  if (!redisConnected) {
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
        current: recentFailedAuth
      },
      rateLimitSpike: {
        enabled: true,
        threshold: 50,
        window: '5 minutes',
        current: recentRateLimits
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
