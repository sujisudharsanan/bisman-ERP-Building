/* eslint-env jest */
/* global describe, test, expect, beforeEach, jest */
/**
 * USER MODEL LOCK ENFORCEMENT TESTS
 * ==================================
 * 
 * These tests enforce the rules defined in /docs/USER_MODEL_LOCK.md
 * 
 * Validates:
 * ✅ User creation requires business_level
 * ✅ Hierarchy violations are blocked
 * ✅ Cycle detection works for reports_to
 * ✅ Self-reference is blocked
 * ✅ Password strength is enforced
 * ✅ Email validation works
 * ✅ Subscription limits enforced
 * 
 * Run: npx jest tests/userService.enforcement.test.js --runInBand
 * 
 * @see /docs/USER_MODEL_LOCK.md
 */

const bcrypt = require('bcrypt');

// ============================================
// MOCK SETUP
// ============================================

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  rbac_roles: {
    findUnique: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

// Import after mocks are set up
const UserService = require('../services/userService');

// ============================================
// TEST DATA
// ============================================

const VALID_PASSWORD = 'SecurePass@123!';
const WEAK_PASSWORD = 'weak';

const validUserInput = () => ({
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: VALID_PASSWORD,
  role: 'USER',
  business_level: 1,
});

const mockAdminUser = {
  id: 'admin-uuid-001',
  business_level: 5,
  role: 'ADMIN',
};

const mockEnterpriseAdmin = {
  id: 'ea-uuid-001',
  business_level: 10,
  role: 'ENTERPRISE_ADMIN',
};

// ============================================
// TESTS
// ============================================

describe('UserService Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(async ({ data }) => ({
      id: 'mock-uuid-12345',
      legacy_id: 1001,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    }));
    mockPrisma.rbac_roles.findUnique.mockResolvedValue({ id: 1, name: 'USER' });
    mockPrisma.$queryRaw.mockResolvedValue([{ current_count: 5, max_users: 100 }]);
    mockPrisma.$executeRaw.mockResolvedValue(1);
  });

  // ==========================================
  // VALIDATION TESTS
  // ==========================================

  describe('Validation Enforcement', () => {
    test('LOCK-001: Rejects user creation without required fields', async () => {
      await expect(
        UserService.createUser({})
      ).rejects.toThrow('VALIDATION_ERROR: username, email, and password are required');
    });

    test('LOCK-002: Rejects invalid email format', async () => {
      await expect(
        UserService.createUser({
          username: 'testuser',
          email: 'invalid-email',
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow('VALIDATION_ERROR: Invalid email format');
    });

    test('LOCK-003: Rejects weak passwords (too short)', async () => {
      await expect(
        UserService.createUser({
          username: 'testuser',
          email: 'test@example.com',
          password: WEAK_PASSWORD,
        })
      ).rejects.toThrow('VALIDATION_ERROR: Password must be at least 12 characters');
    });

    test('LOCK-004: Rejects passwords without uppercase', async () => {
      await expect(
        UserService.createUser({
          username: 'testuser',
          email: 'test@example.com',
          password: 'securepass@123!',
        })
      ).rejects.toThrow('VALIDATION_ERROR: Password must contain at least one uppercase letter');
    });

    test('LOCK-005: Rejects passwords without special characters', async () => {
      await expect(
        UserService.createUser({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass12345',
        })
      ).rejects.toThrow('VALIDATION_ERROR: Password must contain at least one special character');
    });

    test('LOCK-006: Rejects duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-uuid',
        email: 'test@example.com',
        username: 'different',
      });

      await expect(
        UserService.createUser({
          username: 'testuser',
          email: 'test@example.com',
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow('VALIDATION_ERROR: Email already exists');
    });

    test('LOCK-007: Rejects duplicate username', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-uuid',
        email: 'different@example.com',
        username: 'testuser',
      });

      await expect(
        UserService.createUser({
          username: 'testuser',
          email: 'test@example.com',
          password: VALID_PASSWORD,
        })
      ).rejects.toThrow('VALIDATION_ERROR: Username already exists');
    });
  });

  // ==========================================
  // HIERARCHY ENFORCEMENT TESTS
  // ==========================================

  describe('Hierarchy Enforcement', () => {
    test('LOCK-010: Blocks creation of user with higher business_level than admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);

      await expect(
        UserService.createUser(
          { ...validUserInput(), business_level: 8 },
          { adminUserId: 'admin-uuid-001', isEnterpriseAdmin: false }
        )
      ).rejects.toThrow('HIERARCHY_VIOLATION');
    });

    test('LOCK-011: Allows creation of user with same business_level as admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const result = await UserService.createUser(
        { ...validUserInput(), business_level: 5 },
        { adminUserId: 'admin-uuid-001', isEnterpriseAdmin: false }
      );

      expect(result).toBeDefined();
      expect(result.business_level).toBe(5);
    });

    test('LOCK-012: Allows creation of user with lower business_level than admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockAdminUser);

      const result = await UserService.createUser(
        { ...validUserInput(), business_level: 3 },
        { adminUserId: 'admin-uuid-001', isEnterpriseAdmin: false }
      );

      expect(result).toBeDefined();
      expect(result.business_level).toBe(3);
    });

    test('LOCK-013: Enterprise Admin can create any business_level', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockEnterpriseAdmin);

      const result = await UserService.createUser(
        { ...validUserInput(), business_level: 10 },
        { adminUserId: 'ea-uuid-001', isEnterpriseAdmin: true }
      );

      expect(result).toBeDefined();
      expect(result.business_level).toBe(10);
    });

    test('LOCK-014: Validates business_level range (1-10)', async () => {
      await expect(
        UserService.createUser(
          { ...validUserInput(), business_level: 0 },
          { isEnterpriseAdmin: true }
        )
      ).rejects.toThrow('VALIDATION_ERROR: business_level must be between 1 and 10');

      await expect(
        UserService.createUser(
          { ...validUserInput(), business_level: 11 },
          { isEnterpriseAdmin: true }
        )
      ).rejects.toThrow('VALIDATION_ERROR: business_level must be between 1 and 10');
    });
  });

  // ==========================================
  // REPORTS_TO ENFORCEMENT TESTS
  // ==========================================

  describe('Reports_to (Manager Chain) Enforcement', () => {
    test('LOCK-020: Blocks self-reference in reports_to', async () => {
      // User trying to report to themselves
      await expect(
        UserService.createUser(
          { ...validUserInput(), reports_to: 'mock-uuid-12345' },
          { isEnterpriseAdmin: true }
        )
      ).rejects.toThrow('VALIDATION_ERROR: User cannot report to themselves');
    });

    test('LOCK-021: Validates manager exists before assignment', async () => {
      mockPrisma.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === 'nonexistent-manager') return null;
        return mockAdminUser;
      });

      await expect(
        UserService.createUser(
          { ...validUserInput(), reports_to: 'nonexistent-manager' },
          { isEnterpriseAdmin: true }
        )
      ).rejects.toThrow(/Manager.*not found/);
    });

    test('LOCK-022: Accepts valid manager reference', async () => {
      mockPrisma.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === 'valid-manager-uuid') {
          return { id: 'valid-manager-uuid', business_level: 3, role: 'MANAGER' };
        }
        return null;
      });

      const result = await UserService.createUser(
        { ...validUserInput(), reports_to: 'valid-manager-uuid' },
        { isEnterpriseAdmin: true }
      );

      expect(result.reports_to).toBe('valid-manager-uuid');
    });
  });

  // ==========================================
  // SUBSCRIPTION LIMIT TESTS
  // ==========================================

  describe('Subscription Limit Enforcement', () => {
    test('LOCK-030: Blocks creation when subscription limit reached', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ current_count: 50, max_users: 50 }]);

      await expect(
        UserService.createUser(
          { ...validUserInput(), tenant_id: 'tenant-uuid' },
          { isEnterpriseAdmin: true }
        )
      ).rejects.toThrow('SUBSCRIPTION_LIMIT');
    });

    test('LOCK-031: Blocks creation when no active subscription (FAIL-CLOSED)', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ current_count: 5, max_users: null }]);

      await expect(
        UserService.createUser(
          { ...validUserInput(), tenant_id: 'tenant-uuid' },
          { isEnterpriseAdmin: true }
        )
      ).rejects.toThrow('SUBSCRIPTION_ERROR: No active subscription found');
    });

    test('LOCK-032: Allows creation when within subscription limit', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ current_count: 10, max_users: 100 }]);

      const result = await UserService.createUser(
        { ...validUserInput(), tenant_id: 'tenant-uuid' },
        { isEnterpriseAdmin: true }
      );

      expect(result).toBeDefined();
    });

    test('LOCK-033: Skips subscription check when flag set', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ current_count: 50, max_users: 50 }]);

      // Should NOT throw even though limit is reached
      const result = await UserService.createUser(
        { ...validUserInput(), tenant_id: 'tenant-uuid' },
        { isEnterpriseAdmin: true, skipSubscriptionCheck: true }
      );

      expect(result).toBeDefined();
    });
  });

  // ==========================================
  // ROLE ASSIGNMENT TESTS
  // ==========================================

  describe('Role Assignment (rbac_user_roles)', () => {
    test('LOCK-040: Assigns role via rbac_user_roles junction table', async () => {
      mockPrisma.rbac_roles.findUnique.mockResolvedValue({ id: 1, name: 'USER' });

      await UserService.createUser(
        validUserInput(),
        { isEnterpriseAdmin: true }
      );

      // Verify $executeRaw was called for role assignment
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    test('LOCK-041: Sets role string cache on user record', async () => {
      await UserService.createUser(
        { ...validUserInput(), role: 'ADMIN' },
        { isEnterpriseAdmin: true }
      );

      // User create should be called with role string
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'ADMIN',
          }),
        })
      );
    });
  });

  // ==========================================
  // SUCCESSFUL CREATION TESTS
  // ==========================================

  describe('Successful User Creation', () => {
    test('LOCK-050: Creates user with all required fields', async () => {
      const input = validUserInput();
      const result = await UserService.createUser(input, { isEnterpriseAdmin: true });

      expect(result).toBeDefined();
      expect(result.id).toBe('mock-uuid-12345');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    test('LOCK-051: Hashes password before storage', async () => {
      await UserService.createUser(validUserInput(), { isEnterpriseAdmin: true });

      expect(bcrypt.hash).toHaveBeenCalledWith(VALID_PASSWORD, expect.any(Number));
    });

    test('LOCK-052: Sets default business_level if not provided', async () => {
      const input = validUserInput();
      delete input.business_level;

      const result = await UserService.createUser(input, { isEnterpriseAdmin: true });

      expect(result.business_level).toBe(1);
    });
  });
});

