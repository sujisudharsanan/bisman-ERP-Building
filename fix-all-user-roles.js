/* eslint-env node, commonjs */
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

(async () => {
  try {
    console.log('=== Checking all users with numeric role IDs ===\n');
    
    // Get all users with their current roles
    const allUsers = await pool.query(`
      SELECT id, username, email, role FROM users ORDER BY id
    `);
    console.log('All users:');
    console.table(allUsers.rows);
    
    // Get all roles for mapping
    const rolesResult = await pool.query(`
      SELECT id, name, display_name FROM rbac_roles ORDER BY id
    `);
    console.log('\nAll roles (for mapping):');
    console.table(rolesResult.rows);
    
    // Create ID to name mapping
    const roleIdToName = {};
    rolesResult.rows.forEach(r => {
      roleIdToName[r.id.toString()] = r.name;
    });
    
    // Find users with numeric role IDs (not proper role names)
    const usersToFix = allUsers.rows.filter(u => {
      // Check if role is numeric (an ID instead of a name)
      return u.role && /^\d+$/.test(u.role);
    });
    
    console.log(`\n=== Users with numeric role IDs to fix: ${usersToFix.length} ===`);
    if (usersToFix.length > 0) {
      console.table(usersToFix);
    }
    
    // Fix each user
    let fixedCount = 0;
    for (const user of usersToFix) {
      const roleName = roleIdToName[user.role];
      if (roleName) {
        const updateResult = await pool.query(`
          UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role
        `, [roleName, user.id]);
        
        if (updateResult.rowCount > 0) {
          console.log(`✅ Fixed user ${user.username} (ID: ${user.id}): "${user.role}" -> "${roleName}"`);
          fixedCount++;
        }
      } else {
        console.log(`⚠️  Cannot fix user ${user.username} (ID: ${user.id}): role ID "${user.role}" not found in rbac_roles`);
      }
    }
    
    console.log(`\n=== Summary: Fixed ${fixedCount} of ${usersToFix.length} users ===`);
    
    // Show final state
    const finalUsers = await pool.query(`
      SELECT id, username, email, role FROM users ORDER BY id
    `);
    console.log('\n=== Final user state ===');
    console.table(finalUsers.rows);
    
    // Verify role page access works for all users
    console.log('\n=== Verifying page access for each user role ===');
    const uniqueRoles = await pool.query(`
      SELECT DISTINCT role FROM users WHERE role IS NOT NULL
    `);
    
    for (const r of uniqueRoles.rows) {
      const pageCount = await pool.query(`
        SELECT COUNT(*) as count FROM role_page_access rpa
        JOIN pages_master pm ON pm.id = rpa.page_id
        WHERE rpa.role_name = $1 AND rpa.can_view = true AND pm.show_in_sidebar = true
      `, [r.role]);
      console.log(`Role "${r.role}": ${pageCount.rows[0].count} sidebar pages`);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
