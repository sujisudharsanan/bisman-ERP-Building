/**
 * Authorization Service
 * 
 * CRITICAL RULES:
 * 1. NEVER authorize by role name alone
 * 2. Always use business_level for hierarchy checks
 * 3. Use permission flags for specific actions
 * 4. Respect system_scope for cross-tenant operations
 * 
 * SYSTEM SCOPES:
 * - SYSTEM (CROSS_TENANT): SUPER_ADMIN only - can access ALL tenants
 * - TENANT: ADMIN, IT_ADMIN - full access within their tenant only
 * - BUSINESS: Everyone else - business operations only
 * 
 * IT_ADMIN RESTRICTIONS (TENANT scope):
 * ❌ Cannot create tenants
 * ❌ Cannot access other tenants
 * ❌ Cannot modify billing or platform config
 * ✅ Can manage tenant-level tech operations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * System Scope Types - Use these constants, never hardcode strings
 * @enum {string}
 */
const SYSTEM_SCOPES = {
  SYSTEM: 'CROSS_TENANT',      // Cross-tenant access (SUPER_ADMIN only)
  CROSS_TENANT: 'CROSS_TENANT', // Alias for SYSTEM
  TENANT: 'TENANT',             // Tenant-level access (ADMIN, IT_ADMIN)
  BUSINESS: 'BUSINESS'          // Business operations only
};

/**
 * Get user's effective authorization context
 * @param {string} userId - UUID of the user
 * @returns {Object} Authorization context
 */
async function getAuthContext(userId) {
  const user = await prisma.users_enhanced.findUnique({
    where: { id: userId },
    select: {
      id: true,
      business_level: true,
      tenant_id: true,
      is_active: true
    }
  });

  if (!user || !user.is_active) {
    return null;
  }

  // Get user's roles with their scopes
  const userRoles = await prisma.rbac_user_roles.findMany({
    where: { user_id: user.legacy_id || parseInt(userId) },
    include: {
      rbac_roles: {
        select: {
          name: true,
          level: true,
          system_scope: true,
          is_system_role: true
        }
      }
    }
  });

  // Calculate effective values
  const effectiveLevel = Math.max(
    user.business_level || 1,
    ...userRoles.map(ur => ur.rbac_roles?.level || 0)
  );

  const scopes = userRoles.map(ur => ur.rbac_roles?.system_scope || 'BUSINESS');
  const effectiveScope = scopes.includes('CROSS_TENANT') 
    ? 'CROSS_TENANT' 
    : scopes.includes('TENANT') 
      ? 'TENANT' 
      : 'BUSINESS';

  const isSystemRole = userRoles.some(ur => ur.rbac_roles?.is_system_role);

  return {
    userId: user.id,
    tenantId: user.tenant_id,
    businessLevel: effectiveLevel,
    systemScope: effectiveScope,
    isSystemRole,
    roles: userRoles.map(ur => ur.rbac_roles?.name).filter(Boolean)
  };
}

/**
 * Check if user can create another user
 * Rule: creator.business_level >= newUser.business_level
 * 
 * @param {Object} creator - Auth context of creator
 * @param {number} targetLevel - Business level of user to create
 * @returns {boolean}
 */
function canCreateUser(creator, targetLevel) {
  if (!creator || typeof creator.businessLevel !== 'number') {
    return false;
  }
  // ✅ Good: Using business_level, not role name
  return creator.businessLevel >= targetLevel;
}

/**
 * Check if user can access a tenant
 * 
 * @param {Object} authContext - User's auth context
 * @param {string} targetTenantId - Tenant to access
 * @returns {boolean}
 */
function canAccessTenant(authContext, targetTenantId) {
  if (!authContext) return false;

  // CROSS_TENANT scope can access any tenant
  if (authContext.systemScope === SYSTEM_SCOPES.CROSS_TENANT) {
    return true;
  }

  // TENANT and BUSINESS can only access their own tenant
  return authContext.tenantId === targetTenantId;
}

/**
 * Check if user has minimum business level
 * ✅ Good pattern: Use level checks, not role names
 * 
 * @param {Object} authContext - User's auth context
 * @param {number} requiredLevel - Minimum level required
 * @returns {boolean}
 */
function hasMinLevel(authContext, requiredLevel) {
  if (!authContext) return false;
  return authContext.businessLevel >= requiredLevel;
}

