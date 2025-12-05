/**
 * Analytics API Routes
 * 
 * Endpoints for:
 * - Usage dashboards
 * - Event queries
 * - CSV/JSON exports
 * - Admin reports
 */

const express = require('express');
const router = express.Router();
const { authenticate, setTenantContext, requireRole } = require('../../middleware/auth');
const analyticsService = require('../../services/analytics/analyticsService');
const prisma = require('../../lib/prisma');

// All routes require authentication
router.use(authenticate);
router.use(setTenantContext);

/**
 * GET /api/analytics/summary
 * 
 * Get usage summary for current tenant
 */
router.get('/summary', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get aggregated usage from tenant_usage
    const usage = await prisma.tenantUsage.findMany({
      where: {
        tenant_id: tenantId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'desc' }
    });

    // Calculate totals
    const totals = usage.reduce((acc, day) => ({
      apiCalls: acc.apiCalls + day.api_calls,
      activeUsers: Math.max(acc.activeUsers, day.active_users),
      storageBytes: day.storage_bytes // Latest storage
    }), { apiCalls: 0, activeUsers: 0, storageBytes: 0 });

    // Get event type breakdown
    const eventCounts = await analyticsService.getEventCounts(
      tenantId,
      startDate,
      endDate
    );

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totals,
      eventCounts,
      dailyUsage: usage.map(u => ({
        date: u.date,
        apiCalls: u.api_calls,
        activeUsers: u.active_users,
        storageBytes: u.storage_bytes
      }))
    });

  } catch (error) {
    console.error('[Analytics] Summary error:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

/**
 * GET /api/analytics/events
 * 
 * Query events with filtering
 */
router.get('/events', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      eventType,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const result = await analyticsService.getEvents(tenantId, {
      eventType,
      startDate,
      endDate,
      limit: Math.min(parseInt(limit), 1000),
      offset: parseInt(offset)
    });

    res.json(result);

  } catch (error) {
    console.error('[Analytics] Events query error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

/**
 * GET /api/analytics/daily
 * 
 * Get daily event counts for charts
 */
router.get('/daily', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      eventType,
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    const data = await analyticsService.getDailyEventCounts(
      tenantId,
      startDate,
      endDate,
      eventType
    );

    res.json({ data });

  } catch (error) {
    console.error('[Analytics] Daily counts error:', error);
    res.status(500).json({ error: 'Failed to get daily counts' });
  }
});

/**
 * GET /api/analytics/active-users
 * 
 * Get active users count
 */
router.get('/active-users', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    const count = await analyticsService.getActiveUsersCount(
      tenantId,
      startDate,
      endDate
    );

    res.json({ activeUsers: count });

  } catch (error) {
    console.error('[Analytics] Active users error:', error);
    res.status(500).json({ error: 'Failed to get active users' });
  }
});

/**
 * GET /api/analytics/export
 * 
 * Export usage data as CSV or JSON
 */
