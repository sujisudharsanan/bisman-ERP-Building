/**
 * BISMAN ERP - Micro-Unlock API Routes
 * 
 * REST API endpoints for the micro-unlock subscription system.
 * Handles feature access checks, unlocking, usage tracking, and billing.
 * 
 * @module routes/microUnlockRoutes
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const microUnlockService = require('../services/subscription/microUnlockService');
const spendControlService = require('../services/subscription/spendControlService');

// Admin roles that can see pricing
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'ENTERPRISE_ADMIN', 'TENANT_ADMIN'];

function isAdminUser(user) {
  if (!user) return false;
  const role = (user.role_name || user.role || '').toUpperCase();
  return ADMIN_ROLES.includes(role);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

const adminOnly = [
  authenticate,
  requireRole(['ENTERPRISE_ADMIN', 'ADMIN', 'SUPER_ADMIN']),
];

// CFO can edit spend limits (escalation from Admin)
const adminOrCfoOnly = [
  authenticate,
  requireRole(['ENTERPRISE_ADMIN', 'ADMIN', 'SUPER_ADMIN', 'CFO']),
];

const superAdminOnly = [
  authenticate,
  requireRole(['SUPER_ADMIN', 'SYSTEM_ADMIN']),
];

// Helper to get tenant ID from request
const getTenantId = (req) => {
  return req.user?.client_id || req.user?.clientId || req.query.tenantId;
};

// ============================================================================
// PUBLIC ROUTES - Feature Catalog
// ============================================================================

/**
 * GET /api/micro-unlock/catalog
 * Get all available features with pricing
 */
router.get('/catalog', authenticate, async (req, res) => {
  try {
    const { category } = req.query;
    const features = await microUnlockService.getFeatureCatalog({ 
      category,
      activeOnly: true,
    });

    res.json({
      ok: true,
      features,
      currency: 'INR',
      defaultPrice: 100,
    });
  } catch (error) {
    console.error('[MicroUnlock] Catalog error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch feature catalog' });
  }
});

/**
 * GET /api/micro-unlock/feature/:featureKey
 * Get details for a specific feature
 */
router.get('/feature/:featureKey', authenticate, async (req, res) => {
  try {
    const { featureKey } = req.params;
    const feature = await microUnlockService.getFeatureByKey(featureKey);

    if (!feature) {
      return res.status(404).json({ ok: false, error: 'Feature not found' });
    }

    res.json({ ok: true, feature });
  } catch (error) {
    console.error('[MicroUnlock] Feature fetch error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch feature details' });
  }
});

// ============================================================================
// USAGE TRACKING ROUTES
// ============================================================================

/**
 * GET /api/micro-unlock/access/:featureKey
 * Check if current user can use a feature
 */
router.get('/access/:featureKey', authenticate, async (req, res) => {
  try {
    const { featureKey } = req.params;
    const tenantId = getTenantId(req);
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Tenant context required' 
      });
    }

    const access = await microUnlockService.checkFeatureAccess(
      tenantId,
      userId,
      featureKey
    );

    res.json({ ok: true, access });
  } catch (error) {
    console.error('[MicroUnlock] Access check error:', error);
    res.status(500).json({ ok: false, error: 'Failed to check feature access' });
  }
});

/**
 * POST /api/micro-unlock/usage/:featureKey
 * Record feature usage (called by other services)
 */
