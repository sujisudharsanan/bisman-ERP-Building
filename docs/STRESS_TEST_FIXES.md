# 🔧 STRESS TEST FIXES - Implementation Guide

**Date:** December 21, 2025  
**Status:** Ready for Implementation

---

## FIX 1: Race Condition Protection (P0 - CRITICAL)

### Problem
No database transaction wrapping in `processAction()`. Two concurrent requests can both approve the same stage.

### Solution
Wrap approval logic in a database transaction with row-level locking.

### Code Change: `ApprovalWorkflowService.ts`

```typescript
async processAction(options: StageActionOptions): Promise<AdvanceStageResult> {
  const { stageInstanceId, action, actorId, comment } = options;

  // Use transaction with row-level locking
  return prisma.$transaction(async (tx) => {
    // Lock the stage instance row
    const stageInstances = await tx.$queryRaw<ApprovalStageInstance[]>`
      SELECT * FROM approval_stage_instances 
      WHERE id = ${stageInstanceId}::uuid 
      FOR UPDATE NOWAIT
    `;
    
    if (stageInstances.length === 0) {
      return { success: false, instanceId: '', workflowCompleted: false, workflowRejected: false, error: 'Stage instance not found' };
    }
    
    const stageInstance = stageInstances[0];
    
    // Double-check status AFTER acquiring lock
    if (stageInstance.status !== 'active') {
      return { success: false, instanceId: stageInstance.approvalInstanceId, workflowCompleted: false, workflowRejected: false, error: `Stage already processed: ${stageInstance.status}` };
    }
    
    // ... rest of logic using tx instead of prisma
  }, {
    isolationLevel: 'Serializable',
    maxWait: 5000,
    timeout: 10000,
  });
}
```

---

## FIX 2: Secondary Fallback Chain (P0 - CRITICAL)

### Problem
If primary fallback fails (e.g., no admin exists), workflow gets stuck forever.

### Solution
Implement secondary fallback chain with ultimate safety net.

### Code Change: `applyFallbackStrategy()`

```typescript
async applyFallbackStrategy(
  stage: ApprovalWorkflowStage,
  stageInstance: ApprovalStageInstance,
  tenantId: string,
  initiatorId?: string,
  isSecondaryAttempt: boolean = false
): Promise<ApproverResolutionResult> {
  const strategy = isSecondaryAttempt 
    ? (stage.secondaryFallback || 'auto_approve')  // Ultimate safety
    : stage.fallbackStrategy;

  const reason = `No approver found for ${stage.name} (${stage.assigneeType})`;
  
  switch (strategy) {
    case 'skip_stage': {
      await this.skipStage(stageInstance, reason);
      return { found: false, reason: 'Stage skipped', fallbackApplied: true, fallbackStrategy: 'skip_stage' };
    }

    case 'auto_approve': {
      await this.autoApproveStage(stageInstance, reason, initiatorId);
      return { found: false, reason: 'Stage auto-approved', fallbackApplied: true, fallbackStrategy: 'auto_approve' };
    }

    case 'escalate_to_owner': {
      const ownerResult = await this.assignToBusinessOwner(stage, stageInstance, tenantId, reason);
      if (ownerResult.found) return ownerResult;
      // Fall through to secondary if owner not found
      if (!isSecondaryAttempt && stage.secondaryFallback) {
        return this.applyFallbackStrategy(stage, stageInstance, tenantId, initiatorId, true);
      }
      return ownerResult;
    }

    case 'escalate_to_super_admin': {
      const superAdminResult = await this.assignToSuperAdmin(stage, stageInstance, tenantId, reason);
      if (superAdminResult.found) return superAdminResult;
      if (!isSecondaryAttempt && stage.secondaryFallback) {
        return this.applyFallbackStrategy(stage, stageInstance, tenantId, initiatorId, true);
      }
      return superAdminResult;
    }

    case 'block_and_notify': {
      await this.blockAndNotify(stage, stageInstance, tenantId, reason);
      return { found: false, reason: 'Blocked - awaiting manual assignment', fallbackApplied: true, fallbackStrategy: 'block_and_notify' };
    }

    case 'assign_to_initiator': {
      if (!initiatorId) {
        return { found: false, reason: 'No initiator to assign', fallbackApplied: true };
      }
      const initiatorResult = await this.assignToInitiator(stage, stageInstance, initiatorId, reason);
      return initiatorResult;
    }

    case 'auto_assign_admin':
    default: {
      const adminResult = await this.assignToAdmin(stage, stageInstance, tenantId, reason);
      if (adminResult.found) return adminResult;
      
      // If admin not found, try secondary fallback
      if (!isSecondaryAttempt && stage.secondaryFallback) {
        return this.applyFallbackStrategy(stage, stageInstance, tenantId, initiatorId, true);
      }
      
      // ULTIMATE SAFETY NET: Auto-approve if nothing else works
      await this.autoApproveStage(stageInstance, 
        `${reason}. No admin found. Auto-approved as safety measure.`, initiatorId);
      return { 
        found: false, 
        reason: 'Auto-approved (no approver available)', 
        fallbackApplied: true, 
        fallbackStrategy: 'auto_approve' 
      };
    }
  }
}
```

