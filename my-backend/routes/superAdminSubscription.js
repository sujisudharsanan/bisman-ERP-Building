/**
 * BISMAN ERP - SuperAdmin Subscription Management Routes
 * 
 * Administrative control panel for subscription management including:
 * - Plan management (create/edit/toggle)
 * - Tenant subscription control
 * - Feature overrides
 * - Billing overrides
 * - Audit logs
 * 
 * @module routes/superAdminSubscription
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { featureFlagService, FEATURE_FLAGS, PLAN_LIMITS } = require('../lib/featureFlags');
const { subscriptionService, SUBSCRIPTION_STATES, STATE_TRANSITIONS } = require('../lib/subscriptionStateMachine');

// ============================================================================
// MIDDLEWARE: SuperAdmin Only
// ============================================================================

const superAdminOnly = [
  authenticate,
  requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN']),
];

// ============================================================================
// METRICS & OVERVIEW
// ============================================================================

/**
 * GET /api/super-admin/subscriptions/metrics
 * Get subscription metrics for dashboard
 */
router.get('/metrics', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get total tenants (active subscriptions)
    const totalTenants = await prisma.clientSubscription.count({
      where: { state: { in: ['ACTIVE', 'TRIAL'] } },
    });

    // Get active subscriptions (non-trial)
    const activeSubscriptions = await prisma.clientSubscription.count({
      where: { state: 'ACTIVE' },
    });

    // Get tenants by plan
    const tenantsByPlan = await prisma.clientSubscription.groupBy({
      by: ['plan_id'],
      where: { state: { in: ['ACTIVE', 'TRIAL'] } },
      _count: { id: true },
    });

    // Map plan IDs to plan codes
    const plans = await prisma.subscriptionPlan.findMany({
      select: { id: true, plan_code: true, name: true },
    });
    const planMap = new Map(plans.map(p => [p.id, p]));

    const tenantDistribution = tenantsByPlan.map(group => ({
      plan_id: group.plan_id,
      plan_code: planMap.get(group.plan_id)?.plan_code || 'unknown',
      plan_name: planMap.get(group.plan_id)?.name || 'Unknown',
      count: group._count.id,
    }));

    // Get monthly recurring revenue (sum of all active monthly subscriptions)
    const activeWithPricing = await prisma.clientSubscription.findMany({
      where: { state: 'ACTIVE' },
      include: { plan: { select: { price_monthly: true } } },
    });
    const mrr = activeWithPricing.reduce((sum, sub) => 
      sum + parseFloat(sub.plan?.price_monthly || 0), 0);

    // Get trial conversions (last 30 days)
    const recentConversions = await prisma.clientSubscription.count({
      where: {
        state: 'ACTIVE',
        trial_converted: true,
        updated_at: { gte: thirtyDaysAgo },
      },
    });

    // Get expiring trials (next 7 days)
    const expiringTrials = await prisma.clientSubscription.findMany({
      where: {
        state: 'TRIAL',
        trial_end_date: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        plan: { select: { plan_code: true, name: true } },
      },
    });

    // Get recent activities from audit logs
    const recentActivities = await prisma.subscriptionAuditLog.findMany({
      where: { created_at: { gte: thirtyDaysAgo } },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        subscription: {
          include: {
            client: { select: { name: true } },
          },
        },
      },
    });

    // Get churn rate (cancellations in last 30 days)
    const cancellations = await prisma.clientSubscription.count({
      where: {
        state: 'CANCELLED',
        updated_at: { gte: thirtyDaysAgo },
      },
    });
    const churnRate = totalTenants > 0 ? (cancellations / totalTenants * 100).toFixed(2) : 0;

    // Get pending renewals
    const pendingRenewals = await prisma.clientSubscription.count({
      where: {
        state: 'ACTIVE',
        current_period_end: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
    });

    res.json({
      ok: true,
      metrics: {
        totalTenants,
        activeSubscriptions,
        mrr: Math.round(mrr * 100) / 100,
        currency: 'INR',
        trialConversions: recentConversions,
        churnRate: parseFloat(churnRate),
        pendingRenewals,
        tenantDistribution,
        expiringTrials: expiringTrials.map(t => ({
          clientId: t.client_id,
          clientName: t.client?.name || 'Unknown',
          planCode: t.plan?.plan_code,
          planName: t.plan?.name,
          trialEndDate: t.trial_end_date,
          daysRemaining: Math.ceil((new Date(t.trial_end_date) - now) / (1000 * 60 * 60 * 24)),
        })),
        recentActivities: recentActivities.map(a => ({
          id: a.id,
          clientName: a.subscription?.client?.name || 'Unknown',
          action: a.action,
          oldValues: a.old_values,
          newValues: a.new_values,
          changedAt: a.created_at,
          reason: a.reason,
        })),
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Metrics error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch subscription metrics' });
  }
});

// ============================================================================
// PLAN MANAGEMENT
// ============================================================================

/**
 * GET /api/super-admin/subscriptions/plans
 * List all plans (including inactive)
 */
router.get('/plans', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sort_order: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    res.json({
      ok: true,
      plans: plans.map(p => ({
        ...p,
        price_monthly: parseFloat(p.price_monthly),
        price_yearly: parseFloat(p.price_yearly),
        subscriber_count: p._count.subscriptions,
        limits: PLAN_LIMITS[p.plan_code] || {},
      })),
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] List plans error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch plans' });
  }
});

