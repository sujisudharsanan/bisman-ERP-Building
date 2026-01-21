const { Pool } = require('pg');

const RAILWAY_URL = 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const PAGES_TO_REMOVE = [
  'ENTERPRISE_ADMIN_LIVE_DASHBOARD',
  'ENTERPRISE_ADMIN_SETTINGS',
  'ENTERPRISE_ADMIN_SUPPORT'
];

const ROUTES_TO_REMOVE = [
  '/enterprise-admin/live-dashboard',
  '/enterprise-admin/settings',
  '/enterprise-admin/support'
];

async function run() {
  console.log('🔌 Connecting to Railway DB...');
  const pool = new Pool({
    connectionString: RAILWAY_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Railway DB');
    
    // Check what exists
    const check = await client.query(`
      SELECT page_code, route FROM pages_master 
      WHERE page_code = ANY($1) OR route = ANY($2)
    `, [PAGES_TO_REMOVE, ROUTES_TO_REMOVE]);
    console.log('Found pages to delete:', check.rows.length);
    check.rows.forEach(r => console.log('  -', r.page_code, r.route));
    
    if (check.rows.length === 0) {
      console.log('✅ No pages to delete - already clean!');
      client.release();
      await pool.end();
      return;
    }
    
    // Delete
    const result = await client.query(`
      DELETE FROM pages_master 
      WHERE page_code = ANY($1) OR route = ANY($2)
      RETURNING page_code, route
    `, [PAGES_TO_REMOVE, ROUTES_TO_REMOVE]);
    
    console.log('🗑️ Deleted', result.rowCount, 'pages from Railway');
    result.rows.forEach(r => console.log('  -', r.page_code || r.route));
    
    client.release();
    await pool.end();
    console.log('✨ Done!');
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
  }
}

run();
