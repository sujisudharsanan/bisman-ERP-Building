/**
 * ApprovalWorkflowService
 * 
 * A flexible, multi-tenant approval workflow engine that supports:
 * - Stage-based approval workflows with configurable stages
 * - Multiple approver resolution strategies (role-based, user-based, hierarchy-based)
 * - Fallback strategies for missing approvers (skip, escalate, auto-approve, notify-admin)
 * - Full audit trail for compliance
 * - Works for small (1-3 users) and large (100+ users) organizations
 * 
 * @author BISMAN ERP Team
 */

import { PrismaClient } from '@prisma/client';
import {
  WorkflowEntityType,
  FallbackStrategy,
  ApprovalWorkflowTemplate,
  ApprovalWorkflowStage,
  ApprovalInstance,
  ApprovalStageInstance,
  InitiateWorkflowOptions,
  StageActionOptions,
  AdvanceStageResult,
  PendingApproval,
} from '../types/approval-workflow.types';

const prisma = new PrismaClient();

// ============================================================================
// LOCAL TYPES
// ============================================================================

type AuditActionType = 
  | 'workflow_started' 
  | 'approved' 
  | 'rejected' 
  | 'escalated' 
  | 'stage_skipped' 
  | 'auto_approved'
  | 'workflow_completed';

interface AuditLogParams {
  instanceId: string;
  stageInstanceId?: string;
  actionType: AuditActionType;
  actorId?: string;
  comment?: string;
  metadata?: Record<string, unknown>;
}

type NotificationType = 
  | 'approval_requested' 
  | 'approval_completed' 
  | 'approval_rejected' 
  | 'escalated' 
  | 'fallback_applied';

