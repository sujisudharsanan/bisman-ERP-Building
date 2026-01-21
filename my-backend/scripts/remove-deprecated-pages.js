/**
 * Remove deprecated enterprise-admin pages from database
 * Pages to remove:
 * - enterprise-admin-live-dashboard
 * - enterprise-admin-settings  
 * - enterprise-admin-support
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const PAGES_TO_REMOVE = [
  'ENTERPRISE_ADMIN_LIVE_DASHBOARD',
  'ENTERPRISE_ADMIN_SETTINGS',
  'ENTERPRISE_ADMIN_SUPPORT',
  'enterprise-admin-live-dashboard',
  'enterprise-admin-settings',
  'enterprise-admin-support'
];

const ROUTES_TO_REMOVE = [
  '/enterprise-admin/live-dashboard',
  '/enterprise-admin/settings',
  '/enterprise-admin/support'
];

async function removePages(connectionString, dbName) {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('railway') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    console.log(`\n✅ Connected to ${dbName}`);

    // Check which tables exist
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('pages_master', 'pages', 'role_pages', 'subscription_pages')
    `);
    const existingTables = tableCheck.rows.map(r => r.table_name);
    console.log(`📋 Found tables: ${existingTables.join(', ')}`);

    let totalDeleted = 0;

    // Delete from pages_master if exists
    if (existingTables.includes('pages_master')) {
      const result = await client.query(`
        DELETE FROM pages_master 
        WHERE page_code = ANY($1) OR route = ANY($2)
        RETURNING page_code, route
      `, [PAGES_TO_REMOVE, ROUTES_TO_REMOVE]);
      console.log(`🗑️  Deleted ${result.rowCount} from pages_master`);
      if (result.rows.length > 0) {
        result.rows.forEach(r => console.log(`   - ${r.page_code || r.route}`));
      }
      totalDeleted += result.rowCount;
    }

    // Delete from pages if exists
    if (existingTables.includes('pages')) {
      const result = await client.query(`
        DELETE FROM pages 
        WHERE code = ANY($1) OR route = ANY($2) OR key = ANY($1)
        RETURNING code, route
      `, [PAGES_TO_REMOVE, ROUTES_TO_REMOVE]);
      console.log(`��️  Deleted ${result.rowCount} from pages`);
      totalDeleted += result.rowCount;
    }

    // Delete from role_pages if exists (foreign key cleanup)
    if (existingTables.includes('role_pages')) {
      const result = await client.query(`
        DELETE FROM role_pages 
        WHERE page_id IN (
          SELECT id FROM pages_master WHERE page_code = ANY($1) OR route = ANY($2)
          UNION
          SELECT id FROM pages WHERE code = ANY($1) OR route = ANY($2) OR key = ANY($1)
        )
        RETURNING page_id
      `, [PAGES_TO_REMOVE, ROUTES_TO_REMOVE]);
      console.log(`🗑️  Deleted ${result.rowCount} from role_pages`);
      totalDeleted += result.rowCount;
    }

    // Delete from subscription_pages if exists
    if (existingTables.includes('subscription_pages')) {
      const result = await client.query(`
        DELETE FROM subscription_pages 
        WHERE page_id IN (
          SELECT id FROM pages_master WHERE page_code = ANY($1) OR route = ANY($2)
        )
        RETURNING page_id
      `, [PAGES_TO_REMOVE, ROUTES_TO_REMOVE]);
      console.log(`🗑️  Deleted ${result.rowCount} from subscription_pages`);
      totalDeleted += result.rowCount;
    }

    console.log(`\n✅ Total deleted from ${dbName}: ${totalDeleted} records`);

    client.release();
    await pool.end();
  } catch (error) {
    console.error(`❌ Error on ${dbName}:`, error.message);
  }
}

async function main() {
  console.log('🧹 Removing deprecated enterprise-admin pages...\n');
  console.log('Pages to remove:');
  ROUTES_TO_REMOVE.forEach(r => console.log(`  - ${r}`));

  // Local database
  const localUrl = process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL;
  if (localUrl) {
    await removePages(localUrl, 'LOCAL DB');
  } else {
    console.log('⚠️  No local DATABASE_URL found, skipping local DB');
  }

  // Railway database
  const railwayUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  if (railwayUrl) {
    await removePages(railwayUrl, 'RAILWAY DB');
  } else {
    console.log('⚠️  No RAILWAY_DATABASE_URL found, skipping Railway DB');
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
