const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  console.log('=== Checking rbac_roles ===');
  
  // Test the exact query the backend uses
  const result = await pool.query(`
    SELECT id, name, display_name, description, level, status
    FROM rbac_roles 
    WHERE status = 'active'
    ORDER BY level, name
  `);
  
  console.log('Active roles found:', result.rows.length);
  
  // Filter like the backend does
  const filtered = result.rows.filter(role => {
    const roleName = (role.name || '').toLowerCase();
    return !roleName.includes('super') && 
           !roleName.includes('enterprise') &&
           roleName !== 'admin' &&
           !roleName.includes('platform');
  });
  
  console.log('\nFiltered roles (excluding super/enterprise/admin/platform):', filtered.length);
  console.table(filtered.map(r => ({ id: r.id, name: r.name, display_name: r.display_name, level: r.level })));
  
  pool.end();
})();
