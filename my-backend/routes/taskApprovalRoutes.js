/**
 * ============================================================================
 * TASK APPROVAL PAGE API
 * ============================================================================
 * 
 * ENTERPRISE GOVERNANCE PRINCIPLE:
 * This page represents AUTHORITY, not WORKLOAD.
 * 
 * "Show me all tasks that require MY decision, review, or acknowledgment."
 * 
 * VISIBILITY RULES:
 * - L1-L5 (Staff/Officers): See ONLY tasks awaiting their approval
 * - L6-L8 (Managers/Dept Heads): See tasks awaiting approval + subordinate completions for review
 * - L9-L10 (Admin/Super Admin): See ALL tasks, ALL departments, control tower view
 * 
 * CRITICAL: No cross-department visibility for non-admins.
 * Visibility is enforced at QUERY level, not frontend filtering.
 * 
 * @module routes/taskApprovalRoutes
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getBusinessLevelFromRole } = require('../lib/businessHierarchy');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Attach user business level and department context
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

  // Get business level from role
  req.userLevel = user.businessLevel || user.business_level || getBusinessLevelFromRole(user.role || user.roleName) || 1;
  req.userId = user.id;
  req.tenantId = user.tenantId || user.tenant_id || user.enterpriseId;
  req.departmentId = user.departmentId || user.department_id || null;
  req.hubId = user.hubId || user.hub_id || null;
  req.isAdmin = req.userLevel >= 9;
  
  next();
}

router.use(attachUserContext);

// ============================================================================
// MAIN TASK APPROVAL QUEUE
// ============================================================================

/**
 * GET /api/task-approvals
 * 
 * Get tasks requiring the user's decision, review, or acknowledgment.
 * 
 * VISIBILITY RULES (enforced at query level):
 * - U is the current approver
 * - U is the completion reviewer  
 * - U is the escalation target
 * - U is Admin (L9+) → sees everything
 * 
 * Query Params:
 * - status: 'pending' | 'completed' | 'escalated' | 'all'
 * - department: UUID (Admin only)
 * - slaBreached: boolean
 * - confidential: boolean
 * - entityType: 'payment_request' | 'expense_claim' | etc.
 * - page: number (default 1)
 * - limit: number (default 50)
 */
