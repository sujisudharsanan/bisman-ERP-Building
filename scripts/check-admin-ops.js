const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  try {
    // Check the logic used by the menu query for ADMIN_OPS
    const effectivePages = await pool.query(`
      SELECT DISTINCT pm.page_code, pm.route, pm.display_name
      FROM admin_page_assignments apa
      JOIN pages_master pm ON pm.id = apa.page_id
      WHERE apa.assignee_type = 'ADMIN_OPS'
        AND apa.assigner_type = 'ENTERPRISE_ADMIN'
        AND apa.is_active = true
        AND pm.is_active = true
    `);
    
    console.log('Effective pages for ADMIN_OPS (is_active=true only):');
    effectivePages.rows.forEach((r, i) => {
      console.log(`  ${i+1}. ${r.display_name} (${r.page_code})`);
    });
    
    // Check if ADMIN_DASHBOARD is in the list
    const hasAdminDash = effectivePages.rows.some(r => r.page_code === 'ADMIN_DASHBOARD');
    console.log('\nADMIN_DASHBOARD in effective pages?', hasAdminDash ? 'YES (BUG!)' : 'NO (correct)');
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  pool.end();
})();
