/**
 * ============================================================================
 * SETTLEMENT SERVICE
 * ============================================================================
 * 
 * Handles the post-approval payment workflow:
 * - Accountant-only consolidation of payment requests
 * - Partial payment support
 * - Settlement creation and lifecycle
 * - UTR propagation to linked requests
 * - Role-based view segregation
 * 
 * BUSINESS RULES:
 * 1. Only ACCOUNTANT can create settlements
 * 2. Only ACCOUNTANT can see individual request details
 * 3. Other roles see ONE settlement task (simplified view)
 * 4. Partial payments tracked per request
 * 5. One UTR settles multiple requests
 * 
 * SECURITY CONTROLS (v2):
 * - Maker-Checker enforcement
 * - Optimistic locking for concurrency
 * - Row-level locks for consolidation
 * - One-time approval tokens
 * - Fraud signal detection
 * 
 * @module services/SettlementService
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// Import PaymentWorkflowServiceV2 for consistent state management
const { 
  PaymentStatus 
} = require('./PaymentWorkflowServiceV2');

// ============================================================================
// CONSTANTS
// ============================================================================

const SettlementStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED_TO_FINANCE: 'SUBMITTED_TO_FINANCE',
  FINANCE_CONTROLLER_APPROVED: 'FINANCE_CONTROLLER_APPROVED',
  CFO_APPROVED: 'CFO_APPROVED',
  SENT_TO_BANK: 'SENT_TO_BANK',
  PAID: 'PAID',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED'  // NEW: Exception state for bank failures
};

const SettlementStages = {
  ACCOUNTANT_DRAFT: 'ACCOUNTANT_DRAFT',
  FINANCE_CONTROLLER_REVIEW: 'FINANCE_CONTROLLER_REVIEW',
  CFO_REVIEW: 'CFO_REVIEW',
  BANKER_EXECUTION: 'BANKER_EXECUTION',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'  // NEW: Exception state
};

// Valid state transitions (STRICT - no skipping, no backward from terminal)
const VALID_SETTLEMENT_TRANSITIONS = {
  [SettlementStatus.DRAFT]: [
    SettlementStatus.SUBMITTED_TO_FINANCE,
    SettlementStatus.CANCELLED
  ],
  [SettlementStatus.SUBMITTED_TO_FINANCE]: [
    SettlementStatus.FINANCE_CONTROLLER_APPROVED,
    SettlementStatus.REJECTED
  ],
  [SettlementStatus.FINANCE_CONTROLLER_APPROVED]: [
    SettlementStatus.CFO_APPROVED,
    SettlementStatus.REJECTED
  ],
  [SettlementStatus.CFO_APPROVED]: [
    SettlementStatus.SENT_TO_BANK,
    SettlementStatus.REJECTED
  ],
  [SettlementStatus.SENT_TO_BANK]: [
    SettlementStatus.PAID,
    SettlementStatus.FAILED,  // NEW: Can fail
    SettlementStatus.REJECTED
  ],
  // FAILED can be retried or cancelled
  [SettlementStatus.FAILED]: [
    SettlementStatus.SENT_TO_BANK,  // Retry
    SettlementStatus.CANCELLED
  ],
  // Terminal states - NO transitions allowed
  [SettlementStatus.PAID]: [],
  [SettlementStatus.REJECTED]: [],
  [SettlementStatus.CANCELLED]: []
};

// Roles
const Roles = {
  ACCOUNTANT: 'ACCOUNTANT',
  FINANCE_CONTROLLER: 'FINANCE_CONTROLLER',
  CFO: 'CFO',
  BANKER: 'BANKER',
  ADMIN: 'ADMIN'
};

// Idempotency operation types
const IdempotencyOperations = {
  SETTLEMENT_EXECUTE: 'SETTLEMENT_EXECUTE',
  SETTLEMENT_RETRY: 'SETTLEMENT_RETRY',
  UTR_CORRECTION: 'UTR_CORRECTION'
};

// ============================================================================
// IDEMPOTENCY GUARDS (Prevents double-click / network retry duplicates)
// ============================================================================

/**
 * Generate idempotency key from request data
 * Format: {operation}_{resourceId}_{timestamp_bucket}
 * Timestamp bucket groups requests within 5-second windows
 */
function generateIdempotencyKey(operation, resourceId, clientKey = null) {
  if (clientKey) {
    // Client provided their own key (preferred)
    return clientKey;
  }
  // Generate server-side key (5-second bucket to catch rapid double-clicks)
  const bucket = Math.floor(Date.now() / 5000);
  return `${operation}_${resourceId}_${bucket}`;
}

/**
 * Check idempotency and acquire lock if not duplicate
 * Returns: { isDuplicate, cachedResponse, lockId }
 */
async function checkIdempotency(operation, resourceId, actorId, tenantId, clientKey = null, requestHash = null) {
  const key = generateIdempotencyKey(operation, resourceId, clientKey);
  
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM check_idempotency_key(
        ${key}::VARCHAR,
        ${operation}::VARCHAR,
        ${resourceId}::UUID,
        ${actorId}::UUID,
        ${tenantId}::UUID,
        ${requestHash}::VARCHAR
      )
    `;
    
    if (result && result.length > 0) {
      const row = result[0];
      return {
        isDuplicate: row.is_duplicate || false,
        status: row.existing_status,
        cachedResponse: row.existing_response,
        lockId: row.lock_id
      };
    }
    
    // Fallback: no result means proceed (shouldn't happen)
    return { isDuplicate: false, lockId: null };
  } catch (error) {
    // If idempotency table doesn't exist yet, proceed without guard
    if (error.code === '42P01') { // undefined_table
      console.warn('[Idempotency] Table not found, proceeding without guard');
      return { isDuplicate: false, lockId: null };
    }
    throw error;
  }
}

/**
 * Complete idempotency lock with response
 */
async function completeIdempotency(lockId, status, response) {
  if (!lockId) return;
  
  try {
    await prisma.$queryRaw`
      SELECT complete_idempotency_key(
        ${lockId}::UUID,
        ${status}::VARCHAR,
        ${JSON.stringify(response)}::JSONB
      )
    `;
  } catch (error) {
    // Non-fatal: log and continue
    console.warn('[Idempotency] Failed to complete lock:', error.message);
  }
}

/**
 * Wrapper to execute operation with idempotency guard
 */
async function withIdempotency(operation, resourceId, actorId, tenantId, clientKey, asyncFn) {
  // Check for duplicate
  const check = await checkIdempotency(operation, resourceId, actorId, tenantId, clientKey);
  
  if (check.isDuplicate) {
    if (check.status === 'COMPLETED' && check.cachedResponse) {
      // Return cached response
      return {
        ...check.cachedResponse,
        _idempotent: true,
        _message: 'Duplicate request - returning cached response'
      };
    } else if (check.status === 'PROCESSING') {
      // Request in progress
      throw new Error('IDEMPOTENCY_CONFLICT: This operation is currently being processed. Please wait.');
    }
  }
  
  // Execute the actual operation
  let result;
  let status = 'COMPLETED';
  
  try {
    result = await asyncFn();
  } catch (error) {
    status = 'FAILED';
    await completeIdempotency(check.lockId, status, { error: error.message });
    throw error;
  }
  
  // Cache successful response
  await completeIdempotency(check.lockId, status, result);
  
  return result;
}

// ============================================================================
// CONCURRENCY CONTROLS (Row-level locking, Optimistic locking)
// ============================================================================

/**
 * Acquire lock on payment requests before consolidation
 * Prevents two accountants from consolidating the same request
 */
async function acquireConsolidationLock(requestIds, settlementId, userId) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM acquire_consolidation_lock(
        ${requestIds}::UUID[],
        ${settlementId}::UUID,
        ${userId}::UUID
      )
    `;
    
    if (result && result.length > 0) {
      const row = result[0];
      if (!row.success) {
        throw new Error(
          `CONSOLIDATION_LOCK_FAILED: Payment request ${row.failed_request_id} is already ` +
          (row.conflict_settlement_id 
            ? `in settlement ${row.conflict_settlement_id}` 
            : 'locked by another user')
        );
      }
    }
    return true;
  } catch (error) {
    if (error.code === '42P01') { // Table doesn't exist yet
      console.warn('[Concurrency] Lock table not found, proceeding without lock');
      return true;
    }
    throw error;
  }
}

/**
 * Release locks on payment requests
 */
async function releaseConsolidationLock(requestIds, userId) {
  try {
    for (const requestId of requestIds) {
      await prisma.$queryRaw`
        SELECT release_payment_request_lock(${requestId}::UUID, ${userId}::UUID)
      `;
    }
  } catch (error) {
    console.warn('[Concurrency] Failed to release locks:', error.message);
  }
}

/**
 * Check optimistic lock before update
 * Throws if version mismatch (concurrent modification detected)
 */
async function checkOptimisticLock(tableName, id, expectedVersion) {
  try {
    await prisma.$queryRaw`
      SELECT check_optimistic_lock(${tableName}::TEXT, ${id}::UUID, ${expectedVersion}::INTEGER)
    `;
    return true;
  } catch (error) {
    if (error.message.includes('OPTIMISTIC_LOCK_CONFLICT')) {
      throw new Error(
        'CONCURRENT_MODIFICATION: This record was modified by another user. ' +
        'Please refresh and try again.'
      );
    }
    if (error.code === '42P01') { // Function doesn't exist yet
      return true;
    }
    throw error;
  }
}

/**
 * Execute operation within a database transaction
 * Ensures atomic updates with automatic rollback on failure
 */
