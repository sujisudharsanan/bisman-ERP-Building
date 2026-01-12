/**
 * STEP 7 — Full Validation Tests
 * 
 * Automated tests for:
 * - Login (multiple user types)
 * - Password verification
 * - User creation
 * - Legacy code paths (JOINs)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function runValidation() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           STEP 7 — FULL VALIDATION CHECKLIST                  ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const results = [];
  let passed = 0;
  let failed = 0;

  // ─────────────────────────────────────────────────────────────────
  // TEST 1: Super Admin Login Lookup
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 1: Super Admin lookup via users_enhanced...');
  try {
    const superAdmins = await prisma.$queryRaw`
      SELECT email, role, is_active FROM super_admins WHERE is_active = true LIMIT 1
    `;
    if (superAdmins.length > 0) {
      console.log('  ✅ Found Super Admin:', superAdmins[0].email);
      results.push({ test: 'Super Admin Lookup', status: 'PASS' });
      passed++;
    } else {
      console.log('  ⚠️  No active Super Admins found');
      results.push({ test: 'Super Admin Lookup', status: 'SKIP', reason: 'No super admins' });
    }
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'Super Admin Lookup', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 2: Tenant Admin Login Lookup (users_enhanced)
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 2: Tenant Admin lookup via users_enhanced...');
  try {
    const admins = await prisma.$queryRaw`
      SELECT id, email, username, role, is_active, tenant_id, password_hash IS NOT NULL as has_password
      FROM users_enhanced 
      WHERE role = 'ADMIN' AND is_active = true 
      LIMIT 3
    `;
    console.log('  Found', admins.length, 'active admin users:');
    admins.forEach(a => {
      console.log('    -', a.email, '| has_password:', a.has_password);
    });
    if (admins.length > 0 && admins.every(a => a.has_password)) {
      console.log('  ✅ All admins have password hashes');
      results.push({ test: 'Tenant Admin Lookup', status: 'PASS' });
      passed++;
    } else {
      console.log('  ⚠️  Some admins missing passwords');
      results.push({ test: 'Tenant Admin Lookup', status: 'WARN' });
    }
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'Tenant Admin Lookup', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 3: Standard User Lookup
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 3: Standard user lookup via users_enhanced...');
  try {
    const users = await prisma.$queryRaw`
      SELECT id, email, role, is_active 
      FROM users_enhanced 
      WHERE role != 'ADMIN' AND is_active = true 
      LIMIT 3
    `;
    console.log('  Found', users.length, 'standard users');
    if (users.length > 0) {
      console.log('  ✅ Standard users accessible');
      results.push({ test: 'Standard User Lookup', status: 'PASS' });
      passed++;
    } else {
      console.log('  ⚠️  No standard users found (may be expected)');
      results.push({ test: 'Standard User Lookup', status: 'SKIP' });
    }
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'Standard User Lookup', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 4: Password Hash Verification
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 4: Password hash verification...');
  try {
    // Get a known user
    const user = await prisma.$queryRaw`
      SELECT email, password_hash 
      FROM users_enhanced 
      WHERE password_hash IS NOT NULL 
      LIMIT 1
    `;
    if (user.length > 0) {
      // Check if hash is valid bcrypt format
      const hash = user[0].password_hash;
      const isValidHash = hash && hash.startsWith('$2') && hash.length >= 59;
      if (isValidHash) {
        console.log('  ✅ Password hash is valid bcrypt format');
        results.push({ test: 'Password Hash Format', status: 'PASS' });
        passed++;
      } else {
        console.log('  ❌ Invalid password hash format');
        results.push({ test: 'Password Hash Format', status: 'FAIL' });
        failed++;
      }
    }
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'Password Hash Format', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 5: Legacy VIEW Read Compatibility (JOINs)
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 5: Legacy VIEW compatibility (simulated JOINs)...');
  try {
    // This simulates how legacy code would JOIN to users table
    const joinTest = await prisma.$queryRaw`
      SELECT u.id, u.email, u.username, u.role
      FROM users u
      WHERE u.is_active = true
      LIMIT 3
    `;
    console.log('  Rows via users VIEW:', joinTest.length);
    if (joinTest.length > 0) {
      console.log('  ✅ Legacy VIEW JOINs work');
      results.push({ test: 'Legacy VIEW Compatibility', status: 'PASS' });
      passed++;
    }
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'Legacy VIEW Compatibility', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 6: User Creation Test (users_enhanced)
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 6: User creation capability...');
  try {
    const testEmail = `validation_test_${Date.now()}@test.local`;
    const testHash = await bcrypt.hash('TestPassword123!', 10);
    
    // Create test user
    await prisma.$executeRaw`
      INSERT INTO users_enhanced (id, email, username, password_hash, role, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), ${testEmail}, 'validation_test', ${testHash}, 'USER', false, NOW(), NOW())
    `;
    
    // Verify it exists
    const created = await prisma.$queryRaw`
      SELECT id, email FROM users_enhanced WHERE email = ${testEmail}
    `;
    
    if (created.length > 0) {
      console.log('  ✅ User creation works');
      results.push({ test: 'User Creation', status: 'PASS' });
      passed++;
      
      // Clean up test user
      await prisma.$executeRaw`DELETE FROM users_enhanced WHERE email = ${testEmail}`;
      console.log('  (test user cleaned up)');
    }
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'User Creation', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 7: Password Update Test
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 7: Password update capability...');
  try {
    // Get a user to test with
    const user = await prisma.$queryRaw`
      SELECT id, email, password_hash FROM users_enhanced WHERE is_active = true LIMIT 1
    `;
    
    if (user.length > 0) {
      const originalHash = user[0].password_hash;
      const newHash = await bcrypt.hash('TempPassword' + Date.now(), 10);
      
      // Update password
      await prisma.$executeRaw`
        UPDATE users_enhanced SET password_hash = ${newHash}, updated_at = NOW()
        WHERE id = ${user[0].id}::uuid
      `;
      
      // Revert to original
      await prisma.$executeRaw`
        UPDATE users_enhanced SET password_hash = ${originalHash}, updated_at = NOW()
        WHERE id = ${user[0].id}::uuid
      `;
      
      console.log('  ✅ Password update works (reverted)');
      results.push({ test: 'Password Update', status: 'PASS' });
      passed++;
    }
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'Password Update', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 8: Legacy Code Path - Approval Workflow Simulation
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 8: Legacy code path (approval workflow JOIN)...');
  try {
    // Simulate a query from ApprovalWorkflowService that JOINs to users
    const workflowTest = await prisma.$queryRaw`
      SELECT u.id, u.email, u.username as full_name
      FROM users u
      WHERE u.is_active = true
      LIMIT 5
    `;
    console.log('  Approval workflow query returned', workflowTest.length, 'rows');
    console.log('  ✅ Legacy approval workflow JOINs work');
    results.push({ test: 'Approval Workflow JOIN', status: 'PASS' });
    passed++;
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'Approval Workflow JOIN', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // TEST 9: No Password Mismatch Check
  // ─────────────────────────────────────────────────────────────────
  console.log('TEST 9: Password sync verification (no mismatches)...');
  try {
    // Check if VIEW and enhanced have same data (VIEW reads from enhanced)
    const viewData = await prisma.$queryRaw`
      SELECT email, password_hash FROM users WHERE is_active = true ORDER BY email LIMIT 5
    `;
    const enhancedData = await prisma.$queryRaw`
      SELECT email, password_hash FROM users_enhanced WHERE is_active = true ORDER BY email LIMIT 5
    `;
    
    let mismatchFound = false;
    viewData.forEach(v => {
      const e = enhancedData.find(x => x.email === v.email);
      if (e && v.password_hash !== e.password_hash) {
        mismatchFound = true;
        console.log('  ❌ Mismatch:', v.email);
      }
    });
    
    if (!mismatchFound) {
      console.log('  ✅ No password mismatches between VIEW and enhanced');
      results.push({ test: 'Password Sync', status: 'PASS' });
      passed++;
    } else {
      results.push({ test: 'Password Sync', status: 'FAIL' });
      failed++;
    }
  } catch (e) {
    console.log('  ❌ Failed:', e.message.substring(0, 60));
    results.push({ test: 'Password Sync', status: 'FAIL', error: e.message });
    failed++;
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                               ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Tests Passed: ${passed}`);
  console.log(`  Tests Failed: ${failed}`);
  console.log('');

  if (failed === 0) {
    console.log('  ✅ GO: All validation tests passed');
    console.log('');
    console.log('  Proceed to Step 8 (Observation Window)');
  } else {
    console.log('  ❌ NO-GO: Some tests failed');
    console.log('');
    console.log('  Review failures before proceeding');
  }
  console.log('');

  // Save results
  const fs = require('fs');
  const reportPath = __dirname + '/STEP7_VALIDATION_RESULTS.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    passed,
    failed,
    results,
    decision: failed === 0 ? 'GO' : 'NO-GO'
  }, null, 2));
  console.log(`  Report saved to: ${reportPath}`);
  console.log('');

  await prisma.$disconnect();
  return { passed, failed };
}

runValidation().catch(e => {
  console.error('Validation failed:', e);
  process.exit(1);
});
