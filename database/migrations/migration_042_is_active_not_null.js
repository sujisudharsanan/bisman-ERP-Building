/**
 * ============================================================================
 * PHASE 4: SCHEMA HARDENING - is_active NOT NULL
 * ============================================================================
 * 
 * Makes admin_page_assignments.is_active NOT NULL with default true.
 * This prevents any ambiguity where NULL could be interpreted as active.
 * 
 * RUN: node database/migrations/migration_042_is_active_not_null.js
 */

const { Pool } = require('pg');

const MIGRATION_VERSION = '042';
const MIGRATION_NAME = 'is_active_not_null';

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// ============================================================================
// MIGRATION SQL
// ============================================================================

const MIGRATION_SQL = `
-- Step 1: Set any NULL is_active values to false (conservative - deny by default)
UPDATE admin_page_assignments 
SET is_active = false 
WHERE is_active IS NULL;

-- Step 2: Add NOT NULL constraint with DEFAULT true
ALTER TABLE admin_page_assignments 
ALTER COLUMN is_active SET NOT NULL,
ALTER COLUMN is_active SET DEFAULT true;

-- Step 3: Add check constraint to ensure is_active is always boolean
ALTER TABLE admin_page_assignments
ADD CONSTRAINT chk_is_active_boolean CHECK (is_active IN (true, false));

-- Log the migration
INSERT INTO audit_logs (user_id, action, table_name, new_values)
VALUES (
  NULL,
  'MIGRATION_RUN',
  'admin_page_assignments',
  '{"migration": "${MIGRATION_VERSION}_${MIGRATION_NAME}", "change": "is_active NOT NULL DEFAULT true"}'::jsonb
);
`;

// ============================================================================
// ROLLBACK SQL
// ============================================================================

const ROLLBACK_SQL = `
-- Remove check constraint
ALTER TABLE admin_page_assignments
DROP CONSTRAINT IF EXISTS chk_is_active_boolean;

-- Remove NOT NULL and DEFAULT
ALTER TABLE admin_page_assignments 
ALTER COLUMN is_active DROP NOT NULL,
ALTER COLUMN is_active DROP DEFAULT;

-- Log rollback
INSERT INTO audit_logs (user_id, action, table_name, new_values)
VALUES (
  NULL,
  'MIGRATION_ROLLBACK',
  'admin_page_assignments',
  '{"migration": "${MIGRATION_VERSION}_${MIGRATION_NAME}"}'::jsonb
);
`;

// ============================================================================
// EXECUTION
// ============================================================================

async function runMigration() {
  const pool = new Pool({ connectionString });
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     MIGRATION ' + MIGRATION_VERSION + ': SCHEMA HARDENING - is_active NOT NULL ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Check current state
    const nullCount = await pool.query(`
      SELECT COUNT(*) FROM admin_page_assignments WHERE is_active IS NULL
    `);
    console.log(`Current NULL is_active count: ${nullCount.rows[0].count}`);
    
    // Check if already NOT NULL
    const colInfo = await pool.query(`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_name = 'admin_page_assignments' AND column_name = 'is_active'
    `);
    
    if (colInfo.rows[0]?.is_nullable === 'NO') {
      console.log('✅ is_active is already NOT NULL - skipping');
      pool.end();
      return;
    }
    
    console.log('Applying migration...');
    await pool.query(MIGRATION_SQL);
    
    // Verify
    const afterCol = await pool.query(`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_name = 'admin_page_assignments' AND column_name = 'is_active'
    `);
    
    if (afterCol.rows[0]?.is_nullable === 'NO') {
      console.log('✅ is_active is now NOT NULL');
    } else {
      console.log('❌ Migration may have failed - please verify manually');
    }
    
    console.log('\n✅ MIGRATION COMPLETE');
    pool.end();
    
  } catch (error) {
    console.error('❌ MIGRATION FAILED:', error.message);
    pool.end();
    process.exit(1);
  }
}

async function rollbackMigration() {
  const pool = new Pool({ connectionString });
  
  console.log('Rolling back migration ' + MIGRATION_VERSION + '...');
  
  try {
    await pool.query(ROLLBACK_SQL);
    console.log('✅ ROLLBACK COMPLETE');
    pool.end();
  } catch (error) {
    console.error('❌ ROLLBACK FAILED:', error.message);
    pool.end();
    process.exit(1);
  }
}

// Main
if (process.argv.includes('--rollback')) {
  rollbackMigration();
} else {
  runMigration();
}

module.exports = { MIGRATION_SQL, ROLLBACK_SQL, runMigration, rollbackMigration };
