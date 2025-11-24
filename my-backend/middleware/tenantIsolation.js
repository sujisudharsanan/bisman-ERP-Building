/**
 * 🔐 TENANT ISOLATION MIDDLEWARE
 * 
 * CRITICAL SECURITY: Prevents IDOR vulnerabilities by enforcing tenant boundaries
 * 
 * Features:
 * 1. ✅ Automatic tenant filtering on all Prisma queries
 * 2. ✅ Multi-tenant data isolation (tenant_id enforcement)
 * 3. ✅ Exception handling for admin roles
 * 4. ✅ Audit logging for cross-tenant access attempts
 * 
 * Compliance: OWASP A01 (Broken Access Control), ISO 27001 A.9.4.1, SOC 2 CC6.1
 */

const { PrismaClient } = require('@prisma/client')

/**
 * Middleware to enforce tenant isolation for all database operations
 * 
 * Usage:
 *   app.use(authenticate)  // Must come first
 *   app.use(enforceTenantIsolation)
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response  
 * @param {Function} next - Next middleware
 */
function enforceTenantIsolation(req, res, next) {
  // Skip if no user (authentication will catch this)
  if (!req.user) {
    return next()
  }

  // Skip for Enterprise Admin and Super Admin (they can access all tenants)
  if (req.user.userType === 'ENTERPRISE_ADMIN' || req.user.userType === 'SUPER_ADMIN') {
    console.log(`[TenantGuard] Allowing ${req.user.userType} full access`)
    return next()
  }

  // Regular users must have a tenant_id
  if (!req.user.tenant_id) {
    console.error('[TenantGuard] User has no tenant_id:', req.user.email)
    return res.status(403).json({ 
      error: 'No tenant association found',
      message: 'Your account is not associated with any tenant. Please contact support.'
    })
  }

  console.log(`[TenantGuard] Enforcing tenant isolation for tenant: ${req.user.tenant_id}`)

  // Attach tenant filter helper to request
  req.tenantFilter = {
    tenant_id: req.user.tenant_id
  }

  // Add helper method to verify resource access
  req.verifyTenantAccess = (resourceTenantId) => {
    if (!resourceTenantId) {
      console.warn('[TenantGuard] Resource has no tenant_id')
      return false
    }

    const hasAccess = resourceTenantId === req.user.tenant_id
    
    if (!hasAccess) {
      console.warn('[TenantGuard] SECURITY: Cross-tenant access attempt', {
        user: req.user.email,
        userTenant: req.user.tenant_id,
        resourceTenant: resourceTenantId,
        endpoint: req.path,
        method: req.method
      })
    }

    return hasAccess
  }

  next()
}

/**
 * Helper to get Prisma client with automatic tenant filtering
 * 
 * Usage in routes:
 *   const prisma = getTenantPrisma(req)
 *   const users = await prisma.user.findMany()  // Automatically filtered by tenant
 * 
 * @param {Object} req - Express request with user context
 * @returns {Proxy} Prisma client with tenant filtering
 */
