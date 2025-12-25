-- ============================================================================
-- BANK RECONCILIATION MODULE
-- Migration 021: Enterprise-grade bank reconciliation with multi-bank templates
-- ============================================================================
-- 
-- This module implements:
-- - Multi-bank template engine for parsing any bank format
-- - High-performance statement processing (50K rows < 5 seconds)
-- - Audit-safe reconciliation workflow
-- - Role-based access (Accountant manages, CFO views)
--
-- CORE PRINCIPLE: Reconciliation is VERIFICATION ONLY, never payment execution
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text matching

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Bank statement file formats
DO $$ BEGIN
    CREATE TYPE bank_file_format AS ENUM ('CSV', 'XLS', 'XLSX', 'OFX', 'MT940');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Reconciliation batch status
DO $$ BEGIN
    CREATE TYPE recon_batch_status AS ENUM (
        'DRAFT',           -- Initial upload, parsing in progress
        'PARSED',          -- File parsed, ready for matching
        'MATCHING',        -- Auto-matching in progress
        'REVIEW',          -- Matching complete, awaiting review
        'FINALIZED',       -- Locked, no changes allowed
        'CANCELLED'        -- Batch cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Match type for reconciliation
DO $$ BEGIN
    CREATE TYPE recon_match_type AS ENUM (
        'EXACT_UTR',       -- UTR + Amount + Credit (100% confidence)
        'AMOUNT_DATE',     -- Amount + Date window (70-85% confidence)
        'FUZZY_DESC',      -- Amount + description similarity (50-70%)
        'MANUAL',          -- User manually matched
        'UNMATCHED'        -- No match found
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Exception type
DO $$ BEGIN
    CREATE TYPE recon_exception_type AS ENUM (
        'BANK_CHARGE',     -- Bank fee/charge
        'INTEREST',        -- Interest credit/debit
        'REVERSAL',        -- Transaction reversal
        'DUPLICATE',       -- Duplicate entry detected
        'AMOUNT_MISMATCH', -- Amount doesn't match exactly
        'DATE_MISMATCH',   -- Date outside tolerance
        'UNKNOWN_UTR',     -- UTR not found in system
        'OTHER'            -- Other exception
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Transaction direction
DO $$ BEGIN
    CREATE TYPE txn_direction AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLE: bank_templates
-- Multi-bank parsing configuration stored as data, not code
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    
    -- Template identification
    name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_pattern VARCHAR(100), -- Regex to match account number format
    description TEXT,
    
    -- File format settings
    file_format bank_file_format NOT NULL DEFAULT 'CSV',
    file_encoding VARCHAR(50) DEFAULT 'UTF-8',
    delimiter VARCHAR(10) DEFAULT ',',
    header_row INT DEFAULT 1,           -- Which row contains headers (1-indexed)
    data_start_row INT DEFAULT 2,       -- Which row data starts (1-indexed)
    
    -- Column mappings (stored as JSONB for flexibility)
    -- Structure: { "date": 0, "description": 1, "amount": 2, "balance": 3, ... }
    column_mappings JSONB NOT NULL DEFAULT '{}',
    
    -- Date parsing configuration
    date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',  -- moment.js format
    date_locale VARCHAR(10) DEFAULT 'en',
    
    -- Amount parsing configuration
    amount_format JSONB DEFAULT '{
        "decimal_separator": ".",
        "thousands_separator": ",",
        "credit_indicators": ["CR", "C", "+"],
        "debit_indicators": ["DR", "D", "-"],
        "separate_columns": false,
        "credit_column": null,
        "debit_column": null
    }',
    
    -- UTR/Reference extraction
    utr_extraction JSONB DEFAULT '{
        "column": "reference",
        "regex": "[A-Z0-9]{12,22}",
        "fallback_columns": ["description", "narration"]
    }',
    
    -- Validation rules
    validation_rules JSONB DEFAULT '{
        "required_columns": ["date", "amount"],
        "min_rows": 1,
        "max_rows": 100000
    }',
    
    -- Template status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false, -- Default template for this bank
    
    -- Audit fields
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_template_name_per_tenant UNIQUE (tenant_id, name)
);

