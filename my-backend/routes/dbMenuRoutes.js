/**
 * DB-Driven Menu API with RBAC Enforcement
 * Single source of truth for sidebar navigation
 * 
 * Tables used:
 * - pages_master: page definitions (page_code, display_name, route, module_id, icon, sort_order, is_active, show_in_sidebar)
 * - modules_master: module definitions (module_code, display_name, sort_order, is_active)
 * - admin_page_assignments: role-page mappings (assigner_type, assignee_type, page_id, is_active)
 * 
 * HIERARCHY DESIGN (EA = Manufacturer, SA = Driver):
 * ================================================
 * 1. ENTERPRISE_ADMIN (EA) - The "Manufacturer"
 *    - Creates ALL role-page assignments
 *    - Assigns pages to: SUPER_ADMIN, ADMIN, and other roles
 *    - Has full control over what pages each role can see
 * 
 * 2. SUPER_ADMIN (SA) - The "Driver"
 *    - Can only VIEW what EA assigned to their role
 *    - Can DISABLE pages for sub-roles (set is_active=false)
 *    - CANNOT add new pages that EA didn't assign
 *    - Can only navigate/filter, not create
 * 
 * 3. ADMIN and other roles
 *    - See pages assigned by EA (assigner_type='ENTERPRISE_ADMIN')
 *    - Filtered by SA-disabled pages (where SA set is_active=false)
 * 
 * Access Control Flow:
 * 1. Super Admin / Enterprise Admin → scope-based (super-admin/*, enterprise-admin/*)
 * 2. Regular users → admin_page_assignments where assigner_type='ENTERPRISE_ADMIN'
 * 3. SA can disable pages → is_active=false in admin_page_assignments
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// Feature flag for DB menu (allows rollback to PAGE_REGISTRY)
const USE_DB_MENU = process.env.USE_DB_MENU !== 'false'; // Default true

/**
 * GET /api/menu/sidebar
 * Returns ONLY authorized menu items for the logged-in user
 * RBAC is enforced here - frontend should NOT filter again
 */
