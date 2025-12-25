/**
 * ============================================================================
 * SETTLEMENT API ROUTES
 * ============================================================================
 * 
 * Role-based settlement workflow API:
 * - Accountant: Full view, create settlements, partial payments
 * - Finance Controller: Simplified approval view
 * - CFO: Simplified approval view
 * - Banker: Execute & enter UTR
 * 
 * @module routes/settlementRoutes
 */

const express = require('express');
const router = express.Router();

const {
  // Constants
  SettlementStatus,
  Roles,
  
  // Role detection
  getUserSettlementRole,
  
  // Accountant functions
  getAccountantPendingRequests,
  getRequestPartialHistory,
  createSettlement,
  submitSettlement,
  
  // Approval flow
  financeControllerApprove,
  cfoApprove,
  sendToBank,
  
  // Banker
  executeSettlement,
  
  // Rejection
  rejectSettlement,
  
  // Views
  getSettlementTasksForUser,
  getSettlementDetails,
  
  // NEW: Partial Disallow (FC/CFO Review Mode)
  getSettlementReviewItems,
  partialDisallowItems,
  approveWithPartialDisallow,
  
  // NEW: Fail Recovery
  markSettlementFailed,
  retryFailedSettlement,
  
  // NEW: UTR Correction
  correctUTR,
  
  // Audit
  traceByUTR
} = require('../services/SettlementService');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Attach user context
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
  
  next();
}

/**
 * Attach settlement role info
 */
async function attachSettlementRole(req, res, next) {
  try {
    const userRole = await getUserSettlementRole(req.userId);
    req.settlementRole = userRole;
    req.isAccountant = userRole?.isAccountant || false;
    req.canSeeFullDetails = userRole?.canSeeFullDetails || false;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to determine user role',
      message: error.message
    });
  }
}

/**
 * Require Accountant role
 */
function requireAccountant(req, res, next) {
  if (!req.isAccountant && req.settlementRole?.settlementRole !== Roles.ADMIN) {
    return res.status(403).json({
      success: false,
      error: 'ACCESS_DENIED',
      message: 'Only Accountant can perform this action'
    });
  }
  next();
}

router.use(attachUserContext);
router.use(attachSettlementRole);

// ============================================================================
// REFERENCE ENDPOINTS
// ============================================================================

/**
 * GET /api/settlements/my-role
 * Get current user's settlement role and capabilities
 */
router.get('/my-role', (req, res) => {
  res.json({
    success: true,
    data: {
      userId: req.userId,
      settlementRole: req.settlementRole?.settlementRole,
      isAccountant: req.isAccountant,
      canSeeFullDetails: req.canSeeFullDetails,
      capabilities: {
        canCreateSettlement: req.isAccountant,
        canSeeLineItems: req.canSeeFullDetails,
        canSeePartialHistory: req.canSeeFullDetails,
        canApprove: [Roles.FINANCE_CONTROLLER, Roles.CFO, Roles.ADMIN].includes(req.settlementRole?.settlementRole),
        canExecute: req.settlementRole?.settlementRole === Roles.BANKER || req.settlementRole?.settlementRole === Roles.ADMIN
      }
    }
  });
});

/**
 * GET /api/settlements/statuses
 * Get all settlement statuses
 */
router.get('/statuses', (req, res) => {
  res.json({
    success: true,
    data: {
      statuses: Object.values(SettlementStatus),
      roles: Object.values(Roles)
    }
  });
});

// ============================================================================
// ACCOUNTANT-ONLY: PENDING REQUESTS (FULL VIEW)
// ============================================================================

/**
 * GET /api/settlements/pending-requests
 * Get payment requests pending settlement (ACCOUNTANT ONLY)
 * Returns FULL details: approved, paid, remaining amounts
 */
