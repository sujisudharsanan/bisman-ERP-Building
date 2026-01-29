/**
 * Migration 050: RLS Tier 1 Expansion
 * ====================================
 * 
 * PURPOSE:
 * Expand RLS to Tier 1 critical tables that MUST have protection
 * before large-org deployment.
 * 
 * TIER 1 TABLES:
 * - users_enhanced (already has RLS)
 * - workflow_tasks
 * - subscription_invoices
 * - admin_page_assignments (already has RLS)
 * - audit_logs (partitioned, already has RLS)
 * - task_requests
 * - approval workflow tables
 * 
 * @migration 050
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🚀 Migration 050: RLS Tier 1 Expansion...\n');
  
  try {
    // =========================================================================
    // STEP 1: Check current RLS status
    // =========================================================================
    console.log('STEP 1: Checking current RLS status...');
    
    const currentRLS = await pool.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relkind = 'r'
        AND relrowsecurity = true
    `);
    
    console.log(`   Currently ${currentRLS.rows.length} tables have RLS enabled`);
    
    // =========================================================================
    // STEP 2: Define Tier 1 tables
    // =========================================================================
    const tier1Tables = [
      {
        name: 'workflow_tasks',
        tenantColumn: 'tenant_id',
        userColumn: 'creator_id',
        description: 'Task workflow table'
      },
      {
        name: 'task_requests',
        tenantColumn: 'tenant_id',
        userColumn: 'requester_id',
        description: 'Task request table'
      },
      {
        name: 'subscription_invoices',
        tenantColumn: 'tenant_id',
        userColumn: null,
        description: 'Financial invoices'
      },
      {
        name: 'approval_audit_log',
        tenantColumn: 'tenant_id',
        userColumn: 'user_id',
        description: 'Approval audit trail'
      },
      {
        name: 'workflow_audit',
        tenantColumn: 'tenant_id',
        userColumn: 'actor_id',
        description: 'Workflow audit trail'
      },
      {
        name: 'payment_activity_logs',
        tenantColumn: 'tenant_id',
        userColumn: 'user_id',
        description: 'Payment activity log'
      }
    ];
    
    // =========================================================================
    // STEP 3: Enable RLS on each table
    // =========================================================================
    console.log('\nSTEP 2: Enabling RLS on Tier 1 tables...');
    
    for (const table of tier1Tables) {
      try {
        // Check if table exists
        const tableExists = await pool.query(`
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = $1 AND table_schema = 'public'
        `, [table.name]);
        
        if (tableExists.rows.length === 0) {
          console.log(`   ⏭️  ${table.name} does not exist - skipping`);
          continue;
        }
        
        // Check if tenant_id column exists
        const hasTenantId = await pool.query(`
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        `, [table.name, table.tenantColumn]);
        
        if (hasTenantId.rows.length === 0) {
          console.log(`   ⚠️  ${table.name} lacks ${table.tenantColumn} - adding column`);
          
          await pool.query(`
            ALTER TABLE ${table.name} 
            ADD COLUMN IF NOT EXISTS tenant_id UUID
          `);
        }
        
        // Check current RLS status
        const rlsStatus = await pool.query(`
          SELECT relrowsecurity FROM pg_class 
          WHERE relname = $1 AND relnamespace = 'public'::regnamespace
        `, [table.name]);
        
        if (rlsStatus.rows[0]?.relrowsecurity) {
          console.log(`   ℹ️  ${table.name} already has RLS enabled`);
          continue;
        }
        
        // Enable RLS
        await pool.query(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY`);
        
        // Create tenant isolation policy
        const policyName = `${table.name}_tenant_isolation`;
        
        await pool.query(`
          DROP POLICY IF EXISTS ${policyName} ON ${table.name}
        `);
        
        let policySQL;
        if (table.userColumn) {
          // Policy with user-level filtering option
          policySQL = `
            CREATE POLICY ${policyName} ON ${table.name}
            FOR ALL
            USING (
              CASE 
                WHEN NOT is_security_context_set() THEN false
                WHEN current_setting('app.data_scope', true) = 'ALL' THEN true
                WHEN ${table.tenantColumn} IS NULL THEN true
                ELSE ${table.tenantColumn}::text = current_setting('app.tenant_id', true)
                  AND (
                    current_setting('app.data_scope', true) != 'SELF'
                    OR ${table.userColumn}::text = current_setting('app.user_id', true)
                  )
              END
            )
          `;
        } else {
          // Tenant-only policy
          policySQL = `
            CREATE POLICY ${policyName} ON ${table.name}
            FOR ALL
            USING (
              CASE 
                WHEN NOT is_security_context_set() THEN false
                WHEN current_setting('app.data_scope', true) = 'ALL' THEN true
                WHEN ${table.tenantColumn} IS NULL THEN true
                ELSE ${table.tenantColumn}::text = current_setting('app.tenant_id', true)
              END
            )
          `;
        }
        
        await pool.query(policySQL);
        
        console.log(`   ✅ ${table.name} - RLS enabled with ${policyName}`);
        
      } catch (e) {
        console.log(`   ❌ ${table.name} failed: ${e.message}`);
      }
    }
    
    // =========================================================================
    // STEP 4: Update table_classification
    // =========================================================================
    console.log('\nSTEP 3: Updating table classification...');
    
    for (const table of tier1Tables) {
      await pool.query(`
        UPDATE table_classification 
        SET requires_rls = true, rls_tier = 1
        WHERE table_name = $1
      `, [table.name]);
    }
    
    console.log('   ✅ Table classification updated');
    
    // =========================================================================
    // STEP 5: Verification
    // =========================================================================
    console.log('\nSTEP 4: Verification...');
    
    const newRLS = await pool.query(`
      SELECT relname
      FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relkind = 'r'
        AND relrowsecurity = true
      ORDER BY relname
    `);
    
    console.log(`   📊 Tables with RLS enabled: ${newRLS.rows.length}`);
    newRLS.rows.slice(0, 10).forEach(r => console.log(`      - ${r.relname}`));
    if (newRLS.rows.length > 10) {
      console.log(`      ... and ${newRLS.rows.length - 10} more`);
    }
    
    // Check policies
    const policies = await pool.query(`
      SELECT tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`   📊 Total RLS policies: ${policies.rows.length}`);
    
    console.log('\n✅ Migration 050 completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}

module.exports = { migrate };
