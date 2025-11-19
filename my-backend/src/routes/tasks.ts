/**
 * Task & Approval API Routes
 * Handles task management, approvals, rejections, and messages
 * 
 * Routes:
 * - GET    /api/common/tasks                    - List tasks (filtered by user/status)
 * - GET    /api/common/tasks/:id                - Get task details with messages
 * - POST   /api/common/tasks/:id/approve        - Approve task (advance to next level)
 * - POST   /api/common/tasks/:id/reject         - Reject task
 * - POST   /api/common/tasks/:id/return         - Return task for revision
 * - POST   /api/common/tasks/:id/messages       - Add message/attachment
 * - GET    /api/common/dashboard/pending        - Pending tasks for current user
 * - GET    /api/common/dashboard/inprocess      - In-process tasks
 * - GET    /api/common/dashboard/completed      - Completed tasks
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  warmApproveMessage,
  createActivityLog,
  generatePaymentToken,
  findUsersByRole,
} from '../utils/paymentRequestUtils';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * List tasks with filters
 * GET /api/common/tasks
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const {
      status,
      assigneeId,
      createdById,
      currentLevel,
      page = 1,
      limit = 20,
    } = req.query;

    const where: any = {};

    if (status) where.status = status;
    if (assigneeId) where.assigneeId = Number(assigneeId);
    if (createdById) where.createdById = Number(createdById);
    if (currentLevel !== undefined) where.currentLevel = Number(currentLevel);

    const skip = (Number(page) - 1) * Number(limit);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          createdBy: {
            select: { id: true, username: true, email: true },
          },
          assignee: {
            select: { id: true, username: true, email: true },
          },
          paymentRequest: {
            include: {
              lineItems: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
          approvals: {
            include: {
              approver: {
                select: { id: true, username: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('List tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
  }
});

/**
 * Get task details with full message history
 * GET /api/common/tasks/:id
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
        assignee: {
          select: { id: true, username: true, email: true },
        },
        expense: true,
        paymentRequest: {
          include: {
            lineItems: {
              orderBy: { sortOrder: 'asc' },
            },
            client: {
              select: { id: true, name: true },
            },
          },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, username: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        messages: {
          include: {
            sender: {
              select: { id: true, username: true, email: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        paymentRecords: {
          include: {
            paidBy: {
              select: { id: true, username: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task', details: error.message });
  }
});

/**
 * Approve task and advance to next level
 * POST /api/common/tasks/:id/approve
 */
