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
const multer = require('multer');
const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();
const { authenticate: authMiddleware } = require('../middleware/auth');

// Configure multer for file uploads (logo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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

    // Fetch active subscription plans from database (subscription_plans table)
    let plans = [];
    
    // Feature descriptions based on plan code (for display purposes)
    const planFeatures = {
      'FREE': ['Basic Reports', 'Email Support'],
      'BASIC': ['Standard Reports', 'Email Support', 'Limited API', 'Basic Customization'],
      'STANDARD': ['Advanced Reports', 'Full API', 'Moderate Customization', 'Priority Support'],
      'PREMIUM': ['Custom Reports', 'Full API + Webhooks', 'Advanced Customization', '24/7 Chat Support'],
      'ENTERPRISE': ['All Features', 'Full API + Custom', 'Full Custom Customization', 'Dedicated Support', 'Dedicated Manager'],
    };

    // Support tier based on plan code
    const planSupport = {
      'FREE': 'Email',
      'BASIC': 'Email',
      'STANDARD': 'Priority',
      'PREMIUM': '24/7 Chat',
      'ENTERPRISE': 'Dedicated',
    };

    // Approval levels based on plan code
    const planApprovalLevels = {
      'FREE': 1,
      'BASIC': 2,
      'STANDARD': 3,
      'PREMIUM': 4,
      'ENTERPRISE': 5,
    };

    // Audit retention days based on plan code
    const planAuditDays = {
      'FREE': 30,
      'BASIC': 60,
      'STANDARD': 90,
      'PREMIUM': 180,
      'ENTERPRISE': 365,
    };

    // Trial days based on plan code
    const planTrialDays = {
      'FREE': 0,
      'BASIC': 14,
      'STANDARD': 14,
      'PREMIUM': 14,
      'ENTERPRISE': 30,
    };
    
    try {
      // Fetch plans from subscription_plans table (prices are managed by Super Admin)
      const dbPlans = await prisma.$queryRaw`
        SELECT 
          id,
          plan_code,
          name,
          description,
          short_description,
          price_monthly,
          price_yearly,
          currency,
          max_users,
          max_storage_gb,
          max_branches,
          is_popular,
          is_active,
          sort_order
        FROM subscription_plans
        WHERE is_active = true
        ORDER BY sort_order ASC, price_monthly ASC
      `;

      plans = dbPlans.map(p => {
        const code = p.plan_code || 'BASIC';
        const maxUsers = Number(p.max_users) || 5;
        const maxBranches = Number(p.max_branches) || 1;
        
        return {
          id: p.id?.toString() || code.toLowerCase(),
          code: code,
          name: p.name || code,
          description: p.description || p.short_description || '',
          price_monthly: Number(p.price_monthly) || 0,
          price_yearly: Number(p.price_yearly) || 0,
          currency: p.currency || 'INR',
          max_users: maxUsers >= 9999 ? -1 : maxUsers,
          max_branches: maxBranches >= 9999 ? -1 : maxBranches,
          max_storage_gb: Number(p.max_storage_gb) || 5,
          trial_days: planTrialDays[code] || 14,
          is_active: p.is_active === true,
          is_popular: p.is_popular === true || code === 'STANDARD',
          features: planFeatures[code] || planFeatures['BASIC'],
          approval_levels: planApprovalLevels[code] || 2,
          audit_retention_days: planAuditDays[code] || 30,
          support_tier: planSupport[code] || 'Email',
        };
      });
      
      console.log('[Welcome] Loaded', plans.length, 'plans from subscription_plans table');
    } catch (dbErr) {
      console.warn('[Welcome] Could not fetch plans from subscription_plans:', dbErr.message);
    }

    // If no plans found from subscription_plans, log warning (Super Admin should configure plans)
    if (plans.length === 0) {
      console.warn('[Welcome] No plans found in subscription_plans table. Super Admin needs to configure plans.');
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
            settings: true,
            // Include active subscription from client_subscriptions table
            subscription: {
              select: { state: true, is_active: true }
            }
          }
        });

        if (client) {
          console.log('[Welcome] Found client:', client);
          tenantStatus = client.status;
          const settings = client.settings || {};
          
          // Check if client has an active subscription in client_subscriptions table
          const hasActiveSubscription = client.subscription && 
                                         client.subscription.is_active && 
                                         ['ACTIVE', 'TRIAL'].includes(client.subscription.state);
          
          console.log('[Welcome] Active subscription check:', { 
            hasSubscriptionRecord: !!client.subscription, 
            hasActiveSubscription 
          });
          
          // If client has active subscription (trial or paid), no setup needed
          if (hasActiveSubscription) {
            needsSetup = false;
            console.log('[Welcome] Client has active subscription, no setup needed');
          } else {
            // Check if workspace setup is complete
            // User needs setup if:
            // 1. settings.onboarding_completed is not true
            // 2. AND (onboarding_status is 'pending' OR no subscription plan)
            needsSetup = (settings.onboarding_completed !== true) && 
                         (client.onboarding_status === 'pending' || 
                          !client.subscriptionPlan || 
                          client.subscriptionPlan === 'trial' || 
                          client.subscriptionPlan === 'none' ||
                          client.subscriptionPlan === 'free');
          }
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
// Accepts both JSON and FormData (for logo upload)
// ============================================================================
router.post('/activate', authMiddleware, upload.single('logo'), async (req, res) => {
  try {
    const user = req.user;
    // Handle both JSON body and FormData fields
    const planId = req.body.planId;
    const planCode = req.body.planCode;
    const displayName = req.body.displayName;
    const billingCycle = req.body.billingCycle || 'monthly';
    const logoFile = req.file; // Multer parsed file

    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    if (!planCode) {
      return res.status(400).json({ success: false, error: 'Plan selection required' });
    }

    console.log(`[Welcome] Activating workspace for user ${user.id} with plan ${planCode}, displayName: ${displayName}`);
    if (logoFile) {
      console.log(`[Welcome] Logo uploaded: ${logoFile.originalname} (${logoFile.size} bytes)`);
    }

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
    console.log('[Welcome] Tenant ID:', tenantIdValue, 'Type:', typeof tenantIdValue);
    
    const isUUID = typeof tenantIdValue === 'string' && 
                   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdValue);
    console.log('[Welcome] Is UUID:', isUUID);

    // Update client with subscription
    if (isUUID) {
      // New Client model with UUID
      console.log('[Welcome] Updating Client (UUID):', tenantIdValue);
      
      let existingClient = null;
      try {
        existingClient = await prisma.client.findUnique({
          where: { id: tenantIdValue },
          select: { settings: true, name: true }
        });
        console.log('[Welcome] Found existing client:', existingClient?.name || 'No client found');
      } catch (findErr) {
        console.error('[Welcome] Error finding client:', findErr.message);
      }

      const existingSettings = existingClient?.settings || {};
      
      // Build new settings object
      const newSettings = {
        ...existingSettings,
        onboarding_completed: true,
        subscription_selected_at: new Date().toISOString(),
        subscription_plan_code: planCode,
        billing_cycle: billingCycle,
        trial_ends_at: trialEndsAt.toISOString(),
      };

      // Add display name to settings if provided
      if (displayName && displayName.trim()) {
        newSettings.display_name = displayName.trim();
      }

      // Store logo as base64 if uploaded
      if (logoFile) {
        const logoBase64 = logoFile.buffer.toString('base64');
        newSettings.logo = {
          data: `data:${logoFile.mimetype};base64,${logoBase64}`,
          filename: logoFile.originalname,
          size: logoFile.size,
          uploadedAt: new Date().toISOString(),
        };
      }

      // Use raw SQL to bypass Prisma and avoid trigger issues with "key" ambiguity
      try {
        const tradeName = (displayName && displayName.trim()) ? displayName.trim() : existingClient?.name || 'Organization';
        
        // Update client fields one by one to avoid trigger issues
        await prisma.$executeRawUnsafe(
          `UPDATE clients SET "subscriptionPlan" = $1, "subscriptionStatus" = 'trial', onboarding_status = 'completed', trial_start_date = NOW(), trial_end_date = $2, status = 'Active', trade_name = $3, updated_at = NOW() WHERE id = $4::uuid`,
          planCode.toLowerCase(), trialEndsAt, tradeName, tenantIdValue
        );
        console.log('[Welcome] Client updated successfully via raw SQL');
        
      } catch (rawErr1) {
        console.warn('[Welcome] Raw SQL update failed:', rawErr1.message);
        
        // Try individual field updates as fallback
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE clients SET "subscriptionPlan" = $1 WHERE id = $2::uuid`,
            planCode.toLowerCase(), tenantIdValue
          );
          await prisma.$executeRawUnsafe(
            `UPDATE clients SET "subscriptionStatus" = 'trial' WHERE id = $1::uuid`,
            tenantIdValue
          );
          await prisma.$executeRawUnsafe(
            `UPDATE clients SET onboarding_status = 'completed' WHERE id = $1::uuid`,
            tenantIdValue
          );
          await prisma.$executeRawUnsafe(
            `UPDATE clients SET status = 'Active' WHERE id = $1::uuid`,
            tenantIdValue
          );
          console.log('[Welcome] Client updated via individual field updates');
        } catch (rawErr2) {
          console.error('[Welcome] Individual field updates also failed:', rawErr2.message);
          // Continue anyway - the user will still be redirected
        }
      }

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
    console.error('[Welcome] Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to activate workspace',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router;
