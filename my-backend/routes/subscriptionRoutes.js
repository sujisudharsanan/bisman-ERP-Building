/**
 * BISMAN ERP - Subscription Routes
 * 
 * Public and tenant-facing subscription management endpoints.
 * Includes pricing page data, current subscription info, and upgrade/downgrade actions.
 * 
 * @module routes/subscriptionRoutes
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { attachSubscriptionInfo } = require('../middleware/subscriptionEnforcer');
const { PLAN_LIMITS, PLAN_FEATURE_DEFAULTS } = require('../lib/featureFlags');
const { subscriptionService } = require('../lib/subscriptionStateMachine');

// ============================================================================
// PUBLIC ROUTES (No Auth Required)
// ============================================================================

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans for pricing page
 */
router.get('/plans', async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const plans = await prisma.subscription_plans.findMany({
      where: { is_active: true, is_public: true },
      orderBy: { sort_order: 'asc' },
      select: {
        id: true,
        plan_code: true,
        name: true,
        description: true,
        short_description: true,
        badge_text: true,
        price_monthly: true,
        price_yearly: true,
        currency: true,
        max_users: true,
        max_storage_gb: true,
        max_branches: true,
        max_api_calls_day: true,
        feature_flags: true,
        is_popular: true,
        is_enterprise: true,
        is_active: true,
        cta_text: true,
        cta_action: true,
      },
    });

    // Enhance with plan limits
    const enhancedPlans = plans.map(plan => ({
      ...plan,
      price_monthly: parseFloat(plan.price_monthly),
      price_yearly: parseFloat(plan.price_yearly),
      yearly_savings: plan.price_monthly * 12 - parseFloat(plan.price_yearly),
      limits: PLAN_LIMITS[plan.plan_code] || {},
    }));

    res.json({
      ok: true,
      plans: enhancedPlans,
      billing_cycles: ['MONTHLY', 'YEARLY'],
      default_cycle: 'YEARLY',
      currency_symbol: '₹',
    });
  } catch (error) {
    console.error('[Subscriptions] Error fetching plans:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch subscription plans',
    });
  }
});

/**
 * GET /api/subscriptions/pricing-page
 * Get complete pricing page data including comparison
 */
