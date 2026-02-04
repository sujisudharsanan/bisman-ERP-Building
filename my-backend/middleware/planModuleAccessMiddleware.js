/**
 * Plan Module Access Middleware (JavaScript wrapper)
 * 
 * Enforces subscription-based module access restrictions.
 * 
 * CORE RULE: Auth → Subscription Plan → Module Entitlement → RBAC → Feature Limits
 * Free tenants must NOT access paid modules/pages/APIs even if RBAC allows it.
 * 
 * This middleware:
 * - Checks if the tenant's subscription plan grants access to the requested module
 * - Returns 402 Payment Required with upgrade message if module is not included in plan
 * - Allows access if module is included with 'full' or 'read_only' access level
 * - Logs MODULE_ACCESS_DENIED events for audit
 */

const { getPrisma } = require('../lib/prisma');

// Modules that are always accessible regardless of plan
// AUDIT FIX 2026-02-03: Using UPPERCASE to match modules_master.module_code
// Note: comparison uses .toLowerCase() for case-insensitive matching
const ALWAYS_ACCESSIBLE_MODULES = ['DASHBOARD', 'COMMON', 'CHAT', 'SUPPORT', 'HELP', 'AUTH', 'PUBLIC', 'ONBOARDING'];

// Module mapping: API path prefix → module_id in plan_module_access
const MODULE_MAPPING = {
  'finance': 'finance',
  'billing': 'billing',
  'procurement': 'procurement',
  'operations': 'operations',
  'hr': 'hr',
  'compliance': 'compliance',
  'governance': 'governance',
  'internal': 'internal',
  'qa': 'qa',
  'analytics': 'analytics',
  'reports': 'reports',
  'admin': 'admin',
  'system': 'system',
  'vendors': 'procurement',           // vendors → procurement module
  'settlements': 'finance',           // settlements → finance module
  'reconciliation': 'finance',        // bank reconciliation → finance module
  'payment-workflow': 'finance',      // payment workflow → finance module
  'task-approvals': 'task-management',// task approvals → task-management
  'approval-dashboard': 'operations', // approval dashboard → operations
  'approvals': 'operations',          // approvals → operations module
  'reviews': 'operations',            // reviews → operations module
  'clarifications': 'task-management',// clarifications → task-management
  'decision-load': 'operations',      // decision load map → operations
  'contracts': 'procurement',         // contracts → procurement
  'security-governance': 'compliance',// security → compliance
  'audit': 'compliance',              // audit → compliance
  'audit-integrity': 'compliance',    // audit-integrity → compliance
  'calls': 'operations',              // calls → operations
  'tasks': 'task-management',         // tasks → task-management
  'task-requests': 'task-management', // task requests → task-management
  'playbooks': 'support',             // playbooks → support
  'fallback-logs': 'system',          // fallback logs → system
  'deployment': 'system',             // deployment → system
  'enterprise-admin': 'enterprise-admin',
  'super-admin': 'super-admin',
  'superadmin': 'super-admin',
  'superadmin-dashboard': 'super-admin', // superadmin dashboard → super-admin
};

/**
 * Get tenant's subscription plan ID from client_subscriptions
 */
async function getTenantPlanId(tenantId) {
  const prisma = getPrisma();
  if (!prisma) return null;
  
  try {
    // Check client_subscriptions table (canonical source)
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
      include: { plan: true }
    });

    if (subscription?.plan) {
      return {
        planId: subscription.plan.id,
        planCode: subscription.plan.plan_code,
        planName: subscription.plan.name
      };
    }

    // Fallback: check clients table subscriptionPlan field
    const client = await prisma.clients.findUnique({
      where: { id: tenantId },
      select: { subscriptionPlan: true }
    });

    if (client?.subscriptionPlan) {
      const plan = await prisma.subscription_plans.findFirst({
        where: { plan_code: client.subscriptionPlan }
      });
      if (plan) {
        return {
          planId: plan.id,
          planCode: plan.plan_code,
          planName: plan.name
        };
      }
    }

    // Default to FREE plan if no subscription found
    const freePlan = await prisma.subscription_plans.findFirst({
      where: { plan_code: 'FREE' }
    });
    
    if (freePlan) {
      return {
        planId: freePlan.id,
        planCode: 'FREE',
        planName: freePlan.name
      };
    }

    return null;
  } catch (error) {
    console.error('[PlanModuleAccess] Error getting tenant plan:', tenantId, error.message);
    return null;
  }
}

/**
 * Check if a tenant has access to a specific module
 */
