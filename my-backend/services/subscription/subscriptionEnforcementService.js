/**
 * BISMAN ERP - Comprehensive Subscription Enforcement Service
 * 
 * This service provides the three-layer enforcement required for every request:
 * 1. checkRolePermissions(user) - RBAC validation
 * 2. checkSubscriptionFeatures(tenant) - Feature flag validation
 * 3. checkPlanLimits(tenant) - Quota and limit validation
 * 
 * @module services/subscription/subscriptionEnforcementService
 */

const { getPrisma } = require('../../lib/prisma');
const { featureFlagService } = require('../../lib/featureFlags');
const { STATE_PROPERTIES } = require('../../lib/subscriptionStateMachine');

// ============================================================================
// ROLE PERMISSION CHECKING
// ============================================================================

/**
 * Check if user has required role permissions
 * 
 * @param {Object} user - User object from request
 * @param {Object} options - Options for permission check
 * @param {string[]} options.requiredRoles - Array of roles that can access
 * @param {string} options.action - Action being performed (view, create, edit, delete)
 * @param {string} options.resource - Resource being accessed
 * @returns {Object} Permission check result
 */
async function checkRolePermissions(user, options = {}) {
  const prisma = getPrisma();
  const { requiredRoles = [], action = 'view', resource = '' } = options;

  // No user means not authenticated
  if (!user) {
    return {
      allowed: false,
      reason: 'authentication_required',
      message: 'Please log in to access this resource',
      statusCode: 401,
    };
  }

  // Super admin and system roles have full access
  const superRoles = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'];
  if (superRoles.includes(user.role?.toUpperCase())) {
    return {
      allowed: true,
      reason: 'super_admin_access',
      role: user.role,
    };
  }

  // Check if user's role is in required roles
  if (requiredRoles.length > 0) {
    const userRole = (user.role || '').toUpperCase();
    const hasRequiredRole = requiredRoles.some(r => r.toUpperCase() === userRole);
    
    if (!hasRequiredRole) {
      return {
        allowed: false,
        reason: 'insufficient_role',
        message: `This action requires one of these roles: ${requiredRoles.join(', ')}`,
        currentRole: user.role,
        requiredRoles,
        statusCode: 403,
      };
    }
  }

  // Check RBAC permissions if user has role_id
  if (user.role_id && resource && action) {
    const rbacPermission = await prisma.rbac_permissions.findFirst({
      where: {
        role_id: user.role_id,
        is_active: true,
        rbac_routes: {
          path: { contains: resource },
          is_active: true,
        },
        rbac_actions: {
          name: action.toUpperCase(),
          is_active: true,
        },
      },
      include: {
        rbac_routes: true,
        rbac_actions: true,
      },
    });

    if (!rbacPermission?.granted) {
      return {
        allowed: false,
        reason: 'rbac_denied',
        message: `You don't have permission to ${action} ${resource}`,
        statusCode: 403,
      };
    }
  }

  // Check business level restrictions
  if (options.minBusinessLevel && user.business_level) {
    if (user.business_level < options.minBusinessLevel) {
      return {
        allowed: false,
        reason: 'business_level_too_low',
        message: `This action requires business level ${options.minBusinessLevel} or higher`,
        currentLevel: user.business_level,
        requiredLevel: options.minBusinessLevel,
        statusCode: 403,
      };
    }
  }

  return {
    allowed: true,
    reason: 'role_permitted',
    role: user.role,
    businessLevel: user.business_level,
  };
}

// ============================================================================
// SUBSCRIPTION FEATURE CHECKING
// ============================================================================

/**
 * Check if tenant has access to a specific feature
 * 
 * @param {string} clientId - Tenant/Client ID
 * @param {string|string[]} features - Feature(s) to check
 * @returns {Object} Feature check result
 */