router.get('/', async (req, res) => {
  try {
    const { 
      status = 'all',
      department,
      slaBreached,
      confidential,
      entityType,
      page = 1,
      limit = 50,
      search
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.userId;
    const tenantId = req.tenantId;
    const userLevel = req.userLevel;
    const userDepartmentId = req.departmentId;
    const isAdmin = req.isAdmin;

    // Build the visibility filter based on role
    // CRITICAL: This is where governance is enforced
    let visibilityFilter = '';
    
    if (isAdmin) {
      // L9+ sees everything in the tenant
      visibilityFilter = `AND ai.tenant_id = '${tenantId}'::uuid`;
      
      // Admin can filter by department
      if (department && department !== 'all') {
        visibilityFilter += ` AND pr.department_id = '${department}'::uuid`;
      }
    } else if (userLevel >= 6 && userLevel <= 8) {
      // L6-L8: See tasks where they are approver, reviewer, or escalation target
      // AND tasks from direct subordinates requiring review
      // RESTRICTED to their department only
      visibilityFilter = `
        AND ai.tenant_id = '${tenantId}'::uuid
        AND (
          -- User is current approver
          asi.resolved_approver_id = '${userId}'::uuid
          -- User is escalation target
          OR asi.escalated_to = '${userId}'::uuid
          -- User is completion reviewer (L6-L8 can see completed tasks from subordinates)
          OR (
            asi.status = 'approved' 
            AND EXISTS (
              SELECT 1 FROM users u 
              WHERE u.id = ai.initiated_by 
              AND u.reports_to = '${userId}'::uuid
            )
          )
        )
        ${userDepartmentId ? `AND (pr.department_id = '${userDepartmentId}'::uuid OR pr.department_id IS NULL)` : ''}
      `;
    } else {
      // L1-L5: See ONLY tasks awaiting their approval
      // NO department-wide visibility, NO subordinate visibility
      visibilityFilter = `
        AND ai.tenant_id = '${tenantId}'::uuid
        AND (
          asi.resolved_approver_id = '${userId}'::uuid
          OR asi.escalated_to = '${userId}'::uuid
        )
      `;
    }

    // Status filter
    let statusFilter = '';
    if (status === 'pending') {
      statusFilter = `AND asi.status = 'active'`;
    } else if (status === 'completed') {
      statusFilter = `AND asi.status = 'approved'`;
    } else if (status === 'escalated') {
      statusFilter = `AND asi.escalated_at IS NOT NULL`;
    } else if (status === 'rejected') {
      statusFilter = `AND asi.status = 'rejected'`;
    }

    // SLA breach filter
    let slaFilter = '';
    if (slaBreached === 'true') {
      slaFilter = `AND asi.due_at < NOW() AND asi.status = 'active'`;
    }

    // Confidential filter
    let confidentialFilter = '';
    if (!isAdmin) {
      // Non-admins cannot see confidential tasks unless explicitly allowed
      confidentialFilter = `
        AND (
          COALESCE((pr.metadata->>'is_confidential')::boolean, false) = false
          OR '${userId}'::text = ANY(COALESCE(ARRAY(SELECT jsonb_array_elements_text(pr.metadata->'allowed_viewers')), ARRAY[]::text[]))
        )
      `;
    } else if (confidential === 'true') {
      confidentialFilter = `AND COALESCE((pr.metadata->>'is_confidential')::boolean, false) = true`;
    }

    // Entity type filter
    let entityTypeFilter = '';
    if (entityType && entityType !== 'all') {
      entityTypeFilter = `AND ai.entity_type = '${entityType}'`;
    }

    // Search filter
    let searchFilter = '';
    if (search && search.trim()) {
      const searchTerm = search.trim().replace(/'/g, "''");
      searchFilter = `
        AND (
          ai.entity_reference ILIKE '%${searchTerm}%'
          OR creator.full_name ILIKE '%${searchTerm}%'
          OR creator.email ILIKE '%${searchTerm}%'
          OR aws.name ILIKE '%${searchTerm}%'
        )
      `;
    }

    // Main query: Get tasks for approval page
    const query = `
      SELECT 
        ai.id as "taskId",
        ai.entity_id as "entityId",
        ai.entity_type as "entityType",
        ai.entity_reference as "taskTitle",
        ai.status as "workflowStatus",
        ai.requested_amount as "amount",
        ai.created_at as "createdAt",
        ai.initiated_at as "initiatedAt",
        
        -- Creator info
        ai.initiated_by as "createdById",
        COALESCE(creator.full_name, creator.email, 'Unknown') as "createdByName",
        creator.email as "createdByEmail",
        creator_role.name as "createdByRole",
        
        -- Department info
        pr.department_id as "departmentId",
        dept.name as "departmentName",
        
        -- Current stage info
        asi.id as "stageInstanceId",
        asi.status as "stageStatus",
        asi.stage_order as "currentStageOrder",
        aws.name as "currentStageName",
        aws.assigned_role as "assignedRole",
        
        -- Approver info
        asi.resolved_approver_id as "approverId",
        COALESCE(approver.full_name, approver.email, 'Unassigned') as "approverName",
        
        -- SLA info
        asi.due_at as "slaDeadline",
        CASE 
          WHEN asi.due_at IS NOT NULL AND asi.due_at < NOW() AND asi.status = 'active'
          THEN true ELSE false 
        END as "slaBreach",
        CASE 
          WHEN asi.due_at IS NOT NULL AND asi.status = 'active'
          THEN EXTRACT(EPOCH FROM (asi.due_at - NOW())) / 3600
          ELSE NULL
        END as "hoursToDeadline",
        
        -- Escalation info
        asi.escalated_at as "escalatedAt",
        asi.escalated_to as "escalatedToId",
        COALESCE(escalated_user.full_name, escalated_user.email) as "escalatedToName",
        
        -- Fallback info
        asi.fallback_applied as "fallbackApplied",
        asi.fallback_reason as "fallbackReason",
        
        -- Confidential flag
        COALESCE((pr.metadata->>'is_confidential')::boolean, false) as "isConfidential",
        
        -- Workflow progress
        (SELECT COUNT(*) FROM approval_stage_instances WHERE approval_instance_id = ai.id)::int as "totalStages",
        (SELECT COUNT(*) FROM approval_stage_instances WHERE approval_instance_id = ai.id AND status = 'approved')::int as "approvedStages",
        
        -- Action authority for this user
        CASE WHEN asi.resolved_approver_id = '${userId}'::uuid THEN true ELSE false END as "canApprove",
        CASE WHEN asi.resolved_approver_id = '${userId}'::uuid THEN true ELSE false END as "canReject",
        CASE WHEN ${userLevel} >= 9 THEN true ELSE false END as "canOverride",
        
        -- Days in queue
        EXTRACT(DAY FROM NOW() - ai.created_at)::int as "daysInQueue"
        
      FROM approval_instances ai
      JOIN approval_stage_instances asi ON asi.approval_instance_id = ai.id AND asi.status = 'active'
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      LEFT JOIN users creator ON ai.initiated_by = creator.id
      LEFT JOIN user_roles ur ON creator.id = ur.user_id AND ur.is_primary = true
      LEFT JOIN roles creator_role ON ur.role_id = creator_role.id
      LEFT JOIN users approver ON asi.resolved_approver_id = approver.id
      LEFT JOIN users escalated_user ON asi.escalated_to = escalated_user.id
      LEFT JOIN payment_requests pr ON ai.entity_type = 'payment_request' AND ai.entity_id = pr.id
      LEFT JOIN departments dept ON pr.department_id = dept.id
      
      WHERE 1=1
      ${visibilityFilter}
      ${statusFilter}
      ${slaFilter}
      ${confidentialFilter}
      ${entityTypeFilter}
      ${searchFilter}
      
      ORDER BY 
        -- Priority: SLA breaches first, then by deadline, then by creation date
        CASE WHEN asi.due_at < NOW() AND asi.status = 'active' THEN 0 ELSE 1 END,
        asi.due_at ASC NULLS LAST,
        ai.created_at DESC
      
      LIMIT ${parseInt(limit)}
      OFFSET ${offset}
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT ai.id) as count
      FROM approval_instances ai
      JOIN approval_stage_instances asi ON asi.approval_instance_id = ai.id AND asi.status = 'active'
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      LEFT JOIN users creator ON ai.initiated_by = creator.id
      LEFT JOIN payment_requests pr ON ai.entity_type = 'payment_request' AND ai.entity_id = pr.id
      LEFT JOIN departments dept ON pr.department_id = dept.id
      
      WHERE 1=1
      ${visibilityFilter}
      ${statusFilter}
      ${slaFilter}
      ${confidentialFilter}
      ${entityTypeFilter}
      ${searchFilter}
    `;

    const [tasks, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(query),
      prisma.$queryRawUnsafe(countQuery)
    ]);

    const total = parseInt(countResult[0]?.count || 0);

    // Get summary stats
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE asi.status = 'active') as "pendingCount",
        COUNT(*) FILTER (WHERE asi.status = 'approved') as "approvedCount",
        COUNT(*) FILTER (WHERE asi.status = 'rejected') as "rejectedCount",
        COUNT(*) FILTER (WHERE asi.escalated_at IS NOT NULL) as "escalatedCount",
        COUNT(*) FILTER (WHERE asi.due_at < NOW() AND asi.status = 'active') as "slaBreach"
      FROM approval_instances ai
      JOIN approval_stage_instances asi ON asi.approval_instance_id = ai.id
      WHERE 1=1 ${visibilityFilter}
    `;

    const stats = await prisma.$queryRawUnsafe(statsQuery);

    res.json({
      success: true,
      data: {
        tasks,
        total,
        stats: stats[0] || {},
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
          hasMore: offset + tasks.length < total
        }
      },
      meta: {
        userLevel,
        isAdmin,
        departmentRestricted: !isAdmin && userDepartmentId,
        visibilityScope: isAdmin ? 'all' : userLevel >= 6 ? 'department_subordinates' : 'personal_only'
      }
    });
  } catch (error) {
    console.error('[TaskApproval] Error fetching task approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task approvals',
      message: error.message,
      code: 'FETCH_ERROR'
    });
  }
});

// ============================================================================
// TASK DETAIL WITH FULL TIMELINE
// ============================================================================

/**
 * GET /api/task-approvals/:instanceId
 * 
 * Get detailed task approval info with full timeline.
 * Only visible if user has authority over this task.
 */
router.get('/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = req.userId;
    const tenantId = req.tenantId;
    const userLevel = req.userLevel;
    const isAdmin = req.isAdmin;
    const userDepartmentId = req.departmentId;

    // Get instance with authorization check
    const instanceQuery = `
      SELECT 
        ai.id,
        ai.tenant_id as "tenantId",
        ai.entity_type as "entityType",
        ai.entity_id as "entityId",
        ai.entity_reference as "entityReference",
        ai.status,
        ai.requested_amount as "amount",
        ai.created_at as "createdAt",
        ai.initiated_at as "initiatedAt",
        ai.completed_at as "completedAt",
        ai.initiated_by as "initiatedBy",
        ai.current_stage_order as "currentStageOrder",
        ai.rejection_count as "rejectionCount",
        ai.last_rejection_reason as "lastRejectionReason",
        
        -- Creator info
        COALESCE(creator.full_name, creator.email) as "createdByName",
        creator.email as "createdByEmail",
        
        -- Department
        pr.department_id as "departmentId",
        
        -- Confidential check
        COALESCE((pr.metadata->>'is_confidential')::boolean, false) as "isConfidential",
        ARRAY(SELECT jsonb_array_elements_text(pr.metadata->'allowed_viewers')) as "allowedViewers"
        
      FROM approval_instances ai
      LEFT JOIN users creator ON ai.initiated_by = creator.id
      LEFT JOIN payment_requests pr ON ai.entity_type = 'payment_request' AND ai.entity_id = pr.id
      WHERE ai.id = '${instanceId}'::uuid
    `;

    const instances = await prisma.$queryRawUnsafe(instanceQuery);
    
    if (instances.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Approval instance not found',
        code: 'NOT_FOUND'
      });
    }

    const instance = instances[0];

    // Authorization check
    if (instance.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Different tenant',
        code: 'TENANT_MISMATCH'
      });
    }

    // Confidential check for non-admins
    if (!isAdmin && instance.isConfidential) {
      const allowedViewers = instance.allowedViewers || [];
      if (!allowedViewers.includes(userId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Confidential task',
          code: 'CONFIDENTIAL_ACCESS_DENIED'
        });
      }
    }

    // Department check for non-admins (L6-L8)
    if (!isAdmin && userLevel >= 6 && userLevel <= 8 && userDepartmentId) {
      if (instance.departmentId && instance.departmentId !== userDepartmentId) {
        // Check if user is approver or escalation target
        const hasAccessQuery = `
          SELECT 1 FROM approval_stage_instances asi
          WHERE asi.approval_instance_id = '${instanceId}'::uuid
          AND (asi.resolved_approver_id = '${userId}'::uuid OR asi.escalated_to = '${userId}'::uuid)
          LIMIT 1
        `;
        const hasAccess = await prisma.$queryRawUnsafe(hasAccessQuery);
        if (hasAccess.length === 0) {
          return res.status(403).json({
            success: false,
            error: 'Access denied: Cross-department restriction',
            code: 'CROSS_DEPARTMENT_DENIED'
          });
        }
      }
    }

    // For L1-L5, verify they are approver or escalation target
    if (userLevel < 6) {
      const hasAccessQuery = `
        SELECT 1 FROM approval_stage_instances asi
        WHERE asi.approval_instance_id = '${instanceId}'::uuid
        AND (asi.resolved_approver_id = '${userId}'::uuid OR asi.escalated_to = '${userId}'::uuid)
        LIMIT 1
      `;
      const hasAccess = await prisma.$queryRawUnsafe(hasAccessQuery);
      if (hasAccess.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You are not an approver for this task',
          code: 'NOT_APPROVER'
        });
      }
    }

    // Get all stages with timeline
    const stagesQuery = `
      SELECT 
        asi.id as "stageInstanceId",
        asi.stage_order as "stageOrder",
        asi.status,
        asi.resolved_approver_id as "approverId",
        asi.resolved_via as "resolvedVia",
        asi.fallback_applied as "fallbackApplied",
        asi.fallback_reason as "fallbackReason",
        asi.actioned_by as "actionedBy",
        asi.actioned_at as "actionedAt",
        asi.action_comment as "actionComment",
        asi.activated_at as "activatedAt",
        asi.due_at as "dueAt",
        asi.escalated_at as "escalatedAt",
        asi.escalated_to as "escalatedTo",
        
        -- Stage definition
        aws.name as "stageName",
        aws.code as "stageCode",
        aws.assigned_role as "assignedRole",
        aws.sla_hours as "slaHours",
        
        -- Approver info
        COALESCE(approver.full_name, approver.email, 'Unassigned') as "approverName",
        approver.email as "approverEmail",
        
        -- Actioner info (who actually approved/rejected)
        COALESCE(actioner.full_name, actioner.email) as "actionerName",
        actioner.email as "actionerEmail",
        
        -- Escalated to info
        COALESCE(esc_user.full_name, esc_user.email) as "escalatedToName",
        
        -- Time tracking
        CASE 
          WHEN asi.actioned_at IS NOT NULL AND asi.activated_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (asi.actioned_at - asi.activated_at)) / 3600
          ELSE NULL
        END as "hoursAtStage"
        
      FROM approval_stage_instances asi
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      LEFT JOIN users approver ON asi.resolved_approver_id = approver.id
      LEFT JOIN users actioner ON asi.actioned_by = actioner.id
      LEFT JOIN users esc_user ON asi.escalated_to = esc_user.id
      WHERE asi.approval_instance_id = '${instanceId}'::uuid
      ORDER BY asi.stage_order ASC
    `;

    const stages = await prisma.$queryRawUnsafe(stagesQuery);

    // Get audit log (Admin sees override logs too)
    let auditQuery = `
      SELECT 
        aal.id,
        aal.action_type as "actionType",
        aal.performed_by as "performedById",
        COALESCE(u.full_name, u.email) as "performedByName",
        aal.comment,
        aal.metadata,
        aal.created_at as "createdAt",
        aal.is_override_action as "isOverride",
        aal.override_type as "overrideType"
      FROM approval_audit_log aal
      LEFT JOIN users u ON aal.performed_by = u.id
      WHERE aal.approval_instance_id = '${instanceId}'::uuid
    `;

    // Non-admins don't see override details
    if (!isAdmin) {
      auditQuery += ` AND (aal.is_override_action IS NULL OR aal.is_override_action = false)`;
    }

    auditQuery += ` ORDER BY aal.created_at ASC`;

    const auditLog = await prisma.$queryRawUnsafe(auditQuery);

    // Get current user's action permissions
    const currentStage = stages.find(s => s.status === 'active');
    const canApprove = currentStage && currentStage.approverId === userId;
    const canReject = canApprove;
    const canRequestRework = instance.status === 'completed_pending_review' && stages.some(
      s => s.actionedBy === userId || (userLevel > (parseInt(stages[0]?.assignedRole?.match(/L(\d+)/)?.[1]) || 1))
    );
    const canOverride = isAdmin;

    res.json({
      success: true,
      data: {
        instance: {
          ...instance,
          allowedViewers: isAdmin ? instance.allowedViewers : undefined // Only admin sees this
        },
        stages,
        auditLog: isAdmin ? auditLog : auditLog.map(a => ({
          ...a,
          overrideType: undefined,
          isOverride: undefined
        })),
        currentStage,
        permissions: {
          canApprove,
          canReject,
          canRequestRework,
          canOverride,
          canViewTimeline: true,
          canViewOverrideLogs: isAdmin
        }
      },
      meta: {
        userLevel,
        isAdmin
      }
    });
  } catch (error) {
    console.error('[TaskApproval] Error fetching task detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task details',
      message: error.message,
      code: 'FETCH_ERROR'
    });
  }
});

// ============================================================================
// APPROVAL ACTIONS
// ============================================================================

/**
 * POST /api/task-approvals/:instanceId/approve
 * 
 * Approve the current active stage.
 */
router.post('/:instanceId/approve', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { comment, metadata } = req.body;
    const userId = req.userId;
    const tenantId = req.tenantId;

    // Get active stage
    const stageQuery = `
      SELECT asi.id, asi.resolved_approver_id, asi.status, ai.tenant_id
      FROM approval_stage_instances asi
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      WHERE asi.approval_instance_id = '${instanceId}'::uuid
      AND asi.status = 'active'
      LIMIT 1
    `;

    const stages = await prisma.$queryRawUnsafe(stageQuery);
    
    if (stages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active stage found for approval',
        code: 'NO_ACTIVE_STAGE'
      });
    }

    const stage = stages[0];

    // Authorization check
    if (stage.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'TENANT_MISMATCH'
      });
    }

    if (stage.resolved_approver_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to approve this stage',
        code: 'NOT_AUTHORIZED'
      });
    }

    // Import and use the approval workflow service
    const { approvalWorkflowService } = require('../src/services/ApprovalWorkflowService');

    const result = await approvalWorkflowService.processAction({
      stageInstanceId: stage.id,
      action: 'approve',
      actorId: userId,
      comment,
      metadata
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: 'APPROVAL_FAILED'
      });
    }

    // Log to audit
    await prisma.$executeRaw`
      INSERT INTO approval_audit_log (
        approval_instance_id, action_type, performed_by, comment, metadata, created_at
      ) VALUES (
        ${instanceId}::uuid, 'stage_approved', ${userId}::uuid, ${comment || null}, 
        ${JSON.stringify(metadata || {})}::jsonb, NOW()
      )
    `;

    res.json({
      success: true,
      data: {
        instanceId,
        workflowCompleted: result.workflowCompleted,
        nextStageId: result.nextStageId,
        message: result.workflowCompleted 
          ? 'Workflow approved and completed' 
          : 'Stage approved, moved to next stage'
      }
    });
  } catch (error) {
    console.error('[TaskApproval] Approve error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process approval',
      message: error.message,
      code: 'APPROVAL_ERROR'
    });
  }
});

/**
 * POST /api/task-approvals/:instanceId/reject
 * 
 * Reject the current active stage.
 */
router.post('/:instanceId/reject', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { comment, reason } = req.body;
    const userId = req.userId;
    const tenantId = req.tenantId;

    if (!comment && !reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
        code: 'REASON_REQUIRED'
      });
    }

    // Get active stage
    const stageQuery = `
      SELECT asi.id, asi.resolved_approver_id, asi.status, ai.tenant_id
      FROM approval_stage_instances asi
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      WHERE asi.approval_instance_id = '${instanceId}'::uuid
      AND asi.status = 'active'
      LIMIT 1
    `;

    const stages = await prisma.$queryRawUnsafe(stageQuery);
    
    if (stages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active stage found for rejection',
        code: 'NO_ACTIVE_STAGE'
      });
    }

    const stage = stages[0];

    // Authorization check
    if (stage.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied', code: 'TENANT_MISMATCH' });
    }

    if (stage.resolved_approver_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to reject this stage',
        code: 'NOT_AUTHORIZED'
      });
    }

    const { approvalWorkflowService } = require('../src/services/ApprovalWorkflowService');

    const result = await approvalWorkflowService.processAction({
      stageInstanceId: stage.id,
      action: 'reject',
      actorId: userId,
      comment: comment || reason
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: 'REJECTION_FAILED'
      });
    }

    // Log to audit
    await prisma.$executeRaw`
      INSERT INTO approval_audit_log (
        approval_instance_id, action_type, performed_by, comment, created_at
      ) VALUES (
        ${instanceId}::uuid, 'stage_rejected', ${userId}::uuid, ${comment || reason}, NOW()
      )
    `;

    res.json({
      success: true,
      data: {
        instanceId,
        workflowRejected: result.workflowRejected,
        message: result.workflowRejected 
          ? 'Workflow rejected' 
          : 'Stage rejected'
      }
    });
  } catch (error) {
    console.error('[TaskApproval] Reject error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process rejection',
      message: error.message,
      code: 'REJECTION_ERROR'
    });
  }
});

/**
 * POST /api/task-approvals/:instanceId/request-rework
 * 
 * Request rework on a completed task (completion review stage).
 */
router.post('/:instanceId/request-rework', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { comment, reason } = req.body;
    const userId = req.userId;
    const tenantId = req.tenantId;

    if (!comment && !reason) {
      return res.status(400).json({
        success: false,
        error: 'Rework reason is required',
        code: 'REASON_REQUIRED'
      });
    }

    // Verify instance is in review state and user has authority
    const instanceQuery = `
      SELECT ai.id, ai.status, ai.tenant_id, ai.initiated_by
      FROM approval_instances ai
      WHERE ai.id = '${instanceId}'::uuid
    `;

    const instances = await prisma.$queryRawUnsafe(instanceQuery);
    
    if (instances.length === 0) {
      return res.status(404).json({ success: false, error: 'Instance not found', code: 'NOT_FOUND' });
    }

    const instance = instances[0];

    if (instance.tenant_id !== tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied', code: 'TENANT_MISMATCH' });
    }

    // Check if user is a reviewer/superior of the task creator
    const creatorQuery = `
      SELECT u.reports_to FROM users u WHERE u.id = '${instance.initiated_by}'::uuid
    `;
    const creatorInfo = await prisma.$queryRawUnsafe(creatorQuery);
    
    if (creatorInfo.length === 0 || creatorInfo[0].reports_to !== userId) {
      // Check if admin
      if (req.userLevel < 9) {
        return res.status(403).json({
          success: false,
          error: 'You are not authorized to request rework on this task',
          code: 'NOT_REVIEWER'
        });
      }
    }

    // Update instance to request rework
    await prisma.$executeRaw`
      UPDATE approval_instances 
      SET status = 'rework_requested', 
          last_rejection_reason = ${comment || reason},
          updated_at = NOW()
      WHERE id = ${instanceId}::uuid
    `;

    // Log to audit
    await prisma.$executeRaw`
      INSERT INTO approval_audit_log (
        approval_instance_id, action_type, performed_by, comment, created_at
      ) VALUES (
        ${instanceId}::uuid, 'rework_requested', ${userId}::uuid, ${comment || reason}, NOW()
      )
    `;

    res.json({
      success: true,
      data: {
        instanceId,
        message: 'Rework requested successfully'
      }
    });
  } catch (error) {
    console.error('[TaskApproval] Request rework error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request rework',
      message: error.message,
      code: 'REWORK_ERROR'
    });
  }
});

/**
 * POST /api/task-approvals/:instanceId/override
 * 
 * Admin override action (approve all pending stages).
 * REQUIRES: L9+ and mandatory comment.
 */
router.post('/:instanceId/override', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { comment, overrideType } = req.body;
    const userId = req.userId;
    const tenantId = req.tenantId;
    const userLevel = req.userLevel;

    // Admin only
    if (userLevel < 9) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for override',
        code: 'ADMIN_REQUIRED'
      });
    }

    // Mandatory comment
    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Override requires a detailed comment (minimum 10 characters)',
        code: 'COMMENT_REQUIRED'
      });
    }

    // Verify instance
    const instanceQuery = `
      SELECT ai.id, ai.tenant_id, ai.status
      FROM approval_instances ai
      WHERE ai.id = '${instanceId}'::uuid
    `;

    const instances = await prisma.$queryRawUnsafe(instanceQuery);
    
    if (instances.length === 0) {
      return res.status(404).json({ success: false, error: 'Instance not found', code: 'NOT_FOUND' });
    }

    if (instances[0].tenant_id !== tenantId) {
      return res.status(403).json({ success: false, error: 'Access denied', code: 'TENANT_MISMATCH' });
    }

    const { approvalWorkflowService } = require('../src/services/ApprovalWorkflowService');

    const result = await approvalWorkflowService.approveAllFallbackStages(
      instanceId,
      userId,
      `[ADMIN OVERRIDE: ${overrideType || 'executive_override'}] ${comment}`
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        code: 'OVERRIDE_FAILED'
      });
    }

    // Log override to audit with special flags
    await prisma.$executeRaw`
      INSERT INTO approval_audit_log (
        approval_instance_id, action_type, performed_by, comment, 
        is_override_action, override_type, actor_business_level, created_at
      ) VALUES (
        ${instanceId}::uuid, 'admin_override', ${userId}::uuid, ${comment},
        true, ${overrideType || 'executive_override'}, ${userLevel}, NOW()
      )
    `;

    res.json({
      success: true,
      data: {
        instanceId,
        approvedCount: result.approvedCount,
        message: `Override completed. ${result.approvedCount} stages approved.`
      }
    });
  } catch (error) {
    console.error('[TaskApproval] Override error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process override',
      message: error.message,
      code: 'OVERRIDE_ERROR'
    });
  }
});

// ============================================================================
// ADMIN FEATURES
// ============================================================================

/**
 * GET /api/task-approvals/admin/departments
 * 
 * Get department list for admin filtering.
 */
router.get('/admin/departments', async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    const tenantId = req.tenantId;

    const departments = await prisma.$queryRaw`
      SELECT id, name, code
      FROM departments
      WHERE tenant_id = ${tenantId}::uuid AND is_active = true
      ORDER BY name ASC
    `;

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('[TaskApproval] Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/task-approvals/admin/fallback-summary
 * 
 * Admin view: Why tasks reached Admin (fallback reasons).
 */
router.get('/admin/fallback-summary', async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    const tenantId = req.tenantId;
    const days = parseInt(req.query.days) || 30;

    const summary = await prisma.$queryRaw`
      SELECT 
        fallback_applied as "fallbackType",
        fallback_reason as "reason",
        aws.assigned_role as "originalRole",
        COUNT(*) as count
      FROM approval_stage_instances asi
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND asi.fallback_applied IS NOT NULL
        AND ai.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY fallback_applied, fallback_reason, aws.assigned_role
      ORDER BY count DESC
    `;

    // Get missing role impact
    const missingRoles = await prisma.$queryRaw`
      SELECT 
        aws.assigned_role as "roleName",
        COUNT(*) as "fallbackCount",
        COUNT(DISTINCT ai.id) as "affectedWorkflows"
      FROM approval_stage_instances asi
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND asi.fallback_applied = 'auto_assign_admin'
        AND asi.fallback_reason ILIKE '%no user%'
      GROUP BY aws.assigned_role
      ORDER BY "fallbackCount" DESC
    `;

    res.json({
      success: true,
      data: {
        summary,
        missingRoles,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('[TaskApproval] Fallback summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fallback summary',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/task-approvals/admin/department-load
 * 
 * Admin view: Department load comparison.
 */
router.get('/admin/department-load', async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    const tenantId = req.tenantId;

    const load = await prisma.$queryRaw`
      SELECT 
        dept.id as "departmentId",
        dept.name as "departmentName",
        COUNT(DISTINCT ai.id) as "totalTasks",
        COUNT(*) FILTER (WHERE asi.status = 'active') as "pendingApprovals",
        COUNT(*) FILTER (WHERE asi.due_at < NOW() AND asi.status = 'active') as "slaBreach",
        AVG(EXTRACT(DAY FROM NOW() - ai.created_at)) as "avgDaysInQueue"
      FROM approval_instances ai
      JOIN approval_stage_instances asi ON asi.approval_instance_id = ai.id
      LEFT JOIN payment_requests pr ON ai.entity_type = 'payment_request' AND ai.entity_id = pr.id
      LEFT JOIN departments dept ON pr.department_id = dept.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND ai.status IN ('in_progress', 'draft')
      GROUP BY dept.id, dept.name
      ORDER BY "pendingApprovals" DESC
    `;

    res.json({
      success: true,
      data: load
    });
  } catch (error) {
    console.error('[TaskApproval] Department load error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department load',
      code: 'FETCH_ERROR'
    });
  }
});

module.exports = router;
