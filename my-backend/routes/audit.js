/**
 * Audit Monitoring Routes
 * 
 * Provides API endpoints for:
 * - Audit log queries
 * - Service-to-table usage statistics
 * - Security event monitoring
 * - Dashboard data
 * 
 * @module routes/audit
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const prisma = getPrisma();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']));

// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/audit/logs
 * Query audit logs with filtering
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      table_name,
      action,
      user_id,
      service_name,
      tenant_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    const whereClause = [];
    const params = [];
    let paramIndex = 1;

    if (table_name) {
      whereClause.push(`table_name = $${paramIndex++}`);
      params.push(table_name);
    }
    if (action) {
      whereClause.push(`action = $${paramIndex++}`);
      params.push(action);
    }
    if (user_id) {
      whereClause.push(`user_id = $${paramIndex++}`);
      params.push(parseInt(user_id));
    }
    if (service_name) {
      whereClause.push(`service_name = $${paramIndex++}`);
      params.push(service_name);
    }
    if (tenant_id) {
      whereClause.push(`tenant_id = $${paramIndex++}`);
      params.push(tenant_id);
    }
    if (start_date) {
      whereClause.push(`created_at >= $${paramIndex++}`);
      params.push(new Date(start_date));
    }
    if (end_date) {
      whereClause.push(`created_at <= $${paramIndex++}`);
      params.push(new Date(end_date));
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
    
    // Get total count
    const countResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM audit_logs ${whereSQL}`,
      ...params
    );
    const total = parseInt(countResult[0]?.total || 0);

    // Get paginated results
    params.push(parseInt(limit), parseInt(offset));
    const logs = await prisma.$queryRawUnsafe(
      `SELECT 
        id, user_id, action, table_name, record_id,
        old_values, new_values, changed_fields,
        service_name, service_user, tenant_id, super_admin_id,
        ip_address, request_id, created_at
      FROM audit_logs 
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      ...params
    );

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + logs.length < total
      }
    });
  } catch (error) {
    console.error('[audit/logs] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/logs/:id
 * Get single audit log with full details
 */
