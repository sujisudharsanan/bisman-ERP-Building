/**
 * Subscription Enforcement Middleware
 * 
 * Enforces subscription-based user count restrictions at runtime.
 * 
 * CORE RULE: User limits are enforced based on client's subscription, NOT role permissions.
 * RBAC does not control capacity. Subscription does.
 * 
 * This middleware:
 * - Calculates active user count dynamically (never cached)
 * - Blocks user creation/activation when limits exceeded
 * - Logs USER_LIMIT_EXCEEDED events for audit
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedUser {
  id: number | string;
  tenant_id?: string;
  [key: string]: unknown;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  subscriptionLimits?: SubscriptionLimits;
}

export interface SubscriptionLimits {
  max_users: number;
  max_active_users?: number;
  current_user_count: number;
  current_active_user_count: number;
  plan_name: string;
  plan_id: number;
  subscription_status: string;
  can_create_user: boolean;
  can_activate_user: boolean;
  limit_message?: string;
}

/**
 * Get subscription limits for a client (by tenant_id/client_id)
 * Always calculates dynamically - no cached values
 */
export async function getClientSubscriptionLimits(clientId: string): Promise<SubscriptionLimits | null> {
  try {
    // Get client's subscription with plan details
    // Use snake_case model name as per Prisma schema
    const clientSubscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: clientId },
      include: {
        plan: true  // relation name in schema
      }
    });

    if (!clientSubscription) {
      // No subscription found - use defaults from client's subscriptionPlan field
      const client = await prisma.clients.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        return null;
      }

      // Default limits for 'free' plan
      const defaultLimits: SubscriptionLimits = {
        max_users: 5,
        max_active_users: 5,
        current_user_count: 0,
        current_active_user_count: 0,
        plan_name: client.subscriptionPlan || 'free',
        plan_id: 0,
        subscription_status: client.subscriptionStatus || 'active',
        can_create_user: true,
        can_activate_user: true
      };

      // Count users for this client
      const userCounts = await countClientUsers(clientId);
      defaultLimits.current_user_count = userCounts.total;
      defaultLimits.current_active_user_count = userCounts.active;
      defaultLimits.can_create_user = userCounts.total < defaultLimits.max_users;
      defaultLimits.can_activate_user = userCounts.active < (defaultLimits.max_active_users || defaultLimits.max_users);

      if (!defaultLimits.can_create_user) {
        defaultLimits.limit_message = `User limit reached for ${defaultLimits.plan_name} plan (${defaultLimits.max_users} users). Upgrade required.`;
      }

      return defaultLimits;
    }

    const plan = clientSubscription.plan;
    
    // SAFETY: Check if plan was loaded
    if (!plan) {
      console.error('[SubscriptionEnforcement] Plan not loaded for subscription:', clientSubscription.id);
      // Return default limits as fallback
      const userCounts = await countClientUsers(clientId);
      return {
        max_users: 5,
        max_active_users: 5,
        current_user_count: userCounts.total,
        current_active_user_count: userCounts.active,
        plan_name: 'Unknown',
        plan_id: clientSubscription.plan_id,
        subscription_status: clientSubscription.state,
        can_create_user: true, // Allow action when we can't verify
        can_activate_user: true,
        limit_message: 'Unable to load subscription plan - please contact support if this persists.'
      };
    }
    
    // Calculate current user counts dynamically
    const userCounts = await countClientUsers(clientId);

    // -1 means unlimited
    const maxUsers = plan.max_users === -1 ? Infinity : plan.max_users;
    const maxActiveUsers = maxUsers; // Use same limit for active users unless you add a separate field

    const limits: SubscriptionLimits = {
      max_users: plan.max_users,
      max_active_users: plan.max_users,
      current_user_count: userCounts.total,
      current_active_user_count: userCounts.active,
      plan_name: plan.name,
      plan_id: plan.id,
      subscription_status: clientSubscription.state,
      can_create_user: userCounts.total < maxUsers,
      can_activate_user: userCounts.active < maxActiveUsers
    };

    // Check subscription status - suspended/cancelled clients can't add users
    if (['SUSPENDED', 'CANCELLED'].includes(clientSubscription.state)) {
      limits.can_create_user = false;
      limits.can_activate_user = false;
      limits.limit_message = `Subscription is ${clientSubscription.state.toLowerCase()}. Please contact support.`;
    } else if (!limits.can_create_user) {
      limits.limit_message = `User limit reached for ${plan.name} plan (${plan.max_users} users). Upgrade required.`;
    }

    return limits;
  } catch (error) {
    console.error('[SubscriptionEnforcement] Error getting limits for client:', clientId, error);
    // Return a safe fallback instead of null to prevent UI confusion
    return {
      max_users: 999,
      max_active_users: 999,
      current_user_count: 0,
      current_active_user_count: 0,
      plan_name: 'Error',
      plan_id: 0,
      subscription_status: 'UNKNOWN',
      can_create_user: true, // Fail open on error to not block operations
      can_activate_user: true,
      limit_message: 'Error loading subscription - please try again.'
    };
  }
}

/**
 * Count users for a client - always calculated dynamically
 */
