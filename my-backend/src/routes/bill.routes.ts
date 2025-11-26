/**
 * 📄 Bill Routes - OCR Processing & Task Creation
 * 
 * Endpoints:
 * POST /api/bills - Upload bill and run OCR
 * GET /api/bills/:id - Get bill details
 * POST /api/bills/:id/create-task - Create task from bill
 * GET /api/bills - List user's bills
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { billUpload, handleUploadError, deleteUploadedFile } from '../middleware/upload';
import { authMiddleware } from '../middleware/auth';
import * as ocrService from '../services/ocrService';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const prisma = new PrismaClient();

// ==========================================
// RATE LIMITING
// ==========================================

const ocrRateLimit = rateLimit({
  windowMs: parseInt(process.env.OCR_RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  max: parseInt(process.env.OCR_RATE_LIMIT_MAX || '10'), // 10 uploads per window
  message: {
    success: false,
    error: 'Too many OCR requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// TYPES
// ==========================================

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// ==========================================
// ROUTES
// ==========================================

/**
 * POST /api/bills
 * Upload bill file and run OCR
 */
router.post(
  '/',
  authMiddleware,
  ocrRateLimit,
  billUpload.single('file'),
  handleUploadError,
  async (req: AuthRequest, res: Response) => {
    let billId: string | undefined;

    try {
      const file = req.file;
      const userId = req.user?.id;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded. Please provide a bill image or PDF.',
        });
      }

      if (!userId) {
        await deleteUploadedFile(file.path);
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      console.log(`[Bill] Upload started by user ${userId}: ${file.originalname}`);

      // Create Bill record with PROCESSING status
      const bill = await prisma.bill.create({
        data: {
          filePath: file.path,
          originalName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedById: userId,
          ocrStatus: 'PROCESSING',
        },
      });

      billId = bill.id;
      console.log(`[Bill] Created Bill record: ${billId}`);

      // Run OCR processing
      const startTime = Date.now();
      const ocrResult = await ocrService.processFile(file.path, file.mimetype);

      if (!ocrResult.success) {
        // Update bill with error
        await prisma.bill.update({
          where: { id: billId },
          data: {
            ocrStatus: 'FAILED',
            processingError: ocrResult.error || 'OCR processing failed',
            processingTime: ocrResult.processingTime,
          },
        });

        return res.status(500).json({
          success: false,
          billId,
          error: ocrResult.error || 'OCR processing failed',
        });
      }

      // Parse invoice data
      const parsedData = ocrService.parseInvoiceData(ocrResult.text);

      // Generate suggested task
      const suggestedTask = ocrService.generateSuggestedTask(parsedData, ocrResult.text);

      // Update bill with OCR results
      await prisma.bill.update({
        where: { id: billId },
        data: {
          ocrStatus: 'DONE',
          ocrText: ocrResult.text,
          parsedJson: parsedData as any,
          processingTime: ocrResult.processingTime,
          confidence: parsedData.confidence,
        },
      });

      console.log(`[Bill] OCR completed for ${billId} in ${ocrResult.processingTime}ms`);

      // Return results
      return res.status(200).json({
        success: true,
        billId,
        ocrStatus: 'DONE',
        ocrText: ocrResult.text,
        parsed: parsedData,
        suggestedTask,
        processingTime: ocrResult.processingTime,
        confidence: parsedData.confidence,
      });
    } catch (error: any) {
      console.error('[Bill] Upload/OCR error:', error);

      // Clean up file
      if (req.file) {
        await deleteUploadedFile(req.file.path);
      }

      // Update bill status if created
      if (billId) {
        await prisma.bill.update({
          where: { id: billId },
          data: {
            ocrStatus: 'FAILED',
            processingError: error.message || 'Internal server error',
          },
        }).catch(() => {});
      }

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to process bill',
      });
    }
  }
);

/**
 * GET /api/bills/:id
 * Get bill details including OCR results
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
    }

    // Check authorization (user must be uploader or admin)
    if (bill.uploadedById !== userId && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    return res.status(200).json({
      success: true,
      bill,
    });
  } catch (error: any) {
    console.error('[Bill] Get error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bill',
    });
  }
});

/**
 * POST /api/bills/:id/create-task
 * Create a task from bill OCR data
 */
router.post('/:id/create-task', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: billId } = req.params;
    const userId = req.user?.id;
    const {
      title,
      description,
      dueDate,
      assigneeId,
      priority,
      serialNumber,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate required fields
    if (!title || !assigneeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, assigneeId',
      });
    }

    // Get bill
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found',
      });
    }

    // Check if task already created
    if (bill.taskCreated) {
      return res.status(400).json({
        success: false,
        error: 'Task already created for this bill',
      });
    }

    // Check authorization
    if (bill.uploadedById !== userId && req.user?.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Note: The current Task model requires expenseId and paymentRequestId
    // For bills, we need to create placeholder expense/payment request
    // OR modify the Task model to make these optional
    // For now, let's create a simple payment request

    // Create PaymentRequest
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        amount: (bill.parsedJson as any)?.totalAmount || 0,
        purpose: title,
        description: description || '',
        status: 'PENDING',
        createdById: userId,
        serialNumber: serialNumber || `PR-${Date.now()}`,
      },
    });

    // Create Expense linked to PaymentRequest
    const expense = await prisma.expense.create({
      data: {
        paymentRequestId: paymentRequest.id,
        category: 'BILLS_PAYABLE',
        amount: (bill.parsedJson as any)?.totalAmount || 0,
        description: description || '',
        status: 'PENDING',
        createdById: userId,
      },
    });

    // Create Task
    const task = await prisma.task.create({
      data: {
        title,
        description: description || '',
        status: priority === 'URGENT' ? 'IN_PROGRESS' : 'PENDING',
        currentLevel: 0,
        expenseId: expense.id,
        paymentRequestId: paymentRequest.id,
        createdById: userId,
        assigneeId: parseInt(assigneeId),
        billId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
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
    });

    // Update bill
    await prisma.bill.update({
      where: { id: billId },
      data: {
        taskId: task.id,
        taskCreated: true,
      },
    });

    console.log(`[Bill] Task created from bill ${billId}: ${task.id}`);

    return res.status(201).json({
      success: true,
      task,
      message: 'Task created successfully from bill',
    });
  } catch (error: any) {
    console.error('[Bill] Create task error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create task',
    });
  }
});

/**
 * GET /api/bills
 * List all bills for current user
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, limit = '20', offset = '0' } = req.query;

    const where: any = {};

    // Filter by uploader (unless admin)
    if (req.user?.role !== 'super_admin') {
      where.uploadedById = userId;
    }

    // Filter by OCR status
    if (status && ['PENDING', 'PROCESSING', 'DONE', 'FAILED'].includes(status as string)) {
      where.ocrStatus = status;
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.bill.count({ where });

    return res.status(200).json({
      success: true,
      bills,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + bills.length < total,
      },
    });
  } catch (error: any) {
    console.error('[Bill] List error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bills',
    });
  }
});

export default router;
