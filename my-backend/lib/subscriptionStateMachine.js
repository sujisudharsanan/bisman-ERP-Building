/**
 * BISMAN ERP - Subscription State Machine
 * 
 * Manages subscription lifecycle state transitions with validation,
 * side effects, and audit logging.
 * 
 * States: TRIAL → ACTIVE → UPGRADING/DOWNGRADING → GRACE_PERIOD → SUSPENDED → CANCELLED
 * 
 * @module lib/subscriptionStateMachine
 */

const { getPrisma } = require('./prisma');
const { featureFlagService } = require('./featureFlags');

// ============================================================================
// SUBSCRIPTION STATES
// ============================================================================

const SUBSCRIPTION_STATES = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  UPGRADING: 'UPGRADING',
  DOWNGRADING: 'DOWNGRADING',
  GRACE_PERIOD: 'GRACE_PERIOD',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
};

// ============================================================================
// STATE TRANSITION RULES
// ============================================================================

/**
 * Valid state transitions
 * Key = current state, Value = array of allowed next states
 */
const STATE_TRANSITIONS = {
  [SUBSCRIPTION_STATES.TRIAL]: [
    SUBSCRIPTION_STATES.ACTIVE,      // Trial conversion
    SUBSCRIPTION_STATES.CANCELLED,   // Trial expiry without conversion
  ],
  
  [SUBSCRIPTION_STATES.ACTIVE]: [
    SUBSCRIPTION_STATES.UPGRADING,   // Plan upgrade initiated
    SUBSCRIPTION_STATES.DOWNGRADING, // Plan downgrade scheduled
    SUBSCRIPTION_STATES.GRACE_PERIOD,// Payment failed
    SUBSCRIPTION_STATES.CANCELLED,   // Manual cancellation
  ],
  
  [SUBSCRIPTION_STATES.UPGRADING]: [
    SUBSCRIPTION_STATES.ACTIVE,      // Upgrade completed
    SUBSCRIPTION_STATES.GRACE_PERIOD,// Payment for upgrade failed
  ],
  
  [SUBSCRIPTION_STATES.DOWNGRADING]: [
    SUBSCRIPTION_STATES.ACTIVE,      // Downgrade completed at billing cycle end
    SUBSCRIPTION_STATES.CANCELLED,   // Cancelled during downgrade period
  ],
  
  [SUBSCRIPTION_STATES.GRACE_PERIOD]: [
    SUBSCRIPTION_STATES.ACTIVE,      // Payment recovered
    SUBSCRIPTION_STATES.SUSPENDED,   // Grace period expired
  ],
  
  [SUBSCRIPTION_STATES.SUSPENDED]: [
    SUBSCRIPTION_STATES.ACTIVE,      // Payment made, reactivated
    SUBSCRIPTION_STATES.CANCELLED,   // Permanent cancellation
  ],
  
  [SUBSCRIPTION_STATES.CANCELLED]: [
    SUBSCRIPTION_STATES.ACTIVE,      // Reactivation (by SuperAdmin only)
  ],
};

/**
 * State properties
 */
const STATE_PROPERTIES = {
  [SUBSCRIPTION_STATES.TRIAL]: {
    canRead: true,
    canWrite: true,
    canCreate: true,
    showBanner: false,
    bannerType: null,
  },
  [SUBSCRIPTION_STATES.ACTIVE]: {
    canRead: true,
    canWrite: true,
    canCreate: true,
    showBanner: false,
    bannerType: null,
  },
  [SUBSCRIPTION_STATES.UPGRADING]: {
    canRead: true,
    canWrite: true,
    canCreate: true,
    showBanner: true,
    bannerType: 'info',
    bannerMessage: 'Your plan upgrade is being processed.',
  },
  [SUBSCRIPTION_STATES.DOWNGRADING]: {
    canRead: true,
    canWrite: true,
    canCreate: false, // Can't create premium content during downgrade
    showBanner: true,
    bannerType: 'warning',
    bannerMessage: 'Your plan will downgrade at the end of the billing cycle.',
  },
  [SUBSCRIPTION_STATES.GRACE_PERIOD]: {
    canRead: true,
    canWrite: true,
    canCreate: false,
    showBanner: true,
    bannerType: 'error',
    bannerMessage: 'Payment failed. Please update your payment method within 7 days.',
  },
  [SUBSCRIPTION_STATES.SUSPENDED]: {
    canRead: true,
    canWrite: false,
    canCreate: false,
    showBanner: true,
    bannerType: 'error',
    bannerMessage: 'Your account is suspended. Please contact support.',
  },
  [SUBSCRIPTION_STATES.CANCELLED]: {
    canRead: false,
    canWrite: false,
    canCreate: false,
    showBanner: true,
    bannerType: 'error',
    bannerMessage: 'Your subscription has been cancelled.',
  },
};

