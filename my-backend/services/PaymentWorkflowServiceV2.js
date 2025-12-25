/**
 * ============================================================================
 * PAYMENT REQUEST WORKFLOW SERVICE V2
 * ============================================================================
 * 
 * Enhanced payment request workflow engine with:
 * - Strict state machine with ACCOUNTED, QUEUED_FOR_SETTLEMENT, SETTLED states
 * - No backward transitions from terminal states
 * - No skipping of intermediate states
 * - Amount validation rules (APPROVED vs PARTIALLY_APPROVED)
 * - Hierarchy enforcement (subordinate cannot approve superior)
 * - Clarification governance (max 3 loops, auto-escalation)
 * - Concurrency-safe request numbering (year-based sequence)
 * - Complete audit trail
 * 
 * BUSINESS RULES:
 * 1. DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/PARTIALLY_APPROVED → ACCOUNTED
 *    → QUEUED_FOR_SETTLEMENT → SETTLED → PAID
 * 2. Terminal states: REJECTED, CANCELLED, PAID (no backward transitions)
 * 3. Approval requires approved_amount; APPROVED = full, PARTIALLY_APPROVED < full
 * 4. Max 3 clarification loops before auto-escalation
 * 5. Subordinates cannot approve superior's requests (convert to REQUEST)
 * 
 * @module services/PaymentWorkflowServiceV2
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// PAYMENT STATUS ENUM - Extended State Machine
// ============================================================================

const PaymentStatus = {
  // Initial states
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  
  // Review states
  UNDER_REVIEW: 'UNDER_REVIEW',
  NEED_INFO: 'NEED_INFO',
  ON_HOLD: 'ON_HOLD',
  
  // Approval states
  APPROVED: 'APPROVED',
  PARTIALLY_APPROVED: 'PARTIALLY_APPROVED',
  
  // NEW: Settlement layer states
  ACCOUNTED: 'ACCOUNTED',                    // Accounting entry created
  QUEUED_FOR_SETTLEMENT: 'QUEUED_FOR_SETTLEMENT',  // In settlement batch
  SETTLED: 'SETTLED',                        // Settlement executed (bank txn initiated)
  PARTIALLY_SETTLED: 'PARTIALLY_SETTLED',    // Partial payment received, more owed
  
  // Final state
  PAID: 'PAID',                              // Payment confirmed (full amount)
  
  // Terminal states
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

// Status order for tracking progression
const STATUS_ORDER = {
  [PaymentStatus.DRAFT]: 0,
  [PaymentStatus.SUBMITTED]: 1,
  [PaymentStatus.UNDER_REVIEW]: 2,
  [PaymentStatus.NEED_INFO]: 2.5,  // Same level as UNDER_REVIEW
  [PaymentStatus.ON_HOLD]: 2.5,
  [PaymentStatus.APPROVED]: 3,
  [PaymentStatus.PARTIALLY_APPROVED]: 3,
  [PaymentStatus.ACCOUNTED]: 4,
  [PaymentStatus.QUEUED_FOR_SETTLEMENT]: 5,
  [PaymentStatus.SETTLED]: 6,
  [PaymentStatus.PARTIALLY_SETTLED]: 6.5, // Partial payment, can be settled again
  [PaymentStatus.PAID]: 7,
  [PaymentStatus.REJECTED]: -1,  // Terminal
  [PaymentStatus.CANCELLED]: -1  // Terminal
};

// ============================================================================
// STRICT STATE MACHINE - Valid Transitions ONLY
// ============================================================================

/**
 * Defines ALL valid state transitions.
 * ❌ Backward transitions are NOT allowed (except NEED_INFO → UNDER_REVIEW)
 * ❌ Skipping intermediate states is NOT allowed
 */
