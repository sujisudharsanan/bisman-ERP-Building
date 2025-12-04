/**
 * Audit Routes - Service → Table Usage from DML Audit Logs
 * 
 * Provides aggregated view of which services access which tables,
 * with filtering, pagination, and detailed event drilldown.
 * 
 * @module routes/admin/auditRoutes
 * 
 * Endpoints:
 *   GET /api/audit/services          - Aggregated service→table usage
 *   GET /api/audit/services/:name    - Detailed events for a service
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../../lib/prisma');

// ============================================================================
// MIDDLEWARE STUB - Replace with real Enterprise Admin check
// ============================================================================

/**
 * Middleware: Verify user is Enterprise Admin
 * TODO: Replace with actual implementation from your auth system
 * 
 * @example
 * // Real implementation might look like:
 * const isEnterpriseAdmin = require('../../middleware/rbacMiddleware').requireRole('ENTERPRISE_ADMIN');
 */
const isEnterpriseAdmin = (req, res, next) => {
  // STUB: Replace with real check
  // Example real check:
  // if (!req.user || req.user.userType !== 'ENTERPRISE_ADMIN') {
  //   return res.status(403).json({ error: 'forbidden', message: 'Enterprise Admin access required' });
  // }
  
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
  }
  
  // TODO: Uncomment for production
  // const adminRoles = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'];
  // const userRole = (req.user.userType || req.user.role || '').toUpperCase();
  // if (!adminRoles.includes(userRole)) {
  //   return res.status(403).json({ error: 'forbidden' });
  // }
  
  next();
};

// ============================================================================
// INPUT SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize string input - remove dangerous characters
 */
function sanitizeString(input, maxLength = 100) {
  if (!input || typeof input !== 'string') return null;
  // Remove SQL injection patterns, keep alphanumeric, underscore, hyphen, dot
  return input
    .slice(0, maxLength)
    .replace(/[^a-zA-Z0-9_\-.:]/g, '')
    .trim() || null;
}

/**
 * Parse and validate pagination params
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

/**
 * Parse date range params
 */
function parseDateRange(query) {
  let from = null;
  let to = null;

  if (query.from) {
    const parsed = new Date(query.from);
    if (!isNaN(parsed.getTime())) {
      from = parsed;
    }
  }

  if (query.to) {
    const parsed = new Date(query.to);
    if (!isNaN(parsed.getTime())) {
      to = parsed;
    }
  }

  // Default: last 30 days if no range specified
  if (!from && !to) {
    from = new Date();
    from.setDate(from.getDate() - 30);
  }

  return { from, to };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/audit/services
 * 
 * Returns aggregated service → table usage from audit_logs_dml
 * 
 * Query params:
 *   - service: Filter by service name (optional)
 *   - table: Filter by table name (optional)
 *   - from: Start date ISO string (optional, default: 30 days ago)
 *   - to: End date ISO string (optional)
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 20, max: 100)
 * 
 * Response:
 *   {
 *     services: [
 *       { service_name, table_name, operation, event_count, last_event, first_event }
 *     ],
 *     meta: { page, pageSize, total, totalPages }
 *   }
 */
