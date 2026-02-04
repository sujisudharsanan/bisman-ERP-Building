/**
 * ============================================================================
 * BISMAN ERP - Menu Routes (SSOT)
 * ============================================================================
 * 
 * API endpoint that returns the menu structure for the authenticated user
 * based on their role and DB-driven configuration.
 * 
 * This is the SINGLE SOURCE OF TRUTH for navigation menus.
 * 
 * SECURITY: Uses 3-layer intersection for non-admin roles:
 *   effectivePages = subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPool } = require('../middleware/database');

// Import effective access service for 3-layer intersection
let effectiveAccessService;
try {
  effectiveAccessService = require('../services/effectiveAccessService');
} catch (err) {
  console.warn('[MenuRoutes] effectiveAccessService not available:', err.message);
  effectiveAccessService = null;
}

// ============================================================================
// Role-to-Module Sidebar Mapping
// Defines which modules appear in sidebar for each admin role type
// Admins can still ACCESS all pages, but sidebar shows only their home modules
// ============================================================================
const ROLE_SIDEBAR_MODULES = {
  // Platform Admins
  'ENTERPRISE_ADMIN': ['ENTERPRISE_ADMIN', 'COMMON', 'DASHBOARD'],
  'SUPER_ADMIN': ['SUPER_ADMIN', 'SYSTEM', 'COMMON', 'DASHBOARD', 'SUBSCRIPTIONS'],
  'SYSTEM_ADMIN': ['SYSTEM', 'COMMON', 'DASHBOARD'],
  'ADMIN': ['ADMIN', 'COMMON', 'DASHBOARD'],
  
  // Operations roles
  'ADMIN_OPS': ['OPERATIONS', 'ASSETS', 'TASK_MANAGEMENT', 'COMMON', 'DASHBOARD'],
  'OPERATIONS_MANAGER': ['OPERATIONS', 'ASSETS', 'TASK_MANAGEMENT', 'COMMON', 'DASHBOARD'],
  
  // Finance roles
  'CFO': ['FINANCE', 'REPORTS', 'COMMON', 'DASHBOARD'],
  'FINANCE_CONTROLLER': ['FINANCE', 'REPORTS', 'COMMON', 'DASHBOARD'],
  'TREASURY': ['FINANCE', 'COMMON', 'DASHBOARD'],
  'ACCOUNTS': ['FINANCE', 'COMMON', 'DASHBOARD'],
  'ACCOUNTS_PAYABLE': ['FINANCE', 'PROCUREMENT', 'COMMON', 'DASHBOARD'],
  'BANKER': ['FINANCE', 'COMMON', 'DASHBOARD'],
  
  // Procurement roles
  'PROCUREMENT_OFFICER': ['PROCUREMENT', 'COMMON', 'DASHBOARD'],
  'STORE_INCHARGE': ['INVENTORY', 'PROCUREMENT', 'COMMON', 'DASHBOARD'],
  'HUB_INCHARGE': ['OPERATIONS', 'INVENTORY', 'COMMON', 'DASHBOARD'],
  
  // Compliance & Legal
  'COMPLIANCE': ['COMPLIANCE', 'COMMON', 'DASHBOARD'],
  'LEGAL': ['COMPLIANCE', 'COMMON', 'DASHBOARD'],
  
  // HR roles
  'HR_MANAGER': ['HR', 'COMMON', 'DASHBOARD'],
  
  // All other roles: null (not in map) means "show all modules user has access to"
};

// Route prefixes for admin roles - FALLBACK only (used when no DB config exists)
// This prevents showing unrelated pages from COMMON module
const FALLBACK_ROUTE_PREFIXES = {
  // Platform Admins
  'ENTERPRISE_ADMIN': ['/enterprise-admin', '/common/calendar', '/common/user-settings'],
  'SUPER_ADMIN': ['/super-admin', '/system', '/common/', '/dashboard', '/subscriptions'],
  'SYSTEM_ADMIN': ['/system', '/common/', '/dashboard'],
  'ADMIN': ['/admin', '/common/', '/dashboard'],
  
  // Operations roles
  'ADMIN_OPS': ['/operations', '/assets', '/tasks', '/common/', '/dashboard'],
  'OPERATIONS_MANAGER': ['/operations', '/assets', '/tasks', '/common/', '/dashboard'],
  
  // Finance roles - see finance, reports, dashboard
  'CFO': ['/finance', '/reports', '/common/', '/dashboard'],
  'FINANCE_CONTROLLER': ['/finance', '/reports', '/common/', '/dashboard'],
  'TREASURY': ['/finance', '/common/', '/dashboard'],
  'ACCOUNTS': ['/finance', '/common/', '/dashboard'],
  'ACCOUNTS_PAYABLE': ['/finance', '/vendors', '/common/', '/dashboard'],
  'BANKER': ['/finance', '/common/', '/dashboard'],
  
  // Procurement roles
  'PROCUREMENT_OFFICER': ['/procurement', '/vendors', '/common/', '/dashboard'],
  'STORE_INCHARGE': ['/inventory', '/procurement', '/common/', '/dashboard'],
  'HUB_INCHARGE': ['/operations', '/inventory', '/common/', '/dashboard'],
  
  // Compliance & Legal
  'COMPLIANCE': ['/compliance', '/audit', '/common/', '/dashboard'],
  'LEGAL': ['/compliance', '/legal', '/common/', '/dashboard'],
  
  // HR roles
  'HR_MANAGER': ['/hr', '/common/', '/dashboard'],
  
  // Staff and general users - no filter (null) = show all accessible pages
};

// ============================================================================
// DYNAMIC SIDEBAR: Get assigned pages/routes for a role from database
// ============================================================================

/**
 * Get sidebar routes for a role dynamically from admin_page_assignments
 * 
 * PRIORITY ORDER:
 * 1. DB: admin_page_assignments for this role (EA-configured)
 * 2. Fallback: FALLBACK_ROUTE_PREFIXES (hardcoded defaults)
 * 3. If neither exists: null (show all accessible pages)
 */
