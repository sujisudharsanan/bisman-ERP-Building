/**
 * ============================================================================
 * BISMAN ERP - Authorization Middleware (PHASE 2 MANDATORY FIX)
 * ============================================================================
 * 
 * SECURITY REQUIREMENTS (NON-NEGOTIABLE):
 *   1. Uses ONLY effectiveAccessService - NO role-based fallback
 *   2. NO silent allow - every decision is logged
 *   3. Fails CLOSED (deny by default)
 *   4. ALL API endpoints MUST use this middleware
 * 
 * USAGE:
 *   router.get('/api/finance/reports', authenticate, authorize('FINANCE_REPORTS'), handler)
 *   router.post('/api/users', authenticate, authorize('USER_MANAGEMENT', 'edit'), handler)
 * 
 * @module middleware/authorize
 */

const effectiveAccessService = require('../services/effectiveAccessService');
const { getPool } = require('./database');

// MANDATORY: Fail if service not available
if (!effectiveAccessService || !effectiveAccessService.computeEffectivePages) {
  throw new Error('[SECURITY] effectiveAccessService is REQUIRED for authorization');
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Routes that bypass authorization (public + auth endpoints only)
const BYPASS_ROUTES = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/health',
  '/api/ping'
];

// Minimal pages that ANY authenticated user can access
const ALWAYS_ALLOWED_PAGES = [
  'DASHBOARD',
  'COMMON_CALENDAR',
  'COMMON_USER_SETTINGS',
  'USER_PROFILE'
];

// Cache for effective pages (short TTL for performance)
const accessCache = new Map();
const CACHE_TTL_MS = 30000; // 30 seconds

// ============================================================================
// HELPER: Get cached effective pages
// ============================================================================

async function getCachedEffectivePages(userId, tenantId, planId, role) {
  const cacheKey = `${userId}:${tenantId}:${planId}:${role}`;
  const cached = accessCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.pages;
  }
  
  const result = await effectiveAccessService.computeEffectivePages({
    userId,
    tenantId,
    planId,
    role // Pass role for platform detection
  });
  
  const pages = new Set(result?.effectivePages || []);
  
  // Add always-allowed pages
  for (const page of ALWAYS_ALLOWED_PAGES) {
    pages.add(page);
  }
  
  accessCache.set(cacheKey, {
    pages,
    timestamp: Date.now()
  });
  
  return pages;
}

// ============================================================================
// HELPER: Clear cache for user (call on permission changes)
// ============================================================================

function clearAccessCache(userId) {
  for (const key of accessCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      accessCache.delete(key);
    }
  }
}

// ============================================================================
// HELPER: Log authorization decision
// ============================================================================

async function logAuthorizationDecision(decision) {
  try {
    const pool = getPool();
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, table_name, new_values, created_at)
      VALUES ($1, $2, 'authorization', $3, NOW())
    `, [
      decision.userId,
      decision.allowed ? 'AUTHORIZE_ALLOW' : 'AUTHORIZE_DENY',
      JSON.stringify({
        pageKey: decision.pageKey,
        permission: decision.permission,
        route: decision.route,
        method: decision.method,
        reason: decision.reason,
        effectivePagesCount: decision.effectivePagesCount
      })
    ]);
  } catch (err) {
    console.error('[Authorize] Failed to log decision:', err.message);
  }
}

// ============================================================================
// MAIN: authorize(pageKey, permission?) middleware factory
// ============================================================================

/**
 * Create authorization middleware for a specific page/permission
 * 
 * @param {string} pageKey - The page code to authorize (e.g., 'FINANCE_REPORTS')
 * @param {string} permission - Optional permission type: 'view' | 'edit' | 'delete' | 'export'
 * @returns {Function} Express middleware
 * 
 * @example
 * // Basic usage - check if user can view page
 * router.get('/finance/reports', authenticate, authorize('FINANCE_REPORTS'), handler)
 * 
 * // With specific permission
 * router.post('/users', authenticate, authorize('USER_MANAGEMENT', 'edit'), handler)
 * 
 * // With delete permission
 * router.delete('/users/:id', authenticate, authorize('USER_MANAGEMENT', 'delete'), handler)
 */
function authorize(pageKey, permission = 'view') {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Extract user info from JWT (set by authenticate middleware)
    const userId = req.user?.legacyId || req.user?.legacy_id || req.user?.id;
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const planId = req.user?.planId || req.user?.plan_id || 1;
    const userRole = req.user?.role || req.user?.roleName;
    const route = req.originalUrl || req.path;
    const method = req.method;
    
    // Check bypass routes
    if (BYPASS_ROUTES.some(r => route.startsWith(r))) {
      return next();
    }
    
    // SECURITY: Require user context
    if (!userId) {
      console.error(`[Authorize] DENY: No userId in request for ${route}`);
      
      await logAuthorizationDecision({
        userId: null,
        pageKey,
        permission,
        route,
        method,
        allowed: false,
        reason: 'NO_USER_ID',
        effectivePagesCount: 0
      });
      
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        pageKey
      });
    }
    
    try {
      // Get effective pages (cached) - pass role for platform detection
      const effectivePages = await getCachedEffectivePages(userId, tenantId, planId, userRole);
      
      // Check if page is in effective pages
      const hasPageAccess = effectivePages.has(pageKey) || 
                            effectivePages.has(pageKey.toUpperCase()) ||
                            effectivePages.has(pageKey.toLowerCase());
      
      // For edit/delete, check specific permission (future: granular permissions)
      // Currently: if user has page access, they have all permissions on that page
      const hasPermission = hasPageAccess;
      
      const decision = {
        userId,
        pageKey,
        permission,
        route,
        method,
        allowed: hasPermission,
        reason: hasPermission ? 'EFFECTIVE_ACCESS' : 'NOT_IN_EFFECTIVE_PAGES',
        effectivePagesCount: effectivePages.size
      };
      
      // Log ALL decisions (both allow and deny)
      await logAuthorizationDecision(decision);
      
      const duration = Date.now() - startTime;
      
      if (hasPermission) {
        console.log(`[Authorize] ALLOW: user=${userId}, role=${userRole}, page=${pageKey}, perm=${permission}, time=${duration}ms`);
        return next();
      }
      
      // DENY - no fallback, no silent allow
      console.warn(`[Authorize] DENY: user=${userId}, role=${userRole}, page=${pageKey}, perm=${permission}, route=${route}`);
      
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access denied to ${pageKey}`,
        pageKey,
        permission,
        hint: 'Contact your administrator to request access to this page'
      });
      
    } catch (error) {
      console.error(`[Authorize] ERROR: user=${userId}, page=${pageKey}:`, error.message);
      
      // Log the error decision
      await logAuthorizationDecision({
        userId,
        pageKey,
        permission,
        route,
        method,
        allowed: false,
        reason: `ERROR: ${error.message}`,
        effectivePagesCount: 0
      });
      
      // FAIL CLOSED - deny on error, no fallback
      return res.status(500).json({
        success: false,
        error: 'AUTHORIZATION_ERROR',
        message: 'Authorization check failed - access denied',
        pageKey
      });
    }
  };
}

