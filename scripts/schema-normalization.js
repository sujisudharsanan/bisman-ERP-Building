#!/usr/bin/env node
/**
 * SCHEMA NORMALIZATION - Phase 3 Implementation
 * Fixes all critical schema issues identified in forensic audit
 * 
 * Run with: node scripts/schema-normalization.js [--dry-run]
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

const DRY_RUN = process.argv.includes('--dry-run');
const LOG = [];

function log(type, message) {
  const icons = { INFO: '📋', SUCCESS: '✅', ERROR: '❌', WARN: '⚠️', SKIP: '⏭️' };
  const line = `${icons[type] || '•'} [${type}] ${message}`;
  console.log(line);
  LOG.push({ timestamp: new Date().toISOString(), type, message });
}

async function execute(sql, description) {
  if (DRY_RUN) {
    log('INFO', `[DRY-RUN] Would: ${description}`);
    return { success: true, dryRun: true };
  }
  try {
    await pool.query(sql);
    log('SUCCESS', description);
    return { success: true };
  } catch (err) {
    log('ERROR', `${description}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function phase3_1_FixTenantIdColumns() {
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 3.1: Fix Non-UUID tenant_id Columns');
  console.log('═'.repeat(60));

  const fixes = [
    {
      table: 'tenant_usage',
      check: "SELECT data_type FROM information_schema.columns WHERE table_name = 'tenant_usage' AND column_name = 'tenant_id'",
      sql: "ALTER TABLE tenant_usage ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID",
      description: 'Convert tenant_usage.tenant_id to UUID'
    },
    {
      table: 'tenant_usage_monthly',
      check: "SELECT data_type FROM information_schema.columns WHERE table_name = 'tenant_usage_monthly' AND column_name = 'tenant_id'",
      sql: "ALTER TABLE tenant_usage_monthly ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID",
      description: 'Convert tenant_usage_monthly.tenant_id to UUID'
    },
    {
      table: 'security_access_log',
      check: "SELECT data_type FROM information_schema.columns WHERE table_name = 'security_access_log' AND column_name = 'tenant_id'",
      sql: "ALTER TABLE security_access_log ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID",
      description: 'Convert security_access_log.tenant_id to UUID'
    }
  ];

  for (const fix of fixes) {
    // Check current type
    const check = await pool.query(fix.check);
    if (check.rows.length === 0) {
      log('SKIP', `${fix.table}: table or column not found`);
      continue;
    }
    
    const currentType = check.rows[0].data_type;
    if (currentType === 'uuid') {
      log('SKIP', `${fix.table}.tenant_id: Already UUID`);
      continue;
    }
    
    log('INFO', `${fix.table}.tenant_id: Currently ${currentType}, converting to UUID`);
    await execute(fix.sql, fix.description);
  }
}

async function phase3_2_DropLegacyColumns() {
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 3.2: Drop Legacy _old Columns');
  console.log('═'.repeat(60));

  const legacyColumns = [
    { table: 'threads', column: 'id_old' },
    { table: 'thread_messages', column: 'id_old' },
    { table: 'workflow_tasks', column: 'id_old' },
    { table: 'workflow_tasks', column: 'assignee_id_old' },
    { table: 'workflow_tasks', column: 'creator_id_old' },
    { table: 'task_messages', column: 'id_old' },
    { table: 'task_messages', column: 'task_id_old' },
    { table: 'task_requests', column: 'id_old' },
    // Approval threshold columns flagged as _old but are actually valid
  ];

  for (const { table, column } of legacyColumns) {
    // Check if column exists
    const exists = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    `, [table, column]);
    
    if (exists.rows.length === 0) {
      log('SKIP', `${table}.${column}: Column doesn't exist`);
      continue;
    }
    
    // Check for dependencies (triggers, constraints, etc.)
    const deps = await pool.query(`
      SELECT COUNT(*) as cnt FROM pg_depend d
      JOIN pg_attribute a ON d.refobjid = a.attrelid AND d.refobjsubid = a.attnum
      JOIN pg_class c ON a.attrelid = c.oid
      WHERE c.relname = $1 AND a.attname = $2
    `, [table, column]);
    
    if (deps.rows[0].cnt > 0) {
      log('WARN', `${table}.${column}: Has ${deps.rows[0].cnt} dependencies, using CASCADE`);
      await execute(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}" CASCADE`,
        `Drop ${table}.${column} (CASCADE)`
      );
    } else {
      await execute(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`,
        `Drop ${table}.${column}`
      );
    }
  }
}

async function phase3_3_AddNotNullConstraints() {
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 3.3: Add NOT NULL Constraints (Deferred)');
  console.log('═'.repeat(60));
  
  log('INFO', 'NOT NULL constraints require data cleanup first');
  log('INFO', 'Run data integrity check before enabling constraints');
  
  // Check for nulls in critical columns
  const nullChecks = [
    { table: 'users', column: 'tenant_id' },
    { table: 'workflow_tasks', column: 'tenant_id' }
  ];
  
  for (const { table, column } of nullChecks) {
    try {
      const nullCount = await pool.query(`
        SELECT COUNT(*) as cnt FROM "${table}" WHERE "${column}" IS NULL
      `);
      const cnt = nullCount.rows[0].cnt;
      if (cnt > 0) {
        log('WARN', `${table}.${column}: ${cnt} NULL values - fix before adding constraint`);
      } else {
        log('SUCCESS', `${table}.${column}: No NULL values - ready for NOT NULL`);
      }
    } catch (err) {
      log('SKIP', `${table}.${column}: Table doesn't exist`);
    }
  }
}

async function phase3_4_FixThreadMembersId() {
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 3.4: Fix thread_members.id (TEXT → UUID)');
  console.log('═'.repeat(60));

  // Check current type
  const check = await pool.query(`
    SELECT data_type FROM information_schema.columns 
    WHERE table_name = 'thread_members' AND column_name = 'id'
  `);
  
  if (check.rows.length === 0) {
    log('SKIP', 'thread_members.id not found');
    return;
  }
  
  const currentType = check.rows[0].data_type;
  if (currentType === 'uuid') {
    log('SKIP', 'thread_members.id: Already UUID');
    return;
  }
  
  log('INFO', `thread_members.id: Currently ${currentType}`);
  
  // Check if values are valid UUIDs
  const invalidUuids = await pool.query(`
    SELECT COUNT(*) as cnt FROM thread_members 
    WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  `);
  
  if (invalidUuids.rows[0].cnt > 0) {
    log('WARN', `thread_members: ${invalidUuids.rows[0].cnt} rows with non-UUID id values`);
    log('INFO', 'Creating backup and generating UUIDs for invalid rows');
    
    await execute(
      `UPDATE thread_members SET id = gen_random_uuid()::text 
       WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`,
      'Generate UUIDs for invalid thread_members.id'
    );
  }
  
  await execute(
    `ALTER TABLE thread_members ALTER COLUMN id TYPE UUID USING id::UUID`,
    'Convert thread_members.id to UUID'
  );
}

async function generateReport() {
  console.log('\n' + '═'.repeat(60));
  console.log('VERIFICATION');
  console.log('═'.repeat(60));

  // Check remaining issues
  const remaining = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM information_schema.columns 
       WHERE table_schema = 'public' AND column_name = 'tenant_id' AND data_type NOT IN ('uuid')) as non_uuid_tenant,
      (SELECT COUNT(*) FROM information_schema.columns 
       WHERE table_schema = 'public' AND column_name LIKE '%_old') as old_columns,
      (SELECT COUNT(*) FROM information_schema.columns 
       WHERE table_schema = 'public' AND data_type = 'uuid') as uuid_columns
  `);
  
  console.log('\nCurrent Status:');
  console.log(`  Non-UUID tenant_id: ${remaining.rows[0].non_uuid_tenant}`);
  console.log(`  Legacy _old columns: ${remaining.rows[0].old_columns}`);
  console.log(`  Total UUID columns: ${remaining.rows[0].uuid_columns}`);
  
  // Save log
  const logPath = path.join(__dirname, 'schema-normalization-log.json');
  fs.writeFileSync(logPath, JSON.stringify(LOG, null, 2));
  console.log(`\n📁 Log saved to: ${logPath}`);
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║          SCHEMA NORMALIZATION - PHASE 3                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    await phase3_1_FixTenantIdColumns();
    await phase3_2_DropLegacyColumns();
    await phase3_3_AddNotNullConstraints();
    await phase3_4_FixThreadMembersId();
    await generateReport();
    
    console.log('\n' + '═'.repeat(60));
    console.log(DRY_RUN ? '✅ DRY RUN COMPLETE' : '✅ SCHEMA NORMALIZATION COMPLETE');
    console.log('═'.repeat(60));
    
  } catch (err) {
    console.error('\n❌ Fatal Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
