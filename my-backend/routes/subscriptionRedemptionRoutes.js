/**
 * BISMAN ERP - Subscription Coupon Redemption Routes (Client)
 * 
 * Client-facing endpoints for redeeming subscription coupons.
 * Routes require CLIENT_ADMIN role.
 * 
 * @module routes/subscriptionRedemptionRoutes
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const couponService = require('../services/subscriptionCouponService');
const { getPrisma } = require('../lib/prisma');

// ============================================================================
// MIDDLEWARE: Client Admin Only
// ============================================================================

const clientAdminOnly = [
  authenticate,
  requireRole(['CLIENT_ADMIN', 'ADMIN', 'OWNER']),
];

// ============================================================================
// PUBLIC ENDPOINTS (Authenticated users only)
// ============================================================================

/**
 * GET /api/subscriptions/plans
 * Get available subscription plans for clients to choose from
 */
router.get('/plans', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const plans = await prisma.subscription_plans.findMany({
      where: {
        is_active: true,
      },
      orderBy: [
        { price_monthly: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        plan_code: true,
        name: true,
        description: true,
        short_description: true,
        price_monthly: true,
        price_yearly: true,
        currency: true,
        max_users: true,
        max_storage_gb: true,
        max_branches: true,
        is_popular: true,
        is_enterprise: true,
        cta_text: true,
        features: true,
      },
    });

    return res.json({
      ok: true,
      plans,
    });
  } catch (error) {
    console.error('Fetch plans error:', error);
    return res.status(500).json({
      ok: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch subscription plans',
    });
  }
});

// ============================================================================
// REDEMPTION ENDPOINTS
// ============================================================================

/**
 * POST /api/subscriptions/redeem-coupon
 * Redeem a coupon to activate subscription
 */
router.post('/redeem-coupon', ...clientAdminOnly, async (req, res) => {
  try {
    const { code } = req.body;
    const tenantId = req.user.tenant_id;

    if (!code || code.trim().length < 5) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_CODE',
        message: 'Please enter a valid activation code',
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        ok: false,
        error: 'NO_TENANT',
        message: 'No organization associated with your account',
      });
    }

    const actor = {
      id: req.user.id,
      role: req.user.role,
    };

    const result = await couponService.redeemCoupon(code, tenantId, actor);

    res.json({
      ok: true,
      message: 'Subscription activated successfully!',
      subscription: {
        plan: result.plan.name,
        planCode: result.plan.plan_code,
        startedAt: result.startedAt,
        expiresAt: result.expiresAt,
        remainingTime: result.remainingTime,
      },
    });
  } catch (error) {
    console.error('[RedemptionRoutes] Redeem error:', error);
    
    if (error.code) {
      return res.status(400).json({
        ok: false,
        error: error.code,
        message: error.message,
      });
    }
    
    res.status(500).json({
      ok: false,
      error: 'REDEEM_FAILED',
      message: 'Failed to activate subscription. Please try again or contact support.',
    });
  }
});

/**
 * POST /api/subscriptions/validate-coupon
 * Validate a coupon without redeeming
 */
router.post('/validate-coupon', ...clientAdminOnly, async (req, res) => {
  try {
    const { code } = req.body;
    const tenantId = req.user.tenant_id;

    if (!code || code.trim().length < 5) {
      return res.status(400).json({
        ok: false,
        error: 'INVALID_CODE',
        message: 'Please enter a valid activation code',
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        ok: false,
        error: 'NO_TENANT',
        message: 'No organization associated with your account',
      });
    }

    const result = await couponService.validateCoupon(code, tenantId);

    if (result.valid) {
      res.json({
        ok: true,
        valid: true,
        plan: result.plan,
        durationDays: result.durationDays,
        validUntil: result.validUntil,
        message: `This code will activate the ${result.plan.name} plan for ${result.durationDays} days`,
      });
    } else {
      res.status(400).json({
        ok: false,
        valid: false,
        error: result.error,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('[RedemptionRoutes] Validate error:', error);
    res.status(500).json({
      ok: false,
      error: 'VALIDATE_FAILED',
      message: 'Failed to validate activation code',
    });
  }
});

/**
 * GET /api/subscriptions/my-subscription
 * Get current subscription status for the tenant
 */
router.get('/my-subscription', ...clientAdminOnly, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        ok: false,
        error: 'NO_TENANT',
        message: 'No organization associated with your account',
      });
    }

    const status = await couponService.getTenantSubscriptionStatus(tenantId);

    res.json({
      ok: true,
      ...status,
    });
  } catch (error) {
    console.error('[RedemptionRoutes] Status error:', error);
    res.status(500).json({
      ok: false,
      error: 'STATUS_FAILED',
      message: 'Failed to fetch subscription status',
    });
  }
});

/**
 * POST /api/subscriptions/start-trial
 * Start a free trial for the tenant (14 days with Basic plan features)
 */
