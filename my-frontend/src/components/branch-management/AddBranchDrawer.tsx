'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Building2,
  MapPin,
  FileText,
  Upload,
  Calendar,
  IndianRupee,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Edit,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface BranchFormData {
  id?: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  district: string;
  pincode: string;
  areaSquareFeet: number | '';
  buildingType: 'owned' | 'rented' | 'leased';
  
  // Agreement details (required for rented/leased)
  agreementType?: 'rent' | 'lease';
  agreementStartDate?: string;
  agreementEndDate?: string;
  monthlyRent?: number | '';
  rentEscalationPercent?: number | '';
  securityDeposit?: number | '';
  noticePeriodDays?: number | '';
  autoRenew?: boolean;
  agreementReminderDays?: number | '';
  
  // Owner/Vendor PAN details (required for rented/leased)
  panHolderName?: string;
  panNumber?: string;
  
  // GST details (optional - only when hasGst is checked)
  hasGst?: boolean;
  gstNumber?: string;
  taxPercent?: number | '';
  taxAmount?: number;
  totalRentWithTax?: number;
  
  isActive: boolean;
}

interface AddBranchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (branch: { id: string; name: string; code: string }) => void;
  editBranch?: BranchFormData | null;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateForm(data: BranchFormData): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (!data.name.trim()) errors.name = 'Branch name is required';
  if (!data.code.trim()) errors.code = 'Branch code is required';
  if (!data.address.trim()) errors.address = 'Address is required';
  if (!data.city.trim()) errors.city = 'City is required';
  if (!data.state.trim()) errors.state = 'State is required';
  if (!data.district.trim()) errors.district = 'District is required';
  if (!data.pincode.trim()) errors.pincode = 'Pincode is required';
  if (!data.buildingType) errors.buildingType = 'Building type is required';
  
    // Validation for rented/leased
  if (data.buildingType === 'rented' || data.buildingType === 'leased') {
    if (!data.agreementStartDate) errors.agreementStartDate = 'Agreement start date is required';
    if (!data.agreementEndDate) errors.agreementEndDate = 'Agreement end date is required';
    if (!data.monthlyRent) errors.monthlyRent = 'Monthly rent is required';
    if (!data.panHolderName?.trim()) errors.panHolderName = 'PAN holder name is required';
    if (!data.panNumber?.trim()) errors.panNumber = 'PAN number is required';
    
    // Date validation
    if (data.agreementStartDate && data.agreementEndDate) {
      if (new Date(data.agreementEndDate) <= new Date(data.agreementStartDate)) {
        errors.agreementEndDate = 'End date must be after start date';
      }
    }
    
    // PAN format validation
    if (data.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber.toUpperCase())) {
      errors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
    }
    
    // GST validation (only if hasGst is checked)
    if (data.hasGst) {
      if (!data.gstNumber?.trim()) {
        errors.gstNumber = 'GST number is required when GST is enabled';
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstNumber.toUpperCase())) {
        errors.gstNumber = 'Invalid GST format (e.g., 22AAAAA0000A1Z5)';
      }
      if (!data.taxPercent || data.taxPercent <= 0) {
        errors.taxPercent = 'Tax percentage is required';
      }
    }
  }  return errors;
}

// ============================================================================
// COMPONENT
// ============================================================================

const defaultFormData: BranchFormData = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  district: '',
  pincode: '',
  areaSquareFeet: '',
  buildingType: 'owned',
  agreementType: 'rent',
  agreementStartDate: '',
  agreementEndDate: '',
  monthlyRent: '',
  rentEscalationPercent: '',
  securityDeposit: '',
  noticePeriodDays: 30,
  autoRenew: false,
  agreementReminderDays: 30,
  panHolderName: '',
  panNumber: '',
  hasGst: false,
  gstNumber: '',
  taxPercent: 18,
  taxAmount: 0,
  totalRentWithTax: 0,
  isActive: true,
};

