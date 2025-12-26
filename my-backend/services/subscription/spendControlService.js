/**
 * BISMAN ERP - Spend Control & Block Tracking Service
 * 
 * Manages tenant spending limits and tracks blocked user events.
 * Implements the "Fair to users, Controlled for finance" principle.
 * 
 * @module services/subscription/spendControlService
 */

const { getPrisma } = require('../../lib/prisma');

// ============================================================================
// SPEND LIMITS MANAGEMENT
// ============================================================================

/**
 * Get or create spend limit settings for a tenant
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<Object>} Spend limit settings
 */
async function getSpendLimits(tenantId) {
  const prisma = getPrisma();
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  let [limits] = await prisma.$queryRaw`
    SELECT 
      id,
      tenant_id,
      monthly_cap_amount,
      current_month_spend,
      billing_month,
      alert_threshold_pct,
      alert_sent_at,
      cap_reached_at,
      previous_cap,
      cap_change_reason,
      (current_month_spend / NULLIF(monthly_cap_amount, 0) * 100) as spend_percentage,
      (monthly_cap_amount - current_month_spend) as remaining_budget
    FROM tenant_spend_limits
    WHERE tenant_id = ${tenantId}::uuid
  `;

  // Create default if not exists
  if (!limits) {
    await prisma.$queryRaw`
      INSERT INTO tenant_spend_limits (tenant_id, billing_month, monthly_cap_amount)
      VALUES (${tenantId}::uuid, ${currentMonth}, 5000.00)
      ON CONFLICT (tenant_id) DO NOTHING
    `;
    
    [limits] = await prisma.$queryRaw`
      SELECT 
        id,
        tenant_id,
        monthly_cap_amount,
        current_month_spend,
        billing_month,
        alert_threshold_pct,
        (current_month_spend / NULLIF(monthly_cap_amount, 0) * 100) as spend_percentage,
        (monthly_cap_amount - current_month_spend) as remaining_budget
      FROM tenant_spend_limits
      WHERE tenant_id = ${tenantId}::uuid
    `;
  }

  // Reset if new month
  if (limits && limits.billing_month !== currentMonth) {
    await prisma.$queryRaw`
      UPDATE tenant_spend_limits
      SET 
        current_month_spend = 0,
        billing_month = ${currentMonth},
        alert_sent_at = NULL,
        cap_reached_at = NULL,
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
    `;
    limits.current_month_spend = 0;
    limits.billing_month = currentMonth;
    limits.spend_percentage = 0;
    limits.remaining_budget = limits.monthly_cap_amount;
  }

  return limits;
}

/**
 * Check if a new unlock would exceed spend limits
 * @param {string} tenantId - Tenant UUID
 * @param {number} unlockAmount - Amount of the unlock
 * @returns {Promise<Object>} Check result
 */
async function checkSpendAllowance(tenantId, unlockAmount) {
  const limits = await getSpendLimits(tenantId);
  
  const projectedSpend = parseFloat(limits.current_month_spend) + unlockAmount;
  const monthlyCapAmount = parseFloat(limits.monthly_cap_amount);
  const willExceed = projectedSpend > monthlyCapAmount;
  
  const alertThreshold = monthlyCapAmount * (limits.alert_threshold_pct / 100);
  const isNearCap = projectedSpend >= alertThreshold;

  return {
    allowed: !willExceed,
    currentSpend: parseFloat(limits.current_month_spend),
    monthlyCapAmount,
    projectedSpend,
    remainingBudget: monthlyCapAmount - parseFloat(limits.current_month_spend),
    isNearCap,
    willExceed,
    message: willExceed 
      ? `Monthly spend limit reached (₹${monthlyCapAmount.toFixed(2)}). Increase limit to unlock more services.`
      : isNearCap
        ? `Warning: You are at ${limits.spend_percentage?.toFixed(0) || 0}% of your monthly spend limit.`
        : null,
  };
}

/**
 * Add to current month spend when feature is unlocked
 * @param {string} tenantId - Tenant UUID
 * @param {number} amount - Amount to add
 * @param {string} featureKey - Feature being unlocked
 * @param {number} actorId - User performing action
 * @returns {Promise<Object>} Updated spend info
 */
async function addToMonthlySpend(tenantId, amount, featureKey, actorId) {
  const prisma = getPrisma();
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Ensure limits exist
  await getSpendLimits(tenantId);
  
  const [updated] = await prisma.$queryRaw`
    UPDATE tenant_spend_limits
    SET 
      current_month_spend = current_month_spend + ${amount},
      billing_month = ${currentMonth},
      cap_reached_at = CASE 
        WHEN current_month_spend + ${amount} >= monthly_cap_amount 
        THEN COALESCE(cap_reached_at, NOW())
        ELSE cap_reached_at
      END,
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}::uuid
    RETURNING *
  `;

  // Log audit
  await logSpendAudit(tenantId, 'spend_added', {
    amount,
    featureKey,
    newTotal: updated.current_month_spend,
  }, actorId);

  return updated;
}

