/**
 * ============================================================================
 * PAYMENT REQUEST WORKFLOW SERVICE
 * ============================================================================
 * 
 * Task-style payment request workflow engine with:
 * - Amount-based routing (≤5000 vs >5000)
 * - Manager chain resolution
 * - Role-based stage assignments (Accounts, Finance, CFO, Banker)
 * - Send-back restrictions (only to immediate previous level)
 * - Finance-origin rejection restrictions
 * - SLA-based escalation
 * - Complete audit trail
 * 
 * BUSINESS RULES:
 * 1. Amount ≤ 5000: Manager → Accounts → Finance → CFO → Banker
 * 2. Amount > 5000: Manager → Manager's Manager → Accounts → Finance → CFO → Banker
 * 3. Finance-originated: Only Finance Controller/CFO can reject
 * 4. Send-back: Only to immediate previous level
 * 
 * @module services/PaymentWorkflowService
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Note: businessHierarchy functions available for future use if needed
// const { getBusinessLevelFromRole, getEffectiveAuthorityLevelFromUser, AUTHORITY_LEVELS } = require('../lib/businessHierarchy');

// ============================================================================
// CONSTANTS
// ============================================================================

const PAYMENT_STAGES = {
  DRAFT: 'DRAFT',
  PAYMENT_REQUESTED: 'PAYMENT_REQUESTED',
  MANAGER_APPROVAL: 'MANAGER_APPROVAL',
  MANAGER_2_APPROVAL: 'MANAGER_2_APPROVAL',
  ACCOUNTS_VERIFICATION: 'ACCOUNTS_VERIFICATION',
  ACCOUNTS_VERIFIED: 'ACCOUNTS_VERIFIED',
  ACCOUNTING_ENTRY_PENDING: 'ACCOUNTING_ENTRY_PENDING',
  ACCOUNTING_ENTRY_COMPLETED: 'ACCOUNTING_ENTRY_COMPLETED',
  FINANCE_PENDING: 'FINANCE_PENDING',
  FINANCE_CONFIRMED: 'FINANCE_CONFIRMED',
  CFO_PENDING: 'CFO_PENDING',
  CFO_APPROVED: 'CFO_APPROVED',
  BANKER_PENDING: 'BANKER_PENDING',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  REJECTED: 'REJECTED',
  SENT_BACK: 'SENT_BACK',
  CANCELLED: 'CANCELLED'
};

const STAGE_ORDER = {
  [PAYMENT_STAGES.DRAFT]: 0,
  [PAYMENT_STAGES.PAYMENT_REQUESTED]: 1,
  [PAYMENT_STAGES.MANAGER_APPROVAL]: 2,
  [PAYMENT_STAGES.MANAGER_2_APPROVAL]: 3,
  [PAYMENT_STAGES.ACCOUNTS_VERIFICATION]: 4,
  [PAYMENT_STAGES.ACCOUNTS_VERIFIED]: 5,
  [PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING]: 6,
  [PAYMENT_STAGES.ACCOUNTING_ENTRY_COMPLETED]: 7,
  [PAYMENT_STAGES.FINANCE_PENDING]: 8,
  [PAYMENT_STAGES.FINANCE_CONFIRMED]: 9,
  [PAYMENT_STAGES.CFO_PENDING]: 10,
  [PAYMENT_STAGES.CFO_APPROVED]: 11,
  [PAYMENT_STAGES.BANKER_PENDING]: 12,
  [PAYMENT_STAGES.PAYMENT_COMPLETED]: 13
};

const STAGE_DISPLAY_NAMES = {
  [PAYMENT_STAGES.DRAFT]: 'Draft',
  [PAYMENT_STAGES.PAYMENT_REQUESTED]: 'Payment Requested',
  [PAYMENT_STAGES.MANAGER_APPROVAL]: 'A1 - Manager Approval',
  [PAYMENT_STAGES.MANAGER_2_APPROVAL]: 'A2 - Senior Manager Approval',
  [PAYMENT_STAGES.ACCOUNTS_VERIFICATION]: 'A3 - Accounts Verification',
  [PAYMENT_STAGES.ACCOUNTS_VERIFIED]: 'Accounts Verified',
  [PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING]: 'Accounting Entry',
  [PAYMENT_STAGES.ACCOUNTING_ENTRY_COMPLETED]: 'Entry Completed',
  [PAYMENT_STAGES.FINANCE_PENDING]: 'A4 - Finance Confirmation',
  [PAYMENT_STAGES.FINANCE_CONFIRMED]: 'Finance Confirmed',
  [PAYMENT_STAGES.CFO_PENDING]: 'A5 - CFO Approval',
  [PAYMENT_STAGES.CFO_APPROVED]: 'CFO Approved',
  [PAYMENT_STAGES.BANKER_PENDING]: 'A6 - Banker Execution',
  [PAYMENT_STAGES.PAYMENT_COMPLETED]: 'Payment Completed',
  [PAYMENT_STAGES.REJECTED]: 'Rejected',
  [PAYMENT_STAGES.SENT_BACK]: 'Sent Back',
  [PAYMENT_STAGES.CANCELLED]: 'Cancelled'
};

const ORIGIN_TYPES = {
  STAFF: 'STAFF',
  MANAGER: 'MANAGER',
  FINANCE: 'FINANCE',
  ACCOUNTS: 'ACCOUNTS',
  ADMIN: 'ADMIN'
};

const AMOUNT_THRESHOLD = 5000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user's reporting manager
 */
