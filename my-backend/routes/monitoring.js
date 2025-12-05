/**
 * BISMAN ERP - Monitoring Routes
 * 
 * Exposes monitoring endpoints:
 * - /metrics - Prometheus metrics endpoint
 * - /api/monitoring/health - Health check
 * - /api/monitoring/summary - Full monitoring summary
 * - /api/monitoring/tenants - Per-tenant metrics
 * - /api/monitoring/alerts - Active alerts
 */

const express = require('express');
const router = express.Router();
const { getMonitoringService } = require('../services/monitoringService');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * Prometheus metrics endpoint (no auth for scraping)
 * Rate limited to prevent abuse
 */
router.get('/metrics', (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const metrics = monitoring.getPrometheusMetrics();
    
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('[MonitoringRoutes] Error generating Prometheus metrics:', error);
    res.status(500).send('# Error generating metrics\n');
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const dbHealth = monitoring.getDbHealth();
    const sysMetrics = monitoring.getSystemMetrics();
    
    const isHealthy = dbHealth.healthy && 
      sysMetrics.cpu.current < 95 && 
      sysMetrics.memory.current < 95;
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbHealth.healthy ? 'up' : 'down',
          activeConnections: dbHealth.activeConnections,
          recentErrors: dbHealth.recentErrorCount,
        },
        system: {
          cpu: `${sysMetrics.cpu.current.toFixed(1)}%`,
          memory: `${sysMetrics.memory.current.toFixed(1)}%`,
          uptime: `${Math.floor(sysMetrics.uptime / 3600)}h ${Math.floor((sysMetrics.uptime % 3600) / 60)}m`,
        },
      },
    });
  } catch (error) {
    console.error('[MonitoringRoutes] Health check error:', error);
    res.status(503).json({
      status: 'error',
      error: error.message,
    });
  }
});

/**
 * Full monitoring summary (admin only)
 */
router.get('/summary', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const summary = monitoring.getFullSummary();
    
    res.json(summary);
  } catch (error) {
    console.error('[MonitoringRoutes] Summary error:', error);
    res.status(500).json({ error: 'Failed to get monitoring summary' });
  }
});

/**
 * Database health details (admin only)
 */
router.get('/database', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const dbHealth = monitoring.getDbHealth();
    
    res.json(dbHealth);
  } catch (error) {
    console.error('[MonitoringRoutes] Database health error:', error);
    res.status(500).json({ error: 'Failed to get database health' });
  }
});

/**
 * HTTP metrics (admin only)
 */
router.get('/http', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const timeWindow = parseInt(req.query.window) || 300000; // Default 5 min
    const httpMetrics = monitoring.getHttpMetrics(timeWindow);
    
    res.json(httpMetrics);
  } catch (error) {
    console.error('[MonitoringRoutes] HTTP metrics error:', error);
    res.status(500).json({ error: 'Failed to get HTTP metrics' });
  }
});

/**
 * System metrics (admin only)
 */
router.get('/system', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const timeWindow = parseInt(req.query.window) || 300000;
    const sysMetrics = monitoring.getSystemMetrics(timeWindow);
    
    res.json(sysMetrics);
  } catch (error) {
    console.error('[MonitoringRoutes] System metrics error:', error);
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

/**
 * Backup status (admin only)
 */
router.get('/backup', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const backupStatus = monitoring.getBackupStatus();
    
    res.json(backupStatus);
  } catch (error) {
    console.error('[MonitoringRoutes] Backup status error:', error);
    res.status(500).json({ error: 'Failed to get backup status' });
  }
});

/**
 * Per-tenant metrics (admin only)
 */
router.get('/tenants', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const tenantMetrics = monitoring.getTenantMetrics();
    
    res.json({
      count: tenantMetrics.length,
      tenants: tenantMetrics,
    });
  } catch (error) {
    console.error('[MonitoringRoutes] Tenant metrics error:', error);
    res.status(500).json({ error: 'Failed to get tenant metrics' });
  }
});

/**
 * Single tenant metrics (admin or own tenant)
 */
router.get('/tenants/:tenantId', authenticate, (req, res) => {
  try {
    const { tenantId } = req.params;
    const userType = req.user?.userType;
    const userTenantId = req.user?.tenant_id;
    
    // Allow access if admin or own tenant
    const isAdmin = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'].includes(userType);
    const isOwnTenant = userTenantId === tenantId;
    
    if (!isAdmin && !isOwnTenant) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const monitoring = getMonitoringService();
    const tenantMetrics = monitoring.getTenantMetrics(tenantId);
    
    if (!tenantMetrics) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(tenantMetrics);
  } catch (error) {
    console.error('[MonitoringRoutes] Tenant metrics error:', error);
    res.status(500).json({ error: 'Failed to get tenant metrics' });
  }
});

/**
 * Tenant error rates for dashboard (admin only)
 */
router.get('/tenants-error-rates', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const errorRates = monitoring.getTenantErrorRates();
    
    res.json({
      count: errorRates.length,
      tenants: errorRates,
    });
  } catch (error) {
    console.error('[MonitoringRoutes] Tenant error rates error:', error);
    res.status(500).json({ error: 'Failed to get tenant error rates' });
  }
});

/**
 * Sentry metrics (admin only)
 */
router.get('/sentry', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']), (req, res) => {
  try {
    const monitoring = getMonitoringService();
    const timeWindow = parseInt(req.query.window) || 3600000; // Default 1 hour
    const sentryMetrics = monitoring.getSentryMetrics(timeWindow);
    
    res.json(sentryMetrics);
  } catch (error) {
    console.error('[MonitoringRoutes] Sentry metrics error:', error);
    res.status(500).json({ error: 'Failed to get Sentry metrics' });
  }
});

module.exports = router;
