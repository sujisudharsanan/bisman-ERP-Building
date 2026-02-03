/**
 * Plan Module Access Middleware
 * 
 * Enforces subscription-based module access restrictions.
 * 
 * CORE RULE: Auth → Subscription Plan → Module Entitlement → RBAC → Feature Limits
 * Free tenants must NOT access paid modules/pages/APIs even if RBAC allows it.
 * 
 * This middleware:
 * - Checks if the tenant's subscription plan grants access to the requested module
 * - Returns 403 with upgrade message if module is not included in plan
 * - Allows access if module is included with 'full' or 'read_only' access level
 * - Logs MODULE_ACCESS_DENIED events for audit
 * 
 * SETUP: After adding plan_module_access to schema.prisma, run:
 *   npx prisma generate
 *   npx prisma db push (or run the migration)
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Modules that are always accessible regardless of plan
// AUDIT FIX 2026-02-03: Using UPPERCASE to match modules_master.module_code
// Note: comparison should be case-insensitive (using .toLowerCase())
const ALWAYS_ACCESSIBLE_MODULES = ['DASHBOARD', 'COMMON', 'CHAT', 'SUPPORT', 'HELP'];

// Type for raw query results
interface ModuleAccessRow {
  id: number;
  plan_id: number;
  module_id: string;
  access_level: string;
  page_limit: number;
  features_json: Record<string, unknown> | null;
}

export type ModuleAccessLevel = 'full' | 'read_only' | 'none';

export interface ModuleAccessResult {
  hasAccess: boolean;
  accessLevel: ModuleAccessLevel;
  moduleId: string;
  planName: string;
  planId: number;
  message?: string;
  upgradeRequired?: boolean;
}

export interface TenantModuleAccess {
  planId: number;
  planCode: string;
  planName: string;
  modules: {
    [moduleId: string]: {
      accessLevel: ModuleAccessLevel;
      pageLimit: number;
      features: Record<string, unknown>;
    };
  };
}

interface AuthenticatedUser {
  id: number | string;
  tenant_id?: string;
  client_id?: string;
  [key: string]: unknown;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  moduleAccess?: ModuleAccessResult;
  tenantModuleAccess?: TenantModuleAccess;
}

/**
 * Get tenant's subscription plan ID
 */
async function getTenantPlanId(tenantId: string): Promise<{ planId: number; planCode: string; planName: string } | null> {
  try {
    // First check client_subscriptions table
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
      // Map legacy plan names to plan IDs
      const planMap: Record<string, { id: number; code: string; name: string }> = {
        'free': { id: 1, code: 'FREE', name: 'Free' },
        'basic': { id: 2, code: 'BASIC', name: 'Basic' },
        'standard': { id: 3, code: 'STANDARD', name: 'Standard' },
        'premium': { id: 4, code: 'PREMIUM', name: 'Premium' },
        'enterprise': { id: 5, code: 'ENTERPRISE', name: 'Enterprise' }
      };

      const legacyPlan = planMap[client.subscriptionPlan.toLowerCase()] || planMap['free'];
      return {
        planId: legacyPlan.id,
        planCode: legacyPlan.code,
        planName: legacyPlan.name
      };
    }

    // Default to FREE plan
    return { planId: 1, planCode: 'FREE', planName: 'Free' };
  } catch (error) {
    console.error('[PlanModuleAccess] Error getting tenant plan:', tenantId, error);
    return null;
  }
}

/**
 * Check if a tenant has access to a specific module
 */
export async function checkModuleAccess(
  tenantId: string,
  moduleId: string
): Promise<ModuleAccessResult> {
  // Always allow core modules (case-insensitive comparison)
  // AUDIT FIX 2026-02-03: Using .toUpperCase() to match UPPERCASE constants
  if (ALWAYS_ACCESSIBLE_MODULES.includes(moduleId.toUpperCase())) {
    return {
      hasAccess: true,
      accessLevel: 'full',
      moduleId,
      planName: 'Any',
      planId: 0,
      message: 'Core module - always accessible'
    };
  }

  try {
    const planInfo = await getTenantPlanId(tenantId);

    if (!planInfo) {
      // No plan found - default to no access for paid modules
      return {
        hasAccess: false,
        accessLevel: 'none',
        moduleId,
        planName: 'Unknown',
        planId: 0,
        message: 'No subscription plan found. Please contact support.',
        upgradeRequired: true
      };
    }

    // Query plan_module_access table using raw SQL for compatibility
    // until Prisma client is regenerated
    const moduleAccessRows = await prisma.$queryRaw<ModuleAccessRow[]>`
      SELECT id, plan_id, module_id, access_level, page_limit, features_json
      FROM plan_module_access
      WHERE plan_id = ${planInfo.planId}
        AND module_id = ${moduleId}
      LIMIT 1
    `;

    const moduleAccess = moduleAccessRows[0] || null;

    if (!moduleAccess) {
      // No explicit access record - check if module exists and deny by default
      return {
        hasAccess: false,
        accessLevel: 'none',
        moduleId,
        planName: planInfo.planName,
        planId: planInfo.planId,
        message: `Module '${moduleId}' is not available in your ${planInfo.planName} plan. Upgrade to access this feature.`,
        upgradeRequired: true
      };
    }

    // Check access level
    if (moduleAccess.access_level === 'none') {
      return {
        hasAccess: false,
        accessLevel: 'none',
        moduleId,
        planName: planInfo.planName,
        planId: planInfo.planId,
        message: `Module '${moduleId}' is not available in your ${planInfo.planName} plan. Upgrade to access this feature.`,
        upgradeRequired: true
      };
    }

    return {
      hasAccess: true,
      accessLevel: moduleAccess.access_level as ModuleAccessLevel,
      moduleId,
      planName: planInfo.planName,
      planId: planInfo.planId,
      message: moduleAccess.access_level === 'read_only' 
        ? `Read-only access to '${moduleId}' module` 
        : undefined
    };
  } catch (error) {
    console.error('[PlanModuleAccess] Error checking module access:', tenantId, moduleId, error);
    // Fail open to prevent blocking legitimate access
    return {
      hasAccess: true,
      accessLevel: 'full',
      moduleId,
      planName: 'Error',
      planId: 0,
      message: 'Error checking module access - allowing access. Please report if this persists.'
    };
  }
}