router.get('/logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const log = await prisma.$queryRaw`
      SELECT * FROM audit_logs WHERE id = ${parseInt(id)}
    `;

    if (!log || log.length === 0) {
      return res.status(404).json({ success: false, error: 'Audit log not found' });
    }

    res.json({ success: true, data: log[0] });
  } catch (error) {
    console.error('[audit/logs/:id] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/summary
 * Get 24h audit summary (from view)
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await prisma.$queryRaw`
      SELECT * FROM v_audit_summary_24h
    `;

    // Get totals
    const totals = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_operations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT table_name) as tables_affected,
        COUNT(DISTINCT service_name) as active_services
      FROM audit_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `;

    res.json({
      success: true,
      data: {
        summary,
        totals: totals[0]
      }
    });
  } catch (error) {
    console.error('[audit/summary] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SERVICE USAGE ENDPOINTS
// ============================================================================

/**
 * GET /api/audit/services
 * Get service-to-table usage summary
 */
router.get('/services', async (req, res) => {
  try {
    const summary = await prisma.$queryRaw`
      SELECT * FROM v_service_usage_summary
    `;

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('[audit/services] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/services/:name
 * Get detailed usage for a specific service
 */
router.get('/services/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const usage = await prisma.$queryRaw`
      SELECT 
        table_name, operation, total_count, success_count, error_count,
        avg_execution_ms, max_execution_ms, first_seen, last_seen
      FROM service_table_usage
      WHERE service_name = ${name}
      ORDER BY total_count DESC
    `;

    // Get recent audit logs for this service
    const recentLogs = await prisma.$queryRaw`
      SELECT 
        id, action, table_name, record_id, 
        user_id, created_at
      FROM audit_logs
      WHERE service_name = ${name}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    res.json({
      success: true,
      data: {
        service_name: name,
        usage,
        recent_activity: recentLogs
      }
    });
  } catch (error) {
    console.error('[audit/services/:name] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/services/table/:table
 * Get all services that access a specific table
 */
router.get('/services/table/:table', async (req, res) => {
  try {
    const { table } = req.params;

    const services = await prisma.$queryRaw`
      SELECT 
        service_name, operation, total_count, success_count, error_count,
        avg_execution_ms, first_seen, last_seen
      FROM service_table_usage
      WHERE table_name = ${table}
      ORDER BY total_count DESC
    `;

    res.json({
      success: true,
      data: {
        table_name: table,
        services
      }
    });
  } catch (error) {
    console.error('[audit/services/table/:table] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SECURITY EVENTS ENDPOINTS
// ============================================================================

/**
 * GET /api/audit/security
 * Get security events
 */
router.get('/security', async (req, res) => {
  try {
    const {
      event_type,
      severity,
      user_id,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    const whereClause = [];
    const params = [];
    let paramIndex = 1;

    if (event_type) {
      whereClause.push(`event_type = $${paramIndex++}`);
      params.push(event_type);
    }
    if (severity) {
      whereClause.push(`severity = $${paramIndex++}`);
      params.push(severity);
    }
    if (user_id) {
      whereClause.push(`user_id = $${paramIndex++}`);
      params.push(parseInt(user_id));
    }
    if (start_date) {
      whereClause.push(`created_at >= $${paramIndex++}`);
      params.push(new Date(start_date));
    }
    if (end_date) {
      whereClause.push(`created_at <= $${paramIndex++}`);
      params.push(new Date(end_date));
    }

    const whereSQL = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    params.push(parseInt(limit), parseInt(offset));
    const events = await prisma.$queryRawUnsafe(
      `SELECT * FROM security_events ${whereSQL} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      ...params
    );

    res.json({ success: true, data: events });
  } catch (error) {
    console.error('[audit/security] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/security/summary
 * Get 24h security events summary
 */
router.get('/security/summary', async (req, res) => {
  try {
    const summary = await prisma.$queryRaw`
      SELECT * FROM v_security_events_24h
    `;

    // Get critical/error counts
    const alerts = await prisma.$queryRaw`
      SELECT 
        SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN severity = 'ERROR' THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN severity = 'WARNING' THEN 1 ELSE 0 END) as warning_count,
        COUNT(DISTINCT ip_address) as suspicious_ips
      FROM security_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND severity IN ('CRITICAL', 'ERROR', 'WARNING')
    `;

    res.json({
      success: true,
      data: {
        summary,
        alerts: alerts[0]
      }
    });
  } catch (error) {
    console.error('[audit/security/summary] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/audit/security/event
 * Log a security event (internal use)
 */
router.post('/security/event', async (req, res) => {
  try {
    const {
      event_type,
      severity = 'INFO',
      user_id,
      user_email,
      user_type,
      ip_address,
      details
    } = req.body;

    if (!event_type) {
      return res.status(400).json({ success: false, error: 'event_type is required' });
    }

    const result = await prisma.$queryRaw`
      SELECT log_security_event(
        ${event_type},
        ${severity},
        ${user_id || null}::INTEGER,
        ${user_email || null},
        ${user_type || null},
        ${ip_address || null}::INET,
        ${details ? JSON.stringify(details) : null}::JSONB
      ) as event_id
    `;

    res.json({
      success: true,
      event_id: result[0]?.event_id
    });
  } catch (error) {
    console.error('[audit/security/event] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

/**
 * GET /api/audit/dashboard
 * Get comprehensive dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Parallel queries for dashboard
    const [
      auditSummary,
      serviceSummary,
      securitySummary,
      recentActivity,
      tableHeatmap,
      hourlyTrend
    ] = await Promise.all([
      // Audit summary
      prisma.$queryRaw`SELECT * FROM v_audit_summary_24h LIMIT 10`,
      
      // Service summary
      prisma.$queryRaw`SELECT * FROM v_service_usage_summary`,
      
      // Security summary
      prisma.$queryRaw`SELECT * FROM v_security_events_24h`,
      
      // Recent activity (last 20 operations)
      prisma.$queryRaw`
        SELECT 
          id, action, table_name, user_id, service_name, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 20
      `,
      
      // Table activity heatmap (last 7 days)
      prisma.$queryRaw`
        SELECT table_name, COUNT(*) as count
        FROM audit_logs
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY table_name
        ORDER BY count DESC
        LIMIT 15
      `,
      
      // Hourly trend (last 24 hours)
      prisma.$queryRaw`
        SELECT 
          date_trunc('hour', created_at) as hour,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM audit_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY date_trunc('hour', created_at)
        ORDER BY hour
      `
    ]);

    res.json({
      success: true,
      data: {
        audit: {
          summary: auditSummary,
          recentActivity
        },
        services: serviceSummary,
        security: securitySummary,
        charts: {
          tableHeatmap,
          hourlyTrend
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[audit/dashboard] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/dashboard/stats
 * Get quick stats for dashboard header
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as operations_24h,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour') as operations_1h,
        (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as active_users,
        (SELECT COUNT(DISTINCT service_name) FROM service_table_usage WHERE last_seen > NOW() - INTERVAL '24 hours') as active_services,
        (SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '24 hours' AND severity IN ('ERROR', 'CRITICAL')) as security_alerts,
        (SELECT COUNT(DISTINCT table_name) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as tables_modified
    `;

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('[audit/dashboard/stats] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// STATEMENT LOGS ENDPOINTS (Optional - for debugging)
// ============================================================================

/**
 * GET /api/audit/statements
 * Get statement logs (for debugging slow queries)
 */
router.get('/statements', async (req, res) => {
  try {
    const { 
      statement_type,
      service_name,
      min_execution_ms,
      limit = 50 
    } = req.query;

    const whereClause = ['1=1'];
    
    if (statement_type) {
      whereClause.push(`statement_type = '${statement_type}'`);
    }
    if (service_name) {
      whereClause.push(`service_name = '${service_name}'`);
    }
    if (min_execution_ms) {
      whereClause.push(`execution_time_ms >= ${parseInt(min_execution_ms)}`);
    }

    const statements = await prisma.$queryRawUnsafe(`
      SELECT * FROM statement_logs
      WHERE ${whereClause.join(' AND ')}
      ORDER BY logged_at DESC
      LIMIT ${parseInt(limit)}
    `);

    res.json({ success: true, data: statements });
  } catch (error) {
    console.error('[audit/statements] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CLEANUP ENDPOINT (Admin only)
// ============================================================================

/**
 * POST /api/audit/cleanup
 * Cleanup old audit logs
 */
router.post('/cleanup', requireRole(['ENTERPRISE_ADMIN']), async (req, res) => {
  try {
    const { days_to_keep = 90 } = req.body;

    const result = await prisma.$queryRaw`
      SELECT * FROM cleanup_old_audit_logs(${parseInt(days_to_keep)})
    `;

    // Log the cleanup action
    await prisma.$queryRaw`
      SELECT log_security_event(
        'AUDIT_CLEANUP',
        'INFO',
        ${req.user?.id || null}::INTEGER,
        ${req.user?.email || null},
        ${req.user?.userType || null},
        NULL,
        ${JSON.stringify({ days_to_keep, result: result[0] })}::JSONB
      )
    `;

    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('[audit/cleanup] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
