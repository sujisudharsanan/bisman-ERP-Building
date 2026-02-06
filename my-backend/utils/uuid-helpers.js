/**
 * UUID Query Sanitization Utilities
 * 
 * This module provides utilities for safely handling UUID values in queries,
 * eliminating type casting issues between INTEGER and UUID types.
 * 
 * USAGE:
 *   const { validateUUID, ensureUUID, sanitizeUserId } = require('./utils/uuid-helpers');
 * 
 *   // In route handlers:
 *   const userId = sanitizeUserId(req.user.id);  // Always returns valid UUID or null
 * 
 *   // In Prisma queries:
 *   const user = await prisma.users_enhanced.findUnique({
 *     where: { id: ensureUUID(userId) }
 *   });
 * 
 *   // In raw SQL:
 *   const result = await pool.query(
 *     'SELECT * FROM users_enhanced WHERE id = $1',
 *     [validateUUID(userId) ? userId : null]
 *   );
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a value is a valid UUID v4 string
 * @param {any} value - The value to validate
 * @returns {boolean} - True if valid UUID
 */
function validateUUID(value) {
  if (!value) return false;
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value);
}

/**
 * Ensures a value is a valid UUID, returns null otherwise
 * @param {any} value - The value to sanitize
 * @returns {string|null} - Valid UUID string or null
 */
function ensureUUID(value) {
  if (validateUUID(value)) return value;
  return null;
}

/**
 * Sanitizes a user ID for database queries
 * Handles legacy integer IDs by logging a warning
 * @param {any} id - The user ID to sanitize
 * @returns {string|null} - Valid UUID string or null
 */
function sanitizeUserId(id) {
  if (!id) return null;
  
  // Already a UUID
  if (validateUUID(id)) return id;
  
  // Legacy integer ID - log warning and return null
  if (typeof id === 'number' || /^\d+$/.test(id)) {
    console.warn(`[UUID-MIGRATION] Legacy integer user ID detected: ${id}. This should be migrated to UUID.`);
    return null;
  }
  
  return null;
}

/**
 * Sanitizes a tenant ID for database queries
 * @param {any} id - The tenant ID to sanitize
 * @returns {string|null} - Valid UUID string or null
 */
function sanitizeTenantId(id) {
  if (!id) return null;
  
  // Already a UUID
  if (validateUUID(id)) return id;
  
  // Log warning for non-UUID tenant IDs
  console.warn(`[UUID-MIGRATION] Non-UUID tenant ID detected: ${id}. This should be migrated.`);
  return null;
}

/**
 * Sanitizes any ID parameter for database queries
 * @param {any} id - The ID to sanitize
 * @param {string} fieldName - Name of the field for logging
 * @returns {string|null} - Valid UUID string or null
 */
function sanitizeId(id, fieldName = 'id') {
  if (!id) return null;
  
  if (validateUUID(id)) return id;
  
  // Check for legacy format
  if (typeof id === 'number' || /^\d+$/.test(id)) {
    console.warn(`[UUID-MIGRATION] Legacy integer ${fieldName} detected: ${id}`);
  }
  
  return null;
}

/**
 * Converts an object's ID fields to UUID format
 * Useful for sanitizing request bodies
 * @param {object} obj - Object with potential ID fields
 * @param {string[]} idFields - Field names to sanitize
 * @returns {object} - Object with sanitized ID fields
 */
function sanitizeIdFields(obj, idFields = ['id', 'user_id', 'userId', 'tenant_id', 'tenantId', 'creator_id', 'creatorId']) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  
  for (const field of idFields) {
    if (field in result) {
      const sanitized = ensureUUID(result[field]);
      if (result[field] && !sanitized) {
        console.warn(`[UUID-MIGRATION] Invalid UUID in field ${field}: ${result[field]}`);
      }
      result[field] = sanitized;
    }
  }
  
  return result;
}

/**
 * DEPRECATED - Do not use parseInt for IDs
 * This function is kept for backward compatibility during migration
 * @deprecated Use ensureUUID instead
 */
function parseIntId(id) {
  console.error('[UUID-MIGRATION] parseIntId is DEPRECATED. Use ensureUUID instead.');
  return ensureUUID(id);
}

/**
 * DEPRECATED - Do not use Number() for IDs
 * This function is kept for backward compatibility during migration
 * @deprecated Use ensureUUID instead
 */
function numberToId(id) {
  console.error('[UUID-MIGRATION] numberToId is DEPRECATED. Use ensureUUID instead.');
  return ensureUUID(id);
}

/**
 * Builds a safe WHERE clause for Prisma queries
 * @param {object} params - Query parameters
 * @returns {object} - Sanitized Prisma where clause
 */
function buildSafeWhere(params) {
  const where = {};
  
  if (params.id) {
    const uuid = ensureUUID(params.id);
    if (uuid) where.id = uuid;
  }
  
  if (params.user_id || params.userId) {
    const uuid = sanitizeUserId(params.user_id || params.userId);
    if (uuid) where.user_id = uuid;
  }
  
  if (params.tenant_id || params.tenantId) {
    const uuid = sanitizeTenantId(params.tenant_id || params.tenantId);
    if (uuid) where.tenant_id = uuid;
  }
  
  return where;
}

/**
 * SQL template tag for safe UUID parameter interpolation
 * Usage: sql`SELECT * FROM users WHERE id = ${userId}`
 * @param {TemplateStringsArray} strings - Template strings
 * @param {...any} values - Parameter values
 * @returns {object} - { text: string, values: any[] }
 */
function sql(strings, ...values) {
  const sanitizedValues = values.map((val, index) => {
    // Check if this looks like an ID field
    const precedingText = strings[index].toLowerCase();
    if (precedingText.includes('_id') || precedingText.includes('user') || 
        precedingText.includes('tenant') || precedingText.includes('creator')) {
      return ensureUUID(val);
    }
    return val;
  });
  
  let text = strings[0];
  sanitizedValues.forEach((val, i) => {
    text += `$${i + 1}${strings[i + 1]}`;
  });
  
  return { text, values: sanitizedValues };
}

module.exports = {
  validateUUID,
  ensureUUID,
  sanitizeUserId,
  sanitizeTenantId,
  sanitizeId,
  sanitizeIdFields,
  buildSafeWhere,
  sql,
  UUID_REGEX,
  // Deprecated exports
  parseIntId,
  numberToId
};
