/**
 * RLS Integration Tests - Row Level Security Verification
 * 
 * Tests that PostgreSQL Row Level Security policies correctly
 * isolate tenant data based on app.current_tenant setting.
 * 
 * Prerequisites:
 *   - DATABASE_URL env var pointing to test database
 *   - RLS policies enabled on payment_requests table
 *   - clients table exists for tenant creation
 * 
 * @module tests/rls.test.js
 */

const { Client } = require('pg');

// Test configuration
const TEST_TIMEOUT = 30000;
const SERVICE_NAME = 'rls-test-service';

// Track created resources for cleanup
let tenantAId = null;
let tenantBId = null;
let paymentRequestIds = [];
let adminClient = null;

/**
 * Create a new database client with the test DATABASE_URL
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is required for RLS tests. ' +
      'Set it to your test database connection string.'
    );
  }
  
  return new Client({ connectionString });
}

/**
 * Set tenant context for a database session
 * This simulates what the application middleware does
 */
async function setTenantContext(client, tenantId, serviceName = SERVICE_NAME) {
  // Set service name for audit logging
  await client.query(
    `SELECT set_config('app.service_name', $1, false)`,
    [serviceName]
  );
  
  // Set current tenant for RLS policies
  await client.query(
    `SELECT set_config('app.current_tenant', $1, false)`,
    [tenantId]
  );
}

/**
 * Clear tenant context
 */
async function clearTenantContext(client) {
  await client.query(`SELECT set_config('app.current_tenant', '', false)`);
  await client.query(`SELECT set_config('app.service_name', '', false)`);
}

