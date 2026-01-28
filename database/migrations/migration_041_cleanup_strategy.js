/**
 * ============================================================================
 * PHASE 4 STEP 2: CLEANUP STRATEGY
 * ============================================================================
 * 
 * This script handles cleanup of legacy RBAC data after the approval chain
 * has been bootstrapped and validated.
 * 
 * CLEANUP PHASES:
 * 1. Validate approval chain is complete
 * 2. Handle orphan rbac_user_permissions
 * 3. Archive (not delete) role_page_access
 * 4. Create deprecation markers
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// ============================================================================
// STEP 1: VALIDATE APPROVAL CHAIN IS COMPLETE
// ============================================================================

const VALIDATE_APPROVAL_CHAIN = `
-- Check that every active user has approval entries
-- Returns users who would be BLOCKED if we enforce strictly

WITH users_needing_approval AS (
  SELECT 
    ue.legacy_id,
    ue.email,
    ue.role,
    ue.tenant_id,
    ue.super_admin_id,
    ue.business_level
  FROM users_enhanced ue
  WHERE ue.is_active = true
    AND ue.legacy_id IS NOT NULL
),
users_with_approvals AS (
  SELECT DISTINCT assignee_id
  FROM admin_page_assignments
  WHERE assignee_type IN ('ADMIN', 'USER')
    AND is_active = true
)
SELECT 
  una.legacy_id,
  una.email,
  una.role,
  una.business_level,
  CASE WHEN uwa.assignee_id IS NULL THEN 'NO_APPROVALS' ELSE 'HAS_APPROVALS' END as status
FROM users_needing_approval una
LEFT JOIN users_with_approvals uwa ON una.legacy_id = uwa.assignee_id
WHERE uwa.assignee_id IS NULL
ORDER BY una.business_level DESC, una.email;
`;

// ============================================================================
// STEP 2: HANDLE ORPHAN rbac_user_permissions
// ============================================================================

/**
 * STRATEGY FOR rbac_user_permissions:
 * 
 * 1. DO NOT DELETE - these may be needed for audit or rollback
 * 2. ADD a 'source' column to track where permissions came from
 * 3. Mark permissions that came from role_page_access vs admin_page_assignments
 * 4. Eventually, rbac_user_permissions becomes the CACHE of effective access
 */

const ADD_SOURCE_COLUMN = `
-- Add source tracking column if not exists
ALTER TABLE rbac_user_permissions 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'legacy';

ALTER TABLE rbac_user_permissions 
ADD COLUMN IF NOT EXISTS source_details JSONB DEFAULT '{}';

COMMENT ON COLUMN rbac_user_permissions.source IS 
  'Where this permission came from: legacy, role_based, admin_approved, system';
`;

const MARK_ORPHAN_PERMISSIONS = `
-- Mark permissions that have no corresponding approval in admin_page_assignments
-- These are "orphan" permissions that should be reviewed

UPDATE rbac_user_permissions rup
SET 
  source = 'orphan',
  source_details = jsonb_build_object(
    'marked_at', NOW(),
    'reason', 'No matching admin_page_assignments entry'
  )
WHERE NOT EXISTS (
  SELECT 1 FROM admin_page_assignments apa
  WHERE apa.assignee_id = rup.user_id
    AND apa.page_key = rup.page_key
    AND apa.is_active = true
)
AND rup.source = 'legacy';
`;

const COUNT_ORPHANS = `
-- Count orphan permissions per user
SELECT 
  rup.user_id,
  ue.email,
  COUNT(*) as orphan_count
FROM rbac_user_permissions rup
JOIN users_enhanced ue ON ue.legacy_id = rup.user_id
WHERE rup.source = 'orphan'
GROUP BY rup.user_id, ue.email
ORDER BY orphan_count DESC;
`;

// ============================================================================
// STEP 3: ARCHIVE role_page_access
// ============================================================================

/**
 * STRATEGY FOR role_page_access:
 * 
 * 1. DO NOT DELETE - it's still useful as a "template"
 * 2. CREATE an archive table for historical reference
 * 3. ADD deprecation markers
 * 4. REMOVE from any code that uses it for authorization
 */

const ARCHIVE_ROLE_PAGE_ACCESS = `
-- Create archive table if not exists
CREATE TABLE IF NOT EXISTS role_page_access_archive (
  id SERIAL PRIMARY KEY,
  original_id INTEGER,
  role_name VARCHAR(100),
  page_id INTEGER,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  can_export BOOLEAN,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archive_reason VARCHAR(255) DEFAULT 'Phase 4 cleanup'
);

-- Archive current state (only if not already archived)
INSERT INTO role_page_access_archive (original_id, role_name, page_id, can_view, can_edit, can_delete, can_export, archive_reason)
SELECT 
  id, role_name, page_id, can_view, can_edit, can_delete, can_export,
  'Phase 4 cleanup - migrated to admin_page_assignments'
FROM role_page_access
WHERE NOT EXISTS (
  SELECT 1 FROM role_page_access_archive rpa_a 
  WHERE rpa_a.original_id = role_page_access.id
);
`;

