/**
 * BISMAN ERP - Micro-Unlock Subscription Service
 * 
 * Core service for the "Pay for freedom, not access" subscription model.
 * Handles feature catalog, usage tracking, unlock management, and billing.
 * 
 * @module services/subscription/microUnlockService
 */

const { getPrisma } = require('../../lib/prisma');

// ============================================================================
// CONSTANTS
// ============================================================================

const USAGE_PERIODS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
  LIFETIME: 'LIFETIME',
};

const UNLOCK_STATUS = {
  LOCKED: 'LOCKED',
  UNLOCKED: 'UNLOCKED',
  TRIAL: 'TRIAL',
  EXPIRED: 'EXPIRED',
};

const INVOICE_STATUS = {
  PENDING: 'PENDING',
  GENERATED: 'GENERATED',
  SENT: 'SENT',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

// ============================================================================
// FEATURE CATALOG MANAGEMENT
// ============================================================================

/**
 * Get all features in the catalog
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Feature catalog entries
 */
async function getFeatureCatalog(options = {}) {
  const prisma = getPrisma();
  const { category, activeOnly = true, includeHidden = false } = options;

  const where = {};
  if (activeOnly) where.is_active = true;
  if (category) where.category = category;
  if (!includeHidden) where.display_on_pricing = true;

  const features = await prisma.$queryRaw`
    SELECT 
      id,
      feature_key,
      feature_name,
      description,
      category,
      default_limit,
      limit_period,
      base_price,
      currency,
      is_editable,
      is_active,
      requires_approval,
      icon,
      sort_order,
      display_on_pricing
    FROM feature_catalog
    WHERE is_active = ${activeOnly}
      ${category ? prisma.$queryRaw`AND category = ${category}` : prisma.$queryRaw``}
    ORDER BY sort_order ASC, category ASC
  `;

  return features;
}

/**
 * Get a single feature by key
 * @param {string} featureKey - Feature key
 * @returns {Promise<Object|null>} Feature details
 */
async function getFeatureByKey(featureKey) {
  const prisma = getPrisma();
  
  const [feature] = await prisma.$queryRaw`
    SELECT * FROM feature_catalog 
    WHERE feature_key = ${featureKey} AND is_active = TRUE
  `;

  return feature || null;
}

/**
 * Update feature pricing (SuperAdmin only)
 * @param {string} featureKey - Feature key
 * @param {Object} updates - Updates to apply
 * @param {number} actorId - User performing the update
 * @returns {Promise<Object>} Updated feature
 */
async function updateFeature(featureKey, updates, actorId) {
  const prisma = getPrisma();
  const { base_price, default_limit, limit_period, is_active, description } = updates;

  // Get current feature for audit
  const [currentFeature] = await prisma.$queryRaw`
    SELECT * FROM feature_catalog WHERE feature_key = ${featureKey}
  `;

  if (!currentFeature) {
    throw new Error(`Feature not found: ${featureKey}`);
  }

  if (!currentFeature.is_editable && base_price !== undefined) {
    throw new Error('This feature price cannot be edited');
  }

  // Build update query dynamically
  const updateFields = [];
  const updateValues = {};

  if (base_price !== undefined) {
    updateFields.push('base_price = $base_price');
    updateValues.base_price = base_price;
  }
  if (default_limit !== undefined) {
    updateFields.push('default_limit = $default_limit');
    updateValues.default_limit = default_limit;
  }
  if (limit_period !== undefined) {
    updateFields.push('limit_period = $limit_period::usage_period_type');
    updateValues.limit_period = limit_period;
  }
  if (is_active !== undefined) {
    updateFields.push('is_active = $is_active');
    updateValues.is_active = is_active;
  }
  if (description !== undefined) {
    updateFields.push('description = $description');
    updateValues.description = description;
  }

  updateFields.push('updated_at = NOW()');
  updateFields.push('updated_by = $updated_by');
  updateValues.updated_by = actorId;

  await prisma.$queryRaw`
    UPDATE feature_catalog
    SET base_price = COALESCE(${base_price}, base_price),
        default_limit = COALESCE(${default_limit}, default_limit),
        is_active = COALESCE(${is_active}, is_active),
        description = COALESCE(${description}, description),
        updated_at = NOW(),
        updated_by = ${actorId}
    WHERE feature_key = ${featureKey}
  `;

  // Log audit
  await logAudit({
    tenantId: null,
    action: 'feature_price_change',
    actionCategory: 'admin',
    targetType: 'feature',
    targetId: featureKey,
    targetName: currentFeature.feature_name,
    oldValues: {
      base_price: currentFeature.base_price,
      default_limit: currentFeature.default_limit,
    },
    newValues: {
      base_price: base_price ?? currentFeature.base_price,
      default_limit: default_limit ?? currentFeature.default_limit,
    },
    actorType: 'super_admin',
    actorId,
  });

  return getFeatureByKey(featureKey);
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

/**
 * Check if a feature action is allowed
 * @param {string} tenantId - Tenant UUID
 * @param {number|null} userId - User ID (optional)
 * @param {string} featureKey - Feature key
 * @returns {Promise<Object>} Access check result
 */
async function checkFeatureAccess(tenantId, userId, featureKey) {
  const prisma = getPrisma();

  const [result] = await prisma.$queryRaw`
    SELECT * FROM check_feature_access(
      ${tenantId}::uuid,
      ${userId},
      ${featureKey}
    )
  `;

  if (!result) {
    return {
      allowed: false,
      reason: 'check_failed',
      message: 'Unable to check feature access',
    };
  }

  // Add friendly messages
  const messages = {
    unlocked: 'Feature is unlocked for unlimited use.',
    plan_included: 'Feature is included in your subscription plan.',
    within_limit: `You have ${result.usage_limit - result.current_usage} uses remaining today.`,
    limit_exceeded: `You've reached today's limit for this feature.`,
    feature_not_found: 'This feature is not available.',
  };

  return {
    ...result,
    message: messages[result.reason] || 'Unknown status',
    canUnlock: result.reason === 'limit_exceeded',
  };
}

/**
 * Record feature usage
 * @param {string} tenantId - Tenant UUID
 * @param {number|null} userId - User ID
 * @param {string} featureKey - Feature key
 * @param {number} count - Usage count (default 1)
 * @returns {Promise<Object>} Updated usage counter
 */
async function recordUsage(tenantId, userId, featureKey, count = 1) {
  const prisma = getPrisma();

  const [counter] = await prisma.$queryRaw`
    SELECT * FROM increment_usage_counter(
      ${tenantId}::uuid,
      ${userId},
      ${featureKey},
      ${count}
    )
  `;

  return counter;
}

/**
 * Get usage summary for a tenant
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<Array>} Usage summary by feature
 */
async function getUsageSummary(tenantId) {
  const prisma = getPrisma();

  const usage = await prisma.$queryRaw`
    SELECT 
      fc.feature_key,
      fc.feature_name,
      fc.category,
      fc.default_limit,
      fc.limit_period,
      fc.base_price,
      fc.icon,
      COALESCE(uc.usage_count, 0) as current_usage,
      COALESCE(uc.total_lifetime_usage, 0) as lifetime_usage,
      uc.reset_at,
      CASE 
        WHEN tfu.status = 'UNLOCKED' THEN 'UNLOCKED'
        WHEN uc.usage_count >= fc.default_limit AND fc.default_limit > 0 THEN 'LIMITED'
        WHEN uc.usage_count >= fc.default_limit * 0.8 THEN 'NEAR_LIMIT'
        ELSE 'OK'
      END as status,
      tfu.status as unlock_status,
      tfu.price_per_month as unlock_price,
      tfu.auto_renew
    FROM feature_catalog fc
    LEFT JOIN usage_counters uc ON 
      uc.feature_key = fc.feature_key 
      AND uc.tenant_id = ${tenantId}::uuid
      AND uc.period = fc.limit_period
      AND uc.period_start = DATE_TRUNC(
        CASE fc.limit_period
          WHEN 'DAILY' THEN 'day'
          WHEN 'WEEKLY' THEN 'week'
          WHEN 'MONTHLY' THEN 'month'
          WHEN 'YEARLY' THEN 'year'
          ELSE 'day'
        END, NOW()
      )
    LEFT JOIN tenant_feature_unlocks tfu ON 
      tfu.feature_key = fc.feature_key 
      AND tfu.tenant_id = ${tenantId}::uuid
      AND tfu.status = 'UNLOCKED'
    WHERE fc.is_active = TRUE
    ORDER BY fc.sort_order ASC
  `;

  return usage;
}

// ============================================================================
// FEATURE UNLOCK MANAGEMENT
// ============================================================================

/**
 * Unlock a feature for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {string} featureKey - Feature key
 * @param {Object} options - Unlock options
 * @param {number} actorId - User performing the unlock
 * @returns {Promise<Object>} Unlock result
 */
async function unlockFeature(tenantId, featureKey, options, actorId) {
  const prisma = getPrisma();
  const { 
    autoRenew = true, 
    customPrice = null, 
    isOverride = false, 
    overrideReason = null,
    overrideExpiresAt = null,  // NEW: Support for temporary overrides
  } = options;

  // Get feature details
  const feature = await getFeatureByKey(featureKey);
  if (!feature) {
    throw new Error(`Feature not found: ${featureKey}`);
  }

  if (feature.requires_approval && !isOverride) {
    throw new Error('This feature requires SuperAdmin approval to unlock');
  }

  // Calculate billing dates
  const now = new Date();
  const billingStartDate = new Date(now);
  billingStartDate.setMonth(billingStartDate.getMonth() + 1); // Start billing after 1 month
  
  const nextBillingDate = new Date(billingStartDate);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const price = customPrice ?? feature.base_price;
  
  // For overrides, calculate end_date from overrideExpiresAt
  const endDate = overrideExpiresAt ? new Date(overrideExpiresAt) : null;

  // Insert or update unlock
  await prisma.$queryRaw`
    INSERT INTO tenant_feature_unlocks (
      tenant_id, feature_key, status, price_per_month, currency,
      start_date, end_date, auto_renew, billing_start_date, next_billing_date,
      is_override, override_reason, override_by, override_expires_at,
      unlocked_by, unlocked_at
    ) VALUES (
      ${tenantId}::uuid, ${featureKey}, 'UNLOCKED', ${price}, 'INR',
      NOW(), ${endDate}, ${autoRenew}, ${isOverride ? null : billingStartDate}, ${isOverride ? null : nextBillingDate},
      ${isOverride}, ${overrideReason}, ${isOverride ? actorId : null}, ${endDate},
      ${actorId}, NOW()
    )
    ON CONFLICT (tenant_id, feature_key) DO UPDATE SET
      status = 'UNLOCKED',
      price_per_month = ${price},
      auto_renew = ${autoRenew},
      start_date = NOW(),
      end_date = ${endDate},
      billing_start_date = CASE WHEN ${isOverride} THEN NULL ELSE ${billingStartDate} END,
      next_billing_date = CASE WHEN ${isOverride} THEN NULL ELSE ${nextBillingDate} END,
      is_override = ${isOverride},
      override_reason = ${overrideReason},
      override_by = ${isOverride ? actorId : null},
      override_expires_at = ${endDate},
      unlocked_by = ${actorId},
      unlocked_at = NOW(),
      disabled_at = NULL,
      disabled_by = NULL,
      disable_reason = NULL,
      updated_at = NOW()
  `;

  // Build response message
  let message;
  if (isOverride && endDate) {
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    message = `${feature.feature_name} unlocked (temporary override). Expires in ${daysUntilExpiry} days.`;
  } else {
    message = `${feature.feature_name} unlocked! Service starts immediately. First billing on ${billingStartDate.toLocaleDateString()}.`;
  }

  return {
    success: true,
    featureKey,
    featureName: feature.feature_name,
    pricePerMonth: isOverride ? 0 : price,
    billingStartDate: isOverride ? null : billingStartDate,
    isTemporaryOverride: isOverride && !!endDate,
    expiresAt: endDate,
    message,
  };
}

/**
 * Disable/lock a feature for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {string} featureKey - Feature key
 * @param {string} reason - Reason for disabling
 * @param {number} actorId - User performing the action
 * @returns {Promise<Object>} Result
 */
async function disableFeature(tenantId, featureKey, reason, actorId) {
  const prisma = getPrisma();

  await prisma.$queryRaw`
    UPDATE tenant_feature_unlocks
    SET 
      status = 'LOCKED',
      disabled_at = NOW(),
      disabled_by = ${actorId},
      disable_reason = ${reason},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}::uuid AND feature_key = ${featureKey}
  `;

  return {
    success: true,
    featureKey,
    message: 'Feature disabled. You can re-enable it anytime.',
  };
}

/**
 * Get all unlocked features for a tenant
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<Array>} Unlocked features
 */
async function getUnlockedFeatures(tenantId) {
  const prisma = getPrisma();

  const unlocks = await prisma.$queryRaw`
    SELECT 
      tfu.*,
      fc.feature_name,
      fc.description,
      fc.category,
      fc.icon
    FROM tenant_feature_unlocks tfu
    JOIN feature_catalog fc ON fc.feature_key = tfu.feature_key
    WHERE tfu.tenant_id = ${tenantId}::uuid
      AND tfu.status = 'UNLOCKED'
    ORDER BY tfu.unlocked_at DESC
  `;

  return unlocks;
}

// ============================================================================
// BILLING MANAGEMENT
// ============================================================================

/**
 * Calculate monthly bill for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {Date} periodStart - Optional billing period start (defaults to start of current month)
 * @param {Date} periodEnd - Optional billing period end (defaults to end of current month)
 * @returns {Promise<Object>} Billing summary with proration
 */
async function calculateMonthlyBill(tenantId, periodStart = null, periodEnd = null) {
  const prisma = getPrisma();

  // Calculate billing period
  const now = new Date();
  const monthStart = periodStart || new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Get tenant's subscription from client_subscriptions (new system) with fallback to old tenant_subscription
  let subscription = null;
  
  // Try new subscription system first (client_subscriptions + subscription_plans)
  const [newSub] = await prisma.$queryRaw`
    SELECT 
      cs.id,
      cs.plan_id,
      cs.state,
      cs.billing_cycle,
      cs.is_active,
      sp.name as plan_name,
      sp.price_monthly as base_price_monthly
    FROM client_subscriptions cs
    LEFT JOIN subscription_plans sp ON sp.id = cs.plan_id
    WHERE cs.client_id = ${tenantId}::uuid
  `;
  
  if (newSub) {
    subscription = newSub;
  } else {
    // Fallback to old micro_subscription_plans system
    const [oldSub] = await prisma.$queryRaw`
      SELECT 
        ts.*,
        msp.plan_name,
        msp.base_price_monthly
      FROM tenant_subscription ts
      LEFT JOIN micro_subscription_plans msp ON msp.id = ts.plan_id
      WHERE ts.tenant_id = ${tenantId}::uuid AND ts.is_active = TRUE
    `;
    subscription = oldSub;
  }

  // Get all active unlocks with proration data
  // Note: Temporary overrides (is_override=TRUE with price>0) ARE billed but prorated
  // Free overrides (is_override=TRUE with custom price=0) are NOT billed
  const unlocks = await prisma.$queryRaw`
    SELECT 
      tfu.feature_key,
      tfu.price_per_month,
      fc.feature_name,
      tfu.start_date,
      tfu.end_date,
      tfu.billing_start_date,
      tfu.is_override,
      tfu.override_reason,
      -- Calculate days active in the billing period
      GREATEST(0, 
        EXTRACT(DAY FROM 
          LEAST(${monthEnd}, COALESCE(tfu.end_date, ${monthEnd})) - 
          GREATEST(${monthStart}, tfu.start_date)
        ) + 1
      )::INT as days_active
    FROM tenant_feature_unlocks tfu
    JOIN feature_catalog fc ON fc.feature_key = tfu.feature_key
    WHERE tfu.tenant_id = ${tenantId}::uuid
      AND tfu.status = 'UNLOCKED'
      AND tfu.price_per_month > 0  -- Only bill features with price > 0 (free overrides excluded)
      AND (tfu.billing_start_date IS NULL OR tfu.billing_start_date <= ${monthEnd})
      AND tfu.start_date <= ${monthEnd}
    ORDER BY fc.sort_order
  `;

  // Calculate totals with proration
  const basePlanAmount = parseFloat(subscription?.base_price_monthly || 0);
  
  // Build line items with proration
  const lineItems = [];
  let unlockAmount = 0;

  if (basePlanAmount > 0) {
    lineItems.push({
      type: 'base_plan',
      name: subscription?.plan_name || 'Base Plan',
      amount: basePlanAmount,
      daysActive: daysInMonth,
      proration: 1.0,
    });
  }

  unlocks.forEach(unlock => {
    const daysActive = parseInt(unlock.days_active, 10) || daysInMonth;
    const proration = daysActive / daysInMonth;
    const proratedAmount = parseFloat(unlock.price_per_month) * proration;
    
    unlockAmount += proratedAmount;
    
    // Build descriptive name for temporary overrides
    const isTemporary = unlock.is_override && unlock.end_date;
    const itemName = isTemporary 
      ? `${unlock.feature_name} (Temporary)` 
      : `${unlock.feature_name} Unlock`;
    
    lineItems.push({
      type: isTemporary ? 'temporary_override' : 'feature_unlock',
      featureKey: unlock.feature_key,
      name: itemName,
      unitPrice: parseFloat(unlock.price_per_month),
      daysActive,
      totalDays: daysInMonth,
      proration: Math.round(proration * 10000) / 10000, // 4 decimal places
      amount: Math.round(proratedAmount * 100) / 100,   // 2 decimal places
      billingStart: unlock.billing_start_date || unlock.start_date,
      billingEnd: unlock.end_date || null,
      isTemporary,
      overrideReason: unlock.override_reason || null,
    });
  });

  const subtotal = basePlanAmount + unlockAmount;

  return {
    tenantId,
    planName: subscription?.plan_name || 'Experience',
    billingCycle: subscription?.billing_cycle || 'MONTHLY',
    basePlanAmount,
    unlockAmount,
    subtotal,
    discount: 0,
    tax: 0,
    total: subtotal,
    currency: 'INR',
    lineItems,
    activeUnlocks: unlocks.length,
    nextBillingDate: subscription?.next_payment_date,
  };
}

/**
 * Generate invoice for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {Date} periodStart - Billing period start
 * @param {Date} periodEnd - Billing period end
 * @param {Object} options - Invoice options
 * @returns {Promise<Object>} Generated invoice
 */
async function generateInvoice(tenantId, periodStart, periodEnd, options = {}) {
  const prisma = getPrisma();
  const { paymentDueDays = 10 } = options; // Default: 10 days to pay

  // Calculate bill for the specific period
  const bill = await calculateMonthlyBill(tenantId, periodStart, periodEnd);

  if (bill.total === 0) {
    return { success: false, message: 'No billable items for this period' };
  }

  // Generate invoice number
  const yearMonth = periodStart.toISOString().slice(0, 7).replace('-', '');
  const [countResult] = await prisma.$queryRaw`
    SELECT COUNT(*) + 1 as next_num 
    FROM micro_unlock_invoices 
    WHERE invoice_number LIKE ${'MU-' + yearMonth + '%'}
  `;
  const invoiceNumber = `MU-${yearMonth}-${String(countResult.next_num).padStart(5, '0')}`;

  // Calculate due date (configurable, default 10 days)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentDueDays);

  // Insert invoice
  const [invoice] = await prisma.$queryRaw`
    INSERT INTO micro_unlock_invoices (
      invoice_number, tenant_id,
      billing_period_start, billing_period_end,
      subtotal, discount_amount, tax_amount, total_amount,
      currency, line_items, status, invoice_date, due_date
    ) VALUES (
      ${invoiceNumber}, ${tenantId}::uuid,
      ${periodStart}, ${periodEnd},
      ${bill.subtotal}, ${bill.discount}, ${bill.tax}, ${bill.total},
      ${bill.currency}, ${JSON.stringify(bill.lineItems)}::jsonb,
      'GENERATED', NOW(), ${dueDate}
    )
    RETURNING *
  `;

  // Log audit
  await logAudit({
    tenantId,
    action: 'invoice_generated',
    actionCategory: 'billing',
    targetType: 'invoice',
    targetId: invoiceNumber,
    newValues: { total: bill.total, items: bill.lineItems.length, dueDays: paymentDueDays },
    actorType: 'system',
  });

  return {
    success: true,
    invoice: {
      ...invoice,
      line_items: bill.lineItems,
    },
  };
}

/**
 * Get billing history for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Invoice history
 */
async function getBillingHistory(tenantId, options = {}) {
  const prisma = getPrisma();
  const { limit = 12, status } = options;

  const invoices = await prisma.$queryRaw`
    SELECT 
      id, invoice_number, 
      billing_period_start, billing_period_end,
      subtotal, discount_amount, tax_amount, total_amount,
      currency, status, invoice_date, due_date, paid_at,
      payment_method, pdf_url,
      line_items
    FROM micro_unlock_invoices
    WHERE tenant_id = ${tenantId}::uuid
      ${status ? prisma.$queryRaw`AND status = ${status}::micro_invoice_status` : prisma.$queryRaw``}
    ORDER BY invoice_date DESC
    LIMIT ${limit}
  `;

  return invoices;
}

/**
 * Record payment for an invoice
 * @param {string} invoiceNumber - Invoice number
 * @param {Object} paymentDetails - Payment details
 * @param {number} actorId - User recording payment
 * @returns {Promise<Object>} Updated invoice
 */
async function recordPayment(invoiceNumber, paymentDetails, actorId) {
  const prisma = getPrisma();
  const { paymentMethod, paymentReference, notes } = paymentDetails;

  const [invoice] = await prisma.$queryRaw`
    UPDATE micro_unlock_invoices
    SET 
      status = 'PAID',
      paid_at = NOW(),
      payment_method = ${paymentMethod},
      payment_reference = ${paymentReference},
      payment_notes = ${notes},
      updated_at = NOW()
    WHERE invoice_number = ${invoiceNumber}
    RETURNING *
  `;

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Log audit
  await logAudit({
    tenantId: invoice.tenant_id,
    action: 'payment_received',
    actionCategory: 'billing',
    targetType: 'invoice',
    targetId: invoiceNumber,
    newValues: { 
      amount: invoice.total_amount,
      method: paymentMethod,
      reference: paymentReference,
    },
    actorType: 'admin',
    actorId,
  });

  return invoice;
}

// ============================================================================
// RESOURCE CONSUMPTION
// ============================================================================

/**
 * Get resource consumption for a tenant
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<Object>} Resource consumption data
 */
async function getResourceConsumption(tenantId) {
  const prisma = getPrisma();

  // Get latest snapshot or calculate live
  const [snapshot] = await prisma.$queryRaw`
    SELECT * FROM resource_consumption
    WHERE tenant_id = ${tenantId}::uuid
    ORDER BY snapshot_date DESC
    LIMIT 1
  `;

  if (snapshot && snapshot.snapshot_date === new Date().toISOString().slice(0, 10)) {
    return snapshot;
  }

  // Calculate live metrics (this would query actual tables)
  // For now, return snapshot or defaults
  return snapshot || {
    tenant_id: tenantId,
    snapshot_date: new Date().toISOString().slice(0, 10),
    total_users: 0,
    active_users_30d: 0,
    total_branches: 0,
    tasks_created: 0,
    payments_processed: 0,
    reports_generated: 0,
    reconciliations_run: 0,
    db_storage_bytes: 0,
    file_storage_bytes: 0,
    api_calls_made: 0,
  };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log an audit event
 * @param {Object} entry - Audit entry
 */
async function logAudit(entry) {
  const prisma = getPrisma();

  await prisma.$queryRaw`
    INSERT INTO micro_unlock_audit_log (
      tenant_id, action, action_category,
      target_type, target_id, target_name,
      old_values, new_values, reason,
      actor_type, actor_id, actor_email, actor_name
    ) VALUES (
      ${entry.tenantId}::uuid,
      ${entry.action},
      ${entry.actionCategory},
      ${entry.targetType || null},
      ${entry.targetId || null},
      ${entry.targetName || null},
      ${entry.oldValues ? JSON.stringify(entry.oldValues) : null}::jsonb,
      ${entry.newValues ? JSON.stringify(entry.newValues) : null}::jsonb,
      ${entry.reason || null},
      ${entry.actorType},
      ${entry.actorId || null},
      ${entry.actorEmail || null},
      ${entry.actorName || null}
    )
  `;
}

/**
 * Get audit log for a tenant
 * @param {string} tenantId - Tenant UUID (optional)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Audit log entries
 */
async function getAuditLog(tenantId, options = {}) {
  const prisma = getPrisma();
  const { limit = 50, category, action } = options;

  const logs = await prisma.$queryRaw`
    SELECT * FROM micro_unlock_audit_log
    WHERE (${tenantId}::uuid IS NULL OR tenant_id = ${tenantId}::uuid)
      ${category ? prisma.$queryRaw`AND action_category = ${category}` : prisma.$queryRaw``}
      ${action ? prisma.$queryRaw`AND action = ${action}` : prisma.$queryRaw``}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return logs;
}

// ============================================================================
// SUBSCRIPTION PLAN MANAGEMENT (SuperAdmin)
// ============================================================================

/**
 * Get all subscription plans
 * @returns {Promise<Array>} Subscription plans
 */
async function getSubscriptionPlans() {
  const prisma = getPrisma();

  const plans = await prisma.$queryRaw`
    SELECT * FROM micro_subscription_plans
    WHERE is_active = TRUE
    ORDER BY sort_order ASC
  `;

  return plans;
}

/**
 * Create or update a subscription plan
 * @param {Object} planData - Plan data
 * @param {number} actorId - User creating/updating
 * @returns {Promise<Object>} Created/updated plan
 */
async function upsertSubscriptionPlan(planData, actorId) {
  const prisma = getPrisma();
  const {
    plan_code,
    plan_name,
    description,
    base_price_monthly = 0,
    base_price_yearly = 0,
    included_features = [],
    feature_price_overrides = {},
    limit_multipliers = {},
    is_public = true,
    sort_order = 0,
    badge_text = null,
    is_popular = false,
  } = planData;

  const [plan] = await prisma.$queryRaw`
    INSERT INTO micro_subscription_plans (
      plan_code, plan_name, description,
      base_price_monthly, base_price_yearly, currency,
      included_features, feature_price_overrides, limit_multipliers,
      is_public, sort_order, badge_text, is_popular,
      created_by, updated_by
    ) VALUES (
      ${plan_code}, ${plan_name}, ${description},
      ${base_price_monthly}, ${base_price_yearly}, 'INR',
      ${JSON.stringify(included_features)}::jsonb,
      ${JSON.stringify(feature_price_overrides)}::jsonb,
      ${JSON.stringify(limit_multipliers)}::jsonb,
      ${is_public}, ${sort_order}, ${badge_text}, ${is_popular},
      ${actorId}, ${actorId}
    )
    ON CONFLICT (plan_code) DO UPDATE SET
      plan_name = EXCLUDED.plan_name,
      description = EXCLUDED.description,
      base_price_monthly = EXCLUDED.base_price_monthly,
      base_price_yearly = EXCLUDED.base_price_yearly,
      included_features = EXCLUDED.included_features,
      feature_price_overrides = EXCLUDED.feature_price_overrides,
      limit_multipliers = EXCLUDED.limit_multipliers,
      is_public = EXCLUDED.is_public,
      sort_order = EXCLUDED.sort_order,
      badge_text = EXCLUDED.badge_text,
      is_popular = EXCLUDED.is_popular,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING *
  `;

  // Log audit
  await logAudit({
    tenantId: null,
    action: 'plan_upsert',
    actionCategory: 'admin',
    targetType: 'plan',
    targetId: plan_code,
    targetName: plan_name,
    newValues: planData,
    actorType: 'super_admin',
    actorId,
  });

  return plan;
}

/**
 * Assign a plan to a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {number} planId - Plan ID
 * @param {number} actorId - User assigning
 * @returns {Promise<Object>} Assignment result
 */
async function assignPlanToTenant(tenantId, planId, actorId) {
  const prisma = getPrisma();

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.$queryRaw`
    INSERT INTO tenant_subscription (
      tenant_id, plan_id, billing_cycle, billing_day,
      current_period_start, current_period_end,
      payment_status, next_payment_date,
      created_by
    ) VALUES (
      ${tenantId}::uuid, ${planId}, 'MONTHLY', 1,
      ${now}, ${periodEnd},
      'PENDING', ${periodEnd},
      ${actorId}
    )
    ON CONFLICT (tenant_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      next_payment_date = EXCLUDED.next_payment_date,
      updated_at = NOW()
  `;

  return { success: true, tenantId, planId };
}

// ============================================================================
// OVERRIDE EXPIRY & CRON UTILITIES
// ============================================================================

/**
 * Expire all overrides that have passed their expiry date
 * Called by cron job daily
 * @returns {Promise<Object>} Expiry results
 */
async function expireOverrides() {
  const prisma = getPrisma();
  
  // Find and expire overrides
  const expired = await prisma.$queryRaw`
    UPDATE tenant_feature_unlocks
    SET 
      status = 'EXPIRED',
      disabled_at = NOW(),
      disable_reason = 'Override period expired automatically'
    WHERE is_override = TRUE
      AND status = 'UNLOCKED'
      AND override_expires_at IS NOT NULL
      AND override_expires_at <= NOW()
    RETURNING tenant_id, feature_key, override_reason, override_expires_at
  `;

  // Log each expiry
  for (const unlock of expired) {
    await logAudit({
      tenantId: unlock.tenant_id,
      action: 'override_expired',
      actionCategory: 'system',
      targetType: 'feature',
      targetId: unlock.feature_key,
      oldValues: { status: 'UNLOCKED', override_expires_at: unlock.override_expires_at },
      newValues: { status: 'EXPIRED' },
      reason: 'Automatic expiry of temporary override',
      actorType: 'system',
    });
  }

  console.log(`[MicroUnlock] Expired ${expired.length} overrides`);
  return { expired: expired.length, details: expired };
}

/**
 * Get upcoming override expirations for admin notification
 * @param {number} daysAhead - How many days to look ahead
 * @returns {Promise<Array>} Upcoming expirations
 */
async function getUpcomingExpirations(daysAhead = 7) {
  const prisma = getPrisma();
  
  const upcoming = await prisma.$queryRaw`
    SELECT 
      tfu.tenant_id,
      c.company_name as tenant_name,
      tfu.feature_key,
      fc.feature_name,
      tfu.override_reason,
      tfu.override_expires_at,
      EXTRACT(DAY FROM (tfu.override_expires_at - NOW())) as days_remaining
    FROM tenant_feature_unlocks tfu
    JOIN clients c ON c.id = tfu.tenant_id
    JOIN feature_catalog fc ON fc.feature_key = tfu.feature_key
    WHERE tfu.is_override = TRUE
      AND tfu.status = 'UNLOCKED'
      AND tfu.override_expires_at IS NOT NULL
      AND tfu.override_expires_at <= NOW() + (${daysAhead} || ' days')::interval
      AND tfu.override_expires_at > NOW()
    ORDER BY tfu.override_expires_at ASC
  `;

  return upcoming;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  USAGE_PERIODS,
  UNLOCK_STATUS,
  INVOICE_STATUS,

  // Feature Catalog
  getFeatureCatalog,
  getFeatureByKey,
  updateFeature,

  // Usage Tracking
  checkFeatureAccess,
  recordUsage,
  getUsageSummary,

  // Feature Unlocks
  unlockFeature,
  disableFeature,
  getUnlockedFeatures,

  // Billing
  calculateMonthlyBill,
  generateInvoice,
  getBillingHistory,
  recordPayment,

  // Resource Consumption
  getResourceConsumption,

  // Audit
  logAudit,
  getAuditLog,

  // Plans
  getSubscriptionPlans,
  upsertSubscriptionPlan,
  assignPlanToTenant,
  
  // Override Management (NEW)
  expireOverrides,
  getUpcomingExpirations,
};