-- Indexes
CREATE INDEX idx_bank_templates_tenant ON bank_templates(tenant_id) WHERE is_active = true;
CREATE INDEX idx_bank_templates_bank ON bank_templates(bank_name) WHERE is_active = true;
CREATE INDEX idx_bank_templates_default ON bank_templates(tenant_id, bank_name, is_default) 
    WHERE is_default = true AND is_active = true;

-- ============================================================================
-- TABLE: bank_statements
-- Uploaded bank statement files
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    
    -- Statement identification
    statement_number VARCHAR(100),
    bank_account_id UUID,  -- Optional reference to user_bank_accounts
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    
    -- File information
    original_filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,      -- S3 key or local path
    file_size_bytes BIGINT,
    file_hash VARCHAR(64),                  -- SHA-256 for dedup
    file_format bank_file_format NOT NULL,
    
    -- Statement period
    period_start DATE,
    period_end DATE,
    opening_balance DECIMAL(18, 4),
    closing_balance DECIMAL(18, 4),
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Parsing metadata
    template_id UUID REFERENCES bank_templates(id),
    total_rows INT DEFAULT 0,
    parsed_rows INT DEFAULT 0,
    error_rows INT DEFAULT 0,
    parse_errors JSONB DEFAULT '[]',        -- List of parse errors with row numbers
    
    -- Status
    is_parsed BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    
    -- Audit fields
    uploaded_by UUID NOT NULL,
    parsed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate uploads
    CONSTRAINT unique_statement_hash UNIQUE (tenant_id, file_hash)
);

-- Indexes
CREATE INDEX idx_bank_statements_tenant ON bank_statements(tenant_id);
CREATE INDEX idx_bank_statements_account ON bank_statements(bank_account_id);
CREATE INDEX idx_bank_statements_period ON bank_statements(period_start, period_end);
CREATE INDEX idx_bank_statements_hash ON bank_statements(file_hash);

-- ============================================================================
-- TABLE: bank_statement_lines
-- Individual transactions from bank statements (normalized format)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_statement_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    
    -- Row tracking
    row_number INT NOT NULL,                -- Original row in file
    
    -- Transaction data (normalized)
    txn_date DATE NOT NULL,
    value_date DATE,                        -- Value date if different
    description TEXT,
    narration TEXT,                         -- Additional narration
    
    -- Amount handling (always stored as positive)
    amount DECIMAL(18, 4) NOT NULL,
    direction txn_direction NOT NULL,       -- CREDIT or DEBIT
    balance DECIMAL(18, 4),                 -- Running balance if available
    
    -- Reference extraction
    reference VARCHAR(100),                 -- Bank reference number
    utr VARCHAR(50),                        -- Extracted UTR (if found)
    cheque_number VARCHAR(50),
    
    -- Categorization
    category VARCHAR(100),                  -- Auto-categorized type
    is_bank_charge BOOLEAN DEFAULT false,
    is_interest BOOLEAN DEFAULT false,
    is_reversal BOOLEAN DEFAULT false,
    
    -- Matching status
    is_matched BOOLEAN DEFAULT false,
    match_confidence INT DEFAULT 0,         -- 0-100
    matched_at TIMESTAMP WITH TIME ZONE,
    
    -- Raw data preservation
    raw_data JSONB,                         -- Original row as parsed
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount >= 0),
    CONSTRAINT valid_confidence CHECK (match_confidence >= 0 AND match_confidence <= 100)
);

