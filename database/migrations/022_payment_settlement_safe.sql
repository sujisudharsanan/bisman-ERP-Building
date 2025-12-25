-- ============================================================================
-- PAYMENT SETTLEMENT SAFE MIGRATION
-- ============================================================================
-- This is a consolidated, safe migration that creates the settlement tables
-- without FK dependencies on tables that may not exist.
-- Run after: 021_bank_reconciliation.sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  purpose TEXT NOT NULL,
  beneficiary_name VARCHAR(255),
  beneficiary_bank VARCHAR(255),
  beneficiary_account_masked VARCHAR(50),
  beneficiary_account_full VARCHAR(100),
  beneficiary_ifsc VARCHAR(20),
  
  -- Amounts
  total_amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  
  -- Request summary
  request_count INTEGER DEFAULT 0,
  vendor_count INTEGER DEFAULT 0,
  
  -- Status & Workflow
  status VARCHAR(50) DEFAULT 'DRAFT',
  current_stage VARCHAR(50) DEFAULT 'ACCOUNTANT_DRAFT',
  current_approver_id UUID,
  
  -- Banking
  utr_number VARCHAR(100),
  bank_transaction_id VARCHAR(100),
  bank_reference VARCHAR(100),
  payment_mode VARCHAR(50),
  bank_account_id UUID,
  
  -- Dates
  settlement_date DATE,
  due_date DATE,
  paid_at TIMESTAMP,
  
  -- Remarks
  accountant_remarks TEXT,
  finance_remarks TEXT,
  cfo_remarks TEXT,
  banker_remarks TEXT,
  
  -- Attachments
  attachments JSONB DEFAULT '[]',
  
  -- Audit
  tenant_id UUID,
  created_by UUID NOT NULL,
  submitted_by UUID,
  submitted_at TIMESTAMP,
  finance_approved_by UUID,
  finance_approved_at TIMESTAMP,
  cfo_approved_by UUID,
  cfo_approved_at TIMESTAMP,
  sent_to_bank_by UUID,
  sent_to_bank_at TIMESTAMP,
  executed_by UUID,
  executed_at TIMESTAMP,
  rejected_by UUID,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for settlements
CREATE INDEX IF NOT EXISTS idx_settlements_tenant ON settlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_number ON settlements(settlement_number);
CREATE INDEX IF NOT EXISTS idx_settlements_date ON settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_settlements_created_by ON settlements(created_by);

-- ============================================================================
-- 3. SETTLEMENT LINE ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  
  -- Payment request reference (VARCHAR to match existing table)
  payment_request_id VARCHAR(255) NOT NULL,
  
  -- Amount details
  requested_amount DECIMAL(18,2) NOT NULL,
  approved_amount DECIMAL(18,2) NOT NULL,
  
  -- For partial payments
  partial_payment_amount DECIMAL(18,2),
  is_partial BOOLEAN DEFAULT false,
  partial_sequence INTEGER DEFAULT 1,
  
  -- Beneficiary snapshot (frozen at consolidation time)
  beneficiary_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Status
  status VARCHAR(50) DEFAULT 'PENDING',
  
  -- Optimistic locking
  version INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Each payment request can only be in one active settlement
  CONSTRAINT unique_payment_in_settlement UNIQUE (settlement_id, payment_request_id, partial_sequence)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_line_items_settlement ON settlement_line_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_line_items_payment ON settlement_line_items(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_line_items_status ON settlement_line_items(status);

-- ============================================================================
-- 4. SETTLEMENT AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Actor
  performed_by UUID NOT NULL,
  performed_at TIMESTAMP DEFAULT NOW(),
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Change details
  changes JSONB DEFAULT '{}',
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_settlement_audit_settlement ON settlement_audit_log(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_action ON settlement_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_performed_by ON settlement_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_performed_at ON settlement_audit_log(performed_at);

-- ============================================================================
-- 5. PAYMENT SETTLEMENT BATCHES TABLE (Legacy compatibility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Batch details
  tenant_id UUID,
  batch_type VARCHAR(50) DEFAULT 'WEEKLY',
  
  -- Amount summary
  total_requests INTEGER DEFAULT 0,
  total_amount DECIMAL(18,2) DEFAULT 0,
  settled_amount DECIMAL(18,2) DEFAULT 0,
  
  -- Bank details
  bank_account_id UUID,
  bank_transaction_id VARCHAR(100),
  utr_number VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'OPEN',
  
  -- Dates
  settlement_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  settled_at TIMESTAMP,
  
  -- Audit
  created_by UUID,
  processed_by UUID,
  
  CONSTRAINT valid_batch_status CHECK (
    status IN ('OPEN', 'LOCKED', 'PROCESSING', 'SETTLED', 'FAILED', 'CANCELLED')
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_settlement_batches_tenant ON payment_settlement_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_status ON payment_settlement_batches(status);
CREATE INDEX IF NOT EXISTS idx_settlement_batches_date ON payment_settlement_batches(settlement_date);

-- ============================================================================
-- 6. IDEMPOTENCY KEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  
  -- Request context
  tenant_id UUID,
  user_id UUID,
  request_path VARCHAR(500),
  request_method VARCHAR(10),
  request_body_hash VARCHAR(64),
  
  -- Response
  response_status INTEGER,
  response_body JSONB,
  
  -- Result entity
  result_entity_type VARCHAR(100),
  result_entity_id UUID,
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  completed_at TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_tenant ON idempotency_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================================================
-- 7. PARTIAL DISALLOW TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS partial_payment_disallow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id VARCHAR(255) NOT NULL,
  
  -- Reason
  reason TEXT NOT NULL,
  disallowed_by UUID,
  disallowed_at TIMESTAMP DEFAULT NOW(),
  
  -- Context
  notes TEXT,
  
  CONSTRAINT unique_disallow_per_request UNIQUE (payment_request_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_partial_disallow_request ON partial_payment_disallow(payment_request_id);

-- ============================================================================
-- 8. ADD SETTLEMENT COLUMNS TO PAYMENT_REQUESTS (IF TABLE EXISTS)
-- ============================================================================

DO $$
BEGIN
  -- Only add columns if payment_requests table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_requests') THEN
    -- Add settlement tracking columns
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS settlement_id UUID;
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(50);
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS settlement_utr VARCHAR(100);
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS settled_amount DECIMAL(18,2);
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP;
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS partial_payment_allowed BOOLEAN DEFAULT true;
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS partial_payments_count INTEGER DEFAULT 0;
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS total_settled_amount DECIMAL(18,2) DEFAULT 0;
    
    -- Add version for optimistic locking
    ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
    
    RAISE NOTICE 'Added settlement columns to payment_requests table';
  ELSE
    RAISE NOTICE 'payment_requests table does not exist, skipping column additions';
  END IF;
END $$;

-- ============================================================================
-- 9. COMMENTS
-- ============================================================================

COMMENT ON TABLE settlements IS 'Settlement records for consolidated payments';
COMMENT ON TABLE settlement_line_items IS 'Line items linking settlements to payment requests';
COMMENT ON TABLE settlement_audit_log IS 'Audit trail for settlement actions';
COMMENT ON TABLE payment_settlement_batches IS 'Legacy batch table for payment settlements';
COMMENT ON TABLE idempotency_keys IS 'Idempotency tracking for safe API retries';
COMMENT ON TABLE partial_payment_disallow IS 'Tracks payment requests that cannot accept partial payments';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