router.post('/usage/:featureKey', authenticate, async (req, res) => {
  try {
    const { featureKey } = req.params;
    const { count = 1 } = req.body;
    const tenantId = getTenantId(req);
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Tenant context required' 
      });
    }

    // First check if allowed
    const access = await microUnlockService.checkFeatureAccess(
      tenantId,
      userId,
      featureKey
    );

    if (!access.allowed) {
      return res.status(403).json({
        ok: false,
        error: 'usage_limit_exceeded',
        message: access.message,
        canUnlock: access.canUnlock,
        unlockPrice: access.unlock_price,
        resetInSeconds: access.reset_in_seconds,
        promptData: {
          title: `You've reached today's limit`,
          message: `Unlock unlimited ${featureKey.replace(/_/g, ' ')} for ₹${access.unlock_price}/month.`,
          buttons: [
            { label: 'Unlock Now', action: 'unlock', primary: true },
            { label: 'Continue with limits', action: 'dismiss' },
          ],
        },
      });
    }

    // Record the usage
    const counter = await microUnlockService.recordUsage(
      tenantId,
      userId,
      featureKey,
      count
    );

    res.json({
      ok: true,
      usage: {
        current: counter.usage_count,
        limit: access.usage_limit,
        isUnlocked: access.is_unlocked,
        remaining: access.is_unlocked ? -1 : Math.max(0, access.usage_limit - counter.usage_count),
      },
    });
  } catch (error) {
    console.error('[MicroUnlock] Usage record error:', error);
    res.status(500).json({ ok: false, error: 'Failed to record usage' });
  }
});

/**
 * GET /api/micro-unlock/usage-summary
 * Get usage summary for tenant
 */
router.get('/usage-summary', ...adminOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const usage = await microUnlockService.getUsageSummary(tenantId);

    // Group by status
    const summary = {
      ok: usage.filter(u => u.status === 'OK').length,
      nearLimit: usage.filter(u => u.status === 'NEAR_LIMIT').length,
      limited: usage.filter(u => u.status === 'LIMITED').length,
      unlocked: usage.filter(u => u.status === 'UNLOCKED').length,
    };

    res.json({
      ok: true,
      usage,
      summary,
    });
  } catch (error) {
    console.error('[MicroUnlock] Usage summary error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch usage summary' });
  }
});

// ============================================================================
// FEATURE UNLOCK ROUTES
// ============================================================================

/**
 * POST /api/micro-unlock/unlock/:featureKey
 * Unlock a feature for the tenant (Admin only)
 * 
 * SPEND CONTROL: Validates against monthly spend cap before allowing unlock
 */
router.post('/unlock/:featureKey', ...adminOnly, async (req, res) => {
  try {
    const { featureKey } = req.params;
    const { autoRenew = true } = req.body;
    const tenantId = getTenantId(req);
    const actorId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    // Get feature price
    const feature = await microUnlockService.getFeatureByKey(featureKey);
    if (!feature) {
      return res.status(404).json({ ok: false, error: 'Feature not found' });
    }

    // CHECK SPEND LIMIT
    const spendCheck = await spendControlService.checkSpendAllowance(
      tenantId,
      parseFloat(feature.base_price)
    );

    if (!spendCheck.allowed) {
      return res.status(403).json({
        ok: false,
        error: 'SPEND_LIMIT_EXCEEDED',
        message: spendCheck.message,
        spendInfo: {
          currentSpend: spendCheck.currentSpend,
          monthlyCapAmount: spendCheck.monthlyCapAmount,
          projectedSpend: spendCheck.projectedSpend,
          remainingBudget: spendCheck.remainingBudget,
        },
        action: {
          type: 'increase_limit',
          description: 'Increase your monthly spend limit to unlock more services.',
          endpoint: '/api/micro-unlock/admin/spend-limit',
        },
      });
    }

    // Show warning if near cap
    const warning = spendCheck.isNearCap ? {
      type: 'near_cap',
      message: spendCheck.message,
      remainingBudget: spendCheck.remainingBudget,
    } : null;

    // Perform the unlock
    const result = await microUnlockService.unlockFeature(
      tenantId,
      featureKey,
      { autoRenew },
      actorId
    );

    // Add to monthly spend
    await spendControlService.addToMonthlySpend(
      tenantId,
      result.pricePerMonth,
      featureKey,
      actorId
    );

    // Resolve any blocks for this feature
    await spendControlService.resolveBlocks(tenantId, featureKey, 'unlock');

    res.json({ 
      ok: true, 
      ...result,
      warning,
    });
  } catch (error) {
    console.error('[MicroUnlock] Unlock error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to unlock feature' });
  }
});

/**
 * POST /api/micro-unlock/unlock
 * Unlock a feature (alternative endpoint with featureKey in body)
 */