-- Performance indexes for matching
CREATE INDEX idx_bsl_statement ON bank_statement_lines(statement_id);
CREATE INDEX idx_bsl_tenant ON bank_statement_lines(tenant_id);
CREATE INDEX idx_bsl_utr ON bank_statement_lines(utr) WHERE utr IS NOT NULL;
CREATE INDEX idx_bsl_amount ON bank_statement_lines(amount, direction);
CREATE INDEX idx_bsl_date ON bank_statement_lines(txn_date);
CREATE INDEX idx_bsl_unmatched ON bank_statement_lines(statement_id, is_matched) WHERE is_matched = false;
CREATE INDEX idx_bsl_matching ON bank_statement_lines(tenant_id, utr, amount, txn_date) WHERE is_matched = false;

-- Composite index for common matching query
CREATE INDEX idx_bsl_match_query ON bank_statement_lines(tenant_id, direction, amount, txn_date, utr) 
    WHERE is_matched = false AND direction = 'CREDIT';

-- ============================================================================
-- TABLE: reconciliation_batches
-- Reconciliation work sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    statement_id UUID NOT NULL REFERENCES bank_statements(id),
    
    -- Batch identification
    batch_number VARCHAR(50) NOT NULL,      -- Human-readable batch number
    description TEXT,
    
    -- Date range being reconciled
    recon_period_start DATE NOT NULL,
    recon_period_end DATE NOT NULL,
    
    -- Summary statistics
    total_lines INT DEFAULT 0,
    matched_lines INT DEFAULT 0,
    unmatched_lines INT DEFAULT 0,
    exception_lines INT DEFAULT 0,
    
    -- Amount summaries
    total_credits DECIMAL(18, 4) DEFAULT 0,
    total_debits DECIMAL(18, 4) DEFAULT 0,
    matched_amount DECIMAL(18, 4) DEFAULT 0,
    unmatched_amount DECIMAL(18, 4) DEFAULT 0,
    
    -- Status
    status recon_batch_status DEFAULT 'DRAFT',
    
    -- Workflow tracking
    auto_match_completed_at TIMESTAMP WITH TIME ZONE,
    review_started_at TIMESTAMP WITH TIME ZONE,
    
    -- Finalization (IMMUTABLE after finalized)
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID,
    finalization_notes TEXT,
    
    -- Optimistic locking
    version INT DEFAULT 1,
    
    -- Audit fields
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_batch_number UNIQUE (tenant_id, batch_number)
);

-- Indexes
CREATE INDEX idx_recon_batch_tenant ON reconciliation_batches(tenant_id);
CREATE INDEX idx_recon_batch_statement ON reconciliation_batches(statement_id);
CREATE INDEX idx_recon_batch_status ON reconciliation_batches(status);
CREATE INDEX idx_recon_batch_period ON reconciliation_batches(recon_period_start, recon_period_end);

-- ============================================================================
-- TABLE: reconciliation_matches
-- Links between bank lines and ERP settlements/payments
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES reconciliation_batches(id) ON DELETE CASCADE,
    bank_line_id UUID NOT NULL REFERENCES bank_statement_lines(id),
    tenant_id UUID NOT NULL,
    
    -- What was matched (polymorphic reference)
    matched_entity_type VARCHAR(50) NOT NULL, -- 'settlement', 'payment_request', 'partial_payment'
    matched_entity_id UUID NOT NULL,
    
    -- Match details
    match_type recon_match_type NOT NULL,
    confidence INT NOT NULL DEFAULT 0,        -- 0-100
    
    -- Amount comparison (for verification, never modification)
    bank_amount DECIMAL(18, 4) NOT NULL,
    erp_amount DECIMAL(18, 4) NOT NULL,
    amount_difference DECIMAL(18, 4) GENERATED ALWAYS AS (bank_amount - erp_amount) STORED,
    
    -- Date comparison
    bank_date DATE NOT NULL,
    erp_date DATE,
    
    -- UTR comparison
    bank_utr VARCHAR(50),
    erp_utr VARCHAR(50),
    
    -- Manual match details
    manual_reason TEXT,                       -- Required if match_type = 'MANUAL'
    manual_matched_by UUID,
    manual_matched_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_confirmed BOOLEAN DEFAULT false,       -- Explicitly confirmed by user
    confirmed_by UUID,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_match_confidence CHECK (confidence >= 0 AND confidence <= 100),
    CONSTRAINT unique_bank_line_match UNIQUE (batch_id, bank_line_id),
    CONSTRAINT manual_requires_reason CHECK (
        match_type != 'MANUAL' OR manual_reason IS NOT NULL
    )
);

