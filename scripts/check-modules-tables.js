const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  // Check both tables: modules (Prisma) and modules_master (for pages_master FK)
  console.log('=== MODULES TABLE (Prisma modules) ===');
  const modules = await pool.query('SELECT id, module_name, display_name, "productType", is_always_accessible FROM modules ORDER BY id');
  console.table(modules.rows);
  console.log('Total modules:', modules.rows.length);
  
  console.log('\n=== MODULES_MASTER TABLE (pages_master FK) ===');
  const modulesMaster = await pool.query('SELECT id, module_code, display_name, is_active FROM modules_master ORDER BY id');
  console.table(modulesMaster.rows);
  console.log('Total modules_master:', modulesMaster.rows.length);
  
  // Check for "pump" in either table
  console.log('\n=== SEARCHING FOR PUMP ===');
  const pumpModules = await pool.query("SELECT * FROM modules WHERE module_name ILIKE '%pump%' OR display_name ILIKE '%pump%'");
  console.log('modules table:', pumpModules.rows.length > 0 ? pumpModules.rows : 'NOT FOUND');
  
  const pumpMaster = await pool.query("SELECT * FROM modules_master WHERE module_code ILIKE '%pump%' OR display_name ILIKE '%pump%'");
  console.log('modules_master table:', pumpMaster.rows.length > 0 ? pumpMaster.rows : 'NOT FOUND');
  
  pool.end();
})();
