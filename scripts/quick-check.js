const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'
});

async function test() {
  try {
    // Quick summary
    const summary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND udt_name = 'uuid') as uuid_cols,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' AND column_name LIKE '%_old') as legacy_cols,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND column_name IN ('tenant_id', 'user_id', 'creator_id') 
         AND udt_name NOT IN ('uuid')) as non_uuid_ids
    `);
    
    console.log('Summary:');
    console.log('  UUID columns:', summary.rows[0].uuid_cols);
    console.log('  Legacy *_old columns:', summary.rows[0].legacy_cols);
    console.log('  Non-UUID ID columns:', summary.rows[0].non_uuid_ids);
    
    // List non-UUID tenant_id columns
    const tenantIds = await pool.query(`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'tenant_id'
        AND udt_name != 'uuid'
        AND table_name NOT LIKE '_%'
      ORDER BY table_name
      LIMIT 20
    `);
    
    console.log('\nNon-UUID tenant_id columns:');
    tenantIds.rows.forEach(r => console.log('  ' + r.table_name + '.' + r.column_name + ' (' + r.udt_name + ')'));

    // List non-UUID user_id columns  
    const userIds = await pool.query(`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'user_id'
        AND udt_name != 'uuid'
        AND table_name NOT LIKE '_%'
      ORDER BY table_name
      LIMIT 20
    `);
    
    console.log('\nNon-UUID user_id columns:');
    userIds.rows.forEach(r => console.log('  ' + r.table_name + '.' + r.column_name + ' (' + r.udt_name + ')'));
    
  } catch(e) {
    console.error(e.message);
  }
  pool.end();
}
test();