/**
 * POST /api/super-admin/subscriptions/plans
 * Create a new plan
 */
router.post('/plans', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const {
      plan_code,
      name,
      description,
      short_description,
      badge_text,
      price_monthly,
      price_yearly,
      currency = 'INR',
      max_users,
      max_storage_gb,
      max_branches,
      max_api_calls_day,
      feature_flags = {},
      is_popular = false,
      is_enterprise = false,
      is_public = true,
      cta_text,
      cta_action,
    } = req.body;

    if (!plan_code || !name) {
      return res.status(400).json({
        ok: false,
        error: 'plan_code and name are required',
      });
    }

    const plan = await prisma.$transaction(async (tx) => {
      const newPlan = await tx.subscriptionPlan.create({
        data: {
          plan_code: plan_code.toUpperCase(),
          name,
          description,
          short_description,
          badge_text,
          price_monthly: price_monthly || 0,
          price_yearly: price_yearly || 0,
          currency,
          max_users: max_users || 5,
          max_storage_gb: max_storage_gb || 5,
          max_branches: max_branches || 1,
          max_api_calls_day: max_api_calls_day || 0,
          feature_flags,
          is_popular,
          is_enterprise,
          is_public,
          cta_text,
          cta_action,
          created_by: req.user.id,
        },
      });

      // Audit log
      await tx.subscriptionAuditLog.create({
        data: {
          action: 'plan_created',
          action_category: 'admin',
          new_values: newPlan,
          actor_type: 'super_admin',
          actor_id: req.user.id,
          actor_email: req.user.email,
        },
      });

      return newPlan;
    });

    res.status(201).json({
      ok: true,
      plan,
      message: `Plan ${plan.name} created successfully`,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Create plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to create plan' });
  }
});

/**
 * PUT /api/super-admin/subscriptions/plans/:id
 * Update a plan
 */
router.put('/plans/:id', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.created_by;

    const oldPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!oldPlan) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    const plan = await prisma.$transaction(async (tx) => {
      const updated = await tx.subscriptionPlan.update({
        where: { id: planId },
        data: {
          ...updateData,
          updated_by: req.user.id,
        },
      });

      await tx.subscriptionAuditLog.create({
        data: {
          action: 'plan_updated',
          action_category: 'admin',
          old_values: oldPlan,
          new_values: updated,
          actor_type: 'super_admin',
          actor_id: req.user.id,
          actor_email: req.user.email,
        },
      });

      return updated;
    });

    // Invalidate all caches for subscribers of this plan
    const subscribers = await prisma.clientSubscription.findMany({
      where: { plan_id: planId },
      select: { client_id: true },
    });
    
    subscribers.forEach(sub => {
      featureFlagService.invalidateCache(sub.client_id);
    });

    res.json({
      ok: true,
      plan,
      message: 'Plan updated successfully',
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Update plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to update plan' });
  }
});

/**
 * PATCH /api/super-admin/subscriptions/plans/:id/toggle
 * Toggle plan active status
 */
router.patch('/plans/:id/toggle', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { is_active: !plan.is_active },
    });

    res.json({
      ok: true,
      plan: updated,
      message: `Plan ${updated.is_active ? 'activated' : 'deactivated'}`,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Toggle plan error:', error);
    res.status(500).json({ ok: false, error: 'Failed to toggle plan' });
  }
});

