const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  try {
    // 1. Find Pump Management module
    const module = await pool.query("SELECT id, module_code, display_name FROM modules_master WHERE module_code ILIKE '%pump%' OR display_name ILIKE '%pump%'");
    console.log('=== PUMP MODULE ===');
    console.table(module.rows);
    
    if (module.rows.length > 0) {
      const moduleId = module.rows[0].id;
      
      // 2. Get pages in this module
      const pages = await pool.query('SELECT id, page_code, display_name, route FROM pages_master WHERE module_id = $1 AND status = $2', [moduleId, 'active']);
      console.log('\n=== PAGES IN PUMP MODULE (' + pages.rows.length + ' pages) ===');
      console.table(pages.rows);
      
      // 3. Check role_page_access for these pages
      const pageIds = pages.rows.map(p => p.id);
      if (pageIds.length > 0) {
        const roleAccess = await pool.query(
          'SELECT rpa.role_name, p.page_code, p.display_name FROM role_page_access rpa JOIN pages_master p ON rpa.page_id = p.id WHERE p.module_id = $1 ORDER BY rpa.role_name',
          [moduleId]
        );
        console.log('\n=== ROLES WITH PUMP MODULE PAGES (' + roleAccess.rows.length + ' mappings) ===');
        if (roleAccess.rows.length > 0) {
          console.table(roleAccess.rows);
        } else {
          console.log('NO ROLE ASSIGNMENTS FOUND FOR PUMP MODULE');
        }
        
        // 4. Count unique roles
        const uniqueRoles = await pool.query(
          'SELECT DISTINCT rpa.role_name FROM role_page_access rpa JOIN pages_master p ON rpa.page_id = p.id WHERE p.module_id = $1 ORDER BY rpa.role_name',
          [moduleId]
        );
        console.log('\n=== UNIQUE ROLES WITH PUMP ACCESS (' + uniqueRoles.rows.length + ' roles) ===');
        if (uniqueRoles.rows.length > 0) {
          console.table(uniqueRoles.rows);
        } else {
          console.log('NO ROLES ASSIGNED TO PUMP MODULE');
        }
      }
    }
    
    // 5. Check what the UI might be showing - all business roles?
    console.log('\n=== ALL BUSINESS ROLES (what UI shows?) ===');
    const allRoles = await pool.query(`
      SELECT role_name, COUNT(DISTINCT page_id) as page_count 
      FROM role_page_access 
      GROUP BY role_name 
      ORDER BY role_name
    `);
    console.table(allRoles.rows);
    console.log('Total roles: ' + allRoles.rows.length);
    
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  pool.end();
})();
