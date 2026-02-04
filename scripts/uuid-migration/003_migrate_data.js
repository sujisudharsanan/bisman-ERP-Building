/**
 * UUID Migration Phase 3: Data Migration
 * 
 * Migrates all legacy_id references to UUID references.
 * This updates all foreign key values from integer legacy_id to UUID id.
 */

const { Pool } = require('pg');

const CONNECTION_STRING = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function migrateData(dryRun = true) {
  const pool = new Pool({ connectionString: CONNECTION_STRING });
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  UUID MIGRATION - PHASE 3: DATA MIGRATION ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const stats = { updated: 0, skipped: 0, errors: 0 };

  try {
    // Build legacy_id to UUID mapping
    console.log('Building legacy_id -> UUID mapping...\n');
    
    const userMapping = await pool.query(`
      SELECT id, legacy_id 
      FROM users_enhanced 
      WHERE legacy_id IS NOT NULL
    `);

    const mapping = {};
    for (const user of userMapping.rows) {
      mapping[user.legacy_id] = user.id;
    }

    console.log(`  Found ${Object.keys(mapping).length} users with legacy_id mappings\n`);

    // Get all tables with user_id (TEXT now) columns that might have integer values
    const tablesToMigrate = await pool.query(`
      SELECT DISTINCT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type = 'text'
        AND (
          column_name = 'user_id'
          OR column_name LIKE '%_by'
          OR column_name LIKE '%_by_id'
          OR column_name LIKE '%_user_id'
        )
      ORDER BY table_name
    `);

    console.log('─────────────────────────────────────────────────────────────────');
    console.log('MIGRATING DATA: Converting integer references to UUIDs');
    console.log('─────────────────────────────────────────────────────────────────\n');

    for (const { table_name, column_name } of tablesToMigrate.rows) {
      // Skip partition tables
      if (table_name.includes('_p20') || table_name.includes('_p_default')) {
        continue;
      }

      try {
        // Check if there are integer-like values to migrate
        const intValues = await pool.query(`
          SELECT DISTINCT "${column_name}" as val
          FROM "${table_name}"
          WHERE "${column_name}" IS NOT NULL
            AND "${column_name}" ~ '^[0-9]+$'
          LIMIT 100
        `);

        if (intValues.rows.length === 0) {
          console.log(`  ✓ ${table_name}.${column_name} - No integer values to migrate`);
          stats.skipped++;
          continue;
        }

        console.log(`  → ${table_name}.${column_name} - Found ${intValues.rows.length} integer values`);

        // Update each integer value to its UUID equivalent
        const updateSql = `
          UPDATE "${table_name}" t
          SET "${column_name}" = u.id
          FROM users_enhanced u
          WHERE t."${column_name}"::integer = u.legacy_id
            AND t."${column_name}" ~ '^[0-9]+$'
        `;

        if (dryRun) {
          // Count how many would be updated
          const countSql = `
            SELECT COUNT(*) as cnt
            FROM "${table_name}" t
            JOIN users_enhanced u ON t."${column_name}"::integer = u.legacy_id
            WHERE t."${column_name}" ~ '^[0-9]+$'
          `;
          const countResult = await pool.query(countSql);
          console.log(`    Would update ${countResult.rows[0].cnt} rows`);
        } else {
          const result = await pool.query(updateSql);
          console.log(`    Updated ${result.rowCount} rows`);
          stats.updated += result.rowCount;
        }

      } catch (e) {
        console.log(`  ✗ ${table_name}.${column_name} - ERROR: ${e.message}`);
        stats.errors++;
      }
    }

    // Handle special cases
    console.log('\n─────────────────────────────────────────────────────────────────');
    console.log('SPECIAL CASES: Tables with specific user references');
    console.log('─────────────────────────────────────────────────────────────────\n');

    // Update clients.super_admin_id if it references legacy_id
    try {
      const superAdminCheck = await pool.query(`
        SELECT COUNT(*) as cnt FROM clients 
        WHERE super_admin_id IS NOT NULL 
          AND super_admin_id ~ '^[0-9]+$'
      `);
      
      if (superAdminCheck.rows[0].cnt > 0) {
        console.log(`  clients.super_admin_id - ${superAdminCheck.rows[0].cnt} integer values`);
        
        if (!dryRun) {
          await pool.query(`
            UPDATE clients c
            SET super_admin_id = u.id::integer
            FROM users_enhanced u
            WHERE c.super_admin_id = u.legacy_id
          `);
        }
      } else {
        console.log('  clients.super_admin_id - No migration needed');
      }
    } catch (e) {
      console.log(`  clients.super_admin_id - ERROR: ${e.message}`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  DATA MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`  Rows updated: ${stats.updated}`);
    console.log(`  Tables skipped (no int values): ${stats.skipped}`);
    console.log(`  Errors: ${stats.errors}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return stats;

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
  migrateData(dryRun)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateData };
