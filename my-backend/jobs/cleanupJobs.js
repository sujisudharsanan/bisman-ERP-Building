/**
 * Background Cleanup Jobs
 * 
 * Scheduled tasks for maintaining database and cache hygiene:
 * - Clean expired sessions
 * - Clean expired OTPs
 * - Archive/delete old audit logs
 * - Compact permission cache
 * 
 * @module jobs/cleanupJobs
 */

const { getPrisma } = require('../lib/prisma');
const { redis, isEnabled: isRedisEnabled } = require('../cache/redisClient');
const { safeScanKeys } = require('../cache/services/permissionInvalidator');

const prisma = getPrisma();

// Configuration (can be overridden via environment)
const CONFIG = {
  SESSION_RETENTION_HOURS: parseInt(process.env.SESSION_RETENTION_HOURS) || 168, // 7 days
  OTP_RETENTION_HOURS: parseInt(process.env.OTP_RETENTION_HOURS) || 24,
  AUDIT_RETENTION_DAYS: parseInt(process.env.AUDIT_RETENTION_DAYS) || 90,
  SECURITY_EVENTS_RETENTION_DAYS: parseInt(process.env.SECURITY_EVENTS_RETENTION_DAYS) || 180,
  BATCH_SIZE: parseInt(process.env.CLEANUP_BATCH_SIZE) || 1000
};

/**
 * Clean expired user sessions
 * 
 * @returns {Promise<{deleted: number, errors: string[]}>}
 */
async function cleanExpiredSessions() {
  const result = { deleted: 0, errors: [] };

  try {
    // Database cleanup
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - CONFIG.SESSION_RETENTION_HOURS);

    // Delete expired sessions
    const dbResult = await prisma.$executeRaw`
      DELETE FROM user_sessions
      WHERE expires_at < NOW()
         OR (is_active = false AND updated_at < ${cutoffDate})
    `;
    result.deleted = dbResult;

    // Redis cleanup - scan for expired session keys
    if (isRedisEnabled()) {
      const sessionKeys = await safeScanKeys('session:*');
      let redisDeleted = 0;

      for (const key of sessionKeys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // No TTL set, delete it
          await redis.del(key);
          redisDeleted++;
        }
      }

      if (redisDeleted > 0) {
        console.log(`[cleanupJobs] Cleaned ${redisDeleted} orphaned Redis session keys`);
      }
    }

    console.log(`[cleanupJobs] Cleaned ${result.deleted} expired sessions`);
  } catch (error) {
    result.errors.push(`Session cleanup error: ${error.message}`);
    console.error('[cleanupJobs] cleanExpiredSessions error:', error);
  }

  return result;
}

/**
 * Clean expired OTPs
 * 
 * @returns {Promise<{deleted: number, errors: string[]}>}
 */
async function cleanExpiredOtps() {
  const result = { deleted: 0, errors: [] };

  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - CONFIG.OTP_RETENTION_HOURS);

    // Try multiple possible OTP table names
    const tableNames = ['otps', 'otp_codes', 'verification_codes', 'otp_tokens'];

    for (const tableName of tableNames) {
      try {
        const count = await prisma.$executeRawUnsafe(`
          DELETE FROM ${tableName}
          WHERE expires_at < NOW()
             OR created_at < $1
        `, cutoffDate);
        result.deleted += count;
        console.log(`[cleanupJobs] Cleaned ${count} expired OTPs from ${tableName}`);
      } catch (e) {
        // Table might not exist
        if (!e.message.includes('does not exist')) {
          result.errors.push(`${tableName}: ${e.message}`);
        }
      }
    }

    // Also clean Redis OTP keys if they exist
    if (isRedisEnabled()) {
      const otpKeys = await safeScanKeys('otp:*');
      if (otpKeys.length > 0) {
        let expired = 0;
        for (const key of otpKeys) {
          const ttl = await redis.ttl(key);
          if (ttl === -1 || ttl === -2) {
            await redis.del(key);
            expired++;
          }
        }
        if (expired > 0) {
          console.log(`[cleanupJobs] Cleaned ${expired} expired Redis OTP keys`);
        }
      }
    }
  } catch (error) {
    result.errors.push(`OTP cleanup error: ${error.message}`);
    console.error('[cleanupJobs] cleanExpiredOtps error:', error);
  }

  return result;
}

