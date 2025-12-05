/**
 * Trial Expiry Job
 * 
 * Runs hourly to:
 * 1. Find expired trial tenants
 * 2. Downgrade to free plan
 * 3. Send upgrade reminder emails
 * 4. Log audit events
 */

const prisma = require('../lib/prisma');
const stripeService = require('../services/billing/stripeService');

// Job state tracking
let isRunning = false;
let lastRunAt = null;
let lastRunStats = null;

/**
 * Main job function
 */
async function runTrialExpiryJob() {
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
    emailsSent: 0,
    errors: []
  };

  console.log('[TrialExpiry] Starting trial expiry check...');

  try {
    // Find tenants with expired trials that haven't been processed
    const expiredTrials = await prisma.tenant.findMany({
      where: {
        trial_expires_at: {
          lt: new Date()
        },
        trial_expired: {
          not: true
        },
        // Exclude tenants with active subscriptions
        OR: [
          { subscription_status: null },
          { subscription_status: { notIn: ['active', 'trialing'] } }
        ]
      },
      include: {
        users: {
          where: {
            role: {
              name: 'admin'
            }
          },
          take: 1
        }
      }
    });

    stats.checked = expiredTrials.length;
    console.log(`[TrialExpiry] Found ${expiredTrials.length} expired trials to process`);

    for (const tenant of expiredTrials) {
      try {
        await processExpiredTrial(tenant, stats);
      } catch (error) {
        console.error(`[TrialExpiry] Error processing tenant ${tenant.id}:`, error);
        stats.errors.push({
          tenantId: tenant.id,
          error: error.message
        });
      }
    }

    // Also check for trials expiring soon (3 days warning)
    await sendExpiryWarnings(stats);

  } catch (error) {
    console.error('[TrialExpiry] Job failed:', error);
    stats.errors.push({ error: error.message });
  } finally {
    isRunning = false;
    lastRunAt = new Date();
    lastRunStats = stats;
  }

  const duration = Date.now() - startTime;
  console.log(`[TrialExpiry] Completed in ${duration}ms`, stats);

  return stats;
}

/**
 * Process a single expired trial
 */
async function processExpiredTrial(tenant, stats) {
  console.log(`[TrialExpiry] Processing expired trial for tenant: ${tenant.id} (${tenant.name})`);

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Double-check not already expired (idempotency)
    const current = await tx.tenant.findUnique({
      where: { id: tenant.id },
      select: { trial_expired: true, subscription_status: true }
    });

    if (current?.trial_expired) {
      console.log(`[TrialExpiry] Tenant ${tenant.id} already marked as expired, skipping`);
      stats.alreadyExpired++;
      return;
    }

    // Check if subscription was added since our query
    if (current?.subscription_status === 'active' || current?.subscription_status === 'trialing') {
      console.log(`[TrialExpiry] Tenant ${tenant.id} now has active subscription, skipping`);
      return;
    }

    // Mark as expired and downgrade to free
    await tx.tenant.update({
      where: { id: tenant.id },
      data: {
        trial_expired: true,
        plan: 'free',
        updated_at: new Date()
      }
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        tenant_id: tenant.id,
        action: 'TRIAL_EXPIRED',
        resource_type: 'tenant',
        resource_id: tenant.id,
        details: {
          previousPlan: tenant.plan,
          newPlan: 'free',
          trialExpiredAt: tenant.trial_expires_at
        },
        created_at: new Date()
      }
    });

    stats.expired++;
  });

  // Update quotas to free tier (outside transaction)
  await stripeService.updateTenantQuotas(tenant.id, 'free');

  // Send expiry email
  if (tenant.users?.[0]) {
    await sendExpiryEmail(tenant, tenant.users[0], stats);
  }
}

/**
 * Send trial expired email with upgrade link
 */
