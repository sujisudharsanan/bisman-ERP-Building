/**
 * BISMAN ERP - Micro-Unlock Billing Cron Jobs
 * 
 * Scheduled jobs for the micro-unlock subscription system.
 * Uses node-cron for scheduling.
 * 
 * Jobs:
 * - Daily (midnight): Reset counters, process renewals, check overdue, take snapshots
 * - Monthly (1st, 2am): Generate invoices
 * - Weekly (Sunday, 3am): Cleanup old counter records
 * 
 * @module jobs/microUnlockBillingJobs
 */

const cron = require('node-cron');
const billingEngine = require('../services/billing/microUnlockBillingEngine');

let isInitialized = false;

/**
 * Initialize all billing cron jobs
 */
function initBillingJobs() {
  if (isInitialized) {
    console.log('[MicroUnlock Jobs] Already initialized, skipping...');
    return;
  }

  console.log('[MicroUnlock Jobs] Initializing billing cron jobs...');

  // ============================================================================
  // DAILY JOB - Run at midnight (00:00) every day
  // ============================================================================
  cron.schedule('0 0 * * *', async () => {
    console.log('[MicroUnlock Jobs] Running daily billing job...');
    try {
      const results = await billingEngine.runDailyBillingJob();
      console.log('[MicroUnlock Jobs] Daily job completed:', {
        countersReset: results.counterReset?.daily || 0,
        renewals: results.renewals?.renewed || 0,
        expirations: results.renewals?.expired || 0,
        overdueMarked: results.overdue?.markedOverdue || 0,
      });
    } catch (error) {
      console.error('[MicroUnlock Jobs] Daily job failed:', error);
    }
  }, {
    timezone: 'Asia/Kolkata', // IST for Indian business
  });

  // ============================================================================
  // MONTHLY JOB - Run at 2am on 1st of each month
  // ============================================================================
  cron.schedule('0 2 1 * *', async () => {
    console.log('[MicroUnlock Jobs] Running monthly invoice generation...');
    try {
      const results = await billingEngine.runMonthlyBillingJob();
      console.log('[MicroUnlock Jobs] Monthly job completed:', {
        invoicesGenerated: results.invoiceGeneration?.invoicesGenerated || 0,
        totalRevenue: results.invoiceGeneration?.totalRevenue || 0,
      });
    } catch (error) {
      console.error('[MicroUnlock Jobs] Monthly job failed:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // ============================================================================
  // RENEWAL REMINDER - Run at 10am daily (send reminders for expiring unlocks)
  // ============================================================================
  cron.schedule('0 10 * * *', async () => {
    console.log('[MicroUnlock Jobs] Checking for renewal reminders...');
    try {
      await sendRenewalReminders();
    } catch (error) {
      console.error('[MicroUnlock Jobs] Reminder job failed:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  // ============================================================================
  // OVERDUE REMINDERS - Run at 11am daily
  // ============================================================================
  cron.schedule('0 11 * * *', async () => {
    console.log('[MicroUnlock Jobs] Checking for overdue payment reminders...');
    try {
      await sendOverdueReminders();
    } catch (error) {
      console.error('[MicroUnlock Jobs] Overdue reminder job failed:', error);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  isInitialized = true;
  console.log('[MicroUnlock Jobs] All billing cron jobs initialized');
}

/**
 * Send renewal reminders for unlocks expiring soon
 */
async function sendRenewalReminders() {
  const { getPrisma } = require('../lib/prisma');
  const prisma = getPrisma();
  
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  try {
    // Find unlocks expiring in 3 days that haven't been reminded
    const expiringUnlocks = await prisma.$queryRaw`
      SELECT 
        tfu.*,
        fc.feature_name,
        c.name as tenant_name,
        u.email as admin_email
      FROM tenant_feature_unlocks tfu
      JOIN feature_catalog fc ON fc.feature_key = tfu.feature_key
      JOIN clients c ON c.id = tfu.tenant_id
      LEFT JOIN users u ON u.client_id = tfu.tenant_id AND u.role = 'ENTERPRISE_ADMIN'
      WHERE tfu.status = 'UNLOCKED'
        AND tfu.end_date IS NOT NULL
        AND tfu.end_date <= ${threeDaysFromNow}
        AND tfu.end_date > NOW()
        AND tfu.renewal_reminder_sent = FALSE
        AND tfu.auto_renew = FALSE
    `;

    for (const unlock of expiringUnlocks) {
      try {
        // TODO: Send email notification
        console.log(`[MicroUnlock Jobs] Would send renewal reminder to ${unlock.admin_email} for ${unlock.feature_name}`);

        // Mark as reminded
        await prisma.$queryRaw`
          UPDATE tenant_feature_unlocks
          SET renewal_reminder_sent = TRUE
          WHERE id = ${unlock.id}
        `;
      } catch (error) {
        console.error(`[MicroUnlock Jobs] Failed to send reminder for unlock ${unlock.id}:`, error);
      }
    }

    console.log(`[MicroUnlock Jobs] Processed ${expiringUnlocks.length} renewal reminders`);
  } catch (error) {
    console.error('[MicroUnlock Jobs] Renewal reminder error:', error);
    throw error;
  }
}

/**
 * Send reminders for overdue invoices
 */
async function sendOverdueReminders() {
  const { getPrisma } = require('../lib/prisma');
  const prisma = getPrisma();

  try {
    // Find overdue invoices
    const overdueInvoices = await prisma.$queryRaw`
      SELECT 
        mui.*,
        c.name as tenant_name,
        u.email as admin_email
      FROM micro_unlock_invoices mui
      JOIN clients c ON c.id = mui.tenant_id
      LEFT JOIN users u ON u.client_id = mui.tenant_id AND u.role = 'ENTERPRISE_ADMIN'
      WHERE mui.status = 'OVERDUE'
      ORDER BY mui.due_date ASC
    `;

    for (const invoice of overdueInvoices) {
      try {
        const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));
        
        // TODO: Send email notification based on severity
        console.log(`[MicroUnlock Jobs] Invoice ${invoice.invoice_number} is ${daysOverdue} days overdue for ${invoice.tenant_name}`);

        if (daysOverdue >= 30) {
          // Consider suspending unlocks after 30 days overdue
          console.log(`[MicroUnlock Jobs] Consider suspending unlocks for tenant ${invoice.tenant_id}`);
        }
      } catch (error) {
        console.error(`[MicroUnlock Jobs] Failed to process overdue invoice ${invoice.invoice_number}:`, error);
      }
    }

    console.log(`[MicroUnlock Jobs] Processed ${overdueInvoices.length} overdue invoices`);
  } catch (error) {
    console.error('[MicroUnlock Jobs] Overdue reminder error:', error);
    throw error;
  }
}

/**
 * Manual trigger for testing
 */
async function runManualJob(jobName) {
  console.log(`[MicroUnlock Jobs] Manual trigger: ${jobName}`);
  
  switch (jobName) {
    case 'daily':
      return await billingEngine.runDailyBillingJob();
    case 'monthly':
      return await billingEngine.runMonthlyBillingJob();
    case 'renewalReminders':
      return await sendRenewalReminders();
    case 'overdueReminders':
      return await sendOverdueReminders();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
}

module.exports = {
  initBillingJobs,
  runManualJob,
  sendRenewalReminders,
  sendOverdueReminders,
};
