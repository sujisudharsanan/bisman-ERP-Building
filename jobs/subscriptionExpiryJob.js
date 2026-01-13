/**
 * BISMAN ERP - Subscription Expiry Cron Job
 * 
 * Runs daily to:
 * 1. Move expired TRIAL subscriptions to GRACE_PERIOD or downgrade to FREE
 * 2. Move expired ACTIVE paid subscriptions to GRACE_PERIOD
 * 3. Move expired GRACE_PERIOD subscriptions to FREE plan
 * 4. Send expiry warning notifications
 * 
 * RULE: If paid plan not renewed on time, downgrade to FREE plan
 * 
 * Schedule: Daily at 01:00 AM
 * 
 * @module jobs/subscriptionExpiryJob
 */

/* eslint-env node */

const cron = require('node-cron');
const { getPrisma } = require('../my-backend/lib/prisma');

// ============================================================================
// CONSTANTS
// ============================================================================

const GRACE_PERIOD_DAYS = 7;

// ============================================================================
// EXPIRY JOB
// ============================================================================

/**
 * Run the subscription expiry check
 */
async function runSubscriptionExpiryJob() {
  console.log('[SubscriptionExpiry] Starting subscription expiry check...');
  
  const prisma = getPrisma();
  if (!prisma) {
    console.error('[SubscriptionExpiry] Database not available');
    return { success: false, error: 'Database not available' };
  }
  
  const now = new Date();
  const results = {
    trialsExpired: 0,
    activeExpired: 0,
    graceExpired: 0,
    warnings: 0,
    errors: [],
  };
  
  try {
    // Get FREE plan for downgrade
    const freePlan = await prisma.subscription_plans.findFirst({
      where: {
        is_active: true,
        OR: [
          { plan_code: 'FREE' },
          { plan_code: 'free' },
          { price_monthly: 0 }
        ]
      },
      orderBy: { sort_order: 'asc' },
    });

    if (!freePlan) {
      console.warn('[SubscriptionExpiry] No FREE plan found, skipping downgrades');
    }

    // 1. Handle expired TRIAL subscriptions
    const expiredTrials = await prisma.client_subscriptions.findMany({
      where: {
        state: 'TRIAL',
        trial_end_date: { lt: now },
      },
      include: { plan: true },
    });

    for (const subscription of expiredTrials) {
      try {
        // Mark trial as not converted and downgrade to FREE
        await prisma.client_subscriptions.update({
          where: { id: subscription.id },
          data: {
            state: freePlan ? 'ACTIVE' : 'CANCELLED',
            previous_state: 'TRIAL',
            state_changed_at: now,
            plan_id: freePlan?.id || subscription.plan_id,
            trial_converted: false,
            is_active: !!freePlan,
            activation_source: 'TRIAL_EXPIRED_DOWNGRADE',
          },
        });

        // Log audit
        await prisma.subscription_coupon_audit_logs.create({
          data: {
            event_type: 'TRIAL_EXPIRED',
            subscription_id: subscription.id,
            payload_snapshot: {
              tenant_id: subscription.client_id,
              plan_code: subscription.plan?.plan_code,
              trial_end_date: subscription.trial_end_date,
              downgraded_to: freePlan?.plan_code || 'CANCELLED',
            },
          },
        }).catch(err => console.error('[SubscriptionExpiry] Audit log error:', err));

        console.log(`[SubscriptionExpiry] Trial expired for tenant ${subscription.client_id}, downgraded to ${freePlan?.plan_code || 'CANCELLED'}`);
        results.trialsExpired++;
      } catch (err) {
        console.error(`[SubscriptionExpiry] Error handling trial expiry for ${subscription.id}:`, err);
        results.errors.push({ subscriptionId: subscription.id, error: err.message });
      }
    }

    // 2. Handle expired ACTIVE paid subscriptions (move to GRACE_PERIOD)
    const expiredActive = await prisma.client_subscriptions.findMany({
      where: {
        state: 'ACTIVE',
        expires_at: { lt: now },
        // Exclude FREE plans from expiry (they don't expire)
        plan: {
          price_monthly: { gt: 0 }
        }
      },
      include: { plan: true },
    });

    const graceEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    for (const subscription of expiredActive) {
      try {
        await prisma.client_subscriptions.update({
          where: { id: subscription.id },
          data: {
            state: 'GRACE_PERIOD',
            previous_state: 'ACTIVE',
            state_changed_at: now,
            grace_period_start: now,
            grace_period_end: graceEnd,
            grace_reason: 'Subscription expired - awaiting renewal',
          },
        });

        // Log audit
        await prisma.subscription_coupon_audit_logs.create({
          data: {
            event_type: 'SUBSCRIPTION_GRACE_PERIOD',
            subscription_id: subscription.id,
            payload_snapshot: {
              tenant_id: subscription.client_id,
              plan_code: subscription.plan?.plan_code,
              expired_at: subscription.expires_at,
              grace_end: graceEnd,
            },
          },
        }).catch(err => console.error('[SubscriptionExpiry] Audit log error:', err));

        console.log(`[SubscriptionExpiry] Subscription expired for tenant ${subscription.client_id}, moved to GRACE_PERIOD (ends ${graceEnd.toISOString()})`);
        results.activeExpired++;
      } catch (err) {
        console.error(`[SubscriptionExpiry] Error handling active expiry for ${subscription.id}:`, err);
        results.errors.push({ subscriptionId: subscription.id, error: err.message });
      }
    }

    // 3. Handle expired GRACE_PERIOD subscriptions (downgrade to FREE)
    const expiredGrace = await prisma.client_subscriptions.findMany({
      where: {
        state: 'GRACE_PERIOD',
        grace_period_end: { lt: now },
      },
      include: { plan: true },
    });

    for (const subscription of expiredGrace) {
      try {
        if (freePlan) {
          await prisma.client_subscriptions.update({
            where: { id: subscription.id },
            data: {
              state: 'ACTIVE',
              previous_state: 'GRACE_PERIOD',
              state_changed_at: now,
              plan_id: freePlan.id,
              grace_period_start: null,
              grace_period_end: null,
              grace_reason: null,
              expires_at: null, // FREE plan doesn't expire
              activation_source: 'GRACE_EXPIRED_DOWNGRADE',
            },
          });

          console.log(`[SubscriptionExpiry] Grace period expired for tenant ${subscription.client_id}, downgraded to FREE plan`);
        } else {
          // No free plan, cancel subscription
          await prisma.client_subscriptions.update({
            where: { id: subscription.id },
            data: {
              state: 'CANCELLED',
              previous_state: 'GRACE_PERIOD',
              state_changed_at: now,
              is_active: false,
              cancelled_at: now,
              cancellation_reason: 'Grace period expired, no free plan available',
            },
          });

          console.log(`[SubscriptionExpiry] Grace period expired for tenant ${subscription.client_id}, subscription CANCELLED`);
        }

        // Log audit
        await prisma.subscription_coupon_audit_logs.create({
          data: {
            event_type: 'GRACE_PERIOD_EXPIRED',
            subscription_id: subscription.id,
            payload_snapshot: {
              tenant_id: subscription.client_id,
              previous_plan: subscription.plan?.plan_code,
              new_plan: freePlan?.plan_code || 'CANCELLED',
              grace_period_end: subscription.grace_period_end,
            },
          },
        }).catch(err => console.error('[SubscriptionExpiry] Audit log error:', err));

        results.graceExpired++;
      } catch (err) {
        console.error(`[SubscriptionExpiry] Error handling grace expiry for ${subscription.id}:`, err);
        results.errors.push({ subscriptionId: subscription.id, error: err.message });
      }
    }

    // 4. Log warnings for subscriptions expiring soon (next 7 days)
    const soonExpiring = await prisma.client_subscriptions.findMany({
      where: {
        state: { in: ['ACTIVE', 'TRIAL'] },
        expires_at: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { plan: true },
    });

    if (soonExpiring.length > 0) {
      console.log(`[SubscriptionExpiry] ${soonExpiring.length} subscriptions expiring in next 7 days:`);
      for (const sub of soonExpiring) {
        const daysLeft = Math.ceil((new Date(sub.expires_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        console.log(`  - Tenant ${sub.client_id}: ${sub.plan?.name || 'Unknown'} expires in ${daysLeft} days`);
        results.warnings++;
      }
      
      // TODO: Send email notifications to affected tenants
    }

    console.log('[SubscriptionExpiry] Job complete:', results);
    return { success: true, ...results };
  } catch (error) {
    console.error('[SubscriptionExpiry] Job failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CRON SCHEDULE
// ============================================================================

/**
 * Schedule the subscription expiry job
 * Runs daily at 01:00 AM
 */
function scheduleSubscriptionExpiryJob() {
  // Cron: At 01:00 AM every day
  cron.schedule('0 1 * * *', async () => {
    await runSubscriptionExpiryJob();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  console.log('[SubscriptionExpiry] Scheduled daily at 01:00 AM IST');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  runSubscriptionExpiryJob,
  scheduleSubscriptionExpiryJob,
};

// Run immediately if executed directly
if (require.main === module) {
  runSubscriptionExpiryJob()
    .then(result => {
      console.log('[SubscriptionExpiry] Manual run complete:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('[SubscriptionExpiry] Manual run failed:', err);
      process.exit(1);
    });
}
