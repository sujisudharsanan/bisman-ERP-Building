/**
 * Daily Usage Aggregation Job
 * 
 * Runs nightly to:
 * 1. Aggregate events into tenant_usage
 * 2. Calculate API calls, active users, storage
 * 3. Generate daily summaries for billing
 */

const prisma = require('../lib/prisma');
const analyticsService = require('../services/analytics/analyticsService');

// Job state
let isRunning = false;
let lastRunAt = null;
let lastRunStats = null;

/**
 * Main aggregation job
 */
async function aggregateDailyUsage(targetDate = null) {
  if (isRunning) {
    console.log('[Aggregation] Job already running, skipping');
    return { skipped: true, reason: 'already_running' };
  }

  isRunning = true;
  const startTime = Date.now();

  // Default to yesterday
  const date = targetDate || new Date();
  if (!targetDate) {
    date.setDate(date.getDate() - 1);
  }
  date.setHours(0, 0, 0, 0);

  const dateStr = date.toISOString().split('T')[0];
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);

  const stats = {
    date: dateStr,
    tenantsProcessed: 0,
    totalApiCalls: 0,
    totalActiveUsers: 0,
    errors: []
  };

  console.log(`[Aggregation] Starting daily aggregation for ${dateStr}...`);

  try {
    // Flush any pending events first
    await analyticsService.flushEvents();

    // Get all tenants with activity
    const tenantsWithActivity = await prisma.$queryRaw`
      SELECT DISTINCT tenant_id
      FROM events
      WHERE created_at >= ${date}
        AND created_at < ${nextDate}
        AND tenant_id IS NOT NULL
    `;

    console.log(`[Aggregation] Found ${tenantsWithActivity.length} tenants with activity`);

    for (const { tenant_id: tenantId } of tenantsWithActivity) {
      try {
        await aggregateTenantUsage(tenantId, date, nextDate, stats);
      } catch (error) {
        console.error(`[Aggregation] Error processing tenant ${tenantId}:`, error);
        stats.errors.push({
          tenantId,
          error: error.message
        });
      }
    }

    // Also update tenants without activity (carry forward storage)
    await updateInactiveTenantsStorage(date, tenantsWithActivity.map(t => t.tenant_id));

  } catch (error) {
    console.error('[Aggregation] Job failed:', error);
    stats.errors.push({ error: error.message });
  } finally {
    isRunning = false;
    lastRunAt = new Date();
    lastRunStats = stats;
  }

  const duration = Date.now() - startTime;
  console.log(`[Aggregation] Completed in ${duration}ms`, stats);

  return stats;
}

/**
 * Aggregate usage for a single tenant
 */