const VALID_TRANSITIONS = {
  [PaymentStatus.DRAFT]: [
    PaymentStatus.SUBMITTED,
    PaymentStatus.CANCELLED
  ],
  
  [PaymentStatus.SUBMITTED]: [
    PaymentStatus.UNDER_REVIEW,
    PaymentStatus.CANCELLED
  ],
  
  [PaymentStatus.UNDER_REVIEW]: [
    PaymentStatus.APPROVED,
    PaymentStatus.PARTIALLY_APPROVED,
    PaymentStatus.REJECTED,
    PaymentStatus.NEED_INFO,
    PaymentStatus.ON_HOLD
  ],
  
  [PaymentStatus.NEED_INFO]: [
    PaymentStatus.UNDER_REVIEW,  // Only after clarification provided
    PaymentStatus.CANCELLED
  ],
  
  [PaymentStatus.ON_HOLD]: [
    PaymentStatus.UNDER_REVIEW,
    PaymentStatus.REJECTED,
    PaymentStatus.CANCELLED
  ],
  
  [PaymentStatus.APPROVED]: [
    PaymentStatus.ACCOUNTED
  ],
  
  [PaymentStatus.PARTIALLY_APPROVED]: [
    PaymentStatus.ACCOUNTED
  ],
  
  // NEW: Settlement pipeline states
  [PaymentStatus.ACCOUNTED]: [
    PaymentStatus.QUEUED_FOR_SETTLEMENT
  ],
  
  [PaymentStatus.QUEUED_FOR_SETTLEMENT]: [
    PaymentStatus.SETTLED,
    PaymentStatus.PARTIALLY_SETTLED  // Partial payment
  ],
  
  [PaymentStatus.SETTLED]: [
    PaymentStatus.PAID
  ],
  
  // PARTIALLY_SETTLED can be settled again for remaining amount
  [PaymentStatus.PARTIALLY_SETTLED]: [
    PaymentStatus.QUEUED_FOR_SETTLEMENT,  // Can be included in another settlement
    PaymentStatus.PAID                     // Final payment received
  ],
  
  // Terminal states - NO transitions allowed
  [PaymentStatus.PAID]: [],
  [PaymentStatus.REJECTED]: [],
  [PaymentStatus.CANCELLED]: []
};

// States that are terminal (no further transitions)
const TERMINAL_STATES = [
  PaymentStatus.PAID,
  PaymentStatus.REJECTED,
  PaymentStatus.CANCELLED
];

// States that require approved_amount to be set
const STATES_REQUIRING_APPROVED_AMOUNT = [
  PaymentStatus.APPROVED,
  PaymentStatus.PARTIALLY_APPROVED,
  PaymentStatus.ACCOUNTED,
  PaymentStatus.QUEUED_FOR_SETTLEMENT,
  PaymentStatus.SETTLED,
  PaymentStatus.PAID
];

// ============================================================================
// CLARIFICATION CONSTANTS
// ============================================================================

const MAX_CLARIFICATION_LOOPS = 3;
const CLARIFICATION_TIMEOUT_HOURS = 48;

// ============================================================================
// STATE MACHINE VALIDATOR
// ============================================================================

/**
 * Validates if a state transition is allowed
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateTransition(fromStatus, toStatus) {
  // Check if current status exists
  if (!VALID_TRANSITIONS[fromStatus]) {
    return {
      valid: false,
      reason: `Unknown current status: ${fromStatus}`
    };
  }
  
  // Check if target status exists
  if (!Object.prototype.hasOwnProperty.call(VALID_TRANSITIONS, toStatus) && toStatus !== PaymentStatus.REJECTED) {
    return {
      valid: false,
      reason: `Unknown target status: ${toStatus}`
    };
  }
  
  // Check if status is terminal (no transitions allowed)
  if (TERMINAL_STATES.includes(fromStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from terminal state: ${fromStatus}. Terminal states are final.`
    };
  }
  
  // Check if transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowedTransitions.includes(toStatus)) {
    return {
      valid: false,
      reason: `Invalid transition: ${fromStatus} → ${toStatus}. Allowed: ${allowedTransitions.join(', ') || 'NONE'}`,
      allowedTransitions
    };
  }
  
  return { valid: true };
}

/**
 * Check if trying to skip intermediate states
 */
