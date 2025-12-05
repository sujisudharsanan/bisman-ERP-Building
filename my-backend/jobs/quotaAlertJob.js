/**
 * Quota Alert Check Job
 * 
 * Runs hourly to check tenant quota usage and send alerts
 * when usage exceeds 80% threshold.
 */

const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendQuotaWarning, sendErrorBudgetLow } = require('./alertService');

// ============================================================================
// Configuration
// ============================================================================
const QUOTA_WARNING_THRESHOLD = 80; // Percentage
const ERROR_BUDGET_WARNING_THRESHOLD = 20; // Percentage remaining

// Track sent alerts to avoid duplicates (resets daily)
const sentAlerts = new Map();

// ============================================================================
// Get Tenant Admin Email
// ============================================================================
async function getTenantAdminEmail(tenantId) {
  const admin = await prisma.user.findFirst({
    where: {
      tenant_id: tenantId,
      role: 'admin',
      is_active: true
    },
    select: { email: true }
  });
  return admin?.email;
}

// ============================================================================
// Check Quota Usage for All Tenants
// ============================================================================
async function checkQuotaUsage() {
  console.log('[QuotaAlertJob] Starting quota check...');
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get all active tenants with their quotas
    const tenants = await prisma.client.findMany({
      where: {
        is_active: true,
        status: 'Active'
      },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true
      }
    });

    for (const tenant of tenants) {
      try {
        await checkTenantQuota(tenant, today);
      } catch (error) {
        console.error(`[QuotaAlertJob] Error checking tenant ${tenant.id}:`, error);
      }
    }

    console.log(`[QuotaAlertJob] Checked ${tenants.length} tenants`);
  } catch (error) {
    console.error('[QuotaAlertJob] Failed to run quota check:', error);
  }
}

// ============================================================================
// Check Individual Tenant Quota
// ============================================================================
async function checkTenantQuota(tenant, today) {
  // Get quota limits
  const quota = await prisma.tenantQuota.findUnique({
    where: { tenantId: tenant.id }
  });

  if (!quota) {
    // Use default limits based on plan
    const defaults = {
      free: { apiCallsPerDay: 5000, storageBytesLimit: 1073741824, activeUsersLimit: 10 },
      pro: { apiCallsPerDay: 50000, storageBytesLimit: 10737418240, activeUsersLimit: 25 },
      enterprise: { apiCallsPerDay: 500000, storageBytesLimit: 107374182400, activeUsersLimit: 100 }
    };
    Object.assign(quota || {}, defaults[tenant.subscriptionPlan] || defaults.free);
  }

  // Get today's usage
  const usage = await prisma.clientDailyUsage.findFirst({
    where: {
      client_id: tenant.id,
      date: new Date(today)
    }
  });

  if (!usage) return;

  const adminEmail = await getTenantAdminEmail(tenant.id);
  if (!adminEmail) return;

  // Check API calls
  const apiCallsPercent = Math.round((usage.api_calls / quota.apiCallsPerDay) * 100);
  if (apiCallsPercent >= QUOTA_WARNING_THRESHOLD) {
    const alertKey = `${tenant.id}-api-${today}`;
    if (!sentAlerts.has(alertKey)) {
      await sendQuotaWarning(
        tenant.id,
        tenant.name,
        'API Calls',
        usage.api_calls,
        quota.apiCallsPerDay,
        apiCallsPercent,
        adminEmail
      );
      sentAlerts.set(alertKey, true);
    }
  }

  // Check storage
  const storagePercent = Math.round((usage.storage_bytes_used / Number(quota.storageBytesLimit)) * 100);
  if (storagePercent >= QUOTA_WARNING_THRESHOLD) {
    const alertKey = `${tenant.id}-storage-${today}`;
    if (!sentAlerts.has(alertKey)) {
      await sendQuotaWarning(
        tenant.id,
        tenant.name,
        'Storage',
        formatBytes(usage.storage_bytes_used),
        formatBytes(Number(quota.storageBytesLimit)),
        storagePercent,
        adminEmail
      );
      sentAlerts.set(alertKey, true);
    }
  }

  // Check active users
  const usersPercent = Math.round((usage.active_users / quota.activeUsersLimit) * 100);
  if (usersPercent >= QUOTA_WARNING_THRESHOLD) {
    const alertKey = `${tenant.id}-users-${today}`;
    if (!sentAlerts.has(alertKey)) {
      await sendQuotaWarning(
        tenant.id,
        tenant.name,
        'Active Users',
        usage.active_users,
        quota.activeUsersLimit,
        usersPercent,
        adminEmail
      );
      sentAlerts.set(alertKey, true);
    }
  }
}

