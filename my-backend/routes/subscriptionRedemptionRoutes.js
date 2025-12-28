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
    const userId = req.user.id;

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
    const previousTrial = await prisma.clientSubscription.findFirst({
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
    const basicPlan = await prisma.subscriptionPlan.findFirst({
      where: { is_active: true },
      orderBy: { tier: 'asc' },
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
    await prisma.clientSubscription.create({
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

module.exports = router;