---

## FIX 3: Implement Missing Fallback Strategies (P0)

### New Helper Methods

```typescript
private async assignToBusinessOwner(
  stage: ApprovalWorkflowStage,
  stageInstance: ApprovalStageInstance,
  tenantId: string,
  reason: string
): Promise<ApproverResolutionResult> {
  // Get business owner from tenant/enterprise settings
  const owners = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
    SELECT u.id, u.email, u.full_name 
    FROM users u
    JOIN enterprises e ON e.owner_id = u.id
    WHERE e.id = ${tenantId}::uuid AND u.is_active = true
    LIMIT 1
  `;

  if (owners.length === 0) {
    return { found: false, reason: 'No business owner found', fallbackApplied: true };
  }

  await this.updateStageApprover(stageInstance, owners[0], 'escalate_to_owner', reason);
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

  await this.updateStageApprover(stageInstance, superAdmins[0], 'escalate_to_super_admin', reason);
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

private async assignToInitiator(
  stage: ApprovalWorkflowStage,
  stageInstance: ApprovalStageInstance,
  initiatorId: string,
  reason: string
): Promise<ApproverResolutionResult> {
  const initiator = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string }>>`
    SELECT id, email, full_name FROM users WHERE id = ${initiatorId}::uuid LIMIT 1
  `;

  if (initiator.length === 0) {
    return { found: false, reason: 'Initiator not found', fallbackApplied: true };
  }

  await this.updateStageApprover(stageInstance, initiator[0], 'assign_to_initiator', reason);
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

private async blockAndNotify(
  stage: ApprovalWorkflowStage,
  stageInstance: ApprovalStageInstance,
  tenantId: string,
  reason: string
): Promise<void> {
  // Mark stage as blocked
  await prisma.$executeRaw`
    UPDATE approval_stage_instances 
    SET status = 'pending',
        fallback_applied = 'block_and_notify',
        fallback_reason = ${reason},
        updated_at = NOW()
    WHERE id = ${stageInstance.id}::uuid
  `;

  // Notify all admins
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
      body: `Approval workflow is blocked. Reason: ${reason}. Please assign an approver manually.`,
    });
  }

  await createAuditLog({
    instanceId: stageInstance.approvalInstanceId,
    stageInstanceId: stageInstance.id,
    actionType: 'escalated',
    comment: `Workflow blocked: ${reason}`,
    metadata: { fallbackStrategy: 'block_and_notify', stageName: stage.name },
  });
}