async function getDynamicSidebarRoutes(client, role) {
  try {
    const result = await client.query(`
      SELECT DISTINCT pm.route, pm.page_code, mm.module_code
      FROM admin_page_assignments apa
      JOIN pages_master pm ON pm.id = apa.page_id
      JOIN modules_master mm ON mm.id = pm.module_id
      WHERE apa.assignee_type = $1
        AND apa.is_active = true
        AND pm.is_active = true
        AND pm.show_in_sidebar = true
      ORDER BY mm.module_code, pm.route
    `, [role.toUpperCase()]);
    
    if (result.rows.length > 0) {
      const routes = result.rows.map(r => r.route).filter(Boolean);
      const sidebarRoutes = new Set(routes);
      sidebarRoutes.add('/common/');
      sidebarRoutes.add('/dashboard');
      sidebarRoutes.add('/common/calendar');
      sidebarRoutes.add('/common/user-settings');
      
      console.log(`[MenuRoutes] Dynamic sidebar for ${role}: ${routes.length} pages from DB`);
      return Array.from(sidebarRoutes);
    }
    
    const fallback = FALLBACK_ROUTE_PREFIXES[role.toUpperCase()];
    if (fallback) {
      console.log(`[MenuRoutes] Using fallback sidebar for ${role}`);
      return fallback;
    }
    
    return null;
  } catch (error) {
    console.error(`[MenuRoutes] Error getting dynamic sidebar for ${role}:`, error.message);
    return FALLBACK_ROUTE_PREFIXES[role.toUpperCase()] || null;
  }
}

// Common pages that should ALWAYS be accessible to ALL logged-in users
const ALWAYS_ACCESSIBLE_ROUTES = [
  '/common/calendar',
  '/common/user-settings',
  '/dashboard',
  '/common/notifications'
];

