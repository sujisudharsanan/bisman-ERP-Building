/**
 * ============================================================================
 * BISMAN ERP - Route Authorization Guardrail (PHASE 3 LOCKDOWN)
 * ============================================================================
 * 
 * SECURITY PURPOSE:
 * This middleware automatically enforces authorization on ALL routes that
 * match protected patterns. It acts as a safety net for routes that may
 * not have explicit authorize() calls.
 * 
 * USAGE: Apply at app level BEFORE route registration
 * 
 * @module middleware/routeAuthorizationGuardrail
 */

const { computeEffectivePages } = require('../services/effectiveAccessService');
const { getPool } = require('./database');

// ============================================================================
// HELPER: Fetch plan_id from database if missing from JWT
// ============================================================================

async function fetchPlanIdFromDB(tenantId) {
  if (!tenantId) return null;
  
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT plan_id FROM client_subscriptions 
      WHERE client_id = $1 AND is_active = true 
      ORDER BY created_at DESC LIMIT 1
    `, [tenantId]);
    return result.rows[0]?.plan_id || null;
  } catch (e) {
    console.warn(`[RouteGuardrail] Could not fetch plan_id for tenant ${tenantId}:`, e.message);
    return null;
  }
}

// ============================================================================
// ROUTE → PAGE_KEY MAPPING
// ============================================================================

/**
 * Map route patterns to required page keys
 * Routes not in this map use the automatic extraction logic
 */
const ROUTE_PAGE_MAPPING = {
  // Finance routes
  '/api/finance': 'FINANCE_DASHBOARD',
  '/api/finance/reports': 'FINANCE_REPORTS',
  '/api/finance/transactions': 'FINANCE_TRANSACTIONS',
  '/api/finance/invoices': 'FINANCE_INVOICES',
  '/api/finance/budgets': 'FINANCE_BUDGETS',
  
  // User management
  '/api/users': 'USER_MANAGEMENT',
  '/api/users/create': 'USER_MANAGEMENT',
  '/api/users/roles': 'ROLE_MANAGEMENT',
  
  // Inventory
  '/api/inventory': 'INVENTORY_DASHBOARD',
  '/api/inventory/products': 'INVENTORY_PRODUCTS',
  '/api/inventory/stock': 'INVENTORY_STOCK',
  
  // Sales
  '/api/sales': 'SALES_DASHBOARD',
  '/api/sales/orders': 'SALES_ORDERS',
  '/api/sales/quotations': 'SALES_QUOTATIONS',
  
  // HR
  '/api/hr': 'HR_DASHBOARD',
  '/api/hr/employees': 'HR_EMPLOYEES',
  '/api/hr/attendance': 'HR_ATTENDANCE',
  '/api/hr/payroll': 'HR_PAYROLL',
  
  // CRM
  '/api/crm': 'CRM_DASHBOARD',
  '/api/crm/customers': 'CRM_CUSTOMERS',
  '/api/crm/leads': 'CRM_LEADS',
  
  // Reports
  '/api/reports': 'REPORTS_DASHBOARD',
  
  // Admin
  '/api/admin': 'ADMIN_DASHBOARD',
  '/api/admin/settings': 'ADMIN_SETTINGS',
  '/api/admin/audit': 'ADMIN_AUDIT',
  
  // Governance
  '/api/governance': 'GOVERNANCE_DASHBOARD'
};

// ============================================================================
// ROUTES THAT BYPASS AUTHORIZATION
// ============================================================================

const BYPASS_PATTERNS = [
  '/api/auth/',
  '/api/health',
  '/api/ping',
  '/api/me',     // User profile endpoint - always allowed after auth
  '/api/menu',  // Menu has its own secure logic
  '/api/public/',
  '/api/webhook/',
  '/favicon',
  '/api/uploads/',
  '/api/static/',
  '/api/token/',  // Token refresh endpoint
  '/api/enterprise-admin/',  // Enterprise Admin APIs - role-protected at route level
  '/api/super-admin/',  // Super Admin APIs - role-protected at route level
  '/api/superadmin/',  // SuperAdmin coupon APIs - role-protected at route level
  '/api/subscription-control/',  // Subscription Control APIs - role-protected at route level
  '/api/privileges/',  // Privileges APIs - role-protected at route level
  '/api/rbac/',  // RBAC APIs - role-protected at route level
  '/api/reports/',  // Reports APIs - role-protected at route level
  '/api/governance/',  // Governance APIs - role-protected at route level
  '/api/system/',  // System APIs - role-protected at route level
  '/api/users',  // User management APIs - role-protected at route level
  '/api/subscriptions/',  // Subscription APIs - role-protected at route level
  '/api/branches',  // Branches APIs - role-protected at route level
  '/api/assets',  // Asset Management APIs - has its own permission middleware (checkAssetPermission)
];

const ALWAYS_ALLOWED_PAGES = new Set([
  'DASHBOARD',
  'COMMON_CALENDAR',
  'COMMON_USER_SETTINGS',
  'USER_PROFILE',
  'dashboard',
  'home',
  'profile',
  'settings'
]);

// ============================================================================
// HELPER: Extract page key from route
// ============================================================================

function extractPageKeyFromRoute(route) {
  // Check explicit mapping first
  for (const [pattern, pageKey] of Object.entries(ROUTE_PAGE_MAPPING)) {
    if (route.startsWith(pattern)) {
      return pageKey;
    }
  }
  
  // Auto-extract: /api/module/action → MODULE_ACTION
  const match = route.match(/^\/api\/([^/]+)(?:\/([^/]+))?/);
  if (match) {
    const module = match[1].toUpperCase().replace(/-/g, '_');
    const action = match[2] ? match[2].toUpperCase().replace(/-/g, '_') : 'DASHBOARD';
    return `${module}_${action}`;
  }
  
  return null;
}

// ============================================================================
// MAIN: Route Authorization Guardrail Middleware
// ============================================================================

/**
 * Guardrail middleware that ensures ALL protected routes check authorization
 * Apply this at app level: app.use(routeAuthorizationGuardrail)
 */
async function routeAuthorizationGuardrail(req, res, next) {
  const route = req.originalUrl || req.path;
  
  // Skip bypass patterns
  if (BYPASS_PATTERNS.some(pattern => route.startsWith(pattern))) {
    return next();
  }
  
  // Skip if no user (let authenticate middleware handle this)
  if (!req.user) {
    return next();
  }
  
  // Extract required page key
  const requiredPageKey = extractPageKeyFromRoute(route);
  
  if (!requiredPageKey) {
    // Cannot determine page key - log and allow (let route-level handle it)
    console.warn(`[RouteGuardrail] No page key mapping for ${route} - passing through`);
    return next();
  }
  
  // Check if always allowed
  if (ALWAYS_ALLOWED_PAGES.has(requiredPageKey)) {
    return next();
  }
  
  // ENFORCE AUTHORIZATION
  const userId = req.user.legacyId || req.user.legacy_id || req.user.id;
  const tenantId = req.user.tenantId || req.user.tenant_id;
  let planId = req.user.planId || req.user.plan_id;
  const role = req.user.role || req.user.roleName;
  
  // RBAC FIX: Fetch plan_id from DB if missing from JWT
  if (!planId && tenantId) {
    try {
      planId = await fetchPlanIdFromDB(tenantId);
    } catch (e) {
      console.warn(`[RouteGuardrail] plan_id fetch failed:`, e.message);
    }
  }
  if (!planId) planId = 1; // Last resort fallback
  
  if (!userId) {
    console.error(`[RouteGuardrail] DENY: No userId for ${route}`);
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }
  
  // Check effective access - pass role to allow platform detection
  computeEffectivePages({ userId, tenantId, planId, role })
    .then(result => {
      const effectivePages = new Set(result?.effectivePages || []);
      
      // Add always allowed
      for (const page of ALWAYS_ALLOWED_PAGES) {
        effectivePages.add(page);
      }
      
      const hasAccess = effectivePages.has(requiredPageKey) ||
                        effectivePages.has(requiredPageKey.toUpperCase()) ||
                        effectivePages.has(requiredPageKey.toLowerCase());
      
      if (hasAccess) {
        return next();
      }
      
      // DENY - reduce log verbosity for production
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[RouteGuardrail] DENY: user=${userId} role=${role} page=${requiredPageKey} route=${route}`);
      }
      
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access denied to ${requiredPageKey}`,
        route,
        requiredPageKey,
        hint: 'Contact your administrator to request access'
      });
    })
    .catch(error => {
      // Log single structured error, not full Prisma dump
      console.error(`[RouteGuardrail] Authorization error for user=${userId}: ${error.message}`);
      // FAIL CLOSED
      return res.status(500).json({
        success: false,
        error: 'AUTHORIZATION_ERROR',
        message: 'Authorization check failed - access denied'
      });
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  routeAuthorizationGuardrail,
  extractPageKeyFromRoute,
  ROUTE_PAGE_MAPPING,
  BYPASS_PATTERNS,
  ALWAYS_ALLOWED_PAGES
};
