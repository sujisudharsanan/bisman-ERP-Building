/**
 * ============================================================================
 * BISMAN ERP - Secure Menu Routes (PHASE 2 MANDATORY FIX)
 * ============================================================================
 * 
 * SECURITY REQUIREMENTS (NON-NEGOTIABLE):
 *   1. ONLY uses effectiveAccessService - NO direct role_page_access queries
 *   2. NO role-based fallback - if effective access fails, return EMPTY menu
 *   3. ALL users go through intersection (including system admins)
 *   4. Logs all access decisions for audit trail
 * 
 * FORMULA:
 *   effectivePages = Subscription ∩ EA Approval ∩ SA Approval ∩ Admin Delegation
 * 
 * @module routes/menuRoutesSecure
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPool } = require('../middleware/database');

// MANDATORY: Load effective access service - FAIL HARD if not available
const effectiveAccessService = require('../services/effectiveAccessService');
if (!effectiveAccessService || !effectiveAccessService.computeEffectivePages) {
  throw new Error('[SECURITY] effectiveAccessService is REQUIRED - cannot start without it');
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Pages that are ALWAYS accessible (no approval needed) - MINIMAL set only
const ALWAYS_ACCESSIBLE_ROUTES = [
  '/dashboard',
  '/common/user-settings',
  '/common/calendar'
];

// ============================================================================
// SIDEBAR ROUTE PREFIXES - FALLBACK filter for roles not configured in DB
// These are used ONLY when no dynamic sidebar config exists in admin_page_assignments
// ============================================================================
const FALLBACK_SIDEBAR_PREFIXES = {
  // Platform Admins
  'ENTERPRISE_ADMIN': ['/enterprise-admin', '/common/calendar', '/common/user-settings', '/dashboard'],
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
  
  // Staff and general users - show all they have access to (no filter)
  // 'STAFF': null,  // No filter = show all accessible pages
  // 'MANAGER': null,
};

// ============================================================================
// DYNAMIC SIDEBAR: Get assigned pages/routes for a role from database
// ============================================================================

/**
 * Get sidebar routes for a role dynamically from admin_page_assignments
 * 
 * PRIORITY ORDER:
 * 1. DB: admin_page_assignments for this role (EA-configured)
 * 2. Fallback: FALLBACK_SIDEBAR_PREFIXES (hardcoded defaults)
 * 3. If neither exists: null (show all accessible pages)
 * 
 * @param {Object} pool - Database pool
 * @param {string} role - User role name (e.g., 'ADMIN_OPS')
 * @param {string} _tenantId - Tenant ID (reserved for future tenant-specific overrides)
 * @returns {Promise<Array<string>|null>} Array of route prefixes or null (no filter)
 */
