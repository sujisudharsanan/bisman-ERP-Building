/**
 * BISMAN ERP - Comprehensive Subscription Control Routes ("God Mode" API)
 * 
 * This is the MASTER control panel API for:
 * - Subscription plan management
 * - Feature availability and limits
 * - Approval thresholds
 * - Infrastructure billing rates
 * - Enforcement configuration
 * 
 * @module routes/subscriptionControlRoutes
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

// ============================================================================
// MIDDLEWARE: SuperAdmin Only
// ============================================================================

const superAdminOnly = [
  authenticate,
  requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN']),
];

// ============================================================================
// HELPER: Audit logging
// ============================================================================

async function logPlanChange(prisma, data, req) {
  try {
    await prisma.$executeRaw`
      INSERT INTO plan_change_audit_log 
      (target_type, target_id, target_name, action, old_values, new_values, change_summary, changed_by, changed_by_email, ip_address, reason)
      VALUES 
      (${data.target_type}, ${data.target_id}, ${data.target_name}, ${data.action}, 
       ${JSON.stringify(data.old_values)}::jsonb, ${JSON.stringify(data.new_values)}::jsonb, 
       ${data.change_summary}, ${req.user?.id || 0}, ${req.user?.email || ''}, 
       ${req.ip}::inet, ${data.reason || ''})
    `;
  } catch (error) {
    console.error('[SubscriptionControl] Audit log error:', error);
  }
}

// ============================================================================
// DASHBOARD METRICS
// ============================================================================

/**
 * GET /api/subscription-control/metrics
 * Get dashboard metrics for subscription control
 */
router.get('/metrics', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    // Get plan statistics from the unified subscription_plans + client_subscriptions system
    const planStats = await prisma.$queryRaw`
      SELECT 
        sp.plan_code as plan_code,
        sp.name as plan_name,
        CASE WHEN sp.is_active THEN 'active' ELSE 'inactive' END as status,
        COUNT(cs.id) as tenant_count
      FROM subscription_plans sp
      LEFT JOIN client_subscriptions cs ON cs.plan_id = sp.id AND cs.state IN ('ACTIVE', 'TRIAL')
      GROUP BY sp.id, sp.plan_code, sp.name, sp.is_active
      ORDER BY sp.sort_order
    `;

    // Get feature usage summary (keep original query if table exists)
    let usageStats = [];
    try {
      usageStats = await prisma.$queryRaw`
        SELECT 
          feature_code,
          SUM(used_count) as total_usage,
          COUNT(DISTINCT tenant_id) as tenants_using
        FROM feature_usage_counters
        WHERE period_end > NOW()
        GROUP BY feature_code
        ORDER BY total_usage DESC
        LIMIT 10
      `;
    } catch {
      // Table may not exist
    }

    // Get recent enforcement blocks (keep original query if table exists)
    let recentBlocks = [];
    try {
      recentBlocks = await prisma.$queryRaw`
        SELECT 
          feature_code,
          decision,
          COUNT(*) as block_count
        FROM enforcement_decision_log
        WHERE decided_at > NOW() - INTERVAL '7 days'
          AND decision IN ('blocked', 'throttled')
        GROUP BY feature_code, decision
        ORDER BY block_count DESC
        LIMIT 10
      `;
    } catch {
      // Table may not exist
    }

    // Get billing summary (keep original query if table exists)
    let billingSummary = [];
    try {
      billingSummary = await prisma.$queryRaw`
        SELECT 
          source_type,
          SUM(amount) as total_amount,
          COUNT(*) as line_count
        FROM subscription_billing_ledger
        WHERE billing_period_start >= DATE_TRUNC('month', NOW())
        GROUP BY source_type
      `;
    } catch {
      // Table may not exist
    }

    res.json({
      ok: true,
      metrics: {
        planStats,
        usageStats,
        recentBlocks,
        billingSummary,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[SubscriptionControl] Metrics error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch metrics' });
  }
});

// ============================================================================
// SUBSCRIPTION PLANS CRUD
// ============================================================================

/**
 * GET /api/subscription-control/plans
 * List all subscription plans with tenant counts from the unified system
 */
router.get('/plans', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { include_archived = 'false' } = req.query;

    // Query from subscription_plans (the Prisma-based system) with client_subscriptions counts
    const whereClause = include_archived === 'true' ? {} : { is_active: true };
    
    const plans = await prisma.subscription_plans.findMany({
      where: whereClause,
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });

    // Get tenant counts from client_subscriptions
    let tenantCounts = [];
    try {
      tenantCounts = await prisma.client_subscriptions.groupBy({
        by: ['plan_id'],
        where: { state: { in: ['ACTIVE', 'TRIAL'] } },
        _count: { id: true },
      });
    } catch (e) {
      console.warn('[SubscriptionControl] tenant counts fallback:', e.message);
      tenantCounts = [];
    }

    const tenantCountMap = new Map(tenantCounts.map(tc => [tc.plan_id, tc._count.id]));

    // Map plans with counts and additional info
    const mappedPlans = plans.map(p => ({
      id: p.id,
      code: p.plan_code,
      name: p.name,
      description: p.description,
      short_description: p.short_description,
      badge_text: p.badge_text,
      price_monthly: parseFloat(p.price_monthly) || 0,
      price_yearly: parseFloat(p.price_yearly) || 0,
      currency: p.currency || 'INR',
      max_users: p.max_users || 5,
      max_branches: p.max_branches || 1,
      max_storage_gb: p.max_storage_gb || 5,
      max_api_calls_day: p.max_api_calls_day || 1000,
      feature_flags: p.feature_flags || {},
      sort_order: p.sort_order || 0,
      is_popular: p.is_popular || false,
      is_enterprise: p.is_enterprise || false,
      is_custom: p.plan_code === 'CUSTOM',
      is_active: p.is_active,
      is_public: p.is_public,
      status: p.is_active ? 'active' : 'inactive',
      cta_text: p.cta_text,
      cta_action: p.cta_action,
      trial_enabled: (p.trial_days || 0) > 0,
      trial_days: p.trial_days || 0,
      created_at: p.created_at,
      updated_at: p.updated_at,
      active_tenant_count: tenantCountMap.get(p.id) || 0,
      // For backward compatibility with legacy UI
      total_features: Object.keys(p.feature_flags || {}).length,
      total_categories: 0,
      unlimited_count: 0,
      soft_locked_count: 0,
      hard_locked_count: 0,
      total_unlock_value: 0,
      color_code: '#3B82F6', // Default blue
    }));

    res.json({
      ok: true,
      plans: mappedPlans
    });
  } catch (error) {
    console.error('[SubscriptionControl] List plans error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch plans' });
  }
});

