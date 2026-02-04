/**
 * UUID Migration Phase 2: Database Schema Migration
 * 
 * Converts all INTEGER user_id, *_by, legacy_id columns to TEXT
 * to support UUID format.
 * 
 * IMPORTANT: Run in a maintenance window with backups!
 */

const { Pool } = require('pg');

const CONNECTION_STRING = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// Tables that should NOT be migrated (system tables, etc.)
const EXCLUDED_TABLES = [
  'knex_migrations',
  'knex_migrations_lock',
  '_prisma_migrations',
  '_schema_info',
  'migration_history'
];

// Tables with partitions - parent tables only
const PARTITIONED_TABLES = [
  'audit_logs_partitioned',
  'client_usage_events_partitioned'
];

async function migrateSchema(dryRun = true) {
  const pool = new Pool({ connectionString: CONNECTION_STRING });
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  UUID MIGRATION - PHASE 2: SCHEMA MIGRATION ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const errors = [];
  const successes = [];

  try {
    // Get all INTEGER user-related columns
    const columns = await pool.query(`
      SELECT DISTINCT
        c.table_name, 
        c.column_name, 
        c.data_type,
        c.is_nullable,
        CASE WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'YES' ELSE 'NO' END as has_fk,
        kcu.constraint_name as fk_constraint,
        ccu.table_name as fk_table,
        ccu.column_name as fk_column
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu 
        ON c.table_name = kcu.table_name 
        AND c.column_name = kcu.column_name
        AND c.table_schema = kcu.table_schema
      LEFT JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
        AND tc.constraint_type = 'FOREIGN KEY'
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE c.table_schema = 'public'
        AND c.data_type = 'integer'
        AND (
          c.column_name = 'user_id' 
          OR c.column_name = 'legacy_id'
          OR c.column_name LIKE '%_by'
          OR c.column_name LIKE '%_by_id'
          OR c.column_name LIKE '%_user_id'
          OR c.column_name = 'actor_id'
          OR c.column_name = 'owner_id'
        )
      ORDER BY c.table_name, c.column_name
    `);

    console.log(`Found ${columns.rows.length} columns to migrate\n`);

    // Group by table
    const byTable = {};
    for (const row of columns.rows) {
      if (EXCLUDED_TABLES.includes(row.table_name)) continue;
      if (row.table_name.includes('_p20')) continue; // Skip partition tables
      if (row.table_name.includes('_p_default')) continue;
      
      if (!byTable[row.table_name]) {
        byTable[row.table_name] = [];
      }
      // Deduplicate columns
      if (!byTable[row.table_name].find(c => c.column_name === row.column_name)) {
        byTable[row.table_name].push(row);
      }
    }

    // Step 1: Drop foreign key constraints
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('STEP 1: Dropping foreign key constraints...');
    console.log('─────────────────────────────────────────────────────────────────\n');

    const fksToDrop = columns.rows.filter(r => r.has_fk === 'YES' && r.fk_constraint);
    const droppedFks = new Set();

    for (const fk of fksToDrop) {
      if (droppedFks.has(fk.fk_constraint)) continue;
      droppedFks.add(fk.fk_constraint);

      const sql = `ALTER TABLE "${fk.table_name}" DROP CONSTRAINT IF EXISTS "${fk.fk_constraint}"`;
      console.log(`  ${sql}`);
      
      if (!dryRun) {
        try {
          await pool.query(sql);
          successes.push(`Dropped FK: ${fk.fk_constraint}`);
        } catch (e) {
          errors.push(`Failed to drop FK ${fk.fk_constraint}: ${e.message}`);
        }
      }
    }

    // Step 2: Convert columns to TEXT
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('STEP 2: Converting columns to TEXT...');
    console.log('─────────────────────────────────────────────────────────────────\n');

    for (const [tableName, cols] of Object.entries(byTable)) {
      console.log(`\n  Table: ${tableName}`);
      
      for (const col of cols) {
        const sql = `ALTER TABLE "${tableName}" ALTER COLUMN "${col.column_name}" TYPE TEXT`;
        console.log(`    ${sql}`);
        
        if (!dryRun) {
          try {
            await pool.query(sql);
            successes.push(`Converted: ${tableName}.${col.column_name}`);
          } catch (e) {
            errors.push(`Failed to convert ${tableName}.${col.column_name}: ${e.message}`);
          }
        }
      }
    }

    // Step 3: Handle partitioned tables
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('STEP 3: Converting partitioned tables...');
    console.log('─────────────────────────────────────────────────────────────────\n');

    for (const parentTable of PARTITIONED_TABLES) {
      // Get all partitions
      const partitions = await pool.query(`
        SELECT inhrelid::regclass::text as partition_name
        FROM pg_inherits
        WHERE inhparent = $1::regclass
      `, [parentTable]);

      console.log(`\n  Parent: ${parentTable} (${partitions.rows.length} partitions)`);

      // Get columns to convert for this table
      const parentCols = byTable[parentTable] || [];
      
      for (const col of parentCols) {
        // Convert parent first
        const parentSql = `ALTER TABLE "${parentTable}" ALTER COLUMN "${col.column_name}" TYPE TEXT`;
        console.log(`    ${parentSql}`);
        
        if (!dryRun) {
          try {
            await pool.query(parentSql);
            successes.push(`Converted: ${parentTable}.${col.column_name}`);
          } catch (e) {
            errors.push(`Failed: ${parentTable}.${col.column_name}: ${e.message}`);
          }
        }
      }
    }

    // Step 4: Remove legacy_id column from users_enhanced (optional - requires data migration)
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('STEP 4: Legacy ID Column Status');
    console.log('─────────────────────────────────────────────────────────────────\n');

    const legacyIdUsage = await pool.query(`
      SELECT COUNT(*) as cnt FROM users_enhanced WHERE legacy_id IS NOT NULL
    `);
    console.log(`  Users with legacy_id: ${legacyIdUsage.rows[0].cnt}`);
    console.log('  NOTE: legacy_id column kept for backward compatibility');
    console.log('  Run data migration to update all references before dropping.\n');

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'LIVE'}`);
    console.log(`  Tables processed: ${Object.keys(byTable).length}`);
    console.log(`  Columns to convert: ${columns.rows.length}`);
    console.log(`  Successes: ${successes.length}`);
    console.log(`  Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n  ERRORS:');
      for (const err of errors) {
        console.log(`    ❌ ${err}`);
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');

    return { successes, errors };

  } catch (error) {
    console.error('FATAL ERROR:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  const dryRun = !process.argv.includes('--execute');
  
  if (!dryRun) {
    console.log('\n⚠️  WARNING: Running in LIVE mode! Changes will be applied.\n');
    console.log('Press Ctrl+C within 5 seconds to abort...\n');
    setTimeout(() => {
      migrateSchema(false)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    }, 5000);
  } else {
    console.log('Running in DRY RUN mode. Use --execute to apply changes.\n');
    migrateSchema(true)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { migrateSchema };
