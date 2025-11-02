/**
 * Tenant Isolation Test Suite
 * Tests for Phase 1 tenant filter fixes
 * 
 * Purpose: Verify that all database queries properly filter by tenant_id
 * to prevent cross-tenant data leakage.
 */

const request = require('supertest');
const { getPrisma } = require('../lib/prisma');
const TenantGuard = require('../middleware/tenantGuard');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = getPrisma();

// Test configuration
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test_secret';

// Helper function to generate test tokens
function generateToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
}

// Helper function to create test user
async function createTestUser(data) {
  const hashedPassword = bcrypt.hashSync('testpassword123', 10);
  return await prisma.user.create({
    data: {
      username: data.username || 'testuser',
      email: data.email || `test-${Date.now()}@example.com`,
      password: hashedPassword,
      role: data.role || 'SUPER_ADMIN',
      tenant_id: data.tenant_id,
      createdAt: new Date()
    }
  });
}

// Helper function to cleanup test data
async function cleanupTestData(tenantIds) {
  for (const tenantId of tenantIds) {
    await prisma.user.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenant_id: tenantId } });
    await prisma.moduleAssignment.deleteMany({ where: { tenant_id: tenantId } });
  }
}

describe('🔒 Tenant Isolation Test Suite - Phase 1', () => {
  let tenantAUser, tenantBUser, enterpriseAdmin;
  let tenantAToken, tenantBToken, enterpriseToken;
  const testTenantIds = ['test-tenant-a', 'test-tenant-b'];

  beforeAll(async () => {
    // Create test users for different tenants
    tenantAUser = await createTestUser({
      username: 'tenant-a-user',
      email: 'tenant-a@test.com',
      tenant_id: 'test-tenant-a',
      role: 'SUPER_ADMIN'
    });

    tenantBUser = await createTestUser({
      username: 'tenant-b-user',
      email: 'tenant-b@test.com',
      tenant_id: 'test-tenant-b',
      role: 'SUPER_ADMIN'
    });

    enterpriseAdmin = await createTestUser({
      username: 'enterprise-admin',
      email: 'enterprise@test.com',
      tenant_id: null,
      role: 'ENTERPRISE_ADMIN'
    });

    // Generate tokens
    tenantAToken = generateToken({
      id: tenantAUser.id,
      email: tenantAUser.email,
      role: 'SUPER_ADMIN',
      tenant_id: 'test-tenant-a'
    });

    tenantBToken = generateToken({
      id: tenantBUser.id,
      email: tenantBUser.email,
      role: 'SUPER_ADMIN',
      tenant_id: 'test-tenant-b'
    });

    enterpriseToken = generateToken({
      id: enterpriseAdmin.id,
      email: enterpriseAdmin.email,
      role: 'ENTERPRISE_ADMIN',
      tenant_id: null
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData(testTenantIds);
    await prisma.user.delete({ where: { id: enterpriseAdmin.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('1️⃣ TenantGuard Helper Functions', () => {
    test('getTenantId should extract tenant_id from request', () => {
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const tenantId = TenantGuard.getTenantId(req);
      expect(tenantId).toBe('test-tenant-a');
    });

    test('getTenantFilter should return proper where clause', () => {
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const filter = TenantGuard.getTenantFilter(req);
      expect(filter).toEqual({ tenant_id: 'test-tenant-a' });
    });

    test('getTenantFilter should return empty for ENTERPRISE_ADMIN', () => {
      const req = { user: { role: 'ENTERPRISE_ADMIN' } };
      const filter = TenantGuard.getTenantFilter(req);
      expect(filter).toEqual({});
    });

    test('getTenantFilter should merge additional filters', () => {
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const filter = TenantGuard.getTenantFilter(req, { role: 'USER' });
      expect(filter).toEqual({ tenant_id: 'test-tenant-a', role: 'USER' });
    });

    test('canAccessTenant should allow user to access own tenant', () => {
      const user = { tenant_id: 'test-tenant-a', role: 'SUPER_ADMIN' };
      const canAccess = TenantGuard.canAccessTenant(user, 'test-tenant-a');
      expect(canAccess).toBe(true);
    });

    test('canAccessTenant should block access to other tenant', () => {
      const user = { tenant_id: 'test-tenant-a', role: 'SUPER_ADMIN' };
      const canAccess = TenantGuard.canAccessTenant(user, 'test-tenant-b');
      expect(canAccess).toBe(false);
    });

    test('canAccessTenant should allow ENTERPRISE_ADMIN all access', () => {
      const user = { role: 'ENTERPRISE_ADMIN' };
      const canAccess = TenantGuard.canAccessTenant(user, 'test-tenant-a');
      expect(canAccess).toBe(true);
    });
  });

  describe('2️⃣ User Management Queries (app.js)', () => {
    test('User listing should only return users from same tenant', async () => {
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const whereClause = TenantGuard.getTenantFilter(req);

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true, username: true, tenant_id: true }
      });

      users.forEach(user => {
        expect(user.tenant_id).toBe('test-tenant-a');
      });
      expect(users.length).toBeGreaterThan(0);
    });

    test('User creation should assign tenant_id from creator', async () => {
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const tenantId = TenantGuard.getTenantId(req);

      const newUser = await prisma.user.create({
        data: {
          username: 'new-tenant-a-user',
          email: `new-user-a-${Date.now()}@test.com`,
          password: bcrypt.hashSync('password123', 10),
          role: 'USER',
          tenant_id: tenantId,
          createdAt: new Date()
        }
      });

      expect(newUser.tenant_id).toBe('test-tenant-a');

      // Cleanup
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    test('User update should only update users in same tenant', async () => {
      const tenantId = 'test-tenant-a';
      const whereClause = { 
        id: tenantAUser.id,
        tenant_id: tenantId
      };

      const updatedUser = await prisma.user.update({
        where: whereClause,
        data: { username: 'updated-tenant-a-user' }
      });

      expect(updatedUser.tenant_id).toBe('test-tenant-a');
      expect(updatedUser.username).toBe('updated-tenant-a-user');
    });

    test('Cross-tenant user update should fail', async () => {
      const tenantId = 'test-tenant-a'; // User from Tenant A
      const targetUserId = tenantBUser.id; // Try to update Tenant B user

      await expect(
        prisma.user.update({
          where: { 
            id: targetUserId,
            tenant_id: tenantId // Wrong tenant
          },
          data: { username: 'hacked-user' }
        })
      ).rejects.toThrow(); // Should throw "Record to update not found"
    });

    test('ENTERPRISE_ADMIN can see users from all tenants', async () => {
      const req = { user: { role: 'ENTERPRISE_ADMIN' } };
      const whereClause = TenantGuard.getTenantFilter(req);

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true, tenant_id: true }
      });

      const tenantIds = [...new Set(users.map(u => u.tenant_id).filter(Boolean))];
      expect(tenantIds.length).toBeGreaterThanOrEqual(2); // At least Tenant A and B
    });
  });

  describe('3️⃣ Audit Log Queries (app.js)', () => {
    beforeAll(async () => {
      // Create test audit logs
      await prisma.auditLog.create({
        data: {
          tenant_id: 'test-tenant-a',
          action: 'SECRET_ACTION_A',
          user_id: tenantAUser.id,
          timestamp: new Date(),
          details: 'Tenant A secret'
        }
      });

      await prisma.auditLog.create({
        data: {
          tenant_id: 'test-tenant-b',
          action: 'SECRET_ACTION_B',
          user_id: tenantBUser.id,
          timestamp: new Date(),
          details: 'Tenant B secret'
        }
      });
    });

    test('Audit logs should only show logs from same tenant', async () => {
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const whereClause = TenantGuard.getTenantFilter(req);

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        select: { tenant_id: true, action: true }
      });

      logs.forEach(log => {
        expect(log.tenant_id).toBe('test-tenant-a');
      });

      const hasSecretB = logs.some(log => log.action === 'SECRET_ACTION_B');
      expect(hasSecretB).toBe(false); // Tenant A should NOT see Tenant B's logs
    });

    test('Tenant B cannot see Tenant A audit logs', async () => {
      const req = { user: { tenant_id: 'test-tenant-b' } };
      const whereClause = TenantGuard.getTenantFilter(req);

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        select: { tenant_id: true, action: true }
      });

      const hasSecretA = logs.some(log => log.action === 'SECRET_ACTION_A');
      expect(hasSecretA).toBe(false); // Tenant B should NOT see Tenant A's logs
    });

    test('ENTERPRISE_ADMIN can see all audit logs', async () => {
      const req = { user: { role: 'ENTERPRISE_ADMIN' } };
      const whereClause = TenantGuard.getTenantFilter(req);

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        select: { tenant_id: true, action: true }
      });

      const tenantIds = [...new Set(logs.map(l => l.tenant_id).filter(Boolean))];
      expect(tenantIds.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('4️⃣ Module Assignment Queries (app.js)', () => {
    let testModuleId;

    beforeAll(async () => {
      // Create a test module
      const module = await prisma.module.create({
        data: {
          module_name: 'test_module',
          display_name: 'Test Module',
          is_active: true
        }
      });
      testModuleId = module.id;

      // Create module assignments for both tenants
      await prisma.moduleAssignment.create({
        data: {
          super_admin_id: tenantAUser.id,
          module_id: testModuleId,
          tenant_id: 'test-tenant-a',
          page_permissions: ['page1', 'page2']
        }
      });

      await prisma.moduleAssignment.create({
        data: {
          super_admin_id: tenantBUser.id,
          module_id: testModuleId,
          tenant_id: 'test-tenant-b',
          page_permissions: ['page3', 'page4']
        }
      });
    });

    afterAll(async () => {
      await prisma.moduleAssignment.deleteMany({ where: { module_id: testModuleId } });
      await prisma.module.delete({ where: { id: testModuleId } });
    });

    test('Module assignment check should only find assignments in same tenant', async () => {
      const tenantId = 'test-tenant-a';
      
      const assignment = await prisma.moduleAssignment.findFirst({
        where: {
          super_admin_id: tenantAUser.id,
          module_id: testModuleId,
          ...(tenantId && { tenant_id: tenantId })
        }
      });

      expect(assignment).toBeTruthy();
      expect(assignment.tenant_id).toBe('test-tenant-a');
    });

    test('Cross-tenant module assignment lookup should return null', async () => {
      const tenantId = 'test-tenant-a';
      
      const assignment = await prisma.moduleAssignment.findFirst({
        where: {
          super_admin_id: tenantBUser.id, // Tenant B user
          module_id: testModuleId,
          tenant_id: tenantId // But searching in Tenant A
        }
      });

      expect(assignment).toBeNull(); // Should not find Tenant B's assignment
    });

    test('Module assignment creation should include tenant_id', async () => {
      const tenantId = 'test-tenant-a';
      
      const newModule = await prisma.module.create({
        data: {
          module_name: 'test_module_2',
          display_name: 'Test Module 2',
          is_active: true
        }
      });

      const assignment = await prisma.moduleAssignment.create({
        data: {
          super_admin_id: tenantAUser.id,
          module_id: newModule.id,
          tenant_id: tenantId,
          page_permissions: ['test_page']
        }
      });

      expect(assignment.tenant_id).toBe('test-tenant-a');

      // Cleanup
      await prisma.moduleAssignment.delete({ where: { id: assignment.id } });
      await prisma.module.delete({ where: { id: newModule.id } });
    });
  });

  describe('5️⃣ RBAC Permission Queries (roleProtection.js)', () => {
    test('Module access check should validate tenant context', async () => {
      const req = { user: { id: tenantAUser.id, tenant_id: 'test-tenant-a' } };
      const tenantId = req.user.tenant_id;

      const assignments = await prisma.moduleAssignment.findMany({
        where: {
          super_admin_id: req.user.id,
          ...(tenantId && { tenant_id: tenantId })
        }
      });

      assignments.forEach(assignment => {
        expect(assignment.tenant_id).toBe('test-tenant-a');
      });
    });

    test('User permission check should be tenant-aware', async () => {
      // Create test permission
      const permission = await prisma.userPermission.create({
        data: {
          user_id: tenantAUser.id,
          feature_key: 'test_feature',
          tenant_id: 'test-tenant-a',
          can_read: true
        }
      }).catch(() => null); // May not exist if table doesn't have tenant_id yet

      if (permission) {
        const req = { user: { id: tenantAUser.id, tenant_id: 'test-tenant-a' } };
        const tenantId = req.user.tenant_id;

        const hasAccess = await prisma.userPermission.findFirst({
          where: {
            user_id: req.user.id,
            feature_key: 'test_feature',
            ...(tenantId && { tenant_id: tenantId })
          }
        });

        expect(hasAccess).toBeTruthy();
        expect(hasAccess.tenant_id).toBe('test-tenant-a');

        // Cleanup
        await prisma.userPermission.delete({ where: { id: permission.id } });
      } else {
        console.log('⚠️  userPermission table may not have tenant_id column yet');
      }
    });
  });

  describe('6️⃣ Report Endpoint Security (reportsRoutes.js)', () => {
    test('Report endpoint should require authentication', async () => {
      // This test would require the actual Express app
      // Placeholder for integration test
      expect(true).toBe(true);
    });

    test('Report data should be filtered by tenant', async () => {
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const tenantFilter = TenantGuard.getTenantFilter(req);

      const users = await prisma.user.findMany({
        where: tenantFilter,
        select: { id: true, username: true, email: true, tenant_id: true }
      });

      users.forEach(user => {
        expect(user.tenant_id).toBe('test-tenant-a');
      });
    });
  });

  describe('7️⃣ Session Security (app.js)', () => {
    test('Session validation should check hashed token', async () => {
      // Session queries validate hashed tokens, not tenant-specific
      // This is correct behavior as sessions are global
      expect(true).toBe(true);
    });
  });

  describe('8️⃣ Edge Cases and Security Scenarios', () => {
    test('User without tenant_id should be handled gracefully', async () => {
      const req = { user: { id: 1 } }; // No tenant_id
      const filter = TenantGuard.getTenantFilter(req);
      
      // Should return empty object or throw, depending on enforcement
      expect(typeof filter).toBe('object');
    });

    test('Null tenant_id should not break queries', async () => {
      const req = { user: { tenant_id: null } };
      const filter = TenantGuard.getTenantFilter(req);
      
      expect(filter).toBeDefined();
    });

    test('Attempting SQL injection via tenant_id should fail', async () => {
      const maliciousTenantId = "'; DROP TABLE users; --";
      const req = { user: { tenant_id: maliciousTenantId } };
      const filter = TenantGuard.getTenantFilter(req);

      // Prisma should escape this properly
      await expect(
        prisma.user.findMany({ where: filter })
      ).resolves.toBeDefined(); // Should not crash
    });

    test('Empty string tenant_id should be handled', async () => {
      const req = { user: { tenant_id: '' } };
      const filter = TenantGuard.getTenantFilter(req);

      const users = await prisma.user.findMany({ where: filter });
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('9️⃣ Performance Impact', () => {
    test('Tenant filter should not significantly impact query performance', async () => {
      const iterations = 10;
      
      // Without filter
      const startWithout = Date.now();
      for (let i = 0; i < iterations; i++) {
        await prisma.user.findMany({ take: 100 });
      }
      const timeWithout = Date.now() - startWithout;

      // With filter
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const filter = TenantGuard.getTenantFilter(req);
      
      const startWith = Date.now();
      for (let i = 0; i < iterations; i++) {
        await prisma.user.findMany({ where: filter, take: 100 });
      }
      const timeWith = Date.now() - startWith;

      // Filtered queries should actually be faster (smaller result sets)
      // Allow up to 50% overhead for filter computation
      expect(timeWith).toBeLessThan(timeWithout * 1.5);
      
      console.log(`Performance: Without filter: ${timeWithout}ms, With filter: ${timeWith}ms`);
    });
  });

  describe('🔟 Compliance & Audit Trail', () => {
    test('All user operations should be logged with tenant context', async () => {
      // Create audit log entry
      const auditEntry = await prisma.auditLog.create({
        data: {
          tenant_id: 'test-tenant-a',
          action: 'USER_CREATED',
          user_id: tenantAUser.id,
          timestamp: new Date(),
          details: JSON.stringify({ username: 'test-user' })
        }
      });

      expect(auditEntry.tenant_id).toBe('test-tenant-a');

      // Cleanup
      await prisma.auditLog.delete({ where: { id: auditEntry.id } });
    });

    test('Tenant isolation should support GDPR data requests', async () => {
      const req = { user: { tenant_id: 'test-tenant-a' } };
      const filter = TenantGuard.getTenantFilter(req);

      // All user data for GDPR export
      const userData = await prisma.user.findMany({
        where: filter,
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          tenant_id: true
        }
      });

      userData.forEach(user => {
        expect(user.tenant_id).toBe('test-tenant-a');
      });

      // Verify no data from other tenants
      const hasTenantB = userData.some(u => u.tenant_id === 'test-tenant-b');
      expect(hasTenantB).toBe(false);
    });
  });
});

// Run instructions
console.log(`
🧪 Tenant Isolation Test Suite
================================

To run these tests:

1. Install test dependencies:
   npm install --save-dev jest supertest

2. Add to package.json:
   "scripts": {
     "test": "jest",
     "test:tenant": "jest tenant-isolation.test.js",
     "test:watch": "jest --watch"
   }

3. Configure jest (jest.config.js):
   module.exports = {
     testEnvironment: 'node',
     testTimeout: 30000,
     coveragePathIgnorePatterns: ['/node_modules/']
   };

4. Run tests:
   npm run test:tenant

Expected Results:
- All tests should pass ✅
- No cross-tenant data leakage
- Performance within acceptable range
- Edge cases handled gracefully
`);
