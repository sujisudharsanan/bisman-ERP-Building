/**
 * ============================================================================
 * GOVERNANCE MIDDLEWARE
 * ============================================================================
 * 
 * Enforces governance controls for enterprise-grade decision engine:
 * 
 * 1. Mandatory Override Reasons - L9+ actions require comments
 * 2. Confidential Task Isolation - Query-layer enforcement
 * 3. Cancel Flow Validation - Proper state transitions
 * 4. Peer-Approval Control - Level difference enforcement
 * 5. Subscription Limit Checks - Plan-based restrictions
 * 
 * @module middleware/governanceMiddleware
 */

const { PrismaClient } = require('@prisma/client');
const { 
  checkPeerApprovalAllowed
} = require('../lib/businessHierarchy');

const prisma = new PrismaClient();

// ============================================================================
// OVERRIDE REASON ENFORCEMENT
// ============================================================================

/**
 * Actions that require mandatory comments
 */
const OVERRIDE_ACTIONS = [
  'FORCE_APPROVE',
  'FORCE_REJECT',
  'BYPASS_HIERARCHY',
  'SKIP_STAGE',
  'AUTO_APPROVE_OVERRIDE',
  'REASSIGN_APPROVER',
  'CANCEL_APPROVED_TASK'
];

/**
 * Middleware to enforce mandatory comments for override actions
 */
function requireOverrideReason(req, res, next) {
  const action = req.body?.action?.toUpperCase() || req.query?.action?.toUpperCase();
  const comment = req.body?.comment || req.body?.reason || req.body?.action_comment;
  const userLevel = req.user?.businessLevel || req.user?.business_level || 1;
  const userRole = req.user?.role || req.user?.roleName;
  
  // Check if this is an override action
  const isOverrideAction = OVERRIDE_ACTIONS.includes(action);
  const isAdminAction = userLevel >= 9;
  const hasFallback = req.body?.fallback_applied || req.body?.fallbackApplied;
  
  // Determine if comment is required
  const commentRequired = isOverrideAction || (isAdminAction && action) || hasFallback;
  
  if (commentRequired) {
    // Attach metadata for audit logging
    req.governanceContext = {
      isOverrideAction,
      isAdminAction,
      hasFallback,
      actorLevel: userLevel,
      actorRole: userRole,
      commentRequired: true,
      commentProvided: !!(comment && comment.trim()),
      overrideType: isOverrideAction ? action : (hasFallback ? 'FALLBACK_OVERRIDE' : 'ADMIN_ACTION')
    };
    
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Override Reason Required',
        message: 'This action requires a comment/reason for audit compliance.',
        code: 'OVERRIDE_COMMENT_REQUIRED',
        details: {
          action,
          actorLevel: userLevel,
          isOverrideAction,
          hasFallback
        },
        hint: 'Add a "comment" or "reason" field to your request body.'
      });
    }
    
    // Minimum comment length
    if (comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Override Reason Too Short',
        message: 'Please provide a meaningful reason (at least 10 characters).',
        code: 'OVERRIDE_COMMENT_TOO_SHORT',
        minLength: 10,
        actualLength: comment.trim().length
      });
    }
  }
  
  next();
}

// ============================================================================
// CONFIDENTIAL TASK ISOLATION
// ============================================================================

/**
 * Build WHERE clause for confidential task filtering
 * @param {Object} user - User object with id, level, departmentId
 * @param {string} taskAlias - SQL table alias for tasks table
 * @returns {string} SQL WHERE clause fragment
 */
function buildConfidentialTaskFilter(user, taskAlias = 't') {
  const userId = user.id;
  const userLevel = user.businessLevel || user.business_level || 1;
  const userDeptId = user.departmentId || user.department_id;
  
  // Super Admin sees everything
  if (userLevel >= 10) {
    return '1=1';
  }
  
  // Build filter
  return `(
    ${taskAlias}.is_confidential = false 
    OR ${taskAlias}.is_confidential IS NULL
    OR ${taskAlias}.creator_id = '${userId}'
    OR (
      ${taskAlias}.visibility_scope = 'executives_only' AND ${userLevel} >= 9
    )
    OR (
      ${taskAlias}.visibility_scope = 'department' 
      AND ${taskAlias}.department_id = '${userDeptId}'
    )
    OR (
      ${taskAlias}.visibility_scope = 'explicit_users' 
      AND '${userId}' = ANY(${taskAlias}.allowed_viewer_ids)
    )
  )`;
}

