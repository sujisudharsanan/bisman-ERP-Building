const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });
(async () => {
  const data = await pool.query('SELECT id, legacy_id, email FROM users WHERE legacy_id IS NOT NULL LIMIT 5');
  console.table(data.rows);
  pool.end();
})();