router.get('/sidebar', authenticate, async (req, res) => {
  try {
    // Feature flag check
    if (!USE_DB_MENU) {
      return res.json({
        ok: false,
        error: 'DB menu disabled',
        fallback: true,
        message: 'Use PAGE_REGISTRY fallback'
      });
    }

    const prisma = getPrisma();
    const userId = req.user?.id;
    const userRole = (req.user?.role || req.user?.roleName || '').toUpperCase();
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    console.log(`[Menu API] Sidebar request - User: ${userId}, Role: ${userRole}, Tenant: ${tenantId}`);
    
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }
    
    let menuItems = [];
    let menuType = 'user';
    
    // ========== SUPER ADMIN ==========
    // SA is the "Driver" - sees only what EA assigned to SUPER_ADMIN role
    if (userRole === 'SUPER_ADMIN') {
      menuType = 'super-admin';
      
      // Super Admin sees pages assigned by EA to SUPER_ADMIN role
      // Plus super-admin/* scope pages for navigation
      menuItems = await prisma.$queryRaw`
        SELECT DISTINCT
          pm.id,
          pm.page_code as "pageCode",
          pm.display_name as name,
          pm.route as path,
          pm.icon as "iconKey",
          mm.module_code as module,
          mm.display_name as "moduleName",
          pm.show_in_sidebar as "showInSidebar",
          pm.sort_order as "order",
          pm.description,
          mm.sort_order as "moduleOrder"
        FROM pages_master pm
        LEFT JOIN modules_master mm ON pm.module_id = mm.id
        LEFT JOIN admin_page_assignments apa ON apa.page_id = pm.id
        WHERE pm.is_active = true
          AND pm.show_in_sidebar = true
          AND (
            -- EA-assigned pages for SUPER_ADMIN role
            (apa.assignee_type = 'SUPER_ADMIN' 
             AND apa.assigner_type = 'ENTERPRISE_ADMIN' 
             AND apa.is_active = true)
            -- OR super-admin scope pages
            OR pm.route LIKE '/super-admin%'
            -- OR common pages
            OR mm.module_code = 'COMMON'
          )
        ORDER BY "moduleOrder" NULLS LAST, "order", name
      `;
    }
    
    // ========== ENTERPRISE ADMIN ==========
    else if (userRole === 'ENTERPRISE_ADMIN') {
      menuType = 'enterprise-admin';
      
      // Enterprise Admin sees enterprise-admin/* pages + common pages
      menuItems = await prisma.$queryRaw`
        SELECT 
          pm.id,
          pm.page_code as "pageCode",
          pm.display_name as name,
          pm.route as path,
          pm.icon as "iconKey",
          mm.module_code as module,
          mm.display_name as "moduleName",
          pm.show_in_sidebar as "showInSidebar",
          pm.sort_order as "order",
          pm.description,
          mm.sort_order as "moduleOrder"
        FROM pages_master pm
        LEFT JOIN modules_master mm ON pm.module_id = mm.id
        WHERE pm.is_active = true
          AND pm.show_in_sidebar = true
          AND (
            pm.route LIKE '/enterprise-admin%'
            OR pm.route LIKE '/enterprise%'
            OR mm.module_code = 'COMMON'
          )
        ORDER BY mm.sort_order NULLS LAST, pm.sort_order, pm.display_name
      `;
    }
    
    // ========== TENANT ADMIN (ADMIN role) ==========
    // Uses admin_page_assignments to allow EA to control what ADMIN sees
    else if (userRole === 'ADMIN') {
      menuType = 'admin';
      
      // Get pages assigned to ADMIN role by Enterprise Admin
      menuItems = await prisma.$queryRaw`
        SELECT DISTINCT
          pm.id,
          pm.page_code as "pageCode",
          pm.display_name as name,
          pm.route as path,
          pm.icon as "iconKey",
          mm.module_code as module,
          mm.display_name as "moduleName",
          pm.show_in_sidebar as "showInSidebar",
          pm.sort_order as "order",
          pm.description,
          mm.sort_order as "moduleOrder"
        FROM pages_master pm
        LEFT JOIN modules_master mm ON pm.module_id = mm.id
        INNER JOIN admin_page_assignments apa ON apa.page_id = pm.id
        WHERE pm.is_active = true
          AND pm.show_in_sidebar = true
          AND apa.assignee_type = 'ADMIN'
          AND apa.is_active = true
        ORDER BY "moduleOrder" NULLS LAST, "order", name
      `;
      
      // Fallback: if no assignments found, use scope-based defaults
      if (!menuItems || menuItems.length === 0) {
        console.log('[Menu API] No admin_page_assignments for ADMIN, falling back to scope-based');
        menuItems = await prisma.$queryRaw`
          SELECT 
            pm.id,
            pm.page_code as "pageCode",
            pm.display_name as name,
            pm.route as path,
            pm.icon as "iconKey",
            mm.module_code as module,
            mm.display_name as "moduleName",
            pm.show_in_sidebar as "showInSidebar",
            pm.sort_order as "order",
            pm.description,
            mm.sort_order as "moduleOrder"
          FROM pages_master pm
          LEFT JOIN modules_master mm ON pm.module_id = mm.id
          WHERE pm.is_active = true
            AND pm.show_in_sidebar = true
            AND (
              pm.route LIKE '/admin%'
              OR pm.route = '/dashboard'
              OR mm.module_code = 'COMMON'
            )
          ORDER BY "moduleOrder" NULLS LAST, "order", name
        `;
      }
    }
    
    // ========== REGULAR USERS (RBAC-based) ==========
    // Design: EA assigns pages to all roles. SA can only DISABLE (not add).
    // Regular users see: EA-assigned pages for their role, minus any SA-disabled pages.
    else {
      menuType = 'user';
      
      // Get the user's Super Admin ID (for filtering disabled pages)
      const userSuperAdminId = req.user?.super_admin_id || req.user?.superAdminId;
      
      console.log(`[Menu API] Regular user: role=${userRole}, superAdminId=${userSuperAdminId}`);
      
      // Primary: Get pages assigned to user's role by ENTERPRISE_ADMIN
      // These are the base permissions - EA is the "manufacturer"
      menuItems = await prisma.$queryRaw`
        SELECT DISTINCT
          pm.id,
          pm.page_code as "pageCode",
          pm.display_name as name,
          pm.route as path,
          pm.icon as "iconKey",
          mm.module_code as module,
          mm.display_name as "moduleName",
          pm.show_in_sidebar as "showInSidebar",
          pm.sort_order as "order",
          pm.description,
          mm.sort_order as "moduleOrder",
          true as can_view,
          true as can_edit,
          true as can_delete,
          true as can_export
        FROM pages_master pm
        LEFT JOIN modules_master mm ON pm.module_id = mm.id
        INNER JOIN admin_page_assignments apa ON apa.page_id = pm.id
        WHERE pm.is_active = true
          AND pm.show_in_sidebar = true
          AND apa.assignee_type = ${userRole}
          AND apa.assigner_type = 'ENTERPRISE_ADMIN'
          AND apa.is_active = true
        ORDER BY "moduleOrder" NULLS LAST, "order", name
      `;
      console.log(`[Menu API] Found ${menuItems.length} EA-assigned pages for ${userRole}`);
      
      // If SA has disabled some pages, filter them out
      // SA can only DISABLE pages that EA assigned - checked via is_active = false
      if (userSuperAdminId && menuItems.length > 0) {
        const disabledPages = await prisma.$queryRaw`
          SELECT page_id
          FROM admin_page_assignments
          WHERE assignee_type = ${userRole}
            AND assigner_type = 'SUPER_ADMIN'
            AND assigner_id = ${userSuperAdminId}
            AND is_active = false
        `;
        
        if (disabledPages.length > 0) {
          const disabledIds = new Set(disabledPages.map(p => p.page_id));
          const beforeCount = menuItems.length;
          menuItems = menuItems.filter(item => !disabledIds.has(item.id));
          console.log(`[Menu API] SA disabled ${beforeCount - menuItems.length} pages, ${menuItems.length} remaining`);
        }
      }
      
      // Fallback: If EA hasn't assigned to this role, check if SA has legacy assignments
      // This maintains backward compatibility with existing SA-created assignments
      if (!menuItems || menuItems.length === 0) {
        console.log(`[Menu API] No EA assignments for ${userRole}, checking SA legacy assignments`);
        menuItems = await prisma.$queryRaw`
          SELECT DISTINCT
            pm.id,
            pm.page_code as "pageCode",
            pm.display_name as name,
            pm.route as path,
            pm.icon as "iconKey",
            mm.module_code as module,
            mm.display_name as "moduleName",
            pm.show_in_sidebar as "showInSidebar",
            pm.sort_order as "order",
            pm.description,
            mm.sort_order as "moduleOrder",
            true as can_view,
            true as can_edit,
            true as can_delete,
            true as can_export
          FROM pages_master pm
          LEFT JOIN modules_master mm ON pm.module_id = mm.id
          INNER JOIN admin_page_assignments apa ON apa.page_id = pm.id
          WHERE pm.is_active = true
            AND pm.show_in_sidebar = true
            AND apa.assignee_type = ${userRole}
            AND apa.assigner_type = 'SUPER_ADMIN'
            AND apa.is_active = true
          ORDER BY "moduleOrder" NULLS LAST, "order", name
        `;
        console.log(`[Menu API] Found ${menuItems.length} SA legacy pages for ${userRole}`);
      }
      
      // Also include common pages that are public (no RBAC needed)
      const commonPages = await prisma.$queryRaw`
        SELECT 
          pm.id,
          pm.page_code as "pageCode",
          pm.display_name as name,
          pm.route as path,
          pm.icon as "iconKey",
          'COMMON' as module,
          'Common' as "moduleName",
          pm.show_in_sidebar as "showInSidebar",
          pm.sort_order as "order",
          pm.description,
          999 as "moduleOrder"
        FROM pages_master pm
        WHERE pm.is_active = true
          AND pm.show_in_sidebar = true
          AND pm.is_public = true
      `;
      
      // Merge without duplicates
      const existingIds = new Set(menuItems.map(m => m.id));
      for (const cp of commonPages) {
        if (!existingIds.has(cp.id)) {
          menuItems.push(cp);
        }
      }
    }
    
    // ========== GROUP BY MODULE ==========
    const grouped = {};
    const moduleOrder = new Map();
    
    for (const item of menuItems) {
      const moduleCode = item.module || 'COMMON';
      const moduleName = item.moduleName || moduleCode.replace(/_/g, ' ');
      
      if (!grouped[moduleCode]) {
        grouped[moduleCode] = {
          id: moduleCode.toLowerCase(),
          code: moduleCode,
          name: moduleName,
          order: item.moduleOrder || 999,
          items: []
        };
        moduleOrder.set(moduleCode, item.moduleOrder || 999);
      }
      
      grouped[moduleCode].items.push({
        id: item.pageCode,
        name: item.name,
        path: item.path,
        iconKey: item.iconKey || 'Circle',
        order: item.order || 0,
        description: item.description,
        permissions: item.can_view ? {
          canView: item.can_view || false,
          canEdit: item.can_edit || false,
          canDelete: item.can_delete || false,
          canExport: item.can_export || false
        } : undefined
      });
    }
    
    // Sort modules by order, then sort items within each module
    const modules = Object.values(grouped)
      .sort((a, b) => (a.order || 999) - (b.order || 999))
      .map(mod => ({
        ...mod,
        items: mod.items.sort((a, b) => (a.order || 0) - (b.order || 0))
      }));
    
    // Create flat items list
    const flatItems = [];
    for (const mod of modules) {
      for (const item of mod.items) {
        flatItems.push({
          ...item,
          module: mod.code
        });
      }
    }
    
    console.log(`[Menu API] Returning ${flatItems.length} pages in ${modules.length} modules for ${userRole}`);
    
    res.json({
      ok: true,
      user: {
        id: userId,
        role: userRole,
        tenantId
      },
      menuType,
      modules,
      flatItems,
      totalItems: flatItems.length,
      source: 'database'
    });
    
  } catch (error) {
    console.error('[Menu API] Error fetching sidebar:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message,
      fallback: true,
      message: 'Use PAGE_REGISTRY fallback'
    });
  }
});

