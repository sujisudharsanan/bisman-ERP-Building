/* eslint-env node, commonjs */
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

(async () => {
  try {
    // Check user Lima L Ohui
    console.log('=== Looking for user Lima L Ohui ===');
    const user = await pool.query(`
      SELECT id, username, email, role
      FROM users
      WHERE username ILIKE '%lima%' OR email ILIKE '%lima%' OR username ILIKE '%ohui%'
      LIMIT 5
    `);
    console.table(user.rows);

    // Check if role field is being used correctly
    if (user.rows.length > 0) {
      const userRole = user.rows[0].role;
      
      console.log(`\n=== User's role field: "${userRole}" ===`);
      
      // Check if this role exists in rbac_roles
      const roleCheck = await pool.query(`
        SELECT id, name, display_name 
        FROM rbac_roles 
        WHERE name = $1
      `, [userRole]);
      console.log('Role in rbac_roles:');
      console.table(roleCheck.rows);
      
      // Check page access for this role
      const pages = await pool.query(`
        SELECT COUNT(*) as count
        FROM role_page_access
        WHERE role_name = $1
      `, [userRole]);
      console.log(`\nPages for role_name="${userRole}":`, pages.rows[0].count);
    }

    // Show all unique role values in users table
    console.log('\n=== Unique role values in users table ===');
    const roles = await pool.query(`
      SELECT DISTINCT role, COUNT(*) as user_count
      FROM users
      GROUP BY role
      ORDER BY role
    `);
    console.table(roles.rows);

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
})();
