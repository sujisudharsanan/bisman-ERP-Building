/**
 * STEP 2 — Data Integrity Audit
 * 
 * Purpose: Detect data inconsistencies between users and users_enhanced tables
 * 
 * Checks:
 * 1. Users in legacy table but NOT in users_enhanced
 * 2. Users in users_enhanced but NOT in legacy table
 * 3. Password hash mismatches
 * 4. Duplicate emails
 * 5. NULL or invalid legacy_id mappings
 * 6. Orphaned foreign keys
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           STEP 2 — DATA INTEGRITY AUDIT                       ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const report = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: {
      critical: 0,
      warning: 0,
      ok: 0
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // CHECK 1: Users in legacy table but NOT in users_enhanced
  // ─────────────────────────────────────────────────────────────────
  console.log('CHECK 1: Users in legacy table but NOT in users_enhanced...');
  
  const missingInEnhanced = await prisma.$queryRaw`
    SELECT u.id, u.email, u.username, u.role, u.is_active, u.tenant_id,
           u.created_at, u.password_hash IS NOT NULL as has_password
    FROM users u
    LEFT JOIN users_enhanced ue ON u.email = ue.email
    WHERE ue.id IS NULL
    ORDER BY u.created_at DESC
  `;
  
  if (missingInEnhanced.length > 0) {
    console.log(`  ❌ CRITICAL: ${missingInEnhanced.length} users in legacy table missing from users_enhanced`);
    report.checks.push({
      name: 'missing_in_enhanced',
      status: 'CRITICAL',
      count: missingInEnhanced.length,
      data: missingInEnhanced.slice(0, 20) // First 20 for brevity
    });
    report.summary.critical++;
  } else {
    console.log('  ✅ OK: All legacy users exist in users_enhanced');
    report.checks.push({ name: 'missing_in_enhanced', status: 'OK', count: 0 });
    report.summary.ok++;
  }

  // ─────────────────────────────────────────────────────────────────
  // CHECK 2: Users in users_enhanced but NOT in legacy table
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('CHECK 2: Users in users_enhanced but NOT in legacy table...');
  
  const missingInLegacy = await prisma.$queryRaw`
    SELECT ue.id, ue.email, ue.username, ue.role, ue.is_active, ue.tenant_id,
           ue.legacy_id, ue.created_at
    FROM users_enhanced ue
    LEFT JOIN users u ON ue.email = u.email
    WHERE u.id IS NULL
    ORDER BY ue.created_at DESC
  `;
  
  if (missingInLegacy.length > 0) {
    console.log(`  ⚠️  WARNING: ${missingInLegacy.length} users in users_enhanced missing from legacy table`);
    console.log('     (This is expected for newly created users via Super Admin panel)');
    report.checks.push({
      name: 'missing_in_legacy',
      status: 'WARNING',
      count: missingInLegacy.length,
      data: missingInLegacy.slice(0, 20)
    });
    report.summary.warning++;
  } else {
    console.log('  ✅ OK: All enhanced users have legacy records');
    report.checks.push({ name: 'missing_in_legacy', status: 'OK', count: 0 });
    report.summary.ok++;
  }

  // ─────────────────────────────────────────────────────────────────
  // CHECK 3: Password hash mismatches
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('CHECK 3: Password hash mismatches between tables...');
  
  const hashMismatches = await prisma.$queryRaw`
    SELECT u.email, 
           LEFT(u.password_hash, 20) as legacy_hash_prefix,
           LEFT(ue.password_hash, 20) as enhanced_hash_prefix,
           u.role
    FROM users u
    JOIN users_enhanced ue ON u.email = ue.email
    WHERE u.password_hash IS NOT NULL 
      AND ue.password_hash IS NOT NULL
      AND u.password_hash != ue.password_hash
    ORDER BY u.email
  `;
  
  if (hashMismatches.length > 0) {
    console.log(`  ❌ CRITICAL: ${hashMismatches.length} users have different password hashes!`);
    console.log('     These users may experience login failures.');
    hashMismatches.forEach(u => {
      console.log(`     - ${u.email} (${u.role})`);
    });
    report.checks.push({
      name: 'password_mismatch',
      status: 'CRITICAL',
      count: hashMismatches.length,
      data: hashMismatches
    });
    report.summary.critical++;
  } else {
    console.log('  ✅ OK: All password hashes match');
    report.checks.push({ name: 'password_mismatch', status: 'OK', count: 0 });
    report.summary.ok++;
  }

  // ─────────────────────────────────────────────────────────────────
  // CHECK 4: Duplicate emails within each table
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('CHECK 4: Duplicate emails...');
  
  const duplicatesLegacy = await prisma.$queryRaw`
    SELECT email, COUNT(*) as count
    FROM users
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  `;
  
  const duplicatesEnhanced = await prisma.$queryRaw`
    SELECT email, COUNT(*) as count
    FROM users_enhanced
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  `;
  
  if (duplicatesLegacy.length > 0 || duplicatesEnhanced.length > 0) {
    console.log(`  ❌ CRITICAL: Duplicate emails found!`);
    console.log(`     Legacy table: ${duplicatesLegacy.length} duplicates`);
    console.log(`     Enhanced table: ${duplicatesEnhanced.length} duplicates`);
    report.checks.push({
      name: 'duplicate_emails',
      status: 'CRITICAL',
      count: duplicatesLegacy.length + duplicatesEnhanced.length,
      data: { legacy: duplicatesLegacy, enhanced: duplicatesEnhanced }
    });
    report.summary.critical++;
  } else {
    console.log('  ✅ OK: No duplicate emails');
    report.checks.push({ name: 'duplicate_emails', status: 'OK', count: 0 });
    report.summary.ok++;
  }

  // ─────────────────────────────────────────────────────────────────
  // CHECK 5: NULL or invalid legacy_id mappings
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('CHECK 5: NULL or invalid legacy_id mappings...');
  
  const nullLegacyIds = await prisma.$queryRaw`
    SELECT ue.id, ue.email, ue.username, ue.role
    FROM users_enhanced ue
    WHERE ue.legacy_id IS NULL
      AND EXISTS (SELECT 1 FROM users u WHERE u.email = ue.email)
  `;
  
  if (nullLegacyIds.length > 0) {
    console.log(`  ⚠️  WARNING: ${nullLegacyIds.length} users_enhanced records have NULL legacy_id but exist in legacy table`);
    report.checks.push({
      name: 'null_legacy_id',
      status: 'WARNING',
      count: nullLegacyIds.length,
      data: nullLegacyIds.slice(0, 20)
    });
    report.summary.warning++;
  } else {
    console.log('  ✅ OK: All legacy_id mappings are valid');
    report.checks.push({ name: 'null_legacy_id', status: 'OK', count: 0 });
    report.summary.ok++;
  }

  // ─────────────────────────────────────────────────────────────────
  // CHECK 6: Users with NULL password hash
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('CHECK 6: Users with NULL password hash...');
  
  const nullPasswords = await prisma.$queryRaw`
    SELECT 'legacy' as table_name, email, role
    FROM users
    WHERE password_hash IS NULL AND is_active = true
    UNION ALL
    SELECT 'enhanced' as table_name, email, role
    FROM users_enhanced
    WHERE password_hash IS NULL AND is_active = true
  `;
  
  if (nullPasswords.length > 0) {
    console.log(`  ⚠️  WARNING: ${nullPasswords.length} active users have NULL password`);
    report.checks.push({
      name: 'null_password',
      status: 'WARNING',
      count: nullPasswords.length,
      data: nullPasswords
    });
    report.summary.warning++;
  } else {
    console.log('  ✅ OK: All active users have password hashes');
    report.checks.push({ name: 'null_password', status: 'OK', count: 0 });
    report.summary.ok++;
  }

  // ─────────────────────────────────────────────────────────────────
  // CHECK 7: Table row counts
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('CHECK 7: Table row counts...');
  
  const legacyCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM users`;
  const enhancedCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM users_enhanced`;
  
  console.log(`  Legacy users table: ${legacyCount[0].count} rows`);
  console.log(`  Enhanced users table: ${enhancedCount[0].count} rows`);
  
  report.checks.push({
    name: 'row_counts',
    status: 'INFO',
    data: {
      legacy: legacyCount[0].count,
      enhanced: enhancedCount[0].count
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ❌ CRITICAL issues: ${report.summary.critical}`);
  console.log(`  ⚠️  WARNING issues: ${report.summary.warning}`);
  console.log(`  ✅ OK checks: ${report.summary.ok}`);
  console.log('');
  
  if (report.summary.critical > 0) {
    console.log('  🚨 ACTION REQUIRED: Fix critical issues before proceeding!');
    console.log('');
  }

  // Save report to file
  const fs = require('fs');
  const reportPath = __dirname + '/STEP2_AUDIT_REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  Report saved to: ${reportPath}`);
  console.log('');

  await prisma.$disconnect();
  return report;
}

runAudit().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});
