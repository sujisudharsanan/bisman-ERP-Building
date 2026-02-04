/**
 * UUID Validation Middleware
 * 
 * Validates that all user IDs are proper UUIDs.
 * Rejects integer-based IDs to enforce UUID standardization.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_REGEX = /^[0-9]+$/;

/**
 * Validates if a string is a valid UUID v4
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid UUID
 */
function isValidUUID(id) {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id);
}

/**
 * Checks if a string looks like a legacy integer ID
 * @param {string} id - The ID to check
 * @returns {boolean} - True if integer-like
 */
function isLegacyIntegerId(id) {
  if (!id) return false;
  return INTEGER_REGEX.test(String(id));
}

/**
 * Middleware to validate user ID in request
 * Rejects requests with legacy integer IDs
 */
function validateUserUUID(req, res, next) {
  const userId = req.user?.id;
  
  if (!userId) {
    return next(); // No user ID, let auth middleware handle it
  }

  // Reject legacy integer IDs
  if (isLegacyIntegerId(userId)) {
    console.warn(`[UUID-VALIDATION] Rejected legacy integer ID: ${userId} for ${req.method} ${req.path}`);
    return res.status(400).json({
      error: 'Invalid user ID format',
      message: 'Legacy integer IDs are no longer supported. Please re-authenticate.',
      code: 'LEGACY_ID_REJECTED'
    });
  }

  // Validate UUID format
  if (!isValidUUID(userId)) {
    console.warn(`[UUID-VALIDATION] Invalid UUID format: ${userId} for ${req.method} ${req.path}`);
    return res.status(400).json({
      error: 'Invalid user ID format',
      message: 'User ID must be a valid UUID.',
      code: 'INVALID_UUID'
    });
  }

  next();
}

/**
 * Middleware to validate UUID parameters in routes
 * Usage: router.get('/users/:id', validateParamUUID('id'), handler)
 */
function validateParamUUID(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return next();
    }

    // Reject integer IDs in URL params
    if (isLegacyIntegerId(id)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        message: `Parameter '${paramName}' must be a UUID, not an integer.`,
        code: 'LEGACY_ID_IN_PARAM'
      });
    }

    // Validate UUID
    if (!isValidUUID(id)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        message: `Parameter '${paramName}' must be a valid UUID.`,
        code: 'INVALID_UUID_PARAM'
      });
    }

    next();
  };
}

/**
 * Middleware to validate UUID in request body fields
 * Usage: router.post('/assign', validateBodyUUID(['user_id', 'assigned_by']), handler)
 */
function validateBodyUUID(fields) {
  return (req, res, next) => {
    const errors = [];

    for (const field of fields) {
      const value = getNestedValue(req.body, field);
      
      if (value === undefined || value === null) {
        continue; // Skip optional fields
      }

      // Handle arrays
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          if (isLegacyIntegerId(value[i])) {
            errors.push(`${field}[${i}] must be a UUID, not an integer`);
          } else if (!isValidUUID(value[i])) {
            errors.push(`${field}[${i}] must be a valid UUID`);
          }
        }
        continue;
      }

      // Handle single values
      if (isLegacyIntegerId(value)) {
        errors.push(`${field} must be a UUID, not an integer`);
      } else if (!isValidUUID(value)) {
        errors.push(`${field} must be a valid UUID`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid ID format in request body',
        details: errors,
        code: 'INVALID_BODY_UUID'
      });
    }

    next();
  };
}

/**
 * Helper to get nested object value by dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Sanitize user ID - convert to UUID if legacy format detected
 * This is a transition helper, should be removed after full migration
 * @deprecated Use only during migration period
 */
function sanitizeUserId(id, legacyMapping = null) {
  if (!id) return null;
  
  // Already a UUID
  if (isValidUUID(id)) {
    return id;
  }
  
  // Legacy integer - try to map if mapping provided
  if (isLegacyIntegerId(id) && legacyMapping) {
    const uuid = legacyMapping[id];
    if (uuid) {
      console.warn(`[UUID-MIGRATION] Converted legacy ID ${id} to UUID ${uuid}`);
      return uuid;
    }
  }
  
  // Cannot convert - return as-is with warning
  console.warn(`[UUID-MIGRATION] Cannot convert ID: ${id}`);
  return id;
}

/**
 * Extract user ID from request, preferring UUID over legacy
 * @deprecated After migration, just use req.user.id
 */
function extractUserId(req) {
  const user = req.user;
  if (!user) return null;
  
  // Prefer UUID id over legacy_id
  if (user.id && isValidUUID(user.id)) {
    return user.id;
  }
  
  // Fallback to legacy_id during transition (log warning)
  if (user.legacy_id) {
    console.warn(`[UUID-MIGRATION] Using legacy_id ${user.legacy_id} - should be migrated`);
    return String(user.legacy_id);
  }
  
  return user.id;
}

module.exports = {
  isValidUUID,
  isLegacyIntegerId,
  validateUserUUID,
  validateParamUUID,
  validateBodyUUID,
  sanitizeUserId,
  extractUserId,
  UUID_REGEX
};