/**
 * Check if user can approve payments
 * Uses permission-based check, not role name
 * 
 * @param {Object} authContext - User's auth context
 * @param {number} amount - Payment amount (for tiered approval)
 * @returns {boolean}
 */
async function canApprovePayment(authContext, amount = 0) {
  if (!authContext) return false;

  // Level-based approval tiers
  // L10: Unlimited
  // L9: Up to 10L
  // L8: Up to 5L
  // L7: Up to 1L
  // Below L7: No approval rights

  if (authContext.businessLevel >= 10) return true;
  if (authContext.businessLevel >= 9 && amount <= 1000000) return true;
  if (authContext.businessLevel >= 8 && amount <= 500000) return true;
  if (authContext.businessLevel >= 7 && amount <= 100000) return true;

  return false;
}

/**
 * Check if user can perform admin operations
 * Uses system_scope check, not role name
 * 
 * @param {Object} authContext - User's auth context
 * @returns {boolean}
 */
function canPerformAdminOps(authContext) {
  if (!authContext) return false;
  // Must be a system role with TENANT or higher scope
  return authContext.isSystemRole && 
    (authContext.systemScope === SYSTEM_SCOPES.TENANT || 
     authContext.systemScope === SYSTEM_SCOPES.CROSS_TENANT);
}

/**
 * Validate hierarchy before user creation
 * Throws error if hierarchy violation
 * 
 * @param {Object} creator - Auth context
 * @param {number} targetLevel - Level of user being created
 * @throws {Error} If hierarchy violation
 */
function enforceHierarchy(creator, targetLevel) {
  if (!canCreateUser(creator, targetLevel)) {
    const error = new Error(
      `Hierarchy violation: L${creator.businessLevel} cannot create L${targetLevel} user`
    );
    error.code = 'HIERARCHY_VIOLATION';
    error.creatorLevel = creator.businessLevel;
    error.targetLevel = targetLevel;
    throw error;
  }
}

/**
 * CRITICAL: Enforce tenant boundary
 * Hard stop for cross-tenant access attempts
 * 
 * @param {Object} authContext - User's auth context
 * @param {string} requestTenantId - Tenant ID being accessed
 * @throws {Error} If cross-tenant access denied
 */
function enforceTenantBoundary(authContext, requestTenantId) {
  if (!authContext) {
    const error = new Error('Authentication required');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  // CROSS_TENANT (SYSTEM) scope can access any tenant
  if (authContext.systemScope === SYSTEM_SCOPES.CROSS_TENANT) {
    return; // Access granted
  }

  // Everyone else (TENANT, BUSINESS) must match tenant
  if (requestTenantId && authContext.tenantId !== requestTenantId) {
    const error = new Error('Cross-tenant access denied');
    error.code = 'CROSS_TENANT_DENIED';
    error.userTenant = authContext.tenantId;
    error.requestedTenant = requestTenantId;
    throw error;
  }
}

/**
 * Check if user can perform platform-level operations
 * Only CROSS_TENANT (SYSTEM) scope can do these
 * 
 * IT_ADMIN CANNOT:
 * - Create tenants
 * - Access other tenants
 * - Modify billing or platform config
 * 
 * @param {Object} authContext - User's auth context
 * @returns {boolean}
 */
function canPerformPlatformOps(authContext) {
  if (!authContext) return false;
  // Only CROSS_TENANT scope (SUPER_ADMIN) can perform platform operations
  return authContext.systemScope === SYSTEM_SCOPES.CROSS_TENANT;
}

/**
 * Check if user can manage tenant configuration
 * TENANT scope (ADMIN, IT_ADMIN) can do this within their tenant
 * 
 * @param {Object} authContext - User's auth context
 * @param {string} targetTenantId - Tenant to configure
 * @returns {boolean}
 */
function canManageTenantConfig(authContext, targetTenantId) {
  if (!authContext) return false;

  // CROSS_TENANT can manage any tenant
  if (authContext.systemScope === SYSTEM_SCOPES.CROSS_TENANT) {
    return true;
  }

  // TENANT scope can manage only their own tenant
  if (authContext.systemScope === SYSTEM_SCOPES.TENANT) {
    return authContext.tenantId === targetTenantId;
  }

  // BUSINESS scope cannot manage tenant config
  return false;
}

/**
 * Authorization middleware factory
 * Creates middleware that enforces authorization rules
 * 
 * @param {Object} options - Authorization options
 * @param {number} options.minLevel - Minimum business level required
 * @param {string} options.scope - Required system scope
 * @param {boolean} options.enforceTenant - Whether to enforce tenant boundary
 * @returns {Function} Express middleware
 */
function requireAuth(options = {}) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
      }

      const authContext = await getAuthContext(userId);
      if (!authContext) {
        return res.status(401).json({ error: 'Invalid user', code: 'INVALID_USER' });
      }

      // Attach auth context to request
      req.authContext = authContext;

      // Check minimum level if specified
      if (options.minLevel && !hasMinLevel(authContext, options.minLevel)) {
        return res.status(403).json({ 
          error: `Insufficient authority. Required: L${options.minLevel}, Have: L${authContext.businessLevel}`,
          code: 'INSUFFICIENT_LEVEL'
        });
      }

      // Check scope if specified
      if (options.scope) {
        const hasScope = options.scope === 'SYSTEM' || options.scope === 'CROSS_TENANT'
          ? authContext.systemScope === SYSTEM_SCOPES.CROSS_TENANT
          : authContext.systemScope === options.scope || 
            authContext.systemScope === SYSTEM_SCOPES.CROSS_TENANT;
        
        if (!hasScope) {
          return res.status(403).json({
            error: `Insufficient scope. Required: ${options.scope}`,
            code: 'INSUFFICIENT_SCOPE'
          });
        }
      }

      // Enforce tenant boundary if specified
      if (options.enforceTenant !== false) {
        const requestTenantId = req.params?.tenantId || req.body?.tenantId || req.query?.tenantId;
        if (requestTenantId) {
          try {
            enforceTenantBoundary(authContext, requestTenantId);
          } catch (e) {
            return res.status(403).json({ error: e.message, code: e.code });
          }
        }
      }

      next();
    } catch (error) {
      console.error('[AUTH] Authorization error:', error);
      return res.status(500).json({ error: 'Authorization failed', code: 'AUTH_ERROR' });
    }
  };
}

