-- ============================================================================
-- SETTLEMENT & PARTIAL PAYMENT SCHEMA
-- ============================================================================
-- 
-- Implements:
-- 1. Settlement entity for consolidated payments
-- 2. Partial payment tracking on payment_requests
-- 3. Settlement-to-request linkage with partial amounts
-- 4. Full audit trail for UTR propagation
--
-- Run this AFTER the V2 migration!
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SETTLEMENT STATUS ENUM
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'settlement_status') THEN
    CREATE TYPE settlement_status AS ENUM (
      'DRAFT',
      'SUBMITTED_TO_FINANCE',
      'FINANCE_CONTROLLER_APPROVED',
      'CFO_APPROVED',
      'SENT_TO_BANK',
      'PAID',
      'REJECTED',
      'CANCELLED'
    );
  END IF;
END $$;

-- ============================================================================
-- 2. SETTLEMENTS TABLE (Core Payment Unit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Summary (what non-accountants see)
  purpose TEXT NOT NULL,                      -- Combined summary for approvers
  beneficiary_name VARCHAR(255),              -- Primary beneficiary (or "Multiple")
  beneficiary_bank VARCHAR(255),
  beneficiary_account_masked VARCHAR(50),     -- Last 4 digits only for display
  beneficiary_account_full VARCHAR(100),      -- Full account (accountant only)
  beneficiary_ifsc VARCHAR(20),
  
  -- Amounts
  total_amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  
  -- Request summary (hidden from non-accountants)
  request_count INTEGER DEFAULT 0,
  vendor_count INTEGER DEFAULT 0,
  
  -- Status & Workflow
  status VARCHAR(50) DEFAULT 'DRAFT',
  current_stage VARCHAR(50) DEFAULT 'ACCOUNTANT_DRAFT',
  current_approver_id UUID REFERENCES users(id),
  
  -- Banking
  utr_number VARCHAR(100),
  bank_transaction_id VARCHAR(100),
  bank_reference VARCHAR(100),
  payment_mode VARCHAR(50),                   -- NEFT, RTGS, IMPS, CHEQUE
  bank_account_id UUID,                       -- Source bank account
  
  -- Dates
  settlement_date DATE,
  due_date DATE,
  paid_at TIMESTAMP,
  
  -- Remarks (visible to approvers)
  accountant_remarks TEXT,
  finance_remarks TEXT,
  cfo_remarks TEXT,
  banker_remarks TEXT,
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMP,
  finance_approved_by UUID REFERENCES users(id),
  finance_approved_at TIMESTAMP,
  cfo_approved_by UUID REFERENCES users(id),
  cfo_approved_at TIMESTAMP,
  sent_to_bank_by UUID REFERENCES users(id),
  sent_to_bank_at TIMESTAMP,
  executed_by UUID REFERENCES users(id),      -- Banker
  executed_at TIMESTAMP,
  rejected_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  rejection_stage VARCHAR(50),
  
  -- Tenant
  tenant_id UUID NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_settlement_amount CHECK (total_amount > 0),
  CONSTRAINT valid_settlement_status CHECK (
    status IN ('DRAFT', 'SUBMITTED_TO_FINANCE', 'FINANCE_CONTROLLER_APPROVED', 
               'CFO_APPROVED', 'SENT_TO_BANK', 'PAID', 'REJECTED', 'CANCELLED')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_tenant ON settlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settlements_created_by ON settlements(created_by);
CREATE INDEX IF NOT EXISTS idx_settlements_current_approver ON settlements(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_settlements_utr ON settlements(utr_number);

-- ============================================================================
-- 3. SETTLEMENT LINE ITEMS (Links Settlements to Payment Requests)
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  payment_request_id VARCHAR(255) NOT NULL,   -- References payment_requests.id
  
  -- Amounts for THIS settlement (supports partial payments)
  approved_amount DECIMAL(18,2) NOT NULL,     -- Total approved for this request
  amount_in_settlement DECIMAL(18,2) NOT NULL, -- Amount included in THIS settlement
  
  -- Running totals (updated after settlement execution)
  paid_before_this DECIMAL(18,2) DEFAULT 0,   -- Already paid before this settlement
  paid_in_this DECIMAL(18,2) DEFAULT 0,       -- Paid in this settlement (after UTR)
  remaining_after_this DECIMAL(18,2),         -- Remaining after this settlement
  
  -- Request snapshot (for audit)
  request_number VARCHAR(50),
  vendor_name VARCHAR(255),
  vendor_id UUID,
  description TEXT,
  
  -- Status tracking
  is_fully_settled BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_line_amount CHECK (amount_in_settlement > 0),
  CONSTRAINT amount_not_exceed_remaining CHECK (
    amount_in_settlement <= (approved_amount - paid_before_this)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sli_settlement ON settlement_line_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_sli_payment_request ON settlement_line_items(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_sli_vendor ON settlement_line_items(vendor_id);

-- ============================================================================
-- 4. UPDATE PAYMENT_REQUESTS FOR PARTIAL PAYMENTS
-- ============================================================================

-- Add partial payment tracking columns
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS paid_amount_total DECIMAL(18,2) DEFAULT 0;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(18,2);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMP;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS last_settlement_id UUID;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS settlement_count INTEGER DEFAULT 0;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS owned_by_accounts BOOLEAN DEFAULT false;

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS accounts_owner_id UUID REFERENCES users(id);

ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS accounts_takeover_at TIMESTAMP;

-- Add new statuses for partial settlement
-- PARTIALLY_SETTLED = Has partial payments, balance remaining
-- QUEUED_FOR_SETTLEMENT = Included in a settlement, awaiting execution

-- ============================================================================
-- 5. PAYMENT REQUEST PARTIAL HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_request_partial_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id VARCHAR(255) NOT NULL,
  settlement_id UUID NOT NULL REFERENCES settlements(id),
  
  -- Amounts
  amount_paid DECIMAL(18,2) NOT NULL,
  paid_amount_before DECIMAL(18,2) NOT NULL,
  paid_amount_after DECIMAL(18,2) NOT NULL,
  remaining_before DECIMAL(18,2) NOT NULL,
  remaining_after DECIMAL(18,2) NOT NULL,
  
  -- Banking
  utr_number VARCHAR(100),
  bank_transaction_id VARCHAR(100),
  
  -- Status
  is_final_payment BOOLEAN DEFAULT false,
  
  -- Audit
  executed_by UUID REFERENCES users(id),
  executed_at TIMESTAMP DEFAULT NOW(),
  
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prpp_request ON payment_request_partial_payments(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_prpp_settlement ON payment_request_partial_payments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_prpp_utr ON payment_request_partial_payments(utr_number);

-- ============================================================================
-- 6. SETTLEMENT APPROVAL HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  
  -- Action
  action VARCHAR(50) NOT NULL,                -- SUBMIT, APPROVE, REJECT, SEND_TO_BANK, EXECUTE
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  stage VARCHAR(50),
  
  -- Actor
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_name VARCHAR(255),
  actor_role VARCHAR(100),
  actor_level INTEGER,
  
  -- Details
  comment TEXT,
  utr_number VARCHAR(100),                    -- If action = EXECUTE
  
  -- Audit
  ip_address INET,
  user_agent TEXT,
  
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sa_settlement ON settlement_approvals(settlement_id);
CREATE INDEX IF NOT EXISTS idx_sa_actor ON settlement_approvals(actor_id);

-- ============================================================================
-- 7. GENERATE SETTLEMENT NUMBER SEQUENCE
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS settlement_seq_2025 START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS settlement_seq_2026 START WITH 1 INCREMENT BY 1 NO CYCLE;

CREATE OR REPLACE FUNCTION generate_settlement_number(p_tenant_id UUID DEFAULT NULL)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_year INTEGER;
  v_seq_name TEXT;
  v_next_num BIGINT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  v_seq_name := 'settlement_seq_' || v_year;
  
  -- Create sequence for year if not exists
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START WITH 1 INCREMENT BY 1 NO CYCLE', v_seq_name);
  
  -- Get next value
  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next_num;
  
  RETURN 'STL-' || v_year || '-' || LPAD(v_next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FUNCTION: Calculate Remaining Amount
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_remaining_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.remaining_amount := COALESCE(NEW.approved_amount, NEW."totalAmount", 0) - COALESCE(NEW.paid_amount_total, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate remaining amount
DROP TRIGGER IF EXISTS trg_calc_remaining ON payment_requests;
CREATE TRIGGER trg_calc_remaining
  BEFORE INSERT OR UPDATE OF approved_amount, paid_amount_total, "totalAmount"
  ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION calculate_remaining_amount();

-- ============================================================================
-- 9. FUNCTION: Update Request on Settlement Execution
-- ============================================================================

CREATE OR REPLACE FUNCTION update_requests_on_settlement_paid()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when settlement moves to PAID
  IF NEW.status = 'PAID' AND (OLD.status IS NULL OR OLD.status != 'PAID') THEN
    
    -- Update all linked payment requests
    UPDATE payment_requests pr
    SET
      paid_amount_total = pr.paid_amount_total + sli.amount_in_settlement,
      last_paid_at = NOW(),
      last_settlement_id = NEW.id,
      settlement_count = settlement_count + 1,
      status = CASE 
        WHEN (pr.paid_amount_total + sli.amount_in_settlement) >= COALESCE(pr.approved_amount, pr."totalAmount")
        THEN 'PAID'
        ELSE 'PARTIALLY_SETTLED'
      END,
      workflow_status = CASE 
        WHEN (pr.paid_amount_total + sli.amount_in_settlement) >= COALESCE(pr.approved_amount, pr."totalAmount")
        THEN 'PAID'
        ELSE 'PARTIALLY_SETTLED'
      END,
      updated_at = NOW()
    FROM settlement_line_items sli
    WHERE sli.settlement_id = NEW.id
      AND sli.payment_request_id = pr.id;
    
    -- Update line items with paid amounts
    UPDATE settlement_line_items
    SET
      paid_in_this = amount_in_settlement,
      remaining_after_this = approved_amount - (paid_before_this + amount_in_settlement),
      is_fully_settled = (approved_amount - (paid_before_this + amount_in_settlement)) <= 0,
      updated_at = NOW()
    WHERE settlement_id = NEW.id;
    
    -- Create partial payment history records
    INSERT INTO payment_request_partial_payments (
      payment_request_id, settlement_id, amount_paid,
      paid_amount_before, paid_amount_after,
      remaining_before, remaining_after,
      utr_number, bank_transaction_id,
      is_final_payment, executed_by, tenant_id
    )
    SELECT 
      sli.payment_request_id,
      NEW.id,
      sli.amount_in_settlement,
      sli.paid_before_this,
      sli.paid_before_this + sli.amount_in_settlement,
      sli.approved_amount - sli.paid_before_this,
      sli.approved_amount - sli.paid_before_this - sli.amount_in_settlement,
      NEW.utr_number,
      NEW.bank_transaction_id,
      (sli.approved_amount - sli.paid_before_this - sli.amount_in_settlement) <= 0,
      NEW.executed_by,
      NEW.tenant_id
    FROM settlement_line_items sli
    WHERE sli.settlement_id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for settlement execution
DROP TRIGGER IF EXISTS trg_settlement_paid ON settlements;
CREATE TRIGGER trg_settlement_paid
  AFTER UPDATE OF status
  ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_requests_on_settlement_paid();

-- ============================================================================
-- 10. VIEWS FOR ROLE-BASED ACCESS
-- ============================================================================

-- View for Accountant (FULL details)
CREATE OR REPLACE VIEW v_accountant_pending_requests AS
SELECT 
  pr.id,
  pr."requestId" AS request_number,
  pr.status,
  pr."totalAmount" AS total_amount,
  COALESCE(pr.approved_amount, pr."totalAmount") AS approved_amount,
  COALESCE(pr.paid_amount_total, 0) AS paid_till_date,
  COALESCE(pr.remaining_amount, COALESCE(pr.approved_amount, pr."totalAmount") - COALESCE(pr.paid_amount_total, 0)) AS remaining_amount,
  pr.settlement_count,
  pr.currency,
  pr."clientName" AS vendor_name,
  pr."clientId" AS vendor_id,
  pr.description,
  pr.purpose,
  pr."createdAt" AS created_at,
  pr.approved_at,
  pr.tenant_id,
  
  -- Partial payment history count
  (SELECT COUNT(*) FROM payment_request_partial_payments WHERE payment_request_id = pr.id) AS partial_payment_count
  
FROM payment_requests pr
WHERE 
  pr.status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_SETTLED')
  AND COALESCE(pr.remaining_amount, COALESCE(pr.approved_amount, pr."totalAmount") - COALESCE(pr.paid_amount_total, 0)) > 0;

-- View for Non-Accountants (Simplified Settlement Tasks)
CREATE OR REPLACE VIEW v_settlement_tasks_simplified AS
SELECT 
  s.id,
  s.settlement_number,
  s.purpose,
  s.beneficiary_name,
  s.beneficiary_bank,
  s.beneficiary_account_masked,
  s.total_amount,
  s.currency,
  s.status,
  s.current_stage,
  s.current_approver_id,
  s.accountant_remarks,
  s.settlement_date,
  s.due_date,
  s.attachments,
  s.created_at,
  s.tenant_id,
  
  -- DO NOT expose:
  -- request_count, vendor_count, individual line items, partial breakdowns
  
  creator.full_name AS created_by_name,
  approver.full_name AS current_approver_name
  
FROM settlements s
LEFT JOIN users creator ON s.created_by = creator.id
LEFT JOIN users approver ON s.current_approver_id = approver.id
WHERE s.status NOT IN ('DRAFT', 'CANCELLED');

-- ============================================================================
-- 11. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pr_remaining_amount ON payment_requests(remaining_amount) 
  WHERE remaining_amount > 0;
  
CREATE INDEX IF NOT EXISTS idx_pr_owned_by_accounts ON payment_requests(owned_by_accounts) 
  WHERE owned_by_accounts = true;

CREATE INDEX IF NOT EXISTS idx_pr_status_remaining ON payment_requests(status, remaining_amount)
  WHERE status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_SETTLED');

COMMIT;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
BEGIN;

DROP TRIGGER IF EXISTS trg_settlement_paid ON settlements;
DROP TRIGGER IF EXISTS trg_calc_remaining ON payment_requests;

DROP FUNCTION IF EXISTS update_requests_on_settlement_paid();
DROP FUNCTION IF EXISTS calculate_remaining_amount();
DROP FUNCTION IF EXISTS generate_settlement_number(UUID);

DROP VIEW IF EXISTS v_settlement_tasks_simplified;
DROP VIEW IF EXISTS v_accountant_pending_requests;

DROP TABLE IF EXISTS settlement_approvals;
DROP TABLE IF EXISTS payment_request_partial_payments;
DROP TABLE IF EXISTS settlement_line_items;
DROP TABLE IF EXISTS settlements;

DROP SEQUENCE IF EXISTS settlement_seq_2025;
DROP SEQUENCE IF EXISTS settlement_seq_2026;

ALTER TABLE payment_requests DROP COLUMN IF EXISTS paid_amount_total;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS remaining_amount;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS last_paid_at;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS last_settlement_id;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS settlement_count;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS owned_by_accounts;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS accounts_owner_id;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS accounts_takeover_at;

COMMIT;
*/