async function checkSubscriptionFeatures(clientId, features) {
  if (!clientId) {
    return {
      allowed: false,
      reason: 'no_tenant_context',
      message: 'No organization context available',
      statusCode: 400,
    };
  }

  // Get all client features
  const clientFeatures = await featureFlagService.getClientFeatures(clientId);
  const requiredFeatures = Array.isArray(features) ? features : [features];

  // Check subscription state first
  const stateProps = STATE_PROPERTIES[clientFeatures.state] || {};
  
  if (!stateProps.canRead) {
    return {
      allowed: false,
      reason: 'subscription_inactive',
      message: stateProps.bannerMessage || 'Your subscription is not active',
      state: clientFeatures.state,
      statusCode: 403,
    };
  }

  // Check each required feature
  const missingFeatures = [];
  const limitedFeatures = [];

  for (const feature of requiredFeatures) {
    const featureValue = clientFeatures.features[feature];
    
    if (featureValue === false || featureValue === undefined) {
      missingFeatures.push(feature);
    } else if (featureValue === 'LIMITED') {
      limitedFeatures.push(feature);
    }
  }

  if (missingFeatures.length > 0) {
    return {
      allowed: false,
      reason: 'feature_not_available',
      message: `The following features are not available in your plan: ${missingFeatures.join(', ')}`,
      missingFeatures,
      currentPlan: clientFeatures.plan,
      upgradeUrl: '/pricing',
      statusCode: 403,
    };
  }

  return {
    allowed: true,
    reason: 'features_available',
    features: clientFeatures.features,
    plan: clientFeatures.plan,
    limitedFeatures,
    state: clientFeatures.state,
  };
}

/**
 * Check if tenant's subscription state allows write operations
 * 
 * @param {string} clientId - Tenant/Client ID
 * @param {string} operation - Operation type (read, write, create, delete)
 * @returns {Object} State check result
 */
async function checkSubscriptionState(clientId, operation = 'read') {
  if (!clientId) {
    return {
      allowed: false,
      reason: 'no_tenant_context',
      message: 'No organization context available',
      statusCode: 400,
    };
  }

  const clientFeatures = await featureFlagService.getClientFeatures(clientId);
  const stateProps = STATE_PROPERTIES[clientFeatures.state] || {};

  // Map operation to state property
  const operationMap = {
    read: 'canRead',
    view: 'canRead',
    write: 'canWrite',
    edit: 'canWrite',
    update: 'canWrite',
    create: 'canCreate',
    delete: 'canWrite',
  };

  const requiredProperty = operationMap[operation.toLowerCase()] || 'canRead';
  const isAllowed = stateProps[requiredProperty];

  if (!isAllowed) {
    return {
      allowed: false,
      reason: `subscription_${operation}_blocked`,
      message: stateProps.bannerMessage || `Your subscription does not allow ${operation} operations`,
      state: clientFeatures.state,
      stateProps,
      action: getRecommendedAction(clientFeatures.state),
      statusCode: 403,
    };
  }

  return {
    allowed: true,
    reason: 'state_allowed',
    state: clientFeatures.state,
    stateProps,
  };
}

// ============================================================================
// PLAN LIMIT CHECKING
// ============================================================================

/**
 * Check if tenant is within plan limits
 * 
 * @param {string} clientId - Tenant/Client ID
 * @param {string} limitType - Type of limit to check (users, storage, branches, api_calls)
 * @param {number} additionalUsage - Additional usage to be added (for pre-check)
 * @returns {Object} Limit check result
 */
