/**
 * Stripe Webhook Routes
 * 
 * Handles Stripe webhook events:
 * - payment_intent.succeeded
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 * - invoice.paid
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - checkout.session.completed
 */

const express = require('express');
const router = express.Router();
const stripeService = require('../../services/billing/stripeService');
const prisma = require('../../lib/prisma');

// Get raw body for signature verification
// This must be applied BEFORE json parsing for this route
router.use(express.raw({ type: 'application/json' }));

// Initialize Stripe
let stripe = null;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

try {
  if (process.env.STRIPE_SECRET_KEY) {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    });
  }
} catch (error) {
  console.error('[Webhook] Failed to initialize Stripe:', error.message);
}

/**
 * Save webhook event to database for audit trail
 */
async function saveWebhookEvent(event, billingProfileId, status = 'received', error = null) {
  try {
    await prisma.billingWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      update: {
        status,
        processedAt: status === 'processed' ? new Date() : null,
        error: error?.message || error
      },
      create: {
        stripeEventId: event.id,
        eventType: event.type,
        billingProfileId,
        payload: event.data.object,
        status,
        processedAt: status === 'processed' ? new Date() : null,
        error: error?.message || error
      }
    });
  } catch (err) {
    console.error('[Webhook] Failed to save webhook event:', err);
  }
}

/**
 * Get billing profile ID from Stripe customer ID
 */
async function getBillingProfileFromCustomer(stripeCustomerId) {
  if (!stripeCustomerId) return null;
  
  try {
    const profile = await prisma.billingProfile.findFirst({
      where: { stripeCustomerId },
      select: { id: true, clientId: true }
    });
    return profile;
  } catch (err) {
    console.error('[Webhook] Failed to get billing profile:', err);
    return null;
  }
}

/**
 * POST /api/webhooks/stripe
 * 
 * Main webhook endpoint for Stripe events
 */
router.post('/', async (req, res) => {
  if (!stripe) {
    console.error('[Webhook] Stripe not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.warn('[Webhook] Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event;

  try {
    // Verify webhook signature
    if (WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
    } else {
      // Development mode: skip signature verification
      console.warn('[Webhook] STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  // Get billing profile for audit trail
  const customerId = event.data.object?.customer;
  const billingProfile = await getBillingProfileFromCustomer(customerId);
  
  // Save webhook event
  await saveWebhookEvent(event, billingProfile?.id, 'processing');

  try {
    // Handle the event
    switch (event.type) {
      // Payment Events
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'invoice.payment_succeeded':
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object, billingProfile);
        await stripeService.handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object, billingProfile);
        await stripeService.handlePaymentFailed(event.data.object);
        break;

      // Subscription Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, billingProfile);
        await stripeService.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, billingProfile);
        await stripeService.handleSubscriptionDeleted(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      // Checkout Events
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      // Customer Events
      case 'customer.created':
        console.log('[Webhook] Customer created:', event.data.object.id);
        break;

      case 'customer.updated':
        console.log('[Webhook] Customer updated:', event.data.object.id);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    await saveWebhookEvent(event, billingProfile?.id, 'processed');

    // Return success response
    res.json({ received: true, type: event.type });

  } catch (error) {
    console.error(`[Webhook] Error handling ${event.type}:`, error);
    
    // Save error to webhook event
    await saveWebhookEvent(event, billingProfile?.id, 'failed', error);
    
    // Return 200 to prevent Stripe from retrying (we'll handle errors internally)
    res.json({ received: true, error: error.message });
  }
});

/**
 * Handle invoice.paid - Sync invoice to local database
 */
async function handleInvoicePaid(stripeInvoice, billingProfile) {
  console.log(`[Webhook] Invoice paid: ${stripeInvoice.id}`);
  
  if (!billingProfile) {
    console.warn('[Webhook] No billing profile found for invoice');
    return;
  }

  try {
    // Generate invoice number if needed
    const invoiceNumber = stripeInvoice.number || `INV-${Date.now()}`;
    
    // Upsert invoice to local database
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: stripeInvoice.id },
      update: {
        status: 'paid',
        paidAt: new Date(),
        amountPaid: stripeInvoice.amount_paid / 100, // Convert from cents
        amountDue: 0,
        stripePdfUrl: stripeInvoice.invoice_pdf,
        stripeHostedUrl: stripeInvoice.hosted_invoice_url,
        updatedAt: new Date()
      },
      create: {
        billingProfileId: billingProfile.id,
        stripeInvoiceId: stripeInvoice.id,
        invoiceNumber,
        status: 'paid',
        currency: stripeInvoice.currency?.toUpperCase() || 'USD',
        subtotal: (stripeInvoice.subtotal || 0) / 100,
        tax: (stripeInvoice.tax || 0) / 100,
        discount: (stripeInvoice.discount?.amount || 0) / 100,
        total: (stripeInvoice.total || 0) / 100,
        amountPaid: (stripeInvoice.amount_paid || 0) / 100,
        amountDue: 0,
        lineItems: stripeInvoice.lines?.data?.map(line => ({
          description: line.description,
          amount: line.amount / 100,
          quantity: line.quantity
        })) || [],
        invoiceDate: new Date(stripeInvoice.created * 1000),
        paidAt: new Date(),
        periodStart: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000) : null,
        periodEnd: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000) : null,
        stripePdfUrl: stripeInvoice.invoice_pdf,
        stripeHostedUrl: stripeInvoice.hosted_invoice_url
      }
    });

    // Also create a payment record
    if (stripeInvoice.charge) {
      await prisma.payment.upsert({
        where: { stripePaymentIntentId: stripeInvoice.payment_intent || `pi_${stripeInvoice.charge}` },
        update: {
          status: 'succeeded',
          paidAt: new Date()
        },
        create: {
          invoiceId: (await prisma.invoice.findFirst({
            where: { stripeInvoiceId: stripeInvoice.id }
          }))?.id,
          stripePaymentIntentId: stripeInvoice.payment_intent || `pi_${stripeInvoice.charge}`,
          stripeChargeId: stripeInvoice.charge,
          amount: (stripeInvoice.amount_paid || 0) / 100,
          currency: stripeInvoice.currency?.toUpperCase() || 'USD',
          status: 'succeeded',
          paidAt: new Date()
        }
      }).catch(() => {});
    }
  } catch (error) {
    console.error('[Webhook] Failed to sync paid invoice:', error);
  }
}

