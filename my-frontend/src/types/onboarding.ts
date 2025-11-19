export interface TrialOnboardingInput {
  full_name: string;
  work_email: string;
  mobile_number: string;
  company_name?: string;
  country: string;
  timezone?: string;
  password: string;
  confirm_password: string;
  enable_mfa: boolean;
  industry?: string;
  purpose?: string; // HR|Finance|Inventory|CRM|Multi-module
  expected_volume?: string;
  preferred_currency?: string;
  enable_modules: string[]; // HR, Inventory, Sales, Finance, Tasks, Approvals
  preferred_language?: string; // ISO code
  consent_terms: boolean;
  consent_privacy: boolean;
  save_as_draft?: boolean;
  draft_client_id?: string;
}

export interface RegisteredClientWizardState {
  identification: {
    public_code?: string;
    type_sequence_code?: string;
    external_reference?: string;
    legal_name: string;
    trade_name?: string;
    organization_type: string; // LLC, Pvt Ltd, Partnership, Proprietor, Govt, NGO
    tax_id?: string; // GSTIN/PAN/VAT
  };
  registration: {
    registration_type: 'New Implementation' | 'Migration' | 'Subsidiary';
    primary_address: StructuredAddress;
    billing_address: StructuredAddress;
    shipping_address?: StructuredAddress;
    preferred_currency: string;
    financial_year_start?: string; // YYYY-MM-DD
  };
  lifecycle: {
    lifecycle_stage: 'Lead' | 'Prospect' | 'Trial' | 'Active' | 'Dormant';
    segment: 'SMB' | 'Mid-Market' | 'Enterprise';
    tier: 'A' | 'B' | 'C';
    source_channel: 'Web' | 'Referral' | 'Partner' | 'Sales Team';
  };
  sales: {
    primary_sales_rep?: string;
    sales_team: string[];
    auto_assign_region_segment?: boolean;
  };
  compliance: {
    kyc_status: 'Pending' | 'Partially Submitted' | 'Verified' | 'Rejected';
    aml_status?: string;
    risk_category: 'Low' | 'Medium' | 'High';
    risk_score: number; // 0-100
    id_proof?: FileMeta[];
    address_proof?: FileMeta[];
    registration_certificates?: FileMeta[];
  };
  primary_contact: {
    admin_name: string;
    admin_email: string;
    admin_mobile: string;
  };
  notifications: {
    channels: { email: boolean; sms: boolean; whatsapp: boolean };
    daily_summary: boolean;
    approvals_alerts: boolean;
  };
  legal: {
    terms_of_service: boolean;
    dpa?: boolean;
    nda_file?: FileMeta[];
  };
}

export interface StructuredAddress {
  line1: string; line2?: string; city: string; state?: string; country: string; pincode?: string; lat?: number; lng?: number;
}
export interface FileMeta { id?: string; filename: string; url?: string; size_bytes?: number; content_type?: string; uploaded_at?: string; }

export interface StepValidationResult { valid: boolean; errors: Record<string, string>; }