async function checkModuleAccess(tenantId, moduleId) {
  const prisma = getPrisma();
  
  // Always allow public modules (case-insensitive comparison)
  // AUDIT FIX 2026-02-03: Using .toUpperCase() to match UPPERCASE constants
  if (ALWAYS_ACCESSIBLE_MODULES.includes(moduleId.toUpperCase())) {
    return {
      hasAccess: true,
      accessLevel: 'full',
      moduleId,
      planName: 'Any',
      planId: 0,
      message: 'Module is publicly accessible'
    };
  }

  if (!prisma) {
    console.error('[PlanModuleAccess] Prisma not available');
    return {
      hasAccess: true, // Fail open for now
      accessLevel: 'full',
      moduleId,
      planName: 'Unknown',
      planId: 0,
      message: 'Database not available - allowing access'
    };
  }

  try {
    const planInfo = await getTenantPlanId(tenantId);
    
    if (!planInfo) {
      console.warn(`[PlanModuleAccess] No plan found for tenant ${tenantId}, denying access`);
      return {
        hasAccess: false,
        accessLevel: 'none',
        moduleId,
        planName: 'Unknown',
        planId: 0,
        message: 'No active subscription found. Please contact support.',
        upgradeRequired: true
      };
    }

    // Query plan_module_access for this plan and module
    const moduleAccess = await prisma.$queryRaw`
      SELECT access_level 
      FROM plan_module_access 
      WHERE plan_id = ${planInfo.planId} 
      AND module_id = ${moduleId.toLowerCase()}
      LIMIT 1
    `;

    const accessLevel = moduleAccess?.[0]?.access_level || 'none';

    if (accessLevel === 'none') {
      return {
        hasAccess: false,
        accessLevel: 'none',
        moduleId,
        planName: planInfo.planName,
        planId: planInfo.planId,
        message: `The '${moduleId}' module is not available in your ${planInfo.planName} plan. Please upgrade to access this feature.`,
        upgradeRequired: true
      };
    }

    return {
      hasAccess: true,
      accessLevel,
      moduleId,
      planName: planInfo.planName,
      planId: planInfo.planId,
      message: `Access granted: ${accessLevel}`
    };

  } catch (error) {
    console.error('[PlanModuleAccess] Error checking module access:', error.message);
    // Fail open for database errors to avoid blocking legitimate users
    return {
      hasAccess: true,
      accessLevel: 'full',
      moduleId,
      planName: 'Unknown',
      planId: 0,
      message: 'Access check failed - allowing access'
    };
  }
}

/**
 * Get all module access for a tenant (for frontend sidebar filtering)
 */
async function getTenantModuleAccess(tenantId) {
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const planInfo = await getTenantPlanId(tenantId);
    if (!planInfo) return null;

    const moduleAccessRecords = await prisma.$queryRaw`
      SELECT module_id, access_level, page_limit, features_json
      FROM plan_module_access
      WHERE plan_id = ${planInfo.planId}
    `;

    // Build modules map
    const modules = {};
    
    // Add always-accessible modules
    for (const mod of ALWAYS_ACCESSIBLE_MODULES) {
      modules[mod] = {
        accessLevel: 'full',
        pageLimit: -1,
        features: {}
      };
    }

    // Add plan-specific modules
    for (const record of moduleAccessRecords) {
      modules[record.module_id] = {
        accessLevel: record.access_level,
        pageLimit: record.page_limit || -1,
        features: record.features_json || {}
      };
    }

    return {
      planId: planInfo.planId,
      planCode: planInfo.planCode,
      planName: planInfo.planName,
      modules
    };
  } catch (error) {
    console.error('[PlanModuleAccess] Error getting tenant module access:', tenantId, error.message);
    return null;
  }
}

// Roles that bypass plan-based access checks (platform administrators)
const BYPASS_ROLES = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'ADMIN', 'ADMIN_OPS'];

/**
 * Middleware factory: Require access to a specific module
 * Usage: router.use('/finance', requirePlanModuleAccess('finance'))
 */
