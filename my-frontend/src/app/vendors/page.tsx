'use client';

/**
 * ============================================================================
 * BISMAN ERP - Vendor Legal Master Dashboard
 * ============================================================================
 * 
 * Main dashboard for managing vendors with:
 * - Summary KPI cards
 * - Advanced search & filters
 * - Vendor list with actions
 * - RBAC-controlled actions
 * 
 * @module pages/vendors
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Search, Plus, Download, RefreshCw, Filter,
  Eye, Edit, Upload, Send, Pause, Archive, MoreVertical,
  AlertTriangle, CheckCircle, Clock, Shield, XCircle,
  ChevronLeft, ChevronRight, Users, TrendingUp, FileWarning
} from 'lucide-react';
import { useAuth } from '@/common/hooks/useAuth';
import api from '@/lib/api/axios';

// ============================================================================
// TYPES
// ============================================================================

interface VendorSummary {
  total_vendors: number;
  active_vendors: number;
  pending_verification: number;
  non_compliant_vendors: number;
  high_risk_vendors: number;
  suspended_vendors: number;
  msme_vendors: number;
  verified_vendors: number;
}

interface Vendor {
  id: string;
  vendor_code: string;
  legal_name: string;
  trade_name?: string;
  gst_number?: string;
  pan_number?: string;
  registration_number?: string;
  status: string;
  approval_status: string;
  risk_level: string;
  compliance_score: number;
  is_active: boolean;
  is_verified: boolean;
  is_msme: boolean;
  last_audit_date?: string;
  created_at: string;
  business_type?: string;
  industry?: string;
  primary_contact?: {
    name: string;
    email: string;
    phone: string;
  };
  location?: string;
  document_count: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: Edit },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Search },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  suspended: { label: 'Suspended', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: Pause },
  blacklisted: { label: 'Blacklisted', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: Archive },
};

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low Risk', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  medium: { label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  high: { label: 'High Risk', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

const APPROVAL_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-600 dark:text-yellow-400' },
  in_review: { label: 'In Review', color: 'text-blue-600 dark:text-blue-400' },
  legal_review: { label: 'Legal Review', color: 'text-purple-600 dark:text-purple-400' },
  approved: { label: 'Approved', color: 'text-green-600 dark:text-green-400' },
  rejected: { label: 'Rejected', color: 'text-red-600 dark:text-red-400' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  trend,
  onClick 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  color?: string;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// Risk Badge Component
function RiskBadge({ level }: { level: string }) {
  const config = RISK_CONFIG[level] || RISK_CONFIG.medium;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {level === 'high' || level === 'critical' ? <AlertTriangle className="w-3 h-3" /> : null}
      {config.label}
    </span>
  );
}

// Compliance Score Component
function ComplianceScore({ score }: { score: number }) {
  let color = 'text-green-600 dark:text-green-400';
  if (score < 50) color = 'text-red-600 dark:text-red-400';
  else if (score < 75) color = 'text-yellow-600 dark:text-yellow-400';
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-sm font-medium ${color}`}>{score}%</span>
    </div>
  );
}

// Action Menu Component
function ActionMenu({ 
  vendor, 
  permissions,
  onAction 
}: { 
  vendor: Vendor; 
  permissions: Record<string, boolean>;
  onAction: (action: string, vendorId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const actions = [
    { key: 'view', label: 'View Details', icon: Eye, permission: 'VIEW_VENDOR' },
    { key: 'edit', label: 'Edit', icon: Edit, permission: 'UPDATE_VENDOR' },
    { key: 'upload', label: 'Upload Documents', icon: Upload, permission: 'UPLOAD_VENDOR_DOC' },
    { key: 'submit', label: 'Submit for Review', icon: Send, permission: 'CREATE_VENDOR', condition: vendor.status === 'draft' },
    { key: 'approve', label: 'Approve', icon: CheckCircle, permission: 'APPROVE_VENDOR', condition: vendor.approval_status === 'pending' },
    { key: 'suspend', label: 'Suspend', icon: Pause, permission: 'SUSPEND_VENDOR', condition: vendor.status === 'active' },
    { key: 'archive', label: 'Archive', icon: Archive, permission: 'DELETE_VENDOR' },
  ].filter(a => 
    permissions[a.permission] && 
    (a.condition === undefined || a.condition)
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <MoreVertical className="w-5 h-5 text-gray-500" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            {actions.map(action => (
              <button
                key={action.key}
                onClick={() => {
                  onAction(action.key, vendor.id);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function VendorLegalMasterPage() {
  const router = useRouter();
  const { user, hasAccess } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Permissions cache
  const permissions = {
    VIEW_VENDOR: hasAccess?.('VIEW_VENDOR') ?? false,
    CREATE_VENDOR: hasAccess?.('CREATE_VENDOR') ?? false,
    UPDATE_VENDOR: hasAccess?.('UPDATE_VENDOR') ?? false,
    DELETE_VENDOR: hasAccess?.('DELETE_VENDOR') ?? false,
    APPROVE_VENDOR: hasAccess?.('APPROVE_VENDOR') ?? false,
    SUSPEND_VENDOR: hasAccess?.('SUSPEND_VENDOR') ?? false,
    UPLOAD_VENDOR_DOC: hasAccess?.('UPLOAD_VENDOR_DOC') ?? false,
    EXPORT_VENDOR: hasAccess?.('EXPORT_VENDOR') ?? false,
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get('/api/vendors-legal/stats/summary');
      if (response.data.success) {
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(riskFilter && { risk_level: riskFilter }),
        ...(approvalFilter && { approval_status: approvalFilter }),
      });
      
      const response = await api.get(`/api/vendors-legal?${params}`);
      if (response.data.success) {
        setVendors(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, riskFilter, approvalFilter]);

  useEffect(() => {
    fetchSummary();
    fetchVendors();
  }, [fetchSummary, fetchVendors]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleAction = async (action: string, vendorId: string) => {
    switch (action) {
      case 'view':
        router.push(`/vendors/${vendorId}`);
        break;
      case 'edit':
        router.push(`/vendors/${vendorId}/edit`);
        break;
      case 'upload':
        router.push(`/vendors/${vendorId}/documents`);
        break;
      case 'submit':
        try {
          await api.post(`/api/vendors-legal/${vendorId}/submit`);
          fetchVendors();
        } catch (error) {
          console.error('Error submitting vendor:', error);
        }
        break;
      case 'approve':
        try {
          await api.post(`/api/vendors-legal/${vendorId}/approve`, { remarks: 'Approved' });
          fetchVendors();
          fetchSummary();
        } catch (error) {
          console.error('Error approving vendor:', error);
        }
        break;
      case 'suspend':
        const reason = prompt('Enter suspension reason:');
        if (reason) {
          try {
            await api.post(`/api/vendors-legal/${vendorId}/suspend`, { reason });
            fetchVendors();
            fetchSummary();
          } catch (error) {
            console.error('Error suspending vendor:', error);
          }
        }
        break;
      case 'archive':
        if (confirm('Are you sure you want to archive this vendor?')) {
          try {
            await api.delete(`/api/vendors-legal/${vendorId}`);
            fetchVendors();
            fetchSummary();
          } catch (error) {
            console.error('Error archiving vendor:', error);
          }
        }
        break;
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...(statusFilter && { status: statusFilter }),
      });
      const response = await api.get(`/api/vendors-legal/export?${params}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendors-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting vendors:', error);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-7 h-7 text-blue-600" />
              Vendor Legal Master
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Legal and compliance information for business partners
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {permissions.EXPORT_VENDOR && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
            
            {permissions.CREATE_VENDOR && (
              <button
                onClick={() => router.push('/vendors/add')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Vendor
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <KPICard
              title="Total Vendors"
              value={summary.total_vendors}
              icon={Building2}
              color="blue"
            />
            <KPICard
              title="Active Vendors"
              value={summary.active_vendors}
              icon={CheckCircle}
              color="green"
              onClick={() => setStatusFilter('active')}
            />
            <KPICard
              title="Pending Verification"
              value={summary.pending_verification}
              icon={Clock}
              color="yellow"
              onClick={() => setApprovalFilter('pending')}
            />
            <KPICard
              title="Non-Compliant"
              value={summary.non_compliant_vendors}
              icon={FileWarning}
              color="red"
            />
            <KPICard
              title="High Risk"
              value={summary.high_risk_vendors}
              icon={AlertTriangle}
              color="orange"
              onClick={() => setRiskFilter('high')}
            />
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, registration, GST, or tax ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400' 
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            {/* Refresh */}
            <button
              onClick={() => { fetchVendors(); fetchSummary(); }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Risk Level
                </label>
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Risk Levels</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Approval Status
                </label>
                <select
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Approvals</option>
                  <option value="pending">Pending</option>
                  <option value="in_review">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Vendor List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No vendors found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {search || statusFilter || riskFilter 
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first vendor'}
              </p>
              {permissions.CREATE_VENDOR && (
                <button
                  onClick={() => router.push('/vendors/add')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Vendor
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Registration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Risk
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Compliance
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {vendors.map((vendor) => (
                      <tr 
                        key={vendor.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {vendor.legal_name}
                              </span>
                              {vendor.is_verified && (
                                <span title="Verified">
                                  <Shield className="w-4 h-4 text-green-500" />
                                </span>
                              )}
                              {vendor.is_msme && (
                                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded">
                                  MSME
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {vendor.vendor_code}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            {vendor.gst_number && (
                              <div className="text-gray-900 dark:text-white">GST: {vendor.gst_number}</div>
                            )}
                            {vendor.pan_number && (
                              <div className="text-gray-500 dark:text-gray-400">PAN: {vendor.pan_number}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {vendor.industry || '-'}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {vendor.business_type}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={vendor.status} />
                          <div className={`text-xs mt-1 ${APPROVAL_CONFIG[vendor.approval_status]?.color || ''}`}>
                            {APPROVAL_CONFIG[vendor.approval_status]?.label}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <RiskBadge level={vendor.risk_level} />
                        </td>
                        <td className="px-4 py-4">
                          <ComplianceScore score={vendor.compliance_score} />
                        </td>
                        <td className="px-4 py-4">
                          {vendor.primary_contact ? (
                            <div className="text-sm">
                              <div className="text-gray-900 dark:text-white">{vendor.primary_contact.name}</div>
                              <div className="text-gray-500 dark:text-gray-400">{vendor.primary_contact.email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/vendors/${vendor.id}`)}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                            {permissions.UPDATE_VENDOR && (
                              <button
                                onClick={() => router.push(`/vendors/${vendor.id}/edit`)}
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-gray-500" />
                              </button>
                            )}
                            <ActionMenu
                              vendor={vendor}
                              permissions={permissions}
                              onAction={handleAction}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {vendor.legal_name}
                          </span>
                          {vendor.is_verified && (
                            <Shield className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {vendor.vendor_code}
                        </div>
                      </div>
                      <ActionMenu
                        vendor={vendor}
                        permissions={permissions}
                        onAction={handleAction}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        <div className="mt-1"><StatusBadge status={vendor.status} /></div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Risk:</span>
                        <div className="mt-1"><RiskBadge level={vendor.risk_level} /></div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">GST:</span>
                        <div className="text-gray-900 dark:text-white">{vendor.gst_number || '-'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Compliance:</span>
                        <div className="mt-1"><ComplianceScore score={vendor.compliance_score} /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} vendors
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
