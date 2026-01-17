'use client';

import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Trash2,
  AlertTriangle,
  XCircle,
  Info,
  Bug,
  Clock,
  Server,
  Globe,
  Database,
  Code,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  source: 'api' | 'database' | 'frontend' | 'system' | 'integration';
  message: string;
  stackTrace?: string;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
  resolved: boolean;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockErrors: ErrorLog[] = [
  {
    id: 'ERR001',
    timestamp: '2024-01-20 14:32:15',
    level: 'error',
    source: 'api',
    message: 'Database connection timeout after 30000ms',
    stackTrace: 'Error: Database connection timeout\n    at PoolClient.query (/app/node_modules/pg/lib/client.js:526:17)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)',
    requestId: 'req_abc123xyz',
    endpoint: '/api/reports/generate',
    statusCode: 500,
    resolved: false,
    occurrences: 15,
    firstSeen: '2024-01-20 10:15:00',
    lastSeen: '2024-01-20 14:32:15'
  },
  {
    id: 'ERR002',
    timestamp: '2024-01-20 14:28:42',
    level: 'warning',
    source: 'frontend',
    message: 'Unhandled promise rejection in useEffect cleanup',
    userId: 'user_12345',
    requestId: 'req_def456uvw',
    endpoint: '/dashboard',
    resolved: false,
    occurrences: 8,
    firstSeen: '2024-01-20 09:00:00',
    lastSeen: '2024-01-20 14:28:42'
  },
  {
    id: 'ERR003',
    timestamp: '2024-01-20 14:15:30',
    level: 'error',
    source: 'integration',
    message: 'Payment gateway API returned invalid response format',
    stackTrace: 'ValidationError: Expected object, received undefined\n    at parseResponse (/app/src/services/payment.ts:145:11)',
    requestId: 'req_ghi789rst',
    endpoint: '/api/payments/process',
    statusCode: 502,
    resolved: true,
    occurrences: 3,
    firstSeen: '2024-01-20 14:10:00',
    lastSeen: '2024-01-20 14:15:30'
  },
  {
    id: 'ERR004',
    timestamp: '2024-01-20 13:45:00',
    level: 'info',
    source: 'system',
    message: 'Scheduled job completed with partial failures: 2/50 tasks failed',
    resolved: true,
    occurrences: 1,
    firstSeen: '2024-01-20 13:45:00',
    lastSeen: '2024-01-20 13:45:00'
  },
  {
    id: 'ERR005',
    timestamp: '2024-01-20 12:30:22',
    level: 'error',
    source: 'database',
    message: 'Unique constraint violation on users.email',
    stackTrace: 'Error: duplicate key value violates unique constraint "users_email_key"\n    Detail: Key (email)=(test@example.com) already exists.',
    userId: 'user_67890',
    requestId: 'req_jkl012mno',
    endpoint: '/api/users/register',
    statusCode: 409,
    resolved: false,
    occurrences: 25,
    firstSeen: '2024-01-18 08:00:00',
    lastSeen: '2024-01-20 12:30:22'
  },
  {
    id: 'ERR006',
    timestamp: '2024-01-20 11:00:00',
    level: 'debug',
    source: 'api',
    message: 'Cache miss for key: user_preferences_12345',
    requestId: 'req_pqr345stu',
    endpoint: '/api/preferences',
    statusCode: 200,
    resolved: true,
    occurrences: 150,
    firstSeen: '2024-01-15 00:00:00',
    lastSeen: '2024-01-20 11:00:00'
  }
];

const stats = {
  totalErrors: 256,
  criticalErrors: 12,
  warningsToday: 45,
  resolvedToday: 89
};

// ============================================================================
// Sub-Components
// ============================================================================

function LevelBadge({ level }: { level: ErrorLog['level'] }) {
  const config = {
    error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    warning: { label: 'Warning', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertTriangle },
    info: { label: 'Info', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Info },
    debug: { label: 'Debug', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Bug }
  }[level];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function SourceIcon({ source }: { source: ErrorLog['source'] }) {
  const icons = {
    api: Server,
    database: Database,
    frontend: Globe,
    system: Code,
    integration: ExternalLink
  };
  const Icon = icons[source];
  return <Icon className="w-4 h-4" />;
}

function ExpandableRow({ error }: { error: ErrorLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{error.timestamp}</p>
              <p className="text-xs text-gray-400">{error.requestId}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <LevelBadge level={error.level} />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <SourceIcon source={error.source} />
            <span className="text-sm capitalize text-gray-600 dark:text-gray-300">{error.source}</span>
          </div>
        </td>
        <td className="px-4 py-3 max-w-md">
          <p className="text-sm text-gray-900 dark:text-white truncate">{error.message}</p>
          {error.endpoint && (
            <p className="text-xs text-gray-500 font-mono">{error.endpoint}</p>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm font-medium text-gray-900 dark:text-white">
            {error.occurrences}
          </span>
        </td>
        <td className="px-4 py-3">
          {error.resolved ? (
            <span className="text-green-600 dark:text-green-400 text-xs font-medium">Resolved</span>
          ) : (
            <span className="text-red-600 dark:text-red-400 text-xs font-medium">Open</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Details">
              <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Copy">
              <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Delete">
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && error.stackTrace && (
        <tr className="bg-gray-50 dark:bg-gray-900">
          <td colSpan={7} className="px-4 py-3">
            <div className="ml-6">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Stack Trace:</p>
              <pre className="text-xs bg-gray-800 text-gray-200 p-3 rounded-lg overflow-x-auto font-mono">
                {error.stackTrace}
              </pre>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>First seen: {error.firstSeen}</span>
                <span>Last seen: {error.lastSeen}</span>
                {error.userId && <span>User: {error.userId}</span>}
                {error.statusCode && <span>Status: {error.statusCode}</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ErrorLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredErrors = useMemo(() => {
    return mockErrors.filter(error => {
      const matchesSearch =
        error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        error.requestId?.toLowerCase().includes(searchQuery.toLowerCase() || '') ||
        error.endpoint?.toLowerCase().includes(searchQuery.toLowerCase() || '');
      const matchesLevel = levelFilter === 'all' || error.level === levelFilter;
      const matchesSource = sourceFilter === 'all' || error.source === sourceFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'resolved' ? error.resolved : !error.resolved);
      return matchesSearch && matchesLevel && matchesSource && matchesStatus;
    });
  }, [searchQuery, levelFilter, sourceFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error Logs</h1>
            <p className="text-gray-500 dark:text-gray-400">Monitor and debug system errors</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalErrors}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Errors</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <XCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.criticalErrors}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Critical Errors</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.warningsToday}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Warnings Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Info className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolvedToday}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Resolved Today</p>
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
              placeholder="Search by message, request ID, or endpoint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Sources</option>
            <option value="api">API</option>
            <option value="database">Database</option>
            <option value="frontend">Frontend</option>
            <option value="system">System</option>
            <option value="integration">Integration</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Error Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Message</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredErrors.map((error) => (
                <ExpandableRow key={error.id} error={error} />
              ))}
            </tbody>
          </table>

          {filteredErrors.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No error logs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
