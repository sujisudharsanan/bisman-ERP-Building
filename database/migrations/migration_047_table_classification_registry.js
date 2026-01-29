/**
 * Migration 047: Table Classification Registry
 * =============================================
 * 
 * PURPOSE:
 * Create a registry to classify ALL tables in the database by:
 * - GLOBAL: No tenant_id needed (countries, currencies, etc.)
 * - TENANT: Must have tenant_id
 * - ORG: Org-scoped within tenant
 * - USER: User-scoped
 * - SYSTEM: Internal only (queues, migrations, etc.)
 * 
 * This is the foundation for safe RLS expansion.
 * 
 * @migration 047
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🚀 Migration 047: Creating Table Classification Registry...\n');
  
  try {
    // =========================================================================
    // STEP 1: Create table_classification table
    // =========================================================================
    console.log('STEP 1: Creating table_classification table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS table_classification (
        table_name TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK (category IN ('GLOBAL', 'TENANT', 'ORG', 'USER', 'SYSTEM')),
        user_visible BOOLEAN NOT NULL DEFAULT false,
        requires_tenant_id BOOLEAN NOT NULL DEFAULT false,
        requires_rls BOOLEAN NOT NULL DEFAULT false,
        rls_tier INT CHECK (rls_tier IN (1, 2, 3)),
        has_tenant_id BOOLEAN,
        notes TEXT,
        reviewed_at TIMESTAMP,
        reviewed_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✅ table_classification table created');
    
    // =========================================================================
    // STEP 2: Auto-populate from information_schema
    // =========================================================================
    console.log('\nSTEP 2: Auto-populating table list...');
    
    // Get all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    // Get tables with tenant_id
    const tablesWithTenant = await pool.query(`
      SELECT DISTINCT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'tenant_id' AND table_schema = 'public'
    `);
    const tenantSet = new Set(tablesWithTenant.rows.map(r => r.table_name));
    
    // Classification rules
    const systemPatterns = [
      '_prisma_migrations', 'schema_migrations', 'spatial_ref_sys',
      'pg_', '_legacy_', 'temp_', 'backup_'
    ];
    
    const globalTables = [
      'countries', 'currencies', 'timezones', 'languages',
      'subscription_plans', 'master_feature_definitions', 'feature_catalog',
      'data_scopes', 'table_classification',
      // RBAC global tables
      'rbac_roles', 'rbac_permissions', 'rbac_routes',
      'pages_master', 'modules_master', 'modules',
      'plan_module_access', 'plan_module_access_draft', 'plan_feature_controls'
    ];
    
    const auditTables = [
      'audit_logs', 'security_access_log', 'security_events',
      'enforcement_decision_log', 'preprocessor_audit'
    ];
    
    let inserted = 0;
    let skipped = 0;
    
    for (const row of tables.rows) {
      const tableName = row.table_name;
      
      // Check if already exists
      const exists = await pool.query(
        'SELECT 1 FROM table_classification WHERE table_name = $1',
        [tableName]
      );
      
      if (exists.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Determine category
      let category = 'TENANT'; // Default
      let userVisible = true;
      let requiresTenantId = true;
      let requiresRls = false;
      let rlsTier = null;
      let notes = null;
      
      // System tables
      if (systemPatterns.some(p => tableName.startsWith(p) || tableName.includes('backup'))) {
        category = 'SYSTEM';
        userVisible = false;
        requiresTenantId = false;
        notes = 'System/internal table';
      }
      // Global tables
      else if (globalTables.includes(tableName)) {
        category = 'GLOBAL';
        userVisible = tableName.includes('pages') || tableName.includes('modules');
        requiresTenantId = false;
        notes = 'Global configuration table';
      }
      // Audit tables (special handling)
      else if (auditTables.includes(tableName) || tableName.includes('audit') || tableName.includes('_log')) {
        category = 'TENANT';
        userVisible = true;
        requiresTenantId = true;
        requiresRls = true;
        rlsTier = 1;
        notes = 'Audit/logging table - RLS Tier 1';
      }
      // Assignment tables
      else if (tableName.includes('assignment') || tableName.includes('access')) {
        category = 'TENANT';
        userVisible = false;
        requiresTenantId = true;
        requiresRls = true;
        rlsTier = 1;
        notes = 'Permission/assignment table';
      }
      // User-related tables
      else if (tableName.includes('user')) {
        category = 'USER';
        userVisible = true;
        requiresTenantId = true;
        requiresRls = true;
        rlsTier = 1;
        notes = 'User data table - RLS Tier 1';
      }
      // Financial tables
      else if (tableName.includes('invoice') || tableName.includes('payment') || tableName.includes('billing')) {
        category = 'TENANT';
        userVisible = true;
        requiresTenantId = true;
        requiresRls = true;
        rlsTier = 1;
        notes = 'Financial table - RLS Tier 1';
      }
      // Workflow/task tables
      else if (tableName.includes('workflow') || tableName.includes('task') || tableName.includes('approval')) {
        category = 'TENANT';
        userVisible = true;
        requiresTenantId = true;
        requiresRls = true;
        rlsTier = 1;
        notes = 'Workflow table - RLS Tier 1';
      }
      // Reports tables
      else if (tableName.includes('report')) {
        category = 'TENANT';
        userVisible = true;
        requiresTenantId = true;
        requiresRls = true;
        rlsTier = 2;
        notes = 'Report table - RLS Tier 2';
      }
      
      const hasTenantId = tenantSet.has(tableName);
      
      await pool.query(`
        INSERT INTO table_classification 
        (table_name, category, user_visible, requires_tenant_id, requires_rls, rls_tier, has_tenant_id, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (table_name) DO NOTHING
      `, [tableName, category, userVisible, requiresTenantId, requiresRls, rlsTier, hasTenantId, notes]);
      
      inserted++;
    }
    
    console.log(`   ✅ Inserted ${inserted} tables, skipped ${skipped} existing`);
    
    // =========================================================================
    // STEP 3: Create summary view
    // =========================================================================
    console.log('\nSTEP 3: Creating classification summary view...');
    
    await pool.query(`
      CREATE OR REPLACE VIEW v_table_classification_summary AS
      SELECT 
        category,
        COUNT(*) as table_count,
        COUNT(*) FILTER (WHERE requires_tenant_id AND NOT has_tenant_id) as missing_tenant_id,
        COUNT(*) FILTER (WHERE requires_rls) as needs_rls,
        COUNT(*) FILTER (WHERE user_visible) as user_visible_count
      FROM table_classification
      GROUP BY category
      ORDER BY category
    `);
    console.log('   ✅ Summary view created');
    
    // =========================================================================
    // STEP 4: Create blocker view
    // =========================================================================
    console.log('\nSTEP 4: Creating blocker issues view...');
    
    await pool.query(`
      CREATE OR REPLACE VIEW v_table_classification_blockers AS
      SELECT 
        table_name,
        category,
        'MISSING_TENANT_ID' as issue,
        'Table marked as requiring tenant_id but column is missing' as description
      FROM table_classification
      WHERE requires_tenant_id = true AND has_tenant_id = false
      
      UNION ALL
      
      SELECT 
        table_name,
        category,
        'RLS_NOT_ENABLED' as issue,
        'Table requires RLS but not yet enabled' as description
      FROM table_classification tc
      WHERE requires_rls = true
        AND NOT EXISTS (
          SELECT 1 FROM pg_class c
          WHERE c.relname = tc.table_name 
            AND c.relrowsecurity = true
        )
    `);
    console.log('   ✅ Blocker view created');
    
    // =========================================================================
    // STEP 5: Verification
    // =========================================================================
    console.log('\nSTEP 5: Classification Summary...');
    
    const summary = await pool.query(`SELECT * FROM v_table_classification_summary`);
    console.log('\n   Category Distribution:');
    summary.rows.forEach(r => {
      console.log(`   ${r.category}: ${r.table_count} tables (${r.missing_tenant_id} missing tenant_id, ${r.needs_rls} need RLS)`);
    });
    
    const blockers = await pool.query(`SELECT COUNT(*) as count FROM v_table_classification_blockers`);
    console.log(`\n   ⚠️  Blocker issues: ${blockers.rows[0].count}`);
    
    console.log('\n✅ Migration 047 completed successfully!');
    
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
