-- ═══════════════════════════════════════════════════════════════════════════════
-- BISMAN ERP - Multi-Tenant Approval Workflow Engine
-- Migration: 010_approval_workflow_engine.sql
-- 
-- Purpose: Flexible, stage-based approval workflow system that works for
-- organizations of any size (1-3 users to 100+ users)
-- 
-- Key Design Principles:
-- 1. Stage-based, NOT role-dependent
-- 2. Flexible fallback strategies to never block workflows
-- 3. Multi-tenant isolation
-- 4. Comprehensive audit logging
-- 5. Support for small teams (one user approving multiple stages)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Approval stage statuses
CREATE TYPE approval_stage_status AS ENUM (
  'pending',           -- Waiting to be activated
  'active',            -- Currently awaiting approval
  'approved',          -- Stage approved
  'rejected',          -- Stage rejected
  'skipped',           -- Stage skipped (fallback applied)
  'escalated',         -- Escalated to higher authority
  'auto_approved'      -- Auto-approved by system
);

-- Approval instance statuses
CREATE TYPE approval_instance_status AS ENUM (
  'draft',             -- Not yet submitted
  'in_progress',       -- Workflow is active
  'completed',         -- All stages completed successfully
  'rejected',          -- Workflow rejected at some stage
  'cancelled',         -- Cancelled by initiator
  'expired'            -- Workflow expired due to timeout
);

-- Assignee types for stages
CREATE TYPE stage_assignee_type AS ENUM (
  'specific_user',     -- Assigned to a specific user
  'role',              -- Assigned to anyone with a specific role
  'department_head',   -- Assigned to department head
  'initiator_manager', -- Assigned to the initiator's manager
  'dynamic'            -- Determined at runtime by custom logic
);

-- Fallback strategies when no approver is found
CREATE TYPE fallback_strategy AS ENUM (
  'auto_assign_admin',       -- Assign to Client/Tenant Admin
  'auto_approve',            -- Automatically approve the stage
  'escalate_to_owner',       -- Escalate to business owner
  'escalate_to_super_admin', -- Escalate to Super Admin
  'skip_stage',              -- Skip this stage entirely
  'block_and_notify',        -- Block and notify admins
  'assign_to_initiator'      -- Assign back to initiator (for self-service)
);