async function aggregateTenantUsage(tenantId, startDate, endDate, stats) {
  // Get API call counts
  const apiCalls = await prisma.event.count({
    where: {
      tenant_id: tenantId,
      event_type: 'api_request',
      created_at: {
        gte: startDate,
        lt: endDate
      }
    }
  });

  // Get unique active users
  const activeUsersResult = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT user_id)::int as count
    FROM events
    WHERE tenant_id = ${tenantId}::uuid
      AND created_at >= ${startDate}
      AND created_at < ${endDate}
      AND user_id IS NOT NULL
  `;
  const activeUsers = activeUsersResult[0]?.count || 0;

  // Get storage usage (sum of file uploads minus deletes)
  const storageResult = await prisma.$queryRaw`
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN event_type = 'file_upload' THEN (payload->>'fileSize')::bigint
          WHEN event_type = 'file_delete' THEN -(payload->>'fileSize')::bigint
          ELSE 0
        END
      ), 0)::bigint as net_storage
    FROM events
    WHERE tenant_id = ${tenantId}::uuid
      AND event_type IN ('file_upload', 'file_delete')
      AND created_at >= ${startDate}
      AND created_at < ${endDate}
  `;
  const netStorageChange = storageResult[0]?.net_storage || 0;

  // Get feature usage breakdown
  const featureUsage = await prisma.event.groupBy({
    by: ['event_type'],
    where: {
      tenant_id: tenantId,
      created_at: {
        gte: startDate,
        lt: endDate
      }
    },
    _count: { id: true }
  });

  const featureBreakdown = featureUsage.reduce((acc, item) => {
    acc[item.event_type] = item._count.id;
    return acc;
  }, {});

  // Get previous day's storage for cumulative calculation
  const previousUsage = await prisma.tenantUsage.findFirst({
    where: {
      tenant_id: tenantId,
      date: {
        lt: startDate
      }
    },
    orderBy: { date: 'desc' }
  });

  const currentStorageBytes = (previousUsage?.storage_bytes || 0) + netStorageChange;

  // Upsert tenant_usage
  const dateOnly = new Date(startDate);
  dateOnly.setUTCHours(0, 0, 0, 0);

  await prisma.tenantUsage.upsert({
    where: {
      tenant_id_date: {
        tenant_id: tenantId,
        date: dateOnly
      }
    },
    create: {
      tenant_id: tenantId,
      date: dateOnly,
      api_calls: apiCalls,
      storage_bytes: currentStorageBytes > 0 ? currentStorageBytes : 0,
      active_users: activeUsers,
      feature_usage: featureBreakdown
    },
    update: {
      api_calls: apiCalls,
      storage_bytes: currentStorageBytes > 0 ? currentStorageBytes : 0,
      active_users: activeUsers,
      feature_usage: featureBreakdown,
      updated_at: new Date()
    }
  });

  stats.tenantsProcessed++;
  stats.totalApiCalls += apiCalls;
  stats.totalActiveUsers += activeUsers;

  console.log(`[Aggregation] Tenant ${tenantId}: ${apiCalls} API calls, ${activeUsers} users`);
}

/**
 * Update storage for inactive tenants (carry forward from previous day)
 */
async function updateInactiveTenantsStorage(date, activeTenantIds) {
  const dateOnly = new Date(date);
  dateOnly.setUTCHours(0, 0, 0, 0);

  // Get all tenants not in active list
  const inactiveTenants = await prisma.tenant.findMany({
    where: {
      id: {
        notIn: activeTenantIds
      },
      status: 'active'
    },
    select: { id: true }
  });

  for (const tenant of inactiveTenants) {
    // Get previous storage
    const previousUsage = await prisma.tenantUsage.findFirst({
      where: {
        tenant_id: tenant.id,
        date: { lt: dateOnly }
      },
      orderBy: { date: 'desc' }
    });

    if (previousUsage && previousUsage.storage_bytes > 0) {
      // Create entry with just storage (no activity)
      await prisma.tenantUsage.upsert({
        where: {
          tenant_id_date: {
            tenant_id: tenant.id,
            date: dateOnly
          }
        },
        create: {
          tenant_id: tenant.id,
          date: dateOnly,
          api_calls: 0,
          storage_bytes: previousUsage.storage_bytes,
          active_users: 0,
          feature_usage: {}
        },
        update: {
          storage_bytes: previousUsage.storage_bytes,
          updated_at: new Date()
        }
      });
    }
  }
}

/**
 * Get aggregation job status
 */
function getJobStatus() {
  return {
    isRunning,
    lastRunAt,
    lastRunStats
  };
}

/**
 * Schedule the job with node-cron
 */
function scheduleJob() {
  try {
    const cron = require('node-cron');
    
    // Run at 2 AM every day
    cron.schedule('0 2 * * *', async () => {
      console.log('[Aggregation] Scheduled job triggered');
      await aggregateDailyUsage();
    });

    console.log('[Aggregation] Job scheduled to run at 2 AM daily');
  } catch (error) {
    console.warn('[Aggregation] node-cron not available, job not scheduled:', error.message);
  }
}

/**
 * Backfill aggregation for a date range
 */
async function backfillAggregation(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const results = [];
  
  while (start <= end) {
    console.log(`[Aggregation] Backfilling ${start.toISOString().split('T')[0]}`);
    const result = await aggregateDailyUsage(new Date(start));
    results.push(result);
    start.setDate(start.getDate() + 1);
  }
  
  return results;
}

module.exports = {
  aggregateDailyUsage,
  getJobStatus,
  scheduleJob,
  backfillAggregation
};
