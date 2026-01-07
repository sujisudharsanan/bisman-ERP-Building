const express = require('express');
const router = express.Router();
// Use shared prisma instance from app.locals instead of creating new one
let prisma = null;

// Middleware to get prisma from app.locals
const getPrisma = (req, res, next) => {
  prisma = req.app.locals.prisma;
  if (!prisma) {
    return res.status(500).json({ ok: false, error: 'Database not available' });
  }
  next();
};

// Middleware to verify enterprise admin role
const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ 
      ok: false, 
      error: 'Access denied. Enterprise Admin role required.' 
    });
  }
  next();
};

// ====================
// DASHBOARD STATS
// ====================
router.get('/stats', getPrisma, requireEnterpriseAdmin, async (req, res) => {
  try {
    const [superAdminsCount, modulesCount, clientsCount, recentActivityCount] = await Promise.all([
      prisma.super_admins.count({ where: { is_active: true } }).catch(() => 0),
      prisma.modules.count({ where: { is_active: true } }).catch(() => 0),
      prisma.clients.count({ where: { is_active: true } }).catch(() => 0),
      prisma.recent_activity.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
          }
        }
      }).catch(() => 0)
    ]);

    // System health check (simple version - check if we can query)
    let systemHealth = 'operational';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      systemHealth = 'degraded';
    }

    res.json({
      ok: true,
      stats: {
        totalSuperAdmins: superAdminsCount,
        totalModules: modulesCount,
        activeTenants: clientsCount,
        recentActivity24h: recentActivityCount,
        systemHealth
      }
    });
  } catch (error) {
    console.error('[Enterprise Dashboard Stats Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch dashboard stats' 
    });
  }
});

// ====================
// SUPER ADMIN DISTRIBUTION
// ====================
router.get('/super-admin-distribution', getPrisma, requireEnterpriseAdmin, async (req, res) => {
  try {
    const distribution = await prisma.super_admins.groupBy({
      by: ['productType'],
      where: { is_active: true },
      _count: { id: true }
    }).catch(() => []);

    const formatted = distribution.map(item => ({
      name: item.productType === 'PUMP_ERP' ? 'Pump Management' : 'Business ERP',
      value: item._count.id,
      color: item.productType === 'PUMP_ERP' ? '#ec4899' : '#8b5cf6'
    }));

    res.json({
      ok: true,
      distribution: formatted
    });
  } catch (error) {
    console.error('[Super Admin Distribution Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch distribution data' 
    });
  }
});

// ====================
// ACTIVITY LOGS
// ====================
router.get('/activity', getPrisma, requireEnterpriseAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const activities = await prisma.recent_activity.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        action: true,
        entity: true,
        username: true,
        created_at: true,
        details: true
      }
    });

    const formatted = activities.map(activity => ({
      id: activity.id,
      action: `${activity.action} ${activity.entity}`,
      timestamp: activity.created_at.toISOString(),
      user: activity.username || 'System',
      details: activity.details
    }));

    res.json({
      ok: true,
      activities: formatted
    });
  } catch (error) {
    console.error('[Activity Logs Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch activity logs' 
    });
  }
});

// ====================
// SYSTEM INSIGHTS
// ====================
router.get('/insights', getPrisma, requireEnterpriseAdmin, async (req, res) => {
  try {
    // Get active connections count
    const activeConnections = await prisma.user_sessions.count({
      where: {
        is_active: true,
        expires_at: { gte: new Date() }
      }
    }).catch(() => 0);

    // Get last backup from system health metrics or recent activity
    let lastBackup = null;
    try {
      const backupLog = await prisma.recent_activity.findFirst({
        where: { 
          OR: [
            { action: { contains: 'backup', mode: 'insensitive' } },
            { entity: 'backup' }
          ]
        },
        orderBy: { created_at: 'desc' }
      });
      lastBackup = backupLog?.created_at?.toISOString() || null;
    } catch {
      // If no backup logged, check system health metrics
      try {
        const backupMetric = await prisma.system_health_metric.findFirst({
          where: { metric_name: 'last_backup' },
          orderBy: { recorded_at: 'desc' }
        });
        lastBackup = backupMetric?.recorded_at?.toISOString() || null;
      } catch {
        lastBackup = null;
      }
    }

    // Calculate uptime from system health metrics or default
    let apiUptime = 99.9;
    try {
      const uptimeMetric = await prisma.system_health_metric.findFirst({
        where: { metric_name: 'api_uptime' },
        orderBy: { recorded_at: 'desc' }
      });
      if (uptimeMetric) {
        apiUptime = parseFloat(uptimeMetric.metric_value);
      }
    } catch {
      // Use default uptime
    }

    res.json({
      ok: true,
      insights: {
        apiUptime,
        dbConnections: activeConnections,
        lastBackup: lastBackup || 'No backup recorded'
      }
    });
  } catch (error) {
    console.error('[System Insights Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch system insights' 
    });
  }
});

// ====================
// MODULE USAGE TRENDS
// ====================
router.get('/module-usage-trends', getPrisma, requireEnterpriseAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    
    // Get module assignment trends over time - use parameterized query
    const trends = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(assigned_at, 'Mon') as month,
        COUNT(DISTINCT super_admin_id) as users
      FROM module_assignments
      WHERE assigned_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', assigned_at), TO_CHAR(assigned_at, 'Mon')
      ORDER BY DATE_TRUNC('month', assigned_at)
    `.catch(() => []);

    res.json({
      ok: true,
      trends: (trends || []).map(t => ({
        month: t.month,
        users: parseInt(t.users)
      }))
    });
  } catch (error) {
    console.error('[Module Usage Trends Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch module usage trends' 
    });
  }
});

module.exports = router;
