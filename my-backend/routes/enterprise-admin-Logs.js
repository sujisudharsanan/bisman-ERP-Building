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

// Get Activity Logs with Filters
router.get('/', requireEnterpriseAdmin, async (req, res) => {
  try {
    const range = req.query.range || 'today';
    const limit = parseInt(req.query.limit) || 500;
    const level = req.query.level || '';
    const module = req.query.module || '';

    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    switch (range) {
      case 'today':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        };
        break;
      case 'week':
        dateFilter = {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        };
        break;
      case 'month':
        dateFilter = {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
        break;
      default:
        // 'all' - no date filter
        break;
    }

    const where = {
      ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
    };

    const [logs, stats] = await Promise.all([
      prisma.recent_activity.findMany({
        where,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entity_id: true,
          username: true,
          details: true,
          created_at: true
        }
      }),
      prisma.recent_activity.groupBy({
        by: ['action'],
        where,
        _count: { id: true }
      })
    ]);

    // Transform logs to match frontend interface
    const transformedLogs = logs.map(log => {
      // Determine log level based on action
      let level = 'info';
      const action = log.action.toUpperCase();
      if (action.includes('ERROR') || action.includes('FAIL') || action.includes('DELETE')) {
        level = 'error';
      } else if (action.includes('WARN') || action.includes('SUSPEND')) {
        level = 'warning';
      } else if (action.includes('SUCCESS') || action.includes('CREATE') || action.includes('ACTIVATE')) {
        level = 'success';
      }

      return {
        id: log.id,
        timestamp: log.created_at?.toISOString() || new Date().toISOString(),
        level,
        action: log.action,
        user: log.username || 'System',
        module: log.entity || 'system',
        details: typeof log.details === 'object' ? JSON.stringify(log.details) : log.details,
        ip_address: ''
      };
    });

    // Calculate stats
    const totalLogs = logs.length;
    const errorLogs = transformedLogs.filter(l => l.level === 'error').length;
    const warningLogs = transformedLogs.filter(l => l.level === 'warning').length;
    const infoLogs = transformedLogs.filter(l => l.level === 'info' || l.level === 'success').length;

    res.json({
      ok: true,
      logs: transformedLogs,
      stats: {
        total: totalLogs,
        errors: errorLogs,
        warnings: warningLogs,
        info: infoLogs
      }
    });
  } catch (error) {
    console.error('[Activity Logs Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch activity logs' });
  }
});

// Get Logs by Module
router.get('/by-module', requireEnterpriseAdmin, async (req, res) => {
  try {
    const modules = await prisma.recent_activity.groupBy({
      by: ['entity'],
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    res.json({
      ok: true,
      modules: modules.map(m => ({
        module: m.entity || 'unknown',
        count: m._count.id
      }))
    });
  } catch (error) {
    console.error('[Logs By Module Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch module stats' });
  }
});

// Get Logs by User
router.get('/by-user', requireEnterpriseAdmin, async (req, res) => {
  try {
    const users = await prisma.recent_activity.groupBy({
      by: ['username'],
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    res.json({
      ok: true,
      users: users.map(u => ({
        username: u.username || 'Unknown',
        count: u._count.id
      }))
    });
  } catch (error) {
    console.error('[Logs By User Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user stats' });
  }
});

// Export Logs
router.get('/export', requireEnterpriseAdmin, async (req, res) => {
  try {
    const range = req.query.range || 'today';
    
    let dateFilter = {};
    const now = new Date();
    
    switch (range) {
      case 'today':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        };
        break;
      case 'week':
        dateFilter = {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        };
        break;
      case 'month':
        dateFilter = {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        };
        break;
    }

    const logs = await prisma.recent_activity.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { created_at: dateFilter })
      },
      orderBy: { created_at: 'desc' }
    });

    // Convert to CSV
    const csvHeader = 'Timestamp,Action,Entity,User,Details\n';
    const csvRows = logs.map(log => 
      `"${log.created_at?.toISOString() || ''}","${log.action}","${log.entity || ''}","${log.username || ''}","${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity-logs-${range}-${Date.now()}.csv"`);
    res.send(csvHeader + csvRows);
  } catch (error) {
    console.error('[Export Logs Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to export logs' });
  }
});

module.exports = router;
