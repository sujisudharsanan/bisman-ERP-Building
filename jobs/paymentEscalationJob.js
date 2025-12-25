/**
 * ============================================================================
 * PAYMENT REQUEST ESCALATION JOB
 * ============================================================================
 * 
 * Handles SLA-based escalation for payment requests:
 * - Monitors SLA deadlines for all active payment requests
 * - Escalates to higher authority on SLA breach
 * - Admin is final safety net
 * - Does NOT bypass steps, only reassigns to escalation target
 * 
 * Same escalation pattern as task escalation
 * 
 * @module jobs/paymentEscalationJob
 */

/* global require, module, console, process */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// ESCALATION TARGETS BY STAGE
// ============================================================================

const ESCALATION_TARGETS = {
  'MANAGER_APPROVAL': 'OPERATIONS_MANAGER',
  'MANAGER_2_APPROVAL': 'CFO',
  'ACCOUNTS_VERIFICATION': 'FINANCE_CONTROLLER',
  'ACCOUNTING_ENTRY_PENDING': 'ACCOUNTS_MANAGER',
  'FINANCE_PENDING': 'CFO',
  'CFO_PENDING': 'ADMIN',
  'BANKER_PENDING': 'CFO'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user by role in tenant
 */
async function getUserByRole(tenantId, roleName) {
  const rolePatterns = {
    'OPERATIONS_MANAGER': ['Operations Manager', 'General Manager'],
    'CFO': ['CFO', 'Chief Financial Officer'],
    'FINANCE_CONTROLLER': ['Finance Controller', 'Finance Manager'],
    'ACCOUNTS_MANAGER': ['Accounts Manager', 'Accounting Manager'],
    'ADMIN': ['Admin', 'Administrator']
  };
  
  const patterns = rolePatterns[roleName] || [roleName];
  
  for (const pattern of patterns) {
    const users = await prisma.$queryRaw`
      SELECT DISTINCT u.id, u.full_name, u.email, u.business_level
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.tenant_id = ${tenantId}::uuid
        AND u.deleted_at IS NULL
        AND u.status = 'active'
        AND r.name ILIKE ${`%${pattern}%`}
      ORDER BY u.business_level DESC
      LIMIT 1
    `;
    
    if (users.length > 0) return users[0];
  }
  
  // Final fallback: Get any admin
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
 * Send escalation notification
 */
async function sendEscalationNotification(paymentRequest, escalatedTo, reason) {
  // In a real system, this would send email/push notification
  console.log(`[ESCALATION] Payment ${paymentRequest.requestId} escalated to ${escalatedTo.full_name || escalatedTo.email}`);
  console.log(`[ESCALATION] Reason: ${reason}`);
  
  // Log to notifications table if it exists
  try {
    await prisma.$executeRaw`
      INSERT INTO notifications (
        tenant_id, user_id, type, title, message, 
        related_type, related_id, is_read, created_at
      ) VALUES (
        ${paymentRequest.tenant_id}::uuid,
        ${escalatedTo.id}::uuid,
        'PAYMENT_ESCALATION',
        ${'Payment Request Escalated to You'},
        ${`Payment request ${paymentRequest.requestId} (${paymentRequest.totalAmount}) has been escalated to you due to SLA breach.`},
        'payment_request',
        ${paymentRequest.id},
        false,
        NOW()
      )
    `;
  } catch (e) {
    // Notifications table may not exist
    console.log('[ESCALATION] Could not log notification:', e.message);
  }
}

// ============================================================================
// MAIN ESCALATION FUNCTION
// ============================================================================

/**
 * Check and escalate payment requests with breached SLAs
 */
async function runPaymentEscalation() {
  console.log('[PAYMENT ESCALATION] Starting escalation check...');
  
  try {
    // Find all payment requests with breached SLA that haven't been escalated yet
    const breachedRequests = await prisma.$queryRaw`
      SELECT 
        pr.id,
        pr."requestId",
        pr.tenant_id,
        pr.current_stage,
        pr.current_approver_id,
        pr."totalAmount",
        pr.sla_deadline,
        pr.escalated_at,
        approver.full_name as current_approver_name,
        approver.email as current_approver_email
      FROM payment_requests pr
      LEFT JOIN users approver ON pr.current_approver_id = approver.id
      WHERE pr.sla_deadline < NOW()
        AND pr.workflow_status NOT IN ('DRAFT', 'PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED')
        AND pr.escalated_at IS NULL
      ORDER BY pr.sla_deadline ASC
      LIMIT 100
    `;
    
    console.log(`[PAYMENT ESCALATION] Found ${breachedRequests.length} requests with breached SLA`);
    
    for (const pr of breachedRequests) {
      try {
        // Get escalation target for current stage
        const targetRole = ESCALATION_TARGETS[pr.current_stage] || 'ADMIN';
        const escalationTarget = await getUserByRole(pr.tenant_id, targetRole);
        
        if (!escalationTarget) {
          console.log(`[PAYMENT ESCALATION] No escalation target found for ${pr.requestId} at stage ${pr.current_stage}`);
          continue;
        }
        
        // Don't escalate to the same person
        if (escalationTarget.id === pr.current_approver_id) {
          console.log(`[PAYMENT ESCALATION] Escalation target same as current approver for ${pr.requestId}, skipping`);
          continue;
        }
        
        // Update payment request with escalation
        await prisma.$executeRaw`
          UPDATE payment_requests SET
            current_approver_id = ${escalationTarget.id}::uuid,
            escalated_at = NOW(),
            escalated_to = ${escalationTarget.id}::uuid,
            "updatedAt" = NOW()
          WHERE id = ${pr.id}
        `;
        
        // Update stage assignment
        await prisma.$executeRaw`
          UPDATE payment_request_stages SET
            assigned_to = ${escalationTarget.id}::uuid,
            escalated_at = NOW(),
            escalated_to = ${escalationTarget.id}::uuid,
            updated_at = NOW()
          WHERE payment_request_id = ${pr.id} AND stage = ${pr.current_stage}
        `;
        
        // Log escalation in audit trail
        await prisma.$executeRaw`
          INSERT INTO payment_request_approvals (
            payment_request_id, tenant_id, from_stage, to_stage, stage_order,
            action, action_by, action_by_name, action_by_role, action_at,
            comment, is_escalated, escalated_from, amount
          ) VALUES (
            ${pr.id}, ${pr.tenant_id}::uuid, ${pr.current_stage}, ${pr.current_stage}, 0,
            'escalate', ${escalationTarget.id}::uuid, 
            ${escalationTarget.full_name || 'System'},
            ${targetRole},
            NOW(),
            ${'SLA breached - auto-escalated'},
            true,
            ${pr.current_approver_id}::uuid,
            ${parseFloat(pr.totalAmount)}
          )
        `;
        
        // Send notification
        await sendEscalationNotification(pr, escalationTarget, 'SLA deadline breached');
        
        console.log(`[PAYMENT ESCALATION] Escalated ${pr.requestId} from ${pr.current_approver_name || 'unassigned'} to ${escalationTarget.full_name}`);
        
      } catch (prError) {
        console.error(`[PAYMENT ESCALATION] Error escalating ${pr.requestId}:`, prError.message);
      }
    }
    
    console.log('[PAYMENT ESCALATION] Escalation check completed');
    return { processed: breachedRequests.length };
    
  } catch (error) {
    console.error('[PAYMENT ESCALATION] Error:', error);
    throw error;
  }
}

// ============================================================================
// SECONDARY ESCALATION (for already escalated but still breached)
// ============================================================================

/**
 * Secondary escalation - escalate to admin if still stuck after first escalation
 */
async function runSecondaryEscalation() {
  console.log('[PAYMENT ESCALATION] Starting secondary escalation check...');
  
  try {
    // Find requests that were escalated more than 24 hours ago and still pending
    const stuckRequests = await prisma.$queryRaw`
      SELECT 
        pr.id,
        pr."requestId",
        pr.tenant_id,
        pr.current_stage,
        pr.current_approver_id,
        pr."totalAmount",
        pr.escalated_at,
        pr.escalated_to
      FROM payment_requests pr
      WHERE pr.escalated_at IS NOT NULL
        AND pr.escalated_at < NOW() - INTERVAL '24 hours'
        AND pr.workflow_status NOT IN ('DRAFT', 'PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED')
      ORDER BY pr.escalated_at ASC
      LIMIT 50
    `;
    
    console.log(`[PAYMENT ESCALATION] Found ${stuckRequests.length} requests for secondary escalation`);
    
    for (const pr of stuckRequests) {
      try {
        // Get admin as final escalation target
        const admin = await getUserByRole(pr.tenant_id, 'ADMIN');
        
        if (!admin || admin.id === pr.current_approver_id) {
          continue;
        }
        
        // Update to admin
        await prisma.$executeRaw`
          UPDATE payment_requests SET
            current_approver_id = ${admin.id}::uuid,
            escalated_at = NOW(),
            escalated_to = ${admin.id}::uuid,
            "updatedAt" = NOW()
          WHERE id = ${pr.id}
        `;
        
        await prisma.$executeRaw`
          UPDATE payment_request_stages SET
            assigned_to = ${admin.id}::uuid,
            escalated_at = NOW(),
            escalated_to = ${admin.id}::uuid,
            updated_at = NOW()
          WHERE payment_request_id = ${pr.id} AND stage = ${pr.current_stage}
        `;
        
        console.log(`[PAYMENT ESCALATION] Secondary escalation: ${pr.requestId} to Admin`);
        
      } catch (prError) {
        console.error(`[PAYMENT ESCALATION] Secondary escalation error for ${pr.requestId}:`, prError.message);
      }
    }
    
    console.log('[PAYMENT ESCALATION] Secondary escalation completed');
    return { processed: stuckRequests.length };
    
  } catch (error) {
    console.error('[PAYMENT ESCALATION] Secondary escalation error:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  runPaymentEscalation,
  runSecondaryEscalation,
  ESCALATION_TARGETS
};

// ============================================================================
// RUN DIRECTLY FOR TESTING
// ============================================================================

if (require.main === module) {
  (async () => {
    try {
      await runPaymentEscalation();
      await runSecondaryEscalation();
      process.exit(0);
    } catch (error) {
      console.error('Escalation job failed:', error);
      process.exit(1);
    }
  })();
}
