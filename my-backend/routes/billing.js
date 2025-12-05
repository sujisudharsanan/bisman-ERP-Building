/**
 * Billing API Routes
 * 
 * Comprehensive billing management for tenants
 */

const express = require('express');
const router = express.Router();
const { authenticate, setTenantContext } = require('../middleware/auth');
const stripeService = require('../services/billing/stripeService');
const prisma = require('../lib/prisma');

// All routes require authentication
router.use(authenticate);
router.use(setTenantContext);

// ============================================================================
// BILLING PROFILE ROUTES
// ============================================================================

/**
 * GET /api/billing/profile
 * 
 * Get current tenant's billing profile
 */
router.get('/profile', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    let billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    // Create billing profile if doesn't exist
    if (!billingProfile) {
      const client = await prisma.client.findUnique({
        where: { id: tenantId },
        select: { name: true, subscriptionPlan: true, trial_start_date: true, trial_end_date: true }
      });

      if (!client) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      billingProfile = await prisma.billingProfile.create({
        data: {
          clientId: tenantId,
          plan: client.subscriptionPlan || 'free',
          trialStartDate: client.trial_start_date,
          trialEndDate: client.trial_end_date,
          billingName: client.name
        }
      });
    }

    res.json({ profile: billingProfile });
  } catch (error) {
    console.error('[Billing] Get profile error:', error);
    res.status(500).json({ error: 'Failed to get billing profile' });
  }
});

/**
 * PUT /api/billing/profile
 * 
 * Update billing profile
 */
router.put('/profile', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { billingName, billingEmail, billingAddress, taxId, taxIdType } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const billingProfile = await prisma.billingProfile.upsert({
      where: { clientId: tenantId },
      update: {
        billingName: billingName ?? undefined,
        billingEmail: billingEmail ?? undefined,
        billingAddress: billingAddress ?? undefined,
        taxId: taxId ?? undefined,
        taxIdType: taxIdType ?? undefined,
        updatedAt: new Date()
      },
      create: {
        clientId: tenantId,
        billingName,
        billingEmail,
        billingAddress,
        taxId,
        taxIdType
      }
    });

    // Sync with Stripe if enabled
    if (stripeService.isStripeEnabled() && billingProfile.stripeCustomerId) {
      await stripeService.updateCustomer(billingProfile.stripeCustomerId, {
        name: billingName,
        email: billingEmail,
        address: billingAddress,
        tax_id: taxId
      });
    }

    res.json({ profile: billingProfile });
  } catch (error) {
    console.error('[Billing] Update profile error:', error);
    res.status(500).json({ error: 'Failed to update billing profile' });
  }
});

// ============================================================================
// SUBSCRIPTION STATUS ROUTES
// ============================================================================

/**
 * GET /api/billing/status
 * 
 * Get current subscription status
 */
