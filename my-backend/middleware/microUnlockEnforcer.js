/**
 * BISMAN ERP - Micro-Unlock Usage Enforcement Middleware
 * 
 * Runtime middleware that checks feature usage limits and shows unlock prompts.
 * This integrates with the micro-unlock subscription system.
 * 
 * CRITICAL UX RULES:
 * - Users NEVER see pricing or payment prompts
 * - Users only see: "Usage limit reached. Contact your administrator."
 * - Admins see unlock options with pricing
 * 
 * Usage:
 *   router.post('/tasks', enforceUsage('task_creation'), createTask);
 * 
 * @module middleware/microUnlockEnforcer
 */

const microUnlockService = require('../services/subscription/microUnlockService');
const spendControlService = require('../services/subscription/spendControlService');

// Admin roles that can see pricing and unlock options
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'ENTERPRISE_ADMIN', 'TENANT_ADMIN'];

/**
 * Check if user has admin privileges
 * @param {Object} user - User object from request
 * @returns {boolean} True if user is an admin
 */
function isAdminUser(user) {
  if (!user) return false;
  const role = (user.role_name || user.role || '').toUpperCase();
  return ADMIN_ROLES.includes(role);
}

/**
 * Create enforcement middleware for a specific feature
 * @param {string} featureKey - The feature key to enforce
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function enforceUsage(featureKey, options = {}) {
  const {
    increment = 1,           // How much to increment usage by
    skipCheck = false,       // Skip the check (for debugging)
    blockOnLimit = true,     // Whether to block or just warn
    logUsage = true,         // Whether to log usage after success
  } = options;

  return async (req, res, next) => {
    // Skip enforcement if configured
    if (skipCheck) {
      req.usageEnforcement = { skipped: true };
      return next();
    }

    try {
      // Get tenant and user context (support multiple field names)
      const tenantId = req.user?.tenant_id || req.user?.client_id || req.user?.clientId;
      const userId = req.user?.id;
      const isAdmin = isAdminUser(req.user);

      if (!tenantId) {
        // No tenant context - skip enforcement but log warning
        console.warn(`[MicroUnlock] No tenant context for ${featureKey} enforcement`);
        req.usageEnforcement = { noTenant: true };
        return next();
      }

      // Check feature access
      const access = await microUnlockService.checkFeatureAccess(
        tenantId,
        userId,
        featureKey
      );

      // Store access info on request for later use
      req.usageEnforcement = {
        featureKey,
        access,
        tenantId,
        userId,
        isAdmin,
      };

      // If allowed, continue
      if (access.allowed) {
        // Record usage after the request completes successfully
        if (logUsage) {
          res.on('finish', async () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                await microUnlockService.recordUsage(tenantId, userId, featureKey, increment);
              } catch (err) {
                console.error(`[MicroUnlock] Failed to record usage for ${featureKey}:`, err);
              }
            }
          });
        }
        return next();
      }

      // Access denied - log the block for admin visibility
      if (userId) {
        try {
          await spendControlService.logUserBlock(
            tenantId,
            userId,
            featureKey,
            access.current_usage,
            access.usage_limit
          );
        } catch (err) {
          console.error(`[MicroUnlock] Failed to log block for ${featureKey}:`, err);
        }
      }

      // Access denied - return appropriate response based on role
      if (blockOnLimit) {
        if (isAdmin) {
          // ADMIN VIEW: Show unlock options with pricing
          return res.status(429).json({
            ok: false,
            error: 'USAGE_LIMIT_EXCEEDED',
            errorCode: 'MICRO_UNLOCK_REQUIRED',
            featureKey,
            message: access.message,
            isAdmin: true,
            
            // Admin unlock prompt with pricing
            unlockPrompt: {
              show: true,
              title: 'Usage Limit Reached',
              description: `Your team has reached the daily limit for ${formatFeatureName(featureKey)}.`,
              unlockMessage: `Unlock unlimited ${formatFeatureName(featureKey)} to restore workflow.`,
              price: access.unlock_price,
              currency: 'INR',
              billingNote: 'Service starts immediately. Payment collected at end of billing cycle.',
              
              currentUsage: access.current_usage,
              usageLimit: access.usage_limit,
              resetInSeconds: access.reset_in_seconds,
              resetInHuman: formatResetTime(access.reset_in_seconds),
              
              actions: [
                {
                  id: 'unlock',
                  label: `Unlock Service (₹${access.unlock_price}/month)`,
                  variant: 'primary',
                  endpoint: `/api/micro-unlock/unlock`,
                  method: 'POST',
                  body: { featureKey },
                },
                {
                  id: 'later',
                  label: 'Decide Later',
                  variant: 'secondary',
                  action: 'dismiss',
                },
              ],
            },
          });
        } else {
          // USER VIEW: Simple message, NO pricing, NO unlock options
          return res.status(429).json({
            ok: false,
            error: 'USAGE_LIMIT_EXCEEDED',
            errorCode: 'CONTACT_ADMIN',
            featureKey,
            message: `Your usage limit for today is reached.`,
            isAdmin: false,
            
            // User-facing prompt (no pricing)
            limitNotice: {
              show: true,
              title: 'Usage Limit Reached',
              description: `You've reached your daily limit for ${formatFeatureName(featureKey)}.`,
              helpText: 'Contact your administrator for additional access.',
              
              // Show when limit resets
              resetInfo: access.reset_in_seconds > 0 
                ? `Limit resets in ${formatResetTime(access.reset_in_seconds)}`
                : null,
              
              // Only action is to dismiss
              actions: [
                {
                  id: 'ok',
                  label: 'OK',
                  variant: 'primary',
                  action: 'close',
                },
              ],
            },
          });
        }
      }

      // Non-blocking mode - add warning header and continue
      res.setHeader('X-Usage-Warning', `Limit exceeded for ${featureKey}`);
      next();
    } catch (error) {
      console.error(`[MicroUnlock] Enforcement error for ${featureKey}:`, error);
      // On error, allow the request but log the issue
      req.usageEnforcement = { error: error.message };
      next();
    }
  };
}

/**
 * Bulk enforcement - check multiple features at once
 * @param {string[]} featureKeys - Array of feature keys to check
 * @returns {Function} Express middleware
 */