/**
 * Update monthly spend cap for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {number} newCap - New monthly cap amount
 * @param {string} reason - Reason for change
 * @param {number} actorId - User making change
 * @returns {Promise<Object>} Updated limits
 */
async function updateSpendCap(tenantId, newCap, reason, actorId) {
  const prisma = getPrisma();
  
  const [current] = await prisma.$queryRaw`
    SELECT monthly_cap_amount FROM tenant_spend_limits
    WHERE tenant_id = ${tenantId}::uuid
  `;
  
  const previousCap = current?.monthly_cap_amount || 5000;
  
  const [updated] = await prisma.$queryRaw`
    INSERT INTO tenant_spend_limits (tenant_id, billing_month, monthly_cap_amount, previous_cap, cap_change_reason, set_by, set_at)
    VALUES (${tenantId}::uuid, ${new Date().toISOString().slice(0, 7)}, ${newCap}, ${previousCap}, ${reason}, ${actorId}, NOW())
    ON CONFLICT (tenant_id) DO UPDATE SET
      monthly_cap_amount = ${newCap},
      previous_cap = tenant_spend_limits.monthly_cap_amount,
      cap_change_reason = ${reason},
      set_by = ${actorId},
      set_at = NOW(),
      -- Reset cap_reached if new cap is higher than current spend
      cap_reached_at = CASE 
        WHEN ${newCap} > tenant_spend_limits.current_month_spend 
        THEN NULL 
        ELSE tenant_spend_limits.cap_reached_at 
      END,
      updated_at = NOW()
    RETURNING *
  `;

  // Log audit
  await logSpendAudit(tenantId, 'spend_limit_change', {
    previousCap,
    newCap,
    reason,
  }, actorId);

  return updated;
}

// ============================================================================
// BLOCK TRACKING
// ============================================================================

/**
 * Log when a user hits a feature limit (for admin visibility)
 * @param {string} tenantId - Tenant UUID
 * @param {number} userId - User ID
 * @param {string} featureKey - Feature key
 * @param {number} usageCount - Current usage count
 * @param {number} usageLimit - The limit that was hit
 * @returns {Promise<Object>} Block log entry
 */
async function logUserBlock(tenantId, userId, featureKey, usageCount, usageLimit) {
  const prisma = getPrisma();
  
  try {
    const [entry] = await prisma.$queryRaw`
      INSERT INTO usage_block_log (
        tenant_id, user_id, feature_key,
        usage_count_at_block, usage_limit,
        blocked_at, block_date
      ) VALUES (
        ${tenantId}::uuid, ${userId}, ${featureKey},
        ${usageCount}, ${usageLimit},
        NOW(), CURRENT_DATE
      )
      ON CONFLICT (tenant_id, user_id, feature_key, block_date) 
      DO UPDATE SET
        usage_count_at_block = GREATEST(usage_block_log.usage_count_at_block, ${usageCount}),
        blocked_at = NOW()
      RETURNING *
    `;
    return entry;
  } catch (err) {
    console.error('[spendControlService] Error logging block:', err.message);
    return null;
  }
}

/**
 * Get users blocked today/this period by feature (for admin dashboard)
 * @param {string} tenantId - Tenant UUID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Block log entries with user details
 */
