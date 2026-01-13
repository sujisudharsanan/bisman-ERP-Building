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
      prisma.subscription_coupon_audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          subscription_coupons: { select: { code: true } },
          clients: { select: { name: true } },
          users_enhanced: { select: { first_name: true, last_name: true, email: true } },
        },
      }),
      prisma.subscription_coupon_audit_logs.count({ where }),
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
    
    const plans = await prisma.subscription_plans.findMany({
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

    const tenants = await prisma.clients.findMany({
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

// ============================================================================
// COUPON TEMPLATES ENDPOINTS
// ============================================================================

/**
 * GET /api/superadmin/coupons/templates
 * List all coupon templates
 */
router.get('/templates', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const templates = await prisma.coupon_templates.findMany({
      where: { is_active: true },
      include: {
        subscription_plans: {
          select: { id: true, name: true, plan_code: true }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      ok: true,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        planId: t.plan_id,
        planName: t.subscription_plans?.name,
        planCode: t.subscription_plans?.plan_code,
        durationDays: t.duration_days,
        validityDays: t.validity_days,
        maxActivations: t.max_activations,
        tenantRestrictionType: t.tenant_restriction_type,
        notesTemplate: t.notes_template,
        createdAt: t.created_at,
      })),
    });
  } catch (error) {
    console.error('[CouponRoutes] Templates list error:', error);
    res.status(500).json({
      ok: false,
      error: 'LIST_TEMPLATES_FAILED',
      message: 'Failed to fetch templates',
    });
  }
});

/**
 * POST /api/superadmin/coupons/templates
 * Create a new coupon template
 */
router.post('/templates', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { name, description, planId, durationDays, validityDays, maxActivations, tenantRestrictionType, notesTemplate } = req.body;

    if (!name || !planId) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_FIELDS',
        message: 'Name and plan are required',
      });
    }

    const template = await prisma.coupon_templates.create({
      data: {
        name,
        description,
        plan_id: parseInt(planId),
        duration_days: durationDays || 30,
        validity_days: validityDays || 30,
        max_activations: maxActivations || 1,
        tenant_restriction_type: tenantRestrictionType || 'ANY',
        notes_template: notesTemplate,
        created_by: req.user.id,
      },
    });

    res.status(201).json({
      ok: true,
      template,
      message: 'Template created successfully',
    });
  } catch (error) {
    console.error('[CouponRoutes] Create template error:', error);
    res.status(500).json({
      ok: false,
      error: 'CREATE_TEMPLATE_FAILED',
      message: 'Failed to create template',
    });
  }
});

/**
 * DELETE /api/superadmin/coupons/templates/:id
 * Deactivate a template
 */
router.delete('/templates/:id', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;

    await prisma.coupon_templates.update({
      where: { id: parseInt(id) },
      data: { is_active: false },
    });

    res.json({
      ok: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('[CouponRoutes] Delete template error:', error);
    res.status(500).json({
      ok: false,
      error: 'DELETE_TEMPLATE_FAILED',
      message: 'Failed to delete template',
    });
  }
});

// ============================================================================
// SHARE/EMAIL COUPON ENDPOINTS
// ============================================================================

/**
 * POST /api/superadmin/coupons/:id/share
 * Share coupon via email
 */
router.post('/:id/share', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;
    const { recipientEmail, recipientName, tenantId, message } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({
        ok: false,
        error: 'MISSING_EMAIL',
        message: 'Recipient email is required',
      });
    }

    // Get coupon details
    const coupon = await prisma.subscription_coupons.findUnique({
      where: { id },
      include: {
        subscription_plans: true,
      },
    });

    if (!coupon) {
      return res.status(404).json({
        ok: false,
        error: 'COUPON_NOT_FOUND',
        message: 'Coupon not found',
      });
    }

    // Log the share
    const shareLog = await prisma.coupon_share_logs.create({
      data: {
        coupon_id: id,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        tenant_id: tenantId || null,
        share_method: 'EMAIL',
        shared_by: req.user.id,
        message,
      },
    });

    // TODO: Integrate with email service to send the coupon
    // For now, just log it
    console.log(`[CouponShare] Coupon ${coupon.code} shared to ${recipientEmail}`);

    res.json({
      ok: true,
      shareLog,
      message: `Coupon shared to ${recipientEmail}`,
    });
  } catch (error) {
    console.error('[CouponRoutes] Share error:', error);
    res.status(500).json({
      ok: false,
      error: 'SHARE_FAILED',
      message: 'Failed to share coupon',
    });
  }
});

/**
 * GET /api/superadmin/coupons/:id/share-history
 * Get share history for a coupon
 */
