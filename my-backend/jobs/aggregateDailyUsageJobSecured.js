/**
 * Daily Usage Aggregation Job - RLS-SECURED VERSION
 * ==================================================
 * 
 * SECURITY: Uses BackgroundJobRLS for tenant-isolated database access
 * 
 * Runs nightly to:
 * 1. Aggregate events into daily usage records
 * 2. Calculate API calls, active users, storage
 * 3. Generate daily summaries for billing
 * 
 * @module jobs/aggregateDailyUsageJobSecured
 */

const { Pool } = require('pg');
const { runWithRLSContext } = require('../security/BackgroundJobRLS');

// Database connection
const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// Job state
let isRunning = false;
let lastRunAt = null;
let lastRunStats = null;

// System user for audit
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || 1;

/**
 * Main aggregation job - RLS-secured
 */
async function aggregateDailyUsageSecured(targetDate = null) {
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

  console.log(`[Aggregation] Starting RLS-secured daily aggregation for ${dateStr}...`);

  const adminPool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Get all active tenants with activity (platform query)
    const tenantsWithActivity = await adminPool.query(`
      SELECT DISTINCT c.id as tenant_id, c.company_name
      FROM clients c
      WHERE c.is_active = true
      ORDER BY c.id
      LIMIT 500
    `);

    console.log(`[Aggregation] Processing ${tenantsWithActivity.rows.length} tenants`);

    // Process each tenant with RLS context
    for (const { tenant_id: tenantId, company_name } of tenantsWithActivity.rows) {
      try {
        await aggregateTenantUsageSecured(tenantId, date, nextDate, stats);
        stats.tenantsProcessed++;
      } catch (error) {
        console.error(`[Aggregation] Error for tenant ${tenantId}:`, error.message);
        stats.errors.push({
          tenantId,
          company_name,
          error: error.message
        });
      }
    }

  } catch (error) {
    console.error('[Aggregation] Job failed:', error);
    stats.errors.push({ error: error.message });
  } finally {
    isRunning = false;
    lastRunAt = new Date();
    lastRunStats = stats;
    await adminPool.end();
  }

  const duration = Date.now() - startTime;
  console.log(`[Aggregation] Completed in ${duration}ms`, stats);

  return stats;
}

/**
 * Aggregate usage for a single tenant - with RLS context
 */
async function aggregateTenantUsageSecured(tenantId, startDate, endDate, stats) {
  await runWithRLSContext(
    {
      tenantId: String(tenantId),
      userId: SYSTEM_USER_ID,
      dataScope: 'TENANT',
      role: 'SYSTEM_JOB'
    },
    {
      jobName: 'daily-usage-aggregation',
      jobId: `usage_${tenantId}_${startDate.toISOString().split('T')[0]}`
    },
    async (client) => {
      // All queries here are RLS-scoped to this tenant

      // Count API calls for this tenant (from audit_logs or events table)
      const apiCalls = await client.query(`
        SELECT COUNT(*) as count
        FROM audit_logs
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at < $3
      `, [tenantId, startDate, endDate]);

      const apiCallCount = parseInt(apiCalls.rows[0]?.count || 0);

      // Count active users
      const activeUsers = await client.query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM audit_logs
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at < $3
          AND user_id IS NOT NULL
      `, [tenantId, startDate, endDate]);

      const activeUserCount = parseInt(activeUsers.rows[0]?.count || 0);

      // Update stats
      stats.totalApiCalls += apiCallCount;
      stats.totalActiveUsers += activeUserCount;

      // Check if daily usage record exists
      const dateStr = startDate.toISOString().split('T')[0];
      const existing = await client.query(`
        SELECT id FROM client_daily_usage 
        WHERE tenant_id = $1 AND usage_date = $2
      `, [tenantId, dateStr]);

      if (existing.rows.length > 0) {
        // Update existing record
        await client.query(`
          UPDATE client_daily_usage 
          SET 
            api_calls = $1,
            active_users = $2,
            updated_at = NOW()
          WHERE tenant_id = $3 AND usage_date = $4
        `, [apiCallCount, activeUserCount, tenantId, dateStr]);
      } else {
        // Insert new record
        await client.query(`
          INSERT INTO client_daily_usage (
            tenant_id, usage_date, api_calls, active_users, created_at
          ) VALUES ($1, $2, $3, $4, NOW())
        `, [tenantId, dateStr, apiCallCount, activeUserCount]);
      }

      console.log(
        `[Aggregation] Tenant ${tenantId}: ${apiCallCount} API calls, ` +
        `${activeUserCount} active users`
      );
    }
  );
}

/**
 * Get job status
 */
function getJobStatus() {
  return {
    isRunning,
    lastRunAt,
    lastRunStats
  };
}

/**
 * Schedule the job
 */
function scheduleAggregationJob() {
  const cron = require('node-cron');
  
  // Run daily at 2 AM UTC
  cron.schedule('0 2 * * *', async () => {
    console.log('[Aggregation] Scheduled run starting...');
    await aggregateDailyUsageSecured();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Aggregation] ✅ Scheduled daily at 2:00 AM UTC');
}

module.exports = {
  aggregateDailyUsageSecured,
  aggregateTenantUsageSecured,
  scheduleAggregationJob,
  getJobStatus
};
