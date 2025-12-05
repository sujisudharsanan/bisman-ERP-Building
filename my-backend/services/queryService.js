/**
 * Query Service with Read/Write Separation
 * ==========================================
 * 
 * High-level query helpers that automatically route to primary or replica.
 * Use this for common query patterns with built-in error handling.
 * 
 * Usage:
 *   const { findReadOnly, findById, createEntity, updateEntity } = require('./services/queryService');
 * 
 *   // Read operations (use replica)
 *   const users = await findReadOnly('user', { where: { active: true } });
 *   const user = await findById('user', 123);
 * 
 *   // Write operations (use primary)
 *   const newUser = await createEntity('user', { name: 'John', email: 'john@example.com' });
 *   const updated = await updateEntity('user', 123, { name: 'John Doe' });
 * 
 * @module services/queryService
 */

const db = require('../lib/dbClient');

// ============================================================================
// READ OPERATIONS (use replica when available)
// ============================================================================

/**
 * Find many records (read-only, uses replica)
 * @param {string} model - Prisma model name (e.g., 'user', 'product')
 * @param {object} query - Prisma findMany query options
 * @returns {Promise<Array>} Array of records
 */
async function findReadOnly(model, query = {}) {
  const client = db.read;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].findMany(query);
}

/**
 * Find a single record by ID (read-only, uses replica)
 * @param {string} model - Prisma model name
 * @param {number|string} id - Record ID
 * @param {object} options - Additional query options (select, include)
 * @returns {Promise<object|null>} Record or null
 */
async function findById(model, id, options = {}) {
  const client = db.read;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].findUnique({
    where: { id },
    ...options,
  });
}

/**
 * Find first matching record (read-only, uses replica)
 * @param {string} model - Prisma model name
 * @param {object} query - Prisma findFirst query options
 * @returns {Promise<object|null>} Record or null
 */
async function findFirstReadOnly(model, query = {}) {
  const client = db.read;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].findFirst(query);
}

/**
 * Count records (read-only, uses replica)
 * @param {string} model - Prisma model name
 * @param {object} query - Prisma count query options
 * @returns {Promise<number>} Count
 */
async function countReadOnly(model, query = {}) {
  const client = db.read;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].count(query);
}

/**
 * Aggregate query (read-only, uses replica)
 * @param {string} model - Prisma model name
 * @param {object} query - Prisma aggregate query options
 * @returns {Promise<object>} Aggregation result
 */
async function aggregateReadOnly(model, query = {}) {
  const client = db.read;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].aggregate(query);
}

/**
 * Group by query (read-only, uses replica)
 * @param {string} model - Prisma model name
 * @param {object} query - Prisma groupBy query options
 * @returns {Promise<Array>} Grouped results
 */
async function groupByReadOnly(model, query = {}) {
  const client = db.read;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].groupBy(query);
}

// ============================================================================
// WRITE OPERATIONS (always use primary)
// ============================================================================

/**
 * Create a new record (uses primary)
 * @param {string} model - Prisma model name
 * @param {object} data - Record data
 * @param {object} options - Additional options (select, include)
 * @returns {Promise<object>} Created record
 */
async function createEntity(model, data, options = {}) {
  const client = db.write;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].create({
    data,
    ...options,
  });
}

/**
 * Create multiple records (uses primary)
 * @param {string} model - Prisma model name
 * @param {Array} data - Array of record data
 * @returns {Promise<{count: number}>} Count of created records
 */
async function createManyEntities(model, data) {
  const client = db.write;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].createMany({
    data,
    skipDuplicates: true,
  });
}

/**
 * Update a record by ID (uses primary)
 * @param {string} model - Prisma model name
 * @param {number|string} id - Record ID
 * @param {object} data - Update data
 * @param {object} options - Additional options (select, include)
 * @returns {Promise<object>} Updated record
 */
async function updateEntity(model, id, data, options = {}) {
  const client = db.write;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].update({
    where: { id },
    data,
    ...options,
  });
}

/**
 * Update many records (uses primary)
 * @param {string} model - Prisma model name
 * @param {object} where - Where clause
 * @param {object} data - Update data
 * @returns {Promise<{count: number}>} Count of updated records
 */
async function updateManyEntities(model, where, data) {
  const client = db.write;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].updateMany({
    where,
    data,
  });
}

/**
 * Upsert a record (uses primary)
 * @param {string} model - Prisma model name
 * @param {object} where - Where clause for finding existing record
 * @param {object} create - Data for creating new record
 * @param {object} update - Data for updating existing record
 * @param {object} options - Additional options (select, include)
 * @returns {Promise<object>} Upserted record
 */