// ============================================================================
// SUBSCRIPTION STATE MACHINE CLASS
// ============================================================================

class SubscriptionStateMachine {
  constructor(subscriptionId) {
    this.subscriptionId = subscriptionId;
    this.subscription = null;
  }

  /**
   * Load subscription from database
   */
  async load() {
    const prisma = getPrisma();
    this.subscription = await prisma.client_subscriptions.findUnique({
      where: { id: this.subscriptionId },
      include: {
        plan: true,
        client: {
          select: { id: true, name: true, client_code: true },
        },
      },
    });
    return this;
  }

  /**
   * Get current state
   */
  get currentState() {
    return this.subscription?.state || null;
  }

  /**
   * Get allowed transitions from current state
   */
  getAllowedTransitions() {
    if (!this.currentState) return [];
    return STATE_TRANSITIONS[this.currentState] || [];
  }

  /**
   * Check if transition is valid
   */
  canTransitionTo(newState) {
    const allowed = this.getAllowedTransitions();
    return allowed.includes(newState);
  }

  /**
   * Transition to a new state
   */
  async transitionTo(newState, options = {}) {
    const {
      reason = null,
      actorType = 'system',
      actorId = null,
      actorEmail = null,
      metadata = {},
    } = options;

    if (!this.subscription) {
      throw new Error('Subscription not loaded. Call load() first.');
    }

    if (!this.canTransitionTo(newState)) {
      throw new Error(
        `Invalid state transition: ${this.currentState} → ${newState}. ` +
        `Allowed: ${this.getAllowedTransitions().join(', ')}`
      );
    }

    const prisma = getPrisma();
    const oldState = this.currentState;

    // Build update data based on transition
    const updateData = {
      state: newState,
      previous_state: oldState,
      state_changed_at: new Date(),
    };

    // Apply transition-specific updates
    this._applyTransitionEffects(updateData, oldState, newState, metadata);

    // Perform update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update subscription
      const updated = await tx.clientSubscription.update({
        where: { id: this.subscriptionId },
        data: updateData,
        include: { plan: true },
      });

      // Create audit log
      await tx.subscriptionAuditLog.create({
        data: {
          client_id: this.subscription.client_id,
          subscription_id: this.subscriptionId,
          action: 'state_change',
          action_category: 'state',
          old_values: { state: oldState, ...metadata.oldValues },
          new_values: { state: newState, ...metadata.newValues },
          reason,
          actor_type: actorType,
          actor_id: actorId,
          actor_email: actorEmail,
        },
      });

      return updated;
    });

    // Invalidate feature cache
    featureFlagService.invalidateCache(this.subscription.client_id);

    // Update local state
    this.subscription = result;

    // Execute side effects
    await this._executeSideEffects(oldState, newState, metadata);

    return result;
  }

  /**
   * Apply transition-specific data updates
   */
  _applyTransitionEffects(updateData, fromState, toState, metadata) {
    // Trial → Active: Mark trial as converted
    if (fromState === SUBSCRIPTION_STATES.TRIAL && toState === SUBSCRIPTION_STATES.ACTIVE) {
      updateData.trial_converted = true;
      updateData.current_period_start = new Date();
      updateData.next_billing_date = this._calculateNextBillingDate(
        this.subscription.billing_cycle
      );
    }

    // Active → Grace Period: Set grace period dates
    if (toState === SUBSCRIPTION_STATES.GRACE_PERIOD) {
      updateData.grace_period_start = new Date();
      updateData.grace_period_end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      updateData.grace_reason = metadata.reason || 'Payment failed';
    }

    // Grace Period → Active: Clear grace period
    if (fromState === SUBSCRIPTION_STATES.GRACE_PERIOD && toState === SUBSCRIPTION_STATES.ACTIVE) {
      updateData.grace_period_start = null;
      updateData.grace_period_end = null;
      updateData.grace_reason = null;
    }

    // Active → Downgrading: Schedule downgrade
    if (toState === SUBSCRIPTION_STATES.DOWNGRADING && metadata.newPlanId) {
      updateData.scheduled_plan_id = metadata.newPlanId;
      updateData.scheduled_change_date = this.subscription.current_period_end;
      updateData.scheduled_change_type = 'downgrade';
    }

    // Downgrading → Active: Apply the downgrade
    if (fromState === SUBSCRIPTION_STATES.DOWNGRADING && toState === SUBSCRIPTION_STATES.ACTIVE) {
      if (this.subscription.scheduled_plan_id) {
        updateData.plan_id = this.subscription.scheduled_plan_id;
      }
      updateData.scheduled_plan_id = null;
      updateData.scheduled_change_date = null;
      updateData.scheduled_change_type = null;
    }

    // Any → Cancelled: Set cancellation time
    if (toState === SUBSCRIPTION_STATES.CANCELLED) {
      updateData.cancelled_at = new Date();
      updateData.cancellation_reason = metadata.reason || 'User cancelled';
      updateData.is_active = false;
    }

    // Cancelled → Active: Reactivation
    if (fromState === SUBSCRIPTION_STATES.CANCELLED && toState === SUBSCRIPTION_STATES.ACTIVE) {
      updateData.cancelled_at = null;
      updateData.cancellation_reason = null;
      updateData.is_active = true;
      updateData.current_period_start = new Date();
      updateData.next_billing_date = this._calculateNextBillingDate(
        this.subscription.billing_cycle
      );
    }
  }

  /**
   * Execute side effects after state transition
   */
  async _executeSideEffects(fromState, toState, metadata) {
    // TODO: Implement side effects like:
    // - Send notification emails
    // - Trigger webhooks
    // - Update Stripe subscription
    // - Schedule jobs for grace period expiry
    
    console.log(`[SubscriptionStateMachine] Transition: ${fromState} → ${toState}`, {
      subscriptionId: this.subscriptionId,
      clientId: this.subscription?.client_id,
      metadata,
    });
  }

  /**
   * Calculate next billing date
   */
  _calculateNextBillingDate(billingCycle) {
    const now = new Date();
    if (billingCycle === 'YEARLY') {
      return new Date(now.setFullYear(now.getFullYear() + 1));
    }
    return new Date(now.setMonth(now.getMonth() + 1));
  }

  /**
   * Get state properties
   */
  getStateProperties() {
    return STATE_PROPERTIES[this.currentState] || {};
  }
}