router.get('/status', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const status = await stripeService.getSubscriptionStatus(tenantId);
    res.json(status);

  } catch (error) {
    console.error('[Billing] Get status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * GET /api/billing/summary
 * 
 * Get comprehensive billing summary for dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    const client = await prisma.client.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        trial_start_date: true,
        trial_end_date: true
      }
    });

    // Get recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      where: { 
        billingProfile: { clientId: tenantId }
      },
      orderBy: { invoiceDate: 'desc' },
      take: 3
    });

    // Get usage for current period
    const currentPeriodStart = billingProfile?.currentPeriodStart || new Date(new Date().setDate(1));
    const usageRecords = await prisma.usageRecord.findMany({
      where: {
        billingProfile: { clientId: tenantId },
        periodStart: { gte: currentPeriodStart }
      }
    });

    // Calculate trial status
    let trialStatus = null;
    if (client?.trial_end_date) {
      const now = new Date();
      const trialEnd = new Date(client.trial_end_date);
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      trialStatus = {
        isActive: daysRemaining > 0,
        endDate: client.trial_end_date,
        daysRemaining,
        startDate: client.trial_start_date
      };
    }

    res.json({
      subscription: {
        plan: billingProfile?.plan || client?.subscriptionPlan || 'free',
        status: billingProfile?.status || client?.subscriptionStatus || 'active',
        billingCycle: billingProfile?.billingCycle || 'monthly',
        currentPeriodStart: billingProfile?.currentPeriodStart,
        currentPeriodEnd: billingProfile?.currentPeriodEnd,
        nextBillingDate: billingProfile?.nextBillingDate,
        cancelAtPeriodEnd: billingProfile?.cancelAtPeriodEnd || false
      },
      trial: trialStatus,
      balance: {
        current: Number(billingProfile?.balance || 0),
        credits: Number(billingProfile?.creditBalance || 0)
      },
      paymentMethod: billingProfile?.paymentMethodId ? {
        cardBrand: billingProfile.cardBrand,
        cardLast4: billingProfile.cardLast4,
        cardExpMonth: billingProfile.cardExpMonth,
        cardExpYear: billingProfile.cardExpYear
      } : null,
      recentInvoices: recentInvoices.map(inv => ({
        id: inv.id,
        number: inv.invoiceNumber,
        date: inv.invoiceDate,
        total: Number(inv.total),
        status: inv.status
      })),
      usage: usageRecords.reduce((acc, record) => {
        acc[record.usageType] = {
          used: Number(record.quantity),
          limit: Number(record.includedQuantity),
          overage: Number(record.overageQuantity)
        };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('[Billing] Get summary error:', error);
    res.status(500).json({ error: 'Failed to get billing summary' });
  }
});

/**
 * GET /api/billing/plans
 * 
 * Get available plans
 */
router.get('/plans', async (req, res) => {
  const plans = Object.entries(stripeService.PLANS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    quotas: plan.quotas,
    priceId: plan.priceId ? '***' : null // Don't expose price IDs
  }));

  res.json({ plans });
});

// ============================================================================
// PAYMENT METHOD ROUTES
// ============================================================================

/**
 * GET /api/billing/payment-methods
 * 
 * Get saved payment methods
 */
router.get('/payment-methods', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    if (!billingProfile?.stripeCustomerId) {
      return res.json({ paymentMethods: [], defaultPaymentMethod: null });
    }

    if (!stripeService.isStripeEnabled()) {
      return res.json({ paymentMethods: [], defaultPaymentMethod: null });
    }

    const paymentMethods = await stripeService.getPaymentMethods(billingProfile.stripeCustomerId);
    
    res.json({
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year
        } : null,
        isDefault: pm.id === billingProfile.paymentMethodId
      })),
      defaultPaymentMethod: billingProfile.paymentMethodId
    });
  } catch (error) {
    console.error('[Billing] Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

/**
 * POST /api/billing/payment-methods/setup
 * 
 * Create setup intent for adding payment method
 */
router.post('/payment-methods/setup', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (!stripeService.isStripeEnabled()) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    let billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    // Create Stripe customer if needed
    if (!billingProfile?.stripeCustomerId) {
      const client = await prisma.client.findUnique({
        where: { id: tenantId }
      });

      const customer = await stripeService.createCustomer({
        name: client.name,
        email: req.user?.email,
        metadata: { tenantId }
      });

      billingProfile = await prisma.billingProfile.upsert({
        where: { clientId: tenantId },
        update: { stripeCustomerId: customer.id },
        create: { 
          clientId: tenantId,
          stripeCustomerId: customer.id,
          billingName: client.name,
          billingEmail: req.user?.email
        }
      });
    }

    const setupIntent = await stripeService.createSetupIntent(billingProfile.stripeCustomerId);
    
    res.json({
      clientSecret: setupIntent.client_secret
    });
  } catch (error) {
    console.error('[Billing] Setup payment method error:', error);
    res.status(500).json({ error: 'Failed to setup payment method' });
  }
});

