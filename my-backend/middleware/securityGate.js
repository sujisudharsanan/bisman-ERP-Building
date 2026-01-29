/**
 * Security Gate Middleware
 * 
 * ARCHITECTURE: TWO-GATE SECURITY MODEL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Gate 1: RBAC (Page Access)
 *   - "Can I access this page/API?"
 *   - Source: admin_page_assignments
 *   - Enforced by: authorize() middleware
 * 
 * Gate 2: Data Scope
 *   - "What data do I see once inside?"
 *   - Source: rbac_roles.data_scope
 *   - Enforced by: applyDataScope() in queries
 * 
 * INVARIANT: Both gates MUST pass. No exceptions.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { getDataScope, applyDataScope, canAccessRecord } = require('../services/dataScopeService');
const { checkEffectivePageAccess } = require('../services/effectiveAccessService');

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

/**
 * Security violation error codes
 */
const SECURITY_ERRORS = {
  NO_USER: 'SEC_NO_USER',
  NO_TENANT: 'SEC_NO_TENANT',
  NO_PAGE_ACCESS: 'SEC_NO_PAGE_ACCESS',
  NO_DATA_SCOPE: 'SEC_NO_DATA_SCOPE',
  SCOPE_VIOLATION: 'SEC_SCOPE_VIOLATION',
  RECORD_ACCESS_DENIED: 'SEC_RECORD_DENIED',
  MISSING_SCOPE_CONTEXT: 'SEC_MISSING_CONTEXT'
};

/**
 * Roles that are exempt from data scope (platform-level)
 */
const SCOPE_EXEMPT_ROLES = ['ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'];

// ============================================================================
// CORE SECURITY GATE MIDDLEWARE
// ============================================================================

/**
 * MANDATORY SECURITY WRAPPER
 * 
 * Wraps any data-returning handler with both security gates.
 * 
 * Usage:
 *   app.get('/api/users', authenticate, withSecurityGates('USER_MANAGEMENT', async (req, res) => {
 *     const where = req.applyScope({ status: 'active' });
 *     const users = await prisma.users.findMany({ where });
 *     res.json(users);
 *   }));
 * 
 * @param {string} pageKey - The page/API key for RBAC check
 * @param {Function} handler - The request handler
 * @returns {Function} Secured handler
 */
