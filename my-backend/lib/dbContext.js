/**
 * Database Connection with Service Context
 * 
 * Sets app.service_name and other context variables on connection
 * for audit trail tracking.
 * 
 * Usage:
 *   const { withContext, setServiceContext } = require('./lib/dbContext');
 *   
 *   // In middleware
 *   app.use((req, res, next) => {
 *     setServiceContext(req, 'api-server');
 *     next();
 *   });
 * 
 * @module lib/dbContext
 */

const { getPrisma } = require('./prisma');

// Default service name (override per service/route)
const DEFAULT_SERVICE_NAME = process.env.SERVICE_NAME || 'bisman-api';

/**
 * Set service context on the database connection
 * Call this at the start of each request
 * 
 * @param {Object} req - Express request object
 * @param {string} serviceName - Service identifier
 */
async function setServiceContext(req, serviceName = DEFAULT_SERVICE_NAME) {
  const prisma = getPrisma();
  
  try {
    const userId = req.user?.id || null;
    const clientIp = req.ip || req.connection?.remoteAddress || null;
    const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] || null;

    // Set session variables for audit triggers
    await prisma.$executeRaw`
      SELECT 
        set_config('app.service_name', ${serviceName}, true),
        set_config('app.current_user_id', ${userId ? String(userId) : ''}, true),
        set_config('app.client_ip', ${clientIp || ''}, true),
        set_config('app.current_tenant', ${tenantId ? String(tenantId) : ''}, true)
    `;

    // Attach to request for reference
    req.dbContext = {
      serviceName,
      userId,
      clientIp,
      tenantId,
      setAt: new Date()
    };

    return true;
  } catch (error) {
    console.warn('[dbContext] Failed to set context:', error.message);
    return false;
  }
}

/**
 * Execute a function with service context set
 * Useful for background jobs or scripts
 * 
 * @param {string} serviceName - Service identifier
 * @param {Object} context - Additional context
 * @param {Function} fn - Function to execute
 */
async function withContext(serviceName, context, fn) {
  const prisma = getPrisma();
  
  try {
    await prisma.$executeRaw`
      SELECT 
        set_config('app.service_name', ${serviceName}, true),
        set_config('app.current_user_id', ${context.userId ? String(context.userId) : ''}, true),
        set_config('app.client_ip', ${context.clientIp || ''}, true),
        set_config('app.current_tenant', ${context.tenantId ? String(context.tenantId) : ''}, true)
    `;

    return await fn();
  } catch (error) {
    console.error('[dbContext] withContext error:', error);
    throw error;
  }
}

/**
 * Express middleware to set service context on each request
 * 
 * @param {string} serviceName - Service identifier
 */
function serviceContextMiddleware(serviceName = DEFAULT_SERVICE_NAME) {
  return async (req, res, next) => {
    await setServiceContext(req, serviceName);
    next();
  };
}

/**
 * Get current service context from database session
 */
async function getCurrentContext() {
  const prisma = getPrisma();
  
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        current_setting('app.service_name', true) as service_name,
        current_setting('app.current_user_id', true) as user_id,
        current_setting('app.client_ip', true) as client_ip,
        current_setting('app.current_tenant', true) as tenant_id
    `;
    return result[0];
  } catch (error) {
    return null;
  }
}

module.exports = {
  setServiceContext,
  withContext,
  serviceContextMiddleware,
  getCurrentContext,
  DEFAULT_SERVICE_NAME
};
