/**
 * ============================================================================
 * PAYMENT REQUEST WORKFLOW ROUTES
 * ============================================================================
 * 
 * Task-style payment request workflow API with:
 * - Amount-based routing (≤5000 vs >5000)
 * - Role-based visibility (A1-A6 approval levels)
 * - Send-back only to immediate previous level
 * - Finance-origin rejection restrictions
 * 
 * VISIBILITY RULES (10-100 authority scale):
 * - 10-50 (Staff): See only their own requests + requests awaiting their approval
 * - 60-85 (Managers): See their approvals + subordinate requests
 * - 90-100 (Admin): See all requests
 * 
 * @module routes/paymentWorkflowRoutes
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const {
  paymentWorkflowService,
  PAYMENT_STAGES,
  STAGE_DISPLAY_NAMES,
  canUserApprove,
  canUserReject,
  canUserSendBack
} = require('../services/PaymentWorkflowService');

// Feature enforcement middleware
const { enforceUsage } = require('../middleware/microUnlockEnforcer');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Attach user context with authority level
 */
function attachUserContext(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  req.userId = user.id;
  req.tenantId = user.tenantId || user.tenant_id || user.enterpriseId;
  req.userLevel = user.business_level || user.businessLevel || 10;
  req.isAdmin = req.userLevel >= 90;
  req.isManager = req.userLevel >= 60 && req.userLevel < 90;
  
  next();
}

router.use(attachUserContext);

// ============================================================================
// LIST / QUERY ENDPOINTS
// ============================================================================

/**
 * GET /api/payment-workflow
 * Get payment requests visible to the user
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search, mine } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
      mineOnly: mine === 'true'
    };
    
    const result = await paymentWorkflowService.getPendingPaymentsForUser(
      req.userId,
      req.tenantId,
      options
    );
    
    res.json({
      success: true,
      data: result.payments,
      total: result.total,
      page: result.page,
      limit: result.limit,
      stages: STAGE_DISPLAY_NAMES
    });
  } catch (error) {
    console.error('Error fetching payment requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment requests',
      message: error.message
    });
  }
});

/**
 * GET /api/payment-workflow/pending
 * Get payment requests pending user's action
 */
router.get('/pending', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const result = await paymentWorkflowService.getPendingPaymentsForUser(
      req.userId,
      req.tenantId,
      { page: parseInt(page), limit: parseInt(limit) }
    );
    
    // Filter to only those where user can take action
    const actionable = result.payments.filter(p => p.can_approve);
    
    res.json({
      success: true,
      data: actionable,
      total: actionable.length,
      stages: STAGE_DISPLAY_NAMES
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending payments',
      message: error.message
    });
  }
});

/**
 * GET /api/payment-workflow/stats
 * Get workflow statistics for dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const isAdmin = req.isAdmin;
    
    let visibilityFilter = '';
    if (!isAdmin) {
      visibilityFilter = `AND (pr.current_approver_id = '${userId}'::uuid OR pr."createdById"::uuid = '${userId}'::uuid)`;
    }
    
    const stats = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*) FILTER (WHERE workflow_status NOT IN ('DRAFT', 'PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED'))::int as pending,
        COUNT(*) FILTER (WHERE workflow_status = 'PAYMENT_COMPLETED')::int as completed,
        COUNT(*) FILTER (WHERE workflow_status = 'REJECTED')::int as rejected,
        COUNT(*) FILTER (WHERE sla_deadline < NOW() AND workflow_status NOT IN ('DRAFT', 'PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED'))::int as sla_breached,
        COUNT(*) FILTER (WHERE current_approver_id = '${userId}'::uuid AND workflow_status NOT IN ('DRAFT', 'PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED'))::int as awaiting_my_action,
        COALESCE(SUM(CASE WHEN workflow_status = 'PAYMENT_COMPLETED' THEN "totalAmount" ELSE 0 END), 0)::decimal as total_completed_amount,
        COALESCE(SUM(CASE WHEN workflow_status NOT IN ('DRAFT', 'PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED') THEN "totalAmount" ELSE 0 END), 0)::decimal as total_pending_amount
      FROM payment_requests pr
      WHERE pr.tenant_id = '${tenantId}'::uuid
      ${visibilityFilter}
    `);
    
    res.json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/payment-workflow/:id
 * Get single payment request with full workflow status
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await paymentWorkflowService.getPaymentRequestStatus(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Payment request not found'
      });
    }
    
    // Check visibility
    const pr = result.paymentRequest;
    const isCreator = String(pr.createdById) === String(req.userId);
    const isApprover = pr.current_approver_id === req.userId;
    const hasVisibility = req.isAdmin || isCreator || isApprover;
    
    if (!hasVisibility) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view this payment request'
      });
    }
    
    // Get user's permissions for this request
    const [approveAuth, rejectAuth, sendBackAuth] = await Promise.all([
      canUserApprove(id, req.userId, pr.current_stage),
      canUserReject(id, req.userId),
      canUserSendBack(id, req.userId)
    ]);
    
    res.json({
      success: true,
      data: {
        ...result,
        permissions: {
          canApprove: approveAuth.canApprove,
          canReject: rejectAuth.canReject,
          canSendBack: sendBackAuth.canSendBack,
          sendBackStage: sendBackAuth.previousStage,
          rejectReason: rejectAuth.reason,
          sendBackReason: sendBackAuth.reason
        }
      }
    });
  } catch (error) {
    console.error('Error fetching payment request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment request',
      message: error.message
    });
  }
});

// ============================================================================
// WORKFLOW ACTION ENDPOINTS
// ============================================================================

/**
 * POST /api/payment-workflow/:id/submit
 * Submit a draft payment request for approval
 */
