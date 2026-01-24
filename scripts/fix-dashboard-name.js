#!/usr/bin/env node
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

async function main() {
  console.log('Finding and fixing "Admin Dashboard" in sidebar...\n');

  try {
    // Find ALL pages with "dashboard" in the display_name (case-insensitive)
    const findRes = await pool.query(`
      SELECT id, page_code, display_name, route, show_in_sidebar 
      FROM pages_master 
      WHERE display_name ILIKE '%dashboard%'
      ORDER BY display_name
    `);
    
    console.log('=== All Dashboard Pages ===');
    for (const row of findRes.rows) {
      console.log(`  [${row.id}] ${row.page_code}: "${row.display_name}" -> ${row.route} (sidebar: ${row.show_in_sidebar})`);
    }

    // Check what pages ADMIN_OPS has access to that show in sidebar
    const adminOpsPages = await pool.query(`
      SELECT pm.id, pm.page_code, pm.display_name, pm.route
      FROM role_page_access rpa
      JOIN pages_master pm ON pm.id = rpa.page_id
      WHERE rpa.role_name = 'ADMIN_OPS' AND pm.show_in_sidebar = true
      ORDER BY pm.sort_order, pm.display_name
    `);
    
    console.log('\n=== ADMIN_OPS Sidebar Pages ===');
    for (const row of adminOpsPages.rows) {
      console.log(`  [${row.id}] ${row.page_code}: "${row.display_name}" -> ${row.route}`);
    }

    // Look for pages with route = '/admin' specifically
    const adminRoute = await pool.query(`
      SELECT id, page_code, display_name, route, show_in_sidebar 
      FROM pages_master 
      WHERE route = '/admin'
    `);
    
    console.log('\n=== Page at /admin route ===');
    for (const row of adminRoute.rows) {
      console.log(`  [${row.id}] ${row.page_code}: "${row.display_name}" -> ${row.route} (sidebar: ${row.show_in_sidebar})`);
    }

    // Now update: change "Admin Dashboard" to just "Dashboard"
    const updateRes = await pool.query(`
      UPDATE pages_master 
      SET display_name = 'Dashboard' 
      WHERE display_name = 'Admin Dashboard'
      RETURNING id, page_code, display_name, route
    `);
    
    if (updateRes.rows.length > 0) {
      console.log('\n✅ Updated display_name from "Admin Dashboard" to "Dashboard":');
      for (const row of updateRes.rows) {
        console.log(`  [${row.id}] ${row.page_code}: "${row.display_name}" -> ${row.route}`);
      }
    } else {
      console.log('\n⚠️ No page with display_name = "Admin Dashboard" found.');
      console.log('Checking for alternatives...');
      
      // Check if the /admin page has a different display_name
      const adminPage = await pool.query(`
        SELECT id, page_code, display_name, route FROM pages_master WHERE route = '/admin' LIMIT 1
      `);
      if (adminPage.rows.length > 0) {
        const page = adminPage.rows[0];
        console.log(`  Current /admin page: "${page.display_name}"`);
        
        if (page.display_name !== 'Dashboard') {
          const fix = await pool.query(`
            UPDATE pages_master SET display_name = 'Dashboard' WHERE route = '/admin' RETURNING id, page_code, display_name
          `);
          console.log(`\n✅ Fixed: Changed "${page.display_name}" to "Dashboard" for /admin route`);
        }
      }
    }

    console.log('\nDone!');
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  
  pool.end();
}

main();
