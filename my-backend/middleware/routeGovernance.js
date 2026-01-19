/**
 * ============================================================================
 * BISMAN ERP - Route Governance Middleware
 * ============================================================================
 * 
 * This middleware enforces the "No DB Entry = No Access" rule.
 * 
 * It checks if the requested route exists in pages_master and:
 *   1. If route doesn't exist → Block with 404 and log to unregistered_route_access
 *   2. If route exists but is_governed=true → Check RBAC via role_page_access
 *   3. If RBAC fails → Return 403
 *   4. If subscription gating fails → Return 402
 * 
 * This middleware should be applied to all protected frontend routes.
 * 
 * Date: 2025-01-19
 * ============================================================================
 */

const { getPool } = require('./database');

// ============================================================================
// Configuration
// ============================================================================

// Routes that bypass governance check entirely (truly public)
const BYPASS_ROUTES = [
  '/api/',
  '/auth/',
  '/login',
  '/signup',
  '/_next/',
  '/favicon',
  '/static/',
  '/health',
  '/status',
  '/privacy',
  '/terms',
  '/docs/',
  '/support',
  '/contact-sales',
];

// Super roles that bypass RBAC (still need route to exist)
const SUPER_ROLES = ['ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'];

// ============================================================================
// Route Pattern Matching
// ============================================================================

/**
 * Normalize a route for database lookup
 * - Removes query strings
 * - Normalizes trailing slashes
 * - Handles dynamic segments
 */
function normalizeRoute(url) {
  let route = url.split('?')[0]; // Remove query string
  route = route.split('#')[0];   // Remove hash
  
  // Normalize trailing slash (remove it, except for root)
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
 * Convert a URL with actual IDs to a pattern for matching
 * e.g., /admin/users/123 → /admin/users/:id
 */
function urlToPattern(url) {
  const segments = url.split('/');
  return segments.map(seg => {
    // Check if segment looks like an ID (UUID, number, or specific patterns)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
      return ':id'; // UUID
    }
    if (/^\d+$/.test(seg)) {
      return ':id'; // Numeric ID
    }
    if (/^[a-zA-Z0-9_-]{20,}$/.test(seg)) {
      return ':token'; // Token-like string
    }
    return seg;
  }).join('/');
}

/**
 * Check if route should bypass governance
 */
