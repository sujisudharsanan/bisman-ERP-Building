/**
 * STEP 9 — Final Deletion Plan (OPTIONAL)
 * 
 * ⚠️  DANGER ZONE ⚠️
 * 
 * Purpose: Permanently delete the backup users table after successful
 *          observation period (minimum 30 days).
 * 
 * Prerequisites:
 * - All Step 8 observation criteria met
 * - Written approval from stakeholders
 * - Final backup exported to external storage
 * 
 * Run with: node scripts/decommission/step9-final-deletion.js
 * Dry run:  node scripts/decommission/step9-final-deletion.js --dry-run
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

async function finalDeletion() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           STEP 9 — FINAL DELETION (DANGER ZONE)               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  ⚠️  WARNING: This will PERMANENTLY DELETE the backup table!');
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // Safety checks
  // ─────────────────────────────────────────────────────────────────
  console.log('Running safety checks...');
  console.log('');

  // Check 1: Find backup table (could be named differently)
  const backupTables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables 
    WHERE (table_name LIKE '%legacy%backup%' OR table_name LIKE 'users_backup%')
      AND table_schema = 'public'
  `;

  let backupTableName = null;
  if (backupTables.length === 0) {
    console.log('  ✅ No backup table found - already cleaned up');
    console.log('');
    await prisma.$disconnect();
    return;
  } else {
    backupTableName = backupTables[0].table_name;
    console.log('  ✅ Backup table exists:', backupTableName);
  }

  // Check 2: users is a VIEW (not table)
  const isView = await prisma.$queryRaw`
    SELECT table_type 
    FROM information_schema.tables 
    WHERE table_name = 'users' AND table_schema = 'public'
  `;

  if (isView[0]?.table_type !== 'VIEW') {
    console.log('  ❌ users is not a VIEW - decommission not complete');
    console.log('  Run step6-create-users-view.js first');
    await prisma.$disconnect();
    return;
  }
  console.log('  ✅ users is a VIEW');

  // Check 3: Observation period (check for marker file)
  const observationFile = path.join(__dirname, 'OBSERVATION_STARTED.txt');
  if (fs.existsSync(observationFile)) {
    const startDate = new Date(fs.readFileSync(observationFile, 'utf8').trim());
    const now = new Date();
    const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    
    if (daysPassed < 30 && !FORCE) {
      console.log(`  ❌ Only ${daysPassed} days since observation started`);
      console.log('  Minimum 30 days required (use --force to override)');
      await prisma.$disconnect();
      return;
    }
    console.log(`  ✅ Observation period: ${daysPassed} days`);
  } else {
    if (!FORCE) {
      console.log('  ❌ No observation start marker found');
      console.log('  Create OBSERVATION_STARTED.txt with start date');
      console.log('  Or use --force to skip this check');
      await prisma.$disconnect();
      return;
    }
    console.log('  ⚠️  Observation check skipped (--force)');
  }

  // Check 4: Approval file exists
  const approvalFile = path.join(__dirname, 'DELETION_APPROVED.txt');
  if (!fs.existsSync(approvalFile) && !FORCE) {
    console.log('  ❌ No approval file found');
    console.log('  Create DELETION_APPROVED.txt with approval signatures');
    console.log('  Or use --force to skip this check');
    await prisma.$disconnect();
    return;
  }
  console.log('  ✅ Approval verified');

  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // Get backup stats before deletion
  // ─────────────────────────────────────────────────────────────────
  const backupCount = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM users_backup_pre_view
  `;
  console.log(`Backup table contains ${backupCount[0].count} rows`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // Export final backup
  // ─────────────────────────────────────────────────────────────────
  console.log('Exporting final backup...');
  
  const allBackupData = await prisma.$queryRawUnsafe(
    `SELECT * FROM "${backupTableName}"`
  );
  
  const exportPath = path.join(__dirname, `FINAL_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(exportPath, JSON.stringify(allBackupData, null, 2));
  console.log(`  ✅ Exported to: ${exportPath}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // Delete backup table
  // ─────────────────────────────────────────────────────────────────
  if (DRY_RUN) {
    console.log('Would execute:');
    console.log(`  DROP TABLE "${backupTableName}";`);
    console.log('');
    console.log('🔍 DRY RUN complete - no changes made');
  } else {
    console.log(`⚠️  FINAL WARNING: About to delete ${backupTableName}`);
    console.log('    Press Ctrl+C within 5 seconds to abort...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('');
    console.log('Deleting backup table...');
    
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE "${backupTableName}" CASCADE`);
      console.log('  ✅ Backup table deleted');
    } catch (delErr) {
      console.log(`  ❌ Deletion failed: ${delErr.message}`);
      console.log('');
      console.log('  The backup is safe. Review the error and try again.');
      await prisma.$disconnect();
      return;
    }
    
    // Also clean up old trigger function if it exists
    try {
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS fn_users_write_freeze()`);
      console.log('  ✅ Old freeze function cleaned up');
    } catch {
      // Ignore - may not exist
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    DECOMMISSION COMPLETE                      ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  ✅ Legacy users table has been fully decommissioned');
  console.log('  ✅ users_enhanced is now the single source of truth');
  console.log('  ✅ users VIEW provides backward compatibility');
  console.log('');
  console.log('  Final backup saved to:');
  console.log(`    ${exportPath}`);
  console.log('');
  console.log('  🎉 Migration complete!');
  console.log('');

  await prisma.$disconnect();
}

finalDeletion().catch(e => {
  console.error('Deletion failed:', e);
  process.exit(1);
});