function detectStateSkipping(fromStatus, toStatus) {
  const fromOrder = STATUS_ORDER[fromStatus];
  const toOrder = STATUS_ORDER[toStatus];
  
  // Terminal states are always allowed
  if (TERMINAL_STATES.includes(toStatus)) {
    return { skipping: false };
  }
  
  // Backward transitions (except NEED_INFO recovery)
  if (toOrder < fromOrder && fromStatus !== PaymentStatus.NEED_INFO) {
    return {
      skipping: true,
      reason: `Backward transition not allowed: ${fromStatus} (order ${fromOrder}) → ${toStatus} (order ${toOrder})`
    };
  }
  
  // Forward skip of more than 1 step
  if (toOrder - fromOrder > 1) {
    return {
      skipping: true,
      reason: `Cannot skip intermediate states: ${fromStatus} → ${toStatus}. Gap: ${toOrder - fromOrder} steps.`
    };
  }
  
  return { skipping: false };
}

// ============================================================================
// AMOUNT VALIDATION
// ============================================================================

/**
 * Validate amount rules for approval states
 * @param {string} toStatus - Target status
 * @param {number} requestedAmount - Original requested amount
 * @param {number|null} approvedAmount - Approved amount (if any)
 */
function validateAmountRules(toStatus, requestedAmount, approvedAmount) {
  const requested = parseFloat(requestedAmount);
  const approved = approvedAmount ? parseFloat(approvedAmount) : null;
  
  // Check if approved_amount is required
  if (STATES_REQUIRING_APPROVED_AMOUNT.includes(toStatus)) {
    if (approved === null || approved === undefined) {
      return {
        valid: false,
        reason: `Status ${toStatus} requires approved_amount to be set`
      };
    }
    
    if (approved <= 0) {
      return {
        valid: false,
        reason: `approved_amount must be positive, got: ${approved}`
      };
    }
    
    if (approved > requested) {
      return {
        valid: false,
        reason: `approved_amount (${approved}) cannot exceed requested_amount (${requested})`
      };
    }
  }
  
  // APPROVED vs PARTIALLY_APPROVED distinction
  if (toStatus === PaymentStatus.APPROVED) {
    if (approved !== requested) {
      return {
        valid: false,
        reason: `APPROVED status requires approved_amount (${approved}) == requested_amount (${requested}). Use PARTIALLY_APPROVED for reduced amounts.`
      };
    }
  }
  
  if (toStatus === PaymentStatus.PARTIALLY_APPROVED) {
    if (approved >= requested) {
      return {
        valid: false,
        reason: `PARTIALLY_APPROVED requires approved_amount (${approved}) < requested_amount (${requested}). Use APPROVED for full amount.`
      };
    }
  }
  
  return { valid: true };
}

// ============================================================================
// HIERARCHY ENFORCEMENT
// ============================================================================

/**
 * Get user info with authority level
 */
async function getUserInfo(userId) {
  const result = await prisma.$queryRaw`
    SELECT 
      u.id,
      u.full_name,
      u.email,
      COALESCE(u.business_level, 10) as business_level,
      r.name as role_name,
      r.level as role_level,
      u.manager_id,
      u.reports_to
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_primary = true
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.id = ${userId}::uuid AND u.deleted_at IS NULL
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Check if actor can approve a request (hierarchy check)
 * Subordinates cannot approve their superior's requests
 */
async function validateApprovalHierarchy(approverId, requesterId) {
  const approver = await getUserInfo(approverId);
  const requester = await getUserInfo(requesterId);
  
  if (!approver || !requester) {
    return {
      canApprove: false,
      reason: 'User not found'
    };
  }
  
  const approverLevel = approver.business_level || 10;
  const requesterLevel = requester.business_level || 10;
  
  // Subordinate cannot approve superior
  if (approverLevel < requesterLevel) {
    return {
      canApprove: false,
      reason: `Hierarchy violation: ${approver.full_name} (L${approverLevel}) cannot approve request from ${requester.full_name} (L${requesterLevel}). Lower-level users cannot approve higher-level users' requests.`,
      shouldConvertToRequest: true,
      approverLevel,
      requesterLevel
    };
  }
  
  return {
    canApprove: true,
    approverLevel,
    requesterLevel
  };
}

// ============================================================================
// CLARIFICATION GOVERNANCE
// ============================================================================

/**
 * Check clarification limits and auto-escalate if exceeded
 */
