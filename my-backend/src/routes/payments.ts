/**
 * Payment API Routes
 * Handles banker payment recording, public payment page, and webhook processing
 * 
 * Routes:
 * - POST   /api/common/tasks/:id/payment       - Banker records payment
 * - GET    /api/payment/public/:token          - Public payment page data (no auth)
 * - POST   /api/payment/webhook/razorpay       - Razorpay webhook handler
 * - POST   /api/payment/webhook/stripe         - Stripe webhook handler
 * - POST   /api/payment/initiate                - Initiate online payment
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createActivityLog } from '../utils/paymentRequestUtils';
import { authMiddleware } from '../../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

/**
 * Banker records payment
 * POST /api/common/tasks/:id/payment
 */
router.post('/:id/payment', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.username;
    const userRole = (req as any).user?.role;
    const { id } = req.params;
    const {
      paymentMode, // BankTransfer | Cheque | Online | Cash
      paymentGateway, // Razorpay | Stripe | PayPal
      transactionId,
      details, // { bankName, accountNumber, reference, etc. }
      paidAt,
      receiptUrl,
      notes,
    } = req.body;

    // Verify user is banker
    if (userRole !== 'BANKER') {
      return res.status(403).json({
        error: 'Only bankers can record payments',
      });
    }

    // Validation
    if (!paymentMode) {
      return res.status(400).json({
        error: 'Payment mode is required',
      });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        paymentRequest: true,
        expense: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify task is assigned to this banker
    if (task.assigneeId !== userId) {
      return res.status(403).json({
        error: 'This task is not assigned to you',
      });
    }

    // Verify task is in IN_PROCESS
    if (task.status !== 'IN_PROCESS') {
      return res.status(400).json({
        error: `Task must be in IN_PROCESS status. Current status: ${task.status}`,
      });
    }

    // Execute payment recording in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      const paymentRecord = await tx.paymentRecord.create({
        data: {
          taskId: task.id,
          paymentRequestId: task.paymentRequestId,
          paidById: userId,
          paymentMode,
          paymentGateway: paymentGateway || null,
          transactionId: transactionId || null,
          details: details ? JSON.stringify(details) : null,
          amount: task.paymentRequest.totalAmount,
          currency: task.paymentRequest.currency,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          receiptUrl: receiptUrl || null,
          notes: notes || null,
        },
      });

      // 2. Create payment message
      let paymentDetails = `Payment mode: ${paymentMode}`;
      if (transactionId) paymentDetails += `\nTransaction ID: ${transactionId}`;
      if (paymentGateway) paymentDetails += `\nGateway: ${paymentGateway}`;
      if (details?.bankName) paymentDetails += `\nBank: ${details.bankName}`;

      await tx.message.create({
        data: {
          taskId: task.id,
          senderId: userId,
          body: `Payment completed by ${userName}.\n${paymentDetails}\nAmount: ${task.paymentRequest.currency} ${task.paymentRequest.totalAmount.toFixed(
            2
          )}`,
          type: 'PAYMENT',
          meta: JSON.stringify({
            action: 'PAYMENT_COMPLETED',
            paymentMode,
            transactionId,
            amount: task.paymentRequest.totalAmount,
          }),
        },
      });

      // 3. Update task status to COMPLETED
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
        },
      });

      // 4. Update expense status to COMPLETED
      await tx.expense.update({
        where: { id: task.expenseId },
        data: {
          status: 'COMPLETED',
        },
      });

      // 5. Update payment request status to PAID
      await tx.paymentRequest.update({
        where: { id: task.paymentRequestId },
        data: {
          status: 'PAID',
        },
      });

      return { paymentRecord, updatedTask };
    });

    // Create activity log
    await createActivityLog(
      {
        paymentRequestId: task.paymentRequestId,
        userId,
        action: 'PAYMENT_COMPLETED',
        oldStatus: 'SENT_TO_CLIENT',
        newStatus: 'PAID',
        comment: `Payment recorded by ${userName} via ${paymentMode}${
          transactionId ? ` (${transactionId})` : ''
        }`,
        metadata: {
          paymentMode,
          transactionId,
          amount: Number(task.paymentRequest.totalAmount),
        },
      },
      prisma
    );

    // TODO: Send completion notifications to all stakeholders

    res.json({
      success: true,
      data: result,
      message: 'Payment recorded successfully',
    });
  } catch (error: any) {
    console.error('Record payment error:', error);
    res.status(500).json({
      error: 'Failed to record payment',
      details: error.message,
    });
  }
});

/**
 * Get public payment page data (no authentication required)
 * GET /api/payment/public/:token
 */
router.get('/public/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { paymentToken: token },
      include: {
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        client: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
    }) as any;

    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found or link expired' });
    }

    // Check if already paid
    if (paymentRequest.status === 'PAID' || paymentRequest.status === 'CLOSED') {
      return res.status(400).json({
        error: 'This payment has already been completed',
        paid: true,
      });
    }

    // Return sanitized data for public view
    res.json({
      success: true,
      data: {
        requestId: paymentRequest.requestId,
        clientName: paymentRequest.clientName,
        clientEmail: paymentRequest.clientEmail,
        invoiceNumber: paymentRequest.invoiceNumber,
        description: paymentRequest.description,
        subtotal: paymentRequest.subtotal,
        taxAmount: paymentRequest.taxAmount,
        discountAmount: paymentRequest.discountAmount,
        totalAmount: paymentRequest.totalAmount,
        currency: paymentRequest.currency,
        dueDate: paymentRequest.dueDate,
        lineItems: paymentRequest.lineItems,
        companyLogo: paymentRequest.client?.logo || null,
        status: paymentRequest.status,
      },
    });
  } catch (error: any) {
    console.error('Get public payment page error:', error);
    res.status(500).json({
      error: 'Failed to load payment details',
      details: error.message,
    });
  }
});

