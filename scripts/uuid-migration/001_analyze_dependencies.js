/**
 * UUID Migration Phase 1: Analyze Dependencies
 * 
 * This script analyzes all INTEGER user_id columns and their dependencies
 * to create a safe migration order.
 */

const { Pool } = require('pg');

const CONNECTION_STRING = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function analyzeDependencies() {
  const pool = new Pool({ connectionString: CONNECTION_STRING });
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  UUID MIGRATION - PHASE 1: DEPENDENCY ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // 1. Get all tables with INTEGER user-related columns
    const userColumns = await pool.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND data_type = 'integer'
        AND (
          column_name = 'user_id' 
          OR column_name = 'legacy_id'
          OR column_name LIKE '%_by'
          OR column_name LIKE '%_by_id'
          OR column_name LIKE '%_user_id'
          OR column_name = 'actor_id'
          OR column_name = 'owner_id'
        )
      ORDER BY table_name, column_name
    `);

    console.log(`Found ${userColumns.rows.length} INTEGER user-related columns:\n`);

    // Group by table
    const byTable = {};
    for (const row of userColumns.rows) {
      if (!byTable[row.table_name]) {
        byTable[row.table_name] = [];
      }
      byTable[row.table_name].push(row);
    }

    // 2. Check foreign key constraints
    const fkConstraints = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (
          kcu.column_name LIKE '%user%' 
          OR kcu.column_name LIKE '%_by'
          OR kcu.column_name = 'legacy_id'
        )
      ORDER BY tc.table_name
    `);

    console.log('─────────────────────────────────────────────────────────────────');
    console.log('FOREIGN KEY CONSTRAINTS TO UPDATE:');
    console.log('─────────────────────────────────────────────────────────────────\n');

    for (const fk of fkConstraints.rows) {
      console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table}.${fk.foreign_column}`);
      console.log(`    Constraint: ${fk.constraint_name}\n`);
    }

    // 3. Check indexes on user_id columns
    const indexes = await pool.query(`
      SELECT 
        t.relname AS table_name,
        i.relname AS index_name,
        a.attname AS column_name
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND (
          a.attname LIKE '%user_id%' 
          OR a.attname LIKE '%_by'
          OR a.attname = 'legacy_id'
        )
      ORDER BY t.relname, i.relname
    `);

    console.log('─────────────────────────────────────────────────────────────────');
    console.log('INDEXES TO RECREATE:');
    console.log('─────────────────────────────────────────────────────────────────\n');

    for (const idx of indexes.rows) {
      console.log(`  ${idx.table_name}: ${idx.index_name} (${idx.column_name})`);
    }

    // 4. Check row counts for each table
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('TABLE ROW COUNTS (for migration planning):');
    console.log('─────────────────────────────────────────────────────────────────\n');

    const tables = Object.keys(byTable);
    for (const table of tables.slice(0, 30)) { // Limit to first 30
      try {
        const count = await pool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
        console.log(`  ${table}: ${count.rows[0].cnt} rows`);
      } catch (e) {
        console.log(`  ${table}: ERROR - ${e.message}`);
      }
    }

    // 5. Generate migration report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalColumns: userColumns.rows.length,
        totalTables: Object.keys(byTable).length,
        foreignKeys: fkConstraints.rows.length,
        indexes: indexes.rows.length
      },
      tables: byTable,
      foreignKeys: fkConstraints.rows,
      indexes: indexes.rows
    };

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Tables to migrate: ${report.summary.totalTables}`);
    console.log(`  Columns to convert: ${report.summary.totalColumns}`);
    console.log(`  Foreign keys to update: ${report.summary.foreignKeys}`);
    console.log(`  Indexes to recreate: ${report.summary.indexes}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return report;

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  analyzeDependencies()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { analyzeDependencies };
