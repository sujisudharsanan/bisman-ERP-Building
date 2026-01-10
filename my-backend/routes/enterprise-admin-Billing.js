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

// Get Billing Overview - uses real subscription data
router.get('/overview', requireEnterpriseAdmin, async (req, res) => {
  try {
    // Get all subscription plans with their pricing
    const plans = await prisma.subscription_plans.findMany({
      where: { is_active: true }
    });
    
    // Create pricing map from actual database plans
    const planPricing = {};
    plans.forEach(plan => {
      planPricing[plan.plan_code] = parseFloat(plan.price_monthly) || 0;
    });

    // Get client counts and subscription data
    const [totalClients, clientsByStatus, clientsByPlan, subscriptions] = await Promise.all([
      prisma.clients.count(),
      prisma.clients.groupBy({
        by: ['subscriptionStatus'],
        _count: { id: true }
      }),
      prisma.clients.groupBy({
        by: ['subscriptionPlan'],
        _count: { id: true }
      }),
      prisma.client_subscriptions.findMany({
        where: { is_active: true },
        include: { plan: true }
      })
    ]);

    // Calculate active subscriptions
    const activeSubscriptions = clientsByStatus.find(s => s.subscriptionStatus === 'active')?._count?.id || 0;

    // Calculate MRR from actual subscription data
    let mrr = 0;
    subscriptions.forEach(sub => {
      if (sub.state === 'ACTIVE' || sub.state === 'TRIAL') {
        const monthlyPrice = sub.billing_cycle === 'YEARLY' 
          ? parseFloat(sub.plan.price_yearly) / 12 
          : parseFloat(sub.plan.price_monthly);
        mrr += monthlyPrice;
      }
    });

    // Fallback: Calculate MRR from client subscription plans if no detailed subscriptions
    if (mrr === 0) {
      clientsByPlan.forEach(item => {
        const price = planPricing[item.subscriptionPlan] || 0;
        mrr += price * item._count.id;
      });
    }

    // Get invoice data for more accurate revenue
    const paidInvoices = await prisma.subscriptionInvoice.aggregate({
      where: { status: 'paid' },
      _sum: { total: true },
      _count: { id: true }
    });

    res.json({
      ok: true,
      overview: {
        totalClients,
        activeSubscriptions,
        mrr: Math.round(mrr),
        arr: Math.round(mrr * 12),
        totalRevenue: paidInvoices._sum?.total ? parseFloat(paidInvoices._sum.total) : 0,
        paidInvoiceCount: paidInvoices._count?.id || 0,
        planDistribution: clientsByPlan.map(p => ({
          plan: p.subscriptionPlan,
          count: p._count.id
        })),
        statusDistribution: clientsByStatus.map(s => ({
          status: s.subscriptionStatus,
          count: s._count.id
        }))
      }
    });
  } catch (error) {
    console.error('[Billing Overview Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch billing overview' });
  }
});