function shouldBypassRoute(route) {
  for (const bypass of BYPASS_ROUTES) {
    if (route.startsWith(bypass)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Check if route exists in pages_master and get its governance info
 */
async function checkRouteExists(pool, route) {
  const pattern = urlToPattern(route);
  
  // Try exact match first, then pattern match
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
      m.module_code,
      m.id as module_id
    FROM pages_master p
    LEFT JOIN modules_master m ON m.id = p.module_id
    WHERE p.is_active = TRUE
      AND (
        p.route = $1                    -- Exact match
        OR p.route_pattern = $1         -- Pattern match (normalized)
        OR p.route_pattern = $2         -- Pattern match (with :id)
        OR (
          -- Handle dynamic routes: /admin/users/:id matches /admin/users/123
          p.is_dynamic = TRUE 
          AND $1 ~ ('^' || REGEXP_REPLACE(COALESCE(p.route_pattern, p.route), ':[a-zA-Z_]+', '[^/]+', 'g') || '$')
        )
      )
    LIMIT 1
  `, [route, pattern]);
  
  return result.rows[0] || null;
}

/**
 * Check if role has access to page
 */
async function checkRoleAccess(pool, pageId, roleName) {
  const result = await pool.query(`
    SELECT can_view, can_edit, can_delete, can_export
    FROM role_page_access
    WHERE page_id = $1 AND role_name = $2 AND can_view = TRUE
  `, [pageId, roleName]);
  
  return result.rows[0] || null;
}

/**
 * Check subscription allows module access
 */
async function checkModuleSubscription(pool, tenantId, moduleCode) {
  // Check if tenant's subscription plan includes this module
  const result = await pool.query(`
    SELECT 1
    FROM client_subscriptions cs
    JOIN subscription_plans sp ON sp.id = cs.plan_id
    JOIN plan_modules pm ON pm.plan_id = sp.id
    JOIN modules_master m ON m.module_code = pm.module_code
    WHERE cs.tenant_id = $1
      AND cs.status = 'active'
      AND m.module_code = $2
      AND pm.is_enabled = TRUE
    LIMIT 1
  `, [tenantId, moduleCode]);
  
  return result.rows.length > 0;
}

/**
 * Log unregistered route access attempt
 */
async function logUnregisteredAccess(pool, route, userId, userRole, tenantId, ip, userAgent) {
  try {
    await pool.query(`
      INSERT INTO unregistered_route_access 
      (route, user_id, user_role, tenant_id, ip_address, user_agent, blocked)
      VALUES ($1, $2, $3, $4, $5::inet, $6, TRUE)
    `, [route, userId, userRole, tenantId, ip || null, userAgent || null]);
  } catch (err) {
    console.error('[RouteGovernance] Failed to log unregistered access:', err.message);
  }
}

// ============================================================================
// Main Middleware
// ============================================================================

/**
 * Route Governance Middleware
 * 
 * Enforces: "No DB Entry = No Access"
 */
function routeGovernanceMiddleware(options = {}) {
  const { 
    strict = true,           // If true, block unregistered routes. If false, just log.
    logAttempts = true,      // Log unregistered access attempts
    bypassPublic = true,     // Bypass public/auth routes
  } = options;

  return async (req, res, next) => {
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      const route = normalizeRoute(req.path || req.url);
      
      // Skip API routes and truly public routes
      if (bypassPublic && shouldBypassRoute(route)) {
        return next();
      }
      
      // Get user info from auth middleware (should have run before)
      const userId = req.user?.id || req.user?.userId;
      const userRole = req.user?.role || req.user?.roleName;
      const tenantId = req.user?.tenantId || req.user?.tenant_id;
      
      // Check if route exists in database
      const pageInfo = await checkRouteExists(client, route);
      
      // RULE 1: No DB entry = No access
      if (!pageInfo) {
        console.warn(`[RouteGovernance] BLOCKED: Unregistered route "${route}" by ${userRole || 'anonymous'}`);
        
        if (logAttempts) {
          await logUnregisteredAccess(
            client, 
            route, 
            userId, 
            userRole, 
            tenantId,
            req.ip || req.headers['x-forwarded-for'],
            req.headers['user-agent']
          );
        }
        
        if (strict) {
          return res.status(404).json({
            success: false,
            code: 'ROUTE_NOT_REGISTERED',
            message: 'This page does not exist or has not been registered.',
            route,
          });
        }
        
        // Non-strict mode: just log and continue
        return next();
      }
      
      // Public pages (is_governed = false) don't need RBAC
      if (!pageInfo.is_governed || pageInfo.is_public) {
        return next();
      }
      
      // RULE 2: Governed routes require authentication
      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'You must be logged in to access this page.',
          route,
        });
      }
      
      // Super roles bypass RBAC check
      if (SUPER_ROLES.includes(userRole)) {
        return next();
      }
      
      // RULE 3: Check RBAC (role_page_access)
      const roleAccess = await checkRoleAccess(client, pageInfo.id, userRole);
      
      if (!roleAccess) {
        console.warn(`[RouteGovernance] DENIED: No RBAC entry for role "${userRole}" on page "${route}"`);
        return res.status(403).json({
          success: false,
          code: 'RBAC_ACCESS_DENIED',
          message: 'You do not have permission to access this page.',
          route,
          pageCode: pageInfo.page_code,
        });
      }
      
      // RULE 4: Check subscription allows module (if tenant-based)
      if (tenantId && pageInfo.module_code) {
        const hasModuleAccess = await checkModuleSubscription(client, tenantId, pageInfo.module_code);
        
        if (!hasModuleAccess) {
          console.warn(`[RouteGovernance] PAYWALLED: Module "${pageInfo.module_code}" not in tenant ${tenantId} subscription`);
          return res.status(402).json({
            success: false,
            code: 'PLAN_UPGRADE_REQUIRED',
            message: `Your subscription plan does not include access to the ${pageInfo.display_name || pageInfo.module_code} module.`,
            route,
            module: pageInfo.module_code,
          });
        }
      }
      
      // All checks passed - attach page info to request for downstream use
      req.pageInfo = pageInfo;
      req.pageAccess = roleAccess;
      
      next();
      
    } catch (error) {
      console.error('[RouteGovernance] Error:', error);
      
      // Don't block on errors - fail open with warning
      console.warn('[RouteGovernance] Failing open due to error - allowing request');
      next();
      
    } finally {
      client.release();
    }
  };
}

// ============================================================================
// Express Router for API Validation
// ============================================================================

/**
 * API endpoint to validate route access (for frontend pre-check)
 * 
 * GET /api/governance/validate-route?route=/admin/users
 */
async function validateRouteHandler(req, res) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const route = normalizeRoute(req.query.route || '');
    const userRole = req.user?.role || req.user?.roleName;
    const tenantId = req.user?.tenantId;
    
    if (!route) {
      return res.status(400).json({
        success: false,
        message: 'Route parameter is required',
      });
    }
    
    // Check route exists
    const pageInfo = await checkRouteExists(client, route);
    
    if (!pageInfo) {
      return res.json({
        success: true,
        data: {
          exists: false,
          hasAccess: false,
          route,
        },
      });
    }
    
    // Check RBAC if governed
    let hasRbacAccess = !pageInfo.is_governed || pageInfo.is_public;
    let rbacDetails = null;
    
    if (pageInfo.is_governed && userRole) {
      rbacDetails = await checkRoleAccess(client, pageInfo.id, userRole);
      hasRbacAccess = !!rbacDetails;
    }
    
    // Check subscription
    let hasSubscriptionAccess = true;
    if (tenantId && pageInfo.module_code) {
      hasSubscriptionAccess = await checkModuleSubscription(client, tenantId, pageInfo.module_code);
    }
    
    res.json({
      success: true,
      data: {
        exists: true,
        hasAccess: hasRbacAccess && hasSubscriptionAccess,
        route,
        page: {
          id: pageInfo.id,
          code: pageInfo.page_code,
          name: pageInfo.display_name,
          module: pageInfo.module_code,
          isGoverned: pageInfo.is_governed,
          isPublic: pageInfo.is_public,
        },
        rbac: rbacDetails ? {
          canView: rbacDetails.can_view,
          canEdit: rbacDetails.can_edit,
          canDelete: rbacDetails.can_delete,
          canExport: rbacDetails.can_export,
        } : null,
        subscription: {
          hasAccess: hasSubscriptionAccess,
          module: pageInfo.module_code,
        },
      },
    });
    
  } catch (error) {
    console.error('[validateRouteHandler] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate route',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    client.release();
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  routeGovernanceMiddleware,
  validateRouteHandler,
  checkRouteExists,
  checkRoleAccess,
  checkModuleSubscription,
  normalizeRoute,
  urlToPattern,
};