/**
 * GET /api/subscription-control/plans/:id
 * Get single plan with all features from plan_feature_controls + master_feature_definitions
 */
router.get('/plans/:id', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);

    // Get plan from the unified subscription_plans table
    const plan = await prisma.subscription_plans.findUnique({
      where: { id: planId }
    });
    
    if (!plan) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    // Get tenant count from client_subscriptions
    const tenantCount = await prisma.client_subscriptions.count({
      where: { plan_id: planId, state: { in: ['ACTIVE', 'TRIAL'] } }
    });

    // Get features from plan_feature_controls joined with master_feature_definitions
    const featuresRaw = await prisma.$queryRaw`
      SELECT 
        mfd.feature_code,
        mfd.feature_name,
        mfd.description,
        mfd.category,
        mfd.icon,
        mfd.sort_order as feature_sort_order,
        COALESCE(pfc.free_limit, 0) as free_limit,
        COALESCE(pfc.limit_period, 'monthly') as limit_period,
        COALESCE(pfc.unlock_price, 0) as unlock_price,
        COALESCE(pfc.unlock_unit, 'per month') as unlock_unit,
        COALESCE(pfc.currency, 'INR') as currency,
        COALESCE(pfc.approval_threshold, 0) as approval_threshold,
        COALESCE(pfc.requires_approval, false) as requires_approval,
        COALESCE(pfc.lock_mode, 'none') as lock_mode,
        COALESCE(pfc.is_visible, true) as is_visible,
        COALESCE(pfc.show_in_pricing, true) as show_in_pricing
      FROM master_feature_definitions mfd
      LEFT JOIN plan_feature_controls pfc ON pfc.feature_code = mfd.feature_code AND pfc.plan_id = ${planId}
      WHERE mfd.is_active = true
      ORDER BY mfd.category, mfd.sort_order, mfd.feature_name
    `;

    // Parse numeric fields to ensure they are numbers, not strings
    const features = featuresRaw.map(f => ({
      ...f,
      free_limit: parseInt(f.free_limit) || 0,
      unlock_price: parseFloat(f.unlock_price) || 0,
      approval_threshold: parseFloat(f.approval_threshold) || 0,
      feature_sort_order: parseInt(f.feature_sort_order) || 0,
    }));

    res.json({
      ok: true,
      plan: {
        id: plan.id,
        code: plan.plan_code,
        name: plan.name,
        description: plan.description,
        short_description: plan.short_description,
        badge_text: plan.badge_text,
        price_monthly: parseFloat(plan.price_monthly) || 0,
        price_yearly: parseFloat(plan.price_yearly) || 0,
        currency: plan.currency || 'INR',
        max_users: plan.max_users || 5,
        max_branches: plan.max_branches || 1,
        max_storage_gb: plan.max_storage_gb || 5,
        max_api_calls_day: plan.max_api_calls_day || 1000,
        feature_flags: plan.feature_flags || {},
        sort_order: plan.sort_order || 0,
        is_popular: plan.is_popular || false,
        is_enterprise: plan.is_enterprise || false,
        is_active: plan.is_active,
        is_public: plan.is_public,
        status: plan.is_active ? 'active' : 'inactive',
        cta_text: plan.cta_text,
        cta_action: plan.cta_action,
        trial_days: plan.trial_days || 14,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        active_tenant_count: tenantCount,
        color_code: '#3B82F6',
      },
      features
    });
  } catch (error) {
    console.error('[SubscriptionControl] Get plan error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch plan' });
  }
});

/**
 * POST /api/subscription-control/plans
 * Create a new subscription plan (using subscription_plans table)
 */
router.post('/plans', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const {
      code,
      name,
      description,
      short_description,
      badge_text,
      sort_order = 0,
      is_popular = false,
      price_monthly = 0,
      price_yearly = 0,
      max_users = 5,
      max_branches = 1,
      max_storage_gb = 5,
      trial_days = 14,
      is_enterprise = false
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ ok: false, error: 'code and name are required' });
    }

    // Check if code already exists
    const existing = await prisma.subscription_plans.findUnique({
      where: { plan_code: code.toUpperCase() }
    });
    
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Plan code already exists' });
    }

    // Create plan in subscription_plans table
    const newPlan = await prisma.subscription_plans.create({
      data: {
        plan_code: code.toUpperCase(),
        name,
        description: description || null,
        short_description: short_description || null,
        badge_text: badge_text || null,
        sort_order,
        is_popular,
        price_monthly: parseFloat(price_monthly) || 0,
        price_yearly: parseFloat(price_yearly) || 0,
        max_users: parseInt(max_users) || 5,
        max_branches: parseInt(max_branches) || 1,
        max_storage_gb: parseInt(max_storage_gb) || 5,
        trial_days: parseInt(trial_days) || 14,
        is_enterprise,
        is_active: true,
        is_public: true,
        created_by: req.user?.id || null
      }
    });

    // Log the change
    await logPlanChange(prisma, {
      target_type: 'plan',
      target_id: newPlan.id.toString(),
      target_name: name,
      action: 'created',
      old_values: null,
      new_values: newPlan,
      change_summary: `Created new plan: ${name}`
    }, req);

    res.status(201).json({
      ok: true,
      plan: {
        ...newPlan,
        code: newPlan.plan_code, // alias for compatibility
        color_code: '#3B82F6'
      },
      message: `Plan "${name}" created successfully`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Create plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to create plan' });
  }
});

/**
 * PUT /api/subscription-control/plans/:id
 * Update a subscription plan (using subscription_plans table)
 */
