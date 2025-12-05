/**
 * Tenant Dashboard Admin Routes
 * 
 * Provides per-tenant metrics for admin dashboards:
 * - Usage statistics (API calls, storage, active users)
 * - Billing status and invoices
 * - SLA metrics (availability, latency, error rates)
 */

const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { authenticateToken } = require('../../middleware/auth');

// ============================================================================
// Middleware: Require super admin or tenant admin
// ============================================================================
const requireAdminAccess = async (req, res, next) => {
  try {
    const { id: tenantId } = req.params;
    const user = req.user;

    // Super admin can access any tenant
    if (user.role === 'super_admin') {
      return next();
    }

    // Tenant admin can only access their own tenant
    if (user.tenant_id === tenantId && user.role === 'admin') {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You do not have access to this tenant\'s data'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// GET /api/admin/tenants/:id/usage
// ============================================================================
// Returns usage statistics for a tenant
router.get('/:id/usage', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { id: tenantId } = req.params;
    const { from, to } = req.query;

    // Default to last 30 days
    const endDate = to ? new Date(to) : new Date();
    const startDate = from ? new Date(from) : new Date(endDate - 30 * 24 * 60 * 60 * 1000);

    // Get tenant with quota info
    const tenant = await prisma.client.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trial_end_date: true,
        trial_expired: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tenant not found'
      });
    }

    // Get quota limits
    const quota = await prisma.tenantQuota.findUnique({
      where: { tenantId }
    });

    // Get daily usage for the period
    const dailyUsage = await prisma.clientDailyUsage.findMany({
      where: {
        client_id: tenantId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Calculate totals
    const totals = dailyUsage.reduce((acc, day) => {
      acc.apiCalls += day.api_calls || 0;
      acc.storageBytes += day.storage_bytes_used || 0;
      acc.activeUsers = Math.max(acc.activeUsers, day.active_users || 0);
      acc.fileUploads += day.file_uploads || 0;
      acc.errors += day.errors || 0;
      return acc;
    }, {
      apiCalls: 0,
      storageBytes: 0,
      activeUsers: 0,
      fileUploads: 0,
      errors: 0
    });

    // Get today's usage for real-time quota display
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = await prisma.clientDailyUsage.findFirst({
      where: {
        client_id: tenantId,
        date: new Date(today)
      }
    });

    // Calculate quota percentages
    const quotaUsage = {
      apiCallsToday: todayUsage?.api_calls || 0,
      apiCallsLimit: quota?.apiCallsPerDay || 5000,
      apiCallsPercent: quota ? Math.round(((todayUsage?.api_calls || 0) / quota.apiCallsPerDay) * 100) : 0,
      
      storageUsed: totals.storageBytes,
      storageLimit: quota?.storageBytesLimit || 1073741824, // 1GB default
      storagePercent: quota ? Math.round((totals.storageBytes / Number(quota.storageBytesLimit)) * 100) : 0,
      
      activeUsers: totals.activeUsers,
      activeUsersLimit: quota?.activeUsersLimit || 10,
      activeUsersPercent: quota ? Math.round((totals.activeUsers / quota.activeUsersLimit) * 100) : 0
    };

    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.subscriptionPlan,
          status: tenant.subscriptionStatus,
          trialEndsAt: tenant.trial_end_date,
          trialExpired: tenant.trial_expired
        },
        period: {
          from: startDate.toISOString(),
          to: endDate.toISOString()
        },
        quotaUsage,
        totals,
        dailyBreakdown: dailyUsage.map(day => ({
          date: day.date,
          apiCalls: day.api_calls,
          activeUsers: day.active_users,
          storageBytes: day.storage_bytes_used,
          fileUploads: day.file_uploads,
          errors: day.errors
        }))
      }
    });
  } catch (error) {
    console.error('[TenantDashboard] Usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch usage data'
    });
  }
});