module.exports = {
  SYSTEM_SCOPES,
  getAuthContext,
  canCreateUser,
  canAccessTenant,
  hasMinLevel,
  canApprovePayment,
  canPerformAdminOps,
  canPerformPlatformOps,
  canManageTenantConfig,
  enforceHierarchy,
  enforceTenantBoundary,
  requireAuth,
  
  // Simple scope check helpers - USE THESE instead of role === 'ADMIN' etc.
  /**
   * Check if user has cross-tenant access (SUPER_ADMIN or ENTERPRISE_ADMIN)
   * Use this to replace: role === 'SUPER_ADMIN' || userType === 'SUPER_ADMIN'
   * @param {Object} user - req.user object
   * @returns {boolean}
   */
  hasCrossTenantScope: (user) => user?.system_scope === 'CROSS_TENANT',
  
  /**
   * Check if user has tenant-level admin access (ADMIN, IT_ADMIN) or higher
   * Use this to replace: role === 'ADMIN' || isTenantAdmin(role)
   * @param {Object} user - req.user object
   * @returns {boolean}
   */
  hasTenantAdminScope: (user) => 
    user?.system_scope === 'CROSS_TENANT' || user?.system_scope === 'TENANT',
  
  /**
   * Check if user has minimum business level
   * @param {Object} user - req.user object
   * @param {number} minLevel - Minimum required level (1-10)
   * @returns {boolean}
   */
  hasBusinessLevel: (user, minLevel) => (user?.business_level || 1) >= minLevel,
  
  /**
   * Check if user can manage another user (scope + level check)
   * @param {Object} manager - req.user of the manager
   * @param {Object} target - Target user data
   * @returns {boolean}
   */
  canManageUser: (manager, target) => {
    if (!manager || !target) return false;
    
    // Cross-tenant scope can manage anyone
    if (manager.system_scope === 'CROSS_TENANT') return true;
    
    // Must be same tenant for TENANT scope
    if (manager.system_scope === 'TENANT') {
      if (manager.tenant_id !== target.tenant_id) return false;
      return (manager.business_level || 1) >= (target.business_level || 1);
    }
    
    // BUSINESS scope can only manage lower levels in same tenant
    return manager.tenant_id === target.tenant_id &&
           (manager.business_level || 1) > (target.business_level || 1);
  }
};
