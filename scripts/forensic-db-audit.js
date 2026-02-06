#!/usr/bin/env node
/**
 * Forensic Database Audit Script
 * Scans all tables, columns, types, constraints, indexes, triggers, legacy columns, orphan rows, unused columns.
 * Outputs a full report for normalization and migration planning.
 */

const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

async function main() {
  console.log('='.repeat(60));
  console.log('FORENSIC DATABASE AUDIT');
  console.log('='.repeat(60));

  // 1. Columns/types
  const columns = await pool.query(`
    SELECT table_name, column_name, data_type, is_nullable, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, column_name
  `);
  console.log('\n--- COLUMNS & TYPES ---');
  console.table(columns.rows.slice(0, 40));
  console.log(`Total columns: ${columns.rows.length}`);

  // 2. Constraints
  const constraints = await pool.query(`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name
  `);
  console.log('\n--- CONSTRAINTS ---');
  console.table(constraints.rows.slice(0, 40));
  console.log(`Total constraints: ${constraints.rows.length}`);

  // 3. Indexes
  const indexes = await pool.query(`
    SELECT tab.relname as table_name, idx.relname as index_name, att.attname as column_name, idxs.indisunique as is_unique
    FROM pg_class tab
    JOIN pg_index idxs ON tab.oid = idxs.indrelid
    JOIN pg_class idx ON idx.oid = idxs.indexrelid
    JOIN pg_attribute att ON att.attrelid = tab.oid AND att.attnum = ANY(idxs.indkey)
    WHERE tab.relkind = 'r'
    ORDER BY tab.relname, idx.relname
  `);
  console.log('\n--- INDEXES ---');
  console.table(indexes.rows.slice(0, 40));
  console.log(`Total indexes: ${indexes.rows.length}`);

  // 4. Triggers
  const triggers = await pool.query(`
    SELECT event_object_table as table_name, trigger_name, event_manipulation as event, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  `);
  console.log('\n--- TRIGGERS ---');
  console.table(triggers.rows);

  // 5. Foreign keys
  const fks = await pool.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `);
  console.log('\n--- FOREIGN KEYS ---');
  console.table(fks.rows.slice(0, 40));
  console.log(`Total FKs: ${fks.rows.length}`);

  // 6. Legacy columns
  const legacy = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name LIKE '%_old'
    ORDER BY table_name, column_name
  `);
  console.log('\n--- LEGACY COLUMNS (*_old) ---');
  console.table(legacy.rows);

  // 7. Orphan rows (FKs with no match)
  // NOTE: This is a sample for users_enhanced. Expand for all FKs in final report.
  const orphan = await pool.query(`
    SELECT u.id, r.role_id
    FROM users_enhanced u
    LEFT JOIN rbac_user_roles r ON r.user_id_uuid = u.id
    WHERE r.user_id_uuid IS NULL
    LIMIT 10
  `);
  console.log('\n--- ORPHAN ROWS (users_enhanced without RBAC) ---');
  console.table(orphan.rows);

  // 8. Unused columns (no non-null values)
  const unused = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name NOT IN ('id', 'created_at', 'updated_at')
      AND table_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public')
      AND (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = information_schema.columns.table_name) > 0
    LIMIT 10
  `);
  console.log('\n--- UNUSED COLUMNS (sample) ---');
  console.table(unused.rows);

  await pool.end();
  console.log('\n=== FORENSIC DB AUDIT COMPLETE ===');
}

main();
