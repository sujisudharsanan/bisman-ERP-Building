/**
 * Fallback Logs API Routes
 * 
 * Provides endpoints for viewing and managing fallback events
 * Restricted to SUPER_ADMIN and ENTERPRISE_ADMIN roles
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { FallbackService } = require('../services/fallbackService');
const { authenticate } = require('../middleware/auth');

const prisma = getPrisma();

// ============================================================================
// Middleware: Require SUPER_ADMIN or ENTERPRISE_ADMIN
// ============================================================================

const requireAdmin = (req, res, next) => {
  const allowedRoles = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'IT_ADMIN'];
  const userRole = req.user?.role?.toUpperCase().replace(/[\s-]+/g, '_');
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions to view fallback logs'
    });
  }
  next();
};

// ============================================================================
// GET /api/fallback-logs - Get paginated fallback logs
// ============================================================================

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      module_name,
      operation_name,
      severity,
      resolved,
      start_date,
      end_date,
      sort_by = 'fallback_triggered_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (module_name) {
      conditions.push(`module_name = $${paramIndex++}`);
      params.push(module_name);
    }
    if (operation_name) {
      conditions.push(`operation_name = $${paramIndex++}`);
      params.push(operation_name);
    }
    if (severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(severity);
    }
    if (resolved !== undefined) {
      conditions.push(`resolved = $${paramIndex++}`);
      params.push(resolved === 'true');
    }
    if (start_date) {
      conditions.push(`fallback_triggered_at >= $${paramIndex++}`);
      params.push(new Date(start_date));
    }
    if (end_date) {
      conditions.push(`fallback_triggered_at <= $${paramIndex++}`);
      params.push(new Date(end_date));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Validate sort column to prevent SQL injection
    const validSortColumns = ['fallback_triggered_at', 'module_name', 'severity', 'created_at'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'fallback_triggered_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM fallback_logs ${whereClause}`,
      ...params
    );
    const total = parseInt(countResult[0]?.total || 0);

    // Get paginated logs
    const logs = await prisma.$queryRawUnsafe(
      `SELECT 
        id, module_name, operation_name, error_message, error_code,
        user_id, request_payload, response_type, severity,
        fallback_triggered_at, created_at, resolved, resolved_at,
        resolved_by, resolution_notes
      FROM fallback_logs 
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      ...params
    );

    res.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          ...log,
          fallback_triggered_at: log.fallback_triggered_at?.toISOString(),
          created_at: log.created_at?.toISOString(),
          resolved_at: log.resolved_at?.toISOString(),
          request_payload: log.request_payload ? JSON.parse(log.request_payload) : null
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('[FallbackLogs] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fallback logs'
    });
  }
});

// ============================================================================
// GET /api/fallback-logs/stats - Get fallback statistics
// ============================================================================

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const hoursInt = parseInt(hours);

    // Get hourly breakdown
    const hourlyStats = await prisma.$queryRawUnsafe(`
      SELECT 
        module_name,
        operation_name,
        severity,
        DATE_TRUNC('hour', fallback_triggered_at) as hour,
        COUNT(*) as count
      FROM fallback_logs
      WHERE fallback_triggered_at > NOW() - INTERVAL '${hoursInt} hours'
      GROUP BY module_name, operation_name, severity, DATE_TRUNC('hour', fallback_triggered_at)
      ORDER BY hour DESC
    `);

    // Get summary by module
    const moduleSummary = await prisma.$queryRawUnsafe(`
      SELECT 
        module_name,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
        COUNT(*) FILTER (WHERE resolved = true) as resolved_count
      FROM fallback_logs
      WHERE fallback_triggered_at > NOW() - INTERVAL '${hoursInt} hours'
      GROUP BY module_name
      ORDER BY total DESC
    `);

    // Get recent alerts
    const recentAlerts = await prisma.$queryRawUnsafe(`
      SELECT * FROM fallback_alerts 
      WHERE alert_triggered_at > NOW() - INTERVAL '${hoursInt} hours'
      ORDER BY alert_triggered_at DESC
      LIMIT 20
    `);

    // Get in-memory stats
    const memoryStats = FallbackService.getStats();

    res.json({
      success: true,
      data: {
        timeRange: `${hoursInt} hours`,
        hourlyBreakdown: hourlyStats.map(s => ({
          ...s,
          hour: s.hour?.toISOString(),
          count: parseInt(s.count)
        })),
        moduleSummary: moduleSummary.map(s => ({
          ...s,
          total: parseInt(s.total),
          critical_count: parseInt(s.critical_count),
          warning_count: parseInt(s.warning_count),
          resolved_count: parseInt(s.resolved_count)
        })),
        recentAlerts: recentAlerts.map(a => ({
          ...a,
          alert_triggered_at: a.alert_triggered_at?.toISOString()
        })),
        memoryStats
      }
    });

  } catch (error) {
    console.error('[FallbackLogs] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fallback statistics'
    });
  }
});

// ============================================================================
// GET /api/fallback-logs/modules - Get distinct modules for filtering
// ============================================================================

router.get('/modules', authenticate, requireAdmin, async (req, res) => {
  try {
    const modules = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT module_name, operation_name 
      FROM fallback_logs 
      ORDER BY module_name, operation_name
    `);

    res.json({
      success: true,
      data: modules
    });

  } catch (error) {
    console.error('[FallbackLogs] Error fetching modules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch module list'
    });
  }
});

// ============================================================================
// PATCH /api/fallback-logs/:id/resolve - Mark a log as resolved
// ============================================================================

router.patch('/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;
    const userId = req.user?.id || req.user?.email;

    await prisma.$executeRaw`
      UPDATE fallback_logs 
      SET resolved = true, 
          resolved_at = NOW(), 
          resolved_by = ${String(userId)},
          resolution_notes = ${resolution_notes || null}
      WHERE id = ${parseInt(id)}
    `;

    res.json({
      success: true,
      message: 'Fallback log marked as resolved'
    });

  } catch (error) {
    console.error('[FallbackLogs] Error resolving log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve fallback log'
    });
  }
});

// ============================================================================
// PATCH /api/fallback-logs/bulk-resolve - Bulk resolve logs
// ============================================================================

router.patch('/bulk-resolve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { ids, resolution_notes } = req.body;
    const userId = req.user?.id || req.user?.email;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or empty ids array'
      });
    }

    const idList = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    await prisma.$executeRawUnsafe(`
      UPDATE fallback_logs 
      SET resolved = true, 
          resolved_at = NOW(), 
          resolved_by = $1,
          resolution_notes = $2
      WHERE id = ANY($3::int[])
    `, String(userId), resolution_notes || null, idList);

    res.json({
      success: true,
      message: `${idList.length} fallback logs marked as resolved`
    });

  } catch (error) {
    console.error('[FallbackLogs] Error bulk resolving:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk resolve fallback logs'
    });
  }
});

// ============================================================================
// DELETE /api/fallback-logs/cleanup - Clean up old logs
// ============================================================================

router.delete('/cleanup', authenticate, requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = Math.max(7, parseInt(days)); // Minimum 7 days retention

    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM fallback_logs 
      WHERE fallback_triggered_at < NOW() - INTERVAL '${daysInt} days'
      AND resolved = true
    `);

    res.json({
      success: true,
      message: `Cleaned up resolved logs older than ${daysInt} days`,
      deletedCount: result
    });

  } catch (error) {
    console.error('[FallbackLogs] Error cleaning up logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up fallback logs'
    });
  }
});

// ============================================================================
// GET /api/fallback-logs/alerts - Get active alerts
// ============================================================================

router.get('/alerts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { acknowledged } = req.query;
    
    let whereClause = '';
    if (acknowledged !== undefined) {
      whereClause = `WHERE acknowledged = ${acknowledged === 'true'}`;
    }

    const alerts = await prisma.$queryRawUnsafe(`
      SELECT * FROM fallback_alerts 
      ${whereClause}
      ORDER BY alert_triggered_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: alerts.map(a => ({
        ...a,
        alert_triggered_at: a.alert_triggered_at?.toISOString(),
        acknowledged_at: a.acknowledged_at?.toISOString()
      }))
    });

  } catch (error) {
    console.error('[FallbackLogs] Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fallback alerts'
    });
  }
});

// ============================================================================
// PATCH /api/fallback-logs/alerts/:id/acknowledge - Acknowledge an alert
// ============================================================================

router.patch('/alerts/:id/acknowledge', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.email;

    await prisma.$executeRaw`
      UPDATE fallback_alerts 
      SET acknowledged = true, 
          acknowledged_at = NOW(), 
          acknowledged_by = ${String(userId)}
      WHERE id = ${parseInt(id)}
    `;

    res.json({
      success: true,
      message: 'Alert acknowledged'
    });

  } catch (error) {
    console.error('[FallbackLogs] Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

module.exports = router;
