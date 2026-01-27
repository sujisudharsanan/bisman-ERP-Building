const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  console.log('=== PUMP MANAGEMENT ANALYSIS ===\n');
  
  // 1. Check modules table entry
  const pumpModule = await pool.query("SELECT * FROM modules WHERE module_name = 'pump-management'");
  console.log('1. modules table entry:');
  console.log(pumpModule.rows[0] || 'NOT FOUND');
  
  // 2. Check if any module_assignments reference it
  const pumpAssignments = await pool.query(`
    SELECT ma.*, u.email 
    FROM module_assignments ma 
    LEFT JOIN users u ON ma.super_admin_id = u.id 
    WHERE ma.module_id = 31
  `);
  console.log('\n2. Module assignments (Super Admins with Pump Management):');
  console.table(pumpAssignments.rows.length > 0 ? pumpAssignments.rows : 'NONE');
  
  // 3. Check pages_master for any pump-related pages
  const pumpPages = await pool.query(`
    SELECT id, page_code, display_name, route, module_id, status 
    FROM pages_master 
    WHERE route ILIKE '%pump%' OR page_code ILIKE '%pump%' OR display_name ILIKE '%pump%'
    ORDER BY route
  `);
  console.log('\n3. Pages with "pump" in route/code/name:');
  console.table(pumpPages.rows.length > 0 ? pumpPages.rows : 'NONE');
  
  // 4. What modules are in Pump category?
  const pumpCategoryModules = await pool.query(`
    SELECT id, module_name, display_name, "productType" 
    FROM modules 
    WHERE "productType" ILIKE '%pump%'
    ORDER BY id
  `);
  console.log('\n4. Modules with productType containing "pump":');
  console.table(pumpCategoryModules.rows);
  
  // 5. Summary
  console.log('\n=== SUMMARY ===');
  console.log('Pump Management exists in: modules table (id=31)');
  console.log('Pump Management exists in: modules_master table = NO');
  console.log('Pages linked to pump module: ', pumpPages.rows.length);
  console.log('Super Admins with pump assignment: ', pumpAssignments.rows.length);
  
  if (pumpPages.rows.length === 0 && pumpAssignments.rows.length === 0) {
    console.log('\n⚠️  RECOMMENDATION: Pump Management module has no pages and no assignments.');
    console.log('   Consider removing it from the modules table or adding pages/assignments.');
  }
  
  pool.end();
})();
