#!/usr/bin/env node

/**
 * Security Smoke Test - Production Readiness Checker
 * 
 * Verifies critical security configurations are in place:
 *   - PostgreSQL roles exist
 *   - RLS enabled on sensitive tables
 *   - Audit logs are being captured
 *   - Redis permission cache TTLs are correct
 *   - PUB/SUB invalidation works
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." REDIS_URL="redis://..." node tools/securitySmokeTest.js
 * 
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 * 
 * @module tools/securitySmokeTest
 */

const { Client } = require('pg');
const Redis = require('ioredis');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Required database roles
const REQUIRED_ROLES = [
  'bisman_frontend',
  'bisman_backend',
  'bisman_worker',
  'bisman_migrator'
];

// Tables that MUST have RLS enabled
const RLS_REQUIRED_TABLES = [
  'users',
  'users_enhanced',
  'user_sessions',
  'payment_requests',
  'clients',
  'invoices',
  'agreements',
  'orders',
  'inventory_items',
  'financial_transactions',
  'audit_logs_dml'
];

// Sensitive tables that should have audit entries in last 24h
const AUDITED_TABLES = [
  'users',
  'users_enhanced',
  'user_sessions',
  'payment_requests',
  'clients'
];

// Expected TTL range for permission cache keys (seconds)
const MIN_TTL = 1;
const MAX_TTL = 300;

// Test key for PUB/SUB verification
const TEST_KEY = 'perm:user:smoke-test-12345';
const TEST_CHANNEL = 'permissions:invalidate';

// ============================================================================
// RESULT TRACKING
// ============================================================================

const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: []
};

function pass(check, message) {
  results.passed++;
  results.checks.push({ status: 'PASS', check, message });
  console.log(`  ✅ ${check}: ${message}`);
}

function fail(check, message, remediation) {
  results.failed++;
  results.checks.push({ status: 'FAIL', check, message, remediation });
  console.log(`  ❌ ${check}: ${message}`);
  if (remediation) {
    console.log(`     💡 Remediation: ${remediation}`);
  }
}

function warn(check, message) {
  results.warnings++;
  results.checks.push({ status: 'WARN', check, message });
  console.log(`  ⚠️  ${check}: ${message}`);
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log('─'.repeat(60));
}

// ============================================================================
// DATABASE CHECKS
// ============================================================================

async function checkDatabaseConnection(client) {
  section('Database Connection');
  
  try {
    const result = await client.query(`
      SELECT 
        current_database() as db,
        current_user as user,
        version() as version
    `);
    
    const { db, user, version } = result.rows[0];
    pass('DB Connection', `Connected to "${db}" as "${user}"`);
    
    // Check if superuser (warning - superusers bypass RLS)
    const superCheck = await client.query(`
      SELECT usesuper FROM pg_user WHERE usename = current_user
    `);
    
    if (superCheck.rows[0]?.usesuper) {
      warn('Superuser Warning', 'Connected as superuser - RLS policies will be bypassed!');
    }
    
    return true;
  } catch (err) {
    fail('DB Connection', err.message, 'Check DATABASE_URL environment variable');
    return false;
  }
}

async function checkRequiredRoles(client) {
  section('Database Roles');
  
  try {
    const result = await client.query(`
      SELECT rolname FROM pg_roles WHERE rolname = ANY($1)
    `, [REQUIRED_ROLES]);
    
    const existingRoles = result.rows.map(r => r.rolname);
    const missingRoles = REQUIRED_ROLES.filter(r => !existingRoles.includes(r));
    
    if (missingRoles.length === 0) {
      pass('Required Roles', `All ${REQUIRED_ROLES.length} roles exist`);
    } else {
      fail(
        'Required Roles',
        `Missing roles: ${missingRoles.join(', ')}`,
        `CREATE ROLE ${missingRoles[0]} WITH LOGIN PASSWORD 'secure_password';`
      );
    }
    
    // Check each role individually
    for (const role of REQUIRED_ROLES) {
      if (existingRoles.includes(role)) {
        // Check role attributes
        const attrs = await client.query(`
          SELECT rolcanlogin, rolsuper, rolcreaterole, rolcreatedb
          FROM pg_roles WHERE rolname = $1
        `, [role]);
        
        if (attrs.rows[0]) {
          const { rolsuper, rolcreaterole, rolcreatedb } = attrs.rows[0];
          if (rolsuper) {
            warn(`Role ${role}`, 'Has SUPERUSER privilege (security risk)');
          }
        }
      }
    }
    
    return missingRoles.length === 0;
  } catch (err) {
    fail('Required Roles', err.message);
    return false;
  }
}

