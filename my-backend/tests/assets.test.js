/**
 * ============================================================================
 * BISMAN ERP - Asset Management API Tests
 * ============================================================================
 * 
 * Test cases for the asset management API endpoints.
 * Run with: npx jest tests/assets.test.js --runInBand
 * 
 * @module tests/assets
 */

/* eslint-env jest */
/* global jest, expect, describe, it, beforeAll */

const request = require('supertest');

// Mock dependencies before requiring app
jest.mock('../lib/prisma', () => ({
  getPrisma: jest.fn(() => ({
    client_subscriptions: {
      findUnique: jest.fn().mockResolvedValue({
        client_id: 'test-tenant-id',
        plan_id: 1,
        is_active: true,
        plan_snapshot_json: { max_assets: 100 },
      }),
    },
  })),
}));

jest.mock('../middleware/database', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn().mockImplementation((sql) => {
      // Mock different queries based on SQL content
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '5', total: '10' }] });
      }
      if (sql.includes('SELECT') && sql.includes('assets')) {
        return Promise.resolve({
          rows: [
            {
              id: 'test-asset-1',
              asset_code: 'AST-24-00001',
              name: 'Test Laptop',
              status: 'active',
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      if (sql.includes('SELECT') && sql.includes('asset_categories')) {
        return Promise.resolve({
          rows: [
            { id: 1, code: 'IT_EQUIPMENT', name: 'IT Equipment' },
            { id: 2, code: 'FURNITURE', name: 'Furniture' },
          ],
        });
      }
      if (sql.includes('INSERT')) {
        return Promise.resolve({ rows: [{ id: 'new-asset-id' }] });
      }
      if (sql.includes('UPDATE')) {
        return Promise.resolve({ rows: [{ id: 'test-asset-1', name: 'Updated Asset' }] });
      }
      if (sql.includes('DELETE')) {
        return Promise.resolve({ rows: [{ id: 'test-asset-1' }] });
      }
      return Promise.resolve({ rows: [] });
    }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockImplementation((sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        if (sql.includes('SELECT') && sql.includes('page_code')) {
          return Promise.resolve({ rows: [{ id: 1 }] }); // Permission granted
        }
        return Promise.resolve({ rows: [] });
      }),
      release: jest.fn(),
    }),
  })),
}));

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: 1,
      legacy_id: 1,
      tenant_id: 'test-tenant-id',
      role: 'ADMIN',
      email: 'test@example.com',
      name: 'Test User',
    };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

// Import routes after mocking
const express = require('express');
const assetRoutes = require('../routes/assets');

