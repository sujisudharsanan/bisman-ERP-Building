/**
 * ============================================================================
 * BISMAN ERP - RBAC Resolver Middleware
 * ============================================================================
 * 
 * Resolves effective permissions including BASE_USER inheritance.
 * 
 * Key Features:
 * - BASE_USER inheritance for business roles
 * - Platform role isolation (no inheritance)
 * - Route-level guards
 * - Sidebar order enforcement
 * 
 * Created: 2026-01-25
 * ============================================================================
 */

const { getPool } = require('../db/pool');

// ============================================================================
// ROLE CLASSIFICATION
// ============================================================================

const PLATFORM_ROLES = ['SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN'];
const TENANT_ADMIN_ROLES = ['ADMIN', 'ADMIN_OPS', 'IT_ADMIN'];
const INTERNAL_ROLES = ['BISMAN_ENGINEERING', 'BISMAN_SUPPORT', 'BISMAN_BILLING', 'BISMAN_FINANCE', 'BISMAN_CUSTOMER_CARE', 'QA'];

// Roles that do NOT inherit BASE_USER
const NO_INHERIT_ROLES = [...PLATFORM_ROLES, ...TENANT_ADMIN_ROLES, ...INTERNAL_ROLES];

// Route restrictions by prefix
const ROUTE_RESTRICTIONS = {
  '/enterprise-admin': ['ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'],
  '/super-admin': ['SUPER_ADMIN', 'SYSTEM_ADMIN'],
  '/admin': ['ADMIN', 'ADMIN_OPS', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN'],
  '/internal': [...INTERNAL_ROLES, 'SYSTEM_ADMIN'],
  '/qa': ['QA', 'BISMAN_ENGINEERING', 'SYSTEM_ADMIN'],
  '/system': ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN'],
  '/governance': ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'COMPLIANCE', 'LEGAL', 'CEO', 'CFO']
};

// Dashboard routes per role type
const ROLE_DASHBOARDS = {
  'ENTERPRISE_ADMIN': '/enterprise-admin/dashboard',
  'SUPER_ADMIN': '/super-admin',
  'SYSTEM_ADMIN': '/super-admin',
  'ADMIN': '/admin/client-dashboard',
  'ADMIN_OPS': '/admin/client-dashboard',
  'IT_ADMIN': '/admin/client-dashboard',
  'BISMAN_ENGINEERING': '/internal/teams',
  'BISMAN_SUPPORT': '/internal/customers',
  'BISMAN_CUSTOMER_CARE': '/internal/customers',
  'BISMAN_BILLING': '/internal/customers',
  'BISMAN_FINANCE': '/internal/teams',
  'QA': '/qa'
  // All other roles default to '/dashboard'
};

// ============================================================================
// PERMISSION RESOLUTION
// ============================================================================

/**
 * Check if a role inherits BASE_USER permissions
 */
function inheritsBaseUser(roleName) {
  return !NO_INHERIT_ROLES.includes(roleName);
}

/**
 * Get the dashboard route for a role
 */
function getDashboardForRole(roleName) {
  return ROLE_DASHBOARDS[roleName] || '/dashboard';
}

/**
 * Resolve effective permissions for a user including BASE_USER inheritance
 * 
 * @param {number} userId - User ID
 * @param {string} userRole - User's role name
 * @returns {Promise<Array>} - Array of accessible pages
 */
