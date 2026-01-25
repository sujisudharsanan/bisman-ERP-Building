/* eslint-env node, commonjs */
/* global require */
/**
 * Script to create the admin_role_assignments table if it doesn't exist
 * Run with: node scripts/create-admin-role-assignments.js
 */

const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking if admin_role_assignments table exists...');
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_role_assignments'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Table admin_role_assignments already exists');
      
      // Show table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'admin_role_assignments'
        ORDER BY ordinal_position;
      `);
      console.log('\n📋 Table structure:');
      console.table(columns.rows);
      
      // Show row count
      const count = await client.query('SELECT COUNT(*) FROM admin_role_assignments');
      console.log(`\n📊 Row count: ${count.rows[0].count}`);
      
    } else {
      console.log('⚠️ Table admin_role_assignments does not exist. Creating...');
      
      // Create the table
      await client.query(`
        CREATE TABLE admin_role_assignments (
          id SERIAL PRIMARY KEY,
          assigner_type VARCHAR(50) NOT NULL,
          assigner_id INTEGER NOT NULL,
          role_id INTEGER NOT NULL,
          assignee_type VARCHAR(50),
          assignee_id INTEGER,
          is_active BOOLEAN DEFAULT TRUE,
          assigned_at TIMESTAMP(6) DEFAULT NOW(),
          updated_at TIMESTAMP(6) DEFAULT NOW(),
          CONSTRAINT fk_admin_role_assignments_role 
            FOREIGN KEY (role_id) 
            REFERENCES rbac_roles(id) 
            ON DELETE CASCADE 
            ON UPDATE NO ACTION
        );
      `);
      
      console.log('✅ Table created successfully');
      
      // Create indexes
      console.log('📇 Creating indexes...');
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_role_assign_active 
        ON admin_role_assignments(is_active);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_role_assign_assignee 
        ON admin_role_assignments(assignee_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_role_assign_assigner 
        ON admin_role_assignments(assigner_type, assigner_id);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_admin_role_assign_role 
        ON admin_role_assignments(role_id);
      `);
      
      console.log('✅ Indexes created successfully');
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
