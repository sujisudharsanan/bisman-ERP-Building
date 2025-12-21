/**
 * Approval Workflow API Routes
 * 
 * REST API endpoints for the multi-tenant approval workflow engine.
 * Supports stage-based approvals with fallback strategies for small and large organizations.
 * 
 * Base path: /api/approvals
 */

import express, { Request, Response, NextFunction } from 'express';
import { approvalWorkflowService } from '../services/ApprovalWorkflowService';
import { WorkflowEntityType } from '../types/approval-workflow.types';

const router = express.Router();

// ============================================================================
// MIDDLEWARE: Authentication & Authorization
// ============================================================================

/**
 * Extended request with user context
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    enterpriseId: string;
    hubId?: string;
    role: string;
  };
}

/**
 * Middleware to ensure user is authenticated
 * In production, this would verify JWT/session
 */
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // TODO: Replace with actual auth middleware
  const userId = req.headers['x-user-id'] as string;
  const enterpriseId = req.headers['x-enterprise-id'] as string;
  const hubId = req.headers['x-hub-id'] as string | undefined;
  const role = req.headers['x-user-role'] as string || 'USER';

  if (!userId || !enterpriseId) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  req.user = { id: userId, enterpriseId, hubId, role };
  next();
}

// Apply auth middleware to all routes
router.use(requireAuth);

// ============================================================================
// WORKFLOW INITIATION
// ============================================================================

/**
 * POST /api/approvals/initiate
 * 
 * Initiates a new approval workflow for a reference entity (e.g., payment request)
 * 
 * Request body:
 * - entityType: Type of entity being approved (e.g., 'payment_request')
 * - entityId: UUID of the entity
 * - entityReference: Human-readable reference (optional)
 * - requestedAmount: Amount for payment/expense workflows (optional)
 * - metadata: Optional additional context
 */