async function withTransaction(asyncFn) {
  return prisma.$transaction(async (tx) => {
    return asyncFn(tx);
  }, {
    maxWait: 10000,   // 10 seconds max wait for transaction
    timeout: 60000,   // 60 seconds max transaction duration
    isolationLevel: 'Serializable'  // Strongest isolation for financial operations
  });
}

// ============================================================================
// MAKER-CHECKER ENFORCEMENT
// ============================================================================

/**
 * Check maker-checker rules before approval
 * Ensures: creator cannot approve, same person cannot approve at multiple stages
 */
async function checkMakerChecker(settlementId, actorId, action) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM check_maker_checker(
        ${settlementId}::UUID,
        ${actorId}::UUID,
        ${action}::VARCHAR
      )
    `;
    
    if (result && result.length > 0 && !result[0].allowed) {
      throw new Error(result[0].violation_reason);
    }
    return true;
  } catch (error) {
    if (error.code === '42P01') { // Function doesn't exist yet
      return true;
    }
    throw error;
  }
}

/**
 * Record actor action for maker-checker tracking
 */
async function recordActorAction(settlementId, actorId, actorRole, action, tenantId) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM record_settlement_actor(
        ${settlementId}::UUID,
        ${actorId}::UUID,
        ${actorRole}::VARCHAR,
        ${action}::VARCHAR,
        ${tenantId}::UUID,
        FALSE
      )
    `;
    
    if (result && result.length > 0 && !result[0].success) {
      throw new Error(result[0].error_message);
    }
  } catch (error) {
    if (error.code === '42P01') { // Function doesn't exist yet
      console.warn('[MakerChecker] Actor history table not found');
    } else {
      throw error;
    }
  }
}

// ============================================================================
// APPROVAL TOKEN MANAGEMENT (Anti-replay protection)
// ============================================================================

/**
 * Generate one-time approval token
 * Returns token that must be presented for approval
 */
async function generateApprovalToken(settlementId, tokenType, userId, userRole, tenantId, validityMinutes = 60) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM generate_approval_token(
        ${settlementId}::UUID,
        ${tokenType}::VARCHAR,
        ${userId}::UUID,
        ${userRole}::VARCHAR,
        ${tenantId}::UUID,
        ${validityMinutes}::INTEGER,
        NULL
      )
    `;
    
    if (result && result.length > 0) {
      return {
        tokenId: result[0].token_id,
        tokenHash: result[0].token_hash,
        expiresAt: result[0].expires_at
      };
    }
    return null;
  } catch (error) {
    if (error.code === '42P01') { // Table doesn't exist yet
      return null;
    }
    throw error;
  }
}

/**
 * Validate and consume approval token
 */
async function validateApprovalToken(tokenHash, userId, userRole, clientIp = null) {
  if (!tokenHash) {
    return { valid: true, settlementId: null }; // Token not required if not implemented
  }
  
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM validate_approval_token(
        ${tokenHash}::VARCHAR,
        ${userId}::UUID,
        ${userRole}::VARCHAR,
        NULL,
        ${clientIp}::INET
      )
    `;
    
    if (result && result.length > 0) {
      if (!result[0].valid) {
        throw new Error(`INVALID_TOKEN: ${result[0].error_reason}`);
      }
      return {
        valid: true,
        settlementId: result[0].settlement_id,
        tokenType: result[0].token_type
      };
    }
    return { valid: true };
  } catch (error) {
    if (error.code === '42P01') { // Table doesn't exist yet
      return { valid: true };
    }
    throw error;
  }
}

// ============================================================================
// FRAUD SIGNAL DETECTION
// ============================================================================

/**
 * Log fraud signal for monitoring
 */
async function logFraudSignal(signalType, severity, tenantId, options = {}) {
  try {
    await prisma.$queryRaw`
      SELECT log_fraud_signal(
        ${signalType}::VARCHAR,
        ${severity}::VARCHAR,
        ${tenantId}::UUID,
        ${options.settlementId || null}::UUID,
        ${options.paymentRequestId || null}::UUID,
        ${options.userId || null}::UUID,
        ${options.data ? JSON.stringify(options.data) : null}::JSONB
      )
    `;
  } catch (error) {
    console.warn('[FraudSignal] Failed to log signal:', error.message);
  }
}

/**
 * Check for velocity anomalies (too many approvals in short time)
 */