/**
 * Initiate online payment (Razorpay/Stripe)
 * POST /api/payment/initiate
 */
router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const { token, paymentGateway } = req.body; // 'razorpay' or 'stripe'

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { paymentToken: token },
    }) as any;

    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    if (paymentRequest.status === 'PAID') {
      return res.status(400).json({ error: 'Payment already completed' });
    }

    // Create order in payment gateway
    if (paymentGateway === 'razorpay') {
      // Razorpay integration
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount: Math.round(Number(paymentRequest.totalAmount) * 100), // Razorpay uses paise
        currency: paymentRequest.currency,
        receipt: paymentRequest.requestId,
        notes: {
          paymentRequestId: paymentRequest.id,
          requestId: paymentRequest.requestId,
          clientName: paymentRequest.clientName,
        },
      });

      res.json({
        success: true,
        gateway: 'razorpay',
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      });
    } else if (paymentGateway === 'stripe') {
      // Stripe integration
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: paymentRequest.currency.toLowerCase(),
            product_data: {
              name: paymentRequest.description || 'Payment',
            },
            unit_amount: Math.round(Number(paymentRequest.totalAmount) * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.PAYMENT_BASE_URL}/payment/${token}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.PAYMENT_BASE_URL}/payment/${token}`,
        client_reference_id: paymentRequest.id,
        metadata: {
          paymentRequestId: paymentRequest.id,
          requestId: paymentRequest.requestId,
        },
      });

      res.json({
        success: true,
        gateway: 'stripe',
        data: {
          sessionId: session.id,
          url: session.url,
        },
      });
    } else {
      return res.status(400).json({
        error: 'Invalid payment gateway. Supported: razorpay, stripe',
      });
    }
  } catch (error: any) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      error: 'Failed to initiate payment',
      details: error.message,
    });
  }
});

/**
 * Razorpay webhook handler
 * POST /api/payment/webhook/razorpay
 */
router.post('/webhook/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret!)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const amount = payment.amount / 100; // Convert paise to rupees

      // Find payment request by order notes
      const order = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
          ).toString('base64')}`,
        },
      }).then((r) => r.json()) as any;

      const paymentRequestId = order.notes?.paymentRequestId;

      if (paymentRequestId) {
        await handleSuccessfulPayment({
          paymentRequestId,
          paymentMode: 'Online',
          paymentGateway: 'Razorpay',
          transactionId: paymentId,
          amount,
          details: {
            orderId,
            method: payment.method,
            email: payment.email,
            contact: payment.contact,
          },
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stripe webhook handler
 * POST /api/payment/webhook/stripe
 */
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err: any) {
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paymentRequestId = session.metadata.paymentRequestId;
      const amount = session.amount_total / 100;

      if (paymentRequestId) {
        await handleSuccessfulPayment({
          paymentRequestId,
          paymentMode: 'Online',
          paymentGateway: 'Stripe',
          transactionId: session.payment_intent,
          amount,
          details: {
            sessionId: session.id,
            customerEmail: session.customer_email,
          },
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Handle successful payment from any gateway
 */
async function handleSuccessfulPayment({
  paymentRequestId,
  paymentMode,
  paymentGateway,
  transactionId,
  amount,
  details,
}: {
  paymentRequestId: string;
  paymentMode: string;
  paymentGateway: string;
  transactionId: string;
  amount: number;
  details: any;
}) {
  const paymentRequest = await prisma.paymentRequest.findUnique({
    where: { id: paymentRequestId },
    include: { task: true },
  });

  if (!paymentRequest || !paymentRequest.task) {
    throw new Error('Payment request or task not found');
  }

  // Record payment in transaction
  await prisma.$transaction(async (tx) => {
    // Create payment record
    await tx.paymentRecord.create({
      data: {
        taskId: paymentRequest.task!.id,
        paymentRequestId: paymentRequest.id,
        paidById: null, // Online payment, no specific banker
        paymentMode,
        paymentGateway,
        transactionId,
        details: JSON.stringify(details),
        amount: paymentRequest.totalAmount,
        currency: paymentRequest.currency,
        paidAt: new Date(),
      },
    });

    // Create payment message
    await tx.message.create({
      data: {
        taskId: paymentRequest.task!.id,
        senderId: paymentRequest.createdById,
        body: `Online payment received via ${paymentGateway}.\nTransaction ID: ${transactionId}\nAmount: ${paymentRequest.currency} ${amount.toFixed(
          2
        )}`,
        type: 'PAYMENT',
        meta: JSON.stringify({
          action: 'ONLINE_PAYMENT',
          gateway: paymentGateway,
          transactionId,
          amount,
        }),
      },
    });

    // Update statuses
    await tx.task.update({
      where: { id: paymentRequest.task!.id },
      data: { status: 'COMPLETED' },
    });

    await tx.expense.update({
      where: { id: paymentRequest.task!.expenseId },
      data: { status: 'COMPLETED' },
    });

    await tx.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: { status: 'PAID' },
    });
  });

  // Create activity log
  await createActivityLog(
    {
      paymentRequestId: paymentRequest.id,
      action: 'ONLINE_PAYMENT',
      oldStatus: 'SENT_TO_CLIENT',
      newStatus: 'PAID',
      comment: `Online payment received via ${paymentGateway} (${transactionId})`,
      metadata: { paymentGateway, transactionId, amount },
    },
    prisma
  );

  // TODO: Send payment confirmation email
}

export default router;