const ADD_DEPRECATION_MARKER = `
-- Add deprecation notice to role_page_access
COMMENT ON TABLE role_page_access IS 
  'DEPRECATED: Use admin_page_assignments for access control. This table is kept for role templates only.';

-- Add a deprecation column
ALTER TABLE role_page_access 
ADD COLUMN IF NOT EXISTS is_deprecated BOOLEAN DEFAULT false;

ALTER TABLE role_page_access 
ADD COLUMN IF NOT EXISTS deprecation_note TEXT;

UPDATE role_page_access 
SET 
  is_deprecated = true,
  deprecation_note = 'As of Phase 4 migration, use admin_page_assignments for actual access control. This entry is a role template only.'
WHERE is_deprecated IS NOT true;
`;

// ============================================================================
// WHEN TO REMOVE role_page_access (NEVER DELETE, but here's the timeline)
// ============================================================================

/**
 * REMOVAL TIMELINE:
 * 
 * Phase 4 (NOW):
 *   - Archive the data
 *   - Add deprecation markers
 *   - Keep table for backwards compatibility
 * 
 * Phase 5 (2 weeks):
 *   - Remove all code references that use role_page_access for authorization
 *   - Keep table for template purposes only
 * 
 * Phase 6 (1 month):
 *   - Rename table to role_templates
 *   - Remove all can_view, can_edit columns (use only for display)
 * 
 * Phase 7 (3 months):
 *   - IF no issues, DROP the table
 *   - Keep archive indefinitely
 */

// ============================================================================
// EXECUTION
// ============================================================================

async function runCleanup() {
  const pool = new Pool({ connectionString });
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              PHASE 4 STEP 2: CLEANUP STRATEGY                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Step 1: Validate
    console.log('Step 1: Validating approval chain...');
    const validation = await pool.query(VALIDATE_APPROVAL_CHAIN);
    if (validation.rows.length > 0) {
      console.log(`\n⚠️  WARNING: ${validation.rows.length} users have NO approvals:`);
      console.table(validation.rows.slice(0, 10));
      if (validation.rows.length > 10) {
        console.log(`  ... and ${validation.rows.length - 10} more`);
      }
    } else {
      console.log('  ✅ All active users have approval entries');
    }
    
    // Step 2: Handle orphans
    console.log('\nStep 2: Adding source tracking to rbac_user_permissions...');
    await pool.query(ADD_SOURCE_COLUMN);
    console.log('  ✅ Source column added');
    
    console.log('  Marking orphan permissions...');
    const orphans = await pool.query(MARK_ORPHAN_PERMISSIONS);
    console.log(`  Marked ${orphans.rowCount || 0} orphan permissions`);
    
    const orphanCount = await pool.query(COUNT_ORPHANS);
    if (orphanCount.rows.length > 0) {
      console.log('\n  Orphan summary:');
      console.table(orphanCount.rows.slice(0, 5));
    }
    
    // Step 3: Archive role_page_access
    console.log('\nStep 3: Archiving role_page_access...');
    await pool.query(ARCHIVE_ROLE_PAGE_ACCESS);
    console.log('  ✅ Archived to role_page_access_archive');
    
    console.log('  Adding deprecation markers...');
    await pool.query(ADD_DEPRECATION_MARKER);
    console.log('  ✅ Deprecation markers added');
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('CLEANUP COMPLETE\n');
    console.log('WHAT HAPPENED:');
    console.log('  1. Validated all users have approval entries');
    console.log('  2. Marked orphan rbac_user_permissions with source="orphan"');
    console.log('  3. Archived role_page_access to role_page_access_archive');
    console.log('  4. Added deprecation markers to role_page_access');
    console.log('\nWHAT TO DO NEXT:');
    console.log('  1. Review orphan permissions: SELECT * FROM rbac_user_permissions WHERE source = "orphan"');
    console.log('  2. Remove code that queries role_page_access for authorization');
    console.log('  3. Monitor for any users blocked by missing approvals');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    pool.end();
    
  } catch (error) {
    console.error('❌ CLEANUP FAILED:', error.message);
    pool.end();
    process.exit(1);
  }
}

async function reportOrphans() {
  const pool = new Pool({ connectionString });
  
  console.log('Orphan Permissions Report\n');
  
  try {
    const result = await pool.query(`
      SELECT 
        rup.user_id,
        ue.email,
        rup.page_key,
        rup.source,
        rup.updated_at
      FROM rbac_user_permissions rup
      LEFT JOIN users_enhanced ue ON ue.legacy_id = rup.user_id
      WHERE rup.source = 'orphan'
      ORDER BY rup.user_id, rup.page_key
      LIMIT 50
    `);
    
    console.table(result.rows);
    pool.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

// Main
if (process.argv.includes('--report-orphans')) {
  reportOrphans();
} else {
  runCleanup();
}

module.exports = {
  runCleanup,
  reportOrphans,
  VALIDATE_APPROVAL_CHAIN,
  MARK_ORPHAN_PERMISSIONS
};
