/**
 * BISMAN ERP - Subscription Plans API Routes
 * 
 * Endpoints for managing subscription plans:
 * - GET /api/subscription-plans - List all plans
 * - POST /api/subscription-plans - Create new plan
 * - PATCH /api/subscription-plans/:id - Update plan
 * - DELETE /api/subscription-plans/:id - Delete plan
 * - POST /api/subscription-plans/:id/toggle-status - Toggle plan active status
 * 
 * @module routes/subscriptionPlans
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');
const { superAdminOnly } = require('../middleware/superAdminAuth');

// ============================================================================
// DEFAULT PLAN CONFIGURATIONS
// ============================================================================

const DEFAULT_PLANS = {
  BASIC: {
    plan_code: 'BASIC',
    name: 'Basic',
    description: 'Essential features for small teams',
    price_monthly: 999,
    price_yearly: 9990,
    max_users: 5,
    max_storage_gb: 5,
    max_branches: 1,
    max_api_calls_day: 0,
    trial_days: 7,
    is_active: true,
    is_custom: false,
    sort_order: 1,
    feature_flags: {
      CUSTOM_ROLES: false,
      MAKER_CHECKER: false,
      AUTOMATION_RULES: false,
      API_ACCESS: false,
      AUDIT_EXPORT: false,
      REALTIME_SYNC: false,
      REPORT_BUILDER: false,
      COMPLIANCE_MODULE: false,
      WHITE_LABEL: false,
      SSO: false,
      MULTI_BRANCH: false,
      PRIORITY_SUPPORT: false,
    },
  },
  STANDARD: {
    plan_code: 'STANDARD',
    name: 'Standard',
    description: 'Advanced features for growing teams',
    price_monthly: 2999,
    price_yearly: 29990,
    max_users: 25,
    max_storage_gb: 50,
    max_branches: 5,
    max_api_calls_day: 10000,
    trial_days: 14,
    is_active: true,
    is_custom: false,
    sort_order: 2,
    feature_flags: {
      CUSTOM_ROLES: true,
      MAKER_CHECKER: true,
      AUTOMATION_RULES: true,
      API_ACCESS: true,
      AUDIT_EXPORT: false,
      REALTIME_SYNC: true,
      REPORT_BUILDER: false,
      COMPLIANCE_MODULE: false,
      WHITE_LABEL: false,
      SSO: false,
      MULTI_BRANCH: true,
      PRIORITY_SUPPORT: false,
    },
  },
  PRO: {
    plan_code: 'PRO',
    name: 'Professional',
    description: 'Full-featured solution for established businesses',
    price_monthly: 9999,
    price_yearly: 99990,
    max_users: 100,
    max_storage_gb: 200,
    max_branches: 20,
    max_api_calls_day: 50000,
    trial_days: 14,
    is_active: true,
    is_custom: false,
    sort_order: 3,
    feature_flags: {
      CUSTOM_ROLES: true,
      MAKER_CHECKER: true,
      AUTOMATION_RULES: true,
      API_ACCESS: true,
      AUDIT_EXPORT: true,
      REALTIME_SYNC: true,
      REPORT_BUILDER: true,
      COMPLIANCE_MODULE: true,
      WHITE_LABEL: false,
      SSO: false,
      MULTI_BRANCH: true,
      PRIORITY_SUPPORT: true,
    },
  },
  ENTERPRISE: {
    plan_code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Unlimited features for large organizations',
    price_monthly: 0,
    price_yearly: 0,
    max_users: -1,
    max_storage_gb: -1,
    max_branches: -1,
    max_api_calls_day: -1,
    trial_days: 30,
    is_active: true,
    is_custom: false,
    sort_order: 4,
    feature_flags: {
      CUSTOM_ROLES: true,
      MAKER_CHECKER: true,
      AUTOMATION_RULES: true,
      API_ACCESS: true,
      AUDIT_EXPORT: true,
      REALTIME_SYNC: true,
      REPORT_BUILDER: true,
      COMPLIANCE_MODULE: true,
      WHITE_LABEL: true,
      SSO: true,
      MULTI_BRANCH: true,
      PRIORITY_SUPPORT: true,
    },
  },
};

const DEFAULT_FEATURE_LIST = [
  { id: 'CUSTOM_ROLES', name: 'Custom Roles', description: 'Create custom permission roles' },
  { id: 'MAKER_CHECKER', name: 'Maker-Checker Workflow', description: 'Dual approval for sensitive operations' },
  { id: 'AUTOMATION_RULES', name: 'Automation Rules', description: 'Automated workflows and triggers' },
  { id: 'API_ACCESS', name: 'API Access', description: 'REST API for integrations' },
  { id: 'AUDIT_EXPORT', name: 'Audit Export', description: 'Export audit logs to external systems' },
  { id: 'REALTIME_SYNC', name: 'Real-time Sync', description: 'Live data synchronization' },
  { id: 'REPORT_BUILDER', name: 'Report Builder', description: 'Custom report creation' },
  { id: 'COMPLIANCE_MODULE', name: 'Compliance Module', description: 'Regulatory compliance tools' },
  { id: 'WHITE_LABEL', name: 'White Label', description: 'Custom branding options' },
  { id: 'SSO', name: 'Single Sign-On', description: 'SAML/OAuth SSO integration' },
  { id: 'MULTI_BRANCH', name: 'Multi-Branch', description: 'Multiple branch locations' },
  { id: 'PRIORITY_SUPPORT', name: 'Priority Support', description: '24/7 dedicated support' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get tenant count for a plan code
 */
