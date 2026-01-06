/**
 * BISMAN ERP - Admin Creation with Subscription Routes
 * 
 * Routes for creating admins with complete subscription assignment workflow.
 * These routes are used by SUPER_ADMIN and ENTERPRISE_ADMIN to create new
 * organizations (tenants) with their admin users.
 * 
 * SECURITY FIX P1-4: validateBusinessLevelOnCreate middleware applied
 * 
 * @module routes/adminWithSubscription
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const {
  createAdminWithSubscription,
  checkSubscriptionLimits,
  getAvailablePlans,
  validateAdminInput,
  checkEmailExists,
} = require('../services/adminCreation/adminWithSubscriptionService');
const { getPrisma } = require('../lib/prisma');
const { validateBusinessLevelOnCreate } = require('../middleware/businessLevelProtection');

// Feature enforcement middleware
const { enforceUsage } = require('../middleware/microUnlockEnforcer');

// ============================================================================
// MIDDLEWARE
// ============================================================================

const superAdminOnly = [
  authenticate,
  requireRole(['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN']),
];

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * GET /api/admin-creation/plans
 * Get available subscription plans for the creation form
 * 
 * No authentication required - used in public signup forms
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await getAvailablePlans();
    
    res.json({
      ok: true,
      plans,
      billingCycles: [
        { value: 'MONTHLY', label: 'Monthly', discount: 0 },
        { value: 'YEARLY', label: 'Yearly', discount: 17 }, // ~2 months free
      ],
      defaultPlan: 'BASIC',
      defaultBillingCycle: 'YEARLY',
    });
  } catch (error) {
    console.error('[Admin Creation] Get plans error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch plans' });
  }
});

/**
 * POST /api/admin-creation/check-email
 * Check if an email is already registered
 */
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    const result = await checkEmailExists(email);
    
    res.json({
      ok: true,
      available: !result.exists,
      message: result.exists 
        ? `Email is already registered as a ${result.type}` 
        : 'Email is available',
    });
  } catch (error) {
    console.error('[Admin Creation] Check email error:', error);
    res.status(500).json({ ok: false, error: 'Failed to check email' });
  }
});

/**
 * POST /api/admin-creation/validate
 * Validate admin creation input without creating anything
 */
router.post('/validate', async (req, res) => {
  try {
    const errors = validateAdminInput(req.body);
    
    if (errors.length > 0) {
      return res.status(400).json({
        ok: false,
        valid: false,
        errors,
      });
    }

    // Also check email availability
    const emailCheck = await checkEmailExists(req.body.email);
    if (emailCheck.exists) {
      return res.status(400).json({
        ok: false,
        valid: false,
        errors: [`Email is already registered as a ${emailCheck.type}`],
      });
    }

    res.json({
      ok: true,
      valid: true,
      message: 'All inputs are valid',
    });
  } catch (error) {
    console.error('[Admin Creation] Validate error:', error);
    res.status(500).json({ ok: false, error: 'Validation failed' });
  }
});

// ============================================================================
// PROTECTED ROUTES (SuperAdmin / Enterprise Admin)
// ============================================================================

/**
 * POST /api/admin-creation/create
 * Create a new admin with organization and subscription
 * 
 * Required fields:
 * - adminName: string
 * - email: string
 * - password: string
 * - organizationName: string
 * - subscriptionPlan: 'BASIC' | 'STANDARD' | 'PRO' | 'ENTERPRISE'
 * - billingCycle: 'MONTHLY' | 'YEARLY'
 * 
 * Optional fields:
 * - billingStartDate: Date (defaults to now)
 * - productType: string (defaults to 'BUSINESS_ERP')
 * - timezone: string (defaults to 'Asia/Kolkata')
 * - currency: string (defaults to 'INR')
 */
