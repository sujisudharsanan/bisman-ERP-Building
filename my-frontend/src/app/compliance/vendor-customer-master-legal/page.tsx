'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  Plus,
  Download,
  Eye,
  Edit,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Mail,
  MapPin,
  Shield,
  MoreVertical,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface VendorLegal {
  id: string;
  vendor_code: string;
  legal_name: string;
  trade_name: string;
  gst_number: string;
  pan_number: string;
  registration_number: string;
  status: 'draft' | 'pending' | 'under_review' | 'approved' | 'active' | 'suspended' | 'blacklisted' | 'archived';
  approval_status: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  compliance_score: number;
  is_active: boolean;
  is_verified: boolean;
  is_msme: boolean;
  last_audit_date: string;
  created_at: string;
  updated_at: string;
  business_type: string;
  industry: string;
  primary_contact: {
    name: string;
    email: string;
    phone: string;
  } | null;
  location: string;
  document_count: number;
}

interface StatsData {
  total_vendors: number;
  active_vendors: number;
  pending_verification: number;
  high_risk_vendors: number;
}

// ============================================================================
// API Helper
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchWithAuth(endpoint: string) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: VendorLegal['status'] }) {
  const configs: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    blacklisted: { label: 'Blacklisted', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    archived: { label: 'Archived', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle }
  };

  const config = configs[status] || configs['draft'];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function RiskBadge({ level }: { level: VendorLegal['risk_level'] }) {
  const configs: Record<string, string> = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  const config = configs[level] || configs['low'];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {level} Risk
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function VendorCustomerMasterLegalPage() {
  const [vendors, setVendors] = useState<VendorLegal[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');

  // Fetch vendors from API
  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (riskFilter !== 'all') params.append('risk_level', riskFilter);
      params.append('limit', '50');
      
      const queryString = params.toString();
      const url = `/api/vendors-legal${queryString ? `?${queryString}` : ''}`;
      
      const [vendorResponse, statsResponse] = await Promise.all([
        fetchWithAuth(url),
        fetchWithAuth('/api/vendors-legal/stats/summary')
      ]);
      
      if (vendorResponse.success) {
        setVendors(vendorResponse.data || []);
      }
      if (statsResponse.success && statsResponse.data?.summary) {
        setStats(statsResponse.data.summary);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, riskFilter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, riskFilter, fetchVendors]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Legal Master</h1>
            <p className="text-gray-500 dark:text-gray-400">Legal and compliance information for vendors</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={fetchVendors}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Vendor
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_vendors || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Vendors</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.active_vendors || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Vendors</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.pending_verification || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Verification</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.high_risk_vendors || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">High Risk</p>
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
              placeholder="Search by name, vendor code, GST, or registration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading vendors...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button 
                onClick={fetchVendors}
                className="ml-auto px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Vendor Cards */}
        {!loading && !error && (
          <div className="space-y-4">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{vendor.trade_name || vendor.legal_name}</h3>
                        <StatusBadge status={vendor.status} />
                        {vendor.risk_level && <RiskBadge level={vendor.risk_level} />}
                        {vendor.is_verified && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {vendor.is_msme && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs">
                            MSME
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{vendor.legal_name}</p>
                      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Code: {vendor.vendor_code}</span>
                        {vendor.gst_number && (
                          <>
                            <span>•</span>
                            <span>GST: {vendor.gst_number}</span>
                          </>
                        )}
                        {vendor.industry && (
                          <>
                            <span>•</span>
                            <span>{vendor.industry}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                      <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                      <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Documents">
                      <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="More">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {/* Contact */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Primary Contact</p>
                    {vendor.primary_contact ? (
                      <>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{vendor.primary_contact.name}</p>
                        <div className="flex gap-2 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{vendor.primary_contact.email}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">No contact info</p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Location</p>
                    {vendor.location ? (
                      <div className="flex items-start gap-1 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                        <span>{vendor.location}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No address</p>
                    )}
                  </div>

                  {/* Compliance */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Compliance</p>
                    <div className="flex flex-wrap gap-1">
                      {vendor.compliance_score !== null && (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          vendor.compliance_score >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          vendor.compliance_score >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          Score: {vendor.compliance_score}%
                        </span>
                      )}
                      {vendor.document_count > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                          <FileText className="w-3 h-3" />
                          {vendor.document_count} docs
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && vendors.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No vendors found matching your criteria</p>
            <button 
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setRiskFilter('all'); }}
              className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
