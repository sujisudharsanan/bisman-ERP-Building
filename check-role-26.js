/* eslint-env node, commonjs */
/* global require */
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

(async () => {
  try {
    // Check what role ID 26 is
    console.log('=== Role ID 26 ===');
    const role26 = await pool.query('SELECT * FROM rbac_roles WHERE id = 26');
    console.table(role26.rows);

    // Check all roles with their IDs
    console.log('\n=== All Roles with IDs ===');
    const allRoles = await pool.query(`
      SELECT r.id, r.name, r.display_name, COUNT(rpa.page_id) as page_count
      FROM rbac_roles r
      LEFT JOIN role_page_access rpa ON r.name = rpa.role_name
      GROUP BY r.id, r.name, r.display_name
      ORDER BY r.id
    `);
    console.table(allRoles.rows);

    // If role 26 exists, check its pages
    if (role26.rows.length > 0) {
      const roleName = role26.rows[0].name;
      console.log(`\n=== Pages for role "${roleName}" (ID: 26) ===`);
      const pages = await pool.query(`
        SELECT pm.id, pm.page_code, pm.display_name, pm.route, pm.show_in_sidebar
        FROM role_page_access rpa
        JOIN pages_master pm ON rpa.page_id = pm.id
        WHERE rpa.role_name = $1 AND rpa.can_view = true
        ORDER BY pm.display_name
      `, [roleName]);
      console.log('Total pages:', pages.rows.length);
      if (pages.rows.length > 0) {
        console.table(pages.rows);
      } else {
        console.log('NO PAGES FOUND for this role!');
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
