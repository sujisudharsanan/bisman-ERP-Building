"use client";

/**
 * Enhanced Audit Log Viewer
 * BISMAN ERP - Enterprise Admin Audit Dashboard
 *
 * Features:
 * - Timestamp with relative time
 * - Actor (user who performed action)
 * - Action type with icons
 * - IP address tracking
 * - Resource affected
 * - Advanced filters (date, user, type, entity)
 * - Export functionality
 * - Pagination
 * - Real-time refresh
 */

import { useEffect, useState, useCallback } from 'react';
import { usePageRefresh } from '@/contexts/RefreshContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Shield,
  Clock,
  Globe,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Database,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Key,
  Activity,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuditLog {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  actionType: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'export' | 'permission' | 'system';
  ipAddress: string;
  userAgent?: string;
  resource: {
    type: string;
    id: string;
    name?: string;
  };
  details?: Record<string, any>;
  status: 'success' | 'failure' | 'warning';
  duration?: number; // ms
}

interface AuditSummary {
  actionStats: { action: string; count: number }[];
  entityStats: { entity: string; count: number }[];
  recentActivity24h: number;
  totalLogs: number;
  failedAttempts: number;
  uniqueUsers: number;
}

interface FilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  user: string;
  actionType: string;
  entity: string;
  status: string;
  ipAddress: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTION_ICONS: Record<string, any> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  view: Eye,
  login: LogIn,
  logout: LogOut,
  export: Download,
  permission: Key,
  system: Settings,
};

const ACTION_COLORS: Record<string, string> = {
  create: '#22c55e',
  update: '#3b82f6',
  delete: '#ef4444',
  view: '#8b5cf6',
  login: '#06b6d4',
  logout: '#f59e0b',
  export: '#ec4899',
  permission: '#f97316',
  system: '#6b7280',
};

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  failure: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
};