router.get('/services', isEnterpriseAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { page, pageSize, offset } = parsePagination(req.query);
    const { from, to } = parseDateRange(req.query);
    
    // Sanitize filter inputs
    const serviceFilter = sanitizeString(req.query.service);
    const tableFilter = sanitizeString(req.query.table);

    // Build WHERE conditions with parameterized queries
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(to);
    }
    if (serviceFilter) {
      conditions.push(`service_name ILIKE $${paramIndex++}`);
      params.push(`%${serviceFilter}%`);
    }
    if (tableFilter) {
      conditions.push(`table_name ILIKE $${paramIndex++}`);
      params.push(`%${tableFilter}%`);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Count total distinct combinations for pagination
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT DISTINCT service_name, table_name, operation
        FROM audit_logs_dml
        ${whereClause}
      ) as distinct_combinations
    `;

    // Main aggregation query
    const dataQuery = `
      SELECT 
        service_name,
        table_name,
        operation,
        COUNT(*) as event_count,
        MAX(created_at) as last_event,
        MIN(created_at) as first_event
      FROM audit_logs_dml
      ${whereClause}
      GROUP BY service_name, table_name, operation
      ORDER BY event_count DESC, last_event DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    // Execute queries
    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...params),
      prisma.$queryRawUnsafe(dataQuery, ...params, pageSize, offset)
    ]);

    const total = parseInt(countResult[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / pageSize);

    // Format response
    const services = dataResult.map(row => ({
      service_name: row.service_name || 'unknown',
      table_name: row.table_name,
      operation: row.operation,
      event_count: parseInt(row.event_count, 10),
      last_event: row.last_event?.toISOString() || null,
      first_event: row.first_event?.toISOString() || null
    }));

    return res.json({
      services,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        filters: {
          service: serviceFilter,
          table: tableFilter,
          from: from?.toISOString() || null,
          to: to?.toISOString() || null
        }
      }
    });

  } catch (error) {
    console.error('[auditRoutes] GET /services error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch audit service data'
    });
  }
});

/**
 * GET /api/audit/services/:name
 * 
 * Returns detailed events for a specific service (last 100 events)
 * 
 * Path params:
 *   - name: Service name
 * 
 * Query params:
 *   - table: Filter by table name (optional)
 *   - operation: Filter by operation (INSERT/UPDATE/DELETE) (optional)
 *   - from: Start date (optional)
 *   - to: End date (optional)
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 100, max: 100)
 * 
 * Response:
 *   {
 *     service: "service-name",
 *     events: [...],
 *     meta: { page, pageSize, total, totalPages }
 *   }
 */
router.get('/services/:name', isEnterpriseAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const serviceName = sanitizeString(req.params.name, 200);

    if (!serviceName) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Invalid service name'
      });
    }

    const { page, pageSize, offset } = parsePagination({ 
      ...req.query, 
      pageSize: req.query.pageSize || '100' 
    });
    const { from, to } = parseDateRange(req.query);

    // Sanitize additional filters
    const tableFilter = sanitizeString(req.query.table);
    const operationFilter = sanitizeString(req.query.operation, 10);

    // Validate operation if provided
    const validOperations = ['INSERT', 'UPDATE', 'DELETE'];
    const operation = operationFilter && validOperations.includes(operationFilter.toUpperCase())
      ? operationFilter.toUpperCase()
      : null;

    // Build WHERE conditions
    const conditions = ['service_name = $1'];
    const params = [serviceName];
    let paramIndex = 2;

    if (from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(to);
    }
    if (tableFilter) {
      conditions.push(`table_name ILIKE $${paramIndex++}`);
      params.push(`%${tableFilter}%`);
    }
    if (operation) {
      conditions.push(`operation = $${paramIndex++}`);
      params.push(operation);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs_dml
      ${whereClause}
    `;

    // Data query - last 100 events with details
    const dataQuery = `
      SELECT 
        id,
        table_name,
        operation,
        row_id,
        old_data,
        new_data,
        user_id,
        session_id,
        ip_address,
        user_agent,
        created_at
      FROM audit_logs_dml
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    // Execute queries
    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...params),
      prisma.$queryRawUnsafe(dataQuery, ...params, pageSize, offset)
    ]);

    const total = parseInt(countResult[0]?.total || 0, 10);
    const totalPages = Math.ceil(total / pageSize);

    // Format events - parse JSON fields safely
    const events = dataResult.map(row => ({
      id: row.id,
      table_name: row.table_name,
      operation: row.operation,
      row_id: row.row_id,
      old_data: typeof row.old_data === 'string' ? JSON.parse(row.old_data) : row.old_data,
      new_data: typeof row.new_data === 'string' ? JSON.parse(row.new_data) : row.new_data,
      user_id: row.user_id,
      session_id: row.session_id,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: row.created_at?.toISOString() || null
    }));

    // Get summary stats for this service
    const summaryQuery = `
      SELECT 
        table_name,
        operation,
        COUNT(*) as count
      FROM audit_logs_dml
      ${whereClause}
      GROUP BY table_name, operation
      ORDER BY count DESC
      LIMIT 20
    `;
    
    const summaryResult = await prisma.$queryRawUnsafe(summaryQuery, ...params);

    const summary = summaryResult.map(row => ({
      table_name: row.table_name,
      operation: row.operation,
      count: parseInt(row.count, 10)
    }));

    return res.json({
      service: serviceName,
      events,
      summary,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        filters: {
          table: tableFilter,
          operation,
          from: from?.toISOString() || null,
          to: to?.toISOString() || null
        }
      }
    });

  } catch (error) {
    console.error('[auditRoutes] GET /services/:name error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch service audit details'
    });
  }
});