-- Indexes
CREATE INDEX idx_recon_match_batch ON reconciliation_matches(batch_id);
CREATE INDEX idx_recon_match_bank_line ON reconciliation_matches(bank_line_id);
CREATE INDEX idx_recon_match_entity ON reconciliation_matches(matched_entity_type, matched_entity_id);
CREATE INDEX idx_recon_match_type ON reconciliation_matches(match_type);
CREATE INDEX idx_recon_match_unconfirmed ON reconciliation_matches(batch_id, is_confirmed) WHERE is_confirmed = false;

-- ============================================================================
-- TABLE: reconciliation_exceptions
-- Items that cannot be auto-matched or require attention
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES reconciliation_batches(id) ON DELETE CASCADE,
    bank_line_id UUID NOT NULL REFERENCES bank_statement_lines(id),
    tenant_id UUID NOT NULL,
    
    -- Exception details
    exception_type recon_exception_type NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Suggested action
    suggested_action TEXT,
    
    -- Resolution tracking
    is_resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recon_exception_batch ON reconciliation_exceptions(batch_id);
CREATE INDEX idx_recon_exception_type ON reconciliation_exceptions(exception_type);
CREATE INDEX idx_recon_exception_unresolved ON reconciliation_exceptions(batch_id, is_resolved) 
    WHERE is_resolved = false;

-- ============================================================================
-- TABLE: reconciliation_audit_log
-- Complete audit trail for every reconciliation action
-- ============================================================================

CREATE TABLE IF NOT EXISTS reconciliation_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    
    -- What was audited
    entity_type VARCHAR(50) NOT NULL,         -- 'batch', 'match', 'exception', 'template'
    entity_id UUID NOT NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,             -- 'CREATE', 'MATCH', 'UNMATCH', 'FINALIZE', etc.
    action_category VARCHAR(50),              -- 'SYSTEM', 'USER', 'AUTO'
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    
    -- Context
    batch_id UUID REFERENCES reconciliation_batches(id),
    bank_line_id UUID REFERENCES bank_statement_lines(id),
    
    -- Actor
    actor_id UUID NOT NULL,
    actor_role VARCHAR(100),
    actor_ip VARCHAR(45),
    actor_user_agent TEXT,
    
    -- Reason (required for sensitive actions)
    reason TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT sensitive_action_requires_reason CHECK (
        action NOT IN ('MANUAL_MATCH', 'FORCE_FINALIZE', 'OVERRIDE_EXCEPTION') 
        OR reason IS NOT NULL
    )
);

-- Indexes for audit queries
CREATE INDEX idx_recon_audit_tenant ON reconciliation_audit_log(tenant_id);
CREATE INDEX idx_recon_audit_entity ON reconciliation_audit_log(entity_type, entity_id);
CREATE INDEX idx_recon_audit_batch ON reconciliation_audit_log(batch_id);
CREATE INDEX idx_recon_audit_actor ON reconciliation_audit_log(actor_id);
CREATE INDEX idx_recon_audit_action ON reconciliation_audit_log(action);
CREATE INDEX idx_recon_audit_time ON reconciliation_audit_log(created_at DESC);

-- Composite index for common audit queries
CREATE INDEX idx_recon_audit_trace ON reconciliation_audit_log(tenant_id, entity_type, entity_id, created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to generate batch numbers
CREATE OR REPLACE FUNCTION generate_recon_batch_number(p_tenant_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INT;
    v_batch_number VARCHAR(50);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next sequence for this tenant and year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(batch_number FROM 'RECON-' || v_year || '-(\d+)') AS INT)
    ), 0) + 1
    INTO v_sequence
    FROM reconciliation_batches
    WHERE tenant_id = p_tenant_id
    AND batch_number LIKE 'RECON-' || v_year || '-%';
    
    v_batch_number := 'RECON-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
    
    RETURN v_batch_number;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent modifications to finalized batches
