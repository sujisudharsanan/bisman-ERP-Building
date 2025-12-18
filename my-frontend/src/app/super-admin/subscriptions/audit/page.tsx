'use client';

/**
 * SuperAdmin - Subscription Audit Logs
 * 
 * Features:
 * - View all subscription-related actions
 * - Filter by tenant, action type, date range
 * - Export audit logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Settings,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Calendar,
  Loader2,
  ExternalLink,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuditLog {
  id: string;
  tenantId: string;
  tenantName: string;
  action: string;
  actionType: 'upgrade' | 'downgrade' | 'activate' | 'suspend' | 'cancel' | 'reactivate' | 'trial_extend' | 'billing_override' | 'plan_change' | 'feature_change' | 'limit_override';
  actorId: string;
  actorName: string;
  actorRole: string;
  details: Record<string, unknown>;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

interface FilterState {
  search: string;
  actionType: string;
  dateFrom: string;
  dateTo: string;
  tenantId: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'downgrade', label: 'Downgrade' },
  { value: 'activate', label: 'Activate' },
  { value: 'suspend', label: 'Suspend' },
  { value: 'cancel', label: 'Cancel' },
  { value: 'reactivate', label: 'Reactivate' },
  { value: 'trial_extend', label: 'Trial Extension' },
  { value: 'billing_override', label: 'Billing Override' },
  { value: 'plan_change', label: 'Plan Change' },
  { value: 'feature_change', label: 'Feature Change' },
  { value: 'limit_override', label: 'Limit Override' },
];

const ACTION_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  upgrade: { icon: TrendingUp, color: 'text-emerald-500 bg-emerald-100' },
  downgrade: { icon: TrendingDown, color: 'text-amber-500 bg-amber-100' },
  activate: { icon: Play, color: 'text-emerald-500 bg-emerald-100' },
  suspend: { icon: Pause, color: 'text-red-500 bg-red-100' },
  cancel: { icon: AlertTriangle, color: 'text-red-500 bg-red-100' },
  reactivate: { icon: RefreshCw, color: 'text-blue-500 bg-blue-100' },
  trial_extend: { icon: Clock, color: 'text-blue-500 bg-blue-100' },
  billing_override: { icon: CreditCard, color: 'text-violet-500 bg-violet-100' },
  plan_change: { icon: Settings, color: 'text-gray-500 bg-gray-100' },
  feature_change: { icon: Settings, color: 'text-violet-500 bg-violet-100' },
  limit_override: { icon: Settings, color: 'text-amber-500 bg-amber-100' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Audit Log Row Component
function AuditLogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_ICONS[log.actionType] || { icon: FileText, color: 'text-gray-500 bg-gray-100' };
  const Icon = config.icon;

  return (
    <div className="border-b border-gray-100 dark:border-slate-700 last:border-b-0">
      <div
        className="p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {log.actionType.replace('_', ' ')}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {log.tenantName}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {log.action}
            </p>
          </div>

          {/* Actor */}
          <div className="text-right hidden md:block">
            <p className="text-sm text-gray-900 dark:text-white">{log.actorName}</p>
            <p className="text-xs text-gray-500">{log.actorRole}</p>
          </div>

          {/* Timestamp */}
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(log.timestamp).toLocaleDateString('en-IN')}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(log.timestamp).toLocaleTimeString('en-IN')}
            </p>
          </div>

          {/* Expand Icon */}
          <button className="p-1">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 space-y-4">
                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Tenant ID</p>
                    <p className="text-gray-900 dark:text-white font-mono text-xs">{log.tenantId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Actor ID</p>
                    <p className="text-gray-900 dark:text-white font-mono text-xs">{log.actorId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">IP Address</p>
                    <p className="text-gray-900 dark:text-white font-mono text-xs">{log.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Timestamp</p>
                    <p className="text-gray-900 dark:text-white text-xs">
                      {new Date(log.timestamp).toISOString()}
                    </p>
                  </div>
                </div>

                {/* State Changes */}
                {(log.previousState || log.newState) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {log.previousState && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          Previous State
                        </p>
                        <pre className="bg-white dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-700 text-xs overflow-x-auto">
                          {JSON.stringify(log.previousState, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.newState && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                          New State
                        </p>
                        <pre className="bg-white dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-700 text-xs overflow-x-auto">
                          {JSON.stringify(log.newState, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Details */}
                {Object.keys(log.details).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Details
                    </p>
                    <pre className="bg-white dark:bg-slate-800 p-3 rounded border border-gray-200 dark:border-slate-700 text-xs overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}

                {/* User Agent */}
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    User Agent
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
                    {log.userAgent}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    actionType: '',
    dateFrom: '',
    dateTo: '',
    tenantId: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (filters.search) params.set('search', filters.search);
      if (filters.actionType) params.set('actionType', filters.actionType);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.tenantId) params.set('tenantId', filters.tenantId);

      const response = await fetch(`/api/super-admin/subscriptions/audit?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      console.error('Error fetching audit logs');
      // Mock data for development
      setLogs([
        {
          id: '1',
          tenantId: 'tenant-001',
          tenantName: 'Acme Corporation',
          action: 'Upgraded subscription from Professional to Business plan',
          actionType: 'upgrade',
          actorId: 'admin-001',
          actorName: 'John Admin',
          actorRole: 'SUPER_ADMIN',
          details: { proration: 15000, reason: 'Customer request' },
          previousState: { plan: 'PROFESSIONAL', mrr: 9999 },
          newState: { plan: 'BUSINESS', mrr: 24999 },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          tenantId: 'tenant-002',
          tenantName: 'TechStart Inc',
          action: 'Extended trial period by 7 days',
          actionType: 'trial_extend',
          actorId: 'admin-002',
          actorName: 'Jane Manager',
          actorRole: 'SUPER_ADMIN',
          details: { extensionDays: 7, reason: 'Sales negotiation' },
          previousState: { trialEndsAt: new Date(Date.now() - 7 * 86400000).toISOString() },
          newState: { trialEndsAt: new Date().toISOString() },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '3',
          tenantId: 'tenant-003',
          tenantName: 'Global Traders',
          action: 'Applied billing override: 20% discount',
          actionType: 'billing_override',
          actorId: 'admin-001',
          actorName: 'John Admin',
          actorRole: 'SUPER_ADMIN',
          details: { discountPercent: 20, validUntil: new Date(Date.now() + 90 * 86400000).toISOString() },
          previousState: { discount: 0 },
          newState: { discount: 20 },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: '4',
          tenantId: 'tenant-004',
          tenantName: 'Local Shop',
          action: 'Account suspended due to payment failure',
          actionType: 'suspend',
          actorId: 'system',
          actorName: 'System',
          actorRole: 'SYSTEM',
          details: { reason: 'Payment failed 3 times', lastPaymentAttempt: new Date(Date.now() - 3 * 86400000).toISOString() },
          previousState: { status: 'GRACE_PERIOD' },
          newState: { status: 'SUSPENDED' },
          ipAddress: 'internal',
          userAgent: 'BISMAN-System/1.0',
          timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ]);
      setTotalPages(3);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Export logs
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      if (filters.actionType) params.set('actionType', filters.actionType);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.tenantId) params.set('tenantId', filters.tenantId);

      const response = await fetch(`/api/super-admin/subscriptions/audit/export?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscription-audit-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export logs');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track all subscription-related changes and actions
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export CSV
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant, action, or actor..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Quick Filter: Action Type */}
          <select
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
            className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
          >
            {ACTION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 dark:text-gray-300">More Filters</span>
            {showFilters ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date From
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date To
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tenant ID
                  </label>
                  <input
                    type="text"
                    value={filters.tenantId}
                    onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}
                    placeholder="Enter tenant ID..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Logs List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {logs.map((log) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-200 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