router.put('/plans/:id', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);
    const {
      name,
      description,
      short_description,
      badge_text,
      sort_order,
      is_popular,
      price_monthly,
      price_yearly,
      max_users,
      max_branches,
      max_storage_gb,
      trial_days,
      is_enterprise,
      is_active,
      is_public
    } = req.body;

    // Get current plan for audit
    const oldPlan = await prisma.subscription_plans.findUnique({
      where: { id: planId }
    });
    
    if (!oldPlan) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    // Build update data
    const updateData = { updated_by: req.user?.id || null };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (short_description !== undefined) updateData.short_description = short_description;
    if (badge_text !== undefined) updateData.badge_text = badge_text;
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order);
    if (is_popular !== undefined) updateData.is_popular = is_popular;
    if (price_monthly !== undefined) updateData.price_monthly = parseFloat(price_monthly);
    if (price_yearly !== undefined) updateData.price_yearly = parseFloat(price_yearly);
    if (max_users !== undefined) updateData.max_users = parseInt(max_users);
    if (max_branches !== undefined) updateData.max_branches = parseInt(max_branches);
    if (max_storage_gb !== undefined) updateData.max_storage_gb = parseInt(max_storage_gb);
    if (trial_days !== undefined) updateData.trial_days = parseInt(trial_days);
    if (is_enterprise !== undefined) updateData.is_enterprise = is_enterprise;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_public !== undefined) updateData.is_public = is_public;

    // Update plan
    const updatedPlan = await prisma.subscription_plans.update({
      where: { id: planId },
      data: updateData
    });

    // Log the change
    await logPlanChange(prisma, {
      target_type: 'plan',
      target_id: planId.toString(),
      target_name: updatedPlan.name,
      action: 'updated',
      old_values: oldPlan,
      new_values: updatedPlan,
      change_summary: `Updated plan: ${updatedPlan.name}`
    }, req);

    res.json({
      ok: true,
      plan: {
        ...updatedPlan,
        code: updatedPlan.plan_code, // alias for compatibility
        color_code: '#3B82F6'
      },
      message: `Plan "${updatedPlan.name}" updated successfully`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Update plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to update plan' });
  }
});

/**
 * POST /api/subscription-control/plans/:id/clone
 * Clone a subscription plan (using subscription_plans table)
 */
router.post('/plans/:id/clone', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);
    const { new_code, new_name } = req.body;

    if (!new_code || !new_name) {
      return res.status(400).json({ ok: false, error: 'new_code and new_name are required' });
    }

    // Get source plan
    const sourcePlan = await prisma.subscription_plans.findUnique({
      where: { id: planId }
    });
    
    if (!sourcePlan) {
      return res.status(404).json({ ok: false, error: 'Source plan not found' });
    }

    // Check if new code exists
    const existing = await prisma.subscription_plans.findUnique({
      where: { plan_code: new_code.toUpperCase() }
    });
    
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Plan code already exists' });
    }

    // Clone plan
    const newPlan = await prisma.subscription_plans.create({
      data: {
        plan_code: new_code.toUpperCase(),
        name: new_name,
        description: sourcePlan.description,
        short_description: sourcePlan.short_description,
        badge_text: sourcePlan.badge_text,
        price_monthly: sourcePlan.price_monthly,
        price_yearly: sourcePlan.price_yearly,
        currency: sourcePlan.currency,
        max_users: sourcePlan.max_users,
        max_storage_gb: sourcePlan.max_storage_gb,
        max_branches: sourcePlan.max_branches,
        max_api_calls_day: sourcePlan.max_api_calls_day,
        feature_flags: sourcePlan.feature_flags,
        sort_order: sourcePlan.sort_order + 1,
        is_popular: false,
        is_enterprise: sourcePlan.is_enterprise,
        is_active: true,
        is_public: sourcePlan.is_public,
        cta_text: sourcePlan.cta_text,
        cta_action: sourcePlan.cta_action,
        trial_days: sourcePlan.trial_days,
        created_by: req.user?.id || null
      }
    });

    // Log
    await logPlanChange(prisma, {
      target_type: 'plan',
      target_id: newPlan.id.toString(),
      target_name: new_name,
      action: 'cloned',
      old_values: { source_plan_id: planId, source_plan_code: sourcePlan.plan_code },
      new_values: newPlan,
      change_summary: `Cloned plan "${sourcePlan.name}" to "${new_name}"`
    }, req);

    res.status(201).json({
      ok: true,
      plan: {
        ...newPlan,
        code: newPlan.plan_code, // alias for compatibility
        color_code: '#3B82F6'
      },
      message: `Plan cloned as "${new_name}"`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Clone plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to clone plan' });
  }
});

/**
 * PATCH /api/subscription-control/plans/:id/status
 * Toggle plan status (active/inactive) using subscription_plans table
 */
router.patch('/plans/:id/status', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status. Use: active, inactive, archived' });
    }

    const oldPlan = await prisma.subscription_plans.findUnique({
      where: { id: planId }
    });
    
    if (!oldPlan) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    // For subscription_plans, we use is_active and is_public flags
    const is_active = status === 'active';
    const is_public = status !== 'archived';

    const updatedPlan = await prisma.subscription_plans.update({
      where: { id: planId },
      data: {
        is_active,
        is_public,
        updated_by: req.user?.id || null
      }
    });

    await logPlanChange(prisma, {
      target_type: 'plan',
      target_id: planId.toString(),
      target_name: updatedPlan.name,
      action: status === 'archived' ? 'archived' : 'status_changed',
      old_values: { is_active: oldPlan.is_active, is_public: oldPlan.is_public },
      new_values: { is_active, is_public, status },
      change_summary: `Changed plan status to ${status}`
    }, req);

    res.json({
      ok: true,
      plan: {
        ...updatedPlan,
        code: updatedPlan.plan_code,
        status,
        color_code: '#3B82F6'
      },
      message: `Plan status changed to ${status}`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Status change error:', error);
    res.status(500).json({ ok: false, error: 'Failed to change plan status' });
  }
});

/**
 * GET /api/subscription-control/plans/:planId/tenants
 * List all tenants subscribed to a specific plan
 */