function requirePlanModuleAccess(moduleId) {
  return async (req, res, next) => {
    // Platform administrators bypass plan checks
    const userRole = String(req.user?.roleName || req.user?.role || req.user?.userType || '').toUpperCase();
    if (BYPASS_ROLES.includes(userRole)) {
      req.moduleAccess = {
        hasAccess: true,
        accessLevel: 'full',
        moduleId,
        planName: 'Admin Bypass',
        planId: 0,
        message: 'Platform administrator - full access'
      };
      return next();
    }

    const tenantId = req.user?.tenant_id || req.user?.client_id;

    if (!tenantId) {
      // Let auth middleware handle unauthenticated requests
      return next();
    }

    const accessResult = await checkModuleAccess(tenantId, moduleId);

    // Attach result to request for downstream use
    req.moduleAccess = accessResult;

    if (!accessResult.hasAccess) {
      // Log the access denial
      console.warn(`[PlanModuleAccess] ACCESS_DENIED: tenant=${tenantId}, module=${moduleId}, plan=${accessResult.planName}`);

      // Optionally log to audit table
      try {
        const prisma = getPrisma();
        if (prisma) {
          await prisma.audit_logs.create({
            data: {
              tenant_id: tenantId,
              user_id: req.user?.id ? Number(req.user.id) : null,
              action: 'MODULE_ACCESS_DENIED',
              table_name: 'plan_module_access',
              new_values: {
                moduleId,
                planId: accessResult.planId,
                planName: accessResult.planName,
                path: req.path,
                method: req.method
              },
              ip_address: req.ip || null,
              user_agent: req.get('user-agent') || null
            }
          });
        }
      } catch (auditError) {
        console.error('[PlanModuleAccess] Failed to log audit:', auditError.message);
      }

      // 402 Payment Required - SaaS billing standard for upgrade-required
      return res.status(402).json({
        success: false,
        error: accessResult.message,
        code: 'PLAN_UPGRADE_REQUIRED',
        module: moduleId,
        access_level: accessResult.accessLevel,
        upgradeRequired: accessResult.upgradeRequired,
        data: {
          moduleId,
          planName: accessResult.planName,
          accessLevel: accessResult.accessLevel
        }
      });
    }

    // Warn if read-only access but mutation attempted
    if (accessResult.accessLevel === 'read_only' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      console.warn(`[PlanModuleAccess] READ_ONLY_VIOLATION: tenant=${tenantId}, module=${moduleId}, method=${req.method}`);
      // 402 Payment Required - write access requires upgrade
      return res.status(402).json({
        success: false,
        error: `Read-only access to '${moduleId}' module. Upgrade to modify data.`,
        code: 'PLAN_UPGRADE_REQUIRED',
        module: moduleId,
        access_level: 'read_only',
        upgradeRequired: true,
        data: {
          moduleId,
          planName: accessResult.planName,
          accessLevel: accessResult.accessLevel
        }
      });
    }

    next();
  };
}

/**
 * Infer module from request path
 * Example: /api/finance/invoices → 'finance'
 */
function inferModuleFromPath(path) {
  // Remove /api prefix and get first segment
  const cleanPath = path.replace(/^\/api\/?/, '');
  const firstSegment = cleanPath.split('/')[0];
  
  // Map to canonical module ID
  return MODULE_MAPPING[firstSegment] || firstSegment || null;
}

/**
 * Middleware: Auto-enforce module access based on path
 * Usage: app.use('/api', autoEnforcePlanModuleAccess)
 * 
 * This middleware automatically determines the module from the request path
 * and enforces plan-based access control.
 */
async function autoEnforcePlanModuleAccess(req, res, next) {
  const moduleId = inferModuleFromPath(req.path);

  if (!moduleId) {
    return next(); // Can't determine module, let other middleware handle
  }

  // Skip for always-accessible modules
  if (ALWAYS_ACCESSIBLE_MODULES.includes(moduleId.toLowerCase())) {
    return next();
  }

  // Use the module-specific middleware
  return requirePlanModuleAccess(moduleId)(req, res, next);
}

/**
 * Middleware: Load all module access for tenant (attach to req)
 * Use this in /api/me or /api/subscriptions/module-access endpoints
 */
async function loadTenantModuleAccess(req, res, next) {
  const tenantId = req.user?.tenant_id || req.user?.client_id;

  if (!tenantId) {
    return next();
  }

  try {
    const moduleAccess = await getTenantModuleAccess(tenantId);
    req.tenantModuleAccess = moduleAccess || undefined;
  } catch (error) {
    console.error('[PlanModuleAccess] Error loading tenant module access:', error.message);
  }

  next();
}

module.exports = {
  requirePlanModuleAccess,
  autoEnforcePlanModuleAccess,
  loadTenantModuleAccess,
  checkModuleAccess,
  getTenantModuleAccess,
  inferModuleFromPath,
  ALWAYS_ACCESSIBLE_MODULES,
  MODULE_MAPPING
};
