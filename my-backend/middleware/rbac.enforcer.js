/**
 * 🔥 BISMAN ERP – LIVE RBAC RUNTIME ENFORCER
 * 
 * THE GATEKEEPER - Nothing bypasses this.
 * 
 * Hierarchy:
 *   ENTERPRISE_ADMIN → SUPER_ADMIN (module scoped) → ADMIN (client scoped)
 */

const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();

// Role levels in hierarchy order (higher = more privilege)
const ROLE_LEVELS = {
  ENTERPRISE: 3,
  MODULE: 2,
  CLIENT: 1,
};

// Routes that bypass RBAC (public routes)
// Note: Paths here should NOT include /api prefix since middleware is mounted at /api
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
  '/health',
  '/public',
  '/approval-flows/levels',
  '/onboard',
  '/onboard/check-email',
  '/onboard/check-company',
  '/subscriptions/plans',         // Public pricing page
  '/subscription-plans',          // Alternative plans endpoint
];

/**
 * Resolve RBAC context from the authenticated user
 */
async function resolveRBACContext(user) {
  if (!user || !user.id) return null;

  try {
    let roleLevel = 'CLIENT';
    let roleName = user.role || user.userType || 'USER';
    
    // Use system_scope for authorization decisions (P0-2 fix)
    const systemScope = user.system_scope || 'BUSINESS';
    
    if (systemScope === 'CROSS_TENANT' || user.userType === 'ENTERPRISE_ADMIN') {
      // CROSS_TENANT scope = ENTERPRISE or MODULE level
      if (user.userType === 'ENTERPRISE_ADMIN' || user.role === 'ENTERPRISE_ADMIN') {
        roleLevel = 'ENTERPRISE';
        roleName = 'ENTERPRISE_ADMIN';
      } else {
        roleLevel = 'MODULE';
        roleName = user.role || 'SUPER_ADMIN';
      }
    } else if (systemScope === 'TENANT') {
      roleLevel = 'CLIENT';
      roleName = user.role || 'ADMIN';
    } else {
      roleLevel = 'CLIENT';
      roleName = user.role || 'USER';
    }

    return {
      userId: user.id,
      roleLevel,
      roleName,
      systemScope, // Add system_scope to context
      moduleId: roleLevel === 'ENTERPRISE' ? null : (user.moduleId || null),
      clientId: roleLevel !== 'CLIENT' ? null : (user.clientId || null),
      permissions: user.permissions || [],
      isEnterpriseAdmin: roleLevel === 'ENTERPRISE',
      isSuperAdmin: systemScope === 'CROSS_TENANT',
      isAdmin: systemScope === 'TENANT' || systemScope === 'CROSS_TENANT',
    };
  } catch (error) {
    console.error('[RBAC Enforcer] Failed to resolve context:', error.message);
    return null;
  }
}

/**
 * Log access denial for audit
 */
async function logDenial(req, context, reason, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'RBAC_DENIAL',
    reason,
    userId: context?.userId || 'unknown',
    roleLevel: context?.roleLevel || 'unknown',
    path: req.path,
    method: req.method,
    ip: req.ip,
    ...details,
  };

  console.error('🚫 RBAC DENIAL:', JSON.stringify(logEntry));

  try {
    if (prisma && prisma.auditLog) {
      await prisma.auditLog.create({
        data: {
          action: 'RBAC_DENIAL',
          entityType: 'ACCESS_CONTROL',
          entityId: req.path,
          userId: context?.userId || null,
          metadata: logEntry,
          createdAt: new Date(),
        }
      });
    }
  } catch (err) {
    console.error('[RBAC] Audit log failed:', err.message);
  }
}

// Extract moduleId from request
function extractModuleId(req) {
  return req.params?.moduleId || req.query?.moduleId || req.body?.moduleId || req.headers['x-module-id'] || null;
}

// Extract clientId from request
function extractClientId(req) {
  return req.params?.clientId || req.query?.clientId || req.body?.clientId || req.headers['x-client-id'] || null;
}

// Check if request should bypass RBAC
function shouldBypassRBAC(req) {
  const path = req.path.toLowerCase();
  for (const route of PUBLIC_ROUTES) {
    if (path.startsWith(route.toLowerCase())) {
      return { bypass: true, reason: 'public_route' };
    }
  }
  return { bypass: false };
}

// Enforce module boundary
function enforceModuleBoundary(context, requestedModuleId) {
  if (context.roleLevel === 'ENTERPRISE') return null;
  if (!requestedModuleId) return null;
  if (context.moduleId !== requestedModuleId) {
    return {
      denied: true,
      reason: 'CROSS_MODULE_ACCESS',
      message: 'Access denied: Cannot access resources from another module',
      details: { userModuleId: context.moduleId, requestedModuleId }
    };
  }
  return null;
}

// Enforce client boundary
function enforceClientBoundary(context, requestedClientId) {
  if (context.roleLevel === 'ENTERPRISE') return null;
  if (context.roleLevel === 'MODULE') return null;
  if (!requestedClientId) return null;
  if (context.clientId !== requestedClientId) {
    return {
      denied: true,
      reason: 'CROSS_CLIENT_ACCESS',
      message: 'Access denied: Cannot access resources from another client',
      details: { userClientId: context.clientId, requestedClientId }
    };
  }
  return null;
}

// Check permission
function hasPermission(context, permissionKey) {
  if (context.isEnterpriseAdmin) return true;
  if (context.isSuperAdmin) return true;
  return context.permissions.includes(permissionKey);
}

