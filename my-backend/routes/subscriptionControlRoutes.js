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
    
    // Get plan statistics
    const planStats = await prisma.$queryRaw`
      SELECT 
        msp.code as plan_code,
        msp.name as plan_name,
        msp.status,
        COUNT(tpa.id) as tenant_count
      FROM master_subscription_plans msp
      LEFT JOIN tenant_plan_assignments tpa ON tpa.plan_id = msp.id AND tpa.is_active = TRUE
      GROUP BY msp.id, msp.code, msp.name, msp.status
      ORDER BY msp.sort_order
    `;

    // Get feature usage summary
    const usageStats = await prisma.$queryRaw`
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

    // Get recent enforcement blocks
    const recentBlocks = await prisma.$queryRaw`
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

    // Get billing summary
    const billingSummary = await prisma.$queryRaw`
      SELECT 
        source_type,
        SUM(amount) as total_amount,
        COUNT(*) as line_count
      FROM subscription_billing_ledger
      WHERE billing_period_start >= DATE_TRUNC('month', NOW())
      GROUP BY source_type
    `;

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
 * List all subscription plans
 */
router.get('/plans', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { include_archived = 'false' } = req.query;

    let plans;
    if (include_archived === 'true') {
      plans = await prisma.$queryRaw`
        SELECT 
          msp.*,
          COALESCE(COUNT(tpa.id), 0) as active_tenant_count
        FROM master_subscription_plans msp
        LEFT JOIN tenant_plan_assignments tpa ON tpa.plan_id = msp.id AND tpa.is_active = TRUE
        GROUP BY msp.id
        ORDER BY msp.sort_order, msp.name
      `;
    } else {
      plans = await prisma.$queryRaw`
        SELECT 
          msp.*,
          COALESCE(COUNT(tpa.id), 0) as active_tenant_count
        FROM master_subscription_plans msp
        LEFT JOIN tenant_plan_assignments tpa ON tpa.plan_id = msp.id AND tpa.is_active = TRUE
        WHERE msp.status != 'archived'
        GROUP BY msp.id
        ORDER BY msp.sort_order, msp.name
      `;
    }
    
    res.json({
      ok: true,
      plans: plans.map(p => ({
        ...p,
        monthly_spend_cap: p.monthly_spend_cap ? parseFloat(p.monthly_spend_cap) : null,
        cfo_approval_threshold: p.cfo_approval_threshold ? parseFloat(p.cfo_approval_threshold) : null,
        active_tenant_count: parseInt(p.active_tenant_count || 0)
      }))
    });
  } catch (error) {
    console.error('[SubscriptionControl] List plans error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch plans' });
  }
});

/**
 * GET /api/subscription-control/plans/:id
 * Get single plan with all features
 */
router.get('/plans/:id', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);

    const plans = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE id = ${planId}
    `;
    
    if (plans.length === 0) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    const plan = plans[0];

    // Get all features with this plan's controls
    const features = await prisma.$queryRaw`
      SELECT 
        mfd.*,
        pfc.id as control_id,
        pfc.free_limit,
        pfc.limit_period,
        pfc.unlock_price,
        pfc.unlock_unit,
        pfc.currency,
        pfc.approval_threshold,
        pfc.requires_approval,
        pfc.lock_mode,
        pfc.is_visible,
        pfc.show_in_pricing
      FROM master_feature_definitions mfd
      LEFT JOIN plan_feature_controls pfc ON pfc.feature_code = mfd.feature_code AND pfc.plan_id = ${planId}
      WHERE mfd.is_active = TRUE
      ORDER BY mfd.category, mfd.sort_order, mfd.feature_name
    `;

    // Get tenant count
    const tenantCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM tenant_plan_assignments 
      WHERE plan_id = ${planId} AND is_active = TRUE
    `;

    res.json({
      ok: true,
      plan: {
        ...plan,
        monthly_spend_cap: plan.monthly_spend_cap ? parseFloat(plan.monthly_spend_cap) : null,
        cfo_approval_threshold: plan.cfo_approval_threshold ? parseFloat(plan.cfo_approval_threshold) : null,
        active_tenant_count: parseInt(tenantCount[0]?.count || 0)
      },
      features: features.map(f => ({
        ...f,
        free_limit: f.free_limit ?? 0,
        unlock_price: f.unlock_price ? parseFloat(f.unlock_price) : 0,
        approval_threshold: f.approval_threshold ? parseFloat(f.approval_threshold) : null
      }))
    });
  } catch (error) {
    console.error('[SubscriptionControl] Get plan error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch plan' });
  }
});

