/* eslint-env node */
const { Pool } = require('pg');

const RAILWAY_URL = 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function checkMigrations() {
  const pool = new Pool({ connectionString: RAILWAY_URL });
  
  console.log('=== Checking Migration Status on Railway ===\n');
  
  try {
    // Check if schema_migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schema_migrations'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
      const migrations = await pool.query('SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 20');
      console.log('Applied migrations (most recent 20):');
      console.table(migrations.rows);
    } else {
      console.log('schema_migrations table does not exist. Checking for migrations_history...');
      
      const altCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'migrations_history'
        ) as exists
      `);
      
      if (altCheck.rows[0].exists) {
        const migrations = await pool.query('SELECT * FROM migrations_history ORDER BY executed_at DESC LIMIT 20');
        console.log('Applied migrations (from migrations_history):');
        console.table(migrations.rows);
      } else {
        console.log('No migration tracking table found.');
        
        // Check for common tables to understand what's already applied
        console.log('\nChecking key tables to understand current state...');
        const tables = await pool.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        console.log(`Found ${tables.rows.length} tables in database.`);
        console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
      }
    }
    
    // Check for pending migration files
    console.log('\n=== Key Schema Checks ===');
    
    // Check for subscription tables (from 023-030 migrations)
    const subCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('subscription_plans', 'tenant_subscriptions', 'subscription_features', 'subscription_access_control', 'plan_configurations')
      ORDER BY table_name
    `);
    console.log('\nSubscription tables:', subCheck.rows.map(r => r.table_name).join(', ') || 'NONE');
    
    // Check for RBAC tables
    const rbacCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('pages_master', 'role_page_access', 'modules_master', 'role_permissions')
      ORDER BY table_name
    `);
    console.log('RBAC tables:', rbacCheck.rows.map(r => r.table_name).join(', ') || 'NONE');
    
    // Check for support/QA tables
    const supportCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('support_tickets', 'support_sessions', 'qa_testing_sessions')
      ORDER BY table_name
    `);
    console.log('Support/QA tables:', supportCheck.rows.map(r => r.table_name).join(', ') || 'NONE');
    
    // Check users_enhanced for system_scope column
    const sysScope = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users_enhanced' 
      AND column_name = 'system_scope'
    `);
    console.log('users_enhanced.system_scope column:', sysScope.rows.length > 0 ? 'EXISTS' : 'MISSING');
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  pool.end();
}

checkMigrations();
