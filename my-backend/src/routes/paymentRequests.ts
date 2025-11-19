/**
 * Payment Requests API Routes
 * Handles CRUD operations for payment requests
 * 
 * Routes:
 * - POST   /api/common/payment-requests        - Create new payment request
 * - GET    /api/common/payment-requests        - List payment requests
 * - GET    /api/common/payment-requests/:id    - Get payment request details
 * - PUT    /api/common/payment-requests/:id    - Update payment request
 * - DELETE /api/common/payment-requests/:id    - Delete payment request
 * - POST   /api/common/payment-requests/:id/submit - Submit for approval
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  generatePaymentRequestId,
  generatePaymentToken,
  calculateLineTotal,
  calculateTotals,
  createActivityLog,
  isValidStatusTransition,
} from '../utils/paymentRequestUtils';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * Create new payment request
 * POST /api/common/payment-requests
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      description,
      notes,
      dueDate,
      invoiceNumber,
      lineItems = [],
      attachments = [],
    } = req.body;

    // Validation
    if (!clientName || lineItems.length === 0) {
      return res.status(400).json({
        error: 'Client name and at least one line item are required',
      });
    }

    // Calculate line totals
    const processedLineItems = lineItems.map((item: any) => ({
      ...item,
      lineTotal: calculateLineTotal(
        Number(item.quantity),
        Number(item.rate),
        Number(item.taxRate || 0),
        Number(item.discountRate || 0)
      ),
    }));

    // Calculate totals
    const totals = calculateTotals(processedLineItems);

    // Generate unique request ID
    const today = new Date().toISOString().split('T')[0];
    const countToday = await prisma.paymentRequest.count({
      where: {
        requestId: {
          contains: today,
        },
      },
    });
    const requestId = generatePaymentRequestId(countToday + 1);

    // Create payment request with line items
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        requestId,
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        description,
        notes,
        dueDate: dueDate ? new Date(dueDate) : null,
        invoiceNumber,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        status: 'DRAFT',
        createdById: userId,
        lineItems: {
          create: processedLineItems.map((item: any, index: number) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit || 'unit',
            rate: Number(item.rate),
            taxRate: Number(item.taxRate || 0),
            discountRate: Number(item.discountRate || 0),
            lineTotal: item.lineTotal,
            sortOrder: index,
          })),
        },
      },
      include: {
        lineItems: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Create activity log
    await createActivityLog(
      {
        paymentRequestId: paymentRequest.id,
        userId,
        action: 'CREATED',
        newStatus: 'DRAFT',
        comment: 'Payment request created',
      },
      prisma
    );

    res.status(201).json({
      success: true,
      data: paymentRequest,
      message: 'Payment request created successfully',
    });
  } catch (error: any) {
    console.error('Create payment request error:', error);
    res.status(500).json({
      error: 'Failed to create payment request',
      details: error.message,
    });
  }
});

/**
 * List payment requests with filters
 * GET /api/common/payment-requests
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      status,
      clientId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where: any = {};

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by client
    if (clientId) {
      where.clientId = clientId;
    }

    // User can see their own requests or if they have permission
    // TODO: Add role-based filtering
    where.createdById = userId;

    const skip = (Number(page) - 1) * Number(limit);

    const [paymentRequests, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: {
          [sortBy as string]: sortOrder,
        },
        include: {
          lineItems: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          task: {
            select: {
              id: true,
              status: true,
              currentLevel: true,
              assigneeId: true,
            },
          },
        },
      }),
      prisma.paymentRequest.count({ where }),
    ]);

    res.json({
      success: true,
      data: paymentRequests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('List payment requests error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment requests',
      details: error.message,
    });
  }
});

/**
 * Get payment request by ID
 * GET /api/common/payment-requests/:id
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        lineItems: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        task: {
          include: {
            approvals: {
              include: {
                approver: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
            messages: {
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
            assignee: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
        activityLogs: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    res.json({
      success: true,
      data: paymentRequest,
    });
  } catch (error: any) {
    console.error('Get payment request error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment request',
      details: error.message,
    });
  }
});

/**
 * Update payment request (only in DRAFT status)
 * PUT /api/common/payment-requests/:id
 */
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const {
      clientId,
      clientName,
      clientEmail,
      clientPhone,
      description,
      notes,
      dueDate,
      invoiceNumber,
      lineItems,
      attachments,
    } = req.body;

    // Check if payment request exists and is in DRAFT
    const existingRequest = await prisma.paymentRequest.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    if (existingRequest.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Can only edit payment requests in DRAFT status',
      });
    }

    if (existingRequest.createdById !== userId) {
      return res.status(403).json({
        error: 'You can only edit your own payment requests',
      });
    }

    // Calculate new totals if line items provided
    let totals = {
      subtotal: existingRequest.subtotal,
      taxAmount: existingRequest.taxAmount,
      discountAmount: existingRequest.discountAmount,
      totalAmount: existingRequest.totalAmount,
    };

    if (lineItems && lineItems.length > 0) {
      const processedLineItems = lineItems.map((item: any) => ({
        ...item,
        lineTotal: calculateLineTotal(
          Number(item.quantity),
          Number(item.rate),
          Number(item.taxRate || 0),
          Number(item.discountRate || 0)
        ),
      }));
      const calculatedTotals = calculateTotals(processedLineItems);
      totals = {
        subtotal: calculatedTotals.subtotal as any,
        taxAmount: calculatedTotals.taxAmount as any,
        discountAmount: calculatedTotals.discountAmount as any,
        totalAmount: calculatedTotals.totalAmount as any,
      };
    }

    // Update payment request
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Delete existing line items if new ones provided
      if (lineItems && lineItems.length > 0) {
        await tx.paymentRequestLineItem.deleteMany({
          where: { paymentRequestId: id },
        });
      }

      // Update payment request
      return tx.paymentRequest.update({
        where: { id },
        data: {
          ...(clientId !== undefined && { clientId }),
          ...(clientName !== undefined && { clientName }),
          ...(clientEmail !== undefined && { clientEmail }),
          ...(clientPhone !== undefined && { clientPhone }),
          ...(description !== undefined && { description }),
          ...(notes !== undefined && { notes }),
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(invoiceNumber !== undefined && { invoiceNumber }),
          ...(attachments !== undefined && {
            attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
          }),
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          ...(lineItems &&
            lineItems.length > 0 && {
              lineItems: {
                create: lineItems.map((item: any, index: number) => ({
                  description: item.description,
                  quantity: Number(item.quantity),
                  unit: item.unit || 'unit',
                  rate: Number(item.rate),
                  taxRate: Number(item.taxRate || 0),
                  discountRate: Number(item.discountRate || 0),
                  lineTotal: calculateLineTotal(
                    Number(item.quantity),
                    Number(item.rate),
                    Number(item.taxRate || 0),
                    Number(item.discountRate || 0)
                  ),
                  sortOrder: index,
                })),
              },
            }),
        },
        include: {
          lineItems: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });
    });

    // Create activity log
    await createActivityLog(
      {
        paymentRequestId: id,
        userId,
        action: 'UPDATED',
        comment: 'Payment request updated',
      },
      prisma
    );

    res.json({
      success: true,
      data: updatedRequest,
      message: 'Payment request updated successfully',
    });
  } catch (error: any) {
    console.error('Update payment request error:', error);
    res.status(500).json({
      error: 'Failed to update payment request',
      details: error.message,
    });
  }
});