function enforceMultipleUsage(featureKeys) {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.client_id || req.user?.clientId;
      const userId = req.user?.id;

      if (!tenantId) {
        return next();
      }

      const results = await Promise.all(
        featureKeys.map(key => 
          microUnlockService.checkFeatureAccess(tenantId, userId, key)
        )
      );

      const blocked = featureKeys.reduce((acc, key, idx) => {
        if (!results[idx].allowed) {
          acc.push({
            featureKey: key,
            ...results[idx],
          });
        }
        return acc;
      }, []);

      if (blocked.length > 0) {
        return res.status(429).json({
          ok: false,
          error: 'MULTIPLE_LIMITS_EXCEEDED',
          blockedFeatures: blocked,
          message: `You've reached limits for: ${blocked.map(b => formatFeatureName(b.featureKey)).join(', ')}`,
        });
      }

      req.usageEnforcement = { features: featureKeys, allAllowed: true };
      next();
    } catch (error) {
      console.error('[MicroUnlock] Multi-enforcement error:', error);
      next();
    }
  };
}

/**
 * Middleware to attach usage info to all responses
 * Add this early in your middleware chain
 */
function attachUsageInfo() {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // If there's usage enforcement info and it's a successful response
      if (req.usageEnforcement && data && typeof data === 'object' && data.ok !== false) {
        const { access, featureKey } = req.usageEnforcement;
        
        if (access && !access.is_unlocked) {
          data._usage = {
            feature: featureKey,
            current: access.current_usage,
            limit: access.usage_limit,
            remaining: Math.max(0, access.usage_limit - access.current_usage - 1),
            nearLimit: access.usage_limit - access.current_usage <= 2,
          };
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Create a usage-aware route handler wrapper
 * @param {string} featureKey - Feature to track
 * @param {Function} handler - Route handler
 * @returns {Function} Wrapped handler
 */
function withUsageTracking(featureKey, handler) {
  return async (req, res, next) => {
    const tenantId = req.user?.client_id || req.user?.clientId;
    const userId = req.user?.id;

    if (tenantId) {
      try {
        // Check before
        const access = await microUnlockService.checkFeatureAccess(tenantId, userId, featureKey);
        
        if (!access.allowed) {
          return res.status(429).json({
            ok: false,
            error: 'USAGE_LIMIT_EXCEEDED',
            featureKey,
            unlockPrice: access.unlock_price,
          });
        }
        
        req._featureAccess = access;
      } catch (err) {
        console.error(`[MicroUnlock] Pre-check error for ${featureKey}:`, err);
      }
    }

    // Call the original handler
    try {
      await handler(req, res, next);
      
      // Record usage on success
      if (tenantId && res.statusCode >= 200 && res.statusCode < 300) {
        await microUnlockService.recordUsage(tenantId, userId, featureKey, 1);
      }
    } catch (err) {
      next(err);
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatFeatureName(featureKey) {
  return featureKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatResetTime(seconds) {
  if (!seconds || seconds <= 0) return 'now';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return 'less than a minute';
}

// ============================================================================
// PREDEFINED FEATURE ENFORCERS
// ============================================================================

// Common feature enforcers
const enforceTaskCreation = enforceUsage('task_creation');
const enforceTaskAcceptance = enforceUsage('task_acceptance');
const enforcePaymentRequest = enforceUsage('payment_requests');
const enforceReportDownload = enforceUsage('report_downloads');
const enforceBankReconciliation = enforceUsage('bank_reconciliation');
const enforceAuditExport = enforceUsage('audit_export');
const enforceBulkOperations = enforceUsage('bulk_task_operations');

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  enforceUsage,
  enforceMultipleUsage,
  attachUsageInfo,
  withUsageTracking,
  
  // Predefined enforcers
  enforceTaskCreation,
  enforceTaskAcceptance,
  enforcePaymentRequest,
  enforceReportDownload,
  enforceBankReconciliation,
  enforceAuditExport,
  enforceBulkOperations,
};
