const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

const PAGES_TO_DELETE = [
  '/dashboard/requests',
  '/admin/reports',
  '/admin/billing/tenants'
];

(async () => {
  console.log('=== PAGE DELETION SCRIPT ===\n');
  console.log('Pages to delete:', PAGES_TO_DELETE);
  
  try {
    // 1. Find the pages
    console.log('\n1. Finding pages in database...');
    const pages = await pool.query(`
      SELECT id, page_code, display_name, route, status, module_id 
      FROM pages_master 
      WHERE route = ANY($1)
      ORDER BY route
    `, [PAGES_TO_DELETE]);
    
    if (pages.rows.length === 0) {
      console.log('❌ No pages found with these routes. They may already be deleted.');
      pool.end();
      return;
    }
    
    console.log('Found pages:');
    console.table(pages.rows);
    
    const pageIds = pages.rows.map(p => p.id);
    console.log('Page IDs:', pageIds);
    
    // 2. Check for role_page_access references
    console.log('\n2. Checking role_page_access references...');
    const roleRefs = await pool.query(`
      SELECT rpa.id, rpa.role_name, rpa.page_id, p.route
      FROM role_page_access rpa
      JOIN pages_master p ON rpa.page_id = p.id
      WHERE rpa.page_id = ANY($1)
      ORDER BY rpa.role_name
    `, [pageIds]);
    console.log(`Found ${roleRefs.rows.length} role_page_access references`);
    if (roleRefs.rows.length > 0) {
      console.table(roleRefs.rows);
    }
    
    // 3. Check for base_user_pages references
    console.log('\n3. Checking base_user_pages references...');
    const baseRefs = await pool.query(`
      SELECT bup.id, bup.page_id, p.route
      FROM base_user_pages bup
      JOIN pages_master p ON bup.page_id = p.id
      WHERE bup.page_id = ANY($1)
    `, [pageIds]);
    console.log(`Found ${baseRefs.rows.length} base_user_pages references`);
    if (baseRefs.rows.length > 0) {
      console.table(baseRefs.rows);
    }
    
    // 4. Delete role_page_access references
    console.log('\n4. Deleting role_page_access references...');
    const deleteRoleRefs = await pool.query(`
      DELETE FROM role_page_access 
      WHERE page_id = ANY($1)
      RETURNING id, role_name, page_id
    `, [pageIds]);
    console.log(`✅ Deleted ${deleteRoleRefs.rows.length} role_page_access entries`);
    
    // 5. Delete base_user_pages references
    console.log('\n5. Deleting base_user_pages references...');
    const deleteBaseRefs = await pool.query(`
      DELETE FROM base_user_pages 
      WHERE page_id = ANY($1)
      RETURNING id, page_id
    `, [pageIds]);
    console.log(`✅ Deleted ${deleteBaseRefs.rows.length} base_user_pages entries`);
    
    // 6. Delete the pages from pages_master
    console.log('\n6. Deleting pages from pages_master...');
    const deletePages = await pool.query(`
      DELETE FROM pages_master 
      WHERE id = ANY($1)
      RETURNING id, page_code, route
    `, [pageIds]);
    console.log(`✅ Deleted ${deletePages.rows.length} pages:`);
    console.table(deletePages.rows);
    
    // 7. Verify deletion
    console.log('\n7. Verifying deletion...');
    const verify = await pool.query(`
      SELECT id, route FROM pages_master WHERE route = ANY($1)
    `, [PAGES_TO_DELETE]);
    
    if (verify.rows.length === 0) {
      console.log('✅ VERIFIED: All pages successfully deleted');
    } else {
      console.log('⚠️ WARNING: Some pages still exist:', verify.rows);
    }
    
    console.log('\n=== DELETION COMPLETE ===');
    console.log(`Summary:
    - Pages deleted: ${deletePages.rows.length}
    - Role references removed: ${deleteRoleRefs.rows.length}
    - Base user references removed: ${deleteBaseRefs.rows.length}
    `);
    
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  
  pool.end();
})();
