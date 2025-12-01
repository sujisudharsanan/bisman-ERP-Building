'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Filter, 
  RefreshCw, 
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Activity,
  TrendingUp,
  XCircle,
  Eye,
  Check,
  Download,
  Trash2
} from 'lucide-react';

// Types
interface FallbackLog {
  id: number;
  module_name: string;
  operation_name: string;
  error_message: string;
  error_code: string | null;
  user_id: string | null;
  request_payload: any;
  response_type: string;
  severity: 'info' | 'warning' | 'critical' | 'alert';
  fallback_triggered_at: string;
  created_at: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

interface FallbackStats {
  timeRange: string;
  hourlyBreakdown: Array<{
    module_name: string;
    operation_name: string;
    severity: string;
    hour: string;
    count: number;
  }>;
  moduleSummary: Array<{
    module_name: string;
    total: number;
    critical_count: number;
    warning_count: number;
    resolved_count: number;
  }>;
  memoryStats: {
    counters: Record<string, { count: number; windowStarted: string; windowMinutesElapsed: number }>;
    pendingLogs: number;
    cacheSize: number;
    alertThreshold: number;
    alertWindowMinutes: number;
  };
}

interface FallbackAlert {
  id: number;
  module_name: string;
  operation_name: string;
  fallback_count: number;
  window_minutes: number;
  alert_message: string;
  alert_triggered_at: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function FallbackLogsPage() {
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [logs, setLogs] = useState<FallbackLog[]>([]);
  const [stats, setStats] = useState<FallbackStats | null>(null);
  const [alerts, setAlerts] = useState<FallbackAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);
  
  // Filters
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected items for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // View mode
  const [viewMode, setViewMode] = useState<'logs' | 'stats' | 'alerts'>('logs');
  
