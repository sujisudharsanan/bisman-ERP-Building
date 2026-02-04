-- ============================================================================
-- BISMAN ERP - Vendor Legal Master Database Schema
-- Migration: 051_create_vendor_legal_master.sql
-- ============================================================================
-- 
-- This migration extends the vendor management system with comprehensive
-- legal, compliance, risk, and approval workflow capabilities.
--
-- Tables Created:
--   - vendor_legal (main legal entity table)
--   - vendor_contacts (contact persons)
--   - vendor_addresses (multiple addresses)
--   - vendor_documents (document attachments)
--   - vendor_banks (banking information)
--   - vendor_risk_assessments (risk & due diligence)
--   - vendor_approvals (approval workflow)
--   - vendor_audit_logs (audit trail)
--   - vendor_compliance (compliance tracking)
--
-- ============================================================================

-- ============================================================================
-- LOOKUP TABLES
-- ============================================================================

-- Business Types
CREATE TABLE IF NOT EXISTS vendor_business_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default business types
INSERT INTO vendor_business_types (code, name, sort_order) VALUES
  ('PRIVATE_LIMITED', 'Private Limited Company', 1),
  ('PUBLIC_LIMITED', 'Public Limited Company', 2),
  ('LLP', 'Limited Liability Partnership', 3),
  ('PARTNERSHIP', 'Partnership Firm', 4),
  ('PROPRIETORSHIP', 'Sole Proprietorship', 5),
  ('OPC', 'One Person Company', 6),
  ('TRUST', 'Trust', 7),
  ('SOCIETY', 'Society', 8),
  ('GOVERNMENT', 'Government Entity', 9),
  ('PSU', 'Public Sector Undertaking', 10),
  ('FOREIGN', 'Foreign Company', 11),
  ('OTHER', 'Other', 99)
ON CONFLICT (code) DO NOTHING;

