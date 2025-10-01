require('dotenv').config();
const { Client } = require('pg');

(async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query('SELECT id, email, name, role_id AS "roleId", created_at AS "createdAt" FROM users ORDER BY created_at DESC LIMIT 100');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying users table:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch (_) {}
  }
})();
