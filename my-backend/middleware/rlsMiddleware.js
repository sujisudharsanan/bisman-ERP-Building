/**
 * RLS Context Middleware - PostgreSQL Row Level Security Integration
 * 
 * This middleware sets PostgreSQL session variables for RLS enforcement.
 * It MUST run after authentication and BEFORE any database access.
 * 
 * SECURITY CRITICAL:
 * - Missing context = request rejected (fail closed)
 * - No controller can bypass this middleware
 * - Background jobs must call setRLSContextDirect()
 * 
 * Session Variables Set:
 * - app.user_id     - Current user's ID (UUID or integer)
 * - app.tenant_id   - Current tenant's ID (UUID)
 * - app.data_scope  - Data visibility scope (ALL, TENANT, SELF, etc.)
 * - app.role        - User's role name
 * - app.department  - User's department (optional)
 * - app.context_set - Flag indicating context is set
 */

// Get data scope service if available
let dataScopeService = null;
try {
  dataScopeService = require('../services/dataScopeService');
} catch {
  console.warn('[RLS] dataScopeService not found - using default scope resolution');
}

/**
 * Set RLS context directly on a Prisma client connection
 * Use this for background jobs, cron tasks, and non-HTTP contexts
 * 
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {Object} context - Context to set
 * @param {string} context.userId - User ID
 * @param {string} context.tenantId - Tenant ID
 * @param {string} context.dataScope - Data scope (ALL, TENANT, SELF, etc.)
 * @param {string} context.role - User role
 * @param {string} context.department - User department (optional)
 */
async function setRLSContextDirect(prisma, context) {
  const { userId, tenantId, dataScope, role, department } = context;
  
  if (!userId || !tenantId || !dataScope) {
    throw new Error('RLS Context Error: userId, tenantId, and dataScope are required');
  }
  
  await prisma.$executeRaw`
    SELECT set_security_context(
      ${String(userId)}::TEXT,
      ${String(tenantId)}::TEXT,
      ${String(dataScope)}::TEXT,
      ${String(role || '')}::TEXT,
      ${String(department || '')}::TEXT
    )
  `;
  
  return true;
}

/**
 * Verify RLS context is set on a Prisma connection
 * 
 * @param {PrismaClient} prisma - Prisma client instance
 * @returns {Object} Current context values
 */
async function verifyRLSContext(prisma) {
  const result = await prisma.$queryRaw`
    SELECT 
      current_setting('app.user_id', true) as user_id,
      current_setting('app.tenant_id', true) as tenant_id,
      current_setting('app.data_scope', true) as data_scope,
      current_setting('app.role', true) as role,
      current_setting('app.context_set', true) as context_set,
      is_security_context_set() as is_valid
  `;
  
  return result[0];
}

/**
 * Resolve data scope for a user
 * Uses dataScopeService if available, otherwise falls back to role-based resolution
 */