async function resolveEffectivePermissions(userId, userRole) {
  const pool = getPool();
  
  const shouldInherit = inheritsBaseUser(userRole);
  
  let query;
  const params = [userRole];
  
  if (shouldInherit) {
    // Business roles: Get BASE_USER pages + role-specific pages
    query = `
      SELECT DISTINCT 
        pm.id,
        pm.route,
        pm.page_code as "pageCode",
        pm.display_name as "displayName",
        pm.icon,
        pm.show_in_sidebar as "showInSidebar",
        pm.sidebar_order as "sidebarOrder",
        pm.category,
        mm.module_code as "moduleCode",
        mm.display_name as "moduleName",
        COALESCE(rpa.can_view, true) as "canView",
        COALESCE(rpa.can_edit, false) as "canEdit",
        COALESCE(rpa.can_delete, false) as "canDelete",
        CASE 
          WHEN bup.page_id IS NOT NULL THEN 'BASE_USER'
          ELSE 'DIRECT'
        END as "accessType"
      FROM pages_master pm
      LEFT JOIN modules_master mm ON pm.module_id = mm.id
      LEFT JOIN role_page_access rpa ON rpa.page_id = pm.id AND rpa.role_name = $1
      LEFT JOIN base_user_pages bup ON bup.page_id = pm.id
      WHERE pm.is_active = true
        AND pm.category NOT IN ('PUBLIC', 'SYSTEM_ONLY')
        AND (
          -- BASE_USER inherited pages
          bup.page_id IS NOT NULL
          OR
          -- Role-specific pages
          (rpa.role_name = $1 AND rpa.can_view = true)
        )
      ORDER BY pm.sidebar_order NULLS LAST, pm.display_name
    `;
  } else {
    // Platform/Internal roles: Only role-specific pages (no inheritance)
    query = `
      SELECT DISTINCT
        pm.id,
        pm.route,
        pm.page_code as "pageCode",
        pm.display_name as "displayName",
        pm.icon,
        pm.show_in_sidebar as "showInSidebar",
        pm.sidebar_order as "sidebarOrder",
        pm.category,
        mm.module_code as "moduleCode",
        mm.display_name as "moduleName",
        rpa.can_view as "canView",
        rpa.can_edit as "canEdit",
        rpa.can_delete as "canDelete",
        'DIRECT' as "accessType"
      FROM pages_master pm
      LEFT JOIN modules_master mm ON pm.module_id = mm.id
      INNER JOIN role_page_access rpa ON rpa.page_id = pm.id
      WHERE pm.is_active = true
        AND rpa.role_name = $1
        AND rpa.can_view = true
      ORDER BY pm.sidebar_order NULLS LAST, pm.display_name
    `;
  }
  
  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Get sidebar pages for a user (filtered and sorted)
 * 
 * @param {number} userId - User ID
 * @param {string} userRole - User's role name
 * @returns {Promise<Object>} - Sidebar data with modules and pages
 */
async function getSidebarPages(userId, userRole) {
  const pages = await resolveEffectivePermissions(userId, userRole);
  
  // Filter to sidebar-visible pages only
  const sidebarPages = pages.filter(p => p.showInSidebar === true);
  
  // Get dashboard for this role
  const dashboardRoute = getDashboardForRole(userRole);
  
  // Sort: dashboard first, then by sidebar_order
  sidebarPages.sort((a, b) => {
    // Dashboard routes always first
    if (a.route === dashboardRoute) return -1;
    if (b.route === dashboardRoute) return 1;
    
    // Then by sidebar_order
    const orderA = a.sidebarOrder || 999;
    const orderB = b.sidebarOrder || 999;
    return orderA - orderB;
  });
  
  // Group by module
  const moduleMap = new Map();
  for (const page of sidebarPages) {
    const moduleCode = page.moduleCode || 'COMMON';
    if (!moduleMap.has(moduleCode)) {
      moduleMap.set(moduleCode, {
        code: moduleCode,
        name: page.moduleName || moduleCode,
        pages: []
      });
    }
    moduleMap.get(moduleCode).pages.push({
      id: page.id,
      code: page.pageCode,
      name: page.displayName,
      route: page.route,
      icon: page.icon,
      canEdit: page.canEdit,
      accessType: page.accessType
    });
  }
  
  return {
    role: userRole,
    dashboard: dashboardRoute,
    inheritsBaseUser: inheritsBaseUser(userRole),
    totalPages: sidebarPages.length,
    modules: Array.from(moduleMap.values())
  };
}

/**
 * Check if a user can access a specific route
 * 
 * @param {string} userRole - User's role name
 * @param {string} route - Route to check
 * @returns {Promise<Object>} - Access result with canAccess and permissions
 */
async function checkRouteAccess(userRole, route) {
  // Check route restrictions first
  for (const [prefix, allowedRoles] of Object.entries(ROUTE_RESTRICTIONS)) {
    if (route.startsWith(prefix)) {
      if (!allowedRoles.includes(userRole)) {
        return {
          canAccess: false,
          reason: `Role ${userRole} is not authorized for ${prefix} routes`,
          allowedRoles
        };
      }
    }
  }
  
  // Check if route exists in user's permissions
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT pm.id, pm.route, pm.page_code, rpa.can_view, rpa.can_edit, rpa.can_delete
    FROM pages_master pm
    LEFT JOIN role_page_access rpa ON rpa.page_id = pm.id AND rpa.role_name = $1
    LEFT JOIN base_user_pages bup ON bup.page_id = pm.id
    WHERE pm.route = $2
      AND pm.is_active = true
      AND (
        rpa.can_view = true
        OR (bup.page_id IS NOT NULL AND $3 = true)
      )
    LIMIT 1
  `, [userRole, route, inheritsBaseUser(userRole)]);
  
  if (result.rows.length === 0) {
    return {
      canAccess: false,
      reason: 'Route not found in user permissions'
    };
  }
  
  const page = result.rows[0];
  return {
    canAccess: true,
    pageId: page.id,
    pageCode: page.page_code,
    permissions: {
      canView: page.can_view || inheritsBaseUser(userRole),
      canEdit: page.can_edit || false,
      canDelete: page.can_delete || false
    }
  };
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Route guard middleware - blocks unauthorized route access
 */
function routeGuardMiddleware(req, res, next) {
  const userRole = req.user?.role || req.user?.roleName;
  const requestedPath = req.path;
  
  // Skip for public routes
  if (requestedPath.startsWith('/auth/') || requestedPath === '/login') {
    return next();
  }
  
  // Check route restrictions
  for (const [prefix, allowedRoles] of Object.entries(ROUTE_RESTRICTIONS)) {
    if (requestedPath.startsWith(prefix)) {
      if (!allowedRoles.includes(userRole)) {
        console.warn(`[RouteGuard] BLOCKED: ${userRole} tried to access ${requestedPath}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `Role ${userRole} is not authorized for ${prefix} routes`
        });
      }
    }
  }
  
  next();
}

