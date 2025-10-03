require('dotenv').config();
const { Client } = require('pg');

(async function main() {
  try {
    await client.connect();
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position");
    console.log('columns in users:');
    res.rows.forEach(r => console.log('-', r.column_name));
  } catch (err) {
    console.error('Error listing columns:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch (_) {}
  }
})();
