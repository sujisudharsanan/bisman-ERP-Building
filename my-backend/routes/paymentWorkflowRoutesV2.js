/**
 * ============================================================================
 * PAYMENT REQUEST WORKFLOW ROUTES V2
 * ============================================================================
 * 
 * Enhanced payment workflow API with:
 * - Strict state machine enforcement
 * - Settlement pipeline support (ACCOUNTED → QUEUED → SETTLED → PAID)
 * - Clarification governance (max 3 loops)
 * - Amount validation (APPROVED vs PARTIALLY_APPROVED)
 * - Hierarchy enforcement
 * 
 * @module routes/paymentWorkflowRoutesV2
 */

const express = require('express');
const router = express.Router();

const {
  paymentWorkflowServiceV2,
  PaymentStatus,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  MAX_CLARIFICATION_LOOPS,
  validateTransition
} = require('../services/PaymentWorkflowServiceV2');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Attach user context and actor info
 */
function attachActorInfo(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  req.actorInfo = {
    userId: user.id,
    tenantId: user.tenantId || user.tenant_id || user.enterpriseId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID
  };
  
  req.userLevel = user.business_level || user.businessLevel || 10;
  req.isAdmin = req.userLevel >= 90;
  
  next();
}

router.use(attachActorInfo);

// ============================================================================
// REFERENCE ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/payment-workflow/states
 * Get all available states and valid transitions
 */
router.get('/states', (req, res) => {
  res.json({
    success: true,
    data: {
      states: Object.values(PaymentStatus),
      transitions: VALID_TRANSITIONS,
      terminalStates: TERMINAL_STATES,
      clarificationLimit: MAX_CLARIFICATION_LOOPS
    }
  });
});

/**
 * GET /api/v2/payment-workflow/:id/valid-transitions
 * Get valid next states for a specific request
 */
router.get('/:id/valid-transitions', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current status from service
    const result = await paymentWorkflowServiceV2.getValidTransitions(id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// STATE TRANSITION ENDPOINTS
// ============================================================================

/**
 * POST /api/v2/payment-workflow/:id/submit
 * Submit payment request (DRAFT → SUBMITTED)
 */
router.post('/:id/submit', async (req, res) => {
  try {
    const result = await paymentWorkflowServiceV2.submitRequest(
      req.params.id,
      req.actorInfo
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('State Machine') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'TRANSITION_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/start-review
 * Start review (SUBMITTED → UNDER_REVIEW)
 */
router.post('/:id/start-review', async (req, res) => {
  try {
    const result = await paymentWorkflowServiceV2.transitionStatus(
      req.params.id,
      PaymentStatus.UNDER_REVIEW,
      req.actorInfo
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('State Machine') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'TRANSITION_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/approve
 * Approve request with amount validation
 * Body: { approvedAmount: number, reason?: string }
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { approvedAmount, reason } = req.body;
    
    if (!approvedAmount || approvedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'approvedAmount is required and must be positive',
        code: 'INVALID_AMOUNT'
      });
    }
    
    const result = await paymentWorkflowServiceV2.approveRequest(
      req.params.id,
      req.actorInfo,
      approvedAmount,
      reason
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('Validation') || 
                       error.message.includes('Hierarchy') ||
                       error.message.includes('State Machine') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: error.message.includes('Hierarchy') ? 'HIERARCHY_VIOLATION' : 'APPROVAL_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/reject
 * Reject request (requires reason)
 * Body: { reason: string }
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
        code: 'REASON_REQUIRED'
      });
    }
    
    const result = await paymentWorkflowServiceV2.rejectRequest(
      req.params.id,
      req.actorInfo,
      reason
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('State Machine') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'REJECTION_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/cancel
 * Cancel request (only by requester)
 * Body: { reason?: string }
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const result = await paymentWorkflowServiceV2.cancelRequest(
      req.params.id,
      req.actorInfo,
      reason || 'Cancelled by requester'
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('only the requester') ? 403 : 
                       error.message.includes('State Machine') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'CANCELLATION_ERROR'
    });
  }
});

// ============================================================================
// CLARIFICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/v2/payment-workflow/:id/request-clarification
 * Request clarification from requester (max 3 loops)
 * Body: { question: string }
 */
router.post('/:id/request-clarification', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Clarification question is required',
        code: 'QUESTION_REQUIRED'
      });
    }
    
    const result = await paymentWorkflowServiceV2.requestClarification(
      req.params.id,
      req.actorInfo,
      question
    );
    
    // If auto-escalated, return different response
    if (result.action === 'AUTO_ESCALATED') {
      return res.json({
        success: true,
        data: result,
        message: `Maximum clarification limit (${MAX_CLARIFICATION_LOOPS}) reached. Request has been auto-escalated.`,
        code: 'AUTO_ESCALATED'
      });
    }
    
    res.json({
      success: true,
      data: result,
      message: `Clarification requested. ${result.remainingClarifications} requests remaining before auto-escalation.`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'CLARIFICATION_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/provide-clarification
 * Provide clarification (only by requester)
 * Body: { response: string }
 */
router.post('/:id/provide-clarification', async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Clarification response is required',
        code: 'RESPONSE_REQUIRED'
      });
    }
    
    const result = await paymentWorkflowServiceV2.respondToClarification(
      req.params.id,
      req.actorInfo,
      response
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('only the original requester') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: 'CLARIFICATION_ERROR'
    });
  }
});

