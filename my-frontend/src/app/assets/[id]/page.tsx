'use client';

/**
 * Asset View Page
 * Displays detailed information about a specific asset
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Package, ArrowLeft, Edit2, Trash2, Calendar, DollarSign, MapPin,
  User, Tag, FileText, Clock, Shield, AlertCircle, Loader2, History,
  Wrench, Building, Hash, CheckCircle, XCircle
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
  category_name?: string;
  category_code?: string;
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
  assigned_to_display_name?: string;
  assigned_date?: string;
  status: string;
  condition?: string;
  requires_approval?: boolean;
  approval_status?: string;
  tags?: string[];
  notes?: string;
  created_at: string;
  created_by_name?: string;
  updated_at?: string;
  files?: AssetFile[];
  history?: AssetHistory[];
}

interface AssetFile {
  id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  category: string;
  description?: string;
  uploaded_at: string;
}

interface AssetHistory {
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  performed_by_name: string;
  performed_by_role: string;
  performed_at: string;
  notes?: string;
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
  delete: (endpoint: string) => apiClient.fetch(endpoint, { method: 'DELETE' }),
};

// ============================================================================
// Status Badge Component
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle },
  under_maintenance: { label: 'Maintenance', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Wrench },
  pending_approval: { label: 'Pending', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  retired: { label: 'Retired', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Package },
  disposed: { label: 'Disposed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Trash2 },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${config.color}`}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

// ============================================================================
// Info Row Component
// ============================================================================

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-700/50 last:border-0">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-white mt-0.5">{value || <span className="text-gray-500">Not specified</span>}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AssetViewPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = (params?.id as string) || '';
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch asset
  useEffect(() => {
    async function fetchAsset() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get(`/api/assets/${assetId}`);
        setAsset(response.data);
      } catch (err: unknown) {
        console.error('Failed to fetch asset:', err);
        setError(err instanceof Error ? err.message : 'Failed to load asset');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (assetId) fetchAsset();
  }, [assetId]);
  
  // Delete handler
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/assets/${assetId}`);
      router.push('/assets');
    } catch (err: unknown) {
      console.error('Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
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
  
  // Error state
  if (error || !asset) {
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/assets" className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{asset.name}</h1>
              <p className="text-gray-400">{asset.asset_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={asset.status} />
            <button
              onClick={() => router.push(`/assets/${asset.id}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
        
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                Basic Information
              </h2>
              <div className="space-y-1">
                <InfoRow icon={Tag} label="Category" value={asset.category_name} />
                <InfoRow icon={FileText} label="Type" value={asset.asset_type} />
                <InfoRow icon={Hash} label="Serial Number" value={asset.serial_number} />
                <InfoRow icon={FileText} label="Model" value={asset.model_number} />
                <InfoRow icon={Building} label="Manufacturer" value={asset.manufacturer} />
                <InfoRow icon={Shield} label="Condition" value={asset.condition} />
                {asset.description && (
                  <InfoRow icon={FileText} label="Description" value={asset.description} />
                )}
              </div>
            </div>
            
            {/* Financial Info */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Financial Information
              </h2>
              <div className="space-y-1">
                <InfoRow icon={Calendar} label="Purchase Date" value={asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : null} />
                <InfoRow icon={DollarSign} label="Purchase Cost" value={asset.purchase_cost ? `₹${asset.purchase_cost.toLocaleString()}` : null} />
                <InfoRow icon={DollarSign} label="Current Value" value={asset.current_value ? `₹${asset.current_value.toLocaleString()}` : null} />
                <InfoRow icon={DollarSign} label="Salvage Value" value={asset.salvage_value ? `₹${asset.salvage_value.toLocaleString()}` : null} />
                <InfoRow icon={Calendar} label="Warranty Expiry" value={asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : null} />
                <InfoRow icon={FileText} label="Vendor" value={asset.vendor_name} />
                <InfoRow icon={FileText} label="PO Number" value={asset.purchase_order_number} />
                <InfoRow icon={FileText} label="Invoice Number" value={asset.invoice_number} />
              </div>
            </div>
            
            {/* History */}
            {asset.history && asset.history.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Recent History
                </h2>
                <div className="space-y-3">
                  {asset.history.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0">
                      <Clock className="w-4 h-4 text-gray-400 mt-1" />
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          <span className="font-medium">{h.performed_by_name}</span>
                          <span className="text-gray-400"> {h.action}</span>
                          {h.field_name && (
                            <span className="text-gray-400"> {h.field_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(h.performed_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Location & Assignment */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-400" />
                Location & Assignment
              </h2>
              <div className="space-y-1">
                <InfoRow icon={MapPin} label="Location" value={asset.location_name} />
                <InfoRow icon={Building} label="Department" value={asset.department} />
                <InfoRow icon={User} label="Assigned To" value={asset.assigned_to_display_name || asset.assigned_to_name} />
                <InfoRow icon={Calendar} label="Assigned Date" value={asset.assigned_date ? new Date(asset.assigned_date).toLocaleDateString() : null} />
              </div>
            </div>
            
            {/* Meta Info */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                Metadata
              </h2>
              <div className="space-y-1">
                <InfoRow icon={Calendar} label="Created" value={new Date(asset.created_at).toLocaleString()} />
                <InfoRow icon={User} label="Created By" value={asset.created_by_name} />
                {asset.updated_at && (
                  <InfoRow icon={Calendar} label="Last Updated" value={new Date(asset.updated_at).toLocaleString()} />
                )}
              </div>
            </div>
            
            {/* Tags */}
            {asset.tags && asset.tags.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-teal-400" />
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Notes */}
            {asset.notes && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Notes
                </h2>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{asset.notes}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-2">Delete Asset</h3>
              <p className="text-gray-400 mb-4">
                Are you sure you want to delete <strong>{asset.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
