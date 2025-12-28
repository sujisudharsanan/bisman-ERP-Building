/**
 * BISMAN ERP - Subscription Coupon Service
 * 
 * Core business logic for coupon-based subscription activation.
 * Handles coupon creation, validation, redemption, and audit logging.
 * 
 * @module services/subscriptionCouponService
 */

const { getPrisma } = require('../lib/prisma');
const crypto = require('crypto');

// ============================================================================
// CONSTANTS
// ============================================================================

const COUPON_EVENTS = {
  COUPON_CREATED: 'COUPON_CREATED',
  COUPON_REVOKED: 'COUPON_REVOKED',
  COUPON_REDEEMED: 'COUPON_REDEEMED',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  SUBSCRIPTION_ACTIVATED: 'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
};

const COUPON_STATUS = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  EXHAUSTED: 'EXHAUSTED',
};

const TENANT_RESTRICTION = {
  ANY: 'ANY',
  ONLY_NEW_TENANTS: 'ONLY_NEW_TENANTS',
  SPECIFIC_TENANT: 'SPECIFIC_TENANT',
};

const ERROR_CODES = {
  COUPON_NOT_FOUND: 'COUPON_NOT_FOUND',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  COUPON_REVOKED: 'COUPON_REVOKED',
  COUPON_EXHAUSTED: 'COUPON_EXHAUSTED',
  COUPON_NOT_VALID_YET: 'COUPON_NOT_VALID_YET',
  COUPON_VALIDITY_EXPIRED: 'COUPON_VALIDITY_EXPIRED',
  TENANT_RESTRICTION_FAILED: 'TENANT_RESTRICTION_FAILED',
  TENANT_HAS_ACTIVE_SUBSCRIPTION: 'TENANT_HAS_ACTIVE_SUBSCRIPTION',
  COUPON_ALREADY_USED_BY_TENANT: 'COUPON_ALREADY_USED_BY_TENANT',
  PLAN_NOT_FOUND: 'PLAN_NOT_FOUND',
  INVALID_DATES: 'INVALID_DATES',
  CANNOT_REVOKE_REDEEMED_COUPON: 'CANNOT_REVOKE_REDEEMED_COUPON',
  UNAUTHORIZED: 'UNAUTHORIZED',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique coupon code
 * Format: BIS-[PLAN]-[DURATION]-[RANDOM]
 */
function generateCouponCode(planCode, durationDays) {
  const planPrefix = planCode.substring(0, 4).toUpperCase();
  
  let durationLabel;
  if (durationDays <= 30) durationLabel = '1M';
  else if (durationDays <= 90) durationLabel = '3M';
  else if (durationDays <= 180) durationLabel = '6M';
  else if (durationDays <= 365) durationLabel = '1Y';
  else durationLabel = 'XY';
  
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  return `BIS-${planPrefix}-${durationLabel}-${randomPart}`;
}

/**
 * Calculate duration days from billing cycle
 */
function getDurationFromBillingCycle(billingCycle) {
  switch (billingCycle) {
    case 'MONTHLY': return 30;
    case 'QUARTERLY': return 90;
    case 'SEMI_ANNUAL': return 180;
    case 'YEARLY': return 365;
    default: return 30;
  }
}

/**
 * Create a plan snapshot for immutability
 * Works with master_subscription_plans table structure
 */
function createPlanSnapshot(plan) {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    status: plan.status,
    is_global: plan.is_global,
    is_custom: plan.is_custom,
    badge_text: plan.badge_text,
    sort_order: plan.sort_order,
    is_popular: plan.is_popular,
    monthly_spend_cap: plan.monthly_spend_cap ? parseFloat(plan.monthly_spend_cap) : null,
    cfo_approval_threshold: plan.cfo_approval_threshold ? parseFloat(plan.cfo_approval_threshold) : null,
    invoice_cycle_days: plan.invoice_cycle_days,
    grace_period_days: plan.grace_period_days,
    snapshot_at: new Date().toISOString(),
  };
}

