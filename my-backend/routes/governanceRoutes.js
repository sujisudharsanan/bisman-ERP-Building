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
      -- MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
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
        COALESCE(apa.is_active, false) as can_view,
        true as can_edit,
        true as can_delete,
        true as can_export
      FROM pages_master p
      LEFT JOIN modules_master m ON m.id = p.module_id
      LEFT JOIN admin_page_assignments apa ON apa.page_id = p.id AND apa.assignee_type = $1 AND apa.is_active = true
      WHERE p.is_active = TRUE
        AND (
          p.is_governed = FALSE           -- Non-governed routes
          OR p.is_public = TRUE           -- Public routes
          OR apa.is_active = TRUE         -- Has explicit RBAC access
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
    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    const result = await client.query(`
      SELECT 
        p.id,
        p.page_code,
        p.display_name,
        p.route,
        m.module_code,
        p.is_governed,
        p.is_public,
        (SELECT COUNT(DISTINCT assignee_type) FROM admin_page_assignments WHERE page_id = p.id AND is_active = TRUE) as role_count
      FROM pages_master p
      LEFT JOIN modules_master m ON m.id = p.module_id
      LEFT JOIN admin_page_assignments apa ON apa.page_id = p.id AND apa.assignee_type = 'SUPER_ADMIN' AND apa.is_active = TRUE
      WHERE p.is_active = TRUE
        AND p.is_governed = TRUE
        AND apa.id IS NULL
      ORDER BY m.module_code, p.route
    `);
    
    // Get summary stats
    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_governed = TRUE) as governed_count,
        COUNT(*) FILTER (WHERE is_governed = TRUE AND id IN (
          SELECT DISTINCT page_id FROM admin_page_assignments WHERE is_active = TRUE
        )) as with_rbac_count,
        COUNT(DISTINCT apa.page_id) as pages_with_any_rbac,
        (SELECT COUNT(DISTINCT assignee_type) FROM admin_page_assignments) as unique_roles
      FROM pages_master p
      LEFT JOIN admin_page_assignments apa ON apa.page_id = p.id AND apa.is_active = TRUE
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

    // Get all role-page assignments from admin_page_assignments (SINGLE SOURCE OF TRUTH)
    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    // as per RBAC consolidation plan. role_page_access is now deprecated.
    // NOTE: Using DISTINCT to avoid duplicates when same page is assigned to multiple users with same role
    const assignmentsResult = await client.query(`
      SELECT DISTINCT
        apa.page_id,
        apa.assignee_type as role_name
      FROM admin_page_assignments apa
      WHERE apa.is_active = TRUE
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
        pageRolesMap.set(assignment.page_id, new Set());
      }
      pageRolesMap.get(assignment.page_id).add(assignment.role_name);
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

      const assignedRolesSet = pageRolesMap.get(page.id);
      const assignedRoles = assignedRolesSet ? Array.from(assignedRolesSet) : [];
      
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
      const rolesSet = pageRolesMap.get(page.id);
      modulePageMap.get(moduleCode).pages.push({
        id: String(page.id),
        code: page.page_code,
        name: page.display_name,
        path: page.route,
        icon: page.icon,
        showInSidebar: page.show_in_sidebar,
        status: 'active',
        roles: rolesSet ? Array.from(rolesSet) : []
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

// ============================================================================
// GET /api/governance/role-pages-secure (PHASE 1 LOCKDOWN)
// ============================================================================
// SECURE endpoint that uses admin_page_assignments ONLY
// This is the AUTHORITATIVE source for role/user page assignments
//
// Query params:
//   - roleName: The role name
//   - userId: (optional) Specific user ID to get their approved pages
//   - mode: 'available' (EA-approved for SA) | 'assigned' (SA-approved for user)
//
// Returns pages from admin_page_assignments, NOT role_page_access
// ============================================================================

router.get('/role-pages-secure', authenticate, async (req, res) => {
  const client = await getPool().connect();
  
  try {
    const { roleName, userId, mode = 'assigned' } = req.query;
    const requestingUser = req.user;
    const requestingRole = requestingUser?.role?.toUpperCase();
    const requestingUserId = requestingUser?.legacyId || requestingUser?.legacy_id || requestingUser?.id;
    
    console.log(`[Governance] role-pages-secure: role=${roleName}, userId=${userId}, mode=${mode}, requester=${requestingRole}`);
    
    // ========================================================================
    // SUPER_ADMIN: Get EA-approved pages (what pages EA has allowed)
    // ========================================================================
    if (requestingRole === 'SUPER_ADMIN' && mode === 'available') {
      // Get pages approved by Enterprise Admin for this Super Admin
      const eaApproved = await client.query(`
        SELECT DISTINCT
          pm.id,
          pm.page_code,
          pm.display_name,
          pm.route,
          pm.icon,
          pm.show_in_sidebar,
          pm.category,
          pm.page_type,
          mm.module_code,
          mm.display_name as module_name,
          apa.is_active
        FROM admin_page_assignments apa
        JOIN pages_master pm ON apa.page_key = pm.page_code
        LEFT JOIN modules_master mm ON mm.id = pm.module_id
        WHERE apa.assignee_id = $1
          AND apa.assignee_type = 'SUPER_ADMIN'
          AND apa.assigner_type = 'ENTERPRISE_ADMIN'
          AND apa.is_active = true
          AND pm.is_active = true
        ORDER BY mm.sort_order NULLS LAST, pm.sort_order, pm.display_name
      `, [requestingUserId]);
      
      console.log(`[Governance] EA-approved pages for SA ${requestingUserId}: ${eaApproved.rows.length}`);
      
      return res.json({
        success: true,
        data: {
          mode: 'available',
          source: 'admin_page_assignments',
          pages: eaApproved.rows.map(r => ({
            id: String(r.id),
            pageCode: r.page_code,
            displayName: r.display_name,
            route: r.route,
            icon: r.icon,
            showInSidebar: r.show_in_sidebar,
            category: r.category,
            pageType: r.page_type,
            moduleCode: r.module_code || 'GENERAL',
            moduleName: r.module_name || 'General'
          })),
          counts: {
            total: eaApproved.rows.length,
            eaApproved: eaApproved.rows.length
          }
        },
        lockdown: 'PHASE_1_AUTHORITATIVE'
      });
    }
    
    // ========================================================================
    // SUPER_ADMIN: Get pages assigned to a specific user/role
    // ========================================================================
    if (requestingRole === 'SUPER_ADMIN' && userId) {
      // Get pages SA has approved for this user
      const saApproved = await client.query(`
        SELECT DISTINCT
          pm.id,
          pm.page_code,
          pm.display_name,
          pm.route,
          pm.icon,
          pm.show_in_sidebar,
          pm.category,
          pm.page_type,
          mm.module_code,
          mm.display_name as module_name,
          apa.assignee_type
        FROM admin_page_assignments apa
        JOIN pages_master pm ON apa.page_key = pm.page_code
        LEFT JOIN modules_master mm ON mm.id = pm.module_id
        WHERE apa.assignee_id = $1
          AND apa.assigner_type = 'SUPER_ADMIN'
          AND apa.is_active = true
          AND pm.is_active = true
        ORDER BY mm.sort_order NULLS LAST, pm.sort_order, pm.display_name
      `, [userId]);
      
      console.log(`[Governance] SA-approved pages for user ${userId}: ${saApproved.rows.length}`);
      
      return res.json({
        success: true,
        data: {
          mode: 'assigned',
          userId: userId,
          source: 'admin_page_assignments',
          assignedPages: saApproved.rows.map(r => ({
            id: String(r.id),
            pageCode: r.page_code,
            displayName: r.display_name,
            route: r.route,
            icon: r.icon,
            showInSidebar: r.show_in_sidebar,
            category: r.category,
            pageType: r.page_type,
            moduleCode: r.module_code || 'GENERAL',
            moduleName: r.module_name || 'General',
            assigneeType: r.assignee_type
          })),
          counts: {
            assigned: saApproved.rows.length
          }
        },
        lockdown: 'PHASE_1_AUTHORITATIVE'
      });
    }
    
    // ========================================================================
    // SUPER_ADMIN: Get pages for a role (based on what SA has approved for that role's users)
    // ========================================================================
    if (requestingRole === 'SUPER_ADMIN' && roleName) {
      const normalizedRole = roleName.toUpperCase();
      
      // Get pages SA has approved for users of this role
      const roleApproved = await client.query(`
        SELECT DISTINCT
          pm.id,
          pm.page_code,
          pm.display_name,
          pm.route,
          pm.icon,
          pm.show_in_sidebar,
          pm.category,
          pm.page_type,
          mm.module_code,
          mm.display_name as module_name
        FROM admin_page_assignments apa
        JOIN pages_master pm ON apa.page_key = pm.page_code
        LEFT JOIN modules_master mm ON mm.id = pm.module_id
        JOIN users u ON apa.assignee_id = u.id
        WHERE u.role = $1
          AND apa.assigner_type = 'SUPER_ADMIN'
          AND apa.is_active = true
          AND pm.is_active = true
        ORDER BY mm.sort_order NULLS LAST, pm.sort_order, pm.display_name
      `, [normalizedRole]);
      
      // Get EA-approved pages (ceiling for what SA can assign)
      const eaCeiling = await client.query(`
        SELECT COUNT(DISTINCT page_key) as cnt
        FROM admin_page_assignments
        WHERE assignee_id = $1
          AND assignee_type = 'SUPER_ADMIN'
          AND assigner_type = 'ENTERPRISE_ADMIN'
          AND is_active = true
      `, [requestingUserId]);
      
      console.log(`[Governance] Role ${normalizedRole} has ${roleApproved.rows.length} approved pages (ceiling: ${eaCeiling.rows[0].cnt})`);
      
      return res.json({
        success: true,
        data: {
          mode: 'role',
          roleName: normalizedRole,
          source: 'admin_page_assignments',
          assignedPages: roleApproved.rows.map(r => ({
            id: String(r.id),
            pageCode: r.page_code,
            displayName: r.display_name,
            route: r.route,
            icon: r.icon,
            showInSidebar: r.show_in_sidebar,
            category: r.category,
            pageType: r.page_type,
            moduleCode: r.module_code || 'GENERAL',
            moduleName: r.module_name || 'General'
          })),
          counts: {
            assigned: roleApproved.rows.length,
            eaCeiling: parseInt(eaCeiling.rows[0].cnt)
          }
        },
        lockdown: 'PHASE_1_AUTHORITATIVE'
      });
    }
    
    // Default: return empty with explanation
    return res.json({
      success: true,
      data: {
        mode: 'unknown',
        pages: [],
        message: 'Specify userId or roleName with appropriate mode'
      }
    });
    
  } catch (error) {
    console.error('[Governance] Error in role-pages-secure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role pages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/governance/role-pages (LEGACY - queries role_page_access)
// ============================================================================
// NOTE: This endpoint is DEPRECATED. Use /role-pages-secure instead.
// It still queries role_page_access for backward compatibility but
// should NOT be used for authorization decisions.
// ============================================================================
// Returns pages scoped to a specific role with proper filtering
//
// Query params:
//   - roleName: The role to get pages for (e.g., 'ADMIN', 'CLIENT', 'SUPER_ADMIN')
//   - clientId: (optional) Client ID for tenant-scoped queries
//
// Returns:
//   - assignedPages: Pages directly assigned to this role via role_page_access
//   - inheritedPages: BASE_USER pages inherited by business roles  
//   - candidatePages: Pages that CAN be assigned (filtered by role scope)
//   - counts: Summary counts


router.get('/role-pages', authenticate, async (req, res) => {
  const client = await getPool().connect();
  
  try {
    const { roleName, clientId } = req.query;
    
    if (!roleName) {
      return res.status(400).json({
        success: false,
        error: 'roleName query parameter is required'
      });
    }
    
    const normalizedRole = roleName.toUpperCase();
    console.log(`[Governance] role-pages for: ${normalizedRole}, clientId: ${clientId || 'none'}`);
    
    // ========================================================================
    // ROLE CLASSIFICATION
    // ========================================================================
    const PLATFORM_ROLES = ['SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN'];
    const TENANT_ADMIN_ROLES = ['ADMIN', 'ADMIN_OPS', 'IT_ADMIN'];
    const INTERNAL_ROLES = ['BISMAN_ENGINEERING', 'BISMAN_SUPPORT', 'BISMAN_BILLING', 'BISMAN_FINANCE', 'BISMAN_CUSTOMER_CARE', 'QA'];
    const NO_INHERIT_ROLES = [...PLATFORM_ROLES, ...TENANT_ADMIN_ROLES, ...INTERNAL_ROLES];
    
    const inheritsBaseUser = !NO_INHERIT_ROLES.includes(normalizedRole);
    
    // ========================================================================
    // 1. GET ASSIGNED PAGES (from admin_page_assignments - SINGLE SOURCE OF TRUTH)
    // ========================================================================
    // MIGRATION NOTE: Switched from role_page_access to admin_page_assignments
    // as per RBAC consolidation plan. role_page_access is now deprecated.
    const assignedResult = await client.query(`
      SELECT 
        pm.id,
        pm.page_code,
        pm.display_name,
        pm.route,
        pm.icon,
        pm.show_in_sidebar,
        pm.category,
        pm.page_type,
        mm.module_code,
        mm.display_name as module_name,
        true as can_view,
        true as can_edit,
        true as can_delete,
        'DIRECT' as access_type
      FROM admin_page_assignments apa
      JOIN pages_master pm ON pm.id = apa.page_id
      LEFT JOIN modules_master mm ON mm.id = pm.module_id
      WHERE apa.assignee_type = $1 
        AND apa.is_active = true
        AND pm.is_active = true
      ORDER BY mm.sort_order NULLS LAST, pm.sort_order, pm.display_name
    `, [normalizedRole]);
    
    // ========================================================================
    // 2. GET INHERITED PAGES (BASE_USER pages for business roles)
    // ========================================================================
    let inheritedResult = { rows: [] };
    if (inheritsBaseUser) {
      inheritedResult = await client.query(`
        SELECT 
          pm.id,
          pm.page_code,
          pm.display_name,
          pm.route,
          pm.icon,
          pm.show_in_sidebar,
          pm.category,
          pm.page_type,
          mm.module_code,
          mm.display_name as module_name,
          true as can_view,
          false as can_edit,
          false as can_delete,
          'BASE_USER' as access_type
        FROM base_user_pages bup
        JOIN pages_master pm ON pm.id = bup.page_id
        LEFT JOIN modules_master mm ON mm.id = pm.module_id
        WHERE pm.is_active = true
        ORDER BY mm.sort_order NULLS LAST, pm.sort_order, pm.display_name
      `);
    }
    
    // ========================================================================
    // 3. GET CANDIDATE PAGES (pages that CAN be assigned to this role)
    // Filter by:
    //   - page_type = 'UI_PAGE' (exclude API_ROUTE, REDIRECT)
    //   - category != 'PUBLIC'
    //   - Route prefix scope based on role type
    // ========================================================================
    
    // Build route exclusion filter based on role type
    let routeExclusionClause = '';
    
    if (PLATFORM_ROLES.includes(normalizedRole)) {
      // Platform roles can see their own admin routes
      if (normalizedRole === 'ENTERPRISE_ADMIN') {
        // Enterprise Admin: can see /enterprise-admin/*, /admin/*, /system/*
        routeExclusionClause = `
          AND (
            pm.route NOT LIKE '/super-admin%'
            OR pm.route IS NULL
          )
        `;
      } else if (normalizedRole === 'SUPER_ADMIN') {
        // Super Admin: can see /super-admin/*, /admin/*, /system/*
        routeExclusionClause = `
          AND (
            pm.route NOT LIKE '/enterprise-admin%'
            OR pm.route IS NULL
          )
        `;
      }
      // SYSTEM_ADMIN can see everything
    } else if (TENANT_ADMIN_ROLES.includes(normalizedRole)) {
      // Tenant admins: can see /admin/* only
      routeExclusionClause = `
        AND (
          pm.route NOT LIKE '/super-admin%'
          AND pm.route NOT LIKE '/enterprise-admin%'
          AND pm.route NOT LIKE '/system%'
          OR pm.route IS NULL
        )
      `;
    } else {
      // Business roles: cannot see any admin routes
      routeExclusionClause = `
        AND (
          pm.route NOT LIKE '/super-admin%'
          AND pm.route NOT LIKE '/enterprise-admin%'
          AND pm.route NOT LIKE '/admin%'
          AND pm.route NOT LIKE '/system%'
          AND pm.route NOT LIKE '/internal%'
          AND pm.route NOT LIKE '/qa%'
          OR pm.route IS NULL
        )
      `;
    }
    
    // Get all candidate pages (UI pages that can be assigned)
    const candidateQuery = `
      SELECT 
        pm.id,
        pm.page_code,
        pm.display_name,
        pm.route,
        pm.icon,
        pm.show_in_sidebar,
        pm.category,
        pm.page_type,
        mm.module_code,
        mm.display_name as module_name
      FROM pages_master pm
      LEFT JOIN modules_master mm ON mm.id = pm.module_id
      WHERE pm.is_active = true
        AND pm.page_type = 'UI_PAGE'
        AND pm.category <> 'PUBLIC'
        ${routeExclusionClause}
      ORDER BY mm.sort_order NULLS LAST, pm.sort_order, pm.display_name
    `;
    
    const candidateResult = await client.query(candidateQuery);
    
    // ========================================================================
    // 4. BUILD RESPONSE
    // ========================================================================
    
    // Create sets for deduplication
    const assignedPageIds = new Set(assignedResult.rows.map(p => p.id));
    const inheritedPageIds = new Set(inheritedResult.rows.map(p => p.id));
    
    // Format page objects
    const formatPage = (row, source = 'assigned') => ({
      id: String(row.id),
      pageCode: row.page_code,
      displayName: row.display_name,
      route: row.route,
      icon: row.icon,
      showInSidebar: row.show_in_sidebar,
      category: row.category,
      pageType: row.page_type,
      moduleCode: row.module_code || 'GENERAL',
      moduleName: row.module_name || 'General',
      canView: row.can_view ?? true,
      canEdit: row.can_edit ?? false,
      canDelete: row.can_delete ?? false,
      accessType: row.access_type || source.toUpperCase()
    });
    
    const assignedPages = assignedResult.rows.map(r => formatPage(r, 'assigned'));
    const inheritedPages = inheritedResult.rows
      .filter(r => !assignedPageIds.has(r.id)) // Exclude already assigned
      .map(r => formatPage(r, 'inherited'));
    
    // Candidate pages: exclude already assigned and inherited
    const candidatePages = candidateResult.rows
      .filter(r => !assignedPageIds.has(r.id) && !inheritedPageIds.has(r.id))
      .map(r => formatPage(r, 'candidate'));
    
    console.log(`[Governance] role-pages result: ${assignedPages.length} assigned, ${inheritedPages.length} inherited, ${candidatePages.length} candidates`);
    
    res.json({
      success: true,
      data: {
        roleName: normalizedRole,
        inheritsBaseUser,
        assignedPages,
        inheritedPages,
        candidatePages,
        counts: {
          assigned: assignedPages.length,
          inherited: inheritedPages.length,
          candidate: candidatePages.length,
          total: assignedPages.length + inheritedPages.length
        }
      },
      source: 'database',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Governance] Error fetching role pages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role pages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
});

module.exports = router;
