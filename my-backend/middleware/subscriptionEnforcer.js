/**
 * BISMAN ERP - Subscription Enforcement Middleware
 * 
 * API-level enforcement of subscription features and limits.
 * This middleware MUST be used in conjunction with frontend checks.
 * 
 * Implements the three-layer enforcement:
 * 1. checkRolePermissions(user) - RBAC validation
 * 2. checkSubscriptionFeatures(tenant) - Feature flag validation
 * 3. checkPlanLimits(tenant) - Quota and limit validation
 * 
 * @module middleware/subscriptionEnforcer
 */

const { 
  featureFlagService, 
  getRequiredFeature,
  hasFeature,
  checkLimit,
} = require('../lib/featureFlags');
const { STATE_PROPERTIES } = require('../lib/subscriptionStateMachine');
const {
  checkRolePermissions,
  checkSubscriptionFeatures,
  checkSubscriptionState,
  checkPlanLimits,
  checkAllPlanLimits,
  enforceSubscription,
  createEnforcementMiddleware,
} = require('../services/subscription/subscriptionEnforcementService');

// ============================================================================
// SUBSCRIPTION STATE ENFORCEMENT
// ============================================================================

/**
 * Enforce subscription state restrictions
 * Blocks write operations for suspended/cancelled subscriptions
 */
const enforceSubscriptionState = async (req, res, next) => {
  try {
    // Skip for unauthenticated requests
    if (!req.user) {
      return next();
    }

    // Get client ID from user
    const clientId = req.user.clientId || req.user.client_id;
    if (!clientId) {
      return next(); // No client context (e.g., SuperAdmin)
    }

    // Get subscription features
    const features = await featureFlagService.getClientFeatures(clientId);
    const stateProps = STATE_PROPERTIES[features.state] || {};

    // Attach to request for use in handlers
    req.subscription = {
      state: features.state,
      plan: features.plan,
      features: features.features,
      limits: features.limits,
      stateProps,
    };

    // Check if action is allowed based on state
    const method = req.method.toUpperCase();
    
    // Read operations (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (!stateProps.canRead) {
        return res.status(403).json({
          ok: false,
          error: 'subscription_state_blocked',
          message: 'Your subscription does not allow access to this resource',
          state: features.state,
          action: 'Please contact support to resolve your subscription status',
        });
      }
      return next();
    }

    // Write operations (POST, PUT, PATCH)
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (!stateProps.canWrite) {
        return res.status(403).json({
          ok: false,
          error: 'subscription_write_blocked',
          message: 'Your subscription is in read-only mode',
          state: features.state,
          banner: stateProps.bannerMessage,
          action: 'Please update your payment method to continue',
        });
      }
      return next();
    }

    // Delete operations
    if (method === 'DELETE') {
      if (!stateProps.canWrite) {
        return res.status(403).json({
          ok: false,
          error: 'subscription_delete_blocked',
          message: 'Your subscription does not allow deletions',
          state: features.state,
        });
      }
      return next();
    }

    next();
  } catch (error) {
    console.error('[SubscriptionEnforcer] State check error:', error);
    next(); // Fail open for state checks
  }
};

// ============================================================================
// FEATURE FLAG ENFORCEMENT
// ============================================================================

/**
 * Enforce feature flag based on route
 * Automatically maps routes to required features
 */
const enforceFeatureFlag = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const clientId = req.user.clientId || req.user.client_id;
    if (!clientId) {
      return next();
    }

    // Get required feature for this route
    const routePath = req.baseUrl + req.path;
    const requiredFeature = getRequiredFeature(routePath);

    if (!requiredFeature) {
      return next(); // No feature required
    }

    // Check if client has the feature
    const hasAccess = await hasFeature(clientId, requiredFeature);

    if (!hasAccess) {
      return res.status(403).json({
        ok: false,
        error: 'feature_not_available',
        feature: requiredFeature,
        message: `This feature (${requiredFeature}) is not available in your current plan`,
        upgrade_url: '/pricing',
        action: 'Upgrade your plan to access this feature',
      });
    }

    next();
  } catch (error) {
    console.error('[SubscriptionEnforcer] Feature check error:', error);
    next(); // Fail open
  }
};

/**
 * Create middleware to require a specific feature
 * Usage: router.get('/path', requireFeature('CUSTOM_ROLES'), handler)
 */
const requireFeature = (featureCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: 'authentication_required',
          message: 'Please log in to access this resource',
        });
      }

      const clientId = req.user.clientId || req.user.client_id;
      if (!clientId) {
        return next(); // No client context
      }

      const hasAccess = await hasFeature(clientId, featureCode);

      if (!hasAccess) {
        return res.status(403).json({
          ok: false,
          error: 'feature_not_available',
          feature: featureCode,
          message: `The ${featureCode} feature is not available in your plan`,
          current_plan: req.subscription?.plan,
          upgrade_url: '/pricing',
        });
      }

      next();
    } catch (error) {
      console.error(`[SubscriptionEnforcer] Feature ${featureCode} check error:`, error);
      next();
    }
  };
};