// Get Revenue Trends - uses real invoice and subscription data
router.get('/revenue-trends', requireEnterpriseAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      // Get revenue from paid invoices for this month
      const invoiceRevenue = await prisma.subscriptionInvoice.aggregate({
        where: {
          status: 'paid',
          paid_at: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _sum: { total: true },
        _count: { id: true }
      });

      // Get new subscriptions for this month
      const newSubscriptions = await prisma.client_subscriptions.count({
        where: {
          created_at: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      // Get churned subscriptions (cancelled) this month
      const churned = await prisma.client_subscriptions.count({
        where: {
          cancelled_at: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      // Calculate MRR at end of this month (clients active at that time)
      const activeAtMonth = await prisma.clients.count({
        where: {
          created_at: { lte: monthEnd },
          subscriptionStatus: 'active'
        }
      });

      // Get average plan price
      const avgPlanPrice = await prisma.subscription_plans.aggregate({
        where: { is_active: true },
        _avg: { price_monthly: true }
      });
      const avgPrice = parseFloat(avgPlanPrice._avg?.price_monthly || 50);

      trends.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
        monthDate: monthStart.toISOString(),
        revenue: invoiceRevenue._sum?.total ? Math.round(parseFloat(invoiceRevenue._sum.total)) : Math.round(activeAtMonth * avgPrice),
        invoiceCount: invoiceRevenue._count?.id || 0,
        newSubscriptions,
        churned,
        netGrowth: newSubscriptions - churned,
        estimatedMRR: Math.round(activeAtMonth * avgPrice)
      });
    }

    res.json({ ok: true, trends });
  } catch (error) {
    console.error('[Revenue Trends Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch revenue trends' });
  }
});

// Get Subscription Analytics - uses real data
router.get('/subscription-analytics', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [byStatus, byPlan, byState, recentChanges, trialConversions] = await Promise.all([
      // Client subscription status distribution
      prisma.clients.groupBy({
        by: ['subscriptionStatus'],
        _count: { id: true }
      }),
      // Client plan distribution
      prisma.clients.groupBy({
        by: ['subscriptionPlan'],
        _count: { id: true }
      }),
      // Detailed subscription state distribution
      prisma.client_subscriptions.groupBy({
        by: ['state'],
        _count: { id: true }
      }),
      // Recent subscription changes from audit log
      prisma.subscription_audit_log.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { client: { select: { name: true } } }
      }),
      // Trial conversions
      prisma.client_subscriptions.count({
        where: { trial_converted: true }
      })
    ]);

    // Get total trials
    const totalTrials = await prisma.client_subscriptions.count({
      where: { 
        OR: [
          { state: 'TRIAL' },
          { trial_start_date: { not: null } }
        ]
      }
    });

    // Calculate churn rate (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [cancelledLast30, activeLast30] = await Promise.all([
      prisma.client_subscriptions.count({
        where: { cancelled_at: { gte: thirtyDaysAgo } }
      }),
      prisma.clients.count({
        where: { 
          subscriptionStatus: 'active',
          created_at: { lte: thirtyDaysAgo }
        }
      })
    ]);
    const churnRate = activeLast30 > 0 ? ((cancelledLast30 / activeLast30) * 100).toFixed(2) : 0;

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
        })),
        byState: byState.map(s => ({
          state: s.state,
          count: s._count.id
        })),
        trialConversion: {
          totalTrials,
          converted: trialConversions,
          rate: totalTrials > 0 ? ((trialConversions / totalTrials) * 100).toFixed(1) : 0
        },
        churn: {
          last30Days: cancelledLast30,
          rate: parseFloat(churnRate)
        },
        recentChanges: recentChanges.map(c => ({
          action: c.action,
          clientName: c.client?.name || 'Unknown',
          timestamp: c.created_at,
          details: c.new_values
        }))
      }
    });
  } catch (error) {
    console.error('[Subscription Analytics Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch analytics' });
  }
});

// Get invoices
router.get('/invoices', requireEnterpriseAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const where = {};
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.subscriptionInvoice.findMany({
        where,
        orderBy: { invoice_date: 'desc' },
        skip,
        take: limit,
        include: {
          client: { select: { name: true, client_code: true } }
        }
      }),
      prisma.subscriptionInvoice.count({ where })
    ]);

    res.json({
      ok: true,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        clientName: inv.client?.name,
        clientCode: inv.client?.client_code,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        subtotal: parseFloat(inv.subtotal),
        discount: parseFloat(inv.discount),
        tax: parseFloat(inv.tax),
        total: parseFloat(inv.total),
        status: inv.status,
        paidAt: inv.paid_at,
        periodStart: inv.period_start,
        periodEnd: inv.period_end
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Get Invoices Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch invoices' });
  }
});

// Get subscription plans
router.get('/plans', requireEnterpriseAdmin, async (req, res) => {
  try {
    const plans = await prisma.subscription_plans.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' }
    });

    res.json({
      ok: true,
      plans: plans.map(p => ({
        id: p.id,
        code: p.plan_code,
        name: p.name,
        description: p.description,
        priceMonthly: parseFloat(p.price_monthly),
        priceYearly: parseFloat(p.price_yearly),
        currency: p.currency,
        maxUsers: p.max_users,
        maxStorageGb: p.max_storage_gb,
        maxBranches: p.max_branches,
        features: p.feature_flags,
        isPopular: p.is_popular,
        isEnterprise: p.is_enterprise
      }))
    });
  } catch (error) {
    console.error('[Get Plans Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch plans' });
  }
});

module.exports = router;