/**
 * Get derived coupon status based on redemption and subscription state
 */
async function getDerivedCouponStatus(coupon, prisma) {
  // If explicitly revoked
  if (coupon.status === COUPON_STATUS.REVOKED) {
    return 'REVOKED';
  }
  
  // Check if any redemption exists
  const redemption = await prisma.couponRedemption.findFirst({
    where: { coupon_id: coupon.id },
    include: {
      subscription: true,
    },
  });
  
  if (!redemption) {
    // Not activated yet
    if (new Date() > new Date(coupon.valid_until)) {
      return 'EXPIRED';
    }
    return 'CREATED';
  }
  
  // Has been redeemed - check subscription status
  if (redemption.subscription) {
    if (redemption.subscription.expires_at && new Date() > new Date(redemption.subscription.expires_at)) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  }
  
  return 'REDEEMED';
}

/**
 * Calculate remaining time for subscription
 */
function calculateRemainingTime(expiresAt) {
  if (!expiresAt) return null;
  
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry - now;
  
  if (diffMs <= 0) {
    return { expired: true, label: 'Expired' };
  }
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (diffDays >= 1) {
    return { expired: false, days: diffDays, label: `${diffDays} day${diffDays > 1 ? 's' : ''} left` };
  }
  
  return { expired: false, hours: diffHours, label: `${diffHours} hour${diffHours > 1 ? 's' : ''} left` };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function logCouponEvent(prisma, eventType, data) {
  try {
    await prisma.subscriptionCouponAuditLog.create({
      data: {
        event_type: eventType,
        coupon_id: data.couponId || null,
        tenant_id: data.tenantId || null,
        subscription_id: data.subscriptionId || null,
        actor_user_id: data.actorUserId || null,
        actor_role: data.actorRole || null,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        payload_snapshot: data.payload || {},
        notes: data.notes || null,
      },
    });
  } catch (error) {
    console.error(`[CouponAudit] Failed to log event ${eventType}:`, error);
  }
}

// ============================================================================
// COUPON MANAGEMENT (SuperAdmin)
// ============================================================================

/**
 * Create a new subscription coupon
 * @param {Object} data - Coupon creation data
 * @param {Object} actor - The user creating the coupon
 * @returns {Object} Created coupon
 */
async function createCoupon(data, actor) {
  const prisma = getPrisma();
  
  // Validate plan exists - search in master_subscription_plans table
  let plan = null;
  const planId = data.planId;
  
  if (typeof planId === 'number' || !isNaN(parseInt(planId))) {
    // Try to find by numeric ID in master_subscription_plans
    const plans = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE id = ${parseInt(planId)} LIMIT 1
    `;
    if (plans && plans.length > 0) {
      plan = plans[0];
    }
  }
  
  // If not found by ID, try by code
  if (!plan && typeof planId === 'string') {
    const plans = await prisma.$queryRaw`
      SELECT * FROM master_subscription_plans WHERE code = ${planId} LIMIT 1
    `;
    if (plans && plans.length > 0) {
      plan = plans[0];
    }
  }
  
  if (!plan) {
    throw { code: ERROR_CODES.PLAN_NOT_FOUND, message: 'Plan not found. Please ensure the plan exists in the database.' };
  }
  
  // Validate dates
  const validFrom = new Date(data.validFrom || new Date());
  const validUntil = new Date(data.validUntil);
  
  if (validUntil <= validFrom) {
    throw { code: ERROR_CODES.INVALID_DATES, message: 'Valid until must be after valid from' };
  }
  
  // Calculate duration
  const durationDays = data.durationDays || getDurationFromBillingCycle(data.billingCycle || 'MONTHLY');
  
  // Generate unique code - use plan.code (from master_subscription_plans)
  let couponCode;
  let attempts = 0;
  while (attempts < 10) {
    couponCode = generateCouponCode(plan.code, durationDays);
    const existing = await prisma.subscriptionCoupon.findUnique({ where: { code: couponCode } });
    if (!existing) break;
    attempts++;
  }
  
  if (attempts >= 10) {
    throw new Error('Failed to generate unique coupon code');
  }
  
  // Create plan snapshot
  const planSnapshot = createPlanSnapshot(plan);
  
  // Create coupon
  const coupon = await prisma.subscriptionCoupon.create({
    data: {
      code: couponCode,
      plan_id: plan.id,
      plan_snapshot_json: planSnapshot,
      duration_days: durationDays,
      valid_from: validFrom,
      valid_until: validUntil,
      max_activations: data.maxActivations || 1,
      used_count: 0,
      tenant_restriction_type: data.tenantRestrictionType || TENANT_RESTRICTION.ANY,
      restricted_tenant_id: data.restrictedTenantId || null,
      status: COUPON_STATUS.ACTIVE,
      notes: data.notes || null,
      sales_reference: data.salesReference || null,
      invoice_reference: data.invoiceReference || null,
      created_by: actor.id,
    },
  });
  
  // Enrich coupon with plan info from snapshot for response
  const enrichedCoupon = {
    ...coupon,
    plan_name: planSnapshot.name,
    plan_tier: planSnapshot.code,
  };
  
  // Log audit event
  await logCouponEvent(prisma, COUPON_EVENTS.COUPON_CREATED, {
    couponId: coupon.id,
    actorUserId: actor.id,
    actorRole: actor.role,
    payload: {
      code: coupon.code,
      planId: plan.id,
      planCode: plan.code,
      validFrom: validFrom.toISOString(),
      validUntil: validUntil.toISOString(),
      maxActivations: coupon.max_activations,
      tenantRestriction: coupon.tenant_restriction_type,
      durationDays,
    },
  });
  
  return enrichedCoupon;
}

/**
 * Get all coupons with enhanced status information
 * @param {Object} filters - Filter options
 * @returns {Array} List of coupons with derived status
 */
async function getCoupons(filters = {}) {
  const prisma = getPrisma();
  
  const where = {};
  
  if (filters.status) {
    where.status = filters.status;
  }
  
  if (filters.planId) {
    where.plan_id = filters.planId;
  }
  
  const coupons = await prisma.subscriptionCoupon.findMany({
    where,
    include: {
      creator: {
        select: { id: true, first_name: true, last_name: true, email: true },
      },
      redemptions: {
        include: {
          tenant: {
            select: { id: true, name: true, client_code: true },
          },
          subscription: {
            select: { id: true, state: true, expires_at: true, started_at: true },
          },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });
  
  // Enhance with derived status and plan info from snapshot
  const enhancedCoupons = await Promise.all(
    coupons.map(async (coupon) => {
      const derivedStatus = await getDerivedCouponStatus(coupon, prisma);
      const redemption = coupon.redemptions[0];
      
      // Get plan info from snapshot
      const planSnapshot = coupon.plan_snapshot_json || {};
      const planName = planSnapshot.name || 'Unknown Plan';
      const planCode = planSnapshot.code || 'UNKNOWN';
      
      let remainingTime = null;
      let tenant = null;
      let activatedOn = null;
      
      if (redemption) {
        tenant = redemption.tenant;
        activatedOn = redemption.activated_at;
        
        if (redemption.subscription?.expires_at) {
          remainingTime = calculateRemainingTime(redemption.subscription.expires_at);
        }
      }
      
      return {
        ...coupon,
        plan_name: planName,
        plan_tier: planCode,
        derived_status: derivedStatus,
        tenant,
        activated_on: activatedOn,
        remaining_time: remainingTime,
        usage: `${coupon.used_count} / ${coupon.max_activations}`,
      };
    })
  );
  
  return enhancedCoupons;
}

/**
 * Get a single coupon by ID with full details
 * @param {string} couponId - Coupon UUID
 * @returns {Object} Coupon with full details
 */
async function getCouponById(couponId) {
  const prisma = getPrisma();
  
  const coupon = await prisma.subscriptionCoupon.findUnique({
    where: { id: couponId },
    include: {
      creator: {
        select: { id: true, first_name: true, last_name: true, email: true, role: true },
      },
      revoker: {
        select: { id: true, first_name: true, last_name: true, email: true },
      },
      redemptions: {
        include: {
          tenant: {
            select: { id: true, name: true, client_code: true },
          },
          activated_by: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          subscription: {
            select: { 
              id: true, 
              state: true, 
              expires_at: true, 
              started_at: true,
              current_user_count: true,
              current_storage_used: true,
            },
          },
        },
      },
      audit_logs: {
        orderBy: { created_at: 'desc' },
        take: 50,
      },
    },
  });
  
  if (!coupon) {
    throw { code: ERROR_CODES.COUPON_NOT_FOUND, message: 'Coupon not found' };
  }
  
  // Get plan info from snapshot
  const planSnapshot = coupon.plan_snapshot_json || {};
  const planName = planSnapshot.name || 'Unknown Plan';
  const planCode = planSnapshot.code || 'UNKNOWN';
  
  const derivedStatus = await getDerivedCouponStatus(coupon, prisma);
  const redemption = coupon.redemptions[0];
  
  let remainingTime = null;
  if (redemption?.subscription?.expires_at) {
    remainingTime = calculateRemainingTime(redemption.subscription.expires_at);
  }
  
  return {
    ...coupon,
    plan_name: planName,
    plan_tier: planCode,
    derived_status: derivedStatus,
    remaining_time: remainingTime,
  };
}

/**
 * Revoke a coupon (only if not redeemed)
 * @param {string} couponId - Coupon UUID
 * @param {string} reason - Revocation reason
 * @param {Object} actor - The user revoking the coupon
 * @returns {Object} Revoked coupon
 */
async function revokeCoupon(couponId, reason, actor) {
  const prisma = getPrisma();
  
  const coupon = await prisma.subscriptionCoupon.findUnique({
    where: { id: couponId },
    include: {
      redemptions: true,
    },
  });
  
  if (!coupon) {
    throw { code: ERROR_CODES.COUPON_NOT_FOUND, message: 'Coupon not found' };
  }
  
  // Cannot revoke if already redeemed
  if (coupon.redemptions.length > 0) {
    throw { 
      code: ERROR_CODES.CANNOT_REVOKE_REDEEMED_COUPON, 
      message: 'Cannot revoke a coupon that has already been redeemed' 
    };
  }
  
  // Cannot revoke if already revoked
  if (coupon.status === COUPON_STATUS.REVOKED) {
    throw { code: ERROR_CODES.COUPON_REVOKED, message: 'Coupon is already revoked' };
  }
  
  // Update coupon
  const revokedCoupon = await prisma.subscriptionCoupon.update({
    where: { id: couponId },
    data: {
      status: COUPON_STATUS.REVOKED,
      revoked_by: actor.id,
      revoked_at: new Date(),
      revocation_reason: reason,
    },
  });
  
  // Log audit event
  await logCouponEvent(prisma, COUPON_EVENTS.COUPON_REVOKED, {
    couponId: coupon.id,
    actorUserId: actor.id,
    actorRole: actor.role,
    payload: {
      code: coupon.code,
      reason,
      previousStatus: coupon.status,
    },
  });
  
  return revokedCoupon;
}

// ============================================================================
// COUPON REDEMPTION (Client Admin)
// ============================================================================

/**
 * Redeem a coupon for a tenant
 * STRICT validation order as specified in requirements
 * 
 * @param {string} couponCode - The coupon code to redeem
 * @param {string} tenantId - The tenant redeeming the coupon
 * @param {Object} actor - The user performing the redemption
 * @returns {Object} Created subscription
 */
async function redeemCoupon(couponCode, tenantId, actor) {
  const prisma = getPrisma();
  
  // VALIDATION 1: Coupon exists
  const coupon = await prisma.subscriptionCoupon.findUnique({
    where: { code: couponCode.trim().toUpperCase() },
    include: {
      plan: true,
    },
  });
  
  if (!coupon) {
    throw { code: ERROR_CODES.COUPON_NOT_FOUND, message: 'Invalid activation code' };
  }
  
  // VALIDATION 2: Coupon status = ACTIVE
  if (coupon.status === COUPON_STATUS.REVOKED) {
    throw { code: ERROR_CODES.COUPON_REVOKED, message: 'This activation code has been revoked' };
  }
  
  if (coupon.status === COUPON_STATUS.EXPIRED) {
    throw { code: ERROR_CODES.COUPON_EXPIRED, message: 'This activation code has expired' };
  }
  
  if (coupon.status === COUPON_STATUS.EXHAUSTED) {
    throw { code: ERROR_CODES.COUPON_EXHAUSTED, message: 'This activation code has reached its usage limit' };
  }
  
  // VALIDATION 3: Now within validity
  const now = new Date();
  
  if (now < new Date(coupon.valid_from)) {
    throw { code: ERROR_CODES.COUPON_NOT_VALID_YET, message: 'This activation code is not yet valid' };
  }
  
  if (now > new Date(coupon.valid_until)) {
    throw { code: ERROR_CODES.COUPON_VALIDITY_EXPIRED, message: 'This activation code has expired' };
  }
  
  // VALIDATION 4: used_count < max_activations
  if (coupon.used_count >= coupon.max_activations) {
    throw { code: ERROR_CODES.COUPON_EXHAUSTED, message: 'This activation code has reached its usage limit' };
  }
  
  // VALIDATION 5: Tenant eligibility satisfied
  if (coupon.tenant_restriction_type === TENANT_RESTRICTION.SPECIFIC_TENANT) {
    if (coupon.restricted_tenant_id !== tenantId) {
      throw { 
        code: ERROR_CODES.TENANT_RESTRICTION_FAILED, 
        message: 'This activation code is not valid for your organization' 
      };
    }
  }
  
  if (coupon.tenant_restriction_type === TENANT_RESTRICTION.ONLY_NEW_TENANTS) {
    // Check if tenant ever had a subscription
    const previousSubscription = await prisma.clientSubscription.findUnique({
      where: { client_id: tenantId },
    });
    
    if (previousSubscription) {
      throw { 
        code: ERROR_CODES.TENANT_RESTRICTION_FAILED, 
        message: 'This activation code is only valid for new organizations' 
      };
    }
  }
  
  // VALIDATION 6: Tenant has no active subscription
  const existingSubscription = await prisma.clientSubscription.findUnique({
    where: { client_id: tenantId },
  });
  
  if (existingSubscription && ['ACTIVE', 'TRIAL'].includes(existingSubscription.state)) {
    throw { 
      code: ERROR_CODES.TENANT_HAS_ACTIVE_SUBSCRIPTION, 
      message: 'Your organization already has an active subscription' 
    };
  }
  
  // VALIDATION 7: Coupon not used by this tenant
  const existingRedemption = await prisma.couponRedemption.findFirst({
    where: {
      coupon_id: coupon.id,
      tenant_id: tenantId,
    },
  });
  
  if (existingRedemption) {
    throw { 
      code: ERROR_CODES.COUPON_ALREADY_USED_BY_TENANT, 
      message: 'This activation code has already been used by your organization' 
    };
  }
  
  // ALL VALIDATIONS PASSED - Perform redemption in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Calculate subscription dates
    const startedAt = now;
    const expiresAt = new Date(now.getTime() + coupon.duration_days * 24 * 60 * 60 * 1000);
    
    // Create or update subscription
    let subscription;
    
    if (existingSubscription) {
      // Update existing (inactive) subscription
      subscription = await tx.clientSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          plan_id: coupon.plan.id,
          state: 'ACTIVE',
          previous_state: existingSubscription.state,
          state_changed_at: now,
          billing_cycle: 'MONTHLY',
          current_period_start: startedAt,
          current_period_end: expiresAt,
          is_active: true,
          activation_source: 'COUPON',
          coupon_id: coupon.id,
          plan_snapshot_json: coupon.plan_snapshot_json,
          started_at: startedAt,
          expires_at: expiresAt,
          current_user_count: 0,
          current_storage_used: 0,
          current_api_calls: 0,
        },
      });
    } else {
      // Create new subscription
      subscription = await tx.clientSubscription.create({
        data: {
          client_id: tenantId,
          plan_id: coupon.plan.id,
          state: 'ACTIVE',
          state_changed_at: now,
          billing_cycle: 'MONTHLY',
          current_period_start: startedAt,
          current_period_end: expiresAt,
          is_active: true,
          activation_source: 'COUPON',
          coupon_id: coupon.id,
          plan_snapshot_json: coupon.plan_snapshot_json,
          started_at: startedAt,
          expires_at: expiresAt,
          current_user_count: 0,
          current_storage_used: 0,
          current_api_calls: 0,
        },
      });
    }
    
    // Create redemption record
    const redemption = await tx.couponRedemption.create({
      data: {
        coupon_id: coupon.id,
        tenant_id: tenantId,
        activated_by_user: actor.id,
        subscription_id: subscription.id,
        subscription_started_at: startedAt,
        subscription_expires_at: expiresAt,
        applied_plan_snapshot: coupon.plan_snapshot_json,
      },
    });
    
    // Update coupon used_count
    const updatedCoupon = await tx.subscriptionCoupon.update({
      where: { id: coupon.id },
      data: {
        used_count: { increment: 1 },
        status: coupon.used_count + 1 >= coupon.max_activations 
          ? COUPON_STATUS.EXHAUSTED 
          : COUPON_STATUS.ACTIVE,
      },
    });
    
    // Update client subscription status
    await tx.client.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: 'active',
        subscriptionPlan: coupon.plan.plan_code,
      },
    });
    
    return { subscription, redemption, coupon: updatedCoupon };
  });
  
  // Log audit events
  await logCouponEvent(prisma, COUPON_EVENTS.COUPON_REDEEMED, {
    couponId: coupon.id,
    tenantId,
    subscriptionId: result.subscription.id,
    actorUserId: actor.id,
    actorRole: actor.role,
    payload: {
      code: coupon.code,
      planCode: coupon.plan.plan_code,
      startedAt: result.subscription.started_at,
      expiresAt: result.subscription.expires_at,
    },
  });
  
  await logCouponEvent(prisma, COUPON_EVENTS.SUBSCRIPTION_ACTIVATED, {
    couponId: coupon.id,
    tenantId,
    subscriptionId: result.subscription.id,
    actorUserId: actor.id,
    actorRole: actor.role,
    payload: {
      planCode: coupon.plan.plan_code,
      planSnapshot: coupon.plan_snapshot_json,
      startedAt: result.subscription.started_at,
      expiresAt: result.subscription.expires_at,
      durationDays: coupon.duration_days,
    },
  });
  
  return {
    subscription: result.subscription,
    plan: coupon.plan,
    startedAt: result.subscription.started_at,
    expiresAt: result.subscription.expires_at,
    remainingTime: calculateRemainingTime(result.subscription.expires_at),
  };
}

/**
 * Validate a coupon code without redeeming
 * @param {string} couponCode - The coupon code to validate
 * @param {string} tenantId - The tenant checking the code
 * @returns {Object} Validation result
 */
async function validateCoupon(couponCode, tenantId) {
  const prisma = getPrisma();
  
  try {
    const coupon = await prisma.subscriptionCoupon.findUnique({
      where: { code: couponCode.trim().toUpperCase() },
      include: {
        plan: {
          select: { id: true, plan_code: true, name: true, description: true },
        },
      },
    });
    
    if (!coupon) {
      return { valid: false, error: ERROR_CODES.COUPON_NOT_FOUND, message: 'Invalid activation code' };
    }
    
    // Run through validations
    if (coupon.status === COUPON_STATUS.REVOKED) {
      return { valid: false, error: ERROR_CODES.COUPON_REVOKED, message: 'This activation code has been revoked' };
    }
    
    const now = new Date();
    if (now < new Date(coupon.valid_from)) {
      return { valid: false, error: ERROR_CODES.COUPON_NOT_VALID_YET, message: 'This activation code is not yet valid' };
    }
    
    if (now > new Date(coupon.valid_until)) {
      return { valid: false, error: ERROR_CODES.COUPON_VALIDITY_EXPIRED, message: 'This activation code has expired' };
    }
    
    if (coupon.used_count >= coupon.max_activations) {
      return { valid: false, error: ERROR_CODES.COUPON_EXHAUSTED, message: 'This activation code has reached its usage limit' };
    }
    
    // Check tenant restrictions
    if (coupon.tenant_restriction_type === TENANT_RESTRICTION.SPECIFIC_TENANT && coupon.restricted_tenant_id !== tenantId) {
      return { valid: false, error: ERROR_CODES.TENANT_RESTRICTION_FAILED, message: 'This activation code is not valid for your organization' };
    }
    
    // Check for existing redemption
    const existingRedemption = await prisma.couponRedemption.findFirst({
      where: { coupon_id: coupon.id, tenant_id: tenantId },
    });
    
    if (existingRedemption) {
      return { valid: false, error: ERROR_CODES.COUPON_ALREADY_USED_BY_TENANT, message: 'This activation code has already been used by your organization' };
    }
    
    // Valid!
    return {
      valid: true,
      plan: coupon.plan,
      durationDays: coupon.duration_days,
      validUntil: coupon.valid_until,
    };
  } catch (error) {
    console.error('[CouponService] Validation error:', error);
    return { valid: false, error: 'VALIDATION_ERROR', message: 'Failed to validate activation code' };
  }
}

/**
 * Get subscription status for a tenant
 * @param {string} tenantId - Tenant UUID
 * @returns {Object} Subscription status
 */
async function getTenantSubscriptionStatus(tenantId) {
  const prisma = getPrisma();
  
  const subscription = await prisma.clientSubscription.findUnique({
    where: { client_id: tenantId },
    include: {
      plan: true,
    },
  });
  
  if (!subscription) {
    return {
      hasSubscription: false,
      status: null,
      plan: null,
      remainingTime: null,
    };
  }
  
  const remainingTime = calculateRemainingTime(subscription.expires_at);
  
  return {
    hasSubscription: true,
    isActive: subscription.state === 'ACTIVE',
    status: subscription.state,
    plan: subscription.plan,
    planSnapshot: subscription.plan_snapshot_json,
    startedAt: subscription.started_at,
    expiresAt: subscription.expires_at,
    remainingTime,
    activationSource: subscription.activation_source,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  COUPON_EVENTS,
  COUPON_STATUS,
  TENANT_RESTRICTION,
  ERROR_CODES,
  
  // SuperAdmin operations
  createCoupon,
  getCoupons,
  getCouponById,
  revokeCoupon,
  
  // Client operations
  redeemCoupon,
  validateCoupon,
  getTenantSubscriptionStatus,
  
  // Helpers
  calculateRemainingTime,
  getDerivedCouponStatus,
  logCouponEvent,
};