router.get('/:id/share-history', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { id } = req.params;

    const history = await prisma.coupon_share_logs.findMany({
      where: { coupon_id: id },
      include: {
        users_enhanced: {
          select: { first_name: true, last_name: true, email: true }
        },
        clients: {
          select: { name: true }
        },
      },
      orderBy: { shared_at: 'desc' },
    });

    res.json({
      ok: true,
      history: history.map(h => ({
        id: h.id,
        recipientEmail: h.recipient_email,
        recipientName: h.recipient_name,
        tenantName: h.clients?.name,
        shareMethod: h.share_method,
        sharedBy: `${h.users_enhanced?.first_name || ''} ${h.users_enhanced?.last_name || ''}`.trim(),
        sharedAt: h.shared_at,
        message: h.message,
      })),
    });
  } catch (error) {
    console.error('[CouponRoutes] Share history error:', error);
    res.status(500).json({
      ok: false,
      error: 'HISTORY_FAILED',
      message: 'Failed to fetch share history',
    });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/superadmin/coupons/analytics
 * Get coupon analytics data
 */
router.get('/analytics', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    // Get overall stats
    const totalCoupons = await prisma.subscription_coupons.count();
    const activeCoupons = await prisma.subscription_coupons.count({ where: { status: 'ACTIVE' } });
    const redeemedCoupons = await prisma.subscription_coupons.count({ where: { used_count: { gt: 0 } } });
    const expiredCoupons = await prisma.subscription_coupons.count({ where: { status: 'EXPIRED' } });
    const revokedCoupons = await prisma.subscription_coupons.count({ where: { status: 'REVOKED' } });

    // Calculate total revenue from redeemed coupons
    const redeemedCouponData = await prisma.subscription_coupons.findMany({
      where: { used_count: { gt: 0 } },
      select: {
        plan_snapshot_json: true,
        duration_days: true,
        used_count: true,
      },
    });
    
    let totalRevenue = 0;
    let currency = 'INR';
    redeemedCouponData.forEach(coupon => {
      const planSnapshot = coupon.plan_snapshot_json || {};
      const durationDays = coupon.duration_days || 30;
      const priceMonthly = planSnapshot.price_monthly || 0;
      const priceYearly = planSnapshot.price_yearly || 0;
      currency = planSnapshot.currency || 'INR';
      
      let couponValue = 0;
      if (durationDays <= 30) {
        couponValue = priceMonthly;
      } else if (durationDays <= 90) {
        couponValue = priceMonthly * 3;
      } else if (durationDays <= 180) {
        couponValue = priceMonthly * 6;
      } else if (durationDays >= 365) {
        couponValue = priceYearly || priceMonthly * 12;
      } else {
        couponValue = Math.round((priceMonthly / 30) * durationDays);
      }
      
      totalRevenue += couponValue * coupon.used_count;
    });

    // Calculate total potential value of all active coupons
    const activeCouponData = await prisma.subscription_coupons.findMany({
      where: { status: 'ACTIVE' },
      select: {
        plan_snapshot_json: true,
        duration_days: true,
        max_activations: true,
        used_count: true,
      },
    });
    
    let potentialRevenue = 0;
    activeCouponData.forEach(coupon => {
      const planSnapshot = coupon.plan_snapshot_json || {};
      const durationDays = coupon.duration_days || 30;
      const priceMonthly = planSnapshot.price_monthly || 0;
      const priceYearly = planSnapshot.price_yearly || 0;
      const remainingActivations = coupon.max_activations - coupon.used_count;
      
      let couponValue = 0;
      if (durationDays <= 30) {
        couponValue = priceMonthly;
      } else if (durationDays <= 90) {
        couponValue = priceMonthly * 3;
      } else if (durationDays <= 180) {
        couponValue = priceMonthly * 6;
      } else if (durationDays >= 365) {
        couponValue = priceYearly || priceMonthly * 12;
      } else {
        couponValue = Math.round((priceMonthly / 30) * durationDays);
      }
      
      potentialRevenue += couponValue * remainingActivations;
    });

    // Get coupons expiring in next 7 days
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = await prisma.subscription_coupons.findMany({
      where: {
        status: 'ACTIVE',
        valid_until: {
          gte: now,
          lte: weekFromNow,
        },
      },
      select: {
        id: true,
        code: true,
        valid_until: true,
        plan_snapshot_json: true,
      },
    });

    // Get redemption trends (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const redemptions = await prisma.coupon_redemptions.findMany({
      where: {
        redeemed_at: { gte: thirtyDaysAgo },
      },
      select: {
        redeemed_at: true,
      },
      orderBy: { redeemed_at: 'asc' },
    });

    // Group redemptions by day
    const redemptionsByDay = {};
    redemptions.forEach(r => {
      const day = r.redeemed_at.toISOString().split('T')[0];
      redemptionsByDay[day] = (redemptionsByDay[day] || 0) + 1;
    });

    // Get top plans by redemption
    const topPlans = await prisma.coupon_redemptions.groupBy({
      by: ['coupon_id'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    res.json({
      ok: true,
      analytics: {
        summary: {
          total: totalCoupons,
          active: activeCoupons,
          redeemed: redeemedCoupons,
          expired: expiredCoupons,
          revoked: revokedCoupons,
          redemptionRate: totalCoupons > 0 ? ((redeemedCoupons / totalCoupons) * 100).toFixed(1) : 0,
          totalRevenue: totalRevenue,
          potentialRevenue: potentialRevenue,
          currency: currency,
        },
        expiringSoon: expiringSoon.map(c => ({
          id: c.id,
          code: c.code,
          validUntil: c.valid_until,
          planName: (c.plan_snapshot_json && c.plan_snapshot_json.name) || 'Unknown',
          daysLeft: Math.ceil((new Date(c.valid_until).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        })),
        redemptionTrend: Object.entries(redemptionsByDay).map(([date, count]) => ({
          date,
          count,
        })),
      },
    });
  } catch (error) {
    console.error('[CouponRoutes] Analytics error:', error);
    res.status(500).json({
      ok: false,
      error: 'ANALYTICS_FAILED',
      message: 'Failed to fetch analytics',
    });
  }
});

module.exports = router;
