/**
 * TypeScript types for User Management, KYC, and Invitation system
 */

// Database enums
export type InvitationStatus = 'pending_kyc' | 'kyc_submitted' | 'expired' | 'cancelled';
export type KycStatus = 'awaiting_approval' | 'approved' | 'rejected' | 'expired';
export type ApprovalAction = 'approve' | 'reject' | 'request_changes';
export type UserStatus = 'invited' | 'provisionally_active' | 'active' | 'suspended' | 'terminated';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

// Type aliases for compatibility
export type UserRole = Role;
export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Base entities
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string; // Main email field for compatibility
  personal_email: string;
  company_email?: string;
  phone?: string;
  alternate_phone?: string;
  status: UserStatus;
  role_id?: string;
  branch_id?: string;
  employee_id?: string;
  designation?: string;
  department?: string; // Add department field
  salary?: number;
  date_of_birth?: string;
  blood_group?: string;
  aadhaar_number?: string; // Encrypted
  license_number?: string;
  about_me?: string;
  profile_picture_url?: string;
  communication_address?: string;
  permanent_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  last_login?: string;
  password_changed_at?: string;
  email_verified_at?: string;
  is_first_login: boolean;
  meta: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Relations
  role?: Role;
  roles: Role[]; // Support multiple roles
  branch?: Branch;
  kyc_submission?: KycSubmission;
}

// Additional missing interfaces for compatibility
export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  resource_type?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalLog {
  id: string;
  entity_type: string;
  entity_id: string;
  reviewer_id: string;
  action: ApprovalAction;
  notes?: string;
  created_at: string;
  // Relations
  reviewer?: User;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Relations
  user?: User;
}

export interface FileObject {
  id: string;
  file_key: string;
  original_name: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  owner_type: string;
  owner_id: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  // Basic user data
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  alternate_phone?: string;
  password: string;
  confirm_password: string;
  designation?: string;
  department?: string;
  employee_id?: string;
  branch_id?: string;
  role_ids: string[];
  status: UserStatus;

  // KYC data
  personal_email?: string;
  date_of_birth?: string;
  blood_group?: string;
  about_me?: string;
  communication_address?: string;
  permanent_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  aadhaar_number?: string;
  license_number?: string;
  qualifications: Qualification[];
  employment_history: EmploymentHistory[];
  family_details: FamilyDetail[];
  custom_fields: Record<string, any>;
  
  // Consent (required for KYC)
  consent_given: boolean;
  terms_accepted: boolean;
}

export interface Invitation {
  id: string;
  token: string;
  inviter_admin_id: string;
  invitee_name: string;
  invitee_email: string;
  phone?: string;
  designation?: string;
  location?: string;
  role_requested?: string;
  preferred_language: string;
  status: InvitationStatus;
  expires_at: string;
  invited_at: string;
  kyc_submitted_at?: string;
  meta: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Relations
  inviter?: User;
  role?: Role;
}

export interface Qualification {
  degree: string;
  institution: string;
  year: number;
  grade?: string;
  specialization?: string;
}

export interface EmploymentHistory {
  company: string;
  designation: string;
  from_date: string;
  to_date?: string;
  salary?: number;
  reason_for_leaving?: string;
}

export interface FamilyDetail {
  name: string;
  relationship: string;
  contact?: string;
  dob?: string;
  occupation?: string;
}

export interface KycSubmission {
  id: string;
  user_id: string;
  // Personal information
  first_name: string;
  last_name: string;
  email: string;
  personal_email?: string; // Add missing field
  phone?: string;
  alternate_phone?: string; // Add missing field
  date_of_birth?: string;
  blood_group?: string;
  about_me?: string;
  
  // Address information
  communication_address?: string;
  permanent_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  
  // Official information
  aadhaar_number?: string;
  license_number?: string;
  qualifications: Qualification[];
  employment_history: EmploymentHistory[];
  family_details: FamilyDetail[];
  
  // File references
  files: {
    profile_picture?: string;
    aadhaar_doc?: string;
    address_proof?: string;
    certificates?: string[];
  };
  
  // Processing
  status: KycStatus;
  submitted_at: string;
  processed_at?: string;
  processed_by?: string;
  rejection_reason?: string;
  
  // Compliance
  consent_given: boolean;
  privacy_policy_version?: string;
  terms_accepted_at?: string;
  
  // Custom fields
  custom_fields: Record<string, any>;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Relations (for expanded data)
  user?: User;
  file_objects?: FileObject[];
  approval_logs?: ApprovalLog[];
}

