/**
 * ============================================================================
 * BISMAN ERP - Shared RBAC Access Checker
 * ============================================================================
 * 
 * This module provides the single source of truth for RBAC access checks.
 * It is used by both:
 *   - UI route middleware (frontend page access)
 *   - API route middleware (backend endpoint access)
 * 
 * RULE: DEFAULT DENY
 *   - If route not found → 404
 *   - If route found but is_governed=true and no RBAC mapping → 403
 *   - If RBAC mapping exists with can_view=true → Allow
 * 
 * Date: 2025-01-19
 * ============================================================================
 */

const { getPool } = require('../../middleware/database');

// ============================================================================
// Configuration
// ============================================================================

// Roles that bypass RBAC checks (still require route to exist)
const SUPER_ROLES = ['ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'];

// Roles with full access to their module scope
const MODULE_ADMIN_ROLES = {
  'SUPER_ADMIN': ['*'], // Access to all modules
  'ENTERPRISE_ADMIN': ['*'], // Access to all modules
};

// Cache for route lookups (TTL: 60 seconds)
const routeCache = new Map();
const CACHE_TTL = 60 * 1000;

// ============================================================================
// Route Pattern Matching
// ============================================================================

/**
 * Normalize a route for database lookup
 */
function normalizeRoute(url) {
  if (!url) return '/';
  
  let route = url.split('?')[0].split('#')[0];
  
  // Remove trailing slash (except for root)
  if (route.length > 1 && route.endsWith('/')) {
    route = route.slice(0, -1);
  }
  
  // Ensure starts with /
  if (!route.startsWith('/')) {
    route = '/' + route;
  }
  
  return route;
}

/**
 * Convert URL with IDs to pattern for matching
 * e.g., /admin/users/123 → /admin/users/:id
 */
function urlToPattern(url) {
  const segments = url.split('/');
  return segments.map(seg => {
    // UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
      return ':id';
    }
    // Numeric ID
    if (/^\d+$/.test(seg)) {
      return ':id';
    }
    // Token-like string
    if (/^[a-zA-Z0-9_-]{20,}$/.test(seg)) {
      return ':token';
    }
    return seg;
  }).join('/');
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Get page info from database by route
 * @param {Object} pool - Database pool
 * @param {string} route - Normalized route path
 * @returns {Object|null} Page info or null if not found
 */
async function getPageByRoute(pool, route) {
  const pattern = urlToPattern(route);
  
  // Check cache first
  const cacheKey = `page:${route}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const result = await pool.query(`
    SELECT 
      p.id,
      p.page_code,
      p.display_name,
      p.route,
      p.route_pattern,
      p.is_governed,
      p.is_active,
      p.is_public,
      p.is_dynamic,
      m.id as module_id,
      m.module_code
    FROM pages_master p
    LEFT JOIN modules_master m ON m.id = p.module_id
    WHERE p.is_active = TRUE
      AND (
        p.route = $1
        OR p.route_pattern = $1
        OR p.route_pattern = $2
        OR (
          p.is_dynamic = TRUE 
          AND $1 ~ ('^' || REGEXP_REPLACE(COALESCE(p.route_pattern, p.route), ':[a-zA-Z_]+', '[^/]+', 'g') || '$')
        )
      )
    LIMIT 1
  `, [route, pattern]);
  
  const page = result.rows[0] || null;
  
  // Cache the result
  routeCache.set(cacheKey, { data: page, timestamp: Date.now() });
  
  return page;
}

/**
 * Get RBAC permissions for a role on a page
 * @param {Object} pool - Database pool
 * @param {number} pageId - Page ID
 * @param {string} roleName - Role name
 * @returns {Object|null} Permissions or null if no mapping
 */
async function getRolePageAccess(pool, pageId, roleName) {
  const result = await pool.query(`
    SELECT 
      can_view,
      can_edit,
      can_delete,
      can_export
    FROM role_page_access
    WHERE page_id = $1 
      AND role_name = $2
      AND can_view = TRUE
  `, [pageId, roleName]);
  
  return result.rows[0] || null;
}

// ============================================================================
// Main RBAC Check Function
// ============================================================================

/**
 * Check if a role has access to a route
 * 
 * @param {Object} options
 * @param {string} options.route - The route path to check
 * @param {string} options.roleName - The user's role name
 * @param {number} [options.userId] - Optional user ID for logging
 * @param {number} [options.tenantId] - Optional tenant ID for subscription check
 * 
 * @returns {Object} Access result
 *   - allowed: boolean
 *   - reason: string (allowed|denied|not_found|not_governed|super_role)
 *   - page: object|null
 *   - permissions: object|null
 */
async function checkPageAccess({ route, roleName, userId, tenantId }) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const normalizedRoute = normalizeRoute(route);
    
    // Step 1: Find the page in database
    const page = await getPageByRoute(client, normalizedRoute);
    
    // RULE: No DB entry = 404
    if (!page) {
      return {
        allowed: false,
        reason: 'not_found',
        page: null,
        permissions: null,
        statusCode: 404,
        message: 'Route not registered in system',
      };
    }
    
    // Step 2: Non-governed or public pages are always accessible
    if (!page.is_governed || page.is_public) {
      return {
        allowed: true,
        reason: 'not_governed',
        page,
        permissions: { can_view: true, can_edit: false, can_delete: false, can_export: false },
        statusCode: 200,
      };
    }
    
    // Step 3: Super roles bypass RBAC
    if (SUPER_ROLES.includes(roleName)) {
      return {
        allowed: true,
        reason: 'super_role',
        page,
        permissions: { can_view: true, can_edit: true, can_delete: true, can_export: true },
        statusCode: 200,
      };
    }
    
    // Step 4: Module admin roles get access to their modules
    const moduleAdminScopes = MODULE_ADMIN_ROLES[roleName];
    if (moduleAdminScopes) {
      if (moduleAdminScopes.includes('*') || moduleAdminScopes.includes(page.module_code)) {
        return {
          allowed: true,
          reason: 'module_admin',
          page,
          permissions: { can_view: true, can_edit: true, can_delete: true, can_export: true },
          statusCode: 200,
        };
      }
    }
    
    // Step 5: Check explicit RBAC mapping (DEFAULT DENY)
    const rbacAccess = await getRolePageAccess(client, page.id, roleName);
    
    if (!rbacAccess) {
      // NO MAPPING = DENY
      return {
        allowed: false,
        reason: 'denied',
        page,
        permissions: null,
        statusCode: 403,
        message: 'Access denied: no RBAC mapping for this role',
      };
    }
    
    // Step 6: RBAC mapping exists with can_view=true
    return {
      allowed: true,
      reason: 'allowed',
      page,
      permissions: {
        can_view: rbacAccess.can_view,
        can_edit: rbacAccess.can_edit,
        can_delete: rbacAccess.can_delete,
        can_export: rbacAccess.can_export,
      },
      statusCode: 200,
    };
    
  } finally {
    client.release();
  }
}

/**
 * Batch check access for multiple routes
 * Useful for sidebar/menu generation
 */
async function checkMultiplePageAccess({ routes, roleName }) {
  const results = {};
  
  for (const route of routes) {
    results[route] = await checkPageAccess({ route, roleName });
  }
  
  return results;
}

/**
 * Clear route cache (call after sync or RBAC changes)
 */
function clearRouteCache() {
  routeCache.clear();
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  checkPageAccess,
  checkMultiplePageAccess,
  getPageByRoute,
  getRolePageAccess,
  normalizeRoute,
  urlToPattern,
  clearRouteCache,
  SUPER_ROLES,
  MODULE_ADMIN_ROLES,
};