// ============================================================================
// SETTLEMENT PIPELINE ENDPOINTS
// ============================================================================

/**
 * POST /api/v2/payment-workflow/:id/mark-accounted
 * Mark as accounted (APPROVED/PARTIALLY_APPROVED → ACCOUNTED)
 * Body: { voucherNumber: string }
 */
router.post('/:id/mark-accounted', async (req, res) => {
  try {
    const { voucherNumber } = req.body;
    
    if (!voucherNumber) {
      return res.status(400).json({
        success: false,
        error: 'Voucher number is required',
        code: 'VOUCHER_REQUIRED'
      });
    }
    
    const result = await paymentWorkflowServiceV2.markAsAccounted(
      req.params.id,
      req.actorInfo,
      voucherNumber
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'ACCOUNTING_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/queue-for-settlement
 * Queue for settlement batch (ACCOUNTED → QUEUED_FOR_SETTLEMENT)
 * Body: { batchId: string }
 */
router.post('/:id/queue-for-settlement', async (req, res) => {
  try {
    const { batchId } = req.body;
    
    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'Settlement batch ID is required',
        code: 'BATCH_ID_REQUIRED'
      });
    }
    
    const result = await paymentWorkflowServiceV2.queueForSettlement(
      req.params.id,
      req.actorInfo,
      batchId
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'QUEUE_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/mark-settled
 * Mark as settled (QUEUED_FOR_SETTLEMENT → SETTLED)
 * Body: { utr: string, bankTransactionId?: string, settlementBatchId?: string }
 */
router.post('/:id/mark-settled', async (req, res) => {
  try {
    const { utr, bankTransactionId, settlementBatchId } = req.body;
    
    if (!utr) {
      return res.status(400).json({
        success: false,
        error: 'UTR (bank reference) is required',
        code: 'UTR_REQUIRED'
      });
    }
    
    const result = await paymentWorkflowServiceV2.markAsSettled(
      req.params.id,
      req.actorInfo,
      { utr, bankTransactionId, settlementBatchId }
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'SETTLEMENT_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/mark-paid
 * Mark as paid - final state (SETTLED → PAID)
 * Body: { paymentConfirmation: object }
 */
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { paymentConfirmation } = req.body;
    
    const result = await paymentWorkflowServiceV2.markAsPaid(
      req.params.id,
      req.actorInfo,
      paymentConfirmation || {}
    );
    
    res.json({
      ...result,
      message: 'Payment completed. This is a terminal state.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'PAYMENT_ERROR'
    });
  }
});

// ============================================================================
// HOLD ENDPOINT
// ============================================================================

/**
 * POST /api/v2/payment-workflow/:id/hold
 * Put on hold (UNDER_REVIEW → ON_HOLD)
 * Body: { reason?: string }
 */
router.post('/:id/hold', async (req, res) => {
  try {
    const { reason } = req.body;
    
    const result = await paymentWorkflowServiceV2.transitionStatus(
      req.params.id,
      PaymentStatus.ON_HOLD,
      req.actorInfo,
      { reason: reason || 'Put on hold' }
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'HOLD_ERROR'
    });
  }
});

/**
 * POST /api/v2/payment-workflow/:id/resume
 * Resume from hold (ON_HOLD → UNDER_REVIEW)
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const result = await paymentWorkflowServiceV2.transitionStatus(
      req.params.id,
      PaymentStatus.UNDER_REVIEW,
      req.actorInfo
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      code: 'RESUME_ERROR'
    });
  }
});

// ============================================================================
// VALIDATION ENDPOINT
// ============================================================================

/**
 * POST /api/v2/payment-workflow/validate-transition
 * Validate a proposed transition without executing it
 * Body: { fromStatus: string, toStatus: string }
 */
router.post('/validate-transition', (req, res) => {
  const { fromStatus, toStatus } = req.body;
  
  if (!fromStatus || !toStatus) {
    return res.status(400).json({
      success: false,
      error: 'Both fromStatus and toStatus are required'
    });
  }
  
  const validation = validateTransition(fromStatus, toStatus);
  
  res.json({
    success: validation.valid,
    data: {
      fromStatus,
      toStatus,
      isValid: validation.valid,
      reason: validation.reason,
      allowedTransitions: validation.allowedTransitions || VALID_TRANSITIONS[fromStatus]
    }
  });
});

module.exports = router;
