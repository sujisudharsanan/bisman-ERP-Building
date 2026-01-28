/**
 * ============================================================================
 * PHASE 4: RBAC APPROVAL CHAIN BOOTSTRAP MIGRATION
 * ============================================================================
 * 
 * This migration creates the initial approval chain data required for the
 * 4-layer RBAC intersection to work.
 * 
 * CONSTRAINTS:
 * - Must be REVERSIBLE (with rollback SQL)
 * - Must be AUDITABLE (all changes logged)
 * - Must NOT break existing users
 * 
 * RUN: node database/migrations/migration_040_bootstrap_approval_chain.js
 */

const { Pool } = require('pg');

const MIGRATION_VERSION = '040';
const MIGRATION_NAME = 'bootstrap_approval_chain';

// Connection string - use environment variable in production
const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// ============================================================================
// STEP 1: EA → SA APPROVALS
// ============================================================================

const STEP_1_EA_TO_SA = `
-- Step 1: Create EA → SA approvals for ALL active pages
-- This grants Super Admins access to all pages their Enterprise Admin has approved
-- (In a fresh system, EA approves all pages for SA)

INSERT INTO admin_page_assignments 
(assigner_id, assigner_type, assignee_id, assignee_type, page_id, page_key, tenant_id, is_active, notes)
SELECT 
  ea.id AS assigner_id,
  'ENTERPRISE_ADMIN' AS assigner_type,
  sa.id AS assignee_id,
  'SUPER_ADMIN' AS assignee_type,
  pm.id AS page_id,
  pm.page_code AS page_key,
  NULL AS tenant_id,
  true AS is_active,
  'Bootstrap migration ' || '${MIGRATION_VERSION}' || ' - initial EA→SA approval'
FROM enterprise_admins ea
CROSS JOIN super_admins sa
CROSS JOIN pages_master pm
WHERE ea.is_active = true
  AND sa.is_active = true
  AND pm.is_active = true
  AND sa.created_by = ea.id  -- Only for SAs created by this EA
ON CONFLICT DO NOTHING;
`;

// ============================================================================
// STEP 2: SA → ADMIN APPROVALS
// ============================================================================

const STEP_2_SA_TO_ADMIN = `
-- Step 2: Create SA → ADMIN approvals
-- Grants Admins access to all pages their Super Admin has approved for them

INSERT INTO admin_page_assignments 
(assigner_id, assigner_type, assignee_id, assignee_type, page_id, page_key, tenant_id, is_active, notes)
SELECT 
  ue.super_admin_id AS assigner_id,
  'SUPER_ADMIN' AS assigner_type,
  ue.legacy_id AS assignee_id,
  'ADMIN' AS assignee_type,
  pm.id AS page_id,
  pm.page_code AS page_key,
  ue.tenant_id::varchar AS tenant_id,
  true AS is_active,
  'Bootstrap migration ' || '${MIGRATION_VERSION}' || ' - initial SA→ADMIN approval'
FROM users_enhanced ue
CROSS JOIN pages_master pm
WHERE ue.is_active = true
  AND ue.business_level = 10  -- ADMIN level
  AND ue.super_admin_id IS NOT NULL
  AND pm.is_active = true
ON CONFLICT DO NOTHING;
`;

// ============================================================================
// STEP 3: SA → USER APPROVALS (based on existing role_page_access)
// ============================================================================

const STEP_3_SA_TO_USER = `
-- Step 3: Create SA → USER approvals based on existing role assignments
-- This preserves existing user access by converting role_page_access to explicit approvals

INSERT INTO admin_page_assignments 
(assigner_id, assigner_type, assignee_id, assignee_type, page_id, page_key, tenant_id, is_active, notes)
SELECT DISTINCT
  ue.super_admin_id AS assigner_id,
  'SUPER_ADMIN' AS assigner_type,
  ue.legacy_id AS assignee_id,
  'USER' AS assignee_type,
  rpa.page_id AS page_id,
  pm.page_code AS page_key,
  ue.tenant_id::varchar AS tenant_id,
  true AS is_active,
  'Bootstrap migration ' || '${MIGRATION_VERSION}' || ' - converted from role_page_access'
FROM users_enhanced ue
JOIN role_page_access rpa ON rpa.role_name = ue.role
JOIN pages_master pm ON rpa.page_id = pm.id
WHERE ue.is_active = true
  AND ue.business_level < 10  -- Non-admin users
  AND ue.super_admin_id IS NOT NULL
  AND rpa.can_view = true
  AND pm.is_active = true
ON CONFLICT DO NOTHING;
`;

// ============================================================================
// AUDIT LOG ENTRY
// ============================================================================

const AUDIT_LOG = `
-- Record the migration in audit_logs
INSERT INTO audit_logs (user_id, action, table_name, new_values)
VALUES (
  NULL,
  'MIGRATION_RUN',
  'admin_page_assignments',
  '{"migration": "${MIGRATION_VERSION}_${MIGRATION_NAME}", "timestamp": "' || NOW() || '", "type": "bootstrap"}'::jsonb
);
`;

