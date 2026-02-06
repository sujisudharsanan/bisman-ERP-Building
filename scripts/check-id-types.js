const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });
(async () => {
  const tables = ['qa_test_tasks', 'qa_issues', 'rbac_roles', 'rbac_routes', 'users', 'threads', 'thread_messages', 'tasks'];
  for (const t of tables) {
    const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = 'id'", [t]);
    if (r.rows.length) console.log(t + '.id:', r.rows[0].data_type);
  }
  pool.end();
})();
