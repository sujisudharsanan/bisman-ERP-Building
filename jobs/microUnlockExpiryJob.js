/**
 * BISMAN ERP - Micro-Unlock Expiry Cron Job
 * 
 * Runs daily to:
 * 1. Expire temporary overrides that have passed their expiry date
 * 2. Check for upcoming expirations and log warnings
 * 
 * Schedule: Daily at 00:05 AM
 * 
 * @module jobs/microUnlockExpiryJob
 */

/* eslint-env node */

const cron = require('node-cron');
const microUnlockService = require('../my-backend/services/subscription/microUnlockService');

// ============================================================================
// EXPIRY JOB
// ============================================================================

/**
 * Run the override expiry check
 */
async function runExpiryJob() {
  console.log('[MicroUnlockExpiry] Starting override expiry check...');
  
  try {
    // Expire all overrides that have passed their date
    const result = await microUnlockService.expireOverrides();
    
    console.log(`[MicroUnlockExpiry] Expired ${result.expired} overrides`);
    
    if (result.details && result.details.length > 0) {
      result.details.forEach(unlock => {
        console.log(`  - ${unlock.feature_key} for tenant ${unlock.tenant_id} (reason: ${unlock.override_reason})`);
      });
    }

    // Check for upcoming expirations (warn admins)
    const upcoming = await microUnlockService.getUpcomingExpirations(7);
    
    if (upcoming.length > 0) {
      console.log(`[MicroUnlockExpiry] ${upcoming.length} overrides expiring in next 7 days:`);
      upcoming.forEach(unlock => {
        console.log(`  - ${unlock.feature_name} for ${unlock.tenant_name}: ${unlock.days_remaining} days remaining`);
      });
      
      // TODO: Send notification to SuperAdmins
      // await notificationService.notifySuperAdmins({
      //   type: 'override_expiry_warning',
      //   message: `${upcoming.length} feature overrides expiring soon`,
      //   data: upcoming,
      // });
    }

    return { success: true, expired: result.expired, upcoming: upcoming.length };
  } catch (error) {
    console.error('[MicroUnlockExpiry] Job failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CRON SCHEDULE
// ============================================================================

/**
 * Schedule the expiry job
 * Runs daily at 00:05 AM
 */
function scheduleExpiryJob() {
  // Cron: At minute 5 of every day
  cron.schedule('5 0 * * *', async () => {
    await runExpiryJob();
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  console.log('[MicroUnlockExpiry] Scheduled daily at 00:05 AM IST');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  runExpiryJob,
  scheduleExpiryJob,
};

// Run immediately if executed directly
if (require.main === module) {
  runExpiryJob()
    .then(result => {
      console.log('[MicroUnlockExpiry] Manual run complete:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('[MicroUnlockExpiry] Manual run failed:', err);
      process.exit(1);
    });
}
