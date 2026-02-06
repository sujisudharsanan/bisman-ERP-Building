#!/usr/bin/env node
/**
 * RBAC UUID Migration
 * Migrates rbac_user_roles.user_id from TEXT (legacy integers) to UUID
 */

const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

const DRY_RUN = process.argv.includes('--dry-run');

async function log(type, msg) {
  const icons = { INFO: '📋', SUCCESS: '✅', ERROR: '❌', WARN: '⚠️' };
  console.log(`${icons[type] || '•'} [${type}] ${msg}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('RBAC UUID MIGRATION');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}`);
  console.log();

  try {
    // 1. Check current state
    const currentData = await pool.query('SELECT id, user_id, role_id FROM rbac_user_roles');
    log('INFO', `Found ${currentData.rows.length} rows in rbac_user_roles`);
    
    if (currentData.rows.length > 0) {
      console.log('Sample data:');
      console.table(currentData.rows.slice(0, 5));
    }

    // 2. Add UUID column if not exists
    if (!DRY_RUN) {
      await pool.query('ALTER TABLE rbac_user_roles ADD COLUMN IF NOT EXISTS user_id_uuid UUID');
      log('SUCCESS', 'Added user_id_uuid column');
    } else {
      log('INFO', 'Would add user_id_uuid column');
    }

    // 3. Migrate data - map legacy_id to UUID
    if (!DRY_RUN) {
      const migrated = await pool.query(`
        UPDATE rbac_user_roles r
        SET user_id_uuid = u.id
        FROM users u
        WHERE u.legacy_id = r.user_id
          AND r.user_id_uuid IS NULL
        RETURNING r.id
      `);
      log('SUCCESS', `Migrated ${migrated.rows.length} rows from legacy_id to UUID`);

      // Also try direct UUID match for any that are already UUIDs
      const uuidMatch = await pool.query(`
        UPDATE rbac_user_roles r
        SET user_id_uuid = u.id
        FROM users u
        WHERE u.id::text = r.user_id
          AND r.user_id_uuid IS NULL
        RETURNING r.id
      `);
      if (uuidMatch.rows.length > 0) {
        log('SUCCESS', `Matched ${uuidMatch.rows.length} additional rows by UUID`);
      }
    } else {
      log('INFO', 'Would migrate user_id to user_id_uuid using legacy_id mapping');
    }

    // 4. Verify
    const verification = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(user_id_uuid) as has_uuid,
        COUNT(*) - COUNT(user_id_uuid) as missing_uuid
      FROM rbac_user_roles
    `);
    console.log('\nVerification:');
    console.table(verification.rows);

    // 5. Show unmapped rows
    const unmapped = await pool.query(`
      SELECT r.id, r.user_id, r.role_id
      FROM rbac_user_roles r
      WHERE r.user_id_uuid IS NULL
    `);
    if (unmapped.rows.length > 0) {
      log('WARN', `${unmapped.rows.length} rows could not be mapped:`);
      console.table(unmapped.rows);
    }

    log('SUCCESS', 'RBAC UUID migration complete');
  } catch (err) {
    log('ERROR', err.message);
  } finally {
    await pool.end();
  }
}

main();