/**
 * GET /api/audit/tables
 * 
 * Returns aggregated table usage across all services
 * Useful for seeing which tables are most accessed
 */
router.get('/tables', isEnterpriseAdmin, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { page, pageSize, offset } = parsePagination(req.query);
    const { from, to } = parseDateRange(req.query);

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (from) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(to);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    const query = `
      SELECT 
        table_name,
        COUNT(*) as total_events,
        COUNT(DISTINCT service_name) as service_count,
        COUNT(DISTINCT user_id) as user_count,
        SUM(CASE WHEN operation = 'INSERT' THEN 1 ELSE 0 END) as inserts,
        SUM(CASE WHEN operation = 'UPDATE' THEN 1 ELSE 0 END) as updates,
        SUM(CASE WHEN operation = 'DELETE' THEN 1 ELSE 0 END) as deletes,
        MAX(created_at) as last_event
      FROM audit_logs_dml
      ${whereClause}
      GROUP BY table_name
      ORDER BY total_events DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT table_name) as total
      FROM audit_logs_dml
      ${whereClause}
    `;

    const [countResult, dataResult] = await Promise.all([
      prisma.$queryRawUnsafe(countQuery, ...params),
      prisma.$queryRawUnsafe(query, ...params, pageSize, offset)
    ]);

    const total = parseInt(countResult[0]?.total || 0, 10);

    const tables = dataResult.map(row => ({
      table_name: row.table_name,
      total_events: parseInt(row.total_events, 10),
      service_count: parseInt(row.service_count, 10),
      user_count: parseInt(row.user_count, 10),
      operations: {
        inserts: parseInt(row.inserts, 10),
        updates: parseInt(row.updates, 10),
        deletes: parseInt(row.deletes, 10)
      },
      last_event: row.last_event?.toISOString() || null
    }));

    return res.json({
      tables,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error('[auditRoutes] GET /tables error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch table audit data'
    });
  }
});

module.exports = router;

/* ============================================================================
 * USAGE EXAMPLE - Add to your main app.js or routes/index.js
 * ============================================================================
 *
 * const auditRoutes = require('./routes/admin/auditRoutes');
 * 
 * // Mount with /api/audit prefix
 * app.use('/api/audit', auditRoutes);
 *
 * // Or with authentication middleware
 * app.use('/api/audit', authenticate, auditRoutes);
 *
 * ============================================================================
 * 
 * CURL EXAMPLES:
 * 
 * # Get all service->table usage (last 30 days)
 * curl -X GET "http://localhost:3001/api/audit/services" \
 *   -H "Authorization: Bearer $TOKEN"
 *
 * # Filter by service name
 * curl -X GET "http://localhost:3001/api/audit/services?service=inventory&page=1&pageSize=10" \
 *   -H "Authorization: Bearer $TOKEN"
 *
 * # Get detailed events for a service
 * curl -X GET "http://localhost:3001/api/audit/services/inventory-service?table=items" \
 *   -H "Authorization: Bearer $TOKEN"
 *
 * # Get table usage summary
 * curl -X GET "http://localhost:3001/api/audit/tables" \
 *   -H "Authorization: Bearer $TOKEN"
 *
 * ============================================================================ */