router.get('/export', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      format = 'csv',
      type = 'usage', // 'usage' or 'events'
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    let data;

    if (type === 'events') {
      const result = await analyticsService.getEvents(tenantId, {
        startDate,
        endDate,
        limit: 10000
      });
      data = result.events;
    } else {
      data = await prisma.tenantUsage.findMany({
        where: {
          tenant_id: tenantId,
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        orderBy: { date: 'asc' }
      });
    }

    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        return res.status(200)
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="${type}_export.csv"`)
          .send('No data');
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
        Object.values(row).map(v => {
          if (v === null) return '';
          if (typeof v === 'object') return JSON.stringify(v).replace(/"/g, '""');
          return String(v).replace(/"/g, '""');
        }).map(v => `"${v}"`).join(',')
      );

      const csv = [headers, ...rows].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="${type}_export_${startDate.split('T')[0]}_${endDate.split('T')[0]}.csv"`);
      res.send(csv);

    } else {
      res.header('Content-Disposition', `attachment; filename="${type}_export.json"`);
      res.json(data);
    }

  } catch (error) {
    console.error('[Analytics] Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * POST /api/analytics/track
 * 
 * Track custom event (for frontend usage)
 */
router.post('/track', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    const { eventType, payload } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: 'eventType required' });
    }

    // Whitelist allowed event types from frontend
    const allowedTypes = [
      'feature_used',
      'page_view',
      'button_click',
      'form_submit',
      'error_client'
    ];

    if (!allowedTypes.includes(eventType)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    await analyticsService.trackEvent({
      tenantId,
      userId,
      eventType,
      payload: payload || {}
    });

    res.json({ success: true });

  } catch (error) {
    console.error('[Analytics] Track error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// ============================================================================
// Admin Routes (require admin role)
// ============================================================================

/**
 * GET /api/analytics/admin/all-tenants
 * 
 * Get usage for all tenants (super admin only)
 */
router.get('/admin/all-tenants', requireRole(['super_admin']), async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      sortBy = 'apiCalls',
      order = 'desc',
      limit = 50
    } = req.query;

    // Aggregate usage per tenant
    const usage = await prisma.$queryRaw`
      SELECT 
        tu.tenant_id,
        t.name as tenant_name,
        t.plan,
        SUM(tu.api_calls)::int as total_api_calls,
        MAX(tu.storage_bytes)::bigint as current_storage,
        MAX(tu.active_users)::int as max_active_users,
        COUNT(*)::int as days_active
      FROM tenant_usage tu
      JOIN tenants t ON t.id = tu.tenant_id
      WHERE tu.date >= ${new Date(startDate)}
        AND tu.date <= ${new Date(endDate)}
      GROUP BY tu.tenant_id, t.name, t.plan
      ORDER BY total_api_calls DESC
      LIMIT ${parseInt(limit)}
    `;

    res.json({
      startDate,
      endDate,
      tenants: usage
    });

  } catch (error) {
    console.error('[Analytics] Admin all tenants error:', error);
    res.status(500).json({ error: 'Failed to get tenant usage' });
  }
});

/**
 * GET /api/analytics/admin/report
 * 
 * Generate comprehensive usage report
 */
router.get('/admin/report', requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const tenantId = req.query.tenantId || req.tenantId;
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = req.query;

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        created_at: true
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Get usage summary
    const usage = await prisma.tenantUsage.findMany({
      where: {
        tenant_id: tenantId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: { date: 'asc' }
    });

    // Calculate statistics
    const stats = usage.reduce((acc, day) => ({
      totalApiCalls: acc.totalApiCalls + day.api_calls,
      maxDailyApiCalls: Math.max(acc.maxDailyApiCalls, day.api_calls),
      avgDailyApiCalls: 0, // Calculated below
      maxActiveUsers: Math.max(acc.maxActiveUsers, day.active_users),
      currentStorage: day.storage_bytes,
      daysWithActivity: acc.daysWithActivity + (day.api_calls > 0 ? 1 : 0)
    }), {
      totalApiCalls: 0,
      maxDailyApiCalls: 0,
      avgDailyApiCalls: 0,
      maxActiveUsers: 0,
      currentStorage: 0,
      daysWithActivity: 0
    });

    stats.avgDailyApiCalls = usage.length > 0 
      ? Math.round(stats.totalApiCalls / usage.length) 
      : 0;

    // Get event breakdown
    const eventCounts = await analyticsService.getEventCounts(
      tenantId,
      startDate,
      endDate
    );

    // Get top endpoints
    const topEndpoints = await prisma.$queryRaw`
      SELECT 
        payload->>'endpoint' as endpoint,
        COUNT(*)::int as count
      FROM events
      WHERE tenant_id = ${tenantId}::uuid
        AND event_type = 'api_request'
        AND created_at >= ${new Date(startDate)}
        AND created_at <= ${new Date(endDate)}
      GROUP BY payload->>'endpoint'
      ORDER BY count DESC
      LIMIT 10
    `;

    res.json({
      tenant,
      period: { startDate, endDate },
      statistics: stats,
      eventBreakdown: eventCounts,
      topEndpoints,
      dailyUsage: usage.map(u => ({
        date: u.date,
        apiCalls: u.api_calls,
        activeUsers: u.active_users,
        storageBytes: u.storage_bytes
      }))
    });

  } catch (error) {
    console.error('[Analytics] Admin report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * POST /api/analytics/admin/aggregate
 * 
 * Trigger manual aggregation (super admin only)
 */
router.post('/admin/aggregate', requireRole(['super_admin']), async (req, res) => {
  try {
    const { date } = req.body;
    
    const aggregationJob = require('../../jobs/aggregateDailyUsageJob');
    const result = await aggregationJob.aggregateDailyUsage(date ? new Date(date) : null);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[Analytics] Manual aggregation error:', error);
    res.status(500).json({ error: 'Aggregation failed' });
  }
});

module.exports = router;
