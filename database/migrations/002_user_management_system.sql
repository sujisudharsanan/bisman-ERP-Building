-- User Management System with KYC and Invite Flow
-- Migration 002: Complete user invite, KYC, and approval system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE invitation_status AS ENUM ('pending_kyc', 'kyc_submitted', 'expired', 'cancelled');
CREATE TYPE kyc_status AS ENUM ('awaiting_approval', 'approved', 'rejected', 'expired');
CREATE TYPE approval_action AS ENUM ('approve', 'reject', 'request_changes');
CREATE TYPE user_status AS ENUM ('invited', 'provisionally_active', 'active', 'suspended', 'terminated');

-- Roles table (enhanced)
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    personal_email VARCHAR(255) UNIQUE NOT NULL,
    company_email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    status user_status DEFAULT 'invited',
    hashed_password TEXT,
    role_id UUID REFERENCES roles(id),
    branch_id UUID REFERENCES branches(id),
    employee_id VARCHAR(50) UNIQUE,
    designation VARCHAR(100),
    salary DECIMAL(15,2),
    date_of_birth DATE,
    blood_group VARCHAR(5),
    aadhaar_number VARCHAR(12), -- Encrypted in production
    license_number VARCHAR(50),
    about_me TEXT,
    profile_picture_url TEXT,
    communication_address TEXT,
    permanent_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    is_first_login BOOLEAN DEFAULT true,
    meta JSONB DEFAULT '{}', -- Custom ERP fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete for GDPR
);

-- Invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(128) UNIQUE NOT NULL, -- Cryptographically secure
    inviter_admin_id UUID REFERENCES users(id) NOT NULL,
    invitee_name VARCHAR(200) NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    location VARCHAR(100),
    role_requested UUID REFERENCES roles(id),
    preferred_language VARCHAR(10) DEFAULT 'en',
    status invitation_status DEFAULT 'pending_kyc',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    kyc_submitted_at TIMESTAMP WITH TIME ZONE,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KYC submissions table
CREATE TABLE kyc_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES invitations(id),
    user_id UUID REFERENCES users(id), -- For direct user creation
    token VARCHAR(128), -- For linking to invitation
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    personal_email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    alternate_phone VARCHAR(20),
    date_of_birth DATE,
    blood_group VARCHAR(5),
    about_me TEXT,
    
    -- Address Information
    communication_address TEXT,
    permanent_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Identity Documents
    aadhaar_number VARCHAR(12), -- Encrypted
    license_number VARCHAR(50),
    
    -- Education & Employment (JSONB arrays)
    qualifications JSONB DEFAULT '[]', -- [{degree, institution, year}]
    employment_history JSONB DEFAULT '[]', -- [{company, designation, from_date, to_date}]
    family_details JSONB DEFAULT '[]', -- [{name, relationship, contact, dob}]
    
    -- File References
    files JSONB DEFAULT '{}', -- {profile_picture, aadhaar_doc, address_proof, certificates: []}
    
    -- Processing Information
    status kyc_status DEFAULT 'awaiting_approval',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Compliance
    consent_given BOOLEAN DEFAULT false,
    privacy_policy_version VARCHAR(20),
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Custom Fields
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File storage table
CREATE TABLE file_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_type VARCHAR(50) NOT NULL, -- 'kyc_submission', 'user', 'invitation'
    owner_id UUID NOT NULL,
    file_key VARCHAR(500) NOT NULL, -- S3 key or local path
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 'local', -- 'local', 's3', 'gcs'
    storage_url TEXT,
    is_public BOOLEAN DEFAULT false,
    virus_scan_status VARCHAR(20), -- 'pending', 'clean', 'infected'
    virus_scan_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Approval logs table