router.get('/plans/:planId/tenants', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.planId, 10);

    if (isNaN(planId)) {
      return res.status(400).json({ ok: false, error: 'Invalid plan ID' });
    }

    // Get all client_subscriptions for this plan, joined with clients table
    // Note: clients table doesn't have email column, we extract from contact_persons JSONB
    const tenants = await prisma.$queryRaw`
      SELECT 
        cs.id,
        cs.client_id,
        cs.plan_id,
        cs.state,
        cs.started_at as start_date,
        cs.expires_at as end_date,
        cs.billing_cycle,
        cs.created_at,
        cs.trial_start_date,
        cs.trial_end_date,
        cs.trial_converted,
        cs.current_period_start,
        cs.current_period_end,
        c.name as client_name,
        COALESCE(c.contact_persons->0->>'email', '') as client_email,
        -- Calculate days remaining
        CASE 
          WHEN cs.trial_end_date IS NOT NULL AND cs.trial_converted = false 
          THEN GREATEST(0, EXTRACT(DAY FROM cs.trial_end_date - NOW()))
          ELSE NULL
        END as trial_days_remaining,
        CASE 
          WHEN cs.expires_at IS NOT NULL 
          THEN GREATEST(0, EXTRACT(DAY FROM cs.expires_at - NOW()))
          ELSE NULL
        END as days_until_expiry,
        -- Determine actual status
        CASE
          WHEN cs.trial_converted = false AND cs.trial_end_date IS NOT NULL AND cs.trial_end_date > NOW() THEN 'TRIAL'
          WHEN cs.trial_converted = false AND cs.trial_end_date IS NOT NULL AND cs.trial_end_date <= NOW() THEN 'TRIAL_EXPIRED'
          WHEN cs.state = 'ACTIVE' AND cs.expires_at IS NOT NULL AND cs.expires_at <= NOW() THEN 'EXPIRED'
          ELSE cs.state
        END as actual_status
      FROM client_subscriptions cs
      LEFT JOIN clients c ON c.id = cs.client_id
      WHERE cs.plan_id = ${planId}
      ORDER BY cs.created_at DESC
    `;

    console.log('[SubscriptionControl] Tenants query result for plan', planId, ':', tenants?.length || 0, 'tenants');

    // Parse numeric fields
    const parsedTenants = (tenants || []).map(t => ({
      ...t,
      trial_days_remaining: t.trial_days_remaining ? parseInt(t.trial_days_remaining) : null,
      days_until_expiry: t.days_until_expiry ? parseInt(t.days_until_expiry) : null
    }));

    res.json({
      ok: true,
      tenants: parsedTenants
    });
  } catch (error) {
    console.error('[SubscriptionControl] Load plan tenants error:', error);
    res.status(500).json({ ok: false, error: 'Failed to load tenants', tenants: [] });
  }
});

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================

/**
 * GET /api/subscription-control/features
 * List all feature definitions
 */
router.get('/features', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();

    const features = await prisma.$queryRaw`
      SELECT * FROM master_feature_definitions
      WHERE is_active = TRUE
      ORDER BY category, sort_order, feature_name
    `;

    // Group by category
    const categories = {};
    features.forEach(f => {
      if (!categories[f.category]) {
        categories[f.category] = [];
      }
      categories[f.category].push(f);
    });

    res.json({
      ok: true,
      features,
      categories,
      categoryList: Object.keys(categories)
    });
  } catch (error) {
    console.error('[SubscriptionControl] List features error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch features' });
  }
});

/**
 * POST /api/subscription-control/features
 * Create a new feature definition
 */
router.post('/features', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { feature_code, feature_name, description, category, icon, sort_order = 0 } = req.body;

    if (!feature_code || !feature_name || !category) {
      return res.status(400).json({ ok: false, error: 'feature_code, feature_name, and category are required' });
    }

    await prisma.$executeRaw`
      INSERT INTO master_feature_definitions 
      (feature_code, feature_name, description, category, icon, sort_order)
      VALUES (${feature_code}, ${feature_name}, ${description || null}, ${category}, ${icon || null}, ${sort_order})
    `;

    const newFeature = await prisma.$queryRaw`
      SELECT * FROM master_feature_definitions WHERE feature_code = ${feature_code}
    `;

    await logPlanChange(prisma, {
      target_type: 'feature',
      target_id: feature_code,
      target_name: feature_name,
      action: 'created',
      old_values: null,
      new_values: newFeature[0],
      change_summary: `Created new feature: ${feature_name}`
    }, req);

    res.status(201).json({
      ok: true,
      feature: newFeature[0],
      message: `Feature "${feature_name}" created`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Create feature error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to create feature' });
  }
});

// ============================================================================
// PLAN FEATURE CONTROLS (The Control Grid)
// ============================================================================

/**
 * PUT /api/subscription-control/plans/:planId/features
 * Update feature controls for a plan (bulk update)
 */
router.put('/plans/:planId/features', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.planId);
    const { features } = req.body;

    if (!Array.isArray(features)) {
      return res.status(400).json({ ok: false, error: 'features array is required' });
    }

    // Validate the plan exists (using subscription_plans table)
    const plan = await prisma.subscription_plans.findUnique({
      where: { id: planId }
    });
    
    if (!plan) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    // Get old values for audit
    const oldFeatures = await prisma.$queryRaw`
      SELECT * FROM plan_feature_controls WHERE plan_id = ${planId}
    `;

    // Validation engine
    const validationErrors = [];
    
    for (const feature of features) {
      const { feature_code, free_limit, approval_threshold, lock_mode } = feature;
      
      // Rule: Hard lock + unlock price is auto-fixed now, no need to reject
      
      // Rule: Zero creation + non-zero approval makes no sense
      if (free_limit === 0 && approval_threshold && approval_threshold > 0 && lock_mode !== 'hard') {
        validationErrors.push(`${feature_code}: Zero limit with approval threshold requires hard lock`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed',
        validationErrors
      });
    }

    // Update features
    let updated = 0;
    let created = 0;

    for (const feature of features) {
      const {
        feature_code,
        limit_period = 'monthly',
        unlock_unit = 'per month',
        currency = 'INR',
        requires_approval = false,
        lock_mode = 'none',
        is_visible = true,
        show_in_pricing = true
      } = feature;
      
      // Parse numeric values to ensure they are numbers, not strings
      const free_limit = parseInt(feature.free_limit) || 0;
      const approval_threshold = parseFloat(feature.approval_threshold) || 0;
      // Auto-fix: If hard locked, force unlock_price to 0
      const unlock_price = lock_mode === 'hard' ? 0 : (parseFloat(feature.unlock_price) || 0);

      // Upsert
      const existing = await prisma.$queryRaw`
        SELECT id FROM plan_feature_controls 
        WHERE plan_id = ${planId} AND feature_code = ${feature_code}
      `;

      if (existing.length > 0) {
        await prisma.$executeRaw`
          UPDATE plan_feature_controls SET
            free_limit = ${free_limit},
            limit_period = ${limit_period}::limit_period_type,
            unlock_price = ${unlock_price}::numeric,
            unlock_unit = ${unlock_unit},
            currency = ${currency},
            approval_threshold = ${approval_threshold}::numeric,
            requires_approval = ${requires_approval},
            lock_mode = ${lock_mode}::lock_mode_type,
            is_visible = ${is_visible},
            show_in_pricing = ${show_in_pricing}
          WHERE plan_id = ${planId} AND feature_code = ${feature_code}
        `;
        updated++;
      } else {
        await prisma.$executeRaw`
          INSERT INTO plan_feature_controls 
          (plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit, currency,
           approval_threshold, requires_approval, lock_mode, is_visible, show_in_pricing)
          VALUES 
          (${planId}, ${feature_code}, ${free_limit}, ${limit_period}::limit_period_type, 
           ${unlock_price}::numeric, ${unlock_unit}, ${currency}, ${approval_threshold}::numeric, 
           ${requires_approval}, ${lock_mode}::lock_mode_type, ${is_visible}, ${show_in_pricing})
        `;
        created++;
      }
    }

    // Get new values for audit
    const newFeatures = await prisma.$queryRaw`
      SELECT * FROM plan_feature_controls WHERE plan_id = ${planId}
    `;

    await logPlanChange(prisma, {
      target_type: 'plan_features',
      target_id: planId.toString(),
      target_name: plan.name,
      action: 'updated',
      old_values: oldFeatures,
      new_values: newFeatures,
      change_summary: `Updated ${updated} features, created ${created} new controls`
    }, req);

    res.json({
      ok: true,
      updated,
      created,
      message: `Feature controls updated: ${updated} modified, ${created} created`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Update features error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to update features' });
  }
});

