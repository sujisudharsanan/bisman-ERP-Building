/**
 * ============================================================================
 * SUBSCRIPTION FEATURE GATE MIDDLEWARE
 * ============================================================================
 * 
 * Enforces subscription-based feature restrictions on API actions.
 * 
 * THREE LAYER MODEL:
 * Layer 1 (APPROVAL) → Checked by authorize/securityGate middleware
 * Layer 2 (SUBSCRIPTION) → THIS MIDDLEWARE
 * Layer 3 (DATA SCOPE) → Checked by RLS
 * 
 * BEHAVIOR:
 * - VIEW actions: Always allowed if page approval exists
 * - EDIT/DELETE/EXPORT/CREATE: Checked against subscription
 * 
 * @module middleware/subscriptionFeatureGate
 */

const { 
  subscriptionPageAccessService, 
  SUBSCRIPTION_ERROR_CODES,
  MESSAGES 
} = require('../services/subscriptionPageAccessService');

// ============================================================================
// ERROR RESPONSES
// ============================================================================

function createFeatureBlockedResponse(isAdmin, action) {
  return {
    success: false,
    errorCode: SUBSCRIPTION_ERROR_CODES.FEATURE_NOT_ALLOWED,
    message: isAdmin ? MESSAGES.ADMIN.ACTION_BLOCKED : MESSAGES.USER.ACTION_BLOCKED,
    action: action,
    upgradeRequired: isAdmin,
    requestAccessAvailable: !isAdmin,
  };
}

// ============================================================================
// MAIN MIDDLEWARE FACTORY
// ============================================================================

/**
 * Create subscription feature gate middleware
 * 
 * @param {string} pageCode - The page code from pages_master
 * @param {string} action - The action being performed: 'edit', 'create', 'delete', 'export', 'download'
 * @returns {Function} Express middleware
 * 
 * Usage:
 * router.post('/tasks', 
 *   subscriptionFeatureGate('TASKS', 'create'),
 *   asyncHandler(async (req, res) => { ... })
 * );
 */
function subscriptionFeatureGate(pageCode, action) {
  return async (req, res, next) => {
    try {
      // Get user context
      const tenantId = req.user?.tenantId || req.user?.clientId;
      const userId = req.user?.id;
      const isAdmin = isUserAdmin(req.user);
      
      if (!tenantId || !userId) {
        // No user context - let auth middleware handle
        return next();
      }
      
      // Check if action is allowed by subscription
      const result = await subscriptionPageAccessService.checkAction({
        tenantId,
        userId,
        pageCode,
        action,
        isAdmin,
        req,
      });
      
      if (!result.allowed) {
        // Action blocked by subscription
        return res.status(403).json(createFeatureBlockedResponse(isAdmin, action));
      }
      
      // Action allowed - continue
      next();
      
    } catch (error) {
      console.error('[SubscriptionFeatureGate] Error:', error.message);
      // On error, fail open for now (log but don't block)
      // TODO: Consider fail-closed in production
      next();
    }
  };
}

/**
 * Check if user is an admin (decision maker)
 */
function isUserAdmin(user) {
  if (!user) return false;
  
  const adminRoles = [
    'ADMIN', 
    'SUPER_ADMIN', 
    'SYSTEM_ADMIN', 
    'CLIENT_ADMIN',
    'ENTERPRISE_ADMIN',
    'OWNER',
    'MANAGER',
  ];
  
  // Check role
  if (adminRoles.includes(user.roleName?.toUpperCase())) {
    return true;
  }
  
  // Check user type
  if (['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'CLIENT'].includes(user.userType)) {
    return true;
  }
  
  // Check explicit admin flag
  if (user.isAdmin === true || user.is_admin === true) {
    return true;
  }
  
  return false;
}

// ============================================================================
// ACTION-SPECIFIC MIDDLEWARE HELPERS
// ============================================================================

/**
 * Require edit permission
 */
function requireEdit(pageCode) {
  return subscriptionFeatureGate(pageCode, 'edit');
}

/**
 * Require create permission
 */
function requireCreate(pageCode) {
  return subscriptionFeatureGate(pageCode, 'create');
}

/**
 * Require delete permission
 */
function requireDelete(pageCode) {
  return subscriptionFeatureGate(pageCode, 'delete');
}

/**
 * Require export permission
 */
function requireExport(pageCode) {
  return subscriptionFeatureGate(pageCode, 'export');
}

/**
 * Require download permission
 */
function requireDownload(pageCode) {
  return subscriptionFeatureGate(pageCode, 'download');
}

// ============================================================================
// PAGE ACCESS MIDDLEWARE (For loading page data)
// ============================================================================

/**
 * Inject subscription access info into request
 * Use this on GET routes to provide UI with access info
 * 
 * @param {string} pageCode - The page code
 * @returns {Function} Express middleware
 * 
 * After this middleware, req.subscriptionAccess will contain:
 * {
 *   canView, canEdit, canDelete, canExport, canDownload, canCreate,
 *   subscriptionRestricted, ui: { showUpgradeBanner, showRequestButton, ... }
 * }
 */
function injectSubscriptionAccess(pageCode) {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenantId || req.user?.clientId;
      const userId = req.user?.id;
      const isAdmin = isUserAdmin(req.user);
      
      if (!tenantId || !userId) {
        req.subscriptionAccess = null;
        return next();
      }
      
      const access = await subscriptionPageAccessService.getPageAccess({
        tenantId,
        userId,
        pageCode,
        isAdmin,
      });
      
      req.subscriptionAccess = access;
      next();
      
    } catch (error) {
      console.error('[InjectSubscriptionAccess] Error:', error.message);
      req.subscriptionAccess = null;
      next();
    }
  };
}

// ============================================================================
// RESPONSE HELPER
// ============================================================================

/**
 * Add subscription access to response
 * Call this in your route handler to include access info in response
 * 
 * @param {Object} res - Express response
 * @param {Object} data - Your response data
 * @param {Object} subscriptionAccess - From req.subscriptionAccess
 */
function withSubscriptionAccess(res, data, subscriptionAccess) {
  return res.json({
    ...data,
    _subscriptionAccess: subscriptionAccess ? {
      access: subscriptionAccess.access,
      subscriptionRestricted: subscriptionAccess.subscriptionRestricted,
      ui: subscriptionAccess.ui,
      pendingRequest: subscriptionAccess.pendingRequest,
    } : null,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  subscriptionFeatureGate,
  isUserAdmin,
  
  // Action-specific helpers
  requireEdit,
  requireCreate,
  requireDelete,
  requireExport,
  requireDownload,
  
  // Page access helpers
  injectSubscriptionAccess,
  withSubscriptionAccess,
};