async function getTenantCountForPlan(prisma, planCode) {
  try {
    // Count ClientSubscription records with this plan
    // Try both plan_id join and direct planCode lookup
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { plan_code: planCode },
    });
    
    if (plan) {
      const count = await prisma.clientSubscription.count({
        where: {
          plan_id: plan.id,
          state: { in: ['ACTIVE', 'TRIAL'] },
        },
      });
      return count;
    }
    return 0;
  } catch (error) {
    console.error('Error counting tenants:', error);
    return 0;
  }
}

/**
 * Format plan for API response
 * Handles both database (snake_case) and default (snake_case) plans
 */
function formatPlanResponse(plan, tenantCount = 0) {
  // Get the features/feature_flags object
  const planFeatures = plan.feature_flags || plan.features || {};
  
  const features = DEFAULT_FEATURE_LIST.map((feature) => ({
    id: feature.id,
    name: feature.name,
    description: feature.description,
    enabled: planFeatures[feature.id] ?? false,
  }));

  return {
    id: plan.id || plan.plan_code,
    code: plan.plan_code,
    name: plan.name,
    description: plan.description,
    priceMonthly: Number(plan.price_monthly) || 0,
    priceYearly: Number(plan.price_yearly) || 0,
    maxUsers: plan.max_users ?? 10,
    maxStorageGb: plan.max_storage_gb ?? 10,
    maxBranches: plan.max_branches ?? 1,
    maxApiCallsDay: plan.max_api_calls_day ?? 1000,
    trialDays: plan.trial_days ?? 14,
    isActive: plan.is_active ?? true,
    isCustom: plan.is_custom ?? false,
    sortOrder: plan.sort_order ?? 99,
    features,
    tenantCount,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/subscription-plans
 * List all subscription plans
 */
router.get('/', async (req, res) => {
  try {
    const prisma = getPrisma();

    // Try to get plans from database
    let dbPlans = [];
    try {
      dbPlans = await prisma.subscriptionPlan.findMany({
        orderBy: { sort_order: 'asc' },
      });
    } catch (err) {
      // Table might not exist, use defaults
      console.log('SubscriptionPlan table not found, using defaults:', err.message);
    }

    // If no DB plans, use defaults
    if (dbPlans.length === 0) {
      const plans = await Promise.all(
        Object.values(DEFAULT_PLANS).map(async (plan) => {
          const tenantCount = await getTenantCountForPlan(prisma, plan.plan_code);
          return formatPlanResponse(plan, tenantCount);
        })
      );

      return res.json({
        ok: true,
        plans,
        source: 'default',
      });
    }

    // Format DB plans with tenant counts
    const plans = await Promise.all(
      dbPlans.map(async (plan) => {
        const tenantCount = await getTenantCountForPlan(prisma, plan.plan_code);
        return formatPlanResponse(plan, tenantCount);
      })
    );

    res.json({
      ok: true,
      plans,
      source: 'database',
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch subscription plans',
    });
  }
});

/**
 * GET /api/subscription-plans/:id
 * Get a single plan by ID or code
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();

    // Try to find in DB by id or plan_code
    let plan = null;
    try {
      const numericId = parseInt(id, 10);
      plan = await prisma.subscriptionPlan.findFirst({
        where: {
          OR: [
            ...(isNaN(numericId) ? [] : [{ id: numericId }]),
            { plan_code: id.toUpperCase() },
          ],
        },
      });
    } catch (err) {
      console.log('DB error, checking defaults:', err.message);
    }

    // Check defaults if not in DB
    if (!plan) {
      plan = DEFAULT_PLANS[id.toUpperCase()];
    }

    if (!plan) {
      return res.status(404).json({
        ok: false,
        error: 'Plan not found',
      });
    }

    const tenantCount = await getTenantCountForPlan(prisma, plan.plan_code);
    res.json({
      ok: true,
      plan: formatPlanResponse(plan, tenantCount),
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch plan',
    });
  }
});

/**
 * POST /api/subscription-plans
 * Create a new subscription plan (SuperAdmin only)
 */
router.post('/', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const {
      code,
      name,
      description,
      priceMonthly,
      priceYearly,
      maxUsers,
      maxStorageGb,
      maxBranches,
      maxApiCallsDay,
      trialDays,
      isActive,
      features,
    } = req.body;

    // Validate required fields
    if (!code || !name || !description) {
      return res.status(400).json({
        ok: false,
        error: 'Code, name, and description are required',
      });
    }

    // Check if code already exists
    const existingPlan = await prisma.subscriptionPlan.findFirst({
      where: { plan_code: code.toUpperCase() },
    });

    if (existingPlan) {
      return res.status(400).json({
        ok: false,
        error: 'A plan with this code already exists',
      });
    }

    // Get max sort order
    const maxSortOrder = await prisma.subscriptionPlan.aggregate({
      _max: { sort_order: true },
    });

    // Create the plan
    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        plan_code: code.toUpperCase(),
        name,
        description,
        price_monthly: priceMonthly || 0,
        price_yearly: priceYearly || 0,
        max_users: maxUsers || 10,
        max_storage_gb: maxStorageGb || 10,
        max_branches: maxBranches || 1,
        max_api_calls_day: maxApiCallsDay || 1000,
        trial_days: trialDays || 14,
        is_active: isActive ?? true,
        is_custom: true,
        sort_order: (maxSortOrder._max.sort_order || 0) + 1,
        feature_flags: features || {},
      },
    });

    res.status(201).json({
      ok: true,
      message: 'Plan created successfully',
      plan: formatPlanResponse(newPlan, 0),
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to create plan',
    });
  }
});

