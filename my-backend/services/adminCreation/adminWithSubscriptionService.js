/**
 * BISMAN ERP - Admin Creation with Subscription Assignment Service
 * 
 * Handles the complete workflow of creating an admin with:
 * - Organization/Tenant creation
 * - Subscription plan attachment
 * - Feature flags initialization
 * - Usage counters initialization
 * - Quotas based on plan
 * 
 * @module services/adminCreation/adminWithSubscriptionService
 */

const bcrypt = require('bcryptjs');
const { getPrisma } = require('../../lib/prisma');
const { PLAN_FEATURE_DEFAULTS } = require('../../lib/featureFlags');

// ============================================================================
// PLAN CONFIGURATIONS
// ============================================================================

const SUBSCRIPTION_PLANS = {
  BASIC: {
    code: 'BASIC',
    name: 'Basic',
    description: 'Essential features for small teams',
    max_users: 5,
    max_storage_gb: 5,
    max_branches: 1,
    max_api_calls_day: 0,
    price_monthly: 999,
    price_yearly: 9990,
    trial_days: 14,
    features: PLAN_FEATURE_DEFAULTS.STARTER || {},
  },
  STANDARD: {
    code: 'STANDARD',
    name: 'Standard',
    description: 'Advanced features for growing teams',
    max_users: 25,
    max_storage_gb: 50,
    max_branches: 5,
    max_api_calls_day: 10000,
    price_monthly: 2999,
    price_yearly: 29990,
    trial_days: 14,
    features: PLAN_FEATURE_DEFAULTS.PROFESSIONAL || {},
  },
  PRO: {
    code: 'PRO',
    name: 'Professional',
    description: 'Full-featured solution for established businesses',
    max_users: 100,
    max_storage_gb: 200,
    max_branches: 20,
    max_api_calls_day: 50000,
    price_monthly: 9999,
    price_yearly: 99990,
    trial_days: 14,
    features: PLAN_FEATURE_DEFAULTS.BUSINESS || {},
  },
  ENTERPRISE: {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Unlimited features for large organizations',
    max_users: -1, // Unlimited
    max_storage_gb: -1, // Unlimited
    max_branches: -1, // Unlimited
    max_api_calls_day: -1, // Unlimited
    price_monthly: 0, // Custom pricing
    price_yearly: 0, // Custom pricing
    trial_days: 30,
    features: PLAN_FEATURE_DEFAULTS.ENTERPRISE || {},
  },
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate admin creation input
 */
function validateAdminInput(data) {
  const errors = [];

  // Required fields
  if (!data.adminName || data.adminName.trim().length < 2) {
    errors.push('Admin name must be at least 2 characters');
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email address is required');
  }

  if (!data.password || data.password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }

  // Password complexity check
  if (data.password) {
    if (!/[A-Z]/.test(data.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(data.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(data.password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  if (!data.organizationName || data.organizationName.trim().length < 2) {
    errors.push('Organization name must be at least 2 characters');
  }

  if (!data.subscriptionPlan || !SUBSCRIPTION_PLANS[data.subscriptionPlan]) {
    errors.push('Valid subscription plan is required (BASIC, STANDARD, PRO, ENTERPRISE)');
  }

  if (!data.billingCycle || !['MONTHLY', 'YEARLY'].includes(data.billingCycle)) {
    errors.push('Billing cycle must be MONTHLY or YEARLY');
  }

  return errors;
}

/**
 * Check if email is already registered
 */
async function checkEmailExists(email) {
  const prisma = getPrisma();
  
  // Check in Users table
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (existingUser) {
    return { exists: true, type: 'user' };
  }

  // Check in SuperAdmin table
  const existingSuperAdmin = await prisma.super_admins.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });

  if (existingSuperAdmin) {
    return { exists: true, type: 'super_admin' };
  }

  return { exists: false };
}

// ============================================================================
// CORE SERVICE FUNCTIONS
// ============================================================================

/**
 * Create Admin with Organization and Subscription
 * 
 * @param {Object} data - Admin creation data
 * @param {string} data.adminName - Admin's full name
 * @param {string} data.email - Admin's email address
 * @param {string} data.password - Admin's password
 * @param {string} data.organizationName - Organization/Tenant name
 * @param {string} data.subscriptionPlan - Plan code (BASIC, STANDARD, PRO, ENTERPRISE)
 * @param {string} data.billingCycle - MONTHLY or YEARLY
 * @param {Date} data.billingStartDate - When billing starts
 * @param {Object} options - Additional options
 * @param {number} options.createdBy - ID of the user creating this admin
 * @param {string} options.createdByRole - Role of the creator
 * @returns {Object} Created admin, organization, and subscription details
 */
async function createAdminWithSubscription(data, options = {}) {
  const prisma = getPrisma();
  
  // Validate input
  const validationErrors = validateAdminInput(data);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  // Check email uniqueness
  const emailCheck = await checkEmailExists(data.email);
  if (emailCheck.exists) {
    throw new Error(`Email is already registered as a ${emailCheck.type}`);
  }

  // Get plan configuration
  const planConfig = SUBSCRIPTION_PLANS[data.subscriptionPlan];
  if (!planConfig) {
    throw new Error(`Invalid subscription plan: ${data.subscriptionPlan}`);
  }

  // Find or create the subscription plan in database
  let subscriptionPlan = await prisma.subscriptionPlan.findUnique({
    where: { plan_code: planConfig.code },
  });

  if (!subscriptionPlan) {
    // Create the plan if it doesn't exist
    subscriptionPlan = await prisma.subscriptionPlan.create({
      data: {
        plan_code: planConfig.code,
        name: planConfig.name,
        description: planConfig.description,
        price_monthly: planConfig.price_monthly,
        price_yearly: planConfig.price_yearly,
        max_users: planConfig.max_users,
        max_storage_gb: planConfig.max_storage_gb,
        max_branches: planConfig.max_branches,
        max_api_calls_day: planConfig.max_api_calls_day,
        feature_flags: planConfig.features,
        is_active: true,
        is_public: true,
      },
    });
  }

  // Calculate trial dates
  const trialDays = planConfig.trial_days;
  const trialStartDate = data.billingStartDate ? new Date(data.billingStartDate) : new Date();
  const trialEndDate = new Date(trialStartDate.getTime() + trialDays * 24 * 60 * 60 * 1000);

  // Generate unique client code
  const clientCode = await generateClientCode(data.organizationName);

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Create everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create SuperAdmin entry first (if needed for the hierarchy)
    let superAdmin;
    if (options.createdBy && options.createdByRole === 'ENTERPRISE_ADMIN') {
      superAdmin = await tx.superAdmin.create({
        data: {
          name: data.adminName,
          email: data.email,
          password_hash: passwordHash,
          productType: data.productType || 'BUSINESS_ERP',
          is_active: true,
          created_by: options.createdBy,
        },
      });
    }

    // 2. Create the Organization/Client (Tenant)
    const organization = await tx.client.create({
      data: {
        name: data.organizationName,
        client_code: clientCode,
        legal_name: data.organizationName,
        client_type: 'Organization',
        status: 'Active',
        onboarding_status: 'pending',
        productType: data.productType || 'BUSINESS_ERP',
        super_admin_id: superAdmin?.id || options.superAdminId || 1, // Default to 1 if no super admin
        subscriptionPlan: planConfig.code,
        subscriptionStatus: 'trial',
        is_active: true,
        trial_start_date: trialStartDate,
        trial_end_date: trialEndDate,
        settings: {
          timezone: data.timezone || 'Asia/Kolkata',
          currency: data.currency || 'INR',
          dateFormat: data.dateFormat || 'DD/MM/YYYY',
          locale: data.locale || 'en-IN',
        },
        modules_enabled: getEnabledModulesByPlan(planConfig.code),
      },
    });

    // 3. Create the Client Subscription
    const subscription = await tx.clientSubscription.create({
      data: {
        client_id: organization.id,
        plan_id: subscriptionPlan.id,
        state: 'TRIAL',
        billing_cycle: data.billingCycle,
        trial_start_date: trialStartDate,
        trial_end_date: trialEndDate,
        current_period_start: trialStartDate,
        current_period_end: trialEndDate,
        next_billing_date: trialEndDate,
        current_user_count: 1, // Starting with the admin
        current_storage_used: 0,
        current_api_calls: 0,
        is_active: true,
      },
      include: {
        plan: true,
      },
    });

    // 4. Create the Admin User
    const adminRole = await tx.rbac_roles.findFirst({
      where: { name: { in: ['ADMIN', 'CLIENT_ADMIN', 'admin'] } },
    });

    const adminUser = await tx.user.create({
      data: {
        username: data.adminName,
        email: data.email,
        password_hash: passwordHash,
        role: 'ADMIN',
        role_id: adminRole?.id || null,
        clientId: organization.id,
        business_level: 10, // Highest level for admin
        is_active: true,
        email_verified: false,
        must_change_password: true,
        created_by: options.createdBy?.toString() || 'system',
      },
    });

    // 5. Assign RBAC role if available
    if (adminRole) {
      await tx.rbac_user_roles.create({
        data: {
          user_id: adminUser.id,
          role_id: adminRole.id,
          is_active: true,
        },
      });
    }

    // 6. Create initial audit log
    await tx.subscriptionAuditLog.create({
      data: {
        client_id: organization.id,
        subscription_id: subscription.id,
        action: 'subscription_created',
        action_category: 'lifecycle',
        new_values: {
          plan_code: planConfig.code,
          billing_cycle: data.billingCycle,
          trial_days: trialDays,
          admin_email: data.email,
        },
        reason: 'New organization created with subscription',
        actor_type: options.createdByRole || 'system',
        actor_id: options.createdBy || null,
      },
    });

    // 7. Log activity
    await tx.recent_activity.create({
      data: {
        user_id: adminUser.id,
        username: data.adminName,
        action: 'CREATE',
        entity: 'organization',
        entity_id: organization.id,
        details: {
          organizationName: data.organizationName,
          subscriptionPlan: planConfig.code,
          billingCycle: data.billingCycle,
          adminEmail: data.email,
        },
      },
    });

    return {
      organization,
      subscription,
      adminUser,
      superAdmin,
    };
  });

  // Return formatted response
  return {
    ok: true,
    admin: {
      id: result.adminUser.id,
      name: result.adminUser.username,
      email: result.adminUser.email,
      role: result.adminUser.role,
    },
    organization: {
      id: result.organization.id,
      name: result.organization.name,
      clientCode: result.organization.client_code,
      subscriptionPlan: planConfig.code,
      subscriptionStatus: 'trial',
    },
    subscription: {
      id: result.subscription.id,
      state: result.subscription.state,
      plan: {
        code: planConfig.code,
        name: planConfig.name,
        maxUsers: planConfig.max_users,
        maxStorageGb: planConfig.max_storage_gb,
        maxBranches: planConfig.max_branches,
      },
      billingCycle: result.subscription.billing_cycle,
      trialEndDate: result.subscription.trial_end_date,
      nextBillingDate: result.subscription.next_billing_date,
    },
    features: planConfig.features,
    limits: {
      maxUsers: planConfig.max_users,
      maxStorageGb: planConfig.max_storage_gb,
      maxBranches: planConfig.max_branches,
      maxApiCallsDay: planConfig.max_api_calls_day,
    },
    trialInfo: {
      startDate: result.subscription.trial_start_date,
      endDate: result.subscription.trial_end_date,
      daysRemaining: trialDays,
    },
  };
}

/**
 * Generate unique client code
 */
async function generateClientCode(organizationName) {
  const prisma = getPrisma();
  const prefix = organizationName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 3)
    .padEnd(3, 'X');
  
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Find the last sequence number for this prefix
  const lastClient = await prisma.clients.findFirst({
    where: {
      client_code: { startsWith: `${prefix}${year}` },
    },
    orderBy: { client_code: 'desc' },
  });

  let sequence = 1;
  if (lastClient?.client_code) {
    const lastSeq = parseInt(lastClient.client_code.slice(-4), 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${year}${sequence.toString().padStart(4, '0')}`;
}

/**
 * Get enabled modules by plan
 */
function getEnabledModulesByPlan(planCode) {
  const baseModules = ['dashboard', 'profile', 'settings', 'notifications'];
  
  const planModules = {
    BASIC: [...baseModules, 'tasks', 'contacts'],
    STANDARD: [...baseModules, 'tasks', 'contacts', 'reports', 'finance', 'inventory'],
    PRO: [...baseModules, 'tasks', 'contacts', 'reports', 'finance', 'inventory', 'analytics', 'automation', 'api'],
    ENTERPRISE: [...baseModules, 'tasks', 'contacts', 'reports', 'finance', 'inventory', 'analytics', 'automation', 'api', 'compliance', 'audit', 'sso', 'white-label'],
  };

  return planModules[planCode] || baseModules;
}

/**
 * Get available subscription plans
 * First tries to fetch from database, falls back to static plans
 */
async function getAvailablePlans() {
  const prisma = getPrisma();
  
  try {
    // Try to fetch plans from database first
    const dbPlans = await prisma.subscriptionPlan.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
    });

    if (dbPlans && dbPlans.length > 0) {
      return dbPlans.map(plan => ({
        code: plan.plan_code,
        name: plan.name,
        description: plan.description || '',
        priceMonthly: Number(plan.price_monthly) || 0,
        priceYearly: Number(plan.price_yearly) || 0,
        maxUsers: plan.max_users || -1,
        maxStorageGb: plan.max_storage_gb || -1,
        maxBranches: plan.max_branches || -1,
        maxApiCallsDay: plan.max_api_calls_day || -1,
        trialDays: plan.trial_days || 14,
        isUnlimited: (plan.max_users || -1) === -1,
        features: plan.feature_flags || {},
      }));
    }
  } catch (error) {
    console.warn('[getAvailablePlans] Could not fetch from database, using static plans:', error.message);
  }
  
  // Fallback to static plans
  return Object.values(SUBSCRIPTION_PLANS).map(plan => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    priceMonthly: plan.price_monthly,
    priceYearly: plan.price_yearly,
    maxUsers: plan.max_users,
    maxStorageGb: plan.max_storage_gb,
    maxBranches: plan.max_branches,
    maxApiCallsDay: plan.max_api_calls_day,
    trialDays: plan.trial_days,
    isUnlimited: plan.max_users === -1,
  }));
}

/**
 * Check subscription limits for an organization
 */
async function checkSubscriptionLimits(clientId) {
  const prisma = getPrisma();
  
  const subscription = await prisma.clientSubscription.findUnique({
    where: { client_id: clientId },
    include: { plan: true },
  });

  if (!subscription) {
    return {
      ok: false,
      error: 'No subscription found',
      hasSubscription: false,
    };
  }

  // Get current usage
  const userCount = await prisma.user.count({
    where: { clientId: clientId },
  });

  const branchCount = await prisma.branch.count({
    where: { tenantId: clientId },
  });

  const plan = subscription.plan;
  
  return {
    ok: true,
    hasSubscription: true,
    usage: {
      users: {
        current: userCount,
        limit: plan.max_users,
        remaining: plan.max_users === -1 ? Infinity : Math.max(0, plan.max_users - userCount),
        percentage: plan.max_users === -1 ? 0 : Math.round((userCount / plan.max_users) * 100),
        canAdd: plan.max_users === -1 || userCount < plan.max_users,
      },
      branches: {
        current: branchCount,
        limit: plan.max_branches,
        remaining: plan.max_branches === -1 ? Infinity : Math.max(0, plan.max_branches - branchCount),
        percentage: plan.max_branches === -1 ? 0 : Math.round((branchCount / plan.max_branches) * 100),
        canAdd: plan.max_branches === -1 || branchCount < plan.max_branches,
      },
      storage: {
        current: subscription.current_storage_used,
        limitGb: plan.max_storage_gb,
        limitBytes: plan.max_storage_gb === -1 ? Infinity : plan.max_storage_gb * 1024 * 1024 * 1024,
        remaining: plan.max_storage_gb === -1 ? Infinity : Math.max(0, (plan.max_storage_gb * 1024 * 1024 * 1024) - subscription.current_storage_used),
        percentage: plan.max_storage_gb === -1 ? 0 : Math.round((subscription.current_storage_used / (plan.max_storage_gb * 1024 * 1024 * 1024)) * 100),
      },
      apiCalls: {
        today: subscription.current_api_calls,
        limit: plan.max_api_calls_day,
        remaining: plan.max_api_calls_day === -1 ? Infinity : Math.max(0, plan.max_api_calls_day - subscription.current_api_calls),
        percentage: plan.max_api_calls_day === -1 ? 0 : Math.round((subscription.current_api_calls / plan.max_api_calls_day) * 100),
      },
    },
    subscription: {
      state: subscription.state,
      plan: plan.plan_code,
      billingCycle: subscription.billing_cycle,
      trialEndsAt: subscription.trial_end_date,
      nextBillingDate: subscription.next_billing_date,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  createAdminWithSubscription,
  checkSubscriptionLimits,
  getAvailablePlans,
  validateAdminInput,
  checkEmailExists,
  generateClientCode,
  SUBSCRIPTION_PLANS,
};
