const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  console.log('=== FIXING PUMP MANAGEMENT MODULE ===\n');
  
  // Option 1: Deactivate the module (safer - keeps data, just hides from UI)
  console.log('Deactivating pump-management module (id=31)...');
  
  const result = await pool.query(`
    UPDATE modules 
    SET is_active = false 
    WHERE id = 31 AND module_name = 'pump-management'
    RETURNING id, module_name, is_active
  `);
  
  if (result.rows.length > 0) {
    console.log('✅ DONE:', result.rows[0]);
  } else {
    console.log('❌ No rows updated (module may not exist or already inactive)');
  }
  
  // Also deactivate operations and task-management with PUMP_MANAGEMENT productType
  console.log('\nDeactivating other PUMP_MANAGEMENT modules...');
  const result2 = await pool.query(`
    UPDATE modules 
    SET is_active = false 
    WHERE "productType" ILIKE '%pump%' AND is_active = true
    RETURNING id, module_name, display_name, is_active
  `);
  
  if (result2.rows.length > 0) {
    console.log('✅ Deactivated modules:');
    console.table(result2.rows);
  } else {
    console.log('ℹ️  No active pump modules to deactivate');
  }
  
  // Verify
  console.log('\n=== VERIFICATION ===');
  const active = await pool.query(`
    SELECT id, module_name, display_name, is_active, "productType"
    FROM modules 
    WHERE "productType" ILIKE '%pump%' OR module_name ILIKE '%pump%'
    ORDER BY id
  `);
  console.table(active.rows);
  
  pool.end();
})();