private async updateStageApprover(
  stageInstance: ApprovalStageInstance,
  approver: { id: string; email: string; full_name: string },
  fallbackStrategy: FallbackStrategy,
  reason: string
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE approval_stage_instances 
    SET resolved_approver_id = ${approver.id}::uuid,
        resolved_via = 'fallback',
        fallback_applied = ${fallbackStrategy},
        fallback_reason = ${reason},
        activated_at = NOW(),
        updated_at = NOW()
    WHERE id = ${stageInstance.id}::uuid
  `;

  await queueNotification({
    instanceId: stageInstance.approvalInstanceId,
    stageInstanceId: stageInstance.id,
    recipientId: approver.id,
    recipientEmail: approver.email,
    notificationType: 'escalated',
    subject: '[Escalated] Approval Required',
    body: `You have been assigned as fallback approver. Reason: ${reason}`,
  });
}
```

---

## FIX 4: Populate fallback_reason (P1)

### Code Change

Update all places where `fallback_applied` is set to also set `fallback_reason`:

```typescript
// In assignToAdmin():
await prisma.$executeRaw`
  UPDATE approval_stage_instances 
  SET resolved_approver_id = ${admins[0].id}::uuid,
      resolved_via = 'role',
      fallback_applied = 'auto_assign_admin',
      fallback_reason = ${`Original approver not found: ${reason}. Assigned to Admin.`},
      updated_at = NOW()
  WHERE id = ${stageInstance.id}::uuid
`;
```

---

## FIX 5: Add acting_as_role to Audit Logs (P1)

### Schema Change (migration)

```sql
ALTER TABLE approval_audit_log 
ADD COLUMN acting_as_role VARCHAR(50);
```

### Code Change

```typescript
interface AuditLogParams {
  instanceId: string;
  stageInstanceId?: string;
  actionType: AuditActionType;
  actorId?: string;
  actingAsRole?: string;  // NEW
  comment?: string;
  metadata?: Record<string, unknown>;
}

async function createAuditLog(params: AuditLogParams): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO approval_audit_log (
      approval_instance_id, stage_instance_id, action, action_category,
      performed_by, performed_by_role, comment, metadata, performed_at
    ) VALUES (
      ${params.instanceId}::uuid,
      ${params.stageInstanceId ? params.stageInstanceId : null}::uuid,
      ${params.actionType},
      'workflow',
      ${params.actorId ? params.actorId : null}::uuid,
      ${params.actingAsRole || null},
      ${params.comment || null},
      ${params.metadata ? JSON.stringify(params.metadata) : null}::jsonb,
      NOW()
    )
  `;
}
```

---

## FIX 6: Reassign Pending Stages (P2)

### New Admin Function

```typescript
/**
 * Reassign pending stages when new approvers become available
 * Call this when a new user is assigned a role
 */
async reassignPendingStages(
  tenantId: string,
  roleCode: string
): Promise<{ reassignedCount: number }> {
  // Find stages waiting on this role that fell back to admin
  const pendingStages = await prisma.$queryRaw<ApprovalStageInstance[]>`
    SELECT si.* FROM approval_stage_instances si
    JOIN approval_workflow_stages ws ON si.workflow_stage_id = ws.id
    WHERE ws.assigned_role = ${roleCode}
      AND si.fallback_applied IS NOT NULL
      AND si.status IN ('pending', 'active')
  `;

  let reassignedCount = 0;
  for (const stage of pendingStages) {
    // Try to resolve the proper approver now
    const stageConfig = await prisma.$queryRaw<ApprovalWorkflowStage[]>`
      SELECT * FROM approval_workflow_stages WHERE id = ${stage.workflowStageId}::uuid LIMIT 1
    `;
    
    if (stageConfig.length > 0) {
      const resolution = await this.resolveApprover(stageConfig[0], tenantId);
      if (resolution.found && resolution.approverId) {
        await prisma.$executeRaw`
          UPDATE approval_stage_instances 
          SET resolved_approver_id = ${resolution.approverId}::uuid,
              resolved_via = ${stageConfig[0].assigneeType},
              fallback_applied = NULL,
              fallback_reason = 'Reassigned after role became available',
              updated_at = NOW()
          WHERE id = ${stage.id}::uuid
        `;
        reassignedCount++;
      }
    }
  }

  return { reassignedCount };
}
```

---

## Implementation Priority

1. **TODAY (P0):** Race condition fix + Secondary fallback
2. **THIS WEEK (P1):** Missing fallback strategies + fallback_reason
3. **NEXT SPRINT (P2):** Reassign pending stages + acting_as_role

