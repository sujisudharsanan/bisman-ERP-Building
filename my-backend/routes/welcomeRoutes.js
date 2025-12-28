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
      // Fetch plans from master_subscription_plans with correct schema
      const dbPlans = await prisma.$queryRaw`
        SELECT 
          id,
          code,
          name,
          description,
          is_popular,
          status,
          sort_order,
          monthly_spend_cap,
          cfo_approval_threshold,
          grace_period_days
        FROM master_subscription_plans
        WHERE status = 'active'
        ORDER BY sort_order ASC
      `;

      // Define pricing and limits based on plan code
      const planDefaults = {
        'FREE': { price: 0, users: 3, branches: 1, storage: 1, trial: 0, approval: 1, audit: 7, support: 'Community' },
        'BASIC': { price: 999, users: 10, branches: 2, storage: 5, trial: 14, approval: 2, audit: 30, support: 'Email' },
        'STANDARD': { price: 2499, users: 25, branches: 5, storage: 25, trial: 14, approval: 3, audit: 90, support: 'Priority Email' },
        'PREMIUM': { price: 4999, users: 50, branches: 10, storage: 100, trial: 14, approval: 4, audit: 180, support: '24/7 Chat' },
        'ENTERPRISE': { price: 9999, users: -1, branches: -1, storage: 500, trial: 30, approval: 5, audit: 365, support: 'Dedicated Manager' },
      };

      const planFeatures = {
        'FREE': ['3 Users', '1 Branch', 'Basic Reports', 'Community Support'],
        'BASIC': ['10 Users', '2 Branches', 'Standard Reports', 'Email Support', 'Task Management'],
        'STANDARD': ['25 Users', '5 Branches', 'Advanced Reports', 'Priority Support', 'Workflow Automation', 'API Access'],
        'PREMIUM': ['50 Users', '10 Branches', 'Custom Reports', '24/7 Support', 'Advanced Workflows', 'Integrations', 'Audit Logs'],
        'ENTERPRISE': ['Unlimited Users', 'Unlimited Branches', 'All Features', 'Dedicated Manager', 'Custom Integrations', 'SLA Guarantee', 'SSO/SAML'],
      };

      plans = dbPlans.map(p => {
        const defaults = planDefaults[p.code] || planDefaults['BASIC'];
        const features = planFeatures[p.code] || planFeatures['BASIC'];
        
        return {
          id: p.id?.toString() || p.code?.toLowerCase(),
          code: p.code,
          name: p.name,
          description: p.description || '',
          price_monthly: defaults.price,
          price_yearly: defaults.price * 10, // 2 months free for yearly
          currency: 'INR',
          max_users: defaults.users,
          max_branches: defaults.branches,
          max_storage_gb: defaults.storage,
          trial_days: defaults.trial,
          is_active: p.status === 'active',
          is_popular: p.is_popular === true || p.code === 'STANDARD',
          features: features,
          approval_levels: defaults.approval,
          audit_retention_days: defaults.audit,
          support_tier: defaults.support,
        };
      });
    } catch (dbErr) {
      console.warn('[Welcome] Could not fetch plans from DB:', dbErr.message);
    }

    // If no plans found, use defaults (5 plans matching our schema)
    if (plans.length === 0) {
      plans = [
        {
          id: 'free',
          code: 'FREE',
          name: 'Free',
          description: 'Get started with basic features. Perfect for trying out the platform.',
          price_monthly: 0,
          price_yearly: 0,
          currency: 'INR',
          max_users: 3,
          max_branches: 1,
          max_storage_gb: 1,
          trial_days: 0,
          is_active: true,
          is_popular: false,
          features: ['3 Users', '1 Branch', 'Basic Reports', 'Community Support'],
          approval_levels: 1,
          audit_retention_days: 7,
          support_tier: 'Community',
        },
        {
          id: 'basic',
          code: 'BASIC',
          name: 'Basic',
          description: 'Essential features for small teams getting started.',
          price_monthly: 999,
          price_yearly: 9990,
          currency: 'INR',
          max_users: 10,
          max_branches: 2,
          max_storage_gb: 5,
          trial_days: 14,
          is_active: true,
          is_popular: false,
          features: ['10 Users', '2 Branches', 'Standard Reports', 'Email Support', 'Task Management'],
          approval_levels: 2,
          audit_retention_days: 30,
          support_tier: 'Email',
        },
        {
          id: 'standard',
          code: 'STANDARD',
          name: 'Standard',
          description: 'Comprehensive features for growing businesses. Best value.',
          price_monthly: 2499,
          price_yearly: 24990,
          currency: 'INR',
          max_users: 25,
          max_branches: 5,
          max_storage_gb: 25,
          trial_days: 14,
          is_active: true,
          is_popular: true,
          features: ['25 Users', '5 Branches', 'Advanced Reports', 'Priority Support', 'Workflow Automation', 'API Access'],
          approval_levels: 3,
          audit_retention_days: 90,
          support_tier: 'Priority Email',
        },
        {
          id: 'premium',
          code: 'PREMIUM',
          name: 'Premium',
          description: 'Advanced features with priority support. Ideal for established businesses.',
          price_monthly: 4999,
          price_yearly: 49990,
          currency: 'INR',
          max_users: 50,
          max_branches: 10,
          max_storage_gb: 100,
          trial_days: 14,
          is_active: true,
          is_popular: false,
          features: ['50 Users', '10 Branches', 'Custom Reports', '24/7 Support', 'Advanced Workflows', 'Integrations', 'Audit Logs'],
          approval_levels: 4,
          audit_retention_days: 180,
          support_tier: '24/7 Chat',
        },
        {
          id: 'enterprise',
          code: 'ENTERPRISE',
          name: 'Enterprise',
          description: 'Unlimited features with dedicated support. For large organizations.',
          price_monthly: 9999,
          price_yearly: 99990,
          currency: 'INR',
          max_users: -1,
          max_branches: -1,
          max_storage_gb: 500,
          trial_days: 30,
          is_active: true,
          is_popular: false,
          features: ['Unlimited Users', 'Unlimited Branches', 'All Features', 'Dedicated Manager', 'Custom Integrations', 'SLA Guarantee', 'SSO/SAML'],
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