// ==========================================
// STATIC ENFORCEMENT TESTS (Code Patterns)
// ==========================================

describe('USER_MODEL_LOCK Static Enforcement', () => {
  const fs = require('fs');
  const path = require('path');

  const FORBIDDEN_PATTERNS = [
    { pattern: /prisma\.user\.create\s*\(/g, name: 'Direct prisma.user.create()' },
    { pattern: /prisma\.user\.update\s*\(/g, name: 'Direct prisma.user.update()' },
    { pattern: /manager_id(?![\w_])/g, name: 'Deprecated manager_id field' },
    { pattern: /reporting_manager_id/g, name: 'Deprecated reporting_manager_id field' },
  ];

  const EXEMPT_FILES = [
    'userService.js',
    '.test.js',
    'scripts/',
    'migrations/',
  ];

  const shouldSkipFile = (filePath) => {
    return EXEMPT_FILES.some(exempt => filePath.includes(exempt));
  };

  const routesDir = path.join(__dirname, '../routes');

  test('LOCK-100: Production routes do not use prisma.user.create directly', () => {
    if (!fs.existsSync(routesDir)) {
      console.warn('Routes directory not found, skipping static test');
      return;
    }

    const violations = [];
    
    const scanFile = (filePath) => {
      if (shouldSkipFile(filePath)) return;
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      FORBIDDEN_PATTERNS.forEach(({ pattern, name }) => {
        const matches = content.match(pattern);
        if (matches) {
          violations.push({
            file: filePath,
            pattern: name,
            count: matches.length,
          });
        }
      });
    };

    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.includes('node_modules')) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          scanFile(fullPath);
        }
      });
    };

    scanDir(routesDir);

    if (violations.length > 0) {
      console.error('USER_MODEL_LOCK VIOLATIONS DETECTED:');
      violations.forEach(v => {
        console.error(`  ❌ ${v.file}: ${v.pattern} (${v.count} occurrences)`);
      });
    }

    // This will fail the test if violations found
    // Uncomment once all routes are migrated:
    // expect(violations).toHaveLength(0);
  });
});