async function checkPlanLimits(clientId, limitType, additionalUsage = 0) {
  const prisma = getPrisma();

  if (!clientId) {
    return {
      allowed: false,
      reason: 'no_tenant_context',
      message: 'No organization context available',
      statusCode: 400,
    };
  }

  // Get subscription and plan
  const subscription = await prisma.clientSubscription.findUnique({
    where: { client_id: clientId },
    include: { plan: true },
  });

  if (!subscription) {
    return {
      allowed: false,
      reason: 'no_subscription',
      message: 'No active subscription found',
      statusCode: 403,
    };
  }

  const plan = subscription.plan;
  let currentUsage = 0;
  let limit = 0;
  let limitLabel = '';

  switch (limitType) {
    case 'users':
      currentUsage = await prisma.user.count({ where: { clientId: clientId } });
      limit = plan.max_users;
      limitLabel = 'users';
      break;

    case 'branches':
      currentUsage = await prisma.branch.count({ where: { tenantId: clientId } });
      limit = plan.max_branches;
      limitLabel = 'branches';
      break;

    case 'storage':
      currentUsage = subscription.current_storage_used;
      limit = plan.max_storage_gb * 1024 * 1024 * 1024; // Convert to bytes
      limitLabel = 'storage';
      break;

    case 'api_calls':
      currentUsage = subscription.current_api_calls;
      limit = plan.max_api_calls_day;
      limitLabel = 'API calls per day';
      break;

    default:
      return {
        allowed: true,
        reason: 'unknown_limit_type',
        message: 'Unknown limit type, skipping check',
      };
  }

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      reason: 'unlimited',
      limitType,
      current: currentUsage,
      limit: 'unlimited',
    };
  }

  const projectedUsage = currentUsage + additionalUsage;
  const remaining = Math.max(0, limit - currentUsage);
  const percentageUsed = Math.round((currentUsage / limit) * 100);

  if (projectedUsage > limit) {
    return {
      allowed: false,
      reason: 'limit_exceeded',
      message: `You have reached the maximum ${limitLabel} (${limit}) for your ${plan.plan_code} plan`,
      limitType,
      current: currentUsage,
      limit,
      remaining,
      percentageUsed,
      additionalUsage,
      upgradeUrl: '/pricing',
      statusCode: 403,
    };
  }

  // Warn if approaching limit (>80%)
  const isApproachingLimit = percentageUsed >= 80;

  return {
    allowed: true,
    reason: isApproachingLimit ? 'approaching_limit' : 'within_limits',
    limitType,
    current: currentUsage,
    limit,
    remaining,
    percentageUsed,
    warning: isApproachingLimit 
      ? `You are using ${percentageUsed}% of your ${limitLabel} limit`
      : null,
  };
}

/**
 * Check all plan limits at once
 * 
 * @param {string} clientId - Tenant/Client ID
 * @returns {Object} All limits check result
 */
async function checkAllPlanLimits(clientId) {
  const [users, branches, storage, apiCalls] = await Promise.all([
    checkPlanLimits(clientId, 'users'),
    checkPlanLimits(clientId, 'branches'),
    checkPlanLimits(clientId, 'storage'),
    checkPlanLimits(clientId, 'api_calls'),
  ]);

  const hasViolations = [users, branches, storage, apiCalls].some(r => !r.allowed);
  const warnings = [users, branches, storage, apiCalls]
    .filter(r => r.warning)
    .map(r => r.warning);

  return {
    ok: !hasViolations,
    limits: {
      users,
      branches,
      storage,
      apiCalls,
    },
    hasViolations,
    violations: [users, branches, storage, apiCalls]
      .filter(r => !r.allowed)
      .map(r => ({ type: r.limitType, message: r.message })),
    warnings,
  };
}

// ============================================================================
// COMBINED ENFORCEMENT
// ============================================================================

/**
 * Perform all three checks in one call
 * 
 * @param {Object} params - Check parameters
 * @param {Object} params.user - User object
 * @param {string} params.clientId - Client/Tenant ID
 * @param {string[]} params.requiredRoles - Required roles
 * @param {string|string[]} params.requiredFeatures - Required features
 * @param {string} params.limitType - Limit type to check
 * @param {number} params.additionalUsage - Additional usage for limit check
 * @param {string} params.operation - Operation type
 * @returns {Object} Combined check result
 */