router.post('/create', ...superAdminOnly, validateBusinessLevelOnCreate(), enforceUsage('user_creation'), async (req, res) => {
  try {
    const {
      adminName,
      email,
      password,
      organizationName,
      subscriptionPlan,
      billingCycle,
      billingStartDate,
      productType,
      timezone,
      currency,
      dateFormat,
      locale,
    } = req.body;

    // Log the attempt
    console.log(`[Admin Creation] Creating admin for org: ${organizationName}, plan: ${subscriptionPlan}`);
    console.log(`[Admin Creation] Created by: ${req.user?.email} (${req.user?.role})`);

    // Create admin with subscription
    const result = await createAdminWithSubscription(
      {
        adminName,
        email,
        password,
        organizationName,
        subscriptionPlan,
        billingCycle,
        billingStartDate,
        productType,
        timezone,
        currency,
        dateFormat,
        locale,
      },
      {
        createdBy: req.user?.id,
        createdByRole: req.user?.role,
        superAdminId: req.user?.superAdminId,
      }
    );

    console.log(`[Admin Creation] Successfully created org: ${result.organization.name}, admin: ${result.admin.email}`);

    res.status(201).json(result);
  } catch (error) {
    console.error('[Admin Creation] Create error:', error);
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to create admin with subscription',
    });
  }
});

/**
 * GET /api/admin-creation/organizations
 * List all organizations created by the current admin
 */
router.get('/organizations', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const planFilter = req.query.plan || '';
    const statusFilter = req.query.status || '';

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (planFilter) {
      where.subscriptionPlan = planFilter;
    }

    if (statusFilter) {
      where.subscriptionStatus = statusFilter;
    }

    // If not ENTERPRISE_ADMIN, filter to only their created orgs
    const userRole = (req.user?.role || '').toUpperCase();
    if (userRole === 'SUPER_ADMIN') {
      // Get super admin's ID from user record
      const superAdmin = await prisma.super_admins.findFirst({
        where: { email: req.user.email },
      });
      if (superAdmin) {
        where.super_admin_id = superAdmin.id;
      }
    }

    const [organizations, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: { 
              branches: true,
            },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    // Get user counts separately (since User is not directly related)
    const orgIds = organizations.map(o => o.id);
    const userCounts = await prisma.user.groupBy({
      by: ['clientId'],
      where: { clientId: { in: orgIds } },
      _count: true,
    });

    const userCountMap = new Map(userCounts.map(u => [u.clientId, u._count]));

    res.json({
      ok: true,
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        clientCode: org.client_code,
        subscriptionPlan: org.subscription?.plan?.plan_code || org.subscriptionPlan,
        subscriptionStatus: org.subscription?.state || org.subscriptionStatus,
        isActive: org.is_active,
        stats: {
          users: userCountMap.get(org.id) || 0,
          branches: org._count.branches,
          storageUsed: org.subscription?.current_storage_used || 0,
        },
        limits: org.subscription?.plan ? {
          maxUsers: org.subscription.plan.max_users,
          maxBranches: org.subscription.plan.max_branches,
          maxStorageGb: org.subscription.plan.max_storage_gb,
        } : null,
        trialEndDate: org.subscription?.trial_end_date || org.trial_end_date,
        createdAt: org.created_at?.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Creation] List organizations error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch organizations' });
  }
});

/**
 * GET /api/admin-creation/organizations/:orgId
 * Get detailed info about a specific organization
 */