// ============================================================================
// TENANT SUBSCRIPTION CONTROL
// ============================================================================

/**
 * GET /api/super-admin/subscriptions/tenants
 * List all tenant subscriptions
 */
router.get('/tenants', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { 
      page = 1, 
      limit = 20, 
      state, 
      plan_code, 
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query;

    const where = {};
    
    if (state) where.state = state;
    if (plan_code) where.plan = { plan_code };
    if (search) {
      where.client = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { client_code: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [subscriptions, total] = await Promise.all([
      prisma.clientSubscription.findMany({
        where,
        include: {
          plan: true,
          client: {
            select: {
              id: true,
              name: true,
              client_code: true,
              email: true,
            },
          },
        },
        orderBy: { [sort_by]: sort_order },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.clientSubscription.count({ where }),
    ]);

    res.json({
      ok: true,
      subscriptions: subscriptions.map(sub => ({
        ...sub,
        plan_name: sub.plan.name,
        plan_code: sub.plan.plan_code,
        client_name: sub.client?.name,
        client_code: sub.client?.client_code,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] List tenants error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch tenant subscriptions' });
  }
});

/**
 * GET /api/super-admin/subscriptions/tenants/:clientId
 * Get detailed subscription for a tenant
 */
router.get('/tenants/:clientId', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);

    const [subscription, client, overrides, billingOverrides, auditLogs] = await Promise.all([
      prisma.clientSubscription.findUnique({
        where: { client_id: clientId },
        include: {
          plan: true,
          scheduled_plan: true,
        },
      }),
      prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          client_code: true,
          email: true,
          created_at: true,
        },
      }),
      prisma.clientFeatureOverride.findMany({
        where: { client_id: clientId },
      }),
      prisma.billingOverride.findMany({
        where: { client_id: clientId, is_active: true },
      }),
      prisma.subscriptionAuditLog.findMany({
        where: { client_id: clientId },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
    ]);

    if (!client) {
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }

    res.json({
      ok: true,
      client,
      subscription,
      feature_overrides: overrides,
      billing_overrides: billingOverrides,
      audit_logs: auditLogs,
      available_transitions: subscription 
        ? STATE_TRANSITIONS[subscription.state] || []
        : [],
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Get tenant error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch tenant details' });
  }
});

/**
 * POST /api/super-admin/subscriptions/tenants/:clientId/create
 * Create subscription for a tenant
 */
router.post('/tenants/:clientId/create', ...superAdminOnly, async (req, res) => {
  try {
    const clientId = parseInt(req.params.clientId);
    const { plan_code, billing_cycle = 'MONTHLY', trial_days = 14 } = req.body;

    const subscription = await subscriptionService.createSubscription(
      clientId,
      plan_code,
      {
        billingCycle: billing_cycle,
        trialDays: trial_days,
        actorType: 'super_admin',
        actorId: req.user.id,
      }
    );

    res.status(201).json({
      ok: true,
      subscription,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Create subscription error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/super-admin/subscriptions/tenants/:clientId/force-upgrade
 * Force upgrade a tenant's plan (bypasses payment)
 */
router.post('/tenants/:clientId/force-upgrade', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);
    const { plan_code, reason } = req.body;

    const subscription = await prisma.clientSubscription.findUnique({
      where: { client_id: clientId },
    });

    if (!subscription) {
      return res.status(404).json({ ok: false, error: 'No subscription found' });
    }

    const result = await subscriptionService.upgradePlan(
      subscription.id,
      plan_code,
      {
        actorType: 'super_admin',
        actorId: req.user.id,
        reason: reason || `Force upgraded by SuperAdmin`,
      }
    );

    res.json({
      ok: true,
      subscription: result,
      message: `Upgraded to ${plan_code}`,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Force upgrade error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/super-admin/subscriptions/tenants/:clientId/force-downgrade
 * Force downgrade (immediate, bypasses violations)
 */
router.post('/tenants/:clientId/force-downgrade', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);
    const { plan_code, reason } = req.body;

    const subscription = await prisma.clientSubscription.findUnique({
      where: { client_id: clientId },
      include: { plan: true },
    });

    if (!subscription) {
      return res.status(404).json({ ok: false, error: 'No subscription found' });
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { plan_code },
    });

    if (!newPlan) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    // Force update (bypasses state machine for immediate downgrade)
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.clientSubscription.update({
        where: { id: subscription.id },
        data: {
          plan_id: newPlan.id,
          state: 'ACTIVE',
          scheduled_plan_id: null,
          scheduled_change_date: null,
          scheduled_change_type: null,
        },
        include: { plan: true },
      });

      await tx.subscriptionAuditLog.create({
        data: {
          client_id: clientId,
          subscription_id: subscription.id,
          action: 'force_downgrade',
          action_category: 'admin',
          old_values: { plan_code: subscription.plan.plan_code },
          new_values: { plan_code },
          reason,
          actor_type: 'super_admin',
          actor_id: req.user.id,
          actor_email: req.user.email,
        },
      });

      return result;
    });

    featureFlagService.invalidateCache(clientId);

    res.json({
      ok: true,
      subscription: updated,
      message: `Force downgraded to ${plan_code}`,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Force downgrade error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/super-admin/subscriptions/tenants/:clientId/extend-trial
 * Extend trial period
 */
router.post('/tenants/:clientId/extend-trial', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);
    const { days, reason } = req.body;

    if (!days || days < 1) {
      return res.status(400).json({ ok: false, error: 'Days must be at least 1' });
    }

    const subscription = await prisma.clientSubscription.findUnique({
      where: { client_id: clientId },
    });

    if (!subscription) {
      return res.status(404).json({ ok: false, error: 'No subscription found' });
    }

    if (subscription.state !== 'TRIAL') {
      return res.status(400).json({ ok: false, error: 'Subscription is not in trial' });
    }

    const newTrialEnd = new Date(subscription.trial_end_date);
    newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(days));

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.clientSubscription.update({
        where: { id: subscription.id },
        data: {
          trial_end_date: newTrialEnd,
          current_period_end: newTrialEnd,
        },
      });

      await tx.billingOverride.create({
        data: {
          client_id: clientId,
          override_type: 'extend_trial',
          trial_extension_days: parseInt(days),
          reason: reason || `Trial extended by ${days} days`,
          created_by: req.user.id,
        },
      });

      await tx.subscriptionAuditLog.create({
        data: {
          client_id: clientId,
          subscription_id: subscription.id,
          action: 'trial_extended',
          action_category: 'billing',
          old_values: { trial_end_date: subscription.trial_end_date },
          new_values: { trial_end_date: newTrialEnd, days_extended: days },
          reason,
          actor_type: 'super_admin',
          actor_id: req.user.id,
          actor_email: req.user.email,
        },
      });

      return result;
    });

    res.json({
      ok: true,
      subscription: updated,
      new_trial_end: newTrialEnd,
      message: `Trial extended by ${days} days`,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Extend trial error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/super-admin/subscriptions/tenants/:clientId/reactivate
 * Reactivate a cancelled subscription
 */
router.post('/tenants/:clientId/reactivate', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);
    const { reason } = req.body;

    const subscription = await prisma.clientSubscription.findUnique({
      where: { client_id: clientId },
    });

    if (!subscription) {
      return res.status(404).json({ ok: false, error: 'No subscription found' });
    }

    const result = await subscriptionService.reactivateSubscription(
      subscription.id,
      {
        reason: reason || 'Reactivated by SuperAdmin',
        actorType: 'super_admin',
        actorId: req.user.id,
      }
    );

    res.json({
      ok: true,
      subscription: result,
      message: 'Subscription reactivated',
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Reactivate error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/super-admin/subscriptions/tenants/:clientId/suspend
 * Suspend a subscription
 */
router.post('/tenants/:clientId/suspend', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);
    const { reason } = req.body;

    const subscription = await prisma.clientSubscription.findUnique({
      where: { client_id: clientId },
    });

    if (!subscription) {
      return res.status(404).json({ ok: false, error: 'No subscription found' });
    }

    // Force state to SUSPENDED
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.clientSubscription.update({
        where: { id: subscription.id },
        data: {
          state: 'SUSPENDED',
          previous_state: subscription.state,
          state_changed_at: new Date(),
        },
      });

      await tx.subscriptionAuditLog.create({
        data: {
          client_id: clientId,
          subscription_id: subscription.id,
          action: 'manual_suspension',
          action_category: 'admin',
          old_values: { state: subscription.state },
          new_values: { state: 'SUSPENDED' },
          reason,
          actor_type: 'super_admin',
          actor_id: req.user.id,
          actor_email: req.user.email,
        },
      });

      return result;
    });

    featureFlagService.invalidateCache(clientId);

    res.json({
      ok: true,
      subscription: updated,
      message: 'Subscription suspended',
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Suspend error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// FEATURE OVERRIDES
// ============================================================================

/**
 * POST /api/super-admin/subscriptions/tenants/:clientId/features
 * Add or update feature override for a client
 */
router.post('/tenants/:clientId/features', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);
    const { flag_code, value, numeric_override, reason, expires_at } = req.body;

    if (!flag_code || !value) {
      return res.status(400).json({
        ok: false,
        error: 'flag_code and value are required',
      });
    }

    const override = await prisma.$transaction(async (tx) => {
      const result = await tx.clientFeatureOverride.upsert({
        where: {
          client_id_flag_code: { client_id: clientId, flag_code },
        },
        create: {
          client_id: clientId,
          flag_code,
          override_value: value,
          numeric_override,
          reason,
          expires_at: expires_at ? new Date(expires_at) : null,
          created_by: req.user.id,
        },
        update: {
          override_value: value,
          numeric_override,
          reason,
          expires_at: expires_at ? new Date(expires_at) : null,
        },
      });

      await tx.subscriptionAuditLog.create({
        data: {
          client_id: clientId,
          action: 'feature_override',
          action_category: 'feature',
          new_values: { flag_code, value, numeric_override },
          reason,
          actor_type: 'super_admin',
          actor_id: req.user.id,
          actor_email: req.user.email,
        },
      });

      return result;
    });

    featureFlagService.invalidateCache(clientId);

    res.json({
      ok: true,
      override,
      message: `Feature ${flag_code} override applied`,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Feature override error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/super-admin/subscriptions/tenants/:clientId/features/:flagCode
 * Remove a feature override
 */
router.delete('/tenants/:clientId/features/:flagCode', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);
    const flagCode = req.params.flagCode;

    await prisma.clientFeatureOverride.delete({
      where: {
        client_id_flag_code: { client_id: clientId, flag_code: flagCode },
      },
    });

    featureFlagService.invalidateCache(clientId);

    res.json({
      ok: true,
      message: `Feature override ${flagCode} removed`,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Remove feature override error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// BILLING OVERRIDES
// ============================================================================

/**
 * POST /api/super-admin/subscriptions/tenants/:clientId/billing-override
 * Create billing override (discount, pause, custom price)
 */
router.post('/tenants/:clientId/billing-override', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const clientId = parseInt(req.params.clientId);
    const {
      override_type,
      discount_percent,
      custom_price,
      pause_start,
      pause_end,
      valid_from,
      valid_until,
      reason,
      internal_notes,
    } = req.body;

    if (!override_type || !reason) {
      return res.status(400).json({
        ok: false,
        error: 'override_type and reason are required',
      });
    }

    const override = await prisma.$transaction(async (tx) => {
      const result = await tx.billingOverride.create({
        data: {
          client_id: clientId,
          override_type,
          discount_percent,
          custom_price,
          pause_start: pause_start ? new Date(pause_start) : null,
          pause_end: pause_end ? new Date(pause_end) : null,
          valid_from: valid_from ? new Date(valid_from) : new Date(),
          valid_until: valid_until ? new Date(valid_until) : null,
          reason,
          internal_notes,
          created_by: req.user.id,
        },
      });

      await tx.subscriptionAuditLog.create({
        data: {
          client_id: clientId,
          action: 'billing_override_created',
          action_category: 'billing',
          new_values: result,
          reason,
          actor_type: 'super_admin',
          actor_id: req.user.id,
          actor_email: req.user.email,
        },
      });

      return result;
    });

    res.status(201).json({
      ok: true,
      override,
      message: `Billing override (${override_type}) created`,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Billing override error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

/**
 * DELETE /api/super-admin/subscriptions/tenants/:clientId/billing-override/:id
 * Cancel a billing override
 */
router.delete('/tenants/:clientId/billing-override/:id', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const overrideId = parseInt(req.params.id);

    await prisma.billingOverride.update({
      where: { id: overrideId },
      data: { is_active: false },
    });

    res.json({
      ok: true,
      message: 'Billing override cancelled',
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Cancel billing override error:', error);
    res.status(400).json({ ok: false, error: error.message });
  }
});

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * GET /api/super-admin/subscriptions/audit-logs
 * Get subscription audit logs
 */
router.get('/audit-logs', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const {
      page = 1,
      limit = 50,
      client_id,
      action,
      action_category,
      start_date,
      end_date,
    } = req.query;

    const where = {};
    if (client_id) where.client_id = parseInt(client_id);
    if (action) where.action = { contains: action };
    if (action_category) where.action_category = action_category;
    if (start_date) where.created_at = { ...where.created_at, gte: new Date(start_date) };
    if (end_date) where.created_at = { ...where.created_at, lte: new Date(end_date) };

    const [logs, total] = await Promise.all([
      prisma.subscriptionAuditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          client: {
            select: { name: true, client_code: true },
          },
        },
      }),
      prisma.subscriptionAuditLog.count({ where }),
    ]);

    res.json({
      ok: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Audit logs error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit logs' });
  }
});

// ============================================================================
// STATISTICS & DASHBOARD
// ============================================================================

/**
 * GET /api/super-admin/subscriptions/stats
 * Get subscription statistics for dashboard
 */
router.get('/stats', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();

    const [
      totalSubscriptions,
      subscriptionsByState,
      subscriptionsByPlan,
      recentChanges,
      trialConversions,
      mrr,
    ] = await Promise.all([
      // Total active subscriptions
      prisma.clientSubscription.count({
        where: { is_active: true },
      }),
      
      // Subscriptions by state
      prisma.clientSubscription.groupBy({
        by: ['state'],
        _count: true,
      }),
      
      // Subscriptions by plan
      prisma.clientSubscription.groupBy({
        by: ['plan_id'],
        _count: true,
      }),
      
      // Recent subscription changes (last 7 days)
      prisma.subscriptionAuditLog.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          action: { in: ['plan_change', 'state_change', 'subscription_created'] },
        },
      }),
      
      // Trial conversions (last 30 days)
      prisma.clientSubscription.count({
        where: {
          trial_converted: true,
          state_changed_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Calculate MRR (Monthly Recurring Revenue)
      prisma.$queryRaw`
        SELECT 
          SUM(
            CASE 
              WHEN cs.billing_cycle = 'MONTHLY' THEN sp.price_monthly
              WHEN cs.billing_cycle = 'YEARLY' THEN sp.price_yearly / 12
              ELSE 0
            END
          ) as mrr
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON cs.plan_id = sp.id
        WHERE cs.state = 'ACTIVE'
      `,
    ]);

    // Get plan names for the breakdown
    const plans = await prisma.subscriptionPlan.findMany({
      select: { id: true, plan_code: true, name: true },
    });
    const planMap = Object.fromEntries(plans.map(p => [p.id, p]));

    res.json({
      ok: true,
      stats: {
        total_subscriptions: totalSubscriptions,
        by_state: Object.fromEntries(
          subscriptionsByState.map(s => [s.state, s._count])
        ),
        by_plan: subscriptionsByPlan.map(p => ({
          plan_id: p.plan_id,
          plan_code: planMap[p.plan_id]?.plan_code,
          plan_name: planMap[p.plan_id]?.name,
          count: p._count,
        })),
        recent_changes_7d: recentChanges,
        trial_conversions_30d: trialConversions,
        mrr: parseFloat(mrr[0]?.mrr || 0),
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Stats error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/super-admin/subscriptions/feature-flags
 * Get all feature flag definitions
 */
router.get('/feature-flags', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();

    const flags = await prisma.featureFlagDefinition.findMany({
      where: { is_active: true },
      orderBy: [{ category: 'asc' }, { sort_order: 'asc' }],
    });

    res.json({
      ok: true,
      flags,
      available_values: ['DISABLED', 'ENABLED', 'LIMITED', 'UNLIMITED'],
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions] Feature flags error:', error);
    // Fallback to hardcoded flags
    res.json({
      ok: true,
      flags: Object.entries(FEATURE_FLAGS).map(([key, value]) => ({
        flag_code: key,
        name: key.replace(/_/g, ' '),
      })),
    });
  }
});

module.exports = router;