/**
 * Get all module access for a tenant (for sidebar filtering)
 */
export async function getTenantModuleAccess(tenantId: string): Promise<TenantModuleAccess | null> {
  try {
    const planInfo = await getTenantPlanId(tenantId);

    if (!planInfo) {
      return null;
    }

    // Get all module access records for this plan using raw SQL
    const moduleAccessRecords = await prisma.$queryRaw<ModuleAccessRow[]>`
      SELECT id, plan_id, module_id, access_level, page_limit, features_json
      FROM plan_module_access
      WHERE plan_id = ${planInfo.planId}
    `;

    const modules: TenantModuleAccess['modules'] = {};

    // Add always-accessible modules
    for (const moduleId of ALWAYS_ACCESSIBLE_MODULES) {
      modules[moduleId] = {
        accessLevel: 'full',
        pageLimit: -1,
        features: {}
      };
    }

    // Add plan-specific modules
    for (const record of moduleAccessRecords) {
      modules[record.module_id] = {
        accessLevel: record.access_level as ModuleAccessLevel,
        pageLimit: record.page_limit,
        features: (record.features_json as Record<string, unknown>) || {}
      };
    }

    return {
      planId: planInfo.planId,
      planCode: planInfo.planCode,
      planName: planInfo.planName,
      modules
    };
  } catch (error) {
    console.error('[PlanModuleAccess] Error getting tenant module access:', tenantId, error);
    return null;
  }
}

/**
 * Middleware factory: Require access to a specific module
 * Usage: router.use('/finance/*', requirePlanModuleAccess('finance'))
 */
export function requirePlanModuleAccess(moduleId: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenant_id || req.user?.client_id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const accessResult = await checkModuleAccess(tenantId as string, moduleId);

    // Attach result to request for downstream use
    req.moduleAccess = accessResult;

    if (!accessResult.hasAccess) {
      // Log the access denial
      console.warn(`[PlanModuleAccess] ACCESS_DENIED: tenant=${tenantId}, module=${moduleId}, plan=${accessResult.planName}`);

      // Optionally log to audit table
      try {
        await prisma.audit_logs.create({
          data: {
            tenant_id: tenantId as string,
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
      } catch (auditError) {
        console.error('[PlanModuleAccess] Failed to log audit:', auditError);
      }

      return res.status(403).json({
        success: false,
        error: accessResult.message,
        code: 'MODULE_ACCESS_DENIED',
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
      return res.status(403).json({
        success: false,
        error: `Read-only access to '${moduleId}' module. Upgrade to modify data.`,
        code: 'READ_ONLY_ACCESS',
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
 * Middleware: Load all module access for tenant (for use in /api/me or /api/subscription/module-access)
 */
export async function loadTenantModuleAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const tenantId = req.user?.tenant_id || req.user?.client_id;

  if (!tenantId) {
    return next(); // Let auth middleware handle this
  }

  try {
    const moduleAccess = await getTenantModuleAccess(tenantId as string);
    req.tenantModuleAccess = moduleAccess || undefined;
  } catch (error) {
    console.error('[PlanModuleAccess] Error loading tenant module access:', error);
  }

  next();
}

/**
 * Infer module from request path
 * Example: /api/finance/invoices → 'finance'
 */
export function inferModuleFromPath(path: string): string | null {
  // Common API path patterns
  const patterns = [
    /^\/api\/([a-z_-]+)/i,
    /^\/([a-z_-]+)\//i
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  return null;
}

/**
 * Middleware: Auto-enforce module access based on path
 * Usage: app.use('/api', autoEnforcePlanModuleAccess)
 */
export async function autoEnforcePlanModuleAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const moduleId = inferModuleFromPath(req.path);

  if (!moduleId) {
    return next(); // Can't determine module, let other middleware handle
  }

  // Use the module-specific middleware
  return requirePlanModuleAccess(moduleId)(req, res, next);
}

export default {
  checkModuleAccess,
  getTenantModuleAccess,
  requirePlanModuleAccess,
  loadTenantModuleAccess,
  autoEnforcePlanModuleAccess,
  inferModuleFromPath,
  ALWAYS_ACCESSIBLE_MODULES
};
