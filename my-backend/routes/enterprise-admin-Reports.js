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

// System Overview Report
router.get('/system-overview', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [
      totalSuperAdmins,
      totalClients,
      totalUsers,
      totalModules,
      activeModuleAssignments
    ] = await Promise.all([
      prisma.superAdmin.count({ where: { is_active: true } }),
      prisma.client.count({ where: { is_active: true } }),
      prisma.user.count(),
      prisma.module.count({ where: { is_active: true } }),
      prisma.moduleAssignment.count()
    ]);

    res.json({
      ok: true,
      report: {
        totalSuperAdmins,
        totalClients,
        totalUsers,
        totalModules,
        activeModuleAssignments,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[System Overview Report Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate report' });
  }
});

// User Growth Report
router.get('/user-growth', requireEnterpriseAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    
    const growth = await prisma.$queryRaw`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${months} months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `;

    res.json({
      ok: true,
      growth: growth.map(g => ({
        month: g.month,
        count: parseInt(g.count)
      }))
    });
  } catch (error) {
    console.error('[User Growth Report Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate report' });
  }
});

// Client Activity Report
router.get('/client-activity', requireEnterpriseAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const activity = await prisma.$queryRaw`
      SELECT 
        c.id,
        c.name,
        COUNT(u.id) as user_count,
        c.product_type,
        c.subscription_plan,
        c.is_active
      FROM clients c
      LEFT JOIN users u ON c.id::text = u.tenant_id
      WHERE c.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY c.id, c.name, c.product_type, c.subscription_plan, c.is_active
      ORDER BY user_count DESC
    `;

    res.json({
      ok: true,
      activity: activity.map(a => ({
        id: a.id,
        name: a.name,
        userCount: parseInt(a.user_count),
        productType: a.product_type,
        subscriptionPlan: a.subscription_plan,
        isActive: a.is_active
      }))
    });
  } catch (error) {
    console.error('[Client Activity Report Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate report' });
  }
});

// Module Adoption Report
router.get('/module-adoption', requireEnterpriseAdmin, async (req, res) => {
  try {
    const adoption = await prisma.$queryRaw`
      SELECT 
        m.display_name,
        m.product_type,
        COUNT(DISTINCT ma.super_admin_id) as assignments,
        m.is_active
      FROM modules m
      LEFT JOIN module_assignments ma ON m.id = ma.module_id
      GROUP BY m.id, m.display_name, m.product_type, m.is_active
      ORDER BY assignments DESC
    `;

    res.json({
      ok: true,
      adoption: adoption.map(a => ({
        moduleName: a.display_name,
        productType: a.product_type,
        assignments: parseInt(a.assignments),
        isActive: a.is_active
      }))
    });
  } catch (error) {
    console.error('[Module Adoption Report Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate report' });
  }
});

// Performance Metrics Report
router.get('/performance', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [activeSessions, recentLogins, errorRate] = await Promise.all([
      prisma.user_sessions.count({
        where: {
          is_active: true,
          expires_at: { gte: new Date() }
        }
      }),
      prisma.user_sessions.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.recent_activity.count({
        where: {
          action: 'ERROR',
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      ok: true,
      metrics: {
        activeSessions,
        recentLogins24h: recentLogins,
        errors24h: errorRate,
        uptime: 99.9, // Implement actual uptime monitoring
        responseTime: 120 // Implement actual response time tracking
      }
    });
  } catch (error) {
    console.error('[Performance Report Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate report' });
  }
});

module.exports = router;