// ============================================================================
// INFRASTRUCTURE BILLING RATES
// ============================================================================

/**
 * GET /api/subscription-control/infra-rates
 * Get infrastructure billing rates
 */
router.get('/infra-rates', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();

    const rates = await prisma.$queryRaw`
      SELECT * FROM infrastructure_billing_rates
      WHERE is_active = TRUE
      ORDER BY resource_type
    `;

    res.json({
      ok: true,
      rates: rates.map(r => ({
        ...r,
        price_per_unit: parseFloat(r.price_per_unit),
        minimum_charge: r.minimum_charge ? parseFloat(r.minimum_charge) : 0
      }))
    });
  } catch (error) {
    console.error('[SubscriptionControl] Get infra rates error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch rates' });
  }
});

/**
 * PUT /api/subscription-control/infra-rates/:resourceType
 * Update an infrastructure billing rate
 */
router.put('/infra-rates/:resourceType', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const resourceType = req.params.resourceType;
    const { price_per_unit, unit_type, minimum_charge, billing_method } = req.body;

    const oldRate = await prisma.$queryRaw`
      SELECT * FROM infrastructure_billing_rates WHERE resource_type = ${resourceType}
    `;

    if (oldRate.length === 0) {
      return res.status(404).json({ ok: false, error: 'Resource type not found' });
    }

    await prisma.$executeRaw`
      UPDATE infrastructure_billing_rates SET
        price_per_unit = COALESCE(${price_per_unit}, price_per_unit),
        unit_type = COALESCE(${unit_type}, unit_type),
        minimum_charge = COALESCE(${minimum_charge}, minimum_charge),
        billing_method = COALESCE(${billing_method}, billing_method),
        updated_by = ${req.user?.id || null}
      WHERE resource_type = ${resourceType}
    `;

    const newRate = await prisma.$queryRaw`
      SELECT * FROM infrastructure_billing_rates WHERE resource_type = ${resourceType}
    `;

    await logPlanChange(prisma, {
      target_type: 'infra_rate',
      target_id: resourceType,
      target_name: newRate[0].resource_name,
      action: 'updated',
      old_values: oldRate[0],
      new_values: newRate[0],
      change_summary: `Updated infra rate for ${resourceType}`
    }, req);

    res.json({
      ok: true,
      rate: newRate[0],
      message: `Rate for ${resourceType} updated`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Update infra rate error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update rate' });
  }
});

// ============================================================================
// TENANT PLAN ASSIGNMENTS
// ============================================================================

/**
 * GET /api/subscription-control/tenants
 * List all tenants with their plans (using client_subscriptions table)
 */
