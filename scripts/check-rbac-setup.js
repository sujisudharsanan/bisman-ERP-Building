/* eslint-env node, commonjs */
/* global require */
/**
 * Check and setup RBAC tables for the 3-level permission model
 */

const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('=== RBAC Tables Check ===\n');
    
    // 1. Check existing tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('superadmin_page_pool', 'role_page_access', 'pages_master', 'rbac_roles', 'admin_role_assignments')
      ORDER BY table_name
    `);
    console.log('Existing RBAC tables:');
    tables.rows.forEach(r => console.log('  ✓', r.table_name));
    
    // 2. Check if superadmin_page_pool exists
    const sppExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'superadmin_page_pool'
      ) as exists
    `);
    
    if (!sppExists.rows[0].exists) {
      console.log('\n❌ superadmin_page_pool does not exist - creating...');
      
      await client.query(`
        CREATE TABLE superadmin_page_pool (
          id SERIAL PRIMARY KEY,
          superadmin_id INT NOT NULL,
          page_id INT NOT NULL REFERENCES pages_master(id) ON DELETE CASCADE,
          granted_by INT,
          granted_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true,
          UNIQUE(superadmin_id, page_id)
        )
      `);
      
      await client.query(`CREATE INDEX IF NOT EXISTS idx_spp_superadmin ON superadmin_page_pool(superadmin_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_spp_page ON superadmin_page_pool(page_id)`);
      
      console.log('✅ superadmin_page_pool created');
    } else {
      console.log('\n✅ superadmin_page_pool exists');
      const count = await client.query('SELECT COUNT(*) FROM superadmin_page_pool');
      console.log('   Row count:', count.rows[0].count);
    }
    
    // 3. Check pages_master stats
    console.log('\n=== Pages Master Stats ===');
    const pagesStats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE show_in_sidebar = true) as sidebar
      FROM pages_master
    `);
    console.log('Total pages:', pagesStats.rows[0].total);
    console.log('Active pages:', pagesStats.rows[0].active);
    console.log('Sidebar pages:', pagesStats.rows[0].sidebar);
    
    // 4. Check role_page_access stats
    console.log('\n=== Role Page Access Stats ===');
    const rpaStats = await client.query(`
      SELECT 
        role_name,
        COUNT(*) as page_count
      FROM role_page_access
      WHERE can_view = true
      GROUP BY role_name
      ORDER BY page_count DESC
      LIMIT 10
    `);
    console.table(rpaStats.rows);
    
    // 5. Check SuperAdmins
    console.log('\n=== SuperAdmins ===');
    const superAdmins = await client.query(`
      SELECT id, username, email, role
      FROM users
      WHERE role = 'SUPER_ADMIN'
      ORDER BY id
    `);
    console.table(superAdmins.rows);
    
    // 6. Initialize SuperAdmin pools if empty
    const poolCount = await client.query('SELECT COUNT(*) FROM superadmin_page_pool');
    if (parseInt(poolCount.rows[0].count) === 0 && superAdmins.rows.length > 0) {
      console.log('\n📦 Initializing SuperAdmin page pools...');
      
      // Get all active pages
      const allPages = await client.query('SELECT id FROM pages_master WHERE is_active = true');
      
      for (const sa of superAdmins.rows) {
        console.log(`   Adding ${allPages.rows.length} pages to SuperAdmin ${sa.id} (${sa.username})...`);
        
        for (const page of allPages.rows) {
          await client.query(`
            INSERT INTO superadmin_page_pool (superadmin_id, page_id, granted_by, is_active)
            VALUES ($1, $2, 2, true)
            ON CONFLICT (superadmin_id, page_id) DO NOTHING
          `, [sa.id, page.id]);
        }
      }
      
      console.log('✅ SuperAdmin pools initialized');
    }
    
    // 7. Final pool stats
    const finalPoolCount = await client.query('SELECT COUNT(*) FROM superadmin_page_pool');
    console.log('\n=== Final Stats ===');
    console.log('superadmin_page_pool rows:', finalPoolCount.rows[0].count);
    
    console.log('\n✅ RBAC check complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
