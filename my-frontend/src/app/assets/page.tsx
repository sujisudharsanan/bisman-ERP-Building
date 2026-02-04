'use client';

/**
 * ============================================================================
 * BISMAN ERP - Asset Register (List View)
 * ============================================================================
 * 
 * Displays all organizational assets with:
 * - Search and filter capabilities
 * - Status-based filtering
 * - Category filtering
 * - Pagination
 * - Quick actions (view, edit, delete)
 * - Export functionality
 * - Subscription limit display
 * 
 * @module pages/assets
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package, Plus, Search, Filter, RefreshCw, Download, Eye, Edit2, Trash2,
  ChevronLeft, ChevronRight, AlertCircle, Loader2, MoreVertical,
  CheckCircle, XCircle, Clock, Wrench, MapPin, User, DollarSign,
  Building, Tag, Calendar, Shield, Archive, TrendingUp, AlertTriangle
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
  asset_type?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  location_name?: string;
  department?: string;
  assigned_to_name?: string;
  assigned_to_display_name?: string;
  status: string;
  condition?: string;
  approval_status?: string;
  created_at: string;
}

interface AssetLimits {
  current: number;
  max: number;
  remaining: number;
  unlimited: boolean;
  subscriptionActive: boolean;
}

interface Category {
  id: number;
  code: string;
  name: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Active', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  inactive: { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle },
  under_maintenance: { label: 'Maintenance', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Wrench },
  pending_approval: { label: 'Pending', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  retired: { label: 'Retired', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Archive },
  disposed: { label: 'Disposed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Trash2 },
};

const PAGE_SIZES = [10, 20, 50, 100];

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
  delete: (endpoint: string) => apiClient.fetch(endpoint, { method: 'DELETE' }),
};

// ============================================================================
// Status Badge Component
// ============================================================================

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const Icon = config.icon;
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      border ${config.color}
    `}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

// ============================================================================
// Stats Card Component
// ============================================================================

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export default function AssetListPage() {
  const router = useRouter();
  
  // State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [limits, setLimits] = useState<AssetLimits | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Actions
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  
  // ============================================================================
  // Data Fetching
  // ============================================================================
  
  const fetchAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
      });
      
      const response = await apiClient.get(`/api/assets?${params}`);
      
      setAssets(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalItems(response.pagination?.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch assets:', err);
      setError(err.message || 'Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, statusFilter, categoryFilter]);
  
  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/assets/categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);
  
  const fetchLimits = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/assets/limits');
      setLimits(response.data || null);
    } catch (err) {
      console.error('Failed to fetch limits:', err);
    }
  }, []);
  
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);
  
  useEffect(() => {
    fetchCategories();
    fetchLimits();
  }, [fetchCategories, fetchLimits]);
  
  // ============================================================================
  // Computed Stats
  // ============================================================================
  
  const stats = useMemo(() => {
    const active = assets.filter(a => a.status === 'active').length;
    const maintenance = assets.filter(a => a.status === 'under_maintenance').length;
    const totalValue = assets.reduce((sum, a) => sum + (a.current_value || 0), 0);
    
    return {
      total: totalItems,
      active,
      maintenance,
      totalValue,
    };
  }, [assets, totalItems]);
  
  // ============================================================================
  // Actions
  // ============================================================================
  
  const handleDelete = async () => {
    if (!assetToDelete) return;
    
    try {
      setDeletingId(assetToDelete.id);
      await apiClient.delete(`/api/assets/${assetToDelete.id}`);
      
      // Refresh list
      fetchAssets();
      fetchLimits();
      
      setShowDeleteModal(false);
      setAssetToDelete(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.message || 'Failed to delete asset');
    } finally {
      setDeletingId(null);
    }
  };
  
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        limit: '1000',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
      });
      
      const response = await apiClient.get(`/api/assets?${params}`);
      const data = response.data || [];
      
      // Convert to CSV
      const headers = ['Asset Code', 'Name', 'Category', 'Status', 'Location', 'Assigned To', 'Purchase Cost', 'Current Value'];
      const rows = data.map((a: Asset) => [
        a.asset_code,
        a.name,
        a.category_name || '',
        a.status,
        a.location_name || '',
        a.assigned_to_display_name || a.assigned_to_name || '',
        a.purchase_cost || '',
        a.current_value || '',
      ]);
      
      const csv = [headers.join(','), ...rows.map((r: any[]) => r.map(c => `"${c}"`).join(','))].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assets_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };
  
  // ============================================================================
  // Render
  // ============================================================================
  
  const isLimitReached = limits && !limits.unlimited && limits.remaining <= 0;
  
  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Package className="w-7 h-7 text-indigo-500" />
              Asset Register
            </h1>
            <p className="text-gray-400 mt-1">
              Manage and track all organizational assets
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            <Link
              href="/assets/add"
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                ${isLimitReached
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }
              `}
              onClick={e => isLimitReached && e.preventDefault()}
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </Link>
          </div>
        </div>
        
        {/* Limit Warning */}
        {limits && !limits.unlimited && limits.remaining <= 5 && (
          <div className={`
            p-4 rounded-lg border mb-6
            ${limits.remaining <= 0
              ? 'bg-red-900/30 border-red-700 text-red-300'
              : 'bg-yellow-900/30 border-yellow-700 text-yellow-300'
            }
          `}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                {limits.remaining <= 0 ? (
                  <span>Asset limit reached ({limits.current}/{limits.max}). Upgrade your plan to add more assets.</span>
                ) : (
                  <span>{limits.remaining} asset slots remaining ({limits.current}/{limits.max})</span>
                )}
              </div>
              <button className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                Upgrade
              </button>
            </div>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Assets"
            value={stats.total}
            icon={Package}
            color="bg-indigo-600"
          />
          <StatsCard
            title="Active"
            value={stats.active}
            icon={CheckCircle}
            color="bg-green-600"
          />
          <StatsCard
            title="Under Maintenance"
            value={stats.maintenance}
            icon={Wrench}
            color="bg-yellow-600"
          />
          <StatsCard
            title="Total Value"
            value={`₹${(stats.totalValue / 100000).toFixed(1)}L`}
            icon={TrendingUp}
            color="bg-blue-600"
            subtitle="Current valuation"
          />
        </div>
        
        {/* Filters */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code, serial number..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
            
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            
            {/* Refresh */}
            <button
              onClick={() => fetchAssets()}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg mb-6">
            <div className="flex items-center gap-2 text-red-300">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No assets found</h3>
              <p className="text-gray-400 mb-6">
                {search || statusFilter || categoryFilter
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first asset'
                }
              </p>
              {!search && !statusFilter && !categoryFilter && (
                <Link
                  href="/assets/add"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                        Asset
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                        Category
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                        Location
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                        Assigned To
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                        Value
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                        Status
                      </th>
                      <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {assets.map(asset => (
                      <tr key={asset.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-white">{asset.name}</p>
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {asset.asset_code}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-300">{asset.category_name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {asset.location_name ? (
                            <span className="text-gray-300 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {asset.location_name}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {asset.assigned_to_display_name || asset.assigned_to_name ? (
                            <span className="text-gray-300 flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              {asset.assigned_to_display_name || asset.assigned_to_name}
                            </span>
                          ) : (
                            <span className="text-gray-500">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {asset.current_value ? (
                            <span className="text-gray-300 font-medium">
                              ₹{asset.current_value.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={asset.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/assets/${asset.id}`)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/assets/${asset.id}/edit`)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setAssetToDelete(asset);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400">
                    Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalItems)} of {totalItems}
                  </span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                    className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm text-white"
                  >
                    {PAGE_SIZES.map(size => (
                      <option key={size} value={size}>{size} per page</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`p-2 rounded-lg transition-colors ${
                      page === 1
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <span className="text-sm text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`p-2 rounded-lg transition-colors ${
                      page === totalPages
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && assetToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-2">Delete Asset</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete <strong className="text-white">{assetToDelete.name}</strong> ({assetToDelete.asset_code})? This action cannot be undone.
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setAssetToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deletingId === assetToDelete.id}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {deletingId === assetToDelete.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
