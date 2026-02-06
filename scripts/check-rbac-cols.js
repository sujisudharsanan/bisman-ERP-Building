const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });
(async () => {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rbac_user_roles' ORDER BY column_name");
  console.table(cols.rows);
  pool.end();
})();