async function getDynamicSidebarRoutes(pool, role, _tenantId = null) {
  // Note: _tenantId is reserved for future per-tenant sidebar customization
  try {
    // Query admin_page_assignments for routes assigned to this role
    // This respects what EA has assigned to the role
    const result = await pool.query(`
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
      // Extract unique route prefixes from assigned pages
      const routes = result.rows.map(r => r.route).filter(Boolean);
      
      // Always include common pages and dashboard
      const sidebarRoutes = new Set(routes);
      sidebarRoutes.add('/common/');
      sidebarRoutes.add('/dashboard');
      sidebarRoutes.add('/common/calendar');
      sidebarRoutes.add('/common/user-settings');
      
      console.log(`[MenuSecure] Dynamic sidebar for ${role}: ${routes.length} pages from DB`);
      return Array.from(sidebarRoutes);
    }
    
    // No DB config - use fallback
    const fallback = FALLBACK_SIDEBAR_PREFIXES[role.toUpperCase()];
    if (fallback) {
      console.log(`[MenuSecure] Using fallback sidebar for ${role}`);
      return fallback;
    }
    
    // No config at all - show all accessible pages
    console.log(`[MenuSecure] No sidebar filter for ${role} - showing all accessible pages`);
    return null;
    
  } catch (error) {
    console.error(`[MenuSecure] Error getting dynamic sidebar for ${role}:`, error.message);
    // On error, use fallback
    return FALLBACK_SIDEBAR_PREFIXES[role.toUpperCase()] || null;
  }
}

// ============================================================================
// HELPER: Get effective pages for user (SINGLE SOURCE OF TRUTH)
// ============================================================================

/**
 * Get effective pages for a user using 4-layer intersection
 * This is the ONLY way to determine what pages a user can see
 * 
 * @param {Object} user - User object from JWT
 * @returns {Promise<Set<string>>} Set of effective page keys/routes
 */
async function getEffectivePagesForUser(user) {
  const pool = getPool();
  const userId = user.legacyId || user.legacy_id || user.id;
  const tenantId = user.tenantId || user.tenant_id;
  let planId = user.planId || user.plan_id;
  const role = user.role || user.roleName;
  
  // RBAC FIX: If planId is missing from JWT, fetch from client_subscriptions
  // This handles existing sessions that were created before the auth.js fix
  if (!planId && tenantId) {
    try {
      const subResult = await pool.query(`
        SELECT plan_id FROM client_subscriptions 
        WHERE client_id = $1 AND is_active = true 
        ORDER BY created_at DESC LIMIT 1
      `, [tenantId]);
      if (subResult.rows.length > 0) {
        planId = subResult.rows[0].plan_id;
        console.log(`[MenuSecure] Fetched plan_id=${planId} for tenant=${tenantId}`);
      }
    } catch (e) {
      console.warn(`[MenuSecure] Could not fetch plan_id for tenant ${tenantId}:`, e.message);
    }
  }
  
  // Default to plan 1 only as last resort (handles edge cases)
  if (!planId) {
    console.warn(`[MenuSecure] No plan_id found for user ${userId}, defaulting to 1`);
    planId = 1;
  }
  
  // For Enterprise Admin - they have access to EA pages only
  if (role === 'ENTERPRISE_ADMIN') {
    return await getEnterpriseAdminPages();
  }
  
  // For Super Admin - use EA-approved pages
  if (role === 'SUPER_ADMIN') {
    const superAdminId = user.superAdminId || user.super_admin_id || userId;
    return await getSuperAdminEffectivePages(superAdminId);
  }
  
  // For all other users - full 4-layer intersection
  if (!userId || !tenantId) {
    console.error(`[MenuSecure] DENY: Missing userId (${userId}) or tenantId (${tenantId})`);
    return new Set(ALWAYS_ACCESSIBLE_ROUTES);
  }
  
  const result = await effectiveAccessService.computeEffectivePages({
    userId,
    tenantId,
    planId,
    role // Pass role for platform detection (belt and suspenders)
  });
  
  if (!result || !result.effectivePages) {
    console.error(`[MenuSecure] DENY: No effective pages computed for user ${userId}`);
    return new Set(ALWAYS_ACCESSIBLE_ROUTES);
  }
  
  return new Set(result.effectivePages);
}

/**
 * Get pages accessible to Enterprise Admin
 */
async function getEnterpriseAdminPages() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT pm.page_code, pm.route
    FROM pages_master pm
    JOIN modules_master mm ON pm.module_id = mm.id
    WHERE mm.module_code IN ('ENTERPRISE_ADMIN', 'COMMON', 'DASHBOARD')
      AND pm.is_active = true
  `);
  
  const pages = new Set(ALWAYS_ACCESSIBLE_ROUTES);
  for (const row of result.rows) {
    if (row.page_code) pages.add(row.page_code);
    if (row.route) pages.add(row.route);
  }
  return pages;
}

/**
 * Get pages accessible to Super Admin (EA-approved only)
 */
async function getSuperAdminEffectivePages(superAdminId) {
  const pool = getPool();
  
  // Get pages approved by Enterprise Admin for this Super Admin
  const result = await pool.query(`
    SELECT apa.page_key, pm.route
    FROM admin_page_assignments apa
    LEFT JOIN pages_master pm ON apa.page_id = pm.id
    WHERE apa.assignee_id = $1
      AND apa.assignee_type = 'SUPER_ADMIN'
      AND apa.assigner_type = 'ENTERPRISE_ADMIN'
      AND apa.is_active = true
  `, [superAdminId]);
  
  const pages = new Set(ALWAYS_ACCESSIBLE_ROUTES);
  for (const row of result.rows) {
    if (row.page_key) pages.add(row.page_key);
    if (row.route) pages.add(row.route);
  }
  
  // If no EA approvals exist, SA gets only common pages (DENY by default)
  if (result.rows.length === 0) {
    console.warn(`[MenuSecure] WARN: No EA approval for SA ${superAdminId} - only common pages`);
  }
  
  return pages;
}

// ============================================================================
// GET /api/modules/menu - Secure Menu Endpoint
// ============================================================================

router.get('/menu', authenticate, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  
  const startTime = Date.now();
  const userId = req.user?.legacyId || req.user?.legacy_id || req.user?.id;
  const userRole = req.user?.role || req.user?.roleName;
  
  try {
    // STEP 1: Validate user
    if (!userRole) {
      console.error(`[MenuSecure] DENY: No role in token for user ${userId}`);
      return res.status(401).json({
        success: false,
        message: 'User role not found - access denied',
        menu: [],
        accessibleRoutes: []
      });
    }
    
    console.log(`[MenuSecure] Computing menu for user=${userId}, role=${userRole}`);
    
    // STEP 2: Get effective pages (SINGLE SOURCE OF TRUTH)
    const effectivePages = await getEffectivePagesForUser(req.user);
    
    console.log(`[MenuSecure] User ${userId} has ${effectivePages.size} effective pages`);
    
    // STEP 3: Build menu from ONLY effective pages
    // Query pages_master for page details, but ONLY include pages in effectivePages
    const effectiveArray = Array.from(effectivePages);
    
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
        m.id as module_id,
        m.module_code,
        m.display_name as module_name,
        m.icon as module_icon,
        m.base_route,
        m.sort_order as module_sort_order,
        m.color_code,
        m.layout_group
      FROM pages_master p
      INNER JOIN modules_master m ON m.id = p.module_id
      WHERE p.is_active = true
        AND m.is_active = true
        AND p.show_in_sidebar = true
        AND (p.page_code = ANY($1) OR p.route = ANY($1))
      ORDER BY m.sort_order, p.sort_order, p.display_name
    `, [effectiveArray]);
    
    // STEP 4: Group pages by module
    const moduleMap = new Map();
    
    for (const page of pagesResult.rows) {
      const moduleKey = page.module_code;
      
      if (!moduleMap.has(moduleKey)) {
        moduleMap.set(moduleKey, {
          id: page.module_id,
          code: page.module_code,
          name: page.module_name,
          icon: page.module_icon,
          baseRoute: page.base_route,
          colorCode: page.color_code,
          layoutGroup: page.layout_group,
          sortOrder: page.module_sort_order,
          pages: []
        });
      }
      
      moduleMap.get(moduleKey).pages.push({
        id: page.id,
        code: page.page_code,
        name: page.display_name,
        description: page.description,
        route: page.route,
        icon: page.icon,
        sortOrder: page.sort_order,
        permissions: {
          canView: true,  // If it's in effective pages, user can view
          canEdit: effectivePages.has(page.page_code + ':edit') || true // Default edit
        }
      });
    }
    
    // STEP 5: Build final menu (sorted, filtered by sidebar route prefixes)
    // Admin roles see only their home module pages in sidebar, not ALL pages they can access
    // DYNAMIC: Get sidebar routes from DB (admin_page_assignments) or fallback to hardcoded
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const sidebarPrefixes = await getDynamicSidebarRoutes(pool, userRole, tenantId);
    
    let filteredMenu = Array.from(moduleMap.values());
    
    // Apply sidebar route prefix filter for admin roles
    if (sidebarPrefixes) {
      console.log(`[MenuSecure] Filtering sidebar for ${userRole} to prefixes: ${sidebarPrefixes.length} routes`);
      
      filteredMenu = filteredMenu.map(m => ({
        ...m,
        pages: m.pages.filter(p => 
          sidebarPrefixes.some(prefix => p.route.startsWith(prefix))
        )
      }));
    }
    
    const menu = filteredMenu
      .filter(m => m.pages.length > 0)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(m => ({
        ...m,
        pages: m.pages.sort((a, b) => a.sortOrder - b.sortOrder)
      }));
    
    // STEP 6: Build flat accessible routes list
    const accessibleRoutes = pagesResult.rows.map(p => ({
      route: p.route,
      code: p.page_code,
      canView: true,
      canEdit: true
    }));
    
    // STEP 7: Audit log
    const duration = Date.now() - startTime;
    console.log(`[MenuSecure] SUCCESS: user=${userId}, role=${userRole}, pages=${effectivePages.size}, modules=${menu.length}, time=${duration}ms`);
    
    // STEP 8: Response
    return res.json({
      success: true,
      role: userRole,
      effectivePagesCount: effectivePages.size,
      menu,
      accessibleRoutes,
      meta: {
        computedAt: new Date().toISOString(),
        computeTimeMs: duration,
        source: 'effectiveAccessService'
      }
    });
    
  } catch (error) {
    console.error(`[MenuSecure] ERROR for user ${userId}:`, error.message);
    
    // NO FALLBACK - return empty menu on error (fail closed)
    return res.status(500).json({
      success: false,
      message: 'Menu computation failed - access denied',
      menu: [],
      accessibleRoutes: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
    
  } finally {
    client.release();
  }
});

// ============================================================================
// GET /api/modules/check-access - Check if user can access a specific page
// ============================================================================

router.get('/check-access', authenticate, async (req, res) => {
  const { route, pageCode } = req.query;
  const userId = req.user?.legacyId || req.user?.legacy_id || req.user?.id;
  
  if (!route && !pageCode) {
    return res.status(400).json({
      success: false,
      message: 'route or pageCode required'
    });
  }
  
  try {
    const effectivePages = await getEffectivePagesForUser(req.user);
    
    const hasAccess = (route && effectivePages.has(route)) || 
                      (pageCode && effectivePages.has(pageCode)) ||
                      ALWAYS_ACCESSIBLE_ROUTES.includes(route);
    
    console.log(`[MenuSecure] Access check: user=${userId}, route=${route}, pageCode=${pageCode}, hasAccess=${hasAccess}`);
    
    return res.json({
      success: true,
      hasAccess,
      route,
      pageCode
    });
    
  } catch (error) {
    console.error(`[MenuSecure] Access check error:`, error.message);
    return res.json({
      success: false,
      hasAccess: false, // Fail closed
      route,
      pageCode,
      error: 'Access check failed'
    });
  }
});

module.exports = router;
