#!/usr/bin/env node
const { Pool } = require('pg');

const localConfigs = [
  'postgresql://postgres:postgres@localhost:5432/bisman',
  'postgresql://postgres:password@localhost:5432/bisman',
  'postgresql://postgres@localhost:5432/bisman',
  process.env.LOCAL_DATABASE_URL
].filter(Boolean);

async function tryLocal() {
  for (const connStr of localConfigs) {
    try {
      const pool = new Pool({ connectionString: connStr, connectionTimeoutMillis: 3000 });
      await pool.query('SELECT 1');
      console.log('Connected to local DB');
      return pool;
    } catch (e) {
      // Try next
    }
  }
  return null;
}

async function main() {
  console.log('=== LOCAL DB CHECK ===\n');
  
  const localPool = await tryLocal();
  
  if (!localPool) {
    console.log('Could not connect to local PostgreSQL.');
    console.log('This is OK if you only use Railway for development.');
    return;
  }
  
  try {
    const tableExists = await localPool.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pages_master') as exists
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('pages_master table does not exist in local DB');
      return;
    }
    
    const active = await localPool.query('SELECT COUNT(*) as count FROM pages_master WHERE is_active = TRUE');
    const inactive = await localPool.query('SELECT COUNT(*) as count FROM pages_master WHERE is_active = FALSE');
    console.log('pages_master:');
    console.log('  Active:', active.rows[0].count);
    console.log('  Inactive:', inactive.rows[0].count);
    
    const rpaExists = await localPool.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'role_page_access') as exists
    `);
    
    if (rpaExists.rows[0].exists) {
      const orphanRoles = await localPool.query(`
        SELECT COUNT(*) as count 
        FROM role_page_access rpa 
        WHERE rpa.page_id NOT IN (SELECT id FROM pages_master WHERE is_active = TRUE)
      `);
      console.log('role_page_access orphans:', orphanRoles.rows[0].count);
    }
    
  } finally {
    await localPool.end();
  }
}

main();
