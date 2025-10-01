require('dotenv').config();
const { Client } = require('pg');

(async function main() {
  try {
    await client.connect();
    const res = await client.query('SELECT id, email, password, role_id FROM users ORDER BY id DESC LIMIT 100');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying users table:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch (_) {}
  }
})();