/**
 * PUT /api/billing/payment-methods/default
 * 
 * Set default payment method
 */
router.put('/payment-methods/default', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { paymentMethodId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID required' });
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    if (!billingProfile?.stripeCustomerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    // Get payment method details from Stripe
    const paymentMethod = await stripeService.getPaymentMethod(paymentMethodId);
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Update default in Stripe
    await stripeService.updateCustomerDefaultPaymentMethod(
      billingProfile.stripeCustomerId, 
      paymentMethodId
    );

    // Update billing profile
    await prisma.billingProfile.update({
      where: { id: billingProfile.id },
      data: {
        paymentMethodId,
        cardBrand: paymentMethod.card?.brand,
        cardLast4: paymentMethod.card?.last4,
        cardExpMonth: paymentMethod.card?.exp_month,
        cardExpYear: paymentMethod.card?.exp_year,
        updatedAt: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Billing] Set default payment method error:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

/**
 * DELETE /api/billing/payment-methods/:id
 * 
 * Remove payment method
 */
router.delete('/payment-methods/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id: paymentMethodId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    // Cannot delete default payment method if it's the only one
    if (billingProfile?.paymentMethodId === paymentMethodId) {
      return res.status(400).json({ 
        error: 'Cannot delete default payment method. Set a different default first.' 
      });
    }

    await stripeService.detachPaymentMethod(paymentMethodId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Billing] Delete payment method error:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

// ============================================================================
// INVOICE ROUTES
// ============================================================================

/**
 * GET /api/billing/invoices
 * 
 * Get invoice history
 */
router.get('/invoices', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { limit = 20, page = 1, status, startDate, endDate } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    if (!billingProfile) {
      return res.json({ invoices: [], total: 0, hasMore: false });
    }

    // Build filter
    const where = {
      billingProfileId: billingProfile.id
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate) {
      where.invoiceDate = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.invoiceDate = { 
        ...where.invoiceDate,
        lte: new Date(endDate) 
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        include: {
          payments: true
        }
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.invoiceNumber,
        status: inv.status,
        date: inv.invoiceDate,
        dueDate: inv.dueDate,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        subtotal: Number(inv.subtotal),
        tax: Number(inv.tax),
        discount: Number(inv.discount),
        total: Number(inv.total),
        amountPaid: Number(inv.amountPaid),
        amountDue: Number(inv.amountDue),
        lineItems: inv.lineItems,
        pdfUrl: inv.stripePdfUrl,
        hostedUrl: inv.stripeHostedUrl,
        payments: inv.payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          status: p.status,
          paidAt: p.paidAt,
          cardLast4: p.cardLast4,
          cardBrand: p.cardBrand
        }))
      })),
      total,
      hasMore: total > parseInt(page) * parseInt(limit)
    });
  } catch (error) {
    console.error('[Billing] Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

/**
 * GET /api/billing/invoices/:id
 * 
 * Get specific invoice details
 */
router.get('/invoices/:id', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        billingProfile: { clientId: tenantId }
      },
      include: {
        payments: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      invoice: {
        id: invoice.id,
        number: invoice.invoiceNumber,
        status: invoice.status,
        date: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        periodStart: invoice.periodStart,
        periodEnd: invoice.periodEnd,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        discount: Number(invoice.discount),
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
        amountDue: Number(invoice.amountDue),
        lineItems: invoice.lineItems,
        description: invoice.description,
        notes: invoice.notes,
        pdfUrl: invoice.stripePdfUrl,
        hostedUrl: invoice.stripeHostedUrl,
        payments: invoice.payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          status: p.status,
          paidAt: p.paidAt,
          cardLast4: p.cardLast4,
          cardBrand: p.cardBrand,
          failureCode: p.failureCode,
          failureMessage: p.failureMessage
        }))
      }
    });
  } catch (error) {
    console.error('[Billing] Get invoice error:', error);
    res.status(500).json({ error: 'Failed to get invoice' });
  }
});