-- Workflow entity types
CREATE TYPE workflow_entity_type AS ENUM (
  'payment_request',
  'purchase_order',
  'leave_request',
  'expense_claim',
  'vendor_onboarding',
  'invoice_approval',
  'contract_approval',
  'budget_request',
  'asset_disposal',
  'custom'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_workflow_templates
-- Master template for workflows - defines the workflow structure
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,                       -- Multi-tenant isolation
  
  -- Template identity
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,                     -- Unique code like 'PAYMENT_REQUEST_WORKFLOW'
  description TEXT,
  entity_type workflow_entity_type NOT NULL,     -- What this workflow approves
  
  -- Versioning
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,    -- Default workflow for entity type
  
  -- Configuration
  allow_parallel_stages BOOLEAN DEFAULT false,   -- Can stages run in parallel?
  require_all_approvals BOOLEAN DEFAULT true,    -- All stages must approve?
  max_rejection_count INT DEFAULT 3,             -- Max rejections before permanent reject
  expiry_days INT DEFAULT 30,                    -- Days before workflow expires
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE (tenant_id, code, version),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX idx_workflow_templates_tenant ON approval_workflow_templates(tenant_id);
CREATE INDEX idx_workflow_templates_entity ON approval_workflow_templates(entity_type);
CREATE INDEX idx_workflow_templates_active ON approval_workflow_templates(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_workflow_stages
-- Defines individual stages within a workflow template
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID NOT NULL,
  
  -- Stage identity
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,                     -- e.g., 'BUSINESS_APPROVAL', 'FINANCE_VALIDATION'
  description TEXT,
  stage_order INT NOT NULL,                      -- Execution order (1, 2, 3...)
  
  -- Assignment configuration
  assignee_type stage_assignee_type NOT NULL,
  assigned_user_id UUID,                         -- If assignee_type = 'specific_user'
  assigned_role VARCHAR(50),                     -- If assignee_type = 'role'
  assignment_condition JSONB,                    -- Dynamic conditions for assignment
  
  -- Fallback configuration (CRITICAL for never blocking workflows)
  fallback_strategy fallback_strategy NOT NULL DEFAULT 'auto_assign_admin',
  fallback_user_id UUID,                         -- Specific fallback user
  fallback_role VARCHAR(50),                     -- Fallback role
  secondary_fallback fallback_strategy,          -- If first fallback also fails
  
  -- Stage rules
  is_optional BOOLEAN DEFAULT false,             -- Can this stage be skipped?
  is_conditional BOOLEAN DEFAULT false,          -- Stage only activates if condition met
  condition_expression JSONB,                    -- JSON condition: {"amount_gte": 10000}
  allow_self_approval BOOLEAN DEFAULT false,     -- Can initiator approve their own request?
  require_comment BOOLEAN DEFAULT false,         -- Require comment on approval/rejection
  
  -- Thresholds (for amount-based workflows)
  min_amount DECIMAL(15,2),                      -- Minimum amount for this stage to activate
  max_amount DECIMAL(15,2),                      -- Maximum amount this stage can approve
  
  -- SLA configuration
  sla_hours INT DEFAULT 24,                      -- Hours to complete this stage
  escalation_hours INT DEFAULT 48,               -- Hours before auto-escalation
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE (workflow_template_id, stage_order),
  UNIQUE (workflow_template_id, code),
  FOREIGN KEY (workflow_template_id) REFERENCES approval_workflow_templates(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_workflow_stages_template ON approval_workflow_stages(workflow_template_id);
CREATE INDEX idx_workflow_stages_order ON approval_workflow_stages(workflow_template_id, stage_order);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_instances
-- Runtime instances of workflows - one per approval request
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workflow_template_id UUID NOT NULL,
  
  -- What is being approved
  entity_type workflow_entity_type NOT NULL,
  entity_id UUID NOT NULL,                       -- ID of the payment_request, PO, etc.
  entity_reference VARCHAR(100),                 -- Human-readable reference (PR-2024-001)
  
  -- Instance state
  status approval_instance_status NOT NULL DEFAULT 'draft',
  current_stage_id UUID,                         -- Currently active stage
  current_stage_order INT DEFAULT 0,
  
  -- Request context
  requested_amount DECIMAL(15,2),                -- For amount-based stage conditions
  request_metadata JSONB,                        -- Additional context for approval
  
  -- Tracking
  initiated_by UUID NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  
  -- Rejection tracking
  rejection_count INT DEFAULT 0,
  last_rejection_reason TEXT,
  last_rejected_by UUID,
  last_rejected_at TIMESTAMPTZ,
  
  -- Expiry
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_template_id) REFERENCES approval_workflow_templates(id),
  FOREIGN KEY (current_stage_id) REFERENCES approval_workflow_stages(id)
);

-- Indexes
CREATE INDEX idx_approval_instances_tenant ON approval_instances(tenant_id);
CREATE INDEX idx_approval_instances_entity ON approval_instances(entity_type, entity_id);
CREATE INDEX idx_approval_instances_status ON approval_instances(status);
CREATE INDEX idx_approval_instances_initiated_by ON approval_instances(initiated_by);
CREATE INDEX idx_approval_instances_current_stage ON approval_instances(current_stage_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_stage_instances
-- Runtime state of each stage within an approval instance
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_stage_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_instance_id UUID NOT NULL,
  workflow_stage_id UUID NOT NULL,
  
  -- Stage state
  status approval_stage_status NOT NULL DEFAULT 'pending',
  stage_order INT NOT NULL,
  
  -- Resolved approver (determined at runtime)
  resolved_approver_id UUID,                     -- The actual user who should approve
  resolved_via stage_assignee_type,              -- How the approver was resolved
  fallback_applied fallback_strategy,            -- If fallback was used, which one
  
  -- Action tracking
  actioned_by UUID,                              -- Who approved/rejected
  actioned_at TIMESTAMPTZ,
  action_comment TEXT,
  
  -- SLA tracking
  activated_at TIMESTAMPTZ,                      -- When stage became active
  due_at TIMESTAMPTZ,                            -- SLA deadline
  escalated_at TIMESTAMPTZ,
  escalated_to UUID,
  
  -- Attempt tracking (for re-submissions after rejection)
  attempt_number INT DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE (approval_instance_id, workflow_stage_id, attempt_number),
  FOREIGN KEY (approval_instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_stage_id) REFERENCES approval_workflow_stages(id)
);

-- Indexes
CREATE INDEX idx_stage_instances_approval ON approval_stage_instances(approval_instance_id);
CREATE INDEX idx_stage_instances_status ON approval_stage_instances(status);
CREATE INDEX idx_stage_instances_approver ON approval_stage_instances(resolved_approver_id);
CREATE INDEX idx_stage_instances_due ON approval_stage_instances(due_at) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_audit_log
-- Comprehensive audit trail for all approval actions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  approval_instance_id UUID NOT NULL,
  stage_instance_id UUID,
  
  -- Action details
  action VARCHAR(50) NOT NULL,                   -- 'initiated', 'approved', 'rejected', 'escalated', etc.
  action_category VARCHAR(30) NOT NULL,          -- 'workflow', 'stage', 'system'
  
  -- Actor
  performed_by UUID,                             -- NULL for system actions
  performed_by_name VARCHAR(200),
  performed_by_role VARCHAR(50),
  is_system_action BOOLEAN DEFAULT false,
  
  -- Context
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  comment TEXT,
  metadata JSONB,                                -- Additional context (IP, device, etc.)
  
  -- Timing
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (approval_instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_instance_id) REFERENCES approval_stage_instances(id)
);