/**
 * GET /api/menu/modules
 * Returns all active modules with their page counts
 */
router.get('/modules', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const modules = await prisma.$queryRaw`
      SELECT 
        mm.id,
        mm.module_code as code,
        mm.display_name as name,
        mm.icon,
        mm.sort_order as "order",
        mm.description,
        COUNT(pm.id)::int as "pageCount",
        SUM(CASE WHEN pm.show_in_sidebar THEN 1 ELSE 0 END)::int as "visiblePages"
      FROM modules_master mm
      LEFT JOIN pages_master pm ON pm.module_id = mm.id AND pm.is_active = true
      WHERE mm.is_active = true
      GROUP BY mm.id, mm.module_code, mm.display_name, mm.icon, mm.sort_order, mm.description
      ORDER BY mm.sort_order, mm.module_code
    `;
    
    res.json({
      ok: true,
      modules
    });
    
  } catch (error) {
    console.error('[Menu API] Error fetching modules:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/menu/check-access/:pageCode
 * Check if current user can access a specific page (for direct URL access)
 * This is the AUTHORITATIVE check - use this in route guards
 */
router.get('/check-access/:pageCode', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { pageCode } = req.params;
    const userId = req.user?.id;
    const userRole = (req.user?.role || req.user?.roleName || '').toUpperCase();
    
    if (!userId) {
      return res.status(401).json({ 
        ok: false, 
        hasAccess: false, 
        error: 'Not authenticated' 
      });
    }
    
    // Get the page info first
    const pageInfo = await prisma.$queryRaw`
      SELECT 
        pm.id,
        pm.page_code,
        pm.route,
        pm.is_active,
        pm.is_public,
        mm.module_code
      FROM pages_master pm
      LEFT JOIN modules_master mm ON pm.module_id = mm.id
      WHERE pm.page_code = ${pageCode}
      LIMIT 1
    `;
    
    if (pageInfo.length === 0) {
      return res.json({
        ok: true,
        pageCode,
        hasAccess: false,
        accessLevel: 'none',
        reason: 'Page not found in database'
      });
    }
    
    const page = pageInfo[0];
    
    // Check if page is inactive
    if (!page.is_active) {
      return res.json({
        ok: true,
        pageCode,
        hasAccess: false,
        accessLevel: 'none',
        reason: 'Page is inactive'
      });
    }
    
    // Public pages are accessible to all authenticated users
    if (page.is_public) {
      return res.json({
        ok: true,
        pageCode,
        hasAccess: true,
        accessLevel: 'view',
        reason: 'Public page'
      });
    }
    
    // Super Admin: scope-based access
    if (userRole === 'SUPER_ADMIN') {
      const hasAccess = page.route?.startsWith('/super-admin') || 
                       page.route?.startsWith('/system') ||
                       page.module_code === 'COMMON';
      
      return res.json({
        ok: true,
        pageCode,
        hasAccess,
        accessLevel: hasAccess ? 'full' : 'none',
        reason: hasAccess ? 'Super Admin scope' : 'Outside Super Admin scope'
      });
    }
    
    // Enterprise Admin: scope-based access
    if (userRole === 'ENTERPRISE_ADMIN') {
      const hasAccess = page.route?.startsWith('/enterprise') ||
                       page.module_code === 'COMMON';
      
      return res.json({
        ok: true,
        pageCode,
        hasAccess,
        accessLevel: hasAccess ? 'full' : 'none',
        reason: hasAccess ? 'Enterprise Admin scope' : 'Outside Enterprise Admin scope'
      });
    }
    
    // Regular users: check admin_page_assignments (SINGLE SOURCE OF TRUTH)
    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    const access = await prisma.$queryRaw`
      SELECT 
        is_active as can_view
      FROM admin_page_assignments
      WHERE page_id = ${page.id}
        AND assignee_type = ${userRole}
        AND is_active = true
      LIMIT 1
    `;
    
    if (access.length === 0 || !access[0].can_view) {
      return res.json({
        ok: true,
        pageCode,
        hasAccess: false,
        accessLevel: 'none',
        reason: 'No RBAC permission for this role'
      });
    }
    
    // Full access granted via admin_page_assignments
    res.json({
      ok: true,
      pageCode,
      hasAccess: true,
      accessLevel: 'full',
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canExport: true
      },
      reason: 'RBAC permission granted'
    });
    
  } catch (error) {
    console.error('[Menu API] Error checking access:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/menu/my-permissions
 * Returns all page permissions for the current user
 * Useful for frontend caching
 */
router.get('/my-permissions', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const userRole = (req.user?.role || req.user?.roleName || '').toUpperCase();
    
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }
    
    // Get all permissions for this role from admin_page_assignments (SINGLE SOURCE OF TRUTH)
    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    const permissions = await prisma.$queryRaw`
      SELECT 
        pm.page_code as "pageCode",
        pm.route as path,
        true as "canView",
        true as "canEdit",
        true as "canDelete",
        true as "canExport"
      FROM admin_page_assignments apa
      INNER JOIN pages_master pm ON pm.id = apa.page_id
      WHERE apa.assignee_type = ${userRole}
        AND apa.is_active = true
        AND pm.is_active = true
    `;
    
    // Create a lookup map
    const permissionMap = {};
    for (const p of permissions) {
      permissionMap[p.pageCode] = {
        path: p.path,
        canView: p.canView,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        canExport: p.canExport
      };
    }
    
    res.json({
      ok: true,
      role: userRole,
      totalPages: permissions.length,
      permissions: permissionMap
    });
    
  } catch (error) {
    console.error('[Menu API] Error fetching permissions:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
