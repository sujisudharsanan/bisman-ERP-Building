/**
 * Seed Approval Workflow Templates
 * 
 * Creates default 6-stage Payment Request workflow for all tenants
 * Run with: npx ts-node prisma/seed-approval-workflows.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default 6-stage Payment Request Workflow Configuration
const PAYMENT_REQUEST_WORKFLOW = {
  name: 'Standard Payment Request Workflow',
  code: 'PAYMENT_REQUEST_STD',
  description: 'Standard 6-stage payment request approval workflow with smart fallback strategies',
  entity_type: 'payment_request',
  version: 1,
  is_active: true,
  is_default: true,
  allow_parallel_stages: false,
  require_all_approvals: true,
  max_rejection_count: 3,
  expiry_days: 30,
  stages: [
    {
      name: 'Initiation',
      code: 'INITIATION',
      description: 'Request initiated and validated by the system',
      stage_order: 1,
      assignee_type: 'dynamic',
      fallback_strategy: 'auto_approve',
      is_optional: false,
      sla_hours: 1,
      escalation_hours: 2,
    },
    {
      name: 'Business Approval',
      code: 'BUSINESS_APPROVAL',
      description: 'Manager or Department Head approves the business need',
      stage_order: 2,
      assignee_type: 'initiator_manager',
      assigned_role: null,
      fallback_strategy: 'auto_assign_admin',
      secondary_fallback: 'escalate_to_owner',
      is_optional: false,
      sla_hours: 24,
      escalation_hours: 48,
    },
    {
      name: 'Finance Validation',
      code: 'FINANCE_VALIDATION',
      description: 'Finance team validates budget availability and accounting codes',
      stage_order: 3,
      assignee_type: 'role',
      assigned_role: 'FINANCE_CONTROLLER',
      fallback_strategy: 'auto_assign_admin',
      secondary_fallback: 'escalate_to_super_admin',
      is_optional: true,
      is_conditional: true,
      min_amount: 1000,
      sla_hours: 24,
      escalation_hours: 48,
    },
    {
      name: 'Payment Authorization',
      code: 'PAYMENT_AUTHORIZATION',
      description: 'CFO authorizes payment for high-value transactions',
      stage_order: 4,
      assignee_type: 'role',
      assigned_role: 'CFO',
      fallback_strategy: 'escalate_to_owner',
      secondary_fallback: 'auto_assign_admin',
      is_optional: true,
      is_conditional: true,
      min_amount: 50000,
      sla_hours: 48,
      escalation_hours: 72,
    },
    {
      name: 'Payment Execution',
      code: 'PAYMENT_EXECUTION',
      description: 'Accounts Payable processes the actual payment',
      stage_order: 5,
      assignee_type: 'role',
      assigned_role: 'ACCOUNTS_PAYABLE',
      fallback_strategy: 'auto_assign_admin',
      is_optional: false,
      require_comment: true,
      sla_hours: 24,
      escalation_hours: 48,
    },
    {
      name: 'Completion',
      code: 'COMPLETION',
      description: 'Payment completed and recorded in the system',
      stage_order: 6,
      assignee_type: 'dynamic',
      fallback_strategy: 'auto_approve',
      is_optional: false,
      sla_hours: 1,
      escalation_hours: 2,
    },
  ],
}

// Additional workflow templates for other entity types
const EXPENSE_CLAIM_WORKFLOW = {
  name: 'Employee Expense Claim Workflow',
  code: 'EXPENSE_CLAIM_STD',
  description: 'Standard 4-stage expense claim approval workflow',
  entity_type: 'expense_claim',
  version: 1,
  is_active: true,
  is_default: true,
  allow_parallel_stages: false,
  require_all_approvals: true,
  max_rejection_count: 2,
  expiry_days: 14,
  stages: [
    {
      name: 'Submission',
      code: 'SUBMISSION',
      description: 'Expense claim submitted with receipts',
      stage_order: 1,
      assignee_type: 'dynamic',
      fallback_strategy: 'auto_approve',
      is_optional: false,
      sla_hours: 1,
      escalation_hours: 2,
    },
    {
      name: 'Manager Approval',
      code: 'MANAGER_APPROVAL',
      description: 'Direct manager reviews and approves the expense',
      stage_order: 2,
      assignee_type: 'initiator_manager',
      fallback_strategy: 'auto_assign_admin',
      is_optional: false,
      sla_hours: 48,
      escalation_hours: 72,
    },
    {
      name: 'Finance Review',
      code: 'FINANCE_REVIEW',
      description: 'Finance verifies receipts and expense policy compliance',
      stage_order: 3,
      assignee_type: 'role',
      assigned_role: 'FINANCE_CONTROLLER',
      fallback_strategy: 'auto_assign_admin',
      is_optional: true,
      min_amount: 500,
      sla_hours: 24,
      escalation_hours: 48,
    },
    {
      name: 'Reimbursement',
      code: 'REIMBURSEMENT',
      description: 'Expense reimbursed to employee',
      stage_order: 4,
      assignee_type: 'role',
      assigned_role: 'ACCOUNTS_PAYABLE',
      fallback_strategy: 'auto_assign_admin',
      is_optional: false,
      require_comment: true,
      sla_hours: 48,
      escalation_hours: 72,
    },
  ],
}

const PURCHASE_ORDER_WORKFLOW = {
  name: 'Purchase Order Approval Workflow',
  code: 'PURCHASE_ORDER_STD',
  description: 'Standard 5-stage purchase order approval workflow',
  entity_type: 'purchase_order',
  version: 1,
  is_active: true,
  is_default: true,
  allow_parallel_stages: false,
  require_all_approvals: true,
  max_rejection_count: 3,
  expiry_days: 21,
  stages: [
    {
      name: 'PO Creation',
      code: 'PO_CREATION',
      description: 'Purchase order created and submitted',
      stage_order: 1,
      assignee_type: 'dynamic',
      fallback_strategy: 'auto_approve',
      is_optional: false,
      sla_hours: 1,
      escalation_hours: 2,
    },
    {
      name: 'Department Approval',
      code: 'DEPT_APPROVAL',
      description: 'Department head approves the purchase request',
      stage_order: 2,
      assignee_type: 'department_head',
      fallback_strategy: 'auto_assign_admin',
      is_optional: false,
      sla_hours: 24,
      escalation_hours: 48,
    },
    {
      name: 'Budget Verification',
      code: 'BUDGET_VERIFICATION',
      description: 'Finance verifies budget availability',
      stage_order: 3,
      assignee_type: 'role',
      assigned_role: 'FINANCE_CONTROLLER',
      fallback_strategy: 'auto_assign_admin',
      is_optional: false,
      sla_hours: 24,
      escalation_hours: 48,
    },
    {
      name: 'Executive Approval',
      code: 'EXECUTIVE_APPROVAL',
      description: 'Executive approval for high-value purchases',
      stage_order: 4,
      assignee_type: 'role',
      assigned_role: 'CFO',
      fallback_strategy: 'escalate_to_owner',
      is_optional: true,
      is_conditional: true,
      min_amount: 100000,
      sla_hours: 48,
      escalation_hours: 72,
    },
    {
      name: 'PO Dispatch',
      code: 'PO_DISPATCH',
      description: 'Purchase order sent to vendor',
      stage_order: 5,
      assignee_type: 'role',
      assigned_role: 'PROCUREMENT_OFFICER',
      fallback_strategy: 'auto_assign_admin',
      is_optional: false,
      sla_hours: 24,
      escalation_hours: 48,
    },
  ],
}

async function seedApprovalWorkflows(tenantId: string, createdBy: string) {
  console.log(`[seed] Creating approval workflows for tenant: ${tenantId}`)

  const workflows = [
    PAYMENT_REQUEST_WORKFLOW,
    EXPENSE_CLAIM_WORKFLOW,
    PURCHASE_ORDER_WORKFLOW,
  ]

  for (const workflow of workflows) {
    // Check if workflow already exists
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM approval_workflow_templates 
      WHERE tenant_id = ${tenantId}::uuid 
        AND code = ${workflow.code}
        AND version = ${workflow.version}
      LIMIT 1
    `

    if (existing.length > 0) {
      console.log(`[seed] Workflow ${workflow.code} already exists, skipping...`)
      continue
    }

    // Create workflow template
    const templateId = crypto.randomUUID()
    await prisma.$executeRaw`
      INSERT INTO approval_workflow_templates (
        id, tenant_id, name, code, description, entity_type,
        version, is_active, is_default, allow_parallel_stages,
        require_all_approvals, max_rejection_count, expiry_days,
        created_by, created_at
      ) VALUES (
        ${templateId}::uuid,
        ${tenantId}::uuid,
        ${workflow.name},
        ${workflow.code},
        ${workflow.description},
        ${workflow.entity_type},
        ${workflow.version},
        ${workflow.is_active},
        ${workflow.is_default},
        ${workflow.allow_parallel_stages},
        ${workflow.require_all_approvals},
        ${workflow.max_rejection_count},
        ${workflow.expiry_days},
        ${createdBy}::uuid,
        NOW()
      )
    `

    console.log(`[seed] Created workflow template: ${workflow.name}`)

    // Create stages
    for (const stage of workflow.stages) {
      const stageId = crypto.randomUUID()
      await prisma.$executeRaw`
        INSERT INTO approval_workflow_stages (
          id, workflow_template_id, name, code, description, stage_order,
          assignee_type, assigned_role, fallback_strategy, secondary_fallback,
          is_optional, is_conditional, min_amount, max_amount,
          require_comment, sla_hours, escalation_hours, created_at
        ) VALUES (
          ${stageId}::uuid,
          ${templateId}::uuid,
          ${stage.name},
          ${stage.code},
          ${stage.description},
          ${stage.stage_order},
          ${stage.assignee_type},
          ${stage.assigned_role || null},
          ${stage.fallback_strategy},
          ${(stage as any).secondary_fallback || null},
          ${stage.is_optional || false},
          ${(stage as any).is_conditional || false},
          ${(stage as any).min_amount || null},
          ${(stage as any).max_amount || null},
          ${(stage as any).require_comment || false},
          ${stage.sla_hours},
          ${stage.escalation_hours},
          NOW()
        )
      `
    }

    console.log(`[seed] Created ${workflow.stages.length} stages for ${workflow.code}`)
  }
}

async function main() {
  console.log('[seed] Starting approval workflow seed...')

  // Get all active tenants
  const tenants = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM tenants WHERE is_active = true LIMIT 100
  `

  if (tenants.length === 0) {
    console.log('[seed] No active tenants found. Creating default workflow for system...')
    // Use a system default tenant ID if no tenants exist
    const systemTenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
    const systemUserId = process.env.DEFAULT_ADMIN_ID || '00000000-0000-0000-0000-000000000001'
    
    try {
      await seedApprovalWorkflows(systemTenantId, systemUserId)
    } catch (err) {
      console.log('[seed] Could not create for system tenant, tenants table may not exist yet')
    }
  } else {
    // For each tenant, get an admin user and create workflows
    for (const tenant of tenants) {
      // Find an admin user for this tenant
      const admins = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT u.id FROM users_enhanced u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.enterprise_id = ${tenant.id}::uuid
          AND r.code IN ('ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN')
          AND u.is_active = true
        LIMIT 1
      `

      const createdBy = admins.length > 0 ? admins[0].id : tenant.id
      await seedApprovalWorkflows(tenant.id, createdBy)
    }
  }

  console.log('[seed] Approval workflow seed completed!')
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
