-- Bank Accounts Management System
-- Migration 003: User bank account details with verification

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for bank accounts
CREATE TYPE account_type AS ENUM ('savings', 'current', 'salary', 'business');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'closed');

-- Bank Accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Account holder information
    account_holder_name VARCHAR(255) NOT NULL,
    
    -- Account details
    account_number VARCHAR(50) NOT NULL,
    account_type account_type DEFAULT 'savings',
    
    -- Bank details
    bank_name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255),
    
    -- Routing codes
    ifsc_code VARCHAR(20), -- For Indian banks
    swift_code VARCHAR(20), -- For international transfers
    iban VARCHAR(50), -- International Bank Account Number
    routing_number VARCHAR(20), -- For US banks
    sort_code VARCHAR(10), -- For UK banks
    bsb_number VARCHAR(10), -- For Australian banks
    
    -- Additional information
    branch_address TEXT,
    currency VARCHAR(3) DEFAULT 'USD', -- ISO currency code
    
    -- Account settings
    is_primary BOOLEAN DEFAULT false, -- Primary account for salary/payments
    is_verified BOOLEAN DEFAULT false, -- Admin or document verified
    is_active BOOLEAN DEFAULT true,
    status account_status DEFAULT 'active',
    
    -- Verification details
    verified_by UUID REFERENCES users(id), -- Admin who verified
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    
    -- Supporting documents (file keys)
    documents JSONB DEFAULT '[]', -- [{file_key, type, uploaded_at}]
    
    -- Metadata
    notes TEXT, -- User notes about the account
    meta JSONB DEFAULT '{}', -- Additional custom fields
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    
    -- Constraints
    CONSTRAINT unique_account_per_user UNIQUE (user_id, account_number, bank_name),
    CONSTRAINT valid_routing_code CHECK (
        ifsc_code IS NOT NULL OR 
        swift_code IS NOT NULL OR 
        iban IS NOT NULL OR 
        routing_number IS NOT NULL OR
        sort_code IS NOT NULL OR
        bsb_number IS NOT NULL
    )
);

-- Indexes for performance
CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_accounts_is_primary ON bank_accounts(user_id, is_primary) WHERE is_primary = true AND deleted_at IS NULL;
CREATE INDEX idx_bank_accounts_status ON bank_accounts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bank_accounts_is_verified ON bank_accounts(is_verified) WHERE deleted_at IS NULL;

-- Function to ensure only one primary account per user
CREATE OR REPLACE FUNCTION enforce_single_primary_account()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this account as primary, unset all other primary accounts for this user
    IF NEW.is_primary = true THEN
        UPDATE bank_accounts 
        SET is_primary = false, updated_at = NOW()
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_primary = true
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary account
CREATE TRIGGER trigger_enforce_single_primary_account
    BEFORE INSERT OR UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_primary_account();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_bank_accounts_timestamp
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Audit log for bank account changes
CREATE TABLE IF NOT EXISTS bank_account_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'verified', 'set_primary'
    changed_by UUID REFERENCES users(id), -- Who made the change
    old_values JSONB, -- Previous values
    new_values JSONB, -- New values
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bank_account_audit_log_account_id ON bank_account_audit_log(bank_account_id);
CREATE INDEX idx_bank_account_audit_log_user_id ON bank_account_audit_log(user_id);
CREATE INDEX idx_bank_account_audit_log_created_at ON bank_account_audit_log(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE bank_accounts IS 'User bank account information for salary and payment processing';
COMMENT ON COLUMN bank_accounts.account_holder_name IS 'Name as per bank account';
COMMENT ON COLUMN bank_accounts.is_primary IS 'Primary account for receiving salary/payments';
COMMENT ON COLUMN bank_accounts.is_verified IS 'Verified by admin or through document verification';
COMMENT ON COLUMN bank_accounts.ifsc_code IS 'Indian Financial System Code (11 characters)';
COMMENT ON COLUMN bank_accounts.swift_code IS 'Society for Worldwide Interbank Financial Telecommunication code';
COMMENT ON COLUMN bank_accounts.iban IS 'International Bank Account Number';
COMMENT ON COLUMN bank_accounts.documents IS 'Array of uploaded document references';

-- Grant permissions (adjust based on your role structure)
GRANT SELECT, INSERT, UPDATE ON bank_accounts TO authenticated;
GRANT SELECT, INSERT ON bank_account_audit_log TO authenticated;

-- Sample insert for testing (optional)
-- INSERT INTO bank_accounts (user_id, account_holder_name, account_number, bank_name, ifsc_code, account_type)
-- VALUES (
--     (SELECT id FROM users LIMIT 1),
--     'John Doe',
--     '1234567890',
--     'State Bank of India',
--     'SBIN0001234',
--     'savings'
-- );
