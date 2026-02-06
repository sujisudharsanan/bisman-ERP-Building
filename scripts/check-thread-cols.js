const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });
(async () => {
  const cols = await pool.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('threads', 'thread_messages', 'thread_members') ORDER BY table_name, column_name");
  console.table(cols.rows);
  pool.end();
})();