router.get('/pricing-page', async (req, res) => {
  try {
    const prisma = getPrisma();

    const plans = await prisma.subscription_plans.findMany({
      where: { is_active: true, is_public: true },
      orderBy: { sort_order: 'asc' },
    });

    // Build feature comparison matrix
    const features = [
      { key: 'max_users', label: 'Active Users', type: 'limit' },
      { key: 'max_storage_gb', label: 'Secure Storage', type: 'limit', suffix: ' GB' },
      { key: 'TASK_MANAGEMENT', label: 'Task & Workflow Management', type: 'feature' },
      { key: 'OPERATIONS_DASHBOARD', label: 'Operations Dashboard', type: 'feature' },
      { key: 'BASIC_FINANCE', label: 'Basic Finance (Receivables & Payables)', type: 'feature' },
      { key: 'ADVANCED_FINANCE', label: 'Advanced Finance & Cost Centers', type: 'feature' },
      { key: 'CUSTOM_ROLES', label: 'Custom Roles & Permissions', type: 'feature' },
      { key: 'MAKER_CHECKER', label: 'Maker–Checker Approvals', type: 'feature' },
      { key: 'AUTOMATION_RULES', label: 'Automation Rules', type: 'feature_value' },
      { key: 'API_ACCESS', label: 'API Access', type: 'feature' },
      { key: 'AUDIT_EXPORT', label: 'Audit Log Export', type: 'feature' },
      { key: 'REALTIME_SOCKET', label: 'Real-time Notifications', type: 'feature' },
      { key: 'REPORT_BUILDER', label: 'Report Builder (CSV/PDF)', type: 'feature' },
      { key: 'COMPLIANCE_MODULE', label: 'Compliance & Legal Module', type: 'feature' },
      { key: 'DAILY_BACKUP', label: 'Daily Automated Backups', type: 'feature' },
      { key: 'MULTI_ENTITY', label: 'Multi-Entity Support', type: 'feature' },
      { key: 'SSO', label: 'Single Sign-On (SAML/OAuth)', type: 'feature' },
      { key: 'WHITE_LABEL', label: 'White Labeling', type: 'feature' },
      { key: 'DEDICATED_SUPPORT', label: 'Dedicated Support Team', type: 'feature' },
    ];

    const comparisonMatrix = features.map(feature => {
      const row = { 
        key: feature.key,
        label: feature.label,
        type: feature.type,
      };
      
      plans.forEach(plan => {
        const flags = plan.feature_flags || {};
        
        if (feature.type === 'limit') {
          const value = plan[feature.key];
          row[plan.plan_code] = value === -1 ? 'Unlimited' : `${value}${feature.suffix || ''}`;
        } else if (feature.type === 'feature') {
          row[plan.plan_code] = flags[feature.key] === true || flags.ALL_FEATURES === true;
        } else if (feature.type === 'feature_value') {
          const val = flags[feature.key];
          if (flags.ALL_FEATURES) row[plan.plan_code] = 'Unlimited';
          else if (val === true) row[plan.plan_code] = 'Yes';
          else if (val === 'LIMITED') row[plan.plan_code] = 'Limited (10 max)';
          else if (val === 'UNLIMITED') row[plan.plan_code] = 'Unlimited';
          else row[plan.plan_code] = false;
        }
      });
      
      return row;
    });

    // FAQ data
    const faqs = [
      {
        question: 'Can I upgrade my plan at any time?',
        answer: 'Yes! You can upgrade instantly. Your new features become available immediately, and we\'ll prorate your billing.',
      },
      {
        question: 'What happens when I downgrade?',
        answer: 'Downgrades take effect at the end of your current billing cycle. You\'ll need to ensure your usage is within the new plan limits.',
      },
      {
        question: 'Is there a free trial?',
        answer: 'Yes, all new accounts start with a free trial on the Starter plan with full access to test the platform.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards, UPI, net banking, and bank transfers for annual plans.',
      },
      {
        question: 'Is my data safe?',
        answer: 'Absolutely. We use bank-grade encryption, automated backups, and comply with industry security standards.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Yes, you can cancel anytime. For monthly plans, cancellation is immediate. Annual plans can be cancelled with prorated refunds.',
      },
    ];

    res.json({
      ok: true,
      title: 'Choose the Plan That Grows With Your Business',
      subtitle: 'Start small. Scale without limits. Upgrade anytime—no migrations, no data loss.',
      plans: plans.map(p => ({
        ...p,
        price_monthly: parseFloat(p.price_monthly),
        price_yearly: parseFloat(p.price_yearly),
        limits: PLAN_LIMITS[p.plan_code] || {},
      })),
      comparison: comparisonMatrix,
      faqs,
      trust_badges: [
        { icon: 'shield', label: 'Bank-Grade Security' },
        { icon: 'backup', label: 'Automated Backups' },
        { icon: 'uptime', label: '99.9% Uptime SLA' },
        { icon: 'compliance', label: 'Compliance Ready' },
      ],
    });
  } catch (error) {
    console.error('[Subscriptions] Pricing page error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to load pricing page data',
    });
  }
});

// ============================================================================
// AUTHENTICATED ROUTES
// ============================================================================

/**
 * GET /api/subscriptions/current
 * Get current user's subscription details
 */
