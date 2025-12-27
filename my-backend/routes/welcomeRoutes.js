/**
 * Welcome / Workspace Setup Routes
 * 
 * Handles the mandatory subscription selection gate after first login:
 * - GET /api/welcome/plans - List available subscription plans
 * - GET /api/welcome/status - Check if user needs to complete workspace setup
 * - POST /api/welcome/activate - Bind subscription and unlock workspace
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();
const { authenticate: authMiddleware } = require('../middleware/auth');

// ============================================================================
// GET /api/welcome/plans
// Returns available subscription plans for new tenant selection
// ============================================================================
router.get('/plans', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    let organizationName = 'Your Organization';
    
    // Get tenant/organization name
    const tenantIdValue = user?.tenant_id || user?.tenantId;
    if (tenantIdValue) {
      // Check if UUID (new Client model)
      const isUUID = typeof tenantIdValue === 'string' && 
                     /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdValue);
      
      if (isUUID) {
        const client = await prisma.client.findUnique({
          where: { id: tenantIdValue },
          select: { name: true, trade_name: true }
        });
        if (client) {
          organizationName = client.trade_name || client.name || organizationName;
        }
      }
    }

    // Fetch active subscription plans from database
    let plans = [];
    
    try {
      // Try master_subscription_plans table first
      const dbPlans = await prisma.$queryRaw`
        SELECT 
          id,
          code,
          name,
          description,
          price_monthly,
          price_yearly,
          currency,
          max_users,
          max_branches,
          max_storage_gb,
          trial_days,
          is_active,
          is_popular,
          features,
          governance_rules
        FROM master_subscription_plans
        WHERE is_active = true
        ORDER BY sort_order ASC, price_monthly ASC
      `;

      plans = dbPlans.map(p => ({
        id: p.id?.toString() || p.code?.toLowerCase(),
        code: p.code,
        name: p.name,
        description: p.description || '',
        price_monthly: Number(p.price_monthly) || 0,
        price_yearly: Number(p.price_yearly) || 0,
        currency: p.currency || 'INR',
        max_users: Number(p.max_users) || 5,
        max_branches: Number(p.max_branches) || 1,
        max_storage_gb: Number(p.max_storage_gb) || 5,
        trial_days: Number(p.trial_days) || 14,
        is_active: p.is_active !== false,
        is_popular: p.is_popular === true,
        features: Array.isArray(p.features) ? p.features : [],
        approval_levels: p.governance_rules?.approval_depth || 1,
        audit_retention_days: p.governance_rules?.audit_retention_days || 30,
        support_tier: p.governance_rules?.support_tier || 'Email',
      }));
    } catch (dbErr) {
      console.warn('[Welcome] Could not fetch plans from DB:', dbErr.message);
    }

    // If no plans found, use defaults
    if (plans.length === 0) {
      plans = [
        {
          id: 'starter',
          code: 'STARTER',
          name: 'Starter',
          description: 'Perfect for small teams getting started',
          price_monthly: 999,
          price_yearly: 9990,
          currency: 'INR',
          max_users: 5,
          max_branches: 1,
          max_storage_gb: 5,
          trial_days: 14,
          is_active: true,
          is_popular: false,
          features: ['Basic Reports', 'Email Support', '5 Users', '1 Branch'],
          approval_levels: 1,
          audit_retention_days: 30,
          support_tier: 'Email',
        },
        {
          id: 'professional',
          code: 'PROFESSIONAL',
          name: 'Professional',
          description: 'For growing businesses with advanced needs',
          price_monthly: 2999,
          price_yearly: 29990,
          currency: 'INR',
          max_users: 25,
          max_branches: 5,
          max_storage_gb: 50,
          trial_days: 14,
          is_active: true,
          is_popular: true,
          features: ['Advanced Reports', 'Priority Support', '25 Users', '5 Branches', 'API Access'],
          approval_levels: 3,
          audit_retention_days: 90,
          support_tier: '24/7 Chat',
        },
        {
          id: 'enterprise',
          code: 'ENTERPRISE',
          name: 'Enterprise',
          description: 'Full control for large organizations',
          price_monthly: 9999,
          price_yearly: 99990,
          currency: 'INR',
          max_users: -1,
          max_branches: -1,
          max_storage_gb: 500,
          trial_days: 14,
          is_active: true,
          is_popular: false,
          features: ['All Features', 'Dedicated Manager', 'Unlimited Users', 'Unlimited Branches', 'Custom Integrations', 'SLA Guarantee'],
          approval_levels: 5,
          audit_retention_days: 365,
          support_tier: 'Dedicated Manager',
        },
      ];
    }

    res.json({
      success: true,
      plans,
      organizationName,
    });
  } catch (error) {
    console.error('[Welcome] Get plans error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch plans' });
  }
});

// ============================================================================
// GET /api/welcome/status
// Check if the current user/tenant needs to complete workspace setup
// ============================================================================
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ success: false, needsSetup: true, error: 'Not authenticated' });
    }

    console.log('[Welcome] Checking status for user:', { id: user.id, tenant_id: user.tenant_id, tenantId: user.tenantId });

    // Check if tenant has completed onboarding
    let needsSetup = false;
    let tenantStatus = null;

    // tenant_id can be UUID (new Client model) or integer (old models)
    const tenantIdValue = user.tenant_id || user.tenantId;
    
    if (tenantIdValue) {
      // Check if it's a UUID format (for new Client model)
      const isUUID = typeof tenantIdValue === 'string' && 
                     /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdValue);
      
      if (isUUID) {
        // New signup flow - tenant_id is UUID pointing to Client table
        console.log('[Welcome] Checking Client (UUID) for tenant_id:', tenantIdValue);
        const client = await prisma.client.findUnique({
          where: { id: tenantIdValue },
          select: { 
            status: true, 
            subscriptionPlan: true,
            subscriptionStatus: true,
            onboarding_status: true,
            settings: true 
          }
        });

        if (client) {
          console.log('[Welcome] Found client:', client);
          tenantStatus = client.status;
          const settings = client.settings || {};
          // Check if workspace setup is complete
          // User needs setup if:
          // 1. onboarding_status is 'pending' or null
          // 2. OR no subscription plan selected (trial/none/null/free)
          // 3. AND settings.onboarding_completed is not true
          needsSetup = (settings.onboarding_completed !== true) && 
                       (client.onboarding_status === 'pending' || 
                        !client.subscriptionPlan || 
                        client.subscriptionPlan === 'trial' || 
                        client.subscriptionPlan === 'none' ||
                        client.subscriptionPlan === 'free');
          console.log('[Welcome] needsSetup:', needsSetup);
        }
      } else {
        // Old flow - try Client table with integer ID (legacy)
        try {
          const clientId = typeof tenantIdValue === 'string' ? parseInt(tenantIdValue, 10) : tenantIdValue;
          if (!isNaN(clientId)) {
            // Note: Client.id is UUID, so this path is for legacy integer tenant IDs
            // For now, skip this check as Client uses UUID - old tenants would need migration
            console.log('[Welcome] Legacy integer tenant_id detected:', clientId);
            // Skip needsSetup for legacy users - they should already be set up
            needsSetup = false;
          }
        } catch (clientErr) {
          console.warn('[Welcome] Could not handle legacy tenant:', clientErr.message);
        }
      }
    }

    console.log('[Welcome] Final status:', { needsSetup, tenantStatus });
    
    res.json({
      success: true,
      needsSetup,
      status: tenantStatus,
    });
  } catch (error) {
    console.error('[Welcome] Get status error:', error);
    res.status(500).json({ success: false, needsSetup: false, error: 'Failed to check status' });
  }
});

// ============================================================================
// POST /api/welcome/activate
// Bind subscription, unlock workspace, and redirect to admin dashboard
// ============================================================================
router.post('/activate', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { planId, planCode } = req.body;

    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (!planCode) {
      return res.status(400).json({ success: false, error: 'Plan selection required' });
    }

    console.log(`[Welcome] Activating workspace for user ${user.id} with plan ${planCode}`);

    // Fetch the selected plan details
    let plan = null;
    try {
      const plans = await prisma.$queryRaw`
        SELECT * FROM master_subscription_plans WHERE code = ${planCode.toUpperCase()} LIMIT 1
      `;
      if (plans && plans.length > 0) {
        plan = plans[0];
      }
    } catch (dbErr) {
      console.warn('[Welcome] Could not fetch plan from DB:', dbErr.message);
    }

    // Calculate trial end date
    const trialDays = plan?.trial_days || 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Get tenant ID (could be UUID or legacy integer)
    const tenantIdValue = user.tenant_id || user.tenantId;
    const isUUID = typeof tenantIdValue === 'string' && 
                   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdValue);

    // Update client with subscription
    if (isUUID) {
      // New Client model with UUID
      console.log('[Welcome] Updating Client (UUID):', tenantIdValue);
      
      const existingClient = await prisma.client.findUnique({
        where: { id: tenantIdValue },
        select: { settings: true }
      });

      const existingSettings = existingClient?.settings || {};
      
      await prisma.client.update({
        where: { id: tenantIdValue },
        data: {
          subscriptionPlan: planCode.toLowerCase(),
          subscriptionStatus: 'trial',
          onboarding_status: 'completed',
          trial_start_date: new Date(),
          trial_end_date: trialEndsAt,
          status: 'Active',
          settings: {
            ...existingSettings,
            onboarding_completed: true,
            subscription_selected_at: new Date().toISOString(),
            subscription_plan_code: planCode,
            trial_ends_at: trialEndsAt.toISOString(),
          }
        }
      });

      // Create client subscription record if table exists
      try {
        await prisma.$executeRaw`
          INSERT INTO client_subscriptions (
            client_id, plan_id, plan_code, status, 
            trial_start, trial_end, 
            created_at, updated_at
          ) VALUES (
            ${tenantIdValue}::uuid, 
            ${planId || plan?.id || 1}, 
            ${planCode.toUpperCase()}, 
            'trial',
            NOW(), 
            ${trialEndsAt}::timestamp,
            NOW(), 
            NOW()
          )
          ON CONFLICT (client_id) DO UPDATE SET
            plan_id = EXCLUDED.plan_id,
            plan_code = EXCLUDED.plan_code,
            status = 'trial',
            trial_end = EXCLUDED.trial_end,
            updated_at = NOW()
        `;
      } catch (subErr) {
        console.warn('[Welcome] Could not create subscription record:', subErr.message);
      }
    } else if (tenantIdValue) {
      // Legacy integer-based client
      console.log('[Welcome] Legacy tenant ID (skipping update):', tenantIdValue);
    }

    // Ensure user has ADMIN role
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: 'ADMIN',
          is_active: true,
          updated_at: new Date(),
        }
      });
    } catch (userErr) {
      console.warn('[Welcome] Could not update user role:', userErr.message);
    }

    // Log audit event
    try {
      await prisma.$executeRaw`
        INSERT INTO audit_log (
          action, entity_type, entity_id, 
          user_id, tenant_id, 
          details, created_at
        ) VALUES (
          'SUBSCRIPTION_SELECTED', 
          'tenant', 
          ${user.tenant_id || user.tenantId?.toString() || 'unknown'},
          ${user.id},
          ${user.tenant_id || null}::uuid,
          ${JSON.stringify({ planCode, planId, trialDays, trialEndsAt: trialEndsAt.toISOString() })}::jsonb,
          NOW()
        )
      `;
    } catch (auditErr) {
      console.warn('[Welcome] Could not log audit event:', auditErr.message);
    }

    console.log(`[Welcome] Workspace activated successfully for user ${user.id}`);

    res.json({
      success: true,
      message: 'Workspace activated successfully',
      redirectTo: '/admin',
      subscription: {
        planCode,
        trialDays,
        trialEndsAt: trialEndsAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('[Welcome] Activate error:', error);
    res.status(500).json({ success: false, error: 'Failed to activate workspace' });
  }
});

module.exports = router;