router.get('/pending-requests', requireAccountant, async (req, res) => {
  try {
    const { vendorId, minAmount, maxAmount, search, page, limit } = req.query;
    
    const result = await getAccountantPendingRequests(
      req.userId,
      req.tenantId,
      { vendorId, minAmount, maxAmount, search, page: parseInt(page) || 1, limit: parseInt(limit) || 50 }
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('ACCESS_DENIED') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/settlements/request/:requestId/partial-history
 * Get partial payment history for a request (ACCOUNTANT ONLY)
 */
router.get('/request/:requestId/partial-history', requireAccountant, async (req, res) => {
  try {
    const result = await getRequestPartialHistory(req.params.requestId, req.userId);
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('ACCESS_DENIED') ? 403 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ACCOUNTANT-ONLY: CREATE & SUBMIT SETTLEMENT
// ============================================================================

/**
 * POST /api/settlements
 * Create a new settlement from selected requests (ACCOUNTANT ONLY)
 * 
 * Body: {
 *   purpose: string,
 *   lineItems: [{ paymentRequestId: string, amountToSettle: number }],
 *   beneficiaryName?: string,
 *   beneficiaryBank?: string,
 *   beneficiaryAccount?: string,
 *   beneficiaryIfsc?: string,
 *   paymentMode?: string,
 *   settlementDate?: date,
 *   dueDate?: date,
 *   remarks?: string,
 *   attachments?: array
 * }
 */
router.post('/', requireAccountant, async (req, res) => {
  try {
    const result = await createSettlement(req.userId, req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/settlements/:id/submit
 * Submit settlement to Finance Controller (ACCOUNTANT ONLY)
 */
router.post('/:id/submit', requireAccountant, async (req, res) => {
  try {
    const result = await submitSettlement(req.params.id, req.userId, req.tenantId);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ROLE-BASED: GET SETTLEMENTS / TASKS
// ============================================================================

/**
 * GET /api/settlements/tasks
 * Get settlement tasks for current user (ROLE-BASED VIEW)
 * - Accountant: Full details with line items
 * - Others: Simplified view (ONE task per settlement)
 */
router.get('/tasks', async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    
    const result = await getSettlementTasksForUser(
      req.userId,
      req.tenantId,
      { status, page: parseInt(page) || 1, limit: parseInt(limit) || 50 }
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/settlements/:id
 * Get single settlement details (ROLE-BASED VIEW)
 * - Accountant: Full details with line items
 * - Others: Simplified view only
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await getSettlementDetails(req.params.id, req.userId, req.tenantId);
    res.json(result);
  } catch (error) {
    res.status(error.message === 'Settlement not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// APPROVAL FLOW
// ============================================================================

/**
 * POST /api/settlements/:id/finance-approve
 * Finance Controller approves settlement
 * Body: { comment?: string }
 */
router.post('/:id/finance-approve', async (req, res) => {
  try {
    const result = await financeControllerApprove(
      req.params.id,
      req.userId,
      req.tenantId,
      req.body.comment
    );
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('ACCESS_DENIED') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/settlements/:id/cfo-approve
 * CFO approves settlement
 * Body: { comment?: string }
 */
router.post('/:id/cfo-approve', async (req, res) => {
  try {
    const result = await cfoApprove(
      req.params.id,
      req.userId,
      req.tenantId,
      req.body.comment
    );
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('ACCESS_DENIED') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/settlements/:id/send-to-bank
 * Send settlement to bank for execution
 * Body: { bankAccountId?: string }
 */
router.post('/:id/send-to-bank', async (req, res) => {
  try {
    const result = await sendToBank(
      req.params.id,
      req.userId,
      req.tenantId,
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// BANKER: EXECUTE PAYMENT
// ============================================================================

/**
 * POST /api/settlements/:id/execute
 * Execute settlement and enter UTR (BANKER ONLY)
 * 
 * IDEMPOTENCY: Include X-Idempotency-Key header or idempotencyKey in body
 * to prevent duplicate executions from double-click or network retry
 * 
 * Body: {
 *   utrNumber: string (REQUIRED),
 *   bankTransactionId?: string,
 *   bankReference?: string,
 *   remarks?: string,
 *   idempotencyKey?: string  // Optional, auto-generated if not provided
 * }
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { utrNumber, bankTransactionId, bankReference, remarks, idempotencyKey } = req.body;
    
    // Support idempotency key from header or body
    const idemKey = req.headers['x-idempotency-key'] || idempotencyKey;
    
    if (!utrNumber) {
      return res.status(400).json({
        success: false,
        error: 'UTR number is required'
      });
    }
    
    const result = await executeSettlement(
      req.params.id,
      req.userId,
      req.tenantId,
      { utrNumber, bankTransactionId, bankReference, remarks, idempotencyKey: idemKey }
    );
    
    // Add header to indicate if response was from cache
    if (result._idempotent) {
      res.setHeader('X-Idempotent-Replay', 'true');
    }
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('IDEMPOTENCY_CONFLICT')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    const statusCode = error.message.includes('ACCESS_DENIED') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// REJECTION
// ============================================================================

/**
 * POST /api/settlements/:id/reject
 * Reject settlement at any stage
 * Body: { reason: string (REQUIRED) }
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }
    
    const result = await rejectSettlement(
      req.params.id,
      req.userId,
      req.tenantId,
      reason
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// AUDIT: UTR TRACE
// ============================================================================

/**
 * GET /api/settlements/trace/utr/:utrNumber
 * Trace all requests settled by a UTR
 */
router.get('/trace/utr/:utrNumber', async (req, res) => {
  try {
    const result = await traceByUTR(req.params.utrNumber, req.tenantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// SETTLEMENT APPROVAL HISTORY
// ============================================================================

/**
 * GET /api/settlements/:id/history
 * Get approval history for a settlement
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const history = await prisma.$queryRaw`
      SELECT 
        sa.*,
        actor.full_name AS actor_name
      FROM settlement_approvals sa
      LEFT JOIN users actor ON sa.actor_id = actor.id
      WHERE sa.settlement_id = ${req.params.id}::uuid
      ORDER BY sa.created_at ASC
    `;
    
    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// PARTIAL DISALLOW - FC/CFO REVIEW MODE (Per MASTER PROMPT)
// ============================================================================

/**
 * GET /api/settlements/:id/review-items
 * Get settlement items for review mode (FC/CFO ONLY)
 * Returns selectable items with checkbox state, NO amount editing
 */
router.get('/:id/review-items', async (req, res) => {
  try {
    const result = await getSettlementReviewItems(
      req.params.id,
      req.userId,
      req.tenantId
    );
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('ACCESS_DENIED') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/settlements/:id/partial-disallow
 * Disallow specific items from settlement (FC/CFO ONLY)
 * Disallowed items return to Accountant queue
 * 
 * Body: {
 *   disallowedItemIds: string[],  // Array of line item IDs to disallow
 *   reason?: string               // Reason for disallow
 * }
 */
router.post('/:id/partial-disallow', async (req, res) => {
  try {
    const { disallowedItemIds, reason } = req.body;
    
    if (!disallowedItemIds || !Array.isArray(disallowedItemIds) || disallowedItemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'disallowedItemIds array is required'
      });
    }
    
    const result = await partialDisallowItems(
      req.params.id,
      disallowedItemIds,
      req.userId,
      req.tenantId,
      reason
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('ACCESS_DENIED') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/settlements/:id/approve-with-disallow
 * Approve settlement while optionally disallowing some items (FC/CFO)
 * 
 * Body: {
 *   disallowedItemIds?: string[],  // Items to disallow (optional)
 *   reason?: string,               // Reason for disallow
 *   comment?: string               // Approval comment
 * }
 */
router.post('/:id/approve-with-disallow', async (req, res) => {
  try {
    const result = await approveWithPartialDisallow(
      req.params.id,
      req.userId,
      req.tenantId,
      req.body
    );
    
    res.json(result);
  } catch (error) {
    const statusCode = error.message.includes('ACCESS_DENIED') ? 403 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// FAIL RECOVERY ENDPOINTS (Per MASTER PROMPT)
// ============================================================================

/**
 * POST /api/settlements/:id/mark-failed
 * Mark settlement as FAILED (Banker or Admin)
 * Reverts all requests to QUEUED_FOR_SETTLEMENT
 * 
 * Body: {
 *   failureCode?: string,   // e.g., 'INSUFFICIENT_FUNDS', 'BANK_ERROR'
 *   failureReason: string,  // Required description
 *   failureSource?: string  // 'BANK', 'SYSTEM', 'MANUAL' (default: MANUAL)
 * }
 */
router.post('/:id/mark-failed', async (req, res) => {
  try {
    const result = await markSettlementFailed(
      req.params.id,
      req.userId,
      req.tenantId,
      req.body
    );
    
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/settlements/:id/retry
 * Retry a failed settlement
 * Moves settlement back to SENT_TO_BANK for another attempt
 * 
 * IDEMPOTENCY: Include X-Idempotency-Key header to prevent duplicate retries
 * 
 * Body: {
 *   idempotencyKey?: string  // Optional
 * }
 */
router.post('/:id/retry', async (req, res) => {
  try {
    // Support idempotency key from header or body
    const idemKey = req.headers['x-idempotency-key'] || req.body?.idempotencyKey;
    
    const result = await retryFailedSettlement(
      req.params.id,
      req.userId,
      req.tenantId,
      { idempotencyKey: idemKey }
    );
    
    // Add header to indicate if response was from cache
    if (result._idempotent) {
      res.setHeader('X-Idempotent-Replay', 'true');
    }
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('IDEMPOTENCY_CONFLICT')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// UTR CORRECTION (Before PAID only)
// ============================================================================

/**
 * POST /api/settlements/:id/correct-utr
 * Correct UTR number (only before PAID status)
 * 
 * IDEMPOTENCY: Include X-Idempotency-Key header to prevent duplicate corrections
 * 
 * Body: {
 *   newUTR: string,           // New UTR number
 *   correctionReason: string, // Required reason for audit
 *   idempotencyKey?: string   // Optional
 * }
 */
router.post('/:id/correct-utr', async (req, res) => {
  try {
    // Support idempotency key from header or body
    const idemKey = req.headers['x-idempotency-key'] || req.body?.idempotencyKey;
    
    const result = await correctUTR(
      req.params.id,
      req.userId,
      req.tenantId,
      { ...req.body, idempotencyKey: idemKey }
    );
    
    // Add header to indicate if response was from cache
    if (result._idempotent) {
      res.setHeader('X-Idempotent-Replay', 'true');
    }
    
    res.json(result);
  } catch (error) {
    if (error.message.includes('IDEMPOTENCY_CONFLICT')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
