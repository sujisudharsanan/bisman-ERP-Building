const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  // All modules
  const modules = await pool.query('SELECT id, module_code, display_name, is_active FROM modules_master ORDER BY display_name');
  console.log('=== ALL MODULES ===');
  console.table(modules.rows);
  
  pool.end();
})();