router.post('/:id/submit', enforceUsage('payment_request_creation'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is the creator
    const pr = await prisma.$queryRaw`
      SELECT "createdById", workflow_status FROM payment_requests WHERE id = ${id}
    `;
    
    if (!pr || pr.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment request not found'
      });
    }
    
    if (String(pr[0].createdById) !== String(req.userId) && !req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only the creator can submit the payment request'
      });
    }
    
    if (pr[0].workflow_status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Payment request has already been submitted'
      });
    }
    
    const result = await paymentWorkflowService.submitPaymentRequest(
      id,
      req.userId,
      req.tenantId
    );
    
    res.json({
      success: true,
      message: 'Payment request submitted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error submitting payment request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit payment request',
      message: error.message
    });
  }
});

/**
 * POST /api/payment-workflow/:id/approve
 * Approve current stage
 */
router.post('/:id/approve', enforceUsage('payment_approval'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, voucherNumber, bankTransactionId, bankName, paymentMode } = req.body;
    
    // Check authorization
    const pr = await prisma.$queryRaw`
      SELECT current_stage FROM payment_requests WHERE id = ${id}
    `;
    
    if (!pr || pr.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment request not found'
      });
    }
    
    const authResult = await canUserApprove(id, req.userId, pr[0].current_stage);
    
    if (!authResult.canApprove) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to approve this payment request',
        reason: authResult.reason
      });
    }
    
    const metadata = {};
    if (voucherNumber) metadata.voucherNumber = voucherNumber;
    if (bankTransactionId) metadata.bankTransactionId = bankTransactionId;
    if (bankName) metadata.bankName = bankName;
    if (paymentMode) metadata.paymentMode = paymentMode;
    
    const result = await paymentWorkflowService.approveStage(
      id,
      req.userId,
      comment,
      metadata
    );
    
    res.json({
      success: true,
      message: result.isComplete ? 'Payment completed!' : 'Stage approved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error approving payment request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve payment request',
      message: error.message
    });
  }
});

/**
 * POST /api/payment-workflow/:id/reject
 * Reject the payment request
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }
    
    // Check authorization
    const authResult = await canUserReject(id, req.userId);
    
    if (!authResult.canReject) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to reject this payment request',
        reason: authResult.reason
      });
    }
    
    const result = await paymentWorkflowService.rejectPaymentRequest(
      id,
      req.userId,
      reason
    );
    
    res.json({
      success: true,
      message: 'Payment request rejected',
      data: result
    });
  } catch (error) {
    console.error('Error rejecting payment request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject payment request',
      message: error.message
    });
  }
});

/**
 * POST /api/payment-workflow/:id/send-back
 * Send back to immediate previous level only
 */
router.post('/:id/send-back', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Send-back reason is required'
      });
    }
    
    // Check authorization
    const authResult = await canUserSendBack(id, req.userId);
    
    if (!authResult.canSendBack) {
      return res.status(403).json({
        success: false,
        error: 'You cannot send back this payment request',
        reason: authResult.reason
      });
    }
    
    const result = await paymentWorkflowService.sendBack(
      id,
      req.userId,
      reason
    );
    
    res.json({
      success: true,
      message: `Payment request sent back to ${STAGE_DISPLAY_NAMES[result.currentStage] || result.currentStage}`,
      data: result
    });
  } catch (error) {
    console.error('Error sending back payment request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send back payment request',
      message: error.message
    });
  }
});