router.post('/initiate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { entityType, entityId, entityReference, requestedAmount, metadata, workflowTemplateId } = req.body;
    const user = req.user!;

    // Validate required fields
    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: entityType, entityId',
      });
    }

    // Validate entity type
    const validEntityTypes: WorkflowEntityType[] = [
      'payment_request', 'expense_claim', 'purchase_order',
      'leave_request', 'invoice_approval', 'vendor_onboarding',
      'contract_approval', 'budget_request', 'asset_disposal', 'custom'
    ];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}`,
      });
    }

    // Initiate the workflow
    const instance = await approvalWorkflowService.initiateWorkflow({
      tenantId: user.enterpriseId,
      entityType: entityType as WorkflowEntityType,
      entityId,
      entityReference,
      requestedAmount,
      requestMetadata: metadata,
      initiatedBy: user.id,
      workflowTemplateId,
    });

    return res.status(201).json({
      success: true,
      data: {
        instanceId: instance.id,
        status: instance.status,
        currentStageOrder: instance.currentStageOrder,
        message: 'Workflow initiated successfully',
      },
    });
  } catch (error) {
    console.error('Error initiating workflow:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate workflow',
    });
  }
});

// ============================================================================
// APPROVAL ACTIONS
// ============================================================================

/**
 * POST /api/approvals/:instanceId/stages/:stageInstanceId/action
 * 
 * Perform an action on a stage (approve or reject)
 * 
 * Request body:
 * - action: 'approve' | 'reject'
 * - comment: Optional comment/reason
 */
router.post(
  '/:instanceId/stages/:stageInstanceId/action',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { stageInstanceId } = req.params;
      const { action, comment, metadata } = req.body;
      const user = req.user!;

      // Validate action type
      const validActions = ['approve', 'reject'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          success: false,
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        });
      }

      // Process the approval action
      const result = await approvalWorkflowService.processAction({
        stageInstanceId,
        action: action as 'approve' | 'reject',
        actorId: user.id,
        comment,
        metadata,
      });

      if (!result.success) {
        // Determine appropriate status code based on error
        let statusCode = 500;
        if (result.error?.includes('not authorized')) {
          statusCode = 403;
        } else if (result.error?.includes('not found')) {
          statusCode = 404;
        } else if (result.error?.includes('not active')) {
          statusCode = 409;
        }

        return res.status(statusCode).json({
          success: false,
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          instanceId: result.instanceId,
          workflowCompleted: result.workflowCompleted,
          workflowRejected: result.workflowRejected,
          nextStageId: result.nextStageId,
          message: result.workflowCompleted 
            ? 'Workflow completed successfully' 
            : result.workflowRejected 
              ? 'Workflow rejected'
              : 'Action processed, moved to next stage',
        },
      });
    } catch (error) {
      console.error('Error processing approval action:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process action',
      });
    }
  }
);

// ============================================================================
// QUERY ENDPOINTS
// ============================================================================

/**
 * GET /api/approvals/pending
 * 
 * Get all pending approvals for the current user
 */
router.get('/pending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    const pendingApprovals = await approvalWorkflowService.getPendingApprovalsForUser(
      user.id,
      user.enterpriseId
    );

    return res.status(200).json({
      success: true,
      data: {
        count: pendingApprovals.length,
        approvals: pendingApprovals,
      },
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals',
    });
  }
});

/**
 * GET /api/approvals/:instanceId
 * 
 * Get detailed information about an approval instance
 */
router.get('/:instanceId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { instanceId } = req.params;

    const result = await approvalWorkflowService.getInstanceWithStages(instanceId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Approval instance not found',
      });
    }

    // Verify user has access to this instance
    const user = req.user!;
    if (result.instance.tenantId !== user.enterpriseId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching approval instance:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch approval instance',
    });
  }
});

/**
 * GET /api/approvals/reference/:entityType/:entityId
 * 
 * Get workflow history for a specific reference entity
 * (e.g., all approval workflows for a payment request)
 */
router.get(
  '/reference/:entityType/:entityId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { entityType, entityId } = req.params;

      const history = await approvalWorkflowService.getWorkflowHistory(
        entityType,
        entityId
      );

      return res.status(200).json({
        success: true,
        data: {
          count: history.length,
          workflows: history,
        },
      });
    } catch (error) {
      console.error('Error fetching workflow history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch workflow history',
      });
    }
  }
);

// ============================================================================
// WORKFLOW TEMPLATE MANAGEMENT (Admin Only)
// ============================================================================

/**
 * GET /api/approvals/admin/templates
 * 
 * Get all workflow templates for the enterprise
 */
router.get('/admin/templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Only admins can view templates
    if (!['ADMIN', 'SUPER_ADMIN', 'CFO'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    // Get templates for this enterprise (and global templates)
    const entityTypes: WorkflowEntityType[] = [
      'payment_request', 'expense_claim', 'purchase_order',
      'leave_request', 'invoice_approval', 'vendor_onboarding'
    ];

    const templates = await Promise.all(
      entityTypes.map(async (type) => {
        const template = await approvalWorkflowService.getWorkflowTemplate(
          type,
          user.enterpriseId
        );
        return template;
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        templates: templates.filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
    });
  }
});

/**
 * GET /api/approvals/admin/templates/:templateId/stages
 * 
 * Get all stages for a workflow template
 */
router.get(
  '/admin/templates/:templateId/stages',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { templateId } = req.params;
      const user = req.user!;

      // Only admins can view template stages
      if (!['ADMIN', 'SUPER_ADMIN', 'CFO'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const stages = await approvalWorkflowService.getWorkflowStages(templateId);

      return res.status(200).json({
        success: true,
        data: {
          count: stages.length,
          stages,
        },
      });
    } catch (error) {
      console.error('Error fetching template stages:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch template stages',
      });
    }
  }
);

// ============================================================================
// DASHBOARD / ANALYTICS
// ============================================================================

/**
 * GET /api/approvals/admin/stats
 * 
 * Get approval statistics for the current user's enterprise
 */
router.get('/admin/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Only admins/managers can view stats
    if (!['ADMIN', 'SUPER_ADMIN', 'CFO', 'MANAGER'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Manager access required',
      });
    }

    // This would be a more complex query in production
    // For now, return a placeholder structure
    return res.status(200).json({
      success: true,
      data: {
        pending: 0,
        approved: 0,
        rejected: 0,
        avgApprovalTimeHours: 0,
        byEntityType: {},
      },
    });
  } catch (error) {
    console.error('Error fetching approval stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch approval statistics',
    });
  }
});

// ============================================================================
// ADMIN TASK APPROVAL DEPARTMENT ENDPOINTS
// These endpoints power the "Admin Task Approval Department" page
// ============================================================================

/**
 * GET /api/approvals/admin/queue
 * 
 * Get all tasks pending approval across the tenant for Admin Dashboard
 * Returns: Task ID, Title, Type, Initiated By, Current Stage, Total Stages, 
 *          Amount, Status, Days in Queue, Has Fallback
 */
router.get('/admin/queue', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    // Only admins can view the full queue
    if (!['ADMIN', 'SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { status, entityType, pendingAtStage, limit, offset } = req.query;

    const result = await approvalWorkflowService.getAdminApprovalQueue(
      user.enterpriseId,
      {
        status: status ? (status as string).split(',') : undefined,
        entityType: entityType as string,
        pendingAtStage: pendingAtStage as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        tasks: result.tasks,
        total: result.total,
        pagination: {
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
          hasMore: result.total > (offset ? parseInt(offset as string) : 0) + result.tasks.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin approval queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch approval queue',
    });
  }
});

/**
 * GET /api/approvals/tasks/:taskId/approval-details
 * 
 * Get detailed approval information for a specific task
 * Returns: Instance info, all stages with status, timeline/audit log
 */
router.get('/tasks/:taskId/approval-details', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const user = req.user!;

    const result = await approvalWorkflowService.getTaskApprovalDetails(taskId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Approval workflow not found for this task',
      });
    }

    // Verify tenant access
    if (result.instance.tenantId !== user.enterpriseId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching task approval details:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch approval details',
    });
  }
});

/**
 * POST /api/approvals/stages/:stageInstanceId/approve
 * 
 * Approve a specific stage (simpler endpoint than the full action endpoint)
 */
router.post('/stages/:stageInstanceId/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stageInstanceId } = req.params;
    const { comment } = req.body;
    const user = req.user!;

    const result = await approvalWorkflowService.processAction({
      stageInstanceId,
      action: 'approve',
      actorId: user.id,
      comment,
    });

    if (!result.success) {
      return res.status(result.error?.includes('not authorized') ? 403 : 400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        instanceId: result.instanceId,
        workflowCompleted: result.workflowCompleted,
        nextStageId: result.nextStageId,
        message: result.workflowCompleted ? 'Workflow completed' : 'Stage approved',
      },
    });
  } catch (error) {
    console.error('Error approving stage:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to approve stage',
    });
  }
});

/**
 * POST /api/approvals/tasks/:taskId/approve-all
 * 
 * Approve all fallback stages in a task (Admin bulk approval)
 * This is for when Admin wants to approve all stages assigned to them via fallback
 */
router.post('/tasks/:taskId/approve-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { comment } = req.body;
    const user = req.user!;

    // Only admins can bulk approve
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for bulk approval',
      });
    }

    const result = await approvalWorkflowService.approveAllFallbackStages(
      taskId,
      user.id,
      comment
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        approvedCount: result.approvedCount,
        message: result.approvedCount > 0 
          ? `Approved ${result.approvedCount} fallback stage(s)` 
          : 'No fallback stages to approve',
      },
    });
  } catch (error) {
    console.error('Error bulk approving stages:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to bulk approve stages',
    });
  }
});

/**
 * POST /api/approvals/tasks/:taskId/execute-payment
 * 
 * Execute payment for a completed approval workflow
 * This is the final step after all approvals are done
 */
router.post('/tasks/:taskId/execute-payment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { transactionNumber, amount, paymentMethod, bankReference, notes, receiptUrl } = req.body;
    const user = req.user!;

    // Validate required fields
    if (!transactionNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transactionNumber, amount',
      });
    }

    // Only finance roles can execute payments
    if (!['ADMIN', 'SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS_PAYABLE'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Finance role required to execute payments',
      });
    }

    const result = await approvalWorkflowService.executePayment(
      taskId,
      user.id,
      transactionNumber,
      parseFloat(amount),
      { paymentMethod, bankReference, notes, receiptUrl }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        paymentExecutionId: result.paymentExecutionId,
        message: 'Payment executed successfully',
      },
    });
  } catch (error) {
    console.error('Error executing payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute payment',
    });
  }
});

export default router;
