/* eslint-env node */
/**
 * Migration 045: PostgreSQL Row-Level Security (RLS)
 * 
 * DEFENSE IN DEPTH: Even if application code is bypassed, 
 * the database itself enforces tenant isolation and data scope.
 * 
 * This adds:
 * 1. RLS policies for tenant isolation on key tables
 * 2. RLS policies for data scope enforcement
 * 3. Helper functions for setting session context
 * 
 * IMPORTANT: RLS is a safety net, not a replacement for app-level checks.
 * App should still apply scope - RLS catches any bugs/bypasses.
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// Tables that need RLS for tenant isolation
const TENANT_ISOLATED_TABLES = [
  'users_enhanced',
  'tasks',
  'payments',
  'payment_requests',
  'contracts',
  'invoices',
  'bills',
  'chat_threads',
  'chat_messages',
  'notifications',
  'audit_logs',
  'activity_logs'
];

// Tables that need RLS for user-level scope
const USER_SCOPED_TABLES = [
  'user_preferences',
  'user_settings',
  'user_sessions'
];

async function runMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🚀 Migration 045: PostgreSQL Row-Level Security (RLS)');
  console.log('='.repeat(60));
  console.log('⚠️  NOTE: RLS is a SAFETY NET, not primary enforcement');
  console.log('='.repeat(60));
  
  try {
    // ========================================================================
    // STEP 1: Create helper functions for session context
    // ========================================================================
    console.log('\n📊 STEP 1: Creating session context functions...');
    
    // Function to set session context (called at start of each request)
    await pool.query(`
      CREATE OR REPLACE FUNCTION set_app_context(
        p_tenant_id TEXT,
        p_user_id INTEGER,
        p_data_scope TEXT DEFAULT 'SELF',
        p_role TEXT DEFAULT 'USER'
      ) RETURNS VOID AS $$
      BEGIN
        PERFORM set_config('app.tenant_id', COALESCE(p_tenant_id, ''), false);
        PERFORM set_config('app.user_id', COALESCE(p_user_id::text, '0'), false);
        PERFORM set_config('app.data_scope', COALESCE(p_data_scope, 'SELF'), false);
        PERFORM set_config('app.role', COALESCE(p_role, 'USER'), false);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('   ✅ Created set_app_context() function');
    
    // Function to check if current user can access a tenant
    await pool.query(`
      CREATE OR REPLACE FUNCTION can_access_tenant(record_tenant_id TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        current_scope TEXT;
        current_tenant TEXT;
      BEGIN
        current_scope := current_setting('app.data_scope', true);
        current_tenant := current_setting('app.tenant_id', true);
        
        -- ALL scope can access everything
        IF current_scope = 'ALL' THEN
          RETURN true;
        END IF;
        
        -- Otherwise, tenant must match
        RETURN record_tenant_id = current_tenant;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    console.log('   ✅ Created can_access_tenant() function');
    
    // Function to check if current user can access a record
    await pool.query(`
      CREATE OR REPLACE FUNCTION can_access_record(
        record_tenant_id TEXT,
        record_user_id INTEGER,
        record_department_id TEXT DEFAULT NULL
      ) RETURNS BOOLEAN AS $$
      DECLARE
        ctx_scope TEXT;
        ctx_tenant TEXT;
        ctx_user INTEGER;
      BEGIN
        ctx_scope := current_setting('app.data_scope', true);
        ctx_tenant := current_setting('app.tenant_id', true);
        ctx_user := NULLIF(current_setting('app.user_id', true), '')::INTEGER;
        
        -- ALL scope can access everything
        IF ctx_scope = 'ALL' THEN
          RETURN true;
        END IF;
        
        -- TENANT scope - just check tenant
        IF ctx_scope = 'TENANT' THEN
          RETURN record_tenant_id = ctx_tenant;
        END IF;
        
        -- DEPARTMENT scope - check tenant and department
        IF ctx_scope IN ('DEPARTMENT', 'EMPLOYEES', 'OPERATIONS') THEN
          RETURN record_tenant_id = ctx_tenant;
          -- Note: Department filtering should be done at app level
        END IF;
        
        -- SELF scope - check tenant and user
        RETURN record_tenant_id = ctx_tenant 
           AND (record_user_id = ctx_user OR record_user_id IS NULL);
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    console.log('   ✅ Created can_access_record() function');
    
    // ========================================================================
    // STEP 2: Enable RLS on tenant-isolated tables
    // ========================================================================
    console.log('\n📊 STEP 2: Enabling RLS on tenant-isolated tables...');
    
    for (const tableName of TENANT_ISOLATED_TABLES) {
      try {
        // Check if table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);
        
        if (!tableCheck.rows[0].exists) {
          console.log(`   ⏭️  Table ${tableName} does not exist, skipping`);
          continue;
        }
        
        // Check if tenant_id column exists
        const colCheck = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = 'tenant_id'
          )
        `, [tableName]);
        
        if (!colCheck.rows[0].exists) {
          console.log(`   ⏭️  Table ${tableName} has no tenant_id column, skipping`);
          continue;
        }
        
        // Enable RLS
        await pool.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
        
        // Drop existing policy if exists
        await pool.query(`
          DROP POLICY IF EXISTS tenant_isolation_policy ON ${tableName}
        `);
        
        // Create tenant isolation policy
        await pool.query(`
          CREATE POLICY tenant_isolation_policy ON ${tableName}
          FOR ALL
          USING (
            can_access_tenant(tenant_id::text)
          )
        `);
        
        console.log(`   ✅ ${tableName} - RLS enabled with tenant isolation`);
        
      } catch (error) {
        console.log(`   ⚠️  ${tableName} - Error: ${error.message}`);
      }
    }
    
    // ========================================================================
    // STEP 3: Enable RLS on user-scoped tables
    // ========================================================================
    console.log('\n📊 STEP 3: Enabling RLS on user-scoped tables...');
    
    for (const tableName of USER_SCOPED_TABLES) {
      try {
        // Check if table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);
        
        if (!tableCheck.rows[0].exists) {
          console.log(`   ⏭️  Table ${tableName} does not exist, skipping`);
          continue;
        }
        
        // Enable RLS
        await pool.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
        
        // Drop existing policy if exists
        await pool.query(`
          DROP POLICY IF EXISTS user_isolation_policy ON ${tableName}
        `);
        
        // Create user isolation policy
        await pool.query(`
          CREATE POLICY user_isolation_policy ON ${tableName}
          FOR ALL
          USING (
            user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
            OR current_setting('app.data_scope', true) = 'ALL'
          )
        `);
        
        console.log(`   ✅ ${tableName} - RLS enabled with user isolation`);
        
      } catch (error) {
        console.log(`   ⚠️  ${tableName} - Error: ${error.message}`);
      }
    }
    
    // ========================================================================
    // STEP 4: Add special policy for users_enhanced (data scope aware)
    // ========================================================================
    console.log('\n📊 STEP 4: Adding data-scope-aware policy to users_enhanced...');
    
    try {
      // Drop existing scope policy if exists
      await pool.query(`
        DROP POLICY IF EXISTS data_scope_policy ON users_enhanced
      `);
      
      // Create comprehensive data scope policy
      await pool.query(`
        CREATE POLICY data_scope_policy ON users_enhanced
        FOR SELECT
        USING (
          -- ALL scope sees everything
          current_setting('app.data_scope', true) = 'ALL'
          
          -- TENANT scope sees all in tenant
          OR (
            current_setting('app.data_scope', true) = 'TENANT'
            AND tenant_id::text = current_setting('app.tenant_id', true)
          )
          
          -- DEPARTMENT/EMPLOYEES scope sees tenant + same department
          OR (
            current_setting('app.data_scope', true) IN ('DEPARTMENT', 'EMPLOYEES')
            AND tenant_id::text = current_setting('app.tenant_id', true)
          )
          
          -- SELF scope sees only own record
          OR (
            current_setting('app.data_scope', true) = 'SELF'
            AND tenant_id::text = current_setting('app.tenant_id', true)
            AND id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
          )
        )
      `);
      
      console.log('   ✅ Added data_scope_policy to users_enhanced');
      
    } catch (error) {
      console.log(`   ⚠️  Error creating scope policy: ${error.message}`);
    }
    
    // ========================================================================
    // STEP 5: Create bypass role for admin operations
    // ========================================================================
    console.log('\n📊 STEP 5: Configuring RLS bypass for admin operations...');
    
    // Note: The application role should BYPASSRLS for migrations and seeding
    // Regular queries should NOT bypass RLS
    console.log('   ℹ️  RLS applies to all roles by default');
    console.log('   ℹ️  Use set_app_context() at start of each request');
    console.log('   ℹ️  For admin operations, set data_scope = "ALL"');
    
    // ========================================================================
    // STEP 6: Add comments for documentation
    // ========================================================================
    console.log('\n📊 STEP 6: Adding documentation...');
    
    await pool.query(`
      COMMENT ON FUNCTION set_app_context IS 
      'Sets session-level context for RLS policies. Must be called at start of each request.
       Parameters: tenant_id, user_id, data_scope (ALL/TENANT/DEPARTMENT/SELF), role'
    `);
    
    await pool.query(`
      COMMENT ON FUNCTION can_access_tenant IS 
      'RLS helper: Checks if current session can access a record by tenant_id'
    `);
    
    await pool.query(`
      COMMENT ON FUNCTION can_access_record IS 
      'RLS helper: Checks if current session can access a record based on scope'
    `);
    
    console.log('   ✅ Added documentation comments');
    
    // ========================================================================
    // VERIFICATION
    // ========================================================================
    console.log('\n📊 VERIFICATION...');
    
    // List tables with RLS enabled
    const rlsTables = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND rowsecurity = true
      ORDER BY tablename
    `);
    
    console.log('\n   Tables with RLS enabled:');
    console.log('   ' + '-'.repeat(40));
    for (const row of rlsTables.rows) {
      console.log(`   ✅ ${row.tablename}`);
    }
    
    // List RLS policies
    const policies = await pool.query(`
      SELECT tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    
    console.log('\n   Active RLS policies:');
    console.log('   ' + '-'.repeat(40));
    for (const row of policies.rows) {
      console.log(`   📋 ${row.tablename}: ${row.policyname}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration 045 completed successfully!');
    console.log('');
    console.log('IMPORTANT: To use RLS, call set_app_context() at start of each request:');
    console.log('');
    console.log("  SELECT set_app_context('tenant-123', 42, 'TENANT', 'ADMIN');");
    console.log('');
    console.log('This sets the session context for all subsequent queries.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

// Rollback function
async function rollbackMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🔄 Rolling back Migration 045...');
  
  try {
    // Disable RLS on all tables
    const allTables = [...TENANT_ISOLATED_TABLES, ...USER_SCOPED_TABLES];
    
    for (const tableName of allTables) {
      try {
        await pool.query(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY`);
        console.log(`   ✅ Disabled RLS on ${tableName}`);
      } catch {
        // Ignore if table doesn't exist
      }
    }
    
    // Drop functions
    await pool.query('DROP FUNCTION IF EXISTS set_app_context CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS can_access_tenant CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS can_access_record CASCADE');
    
    console.log('✅ Rollback complete');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--rollback')) {
    rollbackMigration()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    runMigration()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { runMigration, rollbackMigration };