router.post('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const userName = (req as any).user?.username;
    const { id } = req.params;
    const { comment, attachments = [] } = req.body;

    // Get task with relations
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        paymentRequest: true,
        expense: true,
        assignee: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user is assigned to this task
    if (task.assigneeId !== userId) {
      return res.status(403).json({
        error: 'You are not assigned to this task',
      });
    }

    // Verify task is pending
    if (task.status !== 'PENDING') {
      return res.status(400).json({
        error: `Task is not pending. Current status: ${task.status}`,
      });
    }

    // Get current approval level config
    const currentLevelConfig = await prisma.approvalLevel.findUnique({
      where: { level: task.currentLevel, isActive: true },
    });

    if (!currentLevelConfig) {
      return res.status(500).json({
        error: `Approval level ${task.currentLevel} not configured`,
      });
    }

    // Verify user has correct role for this level
    if (currentLevelConfig.roleName !== userRole) {
      return res.status(403).json({
        error: `Your role (${userRole}) does not match required role (${currentLevelConfig.roleName}) for level ${currentLevelConfig.levelName}`,
      });
    }

    // Get next approval level
    const nextLevel = await prisma.approvalLevel.findUnique({
      where: { level: task.currentLevel + 1, isActive: true },
    });

    // Execute approval flow in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create approval record
      const approval = await tx.approval.create({
        data: {
          taskId: task.id,
          level: task.currentLevel,
          levelName: currentLevelConfig.levelName,
          approverId: userId,
          action: 'APPROVED',
          comment: comment || `Approved by ${currentLevelConfig.levelName}`,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        },
      });

      // 2. Create approval message
      await tx.message.create({
        data: {
          taskId: task.id,
          senderId: userId,
          body: comment || `Approved by ${currentLevelConfig.levelName}`,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
          type: 'APPROVAL',
          meta: JSON.stringify({
            approveAction: 'APPROVED',
            level: task.currentLevel,
            levelName: currentLevelConfig.levelName,
          }),
        },
      });

      let updatedTask;
      let nextApprover = null;
      let paymentToken = null;

      // 3. Check if there's a next level (L1→L2, L2→Finance)
      if (nextLevel && nextLevel.level !== 3) {
        // Not banker yet, assign to next approver
        const nextApprovers = await findUsersByRole(nextLevel.roleName, tx);

        if (nextApprovers.length === 0) {
          throw new Error(`No users found with role: ${nextLevel.roleName}`);
        }

        nextApprover = nextApprovers[0];

        // Update task to next level
        updatedTask = await tx.task.update({
          where: { id: task.id },
          data: {
            currentLevel: nextLevel.level,
            assigneeId: nextApprover.id,
            status: 'PENDING',
          },
        });

        // Create warm approval system message
        const warmMessage = warmApproveMessage({
          approverName: userName,
          nextApproverName: nextApprover.username,
          requestId: task.paymentRequest.requestId,
          amount: Number(task.paymentRequest.totalAmount),
          currency: task.paymentRequest.currency,
          dueDate: task.paymentRequest.dueDate,
        });

        await tx.message.create({
          data: {
            taskId: task.id,
            senderId: userId,
            body: warmMessage,
            type: 'SYSTEM',
            meta: JSON.stringify({
              action: 'LEVEL_ADVANCE',
              fromLevel: task.currentLevel,
              toLevel: nextLevel.level,
              nextApprover: nextApprover.username,
              nextApproverId: nextApprover.id,
            }),
          },
        });

        // TODO: Send notification to next approver
      } 
      // 4. Finance approved - assign to banker and generate payment link
      else if (task.currentLevel === 2 && nextLevel?.level === 3) {
        // Finance has approved, now assign to banker
        const bankers = await findUsersByRole(nextLevel.roleName, tx);

        if (bankers.length === 0) {
          throw new Error(`No bankers found with role: ${nextLevel.roleName}`);
        }

        nextApprover = bankers[0];

        // Generate payment token for public link
        paymentToken = await generatePaymentToken();

        // Update task to banker
        updatedTask = await tx.task.update({
          where: { id: task.id },
          data: {
            currentLevel: nextLevel.level,
            assigneeId: nextApprover.id,
            status: 'IN_PROCESS', // Finance approved, waiting for banker
          },
        });

        // Update payment request with token and status
        await tx.paymentRequest.update({
          where: { id: task.paymentRequestId },
          data: {
            status: 'SENT_TO_CLIENT',
            paymentToken,
            paymentLinkSentAt: new Date(),
          },
        });

        // Create system message for banker assignment
        await tx.message.create({
          data: {
            taskId: task.id,
            senderId: userId,
            body: `Finance approved request ${task.paymentRequest.requestId}. Assigned to @${nextApprover.username} for payment processing. Payment link sent to client.`,
            type: 'SYSTEM',
            meta: JSON.stringify({
              action: 'FINANCE_APPROVED',
              banker: nextApprover.username,
              bankerId: nextApprover.id,
              paymentToken,
            }),
          },
        });

        // TODO: Send payment link to client email
      }
      // 5. No more levels - this shouldn't happen (banker uses different endpoint)
      else {
        throw new Error('Invalid approval state - banker should use payment endpoint');
      }

      return { approval, updatedTask, nextApprover, paymentToken };
    });

    // Create activity log
    await createActivityLog(
      {
        paymentRequestId: task.paymentRequestId,
        userId,
        action: 'APPROVED',
        oldStatus: task.paymentRequest.status,
        newStatus: result.paymentToken ? 'SENT_TO_CLIENT' : task.paymentRequest.status,
        comment: `${currentLevelConfig.levelName} approved${
          result.nextApprover ? `. Assigned to ${result.nextApprover.username}` : ''
        }`,
      },
      prisma
    );

    res.json({
      success: true,
      data: {
        approval: result.approval,
        task: result.updatedTask,
        nextApprover: result.nextApprover,
        paymentToken: result.paymentToken,
      },
      message: `Task approved and ${
        result.nextApprover
          ? `assigned to ${result.nextApprover.username}`
          : 'completed'
      }`,
    });
  } catch (error: any) {
    console.error('Approve task error:', error);
    res.status(500).json({
      error: 'Failed to approve task',
      details: error.message,
    });
  }
});

