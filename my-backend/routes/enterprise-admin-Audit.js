const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }
  next();
};

// Get Audit Logs
router.get('/', requireEnterpriseAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const action = req.query.action || '';
    const entity = req.query.entity || '';
    const skip = (page - 1) * limit;

    const where = {
      ...(action && { action }),
      ...(entity && { entity })
    };

    const [logs, total] = await Promise.all([
      prisma.recent_activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.recent_activity.count({ where })
    ]);

    res.json({
      ok: true,
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entity_id,
        username: log.username,
        details: log.details,
        createdAt: log.created_at?.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Audit Logs Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit logs' });
  }
});

// Get Audit Summary
router.get('/summary', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [actionStats, entityStats, recentActivity] = await Promise.all([
      prisma.recent_activity.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      prisma.recent_activity.groupBy({
        by: ['entity'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      prisma.recent_activity.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      ok: true,
      summary: {
        actionStats: actionStats.map(a => ({
          action: a.action,
          count: a._count.id
        })),
        entityStats: entityStats.map(e => ({
          entity: e.entity,
          count: e._count.id
        })),
        recentActivity24h: recentActivity
      }
    });
  } catch (error) {
    console.error('[Audit Summary Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit summary' });
  }
});

// Export Audit Logs
router.get('/export', requireEnterpriseAdmin, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const logs = await prisma.recent_activity.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Convert to CSV
    const csvHeader = 'ID,Action,Entity,Entity ID,Username,Created At,Details\n';
    const csvRows = logs.map(log => 
      `${log.id},"${log.action}","${log.entity}","${log.entity_id || ''}","${log.username || ''}","${log.created_at?.toISOString() || ''}","${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csvHeader + csvRows);
  } catch (error) {
    console.error('[Export Audit Logs Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to export audit logs' });
  }
});

module.exports = router;