router.post('/unlock', ...adminOnly, async (req, res) => {
  try {
    const { featureKey, autoRenew = true } = req.body;
    const tenantId = getTenantId(req);
    const actorId = req.user?.id;

    if (!featureKey) {
      return res.status(400).json({ ok: false, error: 'featureKey required' });
    }

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    // Get feature price
    const feature = await microUnlockService.getFeatureByKey(featureKey);
    if (!feature) {
      return res.status(404).json({ ok: false, error: 'Feature not found' });
    }

    // CHECK SPEND LIMIT
    const spendCheck = await spendControlService.checkSpendAllowance(
      tenantId,
      parseFloat(feature.base_price)
    );

    if (!spendCheck.allowed) {
      return res.status(403).json({
        ok: false,
        error: 'SPEND_LIMIT_EXCEEDED',
        message: spendCheck.message,
        spendInfo: {
          currentSpend: spendCheck.currentSpend,
          monthlyCapAmount: spendCheck.monthlyCapAmount,
          remainingBudget: spendCheck.remainingBudget,
        },
      });
    }

    // Perform the unlock
    const result = await microUnlockService.unlockFeature(
      tenantId,
      featureKey,
      { autoRenew },
      actorId
    );

    // Add to monthly spend
    await spendControlService.addToMonthlySpend(
      tenantId,
      result.pricePerMonth,
      featureKey,
      actorId
    );

    // Resolve any blocks for this feature
    await spendControlService.resolveBlocks(tenantId, featureKey, 'unlock');

    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[MicroUnlock] Unlock error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to unlock feature' });
  }
});

/**
 * POST /api/micro-unlock/disable/:featureKey
 * Disable/lock a feature
 */
router.post('/disable/:featureKey', ...adminOnly, async (req, res) => {
  try {
    const { featureKey } = req.params;
    const { reason = 'User requested' } = req.body;
    const tenantId = getTenantId(req);
    const actorId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const result = await microUnlockService.disableFeature(
      tenantId,
      featureKey,
      reason,
      actorId
    );

    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[MicroUnlock] Disable error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to disable feature' });
  }
});

/**
 * GET /api/micro-unlock/unlocked
 * Get all unlocked features for tenant
 */
router.get('/unlocked', ...adminOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const unlocks = await microUnlockService.getUnlockedFeatures(tenantId);

    res.json({
      ok: true,
      unlocks,
      count: unlocks.length,
      totalMonthly: unlocks.reduce((sum, u) => sum + parseFloat(u.price_per_month), 0),
    });
  } catch (error) {
    console.error('[MicroUnlock] Unlocked fetch error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch unlocked features' });
  }
});

// ============================================================================
// BILLING ROUTES (ADMIN OR CFO)
// ============================================================================

/**
 * GET /api/micro-unlock/billing/summary
 * Get current billing summary (Admin or CFO can view)
 */
router.get('/billing/summary', ...adminOrCfoOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const bill = await microUnlockService.calculateMonthlyBill(tenantId);

    res.json({ ok: true, billing: bill });
  } catch (error) {
    console.error('[MicroUnlock] Billing summary error:', error);
    res.status(500).json({ ok: false, error: 'Failed to calculate billing' });
  }
});

/**
 * GET /api/micro-unlock/billing/history
 * Get billing/invoice history (Admin or CFO can view for finance reviews)
 */
router.get('/billing/history', ...adminOrCfoOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { limit = 12, status } = req.query;

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const invoices = await microUnlockService.getBillingHistory(tenantId, {
      limit: parseInt(limit, 10),
      status,
    });

    res.json({ ok: true, invoices });
  } catch (error) {
    console.error('[MicroUnlock] Billing history error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch billing history' });
  }
});

/**
 * POST /api/micro-unlock/billing/payment
 * Record a payment (Admin only)
 */
router.post('/billing/payment', ...adminOnly, async (req, res) => {
  try {
    const { invoiceNumber, paymentMethod, paymentReference, notes } = req.body;
    const actorId = req.user?.id;

    if (!invoiceNumber) {
      return res.status(400).json({ ok: false, error: 'Invoice number required' });
    }

    const invoice = await microUnlockService.recordPayment(
      invoiceNumber,
      { paymentMethod, paymentReference, notes },
      actorId
    );

    res.json({ ok: true, invoice });
  } catch (error) {
    console.error('[MicroUnlock] Payment record error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to record payment' });
  }
});

