-- ============================================================================
-- PAYMENT REQUEST WORKFLOW V2 MIGRATION
-- ============================================================================
-- 
-- Adds new columns and constraints for:
-- 1. Extended state machine (ACCOUNTED, QUEUED_FOR_SETTLEMENT, SETTLED)
-- 2. Clarification governance
-- 3. Settlement batch tracking
-- 4. Year-based sequence for request numbers
--
-- Run this AFTER backing up your database!
-- ============================================================================

-- Prisma handles transactions, removed BEGIN;

-- ============================================================================
-- 1. ADD NEW STATUS VALUES TO ENUM (if using enum type)
-- ============================================================================

-- If using VARCHAR for status, no change needed
-- If using ENUM type, uncomment below:
-- ALTER TYPE payment_request_status ADD VALUE IF NOT EXISTS 'ACCOUNTED';
-- ALTER TYPE payment_request_status ADD VALUE IF NOT EXISTS 'QUEUED_FOR_SETTLEMENT';
-- ALTER TYPE payment_request_status ADD VALUE IF NOT EXISTS 'SETTLED';

-- ============================================================================
-- 2. ADD NEW COLUMNS TO payment_requests TABLE
-- ============================================================================

-- Approval amount tracking
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS requested_amount DECIMAL(18,2);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(18,2);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users_enhanced(id);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Settlement tracking
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS settlement_batch_id UUID;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS settlement_utr VARCHAR(100);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS settled_by UUID REFERENCES users_enhanced(id);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS accounted_at TIMESTAMP;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS accounted_by UUID REFERENCES users_enhanced(id);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS accounting_voucher_number VARCHAR(100);

-- Clarification governance
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS clarification_count INTEGER DEFAULT 0;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS max_clarification_loops INTEGER DEFAULT 3;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS last_clarification_at TIMESTAMP;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS clarification_deadline TIMESTAMP;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

-- Resolution tracking
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users_enhanced(id);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS resolution_reason TEXT;

-- Hierarchy tracking
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users_enhanced(id);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS requester_level INTEGER;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS approver_level INTEGER;

-- Approval chain for multi-level approval
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS approval_chain JSONB DEFAULT '[]';

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS current_approval_level INTEGER DEFAULT 1;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS max_approval_level INTEGER DEFAULT 1;

-- ============================================================================
-- 3. CREATE SETTLEMENT BATCHES TABLE (NEW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Batch details
  tenant_id UUID NOT NULL ,
  batch_type VARCHAR(50) DEFAULT 'WEEKLY', -- DAILY, WEEKLY, MONTHLY
  
  -- Amount summary
  total_requests INTEGER DEFAULT 0,
  total_amount DECIMAL(18,2) DEFAULT 0,
  settled_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Bank details
  bank_account_id UUID,
  bank_transaction_id VARCHAR(100),
  utr_number VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, LOCKED, PROCESSING, SETTLED, FAILED
  
  -- Dates
  settlement_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  settled_at TIMESTAMP,
  
  -- Audit
  created_by UUID REFERENCES users_enhanced(id),
  processed_by UUID REFERENCES users_enhanced(id),
  
  CONSTRAINT valid_batch_status CHECK (
    status IN ('OPEN', 'LOCKED', 'PROCESSING', 'SETTLED', 'FAILED', 'CANCELLED')
  )
);

CREATE INDEX IF NOT EXISTS idx_settlement_batches_tenant ON payment_settlement_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_status ON payment_settlement_batches(status);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_date ON payment_settlement_batches(settlement_date);

