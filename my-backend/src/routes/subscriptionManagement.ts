/**
 * Subscription Management API Routes
 * 
 * Super Admin only - manages subscription plans and client assignments.
 * 
 * Routes:
 * - GET    /api/super-admin/subscriptions/plans           - List all subscription plans
 * - GET    /api/super-admin/subscriptions/plans/:id       - Get plan details
 * - POST   /api/super-admin/subscriptions/plans           - Create new plan
 * - PUT    /api/super-admin/subscriptions/plans/:id       - Update plan
 * - DELETE /api/super-admin/subscriptions/plans/:id       - Delete plan
 * - GET    /api/super-admin/subscriptions/clients         - List clients with subscription info
 * - PUT    /api/super-admin/subscriptions/clients/:id     - Assign/update client subscription
 * - GET    /api/super-admin/subscriptions/clients/:id/usage - Get client usage stats
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { getClientSubscriptionLimits } from '../middleware/subscriptionEnforcement';

const router = Router();
const prisma = new PrismaClient();

// Middleware to check Super Admin role
const requireSuperAdmin = (req: Request, res: Response, next: Function) => {
  const userRole = (req as any).user?.role;
  const userType = (req as any).user?.userType;
  
  if (userType !== 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Only Super Admin can manage subscriptions'
    });
  }
  next();
};

// ============================================================================
// SUBSCRIPTION PLANS MANAGEMENT
// ============================================================================

/**
 * List all subscription plans
 * GET /api/super-admin/subscriptions/plans
 */
router.get('/plans', authMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { active_only } = req.query;

    const where = active_only === 'true' ? { is_active: true } : {};

    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: { sort_order: 'asc' },
      include: {
        _count: {
          select: { subscriptions: true }
        }
      }
    });

    res.json({
      success: true,
      data: plans.map(plan => ({
        ...plan,
        client_count: plan._count.subscriptions
      }))
    });
  } catch (error: any) {
    console.error('List subscription plans error:', error);
    res.status(500).json({
      error: 'Failed to list subscription plans',
      details: error.message
    });
  }
});

/**
 * Get subscription plan details
 * GET /api/super-admin/subscriptions/plans/:id
 */
router.get('/plans/:id', authMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: parseInt(id) },
      include: {
        subscriptions: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                client_code: true
              }
            }
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error: any) {
    console.error('Get subscription plan error:', error);
    res.status(500).json({
      error: 'Failed to get subscription plan',
      details: error.message
    });
  }
});

/**
 * Create new subscription plan
 * POST /api/super-admin/subscriptions/plans
 */
router.post('/plans', authMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const {
      plan_code,
      name,
      description,
      short_description,
      badge_text,
      price_monthly,
      price_yearly,
      currency = 'INR',
      max_users,
      max_storage_gb = 5,
      max_branches = 1,
      max_api_calls_day = 0,
      feature_flags = {},
      sort_order = 0,
      is_popular = false,
      is_enterprise = false,
      is_active = true,
      is_public = true,
      cta_text = 'Get Started',
      cta_action = 'subscribe'
    } = req.body;

    // Validation
    if (!plan_code || !name) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'plan_code and name are required'
      });
    }

    if (max_users === undefined || max_users === null) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'max_users is required (use -1 for unlimited)'
      });
    }

    // Check if plan_code already exists
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { plan_code }
    });

    if (existing) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'A plan with this plan_code already exists'
      });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        plan_code,
        name,
        description,
        short_description,
        badge_text,
        price_monthly: price_monthly || 0,
        price_yearly: price_yearly || 0,
        currency,
        max_users,
        max_storage_gb,
        max_branches,
        max_api_calls_day,
        feature_flags,
        sort_order,
        is_popular,
        is_enterprise,
        is_active,
        is_public,
        cta_text,
        cta_action
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: (req as any).user?.id || 0,
        action: 'CREATE_SUBSCRIPTION_PLAN',
        table_name: 'subscription_plans',
        record_id: plan.id,
        new_values: {
          plan_code,
          name,
          max_users
        }
      }
    });

    res.status(201).json({
      success: true,
      data: plan,
      message: 'Subscription plan created successfully'
    });
  } catch (error: any) {
    console.error('Create subscription plan error:', error);
    res.status(500).json({
      error: 'Failed to create subscription plan',
      details: error.message
    });
  }
});

/**
 * Update subscription plan
 * PUT /api/super-admin/subscriptions/plans/:id
 */
router.put('/plans/:id', authMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      short_description,
      badge_text,
      price_monthly,
      price_yearly,
      max_users,
      max_storage_gb,
      max_branches,
      max_api_calls_day,
      feature_flags,
      sort_order,
      is_popular,
      is_enterprise,
      is_active,
      is_public,
      cta_text,
      cta_action
    } = req.body;

    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (short_description !== undefined) updateData.short_description = short_description;
    if (badge_text !== undefined) updateData.badge_text = badge_text;
    if (price_monthly !== undefined) updateData.price_monthly = price_monthly;
    if (price_yearly !== undefined) updateData.price_yearly = price_yearly;
    if (max_users !== undefined) updateData.max_users = max_users;
    if (max_storage_gb !== undefined) updateData.max_storage_gb = max_storage_gb;
    if (max_branches !== undefined) updateData.max_branches = max_branches;
    if (max_api_calls_day !== undefined) updateData.max_api_calls_day = max_api_calls_day;
    if (feature_flags !== undefined) updateData.feature_flags = feature_flags;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_popular !== undefined) updateData.is_popular = is_popular;
    if (is_enterprise !== undefined) updateData.is_enterprise = is_enterprise;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (cta_text !== undefined) updateData.cta_text = cta_text;
    if (cta_action !== undefined) updateData.cta_action = cta_action;

    const plan = await prisma.subscriptionPlan.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: (req as any).user?.id || 0,
        action: 'UPDATE_SUBSCRIPTION_PLAN',
        table_name: 'subscription_plans',
        record_id: plan.id,
        old_values: { max_users: existing.max_users },
        new_values: { max_users: plan.max_users }
      }
    });

    res.json({
      success: true,
      data: plan,
      message: 'Subscription plan updated successfully'
    });
  } catch (error: any) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({
      error: 'Failed to update subscription plan',
      details: error.message
    });
  }
});