// ============================================================================
// VARIANT: authorizeAny(pageKeys[]) - Allow if user has ANY of the pages
// ============================================================================

/**
 * Authorize if user has access to ANY of the specified pages
 * Useful for endpoints that serve multiple page contexts
 * 
 * @param {string[]} pageKeys - Array of page codes
 * @param {string} permission - Permission type
 */
function authorizeAny(pageKeys, _permission = 'view') {
  return async (req, res, next) => {
    const userId = req.user?.legacyId || req.user?.legacy_id || req.user?.id;
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const planId = req.user?.planId || req.user?.plan_id || 1;
    const route = req.originalUrl || req.path;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }
    
    try {
      const effectivePages = await getCachedEffectivePages(userId, tenantId, planId);
      
      const hasAnyAccess = pageKeys.some(pk => 
        effectivePages.has(pk) || 
        effectivePages.has(pk.toUpperCase()) ||
        effectivePages.has(pk.toLowerCase())
      );
      
      if (hasAnyAccess) {
        console.log(`[Authorize] ALLOW (any): user=${userId}, pages=${pageKeys.join(',')}`);
        return next();
      }
      
      console.warn(`[Authorize] DENY (any): user=${userId}, pages=${pageKeys.join(',')}, route=${route}`);
      
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied - none of the required pages are accessible'
      });
      
    } catch (error) {
      console.error(`[Authorize] ERROR (any):`, error.message);
      return res.status(500).json({
        success: false,
        error: 'AUTHORIZATION_ERROR',
        message: 'Authorization check failed'
      });
    }
  };
}

// ============================================================================
// VARIANT: authorizeAll(pageKeys[]) - Require ALL pages
// ============================================================================

/**
 * Authorize only if user has access to ALL specified pages
 * 
 * @param {string[]} pageKeys - Array of page codes
 * @param {string} permission - Permission type
 */
function authorizeAll(pageKeys, _permission = 'view') {
  return async (req, res, next) => {
    const userId = req.user?.legacyId || req.user?.legacy_id || req.user?.id;
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const planId = req.user?.planId || req.user?.plan_id || 1;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }
    
    try {
      const effectivePages = await getCachedEffectivePages(userId, tenantId, planId);
      
      const hasAllAccess = pageKeys.every(pk => 
        effectivePages.has(pk) || 
        effectivePages.has(pk.toUpperCase())
      );
      
      if (hasAllAccess) {
        console.log(`[Authorize] ALLOW (all): user=${userId}, pages=${pageKeys.join(',')}`);
        return next();
      }
      
      const missing = pageKeys.filter(pk => !effectivePages.has(pk) && !effectivePages.has(pk.toUpperCase()));
      console.warn(`[Authorize] DENY (all): user=${userId}, missing=${missing.join(',')}`);
      
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied - missing required page access',
        missingPages: missing
      });
      
    } catch (error) {
      console.error(`[Authorize] ERROR (all):`, error.message);
      return res.status(500).json({
        success: false,
        error: 'AUTHORIZATION_ERROR',
        message: 'Authorization check failed'
      });
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  authorize,
  authorizeAny,
  authorizeAll,
  clearAccessCache,
  
  // For testing
  _getCachedEffectivePages: getCachedEffectivePages,
  _logAuthorizationDecision: logAuthorizationDecision
};