async function checkVelocityAnomaly(userId, tenantId, action, windowMinutes = 5, threshold = 10) {
  try {
    const result = await prisma.$queryRaw`
      SELECT COUNT(*)::INTEGER AS count
      FROM settlement_approvals
      WHERE actor_id = ${userId}::UUID
        AND tenant_id = ${tenantId}::UUID
        AND action = ${action}
        AND created_at > NOW() - (${windowMinutes} || ' minutes')::INTERVAL
    `;
    
    const count = result[0]?.count || 0;
    if (count >= threshold) {
      await logFraudSignal('VELOCITY_SPIKE', 'HIGH', tenantId, {
        userId,
        data: { action, count, windowMinutes, threshold }
      });
      return true; // Anomaly detected
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// TIMEOUT & RETRY CONTROLS
// ============================================================================

const MAX_RETRY_COUNT = 3;
const EXECUTION_TIMEOUT_SECONDS = 300; // 5 minutes

/**
 * Check if retry is allowed
 */
async function canRetrySettlement(settlementId) {
  const settlement = await getSettlementById(settlementId);
  
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  if (settlement.status !== SettlementStatus.FAILED) {
    throw new Error('RETRY_NOT_ALLOWED: Can only retry FAILED settlements');
  }
  
  const retryCount = settlement.retry_count || 0;
  const maxRetries = settlement.max_retry_count || MAX_RETRY_COUNT;
  
  if (retryCount >= maxRetries) {
    throw new Error(`RETRY_LIMIT_EXCEEDED: Maximum ${maxRetries} retries reached`);
  }
  
  return {
    allowed: true,
    currentRetryCount: retryCount,
    maxRetries,
    remainingRetries: maxRetries - retryCount
  };
}

/**
 * Check if execution has timed out
 */
async function checkExecutionTimeout(settlementId) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM check_execution_timeout(${settlementId}::UUID)
    `;
    
    if (result && result.length > 0 && result[0].is_timed_out) {
      return {
        timedOut: true,
        startedAt: result[0].started_at,
        deadline: result[0].deadline,
        elapsedSeconds: result[0].elapsed_seconds
      };
    }
    return { timedOut: false };
  } catch {
    return { timedOut: false };
  }
}

/**
 * Start execution timer
 */
async function startExecutionTimer(settlementId, timeoutSeconds = EXECUTION_TIMEOUT_SECONDS) {
  await prisma.$executeRaw`
    UPDATE settlements SET
      execution_started_at = NOW(),
      execution_deadline = NOW() + (${timeoutSeconds} || ' seconds')::INTERVAL,
      updated_at = NOW()
    WHERE id = ${settlementId}::UUID
  `;
}

// ============================================================================
// BACKGROUND JOB HELPERS
// ============================================================================

/**
 * Enqueue a background job
 */
async function enqueueBackgroundJob(jobType, payload, tenantId, options = {}) {
  try {
    const result = await prisma.$queryRaw`
      SELECT enqueue_job(
        ${jobType}::VARCHAR,
        ${JSON.stringify(payload)}::JSONB,
        ${tenantId}::UUID,
        ${options.priority || 5}::INTEGER,
        ${options.scheduledFor ? options.scheduledFor : null}::TIMESTAMPTZ,
        ${options.idempotencyKey || null}::VARCHAR
      ) AS job_id
    `;
    return result[0]?.job_id;
  } catch (error) {
    console.warn('[BackgroundJob] Failed to enqueue:', error.message);
    return null;
  }
}

/**
 * Generate request hash for anti-tampering
 */
function hashRequestBody(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

// ============================================================================
// ROLE DETECTION
// ============================================================================

/**
 * Get user role for settlement workflow
 */
async function getUserSettlementRole(userId) {
  const result = await prisma.$queryRaw`
    SELECT 
      u.id,
      u.full_name,
      u.email,
      COALESCE(u.business_level, 10) as business_level,
      r.name as role_name,
      r.level as role_level
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_primary = true
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.id = ${userId}::uuid AND u.deleted_at IS NULL
  `;
  
  if (!result || result.length === 0) return null;
  
  const user = result[0];
  const roleName = (user.role_name || '').toLowerCase();
  const level = user.business_level || 10;
  
  // Determine settlement role
  let settlementRole = null;
  
  if (roleName.includes('accountant') || roleName.includes('accounts')) {
    settlementRole = Roles.ACCOUNTANT;
  } else if (roleName.includes('cfo') || roleName.includes('chief financial')) {
    settlementRole = Roles.CFO;
  } else if (roleName.includes('finance controller') || roleName.includes('finance manager')) {
    settlementRole = Roles.FINANCE_CONTROLLER;
  } else if (roleName.includes('banker') || roleName.includes('treasury')) {
    settlementRole = Roles.BANKER;
  } else if (level >= 90) {
    settlementRole = Roles.ADMIN;
  }
  
  return {
    ...user,
    settlementRole,
    isAccountant: settlementRole === Roles.ACCOUNTANT,
    canSeeFullDetails: settlementRole === Roles.ACCOUNTANT || settlementRole === Roles.ADMIN
  };
}

/**
 * Check if user is accountant
 */
async function isUserAccountant(userId) {
  const userRole = await getUserSettlementRole(userId);
  return userRole?.isAccountant || false;
}

// ============================================================================
// ACCOUNTANT: GET PENDING REQUESTS (FULL VIEW)
// ============================================================================

/**
 * Get payment requests pending settlement (ACCOUNTANT ONLY)
 * Shows full details: approved, paid, remaining amounts
 */
async function getAccountantPendingRequests(accountantId, tenantId, filters = {}) {
  // Verify user is accountant
  const userRole = await getUserSettlementRole(accountantId);
  if (!userRole?.isAccountant && !userRole?.settlementRole === Roles.ADMIN) {
    throw new Error('ACCESS_DENIED: Only Accountant can view pending requests');
  }
  
  const { vendorId, minAmount, maxAmount, search, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;
  
  // Use PaymentStatus constants for consistency
  const validStatuses = [PaymentStatus.APPROVED, PaymentStatus.PARTIALLY_APPROVED, PaymentStatus.PARTIALLY_SETTLED].join("','");
  
  let whereClause = `
    WHERE pr.tenant_id = '${tenantId}'::uuid
    AND pr.status IN ('${validStatuses}')
    AND COALESCE(pr.remaining_amount, COALESCE(pr.approved_amount, pr."totalAmount") - COALESCE(pr.paid_amount_total, 0)) > 0
  `;
  
  if (vendorId) {
    whereClause += ` AND pr."clientId" = '${vendorId}'::uuid`;
  }
  
  if (minAmount) {
    whereClause += ` AND COALESCE(pr.remaining_amount, 0) >= ${minAmount}`;
  }
  
  if (maxAmount) {
    whereClause += ` AND COALESCE(pr.remaining_amount, 0) <= ${maxAmount}`;
  }
  
  if (search) {
    whereClause += ` AND (
      pr."requestId" ILIKE '%${search}%'
      OR pr."clientName" ILIKE '%${search}%'
      OR pr.description ILIKE '%${search}%'
    )`;
  }
  
  const requests = await prisma.$queryRawUnsafe(`
    SELECT 
      pr.id,
      pr."requestId" AS request_number,
      pr.status,
      pr.workflow_status,
      
      -- Amounts (FULL VIEW for Accountant)
      pr."totalAmount" AS total_amount,
      COALESCE(pr.approved_amount, pr."totalAmount") AS approved_amount,
      COALESCE(pr.paid_amount_total, 0) AS paid_till_date,
      COALESCE(pr.remaining_amount, COALESCE(pr.approved_amount, pr."totalAmount") - COALESCE(pr.paid_amount_total, 0)) AS remaining_amount,
      
      -- Partial payment info
      pr.settlement_count,
      pr.last_paid_at,
      
      -- Vendor info
      pr."clientName" AS vendor_name,
      pr."clientId" AS vendor_id,
      
      -- Request details
      pr.description,
      pr.purpose,
      pr.currency,
      pr."dueDate" AS due_date,
      pr."createdAt" AS created_at,
      pr.approved_at,
      
      -- Requester info
      creator.full_name AS requester_name,
      
      -- Partial payment history count
      (SELECT COUNT(*) FROM payment_request_partial_payments WHERE payment_request_id = pr.id)::int AS partial_payment_count
      
    FROM payment_requests pr
    LEFT JOIN users creator ON pr."createdById"::text = creator.id::text OR pr.requested_by = creator.id
    ${whereClause}
    ORDER BY 
      pr."dueDate" ASC NULLS LAST,
      COALESCE(pr.remaining_amount, 0) DESC,
      pr."createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  
  // Get count
  const countResult = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int as total
    FROM payment_requests pr
    ${whereClause}
  `);
  
  // Get summary stats
  const statsResult = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*)::int AS request_count,
      COALESCE(SUM(COALESCE(pr.remaining_amount, 0)), 0)::decimal AS total_remaining,
      COUNT(DISTINCT pr."clientId")::int AS vendor_count
    FROM payment_requests pr
    ${whereClause}
  `);
  
  return {
    success: true,
    requests,
    total: countResult[0]?.total || 0,
    page,
    limit,
    stats: statsResult[0] || {}
  };
}

/**
 * Get partial payment history for a request (ACCOUNTANT ONLY)
 */
async function getRequestPartialHistory(requestId, accountantId) {
  const userRole = await getUserSettlementRole(accountantId);
  if (!userRole?.canSeeFullDetails) {
    throw new Error('ACCESS_DENIED: Only Accountant can view partial payment history');
  }
  
  const history = await prisma.$queryRaw`
    SELECT 
      pp.id,
      pp.amount_paid,
      pp.paid_amount_before,
      pp.paid_amount_after,
      pp.remaining_before,
      pp.remaining_after,
      pp.utr_number,
      pp.is_final_payment,
      pp.executed_at,
      
      s.settlement_number,
      s.purpose AS settlement_purpose,
      
      executor.full_name AS executed_by_name
      
    FROM payment_request_partial_payments pp
    JOIN settlements s ON pp.settlement_id = s.id
    LEFT JOIN users executor ON pp.executed_by = executor.id
    WHERE pp.payment_request_id = ${requestId}
    ORDER BY pp.executed_at DESC
  `;
  
  return {
    success: true,
    history
  };
}

// ============================================================================
// ACCOUNTANT: CREATE SETTLEMENT
// ============================================================================

/**
 * Create a settlement from selected payment requests (ACCOUNTANT ONLY)
 * Uses concurrency controls to prevent duplicate consolidation
 */
async function createSettlement(accountantId, tenantId, data) {
  // Verify user is accountant
  const userRole = await getUserSettlementRole(accountantId);
  if (!userRole?.isAccountant) {
    throw new Error('ACCESS_DENIED: Only Accountant can create settlements');
  }
  
  const {
    purpose,
    lineItems,           // Array of { paymentRequestId, amountToSettle }
    beneficiaryName,
    beneficiaryBank,
    beneficiaryAccount,
    beneficiaryIfsc,
    paymentMode,
    settlementDate,
    dueDate,
    remarks,
    attachments = []
  } = data;
  
  if (!lineItems || lineItems.length === 0) {
    throw new Error('At least one payment request must be selected');
  }
  
  // Extract request IDs for locking
  const requestIds = lineItems.map(item => item.paymentRequestId);
  
  // Use transaction for atomicity
  return withTransaction(async (_tx) => {
    // Acquire consolidation lock on all requests
    // This prevents concurrent accountants from selecting same requests
    await acquireConsolidationLock(requestIds, null, accountantId);
    
    try {
      // Validate all requests and amounts
      let totalAmount = 0;
      const validatedItems = [];
      const vendorIds = new Set();
      const vendorNames = new Set();
      
      for (const item of lineItems) {
        const { paymentRequestId, amountToSettle } = item;
        
        // Get request details with FOR UPDATE lock
        const pr = await prisma.$queryRaw`
          SELECT 
            id, "requestId", status, 
            COALESCE(approved_amount, "totalAmount") AS approved_amount,
            COALESCE(paid_amount_total, 0) AS paid_amount_total,
            COALESCE(remaining_amount, COALESCE(approved_amount, "totalAmount") - COALESCE(paid_amount_total, 0)) AS remaining_amount,
            "clientName", "clientId", description, tenant_id
          FROM payment_requests
          WHERE id = ${paymentRequestId}
          FOR UPDATE  -- Row-level lock
        `;
        
        if (!pr || pr.length === 0) {
          throw new Error(`Payment request ${paymentRequestId} not found`);
        }
        
        const request = pr[0];
        
        // Validate status - use PaymentStatus constants
        const validStatuses = [PaymentStatus.APPROVED, PaymentStatus.PARTIALLY_APPROVED, PaymentStatus.PARTIALLY_SETTLED];
        if (!validStatuses.includes(request.status)) {
          throw new Error(`Request ${request.requestId} is not in approved status`);
        }
        
        // Validate amount
        const remaining = parseFloat(request.remaining_amount);
        const settleAmount = parseFloat(amountToSettle);
        
        if (settleAmount <= 0) {
          throw new Error(`Invalid amount for request ${request.requestId}`);
        }
        
        if (settleAmount > remaining) {
          throw new Error(`Amount ${settleAmount} exceeds remaining balance ${remaining} for request ${request.requestId}`);
        }
        
        totalAmount += settleAmount;
        vendorIds.add(request.clientId);
        vendorNames.add(request.clientName);
        
        validatedItems.push({
          paymentRequestId,
          requestNumber: request.requestId,
          approvedAmount: parseFloat(request.approved_amount),
          amountInSettlement: settleAmount,
          paidBefore: parseFloat(request.paid_amount_total),
          vendorName: request.clientName,
          vendorId: request.clientId,
          description: request.description
        });
      }
      
      // Generate settlement number
      const settlementNumber = await generateSettlementNumber(tenantId);
      
      // Determine beneficiary display
      const finalBeneficiaryName = beneficiaryName || 
        (vendorNames.size === 1 ? [...vendorNames][0] : `Multiple (${vendorNames.size} vendors)`);
      
      // Mask account number
      const accountMasked = beneficiaryAccount 
        ? `XXXX${beneficiaryAccount.slice(-4)}` 
        : null;
      
      // Create settlement
      const settlementResult = await prisma.$queryRaw`
        INSERT INTO settlements (
          settlement_number, purpose, 
          beneficiary_name, beneficiary_bank, beneficiary_account_masked, 
          beneficiary_account_full, beneficiary_ifsc,
          total_amount, currency, request_count, vendor_count,
          status, current_stage,
          payment_mode, settlement_date, due_date,
          accountant_remarks, attachments,
          created_by, tenant_id,
          created_at, updated_at
        )
        VALUES (
          ${settlementNumber}, ${purpose},
          ${finalBeneficiaryName}, ${beneficiaryBank || null}, ${accountMasked},
          ${beneficiaryAccount || null}, ${beneficiaryIfsc || null},
          ${totalAmount}, 'INR', ${validatedItems.length}, ${vendorIds.size},
          'DRAFT', 'ACCOUNTANT_DRAFT',
          ${paymentMode || null}, ${settlementDate || null}::date, ${dueDate || null}::date,
          ${remarks || null}, ${JSON.stringify(attachments)}::jsonb,
          ${accountantId}::uuid, ${tenantId}::uuid,
          NOW(), NOW()
        )
        RETURNING *
      `;
      
      const settlement = settlementResult[0];
      
      // Record actor (creator) for maker-checker
      await recordActorAction(settlement.id, accountantId, 'ACCOUNTANT', 'CREATED', tenantId);
      
      // Create line items
      for (const item of validatedItems) {
        await prisma.$executeRaw`
          INSERT INTO settlement_line_items (
            settlement_id, payment_request_id,
            approved_amount, amount_in_settlement,
            paid_before_this, remaining_after_this,
            request_number, vendor_name, vendor_id, description,
            created_at, updated_at
          )
          VALUES (
            ${settlement.id}::uuid, ${item.paymentRequestId},
            ${item.approvedAmount}, ${item.amountInSettlement},
            ${item.paidBefore}, ${item.approvedAmount - item.paidBefore - item.amountInSettlement},
            ${item.requestNumber}, ${item.vendorName}, ${item.vendorId}::uuid, ${item.description},
            NOW(), NOW()
          )
        `;
        
        // Update payment request status to QUEUED
        await prisma.$executeRaw`
          UPDATE payment_requests
          SET 
            status = 'QUEUED_FOR_SETTLEMENT',
            workflow_status = 'QUEUED_FOR_SETTLEMENT',
            owned_by_accounts = true,
            accounts_owner_id = ${accountantId}::uuid,
            accounts_takeover_at = COALESCE(accounts_takeover_at, NOW()),
            updated_at = NOW()
          WHERE id = ${item.paymentRequestId}
        `;
      }
      
      // Create audit log
      await createSettlementAuditLog(settlement.id, tenantId, {
        action: 'CREATED',
        toStatus: 'DRAFT',
        stage: 'ACCOUNTANT_DRAFT',
        actorId: accountantId,
        comment: `Settlement created with ${validatedItems.length} requests totaling ${totalAmount}`
      });
      
      return {
        success: true,
        settlement,
        settlementNumber,
        totalAmount,
        requestCount: validatedItems.length,
        vendorCount: vendorIds.size
      };
    } catch (error) {
      // Release locks on failure
      await releaseConsolidationLock(requestIds, accountantId);
      throw error;
    }
  });
}

// ============================================================================
// SETTLEMENT SUBMISSION & APPROVAL FLOW
// ============================================================================

/**
 * Submit settlement to Finance Controller (ACCOUNTANT ONLY)
 */
async function submitSettlement(settlementId, accountantId, tenantId) {
  const userRole = await getUserSettlementRole(accountantId);
  if (!userRole?.isAccountant) {
    throw new Error('ACCESS_DENIED: Only Accountant can submit settlements');
  }
  
  // Get settlement
  const settlement = await getSettlementById(settlementId);
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  if (settlement.status !== SettlementStatus.DRAFT) {
    throw new Error(`Cannot submit settlement in status: ${settlement.status}`);
  }
  
  // Get Finance Controller
  const financeController = await getUserByRole(tenantId, 'FINANCE_CONTROLLER');
  if (!financeController) {
    throw new Error('No Finance Controller configured for this tenant');
  }
  
  // Update settlement
  await prisma.$executeRaw`
    UPDATE settlements SET
      status = 'SUBMITTED_TO_FINANCE',
      current_stage = 'FINANCE_CONTROLLER_REVIEW',
      current_approver_id = ${financeController.id}::uuid,
      submitted_by = ${accountantId}::uuid,
      submitted_at = NOW(),
      updated_at = NOW()
    WHERE id = ${settlementId}::uuid
  `;
  
  // Audit log
  await createSettlementAuditLog(settlementId, tenantId, {
    action: 'SUBMITTED',
    fromStatus: 'DRAFT',
    toStatus: 'SUBMITTED_TO_FINANCE',
    stage: 'FINANCE_CONTROLLER_REVIEW',
    actorId: accountantId,
    comment: 'Settlement submitted for Finance Controller approval'
  });
  
  return {
    success: true,
    message: 'Settlement submitted to Finance Controller',
    currentApprover: financeController.full_name
  };
}

/**
 * Finance Controller approves settlement
 * Enforces maker-checker: creator cannot approve
 */
async function financeControllerApprove(settlementId, userId, tenantId, comment) {
  const userRole = await getUserSettlementRole(userId);
  if (userRole?.settlementRole !== Roles.FINANCE_CONTROLLER && userRole?.settlementRole !== Roles.ADMIN) {
    throw new Error('ACCESS_DENIED: Only Finance Controller can approve at this stage');
  }
  
  const settlement = await getSettlementById(settlementId);
  if (!settlement || settlement.status !== SettlementStatus.SUBMITTED_TO_FINANCE) {
    throw new Error('Settlement not available for Finance Controller approval');
  }
  
  // MAKER-CHECKER: Creator cannot approve
  await checkMakerChecker(settlementId, userId, 'FC_APPROVED');
  
  // Check for velocity anomaly
  await checkVelocityAnomaly(userId, tenantId, 'FC_APPROVED');
  
  // Get CFO
  const cfo = await getUserByRole(tenantId, 'CFO');
  if (!cfo) {
    throw new Error('No CFO configured for this tenant');
  }
  
  // Check optimistic lock (if version provided)
  if (settlement.version) {
    await checkOptimisticLock('settlements', settlementId, settlement.version);
  }
  
  await prisma.$executeRaw`
    UPDATE settlements SET
      status = 'FINANCE_CONTROLLER_APPROVED',
      current_stage = 'CFO_REVIEW',
      current_approver_id = ${cfo.id}::uuid,
      finance_approved_by = ${userId}::uuid,
      finance_approved_at = NOW(),
      finance_remarks = ${comment || null},
      updated_at = NOW()
    WHERE id = ${settlementId}::uuid
  `;
  
  // Record actor for audit trail
  await recordActorAction(settlementId, userId, 'FINANCE_CONTROLLER', 'FC_APPROVED', tenantId);
  
  // Generate approval token for CFO (anti-replay)
  const token = await generateApprovalToken(settlementId, 'CFO_APPROVAL', cfo.id, 'CFO', tenantId, 120);
  
  await createSettlementAuditLog(settlementId, tenantId, {
    action: 'FINANCE_APPROVED',
    fromStatus: 'SUBMITTED_TO_FINANCE',
    toStatus: 'FINANCE_CONTROLLER_APPROVED',
    stage: 'CFO_REVIEW',
    actorId: userId,
    comment
  });
  
  // Enqueue notification as background job
  await enqueueBackgroundJob('NOTIFICATION', {
    type: 'SETTLEMENT_PENDING_APPROVAL',
    settlementId,
    toUserId: cfo.id,
    message: `Settlement ${settlement.settlement_number} awaits your approval`
  }, tenantId, { priority: 3 });
  
  return {
    success: true,
    message: 'Settlement approved by Finance Controller, forwarded to CFO',
    currentApprover: cfo.full_name,
    approvalToken: token?.tokenHash  // For secure approval flow
  };
}

/**
 * CFO approves settlement
 * Enforces maker-checker: creator & FC approver cannot be CFO approver
 */
async function cfoApprove(settlementId, userId, tenantId, comment, approvalToken = null) {
  const userRole = await getUserSettlementRole(userId);
  if (userRole?.settlementRole !== Roles.CFO && userRole?.settlementRole !== Roles.ADMIN) {
    throw new Error('ACCESS_DENIED: Only CFO can approve at this stage');
  }
  
  const settlement = await getSettlementById(settlementId);
  if (!settlement || settlement.status !== SettlementStatus.FINANCE_CONTROLLER_APPROVED) {
    throw new Error('Settlement not available for CFO approval');
  }
  
  // Validate approval token if provided (anti-replay)
  if (approvalToken) {
    await validateApprovalToken(approvalToken, userId, 'CFO');
  }
  
  // MAKER-CHECKER: Creator & FC approver cannot be CFO
  await checkMakerChecker(settlementId, userId, 'CFO_APPROVED');
  
  // Check for velocity anomaly
  await checkVelocityAnomaly(userId, tenantId, 'CFO_APPROVED');
  
  // Get Banker
  const banker = await getUserByRole(tenantId, 'BANKER');
  if (!banker) {
    throw new Error('No Banker configured for this tenant');
  }
  
  // Check optimistic lock
  if (settlement.version) {
    await checkOptimisticLock('settlements', settlementId, settlement.version);
  }
  
  await prisma.$executeRaw`
    UPDATE settlements SET
      status = 'CFO_APPROVED',
      current_stage = 'BANKER_EXECUTION',
      current_approver_id = ${banker.id}::uuid,
      cfo_approved_by = ${userId}::uuid,
      cfo_approved_at = NOW(),
      cfo_remarks = ${comment || null},
      updated_at = NOW()
    WHERE id = ${settlementId}::uuid
  `;
  
  // Record actor
  await recordActorAction(settlementId, userId, 'CFO', 'CFO_APPROVED', tenantId);
  
  // Generate execution token for banker (anti-replay)
  const token = await generateApprovalToken(settlementId, 'EXECUTE', banker.id, 'BANKER', tenantId, 240);
  
  await createSettlementAuditLog(settlementId, tenantId, {
    action: 'CFO_APPROVED',
    fromStatus: 'FINANCE_CONTROLLER_APPROVED',
    toStatus: 'CFO_APPROVED',
    stage: 'BANKER_EXECUTION',
    actorId: userId,
    comment
  });
  
  // Enqueue notification as background job
  await enqueueBackgroundJob('NOTIFICATION', {
    type: 'SETTLEMENT_READY_FOR_EXECUTION',
    settlementId,
    toUserId: banker.id,
    message: `Settlement ${settlement.settlement_number} approved and ready for execution`
  }, tenantId, { priority: 2 });
  
  return {
    success: true,
    message: 'Settlement approved by CFO, sent to Banker for execution',
    currentApprover: banker.full_name,
    executionToken: token?.tokenHash
  };
}

/**
 * Send settlement to bank (can be triggered by CFO or Banker)
 */
async function sendToBank(settlementId, userId, tenantId, bankDetails = {}) {
  const settlement = await getSettlementById(settlementId);
  if (!settlement || settlement.status !== SettlementStatus.CFO_APPROVED) {
    throw new Error('Settlement not ready to be sent to bank');
  }
  
  await prisma.$executeRaw`
    UPDATE settlements SET
      status = 'SENT_TO_BANK',
      sent_to_bank_by = ${userId}::uuid,
      sent_to_bank_at = NOW(),
      bank_account_id = ${bankDetails.bankAccountId || null}::uuid,
      updated_at = NOW()
    WHERE id = ${settlementId}::uuid
  `;
  
  await createSettlementAuditLog(settlementId, tenantId, {
    action: 'SENT_TO_BANK',
    fromStatus: 'CFO_APPROVED',
    toStatus: 'SENT_TO_BANK',
    stage: 'BANKER_EXECUTION',
    actorId: userId,
    comment: 'Settlement sent to bank for execution'
  });
  
  return {
    success: true,
    message: 'Settlement sent to bank'
  };
}

// ============================================================================
// BANKER: EXECUTE PAYMENT & UTR PROPAGATION
// ============================================================================

/**
 * Execute settlement and enter UTR (BANKER ONLY)
 * This triggers UTR propagation to all linked payment requests
 * 
 * IDEMPOTENCY GUARDED: Prevents double-click/network retry duplicates
 * TIMEOUT TRACKED: Execution has deadline
 */
async function executeSettlement(settlementId, bankerId, tenantId, executionData) {
  const { utrNumber, bankTransactionId, bankReference, remarks, idempotencyKey, executionToken } = executionData;
  
  // Use idempotency guard for this critical operation
  return withIdempotency(
    IdempotencyOperations.SETTLEMENT_EXECUTE,
    settlementId,
    bankerId,
    tenantId,
    idempotencyKey || `exec_${settlementId}_${utrNumber}`,
    async () => {
      const userRole = await getUserSettlementRole(bankerId);
      if (userRole?.settlementRole !== Roles.BANKER && userRole?.settlementRole !== Roles.ADMIN) {
        throw new Error('ACCESS_DENIED: Only Banker can execute settlements');
      }
      
      // Validate execution token if provided (anti-replay)
      if (executionToken) {
        await validateApprovalToken(executionToken, bankerId, 'BANKER');
      }
      
      if (!utrNumber) {
        throw new Error('UTR number is required for settlement execution');
      }
      
      const settlement = await getSettlementById(settlementId);
      if (!settlement || settlement.status !== SettlementStatus.SENT_TO_BANK) {
        throw new Error('Settlement not ready for execution');
      }
      
      // Check if execution timed out
      const timeout = await checkExecutionTimeout(settlementId);
      if (timeout.timedOut) {
        throw new Error(`EXECUTION_TIMEOUT: Settlement execution exceeded deadline. Elapsed: ${timeout.elapsedSeconds}s`);
      }
      
      // Start execution timer if not already started
      if (!settlement.execution_started_at) {
        await startExecutionTimer(settlementId);
      }
      
      // Record actor for audit
      await recordActorAction(settlementId, bankerId, 'BANKER', 'EXECUTED', tenantId);
      
      // Update settlement to PAID
      // The database trigger will automatically:
      // 1. Update all linked payment requests
      // 2. Create partial payment history records
      // 3. Propagate UTR to all requests
      await prisma.$executeRaw`
        UPDATE settlements SET
          status = 'PAID',
          current_stage = 'COMPLETED',
          current_approver_id = NULL,
          utr_number = ${utrNumber},
          bank_transaction_id = ${bankTransactionId || null},
          bank_reference = ${bankReference || null},
          banker_remarks = ${remarks || null},
          executed_by = ${bankerId}::uuid,
          executed_at = NOW(),
          paid_at = NOW(),
          last_execute_idempotency_key = ${idempotencyKey || null},
          execution_attempt_count = COALESCE(execution_attempt_count, 0) + 1,
          updated_at = NOW()
        WHERE id = ${settlementId}::uuid
      `;
      
      // Update linked requests to mark them as processed
      // (The trigger handles the actual amount updates)
      await prisma.$executeRaw`
        UPDATE payment_requests pr
        SET 
          status = CASE 
            WHEN (COALESCE(pr.paid_amount_total, 0) + sli.amount_in_settlement) >= COALESCE(pr.approved_amount, pr."totalAmount")
            THEN 'PAID'
            ELSE 'PARTIALLY_SETTLED'
          END,
          workflow_status = CASE 
            WHEN (COALESCE(pr.paid_amount_total, 0) + sli.amount_in_settlement) >= COALESCE(pr.approved_amount, pr."totalAmount")
            THEN 'PAID'
            ELSE 'PARTIALLY_SETTLED'
          END
        FROM settlement_line_items sli
        WHERE sli.settlement_id = ${settlementId}::uuid
          AND sli.payment_request_id = pr.id
      `;
      
      await createSettlementAuditLog(settlementId, tenantId, {
        action: 'EXECUTED',
        fromStatus: 'SENT_TO_BANK',
        toStatus: 'PAID',
        stage: 'COMPLETED',
        actorId: bankerId,
        utrNumber,
        comment: remarks || `Payment executed with UTR: ${utrNumber}`
      });
      
      // Enqueue reconciliation job
      await enqueueBackgroundJob('RECONCILIATION', {
        settlementId,
        utrNumber,
        totalAmount: settlement.total_amount
      }, tenantId, { priority: 5 });
      
      return {
        success: true,
        message: 'Settlement executed successfully',
        utrNumber,
        status: 'PAID'
      };
    }
  );
}

// ============================================================================
// REJECTION
// ============================================================================

/**
 * Reject settlement at any stage
 */
async function rejectSettlement(settlementId, userId, tenantId, reason) {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Rejection reason is required');
  }
  
  const settlement = await getSettlementById(settlementId);
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  if ([SettlementStatus.PAID, SettlementStatus.REJECTED, SettlementStatus.CANCELLED].includes(settlement.status)) {
    throw new Error(`Cannot reject settlement in status: ${settlement.status}`);
  }
  
  const previousStatus = settlement.status;
  
  await prisma.$executeRaw`
    UPDATE settlements SET
      status = 'REJECTED',
      current_stage = NULL,
      current_approver_id = NULL,
      rejected_by = ${userId}::uuid,
      rejected_at = NOW(),
      rejection_reason = ${reason},
      rejection_stage = ${settlement.current_stage},
      updated_at = NOW()
    WHERE id = ${settlementId}::uuid
  `;
  
  // Release linked payment requests back to pending
  await prisma.$executeRaw`
    UPDATE payment_requests pr
    SET 
      status = CASE 
        WHEN COALESCE(pr.paid_amount_total, 0) > 0 THEN 'PARTIALLY_SETTLED'
        ELSE 'APPROVED'
      END,
      workflow_status = CASE 
        WHEN COALESCE(pr.paid_amount_total, 0) > 0 THEN 'PARTIALLY_SETTLED'
        ELSE 'APPROVED'
      END,
      updated_at = NOW()
    FROM settlement_line_items sli
    WHERE sli.settlement_id = ${settlementId}::uuid
      AND sli.payment_request_id = pr.id
  `;
  
  await createSettlementAuditLog(settlementId, tenantId, {
    action: 'REJECTED',
    fromStatus: previousStatus,
    toStatus: 'REJECTED',
    stage: settlement.current_stage,
    actorId: userId,
    comment: reason
  });
  
  return {
    success: true,
    message: 'Settlement rejected',
    reason
  };
}

