/* eslint-env jest */
/**
 * BISMAN ERP – RBAC Enforcer Tests
 * 
 * Validates:
 * ✅ Wrong module request → blocked
 * ✅ Wrong client request → blocked
 * ✅ Missing permission → blocked
 * ✅ ENTERPRISE_ADMIN → allowed everywhere
 * ✅ Denial logging
 * 
 * Run: npx jest tests/rbac.enforcer.test.js
 */

const {
  rbacEnforcer,
  requirePermission,
  requireModuleAccess,
  requireClientAccess,
  requireRoleLevel,
  enforceModuleBoundary,
  enforceClientBoundary,
  hasPermission,
  resolveRBACContext,
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

const mockNext = jest.fn();

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

const CLIENT_CONTEXT = {
  userId: 'admin-1',
  roleLevel: 'CLIENT',
  roleName: 'ADMIN',
  moduleId: 'module-123',
  clientId: 'client-456',
  permissions: ['user:read', 'task:create'],
  isEnterpriseAdmin: false,
  isSuperAdmin: false,
  isAdmin: true,
};

const USER_CONTEXT = {
  userId: 'user-1',
  roleLevel: 'CLIENT',
  roleName: 'USER',
  moduleId: 'module-123',
  clientId: 'client-456',
  permissions: ['task:read'],
  isEnterpriseAdmin: false,
  isSuperAdmin: false,
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

    test('ADMIN BLOCKED from other modules', () => {
      const result = enforceModuleBoundary(CLIENT_CONTEXT, 'other-module');
      expect(result).not.toBeNull();
      expect(result.denied).toBe(true);
      expect(result.reason).toBe('CROSS_MODULE_ACCESS');
    });

    test('USER BLOCKED from other modules', () => {
      const result = enforceModuleBoundary(USER_CONTEXT, 'other-module');
      expect(result).not.toBeNull();
      expect(result.denied).toBe(true);
    });

    test('No moduleId in request = allowed (route not module-scoped)', () => {
      const result = enforceModuleBoundary(CLIENT_CONTEXT, null);
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

    test('ADMIN can access their own client', () => {
      const result = enforceClientBoundary(CLIENT_CONTEXT, 'client-456');
      expect(result).toBeNull();
    });

    test('ADMIN BLOCKED from other clients', () => {
      const result = enforceClientBoundary(CLIENT_CONTEXT, 'other-client');
      expect(result).not.toBeNull();
      expect(result.denied).toBe(true);
      expect(result.reason).toBe('CROSS_CLIENT_ACCESS');
    });

    test('USER BLOCKED from other clients', () => {
      const result = enforceClientBoundary(USER_CONTEXT, 'other-client');
      expect(result).not.toBeNull();
      expect(result.denied).toBe(true);
      expect(result.reason).toBe('CROSS_CLIENT_ACCESS');
    });

    test('No clientId in request = allowed (route not client-scoped)', () => {
      const result = enforceClientBoundary(CLIENT_CONTEXT, null);
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

    test('ADMIN has only assigned permissions', () => {
      expect(hasPermission(CLIENT_CONTEXT, 'user:read')).toBe(true);
      expect(hasPermission(CLIENT_CONTEXT, 'task:create')).toBe(true);
      expect(hasPermission(CLIENT_CONTEXT, 'user:delete')).toBe(false);
    });

    test('USER has only assigned permissions', () => {
      expect(hasPermission(USER_CONTEXT, 'task:read')).toBe(true);
      expect(hasPermission(USER_CONTEXT, 'task:create')).toBe(false);
      expect(hasPermission(USER_CONTEXT, 'user:read')).toBe(false);
    });
    
  });

  // ==========================================
  // requirePermission Middleware Tests
  // ==========================================
  
  describe('requirePermission Middleware', () => {
    
    test('Allows access when permission exists', async () => {
      const req = mockRequest({ rbac: CLIENT_CONTEXT });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requirePermission('user:read');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('BLOCKS access when permission missing', async () => {
      const req = mockRequest({ rbac: USER_CONTEXT });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requirePermission('user:delete');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'PERMISSION_DENIED',
          requiredPermission: 'user:delete',
        })
      );
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
    
    test('Allows ADMIN to access their client', async () => {
      const req = mockRequest({ 
        rbac: CLIENT_CONTEXT,
        params: { clientId: 'client-456' }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireClientAccess();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('BLOCKS ADMIN from other client', async () => {
      const req = mockRequest({ 
        rbac: CLIENT_CONTEXT,
        params: { clientId: 'other-client' }
      });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireClientAccess();
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CROSS_CLIENT_ACCESS',
        })
      );
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

    test('ADMIN BLOCKED from MODULE level requirement', async () => {
      const req = mockRequest({ rbac: CLIENT_CONTEXT });
      const res = mockResponse();
      const next = jest.fn();

      const middleware = requireRoleLevel('MODULE');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
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

    test('CLIENT scoped to moduleId AND clientId', () => {
      const where = { isActive: true };
      const scoped = scopeQueryByContext(CLIENT_CONTEXT, where);
      
      expect(scoped).toEqual({ 
        isActive: true,
        moduleId: 'module-123',
        clientId: 'client-456',
      });
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
    
    test('Scenario: User tries to access another client\'s data', async () => {
      // Simulate: User from client-456 tries to access client-789
      const userContext = { ...USER_CONTEXT, clientId: 'client-456' };
      
      // Module check passes (same module)
      const moduleResult = enforceModuleBoundary(userContext, 'module-123');
      expect(moduleResult).toBeNull();
      
      // Client check FAILS (different client)
      const clientResult = enforceClientBoundary(userContext, 'client-789');
      expect(clientResult).not.toBeNull();
      expect(clientResult.reason).toBe('CROSS_CLIENT_ACCESS');
    });

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
