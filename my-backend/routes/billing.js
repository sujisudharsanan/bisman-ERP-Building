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

// Helper: Calculate API calls from client_daily_usage fields
function calculateApiCalls(usage) {
  if (!usage) return 0;
  return (usage.view_count || 0) + 
         (usage.create_count || 0) + 
         (usage.edit_count || 0) + 
         (usage.delete_count || 0);
}

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

    let billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    // Create billing profile if doesn't exist
    if (!billingProfile) {
      const client = await prisma.clients.findUnique({
        where: { id: tenantId },
        select: { name: true, subscriptionPlan: true, trial_start_date: true, trial_end_date: true }
      });

      if (!client) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      billingProfile = await prisma.billing_profiles.create({
        data: {
          client_id: tenantId,
          plan: client.subscriptionPlan || 'free',
          trial_start_date: client.trial_start_date,
          trial_end_date: client.trial_end_date,
          billing_name: client.name
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
    const { billing_name, billing_email, billing_address, tax_id, tax_idType } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const billingProfile = await prisma.billing_profiles.upsert({
      where: { client_id: tenantId },
      update: {
        billing_name: billing_name ?? undefined,
        billing_email: billing_email ?? undefined,
        billing_address: billing_address ?? undefined,
        tax_id: tax_id ?? undefined,
        tax_idType: tax_idType ?? undefined,
        updatedAt: new Date()
      },
      create: {
        client_id: tenantId,
        billing_name,
        billing_email,
        billing_address,
        tax_id,
        tax_idType
      }
    });

    // Sync with Stripe if enabled
    if (stripeService.isStripeEnabled() && billingProfile.stripe_customer_id) {
      await stripeService.updateCustomer(billingProfile.stripe_customer_id, {
        name: billing_name,
        email: billing_email,
        address: billing_address,
        tax_id: tax_id
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

    const billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    const client = await prisma.clients.findUnique({
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
    const recentInvoices = await prisma.invoices.findMany({
      where: { 
        billingProfile: { client_id: tenantId }
      },
      orderBy: { invoice_date: 'desc' },
      take: 3
    });

    // Get usage for current period
    const current_period_start = billingProfile?.current_period_start || new Date(new Date().setDate(1));
    const usageRecords = await prisma.usage_records.findMany({
      where: {
        billingProfile: { client_id: tenantId },
        period_start: { gte: current_period_start }
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
        billing_cycle: billingProfile?.billing_cycle || 'monthly',
        current_period_start: billingProfile?.current_period_start,
        current_period_end: billingProfile?.current_period_end,
        next_billing_date: billingProfile?.next_billing_date,
        cancel_at_period_end: billingProfile?.cancel_at_period_end || false
      },
      trial: trialStatus,
      balance: {
        current: Number(billingProfile?.balance || 0),
        credits: Number(billingProfile?.credit_balance || 0)
      },
      paymentMethod: billingProfile?.payment_method_id ? {
        card_brand: billingProfile.card_brand,
        card_last4: billingProfile.card_last4,
        card_exp_month: billingProfile.card_exp_month,
        card_exp_year: billingProfile.card_exp_year
      } : null,
      recentInvoices: recentInvoices.map(inv => ({
        id: inv.id,
        number: inv.invoice_number,
        date: inv.invoice_date,
        total: Number(inv.total),
        status: inv.status
      })),
      usage: usageRecords.reduce((acc, record) => {
        acc[record.usage_type] = {
          used: Number(record.quantity),
          limit: Number(record.included_quantity),
          overage: Number(record.overage_quantity)
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

    const billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    if (!billingProfile?.stripe_customer_id) {
      return res.json({ paymentMethods: [], defaultPaymentMethod: null });
    }

    if (!stripeService.isStripeEnabled()) {
      return res.json({ paymentMethods: [], defaultPaymentMethod: null });
    }

    const paymentMethods = await stripeService.getPaymentMethods(billingProfile.stripe_customer_id);
    
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
        isDefault: pm.id === billingProfile.payment_method_id
      })),
      defaultPaymentMethod: billingProfile.payment_method_id
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

    let billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    // Create Stripe customer if needed
    if (!billingProfile?.stripe_customer_id) {
      const client = await prisma.clients.findUnique({
        where: { id: tenantId }
      });

      const customer = await stripeService.createCustomer({
        name: client.name,
        email: req.user?.email,
        metadata: { tenantId }
      });

      billingProfile = await prisma.billing_profiles.upsert({
        where: { client_id: tenantId },
        update: { stripe_customer_id: customer.id },
        create: { 
          client_id: tenantId,
          stripe_customer_id: customer.id,
          billing_name: client.name,
          billing_email: req.user?.email
        }
      });
    }

    const setupIntent = await stripeService.createSetupIntent(billingProfile.stripe_customer_id);
    
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
    const { payment_method_id } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (!payment_method_id) {
      return res.status(400).json({ error: 'Payment method ID required' });
    }

    const billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    if (!billingProfile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    // Get payment method details from Stripe
    const paymentMethod = await stripeService.getPaymentMethod(payment_method_id);
    
    if (!paymentMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Update default in Stripe
    await stripeService.updateCustomerDefaultPaymentMethod(
      billingProfile.stripe_customer_id, 
      payment_method_id
    );

    // Update billing profile
    await prisma.billing_profiles.update({
      where: { id: billingProfile.id },
      data: {
        payment_method_id,
        card_brand: paymentMethod.card?.brand,
        card_last4: paymentMethod.card?.last4,
        card_exp_month: paymentMethod.card?.exp_month,
        card_exp_year: paymentMethod.card?.exp_year,
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
    const { id: payment_method_id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    // Cannot delete default payment method if it's the only one
    if (billingProfile?.payment_method_id === payment_method_id) {
      return res.status(400).json({ 
        error: 'Cannot delete default payment method. Set a different default first.' 
      });
    }

    await stripeService.detachPaymentMethod(payment_method_id);
    
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

    const billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    if (!billingProfile) {
      return res.json({ invoices: [], total: 0, hasMore: false });
    }

    // Build filter
    const where = {
      billing_profile_id: billingProfile.id
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate) {
      where.invoice_date = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.invoice_date = { 
        ...where.invoice_date,
        lte: new Date(endDate) 
      };
    }

    const [invoices, total] = await Promise.all([
      prisma.invoices.findMany({
        where,
        orderBy: { invoice_date: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit),
        include: {
          payments: true
        }
      }),
      prisma.invoices.count({ where })
    ]);

    res.json({
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.invoice_number,
        status: inv.status,
        date: inv.invoice_date,
        due_date: inv.due_date,
        period_start: inv.period_start,
        period_end: inv.period_end,
        subtotal: Number(inv.subtotal),
        tax: Number(inv.tax),
        discount: Number(inv.discount),
        total: Number(inv.total),
        amount_paid: Number(inv.amount_paid),
        amount_due: Number(inv.amount_due),
        line_items: inv.line_items,
        pdfUrl: inv.stripe_pdf_url,
        hostedUrl: inv.stripe_hosted_url,
        payments: inv.payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          status: p.status,
          paid_at: p.paid_at,
          card_last4: p.card_last4,
          card_brand: p.card_brand
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

    const invoice = await prisma.invoices.findFirst({
      where: {
        id,
        billingProfile: { client_id: tenantId }
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
        number: invoice.invoice_number,
        status: invoice.status,
        date: invoice.invoice_date,
        due_date: invoice.due_date,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        discount: Number(invoice.discount),
        total: Number(invoice.total),
        amount_paid: Number(invoice.amount_paid),
        amount_due: Number(invoice.amount_due),
        line_items: invoice.line_items,
        description: invoice.description,
        notes: invoice.notes,
        pdfUrl: invoice.stripe_pdf_url,
        hostedUrl: invoice.stripe_hosted_url,
        payments: invoice.payments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          status: p.status,
          paid_at: p.paid_at,
          card_last4: p.card_last4,
          card_brand: p.card_brand,
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

    const invoice = await prisma.invoices.findFirst({
      where: {
        id,
        billingProfile: { client_id: tenantId }
      }
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.stripe_pdf_url) {
      return res.status(404).json({ error: 'PDF not available' });
    }

    // Redirect to Stripe PDF URL
    res.redirect(invoice.stripe_pdf_url);
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

    const invoice = await prisma.invoices.findFirst({
      where: {
        id,
        billingProfile: { client_id: tenantId }
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

    if (!invoice.stripe_invoice_id) {
      return res.status(400).json({ error: 'Invoice cannot be paid online' });
    }

    // Pay via Stripe
    const paidInvoice = await stripeService.payInvoice(invoice.stripe_invoice_id);

    // Update local invoice
    await prisma.invoices.update({
      where: { id },
      data: {
        status: 'paid',
        paid_at: new Date(),
        amount_paid: invoice.total,
        amount_due: 0
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

    const billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    const period_start = startDate 
      ? new Date(startDate) 
      : (billingProfile?.current_period_start || new Date(new Date().setDate(1)));
    
    const period_end = endDate 
      ? new Date(endDate) 
      : (billingProfile?.current_period_end || new Date());

    // Get aggregated usage
    const usageRecords = await prisma.usage_records.findMany({
      where: {
        billingProfile: { client_id: tenantId },
        period_start: { gte: period_start },
        period_end: { lte: period_end }
      }
    });

    // Get daily usage for charts
    const dailyUsage = await prisma.client_daily_usage.findMany({
      where: {
        client_id: tenantId,
        usage_date: {
          gte: period_start,
          lte: period_end
        }
      },
      orderBy: { usage_date: 'asc' }
    });

    res.json({
      period: {
        start: period_start,
        end: period_end
      },
      summary: usageRecords.reduce((acc, record) => {
        acc[record.usage_type] = {
          used: Number(record.quantity),
          included: Number(record.included_quantity),
          overage: Number(record.overage_quantity),
          unit_price: Number(record.unit_price),
          overage_price: Number(record.overage_price),
          total_amount: Number(record.total_amount)
        };
        return acc;
      }, {}),
      daily: dailyUsage.map(d => ({
        date: d.date,
        apiCalls: calculateApiCalls(d),
        activeUsers: Number(d.active_users || 0),
        viewCount: d.view_count || 0,
        createCount: d.create_count || 0,
        editCount: d.edit_count || 0,
        deleteCount: d.delete_count || 0
      })),
      overageCharges: usageRecords
        .filter(r => Number(r.overage_quantity) > 0)
        .reduce((sum, r) => sum + Number(r.total_amount), 0)
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

    const client = await prisma.clients.findUnique({
      where: { id: tenantId },
      select: {
        trial_start_date: true,
        trial_end_date: true,
        subscriptionPlan: true,
        subscriptionStatus: true
      }
    });

    const billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
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
    await prisma.billing_profiles.update({
      where: { client_id: tenantId },
      data: {
        cancel_at_period_end: !immediately,
        canceledAt: immediately ? new Date() : null,
        status: immediately ? 'canceled' : 'active'
      }
    });

    res.json({
      success: true,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
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
    await prisma.billing_profiles.update({
      where: { client_id: tenantId },
      data: {
        plan,
        cancel_at_period_end: false,
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

    const billingProfile = await prisma.billing_profiles.findUnique({
      where: { client_id: tenantId }
    });

    if (!billingProfile?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription to reactivate' });
    }

    const subscription = await stripeService.reactivateSubscription(
      billingProfile.stripe_subscription_id
    );

    // Update billing profile
    await prisma.billing_profiles.update({
      where: { id: billingProfile.id },
      data: {
        cancel_at_period_end: false,
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