async function enforceSubscription(params) {
  const {
    user,
    clientId,
    requiredRoles = [],
    requiredFeatures = [],
    limitType = null,
    additionalUsage = 0,
    operation = 'read',
    resource = '',
    action = 'view',
  } = params;

  const results = {
    allowed: true,
    checks: {},
    errors: [],
    warnings: [],
  };

  // 1. Check role permissions
  const roleCheck = await checkRolePermissions(user, { 
    requiredRoles, 
    action, 
    resource 
  });
  results.checks.role = roleCheck;
  if (!roleCheck.allowed) {
    results.allowed = false;
    results.errors.push({
      type: 'role',
      reason: roleCheck.reason,
      message: roleCheck.message,
    });
  }

  // If role check failed, no need to continue
  if (!results.allowed && roleCheck.reason === 'authentication_required') {
    return {
      ...results,
      statusCode: 401,
      primaryError: 'authentication_required',
    };
  }

  // 2. Check subscription state
  const effectiveClientId = clientId || user?.clientId || user?.client_id;
  if (effectiveClientId) {
    const stateCheck = await checkSubscriptionState(effectiveClientId, operation);
    results.checks.state = stateCheck;
    if (!stateCheck.allowed) {
      results.allowed = false;
      results.errors.push({
        type: 'subscription_state',
        reason: stateCheck.reason,
        message: stateCheck.message,
        state: stateCheck.state,
      });
    }

    // 3. Check subscription features
    if (requiredFeatures.length > 0) {
      const featureCheck = await checkSubscriptionFeatures(effectiveClientId, requiredFeatures);
      results.checks.features = featureCheck;
      if (!featureCheck.allowed) {
        results.allowed = false;
        results.errors.push({
          type: 'features',
          reason: featureCheck.reason,
          message: featureCheck.message,
          missingFeatures: featureCheck.missingFeatures,
        });
      }
      if (featureCheck.limitedFeatures?.length > 0) {
        results.warnings.push({
          type: 'limited_features',
          features: featureCheck.limitedFeatures,
          message: `Some features have usage limits: ${featureCheck.limitedFeatures.join(', ')}`,
        });
      }
    }

    // 4. Check plan limits
    if (limitType) {
      const limitCheck = await checkPlanLimits(effectiveClientId, limitType, additionalUsage);
      results.checks.limits = limitCheck;
      if (!limitCheck.allowed) {
        results.allowed = false;
        results.errors.push({
          type: 'limits',
          reason: limitCheck.reason,
          message: limitCheck.message,
          limitType: limitCheck.limitType,
        });
      }
      if (limitCheck.warning) {
        results.warnings.push({
          type: 'approaching_limit',
          limitType: limitCheck.limitType,
          message: limitCheck.warning,
        });
      }
    }
  }

  // Determine primary error and status code
  if (!results.allowed) {
    const firstError = results.errors[0];
    results.statusCode = firstError?.type === 'role' ? 403 : 403;
    results.primaryError = firstError?.reason || 'access_denied';
    results.primaryMessage = firstError?.message || 'Access denied';
  }

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRecommendedAction(state) {
  const actions = {
    TRIAL: 'Your trial is active. Upgrade before it expires.',
    ACTIVE: null,
    UPGRADING: 'Your upgrade is being processed.',
    DOWNGRADING: 'Your plan will downgrade at the end of the billing cycle.',
    GRACE_PERIOD: 'Please update your payment method within 7 days to continue using all features.',
    SUSPENDED: 'Contact support to resolve your account status.',
    CANCELLED: 'Resubscribe to regain access.',
  };
  return actions[state] || 'Contact support for assistance.';
}

// ============================================================================
// EXPRESS MIDDLEWARE FACTORIES
// ============================================================================

/**
 * Create middleware that enforces subscription requirements
 */
function createEnforcementMiddleware(options = {}) {
  return async (req, res, next) => {
    const result = await enforceSubscription({
      user: req.user,
      clientId: req.user?.clientId || req.user?.client_id,
      requiredRoles: options.requiredRoles || [],
      requiredFeatures: options.requiredFeatures || [],
      limitType: options.limitType,
      additionalUsage: options.additionalUsage || 0,
      operation: req.method === 'GET' ? 'read' : 'write',
      resource: req.baseUrl + req.path,
      action: methodToAction(req.method),
    });

    // Attach result to request for use in handlers
    req.enforcement = result;

    if (!result.allowed) {
      return res.status(result.statusCode || 403).json({
        ok: false,
        error: result.primaryError,
        message: result.primaryMessage,
        details: result.errors,
        warnings: result.warnings,
        upgradeUrl: '/pricing',
      });
    }

    // Attach warnings to response headers
    if (result.warnings.length > 0) {
      res.set('X-Subscription-Warnings', JSON.stringify(result.warnings));
    }

    next();
  };
}

function methodToAction(method) {
  const map = {
    GET: 'view',
    POST: 'create',
    PUT: 'edit',
    PATCH: 'edit',
    DELETE: 'delete',
  };
  return map[method] || 'view';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Individual checks
  checkRolePermissions,
  checkSubscriptionFeatures,
  checkSubscriptionState,
  checkPlanLimits,
  checkAllPlanLimits,
  
  // Combined enforcement
  enforceSubscription,
  
  // Middleware factory
  createEnforcementMiddleware,
  
  // Helpers
  getRecommendedAction,
};