// ============================================================================
// STAGE-SPECIFIC ENDPOINTS
// ============================================================================

/**
 * POST /api/payment-workflow/:id/verify
 * Accounts verification stage
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { note, verified } = req.body;
    
    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Verification confirmation required'
      });
    }
    
    // Check if at correct stage
    const pr = await prisma.$queryRaw`
      SELECT current_stage FROM payment_requests WHERE id = ${id}
    `;
    
    if (!pr || pr.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment request not found'
      });
    }
    
    if (pr[0].current_stage !== PAYMENT_STAGES.ACCOUNTS_VERIFICATION) {
      return res.status(400).json({
        success: false,
        error: 'Payment request is not at accounts verification stage'
      });
    }
    
    // Use approve with verification note
    const result = await paymentWorkflowService.approveStage(
      id,
      req.userId,
      note || 'Verified by Accounts',
      { verificationType: 'accounts' }
    );
    
    res.json({
      success: true,
      message: 'Accounts verification completed',
      data: result
    });
  } catch (error) {
    console.error('Error verifying payment request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment request',
      message: error.message
    });
  }
});

/**
 * POST /api/payment-workflow/:id/accounting-entry
 * Record accounting entry
 */
router.post('/:id/accounting-entry', async (req, res) => {
  try {
    const { id } = req.params;
    const { voucherNumber, note } = req.body;
    
    if (!voucherNumber) {
      return res.status(400).json({
        success: false,
        error: 'Voucher/Reference number is required'
      });
    }
    
    // Check if at correct stage
    const pr = await prisma.$queryRaw`
      SELECT current_stage FROM payment_requests WHERE id = ${id}
    `;
    
    if (!pr || pr.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment request not found'
      });
    }
    
    if (pr[0].current_stage !== PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING) {
      return res.status(400).json({
        success: false,
        error: 'Payment request is not at accounting entry stage'
      });
    }
    
    const result = await paymentWorkflowService.approveStage(
      id,
      req.userId,
      note || `Accounting entry: ${voucherNumber}`,
      { voucherNumber }
    );
    
    res.json({
      success: true,
      message: 'Accounting entry recorded',
      data: result
    });
  } catch (error) {
    console.error('Error recording accounting entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record accounting entry',
      message: error.message
    });
  }
});

/**
 * POST /api/payment-workflow/:id/execute-payment
 * Banker executes payment
 */
router.post('/:id/execute-payment', enforceUsage('bank_transfer_execution'), async (req, res) => {
  try {
    const { id } = req.params;
    const { bankTransactionId, bankName, paymentMode, note } = req.body;
    
    if (!bankTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'Bank transaction ID is required'
      });
    }
    
    // Check if at correct stage
    const pr = await prisma.$queryRaw`
      SELECT current_stage FROM payment_requests WHERE id = ${id}
    `;
    
    if (!pr || pr.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment request not found'
      });
    }
    
    if (pr[0].current_stage !== PAYMENT_STAGES.BANKER_PENDING) {
      return res.status(400).json({
        success: false,
        error: 'Payment request is not at banker execution stage'
      });
    }
    
    const result = await paymentWorkflowService.approveStage(
      id,
      req.userId,
      note || `Payment executed: ${bankTransactionId}`,
      { bankTransactionId, bankName, paymentMode }
    );
    
    res.json({
      success: true,
      message: 'Payment executed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error executing payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute payment',
      message: error.message
    });
  }
});

// ============================================================================
// HISTORY & AUDIT ENDPOINTS
// ============================================================================

/**
 * GET /api/payment-workflow/:id/history
 * Get approval history for a payment request
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const history = await prisma.$queryRaw`
      SELECT 
        pra.*,
        u.full_name as action_by_full_name,
        u.email as action_by_email
      FROM payment_request_approvals pra
      LEFT JOIN users u ON pra.action_by = u.id
      WHERE pra.payment_request_id = ${id}
      ORDER BY pra.action_at ASC
    `;
    
    // Add display names
    const historyWithDisplayNames = history.map(h => ({
      ...h,
      from_stage_display: STAGE_DISPLAY_NAMES[h.from_stage] || h.from_stage,
      to_stage_display: STAGE_DISPLAY_NAMES[h.to_stage] || h.to_stage
    }));
    
    res.json({
      success: true,
      data: historyWithDisplayNames
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approval history',
      message: error.message
    });
  }
});

/**
 * GET /api/payment-workflow/:id/stages
 * Get all stages for a payment request
 */
