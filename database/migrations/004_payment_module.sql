-- Non-Privileged User Management and Payment System
-- Migration 004: Non-privileged users and payment requests

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role_type AS ENUM ('vendor', 'building_owner', 'creditor');
CREATE TYPE gst_type AS ENUM ('with_gst', 'without_gst');
CREATE TYPE service_type AS ENUM ('rent', 'maintenance', 'transport', 'consultancy', 'others');
CREATE TYPE approval_status AS ENUM ('pending_manager_approval', 'pending_admin_approval', 'approved', 'rejected');
CREATE TYPE payment_mode AS ENUM ('bank_transfer', 'upi', 'cheque', 'cash');
CREATE TYPE payment_status AS ENUM ('pending_manager_approval', 'pending_admin_approval', 'approved', 'rejected', 'paid');

-- Non-Privileged Users Table
CREATE TABLE IF NOT EXISTS non_privileged_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    full_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    role_type user_role_type NOT NULL,
    gst_type gst_type NOT NULL,
    service_type service_type NOT NULL,
    
    -- Contact Information
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(10) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    
    -- Bank Details
    bank_holder_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    upi_id VARCHAR(100),
    
    -- Identity & Tax
    pan_number VARCHAR(10) NOT NULL,
    gst_number VARCHAR(15), -- Required only if gst_type is 'with_gst'
    
    -- Additional Details
    remarks TEXT,
    
    -- Recurring Payment
    is_recurring BOOLEAN DEFAULT false,
    recurring_start_date DATE,
    recurring_end_date DATE,
    recurring_amount DECIMAL(15,2),
    recurring_frequency VARCHAR(50), -- monthly, quarterly, yearly
    
    -- File Uploads (JSON array of file URLs)
    uploaded_files JSONB DEFAULT '{}', -- {bank_passbook: '', contract: '', photo: '', pan_card: '', gst_certificate: ''}
    
    -- Management
    hub_manager_id UUID NOT NULL REFERENCES users(id),
    status approval_status DEFAULT 'pending_manager_approval',
    
    -- Approval Tracking
    manager_approved_by UUID REFERENCES users(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_remarks TEXT,
    
    admin_approved_by UUID REFERENCES users(id),
    admin_approved_at TIMESTAMP WITH TIME ZONE,
    admin_remarks TEXT,
    
    -- Audit
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL),
    CONSTRAINT valid_pan CHECK (pan_number ~* '^[A-Z]{5}[0-9]{4}[A-Z]$'),
    CONSTRAINT valid_ifsc CHECK (ifsc_code ~* '^[A-Z]{4}0[A-Z0-9]{6}$'),
    CONSTRAINT valid_gst CHECK (
        (gst_type = 'with_gst' AND gst_number IS NOT NULL AND gst_number ~* '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$') OR
        (gst_type = 'without_gst')
    ),
    CONSTRAINT valid_recurring_dates CHECK (
        (is_recurring = false) OR
        (is_recurring = true AND recurring_start_date IS NOT NULL AND recurring_end_date IS NOT NULL AND recurring_end_date > recurring_start_date)
    )
);

-- Payment Requests Table
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    payment_ref_id VARCHAR(50) UNIQUE NOT NULL, -- Format: PR-YYYY-MM-XXXXX
    non_privileged_user_id UUID NOT NULL REFERENCES non_privileged_users(id),
    
    -- Payment Details
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    due_date DATE NOT NULL,
    payment_mode payment_mode NOT NULL,
    
    -- GST & Tax
    gst_applicable BOOLEAN DEFAULT false,
    gst_percentage DECIMAL(5,2),
    gst_amount DECIMAL(15,2),
    total_amount DECIMAL(15,2) NOT NULL, -- amount + gst_amount
    
    -- Recurring Information (inherited from user or overridden)
    is_recurring BOOLEAN DEFAULT false,
    recurring_start_date DATE,
    recurring_end_date DATE,
    recurring_frequency VARCHAR(50),
    
    -- Supporting Documents
    supporting_documents JSONB DEFAULT '[]', -- [{file_name: '', file_url: '', uploaded_at: ''}]
    
    -- Approval Status
    status payment_status DEFAULT 'pending_manager_approval',
    
    -- Manager Approval
    manager_approved_by UUID REFERENCES users(id),
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    manager_remarks TEXT,
    
    -- Admin Approval
    admin_approved_by UUID REFERENCES users(id),
    admin_approved_at TIMESTAMP WITH TIME ZONE,
    admin_remarks TEXT,
    
    -- Payment Processing
    payment_date DATE,
    payment_transaction_id VARCHAR(100),
    payment_remarks TEXT,
    
    -- Audit
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_gst CHECK (
        (gst_applicable = false) OR
        (gst_applicable = true AND gst_percentage > 0 AND gst_amount > 0)
    ),
    CONSTRAINT valid_recurring_dates CHECK (
        (is_recurring = false) OR
        (is_recurring = true AND recurring_start_date IS NOT NULL AND recurring_end_date IS NOT NULL AND recurring_end_date > recurring_start_date)
    )
);

