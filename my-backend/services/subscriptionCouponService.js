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
 * Works with subscription_plans table structure
 */
function createPlanSnapshot(plan) {
  return {
    id: plan.id,
    code: plan.plan_code,
    name: plan.name,
    description: plan.description,
    short_description: plan.short_description,
    badge_text: plan.badge_text,
    sort_order: plan.sort_order,
    is_popular: plan.is_popular,
    is_active: plan.is_active,
    price_monthly: plan.price_monthly ? parseFloat(plan.price_monthly) : 0,
    price_yearly: plan.price_yearly ? parseFloat(plan.price_yearly) : 0,
    currency: plan.currency,
    max_users: plan.max_users,
    max_storage_gb: plan.max_storage_gb,
    max_branches: plan.max_branches,
    trial_days: plan.trial_days,
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
  
  // If exhausted (all activations used), show as REDEEMED
  if (coupon.status === COUPON_STATUS.EXHAUSTED || coupon.used_count >= coupon.max_activations) {
    return 'REDEEMED';
  }
  
  // Check if any redemption exists
  const redemption = await prisma.coupon_redemptions.findFirst({
    where: { coupon_id: coupon.id },
  });
  
  if (!redemption) {
    // Not activated yet
    if (new Date() > new Date(coupon.valid_until)) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  }
  
  // Has been redeemed - check subscription status
  if (redemption.subscription) {
    if (redemption.subscription.expires_at && new Date() > new Date(redemption.subscription.expires_at)) {
      return 'EXPIRED';
    }
    return 'REDEEMED';
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
    await prisma.subscription_coupon_audit_logs.create({
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
  
  // Resolve the actor's UUID from users_enhanced table
  // Super admins have their ID stored in super_admin_id or legacy_id
  let actorUuid = actor.id;
  if (typeof actor.id === 'number' || !isNaN(parseInt(actor.id))) {
    const userEnhanced = await prisma.users_enhanced.findFirst({
      where: {
        OR: [
          { super_admin_id: parseInt(actor.id) },
          { legacy_id: parseInt(actor.id) },
        ]
      },
      select: { id: true }
    });
    if (userEnhanced) {
      actorUuid = userEnhanced.id;
    } else {
      // If no mapping found, create a placeholder or throw error
      console.warn(`[CouponService] No users_enhanced entry found for actor id: ${actor.id}`);
      throw { code: 'ACTOR_NOT_FOUND', message: 'Could not resolve actor UUID for coupon creation' };
    }
  }
  
  // Validate plan exists - search in subscription_plans table
  let plan = null;
  const planId = data.planId;
  
  if (typeof planId === 'number' || !isNaN(parseInt(planId))) {
    // Try to find by numeric ID in subscription_plans
    plan = await prisma.subscription_plans.findUnique({
      where: { id: parseInt(planId) }
    });
  }
  
  // If not found by ID, try by plan_code
  if (!plan && typeof planId === 'string') {
    plan = await prisma.subscription_plans.findUnique({
      where: { plan_code: planId }
    });
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
  
  // Generate unique code - use plan.plan_code (from subscription_plans)
  let couponCode;
  let attempts = 0;
  while (attempts < 10) {
    couponCode = generateCouponCode(plan.plan_code, durationDays);
    const existing = await prisma.subscription_coupons.findUnique({ where: { code: couponCode } });
    if (!existing) break;
    attempts++;
  }
  
  if (attempts >= 10) {
    throw new Error('Failed to generate unique coupon code');
  }
  
  // Create plan snapshot
  const planSnapshot = createPlanSnapshot(plan);
  
  // Create coupon
  const coupon = await prisma.subscription_coupons.create({
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
      created_by: actorUuid,
    },
  });
  
  // Calculate coupon value based on duration and plan price
  const priceMonthly = planSnapshot.price_monthly || 0;
  const priceYearly = planSnapshot.price_yearly || 0;
  let couponValue = 0;
  if (durationDays <= 30) {
    couponValue = priceMonthly;
  } else if (durationDays <= 90) {
    couponValue = priceMonthly * 3;
  } else if (durationDays <= 180) {
    couponValue = priceMonthly * 6;
  } else if (durationDays >= 365) {
    couponValue = priceYearly || priceMonthly * 12;
  } else {
    couponValue = Math.round((priceMonthly / 30) * durationDays);
  }
  
  // Enrich coupon with plan info from snapshot for response
  const enrichedCoupon = {
    ...coupon,
    plan_name: planSnapshot.name,
    plan_tier: planSnapshot.code,
    duration_days: durationDays,
    coupon_value: couponValue,
    currency: planSnapshot.currency || 'INR',
  };
  
  // Log audit event
  await logCouponEvent(prisma, COUPON_EVENTS.COUPON_CREATED, {
    couponId: coupon.id,
    actorUserId: actorUuid,
    actorRole: actor.role,
    payload: {
      code: coupon.code,
      planId: plan.id,
      planCode: plan.plan_code,
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
  
  const coupons = await prisma.subscription_coupons.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
  
  // Enhance with derived status and plan info from snapshot
  const enhancedCoupons = await Promise.all(
    coupons.map(async (coupon) => {
      const derivedStatus = await getDerivedCouponStatus(coupon, prisma);
      
      // Fetch redemption data separately
      const redemption = await prisma.coupon_redemptions.findFirst({
        where: { coupon_id: coupon.id },
      });
      
      // Get plan info from snapshot
      const planSnapshot = coupon.plan_snapshot_json || {};
      const planName = planSnapshot.name || 'Unknown Plan';
      const planCode = planSnapshot.code || 'UNKNOWN';
      
      // Calculate coupon value based on duration and plan price
      const durationDays = coupon.duration_days || 30;
      const priceMonthly = planSnapshot.price_monthly || 0;
      const priceYearly = planSnapshot.price_yearly || 0;
      const currency = planSnapshot.currency || 'INR';
      
      // Calculate pro-rated value based on duration
      let couponValue = 0;
      if (durationDays <= 30) {
        couponValue = priceMonthly;
      } else if (durationDays <= 90) {
        couponValue = priceMonthly * 3;
      } else if (durationDays <= 180) {
        couponValue = priceMonthly * 6;
      } else if (durationDays >= 365) {
        couponValue = priceYearly || priceMonthly * 12;
      } else {
        // Pro-rate for other durations
        couponValue = Math.round((priceMonthly / 30) * durationDays);
      }
      
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
        status: derivedStatus, // Use derived status for display
        raw_status: coupon.status, // Keep original for reference
        plan_name: planName,
        plan_tier: planCode,
        duration_days: durationDays,
        coupon_value: couponValue,
        currency: currency,
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
  
  const coupon = await prisma.subscription_coupons.findUnique({
    where: { id: couponId },
  });
  
  if (!coupon) {
    throw { code: ERROR_CODES.COUPON_NOT_FOUND, message: 'Coupon not found' };
  }
  
  // Fetch redemption separately
  const redemption = await prisma.coupon_redemptions.findFirst({
    where: { coupon_id: couponId },
  });
  
  // Fetch subscription if redemption exists
  let subscription = null;
  if (redemption?.subscription_id) {
    subscription = await prisma.client_subscriptions.findUnique({
      where: { id: redemption.subscription_id },
    });
  }
  
  // Get plan info from snapshot
  const planSnapshot = coupon.plan_snapshot_json || {};
  const planName = planSnapshot.name || 'Unknown Plan';
  const planCode = planSnapshot.code || 'UNKNOWN';
  
  const derivedStatus = await getDerivedCouponStatus(coupon, prisma);
  
  let remainingTime = null;
  if (subscription?.expires_at) {
    remainingTime = calculateRemainingTime(subscription.expires_at);
  }
  
  return {
    ...coupon,
    redemptions: redemption ? [redemption] : [],
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
  
  const coupon = await prisma.subscription_coupons.findUnique({
    where: { id: couponId },
  });
  
  if (!coupon) {
    throw { code: ERROR_CODES.COUPON_NOT_FOUND, message: 'Coupon not found' };
  }
  
  // Check for redemptions separately
  const redemptionsCount = await prisma.coupon_redemptions.count({
    where: { coupon_id: couponId },
  });
  
  // Cannot revoke if already redeemed
  if (redemptionsCount > 0) {
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
  const revokedCoupon = await prisma.subscription_coupons.update({
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
  const coupon = await prisma.subscription_coupons.findUnique({
    where: { code: couponCode.trim().toUpperCase() },
  });
  
  if (!coupon) {
    throw { code: ERROR_CODES.COUPON_NOT_FOUND, message: 'Invalid activation code' };
  }
  
  // Fetch plan separately
  const plan = coupon.plan_id ? await prisma.subscription_plans.findUnique({
    where: { id: coupon.plan_id },
  }) : null;
  
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
    const previousSubscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
    });
    
    if (previousSubscription) {
      throw { 
        code: ERROR_CODES.TENANT_RESTRICTION_FAILED, 
        message: 'This activation code is only valid for new organizations' 
      };
    }
  }
  
  // VALIDATION 6: Get existing subscription (we now allow plan changes)
  const existingSubscription = await prisma.client_subscriptions.findUnique({
    where: { client_id: tenantId },
    include: { plan: true },
  });
  
  // Get the target plan from coupon
  const targetPlan = plan || (coupon.plan_snapshot_json ? { 
    id: coupon.plan_id,
    plan_code: coupon.plan_snapshot_json.code,
    name: coupon.plan_snapshot_json.name,
    sort_order: coupon.plan_snapshot_json.sort_order || 0
  } : null);
  
  // Determine if this is an upgrade, downgrade, or same plan
  let planChangeType = 'new'; // new, upgrade, downgrade, same
  if (existingSubscription && targetPlan) {
    const currentPlanOrder = existingSubscription.plan?.sort_order || 0;
    const targetPlanOrder = targetPlan.sort_order || 0;
    
    if (existingSubscription.plan_id === targetPlan.id) {
      // Same plan - this extends the subscription
      planChangeType = 'extend';
    } else if (targetPlanOrder > currentPlanOrder) {
      planChangeType = 'upgrade';
    } else {
      planChangeType = 'downgrade';
    }
  }
  
  // VALIDATION 7: Coupon not used by this tenant
  const existingRedemption = await prisma.coupon_redemptions.findFirst({
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
  
  // Get plan ID - prefer from fetched plan, fallback to coupon's plan_id
  const planId = plan?.id || coupon.plan_id;
  
  // ALL VALIDATIONS PASSED - Perform redemption in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Calculate subscription dates based on plan change type
    const startedAt = now;
    let expiresAt;
    let nextBillingDate;
    let currentPeriodStart;
    let currentPeriodEnd;
    
    // For plan changes, preserve trial dates if in trial
    const preserveTrialDates = existingSubscription?.state === 'TRIAL' && existingSubscription.trial_end_date;
    
    if (existingSubscription && ['ACTIVE', 'TRIAL'].includes(existingSubscription.state)) {
      // Tenant already has an active/trial subscription - this is a plan change via coupon
      
      if (planChangeType === 'extend') {
        // Same plan - extend from current expiration
        const baseDate = existingSubscription.expires_at || existingSubscription.current_period_end || now;
        expiresAt = new Date(baseDate.getTime() + coupon.duration_days * 24 * 60 * 60 * 1000);
        currentPeriodStart = existingSubscription.current_period_start || startedAt;
        currentPeriodEnd = expiresAt;
        nextBillingDate = expiresAt;
      } else if (planChangeType === 'upgrade') {
        // Upgrade - apply immediately, start new period
        expiresAt = new Date(now.getTime() + coupon.duration_days * 24 * 60 * 60 * 1000);
        currentPeriodStart = startedAt;
        currentPeriodEnd = expiresAt;
        nextBillingDate = expiresAt;
      } else if (planChangeType === 'downgrade') {
        // Downgrade - scheduled for next billing cycle (current period end)
        // But since using coupon, apply immediately with new duration
        expiresAt = new Date(now.getTime() + coupon.duration_days * 24 * 60 * 60 * 1000);
        currentPeriodStart = startedAt;
        currentPeriodEnd = expiresAt;
        nextBillingDate = expiresAt;
      } else {
        // New subscription
        expiresAt = new Date(now.getTime() + coupon.duration_days * 24 * 60 * 60 * 1000);
        currentPeriodStart = startedAt;
        currentPeriodEnd = expiresAt;
        nextBillingDate = expiresAt;
      }
    } else {
      // No active subscription or expired - create new dates
      expiresAt = new Date(now.getTime() + coupon.duration_days * 24 * 60 * 60 * 1000);
      currentPeriodStart = startedAt;
      currentPeriodEnd = expiresAt;
      nextBillingDate = expiresAt;
    }
    
    // Create or update subscription
    let subscription;
    
    if (existingSubscription) {
      // Update existing subscription (handles both active plan changes and reactivation)
      const updateData = {
        plan_id: planId,
        state: 'ACTIVE',
        previous_state: existingSubscription.state,
        state_changed_at: now,
        billing_cycle: 'MONTHLY',
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        next_billing_date: nextBillingDate,
        is_active: true,
        activation_source: 'COUPON',
        coupon_id: coupon.id,
        plan_snapshot_json: coupon.plan_snapshot_json,
        started_at: existingSubscription.started_at || startedAt,
        expires_at: expiresAt,
        // Preserve trial dates if upgrading from trial
        trial_converted: preserveTrialDates ? true : existingSubscription.trial_converted,
      };
      
      // Don't reset usage counts on plan change
      if (!existingSubscription.current_user_count) {
        updateData.current_user_count = 0;
        updateData.current_storage_used = BigInt(0);
        updateData.current_api_calls = 0;
      }
      
      subscription = await tx.client_subscriptions.update({
        where: { id: existingSubscription.id },
        data: updateData,
      });
    } else {
      // Create new subscription
      subscription = await tx.client_subscriptions.create({
        data: {
          client_id: tenantId,
          plan_id: planId,
          state: 'ACTIVE',
          state_changed_at: now,
          billing_cycle: 'MONTHLY',
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          next_billing_date: nextBillingDate,
          is_active: true,
          activation_source: 'COUPON',
          coupon_id: coupon.id,
          plan_snapshot_json: coupon.plan_snapshot_json,
          started_at: startedAt,
          expires_at: expiresAt,
          current_user_count: 0,
          current_storage_used: BigInt(0),
          current_api_calls: 0,
        },
      });
    }
    
    // Create redemption record
    const redemption = await tx.coupon_redemptions.create({
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
    const updatedCoupon = await tx.subscription_coupons.update({
      where: { id: coupon.id },
      data: {
        used_count: { increment: 1 },
        status: coupon.used_count + 1 >= coupon.max_activations 
          ? COUPON_STATUS.EXHAUSTED 
          : COUPON_STATUS.ACTIVE,
      },
    });
    
    // Update client subscription status (if clients table exists)
    try {
      await tx.clients.update({
        where: { id: tenantId },
        data: {
          subscription_status: 'active',
        },
      });
    } catch {
      // clients table may not have these fields, ignore
    }
    
    return { subscription, redemption, coupon: updatedCoupon, planChangeType };
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
      planCode: targetPlan?.plan_code || coupon.plan_snapshot_json?.code,
      planChangeType: result.planChangeType,
      previousPlan: existingSubscription?.plan?.plan_code || null,
      startedAt: result.subscription.started_at,
      expiresAt: result.subscription.expires_at,
      nextBillingDate: result.subscription.next_billing_date,
    },
  });
  
  // Determine appropriate event type based on plan change
  const subscriptionEvent = result.planChangeType === 'upgrade' 
    ? 'SUBSCRIPTION_UPGRADED' 
    : result.planChangeType === 'downgrade'
      ? 'SUBSCRIPTION_DOWNGRADED'
      : result.planChangeType === 'extend'
        ? 'SUBSCRIPTION_EXTENDED'
        : COUPON_EVENTS.SUBSCRIPTION_ACTIVATED;
  
  await logCouponEvent(prisma, subscriptionEvent, {
    couponId: coupon.id,
    tenantId,
    subscriptionId: result.subscription.id,
    actorUserId: actor.id,
    actorRole: actor.role,
    payload: {
      planCode: targetPlan?.plan_code || coupon.plan_snapshot_json?.code,
      planChangeType: result.planChangeType,
      previousPlan: existingSubscription?.plan?.plan_code || null,
      planSnapshot: coupon.plan_snapshot_json,
      startedAt: result.subscription.started_at,
      expiresAt: result.subscription.expires_at,
      nextBillingDate: result.subscription.next_billing_date,
      durationDays: coupon.duration_days,
    },
  });
  
  return {
    subscription: result.subscription,
    plan: targetPlan || { id: coupon.plan_id, ...coupon.plan_snapshot_json },
    planChangeType: result.planChangeType,
    startedAt: result.subscription.started_at,
    expiresAt: result.subscription.expires_at,
    nextBillingDate: result.subscription.next_billing_date,
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
    const coupon = await prisma.subscription_coupons.findUnique({
      where: { code: couponCode.trim().toUpperCase() },
    });
    
    if (!coupon) {
      return { valid: false, error: ERROR_CODES.COUPON_NOT_FOUND, message: 'Invalid activation code' };
    }
    
    // Fetch plan separately
    const plan = coupon.plan_id ? await prisma.subscription_plans.findUnique({
      where: { id: coupon.plan_id },
      select: { id: true, plan_code: true, name: true, description: true },
    }) : null;
    
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
    const existingRedemption = await prisma.coupon_redemptions.findFirst({
      where: { coupon_id: coupon.id, tenant_id: tenantId },
    });
    
    if (existingRedemption) {
      return { valid: false, error: ERROR_CODES.COUPON_ALREADY_USED_BY_TENANT, message: 'This activation code has already been used by your organization' };
    }
    
    // Valid!
    return {
      valid: true,
      plan: plan,
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
  
  // Use correct Prisma model name: client_subscriptions (not clientSubscription)
  const subscription = await prisma.client_subscriptions.findUnique({
    where: { client_id: tenantId },
  });
  
  if (!subscription) {
    return {
      hasSubscription: false,
      hasActiveSubscription: false,
      subscription: null,
      status: null,
      plan: null,
      remainingTime: null,
    };
  }
  
  // Fetch plan separately since there's no relation defined
  let plan = null;
  if (subscription.plan_id) {
    plan = await prisma.subscription_plans.findUnique({
      where: { id: subscription.plan_id },
    });
  }
  
  const remainingTime = calculateRemainingTime(subscription.expires_at);
  const isActiveOrTrial = ['ACTIVE', 'TRIAL'].includes(subscription.state);
  
  return {
    hasSubscription: true,
    hasActiveSubscription: isActiveOrTrial,
    isActive: subscription.state === 'ACTIVE',
    subscription: {
      status: subscription.state.toLowerCase(), // Frontend expects lowercase
      state: subscription.state,
      plan: plan?.name || plan?.plan_code,
      planCode: plan?.plan_code,
      startedAt: subscription.started_at,
      expiresAt: subscription.expires_at,
      remainingTime,
      activationSource: subscription.activation_source,
    },
    status: subscription.state.toLowerCase(),
    plan: plan,
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
