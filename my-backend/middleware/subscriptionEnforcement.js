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
  'POST /api/ocr/scan': 'ocr_extraction',
  'POST /api/documents/bulk-upload': 'bulk_upload',
  
  // System & API
  'POST /api/webhooks': 'webhook_triggers',
  'GET /api/audit-logs': 'audit_log_access',
  'GET /api/audit-logs/export': 'audit_log_export',
  
  // Security & Authentication (new)
  'POST /api/auth/mfa/setup': 'mfa_authentication',
  'POST /api/auth/sso/configure': 'sso_saml',
  'PUT /api/admin/security/ip-whitelist': 'ip_whitelist',
  'POST /api/admin/support-sessions': 'support_sessions',
  
  // RBAC & Permissions (new)
  'POST /api/admin/roles': 'custom_role_creation',
  'POST /api/admin/roles/:id/clone': 'role_cloning',
  'POST /api/admin/roles/temporary': 'temporary_roles',
  'POST /api/admin/delegation': 'delegation_rules',
  'GET /api/admin/permissions/audit': 'permission_audit',
  
  // Advanced Workflow (new)
  'POST /api/tasks/recurring': 'recurring_tasks',
  'POST /api/tasks/templates': 'task_templates',
  'PUT /api/tasks/:id/escalate': 'task_escalation',
  'POST /api/automation/rules': 'workflow_automation',
  'POST /api/sla/configure': 'sla_management',
  
  // Advanced Reporting (new)
  'POST /api/dashboards': 'custom_dashboards',
  'GET /api/analytics/kpi': 'kpi_analytics',
  'POST /api/reports/builder': 'report_builder',
  'POST /api/reports/schedule': 'scheduled_reports',
  'POST /api/reports/share': 'report_sharing',
  'GET /api/analytics/ai': 'ai_analytics',
  
  // Notifications (new)
  'POST /api/notifications/email': 'email_notifications',
  'POST /api/notifications/sms': 'sms_notifications',
  'POST /api/notifications/push': 'push_notifications',
  'POST /api/integrations/slack': 'slack_integration',
  'POST /api/notifications/templates': 'notification_templates',
  
  // Integrations (new)
  'POST /api/integrations/custom': 'custom_integrations',
  'POST /api/keys': 'api_key_management',
  'GET /api/export/bulk': 'data_export_api',
  
  // Enterprise Features (new)
  'POST /api/entities': 'multi_entity',
  'PUT /api/admin/branding': 'white_label',
  'PUT /api/admin/domain': 'custom_domain',
  'POST /api/sandbox': 'sandbox_environment',
  
  // Compliance (new)
  'GET /api/compliance/reports': 'compliance_reports',
  'POST /api/gdpr/export': 'gdpr_tools',
  'GET /api/sox/audit': 'sox_compliance',
};

// Feature codes that should track amount-based approvals
const AMOUNT_BASED_FEATURES = [
  'payment_request_creation',
  'payment_approval',
  'bank_transfer_execution',
  'refund_processing',
];

// Feature codes that are metered (per-usage billing)
const METERED_FEATURES = [
  'ocr_extraction',
  'sms_notifications',
  'ai_analytics',
  'support_sessions',
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
async function checkFeatureAccess(tenantId, featureCode, _options = {}) {
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
    // SECURITY FIX P1: FAIL-CLOSED - deny access on any error
    const sanitizedError = error?.message?.substring(0, 200) || 'Unknown error';
    console.error(`[SECURITY][FAIL_CLOSED] Feature access check FAILED - feature: ${featureCode}, tenant: ${tenantId || 'null'}, error: ${sanitizedError}`);
    
    return {
      allowed: false,
      decision: 'denied',
      reason: 'FEATURE_ACCESS_CHECK_FAILED',
      current_usage: 0,
      usage_limit: 0,
      unlock_price: 0,
      error_context: 'Subscription verification failed. Contact support if this persists.',
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
    failMode = 'closed', // 'closed' = block on error (SECURITY FIX: changed from 'open')
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
    
    // SECURITY FIX P0-1: Null-tenant bypass BLOCKED
    // tenantId === null MUST NOT disable enforcement for tenant-scoped features
    // Only explicitly global operations (bypass roles above) are allowed
    if (!tenantId) {
      // Match route to see if this is a feature that requires tenant context
      const featureCode = matchRouteToFeature(req.method, req.path);
      if (featureCode) {
        // This is a subscription-controlled feature but no tenant - BLOCK
        console.warn(`[SECURITY] P0-1: Blocked null-tenant access to ${req.method} ${req.path} (feature: ${featureCode})`);
        return res.status(403).json({
          ok: false,
          error: 'Tenant context required',
          code: 'NULL_TENANT_BLOCKED',
          message: 'This operation requires a valid tenant context. Contact support if you believe this is an error.',
        });
      }
      // No feature mapping - allow (truly public route)
      return next();
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
  METERED_FEATURES,
};
