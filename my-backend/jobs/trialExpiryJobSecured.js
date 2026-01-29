/**
 * Trial Expiry Job - RLS-SECURED VERSION
 * ========================================
 * 
 * SECURITY: This job uses BackgroundJobRLS to ensure all database
 * operations are properly scoped to tenant context.
 * 
 * Runs hourly to:
 * 1. Find expired trial tenants
 * 2. Downgrade to free plan
 * 3. Send upgrade reminder emails
 * 4. Log audit events
 * 
 * @module jobs/trialExpiryJobSecured
 */

const { Pool } = require('pg');
const { runWithRLSContext } = require('../security/BackgroundJobRLS');

// Database connection
const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// Job state tracking
let isRunning = false;
let lastRunAt = null;
let lastRunStats = null;

// System user ID for background job auditing
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || 1;

/**
 * Main job function - RLS-secured
 */
async function runTrialExpiryJobSecured() {
  if (isRunning) {
    console.log('[TrialExpiry] Job already running, skipping');
    return { skipped: true, reason: 'already_running' };
  }

  isRunning = true;
  const startTime = Date.now();
  
  const stats = {
    checked: 0,
    expired: 0,
    alreadyExpired: 0,
    warningsSent: 0,
    errors: []
  };

  console.log('[TrialExpiry] Starting RLS-secured trial expiry check...');

  const adminPool = new Pool({ connectionString: DATABASE_URL });

  try {
    // STEP 1: Find tenants with expired trials (platform query - no RLS needed)
    const expiredTrials = await adminPool.query(`
      SELECT 
        c.id,
        c.company_name,
        c.trial_expires_at,
        c.subscription_status,
        c.is_active
      FROM clients c
      WHERE c.trial_expires_at < NOW()
        AND c.is_active = true
        AND (c.subscription_status IS NULL OR c.subscription_status NOT IN ('active', 'trialing'))
      LIMIT 100
    `);

    stats.checked = expiredTrials.rows.length;
    console.log(`[TrialExpiry] Found ${expiredTrials.rows.length} expired trials to process`);

    // STEP 2: Process each expired tenant WITH RLS CONTEXT
    for (const tenant of expiredTrials.rows) {
      try {
        await processExpiredTrialSecured(tenant, stats);
      } catch (error) {
        console.error(`[TrialExpiry] Error processing tenant ${tenant.id}:`, error.message);
        stats.errors.push({
          tenantId: tenant.id,
          error: error.message
        });
      }
    }

    // STEP 3: Send expiry warnings (3 days before)
    await sendExpiryWarningsSecured(adminPool, stats);

  } catch (error) {
    console.error('[TrialExpiry] Job failed:', error);
    stats.errors.push({ error: error.message });
  } finally {
    isRunning = false;
    lastRunAt = new Date();
    lastRunStats = stats;
    await adminPool.end();
  }

  const duration = Date.now() - startTime;
  console.log(`[TrialExpiry] Completed in ${duration}ms`, stats);

  return stats;
}

/**
 * Process a single expired trial with RLS context
 */
async function processExpiredTrialSecured(tenant, stats) {
  console.log(`[TrialExpiry] Processing tenant ${tenant.id} (${tenant.company_name})`);

  // Execute tenant update within RLS context
  await runWithRLSContext(
    {
      tenantId: String(tenant.id),
      userId: SYSTEM_USER_ID,
      dataScope: 'TENANT',
      role: 'SYSTEM_JOB'
    },
    {
      jobName: 'trial-expiry-processor',
      jobId: `trial_${tenant.id}_${Date.now()}`
    },
    async (client) => {
      // All operations here are RLS-scoped to this tenant

      // Double-check not already processed (idempotency)
      const current = await client.query(`
        SELECT subscription_status 
        FROM clients 
        WHERE id = $1
      `, [tenant.id]);

      if (current.rows.length === 0) {
        console.log(`[TrialExpiry] Tenant ${tenant.id} not found (RLS filtered?)`);
        return;
      }

      if (['active', 'trialing'].includes(current.rows[0]?.subscription_status)) {
        console.log(`[TrialExpiry] Tenant ${tenant.id} now has active subscription, skipping`);
        return;
      }

      // Update tenant to free plan
      await client.query(`
        UPDATE clients 
        SET 
          subscription_status = 'expired',
          updated_at = NOW()
        WHERE id = $1
      `, [tenant.id]);

      // Create audit log entry
      await client.query(`
        INSERT INTO audit_logs (
          tenant_id, 
          action, 
          resource_type, 
          resource_id, 
          details,
          created_at,
          user_id
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      `, [
        tenant.id,
        'TRIAL_EXPIRED',
        'client',
        tenant.id,
        JSON.stringify({
          company_name: tenant.company_name,
          trial_expired_at: tenant.trial_expires_at,
          new_status: 'expired'
        }),
        SYSTEM_USER_ID
      ]);

      stats.expired++;
      console.log(`[TrialExpiry] ✅ Marked tenant ${tenant.id} as expired`);
    }
  );
}

