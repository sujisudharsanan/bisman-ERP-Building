#!/usr/bin/env node
/**
 * UUID Migration - Remaining Fixes
 * Fixes the remaining non-UUID columns
 */

const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

const DRY_RUN = process.argv.includes('--dry-run');

async function log(type, msg) {
  const icons = { INFO: '📋', SUCCESS: '✅', ERROR: '❌', WARN: '⚠️' };
  console.log(`${icons[type] || '•'} [${type}] ${msg}`);
}

async function executeSafe(sql, description) {
  if (DRY_RUN) {
    console.log(`  [DRY-RUN] Would execute: ${description}`);
    return true;
  }
  try {
    await pool.query(sql);
    log('SUCCESS', description);
    return true;
  } catch (err) {
    log('ERROR', `${description}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('UUID MIGRATION - REMAINING FIXES');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // 1. Fix remaining VARCHAR/TEXT tenant_id columns
  console.log('\n--- PHASE 1: FIX NON-UUID TENANT_ID COLUMNS ---\n');
  
  const tenantIdFixes = [
    { table: 'tenant_quota_overrides', type: 'character varying' },
    { table: 'tenant_usage', type: 'character varying' },
    { table: 'review_comments', type: 'character varying' },
    { table: 'review_audit', type: 'character varying' },
    { table: 'task_reviews', type: 'character varying' },
    { table: 'qa_testing_sessions', type: 'character varying' },
    { table: 'bank_reconciliation_items', type: 'character varying' },
    { table: 'role_data_scope_params', type: 'character varying' },
    { table: 'tenant_usage_monthly', type: 'character varying' },
    { table: 'security_access_log', type: 'text' },
    { table: 'background_job_audit', type: 'text' },
    { table: 'unregistered_route_access', type: 'integer' }
  ];

  for (const { table, type } of tenantIdFixes) {
    // Check if table exists and has tenant_id
    const check = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = 'tenant_id'
    `, [table]);
    
    if (check.rows.length === 0) {
      log('WARN', `${table}.tenant_id not found, skipping`);
      continue;
    }

    if (type === 'integer') {
      // Integer needs special handling - add new column and migrate
      await executeSafe(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS tenant_id_uuid UUID`,
        `${table}: Add tenant_id_uuid column`
      );
      await executeSafe(
        `UPDATE "${table}" SET tenant_id_uuid = (SELECT id FROM tenants WHERE CAST(tenants.id AS TEXT) = CAST("${table}".tenant_id AS TEXT) LIMIT 1) WHERE tenant_id_uuid IS NULL`,
        `${table}: Migrate integer tenant_id to UUID`
      );
    } else {
      // VARCHAR/TEXT can be cast directly
      await executeSafe(
        `ALTER TABLE "${table}" ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID`,
        `${table}: Convert tenant_id to UUID`
      );
    }
  }

  // 2. Fix integer user reference columns
  console.log('\n--- PHASE 2: FIX INTEGER USER REFERENCES ---\n');
  
  const userRefFixes = [
    { table: 'admin_role_assignments', column: 'assignee_id' },
    { table: 'admin_page_assignments', column: 'assignee_id' },
    { table: 'admin_role_grants', column: 'assignee_id' },
    { table: 'task_reviews', column: 'sender_id' }
  ];

  for (const { table, column } of userRefFixes) {
    // Add UUID column
    await executeSafe(
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${column}_uuid UUID`,
      `${table}: Add ${column}_uuid column`
    );
    
    // Try to migrate data
    await executeSafe(
      `UPDATE "${table}" SET ${column}_uuid = (SELECT id FROM users WHERE users.legacy_id = "${table}".${column} LIMIT 1) WHERE ${column}_uuid IS NULL AND ${column} IS NOT NULL`,
      `${table}: Migrate ${column} to UUID`
    );
  }

  // 3. Drop remaining legacy _old columns
  console.log('\n--- PHASE 3: DROP LEGACY _OLD COLUMNS ---\n');
  
  const oldColumns = [
    { table: 'task_messages', column: 'id_old' },
    { table: 'task_messages', column: 'task_id_old' },
    { table: 'task_requests', column: 'id_old' },
    { table: 'thread_messages', column: 'id_old' },
    { table: 'threads', column: 'id_old' },
    { table: 'workflow_tasks', column: 'id_old' },
    { table: 'workflow_tasks', column: 'assignee_id_old' },
    { table: 'workflow_tasks', column: 'creator_id_old' }
  ];

  for (const { table, column } of oldColumns) {
    await executeSafe(
      `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`,
      `${table}: Drop ${column}`
    );
  }

  // 4. Verify final state
  console.log('\n--- FINAL VERIFICATION ---\n');
  
  const finalCheck = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id' AND data_type NOT IN ('uuid')) as non_uuid_tenant,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND column_name LIKE '%_old') as old_columns,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'uuid') as uuid_columns
  `);
  
  console.log('Final Statistics:');
  console.log(`  - Non-UUID tenant_id columns: ${finalCheck.rows[0].non_uuid_tenant}`);
  console.log(`  - Legacy _old columns: ${finalCheck.rows[0].old_columns}`);
  console.log(`  - Total UUID columns: ${finalCheck.rows[0].uuid_columns}`);

  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