CREATE TABLE approval_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kyc_submission_id UUID REFERENCES kyc_submissions(id) NOT NULL,
    admin_id UUID REFERENCES users(id) NOT NULL,
    action approval_action NOT NULL,
    reason TEXT,
    payload JSONB DEFAULT '{}', -- Additional data like salary, branch_id
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comprehensive audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(50) DEFAULT 'user', -- 'user', 'system', 'api'
    action VARCHAR(100) NOT NULL, -- 'create_user', 'approve_kyc', 'login', etc.
    target_type VARCHAR(50), -- 'user', 'kyc_submission', 'invitation'
    target_id UUID,
    details JSONB DEFAULT '{}', -- Redacted sensitive info
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(128),
    risk_score INTEGER DEFAULT 0, -- For security monitoring
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table (for security tracking)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(128) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL, -- IP, user_id, or email
    action VARCHAR(100) NOT NULL, -- 'kyc_submit', 'login_attempt', 'invite_send'
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identifier, action, window_start)
);

-- Create indexes for performance
CREATE INDEX idx_users_company_email ON users(company_email) WHERE company_email IS NOT NULL;
CREATE INDEX idx_users_personal_email ON users(personal_email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role_branch ON users(role_id, branch_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX idx_kyc_submissions_status ON kyc_submissions(status);
CREATE INDEX idx_kyc_submissions_token ON kyc_submissions(token);
CREATE INDEX idx_file_objects_owner ON file_objects(owner_type, owner_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, timestamp);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_approval_logs_kyc ON approval_logs(kyc_submission_id);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_rate_limits_lookup ON rate_limits(identifier, action, window_start);

-- Partition audit_logs by month for performance (PostgreSQL 10+)
-- This would be implemented in production
-- CREATE TABLE audit_logs_y2025m01 PARTITION OF audit_logs
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Insert default roles
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
('SUPER_ADMIN', 'System Administrator with full access', '{"*": ["*"]}', true),
('ADMIN', 'Administrative user with management access', '{"users": ["read", "create", "update"], "kyc": ["approve", "reject"], "reports": ["read"]}', true),
('MANAGER', 'Manager with team oversight', '{"users": ["read"], "reports": ["read"], "dashboard": ["read"]}', false),
('STAFF', 'Regular staff member', '{"dashboard": ["read"], "profile": ["read", "update"]}', false),
('USER', 'Basic user with limited access', '{"profile": ["read", "update"]}', false)
ON CONFLICT (name) DO NOTHING;

-- Insert default branch
INSERT INTO branches (name, code, city, country) VALUES
('Head Office', 'HO', 'Mumbai', 'India')
ON CONFLICT (code) DO NOTHING;

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_submissions_updated_at BEFORE UPDATE ON kyc_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for generating employee IDs
CREATE OR REPLACE FUNCTION generate_employee_id(branch_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    employee_id VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_id FROM LENGTH(branch_code) + 2) AS INTEGER)), 0) + 1
    INTO next_number
    FROM users 
    WHERE employee_id LIKE branch_code || '%';
    
    employee_id := branch_code || LPAD(next_number::TEXT, 4, '0');
    RETURN employee_id;
END;
$$ LANGUAGE 'plpgsql';

-- Create function for cleaning up expired invitations/sessions
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Update expired invitations
    UPDATE invitations 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status = 'pending_kyc';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Deactivate expired sessions
    UPDATE user_sessions 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
    
    -- Clean old rate limit records (older than 1 day)
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '1 day';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE 'plpgsql';

-- Security policies (Row Level Security can be enabled in production)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE users IS 'Main users table with comprehensive profile information';
COMMENT ON TABLE invitations IS 'User invitation tracking with secure tokens';
COMMENT ON TABLE kyc_submissions IS 'KYC form submissions awaiting approval';
COMMENT ON TABLE file_objects IS 'Secure file storage references with metadata';
COMMENT ON TABLE approval_logs IS 'Audit trail for KYC approval decisions';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for compliance';
COMMENT ON COLUMN users.aadhaar_number IS 'Encrypted Aadhaar number - implement column encryption';
COMMENT ON COLUMN kyc_submissions.aadhaar_number IS 'Encrypted Aadhaar number - implement column encryption';