/**
 * GET /api/billing/invoices/:id/pdf
 * 
 * Get invoice PDF URL (redirect or proxy)
 */
router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        billingProfile: { clientId: tenantId }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.stripePdfUrl) {
      return res.status(404).json({ error: 'PDF not available' });
    }

    // Redirect to Stripe PDF URL
    res.redirect(invoice.stripePdfUrl);
  } catch (error) {
    console.error('[Billing] Get invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to get invoice PDF' });
  }
});

/**
 * POST /api/billing/invoices/:id/pay
 * 
 * Pay an open invoice
 */
router.post('/invoices/:id/pay', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        billingProfile: { clientId: tenantId }
      },
      include: {
        billingProfile: true
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    if (!invoice.stripeInvoiceId) {
      return res.status(400).json({ error: 'Invoice cannot be paid online' });
    }

    // Pay via Stripe
    const paidInvoice = await stripeService.payInvoice(invoice.stripeInvoiceId);

    // Update local invoice
    await prisma.invoice.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        amountPaid: invoice.total,
        amountDue: 0
      }
    });

    res.json({ success: true, invoice: paidInvoice });
  } catch (error) {
    console.error('[Billing] Pay invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to pay invoice' });
  }
});

/**
 * GET /api/billing/upcoming-invoice
 * 
 * Get upcoming invoice preview
 */
router.get('/upcoming-invoice', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!stripeService.isStripeEnabled()) {
      return res.json({ invoice: null });
    }

    const invoice = await stripeService.getUpcomingInvoice(tenantId);
    res.json({ invoice });

  } catch (error) {
    console.error('[Billing] Get upcoming invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to get upcoming invoice' });
  }
});

// ============================================================================
// USAGE ROUTES
// ============================================================================

/**
 * GET /api/billing/usage
 * 
 * Get usage for current billing period
 */
router.get('/usage', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    const periodStart = startDate 
      ? new Date(startDate) 
      : (billingProfile?.currentPeriodStart || new Date(new Date().setDate(1)));
    
    const periodEnd = endDate 
      ? new Date(endDate) 
      : (billingProfile?.currentPeriodEnd || new Date());

    // Get aggregated usage
    const usageRecords = await prisma.usageRecord.findMany({
      where: {
        billingProfile: { clientId: tenantId },
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd }
      }
    });

    // Get daily usage for charts
    const dailyUsage = await prisma.clientDailyUsage.findMany({
      where: {
        client_id: tenantId,
        usage_date: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      orderBy: { usage_date: 'asc' }
    });

    res.json({
      period: {
        start: periodStart,
        end: periodEnd
      },
      summary: usageRecords.reduce((acc, record) => {
        acc[record.usageType] = {
          used: Number(record.quantity),
          included: Number(record.includedQuantity),
          overage: Number(record.overageQuantity),
          unitPrice: Number(record.unitPrice),
          overagePrice: Number(record.overagePrice),
          totalAmount: Number(record.totalAmount)
        };
        return acc;
      }, {}),
      daily: dailyUsage.map(d => ({
        date: d.usage_date,
        apiCalls: Number(d.api_calls || 0),
        storageBytes: Number(d.storage_bytes || 0),
        activeUsers: Number(d.active_users || 0)
      })),
      overageCharges: usageRecords
        .filter(r => Number(r.overageQuantity) > 0)
        .reduce((sum, r) => sum + Number(r.totalAmount), 0)
    });
  } catch (error) {
    console.error('[Billing] Get usage error:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

// ============================================================================
// TRIAL ROUTES
// ============================================================================

/**
 * GET /api/billing/trial
 * 
 * Get trial status
 */
router.get('/trial', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const client = await prisma.client.findUnique({
      where: { id: tenantId },
      select: {
        trial_start_date: true,
        trial_end_date: true,
        subscriptionPlan: true,
        subscriptionStatus: true
      }
    });

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const now = new Date();
    const trialEnd = client.trial_end_date ? new Date(client.trial_end_date) : null;
    
    let trialStatus = 'none';
    let daysRemaining = 0;
    
    if (trialEnd) {
      if (now < trialEnd) {
        trialStatus = 'active';
        daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        trialStatus = 'expired';
      }
    }

    res.json({
      trial: {
        status: trialStatus,
        startDate: client.trial_start_date,
        endDate: client.trial_end_date,
        daysRemaining,
        extended: billingProfile?.trialExtended || false,
        extensionDays: billingProfile?.trialExtensionDays || 0
      },
      currentPlan: client.subscriptionPlan,
      subscriptionStatus: client.subscriptionStatus
    });
  } catch (error) {
    console.error('[Billing] Get trial error:', error);
    res.status(500).json({ error: 'Failed to get trial status' });
  }
});

