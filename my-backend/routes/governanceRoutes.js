/**
 * ============================================================================
 * BISMAN ERP - Governance Routes
 * ============================================================================
 * 
 * API endpoints for route governance and validation.
 * These endpoints allow the frontend to pre-check route access.
 * 
 * Endpoints:
 *   GET  /api/governance/validate-route?route=/path
 *   GET  /api/governance/my-routes
 *   GET  /api/governance/unregistered-attempts
 * 
 * Date: 2025-01-19
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPool } = require('../middleware/database');
const { 
  validateRouteHandler,
} = require('../middleware/routeGovernance');

// ============================================================================
// GET /api/governance/validate-route
// ============================================================================
// Pre-check if user can access a specific route

router.get('/validate-route', authenticate, validateRouteHandler);

// ============================================================================
// GET /api/governance/my-routes
// ============================================================================
// Get all routes the current user can access (for frontend route protection)

router.get('/my-routes', authenticate, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const userRole = req.user?.role || req.user?.roleName;
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    if (!userRole) {
      return res.status(400).json({
        success: false,
        message: 'User role not found in token',
      });
    }
    
    // Get all routes this role has access to
    const result = await client.query(`
      SELECT DISTINCT
        p.id,
        p.page_code,
        p.display_name,
        p.route,
        p.route_pattern,
        p.is_governed,
        p.is_public,
        p.is_dynamic,
        m.module_code,
        rpa.can_view,
        rpa.can_edit,
        rpa.can_delete,
        rpa.can_export
      FROM pages_master p
      LEFT JOIN modules_master m ON m.id = p.module_id
      LEFT JOIN role_page_access rpa ON rpa.page_id = p.id AND rpa.role_name = $1
      WHERE p.is_active = TRUE
        AND (
          p.is_governed = FALSE           -- Non-governed routes
          OR p.is_public = TRUE           -- Public routes
          OR rpa.can_view = TRUE          -- Has explicit RBAC access
        )
      ORDER BY m.module_code, p.route
    `, [userRole]);
    
    // Filter by subscription if tenant-based
    let routes = result.rows;
    
    if (tenantId) {
      // Get allowed modules for this tenant
      const modulesResult = await client.query(`
        SELECT DISTINCT m.module_code
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON sp.id = cs.plan_id
        JOIN plan_modules pm ON pm.plan_id = sp.id
        JOIN modules_master m ON m.module_code = pm.module_code
        WHERE cs.tenant_id = $1
          AND cs.status = 'active'
          AND pm.is_enabled = TRUE
      `, [tenantId]);
      
      const allowedModules = new Set(modulesResult.rows.map(r => r.module_code));
      
      // Filter routes by subscription
      routes = routes.filter(r => 
        !r.module_code ||                           // No module = allowed
        !r.is_governed ||                           // Non-governed = allowed
        allowedModules.has(r.module_code)           // Module in subscription
      );
    }
    
    res.json({
      success: true,
      data: {
        role: userRole,
        tenantId,
        routeCount: routes.length,
        routes: routes.map(r => ({
          id: r.id,
          code: r.page_code,
          name: r.display_name,
          route: r.route,
          pattern: r.route_pattern,
          module: r.module_code,
          isGoverned: r.is_governed,
          isPublic: r.is_public,
          isDynamic: r.is_dynamic,
          permissions: {
            canView: r.can_view || false,
            canEdit: r.can_edit || false,
            canDelete: r.can_delete || false,
            canExport: r.can_export || false,
          },
        })),
      },
    });
    
  } catch (error) {
    console.error('[Governance] Error fetching routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/governance/unregistered-attempts
// ============================================================================
// Get recent unregistered route access attempts (admin only)

router.get('/unregistered-attempts', authenticate, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const userRole = req.user?.role || req.user?.roleName;
    
    // Only allow admin roles
    const allowedRoles = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await client.query(`
      SELECT 
        ura.*,
        u.full_name as user_name,
        u.email as user_email
      FROM unregistered_route_access ura
      LEFT JOIN users u ON u.id = ura.user_id
      ORDER BY ura.accessed_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const countResult = await client.query(
      'SELECT COUNT(*) FROM unregistered_route_access'
    );
    
    res.json({
      success: true,
      data: {
        attempts: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit,
          offset,
        },
      },
    });
    
  } catch (error) {
    console.error('[Governance] Error fetching attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attempts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/governance/sync-status
// ============================================================================
// Get page sync status (orphaned, pending, etc.)

router.get('/sync-status', authenticate, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const userRole = req.user?.role || req.user?.roleName;
    
    // Only allow admin roles
    const allowedRoles = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    // Get counts by sync status
    const statusResult = await client.query(`
      SELECT 
        sync_status,
        COUNT(*) as count
      FROM pages_master
      GROUP BY sync_status
    `);
    
    // Get counts by governance status
    const governanceResult = await client.query(`
      SELECT 
        is_governed,
        COUNT(*) as count
      FROM pages_master
      WHERE is_active = TRUE
      GROUP BY is_governed
    `);
    
    // Get counts by module
    const moduleResult = await client.query(`
      SELECT 
        m.module_code,
        COUNT(*) as count
      FROM pages_master p
      LEFT JOIN modules_master m ON m.id = p.module_id
      WHERE p.is_active = TRUE
      GROUP BY m.module_code
      ORDER BY count DESC
    `);
    
    // Get orphaned pages
    const orphanedResult = await client.query(`
      SELECT route, page_code, last_synced_at
      FROM pages_master
      WHERE sync_status = 'ORPHANED'
      ORDER BY last_synced_at DESC
      LIMIT 50
    `);
    
    res.json({
      success: true,
      data: {
        syncStatus: Object.fromEntries(statusResult.rows.map(r => [r.sync_status || 'NULL', parseInt(r.count)])),
        governanceStatus: {
          governed: parseInt(governanceResult.rows.find(r => r.is_governed === true)?.count || 0),
          nonGoverned: parseInt(governanceResult.rows.find(r => r.is_governed === false)?.count || 0),
        },
        byModule: Object.fromEntries(moduleResult.rows.map(r => [r.module_code || 'UNKNOWN', parseInt(r.count)])),
        orphanedPages: orphanedResult.rows,
      },
    });
    
  } catch (error) {
    console.error('[Governance] Error fetching sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/governance/rbac-missing
// ============================================================================
// Get pages missing RBAC mappings (admin only)

router.get('/rbac-missing', authenticate, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const userRole = req.user?.role || req.user?.roleName;
    
    // Only allow admin roles
    const allowedRoles = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    // Get governed pages without SUPER_ADMIN RBAC
    const result = await client.query(`
      SELECT 
        p.id,
        p.page_code,
        p.display_name,
        p.route,
        m.module_code,
        p.is_governed,
        p.is_public,
        (SELECT COUNT(DISTINCT role_name) FROM role_page_access WHERE page_id = p.id AND can_view = TRUE) as role_count
      FROM pages_master p
      LEFT JOIN modules_master m ON m.id = p.module_id
      LEFT JOIN role_page_access rpa ON rpa.page_id = p.id AND rpa.role_name = 'SUPER_ADMIN' AND rpa.can_view = TRUE
      WHERE p.is_active = TRUE
        AND p.is_governed = TRUE
        AND rpa.id IS NULL
      ORDER BY m.module_code, p.route
    `);
    
    // Get summary stats
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_governed = TRUE) as governed_count,
        COUNT(*) FILTER (WHERE is_governed = TRUE AND id IN (
          SELECT DISTINCT page_id FROM role_page_access WHERE can_view = TRUE
        )) as with_rbac_count,
        COUNT(DISTINCT rpa.page_id) as pages_with_any_rbac,
        (SELECT COUNT(DISTINCT role_name) FROM role_page_access) as unique_roles
      FROM pages_master p
      LEFT JOIN role_page_access rpa ON rpa.page_id = p.id AND rpa.can_view = TRUE
      WHERE p.is_active = TRUE
    `);
    
    const stats = statsResult.rows[0];
    
    res.json({
      success: true,
      data: {
        summary: {
          governedPages: parseInt(stats.governed_count),
          pagesWithRbac: parseInt(stats.with_rbac_count),
          pagesMissingRbac: result.rows.length,
          uniqueRoles: parseInt(stats.unique_roles),
        },
        missingPages: result.rows.map(r => ({
          id: r.id,
          code: r.page_code,
          name: r.display_name,
          route: r.route,
          module: r.module_code,
          isGoverned: r.is_governed,
          roleCount: parseInt(r.role_count),
        })),
      },
    });
    
  } catch (error) {
    console.error('[Governance] Error fetching RBAC missing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RBAC missing report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/governance/pages-by-role
// ============================================================================
// Get all pages from database grouped by role assignments
// This is the SINGLE SOURCE OF TRUTH for Role Management UI

router.get('/pages-by-role', authenticate, async (req, res) => {
  const client = await getPool().connect();
  
  try {
    // Get all active pages with their module info
    const pagesResult = await client.query(`
      SELECT 
        p.id,
        p.page_code,
        p.display_name,
        p.route,
        p.icon,
        p.sort_order,
        p.show_in_sidebar,
        m.id as module_id,
        m.module_code,
        m.display_name as module_name
      FROM pages_master p
      LEFT JOIN modules_master m ON m.id = p.module_id
      WHERE p.is_active = TRUE
      ORDER BY m.sort_order, m.module_code, p.sort_order, p.display_name
    `);

    // Get all role-page assignments
    const assignmentsResult = await client.query(`
      SELECT 
        rpa.page_id,
        rpa.role_name,
        rpa.can_view,
        rpa.can_edit,
        rpa.can_delete
      FROM role_page_access rpa
      WHERE rpa.can_view = TRUE
    `);

    // Get all roles
    const rolesResult = await client.query(`
      SELECT id, name, display_name, level
      FROM rbac_roles
      WHERE status = 'active'
      ORDER BY level DESC, name
    `);

    // Build a map of page_id -> roles
    const pageRolesMap = new Map();
    for (const assignment of assignmentsResult.rows) {
      if (!pageRolesMap.has(assignment.page_id)) {
        pageRolesMap.set(assignment.page_id, []);
      }
      pageRolesMap.get(assignment.page_id).push(assignment.role_name);
    }

    // Group pages by role
    const rolePageMap = new Map();
    
    // Initialize all roles with empty page arrays
    for (const role of rolesResult.rows) {
      rolePageMap.set(role.name, {
        roleId: role.name,
        roleName: role.display_name || role.name,
        roleLevel: role.level,
        pages: []
      });
    }
    
    // Add unassigned group
    rolePageMap.set('_unassigned', {
      roleId: '_unassigned',
      roleName: 'Unassigned (No Role)',
      roleLevel: 0,
      pages: []
    });

    // Assign pages to roles
    for (const page of pagesResult.rows) {
      const pageData = {
        id: String(page.id),
        code: page.page_code,
        name: page.display_name,
        path: page.route,
        icon: page.icon,
        module: page.module_code || 'unknown',
        moduleName: page.module_name || 'Unknown',
        showInSidebar: page.show_in_sidebar,
        status: 'active'
      };

      const assignedRoles = pageRolesMap.get(page.id) || [];
      
      if (assignedRoles.length === 0) {
        rolePageMap.get('_unassigned').pages.push(pageData);
      } else {
        for (const roleName of assignedRoles) {
          if (rolePageMap.has(roleName)) {
            rolePageMap.get(roleName).pages.push(pageData);
          }
        }
      }
    }

    // Group pages by module
    const modulePageMap = new Map();
    for (const page of pagesResult.rows) {
      const moduleCode = page.module_code || 'unknown';
      if (!modulePageMap.has(moduleCode)) {
        modulePageMap.set(moduleCode, {
          moduleId: moduleCode,
          moduleName: page.module_name || 'Unknown',
          pages: []
        });
      }
      modulePageMap.get(moduleCode).pages.push({
        id: String(page.id),
        code: page.page_code,
        name: page.display_name,
        path: page.route,
        icon: page.icon,
        showInSidebar: page.show_in_sidebar,
        status: 'active',
        roles: pageRolesMap.get(page.id) || []
      });
    }

    res.json({
      success: true,
      data: {
        byRole: Array.from(rolePageMap.values())
          .filter(r => r.pages.length > 0 || r.roleId !== '_unassigned')
          .sort((a, b) => b.roleLevel - a.roleLevel),
        byModule: Array.from(modulePageMap.values())
          .sort((a, b) => a.moduleName.localeCompare(b.moduleName)),
        roles: rolesResult.rows.map(r => ({
          id: r.name,
          name: r.name,
          displayName: r.display_name || r.name,
          level: r.level
        })),
        totalPages: pagesResult.rows.length,
        totalRoles: rolesResult.rows.length
      },
      source: 'database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Governance] Error fetching pages by role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pages by role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});

module.exports = router;
