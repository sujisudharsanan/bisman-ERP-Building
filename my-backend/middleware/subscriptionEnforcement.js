/**
 * BISMAN ERP - Subscription Enforcement Middleware
 * 
 * This middleware enforces subscription limits and feature access across the entire system.
 * It is the runtime enforcement layer that checks:
 * - Feature availability based on plan
 * - Usage limits per feature
 * - Lock modes (soft/hard)
 * - Approval thresholds
 * 
 * CRITICAL: No route may bypass this enforcement.
 * All limits come from the subscription control tables.
 * 
 * @module middleware/subscriptionEnforcement
 */

const { getPrisma } = require('../lib/prisma');

// ============================================================================
// FEATURE CODE MAPPINGS
// Maps route patterns to feature codes for enforcement
// ============================================================================

const ROUTE_FEATURE_MAP = {
  // User & Access
  'POST /api/users': 'user_creation',
  'POST /api/admin/users': 'user_creation',
  'PUT /api/users/:id/role': 'role_assignment',
  'POST /api/branches': 'branch_creation',
  'POST /api/locations': 'location_creation',
  
  // Task & Workflow
  'POST /api/tasks': 'task_creation',
  'POST /api/tasks/assign': 'task_assignment',
  'POST /api/tasks/:id/approve': 'task_approval',
  'POST /api/tasks/:id/reopen': 'task_reopen',
  'POST /api/tasks/:id/attachments': 'task_attachments',
  
  // Finance & Payments
  'POST /api/payment-requests': 'payment_request_creation',
  'POST /api/payments': 'payment_request_creation',
  'POST /api/payment-requests/:id/approve': 'payment_approval',
  'POST /api/payments/:id/approve': 'payment_approval',
  'POST /api/bank-transfers': 'bank_transfer_execution',
  'POST /api/refunds': 'refund_processing',
  
  // Reporting
  'POST /api/reports': 'report_generation',
  'GET /api/reports/:id/download': 'report_download',
  'GET /api/reports/export/excel': 'export_to_excel',
  'GET /api/reports/export/pdf': 'export_to_pdf',
  
  // Banking & Reconciliation
  'POST /api/bank-statements': 'bank_statement_upload',
  'POST /api/reconciliation/auto': 'auto_reconciliation',
  'POST /api/reconciliation/manual': 'manual_reconciliation',
  'GET /api/utr-trace': 'utr_trace',
  
  // Documents & Storage
  'POST /api/upload': 'file_upload',
  'POST /api/files': 'file_upload',
  'GET /api/files/:id/download': 'file_download',
  
  // System & API
  'POST /api/webhooks': 'webhook_triggers',
  'GET /api/audit-logs': 'audit_log_access',
};

// Feature codes that should track amount-based approvals
const AMOUNT_BASED_FEATURES = [
  'payment_request_creation',
  'payment_approval',
  'bank_transfer_execution',
  'refund_processing',
];

// ============================================================================
// CACHE
// ============================================================================

// In-memory cache for tenant plan data (with TTL)
const planCache = new Map();
const CACHE_TTL_MS = 60000; // 1 minute

function getCacheKey(tenantId) {
  return `plan:${tenantId}`;
}