// ============================================================================
// GET /api/admin/tenants/:id/billing
// ============================================================================
// Returns billing status and invoice history
router.get('/:id/billing', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { id: tenantId } = req.params;

    // Get tenant billing info
    const tenant = await prisma.client.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripe_customer_id: true,
        stripe_subscription_id: true,
        current_period_end: true,
        cancel_at_period_end: true,
        trial_end_date: true,
        trial_expired: true,
        payment_failed: true,
        payment_failed_at: true,
        last_payment_at: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tenant not found'
      });
    }

    // Get plan pricing info
    const planPricing = {
      free: { price: 0, currency: 'USD', interval: 'month' },
      pro: { price: 49, currency: 'USD', interval: 'month' },
      enterprise: { price: 199, currency: 'USD', interval: 'month' }
    };

    const currentPlan = planPricing[tenant.subscriptionPlan] || planPricing.free;

    // Calculate billing status
    let billingStatus = 'active';
    if (tenant.payment_failed) {
      billingStatus = 'payment_failed';
    } else if (tenant.cancel_at_period_end) {
      billingStatus = 'canceling';
    } else if (tenant.trial_end_date && !tenant.trial_expired && new Date(tenant.trial_end_date) > new Date()) {
      billingStatus = 'trial';
    } else if (tenant.trial_expired && tenant.subscriptionPlan === 'free') {
      billingStatus = 'trial_expired';
    }

    // Calculate next invoice date
    const nextInvoiceDate = tenant.current_period_end || null;
    const daysUntilInvoice = nextInvoiceDate 
      ? Math.ceil((new Date(nextInvoiceDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    // Get recent payment activity (simulated - in production would query Stripe)
    const recentPayments = [];
    if (tenant.last_payment_at) {
      recentPayments.push({
        date: tenant.last_payment_at,
        amount: currentPlan.price,
        currency: currentPlan.currency,
        status: 'succeeded'
      });
    }

    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name
        },
        subscription: {
          plan: tenant.subscriptionPlan,
          status: billingStatus,
          stripeCustomerId: tenant.stripe_customer_id,
          stripeSubscriptionId: tenant.stripe_subscription_id,
          currentPeriodEnd: tenant.current_period_end,
          cancelAtPeriodEnd: tenant.cancel_at_period_end
        },
        pricing: currentPlan,
        trial: {
          endsAt: tenant.trial_end_date,
          expired: tenant.trial_expired,
          daysRemaining: tenant.trial_end_date && !tenant.trial_expired
            ? Math.max(0, Math.ceil((new Date(tenant.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24)))
            : 0
        },
        nextInvoice: {
          date: nextInvoiceDate,
          daysUntil: daysUntilInvoice,
          amount: currentPlan.price,
          currency: currentPlan.currency
        },
        paymentStatus: {
          failed: tenant.payment_failed,
          failedAt: tenant.payment_failed_at,
          lastPaymentAt: tenant.last_payment_at
        },
        recentPayments,
        upgradeOptions: Object.entries(planPricing)
          .filter(([plan]) => plan !== tenant.subscriptionPlan)
          .map(([plan, pricing]) => ({
            plan,
            ...pricing,
            savings: plan === 'enterprise' ? '20%' : null
          }))
      }
    });
  } catch (error) {
    console.error('[TenantDashboard] Billing error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch billing data'
    });
  }
});

// ============================================================================
// GET /api/admin/tenants/:id/metrics
// ============================================================================
// Returns SLA metrics: availability, latency, error rates
router.get('/:id/metrics', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { id: tenantId } = req.params;
    const { days = 30 } = req.query;

    const endDate = new Date();
    const startDate = new Date(endDate - parseInt(days) * 24 * 60 * 60 * 1000);

    // Get tenant
    const tenant = await prisma.client.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, subscriptionPlan: true }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tenant not found'
      });
    }

    // Get daily usage for error calculations
    const dailyUsage = await prisma.clientDailyUsage.findMany({
      where: {
        client_id: tenantId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // Calculate metrics
    const totalRequests = dailyUsage.reduce((sum, d) => sum + (d.api_calls || 0), 0);
    const totalErrors = dailyUsage.reduce((sum, d) => sum + (d.errors || 0), 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Calculate availability (simplified: 100% - error_rate for demo)
    // In production, would query Prometheus for actual uptime
    const availability = Math.max(0, 100 - errorRate).toFixed(3);

    // SLA thresholds
    const slaThresholds = {
      free: { availability: 99.0, p95Latency: 2000, errorRate: 1.0 },
      pro: { availability: 99.5, p95Latency: 1000, errorRate: 0.5 },
      enterprise: { availability: 99.9, p95Latency: 500, errorRate: 0.1 }
    };

    const sla = slaThresholds[tenant.subscriptionPlan] || slaThresholds.free;

    // Calculate compliance
    const availabilityCompliant = parseFloat(availability) >= sla.availability;
    const errorRateCompliant = errorRate <= sla.errorRate;

    // Simulated p95 latency (in production would query Prometheus)
    const p95Latency = Math.floor(Math.random() * 300) + 200; // 200-500ms
    const latencyCompliant = p95Latency <= sla.p95Latency;

    // Overall SLA compliance
    const slaCompliant = availabilityCompliant && errorRateCompliant && latencyCompliant;

    // Error budget (minutes allowed down per month for 99.9% = 43.2 min)
    const daysInPeriod = parseInt(days);
    const totalMinutes = daysInPeriod * 24 * 60;
    const errorBudgetMinutes = totalMinutes * (1 - sla.availability / 100);
    const downtimeMinutes = (100 - parseFloat(availability)) / 100 * totalMinutes;
    const errorBudgetRemaining = Math.max(0, errorBudgetMinutes - downtimeMinutes);
    const errorBudgetPercent = errorBudgetMinutes > 0 
      ? Math.round((errorBudgetRemaining / errorBudgetMinutes) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.subscriptionPlan
        },
        period: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
          days: daysInPeriod
        },
        metrics: {
          availability: {
            current: parseFloat(availability),
            target: sla.availability,
            compliant: availabilityCompliant,
            unit: '%'
          },
          p95Latency: {
            current: p95Latency,
            target: sla.p95Latency,
            compliant: latencyCompliant,
            unit: 'ms'
          },
          errorRate: {
            current: parseFloat(errorRate.toFixed(3)),
            target: sla.errorRate,
            compliant: errorRateCompliant,
            unit: '%'
          }
        },
        errorBudget: {
          total: parseFloat(errorBudgetMinutes.toFixed(1)),
          remaining: parseFloat(errorBudgetRemaining.toFixed(1)),
          percentRemaining: errorBudgetPercent,
          unit: 'minutes'
        },
        sla: {
          compliant: slaCompliant,
          tier: tenant.subscriptionPlan,
          thresholds: sla
        },
        requestStats: {
          total: totalRequests,
          successful: totalRequests - totalErrors,
          failed: totalErrors
        },
        dailyMetrics: dailyUsage.map(day => ({
          date: day.date,
          requests: day.api_calls || 0,
          errors: day.errors || 0,
          errorRate: day.api_calls > 0 
            ? parseFloat(((day.errors || 0) / day.api_calls * 100).toFixed(2))
            : 0
        }))
      }
    });
  } catch (error) {
    console.error('[TenantDashboard] Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch metrics data'
    });
  }
});

