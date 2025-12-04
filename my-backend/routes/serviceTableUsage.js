/**
 * Service-Table Usage API
 * 
 * Tracks which services access which database tables.
 * Uses audit_logs_dml to build usage map.
 * 
 * Endpoints:
 * - GET /api/admin/service-table-usage - List service/table usage
 * - GET /api/admin/service-table-usage/:serviceName - Service details
 * - POST /api/admin/mark-suspicious - Flag a service as suspicious
 * - GET /api/admin/sensitive-tables - List sensitive table access
 * 
 * @module routes/serviceTableUsage
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbacMiddleware');
const { getPrisma } = require('../lib/prisma');

const prisma = getPrisma();

// Sensitive tables list (configurable)
const SENSITIVE_TABLES = [
  'super_admins',
  'enterprise_admins',
  'users_enhanced',
  'user_sessions',
  'payment_requests',
  'rbac_roles',
  'rbac_permissions',
  'rbac_user_roles',
  'api_keys',
  'clients',
  'audit_logs_dml',
  'security_events'
];

// All routes require admin
router.use(authenticate);
router.use(requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/admin/service-table-usage
 * 
 * Query params:
 * - page (default: 1)
 * - limit (default: 50)
 * - sensitiveOnly (boolean) - only show sensitive table access
 * - service - filter by service name
 * - since - ISO date string for lastSeen filter
 * - staleThresholdDays - flag services not seen in N days (default: 30)
 */
