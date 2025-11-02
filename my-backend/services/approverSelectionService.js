/**
 * ============================================================================
 * SMART APPROVER SELECTION SERVICE
 * ============================================================================
 * 
 * Purpose:
 * - Intelligent approver selection based on multiple criteria
 * - Workload balancing across approvers
 * - Approval limit validation
 * - Support for requested approvers
 * 
 * Features:
 * - ✅ Honor requestedApprovers parameter
 * - ✅ Workload balancing (assign to least busy approver)
 * - ✅ Approval limit checks (amount-based routing)
 * - ✅ Enterprise Admin escalation for high-value requests
 * - ✅ Fallback to first approver if all else fails
 * 
 * Usage:
 * ```javascript
 * const selectedApprover = await selectBestApprover({
 *   approvers: availableApprovers,
 *   requestedApprovers: ['user-id-1', 'user-id-2'],
 *   paymentAmount: 50000,
 *   currentLevel: 0,
 *   prisma: prismaClient
 * });
 * ```
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');

/**
 * Select the best approver from a list based on multiple criteria
 * Priority order:
 * 1. Requested approvers (if specified)
 * 2. Approval limits (if configured per approver)
 * 3. Priority level (if configured)
 * 4. Workload balancing (assign to approver with least pending tasks)
 * 5. Fallback to first approver
 */
async function selectBestApprover(options) {
    const { 
        approvers = [], 
        requestedApprovers = [], 
        paymentAmount = 0,
        currentLevel = 0,
        prisma 
    } = options;

    if (!approvers || approvers.length === 0) {
        console.error('[ApproverSelection] No approvers available for selection');
        return null;
    }

    console.log(`[ApproverSelection] Selecting approver for level ${currentLevel}, amount: ₹${paymentAmount}`);
    console.log(`[ApproverSelection] Available approvers: ${approvers.length}`);
    console.log(`[ApproverSelection] Requested approvers: ${requestedApprovers.length}`);

    // Fetch approver configurations for these users
    const approverConfigs = await prisma.approverConfiguration.findMany({
        where: {
            userId: { in: approvers.map(a => a.id) },
            level: currentLevel,
            isActive: true
        }
    });

    const configMap = new Map(approverConfigs.map(c => [c.userId, c]));
    console.log(`[ApproverSelection] Found ${approverConfigs.length} approver configurations`);

    // STEP 1: Check if any requested approvers are available
    if (requestedApprovers && requestedApprovers.length > 0) {
        const requestedIds = requestedApprovers.map(r => typeof r === 'object' ? r.id : r);
        let matchingApprovers = approvers.filter(a => requestedIds.includes(a.id));
        
        // Filter by availability
        matchingApprovers = matchingApprovers.filter(a => {
            const config = configMap.get(a.id);
            return !config || config.isAvailable !== false;
        });
        
        if (matchingApprovers.length > 0) {
            // Still do workload check among requested approvers
            const selectedApprover = await selectByWorkload(matchingApprovers, prisma);
            console.log(`[ApproverSelection] ✅ Selected REQUESTED approver: ${selectedApprover.username} (${selectedApprover.id})`);
            await logApproverSelection({
                level: currentLevel,
                selectedApproverId: selectedApprover.id,
                requestedApprovers: requestedIds,
                availableApprovers: approvers.map(a => a.id),
                selectionMethod: 'REQUESTED',
                paymentAmount,
                approverWorkload: selectedApprover.pendingTasks,
                prisma
            });
            return selectedApprover;
        } else {
            console.log('[ApproverSelection] ⚠️ None of the requested approvers are available at this level');
        }
    }

    // STEP 2: Filter by approval limits (amount-based routing)
    let eligibleApprovers = approvers.filter(a => {
        const config = configMap.get(a.id);
        
        // Check if approver is available and auto-assign is enabled
        if (config && config.isAvailable === false) {
            console.log(`[ApproverSelection] ⏭️  Skipping ${a.username} - marked as unavailable`);
            return false;
        }
        
        if (config && config.autoAssign === false) {
            console.log(`[ApproverSelection] ⏭️  Skipping ${a.username} - auto-assign disabled`);
            return false;
        }
        
        // Check approval limit
        if (config && config.approvalLimit !== null && paymentAmount > 0) {
            const limit = parseFloat(config.approvalLimit);
            if (paymentAmount > limit) {
                console.log(`[ApproverSelection] ⏭️  Skipping ${a.username} - amount ₹${paymentAmount} exceeds limit ₹${limit}`);
                return false;
            }
        }
        
        return true;
    });

    if (eligibleApprovers.length === 0) {
        console.log('[ApproverSelection] ⚠️ No approvers eligible after approval limit filtering - using all');
        eligibleApprovers = approvers;
    } else {
        console.log(`[ApproverSelection] ${eligibleApprovers.length} approvers eligible after approval limit filtering`);
    }
    
    // STEP 3: Sort by priority (if configured)
    eligibleApprovers = eligibleApprovers.map(a => ({
        ...a,
        priority: configMap.get(a.id)?.priority || 0
    })).sort((a, b) => b.priority - a.priority);
    
    // STEP 4: Workload balancing - select approver with least pending tasks
    const selectedApprover = await selectByWorkload(eligibleApprovers, prisma);
    const config = configMap.get(selectedApprover.id);
    
    console.log(`[ApproverSelection] ✅ Selected WORKLOAD-BALANCED approver: ${selectedApprover.username} (${selectedApprover.id})`);
    console.log(`[ApproverSelection] Approver has ${selectedApprover.pendingTasks} pending tasks`);
    if (config?.priority) {
        console.log(`[ApproverSelection] Approver priority: ${config.priority}`);
    }
    if (config?.approvalLimit) {
        console.log(`[ApproverSelection] Approver limit: ₹${config.approvalLimit}`);
    }
    
    await logApproverSelection({
        level: currentLevel,
        selectedApproverId: selectedApprover.id,
        requestedApprovers: requestedApprovers.map(r => typeof r === 'object' ? r.id : r),
        availableApprovers: approvers.map(a => a.id),
        selectionMethod: 'WORKLOAD_BALANCED',
        paymentAmount,
        approverWorkload: selectedApprover.pendingTasks,
        prisma
    });
    
    return selectedApprover;
}

