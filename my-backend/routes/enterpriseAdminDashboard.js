const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
router.get('/stats', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [superAdminsCount, modulesCount, clientsCount, recentActivity] = await Promise.all([
      prisma.superAdmin.count({ where: { is_active: true } }),
      prisma.module.count({ where: { is_active: true } }),
      prisma.client.count({ where: { is_active: true } }),
      prisma.recent_activity.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24h
          }
        }
      })
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
        recentActivity24h: recentActivity,
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
router.get('/super-admin-distribution', requireEnterpriseAdmin, async (req, res) => {
  try {
    const distribution = await prisma.superAdmin.groupBy({
      by: ['productType'],
      where: { is_active: true },
      _count: { id: true }
    });

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
router.get('/activity', requireEnterpriseAdmin, async (req, res) => {
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
router.get('/insights', requireEnterpriseAdmin, async (req, res) => {
  try {
    // Get active connections count
    const activeConnections = await prisma.user_sessions.count({
      where: {
        is_active: true,
        expires_at: { gte: new Date() }
      }
    });

    // Get last backup time (mock for now - implement based on your backup strategy)
    const lastBackup = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Calculate uptime (in production, use proper monitoring)
    const apiUptime = 99.9;

    res.json({
      ok: true,
      insights: {
        apiUptime,
        dbConnections: activeConnections,
        lastBackup
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
router.get('/module-usage-trends', requireEnterpriseAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    
    // Get module assignment trends over time
    const trends = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(assigned_at, 'Mon') as month,
        COUNT(DISTINCT super_admin_id) as users
      FROM module_assignments
      WHERE assigned_at >= NOW() - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', assigned_at), TO_CHAR(assigned_at, 'Mon')
      ORDER BY DATE_TRUNC('month', assigned_at)
    `;

    res.json({
      ok: true,
      trends: trends.map(t => ({
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