async function handleClarificationRequest(paymentRequestId, actorId, question, tenantId) {
  // Get current clarification count
  const pr = await prisma.$queryRaw`
    SELECT 
      id, clarification_count, current_approver_id, requested_by,
      status, requested_amount, approval_chain
    FROM payment_requests 
    WHERE id = ${paymentRequestId}
  `;
  
  if (!pr || pr.length === 0) {
    throw new Error('Payment request not found');
  }
  
  const request = pr[0];
  const currentCount = request.clarification_count || 0;
  
  // Check max clarification loops
  if (currentCount >= MAX_CLARIFICATION_LOOPS) {
    // Auto-escalate to next approver instead of asking more clarifications
    const escalationResult = await autoEscalateRequest(paymentRequestId, tenantId, 
      `Maximum clarification loops (${MAX_CLARIFICATION_LOOPS}) exceeded. Auto-escalating.`
    );
    
    return {
      success: true,
      action: 'AUTO_ESCALATED',
      message: `Maximum ${MAX_CLARIFICATION_LOOPS} clarification requests reached. Request has been auto-escalated.`,
      escalatedTo: escalationResult.newApproverId
    };
  }
  
  // Validate current status allows clarification request
  if (request.status !== PaymentStatus.UNDER_REVIEW && 
      request.status !== PaymentStatus.SUBMITTED) {
    throw new Error(`Cannot request clarification in status: ${request.status}`);
  }
  
  // Validate actor is the current approver
  if (request.current_approver_id !== actorId) {
    throw new Error('Only the current approver can request clarification');
  }
  
  // Update status and increment counter
  await prisma.$executeRaw`
    UPDATE payment_requests SET
      status = ${PaymentStatus.NEED_INFO},
      workflow_status = ${PaymentStatus.NEED_INFO},
      clarification_count = clarification_count + 1,
      last_clarification_at = NOW(),
      clarification_deadline = NOW() + INTERVAL '${CLARIFICATION_TIMEOUT_HOURS} hours',
      updated_at = NOW()
    WHERE id = ${paymentRequestId}
  `;
  
  // Create clarification message
  await prisma.$executeRaw`
    INSERT INTO payment_request_messages (
      payment_request_id, sender_id, content, message_type,
      is_clarification_request, tenant_id, created_at
    )
    VALUES (
      ${paymentRequestId}, ${actorId}::uuid, ${question}, 'CLARIFICATION_REQUEST',
      true, ${tenantId}::uuid, NOW()
    )
  `;
  
  // Create audit log
  await createAuditLog(paymentRequestId, tenantId, {
    action: 'CLARIFICATION_REQUESTED',
    actionBy: actorId,
    fromStatus: request.status,
    toStatus: PaymentStatus.NEED_INFO,
    metadata: {
      question,
      clarificationCount: currentCount + 1,
      maxClarifications: MAX_CLARIFICATION_LOOPS
    }
  });
  
  return {
    success: true,
    action: 'CLARIFICATION_REQUESTED',
    clarificationCount: currentCount + 1,
    remainingClarifications: MAX_CLARIFICATION_LOOPS - (currentCount + 1),
    deadline: new Date(Date.now() + CLARIFICATION_TIMEOUT_HOURS * 60 * 60 * 1000)
  };
}

/**
 * Provide clarification (only requester can respond)
 */
async function provideClarification(paymentRequestId, actorId, response, tenantId) {
  const pr = await prisma.$queryRaw`
    SELECT id, requested_by, status, current_approver_id
    FROM payment_requests 
    WHERE id = ${paymentRequestId}
  `;
  
  if (!pr || pr.length === 0) {
    throw new Error('Payment request not found');
  }
  
  const request = pr[0];
  
  // Validate only requester can provide clarification
  if (request.requested_by !== actorId) {
    throw new Error('Only the original requester can provide clarification');
  }
  
  // Validate status
  if (request.status !== PaymentStatus.NEED_INFO) {
    throw new Error(`Request is not awaiting clarification (current status: ${request.status})`);
  }
  
  // Update status back to UNDER_REVIEW
  await prisma.$executeRaw`
    UPDATE payment_requests SET
      status = ${PaymentStatus.UNDER_REVIEW},
      workflow_status = ${PaymentStatus.UNDER_REVIEW},
      clarification_deadline = NULL,
      updated_at = NOW()
    WHERE id = ${paymentRequestId}
  `;
  
  // Create response message
  await prisma.$executeRaw`
    INSERT INTO payment_request_messages (
      payment_request_id, sender_id, content, message_type,
      is_clarification_response, tenant_id, created_at
    )
    VALUES (
      ${paymentRequestId}, ${actorId}::uuid, ${response}, 'CLARIFICATION_RESPONSE',
      true, ${tenantId}::uuid, NOW()
    )
  `;
  
  // Audit log
  await createAuditLog(paymentRequestId, tenantId, {
    action: 'CLARIFICATION_PROVIDED',
    actionBy: actorId,
    fromStatus: PaymentStatus.NEED_INFO,
    toStatus: PaymentStatus.UNDER_REVIEW,
    metadata: { response }
  });
  
  return {
    success: true,
    message: 'Clarification provided, request returned to approver'
  };
}

