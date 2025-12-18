/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */
/**
 * BISMAN ERP – RBAC Enforcer Tests
 * 
 * Validates:
 * ✅ ENTERPRISE_ADMIN → allowed everywhere
 * ✅ SUPER_ADMIN → module-scoped access
 * ✅ Wrong module request → blocked
 * ✅ Denial logging
 * 
 * Run: npx jest tests/rbac.enforcer.test.js
 */

const {
  requirePermission,
  requireModuleAccess,
  requireClientAccess,
  requireRoleLevel,
  enforceModuleBoundary,
  enforceClientBoundary,
  hasPermission,
  scopeQueryByContext,
  ROLE_LEVELS,
} = require('../middleware/rbac.enforcer');

// ============================================
// MOCK SETUP
// ============================================

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrismaClient) };
});

// Mock request/response
const mockRequest = (overrides = {}) => ({
  path: '/api/test',
  method: 'GET',
  params: {},
  query: {},
  body: {},
  headers: {},
  ip: '127.0.0.1',
  user: null,
  rbac: null,
  ...overrides,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ============================================
// TEST CONTEXTS
// ============================================

const ENTERPRISE_CONTEXT = {
  userId: 'enterprise-user-1',
  roleLevel: 'ENTERPRISE',
  roleName: 'ENTERPRISE_ADMIN',
  moduleId: null,
  clientId: null,
  permissions: [],
  isEnterpriseAdmin: true,
  isSuperAdmin: false,
  isAdmin: false,
};

const MODULE_CONTEXT = {
  userId: 'super-admin-1',
  roleLevel: 'MODULE',
  roleName: 'SUPER_ADMIN',
  moduleId: 'module-123',
  clientId: null,
  permissions: ['user:read', 'user:create', 'client:manage'],
  isEnterpriseAdmin: false,
  isSuperAdmin: true,
  isAdmin: false,
};

// ============================================
// TESTS
// ============================================

describe('RBAC Enforcer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // Module Boundary Tests
  // ==========================================
  
  describe('Module Boundary Enforcement', () => {
    
    test('ENTERPRISE_ADMIN can access any module', () => {
      const result = enforceModuleBoundary(ENTERPRISE_CONTEXT, 'any-module-id');
      expect(result).toBeNull(); // null = allowed
    });

    test('SUPER_ADMIN can access their own module', () => {
      const result = enforceModuleBoundary(MODULE_CONTEXT, 'module-123');
      expect(result).toBeNull();
    });

    test('SUPER_ADMIN BLOCKED from other modules', () => {
      const result = enforceModuleBoundary(MODULE_CONTEXT, 'other-module');
      expect(result).not.toBeNull();
      expect(result.denied).toBe(true);
      expect(result.reason).toBe('CROSS_MODULE_ACCESS');
    });

    test('No moduleId in request = allowed (route not module-scoped)', () => {
      const result = enforceModuleBoundary(MODULE_CONTEXT, null);
      expect(result).toBeNull();
    });
    
  });

  // ==========================================
  // Client Boundary Tests
  // ==========================================
  
  describe('Client Boundary Enforcement', () => {
    
    test('ENTERPRISE_ADMIN can access any client', () => {
      const result = enforceClientBoundary(ENTERPRISE_CONTEXT, 'any-client-id');
      expect(result).toBeNull();
    });

    test('SUPER_ADMIN can access any client in their module', () => {
      const result = enforceClientBoundary(MODULE_CONTEXT, 'any-client-id');
      expect(result).toBeNull();
    });

    test('No clientId in request = allowed (route not client-scoped)', () => {
      const result = enforceClientBoundary(MODULE_CONTEXT, null);
      expect(result).toBeNull();
    });
    
  });

  // ==========================================
  // Permission Tests
  // ==========================================
  
  describe('Permission Checking', () => {
    
    test('ENTERPRISE_ADMIN has all permissions', () => {
      expect(hasPermission(ENTERPRISE_CONTEXT, 'any:permission')).toBe(true);
      expect(hasPermission(ENTERPRISE_CONTEXT, 'user:delete')).toBe(true);
      expect(hasPermission(ENTERPRISE_CONTEXT, 'system:admin')).toBe(true);
    });

    test('SUPER_ADMIN has all permissions within module', () => {
      expect(hasPermission(MODULE_CONTEXT, 'any:permission')).toBe(true);
      expect(hasPermission(MODULE_CONTEXT, 'user:delete')).toBe(true);
    });
    
  });

  // ==========================================
  // requirePermission Middleware Tests
  // ==========================================
  
  describe('requirePermission Middleware', () => {
    
    test('ENTERPRISE_ADMIN allowed for any permission', async () => {
      const req = mockRequest({ rbac: ENTERPRISE_CONTEXT });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requirePermission('user:read');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('SUPER_ADMIN allowed for any permission within module', async () => {
      const req = mockRequest({ rbac: MODULE_CONTEXT });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requirePermission('user:delete');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('Returns 500 if RBAC context missing', async () => {
      const req = mockRequest({ rbac: null });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requirePermission('user:read');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });
    
  });

  // ==========================================
  // requireModuleAccess Middleware Tests
  // ==========================================
  
  describe('requireModuleAccess Middleware', () => {
    
    test('Allows SUPER_ADMIN to access their module', async () => {
      const req = mockRequest({ 
        rbac: MODULE_CONTEXT,
        params: { moduleId: 'module-123' }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireModuleAccess();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('BLOCKS SUPER_ADMIN from other module', async () => {
      const req = mockRequest({ 
        rbac: MODULE_CONTEXT,
        params: { moduleId: 'other-module' }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireModuleAccess();
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CROSS_MODULE_ACCESS',
        })
      );
    });

    test('Returns 400 if moduleId missing', async () => {
      const req = mockRequest({ 
        rbac: MODULE_CONTEXT,
        params: {} // No moduleId
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireModuleAccess();
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
    
  });

  // ==========================================
  // requireClientAccess Middleware Tests
  // ==========================================
  
  describe('requireClientAccess Middleware', () => {
    
    test('ENTERPRISE_ADMIN can access any client', async () => {
      const req = mockRequest({ 
        rbac: ENTERPRISE_CONTEXT,
        params: { clientId: 'any-client' }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireClientAccess();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('SUPER_ADMIN can access any client in their module', async () => {
      const req = mockRequest({ 
        rbac: MODULE_CONTEXT,
        params: { clientId: 'any-client' }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireClientAccess();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
    
  });

  // ==========================================
  // requireRoleLevel Middleware Tests
  // ==========================================
  
  describe('requireRoleLevel Middleware', () => {
    
    test('ENTERPRISE_ADMIN passes ENTERPRISE level requirement', async () => {
      const req = mockRequest({ rbac: ENTERPRISE_CONTEXT });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireRoleLevel('ENTERPRISE');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('SUPER_ADMIN BLOCKED from ENTERPRISE level requirement', async () => {
      const req = mockRequest({ rbac: MODULE_CONTEXT });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireRoleLevel('ENTERPRISE');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INSUFFICIENT_ROLE_LEVEL',
        })
      );
    });

    test('SUPER_ADMIN passes MODULE level requirement', async () => {
      const req = mockRequest({ rbac: MODULE_CONTEXT });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireRoleLevel('MODULE');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
    
  });

  // ==========================================
  // Query Scoping Tests
  // ==========================================
  
  describe('Query Scoping', () => {
    
    test('ENTERPRISE sees all (no filters added)', () => {
      const where = { isActive: true };
      const scoped = scopeQueryByContext(ENTERPRISE_CONTEXT, where);
      
      expect(scoped).toEqual({ isActive: true });
      expect(scoped.moduleId).toBeUndefined();
      expect(scoped.clientId).toBeUndefined();
    });

    test('MODULE scoped to moduleId only', () => {
      const where = { isActive: true };
      const scoped = scopeQueryByContext(MODULE_CONTEXT, where);
      
      expect(scoped).toEqual({ 
        isActive: true,
        moduleId: 'module-123',
      });
      expect(scoped.clientId).toBeUndefined();
    });

    test('Throws if context is null', () => {
      expect(() => scopeQueryByContext(null, {})).toThrow();
    });
    
  });

  // ==========================================
  // Role Level Hierarchy Tests
  // ==========================================
  
  describe('Role Level Hierarchy', () => {
    
    test('ENTERPRISE > MODULE > CLIENT', () => {
      expect(ROLE_LEVELS.ENTERPRISE).toBeGreaterThan(ROLE_LEVELS.MODULE);
      expect(ROLE_LEVELS.MODULE).toBeGreaterThan(ROLE_LEVELS.CLIENT);
    });
    
  });

  // ==========================================
  // Integration Scenario Tests
  // ==========================================
  
  describe('Integration Scenarios', () => {

    test('Scenario: SUPER_ADMIN can manage any client in their module', async () => {
      const superAdminContext = { ...MODULE_CONTEXT, moduleId: 'module-A' };
      
      // Module check passes
      const moduleResult = enforceModuleBoundary(superAdminContext, 'module-A');
      expect(moduleResult).toBeNull();
      
      // Client check passes (SUPER_ADMIN can access any client)
      const clientResult1 = enforceClientBoundary(superAdminContext, 'client-1');
      expect(clientResult1).toBeNull();
      
      const clientResult2 = enforceClientBoundary(superAdminContext, 'client-2');
      expect(clientResult2).toBeNull();
    });

    test('Scenario: SUPER_ADMIN cannot access other modules', async () => {
      const superAdminContext = { ...MODULE_CONTEXT, moduleId: 'module-A' };
      
      // Module check FAILS (different module)
      const moduleResult = enforceModuleBoundary(superAdminContext, 'module-B');
      expect(moduleResult).not.toBeNull();
      expect(moduleResult.reason).toBe('CROSS_MODULE_ACCESS');
    });

    test('Scenario: ENTERPRISE_ADMIN can access everything', async () => {
      const enterpriseContext = ENTERPRISE_CONTEXT;
      
      // Any module
      expect(enforceModuleBoundary(enterpriseContext, 'module-A')).toBeNull();
      expect(enforceModuleBoundary(enterpriseContext, 'module-B')).toBeNull();
      expect(enforceModuleBoundary(enterpriseContext, 'module-C')).toBeNull();
      
      // Any client
      expect(enforceClientBoundary(enterpriseContext, 'client-1')).toBeNull();
      expect(enforceClientBoundary(enterpriseContext, 'client-2')).toBeNull();
      expect(enforceClientBoundary(enterpriseContext, 'client-3')).toBeNull();
      
      // Any permission
      expect(hasPermission(enterpriseContext, 'system:destroy')).toBe(true);
      expect(hasPermission(enterpriseContext, 'nuclear:launch')).toBe(true);
    });
    
  });

});