async function countClientUsers(clientId: string): Promise<{ total: number; active: number }> {
  try {
    // Count all users for this client (use users_enhanced model)
    const totalCount = await prisma.users_enhanced.count({
      where: { tenant_id: clientId }
    });

    // Count active users for this client
    const activeCount = await prisma.users_enhanced.count({
      where: {
        tenant_id: clientId,
        is_active: true
      }
    });

    return { total: totalCount, active: activeCount };
  } catch (error) {
    console.error('[SubscriptionEnforcement] Error counting users:', error);
    return { total: 0, active: 0 };
  }
}

/**
 * Log subscription limit exceeded event for audit
 */
export async function logUserLimitExceeded(
  clientId: string,
  attemptedBy: number | string,
  action: 'CREATE_USER' | 'ACTIVATE_USER' | 'BULK_IMPORT',
  limits: SubscriptionLimits
): Promise<void> {
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: typeof attemptedBy === 'number' ? attemptedBy : parseInt(attemptedBy) || 0,
        action: 'USER_LIMIT_EXCEEDED',
        table_name: 'subscription_enforcement',
        record_id: 0,
        old_values: null,
      new_values: {
          event: 'USER_LIMIT_EXCEEDED',
          client_id: clientId,
          subscription_plan_id: limits.plan_id,
          plan_name: limits.plan_name,
          max_users: limits.max_users,
          current_user_count: limits.current_user_count,
          current_active_user_count: limits.current_active_user_count,
          attempted_action: action,
          attempted_by: attemptedBy,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('[SubscriptionEnforcement] Error logging limit exceeded:', error);
  }
}

/**
 * Middleware to check user creation limit
 * Use this before creating a new user
 */
export function checkUserCreationLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      
      // Get tenant_id from request body or current user
      const tenantId = req.body.tenant_id || currentUser?.tenant_id;

      if (!tenantId) {
        return next();
      }

      const limits = await getClientSubscriptionLimits(tenantId);

      if (!limits) {
        console.log('[SubscriptionEnforcement] No subscription found - allowing action');
        return next();
      }

      // Attach limits to request for downstream use
      authReq.subscriptionLimits = limits;

      if (!limits.can_create_user) {
        // Log the attempt
        await logUserLimitExceeded(tenantId, currentUser?.id || 'unknown', 'CREATE_USER', limits);

        return res.status(403).json({
          error: 'User limit reached',
          message: limits.limit_message || 'User limit reached for current subscription plan. Upgrade required.',
          subscription: {
            plan_name: limits.plan_name,
            max_users: limits.max_users,
            current_count: limits.current_user_count
          }
        });
      }

      next();
    } catch (error) {
      console.error('[SubscriptionEnforcement] Creation check error:', error);
      next();
    }
  };
}

/**
 * Middleware to check user activation limit
 * Use this before activating a deactivated user
 */
export function checkUserActivationLimit() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUser = authReq.user;
      const { id } = req.params;
      const { status } = req.body;

      // Only check when activating
      if (status !== 'active') {
        return next();
      }

      // Get the user being activated to find their tenant
      const userToActivate = await prisma.users_enhanced.findUnique({
        where: { id: id },
        select: { tenant_id: true, is_active: true }
      });

      if (!userToActivate?.tenant_id) {
        // No tenant context - skip enforcement
        return next();
      }

      // If user is already active, no need to check
      if (userToActivate.is_active) {
        return next();
      }

      const limits = await getClientSubscriptionLimits(userToActivate.tenant_id);

      if (!limits) {
        return next();
      }

      // Attach limits to request
      authReq.subscriptionLimits = limits;

      if (!limits.can_activate_user) {
        // Log the attempt
        await logUserLimitExceeded(userToActivate.tenant_id, currentUser?.id || 'unknown', 'ACTIVATE_USER', limits);

        return res.status(403).json({
          error: 'User limit reached',
          message: limits.limit_message || 'Active user limit reached for current subscription plan. Upgrade required.',
          subscription: {
            plan_name: limits.plan_name,
            max_users: limits.max_users,
            current_active_count: limits.current_active_user_count
          }
        });
      }

      next();
    } catch (error) {
      console.error('[SubscriptionEnforcement] Activation check error:', error);
      next();
    }
  };
}

/**
 * Get subscription info for UI display
 * Returns limits info for Admin UI to show capacity indicators
 */
export async function getSubscriptionInfoForUI(clientId: string) {
  const limits = await getClientSubscriptionLimits(clientId);

  if (!limits) {
    return {
      has_subscription: false,
      can_create_user: true,
      can_activate_user: true
    };
  }

  return {
    has_subscription: true,
    plan_name: limits.plan_name,
    plan_id: limits.plan_id,
    subscription_status: limits.subscription_status,
    max_users: limits.max_users,
    current_user_count: limits.current_user_count,
    current_active_user_count: limits.current_active_user_count,
    remaining_slots: limits.max_users === -1 ? 'unlimited' : Math.max(0, limits.max_users - limits.current_user_count),
    can_create_user: limits.can_create_user,
    can_activate_user: limits.can_activate_user,
    limit_message: limits.limit_message,
    usage_percentage: limits.max_users === -1 ? 0 : Math.round((limits.current_user_count / limits.max_users) * 100)
  };
}

export default {
  getClientSubscriptionLimits,
  checkUserCreationLimit,
  checkUserActivationLimit,
  logUserLimitExceeded,
  getSubscriptionInfoForUI
};