/**
 * Reject task
 * POST /api/common/tasks/:id/reject
 */
router.post('/:id/reject', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { id } = req.params;
    const { comment, attachments = [] } = req.body;

    if (!comment) {
      return res.status(400).json({
        error: 'Comment is required for rejection',
      });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        paymentRequest: true,
        expense: true,
        createdBy: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.assigneeId !== userId) {
      return res.status(403).json({
        error: 'You are not assigned to this task',
      });
    }

    if (task.status !== 'PENDING') {
      return res.status(400).json({
        error: `Task is not pending. Current status: ${task.status}`,
      });
    }

    // Get current approval level config
    const levelConfig = await prisma.approvalLevel.findUnique({
      where: { level: task.currentLevel, isActive: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      // Create rejection approval record
      const approval = await tx.approval.create({
        data: {
          taskId: task.id,
          level: task.currentLevel,
          levelName: levelConfig?.levelName || `Level ${task.currentLevel}`,
          approverId: userId,
          action: 'REJECTED',
          comment,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        },
      });

      // Create rejection message
      await tx.message.create({
        data: {
          taskId: task.id,
          senderId: userId,
          body: `Request rejected by ${levelConfig?.levelName || 'Approver'}. Reason: ${comment}`,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
          type: 'APPROVAL',
          meta: JSON.stringify({
            approveAction: 'REJECTED',
            level: task.currentLevel,
            reason: comment,
          }),
        },
      });

      // Update task status
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          status: 'REJECTED',
        },
      });

      // Update expense status
      await tx.expense.update({
        where: { id: task.expenseId },
        data: {
          status: 'CANCELLED',
        },
      });

      // Update payment request status
      await tx.paymentRequest.update({
        where: { id: task.paymentRequestId },
        data: {
          status: 'REJECTED',
        },
      });

      return { approval, updatedTask };
    });

    // Create activity log
    await createActivityLog(
      {
        paymentRequestId: task.paymentRequestId,
        userId,
        action: 'REJECTED',
        oldStatus: task.paymentRequest.status,
        newStatus: 'REJECTED',
        comment: `Rejected by ${levelConfig?.levelName}: ${comment}`,
      },
      prisma
    );

    // TODO: Notify creator of rejection

    res.json({
      success: true,
      data: result,
      message: 'Task rejected successfully',
    });
  } catch (error: any) {
    console.error('Reject task error:', error);
    res.status(500).json({
      error: 'Failed to reject task',
      details: error.message,
    });
  }
});

/**
 * Return task for revision
 * POST /api/common/tasks/:id/return
 */
router.post('/:id/return', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { comment, attachments = [] } = req.body;

    if (!comment) {
      return res.status(400).json({
        error: 'Comment is required when returning task',
      });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        paymentRequest: true,
        expense: true,
        createdBy: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.assigneeId !== userId) {
      return res.status(403).json({
        error: 'You are not assigned to this task',
      });
    }

    const levelConfig = await prisma.approvalLevel.findUnique({
      where: { level: task.currentLevel, isActive: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      // Create return approval record
      const approval = await tx.approval.create({
        data: {
          taskId: task.id,
          level: task.currentLevel,
          levelName: levelConfig?.levelName || `Level ${task.currentLevel}`,
          approverId: userId,
          action: 'RETURNED',
          comment,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        },
      });

      // Create return message
      await tx.message.create({
        data: {
          taskId: task.id,
          senderId: userId,
          body: `Request returned for revision by ${
            levelConfig?.levelName || 'Approver'
          }. Reason: ${comment}`,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
          type: 'SYSTEM',
          meta: JSON.stringify({
            approveAction: 'RETURNED',
            level: task.currentLevel,
            reason: comment,
          }),
        },
      });

      // Update task status
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          status: 'RETURNED',
          // Keep assignee for visibility, or reassign to creator
          assigneeId: task.createdById,
        },
      });

      // Update expense and payment request to DRAFT for editing
      await tx.expense.update({
        where: { id: task.expenseId },
        data: {
          status: 'DRAFT',
        },
      });

      await tx.paymentRequest.update({
        where: { id: task.paymentRequestId },
        data: {
          status: 'DRAFT',
        },
      });

      return { approval, updatedTask };
    });

    // Create activity log
    await createActivityLog(
      {
        paymentRequestId: task.paymentRequestId,
        userId,
        action: 'RETURNED',
        oldStatus: task.paymentRequest.status,
        newStatus: 'DRAFT',
        comment: `Returned by ${levelConfig?.levelName}: ${comment}`,
      },
      prisma
    );

    // TODO: Notify creator

    res.json({
      success: true,
      data: result,
      message: 'Task returned for revision',
    });
  } catch (error: any) {
    console.error('Return task error:', error);
    res.status(500).json({
      error: 'Failed to return task',
      details: error.message,
    });
  }
});

