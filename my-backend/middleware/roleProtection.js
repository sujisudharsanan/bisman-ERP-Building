/**
 * Role-Based Route Protection Middleware
 * 
 * Ensures users can ONLY access routes/pages they're authorized for:
 * - Enterprise Admin: Only enterprise management routes
 * - Super Admin: Only assigned business module routes
 * - Regular Users: Only database-approved pages
 * 
 * This prevents direct URL access even if sidebar hides the page.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check if route is an enterprise-level route
 */
const isEnterpriseRoute = (path) => {
  const enterprisePatterns = [
    '/api/enterprise-admin',
    '/api/enterprise',
    '/enterprise-admin',
    '/super-admins/manage',  // Enterprise manages super admins
    '/clients/manage',       // Enterprise manages clients
  ];
  
  return enterprisePatterns.some(pattern => path.startsWith(pattern));
};

/**
 * Check if route is a business-level route
 */
const isBusinessRoute = (path) => {
  const businessPatterns = [
    '/api/finance',
    '/api/operations',
    '/api/procurement',
    '/api/compliance',
    '/api/hr',
    '/api/warehouse',
    '/api/sales',
    '/api/inventory',
    '/finance',
    '/operations',
    '/procurement',
    '/compliance',
  ];
  
  return businessPatterns.some(pattern => path.startsWith(pattern));
};

/**
 * Middleware: Require Enterprise Admin role
 */
const requireEnterpriseAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      ok: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  const userRole = (req.user.role || '').toUpperCase();
  
  if (userRole !== 'ENTERPRISE_ADMIN') {
    console.log(`🚫 [ACCESS DENIED] User ${req.user.email} (${userRole}) tried to access enterprise route: ${req.path}`);
    return res.status(403).json({ 
      ok: false,
      error: 'Access denied', 
      message: 'Enterprise Admin access required',
      userRole: userRole
    });
  }
  
  console.log(`✅ [ACCESS GRANTED] Enterprise Admin ${req.user.email} accessing: ${req.path}`);
  next();
};

/**
 * Middleware: Require Super Admin role
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      ok: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  const userRole = (req.user.role || '').toUpperCase();
  
  if (userRole !== 'SUPER_ADMIN') {
    console.log(`🚫 [ACCESS DENIED] User ${req.user.email} (${userRole}) tried to access super admin route: ${req.path}`);
    return res.status(403).json({ 
      ok: false,
      error: 'Access denied', 
      message: 'Super Admin access required',
      userRole: userRole
    });
  }
  
  console.log(`✅ [ACCESS GRANTED] Super Admin ${req.user.email} accessing: ${req.path}`);
  next();
};

/**
 * Middleware: Require business-level access (Super Admin or below)
 * Blocks Enterprise Admin from accessing business routes
 */
const requireBusinessLevel = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      ok: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }

  const userRole = (req.user.role || '').toUpperCase();
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'USER'];
  
  if (!allowedRoles.includes(userRole)) {
    console.log(`🚫 [ACCESS DENIED] User ${req.user.email} (${userRole}) tried to access business route: ${req.path}`);
    return res.status(403).json({ 
      ok: false,
      error: 'Access denied', 
      message: 'Business-level access required',
      userRole: userRole
    });
  }
  
  console.log(`✅ [ACCESS GRANTED] ${userRole} ${req.user.email} accessing: ${req.path}`);
  next();
};

/**
 * Middleware: Check if user has access to specific module
 * For Super Admin: Checks module_assignments table
 * For Regular Users: Checks user_permissions table
 */
const requireModuleAccess = (moduleName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        ok: false,
        error: 'Authentication required' 
      });
    }

    const userRole = (req.user.role || '').toUpperCase();

    // Enterprise Admin has access to all modules
    if (userRole === 'ENTERPRISE_ADMIN') {
      return next();
    }

    // Super Admin: Check module assignments
    if (userRole === 'SUPER_ADMIN') {
      try {
        // ✅ SECURITY FIX: Check module assignment by module_code (case-insensitive)
        const hasAccess = await prisma.module_assignments.findFirst({
          where: {
            super_admin_id: req.user.id,
            modules: {
              module_code: {
                equals: moduleName.toUpperCase(),
                mode: 'insensitive'
              }
            }
          }
        });

        if (!hasAccess) {
          console.log(`🚫 [MODULE DENIED] Super Admin ${req.user.email} tried to access module: ${moduleName}`);
          return res.status(403).json({ 
            ok: false,
            error: 'Module access denied',
            message: `You don't have access to the ${moduleName} module`,
            requestedModule: moduleName
          });
        }

        console.log(`✅ [MODULE GRANTED] Super Admin ${req.user.email} accessing module: ${moduleName}`);
        return next();
      } catch (error) {
        console.error('[MODULE ACCESS CHECK ERROR]:', error);
        return res.status(500).json({ 
          ok: false,
          error: 'Failed to verify module access' 
        });
      }
    }

    // Regular users: Check RBAC permissions
    try {
      // Use actual RBAC tables: rbac_roles → rbac_permissions → rbac_routes
      const hasAccess = await prisma.$queryRaw`
        SELECT 1 FROM rbac_permissions rp
        INNER JOIN rbac_roles rr ON rr.id = rp.role_id
        INNER JOIN rbac_routes rt ON rt.id = rp.route_id
        WHERE rr.name = ${req.user.role}
        AND rt.path LIKE ${`%${moduleName}%`}
        AND rp.granted = true
        LIMIT 1
      `;

      if (!hasAccess || hasAccess.length === 0) {
        console.log(`🚫 [MODULE DENIED] User ${req.user.email} tried to access module: ${moduleName}`);
        return res.status(403).json({ 
          ok: false,
          error: 'Module access denied',
          message: `You don't have access to the ${moduleName} module`
        });
      }

      console.log(`✅ [MODULE GRANTED] User ${req.user.email} accessing module: ${moduleName}`);
      next();
    } catch (error) {
      console.error('[MODULE ACCESS CHECK ERROR]:', error);
      return res.status(500).json({ 
        ok: false,
        error: 'Failed to verify module access' 
      });
    }
  };
};