router.get('/service-table-usage', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sensitiveOnly = false,
      service,
      since,
      staleThresholdDays = 30
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - parseInt(staleThresholdDays));

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (sensitiveOnly === 'true') {
      whereClause += ` AND table_name = ANY($${paramIndex})`;
      params.push(SENSITIVE_TABLES);
      paramIndex++;
    }

    if (service) {
      whereClause += ` AND service_name ILIKE $${paramIndex}`;
      params.push(`%${service}%`);
      paramIndex++;
    }

    if (since) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(new Date(since));
      paramIndex++;
    }

    // Main query - group by service and table
    const query = `
      WITH usage_stats AS (
        SELECT 
          COALESCE(service_name, 'unknown') AS service_name,
          table_name,
          MAX(created_at) AS last_seen,
          array_agg(DISTINCT action) AS actions,
          COUNT(*) AS hits,
          COUNT(DISTINCT db_user) AS unique_users,
          MIN(created_at) AS first_seen
        FROM audit_logs_dml
        ${whereClause}
        GROUP BY COALESCE(service_name, 'unknown'), table_name
      ),
      service_summary AS (
        SELECT 
          service_name,
          COUNT(DISTINCT table_name) AS table_count,
          MAX(last_seen) AS last_activity,
          SUM(hits) AS total_hits,
          BOOL_OR(table_name = ANY($${paramIndex})) AS accesses_sensitive
        FROM usage_stats
        GROUP BY service_name
      )
      SELECT 
        s.service_name,
        s.table_count,
        s.last_activity,
        s.total_hits,
        s.accesses_sensitive,
        s.last_activity < $${paramIndex + 1} AS is_stale,
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'tableName', u.table_name,
            'actions', u.actions,
            'hits', u.hits,
            'lastSeen', u.last_seen,
            'firstSeen', u.first_seen,
            'isSensitive', u.table_name = ANY($${paramIndex})
          ) ORDER BY u.last_seen DESC)
          FROM usage_stats u
          WHERE u.service_name = s.service_name
          LIMIT 20),
          '[]'::jsonb
        ) AS tables
      FROM service_summary s
      ORDER BY s.last_activity DESC
      LIMIT $${paramIndex + 2} OFFSET $${paramIndex + 3}
    `;

    params.push(SENSITIVE_TABLES, staleDate, parseInt(limit), offset);

    const rows = await prisma.$queryRawUnsafe(query, ...params);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT COALESCE(service_name, 'unknown')) AS total
      FROM audit_logs_dml
      ${whereClause}
    `;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params.slice(0, paramIndex - 1));
    const total = Number(countResult[0]?.total || 0);

    // Transform results
    const services = rows.map(row => ({
      name: row.service_name,
      tableCount: Number(row.table_count),
      lastActivity: row.last_activity,
      totalHits: Number(row.total_hits),
      accessesSensitive: row.accesses_sensitive,
      isStale: row.is_stale,
      tables: row.tables || []
    }));

    res.json({
      success: true,
      data: {
        services,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        },
        filters: {
          sensitiveOnly: sensitiveOnly === 'true',
          service: service || null,
          since: since || null,
          staleThresholdDays: parseInt(staleThresholdDays)
        },
        sensitiveTablesList: SENSITIVE_TABLES
      }
    });
  } catch (error) {
    console.error('[serviceTableUsage] List error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service table usage',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/service-table-usage/:serviceName
 * Get detailed usage for a specific service
 */
router.get('/service-table-usage/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const { days = 30 } = req.query;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - parseInt(days));

    // Get table-level stats
    const tableStats = await prisma.$queryRaw`
      SELECT 
        table_name,
        array_agg(DISTINCT action ORDER BY action) AS actions,
        COUNT(*) AS total_hits,
        COUNT(*) FILTER (WHERE action = 'INSERT') AS inserts,
        COUNT(*) FILTER (WHERE action = 'UPDATE') AS updates,
        COUNT(*) FILTER (WHERE action = 'DELETE') AS deletes,
        COUNT(*) FILTER (WHERE action = 'SELECT') AS selects,
        MAX(created_at) AS last_seen,
        MIN(created_at) AS first_seen,
        array_agg(DISTINCT db_user) AS db_users,
        table_name = ANY(${SENSITIVE_TABLES}) AS is_sensitive
      FROM audit_logs_dml
      WHERE COALESCE(service_name, 'unknown') = ${serviceName}
        AND created_at >= ${sinceDate}
      GROUP BY table_name
      ORDER BY total_hits DESC
    `;

    // Get recent queries sample
    const recentQueries = await prisma.$queryRaw`
      SELECT 
        table_name,
        action,
        db_user,
        query_text,
        created_at
      FROM audit_logs_dml
      WHERE COALESCE(service_name, 'unknown') = ${serviceName}
        AND created_at >= ${sinceDate}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Get daily activity trend
    const dailyTrend = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) AS date,
        COUNT(*) AS hits,
        COUNT(DISTINCT table_name) AS tables_accessed
      FROM audit_logs_dml
      WHERE COALESCE(service_name, 'unknown') = ${serviceName}
        AND created_at >= ${sinceDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Check if marked suspicious
    let isSuspicious = false;
    try {
      const suspiciousRecord = await prisma.$queryRaw`
        SELECT 1 FROM suspicious_services WHERE service_name = ${serviceName}
      `;
      isSuspicious = suspiciousRecord.length > 0;
    } catch (e) {
      // Table might not exist
    }

    res.json({
      success: true,
      data: {
        serviceName,
        isSuspicious,
        period: { days: parseInt(days), since: sinceDate },
        tables: tableStats.map(t => ({
          name: t.table_name,
          actions: t.actions,
          totalHits: Number(t.total_hits),
          breakdown: {
            inserts: Number(t.inserts),
            updates: Number(t.updates),
            deletes: Number(t.deletes),
            selects: Number(t.selects)
          },
          lastSeen: t.last_seen,
          firstSeen: t.first_seen,
          dbUsers: t.db_users,
          isSensitive: t.is_sensitive
        })),
        recentQueries: recentQueries.map(q => ({
          table: q.table_name,
          action: q.action,
          dbUser: q.db_user,
          query: q.query_text?.substring(0, 500),
          timestamp: q.created_at
        })),
        dailyTrend: dailyTrend.map(d => ({
          date: d.date,
          hits: Number(d.hits),
          tablesAccessed: Number(d.tables_accessed)
        }))
      }
    });
  } catch (error) {
    console.error('[serviceTableUsage] Detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service details',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/mark-suspicious
 * Mark a service as suspicious for investigation
 */
router.post('/mark-suspicious', async (req, res) => {
  try {
    const { serviceName, reason, severity = 'MEDIUM' } = req.body;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'serviceName is required'
      });
    }

    // Ensure suspicious_services table exists
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS suspicious_services (
        id SERIAL PRIMARY KEY,
        service_name TEXT NOT NULL UNIQUE,
        reason TEXT,
        severity TEXT DEFAULT 'MEDIUM',
        marked_by INTEGER,
        marked_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolved_by INTEGER,
        notes TEXT
      )
    `;

    // Insert or update
    await prisma.$executeRaw`
      INSERT INTO suspicious_services (service_name, reason, severity, marked_by, marked_at)
      VALUES (${serviceName}, ${reason || 'Flagged for review'}, ${severity}, ${req.user.id}, NOW())
      ON CONFLICT (service_name) 
      DO UPDATE SET 
        reason = EXCLUDED.reason,
        severity = EXCLUDED.severity,
        marked_by = EXCLUDED.marked_by,
        marked_at = NOW(),
        resolved_at = NULL,
        resolved_by = NULL
    `;

    // Log security event
    try {
      await prisma.$executeRaw`
        INSERT INTO security_events (event_type, severity, user_id, details, created_at)
        VALUES (
          'SERVICE_MARKED_SUSPICIOUS',
          ${severity},
          ${req.user.id},
          ${JSON.stringify({ serviceName, reason })}::jsonb,
          NOW()
        )
      `;
    } catch (e) {
      // security_events table might not exist
    }

    res.json({
      success: true,
      message: `Service '${serviceName}' marked as suspicious`,
      data: { serviceName, reason, severity, markedBy: req.user.id }
    });
  } catch (error) {
    console.error('[serviceTableUsage] Mark suspicious error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark service as suspicious',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/resolve-suspicious
 * Resolve a suspicious service flag
 */
router.post('/resolve-suspicious', async (req, res) => {
  try {
    const { serviceName, notes } = req.body;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'serviceName is required'
      });
    }

    await prisma.$executeRaw`
      UPDATE suspicious_services
      SET resolved_at = NOW(),
          resolved_by = ${req.user.id},
          notes = ${notes || 'Resolved'}
      WHERE service_name = ${serviceName}
    `;

    res.json({
      success: true,
      message: `Service '${serviceName}' marked as resolved`,
      data: { serviceName, resolvedBy: req.user.id }
    });
  } catch (error) {
    console.error('[serviceTableUsage] Resolve error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve suspicious flag',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/sensitive-tables
 * Get access stats for sensitive tables only
 */
router.get('/sensitive-tables', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - parseInt(hours));

    const stats = await prisma.$queryRaw`
      SELECT 
        table_name,
        array_agg(DISTINCT service_name) AS services,
        array_agg(DISTINCT action) AS actions,
        array_agg(DISTINCT db_user) AS db_users,
        COUNT(*) AS total_hits,
        MAX(created_at) AS last_access
      FROM audit_logs_dml
      WHERE table_name = ANY(${SENSITIVE_TABLES})
        AND created_at >= ${sinceDate}
      GROUP BY table_name
      ORDER BY total_hits DESC
    `;

    res.json({
      success: true,
      data: {
        period: { hours: parseInt(hours), since: sinceDate },
        tables: stats.map(t => ({
          name: t.table_name,
          services: t.services.filter(Boolean),
          actions: t.actions,
          dbUsers: t.db_users.filter(Boolean),
          totalHits: Number(t.total_hits),
          lastAccess: t.last_access
        })),
        sensitiveTablesList: SENSITIVE_TABLES
      }
    });
  } catch (error) {
    console.error('[serviceTableUsage] Sensitive tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensitive table access',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/suspicious-services
 * List all flagged suspicious services
 */
router.get('/suspicious-services', async (req, res) => {
  try {
    const { includeResolved = false } = req.query;

    let result;
    if (includeResolved === 'true') {
      result = await prisma.$queryRaw`
        SELECT * FROM suspicious_services ORDER BY marked_at DESC
      `;
    } else {
      result = await prisma.$queryRaw`
        SELECT * FROM suspicious_services 
        WHERE resolved_at IS NULL 
        ORDER BY marked_at DESC
      `;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    // Table might not exist
    res.json({
      success: true,
      data: []
    });
  }
});

module.exports = router;