CREATE OR REPLACE FUNCTION prevent_finalized_batch_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'FINALIZED' AND NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Cannot modify a finalized reconciliation batch';
    END IF;
    
    -- Allow only status changes if batch is finalized
    IF OLD.status = 'FINALIZED' THEN
        IF OLD.matched_lines != NEW.matched_lines OR
           OLD.unmatched_lines != NEW.unmatched_lines OR
           OLD.matched_amount != NEW.matched_amount THEN
            RAISE EXCEPTION 'Cannot modify statistics of a finalized batch';
        END IF;
    END IF;
    
    NEW.updated_at := NOW();
    NEW.version := OLD.version + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_finalized_batch_modification
    BEFORE UPDATE ON reconciliation_batches
    FOR EACH ROW
    EXECUTE FUNCTION prevent_finalized_batch_modification();

-- Function to update batch statistics
CREATE OR REPLACE FUNCTION update_batch_statistics()
RETURNS TRIGGER AS $$
DECLARE
    v_batch_id UUID;
BEGIN
    -- Determine batch_id from the match or exception
    IF TG_TABLE_NAME = 'reconciliation_matches' THEN
        v_batch_id := COALESCE(NEW.batch_id, OLD.batch_id);
    ELSIF TG_TABLE_NAME = 'reconciliation_exceptions' THEN
        v_batch_id := COALESCE(NEW.batch_id, OLD.batch_id);
    END IF;
    
    IF v_batch_id IS NOT NULL THEN
        UPDATE reconciliation_batches
        SET 
            matched_lines = (
                SELECT COUNT(DISTINCT bank_line_id) 
                FROM reconciliation_matches 
                WHERE batch_id = v_batch_id
            ),
            exception_lines = (
                SELECT COUNT(DISTINCT bank_line_id) 
                FROM reconciliation_exceptions 
                WHERE batch_id = v_batch_id AND is_resolved = false
            ),
            matched_amount = (
                SELECT COALESCE(SUM(bank_amount), 0)
                FROM reconciliation_matches
                WHERE batch_id = v_batch_id
            ),
            updated_at = NOW()
        WHERE id = v_batch_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_stats_on_match
    AFTER INSERT OR UPDATE OR DELETE ON reconciliation_matches
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_statistics();

CREATE TRIGGER trigger_update_batch_stats_on_exception
    AFTER INSERT OR UPDATE OR DELETE ON reconciliation_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_statistics();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE bank_templates IS 'Multi-bank parsing templates - allows any bank format without code changes';
COMMENT ON TABLE bank_statements IS 'Uploaded bank statement files with parsing metadata';
COMMENT ON TABLE bank_statement_lines IS 'Normalized transactions from bank statements';
COMMENT ON TABLE reconciliation_batches IS 'Reconciliation work sessions - immutable after finalization';
COMMENT ON TABLE reconciliation_matches IS 'Links between bank lines and ERP entities';
COMMENT ON TABLE reconciliation_exceptions IS 'Items requiring attention during reconciliation';
COMMENT ON TABLE reconciliation_audit_log IS 'Complete audit trail - every action is logged';

COMMENT ON COLUMN bank_templates.column_mappings IS 'JSON mapping of column names to indices: {"date": 0, "amount": 2, "description": 1}';
COMMENT ON COLUMN bank_templates.utr_extraction IS 'Configuration for extracting UTR: regex pattern and fallback columns';
COMMENT ON COLUMN reconciliation_batches.version IS 'Optimistic locking version - prevents concurrent modifications';
COMMENT ON COLUMN reconciliation_matches.amount_difference IS 'Auto-calculated difference for verification (never modification)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