// ============================================================================
// Check Error Budget for All Tenants
// ============================================================================
async function checkErrorBudget() {
  console.log('[QuotaAlertJob] Starting error budget check...');

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const tenants = await prisma.client.findMany({
      where: {
        is_active: true,
        subscriptionPlan: { in: ['pro', 'enterprise'] }
      },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true
      }
    });

    for (const tenant of tenants) {
      try {
        // Get usage for last 30 days
        const usage = await prisma.clientDailyUsage.findMany({
          where: {
            client_id: tenant.id,
            date: { gte: thirtyDaysAgo }
          }
        });

        const totalRequests = usage.reduce((sum, d) => sum + (d.api_calls || 0), 0);
        const totalErrors = usage.reduce((sum, d) => sum + (d.errors || 0), 0);
        const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
        const availability = 100 - errorRate;

        // Calculate error budget
        const slaTarget = tenant.subscriptionPlan === 'enterprise' ? 99.9 : 99.5;
        const totalMinutes = 30 * 24 * 60;
        const errorBudgetMinutes = totalMinutes * (1 - slaTarget / 100);
        const downtimeMinutes = (100 - availability) / 100 * totalMinutes;
        const remaining = Math.max(0, errorBudgetMinutes - downtimeMinutes);
        const percentRemaining = Math.round((remaining / errorBudgetMinutes) * 100);

        if (percentRemaining <= ERROR_BUDGET_WARNING_THRESHOLD) {
          const today = new Date().toISOString().split('T')[0];
          const alertKey = `${tenant.id}-errorbudget-${today}`;
          
          if (!sentAlerts.has(alertKey)) {
            const adminEmail = await getTenantAdminEmail(tenant.id);
            if (adminEmail) {
              await sendErrorBudgetLow(
                tenant.id,
                tenant.name,
                percentRemaining,
                remaining.toFixed(1),
                errorBudgetMinutes.toFixed(1),
                availability.toFixed(2),
                tenant.subscriptionPlan,
                adminEmail
              );
              sentAlerts.set(alertKey, true);
            }
          }
        }
      } catch (error) {
        console.error(`[QuotaAlertJob] Error checking error budget for ${tenant.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[QuotaAlertJob] Failed to check error budgets:', error);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================
function formatBytes(bytes) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Reset sent alerts at midnight
function resetSentAlerts() {
  sentAlerts.clear();
  console.log('[QuotaAlertJob] Reset sent alerts cache');
}

// ============================================================================
// Start Scheduled Jobs
// ============================================================================
function startQuotaAlertJob() {
  // Run every hour at minute 30
  const schedule = process.env.QUOTA_ALERT_CRON || '30 * * * *';
  
  cron.schedule(schedule, async () => {
    console.log('[QuotaAlertJob] Running hourly quota check...');
    await checkQuotaUsage();
    await checkErrorBudget();
  });

  // Reset alerts at midnight
  cron.schedule('0 0 * * *', resetSentAlerts);

  console.log(`[QuotaAlertJob] Scheduled with cron: ${schedule}`);
}

// Manual trigger for testing
async function runQuotaCheck() {
  await checkQuotaUsage();
  await checkErrorBudget();
}

module.exports = {
  startQuotaAlertJob,
  runQuotaCheck,
  checkQuotaUsage,
  checkErrorBudget
};
