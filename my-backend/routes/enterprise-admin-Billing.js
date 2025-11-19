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

// Get Billing Overview
router.get('/overview', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [totalClients, activeSubscriptions, planDistribution] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { subscriptionStatus: 'active' } }),
      prisma.client.groupBy({
        by: ['subscriptionPlan'],
        _count: { id: true }
      })
    ]);

    // Calculate MRR (Mock pricing - adjust based on your actual plans)
    const planPricing = { free: 0, starter: 29, professional: 99, enterprise: 299 };
    const mrr = planDistribution.reduce((sum, item) => {
      const price = planPricing[item.subscriptionPlan] || 0;
      return sum + (price * item._count.id);
    }, 0);

    res.json({
      ok: true,
      overview: {
        totalClients,
        activeSubscriptions,
        mrr,
        arr: mrr * 12,
        planDistribution: planDistribution.map(p => ({
          plan: p.subscriptionPlan,
          count: p._count.id
        }))
      }
    });
  } catch (error) {
    console.error('[Billing Overview Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch billing overview' });
  }
});

// Get Revenue Trends
router.get('/revenue-trends', requireEnterpriseAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    
    // Mock revenue trends - implement based on your payment/invoice system
    const trends = [];
    const planPricing = { free: 0, starter: 29, professional: 99, enterprise: 299 };
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const monthClients = await prisma.client.count({
        where: {
          created_at: { lte: date },
          subscriptionStatus: 'active'
        }
      });
      
      trends.push({
        month: date.toLocaleString('default', { month: 'short' }),
        revenue: monthClients * 50 // Simplified - implement actual calculation
      });
    }

    res.json({ ok: true, trends });
  } catch (error) {
    console.error('[Revenue Trends Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch revenue trends' });
  }
});

// Get Subscription Analytics
router.get('/subscription-analytics', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [byStatus, byPlan] = await Promise.all([
      prisma.client.groupBy({
        by: ['subscriptionStatus'],
        _count: { id: true }
      }),
      prisma.client.groupBy({
        by: ['subscriptionPlan'],
        _count: { id: true }
      })
    ]);

    res.json({
      ok: true,
      analytics: {
        byStatus: byStatus.map(s => ({
          status: s.subscriptionStatus,
          count: s._count.id
        })),
        byPlan: byPlan.map(p => ({
          plan: p.subscriptionPlan,
          count: p._count.id
        }))
      }
    });
  } catch (error) {
    console.error('[Subscription Analytics Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
