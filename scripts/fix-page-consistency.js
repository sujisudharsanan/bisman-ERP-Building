#!/usr/bin/env node

/**
 * ============================================================================
 * BISMAN ERP - Fix Page Data Consistency
 * ============================================================================
 * 
 * Fixes the mismatch between is_active and status fields in pages_master.
 * 
 * The issue:
 * - Frontend shows 312 pages (status='active')
 * - Backend API shows 281 pages (is_active=TRUE)
 * - 31 pages have status='active' but is_active=FALSE
 * 
 * Solution:
 * - Sync is_active with status (make is_active=TRUE if status='active')
 * - OR mark status='inactive' for pages that are truly inactive
 * 
 * Usage:
 *   node scripts/fix-page-consistency.js --dry-run   # Preview changes
 *   node scripts/fix-page-consistency.js --apply     # Apply changes
 * 
 * Created: 2026-01-25
 * ============================================================================
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ connectionString: DATABASE_URL });

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--apply');

async function fixConsistency() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('                    FIX PAGE DATA CONSISTENCY');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'APPLY CHANGES'}\n`);

  const client = await pool.connect();
  
  try {
    // Find mismatched pages
    const mismatch = await client.query(`
      SELECT id, route, display_name, is_active, status
      FROM pages_master 
      WHERE (is_active = TRUE AND status != 'active') 
         OR (is_active = FALSE AND status = 'active')
      ORDER BY route
    `);

    console.log(`Found ${mismatch.rows.length} pages with is_active/status mismatch:\n`);

    const toActivate = [];
    const toDeactivate = [];

    for (const page of mismatch.rows) {
      if (page.status === 'active' && page.is_active === false) {
        // Status is active but is_active is false
        // Decision: Activate these pages (sync is_active = TRUE)
        toActivate.push(page);
        console.log(`  📗 ACTIVATE: ${page.route} (status=active, is_active=false)`);
      } else if (page.status !== 'active' && page.is_active === true) {
        // is_active is true but status is not active
        // Decision: Keep is_active, set status to 'active'
        toDeactivate.push(page);
        console.log(`  📙 SYNC STATUS: ${page.route} (is_active=true, status=${page.status})`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`  - ${toActivate.length} pages to set is_active=TRUE`);
    console.log(`  - ${toDeactivate.length} pages to set status='active'`);

    if (!isDryRun) {
      console.log('\nApplying changes...\n');

      // Activate pages where status='active' but is_active=FALSE
      if (toActivate.length > 0) {
        const activateIds = toActivate.map(p => p.id);
        const result = await client.query(`
          UPDATE pages_master 
          SET is_active = TRUE, updated_at = NOW()
          WHERE id = ANY($1)
          RETURNING id, route
        `, [activateIds]);
        console.log(`  ✅ Activated ${result.rows.length} pages`);
      }

      // Sync status for pages where is_active=TRUE but status != 'active'
      if (toDeactivate.length > 0) {
        const syncIds = toDeactivate.map(p => p.id);
        const result = await client.query(`
          UPDATE pages_master 
          SET status = 'active', updated_at = NOW()
          WHERE id = ANY($1)
          RETURNING id, route
        `, [syncIds]);
        console.log(`  ✅ Synced status for ${result.rows.length} pages`);
      }

      // Verify
      const verify = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE is_active = TRUE) as is_active_count,
          COUNT(*) FILTER (WHERE status = 'active') as status_active_count,
          COUNT(*) FILTER (WHERE is_active = TRUE AND status = 'active') as both_active_count
        FROM pages_master
      `);

      console.log('\nVerification:');
      console.log(`  is_active=TRUE:                ${verify.rows[0].is_active_count}`);
      console.log(`  status='active':               ${verify.rows[0].status_active_count}`);
      console.log(`  Both active (consistent):      ${verify.rows[0].both_active_count}`);

      if (verify.rows[0].is_active_count === verify.rows[0].status_active_count) {
        console.log('\n✅ SUCCESS: is_active and status are now consistent!');
      } else {
        console.log('\n⚠️  Still have some inconsistencies. Check manually.');
      }

    } else {
      console.log('\n📋 DRY RUN - No changes made.');
      console.log('   Run with --apply to apply these changes.');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixConsistency();
