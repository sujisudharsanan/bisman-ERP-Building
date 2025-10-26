/**
 * AI Analytics Cron Job
 * 
 * Automated scheduled tasks for AI analytics
 * - Daily reports generation
 * - Weekly summaries
 * - Cache cleanup
 * - Data retention
 */

const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { generateDailyReport, saveReport } = require('../services/aiAnalyticsEngine');
const { getPrisma } = require('../lib/prisma');

const prisma = getPrisma();

// Configuration
const REPORTS_DIR = path.join(__dirname, '../reports/ai');
const ENABLE_CRON = process.env.AI_CRON_ENABLED !== 'false'; // Enabled by default
const DAILY_REPORT_TIME = process.env.AI_DAILY_REPORT_TIME || '0 20 * * *'; // 8 PM daily
const CACHE_CLEANUP_TIME = process.env.AI_CACHE_CLEANUP_TIME || '0 2 * * *'; // 2 AM daily
const DATA_RETENTION_DAYS = parseInt(process.env.AI_DATA_RETENTION_DAYS) || 90;

// Ensure reports directory exists
fs.mkdir(REPORTS_DIR, { recursive: true })
  .then(() => console.log('[AI Cron] Reports directory ready:', REPORTS_DIR))
  .catch(err => console.error('[AI Cron] Failed to create reports directory:', err));

/**
 * Generate and save daily report
 */
async function generateAndSaveDailyReport() {
  console.log('[AI Cron] Starting daily report generation...');
  
  try {
    // Get list of active tenants
    const tenants = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT tenant_id 
      FROM users 
      WHERE is_active = true 
      AND tenant_id IS NOT NULL
    `);

    console.log(`[AI Cron] Found ${tenants.length} active tenants`);

    // Generate report for each tenant
    for (const tenant of tenants) {
      try {
        console.log(`[AI Cron] Generating report for tenant: ${tenant.tenant_id}`);
        
        const report = await generateDailyReport(tenant.tenant_id);
        
        // Save to database
        await saveReport(report);
        
        // Save to file system
        const filename = `erp_ai_insight_${report.report_date}_tenant_${tenant.tenant_id}.json`;
        const filepath = path.join(REPORTS_DIR, filename);
        await fs.writeFile(filepath, JSON.stringify(report, null, 2));
        
        console.log(`[AI Cron] ✅ Report saved for tenant ${tenant.tenant_id}`);
        
        // Add small delay to avoid overloading AI service
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (tenantError) {
        console.error(`[AI Cron] Error generating report for tenant ${tenant.tenant_id}:`, tenantError.message);
        // Continue with next tenant
      }
    }

    // Also generate enterprise-level report (all data)
    try {
      console.log('[AI Cron] Generating enterprise-level report...');
      const enterpriseReport = await generateDailyReport(null);
      await saveReport(enterpriseReport);
      
      const filename = `erp_ai_insight_${enterpriseReport.report_date}_enterprise.json`;
      const filepath = path.join(REPORTS_DIR, filename);
      await fs.writeFile(filepath, JSON.stringify(enterpriseReport, null, 2));
      
      console.log('[AI Cron] ✅ Enterprise report saved');
    } catch (enterpriseError) {
      console.error('[AI Cron] Error generating enterprise report:', enterpriseError.message);
    }

    console.log('[AI Cron] Daily report generation completed');
    
  } catch (error) {
    console.error('[AI Cron] Fatal error in daily report generation:', error);
  }
}

/**
 * Cleanup expired cache entries
 */
async function cleanupCache() {
  console.log('[AI Cron] Starting cache cleanup...');
  
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT cleanup_ai_cache() as deleted_count
    `);
    
    const deletedCount = result[0]?.deleted_count || 0;
    console.log(`[AI Cron] ✅ Cleaned up ${deletedCount} expired cache entries`);
    
  } catch (error) {
    console.error('[AI Cron] Error cleaning cache:', error);
  }
}

/**
 * Cleanup old conversations (data retention)
 */
async function cleanupOldConversations() {
  console.log(`[AI Cron] Starting conversation cleanup (retention: ${DATA_RETENTION_DAYS} days)...`);
  
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT cleanup_old_ai_conversations($1) as deleted_count
    `, DATA_RETENTION_DAYS);
    
    const deletedCount = result[0]?.deleted_count || 0;
    console.log(`[AI Cron] ✅ Cleaned up ${deletedCount} old conversations`);
    
  } catch (error) {
    console.error('[AI Cron] Error cleaning conversations:', error);
  }
}

/**
 * Cleanup old report files
 */
async function cleanupOldReportFiles() {
  console.log('[AI Cron] Starting report file cleanup...');
  
  try {
    const files = await fs.readdir(REPORTS_DIR);
    const now = Date.now();
    const retentionMs = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filepath = path.join(REPORTS_DIR, file);
      const stats = await fs.stat(filepath);
      const age = now - stats.mtimeMs;
      
      if (age > retentionMs) {
        await fs.unlink(filepath);
        deletedCount++;
      }
    }
    
    console.log(`[AI Cron] ✅ Cleaned up ${deletedCount} old report files`);
    
  } catch (error) {
    console.error('[AI Cron] Error cleaning report files:', error);
  }
}

/**
 * Initialize cron jobs
 */
function initializeCronJobs() {
  if (!ENABLE_CRON) {
    console.log('[AI Cron] ⚠️  Cron jobs are disabled. Set AI_CRON_ENABLED=true to enable.');
    return;
  }

  console.log('[AI Cron] Initializing scheduled tasks...');

  // Daily report generation (default: 8 PM)
  cron.schedule(DAILY_REPORT_TIME, async () => {
    console.log('[AI Cron] ⏰ Triggered: Daily report generation');
    await generateAndSaveDailyReport();
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });
  
  console.log(`[AI Cron] ✅ Scheduled daily reports at: ${DAILY_REPORT_TIME}`);

  // Cache and data cleanup (default: 2 AM)
  cron.schedule(CACHE_CLEANUP_TIME, async () => {
    console.log('[AI Cron] ⏰ Triggered: Cleanup tasks');
    await cleanupCache();
    await cleanupOldConversations();
    await cleanupOldReportFiles();
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });
  
  console.log(`[AI Cron] ✅ Scheduled cleanup tasks at: ${CACHE_CLEANUP_TIME}`);

  // Weekly summary (Sunday at 7 PM)
  cron.schedule('0 19 * * 0', async () => {
    console.log('[AI Cron] ⏰ Triggered: Weekly summary generation');
    // TODO: Implement weekly summary logic
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'UTC'
  });
  
  console.log('[AI Cron] ✅ Scheduled weekly summaries');

  console.log('[AI Cron] 🚀 All cron jobs initialized successfully');
}

// Manual trigger functions (for testing or API endpoints)
module.exports = {
  initializeCronJobs,
  generateAndSaveDailyReport,
  cleanupCache,
  cleanupOldConversations,
  cleanupOldReportFiles
};

// Auto-initialize if this file is imported
if (ENABLE_CRON) {
  initializeCronJobs();
}