router.get('/current', authenticate, attachSubscriptionInfo, async (req, res) => {
  try {
    const clientId = req.user.clientId || req.user.client_id || req.user.tenant_id || req.user.tenantId;
    
    console.log('[Subscriptions /current] req.user:', JSON.stringify({
      clientId: req.user.clientId,
      client_id: req.user.client_id,
      tenant_id: req.user.tenant_id,
      tenantId: req.user.tenantId,
      resolvedClientId: clientId,
    }));
    
    if (!clientId) {
      return res.status(400).json({
        ok: false,
        error: 'No client context',
        message: 'User is not associated with a client',
      });
    }

    const subscription = await subscriptionService.getSubscription(clientId);
    console.log('[Subscriptions /current] subscription found:', subscription ? 'yes' : 'no', subscription?.plan?.name);

    if (!subscription) {
      return res.json({
        ok: true,
        has_subscription: false,
        message: 'No active subscription found',
        trial_available: true,
      });
    }

    // Compute effective status based on expiry dates
    const now = new Date();
    const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
    const trialEndDate = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;
    
    let effectiveState = subscription.state;
    let isExpired = false;
    let isTrialExpired = false;
    let daysRemaining = null;
    
    // Check if trial has expired
    if (subscription.activation_source === 'TRIAL_MODAL' && trialEndDate && trialEndDate < now) {
      isTrialExpired = true;
      effectiveState = 'TRIAL_EXPIRED';
    }
    // Check if subscription has expired
    else if (expiresAt && expiresAt < now && subscription.state === 'ACTIVE') {
      isExpired = true;
      effectiveState = 'EXPIRED';
    }
    // Check if currently in trial
    else if (subscription.activation_source === 'TRIAL_MODAL' && trialEndDate && trialEndDate > now) {
      effectiveState = 'TRIAL';
      daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    // Check days remaining for active subscription
    else if (expiresAt && expiresAt > now) {
      daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // If FREE plan, never expires
    const isFreePlan = subscription.plan?.plan_code?.toUpperCase() === 'FREE' || 
                       parseFloat(subscription.plan?.price_monthly || 0) === 0;
    if (isFreePlan) {
      isExpired = false;
      isTrialExpired = false;
      effectiveState = 'ACTIVE';
      daysRemaining = null;
    }

    res.json({
      ok: true,
      has_subscription: true,
      subscription: {
        id: subscription.id,
        state: effectiveState,
        db_state: subscription.state, // Original DB state for debugging
        is_expired: isExpired,
        is_trial_expired: isTrialExpired,
        days_remaining: daysRemaining,
        plan: {
          code: subscription.plan.plan_code,
          name: subscription.plan.name,
          price_monthly: parseFloat(subscription.plan.price_monthly),
          price_yearly: parseFloat(subscription.plan.price_yearly),
        },
        billing_cycle: subscription.billing_cycle,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        next_billing_date: subscription.next_billing_date,
        trial_start_date: subscription.trial_start_date,
        trial_end_date: subscription.trial_end_date,
        trial_converted: subscription.trial_converted,
        expires_at: subscription.expires_at,
        started_at: subscription.started_at,
        created_at: subscription.created_at,
        activation_source: subscription.activation_source,
        usage: {
          users: {
            current: subscription.current_user_count,
            limit: subscription.plan.max_users,
          },
          storage: {
            current_bytes: Number(subscription.current_storage_used || 0),
            limit_gb: subscription.plan.max_storage_gb,
          },
        },
        scheduled_change: subscription.scheduled_plan_id ? {
          new_plan: subscription.scheduled_plan?.plan_code,
          effective_date: subscription.scheduled_change_date,
          type: subscription.scheduled_change_type,
        } : null,
        state_properties: subscription.stateProperties,
      },
    });
  } catch (error) {
    console.error('[Subscriptions] Current subscription error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch subscription details',
    });
  }
});

/**
 * GET /api/subscriptions/features
 * Get current feature flags and limits
 */
router.get('/features', authenticate, attachSubscriptionInfo, async (req, res) => {
  try {
    if (!req.subscription) {
      return res.json({
        ok: true,
        features: PLAN_FEATURE_DEFAULTS.STARTER,
        limits: PLAN_LIMITS.STARTER,
        plan: 'STARTER',
      });
    }

    res.json({
      ok: true,
      plan: req.subscription.plan,
      planName: req.subscription.planName,
      state: req.subscription.state,
      features: req.subscription.features,
      limits: req.subscription.limits,
      usage: req.subscription.usage,
      isRestricted: req.subscription.isRestricted,
    });
  } catch (error) {
    console.error('[Subscriptions] Features error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch feature flags',
    });
  }
});

/**
 * POST /api/subscriptions/upgrade
 * Initiate plan upgrade
 */
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { plan_code, billing_cycle = 'MONTHLY' } = req.body;
    const clientId = req.user.clientId || req.user.client_id || req.user.tenant_id || req.user.tenantId;
    const userId = req.user.id;

    if (!plan_code) {
      return res.status(400).json({
        ok: false,
        error: 'Plan code is required',
      });
    }

    const prisma = getPrisma();
    
    // Get current subscription
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: clientId },
      include: { plan: true },
    });

    if (!subscription) {
      return res.status(400).json({
        ok: false,
        error: 'No active subscription to upgrade',
      });
    }

    // Upgrade
    const result = await subscriptionService.upgradePlan(
      subscription.id,
      plan_code,
      {
        actorType: 'user',
        actorId: userId,
        reason: `User upgraded to ${plan_code}`,
        billing_cycle,
      }
    );

    res.json({
      ok: true,
      message: `Successfully upgraded to ${result.plan.name}`,
      subscription: {
        id: result.id,
        plan: result.plan.plan_code,
        state: result.state,
      },
    });
  } catch (error) {
    console.error('[Subscriptions] Upgrade error:', error);
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to upgrade subscription',
    });
  }
});

