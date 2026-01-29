/**
 * ============================================================================
 * DATA ISOLATION ERROR HANDLER
 * ============================================================================
 * 
 * Implements secure error handling for RLS/Data Scope violations.
 * 
 * GOLDEN RULES:
 * 1. Empty data is NOT an error → return empty state
 * 2. Blocked data IS an error → return 403 with user-friendly message
 * 3. Internal reasons are NEVER shown to users → log internally
 * 
 * Error Types:
 * | Scenario              | HTTP | User Message                                    |
 * |-----------------------|------|-------------------------------------------------|
 * | Page not allowed      | 403  | "You don't have access to this page."           |
 * | Page allowed, no data | 200  | Empty state (not an error)                      |
 * | Data restricted       | 403  | "You don't have permission to view this data."  |
 * | System error          | 500  | "Something went wrong."                         |
 * 
 * @module middleware/dataIsolationErrorHandler
 */

const auditService = require('../services/auditService');

// ============================================================================
// ERROR CODES FOR DATA ISOLATION
// ============================================================================

const DATA_ISOLATION_ERROR_CODES = {
  // Page/Route level (RBAC)
  PAGE_ACCESS_DENIED: 'PAGE_ACCESS_DENIED',
  
  // Data level (RLS/Scope)
  DATA_ACCESS_DENIED: 'DATA_ACCESS_DENIED',
  DATA_MODIFY_DENIED: 'DATA_MODIFY_DENIED',
  DATA_DELETE_DENIED: 'DATA_DELETE_DENIED',
  DATA_EXPORT_DENIED: 'DATA_EXPORT_DENIED',
  
  // Self-scope specific
  SELF_SCOPE_VIOLATION: 'SELF_SCOPE_VIOLATION',
  
  // Context errors
  RLS_CONTEXT_ERROR: 'RLS_CONTEXT_ERROR',
  TENANT_CONTEXT_ERROR: 'TENANT_CONTEXT_ERROR',
};

// ============================================================================
// USER-FRIENDLY MESSAGES (SAFE TO SHOW)
// ============================================================================

const USER_MESSAGES = {
  // Page access
  PAGE_ACCESS_DENIED: "You don't have access to this page.",
  
  // Data access
  DATA_ACCESS_DENIED: "You don't have permission to view this data.",
  DATA_MODIFY_DENIED: "You can view this record, but you're not allowed to modify it.",
  DATA_DELETE_DENIED: "You don't have permission to delete this data.",
  DATA_EXPORT_DENIED: "You don't have permission to export this data.",
  
  // Self-scope
  SELF_SCOPE_VIOLATION: "You can only access your own information.",
  
  // Generic fallbacks
  EMPTY_STATE: "No records are available for your access level.",
  GENERIC_ERROR: "Something went wrong.",
  CONTACT_ADMIN: "If you believe this is incorrect, contact your administrator.",
};

// ============================================================================
// DATABASE ERROR CODE MAPPINGS
// ============================================================================

/**
 * PostgreSQL error codes that indicate RLS/permission violations
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const POSTGRES_RLS_ERROR_CODES = {
  '42501': 'insufficient_privilege',     // RLS policy violation
  '42000': 'syntax_error_or_access_rule_violation',
  '28000': 'invalid_authorization_specification',
  '28P01': 'invalid_password',
};

/**
 * Patterns in error messages that indicate RLS violations
 */
