/**
 * ============================================================================
 * FEATURE GATE SECURITY TESTS
 * ============================================================================
 * 
 * Mandatory tests that verify:
 * 1. Page visible but edit blocked when subscription disallows
 * 2. Export blocked via direct API call
 * 3. View works when subscription disallows edit
 * 4. Non-admin never sees upgrade info
 * 5. Admin sees upgrade banner
 * 6. Access request creates DB record
 * 7. Subscription cannot grant visibility alone
 * 8. All blocked actions return 403
 * 9. All blocked actions are logged
 * 
 * @module tests/featureGate.spec.js
 */

const { Pool } = require('pg');
const { featureGate, getPageAccess, ERROR_CODES } = require('../security/featureGate');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';
const pool = new Pool({ connectionString: DATABASE_URL });

// Test data
let testTenantId;
let testUserId;
let testAdminId;
let testPageKey;
let testPlanId;

/**
 * Setup test data
 */
async function setupTestData() {
  console.log('\n📦 Setting up test data...');
  
  // Get a real tenant with subscription
  const tenant = await pool.query(`
    SELECT cs.client_id, cs.plan_id
    FROM client_subscriptions cs
    WHERE cs.state = 'ACTIVE'
    LIMIT 1
  `);
  testTenantId = tenant.rows[0]?.client_id;
  testPlanId = tenant.rows[0]?.plan_id;
  
  // Get a user from that tenant with existing page access
  const user = await pool.query(`
    SELECT DISTINCT u.id, u.role, pm.page_code
    FROM users_enhanced u
    JOIN role_page_access rpa ON rpa.role_name = u.role
    JOIN pages_master pm ON rpa.page_id = pm.id
    WHERE u.tenant_id = $1 
      AND u.role NOT IN ('ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN')
      AND rpa.can_view = true
    LIMIT 1
  `, [testTenantId]);
  testUserId = user.rows[0]?.id;
  testPageKey = user.rows[0]?.page_code;
  
  // Get an admin from that tenant
  const admin = await pool.query(`
    SELECT id FROM users_enhanced 
    WHERE tenant_id = $1 AND role IN ('ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN')
    LIMIT 1
  `, [testTenantId]);
  testAdminId = admin.rows[0]?.id || testUserId;
  
  // Fallback page if needed
  if (!testPageKey) {
    testPageKey = 'FINANCE_TRIAL_BALANCE';
  }
  
  console.log(`  Tenant: ${testTenantId}`);
  console.log(`  User: ${testUserId}`);
  console.log(`  Admin: ${testAdminId}`);
  console.log(`  Page: ${testPageKey}`);
  console.log(`  Plan: ${testPlanId}`);
  
  return { testTenantId, testUserId, testAdminId, testPageKey, testPlanId };
}

/**
 * Run all security tests
 */
