'use client';

/**
 * ============================================================================
 * BISMAN ERP - Vendor Add Form (Multi-Step)
 * ============================================================================
 * 
 * 7-step vendor onboarding form:
 * 1. Legal Identity
 * 2. Business Details
 * 3. Contact & Address
 * 4. Compliance & Documents
 * 5. Banking & Payment
 * 6. Risk & Due Diligence
 * 7. Review & Submit
 * 
 * @module pages/vendors/add
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, ArrowLeft, ArrowRight, Check, Save, Send,
  FileText, Users, MapPin, Upload, CreditCard, Shield, Eye,
  AlertCircle, X, Plus, Trash2, Loader2
} from 'lucide-react';
import { useAuth } from '@/common/hooks/useAuth';
import api from '@/lib/api/axios';

// ============================================================================
// TYPES
// ============================================================================

interface FormData {
  // Step 1: Legal Identity
  legal_name: string;
  trade_name: string;
  business_type_id: number | null;
  registration_number: string;
  gst_number: string;
  pan_number: string;
  cin_number: string;
  tin_number: string;
  incorporation_date: string;
  country: string;
  state: string;
  
  // Step 2: Business Details
  industry_id: number | null;
  services_products: string[];
  annual_turnover: string;
  company_size: string;
  website: string;
  primary_market: string;
  is_msme: boolean;
  msme_number: string;
  msme_category: string;
  
  // Step 3: Contact & Address
  primary_contact: {
    name: string;
    designation: string;
    email: string;
    phone: string;
    alternate_phone: string;
  };
  registered_address: {
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  operational_address?: {
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  same_as_registered: boolean;
  
  // Step 4: Documents (handled separately)
  documents: File[];
  documentTypes: string[];
  
  // Step 5: Banking
  bank_details: {
    bank_name: string;
    branch_name: string;
    account_holder_name: string;
    account_number: string;
    account_type: string;
    ifsc_code: string;
    swift_code: string;
    upi_id: string;
  };
  default_payment_terms: string;
  credit_limit: string;
  credit_days: string;
  
  // Step 6: Risk & Due Diligence
  risk_level: string;
  internal_rating: number;
  rating_remarks: string;
  previous_violations: string[];
  
  // Step 7: TDS
  tds_applicable: boolean;
  tds_section: string;
  tds_rate: string;
  notes: string;
  tags: string[];
}

interface BusinessType {
  id: number;
  code: string;
  name: string;
}

interface Industry {
  id: number;
  code: string;
  name: string;
}

interface FormError {
  field: string;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
  { id: 1, title: 'Legal Identity', icon: FileText },
  { id: 2, title: 'Business Details', icon: Building2 },
  { id: 3, title: 'Contact & Address', icon: MapPin },
  { id: 4, title: 'Documents', icon: Upload },
  { id: 5, title: 'Banking', icon: CreditCard },
  { id: 6, title: 'Risk Assessment', icon: Shield },
  { id: 7, title: 'Review & Submit', icon: Eye },
];

const COMPANY_SIZES = [
  { value: 'micro', label: 'Micro (1-9 employees)' },
  { value: 'small', label: 'Small (10-49 employees)' },
  { value: 'medium', label: 'Medium (50-249 employees)' },
  { value: 'large', label: 'Large (250-999 employees)' },
  { value: 'enterprise', label: 'Enterprise (1000+ employees)' },
];

const MSME_CATEGORIES = [
  { value: 'micro', label: 'Micro Enterprise' },
  { value: 'small', label: 'Small Enterprise' },
  { value: 'medium', label: 'Medium Enterprise' },
];

const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'net_7', label: 'Net 7 Days' },
  { value: 'net_15', label: 'Net 15 Days' },
  { value: 'net_30', label: 'Net 30 Days' },
  { value: 'net_45', label: 'Net 45 Days' },
  { value: 'net_60', label: 'Net 60 Days' },
  { value: 'net_90', label: 'Net 90 Days' },
];

const DOCUMENT_TYPES = [
  { code: 'incorporation_certificate', label: 'Certificate of Incorporation', mandatory: true },
  { code: 'gst_certificate', label: 'GST Certificate', mandatory: true },
  { code: 'pan_card', label: 'PAN Card', mandatory: true },
  { code: 'bank_proof', label: 'Bank Proof (Cancelled Cheque/Statement)', mandatory: true },
  { code: 'nda', label: 'NDA (Signed)', mandatory: false },
  { code: 'iso_certificate', label: 'ISO / Quality Certificates', mandatory: false },
  { code: 'insurance', label: 'Insurance Documents', mandatory: false },
];

const TDS_SECTIONS = [
  { value: '194C', label: '194C - Contractors' },
  { value: '194J', label: '194J - Professional Services' },
  { value: '194H', label: '194H - Commission' },
  { value: '194I', label: '194I - Rent' },
  { value: '194A', label: '194A - Interest' },
  { value: '194Q', label: '194Q - Purchase of Goods' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const INITIAL_FORM_DATA: FormData = {
  legal_name: '',
  trade_name: '',
  business_type_id: null,
  registration_number: '',
  gst_number: '',
  pan_number: '',
  cin_number: '',
  tin_number: '',
  incorporation_date: '',
  country: 'India',
  state: '',
  
  industry_id: null,
  services_products: [],
  annual_turnover: '',
  company_size: '',
  website: '',
  primary_market: 'Domestic',
  is_msme: false,
  msme_number: '',
  msme_category: '',
  
  primary_contact: {
    name: '',
    designation: '',
    email: '',
    phone: '',
    alternate_phone: '',
  },
  registered_address: {
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
  },
  same_as_registered: true,
  
  documents: [],
  documentTypes: [],
  
  bank_details: {
    bank_name: '',
    branch_name: '',
    account_holder_name: '',
    account_number: '',
    account_type: 'current',
    ifsc_code: '',
    swift_code: '',
    upi_id: '',
  },
  default_payment_terms: 'net_30',
  credit_limit: '',
  credit_days: '30',
  
  risk_level: 'medium',
  internal_rating: 3,
  rating_remarks: '',
  previous_violations: [],
  
  tds_applicable: false,
  tds_section: '',
  tds_rate: '',
  notes: '',
  tags: [],
};

// ============================================================================
// VALIDATION
// ============================================================================

function validateStep(step: number, formData: FormData): FormError[] {
  const errors: FormError[] = [];
  
  switch (step) {
    case 1: // Legal Identity
      if (!formData.legal_name.trim()) {
        errors.push({ field: 'legal_name', message: 'Legal name is required' });
      }
      if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
        errors.push({ field: 'gst_number', message: 'Invalid GST format (e.g., 22AAAAA0000A1Z5)' });
      }
      if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
        errors.push({ field: 'pan_number', message: 'Invalid PAN format (e.g., AAAAA0000A)' });
      }
      break;
      
    case 3: // Contact & Address
      if (!formData.primary_contact.name.trim()) {
        errors.push({ field: 'primary_contact.name', message: 'Contact name is required' });
      }
      if (!formData.primary_contact.email.trim()) {
        errors.push({ field: 'primary_contact.email', message: 'Email is required' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primary_contact.email)) {
        errors.push({ field: 'primary_contact.email', message: 'Invalid email format' });
      }
      if (!formData.primary_contact.phone.trim()) {
        errors.push({ field: 'primary_contact.phone', message: 'Phone is required' });
      }
      if (!formData.registered_address.address_line1.trim()) {
        errors.push({ field: 'registered_address.address_line1', message: 'Address is required' });
      }
      if (!formData.registered_address.city.trim()) {
        errors.push({ field: 'registered_address.city', message: 'City is required' });
      }
      if (!formData.registered_address.state.trim()) {
        errors.push({ field: 'registered_address.state', message: 'State is required' });
      }
      if (!formData.registered_address.pincode.trim()) {
        errors.push({ field: 'registered_address.pincode', message: 'Pincode is required' });
      }
      break;
      
    case 5: // Banking
      if (!formData.bank_details.bank_name.trim()) {
        errors.push({ field: 'bank_details.bank_name', message: 'Bank name is required' });
      }
      if (!formData.bank_details.account_holder_name.trim()) {
        errors.push({ field: 'bank_details.account_holder_name', message: 'Account holder name is required' });
      }
      if (!formData.bank_details.account_number.trim()) {
        errors.push({ field: 'bank_details.account_number', message: 'Account number is required' });
      }
      if (!formData.bank_details.ifsc_code.trim()) {
        errors.push({ field: 'bank_details.ifsc_code', message: 'IFSC code is required' });
      } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_details.ifsc_code)) {
        errors.push({ field: 'bank_details.ifsc_code', message: 'Invalid IFSC format (e.g., SBIN0001234)' });
      }
      break;
  }
  
  return errors;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Step Indicator
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: typeof STEPS }) {
  return (
    <div className="hidden md:flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  currentStep > step.id
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Mobile Step Indicator
function MobileStepIndicator({ currentStep, totalSteps, title }: { currentStep: number; totalSteps: number; title: string }) {
  return (
    <div className="md:hidden mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

// Form Field Component
function FormField({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VendorAddPage() {
  const router = useRouter();
  const { hasAccess } = useAuth();
  
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Lookups
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  
  // Document uploads
  const [uploadedDocs, setUploadedDocs] = useState<{ type: string; name: string; file: File }[]>([]);
  
  // Service/Product tags
  const [newService, setNewService] = useState('');
  const [newTag, setNewTag] = useState('');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [btRes, indRes] = await Promise.all([
          api.get('/api/vendors-legal/lookups/business-types'),
          api.get('/api/vendors-legal/lookups/industries'),
        ]);
        if (btRes.data.success) setBusinessTypes(btRes.data.data);
        if (indRes.data.success) setIndustries(indRes.data.data);
      } catch (error) {
        console.error('Error fetching lookups:', error);
      }
    };
    fetchLookups();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let obj: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      
      return newData;
    });
    
    // Clear error for this field
    setErrors(prev => prev.filter(e => e.field !== path));
  };

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleNext = () => {
    const stepErrors = validateStep(currentStep, formData);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors([]);
    setCurrentStep(prev => Math.min(prev + 1, 7));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const response = await api.post('/api/vendors-legal', {
        ...formData,
        is_draft: true,
      });
      if (response.data.success) {
        router.push('/vendors');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Validate all steps
    let allErrors: FormError[] = [];
    for (let step = 1; step <= 6; step++) {
      allErrors = [...allErrors, ...validateStep(step, formData)];
    }
    
    if (allErrors.length > 0) {
      setErrors(allErrors);
      // Go to first step with errors
      const firstErrorStep = Math.min(
        ...allErrors.map(e => {
          if (e.field.startsWith('primary_contact') || e.field.startsWith('registered_address')) return 3;
          if (e.field.startsWith('bank_details')) return 5;
          if (e.field === 'legal_name' || e.field === 'gst_number' || e.field === 'pan_number') return 1;
          return 1;
        })
      );
      setCurrentStep(firstErrorStep);
      return;
    }
    
    setLoading(true);
    try {
      // Create vendor
      const response = await api.post('/api/vendors-legal', {
        ...formData,
        is_draft: false,
      });
      
      if (response.data.success) {
        const vendorId = response.data.data.id;
        
        // Upload documents
        for (const doc of uploadedDocs) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', doc.file);
          formDataUpload.append('document_type', doc.type);
          formDataUpload.append('document_name', doc.name);
          
          await api.post(`/api/vendors-legal/${vendorId}/documents`, formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        
        router.push('/vendors');
      }
    } catch (error: any) {
      console.error('Error submitting vendor:', error);
      if (error.response?.data?.details) {
        setErrors(error.response.data.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    if (newService.trim() && !formData.services_products.includes(newService.trim())) {
      updateFormData('services_products', [...formData.services_products, newService.trim()]);
      setNewService('');
    }
  };

  const handleRemoveService = (service: string) => {
    updateFormData('services_products', formData.services_products.filter(s => s !== service));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      updateFormData('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    updateFormData('tags', formData.tags.filter(t => t !== tag));
  };

  const handleDocumentUpload = (type: string, file: File) => {
    setUploadedDocs(prev => {
      // Replace if same type exists
      const filtered = prev.filter(d => d.type !== type);
      return [...filtered, { type, name: file.name, file }];
    });
  };

  const handleRemoveDocument = (type: string) => {
    setUploadedDocs(prev => prev.filter(d => d.type !== type));
  };

  // ============================================================================
  // RENDER STEPS
  // ============================================================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Legal Identity
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Vendor Legal Name" required error={getError('legal_name')}>
          <input
            type="text"
            value={formData.legal_name}
            onChange={(e) => updateFormData('legal_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., TechSupply Corporation Ltd."
          />
        </FormField>
        
        <FormField label="Trade Name">
          <input
            type="text"
            value={formData.trade_name}
            onChange={(e) => updateFormData('trade_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Trade/Brand name if different"
          />
        </FormField>
        
        <FormField label="Business Type">
          <select
            value={formData.business_type_id || ''}
            onChange={(e) => updateFormData('business_type_id', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select business type</option>
            {businessTypes.map(bt => (
              <option key={bt.id} value={bt.id}>{bt.name}</option>
            ))}
          </select>
        </FormField>
        
        <FormField label="Registration Number">
          <input
            type="text"
            value={formData.registration_number}
            onChange={(e) => updateFormData('registration_number', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Company registration number"
          />
        </FormField>
        
        <FormField label="GST Number" error={getError('gst_number')} hint="15-digit GST Identification Number">
          <input
            type="text"
            value={formData.gst_number}
            onChange={(e) => updateFormData('gst_number', e.target.value.toUpperCase())}
            maxLength={15}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            placeholder="22AAAAA0000A1Z5"
          />
        </FormField>
        
        <FormField label="PAN Number" error={getError('pan_number')} hint="10-digit PAN">
          <input
            type="text"
            value={formData.pan_number}
            onChange={(e) => updateFormData('pan_number', e.target.value.toUpperCase())}
            maxLength={10}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            placeholder="AAAAA0000A"
          />
        </FormField>
        
        <FormField label="CIN Number" hint="Corporate Identification Number">
          <input
            type="text"
            value={formData.cin_number}
            onChange={(e) => updateFormData('cin_number', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            placeholder="U12345MH2020PTC123456"
          />
        </FormField>
        
        <FormField label="TIN Number">
          <input
            type="text"
            value={formData.tin_number}
            onChange={(e) => updateFormData('tin_number', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </FormField>
        
        <FormField label="Incorporation Date">
          <input
            type="date"
            value={formData.incorporation_date}
            onChange={(e) => updateFormData('incorporation_date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </FormField>
        
        <FormField label="State">
          <select
            value={formData.state}
            onChange={(e) => updateFormData('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </FormField>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Business Details
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Industry Category">
          <select
            value={formData.industry_id || ''}
            onChange={(e) => updateFormData('industry_id', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select industry</option>
            {industries.map(ind => (
              <option key={ind.id} value={ind.id}>{ind.name}</option>
            ))}
          </select>
        </FormField>
        
        <FormField label="Company Size">
          <select
            value={formData.company_size}
            onChange={(e) => updateFormData('company_size', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select size</option>
            {COMPANY_SIZES.map(size => (
              <option key={size.value} value={size.value}>{size.label}</option>
            ))}
          </select>
        </FormField>
        
        <FormField label="Annual Turnover (₹)" hint="In lakhs">
          <input
            type="number"
            value={formData.annual_turnover}
            onChange={(e) => updateFormData('annual_turnover', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., 500"
          />
        </FormField>
        
        <FormField label="Website">
          <input
            type="url"
            value={formData.website}
            onChange={(e) => updateFormData('website', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="https://www.example.com"
          />
        </FormField>
        
        <FormField label="Primary Market">
          <select
            value={formData.primary_market}
            onChange={(e) => updateFormData('primary_market', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="Domestic">Domestic</option>
            <option value="International">International</option>
            <option value="Both">Both</option>
          </select>
        </FormField>
        
        <div className="md:col-span-2">
          <FormField label="Services / Products">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add service or product"
              />
              <button
                type="button"
                onClick={handleAddService}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.services_products.map((service, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm"
                >
                  {service}
                  <button
                    type="button"
                    onClick={() => handleRemoveService(service)}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </FormField>
        </div>
      </div>
      
      {/* MSME Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="is_msme"
            checked={formData.is_msme}
            onChange={(e) => updateFormData('is_msme', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_msme" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            This vendor is an MSME (Micro, Small & Medium Enterprise)
          </label>
        </div>
        
        {formData.is_msme && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-7">
            <FormField label="MSME Registration Number">
              <input
                type="text"
                value={formData.msme_number}
                onChange={(e) => updateFormData('msme_number', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="UDYAM-XX-00-0000000"
              />
            </FormField>
            
            <FormField label="MSME Category">
              <select
                value={formData.msme_category}
                onChange={(e) => updateFormData('msme_category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select category</option>
                {MSME_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Contact & Address
      </h3>
      
      {/* Primary Contact */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Primary Contact
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Contact Name" required error={getError('primary_contact.name')}>
            <input
              type="text"
              value={formData.primary_contact.name}
              onChange={(e) => updateFormData('primary_contact.name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </FormField>
          
          <FormField label="Designation">
            <input
              type="text"
              value={formData.primary_contact.designation}
              onChange={(e) => updateFormData('primary_contact.designation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Account Manager"
            />
          </FormField>
          
          <FormField label="Email" required error={getError('primary_contact.email')}>
            <input
              type="email"
              value={formData.primary_contact.email}
              onChange={(e) => updateFormData('primary_contact.email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </FormField>
          
          <FormField label="Phone" required error={getError('primary_contact.phone')}>
            <input
              type="tel"
              value={formData.primary_contact.phone}
              onChange={(e) => updateFormData('primary_contact.phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="+91 9876543210"
            />
          </FormField>
        </div>
      </div>
      
      {/* Registered Address */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Registered Address
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormField label="Address Line 1" required error={getError('registered_address.address_line1')}>
              <input
                type="text"
                value={formData.registered_address.address_line1}
                onChange={(e) => updateFormData('registered_address.address_line1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </FormField>
          </div>
          
          <div className="md:col-span-2">
            <FormField label="Address Line 2">
              <input
                type="text"
                value={formData.registered_address.address_line2}
                onChange={(e) => updateFormData('registered_address.address_line2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </FormField>
          </div>
          
          <FormField label="City" required error={getError('registered_address.city')}>
            <input
              type="text"
              value={formData.registered_address.city}
              onChange={(e) => updateFormData('registered_address.city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </FormField>
          
          <FormField label="State" required error={getError('registered_address.state')}>
            <select
              value={formData.registered_address.state}
              onChange={(e) => updateFormData('registered_address.state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </FormField>
          
          <FormField label="Pincode" required error={getError('registered_address.pincode')}>
            <input
              type="text"
              value={formData.registered_address.pincode}
              onChange={(e) => updateFormData('registered_address.pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Compliance Documents
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Upload required documents. Accepted formats: PDF, JPEG, PNG (Max 5MB each)
      </p>
      
      <div className="space-y-4">
        {DOCUMENT_TYPES.map((docType) => {
          const uploaded = uploadedDocs.find(d => d.type === docType.code);
          
          return (
            <div
              key={docType.code}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {docType.label}
                  </span>
                  {docType.mandatory && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                  {uploaded && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ {uploaded.name}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {uploaded ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(docType.code)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert('File size must be less than 5MB');
                            return;
                          }
                          handleDocumentUpload(docType.code, file);
                        }
                      }}
                    />
                    <span className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload
                    </span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Banking & Payment Details
      </h3>
      
      {/* Bank Details */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Primary Bank Account
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Bank Name" required error={getError('bank_details.bank_name')}>
            <input
              type="text"
              value={formData.bank_details.bank_name}
              onChange={(e) => updateFormData('bank_details.bank_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </FormField>
          
          <FormField label="Branch Name">
            <input
              type="text"
              value={formData.bank_details.branch_name}
              onChange={(e) => updateFormData('bank_details.branch_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </FormField>
          
          <FormField label="Account Holder Name" required error={getError('bank_details.account_holder_name')}>
            <input
              type="text"
              value={formData.bank_details.account_holder_name}
              onChange={(e) => updateFormData('bank_details.account_holder_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </FormField>
          
          <FormField label="Account Number" required error={getError('bank_details.account_number')}>
            <input
              type="text"
              value={formData.bank_details.account_number}
              onChange={(e) => updateFormData('bank_details.account_number', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            />
          </FormField>
          
          <FormField label="Account Type">
            <select
              value={formData.bank_details.account_type}
              onChange={(e) => updateFormData('bank_details.account_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="current">Current Account</option>
              <option value="savings">Savings Account</option>
            </select>
          </FormField>
          
          <FormField label="IFSC Code" required error={getError('bank_details.ifsc_code')} hint="11-character code">
            <input
              type="text"
              value={formData.bank_details.ifsc_code}
              onChange={(e) => updateFormData('bank_details.ifsc_code', e.target.value.toUpperCase())}
              maxLength={11}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="SBIN0001234"
            />
          </FormField>
          
          <FormField label="SWIFT Code" hint="For international payments">
            <input
              type="text"
              value={formData.bank_details.swift_code}
              onChange={(e) => updateFormData('bank_details.swift_code', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            />
          </FormField>
          
          <FormField label="UPI ID">
            <input
              type="text"
              value={formData.bank_details.upi_id}
              onChange={(e) => updateFormData('bank_details.upi_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="vendor@upi"
            />
          </FormField>
        </div>
      </div>
      
      {/* Payment Terms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Payment Terms">
          <select
            value={formData.default_payment_terms}
            onChange={(e) => updateFormData('default_payment_terms', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {PAYMENT_TERMS.map(term => (
              <option key={term.value} value={term.value}>{term.label}</option>
            ))}
          </select>
        </FormField>
        
        <FormField label="Credit Limit (₹)">
          <input
            type="number"
            value={formData.credit_limit}
            onChange={(e) => updateFormData('credit_limit', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </FormField>
        
        <FormField label="Credit Days">
          <input
            type="number"
            value={formData.credit_days}
            onChange={(e) => updateFormData('credit_days', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </FormField>
      </div>
      
      {/* TDS Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="tds_applicable"
            checked={formData.tds_applicable}
            onChange={(e) => updateFormData('tds_applicable', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="tds_applicable" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            TDS Applicable
          </label>
        </div>
        
        {formData.tds_applicable && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
            <FormField label="TDS Section">
              <select
                value={formData.tds_section}
                onChange={(e) => updateFormData('tds_section', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select section</option>
                {TDS_SECTIONS.map(section => (
                  <option key={section.value} value={section.value}>{section.label}</option>
                ))}
              </select>
            </FormField>
            
            <FormField label="TDS Rate (%)">
              <input
                type="number"
                step="0.01"
                value={formData.tds_rate}
                onChange={(e) => updateFormData('tds_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </FormField>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Risk Assessment & Due Diligence
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Risk Level">
          <select
            value={formData.risk_level}
            onChange={(e) => updateFormData('risk_level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical</option>
          </select>
        </FormField>
        
        <FormField label="Internal Rating">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => updateFormData('internal_rating', rating)}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium transition-colors ${
                  formData.internal_rating >= rating
                    ? 'bg-yellow-400 border-yellow-400 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        </FormField>
        
        <div className="md:col-span-2">
          <FormField label="Rating Remarks">
            <textarea
              value={formData.rating_remarks}
              onChange={(e) => updateFormData('rating_remarks', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Add any notes about the vendor's rating..."
            />
          </FormField>
        </div>
      </div>
      
      {/* Notes & Tags */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Tags">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add tag"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </FormField>
          
          <FormField label="Additional Notes">
            <textarea
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Any additional notes..."
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Review & Submit
      </h3>
      
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">
            Please fix the following errors:
          </h4>
          <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
            {errors.map((error, index) => (
              <li key={index}>{error.field}: {error.message}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Legal Identity */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Legal Identity
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Legal Name:</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{formData.legal_name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">GST:</dt>
              <dd className="font-mono text-gray-900 dark:text-white">{formData.gst_number || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">PAN:</dt>
              <dd className="font-mono text-gray-900 dark:text-white">{formData.pan_number || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Business Type:</dt>
              <dd className="text-gray-900 dark:text-white">
                {businessTypes.find(bt => bt.id === formData.business_type_id)?.name || '-'}
              </dd>
            </div>
          </dl>
        </div>
        
        {/* Contact Info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Primary Contact
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name:</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{formData.primary_contact.name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email:</dt>
              <dd className="text-gray-900 dark:text-white">{formData.primary_contact.email || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Phone:</dt>
              <dd className="text-gray-900 dark:text-white">{formData.primary_contact.phone || '-'}</dd>
            </div>
          </dl>
        </div>
        
        {/* Address */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Registered Address
          </h4>
          <p className="text-sm text-gray-900 dark:text-white">
            {formData.registered_address.address_line1}
            {formData.registered_address.address_line2 && `, ${formData.registered_address.address_line2}`}
            <br />
            {formData.registered_address.city}, {formData.registered_address.state} - {formData.registered_address.pincode}
          </p>
        </div>
        
        {/* Banking */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Banking Details
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Bank:</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{formData.bank_details.bank_name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Account:</dt>
              <dd className="font-mono text-gray-900 dark:text-white">
                {formData.bank_details.account_number ? `****${formData.bank_details.account_number.slice(-4)}` : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">IFSC:</dt>
              <dd className="font-mono text-gray-900 dark:text-white">{formData.bank_details.ifsc_code || '-'}</dd>
            </div>
          </dl>
        </div>
        
        {/* Documents */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Documents ({uploadedDocs.length})
          </h4>
          <ul className="space-y-1 text-sm">
            {uploadedDocs.map((doc, index) => (
              <li key={index} className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-3 h-3" />
                {DOCUMENT_TYPES.find(dt => dt.code === doc.type)?.label}
              </li>
            ))}
            {DOCUMENT_TYPES.filter(dt => dt.mandatory && !uploadedDocs.find(d => d.type === dt.code)).map((dt, index) => (
              <li key={index} className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-3 h-3" />
                {dt.label} (missing)
              </li>
            ))}
          </ul>
        </div>
        
        {/* Risk */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Risk Assessment
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Risk Level:</dt>
              <dd className={`font-medium capitalize ${
                formData.risk_level === 'low' ? 'text-green-600' :
                formData.risk_level === 'medium' ? 'text-yellow-600' :
                formData.risk_level === 'high' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {formData.risk_level}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Internal Rating:</dt>
              <dd className="text-gray-900 dark:text-white">{formData.internal_rating} / 5</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  const currentStepConfig = STEPS.find(s => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/vendors')}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Add New Vendor
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Complete all steps to register a new vendor
            </p>
          </div>
        </div>

        {/* Step Indicators */}
        <StepIndicator currentStep={currentStep} steps={STEPS} />
        <MobileStepIndicator 
          currentStep={currentStep} 
          totalSteps={STEPS.length} 
          title={currentStepConfig?.title || ''} 
        />

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          {currentStep === 7 && renderStep7()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>
            
            {currentStep < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit for Approval
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