-- Indexes for performance
CREATE INDEX idx_non_privileged_users_hub_manager ON non_privileged_users(hub_manager_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_non_privileged_users_status ON non_privileged_users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_non_privileged_users_role_type ON non_privileged_users(role_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_non_privileged_users_created_by ON non_privileged_users(created_by) WHERE deleted_at IS NULL;

CREATE INDEX idx_payment_requests_user_id ON payment_requests(non_privileged_user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_status ON payment_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_due_date ON payment_requests(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_created_by ON payment_requests(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_payment_requests_ref_id ON payment_requests(payment_ref_id);

-- Function to generate payment reference ID
CREATE OR REPLACE FUNCTION generate_payment_ref_id()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    current_month TEXT;
    sequence_num TEXT;
    ref_id TEXT;
BEGIN
    current_year := TO_CHAR(NOW(), 'YYYY');
    current_month := TO_CHAR(NOW(), 'MM');
    
    -- Get the next sequence number for this month
    SELECT LPAD((COUNT(*) + 1)::TEXT, 5, '0')
    INTO sequence_num
    FROM payment_requests
    WHERE payment_ref_id LIKE 'PR-' || current_year || '-' || current_month || '%';
    
    ref_id := 'PR-' || current_year || '-' || current_month || '-' || sequence_num;
    
    RETURN ref_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate payment reference ID
CREATE OR REPLACE FUNCTION set_payment_ref_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_ref_id IS NULL OR NEW.payment_ref_id = '' THEN
        NEW.payment_ref_id := generate_payment_ref_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_payment_ref_id
    BEFORE INSERT ON payment_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_payment_ref_id();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_update_non_privileged_users_timestamp
    BEFORE UPDATE ON non_privileged_users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_update_payment_requests_timestamp
    BEFORE UPDATE ON payment_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Function to calculate total amount with GST
CREATE OR REPLACE FUNCTION calculate_payment_total()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.gst_applicable = true THEN
        NEW.gst_amount := NEW.amount * (NEW.gst_percentage / 100);
        NEW.total_amount := NEW.amount + NEW.gst_amount;
    ELSE
        NEW.gst_amount := 0;
        NEW.total_amount := NEW.amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate totals
CREATE TRIGGER trigger_calculate_payment_total
    BEFORE INSERT OR UPDATE ON payment_requests
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payment_total();

-- Audit log table for non-privileged users
CREATE TABLE IF NOT EXISTS non_privileged_users_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES non_privileged_users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'approved', 'rejected', 'deleted'
    changed_by UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    remarks TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_non_privileged_users_audit_log_user_id ON non_privileged_users_audit_log(user_id);
CREATE INDEX idx_non_privileged_users_audit_log_created_at ON non_privileged_users_audit_log(created_at DESC);

-- Audit log table for payment requests
CREATE TABLE IF NOT EXISTS payment_requests_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_request_id UUID REFERENCES payment_requests(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    remarks TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_requests_audit_log_payment_id ON payment_requests_audit_log(payment_request_id);
CREATE INDEX idx_payment_requests_audit_log_created_at ON payment_requests_audit_log(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE non_privileged_users IS 'Stores vendors, building owners, and creditors who are not ERP system users';
COMMENT ON TABLE payment_requests IS 'Payment requests raised for non-privileged users with approval workflow';
COMMENT ON COLUMN non_privileged_users.is_recurring IS 'If true, this user has recurring payment obligations';
COMMENT ON COLUMN non_privileged_users.uploaded_files IS 'JSON object containing URLs of uploaded documents';
COMMENT ON COLUMN payment_requests.payment_ref_id IS 'Auto-generated unique payment reference (PR-YYYY-MM-XXXXX)';
COMMENT ON COLUMN payment_requests.total_amount IS 'Amount + GST Amount (auto-calculated)';

-- Grant permissions (adjust based on your role structure)
GRANT SELECT, INSERT, UPDATE ON non_privileged_users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_requests TO authenticated;
GRANT SELECT, INSERT ON non_privileged_users_audit_log TO authenticated;
GRANT SELECT, INSERT ON payment_requests_audit_log TO authenticated;

-- Sample data (optional, for testing)
-- INSERT INTO non_privileged_users (
--     full_name, business_name, role_type, gst_type, service_type,
--     address, city, state, pincode, contact_number, email,
--     bank_holder_name, bank_name, account_number, ifsc_code,
--     pan_number, hub_manager_id, created_by
-- ) VALUES (
--     'ABC Enterprises', 'ABC Trading Co.', 'vendor', 'with_gst', 'consultancy',
--     '123 Main Street', 'Mumbai', 'Maharashtra', '400001', '9876543210', 'abc@example.com',
--     'ABC Enterprises', 'HDFC Bank', '12345678901', 'HDFC0001234',
--     'ABCDE1234F', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1)
-- );