// ============================================================================
// ROLE-BASED VIEWS
// ============================================================================

/**
 * Get settlement tasks for current user (ROLE-BASED VIEW)
 */
async function getSettlementTasksForUser(userId, tenantId, filters = {}) {
  const userRole = await getUserSettlementRole(userId);
  
  if (userRole?.isAccountant) {
    // Accountant sees DRAFT settlements they created
    return getAccountantSettlements(userId, tenantId, filters);
  } else {
    // Others see SIMPLIFIED view of settlements awaiting their action
    return getSimplifiedSettlementTasks(userId, tenantId, filters, userRole);
  }
}

/**
 * Get settlements for Accountant (full details)
 */
async function getAccountantSettlements(accountantId, tenantId, filters = {}) {
  const { status, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;
  
  let whereClause = `WHERE s.tenant_id = '${tenantId}'::uuid AND s.created_by = '${accountantId}'::uuid`;
  
  if (status) {
    whereClause += ` AND s.status = '${status}'`;
  }
  
  const settlements = await prisma.$queryRawUnsafe(`
    SELECT 
      s.*,
      
      -- Full line item details (ACCOUNTANT ONLY)
      (
        SELECT json_agg(json_build_object(
          'id', sli.id,
          'paymentRequestId', sli.payment_request_id,
          'requestNumber', sli.request_number,
          'vendorName', sli.vendor_name,
          'approvedAmount', sli.approved_amount,
          'amountInSettlement', sli.amount_in_settlement,
          'paidBefore', sli.paid_before_this,
          'remainingAfter', sli.remaining_after_this,
          'isFullySettled', sli.is_fully_settled
        ))
        FROM settlement_line_items sli
        WHERE sli.settlement_id = s.id
      ) AS line_items,
      
      creator.full_name AS created_by_name,
      approver.full_name AS current_approver_name
      
    FROM settlements s
    LEFT JOIN users creator ON s.created_by = creator.id
    LEFT JOIN users approver ON s.current_approver_id = approver.id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  
  return {
    success: true,
    settlements,
    viewType: 'ACCOUNTANT_FULL'
  };
}

/**
 * Get SIMPLIFIED settlement tasks for non-accountants
 * NO individual request details, NO partial breakdowns
 */
async function getSimplifiedSettlementTasks(userId, tenantId, filters = {}, userRole) {
  const { status, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;
  
  // Determine which settlements this user can see
  let whereClause = `WHERE s.tenant_id = '${tenantId}'::uuid AND s.status NOT IN ('DRAFT', 'CANCELLED')`;
  
  // Filter by current approver
  whereClause += ` AND (s.current_approver_id = '${userId}'::uuid`;
  
  // Or by role-based stage access
  if (userRole?.settlementRole === Roles.FINANCE_CONTROLLER) {
    whereClause += ` OR s.current_stage = 'FINANCE_CONTROLLER_REVIEW'`;
  } else if (userRole?.settlementRole === Roles.CFO) {
    whereClause += ` OR s.current_stage = 'CFO_REVIEW'`;
  } else if (userRole?.settlementRole === Roles.BANKER) {
    whereClause += ` OR s.current_stage = 'BANKER_EXECUTION'`;
  } else if (userRole?.settlementRole === Roles.ADMIN) {
    whereClause = `WHERE s.tenant_id = '${tenantId}'::uuid AND s.status NOT IN ('DRAFT', 'CANCELLED')`;
  }
  
  whereClause += ')';
  
  if (status) {
    whereClause += ` AND s.status = '${status}'`;
  }
  
  // SIMPLIFIED VIEW - No line item details
  const settlements = await prisma.$queryRawUnsafe(`
    SELECT 
      s.id,
      s.settlement_number,
      s.purpose,
      s.beneficiary_name,
      s.beneficiary_bank,
      s.beneficiary_account_masked,  -- Masked only!
      s.total_amount,
      s.currency,
      s.status,
      s.current_stage,
      s.accountant_remarks,
      s.settlement_date,
      s.due_date,
      s.attachments,
      s.created_at,
      
      -- NO request_count, NO vendor_count, NO line items
      
      creator.full_name AS created_by_name,
      
      -- Action availability
      CASE WHEN s.current_approver_id = '${userId}'::uuid THEN true ELSE false END AS can_act
      
    FROM settlements s
    LEFT JOIN users creator ON s.created_by = creator.id
    ${whereClause}
    ORDER BY 
      CASE WHEN s.current_approver_id = '${userId}'::uuid THEN 0 ELSE 1 END,
      s.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  
  return {
    success: true,
    settlements,
    viewType: 'SIMPLIFIED',
    note: 'Individual payment request details are not visible in this view'
  };
}

/**
 * Get single settlement (ROLE-BASED VIEW)
 */
async function getSettlementDetails(settlementId, userId, _tenantId) {
  const userRole = await getUserSettlementRole(userId);
  const settlement = await getSettlementById(settlementId);
  
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  if (userRole?.canSeeFullDetails) {
    // Accountant/Admin: Full view with line items
    const lineItems = await prisma.$queryRaw`
      SELECT 
        sli.*,
        pr.status AS request_status,
        pr.paid_amount_total,
        pr.remaining_amount
      FROM settlement_line_items sli
      LEFT JOIN payment_requests pr ON sli.payment_request_id = pr.id
      WHERE sli.settlement_id = ${settlementId}::uuid
    `;
    
    return {
      success: true,
      settlement,
      lineItems,
      viewType: 'FULL'
    };
  } else {
    // Others: Simplified view
    return {
      success: true,
      settlement: {
        id: settlement.id,
        settlement_number: settlement.settlement_number,
        purpose: settlement.purpose,
        beneficiary_name: settlement.beneficiary_name,
        beneficiary_bank: settlement.beneficiary_bank,
        beneficiary_account_masked: settlement.beneficiary_account_masked,
        total_amount: settlement.total_amount,
        currency: settlement.currency,
        status: settlement.status,
        current_stage: settlement.current_stage,
        accountant_remarks: settlement.accountant_remarks,
        attachments: settlement.attachments,
        created_at: settlement.created_at
        // NO: request_count, vendor_count, line items, full account
      },
      viewType: 'SIMPLIFIED'
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function getSettlementById(settlementId) {
  const result = await prisma.$queryRaw`
    SELECT * FROM settlements WHERE id = ${settlementId}::uuid
  `;
  return result.length > 0 ? result[0] : null;
}

async function getUserByRole(tenantId, roleName) {
  const rolePatterns = {
    'FINANCE_CONTROLLER': ['Finance Controller', 'Finance Manager'],
    'CFO': ['CFO', 'Chief Financial Officer'],
    'BANKER': ['Banker', 'Treasury', 'Treasurer'],
    'ACCOUNTANT': ['Accountant', 'Accounts']
  };
  
  const patterns = rolePatterns[roleName] || [roleName];
  
  const users = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT u.id, u.full_name, u.email, u.business_level
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.tenant_id = '${tenantId}'::uuid
      AND u.deleted_at IS NULL
      AND u.status = 'active'
      AND (${patterns.map(p => `r.name ILIKE '%${p}%'`).join(' OR ')})
    ORDER BY u.business_level DESC
    LIMIT 1
  `);
  
  return users.length > 0 ? users[0] : null;
}

async function generateSettlementNumber(tenantId) {
  const year = new Date().getFullYear();
  
  const result = await prisma.$queryRawUnsafe(
    `SELECT generate_settlement_number('${tenantId}'::uuid) as num`
  );
  
  return result[0]?.num || `STL-${year}-00001`;
}

async function createSettlementAuditLog(settlementId, tenantId, data) {
  const actorInfo = data.actorId ? await getUserSettlementRole(data.actorId) : null;
  
  await prisma.$executeRaw`
    INSERT INTO settlement_approvals (
      settlement_id, action, from_status, to_status, stage,
      actor_id, actor_name, actor_role, actor_level,
      comment, utr_number, 
      amount_before, amount_after, items_allowed, items_disallowed,
      tenant_id
    )
    VALUES (
      ${settlementId}::uuid,
      ${data.action},
      ${data.fromStatus || null},
      ${data.toStatus || null},
      ${data.stage || null},
      ${data.actorId}::uuid,
      ${actorInfo?.full_name || null},
      ${actorInfo?.role_name || null},
      ${actorInfo?.business_level || null},
      ${data.comment || null},
      ${data.utrNumber || null},
      ${data.amountBefore || null},
      ${data.amountAfter || null},
      ${data.itemsAllowed || null}::int,
      ${data.itemsDisallowed || null}::int,
      ${tenantId}::uuid
    )
  `;
}

// ============================================================================
// PARTIAL DISALLOW MECHANISM (CRITICAL - Per MASTER PROMPT)
// ============================================================================
// Finance Controller & CFO can untick items to disallow during review.
// Disallowed items are returned to Accountant queue.
// Controller/CFO CANNOT modify amounts - only allow or disallow items.
// ============================================================================

/**
 * Get settlement items for review mode (FC/CFO)
 * Returns selectable items with NO amount editing capability
 */
async function getSettlementReviewItems(settlementId, userId, _tenantId) {
  const userRole = await getUserSettlementRole(userId);
  
  // Only Finance Controller or CFO can access review mode
  if (![Roles.FINANCE_CONTROLLER, Roles.CFO, Roles.ADMIN].includes(userRole?.settlementRole)) {
    throw new Error('ACCESS_DENIED: Only Finance Controller or CFO can access review mode');
  }
  
  const settlement = await getSettlementById(settlementId);
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  // Verify settlement is in reviewable state
  const reviewableStatuses = [
    SettlementStatus.SUBMITTED_TO_FINANCE,
    SettlementStatus.FINANCE_CONTROLLER_APPROVED
  ];
  
  if (!reviewableStatuses.includes(settlement.status)) {
    throw new Error(`Settlement not in review state. Current status: ${settlement.status}`);
  }
  
  // Get items with selection state
  const items = await prisma.$queryRaw`
    SELECT 
      sli.id AS line_item_id,
      sli.payment_request_id,
      sli.request_number,
      sli.vendor_name,
      sli.description,
      sli.amount_in_settlement,
      sli.is_disallowed,
      sli.disallowed_by,
      sli.disallow_reason,
      
      -- For checkbox display (default: true if not disallowed)
      NOT COALESCE(sli.is_disallowed, false) AS is_allowed,
      
      -- Disallow info (if any)
      disallower.full_name AS disallowed_by_name
      
    FROM settlement_line_items sli
    LEFT JOIN users disallower ON sli.disallowed_by = disallower.id
    WHERE sli.settlement_id = ${settlementId}::uuid
    ORDER BY sli.vendor_name, sli.request_number
  `;
  
  // Calculate allowed/disallowed totals
  const allowedItems = items.filter(i => i.is_allowed);
  const disallowedItems = items.filter(i => !i.is_allowed);
  
  return {
    success: true,
    settlement: {
      id: settlement.id,
      settlementNumber: settlement.settlement_number,
      purpose: settlement.purpose,
      status: settlement.status,
      currentStage: settlement.current_stage,
      originalTotal: settlement.original_total_amount || settlement.total_amount,
      currentTotal: settlement.total_amount,
      disallowedAmount: settlement.disallowed_amount || 0
    },
    items,
    summary: {
      totalItems: items.length,
      allowedItems: allowedItems.length,
      disallowedItems: disallowedItems.length,
      allowedAmount: allowedItems.reduce((sum, i) => sum + parseFloat(i.amount_in_settlement), 0),
      disallowedAmount: disallowedItems.reduce((sum, i) => sum + parseFloat(i.amount_in_settlement), 0)
    },
    userRole: userRole?.settlementRole,
    canDisallow: true,
    canEditAmounts: false  // CRITICAL: FC/CFO cannot edit amounts
  };
}

/**
 * Partially disallow items in a settlement (FC/CFO ONLY)
 * 
 * @param {string} settlementId - Settlement ID
 * @param {string[]} disallowedItemIds - Array of line item IDs to disallow
 * @param {string} userId - Actor ID
 * @param {string} tenantId - Tenant ID
 * @param {string} reason - Reason for disallow (optional but recommended)
 */
async function partialDisallowItems(settlementId, disallowedItemIds, userId, tenantId, reason = '') {
  const userRole = await getUserSettlementRole(userId);
  
  // Only Finance Controller or CFO can disallow
  if (![Roles.FINANCE_CONTROLLER, Roles.CFO, Roles.ADMIN].includes(userRole?.settlementRole)) {
    throw new Error('ACCESS_DENIED: Only Finance Controller or CFO can disallow items');
  }
  
  const settlement = await getSettlementById(settlementId);
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  // Verify settlement is in correct state for this role
  if (userRole?.settlementRole === Roles.FINANCE_CONTROLLER) {
    if (settlement.status !== SettlementStatus.SUBMITTED_TO_FINANCE) {
      throw new Error('Finance Controller can only disallow items in SUBMITTED_TO_FINANCE status');
    }
  } else if (userRole?.settlementRole === Roles.CFO) {
    if (settlement.status !== SettlementStatus.FINANCE_CONTROLLER_APPROVED) {
      throw new Error('CFO can only disallow items in FINANCE_CONTROLLER_APPROVED status');
    }
  }
  
  if (!disallowedItemIds || disallowedItemIds.length === 0) {
    throw new Error('No items specified for disallow');
  }
  
  const previousTotal = parseFloat(settlement.total_amount);
  const previousStatus = settlement.status;
  let totalDisallowedAmount = 0;
  const disallowedDetails = [];
  
  // Process each disallowed item
  for (const itemId of disallowedItemIds) {
    // Get item details before disallow
    const itemResult = await prisma.$queryRaw`
      SELECT 
        sli.*,
        pr.status AS request_status
      FROM settlement_line_items sli
      LEFT JOIN payment_requests pr ON sli.payment_request_id = pr.id
      WHERE sli.id = ${itemId}::uuid 
        AND sli.settlement_id = ${settlementId}::uuid
        AND COALESCE(sli.is_disallowed, false) = false
    `;
    
    if (!itemResult || itemResult.length === 0) {
      continue; // Skip if already disallowed or not found
    }
    
    const item = itemResult[0];
    const itemAmount = parseFloat(item.amount_in_settlement);
    totalDisallowedAmount += itemAmount;
    
    // Determine revert status for the payment request
    const revertStatus = item.paid_before_this > 0 ? 'PARTIALLY_SETTLED' : 'APPROVED';
    
    // Mark item as disallowed
    await prisma.$executeRaw`
      UPDATE settlement_line_items SET
        is_disallowed = true,
        disallowed_by = ${userId}::uuid,
        disallowed_at = NOW(),
        disallowed_role = ${userRole.settlementRole},
        disallow_reason = ${reason || null},
        disallow_stage = ${settlement.current_stage},
        returned_to_queue_at = NOW(),
        updated_at = NOW()
      WHERE id = ${itemId}::uuid
    `;
    
    // Create disallow history record
    await prisma.$executeRaw`
      INSERT INTO settlement_disallow_history (
        settlement_id, line_item_id, payment_request_id,
        request_number, vendor_name, amount_disallowed,
        disallowed_by, disallowed_by_name, disallowed_role,
        reason, settlement_status_before,
        settlement_total_before, settlement_total_after,
        request_status_before, request_status_after,
        tenant_id
      ) VALUES (
        ${settlementId}::uuid,
        ${itemId}::uuid,
        ${item.payment_request_id},
        ${item.request_number},
        ${item.vendor_name},
        ${itemAmount},
        ${userId}::uuid,
        ${userRole.full_name || null},
        ${userRole.settlementRole},
        ${reason || null},
        ${previousStatus},
        ${previousTotal},
        ${previousTotal - itemAmount},
        ${item.request_status},
        ${revertStatus},
        ${tenantId}::uuid
      )
    `;
    
    // Revert the payment request status
    await prisma.$executeRaw`
      UPDATE payment_requests
      SET 
        status = ${revertStatus},
        workflow_status = ${revertStatus},
        updated_at = NOW()
      WHERE id = ${item.payment_request_id}
    `;
    
    disallowedDetails.push({
      itemId,
      requestNumber: item.request_number,
      vendorName: item.vendor_name,
      amount: itemAmount,
      revertedTo: revertStatus
    });
  }
  
  // Update settlement totals
  const newTotal = previousTotal - totalDisallowedAmount;
  const remainingItems = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count 
    FROM settlement_line_items 
    WHERE settlement_id = ${settlementId}::uuid AND COALESCE(is_disallowed, false) = false
  `;
  
  await prisma.$executeRaw`
    UPDATE settlements SET
      total_amount = ${newTotal},
      disallowed_amount = COALESCE(disallowed_amount, 0) + ${totalDisallowedAmount},
      original_total_amount = COALESCE(original_total_amount, ${previousTotal}),
      line_item_count = ${remainingItems[0]?.count || 0},
      updated_at = NOW()
    WHERE id = ${settlementId}::uuid
  `;
  
  // Create audit log with amounts before/after
  await createSettlementAuditLog(settlementId, tenantId, {
    action: 'PARTIAL_DISALLOW',
    fromStatus: previousStatus,
    toStatus: previousStatus, // Status doesn't change, just items
    stage: settlement.current_stage,
    actorId: userId,
    comment: `Disallowed ${disallowedItemIds.length} items. ${reason || ''}`,
    amountBefore: previousTotal,
    amountAfter: newTotal,
    itemsDisallowed: disallowedItemIds.length
  });
  
  return {
    success: true,
    message: `${disallowedItemIds.length} item(s) disallowed and returned to Accountant queue`,
    disallowedItems: disallowedDetails,
    settlement: {
      previousTotal,
      newTotal,
      disallowedAmount: totalDisallowedAmount,
      remainingItems: remainingItems[0]?.count || 0
    }
  };
}

/**
 * Approve settlement with partial disallow (FC/CFO)
 * Approves only the allowed items
 */
async function approveWithPartialDisallow(settlementId, userId, tenantId, data = {}) {
  const { disallowedItemIds = [], reason = '', comment = '' } = data;
  
  // First, disallow any specified items
  if (disallowedItemIds.length > 0) {
    await partialDisallowItems(settlementId, disallowedItemIds, userId, tenantId, reason);
  }
  
  // Check if any items remain
  const remainingItems = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count 
    FROM settlement_line_items 
    WHERE settlement_id = ${settlementId}::uuid AND COALESCE(is_disallowed, false) = false
  `;
  
  if (remainingItems[0]?.count === 0) {
    throw new Error('Cannot approve settlement with all items disallowed. Please reject instead.');
  }
  
  // Determine which approval to call based on role
  const userRole = await getUserSettlementRole(userId);
  
  if (userRole?.settlementRole === Roles.FINANCE_CONTROLLER) {
    return financeControllerApprove(settlementId, userId, tenantId, comment);
  } else if (userRole?.settlementRole === Roles.CFO) {
    return cfoApprove(settlementId, userId, tenantId, comment);
  } else {
    throw new Error('Invalid role for approval');
  }
}

// ============================================================================
// FAIL SCENARIOS & RECOVERY (Per MASTER PROMPT)
// ============================================================================

/**
 * Mark settlement as FAILED (Banker or System)
 * Reverts all requests to QUEUED_FOR_SETTLEMENT
 */
async function markSettlementFailed(settlementId, userId, tenantId, failureData) {
  const { failureCode, failureReason, failureSource = 'MANUAL' } = failureData;
  
  if (!failureReason) {
    throw new Error('Failure reason is required');
  }
  
  const settlement = await getSettlementById(settlementId);
  if (!settlement) {
    throw new Error('Settlement not found');
  }
  
  if (settlement.status === SettlementStatus.PAID) {
    throw new Error('Cannot mark PAID settlement as failed');
  }
  
  if (settlement.status === SettlementStatus.FAILED) {
    throw new Error('Settlement is already in FAILED status');
  }
  
  const previousStatus = settlement.status;
  const userInfo = await getUserSettlementRole(userId);
  
  // Update settlement to FAILED
  await prisma.$executeRaw`
    UPDATE settlements SET
      status = 'FAILED',
      current_stage = 'FAILED',
      failed_at = NOW(),
      failure_reason = ${failureReason},
      failure_code = ${failureCode || null},
      retry_count = COALESCE(retry_count, 0) + 1,
      last_retry_at = NOW(),
      updated_at = NOW()
    WHERE id = ${settlementId}::uuid
  `;
  
  // Revert all non-disallowed requests to QUEUED_FOR_SETTLEMENT
  await prisma.$executeRaw`
    UPDATE payment_requests pr
    SET 
      status = 'QUEUED_FOR_SETTLEMENT',
      workflow_status = 'QUEUED_FOR_SETTLEMENT',
      updated_at = NOW()
    FROM settlement_line_items sli
    WHERE sli.settlement_id = ${settlementId}::uuid
      AND sli.payment_request_id = pr.id
      AND COALESCE(sli.is_disallowed, false) = false
  `;
  
  // Create failure history record
  await prisma.$executeRaw`
    INSERT INTO settlement_failure_history (
      settlement_id, failure_code, failure_reason, failure_source,
      status_before, utr_number, bank_reference,
      reported_by, reported_by_name, tenant_id
    ) VALUES (
      ${settlementId}::uuid,
      ${failureCode || null},
      ${failureReason},
      ${failureSource},
      ${previousStatus},
      ${settlement.utr_number || null},
      ${settlement.bank_reference || null},
      ${userId}::uuid,
      ${userInfo?.full_name || null},
      ${tenantId}::uuid
    )
  `;
  
  // Audit log
  await createSettlementAuditLog(settlementId, tenantId, {
    action: 'MARKED_FAILED',
    fromStatus: previousStatus,
    toStatus: 'FAILED',
    stage: 'FAILED',
    actorId: userId,
    comment: `${failureSource}: ${failureReason}`
  });
  
  // TODO: Send notification to Accountant
  // await notifyAccountantOfFailure(settlementId, tenantId, failureReason);
  
  return {
    success: true,
    message: 'Settlement marked as failed. Requests reverted to queue.',
    failureCode,
    failureReason,
    previousStatus
  };
}

/**
 * Retry a failed settlement
 * 
 * IDEMPOTENCY GUARDED: Prevents duplicate retry attempts
 * RETRY LIMIT: Maximum retries enforced
 */
async function retryFailedSettlement(settlementId, userId, tenantId, options = {}) {
  const { idempotencyKey } = options;
  
  return withIdempotency(
    IdempotencyOperations.SETTLEMENT_RETRY,
    settlementId,
    userId,
    tenantId,
    idempotencyKey || `retry_${settlementId}`,
    async () => {
      // Check if retry is allowed (enforces MAX_RETRY_COUNT)
      const retryCheck = await canRetrySettlement(settlementId);
      
      if (!retryCheck.allowed) {
        throw new Error('Retry not allowed');
      }
      
      const settlement = await getSettlementById(settlementId);
      
      // Log fraud signal if excessive retries
      if (retryCheck.currentRetryCount >= 2) {
        await logFraudSignal('EXCESSIVE_RETRY', 
          retryCheck.currentRetryCount >= 3 ? 'HIGH' : 'MEDIUM', 
          tenantId, 
          { settlementId, userId, data: { retryCount: retryCheck.currentRetryCount } }
        );
      }
      
      // Get Banker for assignment
      const banker = await getUserByRole(tenantId, 'BANKER');
      
      // Revert to SENT_TO_BANK for retry
      await prisma.$executeRaw`
        UPDATE settlements SET
          status = 'SENT_TO_BANK',
          current_stage = 'BANKER_EXECUTION',
          current_approver_id = ${banker?.id || null}::uuid,
          last_retry_idempotency_key = ${idempotencyKey || null},
          execution_started_at = NULL,
          execution_deadline = NULL,
          updated_at = NOW()
        WHERE id = ${settlementId}::uuid
      `;
      
      // Update linked requests back to SETTLED (in progress)
      await prisma.$executeRaw`
        UPDATE payment_requests pr
        SET 
          status = 'QUEUED_FOR_SETTLEMENT',
          workflow_status = 'QUEUED_FOR_SETTLEMENT',
          updated_at = NOW()
        FROM settlement_line_items sli
        WHERE sli.settlement_id = ${settlementId}::uuid
          AND sli.payment_request_id = pr.id
          AND COALESCE(sli.is_disallowed, false) = false
      `;
      
      await createSettlementAuditLog(settlementId, tenantId, {
        action: 'RETRY_INITIATED',
        fromStatus: 'FAILED',
        toStatus: 'SENT_TO_BANK',
        stage: 'BANKER_EXECUTION',
        actorId: userId,
        comment: `Retry attempt #${(settlement.retry_count || 0) + 1} of ${retryCheck.maxRetries}`
      });
      
      // Enqueue notification
      await enqueueBackgroundJob('NOTIFICATION', {
        type: 'SETTLEMENT_RETRY',
        settlementId,
        toUserId: banker?.id,
        message: `Settlement ${settlement.settlement_number} retry #${(settlement.retry_count || 0) + 1}`
      }, tenantId, { priority: 3 });
      
      return {
        success: true,
        message: 'Settlement queued for retry',
        retryCount: (settlement.retry_count || 0) + 1,
        remainingRetries: retryCheck.remainingRetries - 1
      };
    }
  );
}

// ============================================================================
// UTR CORRECTION (Before PAID only)
// ============================================================================

/**
 * Correct UTR number (only before PAID status)
 * 
 * IDEMPOTENCY GUARDED: Prevents duplicate UTR corrections
 */
async function correctUTR(settlementId, userId, tenantId, correctionData) {
  const { newUTR, correctionReason, idempotencyKey } = correctionData;
  
  if (!newUTR) {
    throw new Error('New UTR number is required');
  }
  
  if (!correctionReason) {
    throw new Error('Correction reason is required for audit');
  }
  
  return withIdempotency(
    IdempotencyOperations.UTR_CORRECTION,
    settlementId,
    userId,
    tenantId,
    idempotencyKey || `utr_${settlementId}_${newUTR}`,
    async () => {
      const settlement = await getSettlementById(settlementId);
      if (!settlement) {
        throw new Error('Settlement not found');
      }
      
      // Can only correct UTR before PAID
      if (settlement.status === SettlementStatus.PAID) {
        throw new Error('Cannot correct UTR after settlement is PAID');
      }
      
      const oldUTR = settlement.utr_number;
      const userInfo = await getUserSettlementRole(userId);
      
      // Update UTR
      await prisma.$executeRaw`
        UPDATE settlements SET
          utr_number = ${newUTR},
          updated_at = NOW()
        WHERE id = ${settlementId}::uuid
      `;
      
      // Create correction history
      await prisma.$executeRaw`
        INSERT INTO utr_correction_history (
          settlement_id, old_utr, new_utr,
          corrected_by, corrected_by_name, corrected_role,
          correction_reason, settlement_status, tenant_id
        ) VALUES (
          ${settlementId}::uuid,
          ${oldUTR || null},
          ${newUTR},
          ${userId}::uuid,
          ${userInfo?.full_name || null},
          ${userInfo?.settlementRole || null},
          ${correctionReason},
          ${settlement.status},
          ${tenantId}::uuid
        )
      `;
      
      await createSettlementAuditLog(settlementId, tenantId, {
        action: 'UTR_CORRECTED',
        fromStatus: settlement.status,
        toStatus: settlement.status,
        stage: settlement.current_stage,
        actorId: userId,
        comment: `UTR changed from ${oldUTR || 'null'} to ${newUTR}. Reason: ${correctionReason}`,
        utrNumber: newUTR
      });
      
      return {
        success: true,
        message: 'UTR corrected successfully',
        oldUTR,
        newUTR
      };
    }
  );
}

// ============================================================================
// AUDIT: UTR TRACE
// ============================================================================

/**
 * Trace all requests settled by a UTR
 */
async function traceByUTR(utrNumber, tenantId) {
  const result = await prisma.$queryRaw`
    SELECT 
      s.id AS settlement_id,
      s.settlement_number,
      s.purpose,
      s.total_amount,
      s.status AS settlement_status,
      s.executed_at,
      
      sli.payment_request_id,
      sli.request_number,
      sli.vendor_name,
      sli.amount_in_settlement AS amount_paid,
      
      pp.paid_amount_before,
      pp.paid_amount_after,
      pp.remaining_after,
      pp.is_final_payment,
      
      pr.approved_amount AS total_approved,
      pr.paid_amount_total AS total_paid,
      pr.remaining_amount AS current_remaining,
      pr.status AS request_status
      
    FROM settlements s
    JOIN settlement_line_items sli ON s.id = sli.settlement_id
    LEFT JOIN payment_request_partial_payments pp ON pp.settlement_id = s.id 
      AND pp.payment_request_id = sli.payment_request_id
    LEFT JOIN payment_requests pr ON sli.payment_request_id = pr.id
    WHERE s.utr_number = ${utrNumber}
      AND s.tenant_id = ${tenantId}::uuid
    ORDER BY sli.vendor_name, sli.request_number
  `;
  
  return {
    success: true,
    utrNumber,
    requests: result
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  SettlementStatus,
  SettlementStages,
  VALID_SETTLEMENT_TRANSITIONS,
  Roles,
  
  // Role detection
  getUserSettlementRole,
  isUserAccountant,
  
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
  getAccountantSettlements,
  getSimplifiedSettlementTasks,
  
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
  traceByUTR,
  
  // SECURITY: Concurrency & Locking
  acquireConsolidationLock,
  releaseConsolidationLock,
  checkOptimisticLock,
  
  // SECURITY: Maker-Checker
  checkMakerChecker,
  recordActorAction,
  
  // SECURITY: Approval Tokens (Anti-replay)
  generateApprovalToken,
  validateApprovalToken,
  
  // SECURITY: Fraud Detection
  logFraudSignal,
  checkVelocityAnomaly,
  
  // SECURITY: Retry Controls
  canRetrySettlement,
  checkExecutionTimeout,
  startExecutionTimer,
  
  // BACKGROUND JOBS
  enqueueBackgroundJob,
  
  // UTILITIES
  hashRequestBody,
  withTransaction
};