router.get('/tenants', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { page = 1, limit = 20, plan_id, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use raw query for proper join since Prisma doesn't have relation defined
    // Note: clients table doesn't have email column, extract from contact_persons JSONB
    let baseQuery = `
      SELECT 
        c.id as tenant_id,
        c.name as tenant_name,
        c.client_code,
        COALESCE(c.contact_persons->0->>'email', '') as email,
        cs.id as assignment_id,
        cs.plan_id,
        sp.plan_code,
        sp.name as plan_name,
        cs.billing_cycle,
        cs.current_period_start as effective_from,
        cs.state as subscription_state
      FROM clients c
      LEFT JOIN client_subscriptions cs ON cs.client_id = c.id AND cs.state IN ('ACTIVE', 'TRIAL', 'PENDING')
      LEFT JOIN subscription_plans sp ON sp.id = cs.plan_id
      WHERE 1=1
    `;

    if (search) {
      baseQuery += ` AND (c.name ILIKE '%${search}%' OR c.client_code ILIKE '%${search}%')`;
    }
    if (plan_id) {
      baseQuery += ` AND cs.plan_id = ${parseInt(plan_id)}`;
    }

    baseQuery += ` ORDER BY c.name LIMIT ${parseInt(limit)} OFFSET ${offset}`;

    const tenants = await prisma.$queryRawUnsafe(baseQuery);

    // Transform to expected format
    const transformedTenants = tenants.map(t => ({
      tenant_id: t.tenant_id,
      tenant_name: t.tenant_name,
      client_code: t.client_code,
      email: t.email,
      assignment_id: t.assignment_id,
      plan_id: t.plan_id,
      plan_code: t.plan_code,
      plan_name: t.plan_name,
      billing_cycle: t.billing_cycle,
      effective_from: t.effective_from,
      assignment_active: t.subscription_state === 'ACTIVE' || t.subscription_state === 'TRIAL'
    }));

    const totalResult = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM clients`;
    const total = totalResult[0]?.count || 0;

    res.json({
      ok: true,
      tenants: transformedTenants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[SubscriptionControl] List tenants error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch tenants' });
  }
});

/**
 * POST /api/subscription-control/tenants/:tenantId/assign
 * Assign a plan to a tenant (using client_subscriptions table)
 */
router.post('/tenants/:tenantId/assign', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.params.tenantId;
    const { plan_id, billing_cycle = 'MONTHLY', reason } = req.body;

    if (!plan_id) {
      return res.status(400).json({ ok: false, error: 'plan_id is required' });
    }

    // Get old subscription if exists
    const oldSubscriptions = await prisma.$queryRaw`
      SELECT cs.*, sp.plan_code, sp.name as plan_name
      FROM client_subscriptions cs
      LEFT JOIN subscription_plans sp ON sp.id = cs.plan_id
      WHERE cs.client_id = ${tenantId} AND cs.state IN ('ACTIVE', 'TRIAL', 'PENDING')
    `;
    const oldSubscription = oldSubscriptions[0];

    // Deactivate old subscription
    if (oldSubscription) {
      await prisma.client_subscriptions.update({
        where: { id: oldSubscription.id },
        data: {
          state: 'CANCELLED',
          current_period_end: new Date()
        }
      });
    }

    // Get the plan
    const plan = await prisma.subscription_plans.findUnique({
      where: { id: parseInt(plan_id) }
    });

    if (!plan) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (billing_cycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create new subscription
    const newSubscription = await prisma.client_subscriptions.create({
      data: {
        client_id: tenantId,
        plan_id: parseInt(plan_id),
        state: 'ACTIVE',
        billing_cycle: billing_cycle,
        current_period_start: now,
        current_period_end: periodEnd
      }
    });

    await logPlanChange(prisma, {
      target_type: 'tenant_assignment',
      target_id: tenantId,
      target_name: `Tenant ${tenantId}`,
      action: oldSubscription ? 'plan_changed' : 'plan_assigned',
      old_values: oldSubscription ? { plan_id: oldSubscription.plan_id, plan_code: oldSubscription.plan_code } : null,
      new_values: { plan_id: newSubscription.plan_id, plan_code: plan.plan_code },
      change_summary: `Assigned plan ${plan.plan_code} to tenant`,
      reason
    }, req);

    res.json({
      ok: true,
      assignment: {
        id: newSubscription.id,
        plan_id: newSubscription.plan_id,
        plan_name: plan.name,
        plan_code: plan.plan_code,
        billing_cycle: newSubscription.billing_cycle,
        effective_from: newSubscription.current_period_start,
        is_active: newSubscription.state === 'ACTIVE'
      },
      message: `Plan assigned successfully`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Assign plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to assign plan' });
  }
});

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * GET /api/subscription-control/audit-log
 * Get plan change audit log
 */
router.get('/audit-log', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { page = 1, limit = 50, target_type, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    if (target_type) whereClause += ` AND target_type = '${target_type}'`;
    if (action) whereClause += ` AND action = '${action}'`;

    const logs = await prisma.$queryRawUnsafe(`
      SELECT * FROM plan_change_audit_log
      ${whereClause}
      ORDER BY changed_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);

    const total = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM plan_change_audit_log
    `;

    res.json({
      ok: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total[0]?.count || 0),
        pages: Math.ceil(parseInt(total[0]?.count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[SubscriptionControl] Audit log error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit log' });
  }
});

// ============================================================================
// LIVE CALCULATION / VALIDATION
// ============================================================================

/**
 * POST /api/subscription-control/validate-plan
 * Validate a plan configuration
 */
router.post('/validate-plan', ...superAdminOnly, async (req, res) => {
  try {
    const { plan, features } = req.body;
    const errors = [];
    const warnings = [];

    // Governance validation
    if (plan.monthly_spend_cap && plan.cfo_approval_threshold) {
      if (plan.cfo_approval_threshold > plan.monthly_spend_cap) {
        errors.push('CFO approval threshold cannot exceed monthly spend cap');
      }
    }

    // Feature validation
    if (features && Array.isArray(features)) {
      const featureCodes = features.map(f => f.feature_code);
      const duplicates = featureCodes.filter((code, i) => featureCodes.indexOf(code) !== i);
      
      if (duplicates.length > 0) {
        errors.push(`Duplicate feature codes: ${duplicates.join(', ')}`);
      }

      for (const feature of features) {
        // Hard lock with unlock price - will be auto-fixed on save
        if (feature.lock_mode === 'hard' && feature.unlock_price > 0) {
          warnings.push(`${feature.feature_code}: Hard locked features will have unlock price auto-cleared to ₹0`);
        }

        // Zero limit without lock
        if (feature.free_limit === 0 && feature.lock_mode === 'none') {
          warnings.push(`${feature.feature_code}: Zero limit without lock mode - consider using soft/hard lock`);
        }

        // Underpricing warning
        if (feature.unlock_price > 0 && feature.unlock_price < 25) {
          warnings.push(`${feature.feature_code}: Unlock price ₹${feature.unlock_price} may be too low`);
        }

        // Very high limits
        if (feature.free_limit > 10000 && feature.free_limit !== -1) {
          warnings.push(`${feature.feature_code}: Very high limit (${feature.free_limit}) - consider unlimited (-1)`);
        }
      }
    }

    // Calculate projections
    const projections = {
      maxUnlockRevenue: features?.reduce((sum, f) => sum + (f.unlock_price || 0), 0) || 0,
      hardLockedCount: features?.filter(f => f.lock_mode === 'hard').length || 0,
      softLockedCount: features?.filter(f => f.lock_mode === 'soft').length || 0,
      unlimitedCount: features?.filter(f => f.free_limit === -1).length || 0
    };

    res.json({
      ok: errors.length === 0,
      valid: errors.length === 0,
      errors,
      warnings,
      projections
    });
  } catch (error) {
    console.error('[SubscriptionControl] Validation error:', error);
    res.status(500).json({ ok: false, error: 'Validation failed' });
  }
});

// ============================================================================
// CUSTOM PLAN TENANT CONFIGURATIONS
// ============================================================================

/**
 * GET /api/subscription-control/custom/tenants
 * List all tenants with their custom plan configuration status
 */
router.get('/custom/tenants', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { search, status } = req.query;

    let whereClause = 'WHERE 1=1';
    if (search) {
      whereClause += ` AND (c.name ILIKE '%${search}%' OR c.client_code ILIKE '%${search}%')`;
    }

    const tenants = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id as tenant_id,
        c.name as tenant_name,
        c.client_code,
        c.email,
        c.created_at as tenant_created_at,
        ctpc.id as config_id,
        ctpc.status as config_status,
        ctpc.price_monthly,
        ctpc.price_yearly,
        ctpc.max_users,
        ctpc.max_branches,
        ctpc.max_storage_gb,
        ctpc.trial_enabled,
        ctpc.trial_days,
        ctpc.effective_from,
        ctpc.updated_at as config_updated_at
      FROM clients c
      LEFT JOIN custom_tenant_plan_configurations ctpc ON ctpc.tenant_id = c.id
      ${whereClause}
      ${status ? `AND ctpc.status = '${status}'` : ''}
      ORDER BY c.name
    `);

    res.json({
      ok: true,
      tenants: tenants || []
    });
  } catch (error) {
    console.error('[SubscriptionControl] Custom tenants list error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch tenants' });
  }
});