async function getBlockedUsersReport(tenantId, options = {}) {
  const prisma = getPrisma();
  const { period = 'today', featureKey = null, limit = 50 } = options;
  
  // Calculate date bounds based on period
  let intervalDays;
  switch (period) {
    case 'today':
      intervalDays = 0;
      break;
    case 'yesterday':
      intervalDays = 1;
      break;
    case 'week':
      intervalDays = 7;
      break;
    case 'month':
      intervalDays = 30;
      break;
    default:
      intervalDays = 0;
  }

  // Build base query with conditional feature filter
  let blocks;
  if (featureKey) {
    blocks = await prisma.$queryRaw`
      SELECT 
        ubl.id,
        ubl.user_id,
        ubl.feature_key,
        fc.feature_name,
        fc.category as feature_category,
        ubl.usage_count_at_block,
        ubl.usage_limit,
        ubl.blocked_at,
        ubl.block_date,
        ubl.resolved_at,
        ubl.resolution_type,
        u.email as user_email,
        u.name as user_name,
        r.role_name as user_role
      FROM usage_block_log ubl
      LEFT JOIN feature_catalog fc ON fc.feature_key = ubl.feature_key
      LEFT JOIN users u ON u.id = ubl.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE ubl.tenant_id = ${tenantId}::uuid
        AND ubl.feature_key = ${featureKey}
        AND ubl.block_date >= CURRENT_DATE - (${intervalDays} || ' days')::interval
        AND ubl.resolved_at IS NULL
      ORDER BY ubl.blocked_at DESC
      LIMIT ${limit}
    `;
  } else {
    blocks = await prisma.$queryRaw`
      SELECT 
        ubl.id,
        ubl.user_id,
        ubl.feature_key,
        fc.feature_name,
        fc.category as feature_category,
        ubl.usage_count_at_block,
        ubl.usage_limit,
        ubl.blocked_at,
        ubl.block_date,
        ubl.resolved_at,
        ubl.resolution_type,
        u.email as user_email,
        u.name as user_name,
        r.role_name as user_role
      FROM usage_block_log ubl
      LEFT JOIN feature_catalog fc ON fc.feature_key = ubl.feature_key
      LEFT JOIN users u ON u.id = ubl.user_id
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE ubl.tenant_id = ${tenantId}::uuid
        AND ubl.block_date >= CURRENT_DATE - (${intervalDays} || ' days')::interval
        AND ubl.resolved_at IS NULL
      ORDER BY ubl.blocked_at DESC
      LIMIT ${limit}
    `;
  }

  return blocks;
}

/**
 * Get blocked users summary by feature (for Usage Pressure Signals)
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<Array>} Summary by feature
 */
async function getBlockedUsersSummary(tenantId) {
  const prisma = getPrisma();
  
  const summary = await prisma.$queryRaw`
    SELECT 
      ubl.feature_key,
      fc.feature_name,
      fc.icon,
      fc.base_price,
      COUNT(DISTINCT ubl.user_id) as users_blocked,
      MAX(ubl.blocked_at) as last_hit,
      CASE 
        WHEN MAX(ubl.block_date) = CURRENT_DATE THEN 'Today'
        WHEN MAX(ubl.block_date) = CURRENT_DATE - 1 THEN 'Yesterday'
        ELSE TO_CHAR(MAX(ubl.block_date), 'DD Mon')
      END as last_hit_display
    FROM usage_block_log ubl
    LEFT JOIN feature_catalog fc ON fc.feature_key = ubl.feature_key
    WHERE ubl.tenant_id = ${tenantId}::uuid
      AND ubl.block_date >= CURRENT_DATE - INTERVAL '7 days'
      AND ubl.resolved_at IS NULL
    GROUP BY ubl.feature_key, fc.feature_name, fc.icon, fc.base_price
    ORDER BY users_blocked DESC, last_hit DESC
  `;

  return summary;
}

/**
 * Mark a block as resolved (when feature is unlocked)
 * @param {string} tenantId - Tenant UUID
 * @param {string} featureKey - Feature key
 * @param {string} resolutionType - How it was resolved
 * @returns {Promise<number>} Number of records updated
 */
async function resolveBlocks(tenantId, featureKey, resolutionType = 'unlock') {
  const prisma = getPrisma();
  
  const result = await prisma.$queryRaw`
    UPDATE usage_block_log
    SET 
      resolved_at = NOW(),
      resolution_type = ${resolutionType}
    WHERE tenant_id = ${tenantId}::uuid
      AND feature_key = ${featureKey}
      AND resolved_at IS NULL
    RETURNING id
  `;

  return result.length;
}

// ============================================================================
// GRACE PERIOD MANAGEMENT
// ============================================================================

/**
 * Start a grace period for a feature (when invoice is overdue)
 * @param {string} tenantId - Tenant UUID
 * @param {string} featureKey - Feature key
 * @param {number} unlockId - Unlock record ID
 * @param {number} invoiceId - Invoice ID
 * @param {number} graceDays - Number of grace days (default 7)
 * @returns {Promise<Object>} Grace period record
 */
async function startGracePeriod(tenantId, featureKey, unlockId, invoiceId, graceDays = 7) {
  const prisma = getPrisma();
  
  const graceEnd = new Date();
  graceEnd.setDate(graceEnd.getDate() + graceDays);
  
  const [gracePeriod] = await prisma.$queryRaw`
    INSERT INTO feature_grace_periods (
      tenant_id, feature_key, unlock_id, invoice_id,
      grace_start, grace_end, grace_days, status
    ) VALUES (
      ${tenantId}::uuid, ${featureKey}, ${unlockId}, ${invoiceId},
      NOW(), ${graceEnd}, ${graceDays}, 'ACTIVE'
    )
    ON CONFLICT (tenant_id, feature_key, invoice_id) DO UPDATE SET
      grace_end = ${graceEnd},
      status = 'ACTIVE',
      updated_at = NOW()
    RETURNING *
  `;

  return gracePeriod;
}