// Extended KYC submission for components that need relations
export interface KycSubmissionWithRelations extends Omit<KycSubmission, 'files'> {
  user: User;
  files: FileObject[]; // Override the files property to be an array of FileObject
  approval_logs: ApprovalLog[];
}

export interface FileObject {
  id: string;
  owner_type: string;
  owner_id: string;
  file_key: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  storage_provider: string;
  storage_url?: string;
  is_public: boolean;
  virus_scan_status?: string;
  virus_scan_at?: string;
  metadata: Record<string, any>;
  uploaded_at: string;
  deleted_at?: string;
}

export interface ApprovalLog {
  id: string;
  kyc_submission_id: string;
  admin_id: string;
  action: ApprovalAction;
  reason?: string;
  payload: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  
  // Relations
  kyc_submission?: KycSubmission;
  admin?: User;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_type: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  risk_score: number;
  timestamp: string;
  
  // Relations
  actor?: User;
}

// Form types
export interface InviteUserForm {
  full_name: string;
  personal_email: string;
  phone: string;
  designation: string;
  location: string;
  role_id: string;
  preferred_language: string;
}

export interface CreateFullUserForm extends InviteUserForm {
  // Additional KYC fields
  date_of_birth?: string;
  blood_group?: string;
  about_me?: string;
  communication_address?: string;
  permanent_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  aadhaar_number?: string;
  license_number?: string;
  qualifications: Qualification[];
  employment_history: EmploymentHistory[];
  family_details: FamilyDetail[];
  
  // Admin fields
  company_email: string;
  salary: number;
  branch_id: string;
  auto_generate_password: boolean;
  send_credentials_email: boolean;
}

export interface KycFormData {
  // Personal
  first_name: string;
  last_name: string;
  personal_email: string;
  phone?: string;
  alternate_phone?: string;
  date_of_birth?: string;
  blood_group?: string;
  about_me?: string;
  
  // Address
  communication_address?: string;
  permanent_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  
  // Identity
  aadhaar_number?: string;
  license_number?: string;
  
  // Structured data
  qualifications: Qualification[];
  employment_history: EmploymentHistory[];
  family_details: FamilyDetail[];
  
  // Files (will be uploaded separately)
  profile_picture?: File;
  aadhaar_doc?: File;
  address_proof?: File;
  certificates?: File[];
  
  // Compliance
  consent_given: boolean;
  terms_accepted: boolean;
  
  // Custom fields
  custom_fields: Record<string, any>;
}

export interface ApprovalFormData {
  company_email: string;
  salary: number;
  branch_id: string;
  role_permissions: string[];
  auto_generate_password: boolean;
  send_credentials_email: boolean;
  notes?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DatabaseStatus {
  connected: boolean;
  latency_ms?: number;
  last_check: string;
}

export interface InviteResponse {
  invitation: Invitation;
  invite_url: string;
  expires_in_hours: number;
}

export interface KycReviewData extends KycSubmission {
  files_with_urls: {
    profile_picture?: { id: string; url: string; name: string; };
    aadhaar_doc?: { id: string; url: string; name: string; };
    address_proof?: { id: string; url: string; name: string; };
    certificates?: Array<{ id: string; url: string; name: string; }>;
  };
}

export interface UserCreationResult {
  user: User;
  temporary_password?: string;
  company_email_created: string;
  credentials_sent: boolean;
}

// Validation schemas (for use with zod or similar)
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// File upload types
export interface UploadConfig {
  max_file_size: number;
  allowed_mime_types: string[];
  allowed_extensions: string[];
}

export interface PresignedUrlResponse {
  upload_url: string;
  file_key: string;
  form_data?: Record<string, string>;
}

// Permission types
export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  role_id: string;
  permissions: Permission[];
}

// Search and filter types
export interface UserSearchFilters {
  status?: UserStatus[];
  roles?: string[];
  branches?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface KycSearchFilters {
  status?: KycStatus[];
  submitted_from?: string;
  submitted_to?: string;
  search?: string;
}

// Constants - moved to avoid duplicates

export const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  // Add more countries as needed
] as const;

export const RELATIONSHIPS = [
  'Father', 'Mother', 'Spouse', 'Son', 'Daughter', 
  'Brother', 'Sister', 'Guardian', 'Other'
] as const;

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'bn', name: 'Bengali' },
  // Add more languages
] as const;

// File type constants
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_CERTIFICATE_FILES = 10;

// Rate limiting constants
export const RATE_LIMITS = {
  KYC_SUBMIT: { requests: 3, window_minutes: 60 },
  INVITE_SEND: { requests: 10, window_minutes: 60 },
  LOGIN_ATTEMPT: { requests: 5, window_minutes: 15 },
} as const;