/**
 * Archive/delete old audit logs
 * 
 * @param {boolean} archive - If true, archive before delete
 * @returns {Promise<{deleted: number, archived: number, errors: string[]}>}
 */
async function cleanAuditLogs(archive = false) {
  const result = { deleted: 0, archived: 0, errors: [] };

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.AUDIT_RETENTION_DAYS);

    // Archive if requested
    if (archive) {
      try {
        // Create archive table if not exists
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS audit_logs_dml_archive (LIKE audit_logs_dml INCLUDING ALL)
        `;

        // Move old records to archive
        const archiveResult = await prisma.$executeRaw`
          WITH moved AS (
            DELETE FROM audit_logs_dml
            WHERE created_at < ${cutoffDate}
            RETURNING *
          )
          INSERT INTO audit_logs_dml_archive
          SELECT * FROM moved
        `;
        result.archived = archiveResult;
        result.deleted = archiveResult;
        console.log(`[cleanupJobs] Archived ${result.archived} audit log records`);
      } catch (e) {
        result.errors.push(`Archive error: ${e.message}`);
      }
    } else {
      // Delete in batches to avoid long locks
      let totalDeleted = 0;
      let batchDeleted;

      do {
        batchDeleted = await prisma.$executeRaw`
          DELETE FROM audit_logs_dml
          WHERE id IN (
            SELECT id FROM audit_logs_dml
            WHERE created_at < ${cutoffDate}
            LIMIT ${CONFIG.BATCH_SIZE}
          )
        `;
        totalDeleted += batchDeleted;

        if (batchDeleted > 0) {
          // Small pause between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } while (batchDeleted >= CONFIG.BATCH_SIZE);

      result.deleted = totalDeleted;
      console.log(`[cleanupJobs] Deleted ${result.deleted} old audit log records`);
    }

    // Clean security_events too
    try {
      const securityCutoff = new Date();
      securityCutoff.setDate(securityCutoff.getDate() - CONFIG.SECURITY_EVENTS_RETENTION_DAYS);

      const securityDeleted = await prisma.$executeRaw`
        DELETE FROM security_events
        WHERE created_at < ${securityCutoff}
      `;
      if (securityDeleted > 0) {
        console.log(`[cleanupJobs] Deleted ${securityDeleted} old security events`);
      }
    } catch (e) {
      // Table might not exist
    }
  } catch (error) {
    result.errors.push(`Audit log cleanup error: ${error.message}`);
    console.error('[cleanupJobs] cleanAuditLogs error:', error);
  }

  return result;
}

/**
 * Clean stale permission cache entries
 * 
 * @returns {Promise<{cleaned: number, errors: string[]}>}
 */
async function cleanStalePermissionCache() {
  const result = { cleaned: 0, errors: [] };

  if (!isRedisEnabled()) {
    return result;
  }

  try {
    const permKeys = await safeScanKeys('perm:*');
    
    for (const key of permKeys) {
      const ttl = await redis.ttl(key);
      
      // Clean keys with no TTL or very long TTL (shouldn't happen)
      if (ttl === -1 || ttl > 3600) {
        await redis.del(key);
        result.cleaned++;
      }
    }

    if (result.cleaned > 0) {
      console.log(`[cleanupJobs] Cleaned ${result.cleaned} stale permission cache entries`);
    }
  } catch (error) {
    result.errors.push(`Permission cache cleanup error: ${error.message}`);
    console.error('[cleanupJobs] cleanStalePermissionCache error:', error);
  }

  return result;
}

/**
 * Clean orphaned rate limit keys
 * 
 * @returns {Promise<{cleaned: number}>}
 */
async function cleanRateLimitKeys() {
  const result = { cleaned: 0 };

  if (!isRedisEnabled()) {
    return result;
  }

  try {
    const rateKeys = await safeScanKeys('rate:*');
    
    for (const key of rateKeys) {
      const ttl = await redis.ttl(key);
      
      // Clean keys with no TTL (should always have TTL)
      if (ttl === -1) {
        await redis.del(key);
        result.cleaned++;
      }
    }

    if (result.cleaned > 0) {
      console.log(`[cleanupJobs] Cleaned ${result.cleaned} orphaned rate limit keys`);
    }
  } catch (error) {
    console.error('[cleanupJobs] cleanRateLimitKeys error:', error);
  }

  return result;
}

/**
 * Clean expired locks
 * 
 * @returns {Promise<{cleaned: number}>}
 */
async function cleanExpiredLocks() {
  const result = { cleaned: 0 };

  if (!isRedisEnabled()) {
    return result;
  }

  try {
    const lockKeys = await safeScanKeys('lock:*');
    
    for (const key of lockKeys) {
      const ttl = await redis.ttl(key);
      
      // Clean keys with no TTL or expired
      if (ttl === -1 || ttl === -2) {
        await redis.del(key);
        result.cleaned++;
      }
    }

    if (result.cleaned > 0) {
      console.log(`[cleanupJobs] Cleaned ${result.cleaned} expired lock keys`);
    }
  } catch (error) {
    console.error('[cleanupJobs] cleanExpiredLocks error:', error);
  }

  return result;
}

/**
 * Vacuum and analyze tables for performance
 * 
 * @returns {Promise<{vacuumed: string[], errors: string[]}>}
 */
async function vacuumAnalyzeTables() {
  const result = { vacuumed: [], errors: [] };

  const tables = [
    'audit_logs_dml',
    'user_sessions',
    'security_events'
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`VACUUM ANALYZE ${table}`);
      result.vacuumed.push(table);
    } catch (e) {
      if (!e.message.includes('does not exist')) {
        result.errors.push(`${table}: ${e.message}`);
      }
    }
  }

  if (result.vacuumed.length > 0) {
    console.log(`[cleanupJobs] Vacuumed tables: ${result.vacuumed.join(', ')}`);
  }

  return result;
}

/**
 * Run all cleanup jobs
 * 
 * @param {Object} options - Options
 * @param {boolean} options.archiveAuditLogs - Archive instead of delete
 * @param {boolean} options.vacuum - Run VACUUM ANALYZE
 * @returns {Promise<Object>} Combined results
 */
async function runAllCleanupJobs(options = {}) {
  console.log('[cleanupJobs] Starting all cleanup jobs...');
  const startTime = Date.now();

  const results = {
    timestamp: new Date().toISOString(),
    sessions: await cleanExpiredSessions(),
    otps: await cleanExpiredOtps(),
    auditLogs: await cleanAuditLogs(options.archiveAuditLogs || false),
    permissionCache: await cleanStalePermissionCache(),
    rateLimits: await cleanRateLimitKeys(),
    locks: await cleanExpiredLocks()
  };

  if (options.vacuum) {
    results.vacuum = await vacuumAnalyzeTables();
  }

  results.durationMs = Date.now() - startTime;
  console.log(`[cleanupJobs] All cleanup jobs completed in ${results.durationMs}ms`);

  return results;
}

/**
 * Schedule cleanup jobs using node-cron or setInterval
 * 
 * @param {Object} schedule - Cron expressions or intervals
 */
function scheduleCleanupJobs(schedule = {}) {
  const {
    sessionsInterval = 3600000,    // 1 hour
    otpsInterval = 1800000,         // 30 minutes
    auditLogsInterval = 86400000,   // 24 hours
    cacheInterval = 300000          // 5 minutes
  } = schedule;

  console.log('[cleanupJobs] Scheduling cleanup jobs...');

  // Session cleanup
  setInterval(() => {
    cleanExpiredSessions().catch(console.error);
  }, sessionsInterval);

  // OTP cleanup
  setInterval(() => {
    cleanExpiredOtps().catch(console.error);
  }, otpsInterval);

  // Audit log cleanup (daily)
  setInterval(() => {
    cleanAuditLogs().catch(console.error);
  }, auditLogsInterval);

  // Cache cleanup
  setInterval(() => {
    cleanStalePermissionCache().catch(console.error);
    cleanRateLimitKeys().catch(console.error);
    cleanExpiredLocks().catch(console.error);
  }, cacheInterval);

  console.log('[cleanupJobs] Cleanup jobs scheduled');
}

module.exports = {
  // Individual jobs
  cleanExpiredSessions,
  cleanExpiredOtps,
  cleanAuditLogs,
  cleanStalePermissionCache,
  cleanRateLimitKeys,
  cleanExpiredLocks,
  vacuumAnalyzeTables,

  // Combined
  runAllCleanupJobs,
  scheduleCleanupJobs,

  // Config
  CONFIG
};