-- Indexes
CREATE INDEX idx_audit_log_tenant ON approval_audit_log(tenant_id);
CREATE INDEX idx_audit_log_instance ON approval_audit_log(approval_instance_id);
CREATE INDEX idx_audit_log_performed_at ON approval_audit_log(performed_at);
CREATE INDEX idx_audit_log_action ON approval_audit_log(action);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_delegation
-- Temporary delegation of approval authority (vacation, etc.)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_delegation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Delegation details
  delegator_id UUID NOT NULL,                    -- User delegating authority
  delegate_id UUID NOT NULL,                     -- User receiving authority
  
  -- Scope
  workflow_template_id UUID,                     -- NULL = all workflows
  stage_id UUID,                                 -- NULL = all stages
  entity_type workflow_entity_type,              -- NULL = all entity types
  max_amount DECIMAL(15,2),                      -- Maximum amount they can approve
  
  -- Validity
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  
  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CHECK (valid_from < valid_until)
);

-- Indexes
CREATE INDEX idx_delegation_tenant ON approval_delegation(tenant_id);
CREATE INDEX idx_delegation_delegator ON approval_delegation(delegator_id);
CREATE INDEX idx_delegation_delegate ON approval_delegation(delegate_id);
CREATE INDEX idx_delegation_active ON approval_delegation(is_active, valid_from, valid_until);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_notifications
-- Queue for approval notifications
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  approval_instance_id UUID NOT NULL,
  stage_instance_id UUID,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL,        -- 'approval_required', 'approved', 'rejected', 'escalated', 'reminder'
  recipient_id UUID NOT NULL,
  recipient_email VARCHAR(255),
  
  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  
  -- Delivery tracking
  channel VARCHAR(30) NOT NULL DEFAULT 'in_app', -- 'in_app', 'email', 'sms', 'push'
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  delivery_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  retry_count INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (approval_instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_notifications_tenant ON approval_notifications(tenant_id);
CREATE INDEX idx_notifications_recipient ON approval_notifications(recipient_id);
CREATE INDEX idx_notifications_pending ON approval_notifications(delivery_status) WHERE delivery_status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA: Default Payment Request Workflow Template
-- This creates the 6-stage payment request workflow
-- ═══════════════════════════════════════════════════════════════════════════════

-- Note: This is a template insert - tenant_id and created_by would be set at runtime
-- Keeping as reference for the workflow structure

/*
INSERT INTO approval_workflow_templates (
  id, tenant_id, name, code, description, entity_type, 
  version, is_active, is_default, created_by
) VALUES (
  gen_random_uuid(),
  '{{TENANT_ID}}',
  'Standard Payment Request Workflow',
  'PAYMENT_REQUEST_STD',
  'Standard 6-stage payment request approval workflow with fallback strategies',
  'payment_request',
  1, true, true,
  '{{ADMIN_USER_ID}}'
);

-- Stage 1: Initiation (Auto-approved by system when submitted)
INSERT INTO approval_workflow_stages (
  workflow_template_id, name, code, description, stage_order,
  assignee_type, fallback_strategy, is_optional, sla_hours
) VALUES (
  '{{WORKFLOW_ID}}',
  'Initiation',
  'INITIATION',
  'Request initiated and validated',
  1,
  'dynamic',
  'auto_approve',
  false,
  1
);

-- Stage 2: Business Approval (Manager or Department Head)
INSERT INTO approval_workflow_stages (
  workflow_template_id, name, code, description, stage_order,
  assignee_type, assigned_role, fallback_strategy, secondary_fallback,
  is_optional, sla_hours, escalation_hours
) VALUES (
  '{{WORKFLOW_ID}}',
  'Business Approval',
  'BUSINESS_APPROVAL',
  'Manager or Department Head approves business need',
  2,
  'initiator_manager',
  NULL,
  'auto_assign_admin',
  'escalate_to_owner',
  false,
  24,
  48
);

-- Stage 3: Finance Validation
INSERT INTO approval_workflow_stages (
  workflow_template_id, name, code, description, stage_order,
  assignee_type, assigned_role, fallback_strategy, secondary_fallback,
  min_amount, is_optional, sla_hours
) VALUES (
  '{{WORKFLOW_ID}}',
  'Finance Validation',
  'FINANCE_VALIDATION',
  'Finance team validates budget and accounting',
  3,
  'role',
  'FINANCE_CONTROLLER',
  'auto_assign_admin',
  'escalate_to_super_admin',
  1000.00,  -- Only required for amounts >= 1000
  true,
  24
);

-- Stage 4: Payment Authorization (CFO for large amounts)
INSERT INTO approval_workflow_stages (
  workflow_template_id, name, code, description, stage_order,
  assignee_type, assigned_role, fallback_strategy, secondary_fallback,
  min_amount, is_optional, sla_hours
) VALUES (
  '{{WORKFLOW_ID}}',
  'Payment Authorization',
  'PAYMENT_AUTHORIZATION',
  'CFO authorizes payment for large amounts',
  4,
  'role',
  'CFO',
  'escalate_to_owner',
  'auto_assign_admin',
  50000.00,  -- Only required for amounts >= 50000
  true,
  48
);

-- Stage 5: Payment Execution (Accounts Payable)
INSERT INTO approval_workflow_stages (
  workflow_template_id, name, code, description, stage_order,
  assignee_type, assigned_role, fallback_strategy,
  is_optional, require_comment, sla_hours
) VALUES (
  '{{WORKFLOW_ID}}',
  'Payment Execution',
  'PAYMENT_EXECUTION',
  'Accounts Payable processes the payment',
  5,
  'role',
  'ACCOUNTS_PAYABLE',
  'auto_assign_admin',
  false,
  true,
  24
);

-- Stage 6: Completion (Auto-completed by system)
INSERT INTO approval_workflow_stages (
  workflow_template_id, name, code, description, stage_order,
  assignee_type, fallback_strategy, is_optional, sla_hours
) VALUES (
  '{{WORKFLOW_ID}}',
  'Completion',
  'COMPLETION',
  'Payment completed and recorded',
  6,
  'dynamic',
  'auto_approve',
  false,
  1
);
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Helper functions for approval workflow
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function to get pending approvals for a user
CREATE OR REPLACE FUNCTION get_pending_approvals_for_user(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  instance_id UUID,
  stage_instance_id UUID,
  entity_type workflow_entity_type,
  entity_id UUID,
  entity_reference VARCHAR,
  stage_name VARCHAR,
  requested_amount DECIMAL,
  initiated_by UUID,
  initiated_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id AS instance_id,
    asi.id AS stage_instance_id,
    ai.entity_type,
    ai.entity_id,
    ai.entity_reference,
    aws.name AS stage_name,
    ai.requested_amount,
    ai.initiated_by,
    ai.initiated_at,
    asi.due_at
  FROM approval_instances ai
  JOIN approval_stage_instances asi ON asi.approval_instance_id = ai.id
  JOIN approval_workflow_stages aws ON aws.id = asi.workflow_stage_id
  WHERE ai.tenant_id = p_tenant_id
    AND ai.status = 'in_progress'
    AND asi.status = 'active'
    AND asi.resolved_approver_id = p_user_id
  ORDER BY asi.due_at ASC NULLS LAST, ai.initiated_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can approve a specific stage
CREATE OR REPLACE FUNCTION can_user_approve_stage(
  p_user_id UUID,
  p_stage_instance_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_approver_id UUID;
  v_delegate_exists BOOLEAN;
BEGIN
  -- Check if user is the resolved approver
  SELECT resolved_approver_id INTO v_approver_id
  FROM approval_stage_instances
  WHERE id = p_stage_instance_id AND status = 'active';
  
  IF v_approver_id = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has active delegation from the approver
  SELECT EXISTS (
    SELECT 1 FROM approval_delegation
    WHERE delegate_id = p_user_id
      AND delegator_id = v_approver_id
      AND is_active = true
      AND NOW() BETWEEN valid_from AND valid_until
  ) INTO v_delegate_exists;
  
  RETURN v_delegate_exists;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add appropriate grants based on your database roles
-- GRANT SELECT, INSERT, UPDATE ON approval_workflow_templates TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON approval_workflow_stages TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON approval_instances TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON approval_stage_instances TO app_user;
-- GRANT SELECT, INSERT ON approval_audit_log TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON approval_delegation TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON approval_notifications TO app_user;

COMMENT ON TABLE approval_workflow_templates IS 'Master templates for approval workflows - defines structure and configuration';
COMMENT ON TABLE approval_workflow_stages IS 'Individual stages within workflow templates - ordered approval steps';
COMMENT ON TABLE approval_instances IS 'Runtime instances of workflows - one per approval request';
COMMENT ON TABLE approval_stage_instances IS 'Runtime state of each stage within an approval instance';
COMMENT ON TABLE approval_audit_log IS 'Comprehensive audit trail for all approval actions';
COMMENT ON TABLE approval_delegation IS 'Temporary delegation of approval authority';
COMMENT ON TABLE approval_notifications IS 'Queue for approval-related notifications';
