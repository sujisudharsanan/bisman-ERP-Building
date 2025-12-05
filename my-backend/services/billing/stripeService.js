/**
 * Stripe Billing Service
 * 
 * Handles all Stripe integrations:
 * - Customer creation
 * - Subscription management
 * - Plan changes
 * - Invoice handling
 */

const prisma = require('../../lib/prisma');

// Initialize Stripe
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
    console.log('[Billing] Stripe initialized');
  } else {
    console.warn('[Billing] STRIPE_SECRET_KEY not set, billing disabled');
  }
} catch (error) {
  console.error('[Billing] Failed to initialize Stripe:', error.message);
}

// Plan configuration
const PLANS = {
  free: {
    name: 'Free',
    priceId: process.env.STRIPE_PRICE_ID_FREE || null,
    quotas: {
      apiCallsPerMinute: 60,
      apiCallsPerDay: 5000,
      storageLimitBytes: 1 * 1024 * 1024 * 1024, // 1 GB
      maxUsers: 3
    }
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_ID_PRO || null,
    quotas: {
      apiCallsPerMinute: 300,
      apiCallsPerDay: 50000,
      storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10 GB
      maxUsers: 25
    }
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE || null,
    quotas: {
      apiCallsPerMinute: 1000,
      apiCallsPerDay: 500000,
      storageLimitBytes: 100 * 1024 * 1024 * 1024, // 100 GB
      maxUsers: -1 // Unlimited
    }
  },
  trial: {
    name: 'Trial',
    priceId: null,
    quotas: {
      apiCallsPerMinute: 300, // Same as Pro during trial
      apiCallsPerDay: 50000,
      storageLimitBytes: 10 * 1024 * 1024 * 1024,
      maxUsers: 25
    }
  }
};

/**
 * Check if Stripe is configured
 */
function isStripeEnabled() {
  return stripe !== null;
}

/**
 * Create Stripe customer for a tenant
 */
async function createCustomer(tenant, adminEmail) {
  if (!stripe) {
    console.warn('[Billing] Stripe not configured, skipping customer creation');
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      email: adminEmail,
      name: tenant.name,
      metadata: {
        tenantId: tenant.id,
        plan: tenant.plan || 'free'
      }
    });

    // Update tenant with Stripe customer ID
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        stripe_customer_id: customer.id,
        updated_at: new Date()
      }
    });

    console.log(`[Billing] Created Stripe customer ${customer.id} for tenant ${tenant.id}`);
    
    // Audit log
    await createAuditLog(tenant.id, 'STRIPE_CUSTOMER_CREATED', {
      stripeCustomerId: customer.id,
      email: adminEmail
    });

    return customer;
  } catch (error) {
    console.error(`[Billing] Failed to create Stripe customer:`, error);
    throw error;
  }
}

/**
 * Create subscription for a tenant
 */
