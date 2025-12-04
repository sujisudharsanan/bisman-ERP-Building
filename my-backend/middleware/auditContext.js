/**
 * Audit Context Middleware
 * 
 * Automatically sets audit context for each request.
 * This enables the database audit triggers to capture:
 * - User ID
 * - Tenant ID
 * - Service name
 * - Request ID (for tracing)
 * 
 * @module middleware/auditContext
 */

const { v4: uuidv4 } = require('uuid');
const { getPrisma } = require('../lib/prisma');

// Service name from environment or default
const SERVICE_NAME = process.env.SERVICE_NAME || 'backend';

/**
 * Middleware to set audit context for database operations
 * Must run AFTER authentication middleware
 */
async function setAuditContext(req, res, next) {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  
  // Set response header for tracing
  res.setHeader('x-request-id', requestId);

  // Skip if no user (public endpoints)
  if (!req.user) {
    return next();
  }

  try {
    const prisma = getPrisma();
    
    // Extract user context
    const userId = req.user.id || null;
    const tenantId = req.user.tenant_id || req.user.tenantId || null;
    const superAdminId = req.user.super_admin_id || req.user.superAdminId || null;
    const isPlatformAdmin = req.user.userType === 'ENTERPRISE_ADMIN';

    // Set audit context in PostgreSQL session
    await prisma.$executeRaw`
      SELECT set_audit_context(
        ${userId}::INTEGER,
        ${tenantId}::UUID,
        ${superAdminId}::INTEGER,
        ${SERVICE_NAME},
        ${requestId}::UUID,
        ${isPlatformAdmin}
      )
    `;

    // Store context in request for middleware chain
    req.auditContext = {
      userId,
      tenantId,
      superAdminId,
      serviceName: SERVICE_NAME,
      requestId,
      isPlatformAdmin
    };

  } catch (error) {
    // Don't fail the request if audit context setting fails
    console.warn('[auditContext] Failed to set context:', error.message);
  }

  next();
}

/**
 * Middleware to log security events for failed requests
 * Should be used as an error handler
 */
async function auditErrorHandler(err, req, res, next) {
  // Log security-relevant errors
  if (err.status === 401 || err.status === 403) {
    try {
      const prisma = getPrisma();
      
      await prisma.$queryRaw`
        SELECT log_security_event(
          ${err.status === 401 ? 'AUTH_FAILURE' : 'PERMISSION_DENIED'},
          'WARNING',
          ${req.user?.id || null}::INTEGER,
          ${req.user?.email || null},
          ${req.user?.userType || null},
          ${req.ip || null}::INET,
          ${JSON.stringify({
            path: req.path,
            method: req.method,
            error: err.message,
            requestId: req.requestId
          })}::JSONB
        )
      `;
    } catch (logError) {
      console.warn('[auditContext] Failed to log security event:', logError.message);
    }
  }

  next(err);
}

/**
 * Create a request-scoped Prisma client with audit context
 * Use this when you need to ensure audit context is set for a transaction
 */
function createAuditedPrisma(req) {
  const prisma = getPrisma();
  
  if (!req.auditContext) {
    return prisma;
  }

  const { userId, tenantId, superAdminId, serviceName, requestId, isPlatformAdmin } = req.auditContext;

  // Return extended Prisma client that sets context before each operation
  return prisma.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        // Set audit context for this operation
        await prisma.$executeRaw`
          SELECT set_audit_context(
            ${userId}::INTEGER,
            ${tenantId}::UUID,
            ${superAdminId}::INTEGER,
            ${serviceName},
            ${requestId}::UUID,
            ${isPlatformAdmin}
          )
        `;
        
        return query(args);
      }
    }
  });
}

module.exports = {
  setAuditContext,
  auditErrorHandler,
  createAuditedPrisma,
  SERVICE_NAME
};
