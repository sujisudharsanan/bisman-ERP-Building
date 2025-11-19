/**
 * Jest Test Setup
 * Global configuration and utilities for test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test_secret_key';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret';

// Extend Jest matchers
expect.extend({
  toBeValidTenantId(received) {
    const pass = typeof received === 'string' && received.length > 0;
    return {
      pass,
      message: () => `expected ${received} to be a valid tenant ID`
    };
  },
  
  toHaveTenantId(received, tenantId) {
    const pass = received && received.tenant_id === tenantId;
    return {
      pass,
      message: () => `expected object to have tenant_id: ${tenantId}, got: ${received?.tenant_id}`
    };
  }
});

// Global test utilities
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.generateRandomEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;

global.generateRandomTenantId = () => `test-tenant-${Date.now()}-${Math.random().toString(36).substring(7)}`;

// Console logging control
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

if (process.env.SILENT_TESTS === 'true') {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}

// Cleanup function
global.afterAll(async () => {
  // Restore console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

console.log('✅ Jest test setup complete');