  // Resolution modal
  const [resolvingLog, setResolvingLog] = useState<FallbackLog | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(moduleFilter && { module_name: moduleFilter }),
        ...(severityFilter && { severity: severityFilter }),
        ...(resolvedFilter && { resolved: resolvedFilter }),
      });
      
      const res = await fetch(`${API_BASE}/api/fallback-logs?${params}`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to fetch logs');
      
      const data = await res.json();
      setLogs(data.data?.logs || []);
      setTotalPages(data.data?.pagination?.totalPages || 1);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, page, limit, moduleFilter, severityFilter, resolvedFilter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/fallback-logs/stats?hours=24`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to fetch stats');
      
      const data = await res.json();
      setStats(data.data);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    }
  }, [isAuthenticated]);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/fallback-logs/alerts`, {
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to fetch alerts');
      
      const data = await res.json();
      setAlerts(data.data || []);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
    }
  }, [isAuthenticated]);

  // Resolve log
  const resolveLog = async (id: number, notes: string) => {
    if (!isAuthenticated) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/fallback-logs/${id}/resolve`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resolution_notes: notes })
      });
      
      if (!res.ok) throw new Error('Failed to resolve log');
      
      setResolvingLog(null);
      setResolutionNotes('');
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Bulk resolve
  const bulkResolve = async () => {
    if (!isAuthenticated || selectedIds.length === 0) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/fallback-logs/bulk-resolve`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, resolution_notes: 'Bulk resolved' })
      });
      
      if (!res.ok) throw new Error('Failed to bulk resolve');
      
      setSelectedIds([]);
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (id: number) => {
    if (!isAuthenticated) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/fallback-logs/alerts/${id}/acknowledge`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to acknowledge alert');
      
      fetchAlerts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchAlerts();
  }, [fetchLogs, fetchStats, fetchAlerts]);

  // Severity badge component
  const SeverityBadge = ({ severity }: { severity: string }) => {
    const styles: Record<string, string> = {
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      alert: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    
    const icons: Record<string, React.ReactNode> = {
      info: <Activity className="w-3 h-3" />,
      warning: <AlertTriangle className="w-3 h-3" />,
      critical: <XCircle className="w-3 h-3" />,
      alert: <AlertCircle className="w-3 h-3" />
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[severity] || styles.info}`}>
        {icons[severity]}
        {severity.toUpperCase()}
      </span>
    );
  };

  // Stats cards
  const StatsCards = () => {
    if (!stats) return null;
    
    const totalFallbacks = stats.moduleSummary.reduce((sum, m) => sum + m.total, 0);
    const criticalCount = stats.moduleSummary.reduce((sum, m) => sum + m.critical_count, 0);
    const resolvedCount = stats.moduleSummary.reduce((sum, m) => sum + m.resolved_count, 0);
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Fallbacks (24h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalFallbacks}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical Issues</p>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Alerts</p>
              <p className="text-2xl font-bold text-purple-600">{unacknowledgedAlerts}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>
    );
  };

  // Module summary table
  const ModuleSummary = () => {
    if (!stats?.moduleSummary.length) return null;
    
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Module Summary (24h)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Module</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Critical</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Warning</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Resolved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stats.moduleSummary.map((module, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{module.module_name}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-300">{module.total}</td>
                  <td className="px-4 py-3 text-sm text-center text-red-600">{module.critical_count}</td>
                  <td className="px-4 py-3 text-sm text-center text-yellow-600">{module.warning_count}</td>
                  <td className="px-4 py-3 text-sm text-center text-green-600">{module.resolved_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Alerts list
  const AlertsList = () => (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Alerts</h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>No active alerts</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className={`w-4 h-4 ${alert.acknowledged ? 'text-gray-400' : 'text-purple-500'}`} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {alert.module_name}:{alert.operation_name}
                    </span>
                    {alert.acknowledged && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Acknowledged</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{alert.alert_message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(alert.alert_triggered_at).toLocaleString()}
                  </p>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Logs table
  const LogsTable = () => (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600"
            >
              <option value="">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="alert">Alert</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600"
            >
              <option value="">All Status</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>
          
          <div className="flex-1" />
          
          <button
            onClick={fetchLogs}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          
          {selectedIds.length > 0 && (
            <button
              onClick={bulkResolve}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Resolve Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(logs.filter(l => !l.resolved).map(l => l.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Module</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Operation</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Error</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.map(log => (
              <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700 ${log.resolved ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  {!log.resolved && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(log.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, log.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== log.id));
                        }
                      }}
                      className="rounded"
                    />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.fallback_triggered_at).toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{log.module_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.operation_name}</td>
                <td className="px-4 py-3"><SeverityBadge severity={log.severity} /></td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={log.error_message}>
                  {log.error_message}
                </td>
                <td className="px-4 py-3">
                  {log.resolved ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-orange-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Open
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!log.resolved && (
                    <button
                      onClick={() => setResolvingLog(log)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Resolution modal
  const ResolutionModal = () => {
    if (!resolvingLog) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Resolve Fallback Log
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            <strong>{resolvingLog.module_name}:{resolvingLog.operation_name}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-4">{resolvingLog.error_message}</p>
          
          <textarea
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Resolution notes (optional)"
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-gray-600 mb-4"
            rows={3}
          />
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setResolvingLog(null);
                setResolutionNotes('');
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => resolveLog(resolvingLog.id, resolutionNotes)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Mark as Resolved
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fallback Logs Monitor</h1>
        <p className="text-gray-600 dark:text-gray-400">Track and manage system fallback events</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <StatsCards />

      {/* View Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setViewMode('logs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === 'logs' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Logs
        </button>
        <button
          onClick={() => setViewMode('stats')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === 'stats' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Statistics
        </button>
        <button
          onClick={() => setViewMode('alerts')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            viewMode === 'alerts' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Alerts
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {alerts.filter(a => !a.acknowledged).length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {viewMode === 'logs' && <LogsTable />}
          {viewMode === 'stats' && <ModuleSummary />}
          {viewMode === 'alerts' && <AlertsList />}
        </>
      )}

      {/* Resolution Modal */}
      <ResolutionModal />
    </div>
  );
}
