/**
 * Page Access Middleware (RBAC Enforcement)
 * 
 * Use this middleware to protect routes that require page-level RBAC.
 * It checks role_page_access table to verify user can access the page.
 * 
 * Usage:
 *   router.get('/some-page', authenticate, checkPageAccess('PAGE_CODE'), handler);
 *   router.get('/some-page', authenticate, checkPageAccess('PAGE_CODE', 'edit'), handler);
 */

const { getPrisma } = require('../lib/prisma');

/**
 * Check if user has access to a specific page
 * @param {string} pageCode - The page_code from pages_master
 * @param {string} requiredLevel - 'view' | 'edit' | 'delete' | 'export' (default: 'view')
 */
function checkPageAccess(pageCode, requiredLevel = 'view') {
  return async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const userId = req.user?.id;
      const userRole = (req.user?.role || req.user?.roleName || '').toUpperCase();
      
      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED'
        });
      }
      
      // Super Admin has full access to their scope
      if (userRole === 'SUPER_ADMIN') {
        // Check if page is in Super Admin scope
        const pageInfo = await prisma.$queryRaw`
          SELECT pm.route, mm.module_code
          FROM pages_master pm
          LEFT JOIN modules_master mm ON pm.module_id = mm.id
          WHERE pm.page_code = ${pageCode}
          LIMIT 1
        `;
        
        if (pageInfo.length > 0) {
          const page = pageInfo[0];
          const inScope = page.route?.startsWith('/super-admin') ||
                         page.route?.startsWith('/system') ||
                         page.module_code === 'COMMON';
          
          if (inScope) {
            req.pageAccess = { level: 'full', role: userRole };
            return next();
          }
        }
        
        return res.status(403).json({
          ok: false,
          error: 'Page not in Super Admin scope',
          code: 'ACCESS_DENIED',
          pageCode
        });
      }
      
      // Enterprise Admin has full access to their scope
      if (userRole === 'ENTERPRISE_ADMIN') {
        const pageInfo = await prisma.$queryRaw`
          SELECT pm.route, mm.module_code
          FROM pages_master pm
          LEFT JOIN modules_master mm ON pm.module_id = mm.id
          WHERE pm.page_code = ${pageCode}
          LIMIT 1
        `;
        
        if (pageInfo.length > 0) {
          const page = pageInfo[0];
          const inScope = page.route?.startsWith('/enterprise') ||
                         page.module_code === 'COMMON';
          
          if (inScope) {
            req.pageAccess = { level: 'full', role: userRole };
            return next();
          }
        }
        
        return res.status(403).json({
          ok: false,
          error: 'Page not in Enterprise Admin scope',
          code: 'ACCESS_DENIED',
          pageCode
        });
      }
      
      // Regular users: check role_page_access
      const access = await prisma.$queryRaw`
        SELECT 
          rpa.can_view,
          rpa.can_edit,
          rpa.can_delete,
          rpa.can_export
        FROM role_page_access rpa
        INNER JOIN pages_master pm ON pm.id = rpa.page_id
        WHERE pm.page_code = ${pageCode}
          AND rpa.role_name = ${userRole}
          AND pm.is_active = true
        LIMIT 1
      `;
      
      if (access.length === 0) {
        return res.status(403).json({
          ok: false,
          error: 'No access to this page',
          code: 'ACCESS_DENIED',
          pageCode,
          role: userRole
        });
      }
      
      const perms = access[0];
      
      // Check required level
      const levelChecks = {
        view: perms.can_view,
        edit: perms.can_edit,
        delete: perms.can_delete,
        export: perms.can_export
      };
      
      if (!levelChecks[requiredLevel]) {
        return res.status(403).json({
          ok: false,
          error: `Insufficient permissions (need ${requiredLevel})`,
          code: 'INSUFFICIENT_PERMISSIONS',
          pageCode,
          role: userRole,
          required: requiredLevel
        });
      }
      
      // Attach permissions to request for downstream use
      req.pageAccess = {
        pageCode,
        role: userRole,
        level: perms.can_delete ? 'full' : perms.can_edit ? 'edit' : 'view',
        canView: perms.can_view,
        canEdit: perms.can_edit,
        canDelete: perms.can_delete,
        canExport: perms.can_export
      };
      
      next();
      
    } catch (error) {
      console.error(`[PageAccess] Error checking access for ${pageCode}:`, error);
      return res.status(500).json({
        ok: false,
        error: 'Failed to check page access',
        code: 'INTERNAL_ERROR'
      });
    }
  };
}

/**
 * Middleware factory to check if user can access based on path pattern
 * Useful for dynamic routes like /api/pages/:path
 */
function checkPathAccess(requiredLevel = 'view') {
  return async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const userId = req.user?.id;
      const requestPath = req.path || req.originalUrl?.split('?')[0];
      
      if (!userId) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }
      
      // Find page by route
      const pageInfo = await prisma.$queryRaw`
        SELECT pm.page_code, pm.is_public
        FROM pages_master pm
        WHERE pm.route = ${requestPath}
          AND pm.is_active = true
        LIMIT 1
      `;
      
      if (pageInfo.length === 0) {
        // Page not in DB - allow (might be a new page)
        console.warn(`[PageAccess] Path not in DB: ${requestPath}`);
        return next();
      }
      
      const page = pageInfo[0];
      
      // Public pages bypass RBAC
      if (page.is_public) {
        req.pageAccess = { level: 'view', isPublic: true };
        return next();
      }
      
      // Use the standard page access check
      return checkPageAccess(page.page_code, requiredLevel)(req, res, next);
      
    } catch (error) {
      console.error('[PageAccess] Error checking path access:', error);
      return res.status(500).json({ ok: false, error: 'Failed to check access' });
    }
  };
}

module.exports = {
  checkPageAccess,
  checkPathAccess
};