router.post('/start-trial', ...clientAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({
        ok: false,
        error: 'DATABASE_ERROR',
        message: 'Database connection not available',
      });
    }
    
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        ok: false,
        error: 'NO_TENANT',
        message: 'No organization associated with your account',
      });
    }

    // Check if already has active subscription or trial
    const existingStatus = await couponService.getTenantSubscriptionStatus(tenantId);
    if (existingStatus.hasActiveSubscription) {
      return res.status(400).json({
        ok: false,
        error: 'ALREADY_SUBSCRIBED',
        message: 'You already have an active subscription',
      });
    }

    if (existingStatus.subscription?.status === 'trial') {
      return res.status(400).json({
        ok: false,
        error: 'TRIAL_ACTIVE',
        message: 'You already have an active trial',
      });
    }

    // Check if trial was already used
    // Valid enum values: TRIAL, ACTIVE, UPGRADING, DOWNGRADING, GRACE_PERIOD, SUSPENDED, CANCELLED
    const previousTrial = await prisma.client_subscriptions.findFirst({
      where: {
        client_id: tenantId,
        state: { in: ['TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'CANCELLED'] },
      },
    });

    if (previousTrial) {
      // If already has subscription or trial, don't allow new trial
      if (previousTrial.state === 'TRIAL') {
        return res.status(400).json({
          ok: false,
          error: 'TRIAL_ACTIVE',
          message: 'You already have an active trial.',
        });
      }
      if (previousTrial.state === 'ACTIVE') {
        return res.status(400).json({
          ok: false,
          error: 'ALREADY_SUBSCRIBED',
          message: 'You already have an active subscription.',
        });
      }
      return res.status(400).json({
        ok: false,
        error: 'TRIAL_USED',
        message: 'You have already used your free trial. Please enter an activation code to continue.',
      });
    }

    // Get basic plan (or first available plan) for trial features
    const basicPlan = await prisma.subscription_plans.findFirst({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });

    if (!basicPlan) {
      return res.status(500).json({
        ok: false,
        error: 'NO_PLAN',
        message: 'No subscription plans available. Please contact support.',
      });
    }

    const trialDays = 14;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    // Create trial subscription
    await prisma.client_subscriptions.create({
      data: {
        client_id: tenantId,
        plan_id: basicPlan.id,
        state: 'TRIAL',
        trial_start_date: now,
        trial_end_date: trialEnd,
        started_at: now,
        expires_at: trialEnd,
        activation_source: 'TRIAL_MODAL',
        is_active: true,
      },
    });

    // Log the trial start
    await prisma.subscriptionCouponAuditLog.create({
      data: {
        action: 'TRIAL_STARTED',
        actor_id: req.user.id,
        tenant_id: tenantId,
        details: {
          trialDays: trialDays,
          expiresAt: trialEnd.toISOString(),
          planId: basicPlan.id,
          planName: basicPlan.name,
        },
        ip_address: req.ip || req.connection?.remoteAddress,
      },
    });

    res.json({
      ok: true,
      message: `Your ${trialDays}-day free trial has started!`,
      trial: {
        status: 'trial',
        daysRemaining: trialDays,
        expiresAt: trialEnd.toISOString(),
        features: basicPlan.features || {},
        planName: basicPlan.name || 'Trial',
      },
    });
  } catch (error) {
    console.error('[RedemptionRoutes] Start trial error:', error);
    res.status(500).json({
      ok: false,
      error: 'TRIAL_START_FAILED',
      message: 'Failed to start trial. Please try again.',
    });
  }
});

/**
 * POST /api/subscriptions/activate-free
 * Activate the free plan for the tenant (permanent, with limitations)
 */
router.post('/activate-free', ...clientAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({
        ok: false,
        error: 'DATABASE_ERROR',
        message: 'Database connection not available',
      });
    }
    
    const tenantId = req.user.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        ok: false,
        error: 'NO_TENANT',
        message: 'No organization associated with your account',
      });
    }

    // Check if already has active subscription
    const existingStatus = await couponService.getTenantSubscriptionStatus(tenantId);
    if (existingStatus.hasActiveSubscription && existingStatus.subscription?.status !== 'none') {
      return res.status(400).json({
        ok: false,
        error: 'ALREADY_SUBSCRIBED',
        message: 'You already have an active subscription',
      });
    }

    // Get the FREE plan
    const freePlan = await prisma.subscription_plans.findFirst({
      where: { 
        is_active: true,
        OR: [
          { plan_code: 'FREE' },
          { plan_code: 'free' },
          { name: { contains: 'Free', mode: 'insensitive' } },
          { price_monthly: 0 }
        ]
      },
      orderBy: { sort_order: 'asc' },
    });

    if (!freePlan) {
      return res.status(500).json({
        ok: false,
        error: 'NO_FREE_PLAN',
        message: 'Free plan is not available. Please contact support.',
      });
    }

    const now = new Date();

    // Delete any existing subscription (pending/none)
    await prisma.client_subscriptions.deleteMany({
      where: { client_id: tenantId },
    });

    // Create free subscription (no expiration)
    await prisma.client_subscriptions.create({
      data: {
        client_id: tenantId,
        plan_id: freePlan.id,
        state: 'ACTIVE',
        started_at: now,
        expires_at: null, // Free plan doesn't expire
        activation_source: 'FREE_PLAN_SELECTION',
        is_active: true,
      },
    });

    // Update client's subscription info
    await prisma.clients.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: 'free',
        subscriptionStatus: 'active',
      },
    });

    // Log the activation
    await prisma.subscriptionCouponAuditLog.create({
      data: {
        action: 'FREE_PLAN_ACTIVATED',
        actor_id: req.user.id,
        tenant_id: tenantId,
        details: {
          planId: freePlan.id,
          planName: freePlan.name,
          maxUsers: freePlan.max_users,
          maxStorageGb: freePlan.max_storage_gb,
        },
        ip_address: req.ip || req.connection?.remoteAddress,
      },
    });

    res.json({
      ok: true,
      message: `Free plan activated successfully!`,
      subscription: {
        status: 'active',
        planName: freePlan.name,
        planCode: freePlan.plan_code || 'FREE',
        limits: {
          maxUsers: freePlan.max_users,
          maxStorageGb: freePlan.max_storage_gb,
          maxBranches: freePlan.max_branches,
        },
      },
    });
  } catch (error) {
    console.error('[RedemptionRoutes] Activate free plan error:', error);
    res.status(500).json({
      ok: false,
      error: 'ACTIVATION_FAILED',
      message: 'Failed to activate free plan. Please try again.',
    });
  }
});

module.exports = router;
