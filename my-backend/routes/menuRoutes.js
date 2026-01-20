/**
 * ============================================================================
 * BISMAN ERP - Menu Routes (SSOT)
 * ============================================================================
 * 
 * API endpoint that returns the menu structure for the authenticated user
 * based on their role and DB-driven configuration.
 * 
 * This is the SINGLE SOURCE OF TRUTH for navigation menus.
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPool } = require('../middleware/database');

// ============================================================================
// Role-to-Module Sidebar Mapping
// Defines which modules appear in sidebar for each admin role type
// Admins can still ACCESS all pages, but sidebar shows only their home modules
// ============================================================================
const ROLE_SIDEBAR_MODULES = {
  // Enterprise Admin sees only EA module + essential common pages
  'ENTERPRISE_ADMIN': ['ENTERPRISE_ADMIN', 'COMMON', 'DASHBOARD'],
  
  // Super Admin sees SA module + system + common
  'SUPER_ADMIN': ['SUPER_ADMIN', 'SYSTEM', 'COMMON', 'DASHBOARD', 'SUBSCRIPTIONS'],
  
  // System Admin sees system module
  'SYSTEM_ADMIN': ['SYSTEM', 'COMMON', 'DASHBOARD'],
  
  // Regular Admin sees admin console + common
  'ADMIN': ['ADMIN', 'COMMON', 'DASHBOARD'],
  
  // All other roles: null means "show all modules user has access to"
};

// Route prefixes for admin roles - only show pages with these route prefixes
// This prevents showing unrelated pages from COMMON module
const ROLE_ROUTE_PREFIXES = {
  'ENTERPRISE_ADMIN': ['/enterprise-admin'],
  'SUPER_ADMIN': ['/super-admin', '/system', '/common/', '/dashboard', '/subscriptions'],
  'SYSTEM_ADMIN': ['/system', '/common/', '/dashboard'],
  'ADMIN': ['/admin', '/common/', '/dashboard'],
};

// Routes to explicitly exclude from sidebar (even if matched by prefix)
const EXCLUDED_SIDEBAR_ROUTES = {
  'ENTERPRISE_ADMIN': ['/common/calendar', '/common/messages'],
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
    const routePrefixes = ROLE_ROUTE_PREFIXES[userRole] || null;
    
    // Build module filter clause
    const moduleFilter = sidebarModules ? `AND m.module_code = ANY($2)` : '';
    
    // Build route prefix filter for admin roles
    let routeFilter = '';
    let queryParams = sidebarModules ? [userRole, sidebarModules] : [userRole];
    
    if (routePrefixes) {
      const prefixConditions = routePrefixes.map((_, i) => `p.route LIKE $${queryParams.length + i + 1}`).join(' OR ');
      routeFilter = `AND (${prefixConditions})`;
      queryParams = [...queryParams, ...routePrefixes.map(prefix => prefix + '%')];
      console.log(`[MenuRoutes] Filtering sidebar to routes: ${routePrefixes.join(', ')}`);
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
      INNER JOIN role_page_access rpa ON rpa.page_id = p.id
      WHERE rpa.role_name = $1
        AND rpa.can_view = TRUE
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
        rpa.can_view,
        rpa.can_edit
      FROM pages_master p
      INNER JOIN modules_master m ON m.id = p.module_id
      INNER JOIN role_page_access rpa ON rpa.page_id = p.id
      WHERE rpa.role_name = $1
        AND rpa.can_view = TRUE
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
    const pages = pagesResult.rows;

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
        .filter(p => p.showInSidebar && !excludedRoutes.some(excluded => p.route.startsWith(excluded)))
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

    const result = await client.query(`
      SELECT 
        p.page_code,
        p.display_name,
        rpa.can_view,
        rpa.can_edit
      FROM pages_master p
      INNER JOIN role_page_access rpa ON rpa.page_id = p.id
      WHERE rpa.role_name = $1
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
    const pagesResult = await client.query(`
      SELECT 
        p.*,
        rpa.can_view,
        rpa.can_edit
      FROM pages_master p
      LEFT JOIN role_page_access rpa ON rpa.page_id = p.id AND rpa.role_name = $1
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