// Routes to explicitly exclude from sidebar (even if matched by prefix)
const EXCLUDED_SIDEBAR_ROUTES = {
  'ENTERPRISE_ADMIN': [], // Removed /common/calendar - it should be accessible
};

// ============================================================================
// GET /api/modules/menu - Get menu for current user
// ============================================================================

router.get('/menu', authenticate, async (req, res) => {
  const client = await getPool().connect();

  try {
    const userRole = req.user?.role || req.user?.roleName;
    const userId = req.user?.id || req.user?.userId;

    if (!userRole) {
      return res.status(400).json({
        success: false,
        message: 'User role not found in token'
      });
    }

    console.log(`[MenuRoutes] Fetching menu for role: ${userRole}, userId: ${userId}`);
    
    // Check if this role has a sidebar module filter
    const sidebarModules = ROLE_SIDEBAR_MODULES[userRole] || null;
    // DYNAMIC: Get sidebar routes from DB (admin_page_assignments) or fallback to hardcoded
    const routePrefixes = await getDynamicSidebarRoutes(client, userRole);
    
    // Build module filter clause
    const moduleFilter = sidebarModules ? `AND m.module_code = ANY($2)` : '';
    
    // Build route prefix filter for admin roles
    let routeFilter = '';
    let queryParams = sidebarModules ? [userRole, sidebarModules] : [userRole];
    
    if (routePrefixes) {
      const prefixConditions = routePrefixes.map((_, i) => `p.route LIKE $${queryParams.length + i + 1}`).join(' OR ');
      routeFilter = `AND (${prefixConditions})`;
      queryParams = [...queryParams, ...routePrefixes.map(prefix => prefix.endsWith('/') ? prefix + '%' : prefix + '%')];
      console.log(`[MenuRoutes] Dynamic sidebar filter: ${routePrefixes.length} routes for ${userRole}`);
    }
    
    if (sidebarModules) {
      console.log(`[MenuRoutes] Filtering sidebar to modules: ${sidebarModules.join(', ')}`);
    }

    // =========================================================================
    // Query 1: Get all modules this role has access to (filtered for sidebar)
    // =========================================================================
    const modulesResult = await client.query(`
      SELECT DISTINCT 
        m.id,
        m.module_code,
        m.display_name,
        m.description,
        m.icon,
        m.base_route,
        m.sort_order,
        m.color_code,
        m.layout_group,
        m.is_hidden
      FROM modules_master m
      INNER JOIN pages_master p ON p.module_id = m.id
      INNER JOIN admin_page_assignments apa ON apa.page_id = p.id
      WHERE apa.assignee_type = $1
        AND apa.is_active = TRUE
        AND m.is_active = TRUE
        AND m.is_hidden = FALSE
        AND p.is_active = TRUE
        AND p.show_in_sidebar = TRUE
        ${moduleFilter}
        ${routeFilter}
      ORDER BY m.sort_order, m.display_name
    `, queryParams);

    // =========================================================================
    // Query 2: Get all pages this role has access to (filtered for sidebar)
    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    // =========================================================================
    const pagesResult = await client.query(`
      SELECT 
        p.id,
        p.page_code,
        p.display_name,
        p.description,
        p.route,
        p.icon,
        p.sort_order,
        p.show_in_sidebar,
        p.module_id,
        m.module_code,
        m.layout_group,
        true as can_view,
        true as can_edit
      FROM pages_master p
      INNER JOIN modules_master m ON m.id = p.module_id
      INNER JOIN admin_page_assignments apa ON apa.page_id = p.id
      WHERE apa.assignee_type = $1
        AND apa.is_active = TRUE
        AND p.is_active = TRUE
        AND m.is_active = TRUE
        AND p.show_in_sidebar = TRUE
        ${moduleFilter}
        ${routeFilter}
      ORDER BY p.sort_order, p.display_name
    `, queryParams);

    // =========================================================================
    // Build hierarchical menu structure
    // =========================================================================
    const modules = modulesResult.rows;
    let pages = pagesResult.rows;

    // =========================================================================
    // SECURITY: Apply 3-layer intersection for non-admin roles
    // This filters pages based on: subscription ∩ enterpriseApproved ∩ superadminApproved
    // =========================================================================
    const isSystemAdmin = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(userRole);
    
    if (!isSystemAdmin && effectiveAccessService) {
      try {
        // Get user's effective pages using 3-layer intersection
        const legacyId = req.user?.legacyId || req.user?.legacy_id;
        const tenantId = req.user?.tenantId || req.user?.tenant_id;
        const planId = req.user?.planId || req.user?.plan_id;
        
        // RBAC FIX: planId is fetched from DB in effectiveAccessService if missing
        
        if (legacyId && tenantId) {
          const effectiveResult = await effectiveAccessService.computeEffectivePages({
            userId: legacyId,
            tenantId,
            planId // Let effectiveAccessService fetch from DB if null
          });
          
          if (effectiveResult && effectiveResult.effectivePages) {
            const effectiveSet = new Set(effectiveResult.effectivePages);
            const originalCount = pages.length;
            
            // Filter pages to only those in the effective set
            pages = pages.filter(p => 
              effectiveSet.has(p.page_code) || 
              effectiveSet.has(p.route) ||
              ALWAYS_ACCESSIBLE_ROUTES.some(r => p.route === r || p.route.startsWith(r))
            );
            
            console.log(`[MenuRoutes] Effective access filter: ${originalCount} -> ${pages.length} pages for user ${legacyId}`);
          }
        }
      } catch (effectiveErr) {
        console.error('[MenuRoutes] Error computing effective pages (using role-based fallback):', effectiveErr.message);
        // Continue with role-based pages as fallback
      }
    }

    // Group pages by module
    const pagesByModule = {};
    for (const page of pages) {
      if (!pagesByModule[page.module_id]) {
        pagesByModule[page.module_id] = [];
      }
      pagesByModule[page.module_id].push({
        id: page.id,
        code: page.page_code,
        name: page.display_name,
        route: page.route,
        icon: page.icon,
        sortOrder: page.sort_order,
        showInSidebar: page.show_in_sidebar,
        permissions: {
          canView: page.can_view,
          canEdit: page.can_edit
        }
      });
    }

    // Get excluded routes for this role
    const excludedRoutes = EXCLUDED_SIDEBAR_ROUTES[userRole] || [];

    // Build final menu structure
    const menu = modules.map(mod => ({
      id: mod.id,
      code: mod.module_code,
      name: mod.display_name,
      description: mod.description,
      icon: mod.icon,
      baseRoute: mod.base_route,
      colorCode: mod.color_code,
      layoutGroup: mod.layout_group,
      sortOrder: mod.sort_order,
      pages: (pagesByModule[mod.id] || [])
        .filter(p => {
          // Always include common accessible routes
          if (ALWAYS_ACCESSIBLE_ROUTES.some(r => p.route === r || p.route.startsWith(r))) {
            return p.showInSidebar;
          }
          // Otherwise apply exclusion rules
          return p.showInSidebar && !excludedRoutes.some(excluded => p.route.startsWith(excluded));
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)
    })).filter(mod => mod.pages.length > 0);

    // =========================================================================
    // Build flat pages list (for route validation)
    // =========================================================================
    const allAccessibleRoutes = pages.map(p => ({
      route: p.route,
      code: p.page_code,
      canView: p.can_view,
      canEdit: p.can_edit
    }));

    // =========================================================================
    // Response
    // =========================================================================
    res.json({
      success: true,
      data: {
        role: userRole,
        menu,
        accessibleRoutes: allAccessibleRoutes,
        meta: {
          totalModules: menu.length,
          totalPages: allAccessibleRoutes.length,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('[MenuRoutes] Error fetching menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/modules/check-access - Check if user can access a specific route
// ============================================================================

router.get('/check-access', authenticate, async (req, res) => {
  const client = await getPool().connect();

  try {
    const userRole = req.user?.role || req.user?.roleName;
    const { route } = req.query;

    if (!route) {
      return res.status(400).json({
        success: false,
        message: 'Route parameter is required'
      });
    }

    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    const result = await client.query(`
      SELECT 
        p.page_code,
        p.display_name,
        true as can_view,
        true as can_edit
      FROM pages_master p
      INNER JOIN admin_page_assignments apa ON apa.page_id = p.id
      WHERE apa.assignee_type = $1
        AND apa.is_active = TRUE
        AND p.route = $2
        AND p.is_active = TRUE
    `, [userRole, route]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          hasAccess: false,
          canView: false,
          canEdit: false,
          route
        }
      });
    }

    const access = result.rows[0];
    res.json({
      success: true,
      data: {
        hasAccess: access.can_view,
        canView: access.can_view,
        canEdit: access.can_edit,
        pageCode: access.page_code,
        pageName: access.display_name,
        route
      }
    });

  } catch (error) {
    console.error('[MenuRoutes] Error checking access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check access',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/modules/all - Get all modules (for admin pages)
// ============================================================================

router.get('/all', authenticate, async (req, res) => {
  const client = await getPool().connect();

  try {
    const userRole = req.user?.role || req.user?.roleName;

    // Only allow super admins and enterprise admins
    const allowedRoles = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view all modules'
      });
    }

    const modulesResult = await client.query(`
      SELECT 
        m.*,
        COUNT(p.id) as page_count
      FROM modules_master m
      LEFT JOIN pages_master p ON p.module_id = m.id AND p.is_active = TRUE
      GROUP BY m.id
      ORDER BY m.sort_order, m.display_name
    `);

    res.json({
      success: true,
      data: {
        modules: modulesResult.rows.map(m => ({
          id: m.id,
          code: m.module_code,
          name: m.display_name,
          description: m.description,
          icon: m.icon,
          baseRoute: m.base_route,
          sortOrder: m.sort_order,
          isActive: m.is_active,
          isHidden: m.is_hidden,
          colorCode: m.color_code,
          layoutGroup: m.layout_group,
          productType: m.product_type,
          pageCount: parseInt(m.page_count, 10),
          createdAt: m.created_at,
          updatedAt: m.updated_at
        }))
      }
    });

  } catch (error) {
    console.error('[MenuRoutes] Error fetching all modules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch modules',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/modules/:moduleCode/pages - Get pages for a module
// ============================================================================

router.get('/:moduleCode/pages', authenticate, async (req, res) => {
  const client = await getPool().connect();

  try {
    const { moduleCode } = req.params;
    const userRole = req.user?.role || req.user?.roleName;

    // Get module
    const moduleResult = await client.query(`
      SELECT id, module_code, display_name FROM modules_master 
      WHERE module_code = $1 AND is_active = TRUE
    `, [moduleCode]);

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Module ${moduleCode} not found`
      });
    }

    const module = moduleResult.rows[0];

    // Get pages with access info
    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    const pagesResult = await client.query(`
      SELECT 
        p.*,
        COALESCE(apa.is_active, false) as can_view,
        true as can_edit
      FROM pages_master p
      LEFT JOIN admin_page_assignments apa ON apa.page_id = p.id AND apa.assignee_type = $1 AND apa.is_active = TRUE
      WHERE p.module_id = $2 AND p.is_active = TRUE
      ORDER BY p.sort_order, p.display_name
    `, [userRole, module.id]);

    res.json({
      success: true,
      data: {
        module: {
          id: module.id,
          code: module.module_code,
          name: module.display_name
        },
        pages: pagesResult.rows.map(p => ({
          id: p.id,
          code: p.page_code,
          name: p.display_name,
          description: p.description,
          route: p.route,
          icon: p.icon,
          sortOrder: p.sort_order,
          showInSidebar: p.show_in_sidebar,
          status: p.status,
          access: {
            canView: p.can_view || false,
            canEdit: p.can_edit || false
          }
        }))
      }
    });

  } catch (error) {
    console.error('[MenuRoutes] Error fetching module pages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch module pages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
});

module.exports = router;
