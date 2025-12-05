/**
 * Read Replica Usage Examples
 * ============================
 * 
 * This file demonstrates how to use the read replica infrastructure
 * for different scenarios.
 */

// ============================================================================
// EXAMPLE 1: Basic Read/Write Separation
// ============================================================================

const db = require('../lib/dbClient');

// Read operations - automatically use replica
async function getActiveUsers() {
  return db.read.user.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

// Write operations - always use primary
async function createNewUser(data) {
  return db.write.user.create({
    data: {
      email: data.email,
      name: data.name,
      status: 'ACTIVE',
    },
  });
}

// ============================================================================
// EXAMPLE 2: Read-After-Write Consistency
// ============================================================================

// When you need to read data immediately after writing
async function createUserAndGetProfile(data) {
  // Create on primary
  const user = await db.write.user.create({
    data: {
      email: data.email,
      name: data.name,
    },
  });
  
  // Read from PRIMARY (not replica) to avoid replication lag
  const profile = await db.primary.user.findUnique({
    where: { id: user.id },
    include: {
      settings: true,
      roles: true,
    },
  });
  
  return profile;
}

// Alternative: Use withPrimaryReads for a block of code
async function processUserRegistration(data) {
  return db.withPrimaryReads(async () => {
    // All reads in this block use primary
    const existing = await db.read.user.findUnique({
      where: { email: data.email },
    });
    
    if (existing) {
      throw new Error('User already exists');
    }
    
    const user = await db.write.user.create({
      data: { ...data },
    });
    
    // This read uses primary because we're in withPrimaryReads
    const fullUser = await db.read.user.findUnique({
      where: { id: user.id },
      include: { tenant: true },
    });
    
    return fullUser;
  });
}

// ============================================================================
// EXAMPLE 3: Using Query Service (Higher Level)
// ============================================================================

const { 
  findReadOnly, 
  findById, 
  createEntity, 
  updateEntity,
  createAndFetch,
} = require('../services/queryService');

async function getUsersReport(tenantId) {
  // Uses replica automatically
  const users = await findReadOnly('user', {
    where: { tenantId, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { lastLoginAt: 'desc' },
  });
  
  return users;
}

async function updateUserSettings(userId, settings) {
  // Uses primary automatically
  const updated = await updateEntity('user', userId, {
    settings: settings,
    updatedAt: new Date(),
  });
  
  return updated;
}

// Create and immediately fetch with full data
async function createOrder(orderData) {
  // Handles read-after-write internally
  const order = await createAndFetch('order', orderData, {
    include: {
      items: true,
      customer: true,
      payments: true,
    },
  });
  
  return order;
}

// ============================================================================
// EXAMPLE 4: Transactions (Always Primary)
// ============================================================================

async function transferInventory(fromWarehouseId, toWarehouseId, productId, quantity) {
  // Transactions always use primary
  return db.transaction(async (tx) => {
    // Reduce from source
    await tx.inventory.update({
      where: { 
        warehouseId_productId: { warehouseId: fromWarehouseId, productId } 
      },
      data: { quantity: { decrement: quantity } },
    });
    
    // Add to destination
    await tx.inventory.upsert({
      where: { 
        warehouseId_productId: { warehouseId: toWarehouseId, productId } 
      },
      create: { warehouseId: toWarehouseId, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    
    // Create transfer record
    return tx.inventoryTransfer.create({
      data: {
        fromWarehouseId,
        toWarehouseId,
        productId,
        quantity,
        status: 'COMPLETED',
      },
    });
  });
}

// ============================================================================
// EXAMPLE 5: Express Route Handler with Middleware
// ============================================================================

const express = require('express');
const { queryRouterMiddleware, usePrimary, useReplica } = require('../middleware/queryRouter');

const router = express.Router();

// The middleware automatically attaches req.db based on HTTP method
router.use(queryRouterMiddleware);

// GET requests use replica automatically
router.get('/users', async (req, res) => {
  const users = await req.db.user.findMany({
    where: { tenantId: req.user.tenantId },
  });
  res.json(users);
});

// POST requests use primary automatically
router.post('/users', async (req, res) => {
  const user = await req.db.user.create({
    data: req.body,
  });
  res.json(user);
});

// Force primary for a read (e.g., for admin consistency)
router.get('/admin/users/:id', usePrimary(async (req, res) => {
  const user = await req.db.user.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { auditLog: true },
  });
  res.json(user);
}));

// Force replica for reports (safe for slightly stale data)
router.get('/reports/users', useReplica(async (req, res) => {
  const stats = await req.db.user.groupBy({
    by: ['status'],
    _count: { id: true },
  });
  res.json(stats);
}));

// ============================================================================
// EXAMPLE 6: Checking Replica Health
// ============================================================================

async function checkDatabaseStatus() {
  const health = db.getReplicaHealth();
  
  return {
    primary: {
      status: 'healthy', // Assumed available
    },
    replica: {
      configured: health.replicaConfigured,
      status: health.available ? 'healthy' : 'degraded',
      healthy: health.healthy,
      failures: health.consecutiveFailures,
      lastError: health.lastError,
      failovers: health.totalFailovers,
    },
  };
}

// ============================================================================
// EXAMPLE 7: Migration from Direct Prisma Usage
// ============================================================================

/*
BEFORE (direct prisma):

const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();

async function getUsers() {
  return prisma.user.findMany();
}

async function createUser(data) {
  return prisma.user.create({ data });
}

---

AFTER (with read replicas):

const db = require('../lib/dbClient');

async function getUsers() {
  return db.read.user.findMany();  // Uses replica
}

async function createUser(data) {
  return db.write.user.create({ data });  // Uses primary
}

---

OR with query service:

const { findReadOnly, createEntity } = require('../services/queryService');

async function getUsers() {
  return findReadOnly('user', {});
}

async function createUser(data) {
  return createEntity('user', data);
}
*/

// ============================================================================
// EXPORTS (for testing)
// ============================================================================

module.exports = {
  getActiveUsers,
  createNewUser,
  createUserAndGetProfile,
  processUserRegistration,
  getUsersReport,
  updateUserSettings,
  createOrder,
  transferInventory,
  checkDatabaseStatus,
  router,
};
