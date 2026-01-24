/* eslint-env node, commonjs */
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

(async () => {
  try {
    // Check pages for ADMIN role with show_in_sidebar = true
    console.log('=== ADMIN role pages showing in sidebar ===');
    const res = await pool.query(`
      SELECT pm.id, pm.page_code, pm.display_name, pm.route, pm.is_active, pm.show_in_sidebar
      FROM role_page_access rpa
      JOIN pages_master pm ON rpa.page_id = pm.id
      WHERE rpa.role_name = 'ADMIN' 
        AND rpa.can_view = true
        AND pm.show_in_sidebar = true
      ORDER BY pm.display_name
    `);
    console.log('Total sidebar pages for ADMIN:', res.rows.length);
    console.table(res.rows);

    // Check if there are any inactive pages showing
    console.log('\n=== Inactive pages that might still be showing ===');
    const inactive = await pool.query(`
      SELECT pm.id, pm.page_code, pm.display_name, pm.route, pm.is_active
      FROM role_page_access rpa
      JOIN pages_master pm ON rpa.page_id = pm.id
      WHERE rpa.role_name = 'ADMIN' 
        AND rpa.can_view = true
        AND pm.is_active = false
      ORDER BY pm.display_name
    `);
    console.log('Inactive pages:', inactive.rows.length);
    if (inactive.rows.length > 0) {
      console.table(inactive.rows);
    }

    // Check pages that exist in pages_master but may not exist as actual routes
    console.log('\n=== Pages from screenshot - checking if they exist ===');
    const screenshotPages = [
      '/workbench',
      '/admin',
      '/clients', 
      '/permissions',
      '/settings',
      '/usage',
      '/audit',
      '/branches',
      '/system-flow',
      '/subscription',
      '/ai-analytics',
      '/bank-templates'
    ];
    
    for (const route of screenshotPages) {
      const check = await pool.query(`
        SELECT id, page_code, display_name, route, is_active, show_in_sidebar
        FROM pages_master 
        WHERE route = $1 OR route LIKE $2
      `, [route, route + '%']);
      
      if (check.rows.length > 0) {
        console.log(`✅ ${route}:`, check.rows.map(r => `${r.display_name} (active: ${r.is_active})`).join(', '));
      } else {
        console.log(`❌ ${route}: NOT FOUND in pages_master`);
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