/**
 * Middleware to add confidential task filtering to requests
 */
function confidentialTaskFilter(req, res, next) {
  if (req.user) {
    req.confidentialFilter = buildConfidentialTaskFilter(req.user);
    req.canViewConfidential = (task) => {
      if (!task.is_confidential) return true;
      if (task.creator_id === req.user.id) return true;
      if ((req.user.businessLevel || 1) >= 10) return true;
      
      const scope = task.visibility_scope || 'standard';
      switch (scope) {
        case 'creator_only':
          return false;
        case 'executives_only':
          return (req.user.businessLevel || 1) >= 9;
        case 'department':
          return req.user.departmentId === task.department_id;
        case 'explicit_users':
          return (task.allowed_viewer_ids || []).includes(req.user.id);
        default:
          return true;
      }
    };
  }
  next();
}

// ============================================================================
// CANCEL FLOW VALIDATION
// ============================================================================

const CANCELLABLE_STATUSES = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'IN_REVIEW'];
const CANCEL_REQUIRES_ACKNOWLEDGMENT = ['IN_REVIEW', 'IN_PROGRESS'];

/**
 * Middleware to validate cancel requests
 */
function validateCancelRequest(req, res, next) {
  const taskStatus = req.body?.currentStatus || req.body?.status;
  const action = req.body?.action?.toUpperCase();
  
  if (action !== 'CANCEL' && action !== 'CANCEL_REQUEST') {
    return next();
  }
  
  // Check if status allows cancellation
  if (!CANCELLABLE_STATUSES.includes(taskStatus)) {
    return res.status(400).json({
      success: false,
      error: 'Task Cannot Be Cancelled',
      message: `Tasks in ${taskStatus} status cannot be cancelled.`,
      code: 'INVALID_CANCEL_STATUS',
      cancellableStatuses: CANCELLABLE_STATUSES
    });
  }
  
  // Check if this requires acknowledgment
  if (CANCEL_REQUIRES_ACKNOWLEDGMENT.includes(taskStatus)) {
    req.cancelRequiresAcknowledgment = true;
    req.cancelStatus = 'CANCEL_REQUESTED';
  } else {
    req.cancelRequiresAcknowledgment = false;
    req.cancelStatus = 'CANCELLED';
  }
  
  next();
}

// ============================================================================
// PEER-APPROVAL CONTROL
// ============================================================================

/**
 * Middleware to enforce peer-approval rules
 */
function enforcePeerApprovalRules(getCreatorLevel) {
  return async (req, res, next) => {
    const action = req.body?.action?.toUpperCase();
    
    // Only check for approval actions
    if (action !== 'APPROVE' && action !== 'REJECT') {
      return next();
    }
    
    const approverLevel = req.user?.businessLevel || req.user?.business_level || 1;
    const creatorLevel = typeof getCreatorLevel === 'function' 
      ? await getCreatorLevel(req) 
      : getCreatorLevel;
    
    // Get workflow stage configuration
    const peerApprovalWhitelisted = req.body?.peerApprovalAllowed || false;
    const minLevelAbove = req.body?.minApproverLevelAbove || 1;
    
    const check = checkPeerApprovalAllowed(
      approverLevel, 
      creatorLevel, 
      peerApprovalWhitelisted, 
      minLevelAbove
    );
    
    if (!check.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Peer Approval Not Allowed',
        message: check.reason,
        code: 'PEER_APPROVAL_BLOCKED',
        details: {
          approverLevel,
          creatorLevel,
          levelDifference: approverLevel - creatorLevel,
          required: minLevelAbove,
          peerApprovalWhitelisted
        },
        hint: 'Approver must be at a higher business level than task creator.'
      });
    }
    
    // Attach peer approval metadata
    req.peerApprovalUsed = check.peerApprovalUsed || false;
    
    next();
  };
}