/**
 * Check if a feature is in grace period
 * @param {string} tenantId - Tenant UUID
 * @param {string} featureKey - Feature key
 * @returns {Promise<Object|null>} Active grace period or null
 */
async function checkGracePeriod(tenantId, featureKey) {
  const prisma = getPrisma();
  
  const [gracePeriod] = await prisma.$queryRaw`
    SELECT 
      fgp.*,
      fc.feature_name,
      mui.invoice_number,
      mui.total_amount as invoice_amount,
      EXTRACT(DAY FROM (fgp.grace_end - NOW())) as days_remaining
    FROM feature_grace_periods fgp
    LEFT JOIN feature_catalog fc ON fc.feature_key = fgp.feature_key
    LEFT JOIN micro_unlock_invoices mui ON mui.id = fgp.invoice_id
    WHERE fgp.tenant_id = ${tenantId}::uuid
      AND fgp.feature_key = ${featureKey}
      AND fgp.status = 'ACTIVE'
      AND fgp.grace_end > NOW()
    ORDER BY fgp.grace_end DESC
    LIMIT 1
  `;

  return gracePeriod || null;
}

/**
 * Get all active grace periods for a tenant
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<Array>} Active grace periods
 */
async function getActiveGracePeriods(tenantId) {
  const prisma = getPrisma();
  
  const gracePeriods = await prisma.$queryRaw`
    SELECT 
      fgp.*,
      fc.feature_name,
      fc.icon,
      mui.invoice_number,
      mui.total_amount as invoice_amount,
      EXTRACT(DAY FROM (fgp.grace_end - NOW())) as days_remaining
    FROM feature_grace_periods fgp
    LEFT JOIN feature_catalog fc ON fc.feature_key = fgp.feature_key
    LEFT JOIN micro_unlock_invoices mui ON mui.id = fgp.invoice_id
    WHERE fgp.tenant_id = ${tenantId}::uuid
      AND fgp.status = 'ACTIVE'
      AND fgp.grace_end > NOW()
    ORDER BY fgp.grace_end ASC
  `;

  return gracePeriods;
}

/**
 * Resolve a grace period (payment received or expired)
 * @param {string} tenantId - Tenant UUID
 * @param {string} featureKey - Feature key
 * @param {string} resolutionType - 'payment_received', 'expired', 'waived'
 * @returns {Promise<Object>} Updated grace period
 */
async function resolveGracePeriod(tenantId, featureKey, resolutionType) {
  const prisma = getPrisma();
  
  const newStatus = resolutionType === 'payment_received' ? 'PAID' : 'EXPIRED';
  
  const [gracePeriod] = await prisma.$queryRaw`
    UPDATE feature_grace_periods
    SET 
      status = ${newStatus},
      resolved_at = NOW(),
      resolution_type = ${resolutionType},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}::uuid
      AND feature_key = ${featureKey}
      AND status = 'ACTIVE'
    RETURNING *
  `;

  // If expired, also expire the unlock
  if (resolutionType === 'expired' && gracePeriod) {
    await prisma.$queryRaw`
      UPDATE tenant_feature_unlocks
      SET 
        status = 'EXPIRED',
        disabled_at = NOW(),
        disable_reason = 'Grace period expired - payment not received',
        updated_at = NOW()
      WHERE id = ${gracePeriod.unlock_id}
    `;
  }

  return gracePeriod;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log spend-related audit entries
 */
async function logSpendAudit(tenantId, action, details, actorId) {
  const prisma = getPrisma();
  
  try {
    await prisma.$queryRaw`
      INSERT INTO micro_unlock_audit_log (
        tenant_id, action, action_category,
        target_type, target_id,
        new_values,
        actor_type, actor_id
      ) VALUES (
        ${tenantId}::uuid, ${action}, 'billing',
        'spend_limit', ${tenantId},
        ${JSON.stringify(details)}::jsonb,
        'admin', ${actorId}
      )
    `;
  } catch (err) {
    console.error('[spendControlService] Audit log error:', err.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Spend Limits
  getSpendLimits,
  checkSpendAllowance,
  addToMonthlySpend,
  updateSpendCap,

  // Block Tracking
  logUserBlock,
  getBlockedUsersReport,
  getBlockedUsersSummary,
  resolveBlocks,

  // Grace Periods
  startGracePeriod,
  checkGracePeriod,
  getActiveGracePeriods,
  resolveGracePeriod,
};