/**
 * POST /api/subscriptions/downgrade
 * Schedule plan downgrade
 */
router.post('/downgrade', authenticate, async (req, res) => {
  try {
    const { plan_code } = req.body;
    const clientId = req.user.clientId || req.user.client_id || req.user.tenant_id || req.user.tenantId;
    const userId = req.user.id;

    if (!plan_code) {
      return res.status(400).json({
        ok: false,
        error: 'Plan code is required',
      });
    }

    const prisma = getPrisma();
    
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: clientId },
    });

    if (!subscription) {
      return res.status(400).json({
        ok: false,
        error: 'No active subscription to downgrade',
      });
    }

    const result = await subscriptionService.scheduleDowgrade(
      subscription.id,
      plan_code,
      {
        actorType: 'user',
        actorId: userId,
        reason: `User requested downgrade to ${plan_code}`,
      }
    );

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: 'Cannot downgrade due to usage limits',
        violations: result.violations,
        message: result.message,
      });
    }

    res.json({
      ok: true,
      message: `Downgrade to ${plan_code} scheduled`,
      scheduled_date: result.scheduledDate,
      new_plan: result.newPlan,
    });
  } catch (error) {
    console.error('[Subscriptions] Downgrade error:', error);
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to schedule downgrade',
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const clientId = req.user.clientId || req.user.client_id || req.user.tenant_id || req.user.tenantId;
    const userId = req.user.id;

    const prisma = getPrisma();
    
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: clientId },
    });

    if (!subscription) {
      return res.status(400).json({
        ok: false,
        error: 'No active subscription to cancel',
      });
    }

    const result = await subscriptionService.cancelSubscription(
      subscription.id,
      {
        reason: reason || 'User requested cancellation',
        actorType: 'user',
        actorId: userId,
      }
    );

    res.json({
      ok: true,
      message: 'Subscription cancelled',
      cancelled_at: result.cancelled_at,
      data_retention_days: 90,
    });
  } catch (error) {
    console.error('[Subscriptions] Cancel error:', error);
    res.status(400).json({
      ok: false,
      error: error.message || 'Failed to cancel subscription',
    });
  }
});

