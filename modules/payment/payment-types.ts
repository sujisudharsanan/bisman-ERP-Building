// Payment Module Types

export type UserRoleType = 'vendor' | 'building_owner' | 'creditor';
export type GSTType = 'with_gst' | 'without_gst';
export type ServiceType = 'rent' | 'maintenance' | 'transport' | 'consultancy' | 'others';
export type ApprovalStatus = 'pending_manager_approval' | 'pending_admin_approval' | 'approved' | 'rejected';
export type PaymentMode = 'bank_transfer' | 'upi' | 'cheque' | 'cash';
export type PaymentStatus = 'pending_manager_approval' | 'pending_admin_approval' | 'approved' | 'rejected' | 'paid';
export type RecurringFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface UploadedFiles {
  bank_passbook?: string;
  contract?: string;
  photo?: string;
  pan_card?: string;
  gst_certificate?: string;
}

export interface NonPrivilegedUser {
  id: string;
  
  // Basic Information
  full_name: string;
  business_name?: string;
  role_type: UserRoleType;
  gst_type: GSTType;
  service_type: ServiceType;
  
  // Contact Information
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_number: string;
  email?: string;
  
  // Bank Details
  bank_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id?: string;
  
  // Identity & Tax
  pan_number: string;
  gst_number?: string;
  
  // Additional Details
  remarks?: string;
  
  // Recurring Payment
  is_recurring: boolean;
  recurring_start_date?: string;
  recurring_end_date?: string;
  recurring_amount?: number;
  recurring_frequency?: RecurringFrequency;
  
  // File Uploads
  uploaded_files: UploadedFiles;
  
  // Management
  hub_manager_id: string;
  status: ApprovalStatus;
  
  // Approval Tracking
  manager_approved_by?: string;
  manager_approved_at?: string;
  manager_remarks?: string;
  
  admin_approved_by?: string;
  admin_approved_at?: string;
  admin_remarks?: string;
  
  // Audit
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface NonPrivilegedUserFormData {
  full_name: string;
  business_name: string;
  role_type: UserRoleType | '';
  gst_type: GSTType | '';
  service_type: ServiceType | '';
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_number: string;
  email: string;
  bank_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  pan_number: string;
  gst_number: string;
  remarks: string;
  is_recurring: boolean;
  recurring_start_date: string;
  recurring_end_date: string;
  recurring_amount: string;
  recurring_frequency: RecurringFrequency | '';
}

export interface SupportingDocument {
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export interface PaymentRequest {
  id: string;
  payment_ref_id: string;
  non_privileged_user_id: string;
  
  // Payment Details
  amount: number;
  description: string;
  due_date: string;
  payment_mode: PaymentMode;
  
  // GST & Tax
  gst_applicable: boolean;
  gst_percentage?: number;
  gst_amount?: number;
  total_amount: number;
  
  // Recurring Information
  is_recurring: boolean;
  recurring_start_date?: string;
  recurring_end_date?: string;
  recurring_frequency?: RecurringFrequency;
  
  // Supporting Documents
  supporting_documents: SupportingDocument[];
  
  // Approval Status
  status: PaymentStatus;
  
  // Manager Approval
  manager_approved_by?: string;
  manager_approved_at?: string;
  manager_remarks?: string;
  
  // Admin Approval
  admin_approved_by?: string;
  admin_approved_at?: string;
  admin_remarks?: string;
  
  // Payment Processing
  payment_date?: string;
  payment_transaction_id?: string;
  payment_remarks?: string;
  
  // Audit
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Relations
  non_privileged_user?: NonPrivilegedUser;
}

export interface PaymentRequestFormData {
  non_privileged_user_id: string;
  amount: string;
  description: string;
  due_date: string;
  payment_mode: PaymentMode | '';
  gst_applicable: boolean;
  gst_percentage: string;
  is_recurring: boolean;
  recurring_start_date: string;
  recurring_end_date: string;
  recurring_frequency: RecurringFrequency | '';
}

export interface ApprovalAction {
  id: string;
  action: 'approve' | 'reject';
  remarks?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  payment_request_id?: string;
  action: string;
  changed_by: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  remarks?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Helper type for form validation errors
export interface FormErrors {
  [key: string]: string;
}

// Helper type for API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Constants
export const ROLE_TYPE_OPTIONS: { value: UserRoleType; label: string }[] = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'building_owner', label: 'Building Owner' },
  { value: 'creditor', label: 'Creditor' },
];

export const GST_TYPE_OPTIONS: { value: GSTType; label: string }[] = [
  { value: 'with_gst', label: 'With GST' },
  { value: 'without_gst', label: 'Without GST' },
];

export const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'rent', label: 'Rent' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transport', label: 'Transport' },
  { value: 'consultancy', label: 'Consultancy' },
  { value: 'others', label: 'Others' },
];

export const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
];

export const RECURRING_FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export const STATUS_COLORS: Record<ApprovalStatus | PaymentStatus, string> = {
  pending_manager_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  pending_admin_approval: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

export const STATUS_LABELS: Record<ApprovalStatus | PaymentStatus, string> = {
  pending_manager_approval: 'Pending Manager Approval',
  pending_admin_approval: 'Pending Admin Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};
