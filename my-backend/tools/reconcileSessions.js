#!/usr/bin/env node

/**
 * Session Reconciliation Job
 * 
 * Cleans up stale session references in Redis that no longer exist
 * in the database (user_sessions table). This prevents memory leaks
 * and ensures Redis session sets accurately reflect active sessions.
 * 
 * What it does:
 *   1. SCAN all session:user:{id} Redis sets
 *   2. For each set, get all session token hashes
 *   3. Check if those sessions still exist and are active in DB
 *   4. Remove stale/expired session references from Redis
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." REDIS_URL="redis://..." node tools/reconcileSessions.js
 * 
 * Cron example (run every 6 hours):
 *   0 0,6,12,18 * * * cd /app && node tools/reconcileSessions.js >> /var/log/session-reconcile.log 2>&1
 * 
 * @module tools/reconcileSessions
 */

'use strict';

const { Client } = require('pg');
const Redis = require('ioredis');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Redis key patterns (must match sessionCache.js)
const SESSION_USER_NS = 'session:user';
const SESSION_NS = 'session';

// Batch sizes for processing
const SCAN_COUNT = 100;        // Keys per SCAN iteration
const DB_BATCH_SIZE = 50;      // Sessions to check per DB query
const MAX_KEYS_PER_RUN = 1000; // Safety limit per execution

// Dry run mode (set via env var)
const DRY_RUN = process.env.DRY_RUN === 'true';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate session:user:{userId} key
 */
function userSessionsKey(userId) {
  return `${SESSION_USER_NS}:${userId}`;
}

/**
 * Generate session:{tokenHash} key
 */
function sessionKey(tokenHash) {
  return `${SESSION_NS}:${tokenHash}`;
}

/**
 * Extract userId from session:user:{userId} key
 */
function extractUserId(key) {
  const match = key.match(/^session:user:(.+)$/);
  return match ? match[1] : null;
}

// ============================================================================
// STATS TRACKING
// ============================================================================

const stats = {
  usersProcessed: 0,
  sessionsChecked: 0,
  sessionsCleanedFromSets: 0,
  sessionKeysDeleted: 0,
  emptyUserSetsDeleted: 0,
  skipped: 0,
  errors: 0,
  startTime: null,
  endTime: null
};

// ============================================================================
// MAIN RECONCILIATION LOGIC
// ============================================================================