export default function AddBranchDrawer({ isOpen, onClose, onSuccess, editBranch }: AddBranchDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [panDocFile, setPanDocFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<BranchFormData>(defaultFormData);

  const isEditMode = !!editBranch;

  // Populate form when editBranch changes
  useEffect(() => {
    if (editBranch) {
      setFormData({
        ...defaultFormData,
        ...editBranch,
      });
    } else {
      setFormData(defaultFormData);
    }
    setErrors({});
    setSubmitError(null);
  }, [editBranch, isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      
      // Recalculate tax when relevant fields change
      if (name === 'monthlyRent' || name === 'taxPercent' || name === 'hasGst') {
        const rent = name === 'monthlyRent' ? Number(value) || 0 : Number(prev.monthlyRent) || 0;
        const taxPct = name === 'taxPercent' ? Number(value) || 0 : Number(prev.taxPercent) || 0;
        const isGstEnabled = name === 'hasGst' ? checked : prev.hasGst;
        
        if (isGstEnabled && rent > 0 && taxPct > 0) {
          newData.taxAmount = Math.round((rent * taxPct) / 100 * 100) / 100;
          newData.totalRentWithTax = Math.round((rent + newData.taxAmount) * 100) / 100;
        } else {
          newData.taxAmount = 0;
          newData.totalRentWithTax = rent;
        }
      }
      
      return newData;
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        panNumber: formData.panNumber?.toUpperCase(),
        areaSquareFeet: formData.areaSquareFeet || null,
        monthlyRent: formData.monthlyRent || null,
        rentEscalationPercent: formData.rentEscalationPercent || null,
        securityDeposit: formData.securityDeposit || null,
      };
      
      const url = isEditMode ? `/api/branches/${formData.id}` : '/api/branches';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} branch`);
      }
      
      const result = await response.json();
      
      // Call success callback with branch data
      onSuccess({
        id: result.branch?.id || result.id || formData.id || '',
        name: formData.name,
        code: formData.code,
      });
      
      // Reset form and close drawer
      resetForm();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setFormData(defaultFormData);
    setErrors({});
    setSubmitError(null);
    setAgreementFile(null);
    setPanDocFile(null);
  };

  const needsAgreement = formData.buildingType === 'rented' || formData.buildingType === 'leased';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isEditMode ? 'bg-amber-100' : 'bg-blue-100'}`}>
              {isEditMode ? (
                <Edit className="w-5 h-5 text-amber-600" />
              ) : (
                <Building2 className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditMode ? 'Edit Branch' : 'Add New Branch'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditMode ? 'Update branch details' : 'Create a new branch location'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {submitError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>{submitError}</span>
            </div>
          )}
          
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Mumbai Central"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.code ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., MUM-C01"
                />
                {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
              </div>
            </div>
          </div>
          
          {/* Address */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Address *
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Street address, building, floor..."
                />
                {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.city ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.district ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.district && <p className="mt-1 text-xs text-red-600">{errors.district}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.state ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.pincode ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.pincode && <p className="mt-1 text-xs text-red-600">{errors.pincode}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area (Sq Ft)</label>
                  <input
                    type="number"
                    name="areaSquareFeet"
                    value={formData.areaSquareFeet}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building Type *</label>
                  <select
                    name="buildingType"
                    value={formData.buildingType}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.buildingType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="owned">Owned</option>
                    <option value="rented">Rented</option>
                    <option value="leased">Leased</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Agreement Details (for rented/leased) */}
          {needsAgreement && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="text-sm font-semibold text-amber-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Agreement Details (Required for {formData.buildingType})
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agreement Type
                    </label>
                    <select
                      name="agreementType"
                      value={formData.agreementType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="rent">Rent Agreement</option>
                      <option value="lease">Lease Agreement</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notice Period (Days)
                    </label>
                    <input
                      type="number"
                      name="noticePeriodDays"
                      value={formData.noticePeriodDays}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      name="agreementStartDate"
                      value={formData.agreementStartDate}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.agreementStartDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.agreementStartDate && (
                      <p className="mt-1 text-xs text-red-600">{errors.agreementStartDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      name="agreementEndDate"
                      value={formData.agreementEndDate}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.agreementEndDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.agreementEndDate && (
                      <p className="mt-1 text-xs text-red-600">{errors.agreementEndDate}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Rent (₹) *
                    </label>
                    <input
                      type="number"
                      name="monthlyRent"
                      value={formData.monthlyRent}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.monthlyRent ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                    {errors.monthlyRent && (
                      <p className="mt-1 text-xs text-red-600">{errors.monthlyRent}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Security Deposit (₹)
                    </label>
                    <input
                      type="number"
                      name="securityDeposit"
                      value={formData.securityDeposit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rent Escalation (%)
                    </label>
                    <input
                      type="number"
                      name="rentEscalationPercent"
                      value={formData.rentEscalationPercent}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 5"
                      step="0.1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="autoRenew"
                      checked={formData.autoRenew}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-700">Auto-renew agreement</label>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reminder Days
                    </label>
                    <input
                      type="number"
                      name="agreementReminderDays"
                      value={formData.agreementReminderDays}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                    />
                  </div>
                </div>
                
                {/* Agreement Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agreement Document
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setAgreementFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="agreement-file"
                    />
                    <label
                      htmlFor="agreement-file"
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4" />
                      {agreementFile ? agreementFile.name : 'Upload Agreement'}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* PAN Details (for rented/leased) */}
          {needsAgreement && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Owner / Vendor Details (Required)
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PAN Holder Name *
                    </label>
                    <input
                      type="text"
                      name="panHolderName"
                      value={formData.panHolderName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.panHolderName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.panHolderName && (
                      <p className="mt-1 text-xs text-red-600">{errors.panHolderName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PAN Number *
                    </label>
                    <input
                      type="text"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase ${
                        errors.panNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                    {errors.panNumber && (
                      <p className="mt-1 text-xs text-red-600">{errors.panNumber}</p>
                    )}
                  </div>
                </div>
                
                {/* GST Checkbox */}
                <div className="p-3 bg-white rounded-lg border border-blue-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="hasGst"
                      checked={formData.hasGst}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Owner/Vendor is GST registered
                    </span>
                  </label>
                  <p className="ml-6 text-xs text-gray-500 mt-1">
                    Enable this to add GST details and calculate tax on rent
                  </p>
                </div>
                
                {/* GST Details (shown only when hasGst is checked) */}
                {formData.hasGst && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
                    <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4" />
                      GST & Tax Calculation
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GST Number *
                        </label>
                        <input
                          type="text"
                          name="gstNumber"
                          value={formData.gstNumber}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 uppercase ${
                            errors.gstNumber ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="22AAAAA0000A1Z5"
                          maxLength={15}
                        />
                        {errors.gstNumber && (
                          <p className="mt-1 text-xs text-red-600">{errors.gstNumber}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tax Rate (%) *
                        </label>
                        <input
                          type="number"
                          name="taxPercent"
                          value={formData.taxPercent}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.taxPercent ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="18"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                        {errors.taxPercent && (
                          <p className="mt-1 text-xs text-red-600">{errors.taxPercent}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Tax Calculation Display */}
                    {formData.monthlyRent && Number(formData.monthlyRent) > 0 && (
                      <div className="p-3 bg-white rounded-lg border border-green-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Base Rent</p>
                            <p className="text-sm font-semibold text-gray-900">
                              ₹{Number(formData.monthlyRent).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Tax ({formData.taxPercent || 0}%)
                            </p>
                            <p className="text-sm font-semibold text-orange-600">
                              + ₹{(formData.taxAmount || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                            <p className="text-sm font-bold text-green-700">
                              ₹{(formData.totalRentWithTax || 0).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* PAN Document Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Document
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setPanDocFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="pan-file"
                    />
                    <label
                      htmlFor="pan-file"
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4" />
                      {panDocFile ? panDocFile.name : 'Upload PAN Document'}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Status */}
          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Branch is Active</span>
            </label>
          </div>
        </form>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditMode ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {isEditMode ? 'Save Changes' : 'Create Branch'}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