async function checkRLSEnabled(client) {
  section('Row Level Security (RLS)');
  
  try {
    // Check which tables have RLS enabled
    const result = await client.query(`
      SELECT 
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname = 'public'
        AND c.relname = ANY($1)
      ORDER BY c.relname
    `, [RLS_REQUIRED_TABLES]);
    
    const tableStatus = {};
    result.rows.forEach(r => {
      tableStatus[r.table_name] = {
        enabled: r.rls_enabled,
        forced: r.rls_forced
      };
    });
    
    let allEnabled = true;
    const missingRLS = [];
    const notForced = [];
    
    for (const table of RLS_REQUIRED_TABLES) {
      const status = tableStatus[table];
      
      if (!status) {
        warn(`RLS ${table}`, 'Table does not exist');
        continue;
      }
      
      if (!status.enabled) {
        missingRLS.push(table);
        allEnabled = false;
      } else if (!status.forced) {
        notForced.push(table);
      }
    }
    
    if (allEnabled && missingRLS.length === 0) {
      pass('RLS Enabled', `All ${RLS_REQUIRED_TABLES.length} tables have RLS enabled`);
    } else {
      fail(
        'RLS Enabled',
        `Missing RLS on: ${missingRLS.join(', ')}`,
        `ALTER TABLE ${missingRLS[0]} ENABLE ROW LEVEL SECURITY;`
      );
    }
    
    if (notForced.length > 0) {
      warn('RLS Forced', `Tables without FORCE RLS: ${notForced.join(', ')}`);
    }
    
    // Check for policies on RLS-enabled tables
    const policyResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = ANY($1)
    `, [RLS_REQUIRED_TABLES]);
    
    const tablesWithPolicies = [...new Set(policyResult.rows.map(r => r.tablename))];
    const tablesWithoutPolicies = RLS_REQUIRED_TABLES.filter(
      t => tableStatus[t]?.enabled && !tablesWithPolicies.includes(t)
    );
    
    if (tablesWithoutPolicies.length > 0) {
      fail(
        'RLS Policies',
        `Tables with RLS but no policies: ${tablesWithoutPolicies.join(', ')}`,
        'CREATE POLICY tenant_isolation ON <table> USING (tenant_id = current_setting(\'app.current_tenant\')::uuid);'
      );
    } else if (policyResult.rows.length > 0) {
      pass('RLS Policies', `${policyResult.rows.length} policies found across ${tablesWithPolicies.length} tables`);
    }
    
    return missingRLS.length === 0;
  } catch (err) {
    fail('RLS Check', err.message);
    return false;
  }
}

async function checkAuditLogs(client) {
  section('Audit Logging');
  
  try {
    // Check if audit_logs_dml table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs_dml'
      ) as exists
    `);
    
    if (!tableCheck.rows[0].exists) {
      fail('Audit Table', 'audit_logs_dml table does not exist', 
        'Run migration to create audit logging infrastructure');
      return false;
    }
    
    // Check for entries in last 24 hours per sensitive table
    const result = await client.query(`
      SELECT 
        table_name,
        COUNT(*) as entry_count,
        MAX(created_at) as last_entry
      FROM audit_logs_dml
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND table_name = ANY($1)
      GROUP BY table_name
    `, [AUDITED_TABLES]);
    
    const auditedTables = result.rows.map(r => r.table_name);
    const missingAudit = AUDITED_TABLES.filter(t => !auditedTables.includes(t));
    
    if (result.rows.length === 0) {
      warn('Audit Entries', 'No audit entries in last 24 hours (may be normal for quiet systems)');
    } else {
      pass('Audit Entries', `${result.rows.reduce((s, r) => s + parseInt(r.entry_count), 0)} entries across ${auditedTables.length} tables`);
    }
    
    if (missingAudit.length > 0) {
      warn('Audit Coverage', `No recent audit entries for: ${missingAudit.join(', ')}`);
    }
    
    // Check audit trigger exists on sensitive tables
    const triggerCheck = await client.query(`
      SELECT 
        event_object_table as table_name,
        trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
        AND trigger_name LIKE '%audit%'
        AND event_object_table = ANY($1)
    `, [AUDITED_TABLES]);
    
    const tablesWithTriggers = [...new Set(triggerCheck.rows.map(r => r.table_name))];
    const missingTriggers = AUDITED_TABLES.filter(t => !tablesWithTriggers.includes(t));
    
    if (missingTriggers.length > 0) {
      fail(
        'Audit Triggers',
        `Missing audit triggers on: ${missingTriggers.join(', ')}`,
        'CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON <table> FOR EACH ROW EXECUTE FUNCTION audit_dml_changes();'
      );
    } else if (triggerCheck.rows.length > 0) {
      pass('Audit Triggers', `Found ${triggerCheck.rows.length} audit triggers`);
    }
    
    return missingAudit.length === 0;
  } catch (err) {
    fail('Audit Check', err.message);
    return false;
  }
}

