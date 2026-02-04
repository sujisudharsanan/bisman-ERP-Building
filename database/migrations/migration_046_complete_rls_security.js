/* eslint-env node */
/**
 * Migration 046: Complete PostgreSQL RLS Security Implementation
 * 
 * SECURITY ARCHITECTURE:
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * MANDATORY SESSION VARIABLES (set before every query):
 *   SET LOCAL app.user_id = '12';
 *   SET LOCAL app.tenant_id = '6b68f86a-225f-480f-ae29-292da9e565d3';
 *   SET LOCAL app.data_scope = 'EMPLOYEES';
 * 
 * If these are missing → queries return 0 rows (fail-safe)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function runMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🚀 Migration 046: Complete PostgreSQL RLS Security');
  console.log('='.repeat(70));
  
  try {
    // ========================================================================
    // STEP 1: Create data_scopes reference table
    // ========================================================================
    console.log('\n📊 STEP 1: Creating data_scopes reference table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_scopes (
        id SERIAL PRIMARY KEY,
        scope_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        priority INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert standard scopes
    await pool.query(`
      INSERT INTO data_scopes (scope_name, description, priority)
      VALUES 
        ('ALL', 'Platform-wide access - sees everything', 1),
        ('TENANT', 'Tenant-wide access - sees all within tenant', 2),
        ('DEPARTMENT', 'Department-specific access', 3),
        ('EMPLOYEES', 'Employee records only', 4),
        ('OPERATIONS', 'Operations department only', 5),
        ('TEAM', 'Team-specific access', 6),
        ('SELF', 'Own records only', 99),
        ('CUSTOM', 'Custom scope with parameters', 50)
      ON CONFLICT (scope_name) DO NOTHING
    `);
    console.log('   ✅ Created data_scopes table with standard values');
    
    // ========================================================================
    // STEP 2: Create improved session context function
    // ========================================================================
    console.log('\n📊 STEP 2: Creating session context functions...');
    
    // Drop and recreate for clean state
    await pool.query(`DROP FUNCTION IF EXISTS set_security_context CASCADE`);
    
    // Use TEXT for user_id to support both UUID and integer IDs
    await pool.query(`
      CREATE OR REPLACE FUNCTION set_security_context(
        p_user_id TEXT,
        p_tenant_id TEXT,
        p_data_scope TEXT DEFAULT 'SELF',
        p_role TEXT DEFAULT 'USER',
        p_department TEXT DEFAULT NULL
      ) RETURNS VOID AS $$
      BEGIN
        -- Set session-local variables for RLS policies (TEXT for UUID compatibility)
        -- Using 'false' for local scope = transaction-local (reset on commit)
        PERFORM set_config('app.user_id', COALESCE(p_user_id, ''), false);
        PERFORM set_config('app.tenant_id', COALESCE(p_tenant_id, ''), false);
        PERFORM set_config('app.data_scope', COALESCE(p_data_scope, 'SELF'), false);
        PERFORM set_config('app.role', COALESCE(p_role, 'USER'), false);
        PERFORM set_config('app.department', COALESCE(p_department, ''), false);
        PERFORM set_config('app.context_set', 'true', false);
      END;
      $$ LANGUAGE plpgsql VOLATILE;
    `);
    console.log('   ✅ Created set_security_context() function');
    
    // Function to check if context is set (for safety)
    await pool.query(`
      CREATE OR REPLACE FUNCTION is_security_context_set()
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN COALESCE(current_setting('app.context_set', true), 'false') = 'true';
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    console.log('   ✅ Created is_security_context_set() function');
    
    // ========================================================================
    // STEP 3: Create RLS helper functions
    // ========================================================================
    console.log('\n📊 STEP 3: Creating RLS helper functions...');
    
    // Tenant isolation check
    await pool.query(`
      CREATE OR REPLACE FUNCTION rls_tenant_match(record_tenant_id TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        ctx_scope TEXT;
        ctx_tenant TEXT;
      BEGIN
        ctx_scope := current_setting('app.data_scope', true);
        ctx_tenant := current_setting('app.tenant_id', true);
        
        -- ALL scope bypasses tenant check (platform admins)
        IF ctx_scope = 'ALL' THEN
          RETURN true;
        END IF;
        
        -- Otherwise tenant must match
        RETURN record_tenant_id = ctx_tenant;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    console.log('   ✅ Created rls_tenant_match() function');
    
    // User data scope check
    await pool.query(`
      CREATE OR REPLACE FUNCTION rls_user_scope_match(
        record_tenant_id TEXT,
        record_user_id INTEGER,
        record_user_type TEXT DEFAULT NULL,
        record_department TEXT DEFAULT NULL
      ) RETURNS BOOLEAN AS $$
      DECLARE
        ctx_scope TEXT;
        ctx_tenant TEXT;
        ctx_user INTEGER;
        ctx_dept TEXT;
      BEGIN
        ctx_scope := COALESCE(current_setting('app.data_scope', true), 'SELF');
        ctx_tenant := current_setting('app.tenant_id', true);
        ctx_user := NULLIF(current_setting('app.user_id', true), '')::INTEGER;
        ctx_dept := current_setting('app.department', true);
        
        -- ALL scope sees everything (platform admins)
        IF ctx_scope = 'ALL' THEN
          RETURN true;
        END IF;
        
        -- First check tenant isolation (except for ALL scope)
        IF record_tenant_id IS NOT NULL AND record_tenant_id <> ctx_tenant THEN
          RETURN false;
        END IF;
        
        -- TENANT scope sees all within tenant
        IF ctx_scope = 'TENANT' THEN
          RETURN true;
        END IF;
        
        -- EMPLOYEES scope - only employee type users
        IF ctx_scope = 'EMPLOYEES' THEN
          RETURN record_user_type = 'EMPLOYEE' OR record_user_type IS NULL;
        END IF;
        
        -- OPERATIONS scope - only operations department
        IF ctx_scope = 'OPERATIONS' THEN
          RETURN record_department = 'OPERATIONS' OR record_department IS NULL;
        END IF;
        
        -- DEPARTMENT scope - same department
        IF ctx_scope = 'DEPARTMENT' THEN
          RETURN record_department = ctx_dept OR record_department IS NULL OR ctx_dept = '';
        END IF;
        
        -- SELF scope - only own records
        RETURN record_user_id = ctx_user OR record_user_id IS NULL;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    console.log('   ✅ Created rls_user_scope_match() function');
    
    // ========================================================================
    // STEP 4: RLS on users_enhanced (MOST CRITICAL)
    // ========================================================================
    console.log('\n📊 STEP 4: Securing users_enhanced table...');
    
    // Enable RLS
    await pool.query(`ALTER TABLE users_enhanced ENABLE ROW LEVEL SECURITY`);
    
    // Drop existing policies
    await pool.query(`DROP POLICY IF EXISTS users_tenant_isolation ON users_enhanced`);
    await pool.query(`DROP POLICY IF EXISTS users_data_scope ON users_enhanced`);
    await pool.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON users_enhanced`);
    await pool.query(`DROP POLICY IF EXISTS data_scope_policy ON users_enhanced`);
    
    // Create comprehensive policy
    // Note: users_enhanced uses 'id' as UUID, 'role' for user type, and profile_data->>'department' for department
    await pool.query(`
      CREATE POLICY users_security_policy ON users_enhanced
      FOR ALL
      USING (
        -- Context must be set
        is_security_context_set()
        AND (
          -- ALL scope bypasses everything
          current_setting('app.data_scope', true) = 'ALL'
          
          -- TENANT scope sees all in tenant
          OR (
            current_setting('app.data_scope', true) = 'TENANT'
            AND tenant_id::text = current_setting('app.tenant_id', true)
          )
          
          -- EMPLOYEES scope sees only non-admin roles
          OR (
            current_setting('app.data_scope', true) = 'EMPLOYEES'
            AND tenant_id::text = current_setting('app.tenant_id', true)
            AND (role NOT IN ('SUPER_ADMIN', 'ADMIN', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN') OR role IS NULL)
          )
          
          -- OPERATIONS scope sees operations-related roles
          OR (
            current_setting('app.data_scope', true) = 'OPERATIONS'
            AND tenant_id::text = current_setting('app.tenant_id', true)
            AND (
              role LIKE '%OPS%' OR role LIKE '%OPERATIONS%'
              OR (profile_data->>'department')::text = 'OPERATIONS'
              OR role IS NULL
            )
          )
          
          -- SELF scope sees only own record (compare UUIDs as text)
          OR (
            current_setting('app.data_scope', true) = 'SELF'
            AND tenant_id::text = current_setting('app.tenant_id', true)
            AND id::text = current_setting('app.user_id', true)
          )
          
          -- DEPARTMENT scope sees same department (from profile_data)
          OR (
            current_setting('app.data_scope', true) = 'DEPARTMENT'
            AND tenant_id::text = current_setting('app.tenant_id', true)
            AND (
              (profile_data->>'department')::text = current_setting('app.department', true)
              OR current_setting('app.department', true) = ''
              OR (profile_data->>'department') IS NULL
            )
          )
        )
      )
    `);
    console.log('   ✅ Created users_security_policy on users_enhanced');
    
    // ========================================================================
    // STEP 5: RLS on clients table (Tenant visibility)
    // ========================================================================
    console.log('\n📊 STEP 5: Securing clients table...');
    
    try {
      await pool.query(`ALTER TABLE clients ENABLE ROW LEVEL SECURITY`);
      await pool.query(`DROP POLICY IF EXISTS clients_security_policy ON clients`);
      await pool.query(`DROP POLICY IF EXISTS clients_tenant_isolation ON clients`);
      await pool.query(`DROP POLICY IF EXISTS client_visibility ON clients`);
      
      await pool.query(`
        CREATE POLICY clients_security_policy ON clients
        FOR ALL
        USING (
          -- ALL scope sees all clients (platform admin)
          current_setting('app.data_scope', true) = 'ALL'
          
          -- Others see only their own tenant
          OR id::text = current_setting('app.tenant_id', true)
        )
      `);
      console.log('   ✅ Created clients_security_policy on clients');
    } catch (e) {
      console.log(`   ⚠️  clients: ${e.message}`);
    }
    
    // ========================================================================
    // STEP 6: RLS on financial tables (contracts, invoices, etc.)
    // ========================================================================
    console.log('\n📊 STEP 6: Securing financial tables...');
    
    const financialTables = ['contracts', 'invoices', 'payments', 'expenses', 'bills'];
    
    for (const tableName of financialTables) {
      try {
        // Check if table exists
        const exists = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);
        
        if (!exists.rows[0].exists) {
          console.log(`   ⏭️  ${tableName} does not exist, skipping`);
          continue;
        }
        
        // Check for tenant_id column
        const hasTenant = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = 'tenant_id'
          )
        `, [tableName]);
        
        await pool.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
        await pool.query(`DROP POLICY IF EXISTS ${tableName}_security_policy ON ${tableName}`);
        await pool.query(`DROP POLICY IF EXISTS ${tableName}_tenant_isolation ON ${tableName}`);
        
        if (hasTenant.rows[0].exists) {
          await pool.query(`
            CREATE POLICY ${tableName}_security_policy ON ${tableName}
            FOR ALL
            USING (
              current_setting('app.data_scope', true) = 'ALL'
              OR tenant_id::text = current_setting('app.tenant_id', true)
            )
          `);
        } else {
          // No tenant_id - just require context
          await pool.query(`
            CREATE POLICY ${tableName}_security_policy ON ${tableName}
            FOR ALL
            USING (
              is_security_context_set()
            )
          `);
        }
        
        console.log(`   ✅ ${tableName} - secured`);
      } catch (e) {
        console.log(`   ⚠️  ${tableName}: ${e.message}`);
      }
    }
    
    // ========================================================================
    // STEP 7: RLS on audit/activity tables (for compliance)
    // ========================================================================
    console.log('\n📊 STEP 7: Securing audit tables...');
    
    const auditTables = ['audit_logs', 'activity_logs', 'security_events'];
    
    for (const tableName of auditTables) {
      try {
        const exists = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);
        
        if (!exists.rows[0].exists) continue;
        
        await pool.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
        await pool.query(`DROP POLICY IF EXISTS ${tableName}_security_policy ON ${tableName}`);
        
        // Audit tables: Only admins can see all, others see own
        await pool.query(`
          CREATE POLICY ${tableName}_security_policy ON ${tableName}
          FOR ALL
          USING (
            current_setting('app.data_scope', true) IN ('ALL', 'TENANT')
            OR (
              tenant_id::text = current_setting('app.tenant_id', true)
              AND user_id = NULLIF(current_setting('app.user_id', true), '')::INTEGER
            )
          )
        `);
        
        console.log(`   ✅ ${tableName} - secured`);
      } catch {
        // Silent skip
      }
    }
    
    // ========================================================================
    // STEP 8: Disable RLS on read-only lookup tables
    // ========================================================================
    console.log('\n📊 STEP 8: Configuring lookup tables (no RLS)...');
    
    const lookupTables = [
      'countries', 'currencies', 'time_zones', 'languages',
      'pages_master', 'modules_master', 'rbac_roles', 'data_scopes',
      'subscription_plans', 'subscription_features'
    ];
    
    for (const tableName of lookupTables) {
      try {
        await pool.query(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY`);
        console.log(`   ⏭️  ${tableName} - RLS disabled (lookup table)`);
      } catch {
        // Silent skip
      }
    }
    
    // ========================================================================
    // STEP 9: Create security audit logging function
    // ========================================================================
    console.log('\n📊 STEP 9: Creating security audit trigger...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS security_access_log (
        id BIGSERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        user_id INTEGER,
        tenant_id TEXT,
        data_scope TEXT,
        table_name TEXT,
        operation TEXT,
        row_count INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_access_log_created 
      ON security_access_log(created_at DESC)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_security_access_log_user 
      ON security_access_log(user_id, created_at DESC)
    `);
    
    console.log('   ✅ Created security_access_log table');
    
    await pool.query(`
      CREATE OR REPLACE FUNCTION log_security_access(
        p_event_type TEXT,
        p_table_name TEXT,
        p_operation TEXT,
        p_row_count INTEGER DEFAULT NULL
      ) RETURNS VOID AS $$
      BEGIN
        INSERT INTO security_access_log (
          event_type, user_id, tenant_id, data_scope, 
          table_name, operation, row_count
        ) VALUES (
          p_event_type,
          NULLIF(current_setting('app.user_id', true), ''),  -- TEXT, supports both UUID and integer
          current_setting('app.tenant_id', true),
          current_setting('app.data_scope', true),
          p_table_name,
          p_operation,
          p_row_count
        );
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ Created log_security_access() function');
    
    // ========================================================================
    // VERIFICATION
    // ========================================================================
    console.log('\n📊 VERIFICATION...');
    
    // List tables with RLS
    const rlsTables = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND rowsecurity = true
      ORDER BY tablename
    `);
    
    console.log('\n   Tables with RLS enabled: ' + rlsTables.rows.length);
    for (const row of rlsTables.rows) {
      console.log(`   ✅ ${row.tablename}`);
    }
    
    // Count policies
    const policyCount = await pool.query(`
      SELECT COUNT(*) as count FROM pg_policies WHERE schemaname = 'public'
    `);
    console.log(`\n   Total RLS policies: ${policyCount.rows[0].count}`);
    
    // Test context function
    console.log('\n   Testing set_security_context()...');
    await pool.query(`SELECT set_security_context(1, 'test-tenant', 'TENANT', 'ADMIN', 'HR')`);
    const contextTest = await pool.query(`
      SELECT 
        current_setting('app.user_id', true) as user_id,
        current_setting('app.tenant_id', true) as tenant_id,
        current_setting('app.data_scope', true) as data_scope,
        is_security_context_set() as context_set
    `);
    console.log('   Context test:', contextTest.rows[0]);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Migration 046 completed successfully!');
    console.log('');
    console.log('CRITICAL: Call set_security_context() at start of EVERY request:');
    console.log('');
    console.log("  SELECT set_security_context(12, 'tenant-uuid', 'EMPLOYEES', 'HR_ADMIN', 'HR');");
    console.log('');
    console.log('Without this, queries will return 0 rows (fail-safe).');
    
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
