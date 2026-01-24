/* eslint-env node, commonjs */
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

(async () => {
  try {
    console.log('=== Fixing user Lima L Ohui role ===');
    
    // Update user's role from '26' to 'ADMIN_OPS'
    const updateResult = await pool.query(`
      UPDATE users SET role = 'ADMIN_OPS' WHERE id = 1 AND role = '26' RETURNING id, username, role
    `);
    
    if (updateResult.rowCount > 0) {
      console.log('✅ User role updated:');
      console.table(updateResult.rows);
    } else {
      console.log('No rows updated - user may already have correct role or different condition');
    }
    
    // Verify user now
    const userQuery = await pool.query(`
      SELECT id, username, email, role FROM users WHERE id = 1
    `);
    console.log('\n=== Current user state ===');
    console.table(userQuery.rows);
    
    // Check pages for ADMIN_OPS
    const pagesQuery = await pool.query(`
      SELECT COUNT(*) as count FROM role_page_access WHERE role_name = 'ADMIN_OPS' AND can_view = true
    `);
    console.log(`\nPages for ADMIN_OPS: ${pagesQuery.rows[0].count}`);
    
    // Check sidebar pages
    const sidebarQuery = await pool.query(`
      SELECT pm.display_name, pm.route 
      FROM role_page_access rpa
      JOIN pages_master pm ON pm.id = rpa.page_id
      WHERE rpa.role_name = 'ADMIN_OPS' AND rpa.can_view = true AND pm.show_in_sidebar = true
      ORDER BY pm.display_name
    `);
    console.log('\n=== Sidebar pages for ADMIN_OPS ===');
    console.table(sidebarQuery.rows);
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
