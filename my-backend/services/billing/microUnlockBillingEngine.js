/**
 * BISMAN ERP - Micro-Unlock Billing Engine
 * 
 * Handles monthly billing calculations, invoice generation, and payment tracking.
 * This is designed to run as a scheduled job (cron) at the start of each month.
 * 
 * Key Features:
 * - Generate monthly invoices for all tenants with active unlocks
 * - Calculate prorated charges for mid-month unlocks
 * - Track payment status and send reminders
 * - Handle auto-renewal and expiration
 * 
 * @module services/billing/microUnlockBillingEngine
 */

const { getPrisma } = require('../../lib/prisma');
const microUnlockService = require('../subscription/microUnlockService');

// ============================================================================
// BILLING CYCLE MANAGEMENT
// ============================================================================

/**
 * Generate monthly invoices for all tenants with active unlocks
 * Should be run at the beginning of each month
 * 
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation results
 */
async function generateMonthlyInvoices(options = {}) {
  const prisma = getPrisma();
  const { dryRun = false, tenantId = null } = options;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const results = {
    processed: 0,
    invoicesGenerated: 0,
    totalRevenue: 0,
    errors: [],
    invoices: [],
  };

  try {
    // Get all tenants with active unlocks that need billing
    const tenantsWithUnlocks = await prisma.$queryRaw`
      SELECT DISTINCT tenant_id
      FROM tenant_feature_unlocks
      WHERE status = 'UNLOCKED'
        AND (billing_start_date IS NULL OR billing_start_date <= ${now})
        ${tenantId ? prisma.$queryRaw`AND tenant_id = ${tenantId}::uuid` : prisma.$queryRaw``}
    `;

    for (const tenant of tenantsWithUnlocks) {
      results.processed++;

      try {
        // Check if invoice already exists for this period
        const [existingInvoice] = await prisma.$queryRaw`
          SELECT id FROM micro_unlock_invoices
          WHERE tenant_id = ${tenant.tenant_id}::uuid
            AND billing_period_start = ${periodStart}
            AND billing_period_end = ${periodEnd}
        `;

        if (existingInvoice) {
          console.log(`[BillingEngine] Invoice already exists for tenant ${tenant.tenant_id}`);
          continue;
        }

        // Calculate bill for this tenant
        const bill = await microUnlockService.calculateMonthlyBill(tenant.tenant_id);

        if (bill.total === 0) {
          console.log(`[BillingEngine] No billable items for tenant ${tenant.tenant_id}`);
          continue;
        }

        if (dryRun) {
          results.invoices.push({
            tenantId: tenant.tenant_id,
            total: bill.total,
            lineItems: bill.lineItems.length,
            dryRun: true,
          });
          results.totalRevenue += bill.total;
          continue;
        }

        // Generate invoice
        const invoiceResult = await microUnlockService.generateInvoice(
          tenant.tenant_id,
          periodStart,
          periodEnd
        );

        if (invoiceResult.success) {
          results.invoicesGenerated++;
          results.totalRevenue += bill.total;
          results.invoices.push({
            tenantId: tenant.tenant_id,
            invoiceNumber: invoiceResult.invoice.invoice_number,
            total: bill.total,
          });
        }
      } catch (error) {
        console.error(`[BillingEngine] Error processing tenant ${tenant.tenant_id}:`, error);
        results.errors.push({
          tenantId: tenant.tenant_id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    console.error('[BillingEngine] Fatal error:', error);
    throw error;
  }

  // Log summary
  console.log('[BillingEngine] Invoice generation complete:', {
    processed: results.processed,
    generated: results.invoicesGenerated,
    totalRevenue: results.totalRevenue,
    errors: results.errors.length,
  });

  return results;
}

/**
 * Process expired unlocks (auto-renewal or expiration)
 * Should be run daily
 * 
 * @returns {Promise<Object>} Processing results
 */
async function processUnlockRenewals() {
  const prisma = getPrisma();
  const now = new Date();

  const results = {
    renewed: 0,
    expired: 0,
    errors: [],
  };

  try {
    // Get unlocks that are due for renewal (end_date is approaching)
    const expiringUnlocks = await prisma.$queryRaw`
      SELECT 
        tfu.*,
        fc.feature_name
      FROM tenant_feature_unlocks tfu
      JOIN feature_catalog fc ON fc.feature_key = tfu.feature_key
      WHERE tfu.status = 'UNLOCKED'
        AND tfu.end_date IS NOT NULL
        AND tfu.end_date <= ${new Date(now.getTime() + 24 * 60 * 60 * 1000)} -- Within 24 hours
    `;

    for (const unlock of expiringUnlocks) {
      try {
        if (unlock.auto_renew) {
          // Extend the unlock
          const newEndDate = new Date(unlock.end_date);
          newEndDate.setMonth(newEndDate.getMonth() + 1);

          await prisma.$queryRaw`
            UPDATE tenant_feature_unlocks
            SET 
              end_date = ${newEndDate},
              next_billing_date = ${newEndDate},
              updated_at = NOW()
            WHERE id = ${unlock.id}
          `;

          results.renewed++;

          // Log audit
          await microUnlockService.logAudit({
            tenantId: unlock.tenant_id,
            action: 'feature_auto_renewed',
            actionCategory: 'billing',
            targetType: 'feature',
            targetId: unlock.feature_key,
            targetName: unlock.feature_name,
            newValues: { end_date: newEndDate.toISOString() },
            actorType: 'system',
          });
        } else {
          // Expire the unlock
          await prisma.$queryRaw`
            UPDATE tenant_feature_unlocks
            SET 
              status = 'EXPIRED',
              updated_at = NOW()
            WHERE id = ${unlock.id}
          `;

          results.expired++;

          // Log audit
          await microUnlockService.logAudit({
            tenantId: unlock.tenant_id,
            action: 'feature_expired',
            actionCategory: 'billing',
            targetType: 'feature',
            targetId: unlock.feature_key,
            targetName: unlock.feature_name,
            reason: 'Auto-renewal disabled',
            actorType: 'system',
          });
        }
      } catch (error) {
        console.error(`[BillingEngine] Error processing unlock ${unlock.id}:`, error);
        results.errors.push({
          unlockId: unlock.id,
          error: error.message,
        });
      }
    }
  } catch (error) {
    console.error('[BillingEngine] Renewal processing error:', error);
    throw error;
  }

  console.log('[BillingEngine] Renewal processing complete:', results);
  return results;
}

/**
 * Check for overdue invoices and update status
 * Should be run daily
 * 
 * @returns {Promise<Object>} Processing results
 */
async function processOverdueInvoices() {
  const prisma = getPrisma();
  const now = new Date();

  const results = {
    markedOverdue: 0,
    errors: [],
  };

  try {
    // Find invoices past due date that aren't paid
    const overdueInvoices = await prisma.$queryRaw`
      UPDATE micro_unlock_invoices
      SET 
        status = 'OVERDUE',
        updated_at = NOW()
      WHERE status IN ('PENDING', 'GENERATED', 'SENT')
        AND due_date < ${now}
      RETURNING id, invoice_number, tenant_id
    `;

    results.markedOverdue = overdueInvoices.length;

    // Log each overdue invoice
    for (const invoice of overdueInvoices) {
      await microUnlockService.logAudit({
        tenantId: invoice.tenant_id,
        action: 'invoice_overdue',
        actionCategory: 'billing',
        targetType: 'invoice',
        targetId: invoice.invoice_number,
        actorType: 'system',
      });
    }
  } catch (error) {
    console.error('[BillingEngine] Overdue processing error:', error);
    throw error;
  }

  console.log('[BillingEngine] Overdue processing complete:', results);
  return results;
}

// ============================================================================
// USAGE COUNTER RESET
// ============================================================================

/**
 * Reset usage counters based on their period
 * Should be run at the start of each day
 * 
 * @returns {Promise<Object>} Reset results
 */
async function resetUsageCounters() {
  const prisma = getPrisma();
  const now = new Date();

  const results = {
    daily: 0,
    weekly: 0,
    monthly: 0,
  };

  try {
    // Reset expired daily counters
    const dailyReset = await prisma.$queryRaw`
      DELETE FROM usage_counters
      WHERE period = 'DAILY'
        AND reset_at < ${now}
      RETURNING id
    `;
    results.daily = dailyReset.length;

    // Reset expired weekly counters
    const weeklyReset = await prisma.$queryRaw`
      DELETE FROM usage_counters
      WHERE period = 'WEEKLY'
        AND reset_at < ${now}
      RETURNING id
    `;
    results.weekly = weeklyReset.length;

    // Reset expired monthly counters
    const monthlyReset = await prisma.$queryRaw`
      DELETE FROM usage_counters
      WHERE period = 'MONTHLY'
        AND reset_at < ${now}
      RETURNING id
    `;
    results.monthly = monthlyReset.length;

  } catch (error) {
    console.error('[BillingEngine] Counter reset error:', error);
    throw error;
  }

  console.log('[BillingEngine] Counter reset complete:', results);
  return results;
}

// ============================================================================
// RESOURCE CONSUMPTION SNAPSHOT
// ============================================================================

/**
 * Take a daily snapshot of resource consumption for each tenant
 * Should be run daily
 * 
 * @returns {Promise<Object>} Snapshot results
 */
async function takeResourceSnapshots() {
  const prisma = getPrisma();
  const today = new Date().toISOString().slice(0, 10);

  const results = {
    snapshotsTaken: 0,
    errors: [],
  };

  try {
    // Get all active tenants
    const tenants = await prisma.$queryRaw`
      SELECT id FROM clients WHERE is_active = TRUE
    `;

    for (const tenant of tenants) {
      try {
        // Calculate metrics (these would query actual tables)
        // For now, use placeholders
        const metrics = await calculateTenantMetrics(tenant.id);

        // Insert or update snapshot
        await prisma.$queryRaw`
          INSERT INTO resource_consumption (
            tenant_id, snapshot_date,
            total_users, active_users_30d, total_branches,
            tasks_created, payments_processed, reports_generated, reconciliations_run,
            db_storage_bytes, file_storage_bytes, api_calls_made
          ) VALUES (
            ${tenant.id}::uuid, ${today}::date,
            ${metrics.totalUsers}, ${metrics.activeUsers}, ${metrics.branches},
            ${metrics.tasks}, ${metrics.payments}, ${metrics.reports}, ${metrics.reconciliations},
            ${metrics.dbStorage}, ${metrics.fileStorage}, ${metrics.apiCalls}
          )
          ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET
            total_users = EXCLUDED.total_users,
            active_users_30d = EXCLUDED.active_users_30d,
            total_branches = EXCLUDED.total_branches,
            tasks_created = EXCLUDED.tasks_created,
            payments_processed = EXCLUDED.payments_processed,
            reports_generated = EXCLUDED.reports_generated,
            reconciliations_run = EXCLUDED.reconciliations_run,
            db_storage_bytes = EXCLUDED.db_storage_bytes,
            file_storage_bytes = EXCLUDED.file_storage_bytes,
            api_calls_made = EXCLUDED.api_calls_made
        `;

        results.snapshotsTaken++;
      } catch (error) {
        console.error(`[BillingEngine] Snapshot error for tenant ${tenant.id}:`, error);
        results.errors.push({ tenantId: tenant.id, error: error.message });
      }
    }
  } catch (error) {
    console.error('[BillingEngine] Snapshot error:', error);
    throw error;
  }

  console.log('[BillingEngine] Snapshots complete:', results);
  return results;
}

/**
 * Calculate metrics for a tenant
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<Object>} Calculated metrics
 */
async function calculateTenantMetrics(tenantId) {
  const prisma = getPrisma();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    // Count users
    const [userCount] = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE last_login > ${thirtyDaysAgo}) as active
      FROM users 
      WHERE client_id = ${tenantId}::uuid AND is_active = TRUE
    `;

    // Count branches
    const [branchCount] = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM branches
      WHERE client_id = ${tenantId}::uuid AND is_active = TRUE
    `;

    // Count tasks this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [taskCount] = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE client_id = ${tenantId}::uuid 
        AND created_at >= ${startOfMonth}
    `;

    // Sum payments this month
    const [paymentSum] = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE client_id = ${tenantId}::uuid 
        AND created_at >= ${startOfMonth}
    `;

    return {
      totalUsers: parseInt(userCount?.total || 0),
      activeUsers: parseInt(userCount?.active || 0),
      branches: parseInt(branchCount?.count || 0),
      tasks: parseInt(taskCount?.count || 0),
      payments: parseFloat(paymentSum?.total || 0),
      reports: 0, // TODO: Track report generation
      reconciliations: 0, // TODO: Track reconciliation runs
      dbStorage: 0, // TODO: Calculate DB storage
      fileStorage: 0, // TODO: Calculate file storage
      apiCalls: 0, // TODO: Track API calls
    };
  } catch (error) {
    console.error(`[BillingEngine] Metrics calculation error for ${tenantId}:`, error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      branches: 0,
      tasks: 0,
      payments: 0,
      reports: 0,
      reconciliations: 0,
      dbStorage: 0,
      fileStorage: 0,
      apiCalls: 0,
    };
  }
}

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

/**
 * Get revenue analytics for SuperAdmin dashboard
 * 
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Revenue analytics
 */
async function getRevenueAnalytics(options = {}) {
  const prisma = getPrisma();
  const { startDate, endDate, groupBy: _groupBy = 'month' } = options;
  void _groupBy; // Reserved for future use when we support different groupings

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const start = startDate || defaultStart;
  const end = endDate || now;

  try {
    // Monthly revenue
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', paid_at) as month,
        COUNT(*) as invoice_count,
        SUM(total_amount) as revenue
      FROM micro_unlock_invoices
      WHERE status = 'PAID'
        AND paid_at >= ${start}
        AND paid_at <= ${end}
      GROUP BY DATE_TRUNC('month', paid_at)
      ORDER BY month DESC
    `;

    // Revenue by feature
    const revenueByFeature = await prisma.$queryRaw`
      SELECT 
        tfu.feature_key,
        fc.feature_name,
        fc.category,
        COUNT(DISTINCT tfu.tenant_id) as tenant_count,
        SUM(tfu.price_per_month) as monthly_revenue
      FROM tenant_feature_unlocks tfu
      JOIN feature_catalog fc ON fc.feature_key = tfu.feature_key
      WHERE tfu.status = 'UNLOCKED'
      GROUP BY tfu.feature_key, fc.feature_name, fc.category
      ORDER BY monthly_revenue DESC
    `;

    // Active unlocks count
    const [unlockStats] = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_unlocks,
        COUNT(DISTINCT tenant_id) as tenants_with_unlocks,
        SUM(price_per_month) as total_mrr
      FROM tenant_feature_unlocks
      WHERE status = 'UNLOCKED'
    `;

    // Churn (unlocks disabled in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [churnStats] = await prisma.$queryRaw`
      SELECT COUNT(*) as churned
      FROM tenant_feature_unlocks
      WHERE status IN ('LOCKED', 'EXPIRED')
        AND disabled_at >= ${thirtyDaysAgo}
    `;

    return {
      monthlyRevenue: monthlyRevenue.map(r => ({
        month: r.month,
        invoiceCount: parseInt(r.invoice_count),
        revenue: parseFloat(r.revenue),
      })),
      revenueByFeature: revenueByFeature.map(r => ({
        featureKey: r.feature_key,
        featureName: r.feature_name,
        category: r.category,
        tenantCount: parseInt(r.tenant_count),
        monthlyRevenue: parseFloat(r.monthly_revenue),
      })),
      summary: {
        totalActiveUnlocks: parseInt(unlockStats?.total_unlocks || 0),
        tenantsWithUnlocks: parseInt(unlockStats?.tenants_with_unlocks || 0),
        mrr: parseFloat(unlockStats?.total_mrr || 0),
        churnedLast30Days: parseInt(churnStats?.churned || 0),
      },
    };
  } catch (error) {
    console.error('[BillingEngine] Analytics error:', error);
    throw error;
  }
}

// ============================================================================
// CRON JOB HANDLERS
// ============================================================================

/**
 * Daily billing job - run at midnight
 */
async function runDailyBillingJob() {
  console.log('[BillingEngine] Starting daily billing job...');
  
  const results = {
    timestamp: new Date().toISOString(),
    counterReset: null,
    renewals: null,
    overdue: null,
    snapshots: null,
    errors: [],
  };

  try {
    results.counterReset = await resetUsageCounters();
  } catch (error) {
    results.errors.push({ job: 'counterReset', error: error.message });
  }

  try {
    results.renewals = await processUnlockRenewals();
  } catch (error) {
    results.errors.push({ job: 'renewals', error: error.message });
  }

  try {
    results.overdue = await processOverdueInvoices();
  } catch (error) {
    results.errors.push({ job: 'overdue', error: error.message });
  }

  try {
    results.snapshots = await takeResourceSnapshots();
  } catch (error) {
    results.errors.push({ job: 'snapshots', error: error.message });
  }

  console.log('[BillingEngine] Daily billing job complete:', results);
  return results;
}

/**
 * Monthly billing job - run on 1st of each month
 */
async function runMonthlyBillingJob() {
  console.log('[BillingEngine] Starting monthly billing job...');
  
  const results = {
    timestamp: new Date().toISOString(),
    invoiceGeneration: null,
    errors: [],
  };

  try {
    results.invoiceGeneration = await generateMonthlyInvoices();
  } catch (error) {
    results.errors.push({ job: 'invoiceGeneration', error: error.message });
  }

  console.log('[BillingEngine] Monthly billing job complete:', results);
  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Invoice Generation
  generateMonthlyInvoices,
  
  // Renewal & Expiration
  processUnlockRenewals,
  processOverdueInvoices,
  
  // Usage Counters
  resetUsageCounters,
  
  // Resource Snapshots
  takeResourceSnapshots,
  calculateTenantMetrics,
  
  // Analytics
  getRevenueAnalytics,
  
  // Cron Jobs
  runDailyBillingJob,
  runMonthlyBillingJob,
};