router.get('/organizations/:orgId', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { orgId } = req.params;

    const organization = await prisma.client.findUnique({
      where: { id: orgId },
      include: {
        subscription: {
          include: { plan: true },
        },
        branches: {
          select: {
            id: true,
            branchCode: true,
            branchName: true,
            city: true,
            isActive: true,
          },
        },
        featureOverrides: true,
        billingOverrides: {
          where: { is_active: true },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({ ok: false, error: 'Organization not found' });
    }

    // Get admin users
    const adminUsers = await prisma.user.findMany({
      where: { 
        clientId: orgId,
        role: { in: ['ADMIN', 'CLIENT_ADMIN', 'admin'] },
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        is_active: true,
        last_login: true,
        created_at: true,
      },
    });

    // Get usage statistics
    const limits = await checkSubscriptionLimits(orgId);

    res.json({
      ok: true,
      organization: {
        id: organization.id,
        name: organization.name,
        clientCode: organization.client_code,
        legalName: organization.legal_name,
        isActive: organization.is_active,
        settings: organization.settings,
        createdAt: organization.created_at?.toISOString(),
      },
      subscription: organization.subscription ? {
        id: organization.subscription.id,
        state: organization.subscription.state,
        plan: {
          code: organization.subscription.plan.plan_code,
          name: organization.subscription.plan.name,
          maxUsers: organization.subscription.plan.max_users,
          maxBranches: organization.subscription.plan.max_branches,
          maxStorageGb: organization.subscription.plan.max_storage_gb,
          maxApiCallsDay: organization.subscription.plan.max_api_calls_day,
          features: organization.subscription.plan.feature_flags,
        },
        billingCycle: organization.subscription.billing_cycle,
        trialEndDate: organization.subscription.trial_end_date,
        nextBillingDate: organization.subscription.next_billing_date,
        currentPeriodEnd: organization.subscription.current_period_end,
      } : null,
      usage: limits.usage || null,
      branches: organization.branches,
      admins: adminUsers,
      featureOverrides: organization.featureOverrides.map(fo => ({
        flagCode: fo.flag_code,
        value: fo.override_value,
        reason: fo.reason,
        expiresAt: fo.expires_at,
      })),
      billingOverrides: organization.billingOverrides.map(bo => ({
        type: bo.override_type,
        discountPercent: bo.discount_percent,
        customPrice: bo.custom_price,
        validUntil: bo.valid_until,
        reason: bo.reason,
      })),
    });
  } catch (error) {
    console.error('[Admin Creation] Get organization error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch organization details' });
  }
});

/**
 * GET /api/admin-creation/organizations/:orgId/usage
 * Get subscription usage and limits for an organization
 */
router.get('/organizations/:orgId/usage', ...superAdminOnly, async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await checkSubscriptionLimits(orgId);
    
    if (!result.ok) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[Admin Creation] Get usage error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch usage' });
  }
});

/**
 * POST /api/admin-creation/organizations/:orgId/toggle-status
 * Enable or disable an organization
 */
router.post('/organizations/:orgId/toggle-status', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { orgId } = req.params;
    const { isActive, reason } = req.body;

    const organization = await prisma.client.findUnique({
      where: { id: orgId },
      include: { subscription: true },
    });

    if (!organization) {
      return res.status(404).json({ ok: false, error: 'Organization not found' });
    }

    // Update organization and subscription status
    const updates = await prisma.$transaction([
      prisma.client.update({
        where: { id: orgId },
        data: { 
          is_active: isActive,
          updated_at: new Date(),
        },
      }),
      organization.subscription ? prisma.clientSubscription.update({
        where: { id: organization.subscription.id },
        data: { 
          is_active: isActive,
          state: isActive ? 'ACTIVE' : 'SUSPENDED',
          previous_state: organization.subscription.state,
          state_changed_at: new Date(),
        },
      }) : Promise.resolve(null),
      prisma.subscriptionAuditLog.create({
        data: {
          client_id: orgId,
          subscription_id: organization.subscription?.id || null,
          action: isActive ? 'reactivated' : 'suspended',
          action_category: 'admin',
          old_values: { is_active: organization.is_active },
          new_values: { is_active: isActive },
          reason: reason || `Organization ${isActive ? 'reactivated' : 'suspended'} by admin`,
          actor_type: req.user?.role || 'admin',
          actor_id: req.user?.id,
        },
      }),
    ]);

    res.json({
      ok: true,
      message: `Organization ${isActive ? 'activated' : 'deactivated'} successfully`,
      organization: {
        id: orgId,
        isActive,
        subscriptionState: updates[1]?.state || organization.subscription?.state,
      },
    });
  } catch (error) {
    console.error('[Admin Creation] Toggle status error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update organization status' });
  }
});

/**
 * PATCH /api/admin-creation/organizations/:orgId/subscription
 * Update subscription plan for an organization
 */