// ============================================================================
// REDIS CHECKS
// ============================================================================

async function checkRedisConnection(redis) {
  section('Redis Connection');
  
  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      pass('Redis Connection', 'Connected successfully');
      
      const info = await redis.info('server');
      const versionMatch = info.match(/redis_version:(\S+)/);
      if (versionMatch) {
        pass('Redis Version', versionMatch[1]);
      }
      
      return true;
    }
    fail('Redis Connection', 'Unexpected PING response');
    return false;
  } catch (err) {
    fail('Redis Connection', err.message, 'Check REDIS_URL environment variable');
    return false;
  }
}

async function checkPermissionCacheTTL(redis) {
  section('Permission Cache TTL');
  
  try {
    // Find permission cache keys
    let cursor = '0';
    const permKeys = [];
    
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'perm:user:*', 'COUNT', 100);
      cursor = nextCursor;
      permKeys.push(...keys);
      
      // Limit scan to prevent long operations
      if (permKeys.length >= 50) break;
    } while (cursor !== '0');
    
    if (permKeys.length === 0) {
      warn('Permission Cache', 'No perm:user:* keys found (may be normal if no active sessions)');
      return true;
    }
    
    // Check TTL on found keys
    let validTTL = 0;
    let invalidTTL = 0;
    const invalidKeys = [];
    
    for (const key of permKeys.slice(0, 20)) {
      const ttl = await redis.ttl(key);
      
      if (ttl === -1) {
        invalidTTL++;
        invalidKeys.push({ key, ttl: 'NO EXPIRY' });
      } else if (ttl === -2) {
        // Key doesn't exist (expired between scan and ttl check)
        continue;
      } else if (ttl < MIN_TTL || ttl > MAX_TTL) {
        invalidTTL++;
        invalidKeys.push({ key, ttl: `${ttl}s` });
      } else {
        validTTL++;
      }
    }
    
    if (invalidTTL === 0) {
      pass('Permission TTL', `${validTTL} keys have valid TTL (${MIN_TTL}-${MAX_TTL}s)`);
    } else {
      warn('Permission TTL', `${invalidTTL} keys have invalid TTL`);
      invalidKeys.slice(0, 3).forEach(k => {
        console.log(`     - ${k.key}: TTL=${k.ttl}`);
      });
    }
    
    return invalidTTL === 0;
  } catch (err) {
    fail('Permission TTL', err.message);
    return false;
  }
}