/**
 * Middleware: Check if user has access to specific page
 * This is the MOST GRANULAR permission check
 */
const requirePageAccess = (pageId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        ok: false,
        error: 'Authentication required' 
      });
    }

    const userRole = (req.user.role || '').toUpperCase();

    // Enterprise Admin has full access
    if (userRole === 'ENTERPRISE_ADMIN') {
      // But only to enterprise pages
      if (pageId.startsWith('enterprise-') || pageId.includes('super-admins')) {
        return next();
      }
      console.log(`🚫 [PAGE DENIED] Enterprise Admin ${req.user.email} tried to access business page: ${pageId}`);
      return res.status(403).json({ 
        ok: false,
        error: 'Access denied',
        message: 'Enterprise Admin cannot access business pages'
      });
    }

    // Super Admin: Check page permissions from module assignments
    if (userRole === 'SUPER_ADMIN') {
      try {
        // ✅ SECURITY FIX: Add tenant filter to module assignments
        const tenantId = req.user.tenant_id;
        // Get all page permissions from module assignments
        const assignments = await prisma.module_assignments.findMany({
          where: {
            super_admin_id: req.user.id,
            ...(tenantId && { tenant_id: tenantId }) // ✅ SECURITY: Tenant isolation
          },
          include: {
            modules: true
          }
        });

        // Check if pageId is in any of the page_permissions arrays
        const hasAccess = assignments.some(assignment => {
          const pagePermissions = assignment.page_permissions || [];
          return pagePermissions.includes(pageId);
        });

        if (!hasAccess) {
          console.log(`🚫 [PAGE DENIED] Super Admin ${req.user.email} tried to access unapproved page: ${pageId}`);
          return res.status(403).json({ 
            ok: false,
            error: 'Page access denied',
            message: 'This page has not been assigned to you by the administrator',
            requestedPage: pageId
          });
        }

        console.log(`✅ [PAGE GRANTED] Super Admin ${req.user.email} accessing page: ${pageId}`);
        return next();
      } catch (error) {
        console.error('[PAGE ACCESS CHECK ERROR]:', error);
        return res.status(500).json({ 
          ok: false,
          error: 'Failed to verify page access' 
        });
      }
    }

    // Regular users: Check RBAC permissions for page access
    try {
      // Use actual RBAC tables: rbac_roles → rbac_permissions → rbac_routes
      const hasAccess = await prisma.$queryRaw`
        SELECT 1 FROM rbac_permissions rp
        INNER JOIN rbac_roles rr ON rr.id = rp.role_id
        INNER JOIN rbac_routes rt ON rt.id = rp.route_id
        WHERE rr.name = ${req.user.role}
        AND (rt.path = ${pageId} OR rt.name = ${pageId} OR rt.path LIKE ${`%${pageId}%`})
        AND rp.granted = true
        LIMIT 1
      `;

      if (!hasAccess || hasAccess.length === 0) {
        console.log(`🚫 [PAGE DENIED] User ${req.user.email} tried to access unapproved page: ${pageId}`);
        return res.status(403).json({ 
          ok: false,
          error: 'Page access denied',
          message: 'You do not have permission to access this page',
          requestedPage: pageId
        });
      }

      console.log(`✅ [PAGE GRANTED] User ${req.user.email} accessing page: ${pageId}`);
      next();
    } catch (error) {
      console.error('[PAGE ACCESS CHECK ERROR]:', error);
      return res.status(500).json({ 
        ok: false,
        error: 'Failed to verify page access' 
      });
    }
  };
};

/**
 * Smart route protection middleware
 * Automatically determines protection level based on route
 */
const smartRouteProtection = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      ok: false,
      error: 'Authentication required' 
    });
  }

  const path = req.path;
  const userRole = (req.user.role || '').toUpperCase();

  console.log(`🔍 [ROUTE CHECK] ${userRole} ${req.user.email} → ${path}`);

  // Enterprise routes: Only Enterprise Admin
  if (isEnterpriseRoute(path)) {
    if (userRole !== 'ENTERPRISE_ADMIN') {
      console.log(`🚫 [BLOCKED] ${userRole} cannot access enterprise route`);
      return res.status(403).json({ 
        ok: false,
        error: 'Access denied',
        message: 'Enterprise Admin access required'
      });
    }
    return next();
  }

  // Business routes: NOT Enterprise Admin
  if (isBusinessRoute(path)) {
    if (userRole === 'ENTERPRISE_ADMIN') {
      console.log(`🚫 [BLOCKED] Enterprise Admin cannot access business routes`);
      return res.status(403).json({ 
        ok: false,
        error: 'Access denied',
        message: 'Enterprise Admin cannot access business operations'
      });
    }
    return next();
  }

  // All other routes: Allow (will be checked by specific middleware)
  next();
};

module.exports = {
  requireEnterpriseAdmin,
  requireSuperAdmin,
  requireBusinessLevel,
  requireModuleAccess,
  requirePageAccess,
  smartRouteProtection,
  isEnterpriseRoute,
  isBusinessRoute
};
