/**
 * Migration 044: Add Data Scope to RBAC
 * 
 * PURPOSE:
 * - RBAC controls PAGE ACCESS (IF you can access)
 * - Data Scope controls DATA VISIBILITY (WHAT you see once inside)
 * 
 * This adds:
 * 1. data_scope column to rbac_roles (role-level default scope)
 * 2. role_data_scope_params table (for department/branch filters)
 * 3. data_scope_override column to users_enhanced (user-level override)
 * 
 * SCOPE VALUES:
 * - ALL: See all data (ADMIN, ENTERPRISE_ADMIN)
 * - TENANT: See all data within tenant (SUPER_ADMIN)
 * - DEPARTMENT: See data in assigned department(s)
 * - TEAM: See data in assigned team(s)
 * - SELF: See only own data (default for regular users)
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function runMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🚀 Migration 044: Adding Data Scope to RBAC');
  console.log('='.repeat(60));
  
  try {
    // ========================================================================
    // STEP 1: Add data_scope column to rbac_roles
    // ========================================================================
    console.log('\n📊 STEP 1: Adding data_scope to rbac_roles...');
    
    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rbac_roles' AND column_name = 'data_scope'
    `);
    
    if (columnCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE rbac_roles
        ADD COLUMN data_scope VARCHAR(50) NOT NULL DEFAULT 'SELF'
      `);
      console.log('   ✅ Added data_scope column to rbac_roles');
    } else {
      console.log('   ℹ️  data_scope column already exists');
    }
    
    // ========================================================================
    // STEP 2: Set default data_scope values for existing roles
    // ========================================================================
    console.log('\n📊 STEP 2: Setting data_scope values for existing roles...');
    
    const scopeUpdates = [
      // Platform-level admins - full access
      { role: 'ENTERPRISE_ADMIN', scope: 'ALL' },
      { role: 'SYSTEM_ADMIN', scope: 'ALL' },
      
      // Tenant-level admins - tenant-wide access
      { role: 'SUPER_ADMIN', scope: 'TENANT' },
      { role: 'ADMIN', scope: 'TENANT' },
      { role: 'IT_ADMIN', scope: 'TENANT' },
      { role: 'ADMIN_OPS', scope: 'TENANT' },
      
      // Department-level roles
      { role: 'HR_ADMIN', scope: 'DEPARTMENT' },
      { role: 'FINANCE_ADMIN', scope: 'DEPARTMENT' },
      { role: 'FINANCE_MANAGER', scope: 'DEPARTMENT' },
      { role: 'ACCOUNTS_MANAGER', scope: 'DEPARTMENT' },
      { role: 'PURCHASE_MANAGER', scope: 'DEPARTMENT' },
      { role: 'SALES_MANAGER', scope: 'DEPARTMENT' },
      { role: 'OPERATIONS_MANAGER', scope: 'DEPARTMENT' },
      
      // Team-level roles
      { role: 'TEAM_LEAD', scope: 'TEAM' },
      { role: 'MANAGER', scope: 'TEAM' },
      { role: 'SUPERVISOR', scope: 'TEAM' },
      
      // Self-only roles
      { role: 'USER', scope: 'SELF' },
      { role: 'EMPLOYEE', scope: 'SELF' },
      { role: 'STAFF', scope: 'SELF' },
      { role: 'VIEWER', scope: 'SELF' },
      { role: 'GUEST', scope: 'SELF' },
    ];
    
    for (const { role, scope } of scopeUpdates) {
      const result = await pool.query(`
        UPDATE rbac_roles 
        SET data_scope = $1 
        WHERE UPPER(name) = $2 
          AND (data_scope = 'SELF' OR data_scope IS NULL)
        RETURNING id, name
      `, [scope, role]);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ ${role} → ${scope}`);
      }
    }
    
    // ========================================================================
    // STEP 3: Create role_data_scope_params table
    // ========================================================================
    console.log('\n📊 STEP 3: Creating role_data_scope_params table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_data_scope_params (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(100) NOT NULL,
        scope_key VARCHAR(50) NOT NULL,
        scope_value VARCHAR(255) NOT NULL,
        tenant_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(role_name, scope_key, scope_value, tenant_id)
      )
    `);
    console.log('   ✅ Created role_data_scope_params table');
    
    // Add index for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_role_data_scope_params_role 
      ON role_data_scope_params(role_name)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_role_data_scope_params_tenant 
      ON role_data_scope_params(tenant_id)
    `);
    console.log('   ✅ Added indexes');
    
    // ========================================================================
    // STEP 4: Add data_scope_override to users_enhanced (optional override)
    // ========================================================================
    console.log('\n📊 STEP 4: Adding data_scope_override to users_enhanced...');
    
    const userColumnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users_enhanced' AND column_name = 'data_scope_override'
    `);
    
    if (userColumnCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users_enhanced
        ADD COLUMN data_scope_override JSONB DEFAULT NULL
      `);
      console.log('   ✅ Added data_scope_override column to users_enhanced');
    } else {
      console.log('   ℹ️  data_scope_override column already exists');
    }
    
    // ========================================================================
    // STEP 5: Add comment/documentation
    // ========================================================================
    console.log('\n📊 STEP 5: Adding column documentation...');
    
    await pool.query(`
      COMMENT ON COLUMN rbac_roles.data_scope IS 
      'Data visibility scope: ALL, TENANT, DEPARTMENT, TEAM, SELF. Controls WHAT data is visible, not IF page is accessible.'
    `);
    
    await pool.query(`
      COMMENT ON TABLE role_data_scope_params IS 
      'Additional scope parameters for roles (e.g., specific departments, branches). Used when data_scope=DEPARTMENT/TEAM.'
    `);
    
    await pool.query(`
      COMMENT ON COLUMN users_enhanced.data_scope_override IS 
      'Optional user-level data scope override. JSON: {"scope": "DEPARTMENT", "departments": ["HR", "FINANCE"]}'
    `);
    
    console.log('   ✅ Added documentation comments');
    
    // ========================================================================
    // VERIFICATION
    // ========================================================================
    console.log('\n📊 VERIFICATION...');
    
    const roleScopes = await pool.query(`
      SELECT name, data_scope, is_active
      FROM rbac_roles
      WHERE is_active = true
      ORDER BY 
        CASE data_scope 
          WHEN 'ALL' THEN 1 
          WHEN 'TENANT' THEN 2 
          WHEN 'DEPARTMENT' THEN 3 
          WHEN 'TEAM' THEN 4 
          ELSE 5 
        END,
        name
    `);
    
    console.log('\n   Current Role → Data Scope mapping:');
    console.log('   ' + '-'.repeat(50));
    
    const scopeGroups = {};
    for (const row of roleScopes.rows) {
      if (!scopeGroups[row.data_scope]) scopeGroups[row.data_scope] = [];
      scopeGroups[row.data_scope].push(row.name);
    }
    
    for (const [scope, roles] of Object.entries(scopeGroups)) {
      console.log(`   ${scope}: ${roles.join(', ')}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration 044 completed successfully!');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Update backend services to use data_scope for filtering');
    console.log('2. Add applyDataScope() middleware to queries');
    console.log('3. Configure role_data_scope_params for department-specific roles');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runMigration };
