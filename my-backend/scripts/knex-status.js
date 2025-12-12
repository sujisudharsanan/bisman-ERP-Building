#!/usr/bin/env node
/**
 * Knex Migration Status Script
 * Shows current migration status and pending migrations
 */

const { getMigrationStatus, checkConnection, destroy } = require('../database/knex');

async function main() {
  console.log('\\n📊 BISMAN ERP - Knex Migration Status\\n');
  console.log('='.repeat(50));
  
  // Check connection
  const connected = await checkConnection();
  if (!connected) {
    console.error('\\n❌ Cannot connect to database');
    process.exit(1);
  }
  
  // Get status
  const status = await getMigrationStatus();
  if (!status) {
    console.error('\\n❌ Failed to get migration status');
    process.exit(1);
  }
  
  console.log(`\\n✅ Completed Migrations: ${status.completed}`);
  if (status.completedMigrations.length > 0) {
    status.completedMigrations.forEach(m => {
      console.log(`   ✓ ${m.name}`);
    });
  }
  
  console.log(`\\n⏳ Pending Migrations: ${status.pending}`);
  if (status.pendingMigrations.length > 0) {
    status.pendingMigrations.forEach(m => {
      console.log(`   • ${m.file || m}`);
    });
  } else {
    console.log('   (none)');
  }
  
  console.log('\\n' + '='.repeat(50));
  
  if (status.pending > 0) {
    console.log('\\n💡 Run "npm run knex:migrate" to apply pending migrations\\n');
  } else {
    console.log('\\n✨ Database is up to date!\\n');
  }
  
  await destroy();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
