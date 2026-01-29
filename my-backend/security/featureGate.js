/**
 * ============================================================================
 * FEATURE GATE - SUBSCRIPTION-AWARE ACCESS CONTROL
 * ============================================================================
 * 
 * GOLDEN RULE (LOCKED IN):
 * - Approval decides what you can SEE
 * - Subscription decides what you can DO
 * - Data scope decides what DATA you can SEE
 * 
 * DECISION MATRIX:
 * | Approval | Subscription | Result                    |
 * |----------|--------------|---------------------------|
 * | ❌       | ❌           | Page NOT visible (403)    |
 * | ❌       | ✅           | Page NOT visible (403)    |
 * | ✅       | ❌           | Page visible (VIEW-ONLY)  |
 * | ✅       | ✅           | Page visible (FULL ACCESS)|
 * 
 * CRITICAL:
 * - Subscription NEVER grants visibility
 * - Backend enforces ALL restrictions
 * - Frontend is informational ONLY
 * 
 * @module security/featureGate
 */

const { Pool } = require('pg');

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

// Valid actions
const VALID_ACTIONS = ['VIEW', 'EDIT', 'EXPORT', 'DOWNLOAD', 'CREATE', 'DELETE'];

// Error codes (NEVER expose plan details to non-admins)
const ERROR_CODES = {
  PAGE_ACCESS_DENIED: 'PAGE_ACCESS_DENIED',
  FEATURE_NOT_ALLOWED: 'FEATURE_NOT_ALLOWED',
  INVALID_ACTION: 'INVALID_ACTION',
};

// User-facing messages (safe for all users)
const MESSAGES = {
  PAGE_ACCESS_DENIED: 'You do not have access to this page.',
  FEATURE_NOT_ALLOWED: 'This feature is not available on your current plan.',
  CONTACT_ADMIN: 'Contact your administrator for access.',
};

// Audit action types
const AUDIT_ACTIONS = {
  PAGE_ACCESS_DENIED: 'PAGE_ACCESS_DENIED',
  FEATURE_BLOCKED: 'FEATURE_BLOCKED',
  FEATURE_ALLOWED: 'FEATURE_ALLOWED',
};

/**
 * Feature Gate Service - Singleton
 */
class FeatureGateService {
  constructor() {
    this.pool = new Pool({ connectionString: DATABASE_URL });
    this.initialized = false;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
    console.log('[FeatureGate] ✅ Initialized');
  }

  // ===========================================================================
  // CORE FEATURE GATE (MANDATORY FOR ALL PROTECTED ROUTES)
  // ===========================================================================

  /**
   * Feature Gate - The single authoritative access check
   * 
   * @param {Object} params
   * @param {string} params.pageKey - Page code from pages_master
   * @param {'VIEW'|'EDIT'|'EXPORT'|'DOWNLOAD'|'CREATE'|'DELETE'} params.action - Action to check
   * @param {Object} params.user - User context
   * @param {string} params.user.userId - User UUID
   * @param {string} params.user.tenantId - Tenant UUID
   * @param {string} params.user.role - User role
   * @param {boolean} params.user.isAdmin - Is user an admin/client
   * @param {number} params.user.planId - Subscription plan ID
   * @param {Object} [params.req] - Express request for audit
   * @returns {Promise<{allowed: boolean, reason?: string, errorCode?: string}>}
   */
  async featureGate({ pageKey, action, user, req = null }) {
    await this.initialize();

    const actionUpper = action.toUpperCase();

    // Validate action
    if (!VALID_ACTIONS.includes(actionUpper)) {
      return {
        allowed: false,
        errorCode: ERROR_CODES.INVALID_ACTION,
        reason: `Invalid action: ${action}`,
      };
    }

    try {
      // =======================================================================
      // STEP 1: CHECK APPROVAL (admin_page_assignments OR role_page_access)
      // =======================================================================
      const hasApproval = await this.checkApproval(user.userId, user.tenantId, pageKey);

      if (!hasApproval) {
        // Log denied access
        await this.auditLog({
          tenantId: user.tenantId,
          userId: user.userId,
          pageKey,
          action: actionUpper,
          result: AUDIT_ACTIONS.PAGE_ACCESS_DENIED,
          reason: 'No page approval',
          req,
        });

        return {
          allowed: false,
          errorCode: ERROR_CODES.PAGE_ACCESS_DENIED,
          reason: MESSAGES.PAGE_ACCESS_DENIED,
        };
      }

      // =======================================================================
      // STEP 2: CHECK SUBSCRIPTION FEATURES
      // =======================================================================
      const subscriptionAccess = await this.checkSubscriptionFeatures(
        user.tenantId,
        user.planId,
        pageKey,
        actionUpper
      );

      // VIEW is always allowed if page is approved
      if (actionUpper === 'VIEW') {
        return { allowed: true };
      }

      // For mutations/exports, check subscription
      if (!subscriptionAccess.actionAllowed) {
        // Log blocked feature
        await this.auditLog({
          tenantId: user.tenantId,
          userId: user.userId,
          pageKey,
          action: actionUpper,
          result: AUDIT_ACTIONS.FEATURE_BLOCKED,
          reason: 'Subscription does not allow this action',
          planId: user.planId,
          req,
        });

        return {
          allowed: false,
          errorCode: ERROR_CODES.FEATURE_NOT_ALLOWED,
          reason: user.isAdmin 
            ? MESSAGES.FEATURE_NOT_ALLOWED 
            : MESSAGES.CONTACT_ADMIN,
        };
      }

      // Log allowed action
      await this.auditLog({
        tenantId: user.tenantId,
        userId: user.userId,
        pageKey,
        action: actionUpper,
        result: AUDIT_ACTIONS.FEATURE_ALLOWED,
        planId: user.planId,
        req,
      });

      return { allowed: true };

    } catch (error) {
      console.error('[FeatureGate] Error:', error.message);
      // Fail closed - deny on error
      return {
        allowed: false,
        errorCode: ERROR_CODES.PAGE_ACCESS_DENIED,
        reason: 'Access check failed',
      };
    }
  }

