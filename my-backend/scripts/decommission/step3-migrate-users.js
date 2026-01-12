/**
 * STEP 3 — Migration Script (IDEMPOTENT)
 * 
 * Purpose: Migrate any missing users from legacy `users` → `users_enhanced`
 * 
 * Rules:
 * - No deletes
 * - No overwrites unless mismatched hash detected
 * - Log every change
 * - Can be re-run safely (idempotent)
 * 
 * Run with: node scripts/decommission/step3-migrate-users.js
 * Dry run:  node scripts/decommission/step3-migrate-users.js --dry-run
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function migrate() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           STEP 3 — USER MIGRATION (Legacy → Enhanced)         ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '🚀 LIVE MIGRATION'}`);
  console.log('');

  const log = [];
  let created = 0;
  let updated = 0;
  const skipped = 0;

  // ─────────────────────────────────────────────────────────────────
  // PART 1: Migrate users from legacy → enhanced (if missing)
  // ─────────────────────────────────────────────────────────────────
  console.log('PART 1: Checking for users to migrate from legacy → enhanced...');
  
  const missingInEnhanced = await prisma.$queryRaw`
    SELECT u.id as legacy_id, u.email, u.username, u.password_hash, u.role, 
           u.is_active, u.tenant_id, u.super_admin_id, u.created_at,
           u."productType" as product_type, u.profile_pic_url
    FROM users u
    LEFT JOIN users_enhanced ue ON u.email = ue.email
    WHERE ue.id IS NULL
  `;

  if (missingInEnhanced.length === 0) {
    console.log('  ✅ No users to migrate - all legacy users exist in enhanced table');
  } else {
    console.log(`  Found ${missingInEnhanced.length} users to migrate:`);
    
    for (const user of missingInEnhanced) {
      console.log(`    - Migrating: ${user.email} (${user.role})`);
      
      if (!DRY_RUN) {
        try {
          const newId = uuidv4();
          await prisma.$executeRaw`
            INSERT INTO users_enhanced (
              id, legacy_id, email, username, password_hash, role,
              is_active, tenant_id, super_admin_id, created_at,
              product_type, profile_pic_url, updated_at
            ) VALUES (
              ${newId}::uuid,
              ${user.legacy_id},
              ${user.email},
              ${user.username || user.email.split('@')[0]},
              ${user.password_hash},
              ${user.role || 'USER'},
              ${user.is_active ?? true},
              ${user.tenant_id}::uuid,
              ${user.super_admin_id},
              ${user.created_at || new Date()},
              ${user.product_type || 'BUSINESS_ERP'},
              ${user.profile_pic_url},
              NOW()
            )
          `;
          created++;
          log.push({ action: 'CREATE', email: user.email, newId, status: 'SUCCESS' });
        } catch (e) {
          console.log(`      ❌ Failed: ${e.message}`);
          log.push({ action: 'CREATE', email: user.email, status: 'FAILED', error: e.message });
        }
      } else {
        log.push({ action: 'CREATE', email: user.email, status: 'DRY_RUN' });
        created++;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PART 2: Sync password hashes (if mismatch detected)
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('PART 2: Checking for password hash mismatches...');
  
  const hashMismatches = await prisma.$queryRaw`
    SELECT u.email, ue.id as enhanced_id,
           u.password_hash as legacy_hash,
           ue.password_hash as enhanced_hash
    FROM users u
    JOIN users_enhanced ue ON u.email = ue.email
    WHERE u.password_hash IS NOT NULL 
      AND ue.password_hash IS NOT NULL
      AND u.password_hash != ue.password_hash
  `;

  if (hashMismatches.length === 0) {
    console.log('  ✅ No password mismatches - all hashes are in sync');
  } else {
    console.log(`  Found ${hashMismatches.length} password mismatches to fix:`);
    
    for (const user of hashMismatches) {
      console.log(`    - Syncing: ${user.email}`);
      
      if (!DRY_RUN) {
        try {
          // Use the LEGACY hash as source of truth (user's current working password)
          await prisma.$executeRaw`
            UPDATE users_enhanced 
            SET password_hash = ${user.legacy_hash},
                updated_at = NOW()
            WHERE id = ${user.enhanced_id}::uuid
          `;
          updated++;
          log.push({ action: 'SYNC_PASSWORD', email: user.email, status: 'SUCCESS' });
        } catch (e) {
          console.log(`      ❌ Failed: ${e.message}`);
          log.push({ action: 'SYNC_PASSWORD', email: user.email, status: 'FAILED', error: e.message });
        }
      } else {
        log.push({ action: 'SYNC_PASSWORD', email: user.email, status: 'DRY_RUN' });
        updated++;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // PART 3: Populate missing legacy_id references
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('PART 3: Populating missing legacy_id references...');
  
  const missingLegacyIds = await prisma.$queryRaw`
    SELECT ue.id as enhanced_id, ue.email, u.id as legacy_id
    FROM users_enhanced ue
    JOIN users u ON ue.email = u.email
    WHERE ue.legacy_id IS NULL
  `;

  if (missingLegacyIds.length === 0) {
    console.log('  ✅ All legacy_id references are populated');
  } else {
    console.log(`  Found ${missingLegacyIds.length} missing legacy_id references:`);
    
    for (const user of missingLegacyIds) {
      console.log(`    - Setting legacy_id for: ${user.email} → ${user.legacy_id}`);
      
      if (!DRY_RUN) {
        try {
          await prisma.$executeRaw`
            UPDATE users_enhanced 
            SET legacy_id = ${user.legacy_id},
                updated_at = NOW()
            WHERE id = ${user.enhanced_id}::uuid
          `;
          updated++;
          log.push({ action: 'SET_LEGACY_ID', email: user.email, legacyId: user.legacy_id, status: 'SUCCESS' });
        } catch (e) {
          console.log(`      ❌ Failed: ${e.message}`);
          log.push({ action: 'SET_LEGACY_ID', email: user.email, status: 'FAILED', error: e.message });
        }
      } else {
        log.push({ action: 'SET_LEGACY_ID', email: user.email, legacyId: user.legacy_id, status: 'DRY_RUN' });
        updated++;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Created: ${created} users`);
  console.log(`  Updated: ${updated} records`);
  console.log(`  Skipped: ${skipped} records`);
  console.log('');

  if (DRY_RUN) {
    console.log('  🔍 This was a DRY RUN - no changes were made');
    console.log('  Run without --dry-run to apply changes');
  } else {
    console.log('  ✅ Migration complete');
  }
  console.log('');

  // Save log to file
  const fs = require('fs');
  const logPath = __dirname + `/STEP3_MIGRATION_LOG_${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(logPath, JSON.stringify({ timestamp: new Date().toISOString(), dryRun: DRY_RUN, log }, null, 2));
  console.log(`  Log saved to: ${logPath}`);
  console.log('');

  await prisma.$disconnect();
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