/**
 * Delete subscription plan
 * DELETE /api/super-admin/subscriptions/plans/:id
 */
router.delete('/plans/:id', authMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: { select: { subscriptions: true } }
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Don't delete if clients are using this plan
    if (existing._count.subscriptions > 0) {
      return res.status(400).json({
        error: 'Cannot delete plan',
        message: `This plan is used by ${existing._count.subscriptions} client(s). Deactivate it instead.`
      });
    }

    await prisma.subscriptionPlan.delete({
      where: { id: parseInt(id) }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: (req as any).user?.id || 0,
        action: 'DELETE_SUBSCRIPTION_PLAN',
        table_name: 'subscription_plans',
        record_id: parseInt(id),
        old_values: { plan_code: existing.plan_code, name: existing.name }
      }
    });

    res.json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete subscription plan error:', error);
    res.status(500).json({
      error: 'Failed to delete subscription plan',
      details: error.message
    });
  }
});

// ============================================================================
// CLIENT SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * List clients with subscription info
 * GET /api/super-admin/subscriptions/clients
 */
router.get('/clients', authMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        client_code: true,
        email: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscription: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                plan_code: true,
                max_users: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Enrich with current usage
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const limits = await getClientSubscriptionLimits(client.id);
        return {
          ...client,
          usage: limits ? {
            current_users: limits.current_user_count,
            current_active_users: limits.current_active_user_count,
            max_users: limits.max_users,
            can_create_user: limits.can_create_user,
            usage_percentage: limits.max_users === -1 ? 0 : Math.round((limits.current_user_count / limits.max_users) * 100)
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: enrichedClients
    });
  } catch (error: any) {
    console.error('List clients with subscriptions error:', error);
    res.status(500).json({
      error: 'Failed to list clients',
      details: error.message
    });
  }
});

/**
 * Assign or update client subscription
 * PUT /api/super-admin/subscriptions/clients/:id
 * 
 * IMPORTANT: Changing subscription does NOT modify users or RBAC.
 * It only changes enforcement rules.
 */
router.put('/clients/:id', authMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // client_id (UUID)
    const { 
      plan_id,
      subscription_status // 'ACTIVE', 'SUSPENDED', 'CANCELLED'
    } = req.body;

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id },
      include: { subscription: true }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Verify plan exists
    if (plan_id) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: plan_id }
      });

      if (!plan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }
    }

    let subscription;
    const previousState = client.subscription?.state || null;

    if (client.subscription) {
      // Update existing subscription
      const updateData: any = {};
      if (plan_id !== undefined) updateData.plan_id = plan_id;
      if (subscription_status !== undefined) {
        updateData.state = subscription_status;
        updateData.previous_state = previousState;
        updateData.state_changed_at = new Date();
      }

      subscription = await prisma.clientSubscription.update({
        where: { client_id: id },
        data: updateData,
        include: { plan: true }
      });
    } else {
      // Create new subscription
      subscription = await prisma.clientSubscription.create({
        data: {
          client_id: id,
          plan_id: plan_id || 1, // Default to first plan if not specified
          state: subscription_status || 'ACTIVE'
        },
        include: { plan: true }
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        user_id: (req as any).user?.id || 0,
        action: 'UPDATE_CLIENT_SUBSCRIPTION',
        table_name: 'client_subscriptions',
        record_id: subscription.id,
        old_values: previousState ? { state: previousState } : null,
        new_values: {
          plan_id: subscription.plan_id,
          plan_name: subscription.plan.name,
          state: subscription.state
        }
      }
    });

    res.json({
      success: true,
      data: subscription,
      message: 'Client subscription updated successfully'
    });
  } catch (error: any) {
    console.error('Update client subscription error:', error);
    res.status(500).json({
      error: 'Failed to update client subscription',
      details: error.message
    });
  }
});

/**
 * Get client usage stats
 * GET /api/super-admin/subscriptions/clients/:id/usage
 */
router.get('/clients/:id/usage', authMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        subscription: {
          include: { plan: true }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const limits = await getClientSubscriptionLimits(id);

    res.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          client_code: client.client_code
        },
        subscription: client.subscription ? {
          plan_id: client.subscription.plan_id,
          plan_name: client.subscription.plan.name,
          state: client.subscription.state,
          max_users: client.subscription.plan.max_users
        } : null,
        usage: limits ? {
          current_users: limits.current_user_count,
          current_active_users: limits.current_active_user_count,
          max_users: limits.max_users,
          remaining_slots: limits.max_users === -1 ? 'unlimited' : Math.max(0, limits.max_users - limits.current_user_count),
          can_create_user: limits.can_create_user,
          can_activate_user: limits.can_activate_user,
          usage_percentage: limits.max_users === -1 ? 0 : Math.round((limits.current_user_count / limits.max_users) * 100),
          limit_message: limits.limit_message
        } : null
      }
    });
  } catch (error: any) {
    console.error('Get client usage error:', error);
    res.status(500).json({
      error: 'Failed to get client usage',
      details: error.message
    });
  }
});

export default router;