async function createSubscription(tenantId, planType, options = {}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (!tenant.stripe_customer_id) {
    throw new Error('Tenant has no Stripe customer ID');
  }

  const plan = PLANS[planType];
  if (!plan || !plan.priceId) {
    throw new Error(`Invalid plan or price not configured: ${planType}`);
  }

  try {
    const subscriptionParams = {
      customer: tenant.stripe_customer_id,
      items: [{ price: plan.priceId }],
      metadata: {
        tenantId: tenant.id,
        plan: planType
      },
      expand: ['latest_invoice.payment_intent']
    };

    // Add trial period if specified
    if (options.trialDays) {
      subscriptionParams.trial_period_days = options.trialDays;
    }

    // Set billing cycle anchor if specified
    if (options.billingCycleAnchor) {
      subscriptionParams.billing_cycle_anchor = options.billingCycleAnchor;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Update tenant with subscription info
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripe_subscription_id: subscription.id,
        plan: planType,
        subscription_status: subscription.status,
        current_period_end: new Date(subscription.current_period_end * 1000),
        updated_at: new Date()
      }
    });

    console.log(`[Billing] Created subscription ${subscription.id} for tenant ${tenantId}`);

    // Audit log
    await createAuditLog(tenantId, 'SUBSCRIPTION_CREATED', {
      subscriptionId: subscription.id,
      plan: planType,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    });

    return subscription;
  } catch (error) {
    console.error(`[Billing] Failed to create subscription:`, error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(tenantId, options = {}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  try {
    let subscription;

    if (options.immediately) {
      // Cancel immediately
      subscription = await stripe.subscriptions.cancel(tenant.stripe_subscription_id);
    } else {
      // Cancel at period end
      subscription = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    }

    // Update tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscription_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date()
      }
    });

    console.log(`[Billing] Cancelled subscription ${subscription.id} for tenant ${tenantId}`);

    // Audit log
    await createAuditLog(tenantId, 'SUBSCRIPTION_CANCELLED', {
      subscriptionId: subscription.id,
      cancelledImmediately: options.immediately || false,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

    return subscription;
  } catch (error) {
    console.error(`[Billing] Failed to cancel subscription:`, error);
    throw error;
  }
}

/**
 * Change subscription plan
 */
async function changePlan(tenantId, newPlan) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  const plan = PLANS[newPlan];
  if (!plan || !plan.priceId) {
    throw new Error(`Invalid plan or price not configured: ${newPlan}`);
  }

  try {
    // Get current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
    
    // Update subscription with new price
    const subscription = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
      items: [{
        id: currentSubscription.items.data[0].id,
        price: plan.priceId
      }],
      metadata: {
        plan: newPlan
      },
      proration_behavior: 'create_prorations'
    });

    const oldPlan = tenant.plan;

    // Update tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: newPlan,
        subscription_status: subscription.status,
        updated_at: new Date()
      }
    });

    console.log(`[Billing] Changed plan from ${oldPlan} to ${newPlan} for tenant ${tenantId}`);

    // Audit log
    await createAuditLog(tenantId, 'PLAN_CHANGED', {
      oldPlan,
      newPlan,
      subscriptionId: subscription.id
    });

    return subscription;
  } catch (error) {
    console.error(`[Billing] Failed to change plan:`, error);
    throw error;
  }
}

/**
 * Create Stripe Checkout session for upgrade
 */
async function createCheckoutSession(tenantId, planType, options = {}) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const plan = PLANS[planType];
  if (!plan || !plan.priceId) {
    throw new Error(`Invalid plan or price not configured: ${planType}`);
  }

  const baseUrl = process.env.FRONTEND_URL || 'https://app.bisman.io';

  try {
    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancelled`,
      metadata: {
        tenantId: tenant.id,
        plan: planType
      }
    };

    // Use existing customer or create new
    if (tenant.stripe_customer_id) {
      sessionParams.customer = tenant.stripe_customer_id;
    } else {
      sessionParams.customer_email = options.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[Billing] Created checkout session ${session.id} for tenant ${tenantId}`);

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error(`[Billing] Failed to create checkout session:`, error);
    throw error;
  }
}

/**
 * Create customer portal session
 */
