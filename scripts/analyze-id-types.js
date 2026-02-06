const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  try {
    // Check all tables with user_id, branch_id, created_by columns and their types
    const cols = await pool.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE column_name IN ('user_id', 'branch_id', 'created_by', 'updated_by', 'assignee_id', 'assigner_id', 'tenant_id', 'super_admin_id')
      AND table_schema = 'public'
      ORDER BY column_name, table_name
    `);
    
    console.log('ID Column Types Across Tables:');
    console.log('==============================\n');
    
    let currentCol = '';
    let typeGroups = {};
    
    cols.rows.forEach(r => {
      if (r.column_name !== currentCol) {
        if (currentCol) {
          console.log(`\n${currentCol}:`);
          Object.keys(typeGroups).forEach(type => {
            console.log(`  ${type}: ${typeGroups[type].length} tables`);
            if (typeGroups[type].length <= 10) {
              typeGroups[type].forEach(t => console.log(`    - ${t}`));
            }
          });
        }
        currentCol = r.column_name;
        typeGroups = {};
      }
      
      const type = r.data_type;
      if (!typeGroups[type]) typeGroups[type] = [];
      typeGroups[type].push(r.table_name);
    });
    
    // Print last group
    if (currentCol) {
      console.log(`\n${currentCol}:`);
      Object.keys(typeGroups).forEach(type => {
        console.log(`  ${type}: ${typeGroups[type].length} tables`);
        if (typeGroups[type].length <= 10) {
          typeGroups[type].forEach(t => console.log(`    - ${t}`));
        }
      });
    }
    
    // Check tenant_usage unique constraint
    console.log('\n\nChecking tenant_usage unique constraints:');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'tenant_usage'
    `);
    constraints.rows.forEach(r => console.log(`  ${r.constraint_name} (${r.constraint_type})`));
    
    // Check tenantQuota table existence
    console.log('\n\nChecking tenantQuota/tenant_quota table:');
    const quotaTable = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name ILIKE '%quota%' AND table_schema = 'public'
    `);
    quotaTable.rows.forEach(r => console.log(`  Found: ${r.table_name}`));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  pool.end();
})();