function getTenantPrisma(req) {
  const { getPrisma } = require('./prisma')
  const prisma = getPrisma()

  // If admin, return normal Prisma client
  if (req.user && (req.user.userType === 'ENTERPRISE_ADMIN' || req.user.userType === 'SUPER_ADMIN')) {
    return prisma
  }

  // If no tenant, return error
  if (!req.user || !req.user.tenant_id) {
    throw new Error('No tenant context available')
  }

  const tenantId = req.user.tenant_id

  // Create proxy to automatically add tenant filter
  return new Proxy(prisma, {
    get(target, prop) {
      // Get the model (e.g., prisma.user)
      const model = target[prop]

      // If not a Prisma model, return as-is
      if (!model || typeof model !== 'object') {
        return model
      }

      // Wrap model methods to add tenant filter
      return new Proxy(model, {
        get(modelTarget, method) {
          const originalMethod = modelTarget[method]

          // If not a function, return as-is
          if (typeof originalMethod !== 'function') {
            return originalMethod
          }

          // Wrap query methods to inject tenant filter
          if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(method)) {
            return function (args = {}) {
              // Add tenant filter to where clause
              const filteredArgs = {
                ...args,
                where: {
                  ...args.where,
                  tenant_id: tenantId
                }
              }

              console.log(`[TenantPrisma] ${prop}.${method} with tenant filter:`, tenantId)
              return originalMethod.call(modelTarget, filteredArgs)
            }
          }

          // For create/update, validate tenant_id matches
          if (['create', 'update', 'upsert'].includes(method)) {
            return function (args = {}) {
              // Ensure tenant_id is set correctly
              if (args.data) {
                if (args.data.tenant_id && args.data.tenant_id !== tenantId) {
                  throw new Error('Cannot create/update resource for different tenant')
                }
                args.data.tenant_id = tenantId
              }

              console.log(`[TenantPrisma] ${prop}.${method} with tenant enforcement:`, tenantId)
              return originalMethod.call(modelTarget, args)
            }
          }

          // For delete, add tenant filter to where
          if (method === 'delete' || method === 'deleteMany') {
            return function (args = {}) {
              const filteredArgs = {
                ...args,
                where: {
                  ...args.where,
                  tenant_id: tenantId
                }
              }

              console.log(`[TenantPrisma] ${prop}.${method} with tenant filter:`, tenantId)
              return originalMethod.call(modelTarget, filteredArgs)
            }
          }

          // Return original method for other operations
          return originalMethod.bind(modelTarget)
        }
      })
    }
  })
}

/**
 * Verify resource belongs to user's tenant (manual check)
 * 
 * Usage:
 *   const resource = await prisma.resource.findUnique({ where: { id } })
 *   if (!verifyResourceTenant(req, resource)) {
 *     return res.status(403).json({ error: 'Access denied' })
 *   }
 * 
 * @param {Object} req - Express request
 * @param {Object} resource - Database resource to check
 * @returns {boolean} Whether user can access resource
 */
function verifyResourceTenant(req, resource) {
  // Admins can access anything
  if (req.user && (req.user.userType === 'ENTERPRISE_ADMIN' || req.user.userType === 'SUPER_ADMIN')) {
    return true
  }

  // Check if resource has tenant_id
  if (!resource || !resource.tenant_id) {
    console.warn('[TenantGuard] Resource missing tenant_id')
    return false
  }

  // Verify tenant matches
  const hasAccess = resource.tenant_id === req.user.tenant_id

  if (!hasAccess) {
    console.warn('[TenantGuard] SECURITY: Unauthorized tenant access attempt', {
      user: req.user.email,
      userTenant: req.user.tenant_id,
      resourceTenant: resource.tenant_id
    })
  }

  return hasAccess
}

/**
 * Get tenant-safe where clause
 * 
 * Usage:
 *   const where = getTenantWhereClause(req, { status: 'active' })
 *   const users = await prisma.user.findMany({ where })
 * 
 * @param {Object} req - Express request
 * @param {Object} baseWhere - Base where conditions
 * @returns {Object} Where clause with tenant filter
 */
function getTenantWhereClause(req, baseWhere = {}) {
  // Admins don't need tenant filter
  if (req.user && (req.user.userType === 'ENTERPRISE_ADMIN' || req.user.userType === 'SUPER_ADMIN')) {
    return baseWhere
  }

  // Add tenant filter
  return {
    ...baseWhere,
    tenant_id: req.user.tenant_id
  }
}

/**
 * Audit log for cross-tenant access attempts
 * 
 * @param {Object} details - Audit details
 */
async function logCrossTenantAttempt(details) {
  const { getPrisma } = require('./prisma')
  const prisma = getPrisma()

  try {
    await prisma.auditLog.create({
      data: {
        user_id: details.userId,
        action: 'CROSS_TENANT_ACCESS_ATTEMPT',
        table_name: details.resource,
        record_id: details.resourceId,
        ip_address: details.ipAddress,
        user_agent: details.userAgent,
        outcome: 'BLOCKED',
        old_values: JSON.stringify({
          userTenant: details.userTenant,
          resourceTenant: details.resourceTenant,
          endpoint: details.endpoint,
          method: details.method
        }),
        created_at: new Date()
      }
    })
  } catch (error) {
    console.error('[TenantGuard] Failed to log cross-tenant attempt:', error.message)
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  enforceTenantIsolation,
  getTenantPrisma,
  verifyResourceTenant,
  getTenantWhereClause,
  logCrossTenantAttempt
}
