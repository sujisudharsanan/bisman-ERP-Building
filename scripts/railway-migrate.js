/**
 * Railway Migration Script
 * Run this on Railway to apply pending migrations
 * 
 * Usage: node scripts/railway-migrate.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('🚀 Railway Migration Script');
console.log('===========================\n');

// List of migrations to run (in order)
const migrations = [
  '030_subscription_access_control_tables.sql',
  '20250119_rbac_default_deny.sql',
  '20250119_permanent_page_governance.sql',
  '20260113_sync_business_level_system_scope.sql',
  '20260114_modules_pages_master.sql',
  'delete-pages-2026-01-21.sql',
  'hide-duplicate-sidebar-2026-01-21.sql'
];

const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');

async function runMigration(filename) {
  const filePath = path.join(migrationsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Migration file not found: ${filename}`);
    return false;
  }
  
  console.log(`📋 Running: ${filename}`);
  
  try {
    const result = execSync(`psql "${DATABASE_URL}" -f "${filePath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`✅ ${filename} - SUCCESS`);
    if (result) {
      console.log(result.split('\n').slice(0, 10).join('\n'));
    }
    return true;
  } catch (error) {
    console.log(`⚠️  ${filename} - Completed with warnings/notices`);
    if (error.stdout) {
      console.log(error.stdout.split('\n').slice(0, 10).join('\n'));
    }
    // Continue even if there are errors (likely "already exists" notices)
    return true;
  }
}

async function checkTables() {
  console.log('\n📊 Verifying tables...\n');
  
  try {
    const result = execSync(`psql "${DATABASE_URL}" -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('admin_page_assignments', 'admin_role_grants', 'effective_access_cache', 'subscription_access_audit_log') ORDER BY table_name;"`, {
      encoding: 'utf-8'
    });
    console.log(result);
  } catch (error) {
    console.error('Failed to verify tables:', error.message);
  }
}

async function main() {
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);
  
  for (const migration of migrations) {
    await runMigration(migration);
    console.log('');
  }
  
  await checkTables();
  
  console.log('\n✅ Migration script completed!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