// ============================================================================
// SUBSCRIPTION SERVICE
// ============================================================================

class SubscriptionService {
  /**
   * Create a new subscription for a client
   */
  async createSubscription(clientId, planCode, options = {}) {
    const prisma = getPrisma();
    const {
      billingCycle = 'MONTHLY',
      trialDays = 14,
      actorType = 'system',
      actorId = null,
    } = options;

    // Find the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { plan_code: planCode },
    });

    if (!plan) {
      throw new Error(`Plan not found: ${planCode}`);
    }

    // Check for existing subscription
    const existing = await prisma.client_subscriptions.findUnique({
      where: { client_id: clientId },
    });

    if (existing) {
      throw new Error('Client already has a subscription');
    }

    // Calculate trial dates
    const trialStart = new Date();
    const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // Create subscription
    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.clientSubscription.create({
        data: {
          client_id: clientId,
          plan_id: plan.id,
          state: 'TRIAL',
          billing_cycle: billingCycle,
          trial_start_date: trialStart,
          trial_end_date: trialEnd,
          current_period_start: trialStart,
          current_period_end: trialEnd,
        },
        include: { plan: true },
      });

      // Log creation
      await tx.subscriptionAuditLog.create({
        data: {
          client_id: clientId,
          subscription_id: sub.id,
          action: 'subscription_created',
          action_category: 'lifecycle',
          new_values: {
            plan_code: planCode,
            billing_cycle: billingCycle,
            trial_days: trialDays,
          },
          actor_type: actorType,
          actor_id: actorId,
        },
      });

      return sub;
    });

    return subscription;
  }

  /**
   * Upgrade subscription to a new plan (immediate effect)
   */
  async upgradePlan(subscriptionId, newPlanCode, options = {}) {
    const prisma = getPrisma();
    const { actorType = 'system', actorId = null, reason = null } = options;

    const subscription = await prisma.client_subscriptions.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { plan_code: newPlanCode },
    });

    if (!newPlan) {
      throw new Error(`Plan not found: ${newPlanCode}`);
    }

    // Validate upgrade (new plan should be higher tier)
    if (newPlan.sort_order <= subscription.plan.sort_order) {
      throw new Error('New plan must be higher tier than current plan');
    }

    // Use state machine for upgrade
    const machine = new SubscriptionStateMachine(subscriptionId);
    await machine.load();

    // First transition to UPGRADING
    await machine.transitionTo(SUBSCRIPTION_STATES.UPGRADING, {
      reason: reason || `Upgrading to ${newPlanCode}`,
      actorType,
      actorId,
      metadata: { newPlanId: newPlan.id },
    });

    // Then immediately transition to ACTIVE with new plan
    // (In production, this would happen after payment confirmation)
    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.clientSubscription.update({
        where: { id: subscriptionId },
        data: {
          plan_id: newPlan.id,
          state: 'ACTIVE',
          previous_state: 'UPGRADING',
          state_changed_at: new Date(),
        },
        include: { plan: true },
      });

      await tx.subscriptionAuditLog.create({
        data: {
          client_id: subscription.client_id,
          subscription_id: subscriptionId,
          action: 'plan_upgrade',
          action_category: 'billing',
          old_values: { plan_code: subscription.plan.plan_code },
          new_values: { plan_code: newPlanCode },
          reason,
          actor_type: actorType,
          actor_id: actorId,
        },
      });

      return sub;
    });

    featureFlagService.invalidateCache(subscription.client_id);
    return updated;
  }

  /**
   * Schedule downgrade for end of billing cycle
   */
  async scheduleDowgrade(subscriptionId, newPlanCode, options = {}) {
    const prisma = getPrisma();
    const { actorType = 'system', actorId = null, reason = null } = options;

    const subscription = await prisma.client_subscriptions.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { plan_code: newPlanCode },
    });

    if (!newPlan) {
      throw new Error(`Plan not found: ${newPlanCode}`);
    }

    // Validate downgrade
    if (newPlan.sort_order >= subscription.plan.sort_order) {
      throw new Error('New plan must be lower tier than current plan');
    }

    // Check feature/limit violations
    const violations = await this._checkDowngradeViolations(
      subscription,
      newPlan
    );

    if (violations.length > 0) {
      return {
        success: false,
        violations,
        message: 'Please resolve the following issues before downgrading',
      };
    }

    // Use state machine
    const machine = new SubscriptionStateMachine(subscriptionId);
    await machine.load();

    await machine.transitionTo(SUBSCRIPTION_STATES.DOWNGRADING, {
      reason: reason || `Downgrading to ${newPlanCode} at end of billing cycle`,
      actorType,
      actorId,
      metadata: {
        newPlanId: newPlan.id,
        effectiveDate: subscription.current_period_end,
      },
    });

    return {
      success: true,
      scheduledDate: subscription.current_period_end,
      newPlan: newPlanCode,
    };
  }

  /**
   * Check for violations when downgrading
   */
  async _checkDowngradeViolations(subscription, newPlan) {
    const violations = [];

    // Check user limit
    if (newPlan.max_users !== -1 && 
        subscription.current_user_count > newPlan.max_users) {
      violations.push({
        type: 'user_limit',
        current: subscription.current_user_count,
        newLimit: newPlan.max_users,
        message: `You have ${subscription.current_user_count} users but the ${newPlan.name} plan only allows ${newPlan.max_users}`,
      });
    }

    // Check storage limit
    const storageGB = Math.ceil(subscription.current_storage_used / (1024 * 1024 * 1024));
    if (newPlan.max_storage_gb !== -1 && storageGB > newPlan.max_storage_gb) {
      violations.push({
        type: 'storage_limit',
        current: storageGB,
        newLimit: newPlan.max_storage_gb,
        message: `You're using ${storageGB}GB but the ${newPlan.name} plan only allows ${newPlan.max_storage_gb}GB`,
      });
    }

    // TODO: Check feature usage (automation rules, etc.)

    return violations;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, options = {}) {
    const { reason = 'User requested', actorType = 'system', actorId = null } = options;

    const machine = new SubscriptionStateMachine(subscriptionId);
    await machine.load();

    return machine.transitionTo(SUBSCRIPTION_STATES.CANCELLED, {
      reason,
      actorType,
      actorId,
      metadata: { reason },
    });
  }

  /**
   * Reactivate a cancelled subscription (SuperAdmin only)
   */
  async reactivateSubscription(subscriptionId, options = {}) {
    const { reason = 'Reactivated by admin', actorType = 'super_admin', actorId = null } = options;

    const machine = new SubscriptionStateMachine(subscriptionId);
    await machine.load();

    if (machine.currentState !== SUBSCRIPTION_STATES.CANCELLED) {
      throw new Error('Can only reactivate cancelled subscriptions');
    }

    return machine.transitionTo(SUBSCRIPTION_STATES.ACTIVE, {
      reason,
      actorType,
      actorId,
    });
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(subscriptionId, options = {}) {
    const machine = new SubscriptionStateMachine(subscriptionId);
    await machine.load();

    if (machine.currentState !== SUBSCRIPTION_STATES.ACTIVE) {
      throw new Error('Can only handle payment failure for active subscriptions');
    }

    return machine.transitionTo(SUBSCRIPTION_STATES.GRACE_PERIOD, {
      reason: options.reason || 'Payment failed',
      actorType: 'webhook',
      metadata: { paymentError: options.error },
    });
  }

  /**
   * Handle successful payment (recover from grace period)
   */
  async handlePaymentSuccess(subscriptionId, options = {}) {
    const machine = new SubscriptionStateMachine(subscriptionId);
    await machine.load();

    if (machine.currentState === SUBSCRIPTION_STATES.GRACE_PERIOD) {
      return machine.transitionTo(SUBSCRIPTION_STATES.ACTIVE, {
        reason: 'Payment recovered',
        actorType: 'webhook',
        metadata: { paymentId: options.paymentId },
      });
    }

    // Also handle trial conversion
    if (machine.currentState === SUBSCRIPTION_STATES.TRIAL) {
      return machine.transitionTo(SUBSCRIPTION_STATES.ACTIVE, {
        reason: 'Trial converted',
        actorType: 'webhook',
        metadata: { paymentId: options.paymentId },
      });
    }
  }

  /**
   * Get subscription with full details
   */
  async getSubscription(clientId) {
    const prisma = getPrisma();
    
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: clientId },
      include: {
        plan: true,
        scheduled_plan: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      ...subscription,
      stateProperties: STATE_PROPERTIES[subscription.state],
      allowedTransitions: STATE_TRANSITIONS[subscription.state] || [],
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const subscriptionService = new SubscriptionService();

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Classes
  SubscriptionStateMachine,
  SubscriptionService,
  
  // Instance
  subscriptionService,
  
  // Constants
  SUBSCRIPTION_STATES,
  STATE_TRANSITIONS,
  STATE_PROPERTIES,
};
