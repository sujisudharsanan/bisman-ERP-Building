/**
 * BISMAN ERP - Subscription Coupon Routes (SuperAdmin)
 * 
 * SuperAdmin endpoints for managing subscription coupons.
 * All routes require SUPER_ADMIN role.
 * 
 * @module routes/subscriptionCouponRoutes
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { getPrisma } = require('../lib/prisma');
const couponService = require('../services/subscriptionCouponService');

// ============================================================================
// MIDDLEWARE: SuperAdmin Only
// ============================================================================

const superAdminOnly = [
  authenticate,
  requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN']),
];

// ============================================================================
// COUPON MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/superadmin/coupons
 * Create a new subscription coupon
 */
router.post('/', ...superAdminOnly, async (req, res) => {
  try {
    const {
      planId,
      validFrom,
      validUntil,
      maxActivations,
      durationDays,
      billingCycle,
      tenantRestrictionType,
      restrictedTenantId,
      notes,
      salesReference,
      invoiceReference,
    } = req.body;

    // Validate required fields
    if (!planId) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_PLAN_ID',
        message: 'Plan ID is required',
      });
    }

    if (!validUntil) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_VALID_UNTIL',
        message: 'Valid until date is required',
      });
    }

    const actor = {
      id: req.user.id,
      role: req.user.role,
    };

    const coupon = await couponService.createCoupon({
      planId,
      validFrom,
      validUntil,
      maxActivations,
      durationDays,
      billingCycle,
      tenantRestrictionType,
      restrictedTenantId,
      notes,
      salesReference,
      invoiceReference,
    }, actor);

    res.status(201).json({
      ok: true,
      coupon,
      message: 'Coupon created successfully',
    });
  } catch (error) {
    console.error('[CouponRoutes] Create error:', error);
    
    if (error.code) {
      return res.status(400).json({
        ok: false,
        error: error.code,
        message: error.message,
      });
    }
    
    res.status(500).json({
      ok: false,
      error: 'CREATE_FAILED',
      message: 'Failed to create coupon',
    });
  }
});

/**
 * GET /api/superadmin/coupons
 * List all coupons with enhanced status
 */
router.get('/', ...superAdminOnly, async (req, res) => {
  try {
    const { status, planId } = req.query;
    
    const coupons = await couponService.getCoupons({
      status,
      planId: planId ? parseInt(planId) : undefined,
    });

    res.json({
      ok: true,
      coupons,
      total: coupons.length,
    });
  } catch (error) {
    console.error('[CouponRoutes] List error:', error);
    res.status(500).json({
      ok: false,
      error: 'LIST_FAILED',
      message: 'Failed to fetch coupons',
    });
  }
});

/**
 * GET /api/superadmin/coupons/:id
 * Get a single coupon with full details
 */
router.get('/:id', ...superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    const coupon = await couponService.getCouponById(id);

    res.json({
      ok: true,
      coupon,
    });
  } catch (error) {
    console.error('[CouponRoutes] Get error:', error);
    
    if (error.code === couponService.ERROR_CODES.COUPON_NOT_FOUND) {
      return res.status(404).json({
        ok: false,
        error: error.code,
        message: error.message,
      });
    }
    
    res.status(500).json({
      ok: false,
      error: 'GET_FAILED',
      message: 'Failed to fetch coupon',
    });
  }
});

/**
 * POST /api/superadmin/coupons/:id/revoke
 * Revoke a coupon (only if not redeemed)
 */
router.post('/:id/revoke', ...superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_REASON',
        message: 'A revocation reason is required (minimum 5 characters)',
      });
    }

    const actor = {
      id: req.user.id,
      role: req.user.role,
    };

    const coupon = await couponService.revokeCoupon(id, reason, actor);

    res.json({
      ok: true,
      coupon,
      message: 'Coupon revoked successfully',
    });
  } catch (error) {
    console.error('[CouponRoutes] Revoke error:', error);
    
    if (error.code) {
      const statusCode = error.code === couponService.ERROR_CODES.COUPON_NOT_FOUND ? 404 : 400;
      return res.status(statusCode).json({
        ok: false,
        error: error.code,
        message: error.message,
      });
    }
    
    res.status(500).json({
      ok: false,
      error: 'REVOKE_FAILED',
      message: 'Failed to revoke coupon',
    });
  }
});

