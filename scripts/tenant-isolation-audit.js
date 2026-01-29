/**
 * Tenant Isolation Audit Script
 * ==============================
 * 
 * Finds tables that might be missing tenant isolation.
 */

const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function audit() {
  console.log('=== TABLES WITHOUT TENANT ISOLATION ===\n');
  
  // Find business tables without tenant_id or clientId
  const noTenant = await pool.query(`
    SELECT t.table_name, 
           (SELECT COUNT(*) FROM information_schema.columns c 
            WHERE c.table_name = t.table_name 
            AND c.column_name IN ('tenant_id', 'clientId', 'client_id')) as tenant_col_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE E'\\_%%' ESCAPE E'\\\\'
    ORDER BY t.table_name
  `);
  
  const noTenantTables = noTenant.rows.filter(r => r.tenant_col_count === '0');
  
  console.log('Tables without any tenant column (may be global):');
  noTenantTables.forEach(r => console.log('  ' + r.table_name));
  console.log(`\nTotal: ${noTenantTables.length} tables\n`);
  
  // Categorize them
  const systemTables = ['_prisma_migrations', '_schema_info', 'knex_migrations', 'knex_migrations_lock', 
    'migration_history', 'schema_migrations', 'background_job_audit', 'background_jobs', 'table_classification',
    'idempotency_keys'];
  const globalConfigTables = ['subscription_plans', 'master_subscription_plans', 'master_feature_definitions',
    'feature_catalog', 'modules_master', 'pages_master', 'rbac_actions', 'data_scopes', 
    'spelling_dictionary', 'infrastructure_billing_rates', 'micro_subscription_plans',
    'feature_flag_definitions', 'base_user_pages', 'superadmin_page_pool', 'rbac_roles', 'rbac_permissions',
    'preprocessing_settings', 'protected_spans', 'org_units', 'plan_feature_controls', 'plan_module_access',
    'plan_feature_controls_draft', 'plan_module_access_draft', 'bank_templates', 'personal_user_dictionary'];
  const platformTables = ['super_admins', 'enterprise_admins', 'clients', 'api_keys'];
  
  const allKnownGlobal = [...systemTables, ...globalConfigTables, ...platformTables];
  
  const business = noTenantTables.filter(t => !allKnownGlobal.includes(t.table_name));
  
  console.log('=== POTENTIALLY MISSING TENANT ISOLATION ===\n');
  business.forEach(r => console.log('  ' + r.table_name));
  console.log(`\nTotal potentially missing: ${business.length}`);
  
  await pool.end();
}

audit().catch(console.error);
