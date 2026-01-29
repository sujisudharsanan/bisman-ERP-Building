/* eslint-env node */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const RAILWAY_URL = 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function findPendingMigrations() {
  const railwayPool = new Pool({ connectionString: RAILWAY_URL });
  
  console.log('=== Finding Pending Migrations ===\n');
  
  try {
    // Get all applied migrations
    const applied = await railwayPool.query('SELECT name FROM schema_migrations');
    const appliedNames = new Set(applied.rows.map(r => r.name));
    console.log(`Total applied migrations: ${appliedNames.size}`);
    
    // List migration files
    const migrationDir = path.join(__dirname, '..', 'database', 'migrations');
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith('.sql') && !f.includes('rollback'))
      .sort();
    
    console.log(`Total migration files: ${files.length}\n`);
    
    // Find pending
    const pending = [];
    for (const file of files) {
      if (!appliedNames.has(file)) {
        pending.push(file);
      }
    }
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations found for Railway!\n');
    } else {
      console.log(`⚠️  Found ${pending.length} pending migrations:\n`);
      pending.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    }
    
    // Check for critical missing tables/columns
    console.log('\n=== Critical Schema Checks ===');
    
    // Check tenant_subscriptions
    const tenantSub = await railwayPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tenant_subscriptions'
      ) as exists
    `);
    console.log('tenant_subscriptions:', tenantSub.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');
    
    // Check subscription_access_control
    const subAccess = await railwayPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscription_access_control'
      ) as exists
    `);
    console.log('subscription_access_control:', subAccess.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');
    
    // Check plan_configurations
    const planConfig = await railwayPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'plan_configurations'
      ) as exists
    `);
    console.log('plan_configurations:', planConfig.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');
    
    // Check subscription_features
    const subFeatures = await railwayPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'subscription_features'
      ) as exists
    `);
    console.log('subscription_features:', subFeatures.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');
    
    // Check qa_testing_sessions
    const qaTesting = await railwayPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'qa_testing_sessions'
      ) as exists
    `);
    console.log('qa_testing_sessions:', qaTesting.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');
    
    // Check bank_reconciliation
    const bankRecon = await railwayPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'bank_reconciliation'
      ) as exists
    `);
    console.log('bank_reconciliation:', bankRecon.rows[0].exists ? '✅ EXISTS' : '❌ MISSING');
    
    return pending;
    
  } catch (e) {
    console.error('Error:', e.message);
    return [];
  } finally {
    railwayPool.end();
  }
}

findPendingMigrations();