async function upsertEntity(model, where, create, update, options = {}) {
  const client = db.write;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].upsert({
    where,
    create,
    update,
    ...options,
  });
}

/**
 * Delete a record by ID (uses primary)
 * @param {string} model - Prisma model name
 * @param {number|string} id - Record ID
 * @returns {Promise<object>} Deleted record
 */
async function deleteEntity(model, id) {
  const client = db.write;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].delete({
    where: { id },
  });
}

/**
 * Delete many records (uses primary)
 * @param {string} model - Prisma model name
 * @param {object} where - Where clause
 * @returns {Promise<{count: number}>} Count of deleted records
 */
async function deleteManyEntities(model, where) {
  const client = db.write;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].deleteMany({
    where,
  });
}

// ============================================================================
// READ-AFTER-WRITE OPERATIONS (always use primary)
// ============================================================================

/**
 * Find a record immediately after writing (uses primary for consistency)
 * Use this when you need to read data you just created/updated
 * @param {string} model - Prisma model name
 * @param {number|string} id - Record ID
 * @param {object} options - Additional query options
 * @returns {Promise<object|null>} Record or null
 */
async function findFresh(model, id, options = {}) {
  const client = db.primary;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].findUnique({
    where: { id },
    ...options,
  });
}

/**
 * Find many records from primary (for consistency-critical reads)
 * @param {string} model - Prisma model name
 * @param {object} query - Prisma findMany query options
 * @returns {Promise<Array>} Array of records
 */
async function findFromPrimary(model, query = {}) {
  const client = db.primary;
  
  if (!client[model]) {
    throw new Error(`Model '${model}' not found in Prisma schema`);
  }
  
  return client[model].findMany(query);
}

// ============================================================================
// TRANSACTION OPERATIONS
// ============================================================================

/**
 * Execute multiple operations in a transaction (uses primary)
 * @param {Array} operations - Array of Prisma operations
 * @returns {Promise<Array>} Results of all operations
 */
async function batchTransaction(operations) {
  return db.transaction(operations);
}

/**
 * Execute an interactive transaction
 * @param {Function} fn - Transaction function receiving tx client
 * @param {object} options - Transaction options (timeout, maxWait)
 * @returns {Promise<any>} Transaction result
 */
async function interactiveTransaction(fn, options = {}) {
  return db.interactiveTransaction(fn, options);
}

/**
 * Create entity and return fresh data (handles read-after-write)
 * @param {string} model - Prisma model name
 * @param {object} data - Record data
 * @param {object} options - Query options for fetching created record
 * @returns {Promise<object>} Created record with full data
 */
async function createAndFetch(model, data, options = {}) {
  const created = await createEntity(model, data);
  
  // Use primary for immediate read to ensure consistency
  return findFresh(model, created.id, options);
}

/**
 * Update entity and return fresh data
 * @param {string} model - Prisma model name
 * @param {number|string} id - Record ID
 * @param {object} data - Update data
 * @param {object} options - Query options for fetching updated record
 * @returns {Promise<object>} Updated record with full data
 */
async function updateAndFetch(model, id, data, options = {}) {
  await updateEntity(model, id, data);
  
  // Use primary for immediate read to ensure consistency
  return findFresh(model, id, options);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if database is available
 * @param {string} target - 'primary', 'replica', or 'both'
 * @returns {Promise<{primary: boolean, replica: boolean}>}
 */
async function checkDatabaseHealth(target = 'both') {
  const results = { primary: false, replica: false };
  
  if (target === 'primary' || target === 'both') {
    try {
      const primary = db.getPrimary();
      await primary.$queryRaw`SELECT 1`;
      results.primary = true;
    } catch {
      results.primary = false;
    }
  }
  
  if (target === 'replica' || target === 'both') {
    try {
      const replica = db.getReplica();
      if (replica) {
        await replica.$queryRaw`SELECT 1`;
        results.replica = true;
      }
    } catch {
      results.replica = false;
    }
  }
  
  return results;
}

/**
 * Get current replica health status
 */
function getReplicaStatus() {
  return db.getReplicaHealth();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Read operations (replica)
  findReadOnly,
  findById,
  findFirstReadOnly,
  countReadOnly,
  aggregateReadOnly,
  groupByReadOnly,
  
  // Write operations (primary)
  createEntity,
  createManyEntities,
  updateEntity,
  updateManyEntities,
  upsertEntity,
  deleteEntity,
  deleteManyEntities,
  
  // Read-after-write (primary)
  findFresh,
  findFromPrimary,
  
  // Transactions
  batchTransaction,
  interactiveTransaction,
  createAndFetch,
  updateAndFetch,
  
  // Health
  checkDatabaseHealth,
  getReplicaStatus,
  
  // Direct client access
  db,
};
