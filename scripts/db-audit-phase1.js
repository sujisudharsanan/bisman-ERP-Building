/**
 * Database Audit - Phase 1: Schema Structural Audit
 */
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function runAudit() {
  console.log('='.repeat(80));
  console.log('PHASE 1: SCHEMA STRUCTURAL AUDIT');
  console.log('='.repeat(80));
  
  // Get all tables with their primary keys, timestamps, and column counts
  const tables = await pool.query(`
    SELECT 
      t.tablename,
      (SELECT COUNT(*) FROM information_schema.columns c 
       WHERE c.table_name = t.tablename AND c.table_schema = 'public') as col_count,
      (SELECT EXISTS(
        SELECT 1 FROM information_schema.table_constraints tc 
        WHERE tc.table_name = t.tablename AND tc.constraint_type = 'PRIMARY KEY'
      )) as has_pk,
      (SELECT EXISTS(
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_name = t.tablename AND c.column_name IN ('created_at', 'createdat')
      )) as has_created_at,
      (SELECT EXISTS(
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_name = t.tablename AND c.column_name IN ('updated_at', 'updatedat')
      )) as has_updated_at,
      (SELECT EXISTS(
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_name = t.tablename AND c.column_name IN ('deleted_at', 'deletedat', 'is_deleted')
      )) as has_soft_delete,
      (SELECT COUNT(*) FROM information_schema.columns c 
       WHERE c.table_name = t.tablename AND c.data_type IN ('json', 'jsonb')) as json_col_count
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE '_prisma%'
    AND t.tablename NOT LIKE 'knex%'
    AND t.tablename NOT LIKE '%_p2025%'
    AND t.tablename NOT LIKE '%_p2026%'
    AND t.tablename NOT LIKE '%_p_default'
    AND t.tablename NOT LIKE '_legacy%'
    AND t.tablename NOT LIKE '_schema%'
    AND t.tablename NOT LIKE '%_partitioned'
    ORDER BY t.tablename
  `);
  
  const noPK = [], noCreatedAt = [], noUpdatedAt = [], heavyJson = [];
  
  tables.rows.forEach(t => {
    if (t.has_pk === false) noPK.push(t.tablename);
    if (t.has_created_at === false) noCreatedAt.push(t.tablename);
    if (t.has_updated_at === false) noUpdatedAt.push(t.tablename);
    if (parseInt(t.json_col_count) >= 3) heavyJson.push({ table: t.tablename, count: t.json_col_count });
  });
  
  console.log('\n📋 TABLES WITHOUT PRIMARY KEY:');
  if (noPK.length === 0) console.log('  ✅ All tables have primary keys');
  else noPK.forEach(t => console.log('  ❌', t));
  
  console.log('\n📋 TABLES WITHOUT created_at (' + noCreatedAt.length + '):');
  noCreatedAt.slice(0, 30).forEach(t => console.log('  ⚠️', t));
  if (noCreatedAt.length > 30) console.log('  ... and', noCreatedAt.length - 30, 'more');
  
  console.log('\n📋 TABLES WITHOUT updated_at (' + noUpdatedAt.length + '):');
  noUpdatedAt.slice(0, 30).forEach(t => console.log('  ⚠️', t));
  if (noUpdatedAt.length > 30) console.log('  ... and', noUpdatedAt.length - 30, 'more');
  
  console.log('\n📋 HEAVY JSON USAGE (3+ JSON columns):');
  if (heavyJson.length === 0) console.log('  ✅ No excessive JSON usage');
  else heavyJson.forEach(t => console.log('  ⚠️', t.table, ':', t.count, 'JSON columns'));
  
  // Check for naming consistency - camelCase columns
  console.log('\n📋 NAMING CONSISTENCY CHECK (camelCase columns):');
  const namingIssues = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name ~ '[A-Z]'
    AND table_name NOT LIKE '_prisma%'
    AND table_name NOT LIKE '_legacy%'
    ORDER BY table_name, column_name
    LIMIT 30
  `);
  if (namingIssues.rows.length === 0) {
    console.log('  ✅ All columns use snake_case');
  } else {
    console.log('  ⚠️ Mixed naming conventions found (' + namingIssues.rows.length + ' samples):');
    namingIssues.rows.forEach(r => console.log('    ', r.table_name + '.' + r.column_name));
  }
  
  // Summary stats
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1 SUMMARY');
  console.log('='.repeat(80));
  console.log('Total tables audited:', tables.rows.length);
  console.log('Tables without PK:', noPK.length, noPK.length === 0 ? '✅' : '❌');
  console.log('Tables without created_at:', noCreatedAt.length);
  console.log('Tables without updated_at:', noUpdatedAt.length);
  console.log('Tables with heavy JSON (3+):', heavyJson.length);
  
  await pool.end();
}

runAudit().catch(console.error);
