const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });
pool.query('SELECT id, name, price, billing_cycle, is_active FROM subscription_plans ORDER BY id').then(r => {
  console.log('Railway subscription_plans:', r.rows.length, 'rows');
  console.table(r.rows);
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