// ============================================================================
// SUBSCRIPTION LIMIT CHECKS
// ============================================================================

/**
 * Middleware to check subscription-based task creation limits
 */
async function checkSubscriptionLimits(req, res, next) {
  // Only check on task creation
  if (req.method !== 'POST') {
    return next();
  }
  
  const tenantId = req.user?.tenantId || req.user?.tenant_id;
  const userId = req.user?.id;
  
  if (!tenantId) {
    return next(); // Skip if no tenant context
  }
  
  try {
    // Call the database function to check limits
    const result = await prisma.$queryRaw`
      SELECT check_task_creation_limit(${tenantId}::uuid, ${userId}::uuid) as limit_check
    `;
    
    const limitCheck = result[0]?.limit_check;
    
    if (limitCheck && limitCheck.allowed === false) {
      return res.status(429).json({
        success: false,
        error: 'Task Limit Reached',
        message: limitCheck.reason,
        code: 'SUBSCRIPTION_LIMIT_EXCEEDED',
        details: {
          limit: limitCheck.limit,
          current: limitCheck.current
        },
        hint: 'Upgrade your subscription plan to create more tasks.'
      });
    }
    
    // Attach remaining limits info to request
    req.subscriptionLimits = limitCheck;
    
    next();
  } catch (error) {
    // Don't block on limit check failure, just log
    console.warn('[GovernanceMiddleware] Subscription limit check failed:', error.message);
    next();
  }
}

/**
 * Middleware to check if a feature is allowed by subscription
 * @param {string} feature - Feature key from subscription_governance_limits
 */
function requireSubscriptionFeature(feature) {
  return async (req, res, next) => {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    if (!tenantId) {
      return next();
    }
    
    try {
      const result = await prisma.$queryRaw`
        SELECT sgl.${feature} as feature_enabled
        FROM tenants t
        JOIN subscription_governance_limits sgl ON t.governance_plan_code = sgl.plan_code
        WHERE t.id = ${tenantId}::uuid
      `;
      
      const featureEnabled = result[0]?.feature_enabled;
      
      if (featureEnabled === false) {
        return res.status(403).json({
          success: false,
          error: 'Feature Not Available',
          message: `The feature "${feature}" is not available in your subscription plan.`,
          code: 'SUBSCRIPTION_FEATURE_BLOCKED',
          feature,
          hint: 'Upgrade your subscription plan to access this feature.'
        });
      }
      
      next();
    } catch (error) {
      console.warn('[GovernanceMiddleware] Feature check failed:', error.message);
      next();
    }
  };
}

// ============================================================================
// COMBINED GOVERNANCE MIDDLEWARE
// ============================================================================

/**
 * Combined governance middleware for task operations
 * Applies all governance checks in order
 */
function governanceMiddleware(req, res, next) {
  // Add governance context
  req.governance = {
    checksApplied: [],
    violations: []
  };
  
  // Run checks in sequence
  confidentialTaskFilter(req, res, (err) => {
    if (err) return next(err);
    req.governance.checksApplied.push('confidentialTaskFilter');
    
    requireOverrideReason(req, res, (err) => {
      if (err) return next(err);
      req.governance.checksApplied.push('requireOverrideReason');
      
      validateCancelRequest(req, res, (err) => {
        if (err) return next(err);
        req.governance.checksApplied.push('validateCancelRequest');
        
        next();
      });
    });
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Individual middleware
  requireOverrideReason,
  confidentialTaskFilter,
  validateCancelRequest,
  enforcePeerApprovalRules,
  checkSubscriptionLimits,
  requireSubscriptionFeature,
  
  // Utility functions
  buildConfidentialTaskFilter,
  
  // Combined middleware
  governanceMiddleware,
  
  // Constants
  OVERRIDE_ACTIONS,
  CANCELLABLE_STATUSES,
  CANCEL_REQUIRES_ACKNOWLEDGMENT
};