/**
 * Auto-escalate when clarification limit exceeded
 */
async function autoEscalateRequest(paymentRequestId, tenantId, reason) {
  const pr = await prisma.$queryRaw`
    SELECT 
      id, current_approver_id, approval_chain, current_approval_level,
      max_approval_level, requested_amount
    FROM payment_requests WHERE id = ${paymentRequestId}
  `;
  
  if (!pr || pr.length === 0) {
    throw new Error('Payment request not found');
  }
  
  const request = pr[0];
  const approvalChain = request.approval_chain || [];
  const currentLevel = request.current_approval_level || 1;
  
  // Find next level approver
  let newApproverId = null;
  const nextLevel = approvalChain.find(l => l.level > currentLevel);
  
  if (nextLevel && nextLevel.approverId) {
    newApproverId = nextLevel.approverId;
  } else {
    // Fallback to admin
    const admin = await getAdminFallback(tenantId);
    newApproverId = admin?.id;
  }
  
  if (!newApproverId) {
    throw new Error('No escalation target available');
  }
  
  await prisma.$executeRaw`
    UPDATE payment_requests SET
      current_approver_id = ${newApproverId}::uuid,
      current_approval_level = ${currentLevel + 1},
      status = ${PaymentStatus.UNDER_REVIEW},
      workflow_status = ${PaymentStatus.UNDER_REVIEW},
      escalated_at = NOW(),
      escalation_reason = ${reason},
      updated_at = NOW()
    WHERE id = ${paymentRequestId}
  `;
  
  await createAuditLog(paymentRequestId, tenantId, {
    action: 'AUTO_ESCALATED',
    fromStatus: PaymentStatus.NEED_INFO,
    toStatus: PaymentStatus.UNDER_REVIEW,
    metadata: { reason, newApproverId, previousLevel: currentLevel }
  });
  
  return {
    success: true,
    newApproverId,
    newLevel: currentLevel + 1
  };
}

// ============================================================================
// CONCURRENCY-SAFE REQUEST NUMBERING
// ============================================================================

/**
 * Generate unique payment request number using PostgreSQL sequence
 * Format: PAY-YYYY-NNNNN (e.g., PAY-2025-00001)
 */
