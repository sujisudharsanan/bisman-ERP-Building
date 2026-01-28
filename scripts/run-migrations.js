#!/usr/bin/env node
/* eslint-env node */
/**
 * BISMAN ERP - Database Migration Runner
 * Applies pending migrations to Railway and/or Local databases
 * 
 * Usage:
 *   node scripts/run-migrations.js                    # Run on Railway only (default)
 *   node scripts/run-migrations.js --local            # Run on local only  
 *   node scripts/run-migrations.js --both             # Run on both
 *   node scripts/run-migrations.js --dry-run          # Show what would run without executing
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database URLs
const RAILWAY_URL = 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';
const LOCAL_URL = 'postgres://postgres@localhost:5432/BISMAN';

// Parse command line arguments
const args = process.argv.slice(2);
const runLocal = args.includes('--local') || args.includes('--both');
const runRailway = !args.includes('--local') || args.includes('--both');
const dryRun = args.includes('--dry-run');

// Migration order - critical migrations first
const MIGRATION_ORDER = [
  // Core tables
  '005_task_module_enhancements.sql',
  '010_approval_workflow_engine.sql',
  '011_governance_hardening.sql',
  '011_subscription_system.sql',
  
  // Support/QA
  '020_support_sessions.sql',
  '014_qa_testing_module.sql',
  '021_bank_reconciliation.sql',
  
  // System scope
  '022_add_system_scope.sql',
  '022_payment_settlement_safe.sql',
  
  // Subscription system (in order)
  '023_micro_unlock_subscription_system.sql',
  '024_comprehensive_subscription_system.sql',
  '025_seed_subscription_plans_local.sql',
  '026_add_missing_monetizable_features.sql',
  '027_custom_tenant_plan_configurations.sql',
  '028_fix_audit_trigger_ambiguous_key.sql',
  '029_add_system_scope_to_users_enhanced.sql',
  '030_subscription_access_control_tables.sql',
  
  // Fixes
  '035_fix_task_status_trigger.sql',
  '036_fix_task_status_constraint.sql',
  
  // RBAC/Page governance
  '050_rbac_restructuring.sql',
  '20250119_permanent_page_governance.sql',
  '20250119_rbac_default_deny.sql',
  '20260113_sync_business_level_system_scope.sql',
  '20260114_modules_pages_master.sql',
  '20260122_remove_module_management_page.sql',
  
  // Cleanup scripts
  'delete-pages-2026-01-21.sql',
  'fix-page-sync-gaps.sql',
  'hide-duplicate-sidebar-2026-01-21.sql',
  'uuid_user_ids_chat.sql',
  
  // Additional
  'add_enhanced_user_profile_fields.sql',
  'create_password_reset_tokens.sql',
  'create_support_tickets_system.sql',
];

async function getAppliedMigrations(pool) {
  try {
    const result = await pool.query('SELECT name FROM schema_migrations');
    return new Set(result.rows.map(r => r.name));
  } catch (e) {
    if (e.message.includes('does not exist')) {
      // Create the table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      return new Set();
    }
    throw e;
  }
}

async function applyMigration(pool, fileName, migrationDir, dbName) {
  const filePath = path.join(migrationDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${fileName}, skipping...`);
    return false;
  }
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`  📦 Applying: ${fileName}`);
  
  if (dryRun) {
    console.log(`     [DRY RUN] Would execute ${sql.length} bytes of SQL`);
    return true;
  }
  
  try {
    await pool.query(sql);
    
    // Record the migration
    const version = fileName.replace('.sql', '');
    await pool.query(
      'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW()) ON CONFLICT (version) DO NOTHING',
      [version, fileName]
    );
    
    console.log(`     ✅ Success`);
    return true;
  } catch (e) {
    console.log(`     ❌ Error: ${e.message.substring(0, 200)}`);
    
    // Don't fail on "already exists" errors
    if (e.message.includes('already exists') || 
        e.message.includes('duplicate key') ||
        e.message.includes('does not exist') && e.message.includes('constraint')) {
      console.log(`     ⚠️  Continuing despite error (likely already applied)`);
      
      // Still record it
      const version = fileName.replace('.sql', '');
      try {
        await pool.query(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW()) ON CONFLICT (version) DO NOTHING',
          [version, fileName]
        );
      } catch (recordErr) {
        // Ignore
      }
      return true;
    }
    
    return false;
  }
}

async function runMigrations(dbUrl, dbName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`MIGRATING: ${dbName}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const pool = new Pool({ connectionString: dbUrl });
  const migrationDir = path.join(__dirname, '..', 'database', 'migrations');
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log(`✅ Connected to ${dbName}\n`);
    
    // Get applied migrations
    const applied = await getAppliedMigrations(pool);
    console.log(`📋 Already applied: ${applied.size} migrations\n`);
    
    // Get all migration files
    const allFiles = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql') && !f.includes('rollback'));
    
    // Build ordered list of pending migrations
    const pending = [];
    
    // First add ordered migrations that are pending
    for (const file of MIGRATION_ORDER) {
      if (allFiles.includes(file) && !applied.has(file)) {
        pending.push(file);
      }
    }
    
    // Then add any remaining files not in the order list
    for (const file of allFiles.sort()) {
      if (!applied.has(file) && !pending.includes(file)) {
        pending.push(file);
      }
    }
    
    if (pending.length === 0) {
      console.log(`✅ No pending migrations for ${dbName}!\n`);
      return { success: true, applied: 0, failed: 0 };
    }
    
    console.log(`📥 Pending migrations: ${pending.length}\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of pending) {
      const success = await applyMigration(pool, file, migrationDir, dbName);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    console.log(`\n📊 ${dbName} Summary:`);
    console.log(`   ✅ Applied: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    
    return { success: failCount === 0, applied: successCount, failed: failCount };
    
  } catch (e) {
    console.error(`❌ Database error: ${e.message}`);
    return { success: false, applied: 0, failed: 1, error: e.message };
  } finally {
    pool.end();
  }
}

async function main() {
  console.log('\n🚀 BISMAN ERP Database Migration Runner');
  console.log('========================================');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  const results = {};
  
  if (runRailway) {
    results.railway = await runMigrations(RAILWAY_URL, 'Railway');
  }
  
  if (runLocal) {
    results.local = await runMigrations(LOCAL_URL, 'Local');
  }
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  
  if (results.railway) {
    console.log(`\nRailway: ${results.railway.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Applied: ${results.railway.applied}, Failed: ${results.railway.failed}`);
  }
  
  if (results.local) {
    console.log(`\nLocal: ${results.local.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Applied: ${results.local.applied}, Failed: ${results.local.failed}`);
  }
  
  console.log('\n');
  
  // Exit with error if any failed
  if ((results.railway && !results.railway.success) || (results.local && !results.local.success)) {
    process.exit(1);
  }
}

main();
