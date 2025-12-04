/**
 * Tenant Context Middleware
 * 
 * Sets PostgreSQL session variables for Row Level Security (RLS) policies.
 * This middleware must run AFTER authentication middleware.
 * 
 * Usage in Prisma:
 *   const prisma = getPrismaWithTenant(req)
 *   // All queries now have RLS applied
 * 
 * @module middleware/tenantContext
 */

const { PrismaClient } = require('@prisma/client')

// Create a base Prisma client for tenant operations
let basePrisma = null

function getBasePrisma() {
  if (!basePrisma) {
    basePrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    })
  }
  return basePrisma
}

/**
 * Middleware to set tenant context in PostgreSQL session variables
 * This enables Row Level Security (RLS) policies to work correctly
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function setTenantContext(req, res, next) {
  if (!req.user) {
    // No authenticated user, skip tenant context
    return next()
  }

  try {
    const prisma = getBasePrisma()
    
    // Determine tenant context based on user type
    let tenantId = null
    let superAdminId = null
    let isPlatformAdmin = false

    const userType = req.user.userType || req.user.roleName

    if (userType === 'ENTERPRISE_ADMIN') {
      // Enterprise admins are platform admins - see all data
      isPlatformAdmin = true
    } else if (userType === 'SUPER_ADMIN') {
      // Super admins see data for their tenants only
      superAdminId = req.user.id
    } else if (req.user.tenant_id || req.user.tenantId) {
      // Regular users belong to a specific tenant
      tenantId = req.user.tenant_id || req.user.tenantId
      superAdminId = req.user.super_admin_id || req.user.superAdminId
    }

    // Store context in request for use by getPrismaWithTenant
    req.tenantContext = {
      tenantId,
      superAdminId,
      isPlatformAdmin,
      userId: req.user.id
    }

    // Also store the SQL to set context (for direct queries)
    req.setTenantContextSQL = `
      SELECT set_tenant_context(
        ${tenantId ? `'${tenantId}'::uuid` : 'NULL'},
        ${superAdminId ? superAdminId : 'NULL'},
        ${isPlatformAdmin}
      );
      SET LOCAL app.user_id = '${req.user.id}';
    `

    next()
  } catch (error) {
    console.error('[setTenantContext] Error setting tenant context:', error.message)
    // Don't fail the request, just log and continue
    next()
  }
}

/**
 * Get a Prisma client that sets tenant context before each query
 * This enables Row Level Security (RLS) for all database operations
 * 
 * @param {Object} req - Express request with tenantContext
 * @returns {Object} Prisma client extended with tenant context
 */
function getPrismaWithTenant(req) {
  const prisma = getBasePrisma()

  if (!req.tenantContext) {
    // No tenant context, return base client
    return prisma
  }

  const { tenantId, superAdminId, isPlatformAdmin, userId } = req.tenantContext

  // Create an extended client that sets context before queries
  return prisma.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        // Set tenant context for this transaction
        await prisma.$executeRaw`
          SELECT set_tenant_context(
            ${tenantId ? tenantId : null}::uuid,
            ${superAdminId ? superAdminId : null}::int,
            ${isPlatformAdmin}
          );
        `
        
        if (userId) {
          await prisma.$executeRaw`
            SELECT set_config('app.user_id', ${String(userId)}, true);
          `
        }

        return query(args)
      }
    }
  })
}

/**
 * Execute raw SQL with tenant context
 * 
 * @param {Object} req - Express request with tenantContext
 * @param {Function} queryFn - Function that takes prisma client and executes query
 * @returns {Promise<any>} Query result
 */
async function executeWithTenantContext(req, queryFn) {
  const prisma = getBasePrisma()

  if (!req.tenantContext) {
    return queryFn(prisma)
  }

  const { tenantId, superAdminId, isPlatformAdmin, userId } = req.tenantContext

  // Use transaction to ensure context is set for the query
  return prisma.$transaction(async (tx) => {
    // Set tenant context
    await tx.$executeRaw`
      SELECT set_tenant_context(
        ${tenantId ? tenantId : null}::uuid,
        ${superAdminId ? superAdminId : null}::int,
        ${isPlatformAdmin}
      );
    `
    
    if (userId) {
      await tx.$executeRaw`
        SELECT set_config('app.user_id', ${String(userId)}, true);
      `
    }

    return queryFn(tx)
  })
}

/**
 * Check if current user can access a specific tenant
 * 
 * @param {Object} req - Express request with tenantContext
 * @param {string} targetTenantId - UUID of target tenant
 * @returns {boolean} True if access is allowed
 */
function canAccessTenant(req, targetTenantId) {
  if (!req.tenantContext) {
    return false
  }

  const { tenantId, isPlatformAdmin } = req.tenantContext

  // Platform admins can access everything
  if (isPlatformAdmin) {
    return true
  }

  // Users can only access their own tenant
  return tenantId === targetTenantId
}

/**
 * Middleware to validate tenant access for a specific route
 * Use this for routes that take a tenant ID as a parameter
 * 
 * @param {string} paramName - Name of the route parameter containing tenant ID
 * @returns {Function} Express middleware
 */
function validateTenantAccess(paramName = 'tenantId') {
  return function(req, res, next) {
    const targetTenantId = req.params[paramName] || req.body[paramName] || req.query[paramName]
    
    if (!targetTenantId) {
      return next()
    }

    if (!canAccessTenant(req, targetTenantId)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to access this tenant'
      })
    }

    next()
  }
}

module.exports = {
  setTenantContext,
  getPrismaWithTenant,
  executeWithTenantContext,
  canAccessTenant,
  validateTenantAccess,
  getBasePrisma
}