/**
 * PATCH /api/subscription-plans/:id
 * Update a subscription plan (SuperAdmin only)
 */
router.patch('/:id', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();

    const {
      name,
      description,
      priceMonthly,
      priceYearly,
      maxUsers,
      maxStorageGb,
      maxBranches,
      maxApiCallsDay,
      trialDays,
      isActive,
      features,
    } = req.body;

    // Find the plan
    const numericId = parseInt(id, 10);
    let plan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          ...(isNaN(numericId) ? [] : [{ id: numericId }]),
          { plan_code: id.toUpperCase() },
        ],
      },
    });

    if (!plan) {
      // If it's a default plan not in DB, create it first
      const defaultPlan = DEFAULT_PLANS[id.toUpperCase()];
      if (defaultPlan) {
        plan = await prisma.subscriptionPlan.create({
          data: {
            plan_code: defaultPlan.plan_code,
            name: defaultPlan.name,
            description: defaultPlan.description,
            price_monthly: defaultPlan.price_monthly,
            price_yearly: defaultPlan.price_yearly,
            max_users: defaultPlan.max_users,
            max_storage_gb: defaultPlan.max_storage_gb,
            max_branches: defaultPlan.max_branches,
            max_api_calls_day: defaultPlan.max_api_calls_day,
            trial_days: defaultPlan.trial_days,
            is_active: defaultPlan.is_active,
            sort_order: defaultPlan.sort_order,
            feature_flags: defaultPlan.feature_flags,
          },
        });
      } else {
        return res.status(404).json({
          ok: false,
          error: 'Plan not found',
        });
      }
    }

    // Update the plan
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(priceMonthly !== undefined && { price_monthly: priceMonthly }),
        ...(priceYearly !== undefined && { price_yearly: priceYearly }),
        ...(maxUsers !== undefined && { max_users: maxUsers }),
        ...(maxStorageGb !== undefined && { max_storage_gb: maxStorageGb }),
        ...(maxBranches !== undefined && { max_branches: maxBranches }),
        ...(maxApiCallsDay !== undefined && { max_api_calls_day: maxApiCallsDay }),
        ...(trialDays !== undefined && { trial_days: trialDays }),
        ...(isActive !== undefined && { is_active: isActive }),
        ...(features !== undefined && { feature_flags: features }),
      },
    });

    const tenantCount = await getTenantCountForPlan(prisma, updatedPlan.plan_code);

    res.json({
      ok: true,
      message: 'Plan updated successfully',
      plan: formatPlanResponse(updatedPlan, tenantCount),
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to update plan',
    });
  }
});

