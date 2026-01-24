/* eslint-env node, commonjs */
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

(async () => {
  try {
    console.log('=== COMPLETE FIX: rbac_roles names + user roles ===\n');
    
    // Step 1: Get all unique role_names from role_page_access (source of truth)
    const accessRoles = await pool.query(`
      SELECT DISTINCT role_name FROM role_page_access ORDER BY role_name
    `);
    console.log('Step 1: Role names in role_page_access (source of truth):');
    console.log(accessRoles.rows.map(r => r.role_name).join(', '));
    
    // Step 2: Get current rbac_roles
    const currentRoles = await pool.query(`
      SELECT id, name, display_name FROM rbac_roles ORDER BY id
    `);
    console.log('\nStep 2: Current rbac_roles:');
    console.table(currentRoles.rows);
    
    // Step 3: Create mapping from display names to code names
    const nameMapping = {
      'Super Admin': 'SUPER_ADMIN',
      'System Administrator': 'SYSTEM_ADMIN',
      'Operations Manager': 'OPERATIONS_MANAGER',
      'Hub Incharge': 'HUB_INCHARGE',
      'Store Incharge': 'STORE_INCHARGE',
      'Staff': 'STAFF',
      'Manager': 'MANAGER',
      'Accounts': 'ACCOUNTS',
      'Accounts Payable': 'ACCOUNTS_PAYABLE',
      'Finance Controller': 'FINANCE_CONTROLLER',
      'Procurement Officer': 'PROCUREMENT_OFFICER',
      'Banker': 'BANKER',
      'Compliance': 'COMPLIANCE',
      'Legal': 'LEGAL',
      'IT Admin': 'IT_ADMIN',
      'Treasury': 'TREASURY',
      'Demo User': 'DEMO_USER',
      'Admin': 'ADMIN'
    };
    
    // Step 4: Fix rbac_roles names
    console.log('\nStep 3: Fixing rbac_roles names...');
    let rolesFixed = 0;
    
    for (const role of currentRoles.rows) {
      const correctName = nameMapping[role.name];
      if (correctName && role.name !== correctName) {
        // Check if correct name already exists
        const existing = await pool.query(`SELECT id FROM rbac_roles WHERE name = $1`, [correctName]);
        
        if (existing.rows.length > 0) {
          // Delete the duplicate display-name version
          await pool.query(`DELETE FROM rbac_roles WHERE id = $1`, [role.id]);
          console.log(`   Deleted duplicate "${role.name}" (ID: ${role.id}) - "${correctName}" already exists`);
        } else {
          // Update to correct name
          await pool.query(`UPDATE rbac_roles SET name = $1 WHERE id = $2`, [correctName, role.id]);
          console.log(`   ✅ Updated: "${role.name}" -> "${correctName}"`);
          rolesFixed++;
        }
      }
    }
    console.log(`   Roles fixed: ${rolesFixed}`);
    
    // Step 5: Fix user roles (convert IDs to names)
    console.log('\nStep 4: Fixing user roles...');
    
    // Get fresh role ID to name mapping
    const freshRoles = await pool.query(`SELECT id, name FROM rbac_roles`);
    const roleIdToName = {};
    freshRoles.rows.forEach(r => {
      roleIdToName[r.id.toString()] = r.name;
    });
    
    // Get all users
    const allUsers = await pool.query(`SELECT id, username, email, role FROM users`);
    
    let usersFixed = 0;
    for (const user of allUsers.rows) {
      if (user.role && /^\d+$/.test(user.role)) {
        // Role is numeric - needs to be converted to name
        const roleName = roleIdToName[user.role];
        if (roleName) {
          await pool.query(`UPDATE users SET role = $1 WHERE id = $2`, [roleName, user.id]);
          console.log(`   ✅ User ${user.username}: "${user.role}" -> "${roleName}"`);
          usersFixed++;
        } else {
          console.log(`   ⚠️ User ${user.username}: role ID "${user.role}" not found in rbac_roles`);
        }
      }
    }
    console.log(`   Users fixed: ${usersFixed}`);
    
    // Step 6: Verification
    console.log('\n=== VERIFICATION ===\n');
    
    // Check role page counts
    const verification = await pool.query(`
      SELECT r.name, r.display_name, COUNT(rpa.page_id) as page_count
      FROM rbac_roles r
      LEFT JOIN role_page_access rpa ON r.name = rpa.role_name AND rpa.can_view = true
      GROUP BY r.name, r.display_name
      ORDER BY page_count DESC
    `);
    console.log('Roles with page counts:');
    console.table(verification.rows);
    
    // Check users and their sidebar page counts
    console.log('\nUsers with their sidebar page counts:');
    const userVerify = await pool.query(`
      SELECT u.username, u.role, 
        (SELECT COUNT(*) FROM role_page_access rpa 
         JOIN pages_master pm ON pm.id = rpa.page_id
         WHERE rpa.role_name = u.role AND rpa.can_view = true AND pm.show_in_sidebar = true) as sidebar_pages
      FROM users u
      ORDER BY u.id
    `);
    console.table(userVerify.rows);
    
    console.log('\n✅ Complete fix done!');
    
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
