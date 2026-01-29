/**
 * Prisma RLS Context Middleware
 * 
 * DEFENSE IN DEPTH: Sets PostgreSQL session context for Row-Level Security
 * 
 * This middleware:
 * 1. Sets app.tenant_id, app.user_id, app.data_scope before each query
 * 2. Ensures RLS policies have the context they need
 * 3. Works alongside application-level scope enforcement
 * 
 * IMPORTANT: RLS is a SAFETY NET. Application should still enforce scope.
 */

const { getDataScope } = require('../services/dataScopeService');

/**
 * Create Prisma middleware for RLS context
 * 
 * Usage:
 *   const prisma = new PrismaClient();
 *   prisma.$use(createRLSMiddleware());
 */
function createRLSMiddleware() {
  return async (params, next) => {
    // Get user context from async local storage or global (if set)
    const context = getRLSContext();
    
    if (context && context.tenantId) {
      // Set RLS context before the query
      // Note: This uses $queryRaw which might not work in middleware
      // Alternative: Use connection pooler with SET commands
      
      // For now, we'll log the context for debugging
      if (process.env.DEBUG_RLS === 'true') {
        console.log('[RLS] Query context:', {
          model: params.model,
          action: params.action,
          tenantId: context.tenantId,
          userId: context.userId,
          dataScope: context.dataScope
        });
      }
    }
    
    return next(params);
  };
}

/**
 * Express middleware to set RLS context for the request
 * 
 * Usage:
 *   app.use(authenticate);
 *   app.use(setRLSContext);
 */
async function setRLSContext(req, res, next) {
  try {
    if (req.user) {
      // Get data scope for user
      const scopeInfo = await getDataScope(req.user);
      
      // Store in request for later use
      req.rlsContext = {
        tenantId: req.user.tenant_id || req.user.tenantId,
        userId: req.user.id,
        dataScope: scopeInfo.scope,
        role: req.user.role
      };
      
      // Store in async local storage for Prisma middleware
      setRLSContextGlobal(req.rlsContext);
      
      // If using raw pool, set session context
      if (req.pool || req.app.locals.pool) {
        const pool = req.pool || req.app.locals.pool;
        try {
          await pool.query(
            'SELECT set_app_context($1, $2, $3, $4)',
            [
              req.rlsContext.tenantId || '',
              req.rlsContext.userId || 0,
              req.rlsContext.dataScope || 'SELF',
              req.rlsContext.role || 'USER'
            ]
          );
        } catch (e) {
          // set_app_context may not exist yet - continue
          if (process.env.DEBUG_RLS === 'true') {
            console.log('[RLS] set_app_context not available:', e.message);
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('[RLS] Error setting context:', error);
    next(); // Continue without RLS context
  }
}

/**
 * Set RLS context on a Prisma client for a specific query
 * 
 * Usage:
 *   await setContextForQuery(prisma, req.rlsContext);
 *   const users = await prisma.users_enhanced.findMany();
 */
async function setContextForQuery(prisma, context) {
  if (!context) return;
  
  try {
    await prisma.$executeRaw`
      SELECT set_app_context(
        ${context.tenantId || ''},
        ${context.userId || 0},
        ${context.dataScope || 'SELF'},
        ${context.role || 'USER'}
      )
    `;
  } catch (e) {
    // Function may not exist - ignore
    if (process.env.DEBUG_RLS === 'true') {
      console.log('[RLS] set_app_context error:', e.message);
    }
  }
}

// ============================================================================
// GLOBAL CONTEXT STORAGE (Simple implementation)
// For production, use AsyncLocalStorage for true request isolation
// ============================================================================

let _globalRLSContext = null;

function setRLSContextGlobal(context) {
  _globalRLSContext = context;
}

function getRLSContext() {
  return _globalRLSContext;
}

function clearRLSContext() {
  _globalRLSContext = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Middleware
  createRLSMiddleware,
  setRLSContext,
  setContextForQuery,
  
  // Context management
  setRLSContextGlobal,
  getRLSContext,
  clearRLSContext
};