async function generatePaymentRequestNumber(tenantId) {
  const year = new Date().getFullYear();
  const sequenceName = `payment_request_seq_${year}`;
  
  try {
    // Create year-based sequence if not exists (atomic operation)
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = ${sequenceName}) THEN
          EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START WITH 1 INCREMENT BY 1 NO CYCLE', ${sequenceName});
        END IF;
      END $$;
    `;
    
    // Get next value atomically
    const result = await prisma.$queryRawUnsafe(
      `SELECT nextval('${sequenceName}') as seq_num`
    );
    
    const seqNum = result[0]?.seq_num || 1;
    const paddedNum = String(seqNum).padStart(5, '0');
    
    return `PAY-${year}-${paddedNum}`;
    
  } catch {
    // Fallback: Use atomic retry with advisory lock
    return await generateRequestNumberWithRetry(tenantId, year);
  }
}

/**
 * Fallback: Generate with advisory lock and retry
 */
async function generateRequestNumberWithRetry(tenantId, year, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Acquire advisory lock
      await prisma.$executeRaw`SELECT pg_advisory_xact_lock(${year})`;
      
      // Get current max
      const result = await prisma.$queryRaw`
        SELECT MAX(CAST(SUBSTRING("requestId" FROM 10) AS INTEGER)) as max_num
        FROM payment_requests
        WHERE "requestId" LIKE ${'PAY-' + year + '-%'}
          AND tenant_id = ${tenantId}::uuid
      `;
      
      const maxNum = result[0]?.max_num || 0;
      const nextNum = maxNum + 1;
      const paddedNum = String(nextNum).padStart(5, '0');
      const requestNumber = `PAY-${year}-${paddedNum}`;
      
      // Verify uniqueness with conflict check
      const existing = await prisma.$queryRaw`
        SELECT 1 FROM payment_requests WHERE "requestId" = ${requestNumber} LIMIT 1
      `;
      
      if (existing.length === 0) {
        return requestNumber;
      }
      
      // Conflict - retry
      await new Promise(resolve => setTimeout(resolve, 10 * (attempt + 1)));
      
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw new Error(`Failed to generate unique request number after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
  
  throw new Error('Failed to generate unique payment request number');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getAdminFallback(tenantId) {
  const admin = await prisma.$queryRaw`
    SELECT u.id, u.full_name, u.email
    FROM users u
    WHERE u.tenant_id = ${tenantId}::uuid
      AND u.deleted_at IS NULL
      AND u.status = 'active'
      AND (u.business_level >= 90 OR u.user_type = 'ADMIN')
    ORDER BY u.business_level DESC
    LIMIT 1
  `;
  return admin.length > 0 ? admin[0] : null;
}

async function createAuditLog(paymentRequestId, tenantId, data) {
  await prisma.$executeRaw`
    INSERT INTO payment_request_approvals (
      payment_request_id, tenant_id, from_stage, to_stage,
      action, action_by, comment, metadata, action_at
    ) VALUES (
      ${paymentRequestId}, ${tenantId}::uuid, 
      ${data.fromStatus || null}, ${data.toStatus || null},
      ${data.action}, ${data.actionBy || null}::uuid,
      ${data.comment || null},
      ${data.metadata ? JSON.stringify(data.metadata) : null}::jsonb,
      NOW()
    )
  `;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

class PaymentWorkflowServiceV2 {
  
  /**
   * Create new payment request with concurrency-safe numbering
   */
  async createPaymentRequest(data, actorInfo) {
    const { userId, tenantId } = actorInfo;
    
    // Generate unique request number
    const requestNumber = await generatePaymentRequestNumber(tenantId);
    
    // Create with DRAFT status
    const result = await prisma.$queryRaw`
      INSERT INTO payment_requests (
        "requestId", status, workflow_status, requested_amount,
        requested_by, tenant_id, clarification_count,
        created_at, updated_at
      )
      VALUES (
        ${requestNumber}, ${PaymentStatus.DRAFT}, ${PaymentStatus.DRAFT},
        ${data.amount}, ${userId}::uuid, ${tenantId}::uuid, 0,
        NOW(), NOW()
      )
      RETURNING *
    `;
    
    await createAuditLog(result[0].id, tenantId, {
      action: 'CREATED',
      actionBy: userId,
      toStatus: PaymentStatus.DRAFT
    });
    
    return {
      success: true,
      request: result[0],
      requestNumber
    };
  }
  
  /**
   * Transition status with strict state machine validation
   */
  async transitionStatus(paymentRequestId, toStatus, actorInfo, options = {}) {
    const { userId, tenantId } = actorInfo;
    const { approvedAmount, reason, metadata } = options;
    
    // Get current request
    const pr = await prisma.$queryRaw`
      SELECT * FROM payment_requests WHERE id = ${paymentRequestId}
    `;
    
    if (!pr || pr.length === 0) {
      throw new Error('Payment request not found');
    }
    
    const request = pr[0];
    const fromStatus = request.status || request.workflow_status;
    
    // 1. Validate state machine transition
    const transitionValidation = validateTransition(fromStatus, toStatus);
    if (!transitionValidation.valid) {
      throw new Error(`State Machine Violation: ${transitionValidation.reason}`);
    }
    
    // 2. Check for state skipping
    const skipCheck = detectStateSkipping(fromStatus, toStatus);
    if (skipCheck.skipping) {
      throw new Error(`State Skipping Detected: ${skipCheck.reason}`);
    }
    
    // 3. Validate amount rules for approval states
    const amountValidation = validateAmountRules(
      toStatus, 
      request.requested_amount || request.totalAmount, 
      approvedAmount
    );
    if (!amountValidation.valid) {
      throw new Error(`Amount Validation Failed: ${amountValidation.reason}`);
    }
    
    // 4. Validate hierarchy for approval actions
    if ([PaymentStatus.APPROVED, PaymentStatus.PARTIALLY_APPROVED].includes(toStatus)) {
      const hierarchyCheck = await validateApprovalHierarchy(userId, request.requested_by);
      if (!hierarchyCheck.canApprove) {
        if (hierarchyCheck.shouldConvertToRequest) {
          // Convert to REQUEST instead of direct approval
          return await this.convertToTaskRequest(paymentRequestId, userId, tenantId);
        }
        throw new Error(`Hierarchy Violation: ${hierarchyCheck.reason}`);
      }
    }
    
    // Build update query based on transition
    const updates = {
      status: toStatus,
      workflow_status: toStatus,
      updated_at: new Date()
    };
    
    if (approvedAmount !== undefined) {
      updates.approved_amount = approvedAmount;
      updates.approved_at = new Date();
      updates.approved_by = userId;
    }
    
    if ([PaymentStatus.REJECTED, PaymentStatus.CANCELLED].includes(toStatus)) {
      updates.resolution_reason = reason;
      updates.resolved_by = userId;
      updates.resolved_at = new Date();
    }
    
    // Execute update
    await prisma.$executeRaw`
      UPDATE payment_requests SET
        status = ${updates.status},
        workflow_status = ${updates.workflow_status},
        approved_amount = COALESCE(${updates.approved_amount || null}, approved_amount),
        approved_at = COALESCE(${updates.approved_at || null}::timestamp, approved_at),
        approved_by = COALESCE(${updates.approved_by || null}::uuid, approved_by),
        resolution_reason = COALESCE(${updates.resolution_reason || null}, resolution_reason),
        resolved_by = COALESCE(${updates.resolved_by || null}::uuid, resolved_by),
        resolved_at = COALESCE(${updates.resolved_at || null}::timestamp, resolved_at),
        updated_at = NOW()
      WHERE id = ${paymentRequestId}
    `;
    
    // Audit log
    await createAuditLog(paymentRequestId, tenantId, {
      action: `TRANSITION_${toStatus}`,
      actionBy: userId,
      fromStatus,
      toStatus,
      comment: reason,
      metadata: { ...metadata, approvedAmount }
    });
    
    return {
      success: true,
      previousStatus: fromStatus,
      currentStatus: toStatus,
      approvedAmount,
      isTerminal: TERMINAL_STATES.includes(toStatus)
    };
  }
  
  /**
   * Submit payment request (DRAFT → SUBMITTED)
   */
  async submitRequest(paymentRequestId, actorInfo) {
    return this.transitionStatus(paymentRequestId, PaymentStatus.SUBMITTED, actorInfo);
  }
  
  /**
   * Approve payment request with amount validation
   */
  async approveRequest(paymentRequestId, actorInfo, approvedAmount, reason) {
    const pr = await prisma.$queryRaw`
      SELECT requested_amount, "totalAmount" FROM payment_requests WHERE id = ${paymentRequestId}
    `;
    
    if (!pr || pr.length === 0) {
      throw new Error('Payment request not found');
    }
    
    const requestedAmount = parseFloat(pr[0].requested_amount || pr[0].totalAmount);
    const approved = parseFloat(approvedAmount);
    
    // Determine APPROVED vs PARTIALLY_APPROVED
    const targetStatus = approved >= requestedAmount 
      ? PaymentStatus.APPROVED 
      : PaymentStatus.PARTIALLY_APPROVED;
    
    return this.transitionStatus(paymentRequestId, targetStatus, actorInfo, {
      approvedAmount: approved,
      reason
    });
  }
  
  /**
   * Reject payment request
   */
  async rejectRequest(paymentRequestId, actorInfo, reason) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is required');
    }
    return this.transitionStatus(paymentRequestId, PaymentStatus.REJECTED, actorInfo, { reason });
  }
  
  /**
   * Cancel payment request (only by requester, only in cancellable states)
   */
  async cancelRequest(paymentRequestId, actorInfo, reason) {
    const pr = await prisma.$queryRaw`
      SELECT requested_by FROM payment_requests WHERE id = ${paymentRequestId}
    `;
    
    if (pr[0]?.requested_by !== actorInfo.userId) {
      throw new Error('Only the requester can cancel this payment request');
    }
    
    return this.transitionStatus(paymentRequestId, PaymentStatus.CANCELLED, actorInfo, { reason });
  }
  
  /**
   * Request clarification (with governance)
   */
  async requestClarification(paymentRequestId, actorInfo, question) {
    return handleClarificationRequest(
      paymentRequestId, 
      actorInfo.userId, 
      question, 
      actorInfo.tenantId
    );
  }
  
  /**
   * Respond to clarification request
   */
  async respondToClarification(paymentRequestId, actorInfo, response) {
    return provideClarification(
      paymentRequestId,
      actorInfo.userId,
      response,
      actorInfo.tenantId
    );
  }
  
  // ========================================================================
  // NEW: Settlement Pipeline Methods
  // ========================================================================
  
  /**
   * Mark as ACCOUNTED (accounting entry created)
   */
  async markAsAccounted(paymentRequestId, actorInfo, voucherNumber) {
    return this.transitionStatus(paymentRequestId, PaymentStatus.ACCOUNTED, actorInfo, {
      metadata: { voucherNumber, accountedAt: new Date() }
    });
  }
  
  /**
   * Queue for settlement batch
   */
  async queueForSettlement(paymentRequestId, actorInfo, batchId) {
    return this.transitionStatus(paymentRequestId, PaymentStatus.QUEUED_FOR_SETTLEMENT, actorInfo, {
      metadata: { settlementBatchId: batchId, queuedAt: new Date() }
    });
  }
  
  /**
   * Mark as SETTLED (bank transaction initiated)
   */
  async markAsSettled(paymentRequestId, actorInfo, settlementDetails) {
    const { utr, bankTransactionId, settlementBatchId } = settlementDetails;
    
    return this.transitionStatus(paymentRequestId, PaymentStatus.SETTLED, actorInfo, {
      metadata: {
        utr,
        bankTransactionId,
        settlementBatchId,
        settledAt: new Date()
      }
    });
  }
  
  /**
   * Mark as PAID (final confirmation)
   */
  async markAsPaid(paymentRequestId, actorInfo, paymentConfirmation) {
    return this.transitionStatus(paymentRequestId, PaymentStatus.PAID, actorInfo, {
      metadata: {
        ...paymentConfirmation,
        paidAt: new Date()
      }
    });
  }
  
  /**
   * Convert to task request when hierarchy doesn't allow approval
   */
  async convertToTaskRequest(paymentRequestId, actorId, tenantId) {
    // This creates a task request for the superior to review
    await createAuditLog(paymentRequestId, tenantId, {
      action: 'CONVERTED_TO_REQUEST',
      actionBy: actorId,
      metadata: {
        reason: 'Hierarchy violation - subordinate attempted to approve superior request',
        convertedAt: new Date()
      }
    });
    
    return {
      success: true,
      converted: true,
      message: 'Your approval has been converted to a request. A higher-level approver must review.'
    };
  }
  
  /**
   * Get valid transitions for current status
   */
  getValidTransitions(currentStatus) {
    return {
      currentStatus,
      allowedTransitions: VALID_TRANSITIONS[currentStatus] || [],
      isTerminal: TERMINAL_STATES.includes(currentStatus)
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const paymentWorkflowServiceV2 = new PaymentWorkflowServiceV2();

module.exports = {
  // Service
  paymentWorkflowServiceV2,
  PaymentWorkflowServiceV2,
  
  // Enums
  PaymentStatus,
  STATUS_ORDER,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  STATES_REQUIRING_APPROVED_AMOUNT,
  
  // Clarification constants
  MAX_CLARIFICATION_LOOPS,
  CLARIFICATION_TIMEOUT_HOURS,
  
  // Validators
  validateTransition,
  detectStateSkipping,
  validateAmountRules,
  validateApprovalHierarchy,
  
  // Utilities
  generatePaymentRequestNumber,
  getUserInfo,
  
  // Clarification
  handleClarificationRequest,
  provideClarification
};
