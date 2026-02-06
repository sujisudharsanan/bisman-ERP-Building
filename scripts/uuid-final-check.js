const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

(async () => {
  console.log('=== UUID MIGRATION FINAL STATUS ===\n');
  
  // Quick counts
  const r1 = await pool.query("SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id' AND data_type NOT IN ('uuid')");
  console.log('Non-UUID tenant_id:', r1.rows[0].cnt);

  const r2 = await pool.query("SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = 'public' AND column_name LIKE '%_old'");
  console.log('Legacy _old columns:', r2.rows[0].cnt);

  const r3 = await pool.query("SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'uuid'");
  console.log('Total UUID columns:', r3.rows[0].cnt);

  // Check critical tables
  const critical = ['users', 'tenants', 'tasks', 'chat_conversations', 'chat_messages', 'threads', 'thread_messages'];
  console.log('\nCritical table status:');
  for (const t of critical) {
    const c = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name IN ('id', 'tenant_id', 'user_id')", [t]);
    const status = c.rows.every(r => r.data_type === 'uuid') ? '✅' : '⚠️';
    console.log(status, t + ':', c.rows.map(r => r.column_name + ':' + r.data_type).join(', '));
  }

  // Show remaining non-UUID tenant_ids
  console.log('\nRemaining non-UUID tenant_id columns:');
  const remaining = await pool.query("SELECT table_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id' AND data_type NOT IN ('uuid') ORDER BY table_name");
  remaining.rows.forEach(r => console.log('  -', r.table_name, '(' + r.data_type + ')'));
  
  console.log('\n=== DONE ===');
  pool.end();
})();