async function sendExpiryEmail(tenant, admin, stats) {
  const emailService = require('../services/email/emailService');
  
  // Generate one-click upgrade URL
  let upgradeUrl = `${process.env.FRONTEND_URL || 'https://app.bisman.io'}/billing/upgrade`;
  
  // Try to create Stripe Checkout session
  try {
    if (stripeService.isStripeEnabled()) {
      const session = await stripeService.createCheckoutSession(tenant.id, 'pro', {
        email: admin.email
      });
      upgradeUrl = session.url;
    }
  } catch (error) {
    console.warn(`[TrialExpiry] Could not create checkout session:`, error.message);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #dc2626;">Your Trial Has Expired</h1>
      
      <p>Hi ${admin.name},</p>
      
      <p>Your free trial for <strong>${tenant.name}</strong> has ended. Your account has been downgraded to the Free plan.</p>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #92400e;">What You're Missing</h3>
        <ul style="color: #92400e;">
          <li>API rate limit reduced from 300/min to 60/min</li>
          <li>Daily API calls reduced from 50,000 to 5,000</li>
          <li>Storage reduced from 10GB to 1GB</li>
          <li>Team size limited to 3 users</li>
          <li>Advanced features disabled</li>
        </ul>
      </div>
      
      <p><strong>Upgrade now to restore full access:</strong></p>
      
      <a href="${upgradeUrl}" style="background: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 18px; margin: 20px 0;">
        Upgrade to Pro - $29/month
      </a>
      
      <p style="color: #666; font-size: 14px;">
        Questions about pricing? Reply to this email or visit our <a href="${process.env.FRONTEND_URL}/pricing">pricing page</a>.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <p style="color: #666; font-size: 12px;">
        You're receiving this because your trial for ${tenant.name} has expired.
      </p>
    </div>
  `;

  try {
    await emailService.send({
      to: admin.email,
      subject: `Your trial has expired - ${tenant.name}`,
      html
    });
    stats.emailsSent++;
    console.log(`[TrialExpiry] Sent expiry email to ${admin.email}`);
  } catch (error) {
    console.error(`[TrialExpiry] Failed to send expiry email:`, error);
    stats.errors.push({
      tenantId: tenant.id,
      error: `Email failed: ${error.message}`
    });
  }
}

/**
 * Send warnings for trials expiring in next 3 days
 */
async function sendExpiryWarnings(stats) {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const oneDayFromNow = new Date();
  oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

  // Find trials expiring in next 3 days
  const expiringTrials = await prisma.tenant.findMany({
    where: {
      trial_expires_at: {
        gt: new Date(),
        lt: threeDaysFromNow
      },
      trial_expired: {
        not: true
      },
      // Exclude tenants with active subscriptions
      OR: [
        { subscription_status: null },
        { subscription_status: { notIn: ['active', 'trialing'] } }
      ]
    },
    include: {
      users: {
        where: { role: { name: 'admin' } },
        take: 1
      }
    }
  });

  console.log(`[TrialExpiry] Found ${expiringTrials.length} trials expiring in next 3 days`);

  for (const tenant of expiringTrials) {
    // Calculate days remaining
    const daysRemaining = Math.ceil(
      (new Date(tenant.trial_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Only send warning once per day tier (3 days, 1 day)
    const warningKey = `trial_warning_${daysRemaining}d`;
    
    // Check if we already sent this warning (stored in tenant metadata or separate table)
    // For simplicity, we'll use Redis if available
    const redis = require('../lib/redis');
    if (redis) {
      const alreadySent = await redis.get(`${tenant.id}:${warningKey}`);
      if (alreadySent) {
        continue;
      }
    }

    if (tenant.users?.[0] && (daysRemaining === 3 || daysRemaining === 1)) {
      await sendWarningEmail(tenant, tenant.users[0], daysRemaining);
      
      // Mark as sent
      if (redis) {
        await redis.setex(`${tenant.id}:${warningKey}`, 86400 * 7, '1'); // Expire after 7 days
      }
    }
  }
}

/**
 * Send trial expiring warning email
 */
async function sendWarningEmail(tenant, admin, daysRemaining) {
  const emailService = require('../services/email/emailService');
  
  const expiryDate = new Date(tenant.trial_expires_at).toLocaleDateString();
  const urgencyColor = daysRemaining === 1 ? '#dc2626' : '#f59e0b';
  
  let upgradeUrl = `${process.env.FRONTEND_URL || 'https://app.bisman.io'}/billing/upgrade`;
  
  try {
    if (stripeService.isStripeEnabled()) {
      const session = await stripeService.createCheckoutSession(tenant.id, 'pro', {
        email: admin.email
      });
      upgradeUrl = session.url;
    }
  } catch (error) {
    console.warn(`[TrialExpiry] Could not create checkout session:`, error.message);
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${urgencyColor}; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">⏰ Your trial expires ${daysRemaining === 1 ? 'tomorrow!' : `in ${daysRemaining} days`}</h2>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hi ${admin.name},</p>
        
        <p>Your free trial for <strong>${tenant.name}</strong> will expire on <strong>${expiryDate}</strong>.</p>
        
        <p>After expiration, your account will be downgraded to the Free plan with limited features.</p>
        
        <a href="${upgradeUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 20px 0;">
          Upgrade Now to Keep Full Access
        </a>
        
        <p style="color: #666;">
          Need more time? <a href="mailto:support@bisman.io">Contact us</a> and we'll be happy to help.
        </p>
      </div>
    </div>
  `;

  try {
    await emailService.send({
      to: admin.email,
      subject: `⏰ Your trial expires ${daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`} - ${tenant.name}`,
      html
    });
    console.log(`[TrialExpiry] Sent ${daysRemaining}-day warning to ${admin.email}`);
  } catch (error) {
    console.error(`[TrialExpiry] Failed to send warning email:`, error);
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
 * Schedule the job with node-cron
 */
function scheduleJob() {
  try {
    const cron = require('node-cron');
    
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
      console.log('[TrialExpiry] Scheduled job triggered');
      await runTrialExpiryJob();
    });

    console.log('[TrialExpiry] Job scheduled to run every hour');
  } catch (error) {
    console.warn('[TrialExpiry] node-cron not available, job not scheduled:', error.message);
    console.warn('[TrialExpiry] Install node-cron or use external scheduler');
  }
}

module.exports = {
  runTrialExpiryJob,
  getJobStatus,
  scheduleJob
};
