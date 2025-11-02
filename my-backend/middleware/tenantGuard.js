/**
 * ============================================================================
 * TENANT GUARD MIDDLEWARE
 * ============================================================================
 * 
 * Purpose: Enforce tenant isolation across all database queries
 * Security: Prevents cross-tenant data leaks
 * 
 * Usage:
 * ```javascript
 * const TenantGuard = require('./middleware/tenantGuard');
 * 
 * // Enforce tenant isolation
 * router.get('/users', authenticate, TenantGuard.enforceTenantIsolation, async (req, res) => {
 *   const users = await prisma.user.findMany({
 *     where: TenantGuard.getTenantFilter(req)
 *   });
 *   res.json({ users });
 * });
 * ```
 * ============================================================================
 */

const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();

class TenantGuard {
  /**
   * Verify user belongs to tenant
   * @param {string} userId - User ID to check
   * @param {string} tenantId - Tenant ID to verify
   * @returns {Promise<boolean>} True if user belongs to tenant
   */
  static async verifyTenantAccess(userId, tenantId) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          tenant_id: tenantId,
        },
      });
      return !!user;
    } catch (error) {
      console.error('[TenantGuard] Error verifying tenant access:', error);
      return false;
    }
  }

  /**
   * Get Prisma where clause with tenant filter
   * Enterprise Admins see all tenants
   * Super Admins handle tenants separately via client associations
   * Regular users only see their tenant
   * 
   * @param {Object} req - Express request object with req.user
   * @param {Object} additionalWhere - Additional where conditions
   * @returns {Object} Where clause with tenant filter
   */
  static getTenantFilter(req, additionalWhere = {}) {
    const { user } = req;
    
    if (!user) {
      throw new Error('[TenantGuard] User not authenticated');
    }
    
    // Enterprise Admin sees all tenants
    if (user.role === 'ENTERPRISE_ADMIN') {
      return additionalWhere;
    }
    
    // Super Admin manages multiple tenants (handled by client associations, not tenant_id)
    if (user.role === 'SUPER_ADMIN') {
      return additionalWhere;
    }
    
    // Regular users only see their tenant
    if (!user.tenant_id) {
      console.warn('[TenantGuard] ⚠️  User has no tenant_id:', user.id, user.email);
      throw new Error('User must be associated with a tenant');
    }
    
    return {
      ...additionalWhere,
      tenant_id: user.tenant_id,
    };
  }

  /**
   * Middleware to enforce tenant isolation
   * Blocks requests from users without tenant_id (except Enterprise/Super Admins)
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Next middleware
   */
  static enforceTenantIsolation(req, res, next) {
    const { user } = req;

    // Check if user is authenticated
    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    // Skip for Enterprise/Super Admins (they manage multiple tenants)
    if (['ENTERPRISE_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return next();
    }

    // Verify user has tenant_id
    if (!user.tenant_id) {
      console.error('[TenantGuard] ❌ User missing tenant_id:', {
        id: user.id,
        email: user.email,
        role: user.role,
      });
      return res.status(403).json({
        error: 'Tenant required',
        message: 'Your account must be associated with a tenant',
      });
    }

    console.log('[TenantGuard] ✅ Tenant isolation enforced for:', {
      userId: user.id,
      tenantId: user.tenant_id,
    });

    next();
  }

  /**
   * Get tenant ID from request user
   * @param {Object} req - Express request
   * @returns {string|null} Tenant ID or null for admins
   */
  static getTenantId(req) {
    const { user } = req;
    
    if (!user) return null;
    
    // Enterprise/Super Admins don't have a single tenant
    if (['ENTERPRISE_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return null;
    }
    
    return user.tenant_id || null;
  }

  /**
   * Validate tenant ID in request params/body matches user's tenant
   * Use this when tenant ID is part of the API path or request body
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Next middleware
   */
  static validateTenantMatch(req, res, next) {
    const { user } = req;
    
    // Skip for admins
    if (['ENTERPRISE_ADMIN', 'SUPER_ADMIN'].includes(user?.role)) {
      return next();
    }
    
    // Get tenant from params or body
    const requestTenantId = req.params.tenantId || req.body.tenant_id;
    
    if (!requestTenantId) {
      // No tenant in request, proceed (will be handled by other middleware)
      return next();
    }
    
    // Verify tenant matches user's tenant
    if (requestTenantId !== user.tenant_id) {
      console.error('[TenantGuard] ❌ Tenant mismatch:', {
        requestTenant: requestTenantId,
        userTenant: user.tenant_id,
        userId: user.id,
      });
      return res.status(403).json({
        error: 'Access denied',
        message: 'You cannot access resources from other tenants',
      });
    }
    
    next();
  }

  /**
   * Add tenant filter to Prisma query args
   * Helper function for safe database queries
   * 
   * @param {Object} queryArgs - Prisma query arguments
   * @param {Object} req - Express request
   * @returns {Object} Query args with tenant filter
   */
  static addTenantFilterToQuery(queryArgs, req) {
    const { user } = req;
    
    // Skip for admins
    if (['ENTERPRISE_ADMIN', 'SUPER_ADMIN'].includes(user?.role)) {
      return queryArgs;
    }
    
    // Add tenant filter to where clause
    return {
      ...queryArgs,
      where: {
        ...(queryArgs.where || {}),
        tenant_id: user.tenant_id,
      },
    };
  }

  /**
   * Check if user can access a specific tenant
   * Used for admin operations across tenants
   * 
   * @param {Object} user - User object
   * @param {string} targetTenantId - Tenant ID to check access for
   * @returns {boolean} True if user can access tenant
   */
  static canAccessTenant(user, targetTenantId) {
    // Enterprise Admin can access all tenants
    if (user.role === 'ENTERPRISE_ADMIN') {
      return true;
    }
    
    // Super Admin can access assigned tenants (check client associations separately)
    if (user.role === 'SUPER_ADMIN') {
      return true; // Actual check done via client/super_admin_id relationship
    }
    
    // Regular users can only access their own tenant
    return user.tenant_id === targetTenantId;
  }

  /**
   * Audit log helper for tenant access
   * Logs all tenant-related access for security monitoring
   * 
   * @param {Object} req - Express request
   * @param {string} action - Action performed
   * @param {Object} details - Additional details
   */
  static async logTenantAccess(req, action, details = {}) {
    try {
      const { user } = req;
      
      console.log('[TenantGuard] Tenant Access Log:', {
        timestamp: new Date().toISOString(),
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        tenantId: user?.tenant_id,
        action,
        details,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // TODO: Store in audit log table for compliance
      // await prisma.auditLog.create({
      //   data: {
      //     user_id: user.id,
      //     tenant_id: user.tenant_id,
      //     action,
      //     details: JSON.stringify(details),
      //     ip_address: req.ip,
      //   }
      // });
    } catch (error) {
      console.error('[TenantGuard] Error logging tenant access:', error);
    }
  }
}

module.exports = TenantGuard;