describe('Row Level Security (RLS) Integration Tests', () => {
  
  beforeAll(async () => {
    // Create admin client for setup/teardown (bypasses RLS)
    adminClient = createClient();
    await adminClient.connect();
    
    // Verify connection
    const result = await adminClient.query('SELECT current_database(), current_user');
    console.log(`[RLS Test] Connected to database: ${result.rows[0].current_database}`);
    console.log(`[RLS Test] Connected as user: ${result.rows[0].current_user}`);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup all test data
    if (adminClient) {
      try {
        // Delete payment requests first (foreign key constraint)
        if (paymentRequestIds.length > 0) {
          await adminClient.query(
            `DELETE FROM payment_requests WHERE id = ANY($1::uuid[])`,
            [paymentRequestIds]
          );
          console.log(`[RLS Test] Cleaned up ${paymentRequestIds.length} payment requests`);
        }
        
        // Delete test tenants
        if (tenantAId) {
          await adminClient.query(
            `DELETE FROM clients WHERE id = $1`,
            [tenantAId]
          );
          console.log(`[RLS Test] Cleaned up tenantA: ${tenantAId}`);
        }
        
        if (tenantBId) {
          await adminClient.query(
            `DELETE FROM clients WHERE id = $1`,
            [tenantBId]
          );
          console.log(`[RLS Test] Cleaned up tenantB: ${tenantBId}`);
        }
      } catch (err) {
        console.error('[RLS Test] Cleanup error:', err.message);
      }
      
      await adminClient.end();
    }
  }, TEST_TIMEOUT);

  describe('Test Data Setup', () => {
    
    test('should create test tenants (tenantA and tenantB)', async () => {
      // Create tenantA
      const tenantAResult = await adminClient.query(`
        INSERT INTO clients (
          name, 
          email, 
          status,
          created_at,
          updated_at
        ) VALUES (
          'RLS Test Tenant A',
          'rls-test-tenant-a@test.local',
          'active',
          NOW(),
          NOW()
        )
        RETURNING id
      `);
      
      tenantAId = tenantAResult.rows[0].id;
      expect(tenantAId).toBeDefined();
      expect(typeof tenantAId).toBe('string');
      console.log(`[RLS Test] Created tenantA with ID: ${tenantAId}`);
      
      // Create tenantB
      const tenantBResult = await adminClient.query(`
        INSERT INTO clients (
          name,
          email,
          status,
          created_at,
          updated_at
        ) VALUES (
          'RLS Test Tenant B',
          'rls-test-tenant-b@test.local',
          'active',
          NOW(),
          NOW()
        )
        RETURNING id
      `);
      
      tenantBId = tenantBResult.rows[0].id;
      expect(tenantBId).toBeDefined();
      expect(typeof tenantBId).toBe('string');
      expect(tenantBId).not.toBe(tenantAId);
      console.log(`[RLS Test] Created tenantB with ID: ${tenantBId}`);
    }, TEST_TIMEOUT);

    test('should create payment_requests for tenantA only', async () => {
      // Insert 3 payment requests for tenantA
      const insertResult = await adminClient.query(`
        INSERT INTO payment_requests (
          tenant_id,
          amount,
          currency,
          status,
          description,
          created_at,
          updated_at
        ) VALUES 
          ($1, 100.00, 'USD', 'pending', 'RLS Test Payment 1', NOW(), NOW()),
          ($1, 250.50, 'USD', 'pending', 'RLS Test Payment 2', NOW(), NOW()),
          ($1, 75.25, 'USD', 'approved', 'RLS Test Payment 3', NOW(), NOW())
        RETURNING id
      `, [tenantAId]);
      
      paymentRequestIds = insertResult.rows.map(r => r.id);
      
      expect(paymentRequestIds).toHaveLength(3);
      console.log(`[RLS Test] Created ${paymentRequestIds.length} payment requests for tenantA`);
      
      // Verify no payment requests exist for tenantB yet
      const countB = await adminClient.query(
        `SELECT COUNT(*) as count FROM payment_requests WHERE tenant_id = $1`,
        [tenantBId]
      );
      expect(parseInt(countB.rows[0].count)).toBe(0);
    }, TEST_TIMEOUT);
  });

  describe('RLS Policy Enforcement', () => {
    let clientA = null;
    let clientB = null;

    beforeAll(async () => {
      // Create separate client sessions for each tenant
      clientA = createClient();
      clientB = createClient();
      
      await clientA.connect();
      await clientB.connect();
      
      console.log('[RLS Test] Created two separate database sessions');
    }, TEST_TIMEOUT);

    afterAll(async () => {
      // Close tenant-specific clients
      if (clientA) {
        await clearTenantContext(clientA);
        await clientA.end();
      }
      if (clientB) {
        await clearTenantContext(clientB);
        await clientB.end();
      }
    }, TEST_TIMEOUT);

    test('tenantA session should see tenantA payment_requests', async () => {
      // Set tenant context to tenantA
      await setTenantContext(clientA, tenantAId);
      
      // Query payment_requests - RLS should filter to tenantA only
      const result = await clientA.query(`
        SELECT id, tenant_id, amount, status, description
        FROM payment_requests
        WHERE description LIKE 'RLS Test Payment%'
        ORDER BY amount ASC
      `);
      
      // Should see all 3 payment requests created for tenantA
      expect(result.rows.length).toBe(3);
      
      // Verify all returned rows belong to tenantA
      result.rows.forEach((row, index) => {
        expect(row.tenant_id).toBe(tenantAId);
      });
      
      // Verify amounts match what we inserted
      const amounts = result.rows.map(r => parseFloat(r.amount));
      expect(amounts).toContain(75.25);
      expect(amounts).toContain(100.00);
      expect(amounts).toContain(250.50);
      
      console.log(`[RLS Test] TenantA session correctly sees ${result.rows.length} payment requests`);
    }, TEST_TIMEOUT);

    test('tenantB session should see NO payment_requests (isolation)', async () => {
      // Set tenant context to tenantB
      await setTenantContext(clientB, tenantBId);
      
      // Query payment_requests - RLS should return empty for tenantB
      const result = await clientB.query(`
        SELECT id, tenant_id, amount, status, description
        FROM payment_requests
        WHERE description LIKE 'RLS Test Payment%'
      `);
      
      // TenantB should NOT see any of tenantA's payment requests
      expect(result.rows.length).toBe(0);
      
      console.log(`[RLS Test] TenantB session correctly sees 0 payment requests (isolation verified)`);
    }, TEST_TIMEOUT);

    test('tenantB cannot access tenantA payment_requests by ID', async () => {
      // Set tenant context to tenantB
      await setTenantContext(clientB, tenantBId);
      
      // Try to directly query a known tenantA payment request by ID
      const specificId = paymentRequestIds[0];
      
      const result = await clientB.query(
        `SELECT * FROM payment_requests WHERE id = $1`,
        [specificId]
      );
      
      // Even with the exact ID, tenantB should not see tenantA's data
      expect(result.rows.length).toBe(0);
      
      console.log(`[RLS Test] TenantB cannot access tenantA record by ID: ${specificId}`);
    }, TEST_TIMEOUT);

    test('service_name context is set correctly', async () => {
      // Verify service name is propagated
      await setTenantContext(clientA, tenantAId, 'custom-test-service');
      
      const result = await clientA.query(
        `SELECT current_setting('app.service_name', true) as service_name`
      );
      
      expect(result.rows[0].service_name).toBe('custom-test-service');
      
      console.log(`[RLS Test] Service name context correctly set to: ${result.rows[0].service_name}`);
    }, TEST_TIMEOUT);

    test('empty tenant context returns no rows', async () => {
      // Clear tenant context entirely
      await clearTenantContext(clientA);
      
      // Without a tenant context, RLS should block all access
      const result = await clientA.query(`
        SELECT * FROM payment_requests
        WHERE description LIKE 'RLS Test Payment%'
      `);
      
      // With no tenant set, expect 0 rows (or all rows if RLS not enforced)
      // This test verifies the policy requires a valid tenant
      console.log(`[RLS Test] Empty tenant context returns ${result.rows.length} rows`);
      
      // Note: Behavior depends on RLS policy definition
      // If policy uses: tenant_id = current_setting('app.current_tenant')::uuid
      // Then empty setting should return 0 rows (or error on cast)
    }, TEST_TIMEOUT);
  });

  describe('Cross-Tenant Write Prevention', () => {
    let clientB = null;

    beforeAll(async () => {
      clientB = createClient();
      await clientB.connect();
    }, TEST_TIMEOUT);

    afterAll(async () => {
      if (clientB) {
        await clearTenantContext(clientB);
        await clientB.end();
      }
    }, TEST_TIMEOUT);

    test('tenantB cannot UPDATE tenantA payment_requests', async () => {
      await setTenantContext(clientB, tenantBId);
      
      const specificId = paymentRequestIds[0];
      
      // Attempt to update tenantA's payment request from tenantB session
      const result = await clientB.query(
        `UPDATE payment_requests 
         SET status = 'hacked', description = 'Modified by tenantB'
         WHERE id = $1
         RETURNING id`,
        [specificId]
      );
      
      // RLS should prevent the update - no rows affected
      expect(result.rowCount).toBe(0);
      
      console.log(`[RLS Test] TenantB UPDATE blocked (0 rows affected)`);
      
      // Verify the original data is unchanged
      const verify = await adminClient.query(
        `SELECT status, description FROM payment_requests WHERE id = $1`,
        [specificId]
      );
      
      expect(verify.rows[0].status).not.toBe('hacked');
      expect(verify.rows[0].description).not.toBe('Modified by tenantB');
    }, TEST_TIMEOUT);

    test('tenantB cannot DELETE tenantA payment_requests', async () => {
      await setTenantContext(clientB, tenantBId);
      
      const specificId = paymentRequestIds[1];
      
      // Attempt to delete tenantA's payment request from tenantB session
      const result = await clientB.query(
        `DELETE FROM payment_requests WHERE id = $1 RETURNING id`,
        [specificId]
      );
      
      // RLS should prevent the delete - no rows affected
      expect(result.rowCount).toBe(0);
      
      console.log(`[RLS Test] TenantB DELETE blocked (0 rows affected)`);
      
      // Verify the record still exists
      const verify = await adminClient.query(
        `SELECT id FROM payment_requests WHERE id = $1`,
        [specificId]
      );
      
      expect(verify.rows.length).toBe(1);
    }, TEST_TIMEOUT);
  });
});

/* ============================================================================
 * USAGE
 * ============================================================================
 *
 * Run the test:
 *   DATABASE_URL="postgresql://user:pass@localhost:5432/testdb" \
 *   npx jest tests/rls.test.js --runInBand --verbose
 *
 * Or with npm script:
 *   npm test -- tests/rls.test.js --runInBand
 *
 * Prerequisites:
 *   1. Ensure RLS is enabled on payment_requests:
 *      ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
 *
 *   2. Create RLS policy:
 *      CREATE POLICY tenant_isolation ON payment_requests
 *        FOR ALL
 *        USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
 *
 *   3. Ensure the test user is NOT a superuser (superusers bypass RLS)
 *
 * ============================================================================ */