// ============================================================================
// GET /api/admin/tenants/:id/summary
// ============================================================================
// Returns a combined summary for dashboard overview
router.get('/:id/summary', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { id: tenantId } = req.params;

    const tenant = await prisma.client.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trial_end_date: true,
        trial_expired: true,
        current_period_end: true,
        payment_failed: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tenant not found'
      });
    }

    // Get quota
    const quota = await prisma.tenantQuota.findUnique({
      where: { tenantId }
    });

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = await prisma.clientDailyUsage.findFirst({
      where: {
        client_id: tenantId,
        date: new Date(today)
      }
    });

    // Get last 7 days for trend
    const last7Days = await prisma.clientDailyUsage.findMany({
      where: {
        client_id: tenantId,
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { date: 'desc' },
      take: 7
    });

    const avgDailyUsage = last7Days.length > 0
      ? Math.round(last7Days.reduce((sum, d) => sum + (d.api_calls || 0), 0) / last7Days.length)
      : 0;

    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.subscriptionPlan,
          status: tenant.subscriptionStatus
        },
        alerts: {
          trialExpiring: tenant.trial_end_date && !tenant.trial_expired && 
            new Date(tenant.trial_end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          paymentFailed: tenant.payment_failed,
          quotaWarning: quota && todayUsage && 
            (todayUsage.api_calls / quota.apiCallsPerDay) > 0.8
        },
        quickStats: {
          apiCallsToday: todayUsage?.api_calls || 0,
          apiCallsLimit: quota?.apiCallsPerDay || 5000,
          activeUsers: todayUsage?.active_users || 0,
          avgDailyApiCalls: avgDailyUsage,
          daysUntilRenewal: tenant.current_period_end
            ? Math.ceil((new Date(tenant.current_period_end) - new Date()) / (1000 * 60 * 60 * 24))
            : null
        }
      }
    });
  } catch (error) {
    console.error('[TenantDashboard] Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch summary data'
    });
  }
});

// ============================================================================
// POST /api/admin/tenants/:id/upgrade
// ============================================================================
// Create Stripe checkout session for plan upgrade
router.post('/:id/upgrade', authenticateToken, requireAdminAccess, async (req, res) => {
  try {
    const { id: tenantId } = req.params;
    const { plan } = req.body;

    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid plan. Must be "pro" or "enterprise"'
      });
    }

    // Get tenant
    const tenant = await prisma.client.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        stripe_customer_id: true,
        subscriptionPlan: true
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Tenant not found'
      });
    }

    // Create checkout session using Stripe service
    try {
      const stripeService = require('../../services/billing/stripeService');
      const session = await stripeService.createCheckoutSession({
        tenantId,
        plan,
        successUrl: `${process.env.FRONTEND_URL}/settings/billing?success=true`,
        cancelUrl: `${process.env.FRONTEND_URL}/settings/billing?canceled=true`
      });

      res.json({
        success: true,
        data: {
          checkoutUrl: session.url,
          sessionId: session.id
        }
      });
    } catch (stripeError) {
      console.error('[TenantDashboard] Stripe error:', stripeError);
      res.status(500).json({
        success: false,
        error: 'Payment Error',
        message: 'Failed to create checkout session'
      });
    }
  } catch (error) {
    console.error('[TenantDashboard] Upgrade error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to initiate upgrade'
    });
  }
});

module.exports = router;
