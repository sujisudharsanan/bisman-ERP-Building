// my-backend/scripts/list-tables.js
require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

(async function main() {
  try {
    await client.connect();
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;");
    console.log('tables in public schema:');
    res.rows.forEach(r => console.log('-', r.tablename));
  } catch (err) {
    console.error('Error listing tables:', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    try { await client.end(); } catch (_) {}
  }
})();
