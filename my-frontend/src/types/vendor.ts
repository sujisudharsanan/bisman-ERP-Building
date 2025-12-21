/**
 * Vendor Types for Payment Request Integration
 * Types for vendor management in payment request forms
 */

export type VendorType = 'vendor' | 'building_owner' | 'creditor';
export type GSTType = 'with_gst' | 'without_gst';
export type ServiceType = 'rent' | 'maintenance' | 'transport' | 'consultancy' | 'others';
export type ApprovalStatus = 'pending_manager_approval' | 'pending_admin_approval' | 'approved' | 'rejected';

export interface Vendor {
  id: string;
  full_name: string;
  business_name?: string;
  role_type: VendorType;
  gst_type: GSTType;
  service_type: ServiceType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contact_number: string;
  email?: string;
  bank_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id?: string;
  pan_number: string;
  aadhaar_number?: string;
  gst_number?: string;
  remarks?: string;
  is_recurring: boolean;
  recurring_start_date?: string;
  recurring_end_date?: string;
  recurring_amount?: number;
  recurring_frequency?: string;
  uploaded_files?: VendorUploadedFiles;
  status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface VendorUploadedFiles {
  bank_passbook?: string;
  contract?: string;
  photo?: string;
  pan_card?: string;
  gst_certificate?: string;
  aadhaar_card?: string;
  cancelled_cheque?: string;
  aadhaar_number?: string;
  has_supporting_document?: boolean;
}

export interface VendorFormData {
  full_name: string;
  business_name: string;
  role_type: VendorType | '';
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
  branch_name: string;
  branch_address: string;
  account_number: string;
  confirm_account_number: string;
  ifsc_code: string;
  upi_id: string;
  pan_number: string;
  aadhaar_number: string;
  gst_number: string;
  remarks: string;
  has_supporting_document: boolean;
}

export interface IndianBank {
  name: string;
  code: string;
}

export interface IFSCDetails {
  bank: string;
  branch: string;
  address: string;
  city: string;
  district: string;
  state: string;
  contact: string | null;
  ifsc: string;
  micr: string | null;
  swift: string | null;
  upi: boolean;
}

export interface VendorSearchResult {
  id: string;
  full_name: string;
  business_name?: string;
  role_type: VendorType;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  pan_number: string;
  contact_number: string;
  email?: string;
  status: ApprovalStatus;
}

// Constants
export const VENDOR_TYPE_OPTIONS: { value: VendorType; label: string }[] = [
  { value: 'vendor', label: 'Vendor / Supplier' },
  { value: 'building_owner', label: 'Building Owner' },
  { value: 'creditor', label: 'Creditor' },
];

export const GST_TYPE_OPTIONS: { value: GSTType; label: string }[] = [
  { value: 'with_gst', label: 'With GST (Registered)' },
  { value: 'without_gst', label: 'Without GST (Unregistered)' },
];

export const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'rent', label: 'Rent' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transport', label: 'Transport' },
  { value: 'consultancy', label: 'Consultancy' },
  { value: 'others', label: 'Others' },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default {
  VENDOR_TYPE_OPTIONS,
  GST_TYPE_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  INDIAN_STATES,
};