// ============================================================================
// RESOURCE CONSUMPTION ROUTES
// ============================================================================

/**
 * GET /api/micro-unlock/resources
 * Get resource consumption for tenant
 */
router.get('/resources', ...adminOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const resources = await microUnlockService.getResourceConsumption(tenantId);

    // Format for display
    const formatted = {
      users: {
        total: resources.total_users,
        active30d: resources.active_users_30d,
      },
      organization: {
        branches: resources.total_branches,
      },
      activity: {
        tasksCreated: resources.tasks_created,
        paymentsProcessed: resources.payments_processed,
        reportsGenerated: resources.reports_generated,
        reconciliationsRun: resources.reconciliations_run,
      },
      storage: {
        database: resources.db_storage_bytes,
        databaseFormatted: formatBytes(resources.db_storage_bytes),
        files: resources.file_storage_bytes,
        filesFormatted: formatBytes(resources.file_storage_bytes),
        total: resources.db_storage_bytes + resources.file_storage_bytes,
        totalFormatted: formatBytes(resources.db_storage_bytes + resources.file_storage_bytes),
      },
      api: {
        callsMade: resources.api_calls_made,
      },
      snapshotDate: resources.snapshot_date,
    };

    res.json({ ok: true, resources: formatted });
  } catch (error) {
    console.error('[MicroUnlock] Resources error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch resource consumption' });
  }
});

// ============================================================================
// SUBSCRIPTION PAGE DATA (Combined endpoint)
// ============================================================================

/**
 * GET /api/micro-unlock/subscription-page
 * Get all data needed for the admin subscription page
 */
router.get('/subscription-page', ...adminOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    // Fetch all data in parallel
    const [
      usage,
      unlocks,
      billing,
      resources,
      invoices,
      plans,
    ] = await Promise.all([
      microUnlockService.getUsageSummary(tenantId),
      microUnlockService.getUnlockedFeatures(tenantId),
      microUnlockService.calculateMonthlyBill(tenantId),
      microUnlockService.getResourceConsumption(tenantId),
      microUnlockService.getBillingHistory(tenantId, { limit: 6 }),
      microUnlockService.getSubscriptionPlans(),
    ]);

    // Build health summary
    const usageSummary = {
      ok: usage.filter(u => u.status === 'OK').length,
      nearLimit: usage.filter(u => u.status === 'NEAR_LIMIT').length,
      limited: usage.filter(u => u.status === 'LIMITED').length,
      unlocked: usage.filter(u => u.status === 'UNLOCKED').length,
    };

    const healthStatus = usageSummary.limited > 0 
      ? 'THROTTLED' 
      : usageSummary.nearLimit > 0 
        ? 'APPROACHING_LIMITS' 
        : 'HEALTHY';

    res.json({
      ok: true,
      data: {
        // Overview
        overview: {
          planName: billing.planName,
          billingCycle: billing.billingCycle,
          estimatedBill: billing.total,
          activeUnlocks: unlocks.length,
          cycleEnds: billing.nextBillingDate,
          currency: 'INR',
        },

        // Health
        health: {
          status: healthStatus,
          summary: usageSummary,
          featuresNearLimit: usage
            .filter(u => u.status === 'NEAR_LIMIT')
            .map(u => u.feature_name),
        },

        // Features & Usage
        features: usage,
        unlocks,

        // Resources
        resources: {
          users: { total: resources.total_users, active: resources.active_users_30d },
          branches: resources.total_branches,
          tasks: resources.tasks_created,
          payments: resources.payments_processed,
          reports: resources.reports_generated,
          storage: {
            db: formatBytes(resources.db_storage_bytes),
            files: formatBytes(resources.file_storage_bytes),
          },
        },

        // Billing
        billing: {
          lineItems: billing.lineItems,
          subtotal: billing.subtotal,
          total: billing.total,
          currency: billing.currency,
        },

        // History
        invoices,

        // Available plans
        plans,
      },
    });
  } catch (error) {
    console.error('[MicroUnlock] Subscription page error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch subscription data' });
  }
});