interface NotificationParams {
  instanceId: string;
  stageInstanceId?: string;
  recipientId: string;
  recipientEmail?: string;
  notificationType: NotificationType;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

interface ApproverResolutionResult {
  found: boolean;
  approverId?: string;
  approverEmail?: string;
  approverName?: string;
  fallbackApplied: boolean;
  fallbackStrategy?: FallbackStrategy;
  reason?: string;
}

// ============================================================================
// GOVERNANCE HELPERS
// ============================================================================

/**
 * Check if action requires mandatory comment (governance enforcement)
 */
function requiresComment(
  actionType: AuditActionType,
  actorLevel?: number,
  hasFallback?: boolean,
  isOverride?: boolean
): boolean {
  // L9+ actions always require comment
  if (actorLevel && actorLevel >= 9) return true;
  
  // Fallback actions require comment
  if (hasFallback) return true;
  
  // Override actions require comment
  if (isOverride) return true;
  
  // Specific action types require comment
  const commentRequiredActions: AuditActionType[] = [
    'auto_approved',
    'stage_skipped',
    'escalated'
  ];
  
  return commentRequiredActions.includes(actionType);
}

// ============================================================================
// HELPERS
// ============================================================================

interface CreateAuditLogWithGovernanceParams extends AuditLogParams {
  actorLevel?: number;
  isOverrideAction?: boolean;
  overrideType?: string;
}

async function createAuditLog(params: CreateAuditLogWithGovernanceParams): Promise<void> {
  const hasFallback = params.metadata?.fallbackStrategy !== undefined;
  const commentRequired = requiresComment(
    params.actionType,
    params.actorLevel,
    hasFallback,
    params.isOverrideAction
  );
  const commentProvided = !!(params.comment && params.comment.trim());
  
  await prisma.$executeRaw`
    INSERT INTO approval_audit_log (
      approval_instance_id, stage_instance_id, action, action_category,
      performed_by, comment, metadata, performed_at,
      actor_business_level, is_override_action, override_type, comment_required, validation_passed
    ) VALUES (
      ${params.instanceId}::uuid,
      ${params.stageInstanceId ? params.stageInstanceId : null}::uuid,
      ${params.actionType},
      'workflow',
      ${params.actorId ? params.actorId : null}::uuid,
      ${params.comment || null},
      ${params.metadata ? JSON.stringify(params.metadata) : null}::jsonb,
      NOW(),
      ${params.actorLevel || null},
      ${params.isOverrideAction || hasFallback || false},
      ${params.overrideType || (hasFallback ? 'FALLBACK_APPLIED' : null)},
      ${commentRequired},
      ${!commentRequired || commentProvided}
    )
  `;
}

async function queueNotification(params: NotificationParams): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO approval_notifications (
      approval_instance_id, stage_instance_id, recipient_id, recipient_email,
      notification_type, title, message, channel, delivery_status, created_at
    ) VALUES (
      ${params.instanceId}::uuid,
      ${params.stageInstanceId ? params.stageInstanceId : null}::uuid,
      ${params.recipientId}::uuid,
      ${params.recipientEmail || null},
      ${params.notificationType},
      ${params.subject},
      ${params.body},
      'in_app',
      'pending',
      NOW()
    )
  `;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ApprovalWorkflowService {

  async getWorkflowTemplate(
    entityType: WorkflowEntityType,
    tenantId?: string
  ): Promise<ApprovalWorkflowTemplate | null> {
    if (tenantId) {
      const tenantTemplate = await prisma.$queryRaw<ApprovalWorkflowTemplate[]>`
        SELECT * FROM approval_workflow_templates 
        WHERE entity_type = ${entityType} 
          AND tenant_id = ${tenantId}::uuid 
          AND is_active = true
        ORDER BY is_default DESC
        LIMIT 1
      `;
      if (tenantTemplate.length > 0) return tenantTemplate[0];
    }

    const defaultTemplate = await prisma.$queryRaw<ApprovalWorkflowTemplate[]>`
      SELECT * FROM approval_workflow_templates 
      WHERE entity_type = ${entityType} 
        AND is_default = true 
        AND is_active = true
      LIMIT 1
    `;
    return defaultTemplate.length > 0 ? defaultTemplate[0] : null;
  }

  async getWorkflowStages(templateId: string): Promise<ApprovalWorkflowStage[]> {
    return prisma.$queryRaw<ApprovalWorkflowStage[]>`
      SELECT * FROM approval_workflow_stages 
      WHERE workflow_template_id = ${templateId}::uuid 
      ORDER BY stage_order ASC
    `;
  }

  async resolveApprover(
    stage: ApprovalWorkflowStage,
    tenantId: string,
    initiatorId?: string
  ): Promise<ApproverResolutionResult> {
    const assigneeType = stage.assigneeType;

    switch (assigneeType) {
      case 'specific_user': {
        const userId = stage.assignedUserId;
        if (!userId) {
          return { found: false, reason: 'No specific user configured', fallbackApplied: false };
        }
        const user = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
          SELECT id, email, full_name FROM users 
          WHERE id = ${userId}::uuid AND is_active = true LIMIT 1
        `;
        if (user.length === 0) {
          return { found: false, reason: 'Configured approver not found or inactive', fallbackApplied: false };
        }
        return {
          found: true,
          approverId: user[0].id,
          approverEmail: user[0].email,
          approverName: user[0].full_name,
          fallbackApplied: false,
        };
      }

      case 'role': {
        const roleCode = stage.assignedRole;
        if (!roleCode) {
          return { found: false, reason: 'No role configured', fallbackApplied: false };
        }
        const approvers = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
          SELECT u.id, u.email, u.full_name 
          FROM users u
          JOIN user_roles ur ON u.id = ur.user_id
          JOIN roles r ON ur.role_id = r.id
          WHERE r.code = ${roleCode}
            AND ur.enterprise_id = ${tenantId}::uuid
            AND u.is_active = true
          ORDER BY u.created_at ASC LIMIT 5
        `;
        if (approvers.length === 0) {
          return { found: false, reason: `No user with role '${roleCode}' found`, fallbackApplied: false };
        }
        return {
          found: true,
          approverId: approvers[0].id,
          approverEmail: approvers[0].email,
          approverName: approvers[0].full_name,
          fallbackApplied: false,
        };
      }

      case 'initiator_manager': {
        if (!initiatorId) {
          return { found: false, reason: 'No initiator provided', fallbackApplied: false };
        }
        const managers = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
          SELECT m.id, m.email, m.full_name
          FROM users u JOIN users m ON u.reports_to = m.id
          WHERE u.id = ${initiatorId}::uuid AND m.is_active = true LIMIT 1
        `;
        if (managers.length === 0) {
          return { found: false, reason: 'No manager found', fallbackApplied: false };
        }
        return {
          found: true,
          approverId: managers[0].id,
          approverEmail: managers[0].email,
          approverName: managers[0].full_name,
          fallbackApplied: false,
        };
      }

      default:
        return { found: false, reason: `Unknown assignee type: ${assigneeType}`, fallbackApplied: false };
    }
  }

  /**
   * Apply fallback strategy when no approver is found.
   * Implements the complete fallback chain including secondary fallback.
   * 
   * CRITICAL: This ensures workflows NEVER get permanently stuck.
   */
  async applyFallbackStrategy(
    stage: ApprovalWorkflowStage,
    stageInstance: ApprovalStageInstance,
    tenantId: string,
    initiatorId?: string,
    isSecondaryAttempt: boolean = false
  ): Promise<ApproverResolutionResult> {
    // Use secondary fallback if this is a retry after primary failed
    const strategy = isSecondaryAttempt 
      ? (stage.secondaryFallback || 'auto_approve')  // Ultimate safety net
      : stage.fallbackStrategy;
    
    const baseReason = `No approver found for stage "${stage.name}" (assignee type: ${stage.assigneeType})`;

    switch (strategy) {
      case 'skip_stage': {
        await prisma.$executeRaw`
          UPDATE approval_stage_instances 
          SET status = 'skipped', 
              fallback_applied = 'skip_stage',
              fallback_reason = ${baseReason},
              updated_at = NOW()
          WHERE id = ${stageInstance.id}::uuid
        `;
        await createAuditLog({
          instanceId: stageInstance.approvalInstanceId,
          stageInstanceId: stageInstance.id,
          actionType: 'stage_skipped',
          comment: `Stage skipped: ${baseReason}`,
          metadata: { fallbackStrategy: strategy, stageName: stage.name, isSecondaryFallback: isSecondaryAttempt },
        });
        return { found: false, reason: 'Stage skipped - no approver available', fallbackApplied: true, fallbackStrategy: 'skip_stage' };
      }

      case 'auto_approve': {
        return this.autoApproveStage(stageInstance, baseReason, initiatorId, stage.name, isSecondaryAttempt);
      }

      case 'escalate_to_owner': {
        const ownerResult = await this.assignToBusinessOwner(stage, stageInstance, tenantId, baseReason);
        if (ownerResult.found) return ownerResult;
        // Try secondary fallback if owner not found
        if (!isSecondaryAttempt && stage.secondaryFallback) {
          return this.applyFallbackStrategy(stage, stageInstance, tenantId, initiatorId, true);
        }
        // Ultimate safety: auto-approve
        return this.autoApproveStage(stageInstance, `${baseReason}. Business owner also not found.`, initiatorId, stage.name, true);
      }

      case 'escalate_to_super_admin': {
        const superAdminResult = await this.assignToSuperAdmin(stage, stageInstance, tenantId, baseReason);
        if (superAdminResult.found) return superAdminResult;
        // Try secondary fallback if super admin not found
        if (!isSecondaryAttempt && stage.secondaryFallback) {
          return this.applyFallbackStrategy(stage, stageInstance, tenantId, initiatorId, true);
        }
        // Ultimate safety: auto-approve
        return this.autoApproveStage(stageInstance, `${baseReason}. Super admin also not found.`, initiatorId, stage.name, true);
      }

      case 'block_and_notify': {
        await this.blockAndNotifyAdmins(stage, stageInstance, tenantId, baseReason);
        return { found: false, reason: 'Stage blocked - awaiting manual assignment', fallbackApplied: true, fallbackStrategy: 'block_and_notify' };
      }

      case 'assign_to_initiator': {
        if (!initiatorId) {
          // No initiator - fall back to admin
          return this.assignToAdmin(stage, stageInstance, tenantId, `${baseReason}. Cannot assign to initiator (unknown).`);
        }
        const initiatorResult = await this.assignToInitiator(stage, stageInstance, initiatorId, baseReason);
        return initiatorResult;
      }

      case 'auto_assign_admin':
      default: {
        const adminResult = await this.assignToAdmin(stage, stageInstance, tenantId, baseReason);
        if (adminResult.found) return adminResult;
        
        // If admin not found, try secondary fallback
        if (!isSecondaryAttempt && stage.secondaryFallback) {
          return this.applyFallbackStrategy(stage, stageInstance, tenantId, initiatorId, true);
        }
        
        // ULTIMATE SAFETY NET: Auto-approve if nothing else works
        // This ensures workflow NEVER gets permanently stuck
        return this.autoApproveStage(
          stageInstance, 
          `${baseReason}. No admin found. Auto-approved as safety measure to prevent workflow from getting stuck.`, 
          initiatorId, 
          stage.name, 
          true
        );
      }
    }
  }

  /**
   * Auto-approve a stage when no approver is available
   */
  private async autoApproveStage(
    stageInstance: ApprovalStageInstance,
    reason: string,
    initiatorId?: string,
    stageName?: string,
    isUltimateFallback: boolean = false
  ): Promise<ApproverResolutionResult> {
    await prisma.$executeRaw`
      UPDATE approval_stage_instances 
      SET status = 'auto_approved', 
          actioned_at = NOW(), 
          fallback_applied = 'auto_approve',
          fallback_reason = ${reason},
          updated_at = NOW()
      WHERE id = ${stageInstance.id}::uuid
    `;
    await createAuditLog({
      instanceId: stageInstance.approvalInstanceId,
      stageInstanceId: stageInstance.id,
      actionType: 'auto_approved',
      comment: reason,
      metadata: { fallbackStrategy: 'auto_approve', stageName, isUltimateFallback },
    });
    if (initiatorId) {
      const initiator = await prisma.$queryRaw<Array<{ email: string }>>`
        SELECT email FROM users WHERE id = ${initiatorId}::uuid LIMIT 1
      `;
      if (initiator.length > 0) {
        await queueNotification({
          instanceId: stageInstance.approvalInstanceId,
          stageInstanceId: stageInstance.id,
          recipientId: initiatorId,
          recipientEmail: initiator[0].email,
          notificationType: 'fallback_applied',
          subject: `Auto-Approved: ${stageName || 'Stage'}`,
          body: reason,
        });
      }
    }
    return { found: false, reason, fallbackApplied: true, fallbackStrategy: 'auto_approve' };
  }

  /**
   * Assign stage to business owner (escalate_to_owner strategy)
   */
  private async assignToBusinessOwner(
    stage: ApprovalWorkflowStage,
    stageInstance: ApprovalStageInstance,
    tenantId: string,
    reason: string
  ): Promise<ApproverResolutionResult> {
    // Get business owner from enterprise settings
    const owners = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
      SELECT u.id, u.email, u.full_name 
      FROM users u
      JOIN enterprises e ON e.owner_id = u.id
      WHERE e.id = ${tenantId}::uuid AND u.is_active = true
      LIMIT 1
    `;

    if (owners.length === 0) {
      return { found: false, reason: 'No business owner found in enterprise settings', fallbackApplied: true };
    }

    await prisma.$executeRaw`
      UPDATE approval_stage_instances 
      SET resolved_approver_id = ${owners[0].id}::uuid,
          resolved_via = 'fallback',
          fallback_applied = 'escalate_to_owner',
          fallback_reason = ${reason},
          activated_at = NOW(),
          updated_at = NOW()
      WHERE id = ${stageInstance.id}::uuid
    `;

    await queueNotification({
      instanceId: stageInstance.approvalInstanceId,
      stageInstanceId: stageInstance.id,
      recipientId: owners[0].id,
      recipientEmail: owners[0].email,
      notificationType: 'escalated',
      subject: `[Escalated] Approval Required: ${stage.name}`,
      body: `You are receiving this because: ${reason}`,
    });

    await createAuditLog({
      instanceId: stageInstance.approvalInstanceId,
      stageInstanceId: stageInstance.id,
      actionType: 'escalated',
      actorId: owners[0].id,
      comment: `Escalated to business owner: ${reason}`,
      metadata: { fallbackStrategy: 'escalate_to_owner', stageName: stage.name },
    });

    return {
      found: true,
      approverId: owners[0].id,
      approverEmail: owners[0].email,
      approverName: owners[0].full_name,
      fallbackApplied: true,
      fallbackStrategy: 'escalate_to_owner',
      reason,
    };
  }

  /**
   * Assign stage to super admin (escalate_to_super_admin strategy)
   */
  private async assignToSuperAdmin(
    stage: ApprovalWorkflowStage,
    stageInstance: ApprovalStageInstance,
    tenantId: string,
    reason: string
  ): Promise<ApproverResolutionResult> {
    const superAdmins = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
      SELECT u.id, u.email, u.full_name 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.code = 'SUPER_ADMIN' AND u.is_active = true
      ORDER BY u.created_at ASC LIMIT 1
    `;

    if (superAdmins.length === 0) {
      return { found: false, reason: 'No super admin found', fallbackApplied: true };
    }

    await prisma.$executeRaw`
      UPDATE approval_stage_instances 
      SET resolved_approver_id = ${superAdmins[0].id}::uuid,
          resolved_via = 'fallback',
          fallback_applied = 'escalate_to_super_admin',
          fallback_reason = ${reason},
          activated_at = NOW(),
          updated_at = NOW()
      WHERE id = ${stageInstance.id}::uuid
    `;

    await queueNotification({
      instanceId: stageInstance.approvalInstanceId,
      stageInstanceId: stageInstance.id,
      recipientId: superAdmins[0].id,
      recipientEmail: superAdmins[0].email,
      notificationType: 'escalated',
      subject: `[ESCALATED TO SUPER ADMIN] Approval Required: ${stage.name}`,
      body: `You are receiving this because: ${reason}`,
    });

    await createAuditLog({
      instanceId: stageInstance.approvalInstanceId,
      stageInstanceId: stageInstance.id,
      actionType: 'escalated',
      actorId: superAdmins[0].id,
      comment: `Escalated to super admin: ${reason}`,
      metadata: { fallbackStrategy: 'escalate_to_super_admin', stageName: stage.name },
    });

    return {
      found: true,
      approverId: superAdmins[0].id,
      approverEmail: superAdmins[0].email,
      approverName: superAdmins[0].full_name,
      fallbackApplied: true,
      fallbackStrategy: 'escalate_to_super_admin',
      reason,
    };
  }

  /**
   * Block the stage and notify admins (block_and_notify strategy)
   */
  private async blockAndNotifyAdmins(
    stage: ApprovalWorkflowStage,
    stageInstance: ApprovalStageInstance,
    tenantId: string,
    reason: string
  ): Promise<void> {
    // Keep stage in pending status (blocked)
    await prisma.$executeRaw`
      UPDATE approval_stage_instances 
      SET fallback_applied = 'block_and_notify',
          fallback_reason = ${reason},
          updated_at = NOW()
      WHERE id = ${stageInstance.id}::uuid
    `;

    // Notify all admins about the block
    const admins = await prisma.$queryRaw<Array<{ id: string; email: string }>>`
      SELECT u.id, u.email FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.code IN ('ADMIN', 'SUPER_ADMIN') 
        AND ur.enterprise_id = ${tenantId}::uuid 
        AND u.is_active = true
    `;

    for (const admin of admins) {
      await queueNotification({
        instanceId: stageInstance.approvalInstanceId,
        stageInstanceId: stageInstance.id,
        recipientId: admin.id,
        recipientEmail: admin.email,
        notificationType: 'escalated',
        subject: `[BLOCKED] Manual Assignment Required: ${stage.name}`,
        body: `Approval workflow is BLOCKED and requires manual intervention.\n\nReason: ${reason}\n\nPlease assign an approver manually to continue the workflow.`,
      });
    }

    await createAuditLog({
      instanceId: stageInstance.approvalInstanceId,
      stageInstanceId: stageInstance.id,
      actionType: 'escalated',
      comment: `Workflow BLOCKED - awaiting manual assignment: ${reason}`,
      metadata: { fallbackStrategy: 'block_and_notify', stageName: stage.name, adminNotifiedCount: admins.length },
    });
  }

  /**
   * Assign stage to the initiator (assign_to_initiator strategy)
   */
  private async assignToInitiator(
    stage: ApprovalWorkflowStage,
    stageInstance: ApprovalStageInstance,
    initiatorId: string,
    reason: string
  ): Promise<ApproverResolutionResult> {
    const initiator = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
      SELECT id, email, full_name FROM users WHERE id = ${initiatorId}::uuid AND is_active = true LIMIT 1
    `;

    if (initiator.length === 0) {
      return { found: false, reason: 'Initiator not found or inactive', fallbackApplied: true };
    }

    await prisma.$executeRaw`
      UPDATE approval_stage_instances 
      SET resolved_approver_id = ${initiator[0].id}::uuid,
          resolved_via = 'fallback',
          fallback_applied = 'assign_to_initiator',
          fallback_reason = ${reason},
          activated_at = NOW(),
          updated_at = NOW()
      WHERE id = ${stageInstance.id}::uuid
    `;

    await queueNotification({
      instanceId: stageInstance.approvalInstanceId,
      stageInstanceId: stageInstance.id,
      recipientId: initiator[0].id,
      recipientEmail: initiator[0].email,
      notificationType: 'approval_requested',
      subject: `Self-Approval Required: ${stage.name}`,
      body: `You have been assigned to approve this stage. Reason: ${reason}`,
    });

    await createAuditLog({
      instanceId: stageInstance.approvalInstanceId,
      stageInstanceId: stageInstance.id,
      actionType: 'escalated',
      actorId: initiator[0].id,
      comment: `Assigned to initiator for self-approval: ${reason}`,
      metadata: { fallbackStrategy: 'assign_to_initiator', stageName: stage.name },
    });

    return {
      found: true,
      approverId: initiator[0].id,
      approverEmail: initiator[0].email,
      approverName: initiator[0].full_name,
      fallbackApplied: true,
      fallbackStrategy: 'assign_to_initiator',
      reason,
    };
  }

  private async assignToAdmin(
    stage: ApprovalWorkflowStage,
    stageInstance: ApprovalStageInstance,
    tenantId: string,
    reason?: string
  ): Promise<ApproverResolutionResult> {
    const fallbackReason = reason || `No approver found for stage "${stage.name}"`;
    
    const admins = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
      SELECT u.id, u.email, u.full_name 
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.code = 'ADMIN' AND ur.enterprise_id = ${tenantId}::uuid AND u.is_active = true
      ORDER BY u.created_at ASC LIMIT 3
    `;

    if (admins.length > 0) {
      await prisma.$executeRaw`
        UPDATE approval_stage_instances 
        SET resolved_approver_id = ${admins[0].id}::uuid,
            resolved_via = 'role',
            fallback_applied = 'auto_assign_admin',
            fallback_reason = ${fallbackReason},
            updated_at = NOW()
        WHERE id = ${stageInstance.id}::uuid
      `;
      for (const admin of admins) {
        await queueNotification({
          instanceId: stageInstance.approvalInstanceId,
          stageInstanceId: stageInstance.id,
          recipientId: admin.id,
          recipientEmail: admin.email,
          notificationType: 'escalated',
          subject: `[Action Required] Approver Not Found: ${stage.name}`,
          body: `Reason: ${fallbackReason}. Please review and take action.`,
        });
      }
      await createAuditLog({
        instanceId: stageInstance.approvalInstanceId,
        stageInstanceId: stageInstance.id,
        actionType: 'escalated',
        actorId: admins[0].id,
        comment: `Escalated to admin: ${fallbackReason}`,
        metadata: { fallbackStrategy: 'auto_assign_admin', stageName: stage.name, adminCount: admins.length },
      });
      return {
        found: true,
        approverId: admins[0].id,
        approverEmail: admins[0].email,
        approverName: admins[0].full_name,
        fallbackApplied: true,
        fallbackStrategy: 'auto_assign_admin',
        reason: fallbackReason,
      };
    }
    return { found: false, reason: 'No admin found in tenant', fallbackApplied: true, fallbackStrategy: 'block_and_notify' };
  }

  async initiateWorkflow(options: InitiateWorkflowOptions): Promise<ApprovalInstance> {
    const { tenantId, entityType, entityId, entityReference, requestedAmount, requestMetadata, initiatedBy, workflowTemplateId } = options;

    let template: ApprovalWorkflowTemplate | null = null;
    if (workflowTemplateId) {
      const templates = await prisma.$queryRaw<ApprovalWorkflowTemplate[]>`
        SELECT * FROM approval_workflow_templates WHERE id = ${workflowTemplateId}::uuid AND is_active = true LIMIT 1
      `;
      template = templates.length > 0 ? templates[0] : null;
    } else {
      template = await this.getWorkflowTemplate(entityType, tenantId);
    }
    if (!template) throw new Error(`No workflow template found for: ${entityType}`);

    const stages = await this.getWorkflowStages(template.id);
    if (stages.length === 0) throw new Error(`No stages defined for template: ${template.id}`);

    const instanceId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO approval_instances (
        id, tenant_id, workflow_template_id, entity_type, entity_id,
        entity_reference, status, current_stage_order, requested_amount,
        request_metadata, initiated_by, initiated_at, rejection_count, created_at, updated_at
      ) VALUES (
        ${instanceId}::uuid, ${tenantId}::uuid, ${template.id}::uuid, ${entityType},
        ${entityId}::uuid, ${entityReference || null}, 'in_progress', 1,
        ${requestedAmount || null}, ${requestMetadata ? JSON.stringify(requestMetadata) : null}::jsonb,
        ${initiatedBy}::uuid, NOW(), 0, NOW(), NOW()
      )
    `;

    for (const stage of stages) {
      const stageInstanceId = crypto.randomUUID();
      const isPending = stage.stageOrder === 1;
      await prisma.$executeRaw`
        INSERT INTO approval_stage_instances (
          id, approval_instance_id, workflow_stage_id, status, stage_order, attempt_number, created_at, updated_at
        ) VALUES (
          ${stageInstanceId}::uuid, ${instanceId}::uuid, ${stage.id}::uuid,
          ${isPending ? 'active' : 'pending'}, ${stage.stageOrder}, 1, NOW(), NOW()
        )
      `;
      if (stage.stageOrder === 1) {
        const stageInstance: ApprovalStageInstance = {
          id: stageInstanceId, approvalInstanceId: instanceId, workflowStageId: stage.id,
          status: 'active', stageOrder: stage.stageOrder, attemptNumber: 1, createdAt: new Date(),
        };
        await this.assignApproverToStage(stage, stageInstance, tenantId, initiatedBy);
      }
    }

    await createAuditLog({
      instanceId, actionType: 'workflow_started', actorId: initiatedBy,
      comment: `Workflow initiated: ${template.name}`, metadata: { entityType, entityId },
    });

    const instances = await prisma.$queryRaw<ApprovalInstance[]>`
      SELECT * FROM approval_instances WHERE id = ${instanceId}::uuid LIMIT 1
    `;
    return instances[0];
  }

  private async assignApproverToStage(
    stage: ApprovalWorkflowStage,
    stageInstance: ApprovalStageInstance,
    tenantId: string,
    initiatorId?: string
  ): Promise<void> {
    let resolution = await this.resolveApprover(stage, tenantId, initiatorId);
    if (!resolution.found) {
      resolution = await this.applyFallbackStrategy(stage, stageInstance, tenantId, initiatorId);
    }
    if (resolution.found && resolution.approverId) {
      await prisma.$executeRaw`
        UPDATE approval_stage_instances 
        SET resolved_approver_id = ${resolution.approverId}::uuid,
            resolved_via = ${stage.assigneeType},
            activated_at = NOW(), updated_at = NOW()
        WHERE id = ${stageInstance.id}::uuid
      `;
      await queueNotification({
        instanceId: stageInstance.approvalInstanceId,
        stageInstanceId: stageInstance.id,
        recipientId: resolution.approverId,
        recipientEmail: resolution.approverEmail,
        notificationType: 'approval_requested',
        subject: `Approval Required: ${stage.name}`,
        body: `Please review and take action.`,
      });
    }
  }

  /**
   * Process an approval action (approve or reject) on a stage.
   * 
   * CRITICAL: Uses database transaction with row-level locking to prevent
   * race conditions when multiple users try to approve the same stage.
   */
  async processAction(options: StageActionOptions): Promise<AdvanceStageResult> {
    const { stageInstanceId, action, actorId, comment } = options;

    try {
      // Use transaction with row-level locking to prevent concurrent approvals
      return await prisma.$transaction(async (tx) => {
        // Lock the stage instance row with FOR UPDATE NOWAIT
        // This will throw an error if another transaction is already processing this stage
        const stageInstances = await tx.$queryRaw<ApprovalStageInstance[]>`
          SELECT * FROM approval_stage_instances 
          WHERE id = ${stageInstanceId}::uuid 
          FOR UPDATE NOWAIT
        `;
        
        if (stageInstances.length === 0) {
          return { success: false, instanceId: '', workflowCompleted: false, workflowRejected: false, error: 'Stage instance not found' };
        }
        const stageInstance = stageInstances[0];

        // Double-check status AFTER acquiring lock (critical for race condition prevention)
        if (stageInstance.status !== 'active') {
          return { 
            success: false, 
            instanceId: stageInstance.approvalInstanceId, 
            workflowCompleted: false, 
            workflowRejected: false, 
            error: `Stage already processed. Current status: ${stageInstance.status}` 
          };
        }

        // Also lock the instance row
        const instances = await tx.$queryRaw<ApprovalInstance[]>`
          SELECT * FROM approval_instances 
          WHERE id = ${stageInstance.approvalInstanceId}::uuid 
          FOR UPDATE
        `;
        if (instances.length === 0) {
          return { success: false, instanceId: stageInstance.approvalInstanceId, workflowCompleted: false, workflowRejected: false, error: 'Instance not found' };
        }
        const instance = instances[0];

        // Verify authorization
        if (stageInstance.resolvedApproverId !== actorId) {
          return { success: false, instanceId: instance.id, workflowCompleted: false, workflowRejected: false, error: 'Not authorized to approve this stage' };
        }

        // Process the action (within the same transaction)
        if (action === 'approve') {
          return this.approveStageWithTx(tx, instance, stageInstance, actorId, comment);
        } else {
          return this.rejectStageWithTx(tx, instance, stageInstance, actorId, comment);
        }
      }, {
        isolationLevel: 'Serializable',
        maxWait: 5000, // 5 seconds max wait for lock
        timeout: 30000, // 30 seconds transaction timeout
      });
    } catch (error: unknown) {
      // Handle lock acquisition failure (concurrent request)
      if (error instanceof Error && error.message.includes('could not obtain lock')) {
        return { 
          success: false, 
          instanceId: '', 
          workflowCompleted: false, 
          workflowRejected: false, 
          error: 'This stage is currently being processed by another request. Please try again.' 
        };
      }
      throw error;
    }
  }

  /**
   * Approve stage within a transaction context
   */
  private async approveStageWithTx(
    tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    instance: ApprovalInstance, 
    stageInstance: ApprovalStageInstance, 
    actorId: string, 
    comment?: string
  ): Promise<AdvanceStageResult> {
    await tx.$executeRaw`
      UPDATE approval_stage_instances 
      SET status = 'approved', actioned_by = ${actorId}::uuid, actioned_at = NOW(),
          action_comment = ${comment || null}, updated_at = NOW()
      WHERE id = ${stageInstance.id}::uuid AND status = 'active'
    `;
    
    // Create audit log (outside transaction is fine)
    await createAuditLog({ instanceId: instance.id, stageInstanceId: stageInstance.id, actionType: 'approved', actorId, comment });

    const allStages = await tx.$queryRaw<ApprovalWorkflowStage[]>`
      SELECT ws.* FROM approval_workflow_stages ws
      JOIN approval_stage_instances si ON ws.id = si.workflow_stage_id
      WHERE si.approval_instance_id = ${instance.id}::uuid ORDER BY ws.stage_order ASC
    `;
    const currentStageIndex = allStages.findIndex(s => s.id === stageInstance.workflowStageId);
    const nextStage = allStages[currentStageIndex + 1];

    if (nextStage) {
      await tx.$executeRaw`UPDATE approval_instances SET current_stage_order = ${nextStage.stageOrder}, updated_at = NOW() WHERE id = ${instance.id}::uuid`;
      const nextStageInstances = await tx.$queryRaw<ApprovalStageInstance[]>`
        SELECT * FROM approval_stage_instances WHERE approval_instance_id = ${instance.id}::uuid AND workflow_stage_id = ${nextStage.id}::uuid LIMIT 1
      `;
      if (nextStageInstances.length > 0) {
        await tx.$executeRaw`UPDATE approval_stage_instances SET status = 'active', activated_at = NOW(), updated_at = NOW() WHERE id = ${nextStageInstances[0].id}::uuid`;
        // Note: assignApproverToStage needs to be called outside transaction for notifications
        // Schedule it for after transaction commits
        setImmediate(() => {
          this.assignApproverToStage(nextStage, nextStageInstances[0], instance.tenantId, instance.initiatedBy)
            .catch(err => console.error('Error assigning approver to next stage:', err));
        });
      }
      return { success: true, instanceId: instance.id, previousStageId: stageInstance.id, nextStageId: nextStageInstances[0]?.id, workflowCompleted: false, workflowRejected: false };
    } else {
      await tx.$executeRaw`UPDATE approval_instances SET status = 'completed', completed_at = NOW(), completed_by = ${actorId}::uuid, updated_at = NOW() WHERE id = ${instance.id}::uuid`;
      await createAuditLog({ instanceId: instance.id, actionType: 'workflow_completed', actorId, comment: 'Workflow completed' });
      const initiator = await tx.$queryRaw<Array<{ email: string }>>`SELECT email FROM users WHERE id = ${instance.initiatedBy}::uuid LIMIT 1`;
      if (initiator.length > 0) {
        await queueNotification({ instanceId: instance.id, recipientId: instance.initiatedBy, recipientEmail: initiator[0].email, notificationType: 'approval_completed', subject: 'Request approved', body: 'Your request has been fully approved.' });
      }
      return { success: true, instanceId: instance.id, previousStageId: stageInstance.id, workflowCompleted: true, workflowRejected: false };
    }
  }

  /**
   * Reject stage within a transaction context
   */
  private async rejectStageWithTx(
    tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    instance: ApprovalInstance, 
    stageInstance: ApprovalStageInstance, 
    actorId: string, 
    comment?: string
  ): Promise<AdvanceStageResult> {
    await tx.$executeRaw`
      UPDATE approval_stage_instances SET status = 'rejected', actioned_by = ${actorId}::uuid, actioned_at = NOW(),
        action_comment = ${comment || null}, updated_at = NOW() 
      WHERE id = ${stageInstance.id}::uuid AND status = 'active'
    `;
    await tx.$executeRaw`
      UPDATE approval_instances SET status = 'rejected', completed_at = NOW(), last_rejection_reason = ${comment || null},
        last_rejected_by = ${actorId}::uuid, last_rejected_at = NOW(), rejection_count = rejection_count + 1, updated_at = NOW()
      WHERE id = ${instance.id}::uuid
    `;
    await createAuditLog({ instanceId: instance.id, stageInstanceId: stageInstance.id, actionType: 'rejected', actorId, comment });
    const initiator = await tx.$queryRaw<Array<{ email: string }>>`SELECT email FROM users WHERE id = ${instance.initiatedBy}::uuid LIMIT 1`;
    if (initiator.length > 0) {
      await queueNotification({ instanceId: instance.id, stageInstanceId: stageInstance.id, recipientId: instance.initiatedBy, recipientEmail: initiator[0].email, notificationType: 'approval_rejected', subject: 'Request rejected', body: `Reason: ${comment || 'No reason provided'}` });
    }
    return { success: true, instanceId: instance.id, previousStageId: stageInstance.id, workflowCompleted: false, workflowRejected: true };
  }

  async getInstanceWithStages(instanceId: string): Promise<{ instance: ApprovalInstance; stages: ApprovalStageInstance[] } | null> {
    const instances = await prisma.$queryRaw<ApprovalInstance[]>`SELECT * FROM approval_instances WHERE id = ${instanceId}::uuid LIMIT 1`;
    if (instances.length === 0) return null;
    const stages = await prisma.$queryRaw<ApprovalStageInstance[]>`SELECT * FROM approval_stage_instances WHERE approval_instance_id = ${instanceId}::uuid ORDER BY stage_order ASC`;
    return { instance: instances[0], stages };
  }

  async getPendingApprovalsForUser(userId: string, tenantId: string): Promise<PendingApproval[]> {
    return prisma.$queryRaw<PendingApproval[]>`
      SELECT i.id as "instanceId", si.id as "stageInstanceId", i.entity_type as "entityType", i.entity_id as "entityId",
        i.entity_reference as "entityReference", ws.name as "stageName", ws.code as "stageCode",
        i.requested_amount as "requestedAmount", i.initiated_by as "initiatedBy", u.full_name as "initiatedByName",
        i.initiated_at as "initiatedAt", si.due_at as "dueAt", (si.due_at < NOW()) as "isOverdue", (si.escalated_at IS NOT NULL) as "isEscalated"
      FROM approval_stage_instances si
      JOIN approval_workflow_stages ws ON si.workflow_stage_id = ws.id
      JOIN approval_instances i ON si.approval_instance_id = i.id
      LEFT JOIN users u ON i.initiated_by = u.id
      WHERE si.resolved_approver_id = ${userId}::uuid AND si.status = 'active' AND i.tenant_id = ${tenantId}::uuid
      ORDER BY si.activated_at ASC
    `;
  }

  async getWorkflowHistory(entityType: string, entityId: string): Promise<ApprovalInstance[]> {
    return prisma.$queryRaw<ApprovalInstance[]>`
      SELECT * FROM approval_instances WHERE entity_type = ${entityType} AND entity_id = ${entityId}::uuid ORDER BY created_at DESC
    `;
  }

  /**
   * Approve all fallback stages in a task (for Admin "Approve All" functionality)
   * Only approves stages that were assigned via fallback (auto_assign_admin)
   */
  async approveAllFallbackStages(instanceId: string, adminId: string, comment?: string): Promise<{ success: boolean; approvedCount: number; error?: string }> {
    // Get all active stages with fallback applied
    const fallbackStages = await prisma.$queryRaw<ApprovalStageInstance[]>`
      SELECT * FROM approval_stage_instances 
      WHERE approval_instance_id = ${instanceId}::uuid 
        AND fallback_applied IS NOT NULL
        AND status IN ('active', 'pending')
      ORDER BY stage_order ASC
    `;

    if (fallbackStages.length === 0) {
      return { success: true, approvedCount: 0 };
    }

    let approvedCount = 0;
    for (const stage of fallbackStages) {
      // Update stage to approved
      await prisma.$executeRaw`
        UPDATE approval_stage_instances 
        SET status = 'approved', 
            actioned_by = ${adminId}::uuid, 
            actioned_at = NOW(),
            action_comment = ${comment || 'Bulk approved by admin'},
            updated_at = NOW()
        WHERE id = ${stage.id}::uuid
      `;

      // Create audit log for each stage
      await createAuditLog({
        instanceId: instanceId,
        stageInstanceId: stage.id,
        actionType: 'approved',
        actorId: adminId,
        comment: comment || 'Bulk approved by admin (fallback stages)',
        metadata: { bulkApproval: true, originalFallback: stage.fallbackApplied },
      });

      approvedCount++;
    }

    // Check if workflow is now complete
    const remainingActiveStages = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count FROM approval_stage_instances 
      WHERE approval_instance_id = ${instanceId}::uuid 
        AND status IN ('active', 'pending')
    `;

    if (remainingActiveStages[0]?.count === 0) {
      // Complete the workflow
      await prisma.$executeRaw`
        UPDATE approval_instances 
        SET status = 'completed', 
            completed_at = NOW(), 
            completed_by = ${adminId}::uuid,
            updated_at = NOW()
        WHERE id = ${instanceId}::uuid
      `;

      await createAuditLog({
        instanceId,
        actionType: 'workflow_completed',
        actorId: adminId,
        comment: 'Workflow completed via bulk approval',
      });
    } else {
      // Advance to next stage
      const nextStage = await prisma.$queryRaw<ApprovalStageInstance[]>`
        SELECT * FROM approval_stage_instances 
        WHERE approval_instance_id = ${instanceId}::uuid 
          AND status = 'pending'
        ORDER BY stage_order ASC
        LIMIT 1
      `;

      if (nextStage.length > 0) {
        await prisma.$executeRaw`
          UPDATE approval_stage_instances 
          SET status = 'active', activated_at = NOW(), updated_at = NOW()
          WHERE id = ${nextStage[0].id}::uuid
        `;
      }
    }

    return { success: true, approvedCount };
  }

  /**
   * Execute payment for a completed approval workflow
   */
  async executePayment(
    instanceId: string,
    executorId: string,
    transactionNumber: string,
    amount: number,
    options?: {
      paymentMethod?: string;
      bankReference?: string;
      notes?: string;
      receiptUrl?: string;
    }
  ): Promise<{ success: boolean; paymentExecutionId?: string; error?: string }> {
    // Verify instance exists and is completed or ready for payment
    const instances = await prisma.$queryRaw<ApprovalInstance[]>`
      SELECT * FROM approval_instances WHERE id = ${instanceId}::uuid LIMIT 1
    `;

    if (instances.length === 0) {
      return { success: false, error: 'Approval instance not found' };
    }

    const instance = instances[0];

    // Check if payment execution stage is the current active stage
    const activeStage = await prisma.$queryRaw<Array<{ code: string }>>`
      SELECT ws.code FROM approval_stage_instances si
      JOIN approval_workflow_stages ws ON si.workflow_stage_id = ws.id
      WHERE si.approval_instance_id = ${instanceId}::uuid AND si.status = 'active'
      LIMIT 1
    `;

    // Allow payment execution if at PAYMENT_EXECUTION stage or workflow is completed
    const isPaymentStage = activeStage.length > 0 && activeStage[0].code === 'PAYMENT_EXECUTION';
    const isCompleted = instance.status === 'completed';

    if (!isPaymentStage && !isCompleted) {
      return { success: false, error: 'Workflow not ready for payment execution. Current status: ' + instance.status };
    }

    // Check if payment already executed
    const existingPayment = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM payment_execution WHERE approval_instance_id = ${instanceId}::uuid LIMIT 1
    `;

    if (existingPayment.length > 0) {
      return { success: false, error: 'Payment already executed for this workflow' };
    }

    // Create payment execution record
    const paymentId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO payment_execution (
        id, approval_instance_id, transaction_number, payment_method, payment_date,
        amount, currency, executed_by, executed_at, bank_reference, receipt_url, notes, created_at
      ) VALUES (
        ${paymentId}::uuid,
        ${instanceId}::uuid,
        ${transactionNumber},
        ${options?.paymentMethod || 'bank_transfer'},
        CURRENT_DATE,
        ${amount},
        'INR',
        ${executorId}::uuid,
        NOW(),
        ${options?.bankReference || null},
        ${options?.receiptUrl || null},
        ${options?.notes || null},
        NOW()
      )
    `;

    // If there's an active payment execution stage, approve it
    if (isPaymentStage) {
      const paymentStage = await prisma.$queryRaw<ApprovalStageInstance[]>`
        SELECT si.* FROM approval_stage_instances si
        JOIN approval_workflow_stages ws ON si.workflow_stage_id = ws.id
        WHERE si.approval_instance_id = ${instanceId}::uuid 
          AND ws.code = 'PAYMENT_EXECUTION' 
          AND si.status = 'active'
        LIMIT 1
      `;

      if (paymentStage.length > 0) {
        await prisma.$executeRaw`
          UPDATE approval_stage_instances 
          SET status = 'approved', 
              actioned_by = ${executorId}::uuid, 
              actioned_at = NOW(),
              action_comment = ${`Payment executed: ${transactionNumber}`},
              updated_at = NOW()
          WHERE id = ${paymentStage[0].id}::uuid
        `;

        // Complete the workflow
        await prisma.$executeRaw`
          UPDATE approval_instances 
          SET status = 'completed', 
              completed_at = NOW(), 
              completed_by = ${executorId}::uuid,
              updated_at = NOW()
          WHERE id = ${instanceId}::uuid
        `;
      }
    }

    // Create audit log
    await createAuditLog({
      instanceId,
      actionType: 'workflow_completed',
      actorId: executorId,
      comment: `Payment executed: ${transactionNumber}`,
      metadata: { paymentExecutionId: paymentId, amount, transactionNumber },
    });

    return { success: true, paymentExecutionId: paymentId };
  }

  /**
   * Get admin approval queue - all tasks pending approval across the tenant
   */
  async getAdminApprovalQueue(
    tenantId: string,
    filters?: {
      status?: string[];
      entityType?: string;
      pendingAtStage?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    tasks: Array<{
      taskId: string;
      taskTitle: string;
      taskType: string;
      initiatedBy: string;
      initiatedByName: string;
      currentStage: string;
      currentStageOrder: number;
      totalStages: number;
      amount: number | null;
      status: string;
      createdAt: Date;
      hasFallback: boolean;
      daysInQueue: number;
    }>;
    total: number;
  }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Get count first
    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM approval_instances ai
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND ai.status IN ('in_progress', 'draft')
    `;
    const total = Number(countResult[0]?.count || 0);

    // Get tasks with stage info
    const tasks = await prisma.$queryRaw<Array<{
      taskId: string;
      taskTitle: string;
      taskType: string;
      initiatedBy: string;
      initiatedByName: string;
      currentStage: string;
      currentStageOrder: number;
      totalStages: number;
      amount: number | null;
      status: string;
      createdAt: Date;
      hasFallback: boolean;
      daysInQueue: number;
    }>>`
      SELECT 
        ai.id as "taskId",
        ai.entity_reference as "taskTitle",
        ai.entity_type as "taskType",
        ai.initiated_by::text as "initiatedBy",
        COALESCE(u.full_name, u.email, 'Unknown') as "initiatedByName",
        COALESCE(ws.name, 'Unknown Stage') as "currentStage",
        ai.current_stage_order as "currentStageOrder",
        (SELECT COUNT(*) FROM approval_stage_instances WHERE approval_instance_id = ai.id)::int as "totalStages",
        ai.requested_amount as "amount",
        ai.status,
        ai.created_at as "createdAt",
        EXISTS(
          SELECT 1 FROM approval_stage_instances si 
          WHERE si.approval_instance_id = ai.id AND si.fallback_applied IS NOT NULL
        ) as "hasFallback",
        EXTRACT(DAY FROM NOW() - ai.created_at)::int as "daysInQueue"
      FROM approval_instances ai
      LEFT JOIN users_enhanced u ON ai.initiated_by = u.id
      LEFT JOIN approval_stage_instances asi ON ai.id = asi.approval_instance_id AND asi.status = 'active'
      LEFT JOIN approval_workflow_stages ws ON asi.workflow_stage_id = ws.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND ai.status IN ('in_progress', 'draft')
      ORDER BY ai.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return { tasks, total };
  }

  /**
   * Get detailed approval info for a specific task/instance
   */
  async getTaskApprovalDetails(instanceId: string): Promise<{
    instance: ApprovalInstance;
    stages: Array<{
      id: string;
      stageName: string;
      stageCode: string;
      stageOrder: number;
      status: string;
      approverName: string | null;
      approverEmail: string | null;
      fallbackApplied: string | null;
      fallbackReason: string | null;
      actionedAt: Date | null;
      actionComment: string | null;
      slaHours: number;
      isOverdue: boolean;
    }>;
    auditLog: Array<{
      id: string;
      action: string;
      performedByName: string | null;
      performedAt: Date;
      comment: string | null;
    }>;
  } | null> {
    const instances = await prisma.$queryRaw<ApprovalInstance[]>`
      SELECT * FROM approval_instances WHERE id = ${instanceId}::uuid LIMIT 1
    `;

    if (instances.length === 0) return null;

    const stages = await prisma.$queryRaw<Array<{
      id: string;
      stageName: string;
      stageCode: string;
      stageOrder: number;
      status: string;
      approverName: string | null;
      approverEmail: string | null;
      fallbackApplied: string | null;
      fallbackReason: string | null;
      actionedAt: Date | null;
      actionComment: string | null;
      slaHours: number;
      isOverdue: boolean;
    }>>`
      SELECT 
        si.id,
        ws.name as "stageName",
        ws.code as "stageCode",
        si.stage_order as "stageOrder",
        si.status,
        u.full_name as "approverName",
        u.email as "approverEmail",
        si.fallback_applied as "fallbackApplied",
        si.fallback_reason as "fallbackReason",
        si.actioned_at as "actionedAt",
        si.action_comment as "actionComment",
        ws.sla_hours as "slaHours",
        (si.due_at IS NOT NULL AND si.due_at < NOW() AND si.status = 'active') as "isOverdue"
      FROM approval_stage_instances si
      JOIN approval_workflow_stages ws ON si.workflow_stage_id = ws.id
      LEFT JOIN users_enhanced u ON si.resolved_approver_id = u.id
      WHERE si.approval_instance_id = ${instanceId}::uuid
      ORDER BY si.stage_order ASC
    `;

    const auditLog = await prisma.$queryRaw<Array<{
      id: string;
      action: string;
      performedByName: string | null;
      performedAt: Date;
      comment: string | null;
    }>>`
      SELECT 
        al.id,
        al.action,
        COALESCE(al.performed_by_name, u.full_name) as "performedByName",
        al.performed_at as "performedAt",
        al.comment
      FROM approval_audit_log al
      LEFT JOIN users_enhanced u ON al.performed_by = u.id
      WHERE al.approval_instance_id = ${instanceId}::uuid
      ORDER BY al.performed_at DESC
    `;

    return { instance: instances[0], stages, auditLog };
  }
}

export const approvalWorkflowService = new ApprovalWorkflowService();
