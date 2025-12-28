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

module.exports = router;