// ============================================================================
// SUPERADMIN ROUTES
// ============================================================================

/**
 * GET /api/micro-unlock/admin/catalog
 * Get full feature catalog for SuperAdmin
 */
router.get('/admin/catalog', ...superAdminOnly, async (req, res) => {
  try {
    const features = await microUnlockService.getFeatureCatalog({
      activeOnly: false,
      includeHidden: true,
    });

    res.json({ ok: true, features });
  } catch (error) {
    console.error('[MicroUnlock] Admin catalog error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch catalog' });
  }
});

/**
 * PUT /api/micro-unlock/admin/feature/:featureKey
 * Update feature pricing/settings
 */
router.put('/admin/feature/:featureKey', ...superAdminOnly, async (req, res) => {
  try {
    const { featureKey } = req.params;
    const updates = req.body;
    const actorId = req.user?.id;

    const feature = await microUnlockService.updateFeature(featureKey, updates, actorId);

    res.json({ ok: true, feature });
  } catch (error) {
    console.error('[MicroUnlock] Feature update error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to update feature' });
  }
});

/**
 * GET /api/micro-unlock/admin/plans
 * Get all subscription plans
 */
router.get('/admin/plans', ...superAdminOnly, async (req, res) => {
  try {
    const plans = await microUnlockService.getSubscriptionPlans();
    res.json({ ok: true, plans });
  } catch (error) {
    console.error('[MicroUnlock] Plans fetch error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch plans' });
  }
});

/**
 * POST /api/micro-unlock/admin/plans
 * Create or update a subscription plan
 */
router.post('/admin/plans', ...superAdminOnly, async (req, res) => {
  try {
    const planData = req.body;
    const actorId = req.user?.id;

    const plan = await microUnlockService.upsertSubscriptionPlan(planData, actorId);

    res.json({ ok: true, plan });
  } catch (error) {
    console.error('[MicroUnlock] Plan upsert error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to save plan' });
  }
});

/**
 * POST /api/micro-unlock/admin/override
 * Grant feature override to a tenant
 */
router.post('/admin/override', ...superAdminOnly, async (req, res) => {
  try {
    const { tenantId, featureKey, customPrice, reason, expiresAt } = req.body;
    const actorId = req.user?.id;

    if (!tenantId || !featureKey) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Tenant ID and feature key required' 
      });
    }

    if (!reason) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Reason is required for overrides' 
      });
    }

    const result = await microUnlockService.unlockFeature(
      tenantId,
      featureKey,
      {
        customPrice,
        isOverride: true,
        overrideReason: reason,
        overrideExpiresAt: expiresAt,
      },
      actorId
    );

    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[MicroUnlock] Override error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Failed to apply override' });
  }
});

/**
 * GET /api/micro-unlock/admin/audit
 * Get audit log
 */
router.get('/admin/audit', ...superAdminOnly, async (req, res) => {
  try {
    const { tenantId, category, action, limit = 100 } = req.query;

    const logs = await microUnlockService.getAuditLog(tenantId, {
      category,
      action,
      limit: parseInt(limit, 10),
    });

    res.json({ ok: true, logs });
  } catch (error) {
    console.error('[MicroUnlock] Audit log error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit log' });
  }
});

/**
 * GET /api/micro-unlock/admin/tenant/:tenantId/summary
 * Get complete subscription summary for a tenant
 */
router.get('/admin/tenant/:tenantId/summary', ...superAdminOnly, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const [usage, unlocks, billing, resources] = await Promise.all([
      microUnlockService.getUsageSummary(tenantId),
      microUnlockService.getUnlockedFeatures(tenantId),
      microUnlockService.calculateMonthlyBill(tenantId),
      microUnlockService.getResourceConsumption(tenantId),
    ]);

    res.json({
      ok: true,
      tenant: {
        id: tenantId,
        usage,
        unlocks,
        billing,
        resources,
      },
    });
  } catch (error) {
    console.error('[MicroUnlock] Tenant summary error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch tenant summary' });
  }
});