/**
 * Handle invoice.payment_failed
 */
async function handleInvoicePaymentFailed(stripeInvoice, billingProfile) {
  console.log(`[Webhook] Invoice payment failed: ${stripeInvoice.id}`);
  
  if (!billingProfile) return;

  try {
    const invoiceNumber = stripeInvoice.number || `INV-${Date.now()}`;
    
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: stripeInvoice.id },
      update: {
        status: 'open', // Payment failed but invoice still open
        updatedAt: new Date()
      },
      create: {
        billingProfileId: billingProfile.id,
        stripeInvoiceId: stripeInvoice.id,
        invoiceNumber,
        status: 'open',
        currency: stripeInvoice.currency?.toUpperCase() || 'USD',
        subtotal: (stripeInvoice.subtotal || 0) / 100,
        tax: (stripeInvoice.tax || 0) / 100,
        discount: 0,
        total: (stripeInvoice.total || 0) / 100,
        amountPaid: 0,
        amountDue: (stripeInvoice.amount_due || 0) / 100,
        lineItems: [],
        invoiceDate: new Date(stripeInvoice.created * 1000),
        dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null
      }
    });

    // Update billing profile to mark payment issue
    await prisma.billingProfile.update({
      where: { id: billingProfile.id },
      data: {
        status: 'past_due'
      }
    });
  } catch (error) {
    console.error('[Webhook] Failed to handle invoice payment failed:', error);
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(subscription, billingProfile) {
  console.log(`[Webhook] Subscription updated: ${subscription.id}`);
  
  if (!billingProfile) return;

  try {
    // Update billing profile with new subscription details
    const plan = subscription.metadata?.plan || subscription.items?.data?.[0]?.price?.metadata?.plan || 'pro';
    
    await prisma.billingProfile.update({
      where: { id: billingProfile.id },
      data: {
        stripeSubscriptionId: subscription.id,
        plan,
        status: subscription.status === 'active' ? 'active' : 
               subscription.status === 'past_due' ? 'past_due' :
               subscription.status === 'canceled' ? 'canceled' : subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('[Webhook] Failed to handle subscription updated:', error);
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription, billingProfile) {
  console.log(`[Webhook] Subscription deleted: ${subscription.id}`);
  
  if (!billingProfile) return;

  try {
    await prisma.billingProfile.update({
      where: { id: billingProfile.id },
      data: {
        status: 'canceled',
        plan: 'free',
        canceledAt: new Date(),
        stripeSubscriptionId: null,
        updatedAt: new Date()
      }
    });

    // Also update the client
    await prisma.client.update({
      where: { id: billingProfile.clientId },
      data: {
        subscriptionPlan: 'free',
        subscriptionStatus: 'canceled'
      }
    });
  } catch (error) {
    console.error('[Webhook] Failed to handle subscription deleted:', error);
  }
}

/**
 * Handle payment_intent.succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log(`[Webhook] Payment intent succeeded: ${paymentIntent.id}`);
  
  const tenantId = paymentIntent.metadata?.tenantId;
  if (tenantId) {
    const prisma = require('../../lib/prisma');
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        last_payment_at: new Date(),
        payment_failed: false,
        updated_at: new Date()
      }
    }).catch(err => console.error('[Webhook] Failed to update tenant:', err));
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(subscription) {
  console.log(`[Webhook] Subscription created: ${subscription.id}`);
  
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    console.warn('[Webhook] Subscription created without tenantId');
    return;
  }

  const prisma = require('../../lib/prisma');
  const plan = subscription.metadata?.plan || 'pro';

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripe_subscription_id: subscription.id,
      plan: plan,
      subscription_status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_expires_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000) 
        : null,
      updated_at: new Date()
    }
  });

  // Update quotas
  await stripeService.updateTenantQuotas(tenantId, plan);

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      action: 'SUBSCRIPTION_CREATED_WEBHOOK',
      resource_type: 'billing',
      resource_id: subscription.id,
      details: {
        plan,
        status: subscription.status,
        trialEnd: subscription.trial_end
      },
      created_at: new Date()
    }
  }).catch(err => console.error('[Webhook] Failed to create audit log:', err));
}

/**
 * Handle trial will end (3 days before)
 */
async function handleTrialWillEnd(subscription) {
  console.log(`[Webhook] Trial will end for subscription: ${subscription.id}`);
  
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    return;
  }

  const prisma = require('../../lib/prisma');
  const emailService = require('../../services/email/emailService');

  // Get tenant and admin
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        where: { role: { name: 'admin' } },
        take: 1
      }
    }
  });

  if (!tenant?.users[0]) {
    return;
  }

  const admin = tenant.users[0];
  const trialEndDate = new Date(subscription.trial_end * 1000);

  // Send reminder email
  await emailService.send({
    to: admin.email,
    subject: `Your trial ends in 3 days - ${tenant.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Your trial is ending soon!</h1>
        <p>Hi ${admin.name},</p>
        <p>Your free trial for <strong>${tenant.name}</strong> will end on <strong>${trialEndDate.toLocaleDateString()}</strong>.</p>
        <p>To continue using all features, please add a payment method:</p>
        <a href="${process.env.FRONTEND_URL}/billing" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
          Add Payment Method
        </a>
        <p>If you don't add a payment method, your account will be downgraded to the Free plan with limited features.</p>
        <p>Questions? Reply to this email.</p>
        <p>Best,<br>The BISMAN ERP Team</p>
      </div>
    `
  }).catch(err => console.error('[Webhook] Failed to send trial ending email:', err));
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutCompleted(session) {
  console.log(`[Webhook] Checkout completed: ${session.id}`);
  
  const tenantId = session.metadata?.tenantId;
  const plan = session.metadata?.plan;

  if (!tenantId) {
    console.warn('[Webhook] Checkout completed without tenantId');
    return;
  }

  const prisma = require('../../lib/prisma');

  // Update tenant with customer ID if not set
  if (session.customer) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripe_customer_id: session.customer,
        updated_at: new Date()
      }
    });
  }

  // If subscription mode, the subscription.created event will handle the rest
  if (session.mode === 'subscription' && session.subscription) {
    console.log(`[Webhook] Subscription ${session.subscription} created via checkout`);
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      action: 'CHECKOUT_COMPLETED',
      resource_type: 'billing',
      resource_id: session.id,
      details: {
        plan,
        mode: session.mode,
        customerId: session.customer,
        subscriptionId: session.subscription
      },
      created_at: new Date()
    }
  }).catch(err => console.error('[Webhook] Failed to create audit log:', err));
}

module.exports = router;