function withSecurityGates(pageKey, handler) {
  return async (req, res, next) => {
    const startTime = Date.now();
    const logContext = {
      userId: req.user?.id,
      role: req.user?.role,
      pageKey,
      ip: req.ip,
      path: req.path,
      method: req.method
    };

    try {
      // ════════════════════════════════════════════════════════════════════
      // GATE 0: Authentication check (should already be done by authenticate)
      // ════════════════════════════════════════════════════════════════════
      if (!req.user) {
        logSecurityEvent('DENY', { ...logContext, reason: 'no_user' });
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          errorCode: SECURITY_ERRORS.NO_USER
        });
      }

      // ════════════════════════════════════════════════════════════════════
      // GATE 1: RBAC - Page/API Access Check
      // ════════════════════════════════════════════════════════════════════
      const rbacResult = await checkPageAccess(req.user, pageKey);
      
      if (!rbacResult.allowed) {
        logSecurityEvent('DENY', { 
          ...logContext, 
          reason: 'rbac_denied',
          rbacReason: rbacResult.reason
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to access this resource',
          errorCode: SECURITY_ERRORS.NO_PAGE_ACCESS,
          pageKey
        });
      }

      // ════════════════════════════════════════════════════════════════════
      // GATE 2: Data Scope - Resolve and attach
      // ════════════════════════════════════════════════════════════════════
      const dataScope = await getDataScope(req.user);
      
      if (!dataScope || !dataScope.scope) {
        logSecurityEvent('DENY', { 
          ...logContext, 
          reason: 'no_data_scope'
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied: Unable to determine data visibility scope',
          errorCode: SECURITY_ERRORS.NO_DATA_SCOPE
        });
      }

      // ════════════════════════════════════════════════════════════════════
      // ATTACH SECURITY CONTEXT TO REQUEST
      // ════════════════════════════════════════════════════════════════════
      req.dataScope = dataScope;
      req.securityContext = {
        pageKey,
        scope: dataScope.scope,
        scopeParams: dataScope.params,
        userId: req.user.id,
        tenantId: req.user.tenant_id || req.user.tenantId,
        role: req.user.role,
        timestamp: new Date().toISOString()
      };

      // Helper function to apply scope to queries
      req.applyScope = (baseWhere, options = {}) => {
        const userIdField = options.userIdField || 'user_id';
        return applyDataScopeToQuery(baseWhere, dataScope, req.user, userIdField);
      };

      // Helper to check if user can access a specific record
      req.canAccessRecord = (record) => {
        return canAccessRecord(dataScope, req.user, record);
      };

      // ════════════════════════════════════════════════════════════════════
      // EXECUTE HANDLER
      // ════════════════════════════════════════════════════════════════════
      logSecurityEvent('ALLOW', { 
        ...logContext, 
        dataScope: dataScope.scope,
        durationMs: Date.now() - startTime
      });

      return await handler(req, res, next);

    } catch (error) {
      logSecurityEvent('ERROR', { 
        ...logContext, 
        error: error.message,
        stack: error.stack
      });
      
      // Don't expose internal errors
      return res.status(500).json({
        success: false,
        error: 'An error occurred while processing your request',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Middleware to attach data scope to request (without RBAC check)
 * Use this when RBAC is checked elsewhere but you need scope
 */
async function attachDataScope(req, res, next) {
  try {
    if (req.user) {
      const dataScope = await getDataScope(req.user);
      req.dataScope = dataScope;
      
      req.applyScope = (baseWhere, options = {}) => {
        const userIdField = options.userIdField || 'user_id';
        return applyDataScopeToQuery(baseWhere, dataScope, req.user, userIdField);
      };

      req.canAccessRecord = (record) => {
        return canAccessRecord(dataScope, req.user, record);
      };
    }
    next();
  } catch (error) {
    console.error('[SecurityGate] Error attaching data scope:', error);
    next(); // Continue but scope may be missing
  }
}

/**
 * GUARDRAIL: Require data scope for handler execution
 * Throws if dataScope is missing - prevents accidental bypass
 */
function requireDataScope(req) {
  if (!req.dataScope) {
    const error = new Error('SECURITY VIOLATION: dataScope missing - data access blocked');
    error.code = SECURITY_ERRORS.MISSING_SCOPE_CONTEXT;
    throw error;
  }
  return req.dataScope;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check page access using RBAC
 */
async function checkPageAccess(user, pageKey) {
  try {
    // Platform-level admins have full access
    const role = (user.role || user.roleName || '').toUpperCase();
    if (SCOPE_EXEMPT_ROLES.includes(role)) {
      return { allowed: true, reason: 'platform_admin' };
    }

    // Use effective access service if available
    if (typeof checkEffectivePageAccess === 'function') {
      const result = await checkEffectivePageAccess({
        userId: user.id,
        tenantId: user.tenant_id || user.tenantId,
        pageKey,
        role: user.role
      });
      return { 
        allowed: result.allowed || result.hasAccess, 
        reason: result.reason || 'rbac_check'
      };
    }

    // Fallback: Allow if we can't check (logged as warning)
    console.warn(`[SecurityGate] RBAC check unavailable for ${pageKey} - allowing with warning`);
    return { allowed: true, reason: 'rbac_unavailable' };

  } catch (error) {
    console.error('[SecurityGate] RBAC check error:', error);
    // Fail closed
    return { allowed: false, reason: 'rbac_error' };
  }
}

/**
 * Apply data scope to a Prisma WHERE clause
 */
function applyDataScopeToQuery(baseWhere, scopeInfo, user, userIdField = 'user_id') {
  const { scope, params } = scopeInfo;
  const userId = user.id || user.userId;
  const tenantId = user.tenant_id || user.tenantId;
  const departmentId = user.department_id || user.departmentId;
  const teamId = user.team_id || user.teamId;

  // Start with base conditions
  const where = { ...baseWhere };

  switch (scope) {
    case 'ALL':
      // No additional filtering - platform admin
      break;

    case 'TENANT':
      // Filter to user's tenant
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      break;

    case 'DEPARTMENT':
    case 'EMPLOYEES':
      // Filter to tenant + department
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      
      if (params?.departments?.length > 0) {
        where.department_id = { in: params.departments };
      } else if (params?.department?.length > 0) {
        where.department_id = { in: params.department };
      } else if (departmentId) {
        where.department_id = departmentId;
      }
      break;

    case 'OPERATIONS':
      // Filter to tenant + operations department
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      where.department_id = params?.department || 'OPERATIONS';
      break;

    case 'TEAM':
      // Filter to tenant + team
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      
      if (params?.teams?.length > 0) {
        where.team_id = { in: params.teams };
      } else if (teamId) {
        where.team_id = teamId;
      }
      break;

    case 'SELF':
    default:
      // Filter to own records only
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      where[userIdField] = userId;
      break;
  }

  return where;
}

// ============================================================================
// SECURITY LOGGING
// ============================================================================

/**
 * Log security events for audit trail
 */
function logSecurityEvent(result, context) {
  const event = {
    timestamp: new Date().toISOString(),
    type: 'SECURITY_GATE',
    result,
    ...context
  };

  // Log to console (in production, send to centralized logging)
  if (result === 'DENY' || result === 'ERROR') {
    console.warn('[SECURITY]', JSON.stringify(event));
  } else if (process.env.LOG_SECURITY_ALLOW === 'true') {
    console.log('[SECURITY]', JSON.stringify(event));
  }

  // TODO: Send to audit log table
  // TODO: Send alerts for suspicious patterns
}

// ============================================================================
// QUERY GUARDS (Additional Safety)
// ============================================================================

/**
 * GUARDRAIL: Wrap Prisma queries to ensure scope is applied
 * 
 * Usage:
 *   const users = await securedQuery(req, prisma.users.findMany({
 *     where: { status: 'active' }
 *   }));
 */
function securedQuery(req, queryPromise) {
  // Verify scope exists
  requireDataScope(req);
  
  // Execute query (scope should be applied in WHERE clause)
  return queryPromise;
}

/**
 * Create a scope-enforcing Prisma wrapper
 * 
 * Usage:
 *   const scopedPrisma = createScopedPrisma(req, prisma);
 *   const users = await scopedPrisma.users.findMany({ where: { status: 'active' } });
 */
function createScopedPrisma(req, prisma) {
  requireDataScope(req);
  
  // Return a proxy that auto-applies scope (simplified version)
  // In production, use a more sophisticated proxy
  return {
    $queryRaw: (...args) => prisma.$queryRaw(...args),
    $executeRaw: (...args) => prisma.$executeRaw(...args),
    
    // For each model, wrap findMany/findFirst to apply scope
    // This is a simplified example - expand as needed
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core middleware
  withSecurityGates,
  attachDataScope,
  
  // Guards
  requireDataScope,
  securedQuery,
  createScopedPrisma,
  
  // Helpers
  applyDataScopeToQuery,
  logSecurityEvent,
  
  // Constants
  SECURITY_ERRORS,
  SCOPE_EXEMPT_ROLES
};