-- ============================================================================
-- 4. CREATE PAYMENT REQUEST MESSAGES TABLE (for clarifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id VARCHAR(255) NOT NULL,
  
  sender_id UUID NOT NULL REFERENCES users_enhanced(id),
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'COMMENT',
  
  is_system_message BOOLEAN DEFAULT false,
  is_clarification_request BOOLEAN DEFAULT false,
  is_clarification_response BOOLEAN DEFAULT false,
  
  attachments JSONB DEFAULT '[]',
  read_by UUID[] DEFAULT '{}',
  
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_messages_request ON payment_request_messages(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_messages_sender ON payment_request_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_pr_messages_type ON payment_request_messages(message_type);

-- ============================================================================
-- 5. CREATE YEAR-BASED SEQUENCES FOR REQUEST NUMBERS
-- ============================================================================

-- Create sequence for current year (2025)
CREATE SEQUENCE IF NOT EXISTS payment_request_seq_2025 START WITH 1 INCREMENT BY 1 NO CYCLE;

-- Create sequence for next year (2026) - preemptive
CREATE SEQUENCE IF NOT EXISTS payment_request_seq_2026 START WITH 1 INCREMENT BY 1 NO CYCLE;

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_payment_request_number(p_tenant_id UUID DEFAULT NULL)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_year INTEGER;
  v_seq_name TEXT;
  v_next_num BIGINT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_seq_name := 'payment_request_seq_' || v_year;
  
  -- Create sequence for year if not exists
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START WITH 1 INCREMENT BY 1 NO CYCLE', v_seq_name);
  
  -- Get next value
  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next_num;
  
  RETURN 'PAY-' || v_year || '-' || LPAD(v_next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ADD CONSTRAINTS FOR STATE MACHINE
-- ============================================================================

-- Ensure approved_amount is set when in approval states
ALTER TABLE payment_requests 
ADD CONSTRAINT check_approved_amount_required 
CHECK (
  (status NOT IN ('APPROVED', 'PARTIALLY_APPROVED', 'ACCOUNTED', 'QUEUED_FOR_SETTLEMENT', 'SETTLED', 'PAID'))
  OR 
  (approved_amount IS NOT NULL AND approved_amount > 0)
);

-- Ensure approved_amount doesn't exceed requested_amount
ALTER TABLE payment_requests 
ADD CONSTRAINT check_approved_lte_requested 
CHECK (
  approved_amount IS NULL 
  OR requested_amount IS NULL 
  OR approved_amount <= requested_amount
);

-- Ensure APPROVED has full amount and PARTIALLY_APPROVED has less
-- (This is enforced in service layer, but adding soft check)

-- ============================================================================
-- 7. ADD AUDIT COLUMNS TO APPROVALS TABLE (SKIP IF TABLE DOESN'T EXIST)
-- ============================================================================

-- Note: payment_request_approvals may not exist on all deployments, wrapping in DO block
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_request_approvals') THEN
    ALTER TABLE payment_request_approvals ADD COLUMN IF NOT EXISTS action_at TIMESTAMP DEFAULT NOW();
    ALTER TABLE payment_request_approvals ADD COLUMN IF NOT EXISTS ip_address INET;
    ALTER TABLE payment_request_approvals ADD COLUMN IF NOT EXISTS user_agent TEXT;
    ALTER TABLE payment_request_approvals ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);
  END IF;
END $$;

-- ============================================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Wrap index creation in DO block to handle column differences
DO $$
BEGIN
  -- Only create indexes if columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'requested_by') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_requested_by ON payment_requests(requested_by);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'approved_by') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_approved_by ON payment_requests(approved_by);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'settlement_batch_id') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_settlement_batch ON payment_requests(settlement_batch_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'clarification_deadline') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_clarification_deadline ON payment_requests(clarification_deadline) WHERE clarification_deadline IS NOT NULL;
  END IF;
  
  -- Use clientId instead of tenant_id if that's the column name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_status_tenant ON payment_requests(status, tenant_id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'clientId') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_status_client ON payment_requests(status, "clientId");
  END IF;
END $$;

-- ============================================================================
-- 9. MIGRATE EXISTING DATA
-- ============================================================================

-- Set requested_amount from totalAmount where missing
UPDATE payment_requests 
SET requested_amount = "totalAmount"
WHERE requested_amount IS NULL AND "totalAmount" IS NOT NULL;

-- Set requested_by from createdById where missing (convert int to uuid if needed)
-- This depends on your actual schema - adjust as needed
-- UPDATE payment_requests 
-- SET requested_by = (SELECT id FROM users WHERE users.legacy_id = payment_requests."createdById")
-- WHERE requested_by IS NULL;

-- Initialize clarification_count for existing records
UPDATE payment_requests 
SET clarification_count = 0 
WHERE clarification_count IS NULL;

-- ============================================================================
-- 10. VIEWS FOR REPORTING
-- ============================================================================

-- Note: This view has compatibility issues with different schema versions
-- Skipping view creation for production deployments with schema differences
-- The view can be created manually after verifying column compatibility

-- The view requires these columns in payment_requests:
-- requested_by, current_approver_id, workflow_status, clarification_count, etc.
-- These may not exist in all deployments

-- ============================================================================
-- 11. GRANT PERMISSIONS (adjust as needed)
-- ============================================================================

-- Example:
-- GRANT SELECT ON v_payment_requests_summary TO app_readonly;
-- GRANT ALL ON payment_settlement_batches TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Prisma handles transactions, removed COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (run if migration fails)
-- ============================================================================
/*
-- Removed BEGIN; inside comment block

-- Drop new constraints
ALTER TABLE payment_requests DROP CONSTRAINT IF EXISTS check_approved_amount_required;
ALTER TABLE payment_requests DROP CONSTRAINT IF EXISTS check_approved_lte_requested;

-- Drop new columns (be careful - data loss!)
ALTER TABLE payment_requests DROP COLUMN IF EXISTS settlement_batch_id;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS settlement_utr;
-- ... add other columns as needed

-- Drop new tables
DROP TABLE IF EXISTS payment_request_messages;
DROP TABLE IF EXISTS payment_settlement_batches;

-- Drop sequences
DROP SEQUENCE IF EXISTS payment_request_seq_2025;
DROP SEQUENCE IF EXISTS payment_request_seq_2026;

-- Drop function
DROP FUNCTION IF EXISTS generate_payment_request_number;

-- Drop view
DROP VIEW IF EXISTS v_payment_requests_summary;

-- Removed COMMIT for Prisma
*/
