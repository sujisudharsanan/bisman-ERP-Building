const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

(async () => {
  try {
    console.log('=== PHASE 1: SAFE FIXES ===\n');
    
    // 1) Remove invalid root route /
    console.log('1) Removing root route / from all roles...');
    const fix1 = await pool.query(`
      DELETE FROM role_page_access rpa
      USING pages_master pm
      WHERE rpa.page_id = pm.id
        AND pm.route = '/'
      RETURNING rpa.role_name
    `);
    console.log('   Deleted: ' + fix1.rowCount + ' mappings');
    if (fix1.rowCount > 0) {
      const roles = [...new Set(fix1.rows.map(r => r.role_name))];
      console.log('   Roles: ' + roles.slice(0, 10).join(', ') + (roles.length > 10 ? '...' : ''));
    }
    
    // 2) Remove BASE_USER pages from business roles
    console.log('\n2) Removing BASE_USER pages from business roles...');
    const baseRoutes = [
      '/dashboard','/calendar','/notifications','/settings','/settings/security',
      '/assistant','/analytics','/trace','/approvals','/task-dashboard',
      '/tasks/create','/tasks/clarifications','/tasks/reviews',
      '/common/about-me','/common/calendar','/common/messages','/common/notifications',
      '/common/user-settings','/common/security-settings','/common/documentation',
      '/common/task-approvals','/common/task-approvals/[id]',
      '/common/payment-request','/common/payment-requests/create'
    ];
    const excludeRoles = [
      'SYSTEM_ADMIN','ENTERPRISE_ADMIN','SUPER_ADMIN',
      'ADMIN','ADMIN_OPS','IT_ADMIN',
      'BISMAN_SUPPORT','BISMAN_CUSTOMER_CARE','BISMAN_ENGINEERING','BISMAN_FINANCE','BISMAN_BILLING'
    ];
    
    const fix2 = await pool.query(`
      DELETE FROM role_page_access rpa
      USING pages_master pm
      WHERE rpa.page_id = pm.id
        AND pm.route = ANY($1::text[])
        AND rpa.role_name != ALL($2::text[])
      RETURNING rpa.role_name, pm.route
    `, [baseRoutes, excludeRoles]);
    console.log('   Deleted: ' + fix2.rowCount + ' mappings');
    
    // 3) Remove common duplicates completely
    console.log('\n3) Removing common duplicate routes...');
    const fix3 = await pool.query(`
      DELETE FROM role_page_access rpa
      USING pages_master pm
      WHERE rpa.page_id = pm.id
        AND pm.route IN ('/common/calendar','/common/notifications','/common/user-settings')
      RETURNING rpa.role_name, pm.route
    `);
    console.log('   Deleted: ' + fix3.rowCount + ' mappings');
    
    // 4) Verify
    console.log('\n4) Verification:');
    const verify = await pool.query(`
      SELECT pm.route, COUNT(*) as cnt
      FROM role_page_access rpa
      JOIN pages_master pm ON pm.id = rpa.page_id
      WHERE pm.route IN ('/','/dashboard','/common/calendar','/common/notifications','/common/user-settings')
      GROUP BY pm.route
      ORDER BY pm.route
    `);
    
    console.log('   Route                      | Count');
    console.log('   ---------------------------|------');
    if (verify.rows.length === 0) {
      console.log('   (all clean - 0 mappings)');
    } else {
      verify.rows.forEach(r => console.log('   ' + r.route.padEnd(26) + ' | ' + r.cnt));
    }
    
    // Summary
    const total = fix1.rowCount + fix2.rowCount + fix3.rowCount;
    console.log('\n=== PHASE 1 COMPLETE ===');
    console.log('Total mappings removed: ' + total);
    
    // Show new counts
    const counts = await pool.query(`
      SELECT role_name, COUNT(*) as cnt
      FROM role_page_access
      WHERE can_view = true
      GROUP BY role_name
      ORDER BY cnt DESC
      LIMIT 10
    `);
    console.log('\nTop 10 Role Page Counts (after):');
    counts.rows.forEach(r => console.log('   ' + r.role_name.padEnd(25) + ': ' + r.cnt));
    
    // Total mappings
    const totalMappings = await pool.query('SELECT COUNT(*) as cnt FROM role_page_access');
    console.log('\nTotal role_page_access mappings: ' + totalMappings.rows[0].cnt);
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  pool.end();
})();