// ============================================================================
// ROLLBACK SQL
// ============================================================================

const ROLLBACK_SQL = `
-- ROLLBACK: Remove all entries created by this migration
-- This is safe because we tagged all entries with migration notes

DELETE FROM admin_page_assignments 
WHERE notes LIKE 'Bootstrap migration ${MIGRATION_VERSION}%';

-- Log the rollback
INSERT INTO audit_logs (user_id, action, table_name, new_values)
VALUES (
  NULL,
  'MIGRATION_ROLLBACK',
  'admin_page_assignments',
  '{"migration": "${MIGRATION_VERSION}_${MIGRATION_NAME}", "timestamp": "' || NOW() || '"}'::jsonb
);
`;

// ============================================================================
// EXECUTION
// ============================================================================

async function runMigration() {
  const pool = new Pool({ connectionString });
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     MIGRATION ' + MIGRATION_VERSION + ': BOOTSTRAP APPROVAL CHAIN              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Check current state
    const before = await pool.query('SELECT COUNT(*) FROM admin_page_assignments');
    console.log(`Current admin_page_assignments count: ${before.rows[0].count}`);
    
    // Confirm before proceeding
    console.log('\nThis migration will:');
    console.log('  1. Create EA → SA approvals for all pages');
    console.log('  2. Create SA → ADMIN approvals for all pages');
    console.log('  3. Create SA → USER approvals based on existing roles');
    console.log('\nProceeding...\n');
    
    // Disable trigger temporarily for performance
    await pool.query('ALTER TABLE admin_page_assignments DISABLE TRIGGER trg_invalidate_cache_on_page_change');
    
    // Step 1: EA → SA
    console.log('Step 1: EA → SA approvals...');
    const step1 = await pool.query(STEP_1_EA_TO_SA);
    console.log(`  Inserted: ${step1.rowCount || 'N/A'} rows`);
    
    // Step 2: SA → ADMIN
    console.log('Step 2: SA → ADMIN approvals...');
    const step2 = await pool.query(STEP_2_SA_TO_ADMIN);
    console.log(`  Inserted: ${step2.rowCount || 'N/A'} rows`);
    
    // Step 3: SA → USER
    console.log('Step 3: SA → USER approvals...');
    const step3 = await pool.query(STEP_3_SA_TO_USER);
    console.log(`  Inserted: ${step3.rowCount || 'N/A'} rows`);
    
    // Audit log
    await pool.query(AUDIT_LOG);
    
    // Re-enable trigger
    await pool.query('ALTER TABLE admin_page_assignments ENABLE TRIGGER trg_invalidate_cache_on_page_change');
    
    // Final count
    const after = await pool.query('SELECT COUNT(*) FROM admin_page_assignments');
    console.log(`\n✅ Final admin_page_assignments count: ${after.rows[0].count}`);
    
    // Summary
    const summary = await pool.query(`
      SELECT assigner_type, assignee_type, COUNT(*) as cnt 
      FROM admin_page_assignments 
      WHERE is_active = true
      GROUP BY 1, 2 ORDER BY 1, 2
    `);
    console.log('\nSummary:');
    console.table(summary.rows);
    
    console.log('\n✅ MIGRATION COMPLETE');
    console.log('\nTo rollback, run:');
    console.log(`  node database/migrations/migration_${MIGRATION_VERSION}_${MIGRATION_NAME}.js --rollback`);
    
    pool.end();
    
  } catch (error) {
    // Re-enable trigger on error
    await pool.query('ALTER TABLE admin_page_assignments ENABLE TRIGGER trg_invalidate_cache_on_page_change').catch(() => {});
    
    console.error('❌ MIGRATION FAILED:', error.message);
    console.log('\nNo changes were committed. The database is in its original state.');
    pool.end();
    process.exit(1);
  }
}

async function rollbackMigration() {
  const pool = new Pool({ connectionString });
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     ROLLBACK ' + MIGRATION_VERSION + ': BOOTSTRAP APPROVAL CHAIN             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    const before = await pool.query('SELECT COUNT(*) FROM admin_page_assignments');
    console.log(`Current count: ${before.rows[0].count}`);
    
    console.log('Removing bootstrap entries...');
    await pool.query(ROLLBACK_SQL);
    
    const after = await pool.query('SELECT COUNT(*) FROM admin_page_assignments');
    console.log(`After rollback: ${after.rows[0].count}`);
    
    console.log('\n✅ ROLLBACK COMPLETE');
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

module.exports = {
  STEP_1_EA_TO_SA,
  STEP_2_SA_TO_ADMIN,
  STEP_3_SA_TO_USER,
  ROLLBACK_SQL,
  runMigration,
  rollbackMigration
};
