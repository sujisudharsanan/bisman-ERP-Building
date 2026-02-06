const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });
(async () => {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name = 'id' OR column_name LIKE '%_id')
      AND data_type NOT IN ('uuid')
      AND table_name NOT LIKE '_backup%'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE '_prisma%'
      AND table_name NOT LIKE '_schema%'
      AND table_name NOT LIKE 'knex_%'
    ORDER BY table_name, column_name
  `);
  console.table(res.rows);
  pool.end();
})();