/**
 * Delete payment request (only in DRAFT status)
 * DELETE /api/common/payment-requests/:id
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    if (paymentRequest.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Can only delete payment requests in DRAFT status',
      });
    }

    if (paymentRequest.createdById !== userId) {
      return res.status(403).json({
        error: 'You can only delete your own payment requests',
      });
    }

    await prisma.paymentRequest.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Payment request deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete payment request error:', error);
    res.status(500).json({
      error: 'Failed to delete payment request',
      details: error.message,
    });
  }
});

/**
 * Submit payment request for approval
 * POST /api/common/payment-requests/:id/submit
 */
router.post('/:id/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { requestedApprovers } = req.body; // Optional: specific approver IDs for each level

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    if (paymentRequest.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Payment request has already been submitted',
      });
    }

    if (paymentRequest.createdById !== userId) {
      return res.status(403).json({
        error: 'You can only submit your own payment requests',
      });
    }

    // Get L1 approval level
    const l1Level = await prisma.approvalLevel.findUnique({
      where: { level: 0, isActive: true },
    });

    if (!l1Level) {
      return res.status(500).json({
        error: 'L1 approval level not configured',
      });
    }

    // Find L1 approver (first user with the role, or from requested list)
    const approvers = await prisma.user.findMany({
      where: { role: l1Level.roleName },
      select: { id: true, username: true, email: true },
    });

    if (approvers.length === 0) {
      return res.status(400).json({
        error: `No users found with role: ${l1Level.roleName}`,
      });
    }

    const firstApprover = approvers[0];

    // Create expense, task, and initial message in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update payment request status
      const updatedRequest = await tx.paymentRequest.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
        },
      });

      // Create expense
      const expense = await tx.expense.create({
        data: {
          requestId: paymentRequest.requestId,
          paymentRequestId: paymentRequest.id,
          createdById: userId,
          clientId: paymentRequest.clientId,
          description: paymentRequest.description,
          amount: paymentRequest.totalAmount,
          dueDate: paymentRequest.dueDate,
          status: 'SUBMITTED',
          attachments: paymentRequest.attachments,
        },
      });

      // Create task
      const task = await tx.task.create({
        data: {
          expenseId: expense.id,
          paymentRequestId: paymentRequest.id,
          title: `Payment Request ${paymentRequest.requestId}`,
          description: paymentRequest.description,
          currentLevel: 0,
          status: 'PENDING',
          createdById: userId,
          assigneeId: firstApprover.id,
        },
      });

      // Create initial system message
      await tx.message.create({
        data: {
          taskId: task.id,
          senderId: userId,
          body: `Payment request created for ${paymentRequest.clientName}. Amount: ₹${paymentRequest.totalAmount.toFixed(
            2
          )}. Assigned to @${firstApprover.username} for L1 approval.`,
          type: 'SYSTEM',
          meta: JSON.stringify({
            action: 'CREATED',
            amount: paymentRequest.totalAmount,
            assignee: firstApprover.username,
            level: 0,
          }),
        },
      });

      return { updatedRequest, expense, task, assignee: firstApprover };
    });

    // Create activity log
    await createActivityLog(
      {
        paymentRequestId: id,
        userId,
        action: 'SUBMITTED',
        oldStatus: 'DRAFT',
        newStatus: 'SUBMITTED',
        comment: `Submitted for L1 approval. Assigned to ${result.assignee.username}`,
      },
      prisma
    );

    // TODO: Send notification to L1 approver
    // await sendNotification({
    //   userId: result.assignee.id,
    //   title: 'New Payment Request',
    //   body: `Payment request ${paymentRequest.requestId} assigned to you for approval`,
    //   link: `/common/tasks/${result.task.id}`,
    // });

    res.json({
      success: true,
      data: {
        paymentRequest: result.updatedRequest,
        task: result.task,
        assignee: result.assignee,
      },
      message: 'Payment request submitted successfully',
    });
  } catch (error: any) {
    console.error('Submit payment request error:', error);
    res.status(500).json({
      error: 'Failed to submit payment request',
      details: error.message,
    });
  }
});

export default router;
