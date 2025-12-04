/**
 * Redis Permission Invalidation Tests
 * 
 * Tests the permission cache invalidation flow using ioredis-mock.
 * Verifies that publishing to permissions:invalidate channel
 * correctly removes cached permission keys.
 * 
 * @module tests/redisInvalidate.test.js
 */

'use strict';

// Use ioredis-mock for testing without real Redis
const RedisMock = require('ioredis-mock');

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const PERMISSION_CHANNEL = 'permissions:invalidate';
const TEST_USER_ID = '42';
const TEST_ROLE_ID = '5';

// Key patterns matching production format
const permUserKey = (userId) => `perm:user:${userId}`;
const permRoleKey = (roleId) => `perm:role:${roleId}`;

// ============================================================================
// PERMISSION INVALIDATOR (Inline for testing)
// ============================================================================

/**
 * Creates a permission invalidator that listens to PUB/SUB
 * and deletes cached permissions when invalidation messages arrive.
 */
function createPermissionInvalidator(redis, subscriber) {
  const handlers = {
    user: async (userId) => {
      const key = permUserKey(userId);
      await redis.del(key);
      return key;
    },
    role: async (roleId) => {
      const key = permRoleKey(roleId);
      await redis.del(key);
      return key;
    },
    all: async () => {
      // In production, use SCAN. For mock, use keys()
      const userKeys = await redis.keys('perm:user:*');
      const roleKeys = await redis.keys('perm:role:*');
      const allKeys = [...userKeys, ...roleKeys];
      
      if (allKeys.length > 0) {
        await redis.del(...allKeys);
      }
      return allKeys;
    }
  };

  // Track invalidations for testing
  const invalidations = [];

  // Set up subscription handler
  subscriber.on('message', async (channel, message) => {
    if (channel !== PERMISSION_CHANNEL) return;

    try {
      const payload = JSON.parse(message);
      const { type, userId, roleId } = payload;

      let result = null;

      if (type === 'user' && userId) {
        result = await handlers.user(userId);
      } else if (type === 'role' && roleId) {
        result = await handlers.role(roleId);
      } else if (type === 'all') {
        result = await handlers.all();
      }

      invalidations.push({
        type,
        payload,
        result,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('[PermissionInvalidator] Error:', err.message);
    }
  });

  return {
    getInvalidations: () => [...invalidations],
    clearInvalidations: () => { invalidations.length = 0; }
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Redis Permission Invalidation', () => {
  let redis;
  let subscriber;
  let publisher;
  let invalidator;

  beforeEach(async () => {
    // Create fresh mock Redis instances
    // ioredis-mock uses .duplicate() to create connected clients
    redis = new RedisMock();
    subscriber = new RedisMock();
    publisher = new RedisMock();

    // Subscribe to invalidation channel
    await subscriber.subscribe(PERMISSION_CHANNEL);

    // Create invalidator
    invalidator = createPermissionInvalidator(redis, subscriber);

    // Allow subscription to be established
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    // Cleanup
    try {
      await subscriber.unsubscribe(PERMISSION_CHANNEL);
    } catch (e) {
      // Ignore cleanup errors
    }
    invalidator.clearInvalidations();
  });

  describe('User Permission Invalidation', () => {
    test('should remove perm:user:42 when user invalidation published', async () => {
      // Arrange: Set up cached permission for user 42
      const userKey = permUserKey(TEST_USER_ID);
      const permissionData = JSON.stringify({
        permissions: { 'inventory:view': true, 'inventory:edit': true },
        cachedAt: Date.now()
      });

      await redis.set(userKey, permissionData);
      await redis.expire(userKey, 60);

      // Verify key exists
      const beforeValue = await redis.get(userKey);
      expect(beforeValue).toBe(permissionData);

      // Act: Publish invalidation message
      const invalidationMessage = JSON.stringify({
        type: 'user',
        userId: TEST_USER_ID,
        reason: 'role_change',
        timestamp: Date.now()
      });

      await publisher.publish(PERMISSION_CHANNEL, invalidationMessage);

      // Allow message to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert: Key should be removed
      const afterValue = await redis.get(userKey);
      expect(afterValue).toBeNull();

      // Verify invalidation was recorded
      const invalidations = invalidator.getInvalidations();
      expect(invalidations.length).toBe(1);
      expect(invalidations[0].type).toBe('user');
      expect(invalidations[0].result).toBe(userKey);
    });

    test('should handle non-existent user key gracefully', async () => {
      // Arrange: No key exists
      const userKey = permUserKey('non-existent-user');
      const beforeValue = await redis.get(userKey);
      expect(beforeValue).toBeNull();

      // Act: Publish invalidation
      await publisher.publish(PERMISSION_CHANNEL, JSON.stringify({
        type: 'user',
        userId: 'non-existent-user',
        timestamp: Date.now()
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert: Should complete without error
      const invalidations = invalidator.getInvalidations();
      expect(invalidations.length).toBe(1);
    });
  });

  describe('Role Permission Invalidation', () => {
    test('should remove perm:role:5 when role invalidation published', async () => {
      // Arrange: Set up cached role permissions
      const roleKey = permRoleKey(TEST_ROLE_ID);
      const roleData = JSON.stringify({
        permissions: ['inventory:*', 'reports:view'],
        cachedAt: Date.now()
      });

      await redis.set(roleKey, roleData);
      await redis.expire(roleKey, 300);

      // Verify key exists
      const beforeValue = await redis.get(roleKey);
      expect(beforeValue).toBe(roleData);

      // Act: Publish role invalidation
      await publisher.publish(PERMISSION_CHANNEL, JSON.stringify({
        type: 'role',
        roleId: TEST_ROLE_ID,
        reason: 'permission_update',
        timestamp: Date.now()
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert: Key should be removed
      const afterValue = await redis.get(roleKey);
      expect(afterValue).toBeNull();

      const invalidations = invalidator.getInvalidations();
      expect(invalidations.length).toBe(1);
      expect(invalidations[0].type).toBe('role');
      expect(invalidations[0].result).toBe(roleKey);
    });
  });

  describe('Bulk Invalidation (type: all)', () => {
    test('should remove all perm:user:* and perm:role:* keys', async () => {
      // Arrange: Set up multiple permission keys
      await redis.set(permUserKey('1'), JSON.stringify({ p: 1 }));
      await redis.set(permUserKey('2'), JSON.stringify({ p: 2 }));
      await redis.set(permUserKey('3'), JSON.stringify({ p: 3 }));
      await redis.set(permRoleKey('10'), JSON.stringify({ r: 10 }));
      await redis.set(permRoleKey('20'), JSON.stringify({ r: 20 }));

      // Also set a non-permission key that should NOT be deleted
      await redis.set('other:key', 'should-remain');

      // Verify keys exist
      const userKeysBefore = await redis.keys('perm:user:*');
      const roleKeysBefore = await redis.keys('perm:role:*');
      expect(userKeysBefore.length).toBe(3);
      expect(roleKeysBefore.length).toBe(2);

      // Act: Publish bulk invalidation
      await publisher.publish(PERMISSION_CHANNEL, JSON.stringify({
        type: 'all',
        reason: 'system_reset',
        timestamp: Date.now()
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert: All permission keys should be removed
      const userKeysAfter = await redis.keys('perm:user:*');
      const roleKeysAfter = await redis.keys('perm:role:*');
      expect(userKeysAfter.length).toBe(0);
      expect(roleKeysAfter.length).toBe(0);

      // Other keys should remain
      const otherKey = await redis.get('other:key');
      expect(otherKey).toBe('should-remain');

      // Verify invalidation recorded all keys
      const invalidations = invalidator.getInvalidations();
      expect(invalidations.length).toBe(1);
      expect(invalidations[0].type).toBe('all');
      expect(invalidations[0].result.length).toBe(5);
    });
  });

  describe('Message Format Handling', () => {
    test('should ignore malformed JSON messages', async () => {
      // Arrange
      await redis.set(permUserKey('99'), 'test-data');

      // Act: Publish invalid JSON
      await publisher.publish(PERMISSION_CHANNEL, 'not-valid-json');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert: Key should still exist, no crash
      const value = await redis.get(permUserKey('99'));
      expect(value).toBe('test-data');
    });

    test('should ignore messages with unknown type', async () => {
      // Arrange
      await redis.set(permUserKey('88'), 'test-data');

      // Act: Publish with unknown type
      await publisher.publish(PERMISSION_CHANNEL, JSON.stringify({
        type: 'unknown',
        timestamp: Date.now()
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert: Key should still exist
      const value = await redis.get(permUserKey('88'));
      expect(value).toBe('test-data');
    });

    test('should ignore user type without userId', async () => {
      // Arrange
      await redis.set(permUserKey('77'), 'test-data');

      // Act: Publish user type without userId
      await publisher.publish(PERMISSION_CHANNEL, JSON.stringify({
        type: 'user',
        // userId missing
        timestamp: Date.now()
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Assert: Key should still exist
      const value = await redis.get(permUserKey('77'));
      expect(value).toBe('test-data');
    });
  });

  describe('Multiple Sequential Invalidations', () => {
    test('should handle rapid sequential invalidations', async () => {
      // Arrange: Create 10 user permission keys
      for (let i = 1; i <= 10; i++) {
        await redis.set(permUserKey(i.toString()), JSON.stringify({ id: i }));
      }

      // Act: Rapidly invalidate all 10
      for (let i = 1; i <= 10; i++) {
        await publisher.publish(PERMISSION_CHANNEL, JSON.stringify({
          type: 'user',
          userId: i.toString(),
          timestamp: Date.now()
        }));
      }

      // Allow all messages to be processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // Assert: All keys should be removed
      for (let i = 1; i <= 10; i++) {
        const value = await redis.get(permUserKey(i.toString()));
        expect(value).toBeNull();
      }

      // All invalidations should be recorded
      const invalidations = invalidator.getInvalidations();
      expect(invalidations.length).toBe(10);
    });
  });
});

// ============================================================================
// INTEGRATION-STYLE TESTS (Using real module patterns)
// ============================================================================

describe('Permission Cache Integration Patterns', () => {
  let redis;

  beforeEach(() => {
    redis = new RedisMock();
  });

  test('should correctly format permission cache data', async () => {
    // This tests the data format used in production
    const userId = 'test-user-uuid';
    const permissions = {
      'module:inventory:view': true,
      'module:inventory:edit': true,
      'module:reports:view': true,
      '_role': 'INVENTORY_MANAGER',
      '_modules': ['inventory', 'reports']
    };

    const cacheData = {
      permissions,
      cachedAt: Date.now(),
      source: 'database'
    };

    const key = permUserKey(userId);
    await redis.setex(key, 60, JSON.stringify(cacheData));

    // Retrieve and verify
    const cached = await redis.get(key);
    const parsed = JSON.parse(cached);

    expect(parsed.permissions).toEqual(permissions);
    expect(parsed.source).toBe('database');
    expect(typeof parsed.cachedAt).toBe('number');
  });

  test('TTL should be set correctly', async () => {
    const key = permUserKey('ttl-test');
    await redis.setex(key, 60, 'test');

    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });
});