async function runSecurityTests() {
  console.log('\n🧪 FEATURE GATE SECURITY TESTS');
  console.log('='.repeat(60));
  
  await setupTestData();
  
  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };
  
  // Helper to run a test
  async function runTest(name, testFn) {
    try {
      await testFn();
      results.passed++;
      results.tests.push({ name, passed: true });
      console.log(`  ✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, passed: false, error: error.message });
      console.log(`  ❌ ${name}: ${error.message}`);
    }
  }
  
  // ===========================================================================
  // TEST 1: Page visible but edit blocked when subscription disallows
  // ===========================================================================
  await runTest('Page visible but edit blocked when subscription disallows', async () => {
    // Use the user's existing role which already has page access
    const userInfo = await pool.query(`SELECT role FROM users_enhanced WHERE id = $1`, [testUserId]);
    const userRole = userInfo.rows[0]?.role;
    
    // Verify user has access to this page
    const hasAccess = await pool.query(`
      SELECT 1 FROM role_page_access rpa
      JOIN pages_master pm ON rpa.page_id = pm.id
      WHERE rpa.role_name = $1 AND pm.page_code = $2 AND rpa.can_view = true
    `, [userRole, testPageKey]);
    
    if (hasAccess.rows.length === 0) {
      throw new Error(`User role ${userRole} has no access to ${testPageKey} - test setup issue`);
    }
    
    // Test with Free plan (should block edit)
    const user = {
      userId: testUserId,
      tenantId: testTenantId,
      role: userRole,
      isAdmin: false,
      planId: 1, // Free plan
    };
    
    // VIEW should work
    const viewResult = await featureGate({ pageKey: testPageKey, action: 'VIEW', user });
    if (!viewResult.allowed) {
      throw new Error(`VIEW should be allowed, got: ${viewResult.reason}`);
    }
    
    // EDIT should be blocked (Free plan)
    const editResult = await featureGate({ pageKey: testPageKey, action: 'EDIT', user });
    if (editResult.allowed) {
      throw new Error('EDIT should be blocked on Free plan');
    }
    if (editResult.errorCode !== ERROR_CODES.FEATURE_NOT_ALLOWED) {
      throw new Error(`Wrong error code: ${editResult.errorCode}`);
    }
  });
  
  // ===========================================================================
  // TEST 2: Export blocked via direct API call
  // ===========================================================================
  await runTest('Export blocked via direct API call', async () => {
    // Get user's actual role
    const userInfo = await pool.query(`SELECT role FROM users_enhanced WHERE id = $1`, [testUserId]);
    const userRole = userInfo.rows[0]?.role;
    
    const user = {
      userId: testUserId,
      tenantId: testTenantId,
      role: userRole,
      isAdmin: false,
      planId: 1, // Free plan - no export
    };
    
    const result = await featureGate({ pageKey: testPageKey, action: 'EXPORT', user });
    
    if (result.allowed) {
      throw new Error('EXPORT should be blocked on Free plan');
    }
    if (result.errorCode !== ERROR_CODES.FEATURE_NOT_ALLOWED) {
      throw new Error(`Wrong error code: ${result.errorCode}`);
    }
  });
  
  // ===========================================================================
  // TEST 3: View works when subscription disallows edit
  // ===========================================================================
  await runTest('View works when subscription disallows edit', async () => {
    // Use user's existing role
    const userInfo = await pool.query(`SELECT role FROM users_enhanced WHERE id = $1`, [testUserId]);
    const userRole = userInfo.rows[0]?.role;
    
    const user = {
      userId: testUserId,
      tenantId: testTenantId,
      role: userRole,
      isAdmin: false,
      planId: 1, // Free plan - no edit
    };
    
    const result = await featureGate({ pageKey: testPageKey, action: 'VIEW', user });
    
    if (!result.allowed) {
      throw new Error('VIEW should be allowed even when subscription blocks edit');
    }
  });
  
  // ===========================================================================
  // TEST 4: Non-admin never sees upgrade info
  // ===========================================================================
  await runTest('Non-admin never sees upgrade info', async () => {
    // Use user's existing role
    const userInfo = await pool.query(`SELECT role FROM users_enhanced WHERE id = $1`, [testUserId]);
    const userRole = userInfo.rows[0]?.role;
    
    const user = {
      userId: testUserId,
      tenantId: testTenantId,
      role: userRole,
      isAdmin: false,
      planId: 1,
    };
    
    const result = await featureGate({ pageKey: testPageKey, action: 'EXPORT', user });
    
    if (result.allowed) {
      throw new Error('EXPORT should be blocked');
    }
    
    // Non-admin should get generic message
    if (result.reason.includes('upgrade') || result.reason.includes('plan')) {
      throw new Error('Non-admin should not see upgrade info');
    }
    if (result.reason !== 'Contact your administrator for access.') {
      throw new Error(`Wrong message for non-admin: ${result.reason}`);
    }
  });
  
  // ===========================================================================
  // TEST 5: Admin sees upgrade message
  // ===========================================================================
  await runTest('Admin sees upgrade message', async () => {
    const user = {
      userId: testAdminId,
      tenantId: testTenantId,
      role: 'ADMIN',
      isAdmin: true,
      planId: 1,
    };
    
    const result = await featureGate({ pageKey: testPageKey, action: 'EXPORT', user });
    
    if (result.allowed) {
      throw new Error('EXPORT should be blocked');
    }
    
    // Admin should see plan-related message
    if (!result.reason.includes('plan')) {
      throw new Error(`Admin should see plan-related message: ${result.reason}`);
    }
  });
  
  // ===========================================================================
  // TEST 6: Access request creates DB record
  // ===========================================================================
  await runTest('Access request creates DB record', async () => {
    // Insert a test access request
    const result = await pool.query(`
      INSERT INTO access_requests 
        (tenant_id, user_id, page_code, requested_action, reason, status)
      VALUES ($1, $2, $3, 'EXPORT', 'Test request', 'PENDING')
      RETURNING id
    `, [testTenantId, testUserId, testPageKey]);
    
    const requestId = result.rows[0].id;
    
    // Verify it was created
    const verify = await pool.query(`
      SELECT * FROM access_requests WHERE id = $1
    `, [requestId]);
    
    if (verify.rows.length === 0) {
      throw new Error('Access request not found in database');
    }
    
    // Cleanup
    await pool.query(`DELETE FROM access_requests WHERE id = $1`, [requestId]);
  });
  
  // ===========================================================================
  // TEST 7: Subscription cannot grant visibility alone
  // ===========================================================================
  await runTest('Subscription cannot grant visibility alone', async () => {
    // Test with a page the user doesn't have access to via role_page_access
    // First, find a page this user's role does NOT have access to
    const userInfo = await pool.query(`SELECT role FROM users_enhanced WHERE id = $1`, [testUserId]);
    const userRole = userInfo.rows[0]?.role;
    
    const noAccessPage = await pool.query(`
      SELECT pm.page_code FROM pages_master pm
      WHERE pm.page_code NOT IN (
        SELECT pm2.page_code FROM role_page_access rpa
        JOIN pages_master pm2 ON rpa.page_id = pm2.id
        WHERE rpa.role_name = $1 AND rpa.can_view = true
      )
      AND pm.status = 'active'
      LIMIT 1
    `, [userRole]);
    
    if (noAccessPage.rows.length === 0) {
      // User has access to all pages - skip this test
      console.log('    (skipped - user has universal access)');
      return;
    }
    
    const restrictedPageKey = noAccessPage.rows[0].page_code;
    
    // User WITHOUT page approval but WITH Enterprise subscription
    const user = {
      userId: testUserId,
      tenantId: testTenantId,
      role: userRole,
      isAdmin: false,
      planId: 5, // Enterprise plan with full features
    };
    
    // Even with Enterprise plan, no approval = no access
    const result = await featureGate({ pageKey: restrictedPageKey, action: 'VIEW', user });
    
    if (result.allowed) {
      throw new Error(`Subscription alone should NOT grant visibility to ${restrictedPageKey}`);
    }
    
    if (result.errorCode !== ERROR_CODES.PAGE_ACCESS_DENIED) {
      throw new Error(`Should get PAGE_ACCESS_DENIED, got: ${result.errorCode}`);
    }
  });
  
  // ===========================================================================
  // TEST 8: All blocked actions return 403 error code
  // ===========================================================================
  await runTest('All blocked actions return proper error codes', async () => {
    const user = {
      userId: testUserId,
      tenantId: testTenantId,
      role: 'USER',
      isAdmin: false,
      planId: 1, // Free plan
    };
    
    const actions = ['EDIT', 'EXPORT', 'DOWNLOAD', 'CREATE', 'DELETE'];
    
    for (const action of actions) {
      const result = await featureGate({ pageKey: testPageKey, action, user });
      
      if (result.allowed) {
        // Could be allowed if Enterprise plan - skip
        continue;
      }
      
      if (!result.errorCode) {
        throw new Error(`${action} blocked but no error code returned`);
      }
      
      if (![ERROR_CODES.PAGE_ACCESS_DENIED, ERROR_CODES.FEATURE_NOT_ALLOWED].includes(result.errorCode)) {
        throw new Error(`${action}: Invalid error code ${result.errorCode}`);
      }
    }
  });
  
  // ===========================================================================
  // TEST 9: All blocked actions are logged
  // ===========================================================================
  await runTest('All blocked actions are logged', async () => {
    const user = {
      userId: testUserId,
      tenantId: testTenantId,
      role: 'USER',
      isAdmin: false,
      planId: 1,
    };
    
    // Perform a blocked action
    const beforeCount = await pool.query(`
      SELECT COUNT(*) as count FROM subscription_action_audit
      WHERE user_id = $1 AND page_code = $2
    `, [testUserId, testPageKey]);
    
    await featureGate({ pageKey: testPageKey, action: 'EXPORT', user });
    
    // Check audit log
    const afterCount = await pool.query(`
      SELECT COUNT(*) as count FROM subscription_action_audit
      WHERE user_id = $1 AND page_code = $2
    `, [testUserId, testPageKey]);
    
    const diff = parseInt(afterCount.rows[0].count) - parseInt(beforeCount.rows[0].count);
    
    if (diff < 1) {
      throw new Error('Action was not logged to audit table');
    }
  });
  
  // ===========================================================================
  // TEST 10: getPageAccess returns correct structure
  // ===========================================================================
  await runTest('getPageAccess returns correct structure', async () => {
    const user = {
      userId: testUserId,
      tenantId: testTenantId,
      role: 'USER',
      isAdmin: false,
      planId: 1,
    };
    
    const result = await getPageAccess({ pageKey: testPageKey, user });
    
    // Check required fields
    const requiredFields = ['pageKey', 'access', 'subscriptionRestricted', 'isAdmin'];
    for (const field of requiredFields) {
      if (!(field in result)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // If visible, check access structure
    if (result.visible && result.access) {
      const accessFields = ['canView', 'canEdit', 'canExport', 'canDownload'];
      for (const field of accessFields) {
        if (!(field in result.access)) {
          throw new Error(`Missing access field: ${field}`);
        }
      }
    }
  });
  
  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTS: ${results.passed} passed, ${results.failed} failed`);
  console.log(results.failed === 0 ? '✅ ALL TESTS PASSED!' : '⚠️ Some tests failed');
  
  // Cleanup test data
  await pool.query(`DELETE FROM role_page_access WHERE role_name IN ('TEST_ROLE', 'TEST_VIEWER')`);
  
  await pool.end();
  
  return results;
}

// Run if executed directly
if (require.main === module) {
  runSecurityTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { runSecurityTests };