/**
 * GET /api/subscriptions/invoices
 * Get billing history
 */
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const clientId = req.user.clientId || req.user.client_id || req.user.tenant_id || req.user.tenantId;
    const { page = 1, limit = 10 } = req.query;

    const prisma = getPrisma();

    const [invoices, total] = await Promise.all([
      prisma.subscriptionInvoice.findMany({
        where: { client_id: clientId },
        orderBy: { invoice_date: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.subscriptionInvoice.count({
        where: { client_id: clientId },
      }),
    ]);

    res.json({
      ok: true,
      invoices: invoices.map(inv => ({
        ...inv,
        subtotal: parseFloat(inv.subtotal),
        discount: parseFloat(inv.discount),
        tax: parseFloat(inv.tax),
        total: parseFloat(inv.total),
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[Subscriptions] Invoices error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch invoices',
    });
  }
});

/**
 * GET /api/subscriptions/usage
 * Get current usage metrics
 */
router.get('/usage', authenticate, async (req, res) => {
  try {
    const clientId = req.user.clientId || req.user.client_id || req.user.tenant_id || req.user.tenantId;
    const prisma = getPrisma();

    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: clientId },
      include: { plan: true },
    });

    if (!subscription) {
      return res.json({
        ok: true,
        has_subscription: false,
      });
    }

    // Get actual user count
    const userCount = await prisma.users_enhanced.count({
      where: { clientId: clientId },
    });

    res.json({
      ok: true,
      usage: {
        users: {
          current: userCount,
          limit: subscription.plan.max_users,
          percentage: subscription.plan.max_users === -1 
            ? 0 
            : Math.round((userCount / subscription.plan.max_users) * 100),
        },
        storage: {
          current_bytes: subscription.current_storage_used,
          current_formatted: formatBytes(subscription.current_storage_used),
          limit_gb: subscription.plan.max_storage_gb,
          percentage: subscription.plan.max_storage_gb === -1
            ? 0
            : Math.round((subscription.current_storage_used / (subscription.plan.max_storage_gb * 1024 * 1024 * 1024)) * 100),
        },
        api_calls: {
          today: subscription.current_api_calls,
          limit: subscription.plan.max_api_calls_day,
        },
      },
    });
  } catch (error) {
    console.error('[Subscriptions] Usage error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch usage metrics',
    });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// MODULE ACCESS ROUTES (Free vs Paid Enforcement)
// ============================================================================

/**
 * GET /api/subscriptions/module-access
 * Get all module access permissions for the authenticated tenant's plan.
 * Used by frontend to filter sidebar and show upgrade prompts.
 */
router.get('/module-access', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.user?.tenant_id || req.user?.client_id;

    if (!tenantId) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required',
      });
    }

    // Always accessible modules
    const ALWAYS_ACCESSIBLE = ['dashboard', 'common', 'chat', 'support', 'help'];

    // Get tenant's plan
    let planId = 1; // Default to FREE
    let planCode = 'FREE';
    let planName = 'Free';

    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
      include: { plan: true },
    });

    if (subscription?.plan) {
      planId = subscription.plan.id;
      planCode = subscription.plan.plan_code;
      planName = subscription.plan.name;
    } else {
      // Fallback: check clients table
      const client = await prisma.clients.findUnique({
        where: { id: tenantId },
        select: { subscriptionPlan: true },
      });

      if (client?.subscriptionPlan) {
        const planMap = {
          'free': { id: 1, code: 'FREE', name: 'Free' },
          'basic': { id: 2, code: 'BASIC', name: 'Basic' },
          'standard': { id: 3, code: 'STANDARD', name: 'Standard' },
          'premium': { id: 4, code: 'PREMIUM', name: 'Premium' },
          'enterprise': { id: 5, code: 'ENTERPRISE', name: 'Enterprise' },
        };
        const legacyPlan = planMap[client.subscriptionPlan.toLowerCase()] || planMap['free'];
        planId = legacyPlan.id;
        planCode = legacyPlan.code;
        planName = legacyPlan.name;
      }
    }

    // Get all module access records for this plan
    const moduleAccessRecords = await prisma.plan_module_access.findMany({
      where: { plan_id: planId },
    });

    // Build modules object
    const modules = {};

    // Add always-accessible modules
    for (const moduleId of ALWAYS_ACCESSIBLE) {
      modules[moduleId] = {
        accessLevel: 'full',
        pageLimit: -1,
        features: {},
      };
    }

    // Add plan-specific modules
    for (const record of moduleAccessRecords) {
      modules[record.module_id] = {
        accessLevel: record.access_level,
        pageLimit: record.page_limit,
        features: record.features_json || {},
      };
    }

    res.json({
      ok: true,
      planId,
      planCode,
      planName,
      modules,
      alwaysAccessible: ALWAYS_ACCESSIBLE,
    });
  } catch (error) {
    console.error('[Subscriptions] Module access error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch module access',
    });
  }
});

/**
 * GET /api/subscriptions/check-module/:moduleId
 * Check if tenant has access to a specific module
 */
router.get('/check-module/:moduleId', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.user?.tenant_id || req.user?.client_id;
    const { moduleId } = req.params;

    if (!tenantId) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required',
      });
    }

    // Always accessible modules
    const ALWAYS_ACCESSIBLE = ['dashboard', 'common', 'chat', 'support', 'help'];

    if (ALWAYS_ACCESSIBLE.includes(moduleId.toLowerCase())) {
      return res.json({
        ok: true,
        hasAccess: true,
        accessLevel: 'full',
        moduleId,
        message: 'Core module - always accessible',
      });
    }

    // Get tenant's plan
    let planId = 1;
    let planName = 'Free';

    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
      include: { plan: true },
    });

    if (subscription?.plan) {
      planId = subscription.plan.id;
      planName = subscription.plan.name;
    }

    // Check module access
    const moduleAccess = await prisma.plan_module_access.findUnique({
      where: {
        unique_plan_module: {
          plan_id: planId,
          module_id: moduleId,
        },
      },
    });

    if (!moduleAccess || moduleAccess.access_level === 'none') {
      return res.json({
        ok: true,
        hasAccess: false,
        accessLevel: 'none',
        moduleId,
        planName,
        upgradeRequired: true,
        message: `Module '${moduleId}' is not available in your ${planName} plan. Upgrade to access this feature.`,
      });
    }

    res.json({
      ok: true,
      hasAccess: true,
      accessLevel: moduleAccess.access_level,
      moduleId,
      planName,
      pageLimit: moduleAccess.page_limit,
      features: moduleAccess.features_json || {},
    });
  } catch (error) {
    console.error('[Subscriptions] Check module error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check module access',
    });
  }
});

module.exports = router;