router.get('/:id/stages', async (req, res) => {
  try {
    const { id } = req.params;
    
    const stages = await prisma.$queryRaw`
      SELECT 
        prs.*,
        u.full_name as assigned_to_name,
        u.email as assigned_to_email,
        c.full_name as completed_by_name
      FROM payment_request_stages prs
      LEFT JOIN users u ON prs.assigned_to = u.id
      LEFT JOIN users c ON prs.completed_by = c.id
      WHERE prs.payment_request_id = ${id}
      ORDER BY prs.stage_order ASC
    `;
    
    // Add display names
    const stagesWithDisplayNames = stages.map(s => ({
      ...s,
      stage_display: STAGE_DISPLAY_NAMES[s.stage] || s.stage
    }));
    
    res.json({
      success: true,
      data: stagesWithDisplayNames
    });
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stages',
      message: error.message
    });
  }
});

// ============================================================================
// REFERENCE DATA ENDPOINTS
// ============================================================================

/**
 * GET /api/payment-workflow/reference/stages
 * Get all stage definitions
 */
router.get('/reference/stages', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        stages: PAYMENT_STAGES,
        displayNames: STAGE_DISPLAY_NAMES
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stage reference',
      message: error.message
    });
  }
});

// ============================================================================
// TASK APPROVAL VIEW - ROLE-BASED (Per FINAL MASTER PROMPT)
// ============================================================================
// Accountant: See INDIVIDUAL payment requests with full details
// Non-Accountant: See ONE settlement task per vendor (simplified)
// ============================================================================

/**
 * GET /api/payment-workflow/task-approval
 * Get tasks for Task Approval Kanban (ROLE-SEGREGATED VIEW)
 * 
 * For Accountant:
 *   - Returns INDIVIDUAL payment requests awaiting action
 *   - Full details: request_number, vendor, amounts, partial history
 *   - Shows remaining_amount (approved - paid) for partial payments
 * 
 * For Non-Accountant (Finance Controller, CFO, Banker):
 *   - Returns ONE settlement task per pending batch
 *   - Simplified view: total amount, number of requests, purpose
 *   - NO individual request details visible
 */
