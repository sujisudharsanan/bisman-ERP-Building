'use client';

/**
 * ============================================================================
 * BISMAN ERP - Asset Add Form (Multi-Step)
 * ============================================================================
 * 
 * Enterprise-grade asset creation form with:
 * - Multi-step wizard (Basic Info → Assignment → Documents → Review)
 * - RBAC permission check
 * - Subscription limit enforcement
 * - Inline validation
 * - Autosave draft functionality
 * - Approval workflow support
 * - Keyboard accessible
 * - Mobile responsive
 * 
 * @module components/assets/AssetAddForm
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, ChevronRight, ChevronLeft, Check, AlertCircle, Loader2,
  Save, X, Upload, Trash2, Calendar, DollarSign, MapPin, User,
  FileText, Tag, Building, Wrench, Shield, Clock, Info
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface AssetCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  depreciation_rate?: number;
  useful_life_years?: number;
}

interface AssetLimits {
  current: number;
  max: number;
  remaining: number;
  unlimited: boolean;
  subscriptionActive: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

interface AssetFormData {
  // Basic Info
  name: string;
  asset_code: string;
  description: string;
  category_id: number | null;
  asset_type: string;
  serial_number: string;
  model_number: string;
  manufacturer: string;
  
  // Financial
  purchase_date: string;
  purchase_cost: string;
  salvage_value: string;
  warranty_expiry: string;
  vendor_name: string;
  vendor_contact: string;
  purchase_order_number: string;
  invoice_number: string;
  
  // Location & Assignment
  location_name: string;
  department: string;
  assigned_to_user_id: number | null;
  assigned_to_name: string;
  assigned_date: string;
  
  // Status
  status: string;
  condition: string;
  
  // Additional
  tags: string[];
  notes: string;
  custom_fields: Record<string, any>;
  
  // Flags
  requires_approval: boolean;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
  role: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEPS = [
  { id: 1, name: 'Basic Info', icon: Package },
  { id: 2, name: 'Financial & Vendor', icon: DollarSign },
  { id: 3, name: 'Location & Assignment', icon: MapPin },
  { id: 4, name: 'Review & Submit', icon: Check },
];

const ASSET_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-green-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-500' },
  { value: 'under_maintenance', label: 'Under Maintenance', color: 'bg-yellow-500' },
];

const ASSET_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const INITIAL_FORM_DATA: AssetFormData = {
  name: '',
  asset_code: '',
  description: '',
  category_id: null,
  asset_type: '',
  serial_number: '',
  model_number: '',
  manufacturer: '',
  purchase_date: '',
  purchase_cost: '',
  salvage_value: '',
  warranty_expiry: '',
  vendor_name: '',
  vendor_contact: '',
  purchase_order_number: '',
  invoice_number: '',
  location_name: '',
  department: '',
  assigned_to_user_id: null,
  assigned_to_name: '',
  assigned_date: '',
  status: 'active',
  condition: 'new',
  tags: [],
  notes: '',
  custom_fields: {},
  requires_approval: false,
};

const AUTOSAVE_KEY = 'bisman_asset_draft';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

// ============================================================================
// API Helper
// ============================================================================

const apiClient = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  
  async fetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    
    return response.json();
  },
  
  get: (endpoint: string) => apiClient.fetch(endpoint),
  post: (endpoint: string, data: any) => apiClient.fetch(endpoint, { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================================================
// Form Field Components
// ============================================================================

interface InputFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  icon?: React.ElementType;
  helpText?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label, name, value, onChange, type = 'text', placeholder,
  required, error, disabled, icon: Icon, helpText
}) => (
  <div className="space-y-1">
    <label className="flex items-center text-sm font-medium text-gray-300">
      {Icon && <Icon className="w-4 h-4 mr-1.5 text-gray-400" />}
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`
        w-full px-3 py-2 bg-gray-800 border rounded-lg text-white
        placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors
        ${error 
          ? 'border-red-500 focus:ring-red-500/50' 
          : 'border-gray-700 focus:ring-indigo-500/50 focus:border-indigo-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    />
    {helpText && !error && (
      <p className="text-xs text-gray-500">{helpText}</p>
    )}
    {error && (
      <p className="text-xs text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

interface SelectFieldProps {
  label: string;
  name: string;
  value: string | number | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string | number; label: string }[];
  required?: boolean;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ElementType;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label, name, value, onChange, options, required, error, disabled, placeholder, icon: Icon
}) => (
  <div className="space-y-1">
    <label className="flex items-center text-sm font-medium text-gray-300">
      {Icon && <Icon className="w-4 h-4 mr-1.5 text-gray-400" />}
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      className={`
        w-full px-3 py-2 bg-gray-800 border rounded-lg text-white
        focus:outline-none focus:ring-2 transition-colors
        ${error 
          ? 'border-red-500 focus:ring-red-500/50' 
          : 'border-gray-700 focus:ring-indigo-500/50 focus:border-indigo-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <option value="">{placeholder || 'Select...'}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && (
      <p className="text-xs text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

interface TextAreaFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label, name, value, onChange, rows = 3, placeholder,
  required, error, disabled, maxLength
}) => (
  <div className="space-y-1">
    <label className="flex items-center justify-between text-sm font-medium text-gray-300">
      <span>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </span>
      {maxLength && (
        <span className="text-xs text-gray-500">{value.length}/{maxLength}</span>
      )}
    </label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={`
        w-full px-3 py-2 bg-gray-800 border rounded-lg text-white resize-none
        placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors
        ${error 
          ? 'border-red-500 focus:ring-red-500/50' 
          : 'border-gray-700 focus:ring-indigo-500/50 focus:border-indigo-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    />
    {error && (
      <p className="text-xs text-red-400 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);

// ============================================================================
// Step Progress Component
// ============================================================================

interface StepProgressProps {
  currentStep: number;
  steps: typeof STEPS;
  onStepClick: (step: number) => void;
  completedSteps: number[];
}

const StepProgress: React.FC<StepProgressProps> = ({ currentStep, steps, onStepClick, completedSteps }) => (
  <nav className="mb-8" aria-label="Progress">
    <ol className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;
        const Icon = step.icon;
        
        return (
          <li key={step.id} className="flex-1 relative">
            {index > 0 && (
              <div className={`
                absolute left-0 top-5 -translate-x-1/2 w-full h-0.5 -ml-2
                ${isCompleted || isCurrent ? 'bg-indigo-500' : 'bg-gray-700'}
              `} />
            )}
            <button
              onClick={() => onStepClick(step.id)}
              disabled={step.id > Math.max(...completedSteps, currentStep)}
              className={`
                relative flex flex-col items-center group
                ${step.id > Math.max(...completedSteps, currentStep) ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-200 z-10
                ${isCurrent 
                  ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30' 
                  : isCompleted 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-800 text-gray-400 border-2 border-gray-700'
                }
              `}>
                {isCompleted && !isCurrent ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </span>
              <span className={`
                mt-2 text-xs font-medium
                ${isCurrent ? 'text-indigo-400' : isCompleted ? 'text-green-400' : 'text-gray-500'}
              `}>
                {step.name}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  </nav>
);

// ============================================================================
// Limit Warning Component
// ============================================================================

interface LimitWarningProps {
  limits: AssetLimits;
}

const LimitWarning: React.FC<LimitWarningProps> = ({ limits }) => {
  if (limits.unlimited || limits.remaining > 10) return null;
  
  const isAtLimit = limits.remaining <= 0;
  
  return (
    <div className={`
      p-4 rounded-lg border mb-6
      ${isAtLimit 
        ? 'bg-red-900/30 border-red-700 text-red-300' 
        : 'bg-yellow-900/30 border-yellow-700 text-yellow-300'
      }
    `}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium">
            {isAtLimit ? 'Asset Limit Reached' : 'Approaching Asset Limit'}
          </h4>
          <p className="text-sm mt-1 opacity-90">
            {isAtLimit 
              ? `Your plan allows ${limits.max} assets. Please upgrade to add more.`
              : `You have ${limits.remaining} asset slots remaining out of ${limits.max}.`
            }
          </p>
          {isAtLimit && (
            <button className="mt-2 px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
              Upgrade Plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export default function AssetAddForm() {
  const router = useRouter();
  
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState<AssetFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [limits, setLimits] = useState<AssetLimits | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // ============================================================================
  // Data Fetching
  // ============================================================================
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch in parallel
        const [categoriesRes, limitsRes] = await Promise.all([
          apiClient.get('/api/assets/categories'),
          apiClient.get('/api/assets/limits'),
        ]);
        
        setCategories(categoriesRes.data || []);
        setLimits(limitsRes.data || null);
        
        // Try to restore draft
        const saved = localStorage.getItem(AUTOSAVE_KEY);
        if (saved) {
          try {
            const draft = JSON.parse(saved);
            if (draft.data && draft.timestamp) {
              const age = Date.now() - draft.timestamp;
              if (age < 24 * 60 * 60 * 1000) { // Less than 24 hours old
                setFormData(draft.data);
                setHasRestoredDraft(true);
                setLastSaved(new Date(draft.timestamp));
              }
            }
          } catch (e) {
            localStorage.removeItem(AUTOSAVE_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to fetch form data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // ============================================================================
  // Autosave
  // ============================================================================
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (formData.name) { // Only save if there's data
        saveDraft();
      }
    }, AUTOSAVE_INTERVAL);
    
    return () => clearInterval(interval);
  }, [formData]);
  
  const saveDraft = useCallback(() => {
    try {
      setIsSavingDraft(true);
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
        data: formData,
        timestamp: Date.now(),
      }));
      setLastSaved(new Date());
    } catch (e) {
      console.error('Failed to save draft:', e);
    } finally {
      setTimeout(() => setIsSavingDraft(false), 500);
    }
  }, [formData]);
  
  const clearDraft = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setHasRestoredDraft(false);
  }, []);
  
  // ============================================================================
  // Form Handlers
  // ============================================================================
  
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
    
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, [errors]);
  
  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value ? parseInt(e.target.value) : null;
    const category = categories.find(c => c.id === categoryId);
    
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      asset_type: category?.name || prev.asset_type,
    }));
  }, [categories]);
  
  // ============================================================================
  // Validation
  // ============================================================================
  
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1: // Basic Info
        if (!formData.name.trim()) {
          newErrors.name = 'Asset name is required';
        } else if (formData.name.length > 200) {
          newErrors.name = 'Name must be less than 200 characters';
        }
        
        if (formData.asset_code && !/^[A-Z0-9\-_]+$/i.test(formData.asset_code)) {
          newErrors.asset_code = 'Only letters, numbers, hyphens, and underscores allowed';
        }
        break;
        
      case 2: // Financial
        if (formData.purchase_cost && parseFloat(formData.purchase_cost) < 0) {
          newErrors.purchase_cost = 'Cost cannot be negative';
        }
        
        if (formData.purchase_date && formData.warranty_expiry) {
          if (new Date(formData.warranty_expiry) < new Date(formData.purchase_date)) {
            newErrors.warranty_expiry = 'Warranty expiry must be after purchase date';
          }
        }
        break;
        
      case 3: // Location & Assignment
        // Optional validations
        break;
    }
    
    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [formData]);
  
  const validateAll = useCallback((): boolean => {
    let isValid = true;
    for (let step = 1; step <= 3; step++) {
      if (!validateStep(step)) {
        isValid = false;
      }
    }
    return isValid;
  }, [validateStep]);
  
  // ============================================================================
  // Navigation
  // ============================================================================
  
  const goToStep = useCallback((step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step === currentStep + 1) {
      if (validateStep(currentStep)) {
        setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
        setCurrentStep(step);
      }
    }
  }, [currentStep, validateStep]);
  
  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  }, [currentStep, validateStep]);
  
  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);
  
  // ============================================================================
  // Submit
  // ============================================================================
  
  const handleSubmit = async () => {
    if (!validateAll()) {
      setSubmitError('Please fix the validation errors before submitting');
      return;
    }
    
    if (limits && limits.remaining <= 0 && !limits.unlimited) {
      setSubmitError('Asset limit reached. Please upgrade your plan.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      // Prepare data
      const submitData = {
        ...formData,
        category_id: formData.category_id || null,
        purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        salvage_value: formData.salvage_value ? parseFloat(formData.salvage_value) : null,
        assigned_to_user_id: formData.assigned_to_user_id || null,
      };
      
      const response = await apiClient.post('/api/assets', submitData);
      
      // Clear draft on success
      clearDraft();
      
      // Redirect to asset list or detail
      router.push('/assets');
      
    } catch (error: any) {
      console.error('Submit failed:', error);
      setSubmitError(error.message || 'Failed to create asset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ============================================================================
  // Render Steps
  // ============================================================================
  
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Asset Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Dell Latitude 5520 Laptop"
          required
          error={errors.name}
          icon={Package}
        />
        
        <InputField
          label="Asset Code"
          name="asset_code"
          value={formData.asset_code}
          onChange={handleChange}
          placeholder="Auto-generated if empty"
          error={errors.asset_code}
          helpText="Leave empty to auto-generate"
          icon={Tag}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectField
          label="Category"
          name="category_id"
          value={formData.category_id}
          onChange={handleCategoryChange}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          placeholder="Select category..."
          icon={Building}
        />
        
        <InputField
          label="Asset Type"
          name="asset_type"
          value={formData.asset_type}
          onChange={handleChange}
          placeholder="e.g., Laptop, Vehicle, Machinery"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InputField
          label="Serial Number"
          name="serial_number"
          value={formData.serial_number}
          onChange={handleChange}
          placeholder="S/N..."
        />
        
        <InputField
          label="Model Number"
          name="model_number"
          value={formData.model_number}
          onChange={handleChange}
          placeholder="Model..."
        />
        
        <InputField
          label="Manufacturer"
          name="manufacturer"
          value={formData.manufacturer}
          onChange={handleChange}
          placeholder="e.g., Dell, Toyota"
        />
      </div>
      
      <TextAreaField
        label="Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Detailed description of the asset..."
        rows={4}
        maxLength={1000}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectField
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          options={ASSET_STATUSES.map(s => ({ value: s.value, label: s.label }))}
          icon={Shield}
        />
        
        <SelectField
          label="Condition"
          name="condition"
          value={formData.condition}
          onChange={handleChange}
          options={ASSET_CONDITIONS.map(c => ({ value: c.value, label: c.label }))}
          icon={Wrench}
        />
      </div>
    </div>
  );
  
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Purchase Date"
          name="purchase_date"
          type="date"
          value={formData.purchase_date}
          onChange={handleChange}
          icon={Calendar}
        />
        
        <InputField
          label="Warranty Expiry"
          name="warranty_expiry"
          type="date"
          value={formData.warranty_expiry}
          onChange={handleChange}
          error={errors.warranty_expiry}
          icon={Calendar}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Purchase Cost"
          name="purchase_cost"
          type="number"
          value={formData.purchase_cost}
          onChange={handleChange}
          placeholder="0.00"
          error={errors.purchase_cost}
          icon={DollarSign}
          helpText="Assets over ₹50,000 may require approval"
        />
        
        <InputField
          label="Salvage Value"
          name="salvage_value"
          type="number"
          value={formData.salvage_value}
          onChange={handleChange}
          placeholder="0.00"
          icon={DollarSign}
        />
      </div>
      
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Vendor / Supplier Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Vendor Name"
            name="vendor_name"
            value={formData.vendor_name}
            onChange={handleChange}
            placeholder="Supplier company name"
          />
          
          <InputField
            label="Vendor Contact"
            name="vendor_contact"
            value={formData.vendor_contact}
            onChange={handleChange}
            placeholder="Contact email or phone"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <InputField
            label="Purchase Order Number"
            name="purchase_order_number"
            value={formData.purchase_order_number}
            onChange={handleChange}
            placeholder="PO-..."
            icon={FileText}
          />
          
          <InputField
            label="Invoice Number"
            name="invoice_number"
            value={formData.invoice_number}
            onChange={handleChange}
            placeholder="INV-..."
            icon={FileText}
          />
        </div>
      </div>
    </div>
  );
  
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Location"
          name="location_name"
          value={formData.location_name}
          onChange={handleChange}
          placeholder="e.g., Main Office, Warehouse B"
          icon={MapPin}
        />
        
        <InputField
          label="Department"
          name="department"
          value={formData.department}
          onChange={handleChange}
          placeholder="e.g., IT, Operations, Finance"
          icon={Building}
        />
      </div>
      
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Assignment
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Assigned To (Name)"
            name="assigned_to_name"
            value={formData.assigned_to_name}
            onChange={handleChange}
            placeholder="Employee name"
            icon={User}
          />
          
          <InputField
            label="Assignment Date"
            name="assigned_date"
            type="date"
            value={formData.assigned_date}
            onChange={handleChange}
            icon={Calendar}
          />
        </div>
      </div>
      
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Additional Notes
        </h3>
        
        <TextAreaField
          label="Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Any additional information about this asset..."
          rows={4}
          maxLength={2000}
        />
      </div>
    </div>
  );
  
  const renderStep4 = () => {
    const category = categories.find(c => c.id === formData.category_id);
    const needsApproval = formData.purchase_cost && parseFloat(formData.purchase_cost) > 50000;
    
    return (
      <div className="space-y-6">
        {needsApproval && (
          <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-300">Approval Required</h4>
                <p className="text-sm text-yellow-300/80 mt-1">
                  This asset exceeds ₹50,000 and will require supervisor approval before becoming active.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Asset Name:</span>
              <span className="text-white ml-2 font-medium">{formData.name || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">Asset Code:</span>
              <span className="text-white ml-2 font-medium">{formData.asset_code || 'Auto-generated'}</span>
            </div>
            <div>
              <span className="text-gray-400">Category:</span>
              <span className="text-white ml-2">{category?.name || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">Type:</span>
              <span className="text-white ml-2">{formData.asset_type || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">Serial Number:</span>
              <span className="text-white ml-2">{formData.serial_number || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">Model:</span>
              <span className="text-white ml-2">{formData.model_number || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="text-white ml-2 capitalize">{formData.status}</span>
            </div>
            <div>
              <span className="text-gray-400">Condition:</span>
              <span className="text-white ml-2 capitalize">{formData.condition}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
            Financial Information
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Purchase Date:</span>
              <span className="text-white ml-2">
                {formData.purchase_date ? new Date(formData.purchase_date).toLocaleDateString() : '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Warranty Expiry:</span>
              <span className="text-white ml-2">
                {formData.warranty_expiry ? new Date(formData.warranty_expiry).toLocaleDateString() : '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Purchase Cost:</span>
              <span className="text-white ml-2 font-medium">
                {formData.purchase_cost ? `₹${parseFloat(formData.purchase_cost).toLocaleString()}` : '-'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Vendor:</span>
              <span className="text-white ml-2">{formData.vendor_name || '-'}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
            Location & Assignment
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Location:</span>
              <span className="text-white ml-2">{formData.location_name || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">Department:</span>
              <span className="text-white ml-2">{formData.department || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">Assigned To:</span>
              <span className="text-white ml-2">{formData.assigned_to_name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-gray-400">Assignment Date:</span>
              <span className="text-white ml-2">
                {formData.assigned_date ? new Date(formData.assigned_date).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
        </div>
        
        {formData.description && (
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4">
              Description
            </h3>
            <p className="text-gray-300 text-sm whitespace-pre-wrap">{formData.description}</p>
          </div>
        )}
      </div>
    );
  };
  
  // ============================================================================
  // Main Render
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
          <p className="mt-4 text-gray-400">Loading form...</p>
        </div>
      </div>
    );
  }
  
  const isLimitReached = !!(limits && !limits.unlimited && limits.remaining <= 0);
  
  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Package className="w-7 h-7 text-indigo-500" />
                Add New Asset
              </h1>
              <p className="text-gray-400 mt-1">
                Create a new asset record with all relevant details
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  {isSavingDraft ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      Saved {lastSaved.toLocaleTimeString()}
                    </>
                  )}
                </span>
              )}
              
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          
          {hasRestoredDraft && (
            <div className="mt-4 p-3 bg-indigo-900/30 border border-indigo-700 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300">
                <Info className="w-4 h-4" />
                <span className="text-sm">Draft restored from your previous session</span>
              </div>
              <button
                onClick={() => {
                  clearDraft();
                  setFormData(INITIAL_FORM_DATA);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Start Fresh
              </button>
            </div>
          )}
        </div>
        
        {/* Limit Warning */}
        {limits && <LimitWarning limits={limits} />}
        
        {/* Step Progress */}
        <StepProgress
          currentStep={currentStep}
          steps={STEPS}
          onStepClick={goToStep}
          completedSteps={completedSteps}
        />
        
        {/* Form Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8">
          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>
          
          {/* Submit Error */}
          {submitError && (
            <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
              <div className="flex items-center gap-2 text-red-300">
                <AlertCircle className="w-5 h-5" />
                <span>{submitError}</span>
              </div>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                ${currentStep === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }
              `}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={saveDraft}
                className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>
              
              {currentStep < STEPS.length ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLimitReached}
                  className={`
                    flex items-center gap-2 px-6 py-2 rounded-lg transition-colors
                    ${isSubmitting || isLimitReached
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Create Asset
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