async function getUserManager(userId) {
  const user = await prisma.$queryRaw`
    SELECT manager_id, reports_to FROM users WHERE id = ${userId}::uuid AND deleted_at IS NULL
  `;
  if (!user || user.length === 0) return null;
  return user[0].manager_id || user[0].reports_to || null;
}

/**
 * Get user's manager's manager (second level)
 */
async function getUserManagerLevel2(userId) {
  const managerId = await getUserManager(userId);
  if (!managerId) return null;
  return getUserManager(managerId);
}

/**
 * Get user info with role and level
 */
async function getUserInfo(userId) {
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
  return result.length > 0 ? result[0] : null;
}

/**
 * Determine origin type from user role/level
 */
function determineOriginType(userInfo) {
  if (!userInfo) return ORIGIN_TYPES.STAFF;
  
  const level = userInfo.business_level || 10;
  const role = (userInfo.role_name || '').toLowerCase();
  
  if (level >= 90) return ORIGIN_TYPES.ADMIN;
  if (role.includes('cfo') || role.includes('finance')) return ORIGIN_TYPES.FINANCE;
  if (role.includes('account')) return ORIGIN_TYPES.ACCOUNTS;
  if (level >= 60) return ORIGIN_TYPES.MANAGER;
  return ORIGIN_TYPES.STAFF;
}

/**
 * Get users by role for stage assignment
 */
async function getUsersByRole(tenantId, roleName) {
  const rolePatterns = {
    'ACCOUNTANT': ['Accountant', 'Accounts'],
    'ACCOUNTS_MANAGER': ['Accounts Manager', 'Accounting Manager'],
    'FINANCE_CONTROLLER': ['Finance Controller', 'Finance Manager'],
    'CFO': ['CFO', 'Chief Financial Officer'],
    'BANKER': ['Banker', 'Treasury', 'Treasurer']
  };
  
  const patterns = rolePatterns[roleName] || [roleName];
  
  const users = await prisma.$queryRaw`
    SELECT DISTINCT u.id, u.full_name, u.email, u.business_level
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.tenant_id = ${tenantId}::uuid
      AND u.deleted_at IS NULL
      AND u.status = 'active'
      AND (
        ${patterns.map((p) => `r.name ILIKE '%${p}%'`).join(' OR ')}
      )
    ORDER BY u.business_level DESC
    LIMIT 1
  `;
  
  return users.length > 0 ? users[0] : null;
}

/**
 * Get admin user for fallback
 */
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

/**
 * Calculate SLA deadline
 */