/**
 * GET /api/subscription-control/custom/tenants/:tenantId
 * Get custom plan configuration for a specific tenant
 */
router.get('/custom/tenants/:tenantId', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { tenantId } = req.params;

    // Get tenant info
    const tenants = await prisma.$queryRaw`
      SELECT id, name, client_code, email FROM clients WHERE id = ${tenantId}::uuid
    `;

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({ ok: false, error: 'Tenant not found' });
    }

    const tenant = tenants[0];

    // Get custom configuration if exists
    const configs = await prisma.$queryRaw`
      SELECT * FROM custom_tenant_plan_configurations WHERE tenant_id = ${tenantId}::uuid
    `;

    // Get feature controls if exists
    const features = await prisma.$queryRaw`
      SELECT 
        ctfc.*,
        mfd.feature_name,
        mfd.category,
        mfd.description as feature_description
      FROM custom_tenant_feature_controls ctfc
      JOIN master_feature_definitions mfd ON mfd.feature_code = ctfc.feature_code
      WHERE ctfc.tenant_id = ${tenantId}::uuid
      ORDER BY mfd.category, mfd.sort_order
    `;

    // Get all available features for selection
    const allFeatures = await prisma.$queryRaw`
      SELECT 
        feature_code, feature_name, description, category, icon, sort_order
      FROM master_feature_definitions
      WHERE is_active = TRUE
      ORDER BY category, sort_order
    `;

    res.json({
      ok: true,
      tenant,
      config: configs && configs.length > 0 ? configs[0] : null,
      features: features || [],
      availableFeatures: allFeatures || []
    });
  } catch (error) {
    console.error('[SubscriptionControl] Get custom tenant config error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch tenant configuration' });
  }
});

/**
 * POST /api/subscription-control/custom/tenants/:tenantId
 * Create or update custom plan configuration for a tenant
 */
router.post('/custom/tenants/:tenantId', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { tenantId } = req.params;
    const {
      price_monthly = 0,
      price_yearly = 0,
      override_pricing = false,
      pricing_notes = '',
      max_users = 10,
      max_branches = 3,
      max_storage_gb = 50,
      governance_rules = {},
      trial_enabled = false,
      trial_days = 0,
      billing_cycle = 'monthly',
      billing_day = 1,
      internal_notes = '',
      status = 'draft'
    } = req.body;

    // Check if tenant exists
    const tenants = await prisma.$queryRaw`
      SELECT id FROM clients WHERE id = ${tenantId}::uuid
    `;

    if (!tenants || tenants.length === 0) {
      return res.status(404).json({ ok: false, error: 'Tenant not found' });
    }

    // Check if config already exists
    const existingConfig = await prisma.$queryRaw`
      SELECT id FROM custom_tenant_plan_configurations WHERE tenant_id = ${tenantId}::uuid
    `;

    const userId = req.user?.id || 0;
    const userEmail = req.user?.email || '';

    if (existingConfig && existingConfig.length > 0) {
      // Update existing config
      await prisma.$executeRaw`
        UPDATE custom_tenant_plan_configurations SET
          price_monthly = ${price_monthly},
          price_yearly = ${price_yearly},
          override_pricing = ${override_pricing},
          pricing_notes = ${pricing_notes},
          max_users = ${max_users},
          max_branches = ${max_branches},
          max_storage_gb = ${max_storage_gb},
          governance_rules = ${JSON.stringify(governance_rules)}::jsonb,
          trial_enabled = ${trial_enabled},
          trial_days = ${trial_days},
          billing_cycle = ${billing_cycle},
          billing_day = ${billing_day},
          internal_notes = ${internal_notes},
          status = ${status}::custom_plan_status,
          updated_by = ${userId},
          updated_by_email = ${userEmail},
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}::uuid
      `;
    } else {
      // Create new config
      await prisma.$executeRaw`
        INSERT INTO custom_tenant_plan_configurations (
          tenant_id, price_monthly, price_yearly, override_pricing, pricing_notes,
          max_users, max_branches, max_storage_gb, governance_rules,
          trial_enabled, trial_days, billing_cycle, billing_day, internal_notes,
          status, created_by, created_by_email, updated_by, updated_by_email
        ) VALUES (
          ${tenantId}::uuid, ${price_monthly}, ${price_yearly}, ${override_pricing}, ${pricing_notes},
          ${max_users}, ${max_branches}, ${max_storage_gb}, ${JSON.stringify(governance_rules)}::jsonb,
          ${trial_enabled}, ${trial_days}, ${billing_cycle}, ${billing_day}, ${internal_notes},
          ${status}::custom_plan_status, ${userId}, ${userEmail}, ${userId}, ${userEmail}
        )
      `;
    }

    // Log audit
    await prisma.$executeRaw`
      INSERT INTO custom_plan_audit_log (
        tenant_id, action, new_values, change_summary, changed_by, changed_by_email, ip_address
      ) VALUES (
        ${tenantId}::uuid, 
        ${existingConfig && existingConfig.length > 0 ? 'updated' : 'created'},
        ${JSON.stringify(req.body)}::jsonb,
        ${existingConfig && existingConfig.length > 0 ? 'Updated custom configuration' : 'Created custom configuration'},
        ${userId}, ${userEmail}, ${req.ip}::inet
      )
    `;

    res.json({
      ok: true,
      message: existingConfig && existingConfig.length > 0 
        ? 'Configuration updated successfully' 
        : 'Configuration created successfully'
    });
  } catch (error) {
    console.error('[SubscriptionControl] Save custom tenant config error:', error);
    res.status(500).json({ ok: false, error: 'Failed to save configuration' });
  }
});

/**
 * PUT /api/subscription-control/custom/tenants/:tenantId/features
 * Update feature controls for a tenant's custom plan
 */