/**
 * POST /api/subscription-control/plans
 * Create a new subscription plan
 */
router.post('/plans', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const {
      code,
      name,
      description,
      badge_text,
      sort_order = 0,
      is_popular = false,
      color_code = '#3B82F6',
      monthly_spend_cap,
      auto_block_on_cap = true,
      cfo_approval_threshold,
      invoice_cycle_days = 30,
      grace_period_days = 7,
      read_only_after_grace = false
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ ok: false, error: 'code and name are required' });
    }

    // Check if code already exists
    const existing = await prisma.$queryRaw`
      SELECT id FROM master_subscription_plans WHERE code = ${code.toUpperCase()}
    `;
    
    if (existing.length > 0) {
      return res.status(409).json({ ok: false, error: 'Plan code already exists' });
    }

    // Create plan
    await prisma.$executeRaw`
      INSERT INTO master_subscription_plans 
      (code, name, description, badge_text, sort_order, is_popular, color_code, 
       monthly_spend_cap, auto_block_on_cap, cfo_approval_threshold, 
       invoice_cycle_days, grace_period_days, read_only_after_grace, created_by)
      VALUES 
      (${code.toUpperCase()}, ${name}, ${description || null}, ${badge_text || null}, 
       ${sort_order}, ${is_popular}, ${color_code}, 
       ${monthly_spend_cap || null}, ${auto_block_on_cap}, ${cfo_approval_threshold || null}, 
       ${invoice_cycle_days}, ${grace_period_days}, ${read_only_after_grace}, ${req.user?.id || null})
    `;

    const newPlan = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE code = ${code.toUpperCase()}
    `;

    // Log the change
    await logPlanChange(prisma, {
      target_type: 'plan',
      target_id: newPlan[0].id.toString(),
      target_name: name,
      action: 'created',
      old_values: null,
      new_values: newPlan[0],
      change_summary: `Created new plan: ${name}`
    }, req);

    res.status(201).json({
      ok: true,
      plan: newPlan[0],
      message: `Plan "${name}" created successfully`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Create plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to create plan' });
  }
});

/**
 * PUT /api/subscription-control/plans/:id
 * Update a subscription plan
 */
router.put('/plans/:id', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);
    const {
      name,
      description,
      badge_text,
      sort_order,
      is_popular,
      color_code,
      monthly_spend_cap,
      auto_block_on_cap,
      cfo_approval_threshold,
      invoice_cycle_days,
      grace_period_days,
      read_only_after_grace
    } = req.body;

    // Get current plan for audit
    const oldPlans = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE id = ${planId}
    `;
    
    if (oldPlans.length === 0) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    const oldPlan = oldPlans[0];

    // Update plan
    await prisma.$executeRaw`
      UPDATE master_subscription_plans SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        badge_text = ${badge_text},
        sort_order = COALESCE(${sort_order}, sort_order),
        is_popular = COALESCE(${is_popular}, is_popular),
        color_code = COALESCE(${color_code}, color_code),
        monthly_spend_cap = ${monthly_spend_cap},
        auto_block_on_cap = COALESCE(${auto_block_on_cap}, auto_block_on_cap),
        cfo_approval_threshold = ${cfo_approval_threshold},
        invoice_cycle_days = COALESCE(${invoice_cycle_days}, invoice_cycle_days),
        grace_period_days = COALESCE(${grace_period_days}, grace_period_days),
        read_only_after_grace = COALESCE(${read_only_after_grace}, read_only_after_grace),
        updated_by = ${req.user?.id || null}
      WHERE id = ${planId}
    `;

    const updatedPlan = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE id = ${planId}
    `;

    // Log the change
    await logPlanChange(prisma, {
      target_type: 'plan',
      target_id: planId.toString(),
      target_name: updatedPlan[0].name,
      action: 'updated',
      old_values: oldPlan,
      new_values: updatedPlan[0],
      change_summary: `Updated plan: ${updatedPlan[0].name}`
    }, req);

    res.json({
      ok: true,
      plan: updatedPlan[0],
      message: `Plan "${updatedPlan[0].name}" updated successfully`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Update plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to update plan' });
  }
});

/**
 * POST /api/subscription-control/plans/:id/clone
 * Clone a subscription plan
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
    const sourcePlans = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE id = ${planId}
    `;
    
    if (sourcePlans.length === 0) {
      return res.status(404).json({ ok: false, error: 'Source plan not found' });
    }

    const source = sourcePlans[0];

    // Check if new code exists
    const existing = await prisma.$queryRaw`
      SELECT id FROM master_subscription_plans WHERE code = ${new_code.toUpperCase()}
    `;
    
    if (existing.length > 0) {
      return res.status(409).json({ ok: false, error: 'Plan code already exists' });
    }

    // Clone plan
    await prisma.$executeRaw`
      INSERT INTO master_subscription_plans 
      (code, name, description, badge_text, sort_order, is_popular, color_code,
       monthly_spend_cap, auto_block_on_cap, cfo_approval_threshold,
       invoice_cycle_days, grace_period_days, read_only_after_grace, created_by)
      SELECT 
        ${new_code.toUpperCase()}, ${new_name}, description, badge_text, sort_order + 1, FALSE, color_code,
        monthly_spend_cap, auto_block_on_cap, cfo_approval_threshold,
        invoice_cycle_days, grace_period_days, read_only_after_grace, ${req.user?.id || null}
      FROM master_subscription_plans WHERE id = ${planId}
    `;

    const newPlan = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE code = ${new_code.toUpperCase()}
    `;

    // Clone feature controls
    await prisma.$executeRaw`
      INSERT INTO plan_feature_controls 
      (plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit, currency,
       approval_threshold, requires_approval, lock_mode, is_visible, show_in_pricing)
      SELECT 
        ${newPlan[0].id}, feature_code, free_limit, limit_period, unlock_price, unlock_unit, currency,
        approval_threshold, requires_approval, lock_mode, is_visible, show_in_pricing
      FROM plan_feature_controls WHERE plan_id = ${planId}
    `;

    // Log
    await logPlanChange(prisma, {
      target_type: 'plan',
      target_id: newPlan[0].id.toString(),
      target_name: new_name,
      action: 'cloned',
      old_values: { source_plan_id: planId, source_plan_code: source.code },
      new_values: newPlan[0],
      change_summary: `Cloned plan "${source.name}" to "${new_name}"`
    }, req);

    res.status(201).json({
      ok: true,
      plan: newPlan[0],
      message: `Plan cloned as "${new_name}"`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Clone plan error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to clone plan' });
  }
});

/**
 * PATCH /api/subscription-control/plans/:id/status
 * Toggle plan status (active/inactive/archived)
 */
router.patch('/plans/:id/status', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const planId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['active', 'inactive', 'archived'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid status. Use: active, inactive, archived' });
    }

    const oldPlan = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE id = ${planId}
    `;
    
    if (oldPlan.length === 0) {
      return res.status(404).json({ ok: false, error: 'Plan not found' });
    }

    await prisma.$executeRaw`
      UPDATE master_subscription_plans SET 
        status = ${status}::plan_status,
        archived_at = ${status === 'archived' ? new Date() : null},
        archived_by = ${status === 'archived' ? req.user?.id : null}
      WHERE id = ${planId}
    `;

    const updatedPlan = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE id = ${planId}
    `;

    await logPlanChange(prisma, {
      target_type: 'plan',
      target_id: planId.toString(),
      target_name: updatedPlan[0].name,
      action: status === 'archived' ? 'archived' : 'status_changed',
      old_values: { status: oldPlan[0].status },
      new_values: { status },
      change_summary: `Changed plan status from ${oldPlan[0].status} to ${status}`
    }, req);

    res.json({
      ok: true,
      plan: updatedPlan[0],
      message: `Plan status changed to ${status}`
    });
  } catch (error) {
    console.error('[SubscriptionControl] Status change error:', error);
    res.status(500).json({ ok: false, error: 'Failed to change plan status' });
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

    // Validate the plan exists
    const plan = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE id = ${planId}
    `;
    
    if (plan.length === 0) {
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
        free_limit,
        limit_period = 'monthly',
        unlock_unit = 'per month',
        currency = 'INR',
        approval_threshold,
        requires_approval = false,
        lock_mode = 'none',
        is_visible = true,
        show_in_pricing = true
      } = feature;
      
      // Auto-fix: If hard locked, force unlock_price to 0
      const unlock_price = lock_mode === 'hard' ? 0 : (feature.unlock_price || 0);

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
            unlock_price = ${unlock_price},
            unlock_unit = ${unlock_unit},
            currency = ${currency},
            approval_threshold = ${approval_threshold},
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
           ${unlock_price}, ${unlock_unit}, ${currency}, ${approval_threshold}, 
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
      target_name: plan[0].name,
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
 * List all tenants with their plans
 */