async function calculateSLADeadline(tenantId, stage) {
  const slaConfig = await prisma.$queryRaw`
    SELECT sla_hours FROM payment_workflow_sla_config
    WHERE tenant_id = ${tenantId}::uuid AND stage = ${stage} AND is_active = true
    LIMIT 1
  `;
  
  const hours = slaConfig.length > 0 ? slaConfig[0].sla_hours : 24;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

// ============================================================================
// WORKFLOW DETERMINATION
// ============================================================================

/**
 * Determine workflow path based on amount and origin
 */
async function determineWorkflow(amount, creatorId, originType = ORIGIN_TYPES.STAFF) {
  const manager1 = await getUserManager(creatorId);
  const manager2 = amount > AMOUNT_THRESHOLD ? await getUserManagerLevel2(creatorId) : null;
  
  // Finance-originated: Skip manager approvals
  if (originType === ORIGIN_TYPES.FINANCE) {
    return {
      requiresManager1: false,
      requiresManager2: false,
      manager1Id: null,
      manager2Id: null,
      firstStage: PAYMENT_STAGES.ACCOUNTS_VERIFICATION,
      amountThreshold: 'FINANCE_ORIGIN'
    };
  }
  
  // Determine based on amount
  if (amount <= AMOUNT_THRESHOLD) {
    return {
      requiresManager1: !!manager1,
      requiresManager2: false,
      manager1Id: manager1,
      manager2Id: null,
      firstStage: manager1 ? PAYMENT_STAGES.MANAGER_APPROVAL : PAYMENT_STAGES.ACCOUNTS_VERIFICATION,
      amountThreshold: 'UNDER_5000'
    };
  } else {
    return {
      requiresManager1: !!manager1,
      requiresManager2: !!manager2,
      manager1Id: manager1,
      manager2Id: manager2,
      firstStage: manager1 ? PAYMENT_STAGES.MANAGER_APPROVAL : PAYMENT_STAGES.ACCOUNTS_VERIFICATION,
      amountThreshold: 'OVER_5000'
    };
  }
}

/**
 * Get next stage based on current stage and workflow config
 */
function getNextStage(currentStage, amount, requiresSecondManager) {
  const stageTransitions = {
    [PAYMENT_STAGES.DRAFT]: PAYMENT_STAGES.PAYMENT_REQUESTED,
    [PAYMENT_STAGES.PAYMENT_REQUESTED]: PAYMENT_STAGES.MANAGER_APPROVAL,
    [PAYMENT_STAGES.MANAGER_APPROVAL]: requiresSecondManager && amount > AMOUNT_THRESHOLD 
      ? PAYMENT_STAGES.MANAGER_2_APPROVAL 
      : PAYMENT_STAGES.ACCOUNTS_VERIFICATION,
    [PAYMENT_STAGES.MANAGER_2_APPROVAL]: PAYMENT_STAGES.ACCOUNTS_VERIFICATION,
    [PAYMENT_STAGES.ACCOUNTS_VERIFICATION]: PAYMENT_STAGES.ACCOUNTS_VERIFIED,
    [PAYMENT_STAGES.ACCOUNTS_VERIFIED]: PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING,
    [PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING]: PAYMENT_STAGES.ACCOUNTING_ENTRY_COMPLETED,
    [PAYMENT_STAGES.ACCOUNTING_ENTRY_COMPLETED]: PAYMENT_STAGES.FINANCE_PENDING,
    [PAYMENT_STAGES.FINANCE_PENDING]: PAYMENT_STAGES.FINANCE_CONFIRMED,
    [PAYMENT_STAGES.FINANCE_CONFIRMED]: PAYMENT_STAGES.CFO_PENDING,
    [PAYMENT_STAGES.CFO_PENDING]: PAYMENT_STAGES.CFO_APPROVED,
    [PAYMENT_STAGES.CFO_APPROVED]: PAYMENT_STAGES.BANKER_PENDING,
    [PAYMENT_STAGES.BANKER_PENDING]: PAYMENT_STAGES.PAYMENT_COMPLETED
  };
  
  return stageTransitions[currentStage] || null;
}

/**
 * Get previous stage (only immediate previous - for send-back)
 */
function getPreviousStage(currentStage, amount, requiresSecondManager) {
  const reverseTransitions = {
    [PAYMENT_STAGES.MANAGER_2_APPROVAL]: PAYMENT_STAGES.MANAGER_APPROVAL,
    [PAYMENT_STAGES.ACCOUNTS_VERIFICATION]: requiresSecondManager && amount > AMOUNT_THRESHOLD 
      ? PAYMENT_STAGES.MANAGER_2_APPROVAL 
      : PAYMENT_STAGES.MANAGER_APPROVAL,
    [PAYMENT_STAGES.ACCOUNTS_VERIFIED]: PAYMENT_STAGES.ACCOUNTS_VERIFICATION,
    [PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING]: PAYMENT_STAGES.ACCOUNTS_VERIFIED,
    [PAYMENT_STAGES.ACCOUNTING_ENTRY_COMPLETED]: PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING,
    [PAYMENT_STAGES.FINANCE_PENDING]: PAYMENT_STAGES.ACCOUNTING_ENTRY_COMPLETED,
    [PAYMENT_STAGES.FINANCE_CONFIRMED]: PAYMENT_STAGES.FINANCE_PENDING,
    [PAYMENT_STAGES.CFO_PENDING]: PAYMENT_STAGES.FINANCE_CONFIRMED,
    [PAYMENT_STAGES.CFO_APPROVED]: PAYMENT_STAGES.CFO_PENDING,
    [PAYMENT_STAGES.BANKER_PENDING]: PAYMENT_STAGES.CFO_APPROVED
  };
  
  return reverseTransitions[currentStage] || null;
}

// ============================================================================
// STAGE ASSIGNMENT
// ============================================================================

/**
 * Get approver for a stage
 */
async function getStageApprover(tenantId, stage, paymentRequest) {
  switch (stage) {
    case PAYMENT_STAGES.MANAGER_APPROVAL:
      return paymentRequest.creator_manager_id;
      
    case PAYMENT_STAGES.MANAGER_2_APPROVAL:
      return paymentRequest.creator_manager_2_id;
      
    case PAYMENT_STAGES.ACCOUNTS_VERIFICATION:
    case PAYMENT_STAGES.ACCOUNTS_VERIFIED:
    case PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING:
    case PAYMENT_STAGES.ACCOUNTING_ENTRY_COMPLETED: {
      const accountant = await getUsersByRole(tenantId, 'ACCOUNTANT');
      return accountant?.id || (await getAdminFallback(tenantId))?.id;
    }
    
    case PAYMENT_STAGES.FINANCE_PENDING:
    case PAYMENT_STAGES.FINANCE_CONFIRMED: {
      const financeController = await getUsersByRole(tenantId, 'FINANCE_CONTROLLER');
      return financeController?.id || (await getAdminFallback(tenantId))?.id;
    }
    
    case PAYMENT_STAGES.CFO_PENDING:
    case PAYMENT_STAGES.CFO_APPROVED: {
      const cfo = await getUsersByRole(tenantId, 'CFO');
      return cfo?.id || (await getAdminFallback(tenantId))?.id;
    }
    
    case PAYMENT_STAGES.BANKER_PENDING: {
      const banker = await getUsersByRole(tenantId, 'BANKER');
      return banker?.id || (await getAdminFallback(tenantId))?.id;
    }
    
    default:
      return (await getAdminFallback(tenantId))?.id;
  }
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

/**
 * Check if user can approve at current stage
 */
async function canUserApprove(paymentRequestId, userId, stage) {
  const userInfo = await getUserInfo(userId);
  if (!userInfo) return { canApprove: false, reason: 'User not found' };
  
  const level = userInfo.business_level || 10;
  const role = (userInfo.role_name || '').toLowerCase();
  
  // Admin can always approve
  if (level >= 90) return { canApprove: true, reason: 'Admin authority' };
  
  // Get payment request
  const pr = await prisma.$queryRaw`
    SELECT current_approver_id, current_stage FROM payment_requests WHERE id = ${paymentRequestId}
  `;
  
  if (!pr || pr.length === 0) return { canApprove: false, reason: 'Payment request not found' };
  
  const currentApprover = pr[0].current_approver_id;
  
  // Current assigned approver can approve
  if (currentApprover === userId) return { canApprove: true, reason: 'Assigned approver' };
  
  // Role-based authorization for specific stages
  const roleAuth = {
    [PAYMENT_STAGES.ACCOUNTS_VERIFICATION]: ['accountant', 'accounts', 'finance controller', 'cfo'],
    [PAYMENT_STAGES.ACCOUNTS_VERIFIED]: ['accountant', 'accounts', 'finance controller', 'cfo'],
    [PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING]: ['accountant', 'accounts', 'finance controller', 'cfo'],
    [PAYMENT_STAGES.FINANCE_PENDING]: ['finance controller', 'finance manager', 'cfo'],
    [PAYMENT_STAGES.CFO_PENDING]: ['cfo', 'chief financial officer'],
    [PAYMENT_STAGES.BANKER_PENDING]: ['banker', 'treasury', 'treasurer', 'cfo']
  };
  
  if (roleAuth[stage]) {
    const hasRole = roleAuth[stage].some(r => role.includes(r));
    if (hasRole) return { canApprove: true, reason: 'Role-based authority' };
  }
  
  return { canApprove: false, reason: 'Insufficient authority' };
}

/**
 * Check if user can reject (with finance-origin restrictions)
 */
async function canUserReject(paymentRequestId, userId) {
  const userInfo = await getUserInfo(userId);
  if (!userInfo) return { canReject: false, reason: 'User not found' };
  
  const level = userInfo.business_level || 10;
  const role = (userInfo.role_name || '').toLowerCase();
  
  // Admin can always reject
  if (level >= 90) return { canReject: true, reason: 'Admin authority' };
  
  // Get payment request origin
  const pr = await prisma.$queryRaw`
    SELECT origin_type, current_approver_id, current_stage FROM payment_requests WHERE id = ${paymentRequestId}
  `;
  
  if (!pr || pr.length === 0) return { canReject: false, reason: 'Payment request not found' };
  
  const originType = pr[0].origin_type;
  const currentApprover = pr[0].current_approver_id;
  
  // Finance-originated: Only Finance Controller/CFO can reject
  if (originType === ORIGIN_TYPES.FINANCE) {
    if (role.includes('finance controller') || role.includes('cfo')) {
      return { canReject: true, reason: 'Finance authority' };
    }
    return { canReject: false, reason: 'Only Finance Controller or CFO can reject finance-originated requests' };
  }
  
  // Current approver can reject
  if (currentApprover === userId) return { canReject: true, reason: 'Current approver' };
  
  // Manager level can reject
  if (level >= 60) return { canReject: true, reason: 'Manager authority' };
  
  return { canReject: false, reason: 'Insufficient authority to reject' };
}

/**
 * Check if user can send back (only to immediate previous level)
 */
async function canUserSendBack(paymentRequestId, userId) {
  const userInfo = await getUserInfo(userId);
  if (!userInfo) return { canSendBack: false, reason: 'User not found' };
  
  const level = userInfo.business_level || 10;
  
  // Get payment request
  const pr = await prisma.$queryRaw`
    SELECT current_stage, current_approver_id, "totalAmount", requires_second_manager
    FROM payment_requests WHERE id = ${paymentRequestId}
  `;
  
  if (!pr || pr.length === 0) return { canSendBack: false, reason: 'Payment request not found' };
  
  const currentStage = pr[0].current_stage;
  const amount = parseFloat(pr[0].totalAmount);
  const requiresSecondManager = pr[0].requires_second_manager;
  
  // Check if there's a previous stage
  const previousStage = getPreviousStage(currentStage, amount, requiresSecondManager);
  if (!previousStage) {
    return { canSendBack: false, reason: 'Cannot send back from this stage' };
  }
  
  // Current approver or manager+ can send back
  if (pr[0].current_approver_id === userId || level >= 60) {
    return { canSendBack: true, previousStage, reason: 'Authority to send back' };
  }
  
  return { canSendBack: false, reason: 'Insufficient authority to send back' };
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

class PaymentWorkflowService {
  
  /**
   * Submit a new payment request
   */
  async submitPaymentRequest(paymentRequestId, submitterId, tenantId) {
    // Get payment request
    const prResult = await prisma.$queryRaw`
      SELECT * FROM payment_requests WHERE id = ${paymentRequestId}
    `;
    
    if (!prResult || prResult.length === 0) {
      throw new Error('Payment request not found');
    }
    
    const pr = prResult[0];
    const amount = parseFloat(pr.totalAmount);
    
    // Get submitter info
    const submitterInfo = await getUserInfo(submitterId);
    const originType = determineOriginType(submitterInfo);
    
    // Determine workflow
    const workflow = await determineWorkflow(amount, submitterId, originType);
    
    // Get first stage approver
    const firstStage = workflow.firstStage;
    const slaDeadline = await calculateSLADeadline(tenantId, firstStage);
    
    let firstApproverId = null;
    if (firstStage === PAYMENT_STAGES.MANAGER_APPROVAL) {
      firstApproverId = workflow.manager1Id;
    } else {
      firstApproverId = await getStageApprover(tenantId, firstStage, {
        creator_manager_id: workflow.manager1Id,
        creator_manager_2_id: workflow.manager2Id
      });
    }
    
    // Fallback to admin if no approver found
    if (!firstApproverId) {
      const admin = await getAdminFallback(tenantId);
      firstApproverId = admin?.id;
    }
    
    // Update payment request with workflow info
    await prisma.$executeRaw`
      UPDATE payment_requests SET
        workflow_status = ${firstStage},
        current_stage = ${firstStage},
        origin_type = ${originType},
        creator_level = ${submitterInfo?.business_level || 10},
        creator_manager_id = ${workflow.manager1Id}::uuid,
        creator_manager_2_id = ${workflow.manager2Id}::uuid,
        requires_second_manager = ${workflow.requiresManager2},
        amount_threshold_applied = ${workflow.amountThreshold},
        current_approver_id = ${firstApproverId}::uuid,
        sla_deadline = ${slaDeadline},
        tenant_id = ${tenantId}::uuid,
        "updatedAt" = NOW()
      WHERE id = ${paymentRequestId}
    `;
    
    // Create stage record
    await prisma.$executeRaw`
      INSERT INTO payment_request_stages (
        payment_request_id, stage, stage_order, assigned_to, status, due_at, created_at
      ) VALUES (
        ${paymentRequestId}, ${firstStage}, ${STAGE_ORDER[firstStage]}, 
        ${firstApproverId}::uuid, 'active', ${slaDeadline}, NOW()
      )
      ON CONFLICT (payment_request_id, stage) 
      DO UPDATE SET assigned_to = EXCLUDED.assigned_to, status = 'active', due_at = EXCLUDED.due_at
    `;
    
    // Create audit log
    await this.createApprovalLog(paymentRequestId, tenantId, {
      fromStage: PAYMENT_STAGES.DRAFT,
      toStage: firstStage,
      action: 'submit',
      actionBy: submitterId,
      amount
    });
    
    return {
      success: true,
      paymentRequestId,
      currentStage: firstStage,
      currentApprover: firstApproverId,
      workflow,
      slaDeadline
    };
  }
  
  /**
   * Approve current stage
   */
  async approveStage(paymentRequestId, approverId, comment, metadata = {}) {
    // Get payment request
    const prResult = await prisma.$queryRaw`
      SELECT * FROM payment_requests WHERE id = ${paymentRequestId}
    `;
    
    if (!prResult || prResult.length === 0) {
      throw new Error('Payment request not found');
    }
    
    const pr = prResult[0];
    const currentStage = pr.current_stage;
    const amount = parseFloat(pr.totalAmount);
    const tenantId = pr.tenant_id;
    
    // Check authorization
    const authResult = await canUserApprove(paymentRequestId, approverId, currentStage);
    if (!authResult.canApprove) {
      throw new Error(authResult.reason);
    }
    
    // Get approver info
    const approverInfo = await getUserInfo(approverId);
    
    // Determine next stage
    const nextStage = getNextStage(currentStage, amount, pr.requires_second_manager);
    
    if (!nextStage) {
      throw new Error('Invalid stage transition');
    }
    
    // Get next approver
    const nextApproverId = await getStageApprover(tenantId, nextStage, pr);
    const nextSlaDeadline = await calculateSLADeadline(tenantId, nextStage);
    
    // Update stage-specific fields based on current stage
    const stageUpdates = this.getStageSpecificUpdates(currentStage, approverId, comment, metadata);
    
    // Update payment request
    await prisma.$executeRaw`
      UPDATE payment_requests SET
        workflow_status = ${nextStage},
        current_stage = ${nextStage},
        current_approver_id = ${nextApproverId}::uuid,
        sla_deadline = ${nextSlaDeadline},
        ${stageUpdates.sql}
        "updatedAt" = NOW()
      WHERE id = ${paymentRequestId}
    `;
    
    // Complete current stage
    await prisma.$executeRaw`
      UPDATE payment_request_stages SET
        status = 'completed',
        completed_by = ${approverId}::uuid,
        completed_at = NOW(),
        completion_action = 'approved',
        completion_comment = ${comment},
        updated_at = NOW()
      WHERE payment_request_id = ${paymentRequestId} AND stage = ${currentStage}
    `;
    
    // Create next stage if not final
    if (nextStage !== PAYMENT_STAGES.PAYMENT_COMPLETED) {
      await prisma.$executeRaw`
        INSERT INTO payment_request_stages (
          payment_request_id, stage, stage_order, assigned_to, status, due_at, created_at
        ) VALUES (
          ${paymentRequestId}, ${nextStage}, ${STAGE_ORDER[nextStage]}, 
          ${nextApproverId}::uuid, 'active', ${nextSlaDeadline}, NOW()
        )
        ON CONFLICT (payment_request_id, stage) 
        DO UPDATE SET assigned_to = EXCLUDED.assigned_to, status = 'active', due_at = EXCLUDED.due_at
      `;
    }
    
    // Create audit log
    await this.createApprovalLog(paymentRequestId, tenantId, {
      fromStage: currentStage,
      toStage: nextStage,
      action: 'approve',
      actionBy: approverId,
      actionByName: approverInfo?.full_name,
      actionByRole: approverInfo?.role_name,
      actionByLevel: approverInfo?.business_level,
      comment,
      amount,
      metadata
    });
    
    return {
      success: true,
      previousStage: currentStage,
      currentStage: nextStage,
      currentApprover: nextApproverId,
      isComplete: nextStage === PAYMENT_STAGES.PAYMENT_COMPLETED
    };
  }
  
  /**
   * Reject payment request
   */
  async rejectPaymentRequest(paymentRequestId, rejectorId, reason) {
    // Check authorization
    const authResult = await canUserReject(paymentRequestId, rejectorId);
    if (!authResult.canReject) {
      throw new Error(authResult.reason);
    }
    
    // Get payment request
    const prResult = await prisma.$queryRaw`
      SELECT * FROM payment_requests WHERE id = ${paymentRequestId}
    `;
    
    if (!prResult || prResult.length === 0) {
      throw new Error('Payment request not found');
    }
    
    const pr = prResult[0];
    const currentStage = pr.current_stage;
    const tenantId = pr.tenant_id;
    const amount = parseFloat(pr.totalAmount);
    
    // Get rejector info
    const rejectorInfo = await getUserInfo(rejectorId);
    
    // Update payment request
    await prisma.$executeRaw`
      UPDATE payment_requests SET
        workflow_status = 'REJECTED',
        current_stage = 'REJECTED',
        rejection_reason = ${reason},
        rejected_by = ${rejectorId}::uuid,
        rejected_at = NOW(),
        rejection_stage = ${currentStage},
        current_approver_id = NULL,
        "updatedAt" = NOW()
      WHERE id = ${paymentRequestId}
    `;
    
    // Mark current stage as rejected
    await prisma.$executeRaw`
      UPDATE payment_request_stages SET
        status = 'rejected',
        completed_by = ${rejectorId}::uuid,
        completed_at = NOW(),
        completion_action = 'rejected',
        completion_comment = ${reason},
        updated_at = NOW()
      WHERE payment_request_id = ${paymentRequestId} AND stage = ${currentStage}
    `;
    
    // Create audit log
    await this.createApprovalLog(paymentRequestId, tenantId, {
      fromStage: currentStage,
      toStage: PAYMENT_STAGES.REJECTED,
      action: 'reject',
      actionBy: rejectorId,
      actionByName: rejectorInfo?.full_name,
      actionByRole: rejectorInfo?.role_name,
      actionByLevel: rejectorInfo?.business_level,
      comment: reason,
      amount
    });
    
    return {
      success: true,
      previousStage: currentStage,
      currentStage: PAYMENT_STAGES.REJECTED,
      rejectedBy: rejectorId,
      reason
    };
  }
  
  /**
   * Send back to immediate previous level only
   */
  async sendBack(paymentRequestId, senderId, reason) {
    // Check authorization
    const authResult = await canUserSendBack(paymentRequestId, senderId);
    if (!authResult.canSendBack) {
      throw new Error(authResult.reason);
    }
    
    const previousStage = authResult.previousStage;
    
    // Get payment request
    const prResult = await prisma.$queryRaw`
      SELECT * FROM payment_requests WHERE id = ${paymentRequestId}
    `;
    
    if (!prResult || prResult.length === 0) {
      throw new Error('Payment request not found');
    }
    
    const pr = prResult[0];
    const currentStage = pr.current_stage;
    const tenantId = pr.tenant_id;
    const amount = parseFloat(pr.totalAmount);
    
    // Get sender info
    const senderInfo = await getUserInfo(senderId);
    
    // Get approver for previous stage
    const previousApproverId = await getStageApprover(tenantId, previousStage, pr);
    const slaDeadline = await calculateSLADeadline(tenantId, previousStage);
    
    // Update payment request
    await prisma.$executeRaw`
      UPDATE payment_requests SET
        workflow_status = ${previousStage},
        current_stage = ${previousStage},
        current_approver_id = ${previousApproverId}::uuid,
        sla_deadline = ${slaDeadline},
        sent_back_by = ${senderId}::uuid,
        sent_back_at = NOW(),
        sent_back_to_stage = ${previousStage},
        sent_back_reason = ${reason},
        "updatedAt" = NOW()
      WHERE id = ${paymentRequestId}
    `;
    
    // Update current stage to sent_back
    await prisma.$executeRaw`
      UPDATE payment_request_stages SET
        status = 'completed',
        completed_by = ${senderId}::uuid,
        completed_at = NOW(),
        completion_action = 'sent_back',
        completion_comment = ${reason},
        updated_at = NOW()
      WHERE payment_request_id = ${paymentRequestId} AND stage = ${currentStage}
    `;
    
    // Re-activate previous stage
    await prisma.$executeRaw`
      UPDATE payment_request_stages SET
        status = 'active',
        assigned_to = ${previousApproverId}::uuid,
        due_at = ${slaDeadline},
        completed_by = NULL,
        completed_at = NULL,
        completion_action = NULL,
        completion_comment = NULL,
        updated_at = NOW()
      WHERE payment_request_id = ${paymentRequestId} AND stage = ${previousStage}
    `;
    
    // Create audit log
    await this.createApprovalLog(paymentRequestId, tenantId, {
      fromStage: currentStage,
      toStage: previousStage,
      action: 'send_back',
      actionBy: senderId,
      actionByName: senderInfo?.full_name,
      actionByRole: senderInfo?.role_name,
      actionByLevel: senderInfo?.business_level,
      comment: reason,
      amount
    });
    
    return {
      success: true,
      previousStage: currentStage,
      currentStage: previousStage,
      sentBackTo: previousApproverId,
      reason
    };
  }
  
  /**
   * Get stage-specific SQL updates
   */
  getStageSpecificUpdates(stage, approverId, comment, metadata) {
    const updates = [];
    
    switch (stage) {
      case PAYMENT_STAGES.ACCOUNTS_VERIFICATION:
        updates.push(`accounts_verified_by = '${approverId}'::uuid`);
        updates.push(`accounts_verified_at = NOW()`);
        if (comment) updates.push(`accounts_verification_note = '${comment.replace(/'/g, "''")}'`);
        break;
        
      case PAYMENT_STAGES.ACCOUNTING_ENTRY_PENDING:
        updates.push(`accounting_entry_by = '${approverId}'::uuid`);
        updates.push(`accounting_entry_at = NOW()`);
        if (metadata.voucherNumber) {
          updates.push(`accounting_voucher_number = '${metadata.voucherNumber}'`);
        }
        break;
        
      case PAYMENT_STAGES.FINANCE_PENDING:
        updates.push(`finance_confirmed_by = '${approverId}'::uuid`);
        updates.push(`finance_confirmed_at = NOW()`);
        if (comment) updates.push(`finance_note = '${comment.replace(/'/g, "''")}'`);
        break;
        
      case PAYMENT_STAGES.CFO_PENDING:
        updates.push(`cfo_approved_by = '${approverId}'::uuid`);
        updates.push(`cfo_approved_at = NOW()`);
        if (comment) updates.push(`cfo_note = '${comment.replace(/'/g, "''")}'`);
        break;
        
      case PAYMENT_STAGES.BANKER_PENDING:
        updates.push(`banker_executed_by = '${approverId}'::uuid`);
        updates.push(`banker_executed_at = NOW()`);
        if (metadata.bankTransactionId) {
          updates.push(`bank_transaction_id = '${metadata.bankTransactionId}'`);
        }
        if (metadata.bankName) {
          updates.push(`bank_name = '${metadata.bankName}'`);
        }
        if (metadata.paymentMode) {
          updates.push(`payment_mode = '${metadata.paymentMode}'`);
        }
        break;
    }
    
    return {
      sql: updates.length > 0 ? updates.join(', ') + ',' : ''
    };
  }
  
  /**
   * Create approval audit log
   */
  async createApprovalLog(paymentRequestId, tenantId, data) {
    const approverInfo = data.actionBy ? await getUserInfo(data.actionBy) : null;
    
    await prisma.$executeRaw`
      INSERT INTO payment_request_approvals (
        payment_request_id, tenant_id, from_stage, to_stage, stage_order,
        action, action_by, action_by_name, action_by_role, action_by_level,
        comment, amount, metadata
      ) VALUES (
        ${paymentRequestId}, ${tenantId}::uuid, ${data.fromStage}, ${data.toStage},
        ${STAGE_ORDER[data.toStage] || 0},
        ${data.action}, ${data.actionBy}::uuid, 
        ${data.actionByName || approverInfo?.full_name || null},
        ${data.actionByRole || approverInfo?.role_name || null},
        ${data.actionByLevel || approverInfo?.business_level || null},
        ${data.comment || null}, ${data.amount || null},
        ${data.metadata ? JSON.stringify(data.metadata) : null}::jsonb
      )
    `;
  }
  
  /**
   * Get payment request with full workflow status
   */
  async getPaymentRequestStatus(paymentRequestId) {
    const pr = await prisma.$queryRaw`
      SELECT 
        pr.*,
        creator.full_name as creator_name,
        creator.email as creator_email,
        approver.full_name as current_approver_name,
        manager1.full_name as manager_1_name,
        manager2.full_name as manager_2_name
      FROM payment_requests pr
      LEFT JOIN users creator ON pr."createdById"::uuid = creator.id
      LEFT JOIN users approver ON pr.current_approver_id = approver.id
      LEFT JOIN users manager1 ON pr.creator_manager_id = manager1.id
      LEFT JOIN users manager2 ON pr.creator_manager_2_id = manager2.id
      WHERE pr.id = ${paymentRequestId}
    `;
    
    if (!pr || pr.length === 0) return null;
    
    // Get approval history
    const history = await prisma.$queryRaw`
      SELECT * FROM payment_request_approvals
      WHERE payment_request_id = ${paymentRequestId}
      ORDER BY action_at ASC
    `;
    
    // Get stage statuses
    const stages = await prisma.$queryRaw`
      SELECT * FROM payment_request_stages
      WHERE payment_request_id = ${paymentRequestId}
      ORDER BY stage_order ASC
    `;
    
    return {
      paymentRequest: pr[0],
      history,
      stages,
      displayNames: STAGE_DISPLAY_NAMES
    };
  }
  
  /**
   * Get pending payments for user
   */
  async getPendingPaymentsForUser(userId, tenantId, options = {}) {
    const { page = 1, limit = 50, status, search } = options;
    const offset = (page - 1) * limit;
    
    let statusFilter = '';
    if (status && status !== 'all') {
      statusFilter = `AND pr.workflow_status = '${status}'`;
    } else {
      statusFilter = `AND pr.workflow_status NOT IN ('DRAFT', 'PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED')`;
    }
    
    let searchFilter = '';
    if (search) {
      searchFilter = `AND (
        pr."requestId" ILIKE '%${search}%' 
        OR pr.purpose ILIKE '%${search}%'
        OR pr.beneficiary_name ILIKE '%${search}%'
        OR creator.full_name ILIKE '%${search}%'
      )`;
    }
    
    const userInfo = await getUserInfo(userId);
    const userLevel = userInfo?.business_level || 10;
    const isAdmin = userLevel >= 90;
    
    // Build visibility filter
    let visibilityFilter = '';
    if (isAdmin) {
      visibilityFilter = `AND pr.tenant_id = '${tenantId}'::uuid`;
    } else {
      visibilityFilter = `
        AND pr.tenant_id = '${tenantId}'::uuid
        AND (
          pr.current_approver_id = '${userId}'::uuid
          OR pr."createdById"::uuid = '${userId}'::uuid
        )
      `;
    }
    
    const payments = await prisma.$queryRawUnsafe(`
      SELECT 
        pr.id,
        pr."requestId" as request_id,
        pr."totalAmount" as amount,
        pr.currency,
        pr.purpose,
        pr.beneficiary_name,
        pr.workflow_status,
        pr.current_stage,
        pr.sla_deadline,
        pr.urgency_level,
        pr."createdAt" as created_at,
        
        creator.full_name as created_by_name,
        approver.full_name as current_approver_name,
        
        CASE 
          WHEN pr.sla_deadline IS NOT NULL AND pr.sla_deadline < NOW() 
          THEN true ELSE false 
        END as is_sla_breached,
        
        CASE WHEN pr.current_approver_id = '${userId}'::uuid THEN true ELSE false END as can_approve
        
      FROM payment_requests pr
      LEFT JOIN users creator ON pr."createdById"::uuid = creator.id
      LEFT JOIN users approver ON pr.current_approver_id = approver.id
      
      WHERE 1=1
      ${visibilityFilter}
      ${statusFilter}
      ${searchFilter}
      
      ORDER BY 
        CASE WHEN pr.sla_deadline < NOW() THEN 0 ELSE 1 END,
        pr.sla_deadline ASC NULLS LAST,
        pr."createdAt" DESC
        
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    // Get count
    const countResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int as count
      FROM payment_requests pr
      LEFT JOIN users creator ON pr."createdById"::uuid = creator.id
      WHERE 1=1
      ${visibilityFilter}
      ${statusFilter}
      ${searchFilter}
    `);
    
    return {
      payments,
      total: countResult[0]?.count || 0,
      page,
      limit,
      displayNames: STAGE_DISPLAY_NAMES
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const paymentWorkflowService = new PaymentWorkflowService();

module.exports = {
  paymentWorkflowService,
  PaymentWorkflowService,
  PAYMENT_STAGES,
  STAGE_ORDER,
  STAGE_DISPLAY_NAMES,
  ORIGIN_TYPES,
  AMOUNT_THRESHOLD,
  getUserManager,
  getUserManagerLevel2,
  determineWorkflow,
  getNextStage,
  getPreviousStage,
  canUserApprove,
  canUserReject,
  canUserSendBack
};