router.put('/custom/tenants/:tenantId/features', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { tenantId } = req.params;
    const { features } = req.body;

    if (!Array.isArray(features)) {
      return res.status(400).json({ ok: false, error: 'Features must be an array' });
    }

    // Clear existing feature controls for this tenant
    await prisma.$executeRaw`
      DELETE FROM custom_tenant_feature_controls WHERE tenant_id = ${tenantId}::uuid
    `;

    // Insert new feature controls
    for (const feature of features) {
      await prisma.$executeRaw`
        INSERT INTO custom_tenant_feature_controls (
          tenant_id, feature_code, is_enabled, free_limit, limit_period,
          usage_limit, unlock_price, unlock_unit, lock_mode,
          approval_threshold, requires_approval
        ) VALUES (
          ${tenantId}::uuid, ${feature.feature_code}, ${feature.is_enabled ?? true},
          ${feature.free_limit ?? -1}, ${feature.limit_period ?? 'monthly'}::limit_period_type,
          ${feature.usage_limit ?? null}, ${feature.unlock_price ?? 0}, ${feature.unlock_unit ?? 'per month'},
          ${feature.lock_mode ?? 'none'}::lock_mode_type,
          ${feature.approval_threshold ?? null}, ${feature.requires_approval ?? false}
        )
      `;
    }

    // Log audit
    const userId = req.user?.id || 0;
    const userEmail = req.user?.email || '';
    
    await prisma.$executeRaw`
      INSERT INTO custom_plan_audit_log (
        tenant_id, action, new_values, change_summary, changed_by, changed_by_email, ip_address
      ) VALUES (
        ${tenantId}::uuid, 'features_updated',
        ${JSON.stringify({ feature_count: features.length })}::jsonb,
        ${'Updated ' + features.length + ' feature controls'},
        ${userId}, ${userEmail}, ${req.ip}::inet
      )
    `;

    res.json({
      ok: true,
      message: `Updated ${features.length} feature controls`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Save custom features error:', error);
    res.status(500).json({ ok: false, error: 'Failed to save feature controls' });
  }
});

/**
 * PATCH /api/subscription-control/custom/tenants/:tenantId/status
 * Update custom plan configuration status (using client_subscriptions)
 */
router.patch('/custom/tenants/:tenantId/status', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { tenantId } = req.params;
    const { status } = req.body;

    if (!['draft', 'configured', 'active', 'inactive'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status' });
    }

    const userId = req.user?.id || 0;
    const userEmail = req.user?.email || '';

    // If activating, also assign the CUSTOM plan to the tenant
    if (status === 'active') {
      // Get CUSTOM plan id from subscription_plans
      const customPlan = await prisma.subscription_plans.findFirst({
        where: { plan_code: 'CUSTOM' }
      });

      if (customPlan) {
        // Deactivate any existing subscriptions
        await prisma.client_subscriptions.updateMany({
          where: { 
            client_id: tenantId,
            state: { in: ['ACTIVE', 'TRIAL', 'PENDING'] }
          },
          data: {
            state: 'CANCELLED',
            current_period_end: new Date()
          }
        });

        // Create CUSTOM subscription
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await prisma.client_subscriptions.create({
          data: {
            client_id: tenantId,
            plan_id: customPlan.id,
            state: 'ACTIVE',
            billing_cycle: 'MONTHLY',
            current_period_start: now,
            current_period_end: periodEnd,
            auto_renew: true
          }
        });
      }

      // Set effective_from
      await prisma.$executeRaw`
        UPDATE custom_tenant_plan_configurations 
        SET effective_from = NOW() 
        WHERE tenant_id = ${tenantId}::uuid AND effective_from IS NULL
      `;
    }

    await prisma.$executeRaw`
      UPDATE custom_tenant_plan_configurations 
      SET status = ${status}::custom_plan_status, updated_by = ${userId}, updated_by_email = ${userEmail}
      WHERE tenant_id = ${tenantId}::uuid
    `;

    // Log audit
    await prisma.$executeRaw`
      INSERT INTO custom_plan_audit_log (
        tenant_id, action, new_values, change_summary, changed_by, changed_by_email, ip_address
      ) VALUES (
        ${tenantId}::uuid, ${status === 'active' ? 'activated' : 'status_changed'},
        ${JSON.stringify({ status })}::jsonb,
        ${'Status changed to ' + status},
        ${userId}, ${userEmail}, ${req.ip}::inet
      )
    `;

    res.json({ ok: true, message: `Status changed to ${status}` });
  } catch (error) {
    console.error('[SubscriptionControl] Update status error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update status' });
  }
});

/**
 * GET /api/subscription-control/custom/tenants/:tenantId/audit
 * Get audit log for a tenant's custom configuration
 */
router.get('/custom/tenants/:tenantId/audit', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { tenantId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await prisma.$queryRaw`
      SELECT * FROM custom_plan_audit_log 
      WHERE tenant_id = ${tenantId}::uuid 
      ORDER BY changed_at DESC 
      LIMIT ${parseInt(limit)}
    `;

    res.json({ ok: true, logs: logs || [] });
  } catch (error) {
    console.error('[SubscriptionControl] Audit log error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit log' });
  }
});

/**
 * DELETE /api/subscription-control/custom/tenants/:tenantId
 * Delete custom plan configuration for a tenant
 */
router.delete('/custom/tenants/:tenantId', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { tenantId } = req.params;
    const userId = req.user?.id || 0;
    const userEmail = req.user?.email || '';

    // Log before deleting
    await prisma.$executeRaw`
      INSERT INTO custom_plan_audit_log (
        tenant_id, action, change_summary, changed_by, changed_by_email, ip_address
      ) VALUES (
        ${tenantId}::uuid, 'deleted', 'Custom configuration deleted',
        ${userId}, ${userEmail}, ${req.ip}::inet
      )
    `;

    // Delete feature controls
    await prisma.$executeRaw`
      DELETE FROM custom_tenant_feature_controls WHERE tenant_id = ${tenantId}::uuid
    `;

    // Delete configuration
    await prisma.$executeRaw`
      DELETE FROM custom_tenant_plan_configurations WHERE tenant_id = ${tenantId}::uuid
    `;

    res.json({ ok: true, message: 'Configuration deleted' });
  } catch (error) {
    console.error('[SubscriptionControl] Delete config error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete configuration' });
  }
});

module.exports = router;