router.get('/task-approval', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine user role from users_enhanced
    const userRoleResult = await prisma.$queryRaw`
      SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        COALESCE(u.business_level, 10) as business_level,
        u.role as role_name
      FROM users_enhanced u
      WHERE u.id = ${req.userId}::uuid AND u.is_active = true
    `;
    
    if (!userRoleResult || userRoleResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userInfo = userRoleResult[0];
    const roleName = (userInfo.role_name || '').toUpperCase();
    const businessLevel = userInfo.business_level || 10;
    
    // Determine if user is Accountant
    const isAccountant = roleName.includes('ACCOUNTANT') || roleName.includes('ACCOUNTS');
    const isFinanceController = roleName.includes('FINANCE') && roleName.includes('CONTROLLER');
    const isCFO = roleName.includes('CFO') || roleName.includes('CHIEF FINANCIAL');
    const isBanker = roleName.includes('BANKER') || roleName.includes('TREASURY');
    const isAdmin = businessLevel >= 90;
    
    if (isAccountant || isAdmin) {
      // ====================================================================
      // ACCOUNTANT VIEW: Individual Payment Requests
      // ====================================================================
      
      let statusFilter = '';
      if (status) {
        statusFilter = `AND pr.status = '${status}'`;
      } else {
        // Default: Show approved/partially approved requests pending settlement
        statusFilter = `AND pr.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'ACCOUNTED', 'PARTIALLY_SETTLED')`;
      }
      
      const requests = await prisma.$queryRawUnsafe(`
        SELECT 
          pr.id,
          pr."requestId" AS request_number,
          pr.status,
          pr.workflow_status,
          pr."clientName" AS vendor_name,
          pr."clientId" AS vendor_id,
          pr.description,
          COALESCE(pr."totalAmount", 0) AS requested_amount,
          COALESCE(pr.approved_amount, pr."totalAmount", 0) AS approved_amount,
          COALESCE(pr.paid_amount_total, 0) AS paid_amount,
          COALESCE(pr.approved_amount, pr."totalAmount", 0) - COALESCE(pr.paid_amount_total, 0) AS remaining_amount,
          pr.approved_by,
          pr.approved_at,
          pr.created_at,
          pr.updated_at,
          requester.full_name AS requester_name,
          approver.full_name AS approved_by_name,
          -- Partial payment info
          (SELECT COUNT(*) FROM settlement_line_items sli WHERE sli.payment_request_id = pr.id)::int AS settlement_count,
          (SELECT MAX(s.utr_number) FROM settlements s 
           JOIN settlement_line_items sli ON s.id = sli.settlement_id 
           WHERE sli.payment_request_id = pr.id AND s.status = 'PAID') AS last_utr
        FROM payment_requests pr
        LEFT JOIN users requester ON pr."createdById"::uuid = requester.id
        LEFT JOIN users approver ON pr.approved_by = approver.id
        WHERE pr.tenant_id = '${req.tenantId}'::uuid
          ${statusFilter}
          AND COALESCE(pr.approved_amount, pr."totalAmount", 0) - COALESCE(pr.paid_amount_total, 0) > 0
        ORDER BY pr.created_at DESC
        LIMIT ${parseInt(limit)}
        OFFSET ${offset}
      `);
      
      // Get total count
      const countResult = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS total
        FROM payment_requests pr
        WHERE pr.tenant_id = '${req.tenantId}'::uuid
          ${statusFilter}
          AND COALESCE(pr.approved_amount, pr."totalAmount", 0) - COALESCE(pr.paid_amount_total, 0) > 0
      `);
      
      return res.json({
        success: true,
        viewType: 'ACCOUNTANT_FULL',
        description: 'Individual payment requests with full details',
        data: {
          requests,
          total: countResult[0]?.total || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          capabilities: {
            canSeeIndividualRequests: true,
            canSeePartialHistory: true,
            canCreateSettlement: true,
            canSeeAmounts: true
          }
        }
      });
      
    } else {
      // ====================================================================
      // NON-ACCOUNTANT VIEW: Settlement Tasks Only
      // ====================================================================
      // Finance Controller, CFO, Banker see ONLY settlement-level tasks
      
      let stageFilter = '';
      if (isFinanceController) {
        stageFilter = `AND s.current_stage = 'FINANCE_CONTROLLER_REVIEW'`;
      } else if (isCFO) {
        stageFilter = `AND s.current_stage = 'CFO_REVIEW'`;
      } else if (isBanker) {
        stageFilter = `AND s.current_stage = 'BANKER_EXECUTION'`;
      }
      
      // Only show settlements awaiting this user's action
      const settlements = await prisma.$queryRawUnsafe(`
        SELECT 
          s.id,
          s.settlement_number,
          s.status,
          s.current_stage,
          s.purpose,
          s.total_amount,
          s.line_item_count AS request_count,
          s.payment_mode,
          s.settlement_date,
          s.due_date,
          s.beneficiary_name,
          s.created_at,
          s.submitted_at,
          creator.full_name AS created_by_name,
          current_approver.full_name AS awaiting_action_from,
          -- SIMPLIFIED: No individual request details
          NULL AS line_items
        FROM settlements s
        LEFT JOIN users creator ON s.created_by = creator.id
        LEFT JOIN users current_approver ON s.current_approver_id = current_approver.id
        WHERE s.tenant_id = '${req.tenantId}'::uuid
          AND s.status NOT IN ('PAID', 'REJECTED', 'CANCELLED')
          ${stageFilter}
          AND (s.current_approver_id = '${req.userId}'::uuid OR ${isAdmin})
        ORDER BY 
          CASE WHEN s.current_approver_id = '${req.userId}'::uuid THEN 0 ELSE 1 END,
          s.created_at DESC
        LIMIT ${parseInt(limit)}
        OFFSET ${offset}
      `);
      
      // Get total count
      const countResult = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int AS total
        FROM settlements s
        WHERE s.tenant_id = '${req.tenantId}'::uuid
          AND s.status NOT IN ('PAID', 'REJECTED', 'CANCELLED')
          ${stageFilter}
          AND (s.current_approver_id = '${req.userId}'::uuid OR ${isAdmin})
      `);
      
      return res.json({
        success: true,
        viewType: 'SIMPLIFIED_SETTLEMENT',
        description: 'Settlement tasks only - individual requests hidden',
        data: {
          settlements,
          total: countResult[0]?.total || 0,
          page: parseInt(page),
          limit: parseInt(limit),
          capabilities: {
            canSeeIndividualRequests: false,
            canSeePartialHistory: false,
            canCreateSettlement: false,
            canSeeAmounts: true,
            canApprove: isFinanceController || isCFO,
            canExecute: isBanker,
            currentRole: isFinanceController ? 'FINANCE_CONTROLLER' : isCFO ? 'CFO' : isBanker ? 'BANKER' : 'OTHER'
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching task approval view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task approval view',
      message: error.message
    });
  }
});

module.exports = router;