router.get('/tenants', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { page = 1, limit = 20, plan_id, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';

    if (plan_id) {
      whereClause += ` AND tpa.plan_id = ${parseInt(plan_id)}`;
    }
    if (search) {
      whereClause += ` AND (c.name ILIKE '%${search}%' OR c.client_code ILIKE '%${search}%')`;
    }

    const tenants = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id as tenant_id,
        c.name as tenant_name,
        c.client_code,
        c.email,
        tpa.id as assignment_id,
        tpa.plan_id,
        msp.code as plan_code,
        msp.name as plan_name,
        tpa.billing_cycle,
        tpa.effective_from,
        tpa.is_active as assignment_active
      FROM clients c
      LEFT JOIN tenant_plan_assignments tpa ON tpa.tenant_id = c.id AND tpa.is_active = TRUE
      LEFT JOIN master_subscription_plans msp ON msp.id = tpa.plan_id
      ${whereClause}
      ORDER BY c.name
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);

    const total = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM clients
    `;

    res.json({
      ok: true,
      tenants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total[0]?.count || 0),
        pages: Math.ceil(parseInt(total[0]?.count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[SubscriptionControl] List tenants error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch tenants' });
  }
});

/**
 * POST /api/subscription-control/tenants/:tenantId/assign
 * Assign a plan to a tenant
 */
router.post('/tenants/:tenantId/assign', ...superAdminOnly, async (req, res) => {
  try {
    const prisma = getPrisma();
    const tenantId = req.params.tenantId;
    const { plan_id, billing_cycle = 'monthly', custom_overrides = {}, reason } = req.body;

    if (!plan_id) {
      return res.status(400).json({ ok: false, error: 'plan_id is required' });
    }

    // Get old assignment if exists
    const oldAssignment = await prisma.$queryRaw`
      SELECT * FROM tenant_plan_assignments 
      WHERE tenant_id = ${tenantId}::uuid AND is_active = TRUE
    `;

    // Deactivate old assignment
    if (oldAssignment.length > 0) {
      await prisma.$executeRaw`
        UPDATE tenant_plan_assignments SET 
          is_active = FALSE,
          effective_until = NOW()
        WHERE tenant_id = ${tenantId}::uuid AND is_active = TRUE
      `;
    }

    // Create new assignment
    await prisma.$executeRaw`
      INSERT INTO tenant_plan_assignments 
      (tenant_id, plan_id, billing_cycle, custom_overrides, previous_plan_id, changed_reason, created_by)
      VALUES 
      (${tenantId}::uuid, ${plan_id}, ${billing_cycle}, ${JSON.stringify(custom_overrides)}::jsonb, 
       ${oldAssignment[0]?.plan_id || null}, ${reason || null}, ${req.user?.id || null})
    `;

    const newAssignment = await prisma.$queryRaw`
      SELECT tpa.*, msp.name as plan_name, msp.code as plan_code
      FROM tenant_plan_assignments tpa
      JOIN master_subscription_plans msp ON msp.id = tpa.plan_id
      WHERE tpa.tenant_id = ${tenantId}::uuid AND tpa.is_active = TRUE
    `;

    await logPlanChange(prisma, {
      target_type: 'tenant_assignment',
      target_id: tenantId,
      target_name: `Tenant ${tenantId}`,
      action: oldAssignment.length > 0 ? 'plan_changed' : 'plan_assigned',
      old_values: oldAssignment[0] || null,
      new_values: newAssignment[0],
      change_summary: `Assigned plan ${newAssignment[0].plan_code} to tenant`,
      reason
    }, req);

    res.json({
      ok: true,
      assignment: newAssignment[0],
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

module.exports = router;
