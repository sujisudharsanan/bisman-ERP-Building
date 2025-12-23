/**
 * Clarification Expiry Job
 * 
 * Scheduled job to expire overdue clarification requests.
 * Should be run periodically (e.g., every hour) via cron or process manager.
 * 
 * Usage:
 *   node jobs/clarificationExpiryJob.js
 * 
 * Or add to cron:
 *   0 * * * * cd /path/to/my-backend && node jobs/clarificationExpiryJob.js
 */

const { expireOverdueClarifications } = require('../services/clarificationService');

async function run() {
  console.log(`[ClarificationExpiry] Starting job at ${new Date().toISOString()}`);
  
  try {
    const result = await expireOverdueClarifications();
    
    if (result.success) {
      console.log(`[ClarificationExpiry] Completed. Expired ${result.expiredCount} clarification(s).`);
    } else {
      console.error('[ClarificationExpiry] Job failed:', result.error);
    }
  } catch (error) {
    console.error('[ClarificationExpiry] Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { run };