/**
 * Determine if Enterprise Admin escalation is needed
 * 
 * Escalation Criteria:
 * - Amount > ₹500,000
 * - Current level is L3 (Super Admin approved)
 * - Enterprise Admin approval configured
 */
async function shouldEscalateToEnterpriseAdmin(options) {
    const {
        paymentAmount,
        currentLevel,
        prisma
    } = options;

    // Check if L4 (Enterprise Admin) level is configured
    const enterpriseAdminLevel = await prisma.approvalLevel.findFirst({
        where: {
            level: 3, // L4 in 0-indexed system
            roleName: 'ENTERPRISE_ADMIN',
            isActive: true
        }
    });

    if (!enterpriseAdminLevel) {
        return false;
    }

    // Escalate if amount exceeds threshold
    const escalationThreshold = 500000; // ₹5 lakh
    
    if (paymentAmount > escalationThreshold && currentLevel === 2) {
        console.log(`[Escalation] Amount ₹${paymentAmount} exceeds threshold ₹${escalationThreshold}, escalating to Enterprise Admin`);
        return true;
    }

    return false;
}

/**
 * Get Enterprise Admin approvers
 */
async function getEnterpriseAdminApprovers(prisma) {
    const enterpriseAdmins = await prisma.user.findMany({
        where: {
            role: 'ENTERPRISE_ADMIN',
            is_active: true
        },
        select: {
            id: true,
            username: true,
            email: true
        }
    });

    if (enterpriseAdmins.length === 0) {
        console.warn('[ApproverSelection] No Enterprise Admins found, cannot escalate');
        return null;
    }

    return enterpriseAdmins;
}

/**
 * Enhanced approver selection with all features
 * 
 * This is the main function to use for approver selection
 */
async function selectApproverWithEscalation(options) {
    const {
        approvers,
        requestedApprovers,
        paymentAmount,
        currentLevel,
        prisma
    } = options;

    // Check if Enterprise Admin escalation is needed
    const needsEscalation = await shouldEscalateToEnterpriseAdmin({
        paymentAmount,
        currentLevel,
        prisma
    });

    if (needsEscalation) {
        const enterpriseAdmins = await getEnterpriseAdminApprovers(prisma);
        
        if (enterpriseAdmins && enterpriseAdmins.length > 0) {
            // Use smart selection even for Enterprise Admins
            return await selectBestApprover({
                approvers: enterpriseAdmins,
                requestedApprovers: [], // Enterprise Admin assignment is automatic
                paymentAmount,
                currentLevel: 3, // L4
                prisma
            });
        }
    }

    // Standard smart selection
    return await selectBestApprover({
        approvers,
        requestedApprovers,
        paymentAmount,
        currentLevel,
        prisma
    });
}

/**
 * Get statistics for approver workload (for monitoring/dashboard)
 */
async function getApproverWorkloadStats(prisma) {
    const approvers = await prisma.user.findMany({
        where: {
            role: {
                in: ['MANAGER', 'ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN']
            },
            is_active: true
        },
        select: {
            id: true,
            username: true,
            email: true,
            role: true
        }
    });

    const stats = await Promise.all(
        approvers.map(async (approver) => {
            const [pending, approved, rejected] = await Promise.all([
                prisma.task.count({
                    where: { assigneeId: approver.id, status: 'PENDING' }
                }),
                prisma.approval.count({
                    where: { approverId: approver.id, action: 'APPROVED' }
                }),
                prisma.approval.count({
                    where: { approverId: approver.id, action: 'REJECTED' }
                })
            ]);

            return {
                approver: {
                    id: approver.id,
                    username: approver.username,
                    email: approver.email,
                    role: approver.role
                },
                pendingTasks: pending,
                totalApproved: approved,
                totalRejected: rejected,
                approvalRate: approved + rejected > 0 
                    ? ((approved / (approved + rejected)) * 100).toFixed(2) 
                    : 0
            };
        })
    );

    return stats;
}

/**
 * Log approver selection for audit trail
 */
async function logApproverSelection(options) {
    const {
        taskId = null,
        paymentRequestId = null,
        level,
        selectedApproverId,
        requestedApprovers = [],
        availableApprovers = [],
        selectionMethod,
        paymentAmount,
        approverWorkload,
        metadata = {},
        prisma
    } = options;

    try {
        await prisma.approverSelectionLog.create({
            data: {
                id: require('crypto').randomUUID(),
                taskId,
                paymentRequestId,
                level,
                selectedApproverId,
                requestedApprovers,
                availableApprovers,
                selectionMethod,
                paymentAmount,
                approverWorkload,
                metadata
            }
        });
    } catch (error) {
        // Don't fail the main operation if logging fails
        console.error('[ApproverSelection] Error logging selection:', error.message);
    }
}

module.exports = {
    selectBestApprover,
    shouldEscalateToEnterpriseAdmin,
    getEnterpriseAdminApprovers,
    selectApproverWithEscalation,
    getApproverWorkloadStats
};