// ============================================================================
// LIMIT ENFORCEMENT
// ============================================================================

/**
 * Check user limit before creating new user
 */
const enforceUserLimit = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const clientId = req.user.clientId || req.user.client_id;
    if (!clientId) return next();

    // Only check on POST (create)
    if (req.method !== 'POST') return next();

    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();

    // Get current user count
    const currentCount = await prisma.user.count({
      where: { clientId: clientId },
    });

    const limitCheck = await checkLimit(clientId, 'max_users', currentCount);

    if (!limitCheck.allowed) {
      return res.status(403).json({
        ok: false,
        error: 'user_limit_reached',
        message: `You have reached the maximum number of users (${limitCheck.limit}) for your plan`,
        current: limitCheck.current,
        limit: limitCheck.limit,
        upgrade_url: '/pricing',
        action: 'Upgrade your plan to add more users',
      });
    }

    next();
  } catch (error) {
    console.error('[SubscriptionEnforcer] User limit check error:', error);
    next();
  }
};

/**
 * Check API rate limit
 */
const enforceApiRateLimit = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const clientId = req.user.clientId || req.user.client_id;
    if (!clientId) return next();

    // Get features to check API access
    const features = await featureFlagService.getClientFeatures(clientId);

    // Check if API access is allowed
    if (!features.features.API_ACCESS) {
      return res.status(403).json({
        ok: false,
        error: 'api_access_not_available',
        message: 'API access is not available in your plan',
        upgrade_url: '/pricing',
      });
    }

    // Check daily API call limit
    const dailyLimit = features.limits.max_api_calls_day;
    if (dailyLimit === -1) {
      return next(); // Unlimited
    }

    // Get current day's API calls (from cache/counter)
    const currentCalls = features.usage?.current_api_calls || 0;

    if (currentCalls >= dailyLimit) {
      return res.status(429).json({
        ok: false,
        error: 'api_rate_limit_exceeded',
        message: `You have exceeded your daily API limit (${dailyLimit} calls)`,
        current: currentCalls,
        limit: dailyLimit,
        reset_at: getNextMidnight(),
      });
    }

    // TODO: Increment API call counter
    
    next();
  } catch (error) {
    console.error('[SubscriptionEnforcer] API rate limit error:', error);
    next();
  }
};

/**
 * Check storage limit before file upload
 */
const enforceStorageLimit = (maxSizeBytes) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return next();

      const clientId = req.user.clientId || req.user.client_id;
      if (!clientId) return next();

      const features = await featureFlagService.getClientFeatures(clientId);
      const limitGB = features.limits.max_storage_gb;

      if (limitGB === -1) {
        return next(); // Unlimited
      }

      const limitBytes = limitGB * 1024 * 1024 * 1024;
      const currentUsed = features.usage?.current_storage || 0;
      const uploadSize = parseInt(req.headers['content-length']) || maxSizeBytes;

      if (currentUsed + uploadSize > limitBytes) {
        return res.status(403).json({
          ok: false,
          error: 'storage_limit_exceeded',
          message: `Storage limit exceeded. You have ${formatBytes(limitBytes - currentUsed)} remaining`,
          current_used: formatBytes(currentUsed),
          limit: formatBytes(limitBytes),
          upgrade_url: '/pricing',
        });
      }

      next();
    } catch (error) {
      console.error('[SubscriptionEnforcer] Storage limit error:', error);
      next();
    }
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);
  return midnight.toISOString();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// COMBINED MIDDLEWARE
// ============================================================================

/**
 * Full subscription enforcement (state + features + limits)
 */
const fullSubscriptionEnforcement = [
  enforceSubscriptionState,
  enforceFeatureFlag,
];

/**
 * Subscription info middleware (just attaches info, no blocking)
 */
const attachSubscriptionInfo = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const clientId = req.user.clientId || req.user.client_id;
    if (!clientId) return next();

    const features = await featureFlagService.getClientFeatures(clientId);
    req.subscription = {
      state: features.state,
      plan: features.plan,
      planName: features.planName,
      features: features.features,
      limits: features.limits,
      usage: features.usage,
      isRestricted: features.isRestricted,
      stateProps: STATE_PROPERTIES[features.state] || {},
    };

    next();
  } catch (error) {
    console.error('[SubscriptionEnforcer] Info attach error:', error);
    next();
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // State enforcement
  enforceSubscriptionState,
  
  // Feature enforcement
  enforceFeatureFlag,
  requireFeature,
  
  // Limit enforcement
  enforceUserLimit,
  enforceApiRateLimit,
  enforceStorageLimit,
  
  // Combined
  fullSubscriptionEnforcement,
  attachSubscriptionInfo,
  
  // Helpers
  formatBytes,
  
  // Re-export from enforcement service for convenience
  checkRolePermissions,
  checkSubscriptionFeatures,
  checkSubscriptionState,
  checkPlanLimits,
  checkAllPlanLimits,
  enforceSubscription,
  createEnforcementMiddleware,
};