const ITEMS_PER_PAGE = 25;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getActionDescription(action: string, resource: AuditLog['resource']): string {
  const resourceName = resource.name || `${resource.type} #${resource.id}`;
  return `${action} on ${resourceName}`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Summary Stats Card
function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// Filter Panel
function FilterPanel({
  filters,
  onChange,
  onClear,
  actionTypes,
  entities,
  users,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
  actionTypes: string[];
  entities: string[];
  users: { id: string; name: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
      {/* Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs by action, user, resource..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
              hasActiveFilters
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                : 'border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 bg-violet-500 text-white text-xs rounded-full flex items-center justify-center">
                {Object.values(filters).filter((v) => v !== '').length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action Type
                </label>
                <select
                  value={filters.actionType}
                  onChange={(e) => onChange({ ...filters, actionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Actions</option>
                  {actionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resource Type
                </label>
                <select
                  value={filters.entity}
                  onChange={(e) => onChange({ ...filters, entity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Resources</option>
                  {entities.map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </select>
              </div>

              {/* User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User
                </label>
                <select
                  value={filters.user}
                  onChange={(e) => onChange({ ...filters, user: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Users</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => onChange({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="warning">Warning</option>
                </select>
              </div>

              {/* IP Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  placeholder="e.g., 192.168.1.1"
                  value={filters.ipAddress}
                  onChange={(e) => onChange({ ...filters, ipAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Audit Log Row
function AuditLogRow({ log, onViewDetails }: { log: AuditLog; onViewDetails: (log: AuditLog) => void }) {
  const ActionIcon = ACTION_ICONS[log.actionType] || Activity;
  const actionColor = ACTION_COLORS[log.actionType] || '#6b7280';
  const statusConfig = STATUS_CONFIG[log.status];
  const StatusIcon = statusConfig.icon;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
    >
      {/* Timestamp */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatRelativeTime(log.timestamp)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDateTime(log.timestamp)}
            </p>
          </div>
        </div>
      </td>

      {/* Actor */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {log.actor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {log.actor.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {log.actor.role}
            </p>
          </div>
        </div>
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${actionColor}15` }}
          >
            <ActionIcon className="w-4 h-4" style={{ color: actionColor }} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
              {log.action}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {log.actionType}
            </p>
          </div>
        </div>
      </td>

      {/* Resource */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {log.resource.name || log.resource.type}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ID: {log.resource.id}
            </p>
          </div>
        </div>
      </td>

      {/* IP Address */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
            {log.ipAddress}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
        >
          <StatusIcon className="w-3 h-3" />
          {log.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <button
          onClick={() => onViewDetails(log)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </td>
    </motion.tr>
  );
}

// Log Detail Modal
function LogDetailModal({
  log,
  onClose,
}: {
  log: AuditLog | null;
  onClose: () => void;
}) {
  if (!log) return null;

  const ActionIcon = ACTION_ICONS[log.actionType] || Activity;
  const actionColor = ACTION_COLORS[log.actionType] || '#6b7280';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${actionColor}15` }}
            >
              <ActionIcon className="w-6 h-6" style={{ color: actionColor }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                {log.action}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDateTime(log.timestamp)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Actor Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Actor
            </h3>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {log.actor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{log.actor.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{log.actor.email}</p>
                </div>
                <span className="ml-auto px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-medium rounded">
                  {log.actor.role}
                </span>
              </div>
            </div>
          </div>

          {/* Resource Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Resource
            </h3>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">{log.resource.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">ID</p>
                  <p className="font-mono text-gray-900 dark:text-white">{log.resource.id}</p>
                </div>
                {log.resource.name && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{log.resource.name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Technical Details
            </h3>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">IP Address</span>
                <span className="font-mono text-gray-900 dark:text-white">{log.ipAddress}</span>
              </div>
              {log.userAgent && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">User Agent</span>
                  <span className="text-sm text-gray-900 dark:text-white truncate max-w-xs">{log.userAgent}</span>
                </div>
              )}
              {log.duration !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Duration</span>
                  <span className="text-gray-900 dark:text-white">{log.duration}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Details */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Changes
              </h3>
              <pre className="bg-gray-900 dark:bg-slate-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Page() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    dateFrom: '',
    dateTo: '',
    user: '',
    actionType: '',
    entity: '',
    status: '',
    ipAddress: '',
  });

  // Extract unique values for filter dropdowns
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchAudit = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsDataRefreshing(true);
      } else {
        setLoading(true);
      }

      // Build query params
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', ITEMS_PER_PAGE.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.user) params.append('userId', filters.user);
      if (filters.actionType) params.append('action', filters.actionType);
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.status) params.append('status', filters.status);
      if (filters.ipAddress) params.append('ip', filters.ipAddress);

      const [logsRes, summaryRes] = await Promise.all([
        fetch(`${baseURL}/api/enterprise-admin/audit?${params.toString()}`, { credentials: 'include' }),
        fetch(`${baseURL}/api/enterprise-admin/audit/summary`, { credentials: 'include' }),
      ]);

      const logsData = await logsRes.json();
      const summaryData = await summaryRes.json();

      // Transform API data to our format
      const transformedLogs: AuditLog[] = (logsData.logs || []).map((log: any) => ({
        id: log.id,
        timestamp: log.createdAt || new Date().toISOString(),
        actor: {
          id: log.userId || 'unknown',
          name: log.username || 'Unknown User',
          email: log.userEmail || '',
          role: log.userRole || 'User',
        },
        action: log.action || 'Unknown',
        actionType: mapActionType(log.action),
        ipAddress: log.ipAddress || log.ip || '—',
        userAgent: log.userAgent,
        resource: {
          type: log.entity || 'Unknown',
          id: log.entityId || '—',
          name: log.entityName,
        },
        details: log.details,
        status: log.status || 'success',
        duration: log.duration,
      }));

      setLogs(transformedLogs);
      setTotalPages(logsData.pagination?.totalPages || 1);
      setTotalLogs(logsData.pagination?.total || transformedLogs.length);

      // Set summary
      if (summaryData.summary) {
        setSummary({
          actionStats: summaryData.summary.actionStats || [],
          entityStats: summaryData.summary.entityStats || [],
          recentActivity24h: summaryData.summary.recentActivity24h || 0,
          totalLogs: logsData.pagination?.total || 0,
          failedAttempts: summaryData.summary.failedAttempts || 0,
          uniqueUsers: summaryData.summary.uniqueUsers || 0,
        });

        // Extract filter options
        const actionList = (summaryData.summary.actionStats || []).map((a: any) => String(a.action));
        const entityList = (summaryData.summary.entityStats || []).map((e: any) => String(e.entity));
        setActionTypes([...new Set(actionList)] as string[]);
        setEntities([...new Set(entityList)] as string[]);
      }

      // Generate demo users for filter (in production, fetch from API)
      setUsers([
        { id: '1', name: 'Rajesh Kumar' },
        { id: '2', name: 'Priya Sharma' },
        { id: '3', name: 'Amit Patel' },
        { id: '4', name: 'System' },
      ]);

    } catch (e: any) {
      setErr(e.message || 'Failed to load audit logs');
      // Use demo data on error
      generateDemoData();
    } finally {
      setLoading(false);
      setIsDataRefreshing(false);
    }
  }, [baseURL, currentPage, filters]);

  const mapActionType = (action: string): AuditLog['actionType'] => {
    const actionLower = (action || '').toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('add')) return 'create';
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify')) return 'update';
    if (actionLower.includes('delete') || actionLower.includes('remove')) return 'delete';
    if (actionLower.includes('view') || actionLower.includes('read') || actionLower.includes('get')) return 'view';
    if (actionLower.includes('login') || actionLower.includes('signin')) return 'login';
    if (actionLower.includes('logout') || actionLower.includes('signout')) return 'logout';
    if (actionLower.includes('export') || actionLower.includes('download')) return 'export';
    if (actionLower.includes('permission') || actionLower.includes('role') || actionLower.includes('access')) return 'permission';
    return 'system';
  };

  const generateDemoData = () => {
    const demoLogs: AuditLog[] = [];
    const actions = ['Created User', 'Updated Invoice', 'Deleted Product', 'Viewed Report', 'Login Success', 'Role Changed', 'Export Data', 'Updated Settings'];
    const names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'System'];
    const resources = ['User', 'Invoice', 'Product', 'Report', 'Session', 'Role', 'Export', 'Settings'];
    const ips = ['192.168.1.1', '10.0.0.25', '172.16.0.100', '192.168.0.50'];

    for (let i = 0; i < 50; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const name = names[Math.floor(Math.random() * names.length)];
      demoLogs.push({
        id: `log-${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        actor: {
          id: `user-${Math.floor(Math.random() * 5) + 1}`,
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@company.com`,
          role: ['Admin', 'Manager', 'User', 'System'][Math.floor(Math.random() * 4)],
        },
        action,
        actionType: mapActionType(action),
        ipAddress: ips[Math.floor(Math.random() * ips.length)],
        resource: {
          type: resources[Math.floor(Math.random() * resources.length)],
          id: `${Math.floor(Math.random() * 1000) + 1}`,
        },
        status: Math.random() > 0.1 ? 'success' : Math.random() > 0.5 ? 'failure' : 'warning',
        duration: Math.floor(Math.random() * 500),
      });
    }

    setLogs(demoLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    setTotalPages(2);
    setTotalLogs(50);
    setSummary({
      actionStats: [
        { action: 'create', count: 145 },
        { action: 'update', count: 432 },
        { action: 'delete', count: 23 },
        { action: 'view', count: 876 },
        { action: 'login', count: 234 },
      ],
      entityStats: [
        { entity: 'User', count: 234 },
        { entity: 'Invoice', count: 567 },
        { entity: 'Product', count: 345 },
      ],
      recentActivity24h: 156,
      totalLogs: 50,
      failedAttempts: 12,
      uniqueUsers: 28,
    });
    setActionTypes(['create', 'update', 'delete', 'view', 'login', 'logout', 'export', 'permission']);
    setEntities(['User', 'Invoice', 'Product', 'Report', 'Session', 'Role', 'Settings']);
    setUsers([
      { id: '1', name: 'Rajesh Kumar' },
      { id: '2', name: 'Priya Sharma' },
      { id: '3', name: 'Amit Patel' },
      { id: '4', name: 'System' },
    ]);
  };

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  // Register with global refresh context
  usePageRefresh('audit', () => fetchAudit(true));

  const handleClearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      user: '',
      actionType: '',
      entity: '',
      status: '',
      ipAddress: '',
    });
    setCurrentPage(1);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`${baseURL}/api/enterprise-admin/audit/export?format=${format}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // Fallback: export current page data
      const exportData = format === 'json' ? JSON.stringify(logs, null, 2) : logs.map(l => 
        `${l.timestamp},${l.actor.name},${l.action},${l.ipAddress},${l.resource.type},${l.status}`
      ).join('\n');
      
      const blob = new Blob([exportData], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Filter logs locally (for demo/fallback)
  const filteredLogs = logs.filter((log) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matches = 
        log.actor.name.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        log.resource.type.toLowerCase().includes(searchLower) ||
        log.ipAddress.includes(filters.search);
      if (!matches) return false;
    }
    if (filters.actionType && log.actionType !== filters.actionType) return false;
    if (filters.entity && log.resource.type !== filters.entity) return false;
    if (filters.status && log.status !== filters.status) return false;
    if (filters.ipAddress && !log.ipAddress.includes(filters.ipAddress)) return false;
    if (filters.user && log.actor.id !== filters.user) return false;
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      if (new Date(log.timestamp) < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59);
      if (new Date(log.timestamp) > to) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-violet-500" />
              Audit & Security Logs
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Track all system activities, user actions, and security events
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => fetchAudit(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isDataRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {err && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            {err}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Events"
            value={summary?.totalLogs?.toLocaleString() || '—'}
            icon={FileText}
            color="#8b5cf6"
          />
          <SummaryCard
            title="Last 24 Hours"
            value={summary?.recentActivity24h?.toLocaleString() || '—'}
            icon={Clock}
            color="#06b6d4"
            trend={{ value: 12, label: 'vs yesterday' }}
          />
          <SummaryCard
            title="Failed Attempts"
            value={summary?.failedAttempts?.toLocaleString() || '—'}
            icon={AlertTriangle}
            color="#ef4444"
          />
          <SummaryCard
            title="Unique Users"
            value={summary?.uniqueUsers?.toLocaleString() || '—'}
            icon={User}
            color="#22c55e"
          />
        </div>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          actionTypes={actionTypes}
          entities={entities}
          users={users}
        />

        {/* Main Content */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading audit logs...</p>
          </div>
        ) : (
          <>
            {/* Logs Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <AuditLogRow
                          key={log.id}
                          log={log}
                          onViewDetails={setSelectedLog}
                        />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          No audit logs found matching your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalLogs)} of {totalLogs} entries
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Log Detail Modal */}
        <AnimatePresence>
          {selectedLog && (
            <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