// ============================================================================
// SPEND CONTROL ROUTES (ADMIN OR CFO)
// ============================================================================

/**
 * GET /api/micro-unlock/admin/spend-limit
 * Get current spend limits and status
 */
router.get('/admin/spend-limit', ...adminOrCfoOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const limits = await spendControlService.getSpendLimits(tenantId);

    res.json({
      ok: true,
      spendLimits: {
        monthlyCapAmount: parseFloat(limits.monthly_cap_amount),
        currentMonthSpend: parseFloat(limits.current_month_spend),
        billingMonth: limits.billing_month,
        spendPercentage: parseFloat(limits.spend_percentage || 0),
        remainingBudget: parseFloat(limits.remaining_budget || 0),
        alertThresholdPct: limits.alert_threshold_pct,
        capReached: !!limits.cap_reached_at,
      },
    });
  } catch (error) {
    console.error('[MicroUnlock] Spend limit fetch error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch spend limits' });
  }
});

/**
 * PUT /api/micro-unlock/admin/spend-limit
 * Update monthly spend cap (Admin or CFO can edit)
 */
router.put('/admin/spend-limit', ...adminOrCfoOnly, async (req, res) => {
  try {
    const { monthlyCapAmount, reason } = req.body;
    const tenantId = getTenantId(req);
    const actorId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    if (!monthlyCapAmount || monthlyCapAmount < 0) {
      return res.status(400).json({ ok: false, error: 'Valid monthly cap amount required' });
    }

    const updated = await spendControlService.updateSpendCap(
      tenantId,
      monthlyCapAmount,
      reason || 'Admin updated spend limit',
      actorId
    );

    res.json({
      ok: true,
      message: `Monthly spend limit updated to ₹${monthlyCapAmount}`,
      spendLimits: {
        monthlyCapAmount: parseFloat(updated.monthly_cap_amount),
        currentMonthSpend: parseFloat(updated.current_month_spend),
        previousCap: parseFloat(updated.previous_cap || 0),
      },
    });
  } catch (error) {
    console.error('[MicroUnlock] Spend limit update error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update spend limit' });
  }
});

// ============================================================================
// BLOCKED USERS ROUTES (ADMIN DASHBOARD)
// ============================================================================

/**
 * GET /api/micro-unlock/admin/blocked-users
 * Get blocked users summary (Usage Pressure Signals)
 */
router.get('/admin/blocked-users', ...adminOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const summary = await spendControlService.getBlockedUsersSummary(tenantId);

    res.json({
      ok: true,
      blockedUsers: summary,
      totalBlocked: summary.reduce((sum, s) => sum + parseInt(s.users_blocked || 0, 10), 0),
    });
  } catch (error) {
    console.error('[MicroUnlock] Blocked users error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch blocked users' });
  }
});

/**
 * GET /api/micro-unlock/admin/blocked-users/details
 * Get detailed blocked users report
 */
router.get('/admin/blocked-users/details', ...adminOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { period = 'today', featureKey, limit = 50 } = req.query;

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const blocks = await spendControlService.getBlockedUsersReport(tenantId, {
      period,
      featureKey,
      limit: parseInt(limit, 10),
    });

    res.json({
      ok: true,
      blocks,
      count: blocks.length,
    });
  } catch (error) {
    console.error('[MicroUnlock] Blocked users details error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch blocked users details' });
  }
});

// ============================================================================
// GRACE PERIOD ROUTES (ADMIN)
// ============================================================================

/**
 * GET /api/micro-unlock/admin/grace-periods
 * Get active grace periods for tenant
 */
router.get('/admin/grace-periods', ...adminOnly, async (req, res) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Tenant context required' });
    }

    const gracePeriods = await spendControlService.getActiveGracePeriods(tenantId);

    res.json({
      ok: true,
      gracePeriods,
      count: gracePeriods.length,
    });
  } catch (error) {
    console.error('[MicroUnlock] Grace periods error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch grace periods' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