/**
 * GET /api/superadmin/coupons/stats/overview
 * Get coupon statistics for dashboard
 */
router.get('/stats/overview', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const [
      totalCoupons,
      activeCoupons,
      redeemedCoupons,
      revokedCoupons,
      expiredCoupons,
      recentRedemptions,
    ] = await Promise.all([
      prisma.subscriptionCoupon.count(),
      prisma.subscriptionCoupon.count({ where: { status: 'ACTIVE', used_count: 0 } }),
      prisma.couponRedemption.count(),
      prisma.subscriptionCoupon.count({ where: { status: 'REVOKED' } }),
      prisma.subscriptionCoupon.count({ 
        where: { 
          status: 'ACTIVE',
          valid_until: { lt: new Date() },
          used_count: 0,
        } 
      }),
      prisma.couponRedemption.findMany({
        take: 10,
        orderBy: { activated_at: 'desc' },
        include: {
          coupon: { select: { code: true, plan: { select: { name: true } } } },
          tenant: { select: { name: true } },
        },
      }),
    ]);

    res.json({
      ok: true,
      stats: {
        totalCoupons,
        activeCoupons,
        redeemedCoupons,
        revokedCoupons,
        expiredCoupons,
        recentRedemptions: recentRedemptions.map(r => ({
          couponCode: r.coupon.code,
          planName: r.coupon.plan.name,
          tenantName: r.tenant.name,
          activatedAt: r.activated_at,
        })),
      },
    });
  } catch (error) {
    console.error('[CouponRoutes] Stats error:', error);
    res.status(500).json({
      ok: false,
      error: 'STATS_FAILED',
      message: 'Failed to fetch coupon statistics',
    });
  }
});

/**
 * GET /api/superadmin/coupons/audit-log
 * Get coupon audit log entries
 */
router.get('/audit/log', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { couponId, eventType, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (couponId) where.coupon_id = couponId;
    if (eventType) where.event_type = eventType;

    const [logs, total] = await Promise.all([
      prisma.subscriptionCouponAuditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          coupon: { select: { code: true } },
          tenant: { select: { name: true } },
          actor: { select: { first_name: true, last_name: true, email: true } },
        },
      }),
      prisma.subscriptionCouponAuditLog.count({ where }),
    ]);

    res.json({
      ok: true,
      logs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('[CouponRoutes] Audit log error:', error);
    res.status(500).json({
      ok: false,
      error: 'AUDIT_LOG_FAILED',
      message: 'Failed to fetch audit logs',
    });
  }
});

/**
 * GET /api/superadmin/coupons/plans
 * Get available plans for coupon creation
 */
router.get('/plans/available', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const plans = await prisma.subscriptionPlan.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      select: {
        id: true,
        plan_code: true,
        name: true,
        description: true,
        price_monthly: true,
        price_yearly: true,
        max_users: true,
        max_storage_gb: true,
        max_branches: true,
        feature_flags: true,
      },
    });

    res.json({
      ok: true,
      plans: plans.map(p => ({
        ...p,
        price_monthly: parseFloat(p.price_monthly),
        price_yearly: parseFloat(p.price_yearly),
      })),
    });
  } catch (error) {
    console.error('[CouponRoutes] Plans error:', error);
    res.status(500).json({
      ok: false,
      error: 'PLANS_FAILED',
      message: 'Failed to fetch plans',
    });
  }
});

/**
 * GET /api/superadmin/coupons/tenants
 * Get tenants for restricted coupon creation
 */
router.get('/tenants/list', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { search } = req.query;

    const where = { is_active: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tenants = await prisma.client.findMany({
      where,
      take: 50,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        client_code: true,
        subscriptionStatus: true,
        subscription: {
          select: { state: true, expires_at: true },
        },
      },
    });

    res.json({
      ok: true,
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.name,
        code: t.client_code,
        subscriptionStatus: t.subscription?.state || t.subscriptionStatus,
        hasActiveSubscription: t.subscription?.state === 'ACTIVE',
      })),
    });
  } catch (error) {
    console.error('[CouponRoutes] Tenants error:', error);
    res.status(500).json({
      ok: false,
      error: 'TENANTS_FAILED',
      message: 'Failed to fetch tenants',
    });
  }
});

module.exports = router;
