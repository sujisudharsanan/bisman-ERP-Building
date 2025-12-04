/**
 * Security Monitoring Cron Jobs
 * 
 * Scheduled tasks for security monitoring:
 * - Audit volume checks
 * - Unknown DB connection detection
 * - Credential rotation reminders
 * 
 * @module cron/securityMonitor
 */

'use strict';

const cron = require('node-cron');
const { Pool } = require('pg');
const {
  checkAuditVolume,
  checkUnknownDbConnections,
  sendAlert
} = require('../middleware/securityAlerting');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SCHEDULES = {
  // Every 5 minutes: check audit volume
  AUDIT_VOLUME: '*/5 * * * *',
  
  // Every minute: check for unknown DB connections
  UNKNOWN_CONNECTIONS: '* * * * *',
  
  // Daily at 9 AM: credential rotation reminder
  CREDENTIAL_REMINDER: '0 9 * * *',
  
  // Weekly on Monday at 10 AM: security summary
  WEEKLY_SUMMARY: '0 10 * * 1'
};

// Track last credential rotation (should be stored in DB/config)
let lastCredentialRotation = process.env.LAST_CREDENTIAL_ROTATION 
  ? new Date(process.env.LAST_CREDENTIAL_ROTATION)
  : new Date();

const CREDENTIAL_ROTATION_DAYS = parseInt(process.env.CREDENTIAL_ROTATION_DAYS || '90');

// ============================================================================
// DATABASE POOL
// ============================================================================

let pool = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      application_name: 'bisman_security_monitor'
    });
  }
  return pool;
}

// ============================================================================
// MONITORING TASKS
// ============================================================================

/**
 * Check audit log volume
 */
async function runAuditVolumeCheck() {
  const db = getPool();
  if (!db) {
    console.warn('[securityMonitor] No database connection for audit check');
    return;
  }

  try {
    const healthy = await checkAuditVolume(db);
    if (healthy) {
      console.log('[securityMonitor] ✅ Audit volume check passed');
    }
  } catch (err) {
    console.error('[securityMonitor] Audit volume check failed:', err.message);
  }
}

/**
 * Check for unknown database connections
 */
async function runConnectionCheck() {
  const db = getPool();
  if (!db) return;

  try {
    const healthy = await checkUnknownDbConnections(db);
    if (healthy) {
      // Don't log success every minute - too noisy
    }
  } catch (err) {
    console.error('[securityMonitor] Connection check failed:', err.message);
  }
}

/**
 * Check if credential rotation is due
 */
async function runCredentialReminder() {
  const daysSinceRotation = Math.floor(
    (Date.now() - lastCredentialRotation.getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysUntilDue = CREDENTIAL_ROTATION_DAYS - daysSinceRotation;

  if (daysUntilDue <= 7) {
    await sendAlert('CREDENTIAL_ROTATION_DUE', {
      lastRotation: lastCredentialRotation.toISOString(),
      daysSinceRotation,
      daysUntilDue: Math.max(0, daysUntilDue),
      rotationPolicy: `${CREDENTIAL_ROTATION_DAYS} days`,
      message: daysUntilDue <= 0 
        ? 'Credential rotation is OVERDUE!'
        : `Credential rotation due in ${daysUntilDue} days`
    });
  } else {
    console.log(`[securityMonitor] Credential rotation: ${daysUntilDue} days until due`);
  }
}

/**
 * Generate weekly security summary
 */
async function runWeeklySummary() {
  const db = getPool();
  if (!db) return;

  try {
    // Get audit stats for the week
    const auditStats = await db.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT table_name) as tables_affected,
        COUNT(*) FILTER (WHERE operation = 'DELETE') as deletes,
        COUNT(*) FILTER (WHERE operation = 'UPDATE') as updates,
        COUNT(*) FILTER (WHERE operation = 'INSERT') as inserts
      FROM audit_logs_dml
      WHERE changed_at >= NOW() - INTERVAL '7 days'
    `).catch(() => ({ rows: [{}] }));

    // Get security events
    const securityEvents = await db.query(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM security_events
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    // Get failed auth attempts
    const failedAuth = await db.query(`
      SELECT COUNT(*) as count
      FROM auth_attempts
      WHERE success = false
        AND attempted_at >= NOW() - INTERVAL '7 days'
    `).catch(() => ({ rows: [{ count: 0 }] }));

    await sendAlert('WEEKLY_SECURITY_SUMMARY', {
      period: 'Last 7 days',
      audit: auditStats.rows[0] || {},
      securityEvents: securityEvents.rows,
      failedAuthAttempts: failedAuth.rows[0]?.count || 0,
      credentialStatus: {
        lastRotation: lastCredentialRotation.toISOString(),
        daysUntilDue: CREDENTIAL_ROTATION_DAYS - Math.floor(
          (Date.now() - lastCredentialRotation.getTime()) / (1000 * 60 * 60 * 24)
        )
      }
    });

    console.log('[securityMonitor] ✅ Weekly security summary sent');
  } catch (err) {
    console.error('[securityMonitor] Weekly summary failed:', err.message);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all security monitoring cron jobs
 */
function initializeSecurityMonitor() {
  console.log('[securityMonitor] Initializing security monitoring cron jobs...');

  // Audit volume check (every 5 minutes)
  cron.schedule(SCHEDULES.AUDIT_VOLUME, runAuditVolumeCheck, {
    scheduled: true,
    timezone: 'UTC'
  });
  console.log(`[securityMonitor] ✅ Audit volume check scheduled: ${SCHEDULES.AUDIT_VOLUME}`);

  // Unknown connections check (every minute)
  cron.schedule(SCHEDULES.UNKNOWN_CONNECTIONS, runConnectionCheck, {
    scheduled: true,
    timezone: 'UTC'
  });
  console.log(`[securityMonitor] ✅ Unknown connections check scheduled: ${SCHEDULES.UNKNOWN_CONNECTIONS}`);

  // Credential rotation reminder (daily at 9 AM)
  cron.schedule(SCHEDULES.CREDENTIAL_REMINDER, runCredentialReminder, {
    scheduled: true,
    timezone: 'UTC'
  });
  console.log(`[securityMonitor] ✅ Credential reminder scheduled: ${SCHEDULES.CREDENTIAL_REMINDER}`);

  // Weekly summary (Monday at 10 AM)
  cron.schedule(SCHEDULES.WEEKLY_SUMMARY, runWeeklySummary, {
    scheduled: true,
    timezone: 'UTC'
  });
  console.log(`[securityMonitor] ✅ Weekly summary scheduled: ${SCHEDULES.WEEKLY_SUMMARY}`);

  console.log('[securityMonitor] 🚀 All security monitoring jobs initialized');
}

/**
 * Cleanup on shutdown
 */
async function shutdownSecurityMonitor() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  console.log('[securityMonitor] Shutdown complete');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  initializeSecurityMonitor,
  shutdownSecurityMonitor,
  
  // Manual triggers for testing
  runAuditVolumeCheck,
  runConnectionCheck,
  runCredentialReminder,
  runWeeklySummary,
  
  // Config
  SCHEDULES,
  
  // Update rotation date (call after rotation)
  setLastCredentialRotation: (date) => {
    lastCredentialRotation = new Date(date);
  }
};