-- Industry Categories
CREATE TABLE IF NOT EXISTS vendor_industry_categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id INT REFERENCES vendor_industry_categories(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default industry categories
INSERT INTO vendor_industry_categories (code, name, sort_order) VALUES
  ('IT_SERVICES', 'IT Services & Consulting', 1),
  ('MANUFACTURING', 'Manufacturing', 2),
  ('TRADING', 'Trading & Distribution', 3),
  ('CONSTRUCTION', 'Construction & Real Estate', 4),
  ('LOGISTICS', 'Logistics & Transportation', 5),
  ('HEALTHCARE', 'Healthcare & Pharmaceuticals', 6),
  ('FMCG', 'FMCG & Consumer Goods', 7),
  ('AGRICULTURE', 'Agriculture & Allied', 8),
  ('ENERGY', 'Energy & Utilities', 9),
  ('FINANCIAL', 'Financial Services', 10),
  ('TELECOM', 'Telecommunications', 11),
  ('HOSPITALITY', 'Hospitality & Tourism', 12),
  ('EDUCATION', 'Education & Training', 13),
  ('PROFESSIONAL', 'Professional Services', 14),
  ('MEDIA', 'Media & Entertainment', 15),
  ('OTHER', 'Other', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- MAIN VENDOR LEGAL TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_legal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Legal Identity
  vendor_code VARCHAR(50) NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  business_type_id INT REFERENCES vendor_business_types(id),
  registration_number VARCHAR(100),
  gst_number VARCHAR(20),
  pan_number VARCHAR(20),
  cin_number VARCHAR(30),
  tin_number VARCHAR(30),
  incorporation_date DATE,
  country VARCHAR(100) DEFAULT 'India',
  state VARCHAR(100),
  
  -- Business Details
  industry_id INT REFERENCES vendor_industry_categories(id),
  services_products TEXT[],
  annual_turnover DECIMAL(18, 2),
  company_size VARCHAR(50), -- micro, small, medium, large, enterprise
  website VARCHAR(255),
  primary_market VARCHAR(100),
  
  -- MSME Details
  is_msme BOOLEAN DEFAULT false,
  msme_number VARCHAR(50),
  msme_category VARCHAR(20), -- micro, small, medium
  
  -- Status & Lifecycle
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, pending, under_review, approved, active, suspended, blacklisted, archived
  is_active BOOLEAN DEFAULT true,
  approval_status VARCHAR(50) DEFAULT 'pending',
  -- pending, in_review, legal_review, approved, rejected
  
  -- Risk & Compliance
  risk_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  compliance_score INT DEFAULT 0, -- 0-100
  last_audit_date TIMESTAMPTZ,
  next_audit_date TIMESTAMPTZ,
  
  -- Flags
  is_verified BOOLEAN DEFAULT false,
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  blacklisted_at TIMESTAMPTZ,
  watchlist_flag BOOLEAN DEFAULT false,
  
  -- Payment Terms
  default_payment_terms VARCHAR(50),
  credit_limit DECIMAL(18, 2),
  credit_days INT DEFAULT 30,
  
  -- TDS Information
  tds_applicable BOOLEAN DEFAULT false,
  tds_section VARCHAR(20),
  tds_rate DECIMAL(5, 2),
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  
  -- Audit Fields
  created_by UUID,
  created_by_name VARCHAR(255),
  updated_by UUID,
  updated_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT vendor_legal_unique_code UNIQUE (tenant_id, vendor_code),
  CONSTRAINT vendor_legal_unique_gst UNIQUE (tenant_id, gst_number) WHERE gst_number IS NOT NULL,
  CONSTRAINT vendor_legal_unique_pan UNIQUE (tenant_id, pan_number) WHERE pan_number IS NOT NULL,
  CONSTRAINT vendor_legal_unique_reg UNIQUE (tenant_id, registration_number) WHERE registration_number IS NOT NULL
);

-- ============================================================================
-- VENDOR CONTACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendor_legal(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Contact Details
  contact_type VARCHAR(50) DEFAULT 'primary', -- primary, secondary, billing, escalation
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(100),
  department VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  
  -- Status
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VENDOR ADDRESSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendor_legal(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Address Type
  address_type VARCHAR(50) DEFAULT 'registered', -- registered, operational, billing, shipping, warehouse
  
  -- Address Details
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  landmark VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  district VARCHAR(100),
  state VARCHAR(100) NOT NULL,
  country VARCHAR(100) DEFAULT 'India',
  pincode VARCHAR(10) NOT NULL,
  
  -- Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Status
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VENDOR DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendor_legal(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Document Info
  document_type VARCHAR(100) NOT NULL,
  -- incorporation_certificate, gst_certificate, pan_card, bank_proof, nda, iso_certificate, insurance, other
  document_name VARCHAR(255) NOT NULL,
  document_number VARCHAR(100),
  
  -- File Details
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  file_hash VARCHAR(64), -- SHA256 hash for integrity
  
  -- Validity
  issue_date DATE,
  expiry_date DATE,
  is_expired BOOLEAN DEFAULT false,
  
  -- Verification
  verification_status VARCHAR(50) DEFAULT 'pending', -- pending, verified, rejected
  verified_by UUID,
  verified_by_name VARCHAR(255),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  
  -- Status
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  
  -- Audit
  uploaded_by UUID,
  uploaded_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VENDOR BANKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendor_legal(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Bank Details
  bank_name VARCHAR(255) NOT NULL,
  branch_name VARCHAR(255),
  account_holder_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'current', -- savings, current
  ifsc_code VARCHAR(20) NOT NULL,
  swift_code VARCHAR(20),
  micr_code VARCHAR(20),
  
  -- UPI
  upi_id VARCHAR(100),
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verification_method VARCHAR(50), -- penny_drop, cancelled_cheque, bank_statement
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  
  -- Status
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VENDOR RISK ASSESSMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendor_legal(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Assessment Details
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  assessment_type VARCHAR(50) DEFAULT 'initial', -- initial, periodic, ad_hoc
  
  -- Risk Scores
  overall_risk_level VARCHAR(20), -- low, medium, high, critical
  financial_risk_score INT, -- 0-100
  operational_risk_score INT,
  compliance_risk_score INT,
  reputational_risk_score INT,
  
  -- Due Diligence
  background_check_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  background_check_date TIMESTAMPTZ,
  background_check_provider VARCHAR(100),
  background_check_report TEXT,
  
  -- Blacklist & Watchlist
  blacklist_check_status VARCHAR(50) DEFAULT 'pending',
  blacklist_check_date TIMESTAMPTZ,
  is_on_blacklist BOOLEAN DEFAULT false,
  blacklist_details TEXT,
  
  watchlist_check_status VARCHAR(50) DEFAULT 'pending',
  watchlist_check_date TIMESTAMPTZ,
  is_on_watchlist BOOLEAN DEFAULT false,
  watchlist_details TEXT,
  
  -- Previous Issues
  previous_violations TEXT[],
  violation_count INT DEFAULT 0,
  last_violation_date TIMESTAMPTZ,
  
  -- Internal Rating
  internal_rating INT, -- 1-5
  rating_remarks TEXT,
  
  -- Assessor Details
  assessed_by UUID,
  assessed_by_name VARCHAR(255),
  reviewer_id UUID,
  reviewer_name VARCHAR(255),
  review_date TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, approved
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VENDOR APPROVALS TABLE (Workflow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendor_legal(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Workflow Stage
  workflow_stage VARCHAR(50) NOT NULL,
  -- created, pending_review, data_verification, legal_review, compliance_review, final_approval
  stage_order INT DEFAULT 1,
  
  -- Request Details
  request_type VARCHAR(50) DEFAULT 'new', -- new, update, reactivation
  request_date TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID,
  requested_by_name VARCHAR(255),
  
  -- Approval Details
  approver_role VARCHAR(50),
  approver_id UUID,
  approver_name VARCHAR(255),
  
  -- Decision
  decision VARCHAR(50), -- pending, approved, rejected, sent_back
  decision_date TIMESTAMPTZ,
  remarks TEXT,
  
  -- SLA Tracking
  due_date TIMESTAMPTZ,
  is_overdue BOOLEAN DEFAULT false,
  escalation_level INT DEFAULT 0,
  
  -- Status
  is_current BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VENDOR AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendor_legal(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  -- created, updated, submitted, approved, rejected, suspended, reactivated, document_uploaded, etc.
  action_category VARCHAR(50), -- data, status, document, approval, risk
  
  -- Actor Details
  actor_id UUID NOT NULL,
  actor_name VARCHAR(255),
  actor_role VARCHAR(100),
  actor_email VARCHAR(255),
  
  -- Change Details
  entity_type VARCHAR(50) DEFAULT 'vendor', -- vendor, contact, address, document, bank, risk
  entity_id UUID,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  change_summary JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VENDOR COMPLIANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendor_legal(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Compliance Item
  compliance_type VARCHAR(100) NOT NULL,
  -- gst_filing, tds_compliance, iso_certification, insurance_validity, nda_validity, etc.
  compliance_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, compliant, non_compliant, expired, exempted
  
  -- Validity
  valid_from DATE,
  valid_until DATE,
  days_to_expiry INT,
  
  -- Evidence
  document_id UUID REFERENCES vendor_documents(id),
  verification_date TIMESTAMPTZ,
  verified_by UUID,
  
  -- Alerts
  alert_threshold_days INT DEFAULT 30,
  last_alert_sent TIMESTAMPTZ,
  next_alert_date TIMESTAMPTZ,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- vendor_legal indexes
CREATE INDEX IF NOT EXISTS idx_vendor_legal_tenant ON vendor_legal(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_legal_status ON vendor_legal(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_legal_approval ON vendor_legal(tenant_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_vendor_legal_risk ON vendor_legal(tenant_id, risk_level);
CREATE INDEX IF NOT EXISTS idx_vendor_legal_gst ON vendor_legal(gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_legal_pan ON vendor_legal(pan_number) WHERE pan_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_legal_search ON vendor_legal USING gin(to_tsvector('english', legal_name || ' ' || COALESCE(trade_name, '')));

-- Related table indexes
CREATE INDEX IF NOT EXISTS idx_vendor_contacts_vendor ON vendor_contacts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_addresses_vendor ON vendor_addresses(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_documents_vendor ON vendor_documents(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_banks_vendor ON vendor_banks(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_risk_vendor ON vendor_risk_assessments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_approvals_vendor ON vendor_approvals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_audit_vendor ON vendor_audit_logs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_compliance_vendor ON vendor_compliance(vendor_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_vendor_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_legal_updated_at
  BEFORE UPDATE ON vendor_legal
  FOR EACH ROW EXECUTE FUNCTION update_vendor_updated_at();

CREATE TRIGGER vendor_contacts_updated_at
  BEFORE UPDATE ON vendor_contacts
  FOR EACH ROW EXECUTE FUNCTION update_vendor_updated_at();

CREATE TRIGGER vendor_addresses_updated_at
  BEFORE UPDATE ON vendor_addresses
  FOR EACH ROW EXECUTE FUNCTION update_vendor_updated_at();

CREATE TRIGGER vendor_banks_updated_at
  BEFORE UPDATE ON vendor_banks
  FOR EACH ROW EXECUTE FUNCTION update_vendor_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE vendor_legal ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_compliance ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
CREATE POLICY vendor_legal_tenant_isolation ON vendor_legal
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY vendor_contacts_tenant_isolation ON vendor_contacts
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY vendor_addresses_tenant_isolation ON vendor_addresses
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY vendor_documents_tenant_isolation ON vendor_documents
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY vendor_banks_tenant_isolation ON vendor_banks
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY vendor_risk_tenant_isolation ON vendor_risk_assessments
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY vendor_approvals_tenant_isolation ON vendor_approvals
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY vendor_audit_tenant_isolation ON vendor_audit_logs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY vendor_compliance_tenant_isolation ON vendor_compliance
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- Vendor Summary View
CREATE OR REPLACE VIEW v_vendor_summary AS
SELECT
  v.id,
  v.tenant_id,
  v.vendor_code,
  v.legal_name,
  v.trade_name,
  bt.name AS business_type,
  ic.name AS industry,
  v.gst_number,
  v.pan_number,
  v.registration_number,
  v.status,
  v.approval_status,
  v.risk_level,
  v.compliance_score,
  v.is_active,
  v.is_verified,
  v.is_msme,
  v.last_audit_date,
  v.created_at,
  v.updated_at,
  (SELECT COUNT(*) FROM vendor_documents vd WHERE vd.vendor_id = v.id AND vd.is_active) AS document_count,
  (SELECT COUNT(*) FROM vendor_contacts vc WHERE vc.vendor_id = v.id AND vc.is_active) AS contact_count,
  (SELECT json_agg(json_build_object('type', vc.contact_type, 'name', vc.name, 'email', vc.email, 'phone', vc.phone))
   FROM vendor_contacts vc WHERE vc.vendor_id = v.id AND vc.is_primary LIMIT 1) AS primary_contact
FROM vendor_legal v
LEFT JOIN vendor_business_types bt ON bt.id = v.business_type_id
LEFT JOIN vendor_industry_categories ic ON ic.id = v.industry_id
WHERE v.deleted_at IS NULL;

-- ============================================================================
-- SEED PERMISSIONS
-- ============================================================================

-- Insert vendor-related permissions (if permissions table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
    INSERT INTO permissions (code, name, description, category) VALUES
      ('VIEW_VENDOR', 'View Vendors', 'Can view vendor list and details', 'vendor'),
      ('CREATE_VENDOR', 'Create Vendor', 'Can add new vendors', 'vendor'),
      ('UPDATE_VENDOR', 'Update Vendor', 'Can edit vendor information', 'vendor'),
      ('DELETE_VENDOR', 'Delete Vendor', 'Can delete/archive vendors', 'vendor'),
      ('APPROVE_VENDOR', 'Approve Vendor', 'Can approve vendor registrations', 'vendor'),
      ('SUSPEND_VENDOR', 'Suspend Vendor', 'Can suspend vendor access', 'vendor'),
      ('UPLOAD_VENDOR_DOC', 'Upload Vendor Documents', 'Can upload vendor documents', 'vendor'),
      ('VERIFY_VENDOR', 'Verify Vendor', 'Can verify vendor information', 'vendor'),
      ('EXPORT_VENDOR', 'Export Vendors', 'Can export vendor data', 'vendor')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE vendor_legal IS 'Main vendor legal entity table with comprehensive legal, compliance, and risk information';
COMMENT ON TABLE vendor_contacts IS 'Vendor contact persons with verification status';
COMMENT ON TABLE vendor_addresses IS 'Multiple vendor addresses (registered, operational, billing, shipping)';
COMMENT ON TABLE vendor_documents IS 'Vendor documents with verification workflow';
COMMENT ON TABLE vendor_banks IS 'Vendor banking details with verification';
COMMENT ON TABLE vendor_risk_assessments IS 'Risk assessments and due diligence records';
COMMENT ON TABLE vendor_approvals IS 'Approval workflow stages for vendor onboarding';
COMMENT ON TABLE vendor_audit_logs IS 'Complete audit trail of all vendor changes';
COMMENT ON TABLE vendor_compliance IS 'Compliance tracking with expiry alerts';

-- ============================================================================
-- PAGES MASTER ENTRIES
-- ============================================================================

-- Vendor Legal List/Dashboard Page
INSERT INTO pages_master (
    page_code, display_name, route, description, module_id, 
    icon, show_in_sidebar, status, sort_order
)
SELECT 
    'VENDORS_LEGAL_LIST',
    'Vendor Legal Master',
    '/vendors',
    'View and manage vendor legal entities with compliance tracking',
    m.id,
    'Building2',
    true,
    'active',
    5
FROM modules_master m
WHERE m.module_code = 'compliance'
ON CONFLICT (page_code) DO NOTHING;

-- Vendor Add Page
INSERT INTO pages_master (
    page_code, display_name, route, description, module_id, 
    icon, show_in_sidebar, status, sort_order
)
SELECT 
    'VENDORS_LEGAL_ADD',
    'Add Vendor',
    '/vendors/add',
    'Create new vendor with 7-step onboarding form',
    m.id,
    'PlusCircle',
    false,  -- Accessed via button
    'active',
    10
FROM modules_master m
WHERE m.module_code = 'compliance'
ON CONFLICT (page_code) DO NOTHING;

-- Vendor Detail View Page
INSERT INTO pages_master (
    page_code, display_name, route, description, module_id, 
    icon, show_in_sidebar, status, sort_order
)
SELECT 
    'VENDORS_LEGAL_VIEW',
    'Vendor Details',
    '/vendors/[id]',
    'View vendor details, documents, approvals, and audit history',
    m.id,
    'Eye',
    false,  -- Dynamic route
    'active',
    15
FROM modules_master m
WHERE m.module_code = 'compliance'
ON CONFLICT (page_code) DO NOTHING;

-- Vendor Edit Page
INSERT INTO pages_master (
    page_code, display_name, route, description, module_id, 
    icon, show_in_sidebar, status, sort_order
)
SELECT 
    'VENDORS_LEGAL_EDIT',
    'Edit Vendor',
    '/vendors/[id]/edit',
    'Edit vendor information with audit logging',
    m.id,
    'Edit',
    false,  -- Dynamic route
    'active',
    20
FROM modules_master m
WHERE m.module_code = 'compliance'
ON CONFLICT (page_code) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Vendor Legal Master migration completed successfully';
    RAISE NOTICE 'Tables created: vendor_legal, vendor_contacts, vendor_addresses, vendor_documents, vendor_banks, vendor_risk_assessments, vendor_approvals, vendor_audit_logs, vendor_compliance';
    RAISE NOTICE 'Pages added: VENDORS_LEGAL_LIST, VENDORS_LEGAL_ADD, VENDORS_LEGAL_VIEW, VENDORS_LEGAL_EDIT';
END $$;