  // ===========================================================================
  // APPROVAL CHECK (LAYER 1 - VISIBILITY)
  // ===========================================================================

  /**
   * Check if user has page approval via admin_page_assignments OR role_page_access
   */
  async checkApproval(userId, tenantId, pageKey) {
    // Check 1: admin_page_assignments (explicit user assignment)
    // Uses assignee_id (INT) and tenant_id (VARCHAR)
    const userAssignment = await this.pool.query(`
      SELECT 1 FROM admin_page_assignments apa
      JOIN pages_master pm ON apa.page_id = pm.id
      WHERE apa.assignee_id = (SELECT legacy_id FROM users_enhanced WHERE id = $1::uuid)
        AND apa.tenant_id = $2::text
        AND (apa.page_key = $3 OR pm.page_code = $3)
        AND apa.is_active = true
      LIMIT 1
    `, [userId, tenantId, pageKey]);

    if (userAssignment.rows.length > 0) {
      return true;
    }

    // Check 2: role_page_access (role-based access)
    const roleAccess = await this.pool.query(`
      SELECT 1 FROM role_page_access rpa
      JOIN users_enhanced u ON rpa.role_name = u.role
      JOIN pages_master pm ON rpa.page_id = pm.id
      WHERE u.id = $1::uuid 
        AND pm.page_code = $2
        AND rpa.can_view = true
      LIMIT 1
    `, [userId, pageKey]);

    return roleAccess.rows.length > 0;
  }

  // ===========================================================================
  // SUBSCRIPTION CHECK (LAYER 2 - ACTIONS)
  // ===========================================================================

  /**
   * Check subscription features for a specific action
   */
  async checkSubscriptionFeatures(tenantId, planId, pageKey, action) {
    // Get plan ID if not provided
    let effectivePlanId = planId;
    
    if (!effectivePlanId) {
      const planResult = await this.pool.query(`
        SELECT plan_id FROM client_subscriptions
        WHERE client_id = $1::uuid AND state = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
      `, [tenantId]);
      
      effectivePlanId = planResult.rows[0]?.plan_id || 1; // Default to Free (1)
    }

    // Get subscription features for this page
    const features = await this.pool.query(`
      SELECT can_view, can_edit, can_export, can_download, can_create, can_delete
      FROM subscription_page_features
      WHERE plan_id = $1 AND page_code = $2
    `, [effectivePlanId, pageKey]);

    // If no entry, default to view-only
    if (features.rows.length === 0) {
      return {
        canView: true,
        canEdit: false,
        canExport: false,
        canDownload: false,
        canCreate: false,
        canDelete: false,
        actionAllowed: action === 'VIEW',
        planId: effectivePlanId,
      };
    }

    const f = features.rows[0];
    const actionMap = {
      VIEW: f.can_view,
      EDIT: f.can_edit,
      EXPORT: f.can_export,
      DOWNLOAD: f.can_download,
      CREATE: f.can_create,
      DELETE: f.can_delete,
    };

    return {
      canView: f.can_view,
      canEdit: f.can_edit,
      canExport: f.can_export,
      canDownload: f.can_download,
      canCreate: f.can_create,
      canDelete: f.can_delete,
      actionAllowed: actionMap[action] === true,
      planId: effectivePlanId,
    };
  }

  // ===========================================================================
  // PAGE ACCESS INFO (FOR API RESPONSE)
  // ===========================================================================

  /**
   * Get page access info for frontend (informational only)
   * 
   * @param {Object} params
   * @param {string} params.pageKey
   * @param {Object} params.user
   * @returns {Promise<Object>} Page access info
   */
  async getPageAccessInfo({ pageKey, user }) {
    await this.initialize();

    // Check approval first
    const hasApproval = await this.checkApproval(user.userId, user.tenantId, pageKey);

    if (!hasApproval) {
      return {
        pageKey,
        visible: false,
        access: null,
        subscriptionRestricted: false,
        isAdmin: user.isAdmin || false,
      };
    }

    // Get subscription features
    const subscriptionAccess = await this.checkSubscriptionFeatures(
      user.tenantId,
      user.planId,
      pageKey,
      'VIEW'
    );

    const subscriptionRestricted = !(
      subscriptionAccess.canEdit && 
      subscriptionAccess.canExport && 
      subscriptionAccess.canCreate
    );

    return {
      pageKey,
      visible: true,
      access: {
        canView: subscriptionAccess.canView,
        canEdit: subscriptionAccess.canEdit,
        canExport: subscriptionAccess.canExport,
        canDownload: subscriptionAccess.canDownload,
        canCreate: subscriptionAccess.canCreate,
        canDelete: subscriptionAccess.canDelete,
      },
      subscriptionRestricted,
      isAdmin: user.isAdmin || false,
      planId: subscriptionAccess.planId,
    };
  }