router.patch('/organizations/:orgId/subscription', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { orgId } = req.params;
    const { newPlan, billingCycle, immediate, reason } = req.body;

    if (!newPlan) {
      return res.status(400).json({ ok: false, error: 'New plan is required' });
    }

    // Get current subscription
    const subscription = await prisma.clientSubscription.findUnique({
      where: { client_id: orgId },
      include: { plan: true },
    });

    if (!subscription) {
      return res.status(404).json({ ok: false, error: 'No subscription found for this organization' });
    }

    // Get new plan
    const newPlanRecord = await prisma.subscriptionPlan.findUnique({
      where: { plan_code: newPlan },
    });

    if (!newPlanRecord) {
      return res.status(400).json({ ok: false, error: 'Invalid plan code' });
    }

    const isUpgrade = newPlanRecord.price_monthly > subscription.plan.price_monthly;
    const oldPlan = subscription.plan.plan_code;

    let updatedSubscription;
    if (immediate || isUpgrade) {
      // Immediate change
      updatedSubscription = await prisma.$transaction(async (tx) => {
        const updated = await tx.clientSubscription.update({
          where: { id: subscription.id },
          data: {
            plan_id: newPlanRecord.id,
            state: isUpgrade ? 'UPGRADING' : subscription.state,
            billing_cycle: billingCycle || subscription.billing_cycle,
            updated_at: new Date(),
          },
          include: { plan: true },
        });

        await tx.client.update({
          where: { id: orgId },
          data: { subscriptionPlan: newPlan },
        });

        await tx.subscriptionAuditLog.create({
          data: {
            client_id: orgId,
            subscription_id: subscription.id,
            action: isUpgrade ? 'plan_upgrade' : 'plan_change',
            action_category: 'billing',
            old_values: { plan_code: oldPlan },
            new_values: { plan_code: newPlan },
            reason: reason || `Plan changed from ${oldPlan} to ${newPlan}`,
            actor_type: req.user?.role || 'admin',
            actor_id: req.user?.id,
          },
        });

        return updated;
      });

      // After immediate upgrade, set back to ACTIVE
      if (isUpgrade) {
        await prisma.clientSubscription.update({
          where: { id: subscription.id },
          data: { state: 'ACTIVE' },
        });
      }
    } else {
      // Schedule downgrade for end of billing period
      updatedSubscription = await prisma.$transaction(async (tx) => {
        const updated = await tx.clientSubscription.update({
          where: { id: subscription.id },
          data: {
            scheduled_plan_id: newPlanRecord.id,
            scheduled_change_date: subscription.current_period_end,
            scheduled_change_type: 'downgrade',
            state: 'DOWNGRADING',
            updated_at: new Date(),
          },
          include: { plan: true },
        });

        await tx.subscriptionAuditLog.create({
          data: {
            client_id: orgId,
            subscription_id: subscription.id,
            action: 'plan_downgrade_scheduled',
            action_category: 'billing',
            old_values: { plan_code: oldPlan },
            new_values: { 
              scheduled_plan: newPlan, 
              effective_date: subscription.current_period_end 
            },
            reason: reason || `Plan downgrade scheduled from ${oldPlan} to ${newPlan}`,
            actor_type: req.user?.role || 'admin',
            actor_id: req.user?.id,
          },
        });

        return updated;
      });
    }

    res.json({
      ok: true,
      message: immediate || isUpgrade 
        ? 'Subscription plan updated immediately'
        : 'Plan downgrade scheduled for end of billing period',
      subscription: {
        id: updatedSubscription.id,
        oldPlan,
        newPlan: immediate || isUpgrade ? newPlan : oldPlan,
        scheduledPlan: immediate || isUpgrade ? null : newPlan,
        state: updatedSubscription.state,
        effectiveDate: immediate || isUpgrade ? new Date() : subscription.current_period_end,
      },
    });
  } catch (error) {
    console.error('[Admin Creation] Update subscription error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update subscription' });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
