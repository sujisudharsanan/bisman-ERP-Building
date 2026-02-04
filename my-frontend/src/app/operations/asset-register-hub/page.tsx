'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  HardDrive,
  Search,
  Plus,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  MapPin,
  User,
  Wrench,
  TrendingDown,
  QrCode,
  Loader2,
  RefreshCw,
  Archive
} from 'lucide-react';

// ============================================================================
// Type Definitions
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
  model_number?: string;
  manufacturer?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  location_name?: string;
  department?: string;
  assigned_to_name?: string;
  status: string;
  condition?: string;
  created_at: string;
}

interface AssetStats {
  total: number;
  totalValue: number;
  underMaintenance: number;
  active: number;
}

interface Category {
  id: number;
  code: string;
  name: string;
}

// ============================================================================
// API Helper
// ============================================================================

const apiClient = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
  
  async fetch(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response.json();
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    under_maintenance: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Wrench },
    maintenance: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Wrench },
    disposed: { label: 'Disposed', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle },
    retired: { label: 'Retired', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Archive },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle },
    pending_approval: { label: 'Pending', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
    idle: { label: 'Idle', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertTriangle }
  };

  const statusConfig = config[status] || config.active;
  const Icon = statusConfig.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
      <Icon className="w-3 h-3" />
      {statusConfig.label}
    </span>
  );
}

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function AssetRegisterHubPage() {
  // State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: '100',
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
      });
      
      const response = await apiClient.fetch(`/api/assets?${params}`);
      setAssets(response.data || []);
    } catch (err: unknown) {
      console.error('Failed to fetch assets:', err);
      setError('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiClient.fetch('/api/assets/categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const stats: AssetStats = useMemo(() => {
    const active = assets.filter(a => a.status === 'active').length;
    const underMaintenance = assets.filter(a => a.status === 'under_maintenance' || a.status === 'maintenance').length;
    const totalValue = assets.reduce((sum, a) => sum + (a.current_value || a.purchase_cost || 0), 0);
    
    return {
      total: assets.length,
      totalValue,
      underMaintenance,
      active,
    };
  }, [assets]);

  const locations = useMemo(() => {
    const locs = [...new Set(assets.map(a => a.location_name).filter(Boolean))];
    return locs as string[];
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesLocation = locationFilter === 'all' || asset.location_name === locationFilter;
      return matchesLocation;
    });
  }, [assets, locationFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Register Hub</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and track all organizational assets</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => fetchAssets()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <Link 
              href="/assets/add"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </Link>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Assets</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Wrench className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.underMaintenance}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Under Maintenance</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Assets</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by asset code, name, or serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id.toString()}>{c.name}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="under_maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
            <option value="disposed">Disposed</option>
            <option value="retired">Retired</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => fetchAssets()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Assets Table */}
        {!isLoading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Location</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Custodian</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <HardDrive className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{asset.asset_code}</p>
                        <p className="text-sm text-gray-500">{asset.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{asset.category_name || '-'}</p>
                    <p className="text-xs text-gray-500">{asset.asset_type || ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-900 dark:text-white">{asset.location_name || '-'}</p>
                        <p className="text-xs text-gray-500">{asset.department || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(asset.current_value)}</p>
                    <p className="text-xs text-gray-500">Cost: {formatCurrency(asset.purchase_cost)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{asset.assigned_to_name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={asset.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <Link href={`/assets/${asset.id}`} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </Link>
                      <Link href={`/assets/${asset.id}/edit`} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </Link>
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="QR Code">
                        <QrCode className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <HardDrive className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No assets found</p>
              <Link 
                href="/assets/add"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Your First Asset
              </Link>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
