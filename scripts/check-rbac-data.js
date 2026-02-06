const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });
(async () => {
  const data = await pool.query('SELECT id, user_id, role_id FROM rbac_user_roles LIMIT 5');
  console.table(data.rows);
  pool.end();
})();