/**
 * Attach resolved permissions to request
 */
async function attachPermissionsMiddleware(req, res, next) {
  try {
    const userRole = req.user?.role || req.user?.roleName;
    const userId = req.user?.id || req.user?.userId;
    
    if (userRole && userId) {
      req.permissions = await resolveEffectivePermissions(userId, userRole);
      req.roleInfo = {
        role: userRole,
        inheritsBaseUser: inheritsBaseUser(userRole),
        dashboard: getDashboardForRole(userRole),
        isPlatformRole: PLATFORM_ROLES.includes(userRole),
        isTenantAdmin: TENANT_ADMIN_ROLES.includes(userRole),
        isInternalRole: INTERNAL_ROLES.includes(userRole)
      };
    }
    next();
  } catch (error) {
    console.error('[PermissionsMiddleware] Error:', error);
    next(); // Continue without permissions attached
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Classification
  PLATFORM_ROLES,
  TENANT_ADMIN_ROLES,
  INTERNAL_ROLES,
  NO_INHERIT_ROLES,
  ROUTE_RESTRICTIONS,
  ROLE_DASHBOARDS,
  
  // Functions
  inheritsBaseUser,
  getDashboardForRole,
  resolveEffectivePermissions,
  getSidebarPages,
  checkRouteAccess,
  
  // Middleware
  routeGuardMiddleware,
  attachPermissionsMiddleware
};