/**
 * DELETE /api/subscription-plans/:id
 * Delete a subscription plan (SuperAdmin only, custom plans only)
 */
router.delete('/:id', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = getPrisma();

    // Find the plan
    const numericId = parseInt(id, 10);
    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          ...(isNaN(numericId) ? [] : [{ id: numericId }]),
          { plan_code: id.toUpperCase() },
        ],
      },
    });

    if (!plan) {
      return res.status(404).json({
        ok: false,
        error: 'Plan not found',
      });
    }

    // Only allow deleting custom plans
    if (!plan.is_custom) {
      return res.status(403).json({
        ok: false,
        error: 'Cannot delete default plans. You can deactivate them instead.',
      });
    }

    // Check if any tenants are using this plan
    const tenantCount = await getTenantCountForPlan(prisma, plan.plan_code);
    if (tenantCount > 0) {
      return res.status(400).json({
        ok: false,
        error: `Cannot delete plan: ${tenantCount} tenant(s) are using this plan`,
      });
    }

    // Delete the plan
    await prisma.subscriptionPlan.delete({
      where: { id: plan.id },
    });

    res.json({
      ok: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to delete plan',
    });
  }
});

/**
 * POST /api/subscription-plans/:id/toggle-status
 * Toggle plan active/inactive status (SuperAdmin only)
 */
router.post('/:id/toggle-status', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const prisma = getPrisma();

    // Find the plan
    const numericId = parseInt(id, 10);
    let plan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [
          ...(isNaN(numericId) ? [] : [{ id: numericId }]),
          { plan_code: id.toUpperCase() },
        ],
      },
    });

    if (!plan) {
      // If it's a default plan not in DB, create it first
      const defaultPlan = DEFAULT_PLANS[id.toUpperCase()];
      if (defaultPlan) {
        plan = await prisma.subscriptionPlan.create({
          data: {
            plan_code: defaultPlan.plan_code,
            name: defaultPlan.name,
            description: defaultPlan.description,
            price_monthly: defaultPlan.price_monthly,
            price_yearly: defaultPlan.price_yearly,
            max_users: defaultPlan.max_users,
            max_storage_gb: defaultPlan.max_storage_gb,
            max_branches: defaultPlan.max_branches,
            max_api_calls_day: defaultPlan.max_api_calls_day,
            trial_days: defaultPlan.trial_days,
            is_active: defaultPlan.is_active,
            sort_order: defaultPlan.sort_order,
            feature_flags: defaultPlan.feature_flags,
          },
        });
      } else {
        return res.status(404).json({
          ok: false,
          error: 'Plan not found',
        });
      }
    }

    // Update the status
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { is_active: isActive },
    });

    const tenantCount = await getTenantCountForPlan(prisma, updatedPlan.plan_code);

    res.json({
      ok: true,
      message: `Plan ${isActive ? 'activated' : 'deactivated'} successfully`,
      plan: formatPlanResponse(updatedPlan, tenantCount),
    });
  } catch (error) {
    console.error('Error toggling plan status:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to toggle plan status',
    });
  }
});

module.exports = router;