/**
 * Send expiry warning emails - 3 days before trial expires
 */
async function sendExpiryWarningsSecured(adminPool, stats) {
  // Find tenants expiring in 3 days
  const expiringTenants = await adminPool.query(`
    SELECT 
      c.id,
      c.company_name,
      c.trial_expires_at,
      ue.email as admin_email,
      ue.name as admin_name
    FROM clients c
    LEFT JOIN users_enhanced ue ON ue.tenant_id = c.id AND ue.is_active = true
    WHERE c.trial_expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
      AND c.is_active = true
      AND (c.subscription_status IS NULL OR c.subscription_status = 'trialing')
    ORDER BY c.trial_expires_at
    LIMIT 50
  `);

  console.log(`[TrialExpiry] Found ${expiringTenants.rows.length} tenants expiring soon`);

  for (const tenant of expiringTenants.rows) {
    try {
      // Log warning sent with RLS context
      await runWithRLSContext(
        {
          tenantId: String(tenant.id),
          userId: SYSTEM_USER_ID,
          dataScope: 'TENANT',
          role: 'SYSTEM_JOB'
        },
        { jobName: 'trial-expiry-warning' },
        async (client) => {
          // Check if warning already sent
          const alreadySent = await client.query(`
            SELECT 1 FROM audit_logs 
            WHERE tenant_id = $1 
              AND action = 'TRIAL_EXPIRY_WARNING' 
              AND created_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
          `, [tenant.id]);

          if (alreadySent.rows.length > 0) {
            console.log(`[TrialExpiry] Warning already sent to ${tenant.id}, skipping`);
            return;
          }

          // Log warning sent
          await client.query(`
            INSERT INTO audit_logs (
              tenant_id, action, resource_type, resource_id, 
              details, created_at, user_id
            ) VALUES ($1, 'TRIAL_EXPIRY_WARNING', 'client', $1, $2, NOW(), $3)
          `, [
            tenant.id,
            JSON.stringify({
              company_name: tenant.company_name,
              expires_at: tenant.trial_expires_at,
              admin_email: tenant.admin_email
            }),
            SYSTEM_USER_ID
          ]);

          stats.warningsSent++;
          console.log(`[TrialExpiry] Warning logged for ${tenant.company_name}`);
        }
      );

      // TODO: Actually send email (outside RLS context)
      // await emailService.sendTrialExpiryWarning(tenant);

    } catch (error) {
      console.error(`[TrialExpiry] Warning failed for ${tenant.id}:`, error.message);
      stats.errors.push({ tenantId: tenant.id, type: 'warning', error: error.message });
    }
  }
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
 * Schedule the job (cron expression)
 */
function scheduleTrialExpiryJob() {
  const cron = require('node-cron');
  
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[TrialExpiry] Scheduled run starting...');
    await runTrialExpiryJobSecured();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[TrialExpiry] ✅ Scheduled hourly at minute 0');
}

module.exports = {
  runTrialExpiryJobSecured,
  processExpiredTrialSecured,
  sendExpiryWarningsSecured,
  scheduleTrialExpiryJob,
  getJobStatus
};