/**
 * Add message to task (chat functionality)
 * POST /api/common/tasks/:id/messages
 */
router.post('/:id/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { body, attachments = [] } = req.body;

    if (!body && attachments.length === 0) {
      return res.status(400).json({
        error: 'Message body or attachments are required',
      });
    }

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const message = await prisma.message.create({
      data: {
        taskId: id,
        senderId: userId,
        body: body || null,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        type: 'TEXT',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: message,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error.message,
    });
  }
});

/**
 * Dashboard: Get pending tasks for current user
 * GET /api/common/dashboard/pending
 */
router.get('/dashboard/pending', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc', // Oldest first (FIFO)
      },
      include: {
        createdBy: {
          select: { id: true, username: true },
        },
        paymentRequest: {
          select: {
            requestId: true,
            clientName: true,
            totalAmount: true,
            currency: true,
            dueDate: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: tasks,
      count: tasks.length,
    });
  } catch (error: any) {
    console.error('Get pending tasks error:', error);
    res.status(500).json({
      error: 'Failed to fetch pending tasks',
      details: error.message,
    });
  }
});

/**
 * Dashboard: Get in-process tasks
 * GET /api/common/dashboard/inprocess
 */
router.get('/dashboard/inprocess', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // In-process tasks are those assigned to banker or visible to finance/creator
    const where: any = {
      status: 'IN_PROCESS',
    };

    // Banker sees tasks assigned to them
    // Finance and creator can see all in-process
    if (userRole === 'BANKER') {
      where.assigneeId = userId;
    } else {
      where.OR = [
        { assigneeId: userId },
        { createdById: userId },
        // Finance can see all in-process
        ...(userRole === 'FINANCE_CONTROLLER'
          ? [{ currentLevel: { gte: 2 } }]
          : []),
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        createdBy: {
          select: { id: true, username: true },
        },
        assignee: {
          select: { id: true, username: true },
        },
        paymentRequest: {
          select: {
            requestId: true,
            clientName: true,
            totalAmount: true,
            currency: true,
            dueDate: true,
            paymentToken: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: tasks,
      count: tasks.length,
    });
  } catch (error: any) {
    console.error('Get in-process tasks error:', error);
    res.status(500).json({
      error: 'Failed to fetch in-process tasks',
      details: error.message,
    });
  }
});

/**
 * Dashboard: Get completed tasks
 * GET /api/common/dashboard/completed
 */
router.get('/dashboard/completed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Show tasks user was involved in (created or approved)
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: {
          status: 'COMPLETED',
          OR: [
            { createdById: userId },
            { approvals: { some: { approverId: userId } } },
          ],
        },
        skip,
        take: Number(limit),
        orderBy: {
          updatedAt: 'desc',
        },
        include: {
          createdBy: {
            select: { id: true, username: true },
          },
          paymentRequest: {
            select: {
              requestId: true,
              clientName: true,
              totalAmount: true,
              currency: true,
            },
          },
          paymentRecords: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              paymentMode: true,
              amount: true,
              paidAt: true,
            },
          },
        },
      }),
      prisma.task.count({
        where: {
          status: 'COMPLETED',
          OR: [
            { createdById: userId },
            { approvals: { some: { approverId: userId } } },
          ],
        },
      }),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get completed tasks error:', error);
    res.status(500).json({
      error: 'Failed to fetch completed tasks',
      details: error.message,
    });
  }
});

export default router;
