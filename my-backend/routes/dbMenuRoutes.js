/**
 * DB-Driven Menu API
 * Single source of truth for sidebar/menu - reads from pages_master
 * 
 * This replaces the frontend PAGE_REGISTRY dependency for menu generation
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/menu/sidebar
 * Returns menu items from DB based on user role and permissions
 */
router.get('/sidebar', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const userRole = req.user?.role || req.user?.roleName || '';
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    // Super Admin and Enterprise Admin get all pages for their scope
    const isSystemAdmin = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'].includes(userRole.toUpperCase());
    
    let menuItems = [];
    
    if (isSystemAdmin) {
      // System admins get pages based on their admin type
      const adminPrefix = userRole.toUpperCase() === 'SUPER_ADMIN' ? 'super-admin' : 'enterprise-admin';
      
      menuItems = await prisma.$queryRaw`
        SELECT 
          pm.id,
          pm.page_code as id,
          pm.page_name as name,
          pm.page_path as path,
          pm.icon_key as "iconKey",
          mm.module_name as module,
          pm.show_in_sidebar as "showInSidebar",
          pm.sort_order as "order",
          pm.description,
          pm.status
        FROM pages_master pm
        LEFT JOIN modules_master mm ON pm.module_id = mm.id
        WHERE pm.show_in_sidebar = true
          AND pm.status = 'active'
          AND (
            pm.page_code LIKE ${adminPrefix + '%'}
            OR mm.module_name = 'common'
          )
        ORDER BY mm.sort_order, pm.sort_order, pm.page_name
      `;
    } else if (userId && tenantId) {
      // Regular users: get pages based on role_page_access
      menuItems = await prisma.$queryRaw`
        SELECT DISTINCT
          pm.id,
          pm.page_code as id,
          pm.page_name as name,
          pm.page_path as path,
          pm.icon_key as "iconKey",
          mm.module_name as module,
          pm.show_in_sidebar as "showInSidebar",
          pm.sort_order as "order",
          pm.description,
          rpa.can_view,
          rpa.can_edit,
          rpa.can_delete
        FROM pages_master pm
        LEFT JOIN modules_master mm ON pm.module_id = mm.id
        INNER JOIN role_page_access rpa ON rpa.page_id = pm.id
        INNER JOIN client_role_assignments cra ON cra.role_id = rpa.role_id
        WHERE pm.show_in_sidebar = true
          AND pm.status = 'active'
          AND cra.user_id = ${userId}
          AND rpa.can_view = true
        ORDER BY mm.sort_order, pm.sort_order, pm.page_name
      `;
    } else {
      // Fallback: common pages only
      menuItems = await prisma.$queryRaw`
        SELECT 
          pm.id,
          pm.page_code as id,
          pm.page_name as name,
          pm.page_path as path,
          pm.icon_key as "iconKey",
          mm.module_name as module,
          pm.show_in_sidebar as "showInSidebar",
          pm.sort_order as "order",
          pm.description
        FROM pages_master pm
        LEFT JOIN modules_master mm ON pm.module_id = mm.id
        WHERE pm.show_in_sidebar = true
          AND pm.status = 'active'
          AND mm.module_name = 'common'
        ORDER BY pm.sort_order, pm.page_name
      `;
    }
    
    // Group by module for nested menu structure
    const grouped = {};
    const modules = [];
    
    for (const item of menuItems) {
      const moduleName = item.module || 'common';
      if (!grouped[moduleName]) {
        grouped[moduleName] = {
          id: moduleName,
          name: moduleName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          items: []
        };
        modules.push(grouped[moduleName]);
      }
      grouped[moduleName].items.push({
        id: item.id,
        name: item.name,
        path: item.path,
        iconKey: item.iconKey || 'Circle',
        order: item.order || 0,
        description: item.description
      });
    }
    
    res.json({
      ok: true,
      user: {
        id: userId,
        role: userRole,
        tenantId
      },
      menuType: isSystemAdmin ? 'admin' : 'user',
      modules,
      flatItems: menuItems.map(item => ({
        id: item.id,
        name: item.name,
        path: item.path,
        iconKey: item.iconKey || 'Circle',
        module: item.module,
        order: item.order || 0
      })),
      totalItems: menuItems.length
    });
    
  } catch (error) {
    console.error('[Menu API] Error fetching sidebar:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/menu/modules
 * Returns all modules with their page counts
 */
router.get('/modules', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    
    const modules = await prisma.$queryRaw`
      SELECT 
        mm.id,
        mm.module_name as code,
        mm.display_name as name,
        mm.icon,
        mm.sort_order as "order",
        mm.description,
        COUNT(pm.id) as page_count,
        SUM(CASE WHEN pm.show_in_sidebar THEN 1 ELSE 0 END) as visible_pages
      FROM modules_master mm
      LEFT JOIN pages_master pm ON pm.module_id = mm.id AND pm.status = 'active'
      WHERE mm.status = 'active'
      GROUP BY mm.id, mm.module_name, mm.display_name, mm.icon, mm.sort_order, mm.description
      ORDER BY mm.sort_order, mm.module_name
    `;
    
    res.json({
      ok: true,
      modules: modules.map(m => ({
        ...m,
        page_count: Number(m.page_count),
        visible_pages: Number(m.visible_pages)
      }))
    });
    
  } catch (error) {
    console.error('[Menu API] Error fetching modules:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/menu/check-access/:pageCode
 * Check if current user can access a specific page
 */
router.get('/check-access/:pageCode', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { pageCode } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || req.user?.roleName || '';
    
    // System admins have full access to their scope
    if (['SUPER_ADMIN', 'ENTERPRISE_ADMIN'].includes(userRole.toUpperCase())) {
      const prefix = userRole.toUpperCase() === 'SUPER_ADMIN' ? 'super-admin' : 'enterprise-admin';
      const hasAccess = pageCode.startsWith(prefix) || pageCode.startsWith('common');
      
      return res.json({
        ok: true,
        pageCode,
        hasAccess,
        accessLevel: hasAccess ? 'full' : 'none',
        reason: hasAccess ? 'Admin scope access' : 'Outside admin scope'
      });
    }
    
    // Check role_page_access for regular users
    const access = await prisma.$queryRaw`
      SELECT 
        rpa.can_view,
        rpa.can_edit,
        rpa.can_delete
      FROM role_page_access rpa
      INNER JOIN pages_master pm ON pm.id = rpa.page_id
      INNER JOIN client_role_assignments cra ON cra.role_id = rpa.role_id
      WHERE pm.page_code = ${pageCode}
        AND cra.user_id = ${userId}
      LIMIT 1
    `;
    
    const hasAccess = access.length > 0 && access[0].can_view;
    
    res.json({
      ok: true,
      pageCode,
      hasAccess,
      accessLevel: access.length > 0 ? (
        access[0].can_delete ? 'full' :
        access[0].can_edit ? 'edit' :
        access[0].can_view ? 'view' : 'none'
      ) : 'none',
      permissions: access[0] || { can_view: false, can_edit: false, can_delete: false }
    });
    
  } catch (error) {
    console.error('[Menu API] Error checking access:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
