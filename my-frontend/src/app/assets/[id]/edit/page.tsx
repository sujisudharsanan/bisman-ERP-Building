'use client';

/**
 * Asset Edit Page
 * Edit an existing asset
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package, ArrowLeft, Save, Loader2, AlertCircle, CheckCircle
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  description?: string;
  category_id?: number;
  asset_type?: string;
  serial_number?: string;
  model_number?: string;
  manufacturer?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  salvage_value?: number;
  warranty_expiry?: string;
  vendor_name?: string;
  vendor_contact?: string;
  purchase_order_number?: string;
  invoice_number?: string;
  location_id?: string;
  location_name?: string;
  department?: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  assigned_date?: string;
  status: string;
  condition?: string;
  notes?: string;
}

interface Category {
  id: number;
  code: string;
  name: string;
}

interface VendorOption {
  id: string;
  name: string;
  contact_name?: string;
}

interface LocationOption {
  id: string;
  name: string;
  city?: string;
}

interface UserOption {
  id: string;
  legacy_id: number;
  name: string;
  email: string;
}

// ============================================================================
// API Helper
// ============================================================================

const apiClient = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  
  async fetch(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }
    return response.json();
  },
  
  get: (endpoint: string) => apiClient.fetch(endpoint),
  put: (endpoint: string, data: unknown) => apiClient.fetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
};

// ============================================================================
// Form Field Components
// ============================================================================

interface InputFieldProps {
  label: string;
  name: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

function InputField({ label, name, value, onChange, type = 'text', required, placeholder, disabled }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string | number; label: string }[];
  required?: boolean;
  placeholder?: string;
}

function SelectField({ label, name, value, onChange, options, required, placeholder }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">{placeholder || 'Select...'}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, required, placeholder }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <textarea
        name={name}
        value={value || ''}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AssetEditPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = (params?.id as string) || '';
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<Partial<Asset>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Fetch asset
  const fetchAsset = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/api/assets/${assetId}`);
      setAsset(response.data);
      setFormData(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch asset:', err);
      setError(err instanceof Error ? err.message : 'Failed to load asset');
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);
  
  // Fetch dropdown data
  const fetchDropdownData = useCallback(async () => {
    try {
      const [categoriesRes, vendorsRes, locationsRes, usersRes] = await Promise.all([
        apiClient.get('/api/assets/categories').catch(() => ({ data: [] })),
        apiClient.get('/api/assets/vendors').catch(() => ({ data: [] })),
        apiClient.get('/api/assets/locations').catch(() => ({ data: [] })),
        apiClient.get('/api/assets/users').catch(() => ({ data: [] })),
      ]);
      setCategories(categoriesRes.data || []);
      setVendors(vendorsRes.data || []);
      setLocations(locationsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch dropdown data:', err);
    }
  }, []);
  
  useEffect(() => {
    if (assetId) {
      fetchAsset();
      fetchDropdownData();
    }
  }, [assetId, fetchAsset, fetchDropdownData]);
  
  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setError(null);
      
      await apiClient.put(`/api/assets/${assetId}`, formData);
      
      setSuccess('Asset updated successfully!');
      setTimeout(() => {
        router.push(`/assets/${assetId}`);
      }, 1500);
    } catch (err: unknown) {
      console.error('Save failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to save asset');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  // Error state (no asset)
  if (!asset) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 flex items-center gap-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-lg font-medium text-red-400">Error Loading Asset</h3>
              <p className="text-gray-400 mt-1">{error || 'Asset not found'}</p>
            </div>
          </div>
          <Link href="/assets" className="inline-flex items-center gap-2 mt-4 text-blue-400 hover:text-blue-300">
            <ArrowLeft className="w-4 h-4" />
            Back to Assets
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/assets/${assetId}`} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Asset</h1>
            <p className="text-gray-400">{asset.asset_code}</p>
          </div>
        </div>
        
        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-900/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400">{success}</span>
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Asset Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter asset name"
              />
              <InputField
                label="Asset Code"
                name="asset_code"
                value={formData.asset_code}
                onChange={handleChange}
                disabled
              />
              <SelectField
                label="Category"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
              />
              <InputField
                label="Asset Type"
                name="asset_type"
                value={formData.asset_type}
                onChange={handleChange}
                placeholder="e.g., Hardware, Software"
              />
              <InputField
                label="Serial Number"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
              />
              <InputField
                label="Model Number"
                name="model_number"
                value={formData.model_number}
                onChange={handleChange}
              />
              <InputField
                label="Manufacturer"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
              />
              <SelectField
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'under_maintenance', label: 'Under Maintenance' },
                  { value: 'retired', label: 'Retired' },
                  { value: 'disposed', label: 'Disposed' },
                ]}
              />
              <SelectField
                label="Condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                options={[
                  { value: 'new', label: 'New' },
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' },
                ]}
              />
            </div>
            <div className="mt-4">
              <TextAreaField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter asset description"
              />
            </div>
          </div>
          
          {/* Financial Information */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Financial Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Purchase Date"
                name="purchase_date"
                value={formData.purchase_date?.split('T')[0]}
                onChange={handleChange}
                type="date"
              />
              <InputField
                label="Purchase Cost"
                name="purchase_cost"
                value={formData.purchase_cost}
                onChange={handleChange}
                type="number"
                placeholder="0.00"
              />
              <InputField
                label="Current Value"
                name="current_value"
                value={formData.current_value}
                onChange={handleChange}
                type="number"
                placeholder="0.00"
              />
              <InputField
                label="Warranty Expiry"
                name="warranty_expiry"
                value={formData.warranty_expiry?.split('T')[0]}
                onChange={handleChange}
                type="date"
              />
              <SelectField
                label="Vendor"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleChange}
                options={vendors.map(v => ({ value: v.name, label: v.name }))}
                placeholder="Select vendor"
              />
            </div>
          </div>
          
          {/* Location & Assignment */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Location & Assignment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Location"
                name="location_name"
                value={formData.location_name}
                onChange={handleChange}
                options={locations.map(l => ({ value: l.name, label: l.city ? `${l.name} (${l.city})` : l.name }))}
                placeholder="Select location"
              />
              <InputField
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleChange}
              />
              <SelectField
                label="Assigned To"
                name="assigned_to_user_id"
                value={formData.assigned_to_user_id}
                onChange={handleChange}
                options={users.map(u => ({ value: u.legacy_id || u.id, label: `${u.name} (${u.email})` }))}
                placeholder="Select user"
              />
            </div>
          </div>
          
          {/* Notes */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <TextAreaField
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about this asset"
            />
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link
              href={`/assets/${assetId}`}
              className="px-4 py-2 text-gray-300 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