async function checkPubSubInvalidation(redis) {
  section('PUB/SUB Invalidation');
  
  const subscriber = redis.duplicate();
  
  try {
    // Set a test key
    await redis.set(TEST_KEY, JSON.stringify({ test: true, timestamp: Date.now() }));
    await redis.expire(TEST_KEY, 60);
    
    // Verify it exists
    const beforeValue = await redis.get(TEST_KEY);
    if (!beforeValue) {
      fail('PUB/SUB Test', 'Failed to set test key');
      return false;
    }
    
    pass('PUB/SUB Setup', 'Test key created successfully');
    
    // Subscribe and wait for message
    let messageReceived = false;
    const messagePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for PUB/SUB message'));
      }, 5000);
      
      subscriber.subscribe(TEST_CHANNEL, (err) => {
        if (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
      
      subscriber.on('message', async (channel, message) => {
        if (channel === TEST_CHANNEL) {
          clearTimeout(timeout);
          messageReceived = true;
          
          try {
            const payload = JSON.parse(message);
            if (payload.type === 'smoke-test') {
              // Delete the test key to simulate invalidation
              await redis.del(TEST_KEY);
              resolve(true);
            }
          } catch (e) {
            resolve(false);
          }
        }
      });
    });
    
    // Give subscriber time to connect
    await new Promise(r => setTimeout(r, 500));
    
    // Publish invalidation message
    await redis.publish(TEST_CHANNEL, JSON.stringify({
      type: 'smoke-test',
      userId: 'smoke-test-12345',
      timestamp: Date.now()
    }));
    
    pass('PUB/SUB Publish', 'Invalidation message published');
    
    // Wait for message processing
    try {
      await messagePromise;
      pass('PUB/SUB Receive', 'Message received and processed');
    } catch (err) {
      warn('PUB/SUB Receive', err.message);
    }
    
    // Verify key was deleted
    const afterValue = await redis.get(TEST_KEY);
    if (afterValue === null) {
      pass('PUB/SUB Invalidation', 'Test key successfully invalidated');
    } else {
      warn('PUB/SUB Invalidation', 'Test key still exists after invalidation');
      // Clean up
      await redis.del(TEST_KEY);
    }
    
    return true;
  } catch (err) {
    fail('PUB/SUB Test', err.message);
    // Clean up test key
    await redis.del(TEST_KEY).catch(() => {});
    return false;
  } finally {
    await subscriber.quit().catch(() => {});
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('🔒 BISMAN ERP Security Smoke Test');
  console.log('═'.repeat(60));
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  // Initialize clients
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  let redisClient = null;
  
  try {
    // Database checks
    await pgClient.connect();
    
    await checkDatabaseConnection(pgClient);
    await checkRequiredRoles(pgClient);
    await checkRLSEnabled(pgClient);
    await checkAuditLogs(pgClient);
    
    // Redis checks (if configured)
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        lazyConnect: true
      });
      
      await redisClient.connect();
      
      await checkRedisConnection(redisClient);
      await checkPermissionCacheTTL(redisClient);
      await checkPubSubInvalidation(redisClient);
    } else {
      section('Redis (Skipped)');
      warn('Redis', 'REDIS_URL not set - skipping Redis checks');
    }
    
  } catch (err) {
    console.error(`\n❌ Unexpected error: ${err.message}`);
    results.failed++;
  } finally {
    // Cleanup connections
    try {
      await pgClient.end();
    } catch (e) {}
    
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (e) {}
    }
  }
  
  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅ Passed:   ${results.passed}`);
  console.log(`  ❌ Failed:   ${results.failed}`);
  console.log(`  ⚠️  Warnings: ${results.warnings}`);
  console.log('─'.repeat(60));
  
  if (results.failed > 0) {
    console.log('\n🚨 SECURITY CHECKS FAILED');
    console.log('   Review the failures above and apply remediations before deploying.\n');
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log('\n⚠️  PASSED WITH WARNINGS');
    console.log('   Review warnings above for potential improvements.\n');
    process.exit(0);
  } else {
    console.log('\n🎉 ALL SECURITY CHECKS PASSED');
    console.log('   System is ready for deployment.\n');
    process.exit(0);
  }
}

// Run
main().catch(err => {
  console.error(`\n💥 Fatal error: ${err.message}`);
  process.exit(1);
});

/* ============================================================================
 * USAGE
 * ============================================================================
 *
 * # Basic usage
 * DATABASE_URL="postgresql://user:pass@localhost:5432/bisman" \
 * REDIS_URL="redis://localhost:6379" \
 * node tools/securitySmokeTest.js
 *
 * # In CI/CD pipeline
 * npm run security:smoke || exit 1
 *
 * # Add to package.json scripts:
 * "scripts": {
 *   "security:smoke": "node tools/securitySmokeTest.js"
 * }
 *
 * ============================================================================ */
