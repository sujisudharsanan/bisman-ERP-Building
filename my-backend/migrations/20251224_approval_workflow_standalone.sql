-- Migration: Approval Workflow Tables (Standalone)
-- Date: 2025-12-24
-- Description: Creates required tables for Task Approvals page
-- Note: Standalone version without foreign key constraints to tenants table

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUMS (Create if not exists)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_stage_status') THEN
    CREATE TYPE approval_stage_status AS ENUM (
      'pending', 'active', 'approved', 'rejected', 'skipped', 'escalated', 'expired'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_instance_status') THEN
    CREATE TYPE approval_instance_status AS ENUM (
      'draft', 'pending', 'in_progress', 'approved', 'rejected', 'cancelled', 'expired'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stage_assignee_type') THEN
    CREATE TYPE stage_assignee_type AS ENUM (
      'specific_user', 'role', 'department_head', 'requester_manager', 'dynamic_rule'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fallback_strategy') THEN
    CREATE TYPE fallback_strategy AS ENUM (
      'none', 'skip_stage', 'auto_approve', 'auto_assign_admin', 
      'assign_department_head', 'escalate_to_next', 'queue_for_manual'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_entity_type') THEN
    CREATE TYPE workflow_entity_type AS ENUM (
      'payment_request', 'purchase_order', 'expense_claim', 'leave_request',
      'time_off', 'travel_request', 'asset_request', 'contract_approval',
      'invoice_approval', 'budget_request', 'general_approval', 'task_request'
    );
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_workflow_templates
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,                                -- Multi-tenant isolation
  
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
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE (tenant_id, code, version)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_templates_tenant ON approval_workflow_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_entity ON approval_workflow_templates(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_active ON approval_workflow_templates(is_active) WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_workflow_stages
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID NOT NULL REFERENCES approval_workflow_templates(id) ON DELETE CASCADE,
  
  -- Stage identity
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,                     -- e.g., 'BUSINESS_APPROVAL', 'FINANCE_VALIDATION'
  description TEXT,
  stage_order INT NOT NULL,                      -- Execution order (1, 2, 3...)
  
  -- Assignment configuration
  assignee_type stage_assignee_type NOT NULL DEFAULT 'role',
  assigned_user_id UUID,                         -- If assignee_type = 'specific_user'
  assigned_role VARCHAR(50),                     -- If assignee_type = 'role'
  assignment_condition JSONB,                    -- Dynamic conditions for assignment
  
  -- Fallback configuration (CRITICAL for never blocking workflows)
  fallback_strategy fallback_strategy NOT NULL DEFAULT 'auto_assign_admin',
  fallback_user_id UUID,                         -- Specific fallback user
  fallback_role VARCHAR(50),                     -- Fallback role
  secondary_fallback fallback_strategy,          -- If first fallback also fails
  fallback_reason TEXT,                          -- Reason for fallback
  
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
  UNIQUE (workflow_template_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_stages_template ON approval_workflow_stages(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stages_order ON approval_workflow_stages(workflow_template_id, stage_order);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_instances
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  workflow_template_id UUID REFERENCES approval_workflow_templates(id),
  
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
  updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approval_instances_tenant ON approval_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_instances_entity ON approval_instances(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_instances_status ON approval_instances(status);
CREATE INDEX IF NOT EXISTS idx_approval_instances_initiated_by ON approval_instances(initiated_by);
CREATE INDEX IF NOT EXISTS idx_approval_instances_current_stage ON approval_instances(current_stage_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_stage_instances
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_stage_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_instance_id UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
  workflow_stage_id UUID NOT NULL REFERENCES approval_workflow_stages(id),
  
  -- Stage state
  status approval_stage_status NOT NULL DEFAULT 'pending',
  stage_order INT NOT NULL,
  
  -- Resolved approver (determined at runtime)
  resolved_approver_id UUID,                     -- The actual user who should approve
  resolved_via stage_assignee_type,              -- How the approver was resolved
  fallback_applied fallback_strategy,            -- If fallback was used, which one
  fallback_reason TEXT,                          -- Reason for fallback
  
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
  UNIQUE (approval_instance_id, workflow_stage_id, attempt_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_instances_approval ON approval_stage_instances(approval_instance_id);
CREATE INDEX IF NOT EXISTS idx_stage_instances_status ON approval_stage_instances(status);
CREATE INDEX IF NOT EXISTS idx_stage_instances_approver ON approval_stage_instances(resolved_approver_id);
CREATE INDEX IF NOT EXISTS idx_stage_instances_due ON approval_stage_instances(due_at) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: approval_audit_log
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  approval_instance_id UUID NOT NULL REFERENCES approval_instances(id) ON DELETE CASCADE,
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
  metadata JSONB,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_instance ON approval_audit_log(approval_instance_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON approval_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON approval_audit_log(action);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Add foreign key from instances to stages
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'approval_instances_current_stage_fkey'
  ) THEN
    ALTER TABLE approval_instances 
    ADD CONSTRAINT approval_instances_current_stage_fkey 
    FOREIGN KEY (current_stage_id) REFERENCES approval_workflow_stages(id);
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE DEFAULT WORKFLOW TEMPLATE (for testing)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert default payment request workflow if not exists
INSERT INTO approval_workflow_templates (id, name, code, entity_type, is_active, is_default)
SELECT 
  gen_random_uuid(),
  'Default Payment Request Workflow',
  'PAYMENT_REQUEST_DEFAULT',
  'payment_request'::workflow_entity_type,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM approval_workflow_templates WHERE code = 'PAYMENT_REQUEST_DEFAULT'
);

-- Get the template ID for creating stages
DO $$
DECLARE
  v_template_id UUID;
BEGIN
  SELECT id INTO v_template_id FROM approval_workflow_templates WHERE code = 'PAYMENT_REQUEST_DEFAULT' LIMIT 1;
  
  IF v_template_id IS NOT NULL THEN
    -- Insert stages if they don't exist
    INSERT INTO approval_workflow_stages (workflow_template_id, name, code, stage_order, assignee_type, assigned_role, sla_hours)
    SELECT v_template_id, 'Manager Approval', 'MANAGER_APPROVAL', 1, 'requester_manager'::stage_assignee_type, 'Manager', 24
    WHERE NOT EXISTS (
      SELECT 1 FROM approval_workflow_stages 
      WHERE workflow_template_id = v_template_id AND code = 'MANAGER_APPROVAL'
    );
    
    INSERT INTO approval_workflow_stages (workflow_template_id, name, code, stage_order, assignee_type, assigned_role, sla_hours)
    SELECT v_template_id, 'Finance Validation', 'FINANCE_VALIDATION', 2, 'role'::stage_assignee_type, 'Accountant', 24
    WHERE NOT EXISTS (
      SELECT 1 FROM approval_workflow_stages 
      WHERE workflow_template_id = v_template_id AND code = 'FINANCE_VALIDATION'
    );
    
    INSERT INTO approval_workflow_stages (workflow_template_id, name, code, stage_order, assignee_type, assigned_role, sla_hours)
    SELECT v_template_id, 'CFO Approval', 'CFO_APPROVAL', 3, 'role'::stage_assignee_type, 'CFO', 48
    WHERE NOT EXISTS (
      SELECT 1 FROM approval_workflow_stages 
      WHERE workflow_template_id = v_template_id AND code = 'CFO_APPROVAL'
    );
  END IF;
END$$;

COMMENT ON TABLE approval_workflow_templates IS 'Workflow templates defining approval chains';
COMMENT ON TABLE approval_workflow_stages IS 'Individual stages within a workflow template';
COMMENT ON TABLE approval_instances IS 'Runtime instances of workflows - one per approval request';
COMMENT ON TABLE approval_stage_instances IS 'Runtime state of each stage within an approval instance';
COMMENT ON TABLE approval_audit_log IS 'Audit trail of all approval actions';

SELECT 'Approval workflow tables created successfully' AS result;