// ============================================================================
// CHECKOUT & PORTAL ROUTES
// ============================================================================

/**
 * POST /api/billing/checkout
 * 
 * Create checkout session for upgrade
 */
router.post('/checkout', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Plan required' });
    }

    if (!stripeService.isStripeEnabled()) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    const session = await stripeService.createCheckoutSession(tenantId, plan, {
      email: req.user?.email
    });

    res.json(session);

  } catch (error) {
    console.error('[Billing] Checkout error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

/**
 * POST /api/billing/portal
 * 
 * Create customer portal session
 */
router.post('/portal', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!stripeService.isStripeEnabled()) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    const session = await stripeService.createPortalSession(tenantId);
    res.json(session);

  } catch (error) {
    console.error('[Billing] Portal error:', error);
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
});

/**
 * POST /api/billing/cancel
 * 
 * Cancel subscription
 */
router.post('/cancel', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { immediately } = req.body;

    if (!stripeService.isStripeEnabled()) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    const subscription = await stripeService.cancelSubscription(tenantId, {
      immediately: immediately || false
    });

    // Update billing profile
    await prisma.billingProfile.update({
      where: { clientId: tenantId },
      data: {
        cancelAtPeriodEnd: !immediately,
        canceledAt: immediately ? new Date() : null,
        status: immediately ? 'canceled' : 'active'
      }
    });

    res.json({
      success: true,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });

  } catch (error) {
    console.error('[Billing] Cancel error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/billing/change-plan
 * 
 * Change subscription plan
 */
router.post('/change-plan', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ error: 'Plan required' });
    }

    if (!stripeService.isStripeEnabled()) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    const subscription = await stripeService.changePlan(tenantId, plan);

    // Update billing profile
    await prisma.billingProfile.update({
      where: { clientId: tenantId },
      data: {
        plan,
        cancelAtPeriodEnd: false,
        canceledAt: null
      }
    });

    res.json({
      success: true,
      plan,
      status: subscription.status
    });

  } catch (error) {
    console.error('[Billing] Change plan error:', error);
    res.status(500).json({ error: error.message || 'Failed to change plan' });
  }
});

/**
 * POST /api/billing/reactivate
 * 
 * Reactivate canceled subscription
 */
router.post('/reactivate', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!stripeService.isStripeEnabled()) {
      return res.status(503).json({ error: 'Billing not configured' });
    }

    const billingProfile = await prisma.billingProfile.findUnique({
      where: { clientId: tenantId }
    });

    if (!billingProfile?.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription to reactivate' });
    }

    const subscription = await stripeService.reactivateSubscription(
      billingProfile.stripeSubscriptionId
    );

    // Update billing profile
    await prisma.billingProfile.update({
      where: { id: billingProfile.id },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
        status: 'active'
      }
    });

    res.json({
      success: true,
      status: subscription.status
    });

  } catch (error) {
    console.error('[Billing] Reactivate error:', error);
    res.status(500).json({ error: error.message || 'Failed to reactivate subscription' });
  }
});

module.exports = router;
