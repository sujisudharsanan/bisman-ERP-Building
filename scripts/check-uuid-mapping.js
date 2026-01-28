/* eslint-env node */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  try {
    console.log('=== UUID Mapping for Chat User IDs ===');
    const users = await pool.query(`
      SELECT id as uuid, legacy_id, email 
      FROM users_enhanced 
      WHERE legacy_id IN (3, 5, 6, 9, 11)
      ORDER BY legacy_id
    `);
    console.table(users.rows);
    
    const legacyIds = [3, 5, 6, 9, 11];
    const missing = legacyIds.filter(id => !users.rows.find(r => r.legacy_id === id));
    if (missing.length > 0) {
      console.log('\nMissing legacy_ids:', missing.join(', '));
    } else {
      console.log('\nAll legacy IDs have UUID mappings!');
    }
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  pool.end();
})();