async function createPortalSession(tenantId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant?.stripe_customer_id) {
    throw new Error('Tenant has no Stripe customer');
  }

  const baseUrl = process.env.FRONTEND_URL || 'https://app.bisman.io';

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${baseUrl}/billing`
    });

    return { url: session.url };
  } catch (error) {
    console.error(`[Billing] Failed to create portal session:`, error);
    throw error;
  }
}

/**
 * Get subscription status
 */
async function getSubscriptionStatus(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const plan = PLANS[tenant.plan] || PLANS.free;

  return {
    tenantId: tenant.id,
    plan: tenant.plan,
    planName: plan.name,
    status: tenant.subscription_status || 'none',
    trialExpiresAt: tenant.trial_expires_at,
    currentPeriodEnd: tenant.current_period_end,
    cancelAtPeriodEnd: tenant.cancel_at_period_end || false,
    quotas: plan.quotas,
    stripeCustomerId: tenant.stripe_customer_id,
    stripeSubscriptionId: tenant.stripe_subscription_id
  };
}

/**
 * Update tenant quotas based on plan
 */
async function updateTenantQuotas(tenantId, plan) {
  const planConfig = PLANS[plan];
  if (!planConfig) {
    console.warn(`[Billing] Unknown plan: ${plan}`);
    return;
  }

  // Update or create quota override
  await prisma.tenantQuotaOverride.upsert({
    where: { tenant_id: tenantId },
    create: {
      tenant_id: tenantId,
      api_calls_per_minute: planConfig.quotas.apiCallsPerMinute,
      api_calls_per_day: planConfig.quotas.apiCallsPerDay,
      storage_limit_bytes: planConfig.quotas.storageLimitBytes,
      reason: `Plan: ${plan}`,
      created_at: new Date()
    },
    update: {
      api_calls_per_minute: planConfig.quotas.apiCallsPerMinute,
      api_calls_per_day: planConfig.quotas.apiCallsPerDay,
      storage_limit_bytes: planConfig.quotas.storageLimitBytes,
      reason: `Plan: ${plan}`,
      updated_at: new Date()
    }
  });

  console.log(`[Billing] Updated quotas for tenant ${tenantId} to plan ${plan}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice) {
  const tenantId = invoice.subscription_details?.metadata?.tenantId || 
                   invoice.customer_metadata?.tenantId;
  
  if (!tenantId) {
    console.warn('[Billing] Payment succeeded but no tenantId in metadata');
    return;
  }

  // Update tenant payment status
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      last_payment_at: new Date(),
      payment_failed: false,
      updated_at: new Date()
    }
  });

  // Audit log
  await createAuditLog(tenantId, 'PAYMENT_SUCCEEDED', {
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
    currency: invoice.currency
  });

  console.log(`[Billing] Payment succeeded for tenant ${tenantId}, invoice ${invoice.id}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice) {
  const tenantId = invoice.subscription_details?.metadata?.tenantId ||
                   invoice.customer_metadata?.tenantId;
  
  if (!tenantId) {
    console.warn('[Billing] Payment failed but no tenantId in metadata');
    return;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        where: { role: { name: 'admin' } },
        take: 1
      }
    }
  });

  // Update tenant
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      payment_failed: true,
      payment_failed_at: new Date(),
      updated_at: new Date()
    }
  });

  // Send email notification
  if (tenant?.users[0]) {
    const emailService = require('../email/emailService');
    await emailService.send({
      to: tenant.users[0].email,
      subject: 'Payment Failed - Action Required',
      html: `
        <h1>Payment Failed</h1>
        <p>We were unable to process your payment for ${tenant.name}.</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <a href="${process.env.FRONTEND_URL}/billing">Update Payment Method</a>
      `
    }).catch(err => console.error('[Billing] Failed to send payment failed email:', err));
  }

  // Audit log
  await createAuditLog(tenantId, 'PAYMENT_FAILED', {
    invoiceId: invoice.id,
    amount: invoice.amount_due,
    currency: invoice.currency,
    attemptCount: invoice.attempt_count
  });

  console.log(`[Billing] Payment failed for tenant ${tenantId}, invoice ${invoice.id}`);
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription) {
  const tenantId = subscription.metadata?.tenantId;
  
  if (!tenantId) {
    console.warn('[Billing] Subscription deleted but no tenantId in metadata');
    return;
  }

  // Downgrade to free plan
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan: 'free',
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
      updated_at: new Date()
    }
  });

  // Update quotas to free tier
  await updateTenantQuotas(tenantId, 'free');

  // Audit log
  await createAuditLog(tenantId, 'SUBSCRIPTION_DELETED', {
    subscriptionId: subscription.id,
    previousPlan: subscription.metadata?.plan
  });

  console.log(`[Billing] Subscription deleted for tenant ${tenantId}, downgraded to free`);
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription) {
  const tenantId = subscription.metadata?.tenantId;
  
  if (!tenantId) {
    return;
  }

  const newPlan = subscription.metadata?.plan || 'free';

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan: newPlan,
      subscription_status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date()
    }
  });

  // Update quotas
  await updateTenantQuotas(tenantId, newPlan);

  console.log(`[Billing] Subscription updated for tenant ${tenantId}, status: ${subscription.status}`);
}

/**
 * Create audit log entry
 */
async function createAuditLog(tenantId, action, details) {
  try {
    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        action: action,
        resource_type: 'billing',
        resource_id: tenantId,
        details: details,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('[Billing] Failed to create audit log:', error.message);
  }
}

/**
 * Get plan configuration
 */
function getPlanConfig(planType) {
  return PLANS[planType] || PLANS.free;
}

/**
 * Get invoice history for a tenant
 */
async function getInvoices(tenantId, options = {}) {
  if (!stripe) {
    return { invoices: [], hasMore: false };
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripe_customer_id: true }
    });

    if (!tenant?.stripe_customer_id) {
      return { invoices: [], hasMore: false };
    }

    const params = {
      customer: tenant.stripe_customer_id,
      limit: options.limit || 10,
      expand: ['data.subscription']
    };

    if (options.startingAfter) {
      params.starting_after = options.startingAfter;
    }

    const response = await stripe.invoices.list(params);

    const invoices = response.data.map(inv => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amount: inv.amount_paid || inv.amount_due,
      currency: inv.currency,
      created: new Date(inv.created * 1000).toISOString(),
      dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
      paidAt: inv.status_transitions?.paid_at 
        ? new Date(inv.status_transitions.paid_at * 1000).toISOString() 
        : null,
      invoicePdf: inv.invoice_pdf,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
      periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null
    }));

    return {
      invoices,
      hasMore: response.has_more
    };

  } catch (error) {
    console.error(`[Billing] Failed to get invoices for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Get upcoming invoice preview
 */
async function getUpcomingInvoice(tenantId) {
  if (!stripe) {
    return null;
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripe_customer_id: true }
    });

    if (!tenant?.stripe_customer_id) {
      return null;
    }

    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: tenant.stripe_customer_id
    });

    return {
      amount: invoice.amount_due,
      currency: invoice.currency,
      periodStart: new Date(invoice.period_start * 1000).toISOString(),
      periodEnd: new Date(invoice.period_end * 1000).toISOString(),
      lines: invoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity
      }))
    };

  } catch (error) {
    // No upcoming invoice is not an error
    if (error.code === 'invoice_upcoming_none') {
      return null;
    }
    console.error(`[Billing] Failed to get upcoming invoice for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Get payment methods for a customer
 */
async function getPaymentMethods(customerId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    return paymentMethods;
  } catch (error) {
    console.error('[Billing] Failed to get payment methods:', error);
    throw error;
  }
}

/**
 * Get a single payment method
 */
async function getPaymentMethod(paymentMethodId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    return await stripe.paymentMethods.retrieve(paymentMethodId);
  } catch (error) {
    console.error('[Billing] Failed to get payment method:', error);
    throw error;
  }
}

/**
 * Create setup intent for adding a payment method
 */
async function createSetupIntent(customerId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card']
    });
    return setupIntent;
  } catch (error) {
    console.error('[Billing] Failed to create setup intent:', error);
    throw error;
  }
}

/**
 * Update customer's default payment method
 */
async function updateCustomerDefaultPaymentMethod(customerId, paymentMethodId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
  } catch (error) {
    console.error('[Billing] Failed to update default payment method:', error);
    throw error;
  }
}

/**
 * Detach a payment method from customer
 */
async function detachPaymentMethod(paymentMethodId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    await stripe.paymentMethods.detach(paymentMethodId);
  } catch (error) {
    console.error('[Billing] Failed to detach payment method:', error);
    throw error;
  }
}

/**
 * Update Stripe customer
 */
async function updateCustomer(customerId, data) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const updateData = {};
    
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.address) updateData.address = data.address;
    
    // Handle tax ID separately
    if (data.tax_id) {
      // Tax IDs need to be added via a separate endpoint
      try {
        await stripe.customers.createTaxId(customerId, {
          type: 'eu_vat', // Default to EU VAT, adjust based on actual type
          value: data.tax_id
        });
      } catch (taxError) {
        console.warn('[Billing] Failed to add tax ID:', taxError.message);
      }
    }

    if (Object.keys(updateData).length > 0) {
      await stripe.customers.update(customerId, updateData);
    }
  } catch (error) {
    console.error('[Billing] Failed to update customer:', error);
    throw error;
  }
}

/**
 * Pay an invoice
 */
async function payInvoice(invoiceId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const invoice = await stripe.invoices.pay(invoiceId);
    return invoice;
  } catch (error) {
    console.error('[Billing] Failed to pay invoice:', error);
    throw error;
  }
}

/**
 * Reactivate a canceled subscription
 */
async function reactivateSubscription(subscriptionId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    });
    return subscription;
  } catch (error) {
    console.error('[Billing] Failed to reactivate subscription:', error);
    throw error;
  }
}

module.exports = {
  isStripeEnabled,
  createCustomer,
  createSubscription,
  cancelSubscription,
  changePlan,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionStatus,
  updateTenantQuotas,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  getPlanConfig,
  getInvoices,
  getUpcomingInvoice,
  getPaymentMethods,
  getPaymentMethod,
  createSetupIntent,
  updateCustomerDefaultPaymentMethod,
  detachPaymentMethod,
  updateCustomer,
  payInvoice,
  reactivateSubscription,
  PLANS
};