const RLS_ERROR_PATTERNS = [
  /permission denied for (table|relation)/i,
  /new row violates row-level security policy/i,
  /violates row-level security policy/i,
  /row-level security/i,
  /policy for (table|relation)/i,
  /tenant_id.*mismatch/i,
  /insufficient.*privilege/i,
];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Check if an error is an RLS/Data Scope violation
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
function isRLSViolation(error) {
  // Check PostgreSQL error codes
  if (error.code && POSTGRES_RLS_ERROR_CODES[error.code]) {
    return true;
  }
  
  // Check error message patterns
  const message = error.message || '';
  return RLS_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Check if error is a self-scope violation (user trying to access another user's data)
 * @param {Error} error - The error to check
 * @param {Object} context - Request context
 * @returns {boolean}
 */
function isSelfScopeViolation(error, context = {}) {
  const { dataScope, targetUserId, currentUserId } = context;
  
  // If user has SELF scope and is accessing a different user's record
  if (dataScope === 'SELF' && targetUserId && currentUserId) {
    return String(targetUserId) !== String(currentUserId);
  }
  
  // Check error message for self-scope patterns
  const message = error.message || '';
  return /self.*scope|own.*data|own.*record/i.test(message);
}

/**
 * Map a database error to a user-friendly data isolation error
 * 
 * @param {Error} error - The database/system error
 * @param {Object} context - Additional context
 * @returns {Object} Mapped error object
 */
function mapDataIsolationError(error, context = {}) {
  const {
    operation = 'view',  // 'view', 'edit', 'delete', 'export'
    dataScope,
    targetUserId,
    currentUserId,
    tableName,
    req,
  } = context;
  
  // Determine error type
  let errorCode = DATA_ISOLATION_ERROR_CODES.DATA_ACCESS_DENIED;
  let status = 403;
  let userMessage = USER_MESSAGES.DATA_ACCESS_DENIED;
  let action = USER_MESSAGES.CONTACT_ADMIN;
  
  // Check for self-scope violation
  if (isSelfScopeViolation(error, { dataScope, targetUserId, currentUserId })) {
    errorCode = DATA_ISOLATION_ERROR_CODES.SELF_SCOPE_VIOLATION;
    userMessage = USER_MESSAGES.SELF_SCOPE_VIOLATION;
  }
  // Check for RLS violation
  else if (isRLSViolation(error)) {
    // Map based on operation type
    switch (operation) {
      case 'edit':
      case 'update':
      case 'modify':
        errorCode = DATA_ISOLATION_ERROR_CODES.DATA_MODIFY_DENIED;
        userMessage = USER_MESSAGES.DATA_MODIFY_DENIED;
        break;
      case 'delete':
        errorCode = DATA_ISOLATION_ERROR_CODES.DATA_DELETE_DENIED;
        userMessage = USER_MESSAGES.DATA_DELETE_DENIED;
        break;
      case 'export':
        errorCode = DATA_ISOLATION_ERROR_CODES.DATA_EXPORT_DENIED;
        userMessage = USER_MESSAGES.DATA_EXPORT_DENIED;
        break;
      default:
        errorCode = DATA_ISOLATION_ERROR_CODES.DATA_ACCESS_DENIED;
        userMessage = USER_MESSAGES.DATA_ACCESS_DENIED;
    }
  }
  // Context errors (RLS not properly set)
  else if (error.message?.includes('RLS Context') || error.message?.includes('context_set')) {
    errorCode = DATA_ISOLATION_ERROR_CODES.RLS_CONTEXT_ERROR;
    status = 500;
    userMessage = USER_MESSAGES.GENERIC_ERROR;
    action = null;
  }
  
  return {
    status,
    code: errorCode,
    message: userMessage,
    action,
    // Internal details (for logging only, never sent to client)
    _internal: {
      originalError: error.message,
      errorCode: error.code,
      operation,
      dataScope,
      tableName,
      userId: req?.user?.id,
      tenantId: req?.user?.tenantId || req?.user?.clientId,
      path: req?.path,
      method: req?.method,
    }
  };
}

/**
 * Log a data isolation security event (internal only)
 * 
 * @param {Object} mappedError - The mapped error from mapDataIsolationError
 * @param {Object} req - Express request object
 */
async function logDataIsolationViolation(mappedError, req) {
  try {
    const internal = mappedError._internal || {};
    
    await auditService.logSecurityEvent('RLS_BLOCK', {
      severity: 'WARNING',
      userId: internal.userId,
      userEmail: req?.user?.email,
      userType: req?.user?.userType,
      ipAddress: req?.ip,
      details: {
        errorCode: mappedError.code,
        operation: internal.operation,
        dataScope: internal.dataScope,
        tableName: internal.tableName,
        path: internal.path,
        method: internal.method,
        originalError: internal.originalError,
        pgErrorCode: internal.errorCode,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (logError) {
    // Logging failure should never break the request
    console.error('[DataIsolation] Failed to log security event:', logError.message);
  }
}

/**
 * Create a safe error response (no internal details)
 * 
 * @param {Object} mappedError - The mapped error object
 * @returns {Object} Safe response to send to client
 */
function createSafeErrorResponse(mappedError) {
  const response = {
    success: false,
    errorCode: mappedError.code,
    message: mappedError.message,
  };
  
  if (mappedError.action) {
    response.action = mappedError.action;
  }
  
  return response;
}

/**
 * Create an empty state response (for valid queries with 0 rows)
 * 
 * @param {string} _entityType - Type of entity (e.g., 'tasks', 'users', 'records')
 * @param {Object} pagination - Pagination info if applicable
 * @returns {Object} Empty state response
 */
function createEmptyStateResponse(_entityType = 'records', pagination = null) {
  const response = {
    success: true,
    data: [],
    message: USER_MESSAGES.EMPTY_STATE,
    isEmpty: true,
    count: 0,
  };
  
  if (pagination) {
    response.pagination = {
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      total: 0,
      totalPages: 0,
    };
  }
  
  return response;
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Data Isolation Error Handler Middleware
 * 
 * Catches RLS/data scope errors and returns user-friendly messages
 * while logging full details internally.
 * 
 * Usage: Place after your route handlers
 * app.use(dataIsolationErrorHandler);
 */
function dataIsolationErrorHandler(err, req, res, next) {
  // Only handle data isolation errors
  if (!isRLSViolation(err) && !err.code?.startsWith('42')) {
    // Pass to next error handler
    return next(err);
  }
  
  // Map the error
  const mappedError = mapDataIsolationError(err, {
    operation: getOperationFromMethod(req.method),
    dataScope: req.user?.dataScope,
    currentUserId: req.user?.id,
    targetUserId: req.params?.id || req.params?.userId,
    req,
  });
  
  // Log internally (async, don't wait)
  logDataIsolationViolation(mappedError, req);
  
  // Send safe response
  const response = createSafeErrorResponse(mappedError);
  res.status(mappedError.status).json(response);
}

/**
 * Get operation type from HTTP method
 */
function getOperationFromMethod(method) {
  const methodMap = {
    GET: 'view',
    POST: 'create',
    PUT: 'edit',
    PATCH: 'edit',
    DELETE: 'delete',
  };
  return methodMap[method?.toUpperCase()] || 'view';
}

// ============================================================================
// HELPER WRAPPERS FOR ROUTES
// ============================================================================

/**
 * Wrap a query handler to properly handle empty results vs RLS blocks
 * 
 * @param {Function} queryFn - Async function that returns data
 * @param {Object} options - Configuration options
 * @returns {Function} Express route handler
 * 
 * Usage:
 * router.get('/tasks', withDataIsolation(async (req) => {
 *   return prisma.task.findMany({ where: { tenant_id: req.user.tenantId } });
 * }, { entityType: 'tasks' }));
 */
function withDataIsolation(queryFn, options = {}) {
  return async (req, res, next) => {
    const { entityType = 'records', paginated = false } = options;
    
    try {
      const result = await queryFn(req, res);
      
      // Handle empty results gracefully (NOT an error)
      if (result === null || result === undefined) {
        return res.json(createEmptyStateResponse(entityType));
      }
      
      if (Array.isArray(result) && result.length === 0) {
        const pagination = paginated ? {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 10,
        } : null;
        return res.json(createEmptyStateResponse(entityType, pagination));
      }
      
      // Return successful result
      return res.json({
        success: true,
        data: result,
        count: Array.isArray(result) ? result.length : 1,
      });
      
    } catch (error) {
      // Check if it's an RLS/data isolation error
      if (isRLSViolation(error)) {
        const mappedError = mapDataIsolationError(error, {
          operation: getOperationFromMethod(req.method),
          dataScope: req.user?.dataScope,
          currentUserId: req.user?.id,
          targetUserId: req.params?.id || req.params?.userId,
          req,
        });
        
        // Log internally
        logDataIsolationViolation(mappedError, req);
        
        // Return safe error
        return res.status(mappedError.status).json(createSafeErrorResponse(mappedError));
      }
      
      // Pass other errors to the global handler
      next(error);
    }
  };
}

/**
 * Check if user can access a specific record (before querying)
 * 
 * @param {Object} req - Express request
 * @param {string} targetUserId - ID of user whose data is being accessed
 * @returns {{ allowed: boolean, error?: Object }}
 */
function checkSelfScopeAccess(req, targetUserId) {
  const { dataScope, id: currentUserId } = req.user || {};
  
  if (dataScope === 'SELF' && String(targetUserId) !== String(currentUserId)) {
    return {
      allowed: false,
      error: {
        status: 403,
        code: DATA_ISOLATION_ERROR_CODES.SELF_SCOPE_VIOLATION,
        message: USER_MESSAGES.SELF_SCOPE_VIOLATION,
        action: USER_MESSAGES.CONTACT_ADMIN,
      }
    };
  }
  
  return { allowed: true };
}

/**
 * Express middleware to check self-scope access on routes like /users/:id
 */
function enforceSelfScope(req, res, next) {
  const targetUserId = req.params.id || req.params.userId;
  
  if (!targetUserId) {
    return next();
  }
  
  const { allowed, error } = checkSelfScopeAccess(req, targetUserId);
  
  if (!allowed) {
    // Log the attempt
    logDataIsolationViolation({
      code: error.code,
      _internal: {
        operation: getOperationFromMethod(req.method),
        dataScope: req.user?.dataScope,
        currentUserId: req.user?.id,
        targetUserId,
        path: req.path,
        method: req.method,
      }
    }, req);
    
    return res.status(error.status).json({
      success: false,
      errorCode: error.code,
      message: error.message,
      action: error.action,
    });
  }
  
  next();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Error codes
  DATA_ISOLATION_ERROR_CODES,
  
  // User messages
  USER_MESSAGES,
  
  // Core functions
  isRLSViolation,
  isSelfScopeViolation,
  mapDataIsolationError,
  logDataIsolationViolation,
  createSafeErrorResponse,
  createEmptyStateResponse,
  
  // Middleware
  dataIsolationErrorHandler,
  withDataIsolation,
  checkSelfScopeAccess,
  enforceSelfScope,
};
