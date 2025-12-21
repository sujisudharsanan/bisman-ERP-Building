/**
 * VendorCreationModal - Modal for creating new vendors
 * Includes all necessary fields for vendor creation with Indian bank autocomplete
 * PAN is compulsory, Aadhaar is optional
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  User,
  CreditCard,
  FileText,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Search,
  Upload,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  VendorFormData,
  IndianBank,
  IFSCDetails,
  VENDOR_TYPE_OPTIONS,
  GST_TYPE_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  INDIAN_STATES,
} from '@/types/vendor';

interface VendorCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated: (vendor: any) => void;
}

const initialFormData: VendorFormData = {
  full_name: '',
  business_name: '',
  role_type: '',
  gst_type: '',
  service_type: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  contact_number: '',
  email: '',
  bank_holder_name: '',
  bank_name: '',
  branch_name: '',
  branch_address: '',
  account_number: '',
  confirm_account_number: '',
  ifsc_code: '',
  upi_id: '',
  pan_number: '',
  aadhaar_number: '',
  gst_number: '',
  remarks: '',
  has_supporting_document: false,
};

export function VendorCreationModal({ isOpen, onClose, onVendorCreated }: VendorCreationModalProps) {
  const [formData, setFormData] = useState<VendorFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // File upload state
  const [panFile, setPanFile] = useState<File | null>(null);
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null);
  const [gstCertFile, setGstCertFile] = useState<File | null>(null);
  
  // Bank autocomplete state
  const [bankList, setBankList] = useState<IndianBank[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [filteredBanks, setFilteredBanks] = useState<IndianBank[]>([]);
  
  // IFSC lookup state
  const [isLookingUpIFSC, setIsLookingUpIFSC] = useState(false);
  const [ifscDetails, setIfscDetails] = useState<IFSCDetails | null>(null);
  
  // State dropdown
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [filteredStates, setFilteredStates] = useState<string[]>(INDIAN_STATES);
  
  // File input refs
  const panFileInputRef = useRef<HTMLInputElement>(null);
  const supportingDocInputRef = useRef<HTMLInputElement>(null);
  const gstCertInputRef = useRef<HTMLInputElement>(null);
  
  const bankInputRef = useRef<HTMLInputElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);

  // Load bank list on mount
  useEffect(() => {
    if (isOpen) {
      fetchBankList();
    }
  }, [isOpen]);

  // Filter banks based on search
  useEffect(() => {
    if (bankSearch) {
      const searchLower = bankSearch.toLowerCase();
      setFilteredBanks(
        bankList.filter(bank =>
          bank.name.toLowerCase().includes(searchLower) ||
          bank.code.toLowerCase().includes(searchLower)
        )
      );
    } else {
      setFilteredBanks(bankList);
    }
  }, [bankSearch, bankList]);

  // Filter states based on search
  useEffect(() => {
    if (stateSearch) {
      const searchLower = stateSearch.toLowerCase();
      setFilteredStates(INDIAN_STATES.filter(state =>
        state.toLowerCase().includes(searchLower)
      ));
    } else {
      setFilteredStates(INDIAN_STATES);
    }
  }, [stateSearch]);

  // Auto-fill bank holder name from full name
  useEffect(() => {
    if (formData.full_name && !formData.bank_holder_name) {
      setFormData(prev => ({ ...prev, bank_holder_name: formData.full_name }));
    }
  }, [formData.full_name]);

  const fetchBankList = async () => {
    try {
      const res = await fetch('/api/vendors/banks', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBankList(data.data || []);
        setFilteredBanks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch bank list:', error);
      // Fallback to static list
      const fallbackBanks: IndianBank[] = [
        { name: 'State Bank of India', code: 'SBIN' },
        { name: 'HDFC Bank', code: 'HDFC' },
        { name: 'ICICI Bank', code: 'ICIC' },
        { name: 'Axis Bank', code: 'UTIB' },
        { name: 'Kotak Mahindra Bank', code: 'KKBK' },
        { name: 'Punjab National Bank', code: 'PUNB' },
        { name: 'Bank of Baroda', code: 'BARB' },
        { name: 'Canara Bank', code: 'CNRB' },
        { name: 'Union Bank of India', code: 'UBIN' },
        { name: 'Bank of India', code: 'BKID' },
      ];
      setBankList(fallbackBanks);
      setFilteredBanks(fallbackBanks);
    }
  };

  const lookupIFSC = async (ifscCode: string) => {
    if (!ifscCode || ifscCode.length !== 11) return;
    
    setIsLookingUpIFSC(true);
    try {
      const res = await fetch(`/api/vendors/ifsc/${ifscCode.toUpperCase()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setIfscDetails(data.data);
          setFormData(prev => ({
            ...prev,
            bank_name: data.data.bank,
            branch_name: data.data.branch,
            branch_address: data.data.address,
            city: data.data.city || prev.city,
            state: data.data.state || prev.state,
          }));
          setErrors(prev => ({ ...prev, ifsc_code: '' }));
        }
      } else {
        setErrors(prev => ({ ...prev, ifsc_code: 'Invalid IFSC code' }));
        setIfscDetails(null);
      }
    } catch (error) {
      console.error('IFSC lookup failed:', error);
    } finally {
      setIsLookingUpIFSC(false);
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.role_type) newErrors.role_type = 'Vendor type is required';
    if (!formData.gst_type) newErrors.gst_type = 'GST type is required';
    if (!formData.service_type) newErrors.service_type = 'Service type is required';
    if (!formData.contact_number.trim()) newErrors.contact_number = 'Contact number is required';
    
    // Email validation (optional)
    if (formData.email && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Phone validation
    if (formData.contact_number && !/^[6-9]\d{9}$/.test(formData.contact_number.replace(/\D/g, ''))) {
      newErrors.contact_number = 'Invalid phone number (10 digits starting with 6-9)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    
    // Pincode validation
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Invalid pincode (6 digits)';
    }
    
    // PAN validation (compulsory)
    if (!formData.pan_number.trim()) {
      newErrors.pan_number = 'PAN number is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan_number.toUpperCase())) {
      newErrors.pan_number = 'Invalid PAN format (e.g., ABCDE1234F)';
    }
    
    // Aadhaar validation (optional)
    if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number.replace(/\s/g, ''))) {
      newErrors.aadhaar_number = 'Invalid Aadhaar (12 digits)';
    }
    
    // GST validation (if with_gst)
    if (formData.gst_type === 'with_gst') {
      if (!formData.gst_number.trim()) {
        newErrors.gst_number = 'GST number is required';
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number.toUpperCase())) {
        newErrors.gst_number = 'Invalid GST format';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.bank_holder_name.trim()) newErrors.bank_holder_name = 'Account holder name is required';
    if (!formData.bank_name.trim()) newErrors.bank_name = 'Bank name is required';
    if (!formData.account_number.trim()) newErrors.account_number = 'Account number is required';
    if (!formData.confirm_account_number.trim()) newErrors.confirm_account_number = 'Please confirm account number';
    if (formData.account_number !== formData.confirm_account_number) {
      newErrors.confirm_account_number = 'Account numbers do not match';
    }
    if (!formData.ifsc_code.trim()) newErrors.ifsc_code = 'IFSC code is required';
    
    // IFSC validation
    if (formData.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.toUpperCase())) {
      newErrors.ifsc_code = 'Invalid IFSC format (e.g., HDFC0001234)';
    }
    
    // Document validations
    if (!panFile) newErrors.panFile = 'PAN card copy is required';
    if (!supportingDocFile) newErrors.supportingDocFile = 'Bank proof document is required';
    if (formData.gst_type === 'with_gst' && !gstCertFile) {
      newErrors.gstCertFile = 'GST certificate is required for GST registered vendors';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    
    setIsSubmitting(true);
    try {
      // Create FormData for file uploads
      const submitData = new FormData();
      
      // Add form fields
      submitData.append('full_name', formData.full_name);
      submitData.append('business_name', formData.business_name || '');
      submitData.append('role_type', formData.role_type);
      submitData.append('gst_type', formData.gst_type);
      submitData.append('service_type', formData.service_type);
      submitData.append('address', formData.address);
      submitData.append('city', formData.city);
      submitData.append('state', formData.state);
      submitData.append('pincode', formData.pincode);
      submitData.append('contact_number', formData.contact_number);
      submitData.append('email', formData.email || '');
      submitData.append('bank_holder_name', formData.bank_holder_name);
      submitData.append('bank_name', formData.bank_name);
      submitData.append('branch_name', formData.branch_name || '');
      submitData.append('branch_address', formData.branch_address || '');
      submitData.append('account_number', formData.account_number);
      submitData.append('ifsc_code', formData.ifsc_code.toUpperCase());
      submitData.append('upi_id', formData.upi_id || '');
      submitData.append('pan_number', formData.pan_number.toUpperCase());
      submitData.append('aadhaar_number', formData.aadhaar_number || '');
      submitData.append('gst_number', formData.gst_number?.toUpperCase() || '');
      submitData.append('remarks', formData.remarks || '');
      submitData.append('has_supporting_document', String(!!supportingDocFile));
      
      // Add files
      if (panFile) submitData.append('pan_file', panFile);
      if (supportingDocFile) submitData.append('supporting_doc', supportingDocFile);
      if (gstCertFile) submitData.append('gst_certificate', gstCertFile);

      const res = await fetch('/api/vendors', {
        method: 'POST',
        credentials: 'include',
        body: submitData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onVendorCreated(data.data);
        setFormData(initialFormData);
        setPanFile(null);
        setSupportingDocFile(null);
        setGstCertFile(null);
        setStep(1);
        onClose();
      } else {
        setErrors(data.errors || { submit: data.error || 'Failed to create vendor' });
      }
    } catch (error) {
      console.error('Create vendor error:', error);
      setErrors({ submit: 'Failed to create vendor. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof VendorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectBank = (bank: IndianBank) => {
    setFormData(prev => ({ ...prev, bank_name: bank.name }));
    setBankSearch('');
    setShowBankDropdown(false);
  };

  const selectState = (state: string) => {
    setFormData(prev => ({ ...prev, state }));
    setStateSearch('');
    setShowStateDropdown(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Create New Vendor
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Step {step} of 3 - {step === 1 ? 'Basic Info' : step === 2 ? 'Identity & Address' : 'Bank Details'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors',
                  s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* Warning Banner */}
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  First-time vendor registration requires supporting documents
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Without proof (cancelled cheque, passbook, or bank statement), payment requests may be rejected.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Name / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Enter full name"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.full_name ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  />
                  {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
                </div>

                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Business Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => handleInputChange('business_name', e.target.value)}
                    placeholder="Enter business name"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Vendor Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Vendor Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role_type}
                    onChange={(e) => handleInputChange('role_type', e.target.value)}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.role_type ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  >
                    <option value="">Select type...</option>
                    {VENDOR_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.role_type && <p className="mt-1 text-xs text-red-500">{errors.role_type}</p>}
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Service Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => handleInputChange('service_type', e.target.value)}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.service_type ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  >
                    <option value="">Select service...</option>
                    {SERVICE_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.service_type && <p className="mt-1 text-xs text-red-500">{errors.service_type}</p>}
                </div>

                {/* GST Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    GST Registration <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gst_type}
                    onChange={(e) => handleInputChange('gst_type', e.target.value)}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.gst_type ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  >
                    <option value="">Select GST status...</option>
                    {GST_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.gst_type && <p className="mt-1 text-xs text-red-500">{errors.gst_type}</p>}
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.contact_number}
                      onChange={(e) => handleInputChange('contact_number', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className={cn(
                        'w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        errors.contact_number ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {errors.contact_number && <p className="mt-1 text-xs text-red-500">{errors.contact_number}</p>}
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="vendor@example.com"
                      className={cn(
                        'w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        errors.email ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Identity & Address */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PAN Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    PAN Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pan_number}
                    onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="ABCDE1234F"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400 uppercase',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.pan_number ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  />
                  {errors.pan_number && <p className="mt-1 text-xs text-red-500">{errors.pan_number}</p>}
                </div>

                {/* Aadhaar Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Aadhaar Number <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.aadhaar_number}
                    onChange={(e) => handleInputChange('aadhaar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="123456789012"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.aadhaar_number ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  />
                  {errors.aadhaar_number && <p className="mt-1 text-xs text-red-500">{errors.aadhaar_number}</p>}
                </div>

                {/* GST Number (conditional) */}
                {formData.gst_type === 'with_gst' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      GST Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.gst_number}
                      onChange={(e) => handleInputChange('gst_number', e.target.value.toUpperCase().slice(0, 15))}
                      placeholder="22AAAAA0000A1Z5"
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400 uppercase',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        errors.gst_number ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      )}
                    />
                    {errors.gst_number && <p className="mt-1 text-xs text-red-500">{errors.gst_number}</p>}
                  </div>
                )}

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter complete address"
                      rows={2}
                      className={cn(
                        'w-full pl-10 pr-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400 resize-none',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        errors.address ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      )}
                    />
                  </div>
                  {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Enter city"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.city ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  />
                  {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
                </div>

                {/* State */}
                <div className="relative" ref={stateInputRef}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    State <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.state || stateSearch}
                      onChange={(e) => {
                        setStateSearch(e.target.value);
                        setFormData(prev => ({ ...prev, state: '' }));
                        setShowStateDropdown(true);
                      }}
                      onFocus={() => setShowStateDropdown(true)}
                      placeholder="Select state..."
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        errors.state ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      )}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {showStateDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredStates.map(state => (
                        <button
                          key={state}
                          type="button"
                          onClick={() => selectState(state)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="400001"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.pincode ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  />
                  {errors.pincode && <p className="mt-1 text-xs text-red-500">{errors.pincode}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bank Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IFSC Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.ifsc_code}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().slice(0, 11);
                        handleInputChange('ifsc_code', value);
                        if (value.length === 11) {
                          lookupIFSC(value);
                        }
                      }}
                      placeholder="HDFC0001234"
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400 uppercase',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        errors.ifsc_code ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      )}
                    />
                    {isLookingUpIFSC && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {ifscDetails && !isLookingUpIFSC && (
                      <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  {errors.ifsc_code && <p className="mt-1 text-xs text-red-500">{errors.ifsc_code}</p>}
                  {ifscDetails && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                      {ifscDetails.bank} - {ifscDetails.branch}
                    </p>
                  )}
                </div>

                {/* Bank Name */}
                <div className="relative" ref={bankInputRef}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.bank_name || bankSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBankSearch(value);
                        // Allow typing bank name directly
                        setFormData(prev => ({ ...prev, bank_name: value }));
                        setShowBankDropdown(true);
                      }}
                      onFocus={() => setShowBankDropdown(true)}
                      onBlur={() => {
                        // Close dropdown after a short delay to allow click
                        setTimeout(() => setShowBankDropdown(false), 200);
                      }}
                      placeholder="Type or search bank name..."
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                        'text-gray-900 dark:text-white placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500',
                        errors.bank_name ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                      )}
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {showBankDropdown && filteredBanks.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredBanks.slice(0, 10).map(bank => (
                        <button
                          key={bank.code}
                          type="button"
                          onClick={() => selectBank(bank)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                        >
                          <span>{bank.name}</span>
                          <span className="text-xs text-gray-400">{bank.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Select from list or type bank name manually</p>
                  {errors.bank_name && <p className="mt-1 text-xs text-red-500">{errors.bank_name}</p>}
                </div>

                {/* Branch Name (auto-filled) */}
                {ifscDetails && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Branch Name
                      </label>
                      <input
                        type="text"
                        value={formData.branch_name}
                        readOnly
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Branch Address
                      </label>
                      <input
                        type="text"
                        value={formData.branch_address}
                        readOnly
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300"
                      />
                    </div>
                  </>
                )}

                {/* Account Holder Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.bank_holder_name}
                    onChange={(e) => handleInputChange('bank_holder_name', e.target.value)}
                    placeholder="Name as per bank records"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.bank_holder_name ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  />
                  {errors.bank_holder_name && <p className="mt-1 text-xs text-red-500">{errors.bank_holder_name}</p>}
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => handleInputChange('account_number', e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter account number"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.account_number ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  />
                  {errors.account_number && <p className="mt-1 text-xs text-red-500">{errors.account_number}</p>}
                </div>

                {/* Confirm Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Confirm Account Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.confirm_account_number}
                    onChange={(e) => handleInputChange('confirm_account_number', e.target.value.replace(/\D/g, ''))}
                    placeholder="Re-enter account number"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-gray-800',
                      'text-gray-900 dark:text-white placeholder:text-gray-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500',
                      errors.confirm_account_number ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'
                    )}
                  />
                  {errors.confirm_account_number && <p className="mt-1 text-xs text-red-500">{errors.confirm_account_number}</p>}
                </div>

                {/* UPI ID */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    UPI ID <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.upi_id}
                    onChange={(e) => handleInputChange('upi_id', e.target.value)}
                    placeholder="example@upi"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Document Upload Section */}
                <div className="md:col-span-2 space-y-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Document Uploads
                  </h4>
                  
                  {/* PAN Card Upload - Required */}
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        PAN Card Copy <span className="text-red-500">*</span>
                      </label>
                      {panFile && (
                        <button
                          type="button"
                          onClick={() => setPanFile(null)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={panFileInputRef}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setErrors(prev => ({ ...prev, panFile: 'File size must be less than 5MB' }));
                            return;
                          }
                          setPanFile(file);
                          setErrors(prev => ({ ...prev, panFile: '' }));
                        }
                      }}
                      className="hidden"
                    />
                    {panFile ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{panFile.name}</span>
                        <span className="text-xs text-gray-500">{(panFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => panFileInputRef.current?.click()}
                        className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload PAN card</span>
                          <span className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</span>
                        </div>
                      </button>
                    )}
                    {errors.panFile && <p className="mt-1 text-xs text-red-500">{errors.panFile}</p>}
                  </div>

                  {/* GST Certificate Upload - Required if GST Registered */}
                  {formData.gst_type === 'with_gst' && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          GST Certificate <span className="text-red-500">*</span>
                        </label>
                        {gstCertFile && (
                          <button
                            type="button"
                            onClick={() => setGstCertFile(null)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={gstCertInputRef}
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              setErrors(prev => ({ ...prev, gstCertFile: 'File size must be less than 5MB' }));
                              return;
                            }
                            setGstCertFile(file);
                            setErrors(prev => ({ ...prev, gstCertFile: '' }));
                          }
                        }}
                        className="hidden"
                      />
                      {gstCertFile ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{gstCertFile.name}</span>
                          <span className="text-xs text-gray-500">{(gstCertFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => gstCertInputRef.current?.click()}
                          className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-500">Click to upload GST Certificate</span>
                            <span className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</span>
                          </div>
                        </button>
                      )}
                      {errors.gstCertFile && <p className="mt-1 text-xs text-red-500">{errors.gstCertFile}</p>}
                    </div>
                  )}

                  {/* Supporting Document Upload - Bank Proof */}
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Bank Proof <span className="text-red-500">*</span>
                        <span className="text-xs text-gray-500 ml-1">(Cancelled Cheque / Passbook / Bank Statement)</span>
                      </label>
                      {supportingDocFile && (
                        <button
                          type="button"
                          onClick={() => setSupportingDocFile(null)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={supportingDocInputRef}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setErrors(prev => ({ ...prev, supportingDocFile: 'File size must be less than 5MB' }));
                            return;
                          }
                          setSupportingDocFile(file);
                          handleInputChange('has_supporting_document', true);
                          setErrors(prev => ({ ...prev, supportingDocFile: '' }));
                        }
                      }}
                      className="hidden"
                    />
                    {supportingDocFile ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{supportingDocFile.name}</span>
                        <span className="text-xs text-gray-500">{(supportingDocFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => supportingDocInputRef.current?.click()}
                        className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to upload bank proof document</span>
                          <span className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</span>
                        </div>
                      </button>
                    )}
                    {errors.supportingDocFile && <p className="mt-1 text-xs text-red-500">{errors.supportingDocFile}</p>}
                  </div>

                  {/* Warning for missing documents */}
                  {(!panFile || !supportingDocFile || (formData.gst_type === 'with_gst' && !gstCertFile)) && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        All documents are required for vendor registration. Missing documents may delay approval.
                      </p>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Remarks <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {errors.submit && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button
            type="button"
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={isSubmitting}
            className={cn(
              'px-6 py-2.5 rounded-xl font-medium transition-all duration-200',
              'bg-blue-600 hover:bg-blue-700 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'flex items-center gap-2'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : step === 3 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Create Vendor
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorCreationModal;