function getCachedPlan(tenantId) {
  const key = getCacheKey(tenantId);
  const cached = planCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedPlan(tenantId, data) {
  const key = getCacheKey(tenantId);
  planCache.set(key, { data, timestamp: Date.now() });
}

function invalidatePlanCache(tenantId) {
  const key = getCacheKey(tenantId);
  planCache.delete(key);
}

// ============================================================================
// CORE ENFORCEMENT FUNCTIONS
// ============================================================================

/**
 * Get tenant's plan and feature controls
 */
async function getTenantPlanFeatures(tenantId) {
  // Check cache first
  const cached = getCachedPlan(tenantId);
  if (cached) return cached;

  const prisma = getPrisma();
  
  try {
    // Use the database function for efficient lookup
    const features = await prisma.$queryRaw`
      SELECT * FROM get_tenant_plan_features(${tenantId}::uuid)
    `;

    const result = {
      tenantId,
      features: features.reduce((acc, f) => {
        acc[f.feature_code] = f;
        return acc;
      }, {}),
      loadedAt: new Date().toISOString(),
    };

    setCachedPlan(tenantId, result);
    return result;
  } catch (error) {
    console.error('[SubscriptionEnforcement] Error loading plan features:', error);
    return null;
  }
}

/**
 * Check if a feature is allowed for the tenant
 */
async function checkFeatureAccess(tenantId, featureCode, options = {}) {
  const prisma = getPrisma();
  
  try {
    // Use the database function for atomic check
    const result = await prisma.$queryRaw`
      SELECT * FROM check_feature_enforcement(${tenantId}::uuid, ${featureCode})
    `;

    if (result && result.length > 0) {
      return result[0];
    }

    // Default: allow if no rules found (for backwards compatibility)
    return {
      allowed: true,
      decision: 'allowed',
      reason: 'no_rules_configured',
      current_usage: 0,
      usage_limit: -1,
      unlock_price: 0,
      reset_at: null,
    };
  } catch (error) {
    console.error('[SubscriptionEnforcement] Check access error:', error);
    // Fail open for now (can be changed to fail closed for stricter enforcement)
    return {
      allowed: true,
      decision: 'allowed',
      reason: 'check_error',
      current_usage: 0,
      usage_limit: -1,
      unlock_price: 0,
    };
  }
}

/**
 * Increment usage counter for a feature
 */
async function incrementUsage(tenantId, featureCode, userId = null) {
  const prisma = getPrisma();
  
  try {
    await prisma.$queryRaw`
      SELECT increment_usage_counter(${tenantId}::uuid, ${userId}, ${featureCode}, 1)
    `;
    return true;
  } catch (error) {
    console.error('[SubscriptionEnforcement] Increment usage error:', error);
    return false;
  }
}

/**
 * Log enforcement decision for audit
 */
async function logEnforcementDecision(tenantId, userId, featureCode, decision, context = {}) {
  const prisma = getPrisma();
  
  try {
    await prisma.$executeRaw`
      INSERT INTO enforcement_decision_log 
      (tenant_id, user_id, feature_code, action_type, request_path, request_method, 
       decision, decision_reason, current_usage, usage_limit, ip_address)
      VALUES 
      (${tenantId}::uuid, ${userId}, ${featureCode}, ${context.actionType || 'unknown'},
       ${context.path || ''}, ${context.method || ''}, ${decision.decision},
       ${decision.reason}, ${decision.current_usage || 0}, ${decision.usage_limit || -1},
       ${context.ip || null}::inet)
    `;
  } catch (error) {
    console.error('[SubscriptionEnforcement] Log decision error:', error);
  }
}

// ============================================================================
// ROUTE MATCHING
// ============================================================================

/**
 * Match a request to a feature code
 */
function matchRouteToFeature(method, path) {
  // Normalize path (remove query string, trailing slash)
  const normalizedPath = path.split('?')[0].replace(/\/$/, '');
  
  // Try exact match first
  const exactKey = `${method} ${normalizedPath}`;
  if (ROUTE_FEATURE_MAP[exactKey]) {
    return ROUTE_FEATURE_MAP[exactKey];
  }
  
  // Try pattern matching (with :id placeholders)
  for (const [pattern, featureCode] of Object.entries(ROUTE_FEATURE_MAP)) {
    const [patternMethod, patternPath] = pattern.split(' ');
    
    if (patternMethod !== method) continue;
    
    // Convert pattern to regex
    const regex = new RegExp(
      '^' + patternPath.replace(/:[^/]+/g, '[^/]+') + '$'
    );
    
    if (regex.test(normalizedPath)) {
      return featureCode;
    }
  }
  
  return null;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Subscription Enforcement Middleware
 * 
 * Usage:
 *   app.use('/api', subscriptionEnforcement);
 * 
 * Or for specific routes:
 *   router.post('/tasks', subscriptionEnforcement, createTaskHandler);
 */
function subscriptionEnforcement(options = {}) {
  const {
    failMode = 'open', // 'open' = allow on error, 'closed' = block on error
    logAll = false,    // Log all decisions, not just blocks
    bypassRoles = ['SUPER_ADMIN', 'SYSTEM_ADMIN'], // Roles that bypass enforcement
  } = options;

  return async (req, res, next) => {
    // Skip if no user (public routes)
    if (!req.user) {
      return next();
    }

    // Skip if user has bypass role
    if (bypassRoles.includes(req.user.role)) {
      return next();
    }

    // Get tenant ID
    const tenantId = req.user.clientId || req.user.client_id || req.headers['x-tenant-id'];
    if (!tenantId) {
      return next(); // No tenant context, skip enforcement
    }

    // Match route to feature
    const featureCode = matchRouteToFeature(req.method, req.path);
    if (!featureCode) {
      return next(); // No feature mapping, skip enforcement
    }

    try {
      // Check feature access
      const decision = await checkFeatureAccess(tenantId, featureCode, {
        userId: req.user.id,
        amount: req.body?.amount, // For amount-based approvals
      });

      // Store decision in request for later use
      req.subscriptionDecision = decision;
      req.subscriptionFeature = featureCode;

      // Log decision if needed
      if (logAll || !decision.allowed) {
        await logEnforcementDecision(tenantId, req.user.id, featureCode, decision, {
          actionType: req.method,
          path: req.path,
          method: req.method,
          ip: req.ip,
        });
      }

      // Handle decision
      if (!decision.allowed) {
        // Check if soft lock (throttled) or hard lock (blocked)
        if (decision.decision === 'throttled') {
          return res.status(429).json({
            ok: false,
            error: 'Feature limit reached',
            code: 'LIMIT_EXCEEDED',
            feature: featureCode,
            currentUsage: decision.current_usage,
            limit: decision.usage_limit,
            unlockPrice: decision.unlock_price,
            resetAt: decision.reset_at,
            message: `You have reached your ${featureCode.replace(/_/g, ' ')} limit. Upgrade your plan or wait for the limit to reset.`,
          });
        } else {
          return res.status(403).json({
            ok: false,
            error: 'Feature not available',
            code: 'FEATURE_LOCKED',
            feature: featureCode,
            reason: decision.reason,
            message: `This feature is not available on your current plan.`,
          });
        }
      }

      // Check amount-based approval threshold
      if (AMOUNT_BASED_FEATURES.includes(featureCode) && req.body?.amount) {
        const planData = await getTenantPlanFeatures(tenantId);
        const featureControl = planData?.features?.[featureCode];
        
        if (featureControl?.approval_threshold && req.body.amount > featureControl.approval_threshold) {
          // Mark as requiring approval
          req.requiresApproval = true;
          req.approvalThreshold = featureControl.approval_threshold;
          req.approvalReason = `Amount ₹${req.body.amount} exceeds threshold of ₹${featureControl.approval_threshold}`;
        }
      }

      // Proceed with request
      next();

      // Post-request: increment usage counter (after successful response)
      // This is handled in a response interceptor or explicitly in route handlers
    } catch (error) {
      console.error('[SubscriptionEnforcement] Middleware error:', error);
      
      if (failMode === 'closed') {
        return res.status(500).json({
          ok: false,
          error: 'Subscription enforcement error',
          code: 'ENFORCEMENT_ERROR',
        });
      }
      
      next();
    }
  };
}

/**
 * Post-response hook to increment usage after successful operation
 * Call this in your route handler after successful completion
 */
async function recordUsage(req) {
  if (!req.subscriptionFeature || !req.user) return;
  
  const tenantId = req.user.clientId || req.user.client_id;
  if (!tenantId) return;
  
  await incrementUsage(tenantId, req.subscriptionFeature, req.user.id);
}

/**
 * Express middleware to auto-record usage on successful responses
 */
function autoRecordUsage() {
  return (req, res, next) => {
    const originalEnd = res.end;
    
    res.end = function(...args) {
      // Record usage only on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        recordUsage(req).catch(err => {
          console.error('[SubscriptionEnforcement] Auto-record usage error:', err);
        });
      }
      
      return originalEnd.apply(res, args);
    };
    
    next();
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a specific feature is available for a tenant (for UI decisions)
 */
async function isFeatureAvailable(tenantId, featureCode) {
  const decision = await checkFeatureAccess(tenantId, featureCode);
  return decision.allowed;
}

/**
 * Get all feature statuses for a tenant (for UI display)
 */
async function getTenantFeatureStatuses(tenantId) {
  const planData = await getTenantPlanFeatures(tenantId);
  if (!planData) return {};
  
  return Object.entries(planData.features).reduce((acc, [code, feature]) => {
    acc[code] = {
      available: feature.lock_mode !== 'hard',
      lockMode: feature.lock_mode,
      freeLimit: feature.free_limit,
      currentUsage: feature.current_usage || 0,
      isUnlocked: feature.is_unlocked,
      visible: feature.is_visible,
    };
    return acc;
  }, {});
}

/**
 * Get usage summary for a tenant
 */
async function getTenantUsageSummary(tenantId) {
  const prisma = getPrisma();
  
  try {
    const usage = await prisma.$queryRaw`
      SELECT 
        feature_code,
        used_count,
        period_type,
        period_start,
        period_end,
        lifetime_count
      FROM feature_usage_counters
      WHERE tenant_id = ${tenantId}::uuid
        AND period_end > NOW()
      ORDER BY feature_code
    `;
    
    return usage;
  } catch (error) {
    console.error('[SubscriptionEnforcement] Get usage summary error:', error);
    return [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Middleware
  subscriptionEnforcement,
  autoRecordUsage,
  
  // Functions
  checkFeatureAccess,
  incrementUsage,
  recordUsage,
  isFeatureAvailable,
  getTenantFeatureStatuses,
  getTenantUsageSummary,
  getTenantPlanFeatures,
  
  // Cache management
  invalidatePlanCache,
  
  // Constants
  ROUTE_FEATURE_MAP,
  AMOUNT_BASED_FEATURES,
};
