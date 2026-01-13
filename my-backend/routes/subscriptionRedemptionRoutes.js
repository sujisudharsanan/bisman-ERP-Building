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
        feature_flags: true,
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

    // Customize message based on plan change type
    let message = 'Subscription activated successfully!';
    if (result.planChangeType === 'upgrade') {
      message = `Successfully upgraded to ${result.plan.name}!`;
    } else if (result.planChangeType === 'downgrade') {
      message = `Plan changed to ${result.plan.name}. Changes take effect immediately.`;
    } else if (result.planChangeType === 'extend') {
      message = `Subscription extended! Your ${result.plan.name} plan now expires on ${new Date(result.expiresAt).toLocaleDateString()}.`;
    }

    res.json({
      ok: true,
      message,
      planChangeType: result.planChangeType,
      subscription: {
        plan: result.plan.name,
        planCode: result.plan.plan_code || result.plan.code,
        startedAt: result.startedAt,
        expiresAt: result.expiresAt,
        nextBillingDate: result.nextBillingDate,
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
      // Check current subscription to determine plan change type
      const prisma = getPrisma();
      const existingSubscription = await prisma.client_subscriptions.findUnique({
        where: { client_id: tenantId },
        include: { plan: true },
      });

      let planChangeType = 'new';
      let currentPlan = null;
      let nextRenewalDate = null;

      if (existingSubscription && ['ACTIVE', 'TRIAL'].includes(existingSubscription.state)) {
        currentPlan = existingSubscription.plan;
        const currentOrder = currentPlan?.sort_order || 0;
        const targetOrder = result.plan?.sort_order || 0;

        if (result.plan?.id === currentPlan?.id) {
          planChangeType = 'extend';
          // Extension adds duration to current expiry
          const baseDate = existingSubscription.expires_at || existingSubscription.current_period_end || new Date();
          nextRenewalDate = new Date(new Date(baseDate).getTime() + result.durationDays * 24 * 60 * 60 * 1000);
        } else if (targetOrder > currentOrder) {
          planChangeType = 'upgrade';
          nextRenewalDate = new Date(Date.now() + result.durationDays * 24 * 60 * 60 * 1000);
        } else {
          planChangeType = 'downgrade';
          nextRenewalDate = new Date(Date.now() + result.durationDays * 24 * 60 * 60 * 1000);
        }
      } else {
        nextRenewalDate = new Date(Date.now() + result.durationDays * 24 * 60 * 60 * 1000);
      }

      res.json({
        ok: true,
        valid: true,
        plan: result.plan,
        durationDays: result.durationDays,
        validUntil: result.validUntil,
        planChangeType,
        currentPlan: currentPlan ? {
          id: currentPlan.id,
          name: currentPlan.name,
          planCode: currentPlan.plan_code,
        } : null,
        nextRenewalDate: nextRenewalDate?.toISOString(),
        message: planChangeType === 'extend'
          ? `This code will extend your ${result.plan.name} plan by ${result.durationDays} days. New expiry: ${nextRenewalDate?.toLocaleDateString()}`
          : planChangeType === 'upgrade'
            ? `This code will upgrade you to ${result.plan.name} for ${result.durationDays} days`
            : planChangeType === 'downgrade'
              ? `This code will change your plan to ${result.plan.name} for ${result.durationDays} days`
              : `This code will activate the ${result.plan.name} plan for ${result.durationDays} days`,
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
 * Start a free trial for the tenant (14 days with paid plan features)
 * RULE: Each tenant gets only ONE trial in their lifetime
 * FREE plan users CAN start a trial (trial is for trying PAID features)
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

    // Check existing subscription
    const existingSubscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
      include: { plan: true },
    });

    if (existingSubscription) {
      // If currently on TRIAL state - already has active trial
      if (existingSubscription.state === 'TRIAL') {
        return res.status(400).json({
          ok: false,
          error: 'TRIAL_ACTIVE',
          message: 'You already have an active trial.',
        });
      }
      
      // If on a PAID plan (not FREE), check if they already used trial
      const isFreePlan = existingSubscription.plan?.plan_code?.toUpperCase() === 'FREE' || 
                         existingSubscription.plan?.price_monthly == 0 ||
                         existingSubscription.activation_source === 'FREE_PLAN_SELECTION';
      
      if (!isFreePlan && existingSubscription.state === 'ACTIVE') {
        // Already on a paid plan - no need for trial
        return res.status(400).json({
          ok: false,
          error: 'ALREADY_SUBSCRIBED',
          message: 'You already have an active paid subscription.',
        });
      }
      
      // Check if trial was ever used (only if they previously had a trial)
      // trial_converted = true means they converted from trial to paid
      // If trial_start_date is set AND they're not currently on free plan with no trial history
      if (existingSubscription.trial_converted === true) {
        return res.status(400).json({
          ok: false,
          error: 'TRIAL_USED',
          message: 'You have already used your free trial. Please enter an activation code or upgrade your plan.',
        });
      }
      
      // Check audit logs for previous trial usage (for edge cases)
      if (existingSubscription.trial_start_date && !isFreePlan) {
        const previousTrial = await prisma.subscription_coupon_audit_logs.findFirst({
          where: {
            subscription_id: existingSubscription.id,
            event_type: 'TRIAL_STARTED',
          },
        });
        
        if (previousTrial) {
          return res.status(400).json({
            ok: false,
            error: 'TRIAL_USED',
            message: 'You have already used your free trial. Please enter an activation code to continue.',
          });
        }
      }
      
      // FREE plan users can always start a trial (trial is for trying paid features)
      // Continue to trial activation below...
    }

    // Get the FIRST PAID plan for trial features (not free plan)
    const trialPlan = await prisma.subscription_plans.findFirst({
      where: { 
        is_active: true,
        price_monthly: { gt: 0 }, // Must be a paid plan
      },
      orderBy: { sort_order: 'asc' },
    });

    // Fallback to any active plan if no paid plan found
    const basicPlan = trialPlan || await prisma.subscription_plans.findFirst({
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

    let subscription;
    
    // If existing subscription (e.g., FREE plan), update it to TRIAL
    if (existingSubscription) {
      subscription = await prisma.client_subscriptions.update({
        where: { client_id: tenantId },
        data: {
          plan_id: basicPlan.id,
          state: 'TRIAL',
          previous_state: existingSubscription.state,
          state_changed_at: now,
          trial_start_date: now,
          trial_end_date: trialEnd,
          started_at: now,
          expires_at: trialEnd,
          activation_source: 'TRIAL_MODAL',
          is_active: true,
        },
      });
    } else {
      // Create new trial subscription
      subscription = await prisma.client_subscriptions.create({
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
    }

    // Log the trial start (using correct model and field names)
    try {
      await prisma.subscription_coupon_audit_logs.create({
        data: {
          event_type: 'TRIAL_STARTED',
          actor_user_id: req.user.id,
          subscription_id: subscription.id,
          payload_snapshot: {
            trialDays: trialDays,
            expiresAt: trialEnd.toISOString(),
            planId: basicPlan.id,
            planName: basicPlan.name,
            previousState: existingSubscription?.state || 'NONE',
          },
          ip_address: req.ip || req.connection?.remoteAddress || null,
        },
      });
    } catch (auditError) {
      // Don't fail trial start if audit logging fails
      console.error('[RedemptionRoutes] Audit log error (non-fatal):', auditError.message);
    }

    res.json({
      ok: true,
      message: `Your ${trialDays}-day free trial has started!`,
      trial: {
        status: 'trial',
        daysRemaining: trialDays,
        expiresAt: trialEnd.toISOString(),
        features: basicPlan.feature_flags || {},
        planName: basicPlan.name || 'Trial',
      },
    });
  } catch (error) {
    console.error('[RedemptionRoutes] Start trial error:', error);
    console.error('[RedemptionRoutes] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    res.status(500).json({
      ok: false,
      error: 'TRIAL_START_FAILED',
      message: 'Failed to start trial. Please try again.',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
    const freeSubscription = await prisma.client_subscriptions.create({
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

    // Log the activation (using correct model and field names)
    try {
      await prisma.subscription_coupon_audit_logs.create({
        data: {
          event_type: 'FREE_PLAN_ACTIVATED',
          actor_user_id: req.user.id,
          subscription_id: freeSubscription.id,
          payload_snapshot: {
            planId: freePlan.id,
            planName: freePlan.name,
            maxUsers: freePlan.max_users,
            maxStorageGb: freePlan.max_storage_gb,
          },
          ip_address: req.ip || req.connection?.remoteAddress || null,
        },
      });
    } catch (auditError) {
      // Don't fail activation if audit logging fails
      console.error('[RedemptionRoutes] Audit log error (non-fatal):', auditError.message);
    }

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