/**
 * 🔥 MAIN RBAC ENFORCER MIDDLEWARE
 */
async function rbacEnforcer(req, res, next) {
  const bypassCheck = shouldBypassRBAC(req);
  if (bypassCheck.bypass) return next();

  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const context = await resolveRBACContext(req.user);
  if (!context) {
    await logDenial(req, null, 'CONTEXT_RESOLUTION_FAILED', { userId: req.user?.id });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Unable to resolve access permissions',
      code: 'RBAC_CONTEXT_FAILED',
    });
  }

  req.rbac = context;

  const requestedModuleId = extractModuleId(req);
  const requestedClientId = extractClientId(req);

  const moduleCheck = enforceModuleBoundary(context, requestedModuleId);
  if (moduleCheck?.denied) {
    await logDenial(req, context, moduleCheck.reason, moduleCheck.details);
    return res.status(403).json({
      error: 'Forbidden',
      message: moduleCheck.message,
      code: moduleCheck.reason,
    });
  }

  const clientCheck = enforceClientBoundary(context, requestedClientId);
  if (clientCheck?.denied) {
    await logDenial(req, context, clientCheck.reason, clientCheck.details);
    return res.status(403).json({
      error: 'Forbidden',
      message: clientCheck.message,
      code: clientCheck.reason,
    });
  }

  next();
}

// Permission checker middleware factory
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    const context = req.rbac;
    if (!context) {
      return res.status(500).json({ error: 'Internal Error', message: 'RBAC context not initialized', code: 'RBAC_NOT_INITIALIZED' });
    }
    if (!hasPermission(context, permissionKey)) {
      await logDenial(req, context, 'PERMISSION_DENIED', { requiredPermission: permissionKey });
      return res.status(403).json({ error: 'Forbidden', message: 'Permission denied: ' + permissionKey + ' required', code: 'PERMISSION_DENIED', requiredPermission: permissionKey });
    }
    next();
  };
}

// Module access checker middleware factory
function requireModuleAccess() {
  return async (req, res, next) => {
    const context = req.rbac;
    if (!context) return res.status(500).json({ error: 'Internal Error', code: 'RBAC_NOT_INITIALIZED' });
    const moduleId = extractModuleId(req);
    if (!moduleId) return res.status(400).json({ error: 'Bad Request', message: 'Module ID required', code: 'MODULE_ID_REQUIRED' });
    const check = enforceModuleBoundary(context, moduleId);
    if (check?.denied) {
      await logDenial(req, context, check.reason, check.details);
      return res.status(403).json({ error: 'Forbidden', message: check.message, code: check.reason });
    }
    next();
  };
}

// Client access checker middleware factory
function requireClientAccess() {
  return async (req, res, next) => {
    const context = req.rbac;
    if (!context) return res.status(500).json({ error: 'Internal Error', code: 'RBAC_NOT_INITIALIZED' });
    const clientId = extractClientId(req);
    if (!clientId) return res.status(400).json({ error: 'Bad Request', message: 'Client ID required', code: 'CLIENT_ID_REQUIRED' });
    const check = enforceClientBoundary(context, clientId);
    if (check?.denied) {
      await logDenial(req, context, check.reason, check.details);
      return res.status(403).json({ error: 'Forbidden', message: check.message, code: check.reason });
    }
    next();
  };
}

// Role level checker middleware factory
function requireRoleLevel(requiredLevel) {
  return async (req, res, next) => {
    const context = req.rbac;
    if (!context) return res.status(500).json({ error: 'Internal Error', code: 'RBAC_NOT_INITIALIZED' });
    const userLevel = ROLE_LEVELS[context.roleLevel] || 0;
    const required = ROLE_LEVELS[requiredLevel] || 0;
    if (userLevel < required) {
      await logDenial(req, context, 'INSUFFICIENT_ROLE_LEVEL', { userLevel: context.roleLevel, requiredLevel });
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient role level: ' + requiredLevel + ' required', code: 'INSUFFICIENT_ROLE_LEVEL', requiredLevel, userLevel: context.roleLevel });
    }
    next();
  };
}

function enterpriseOnly() { return requireRoleLevel('ENTERPRISE'); }
function moduleAdminOnly() { return requireRoleLevel('MODULE'); }
function getRBACContext(req) { return req.rbac || null; }
function canAccessModule(context, moduleId) { if (!context) return false; if (context.roleLevel === 'ENTERPRISE') return true; return context.moduleId === moduleId; }
function canAccessClient(context, clientId) { if (!context) return false; if (context.roleLevel === 'ENTERPRISE') return true; if (context.roleLevel === 'MODULE') return true; return context.clientId === clientId; }

function scopeQueryByContext(context, where = {}) {
  if (!context) throw new Error('RBAC context required for scoped query');
  if (context.roleLevel === 'ENTERPRISE') return where;
  if (context.roleLevel === 'MODULE') return { ...where, moduleId: context.moduleId };
  return { ...where, moduleId: context.moduleId, clientId: context.clientId };
}

module.exports = {
  rbacEnforcer,
  requirePermission,
  requireModuleAccess,
  requireClientAccess,
  requireRoleLevel,
  enterpriseOnly,
  moduleAdminOnly,
  getRBACContext,
  resolveRBACContext,
  canAccessModule,
  canAccessClient,
  scopeQueryByContext,
  hasPermission,
  enforceModuleBoundary,
  enforceClientBoundary,
  logDenial,
  ROLE_LEVELS,
  PUBLIC_ROUTES,
};