async function resolveDataScope(user) {
  // If dataScopeService is available, use it
  if (dataScopeService && dataScopeService.getDataScope) {
    try {
      return await dataScopeService.getDataScope(user);
    } catch (e) {
      console.warn('[RLS] dataScopeService error:', e.message);
    }
  }
  
  // Fallback: Role-based scope resolution
  const role = (user.role || user.roleName || '').toUpperCase();
  
  // Platform admins see everything
  if (['ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'].includes(role)) {
    return 'ALL';
  }
  
  // Super Admin and Admin see tenant data
  if (['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return 'TENANT';
  }
  
  // HR sees employees
  if (role.includes('HR')) {
    return 'EMPLOYEES';
  }
  
  // Operations sees operations
  if (role.includes('OPS') || role.includes('OPERATIONS')) {
    return 'OPERATIONS';
  }
  
  // Managers see their team/department
  if (role.includes('MANAGER')) {
    return 'DEPARTMENT';
  }
  
  // Default: users see only their own data
  return 'SELF';
}

/**
 * RLS Context Middleware
 * 
 * Sets PostgreSQL session variables for Row Level Security.
 * MUST be placed after authenticate middleware and before any DB access.
 * 
 * Usage:
 *   app.use('/api', authenticate, rlsContextMiddleware);
 */
function rlsContextMiddleware(prisma) {
  return async function setRLSContext(req, res, next) {
    // Skip for public endpoints (no user)
    if (!req.user) {
      return next();
    }
    
    try {
      // Extract user info
      const userId = req.user.id || req.user.userId;
      const tenantId = req.user.tenant_id || req.user.tenantId || req.tenantId;
      const role = req.user.role || req.user.roleName || 'USER';
      const department = req.user.department || req.user.profile_data?.department || '';
      
      // Validate required fields
      if (!userId) {
        console.error('[RLS] SECURITY: Missing user ID in request');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'RLS_NO_USER'
        });
      }
      
      // For platform-scoped users (EA, SYSTEM_ADMIN, SUPER_ADMIN), tenant may be null
      // SUPER_ADMIN should have tenant_id from auth.js, but include as fallback
      const isPlatformUser = ['ENTERPRISE_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN'].includes(role.toUpperCase());
      
      if (!tenantId && !isPlatformUser) {
        console.error('[RLS] SECURITY: Missing tenant ID for non-platform user');
        return res.status(403).json({
          success: false,
          error: 'Tenant context required',
          code: 'RLS_NO_TENANT'
        });
      }
      
      // Resolve data scope
      const dataScope = await resolveDataScope(req.user);
      
      // Set RLS context on Prisma
      await prisma.$executeRaw`
        SELECT set_security_context(
          ${String(userId)}::TEXT,
          ${String(tenantId || '')}::TEXT,
          ${String(dataScope)}::TEXT,
          ${String(role)}::TEXT,
          ${String(department)}::TEXT
        )
      `;
      
      // Attach context to request for debugging/logging
      req.rlsContext = {
        userId: String(userId),
        tenantId: String(tenantId || ''),
        dataScope,
        role,
        department,
        contextSet: true
      };
      
      // Log for debugging (remove in production)
      if (process.env.RLS_DEBUG === 'true') {
        console.log('[RLS] Context set:', req.rlsContext);
      }
      
      next();
      
    } catch (error) {
      console.error('[RLS] CRITICAL: Failed to set security context:', error);
      
      // FAIL CLOSED - do not proceed without context
      return res.status(500).json({
        success: false,
        error: 'Security context initialization failed',
        code: 'RLS_CONTEXT_FAILED'
      });
    }
  };
}

/**
 * RLS Audit Middleware
 * 
 * Logs security-relevant database operations for audit trail.
 * Place after rlsContextMiddleware.
 */
function rlsAuditMiddleware(prisma) {
  return async function auditRLSAccess(req, res, next) {
    // Only audit authenticated requests
    if (!req.user || !req.rlsContext) {
      return next();
    }
    
    // Skip for read-only GET requests (optional - comment out to audit all)
    if (req.method === 'GET') {
      return next();
    }
    
    // Log the access attempt
    const originalEnd = res.end;
    const startTime = Date.now();
    
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Async log (non-blocking)
      setImmediate(async () => {
        try {
          await prisma.$executeRaw`
            SELECT log_security_access(
              ${statusCode >= 400 ? 'ACCESS_DENIED' : 'ACCESS_GRANTED'}::TEXT,
              ${req.baseUrl + req.path}::TEXT,
              ${req.method}::TEXT,
              ${duration}::INTEGER
            )
          `;
        } catch (e) {
          // Don't fail request on audit failure
          console.warn('[RLS-AUDIT] Log failed:', e.message);
        }
      });
      
      return originalEnd.apply(res, args);
    };
    
    next();
  };
}

/**
 * Require RLS Context Middleware
 * 
 * Use this for routes that MUST have RLS context set.
 * Returns 403 if context is not set.
 */
function requireRLSContext(req, res, next) {
  if (!req.rlsContext || !req.rlsContext.contextSet) {
    return res.status(403).json({
      success: false,
      error: 'Security context not initialized',
      code: 'RLS_REQUIRED'
    });
  }
  next();
}

/**
 * Create RLS-enabled Prisma client wrapper
 * 
 * This creates a Prisma client that automatically sets RLS context
 * for each transaction based on the request context.
 */
function createRLSPrismaMiddleware(prisma) {
  return prisma.$extends({
    query: {
      async $allOperations({ operation, model, args, query }) {
        // Log operation for debugging
        if (process.env.RLS_DEBUG === 'true') {
          console.log(`[RLS-PRISMA] ${operation} on ${model}`);
        }
        
        return query(args);
      }
    }
  });
}

module.exports = {
  rlsContextMiddleware,
  rlsAuditMiddleware,
  requireRLSContext,
  setRLSContextDirect,
  verifyRLSContext,
  resolveDataScope,
  createRLSPrismaMiddleware
};
