#!/usr/bin/env node
/**
 * Run Task System Database Migration
 * Executes the SQL migration to create task tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting task system migration...\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/20251125_create_tasks_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    console.log(`   Path: ${migrationPath}`);
    console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);
    
    // Execute the migration
    console.log('⚙️  Executing migration...');
    await client.query('BEGIN');
    
    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');
      console.log('✅ Migration executed successfully!\n');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tasks', 'task_messages', 'task_attachments', 'task_participants', 'task_history', 'task_dependencies', 'task_templates')
      ORDER BY table_name;
    `;
    
    const result = await client.query(tablesQuery);
    
    if (result.rows.length === 7) {
      console.log('✅ All 7 tables created successfully:');
      result.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    } else {
      console.warn(`⚠️  Expected 7 tables, found ${result.rows.length}`);
      result.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }
    
    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexQuery = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'task%'
      ORDER BY indexname;
    `;
    
    const indexResult = await client.query(indexQuery);
    console.log(`✅ Found ${indexResult.rows.length} indexes on task tables`);
    
    // Check views
    console.log('\n🔍 Checking views...');
    const viewQuery = `
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%task%'
      ORDER BY table_name;
    `;
    
    const viewResult = await client.query(viewQuery);
    if (viewResult.rows.length > 0) {
      console.log(`✅ Found ${viewResult.rows.length} views:`);
      viewResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
    }
    
    // Check triggers
    console.log('\n🔍 Checking triggers...');
    const triggerQuery = `
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND event_object_table LIKE 'task%'
      ORDER BY trigger_name;
    `;
    
    const triggerResult = await client.query(triggerQuery);
    if (triggerResult.rows.length > 0) {
      console.log(`✅ Found ${triggerResult.rows.length} triggers:`);
      triggerResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.trigger_name} on ${row.event_object_table}`);
      });
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('   You can now start creating tasks through the API.\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration();