describe('Asset Management API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/assets', assetRoutes);
  });

  // ============================================================================
  // GET /api/assets - List Assets
  // ============================================================================
  describe('GET /api/assets', () => {
    it('should return a list of assets', async () => {
      const response = await request(app)
        .get('/api/assets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support search parameter', async () => {
      const response = await request(app)
        .get('/api/assets?search=laptop')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support status filter', async () => {
      const response = await request(app)
        .get('/api/assets?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/assets?page=1&limit=10')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  // ============================================================================
  // GET /api/assets/limits - Get Asset Limits
  // ============================================================================
  describe('GET /api/assets/limits', () => {
    it('should return asset limits for tenant', async () => {
      const response = await request(app)
        .get('/api/assets/limits')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('current');
      expect(response.body.data).toHaveProperty('max');
      expect(response.body.data).toHaveProperty('remaining');
    });
  });

  // ============================================================================
  // GET /api/assets/categories - Get Categories
  // ============================================================================
  describe('GET /api/assets/categories', () => {
    it('should return asset categories', async () => {
      const response = await request(app)
        .get('/api/assets/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================================================
  // POST /api/assets - Create Asset
  // ============================================================================
  describe('POST /api/assets', () => {
    it('should create a new asset with valid data', async () => {
      const assetData = {
        name: 'New Test Laptop',
        asset_type: 'IT Equipment',
        category_id: 1,
        serial_number: 'SN-12345',
        purchase_cost: 50000,
        status: 'active',
        condition: 'new',
      };

      const response = await request(app)
        .post('/api/assets')
        .send(assetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created');
    });

    it('should reject asset without required name', async () => {
      const assetData = {
        asset_type: 'IT Equipment',
      };

      const response = await request(app)
        .post('/api/assets')
        .send(assetData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({ field: 'name' })
      );
    });

    it('should reject negative purchase cost', async () => {
      const assetData = {
        name: 'Test Asset',
        purchase_cost: -1000,
      };

      const response = await request(app)
        .post('/api/assets')
        .send(assetData)
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({ field: 'purchase_cost' })
      );
    });

    it('should reject invalid asset code format', async () => {
      const assetData = {
        name: 'Test Asset',
        asset_code: 'invalid code with spaces!',
      };

      const response = await request(app)
        .post('/api/assets')
        .send(assetData)
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({ field: 'asset_code' })
      );
    });

    it('should reject warranty expiry before purchase date', async () => {
      const assetData = {
        name: 'Test Asset',
        purchase_date: '2024-06-01',
        warranty_expiry: '2024-01-01',
      };

      const response = await request(app)
        .post('/api/assets')
        .send(assetData)
        .expect(400);

      expect(response.body.details).toContainEqual(
        expect.objectContaining({ field: 'warranty_expiry' })
      );
    });

    it('should set requires_approval for high-value assets', async () => {
      const assetData = {
        name: 'Expensive Equipment',
        purchase_cost: 100000, // Over 50k threshold
      };

      const response = await request(app)
        .post('/api/assets')
        .send(assetData)
        .expect(201);

      expect(response.body.message).toContain('pending approval');
    });
  });

  // ============================================================================
  // POST /api/assets/validate-code - Validate Asset Code
  // ============================================================================
  describe('POST /api/assets/validate-code', () => {
    it('should validate unique asset code', async () => {
      const response = await request(app)
        .post('/api/assets/validate-code')
        .send({ asset_code: 'UNIQUE-CODE-123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('isUnique');
    });

    it('should reject empty asset code', async () => {
      const response = await request(app)
        .post('/api/assets/validate-code')
        .send({ asset_code: '' })
        .expect(400);

      expect(response.body.error).toBe('Asset code is required');
    });
  });

  // ============================================================================
  // PUT /api/assets/:id - Update Asset
  // ============================================================================
  describe('PUT /api/assets/:id', () => {
    it('should update asset with valid changes', async () => {
      const updateData = {
        name: 'Updated Asset Name',
        location_name: 'New Location',
      };

      const response = await request(app)
        .put('/api/assets/test-asset-1')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.changes).toBeDefined();
    });
  });

  // ============================================================================
  // DELETE /api/assets/:id - Delete Asset
  // ============================================================================
  describe('DELETE /api/assets/:id', () => {
    it('should soft delete an asset', async () => {
      const response = await request(app)
        .delete('/api/assets/test-asset-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });
  });

  // ============================================================================
  // GET /api/assets/:id/history - Asset History
  // ============================================================================
  describe('GET /api/assets/:id/history', () => {
    it('should return asset history', async () => {
      const response = await request(app)
        .get('/api/assets/test-asset-1/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================
describe('Asset Validation', () => {
  const { validateAssetData } = require('../../shared/validation/assetValidation');

  it('should pass valid asset data', () => {
    const result = validateAssetData({
      name: 'Valid Asset',
      asset_code: 'AST-001',
      status: 'active',
      condition: 'new',
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail on missing required name', () => {
    const result = validateAssetData({
      asset_code: 'AST-001',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'name' })
    );
  });

  it('should fail on name exceeding max length', () => {
    const result = validateAssetData({
      name: 'A'.repeat(250),
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'name', code: 'TOO_LONG' })
    );
  });

  it('should fail on invalid asset code format', () => {
    const result = validateAssetData({
      name: 'Test Asset',
      asset_code: 'invalid code!',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'asset_code', code: 'INVALID_FORMAT' })
    );
  });

  it('should fail on negative cost', () => {
    const result = validateAssetData({
      name: 'Test Asset',
      purchase_cost: -100,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'purchase_cost', code: 'NEGATIVE_VALUE' })
    );
  });

  it('should fail on warranty before purchase date', () => {
    const result = validateAssetData({
      name: 'Test Asset',
      purchase_date: '2024-06-01',
      warranty_expiry: '2024-01-01',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'warranty_expiry', code: 'INVALID_DATE_RANGE' })
    );
  });

  it('should fail on invalid status', () => {
    const result = validateAssetData({
      name: 'Test Asset',
      status: 'invalid_status',
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'status', code: 'INVALID_ENUM' })
    );
  });

  it('should skip required check on update', () => {
    const result = validateAssetData(
      { location_name: 'New Location' },
      { isUpdate: true }
    );

    expect(result.isValid).toBe(true);
  });
});
