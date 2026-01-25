/* eslint-env node, commonjs */
/* global require */
/**
 * Debug script to check admin_role_assignments and related data
 */

const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('=== DEBUG: admin_role_assignments ===\n');
    
    // 1. Show current assignments
    console.log('1. Current role assignments:');
    const assignments = await client.query(`
      SELECT ara.*, rr.name as role_name, rr.display_name as role_display_name
      FROM admin_role_assignments ara
      LEFT JOIN rbac_roles rr ON ara.role_id = rr.id
      ORDER BY ara.id
    `);
    console.table(assignments.rows);
    
    // 2. Check super admins
    console.log('\n2. Super Admins (from users table):');
    const superAdmins = await client.query(`
      SELECT id, username, full_name, email, role, user_type
      FROM users
      WHERE role = 'SUPER_ADMIN' OR user_type = 'SUPER_ADMIN'
      ORDER BY id
    `);
    console.table(superAdmins.rows);
    
    // 3. Check if Enterprise Admin exists
    console.log('\n3. Enterprise Admins:');
    const enterpriseAdmins = await client.query(`
      SELECT id, username, full_name, email, role, user_type
      FROM users
      WHERE role = 'ENTERPRISE_ADMIN' OR user_type = 'ENTERPRISE_ADMIN'
      ORDER BY id
    `);
    console.table(enterpriseAdmins.rows);
    
    // 4. Check rbac_roles that exist
    console.log('\n4. RBAC Roles:');
    const roles = await client.query(`
      SELECT id, name, display_name, level, status
      FROM rbac_roles
      WHERE status = 'active'
      ORDER BY level DESC, id
      LIMIT 30
    `);
    console.table(roles.rows);
    
    // 5. Check foreign key constraint
    console.log('\n5. Foreign key constraints on admin_role_assignments:');
    const fks = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'admin_role_assignments';
    `);
    console.table(fks.rows);
    
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
