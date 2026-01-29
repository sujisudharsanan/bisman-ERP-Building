/**
 * BackgroundJobRLS Verification Script
 * =====================================
 * 
 * Runs security verification tests against the BackgroundJobRLS implementation.
 * 
 * Run: node scripts/verify-background-job-rls.js
 */

const { Pool } = require('pg');

// Admin connection for setup
const ADMIN_URL = 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function verify() {
  console.log('🔐 BACKGROUND JOB RLS VERIFICATION');
  console.log('====================================\n');

  const adminPool = new Pool({ connectionString: ADMIN_URL });
  
  // Import BackgroundJobRLS
  const { 
    BackgroundJobRLS, 
    runWithRLSContext, 
    APPROVED_ALL_SCOPE_JOBS 
  } = require('../my-backend/security/BackgroundJobRLS');

  const rlsWrapper = new BackgroundJobRLS();
  await rlsWrapper.initialize();

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (passed) {
      results.passed++;
      console.log(`✅ ${name}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}: ${details}`);
    }
  }

  try {
    // Get test data
    const tenants = await adminPool.query(`
      SELECT id FROM clients WHERE is_active = true ORDER BY id LIMIT 5
    `);
    
    if (tenants.rows.length === 0) {
      console.error('No active tenants for security tests');
      process.exit(1);
    }
    
    const tenant1 = String(tenants.rows[0].id);
    // Use same tenant if only one exists
    const tenant2 = tenants.rows.length > 1 ? String(tenants.rows[1].id) : tenant1;
    const testUserId = 1;

    console.log(`Test Tenants: ${tenant1}${tenant1 !== tenant2 ? ', ' + tenant2 : ' (only one)'}\n`);

    // =========================================================================
    // TEST 1: Missing context rejection
    // =========================================================================
    console.log('--- TEST 1: Missing Context Rejection ---');

    try {
      await runWithRLSContext(
        { userId: testUserId, dataScope: 'TENANT' }, // Missing tenantId
        { jobName: 'test-missing-tenant' },
        async () => {}
      );
      recordTest('Missing tenantId should fail', false, 'Did not throw');
    } catch (e) {
      recordTest('Missing tenantId should fail', e.message.includes('tenantId is required'));
    }

    try {
      await runWithRLSContext(
        { tenantId: tenant1, dataScope: 'TENANT' }, // Missing userId
        { jobName: 'test-missing-user' },
        async () => {}
      );
      recordTest('Missing userId should fail', false, 'Did not throw');
    } catch (e) {
      recordTest('Missing userId should fail', e.message.includes('userId is required'));
    }

    try {
      await runWithRLSContext(
        { tenantId: tenant1, userId: testUserId }, // Missing dataScope
        { jobName: 'test-missing-scope' },
        async () => {}
      );
      recordTest('Missing dataScope should fail', false, 'Did not throw');
    } catch (e) {
      recordTest('Missing dataScope should fail', e.message.includes('dataScope is required'));
    }

    try {
      await runWithRLSContext(
        { tenantId: tenant1, userId: testUserId, dataScope: 'INVALID' },
        { jobName: 'test-invalid-scope' },
        async () => {}
      );
      recordTest('Invalid dataScope should fail', false, 'Did not throw');
    } catch (e) {
      recordTest('Invalid dataScope should fail', e.message.includes('Invalid dataScope'));
    }

    // =========================================================================
    // TEST 2: ALL scope restriction
    // =========================================================================
    console.log('\n--- TEST 2: ALL Scope Restriction ---');

    try {
      await runWithRLSContext(
        { tenantId: tenant1, userId: testUserId, dataScope: 'ALL' },
        { jobName: 'random-non-system-job', isSystemJob: false },
        async () => {}
      );
      recordTest('ALL scope for non-system job should fail', false, 'Did not throw');
    } catch (e) {
      recordTest('ALL scope for non-system job should fail', e.message.includes('ALL scope denied'));
    }

    try {
      const result = await runWithRLSContext(
        { tenantId: tenant1, userId: testUserId, dataScope: 'ALL' },
        { jobName: APPROVED_ALL_SCOPE_JOBS[0], isSystemJob: true },
        async (client) => {
          const r = await client.query('SELECT 1 as test');
          return r.rows[0];
        }
      );
      recordTest('ALL scope for approved system job should pass', result.test === 1);
    } catch (e) {
      recordTest('ALL scope for approved system job should pass', false, e.message);
    }

    // =========================================================================
    // TEST 3: Context is set correctly
    // =========================================================================
    console.log('\n--- TEST 3: Context Verification ---');

    try {
      const result = await runWithRLSContext(
        { tenantId: tenant1, userId: testUserId, dataScope: 'TENANT' },
        { jobName: 'test-context-verification' },
        async (client) => {
          const r = await client.query(`
            SELECT 
              current_setting('app.tenant_id', true) as tenant_id,
              current_setting('app.user_id', true) as user_id,
              current_setting('app.data_scope', true) as data_scope,
              current_setting('app.context_set', true) as context_set,
              is_security_context_set() as is_valid
          `);
          return r.rows[0];
        }
      );
      
      recordTest('Context tenant_id matches', result.tenant_id === tenant1);
      recordTest('Context user_id matches', result.user_id === String(testUserId));
      recordTest('Context data_scope matches', result.data_scope === 'TENANT');
      recordTest('Context context_set is true', result.context_set === 'true');
      recordTest('is_security_context_set() returns true', result.is_valid === true);
    } catch (e) {
      recordTest('Context verification', false, e.message);
    }

    // =========================================================================
    // TEST 4: Context isolation between jobs
    // =========================================================================
    console.log('\n--- TEST 4: Context Isolation ---');

    try {
      // Job 1 with tenant1
      await runWithRLSContext(
        { tenantId: tenant1, userId: testUserId, dataScope: 'TENANT' },
        { jobName: 'test-isolation-job1' },
        async (client) => {
          const r = await client.query(`SELECT current_setting('app.tenant_id', true) as tid`);
          if (r.rows[0].tid !== tenant1) throw new Error(`Expected ${tenant1}, got ${r.rows[0].tid}`);
        }
      );

      // Job 2 with tenant2 - should not see tenant1's context
      await runWithRLSContext(
        { tenantId: tenant2, userId: testUserId, dataScope: 'TENANT' },
        { jobName: 'test-isolation-job2' },
        async (client) => {
          const r = await client.query(`SELECT current_setting('app.tenant_id', true) as tid`);
          if (r.rows[0].tid !== tenant2) throw new Error(`Expected ${tenant2}, got ${r.rows[0].tid}`);
        }
      );

      recordTest('Context isolation between jobs', true);
    } catch (e) {
      recordTest('Context isolation between jobs', false, e.message);
    }

    // Test context reset after failure
    try {
      try {
        await runWithRLSContext(
          { tenantId: tenant1, userId: testUserId, dataScope: 'TENANT' },
          { jobName: 'test-failing-job' },
          async () => { throw new Error('Intentional failure'); }
        );
      } catch {
        // Expected
      }

      // Next job should work fine
      const result = await runWithRLSContext(
        { tenantId: tenant2, userId: testUserId, dataScope: 'TENANT' },
        { jobName: 'test-after-failure' },
        async (client) => {
          const r = await client.query(`SELECT current_setting('app.tenant_id', true) as tid`);
          return r.rows[0].tid;
        }
      );

      recordTest('Context reset after failure', result === tenant2);
    } catch (e) {
      recordTest('Context reset after failure', false, e.message);
    }

    // =========================================================================
    // TEST 5: Audit logging
    // =========================================================================
    console.log('\n--- TEST 5: Audit Logging ---');

    const uniqueJobName = `test-audit-${Date.now()}`;
    try {
      await runWithRLSContext(
        { tenantId: tenant1, userId: testUserId, dataScope: 'TENANT' },
        { jobName: uniqueJobName },
        async (client) => {
          await client.query('SELECT 1');
        }
      );

      // Wait for audit write
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check audit table
      const audit = await rlsWrapper.getJobAuditHistory({ jobName: uniqueJobName, limit: 1 });
      
      recordTest('Job execution logged to audit', audit.length > 0);
      if (audit.length > 0) {
        recordTest('Audit has correct status', audit[0].status === 'completed');
        recordTest('Audit has duration', audit[0].duration_ms > 0);
      }
    } catch (e) {
      recordTest('Audit logging', false, e.message);
    }

    // =========================================================================
    // TEST 6: RLS enforcement (tenant isolation)
    // =========================================================================
    console.log('\n--- TEST 6: RLS Enforcement ---');

    try {
      // Check if workflow_tasks has RLS and data
      const hasData = await adminPool.query(`
        SELECT COUNT(*) as count FROM workflow_tasks WHERE tenant_id IS NOT NULL
      `);
      
      if (parseInt(hasData.rows[0].count) > 0) {
        // Get a tenant with workflow_tasks data
        const tenantWithTasks = await adminPool.query(`
          SELECT tenant_id, COUNT(*) as count 
          FROM workflow_tasks 
          WHERE tenant_id IS NOT NULL 
          GROUP BY tenant_id 
          HAVING COUNT(*) > 0
          LIMIT 1
        `);

        if (tenantWithTasks.rows.length > 0) {
          const taskTenant = String(tenantWithTasks.rows[0].tenant_id);
          const otherTenant = taskTenant === tenant1 ? tenant2 : tenant1;

          // Try to access with different tenant context
          const result = await runWithRLSContext(
            { tenantId: otherTenant, userId: testUserId, dataScope: 'TENANT' },
            { jobName: 'test-rls-isolation' },
            async (client) => {
              const r = await client.query(`
                SELECT id FROM workflow_tasks WHERE tenant_id = $1 LIMIT 1
              `, [taskTenant]);
              return r.rows;
            }
          );

          recordTest('RLS blocks cross-tenant data access', result.length === 0);
        } else {
          console.log('   ⚠️  No tenant with workflow_tasks data - skipping RLS test');
        }
      } else {
        console.log('   ⚠️  No workflow_tasks data - skipping RLS enforcement test');
      }
    } catch (e) {
      // Error could indicate RLS is working
      recordTest('RLS enforcement', false, e.message);
    }

    // =========================================================================
    // TEST 7: TENANT scope works for regular jobs
    // =========================================================================
    console.log('\n--- TEST 7: TENANT Scope Works ---');

    try {
      const result = await runWithRLSContext(
        { tenantId: tenant1, userId: testUserId, dataScope: 'TENANT' },
        { jobName: 'test-tenant-scope-job' },
        async (client) => {
          const r = await client.query('SELECT COUNT(*) as count FROM clients');
          return parseInt(r.rows[0].count);
        }
      );
      
      recordTest('TENANT scope query succeeds', result >= 0);
    } catch (e) {
      recordTest('TENANT scope query succeeds', false, e.message);
    }

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error.message);
    process.exit(1);
  } finally {
    await rlsWrapper.close();
    await adminPool.end();
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('====================================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.tests.length}`);
  
  if (results.failed === 0) {
    console.log('\n🟢 ALL BACKGROUND JOB RLS TESTS PASSED');
  } else {
    console.log('\n🔴 SOME TESTS FAILED');
    console.log('\nFailed tests:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}: ${t.details}`);
    });
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