async function reconcileSessions(pgClient, redisClient) {
  console.log('\n' + '═'.repeat(60));
  console.log('🔄 Session Reconciliation Job');
  console.log('═'.repeat(60));
  console.log(`📅 Started: ${new Date().toISOString()}`);
  console.log(`🔧 Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('─'.repeat(60));

  stats.startTime = Date.now();

  // Step 1: SCAN all session:user:* keys
  console.log('\n📌 Step 1: Scanning Redis for session:user:* keys...');
  
  const userKeys = [];
  let cursor = '0';
  
  do {
    const [nextCursor, keys] = await redisClient.scan(
      cursor,
      'MATCH',
      `${SESSION_USER_NS}:*`,
      'COUNT',
      SCAN_COUNT
    );
    cursor = nextCursor;
    userKeys.push(...keys);
    
    // Safety limit
    if (userKeys.length >= MAX_KEYS_PER_RUN) {
      console.log(`   ⚠️  Reached max keys limit (${MAX_KEYS_PER_RUN}), will continue next run`);
      break;
    }
  } while (cursor !== '0');

  console.log(`   Found ${userKeys.length} session:user:* keys`);

  if (userKeys.length === 0) {
    console.log('\n✅ No session keys found. Nothing to reconcile.');
    return stats;
  }

  // Step 2: Process each user's session set
  console.log('\n📌 Step 2: Checking sessions against database...');

  for (const userKey of userKeys) {
    const userId = extractUserId(userKey);
    
    if (!userId) {
      console.log(`   ⚠️  Skipping invalid key: ${userKey}`);
      stats.skipped++;
      continue;
    }

    try {
      await processUserSessions(pgClient, redisClient, userId, userKey);
      stats.usersProcessed++;
    } catch (err) {
      console.error(`   ❌ Error processing ${userKey}: ${err.message}`);
      stats.errors++;
    }
  }

  stats.endTime = Date.now();
  return stats;
}

/**
 * Process all sessions for a single user
 */
async function processUserSessions(pgClient, redisClient, userId, userKey) {
  // Get all session token hashes from Redis set
  const tokenHashes = await redisClient.smembers(userKey);
  
  if (tokenHashes.length === 0) {
    // Empty set - can be deleted
    if (!DRY_RUN) {
      await redisClient.del(userKey);
    }
    stats.emptyUserSetsDeleted++;
    console.log(`   🗑️  Deleted empty set: ${userKey}`);
    return;
  }

  stats.sessionsChecked += tokenHashes.length;

  // Batch check sessions in database
  const staleTokenHashes = [];
  
  for (let i = 0; i < tokenHashes.length; i += DB_BATCH_SIZE) {
    const batch = tokenHashes.slice(i, i + DB_BATCH_SIZE);
    
    // Query database for valid sessions
    const result = await pgClient.query(`
      SELECT token_hash
      FROM user_sessions
      WHERE token_hash = ANY($1)
        AND is_active = true
        AND expires_at > NOW()
    `, [batch]);
    
    const validHashes = new Set(result.rows.map(r => r.token_hash));
    
    // Find stale sessions (in Redis but not valid in DB)
    for (const hash of batch) {
      if (!validHashes.has(hash)) {
        staleTokenHashes.push(hash);
      }
    }
  }

  // Remove stale sessions from Redis
  if (staleTokenHashes.length > 0) {
    console.log(`   🧹 User ${userId}: Removing ${staleTokenHashes.length} stale session(s)`);
    
    if (!DRY_RUN) {
      // Remove from user's session set
      await redisClient.srem(userKey, ...staleTokenHashes);
      stats.sessionsCleanedFromSets += staleTokenHashes.length;
      
      // Delete individual session keys
      const sessionKeys = staleTokenHashes.map(h => sessionKey(h));
      const deleted = await redisClient.del(...sessionKeys);
      stats.sessionKeysDeleted += deleted;
    } else {
      stats.sessionsCleanedFromSets += staleTokenHashes.length;
      stats.sessionKeysDeleted += staleTokenHashes.length;
    }
  }

  // Check if user set is now empty
  if (!DRY_RUN) {
    const remainingCount = await redisClient.scard(userKey);
    if (remainingCount === 0) {
      await redisClient.del(userKey);
      stats.emptyUserSetsDeleted++;
      console.log(`   🗑️  Deleted now-empty set: ${userKey}`);
    }
  }
}

// ============================================================================
// ORPHAN SESSION KEY CLEANUP
// ============================================================================

async function cleanOrphanSessionKeys(pgClient, redisClient) {
  console.log('\n📌 Step 3: Scanning for orphan session:* keys...');
  
  const orphanKeys = [];
  let cursor = '0';
  let scanned = 0;
  
  do {
    const [nextCursor, keys] = await redisClient.scan(
      cursor,
      'MATCH',
      `${SESSION_NS}:*`,
      'COUNT',
      SCAN_COUNT
    );
    cursor = nextCursor;
    
    // Filter to only session:{hash} keys (not session:user:*)
    const sessionOnlyKeys = keys.filter(k => !k.startsWith(SESSION_USER_NS));
    
    for (const key of sessionOnlyKeys) {
      const tokenHash = key.replace(`${SESSION_NS}:`, '');
      
      // Check if session exists in DB
      const result = await pgClient.query(`
        SELECT 1 FROM user_sessions
        WHERE token_hash = $1
          AND is_active = true
          AND expires_at > NOW()
        LIMIT 1
      `, [tokenHash]);
      
      if (result.rows.length === 0) {
        orphanKeys.push(key);
      }
      
      scanned++;
      if (scanned >= MAX_KEYS_PER_RUN) break;
    }
    
    if (scanned >= MAX_KEYS_PER_RUN) break;
  } while (cursor !== '0');

  console.log(`   Scanned ${scanned} session keys, found ${orphanKeys.length} orphans`);

  if (orphanKeys.length > 0 && !DRY_RUN) {
    const deleted = await redisClient.del(...orphanKeys);
    console.log(`   🗑️  Deleted ${deleted} orphan session keys`);
    stats.sessionKeysDeleted += deleted;
  } else if (orphanKeys.length > 0) {
    console.log(`   🔍 Would delete ${orphanKeys.length} orphan keys (dry run)`);
    stats.sessionKeysDeleted += orphanKeys.length;
  }
}

// ============================================================================
// PRINT SUMMARY
// ============================================================================

function printSummary() {
  const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RECONCILIATION SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ⏱️  Duration:               ${duration}s`);
  console.log(`  👥 Users Processed:         ${stats.usersProcessed}`);
  console.log(`  🔍 Sessions Checked:        ${stats.sessionsChecked}`);
  console.log(`  🧹 Sessions Cleaned:        ${stats.sessionsCleanedFromSets}`);
  console.log(`  🗑️  Session Keys Deleted:   ${stats.sessionKeysDeleted}`);
  console.log(`  📭 Empty Sets Deleted:      ${stats.emptyUserSetsDeleted}`);
  console.log(`  ⏭️  Skipped:                 ${stats.skipped}`);
  console.log(`  ❌ Errors:                  ${stats.errors}`);
  console.log('─'.repeat(60));
  
  if (DRY_RUN) {
    console.log('  ℹ️  DRY RUN - No changes were made');
  }
  
  if (stats.errors > 0) {
    console.log('\n⚠️  Completed with errors. Review logs above.');
  } else {
    console.log('\n✅ Reconciliation completed successfully.');
  }
  console.log('');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.REDIS_URL) {
    console.error('❌ REDIS_URL environment variable is required');
    process.exit(1);
  }

  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  const redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: true
  });

  try {
    // Connect to services
    await pgClient.connect();
    console.log('📌 Connected to PostgreSQL');
    
    await redisClient.connect().catch(() => {});
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      console.log('📌 Connected to Redis');
    }

    // Run reconciliation
    await reconcileSessions(pgClient, redisClient);
    
    // Optional: Clean orphan session keys
    await cleanOrphanSessionKeys(pgClient, redisClient);
    
    // Print summary
    stats.endTime = Date.now();
    printSummary();

    process.exit(stats.errors > 0 ? 1 : 0);
    
  } catch (err) {
    console.error(`\n💥 Fatal error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    // Cleanup connections
    try {
      await pgClient.end();
    } catch (e) {}
    
    try {
      await redisClient.quit();
    } catch (e) {}
  }
}

// Run
main();

/* ============================================================================
 * CRON SCHEDULING EXAMPLES
 * ============================================================================
 *
 * Using node-cron in your application:
 * 
 *   const cron = require('node-cron');
 *   const { execSync } = require('child_process');
 *   
 *   // Run every 6 hours - cron: 0 STAR/6 * * * (replace STAR with asterisk)
 *   cron.schedule('0 0,6,12,18 * * *', () => {
 *     try {
 *       execSync('node tools/reconcileSessions.js', {
 *         env: process.env,
 *         stdio: 'inherit'
 *       });
 *     } catch (err) {
 *       console.error('Session reconciliation failed:', err.message);
 *     }
 *   });
 *
 * Using system crontab:
 * 
 *   # Edit crontab
 *   crontab -e
 *   
 *   # Add entry (every 6 hours): 0 0,6,12,18 * * *
 *   0 0,6,12,18 * * * cd /app/my-backend && DATABASE_URL="..." REDIS_URL="..." node tools/reconcileSessions.js >> /var/log/bisman/session-reconcile.log 2>&1
 *   
 *   # Run daily at 3 AM
 *   0 3 * * * cd /app/my-backend && DATABASE_URL="..." REDIS_URL="..." node tools/reconcileSessions.js >> /var/log/bisman/session-reconcile.log 2>&1
 *
 * Using PM2 ecosystem:
 * 
 *   // ecosystem.config.js
 *   module.exports = {
 *     apps: [{
 *       name: 'session-reconcile',
 *       script: 'tools/reconcileSessions.js',
 *       cron_restart: '0 0,6,12,18 * * *',
 *       autorestart: false,
 *       watch: false
 *     }]
 *   };
 *
 * ============================================================================ */
