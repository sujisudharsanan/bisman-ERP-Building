/**
 * Unique ID Generator Utility
 * 
 * Generates and tracks unique IDs for all entities in the system.
 * All IDs are registered in the entity_id_registry table for tracking.
 * 
 * Format:
 * - Users: USR-YYYYMMDD-XXXXX (e.g., USR-20251207-00001)
 * - Tasks: TSK-YYYYMMDD-XXXXX (e.g., TSK-20251207-00001)
 * - Clients: CLI-YYYYMMDD-XXXXX (e.g., CLI-20251207-00001)
 * - Organizations: ORG-YYYYMMDD-XXXXX
 * - Invoices: INV-YYYYMMDD-XXXXX
 * - Orders: ORD-YYYYMMDD-XXXXX
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Entity type prefixes
const ENTITY_PREFIXES = {
  user: 'USR',
  task: 'TSK',
  client: 'CLI',
  organization: 'ORG',
  invoice: 'INV',
  order: 'ORD',
  payment: 'PAY',
  agreement: 'AGR',
  document: 'DOC',
  ticket: 'TKT',
};

/**
 * Get current date in YYYYMMDD format
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generate a unique ID for an entity
 * @param {string} entityType - Type of entity (user, task, client, etc.)
 * @param {number} entityId - The actual database ID of the entity
 * @param {object} metadata - Optional metadata to store with the ID
 * @returns {Promise<string>} - The generated unique ID
 */
async function generateUniqueId(entityType, entityId, metadata = {}) {
  const prefix = ENTITY_PREFIXES[entityType.toLowerCase()];
  if (!prefix) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  const dateString = getDateString();
  
  try {
    // Get or create the sequence for this entity type and date
    const result = await prisma.$queryRaw`
      INSERT INTO entity_id_sequences (entity_type, date_prefix, last_number)
      VALUES (${entityType}, ${dateString}, 1)
      ON CONFLICT (entity_type, date_prefix)
      DO UPDATE SET last_number = entity_id_sequences.last_number + 1
      RETURNING last_number
    `;
    
    const sequenceNumber = result[0]?.last_number || 1;
    const paddedNumber = String(sequenceNumber).padStart(5, '0');
    const uniqueId = `${prefix}-${dateString}-${paddedNumber}`;

    // Register the ID in the registry
    await prisma.$executeRaw`
      INSERT INTO entity_id_registry (
        unique_id,
        entity_type,
        entity_db_id,
        created_at,
        metadata
      ) VALUES (
        ${uniqueId},
        ${entityType},
        ${entityId},
        NOW(),
        ${JSON.stringify(metadata)}::jsonb
      )
      ON CONFLICT (unique_id) DO NOTHING
    `;

    return uniqueId;
  } catch (error) {
    console.error('Error generating unique ID:', error);
    // Fallback: generate a simple ID if the database operation fails
    const fallbackNumber = Date.now().toString(36).toUpperCase();
    return `${prefix}-${dateString}-${fallbackNumber}`;
  }
}

/**
 * Look up entity by unique ID
 * @param {string} uniqueId - The unique ID to look up
 * @returns {Promise<object|null>} - The registry entry or null
 */
async function lookupByUniqueId(uniqueId) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM entity_id_registry
      WHERE unique_id = ${uniqueId}
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Error looking up unique ID:', error);
    return null;
  }
}

/**
 * Get unique ID for an existing entity
 * @param {string} entityType - Type of entity
 * @param {number} entityDbId - The database ID
 * @returns {Promise<string|null>} - The unique ID or null
 */
async function getUniqueIdForEntity(entityType, entityDbId) {
  try {
    const result = await prisma.$queryRaw`
      SELECT unique_id FROM entity_id_registry
      WHERE entity_type = ${entityType} AND entity_db_id = ${entityDbId}
      LIMIT 1
    `;
    return result[0]?.unique_id || null;
  } catch (error) {
    console.error('Error getting unique ID:', error);
    return null;
  }
}

/**
 * Batch generate unique IDs for existing entities
 * @param {string} entityType - Type of entity
 * @param {Array<number>} entityIds - Array of database IDs
 * @returns {Promise<Map<number, string>>} - Map of database ID to unique ID
 */
async function batchGenerateUniqueIds(entityType, entityIds) {
  const results = new Map();
  
  for (const entityId of entityIds) {
    // Check if ID already exists
    const existing = await getUniqueIdForEntity(entityType, entityId);
    if (existing) {
      results.set(entityId, existing);
    } else {
      const newId = await generateUniqueId(entityType, entityId);
      results.set(entityId, newId);
    }
  }
  
  return results;
}

/**
 * Get all IDs for a specific entity type
 * @param {string} entityType - Type of entity
 * @param {object} options - Pagination options
 * @returns {Promise<Array>} - Array of registry entries
 */
async function getAllIdsForType(entityType, { limit = 100, offset = 0 } = {}) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM entity_id_registry
      WHERE entity_type = ${entityType}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return result;
  } catch (error) {
    console.error('Error getting IDs for type:', error);
    return [];
  }
}

/**
 * Get ID statistics
 * @returns {Promise<object>} - Statistics about generated IDs
 */
async function getIdStatistics() {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        entity_type,
        COUNT(*) as total_count,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created
      FROM entity_id_registry
      GROUP BY entity_type
      ORDER BY entity_type
    `;
    return stats;
  } catch (error) {
    console.error('Error getting ID statistics:', error);
    return [];
  }
}

module.exports = {
  ENTITY_PREFIXES,
  generateUniqueId,
  lookupByUniqueId,
  getUniqueIdForEntity,
  batchGenerateUniqueIds,
  getAllIdsForType,
  getIdStatistics,
};