  // ===========================================================================
  // AUDIT LOGGING
  // ===========================================================================

  /**
   * Log feature gate decisions to audit table
   */
  async auditLog({ tenantId, userId, pageKey, action, result, reason, planId, req }) {
    try {
      await this.pool.query(`
        INSERT INTO subscription_action_audit 
          (tenant_id, user_id, page_code, action_attempted, allowed, denial_reason, plan_id, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        tenantId,
        userId,
        pageKey,
        action,
        result === AUDIT_ACTIONS.FEATURE_ALLOWED,
        result !== AUDIT_ACTIONS.FEATURE_ALLOWED ? reason : null,
        planId || null,
        req?.ip || null,
        req?.get?.('User-Agent') || null,
      ]);
    } catch (error) {
      // Audit logging should never fail the request
      console.warn('[FeatureGate] Audit log failed:', error.message);
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  async close() {
    await this.pool.end();
  }
}

// Singleton instance
const featureGateService = new FeatureGateService();

// ===========================================================================
// EXPRESS MIDDLEWARE
// ===========================================================================

/**
 * Feature Gate Middleware Factory
 * 
 * Usage:
 * router.post('/records', requireFeature('RECORDS_PAGE', 'CREATE'), controller.create);
 * router.put('/records/:id', requireFeature('RECORDS_PAGE', 'EDIT'), controller.update);
 * router.get('/records/export', requireFeature('RECORDS_PAGE', 'EXPORT'), controller.export);
 * 
 * @param {string} pageKey - Page code
 * @param {'VIEW'|'EDIT'|'EXPORT'|'DOWNLOAD'|'CREATE'|'DELETE'} action - Action
 */
function requireFeature(pageKey, action) {
  return async (req, res, next) => {
    try {
      // Extract user from request (set by auth middleware)
      const user = {
        userId: req.user?.id || req.user?.userId,
        tenantId: req.user?.tenantId || req.user?.tenant_id,
        role: req.user?.role,
        isAdmin: req.user?.isAdmin || ['ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN'].includes(req.user?.role),
        planId: req.user?.planId || req.user?.plan_id,
      };

      if (!user.userId || !user.tenantId) {
        return res.status(401).json({
          error: 'Authentication required',
          errorCode: 'UNAUTHORIZED',
        });
      }

      const result = await featureGateService.featureGate({
        pageKey,
        action,
        user,
        req,
      });

      if (!result.allowed) {
        return res.status(403).json({
          error: result.reason,
          errorCode: result.errorCode,
          // Only include upgrade hint for admins
          ...(user.isAdmin && result.errorCode === ERROR_CODES.FEATURE_NOT_ALLOWED && {
            upgradeRequired: true,
          }),
        });
      }

      next();
    } catch (error) {
      console.error('[FeatureGate Middleware] Error:', error.message);
      return res.status(500).json({
        error: 'Access check failed',
        errorCode: 'INTERNAL_ERROR',
      });
    }
  };
}

/**
 * Shorthand middleware factories
 */
const requireEdit = (pageKey) => requireFeature(pageKey, 'EDIT');
const requireCreate = (pageKey) => requireFeature(pageKey, 'CREATE');
const requireDelete = (pageKey) => requireFeature(pageKey, 'DELETE');
const requireExport = (pageKey) => requireFeature(pageKey, 'EXPORT');
const requireDownload = (pageKey) => requireFeature(pageKey, 'DOWNLOAD');

// ===========================================================================
// INLINE CHECK FUNCTION (FOR BACKGROUND JOBS / CONDITIONAL LOGIC)
// ===========================================================================

/**
 * Check feature access inline (not as middleware)
 * 
 * @param {Object} params - Same as featureGate
 * @returns {Promise<boolean>} Whether action is allowed
 */
async function checkFeatureAccess(params) {
  const result = await featureGateService.featureGate(params);
  return result.allowed;
}

/**
 * Get page access info for API response
 */
async function getPageAccess(params) {
  return featureGateService.getPageAccessInfo(params);
}

// ===========================================================================
// EXPORTS
// ===========================================================================

module.exports = {
  // Service
  FeatureGateService,
  featureGateService,
  
  // Core function
  featureGate: (params) => featureGateService.featureGate(params),
  
  // Middleware
  requireFeature,
  requireEdit,
  requireCreate,
  requireDelete,
  requireExport,
  requireDownload,
  
  // Inline checks
  checkFeatureAccess,
  getPageAccess,
  
  // Constants
  ERROR_CODES,
  VALID_ACTIONS,
};
