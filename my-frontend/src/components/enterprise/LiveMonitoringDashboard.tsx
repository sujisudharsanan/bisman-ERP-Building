'use client';

/**
 * BISMAN ERP - Live Monitoring Dashboard
 * Enterprise Admin - Real-time System & Tenant Metrics
 * 
 * Displays:
 * - System health status
 * - Database metrics
 * - HTTP/API metrics
 * - Per-tenant usage and error rates
 * - Rate limiting stats
 * - Backup status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  Server,
  Users,
  Shield,
  Cpu,
  HardDrive,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertOctagon,
  Zap,
  BarChart3,
  Timer,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DbHealth {
  healthy: boolean;
  lastHealthCheck: number | null;
  activeConnections: number;
  poolSize: number;
  recentErrorCount: number;
  avgQueryDurationMs: number;
  slowQueryCount: number;
  errors: Array<{
    timestamp: number;
    error: string;
    code?: string;
  }>;
}

interface HttpMetrics {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgResponseTime: number;
  rateLimitHits: number;
  recentErrors: Array<{
    timestamp: number;
    path: string;
    status: number;
    method: string;
    tenantId: string;
  }>;
  topPaths: Array<{
    path: string;
    count: number;
    errors: number;
    errorRate: number;
    avgDuration: number;
  }>;
  errorsByStatus: Record<number, number>;
}

interface SystemMetrics {
  cpu: {
    current: number;
    average: number;
    max: number;
  };
  memory: {
    current: number;
    average: number;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
  };
  eventLoop: {
    current: number;
    average: number;
    max: number;
  };
  uptime: number;
  nodeVersion: string;
  platform: string;
  hostname: string;
}

interface BackupStatus {
  lastRun: number | null;
  lastSuccess: number | null;
  lastFailure: number | null;
  isStale: boolean;
  staleThresholdHours: number;
  recentFailures: Array<{
    timestamp: number;
    success: boolean;
  }>;
}

interface SentryMetrics {
  newIssuesCount: number;
  unresolvedCount: number;
  recentIssues: Array<{
    timestamp: number;
    issueId: string;
    title: string;
    level: string;
  }>;
}

interface TenantMetrics {
  tenantId: string;
  requests: number;
  errors: number;
  errorRate: number;
  avgResponseTime: number;
  lastActivity: number | null;
}

interface MonitoringSummary {
  timestamp: number;
  database: DbHealth;
  http: HttpMetrics;
  system: SystemMetrics;
  backup: BackupStatus;
  sentry: SentryMetrics;
  tenants: TenantMetrics[];
  thresholds: {
    dbConnectionErrorRate: number;
    http5xxRate: number;
    rateLimitHitsPerMinute: number;
    cpuUsagePercent: number;
    memoryUsagePercent: number;
    eventLoopLagMs: number;
    backupMaxAgeHours: number;
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatTimestamp = (ts: number): string => {
  return new Date(ts).toLocaleString();
};

const getStatusColor = (value: number, warning: number, critical: number): string => {
  if (value >= critical) return 'text-red-500';
  if (value >= warning) return 'text-yellow-500';
  return 'text-green-500';
};

const getStatusBg = (value: number, warning: number, critical: number): string => {
  if (value >= critical) return 'bg-red-500/10 border-red-500/30';
  if (value >= warning) return 'bg-yellow-500/10 border-yellow-500/30';
  return 'bg-green-500/10 border-green-500/30';
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Global refreshing overlay for data sections
const RefreshingOverlay: React.FC<{ isRefreshing: boolean; children: React.ReactNode }> = ({ 
  isRefreshing, 
  children 
}) => (
  <div className="relative">
    {children}
    {isRefreshing && (
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] rounded-xl flex items-center justify-center z-10 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 rounded-full border border-slate-700">
          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-xs text-slate-300">Updating...</span>
        </div>
      </div>
    )}
  </div>
);

const StatusBadge: React.FC<{ healthy: boolean; label?: string }> = ({ healthy, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
    healthy 
      ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
      : 'bg-red-500/10 text-red-400 border border-red-500/30'
  }`}>
    {healthy ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
    {label || (healthy ? 'Healthy' : 'Unhealthy')}
  </span>
);

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  status?: 'healthy' | 'warning' | 'critical';
  trend?: { direction: 'up' | 'down'; value: number };
}> = ({ title, value, subtitle, icon, status = 'healthy', trend }) => {
  const statusColors = {
    healthy: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    critical: 'border-red-500/30 bg-red-500/5',
  };
  
  const iconColors = {
    healthy: 'text-green-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${statusColors[status]}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg bg-slate-800 ${iconColors[status]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend.direction === 'up' ? 'text-red-400' : 'text-green-400'
          }`}>
            {trend.direction === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-slate-400">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{
  value: number;
  max?: number;
  warning?: number;
  critical?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}> = ({ value, max = 100, warning = 70, critical = 85, showLabel = true, size = 'md' }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const color = percentage >= critical ? 'bg-red-500' : percentage >= warning ? 'bg-yellow-500' : 'bg-green-500';
  
  return (
    <div className="w-full">
      <div className={`w-full bg-slate-700 rounded-full overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}>
        <div 
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-slate-400 mt-1">{value.toFixed(1)}%</p>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LiveMonitoringDashboard() {
  const [data, setData] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get backend URL from environment or use relative path
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchMetrics = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/monitoring/summary`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please log in');
        }
        if (response.status === 403) {
          throw new Error('Access denied - Admin privileges required');
        }
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [API_BASE_URL]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, autoRefresh, refreshInterval]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-slate-400">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertOctagon className="w-12 h-12 text-red-400" />
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const thresholds = data?.thresholds || {
    cpuUsagePercent: 80,
    memoryUsagePercent: 85,
    http5xxRate: 0.05,
    rateLimitHitsPerMinute: 100,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Live Monitoring Dashboard</h1>
            {isRefreshing && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Refreshing...
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm">
            Last updated: {lastRefresh.toLocaleTimeString()} 
            {autoRefresh && <span className="ml-2 text-green-400">• Auto-refresh ON</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600"
            />
            <span className="text-slate-400">Auto-refresh</span>
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
          </select>
          <button
            onClick={fetchMetrics}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Health Status Row - with global refresh overlay */}
      <RefreshingOverlay isRefreshing={isRefreshing}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`rounded-xl border p-4 ${
            data?.database.healthy 
              ? 'border-green-500/30 bg-green-500/5' 
              : 'border-red-500/30 bg-red-500/5'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className={`w-5 h-5 ${data?.database.healthy ? 'text-green-400' : 'text-red-400'}`} />
                <span className="font-medium">Database</span>
              </div>
              <StatusBadge healthy={data?.database.healthy || false} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-400">Connections</p>
                <p className="font-medium">{data?.database.activeConnections || 0}</p>
              </div>
              <div>
                <p className="text-slate-400">Avg Query</p>
                <p className="font-medium">{data?.database.avgQueryDurationMs || 0}ms</p>
              </div>
              <div>
                <p className="text-slate-400">Slow Queries</p>
                <p className={`font-medium ${(data?.database.slowQueryCount || 0) > 5 ? 'text-yellow-400' : ''}`}>
                  {data?.database.slowQueryCount || 0}
                </p>
            </div>
            <div>
              <p className="text-slate-400">Errors (5m)</p>
              <p className={`font-medium ${(data?.database.recentErrorCount || 0) > 0 ? 'text-red-400' : ''}`}>
                {data?.database.recentErrorCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${
          (data?.http.errorRate || 0) < thresholds.http5xxRate
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="font-medium">API Health</span>
            </div>
            <StatusBadge 
              healthy={(data?.http.errorRate || 0) < thresholds.http5xxRate} 
              label={`${((data?.http.errorRate || 0) * 100).toFixed(2)}% errors`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-slate-400">Total Requests</p>
              <p className="font-medium">{(data?.http.totalRequests || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-400">Avg Response</p>
              <p className="font-medium">{data?.http.avgResponseTime || 0}ms</p>
            </div>
            <div>
              <p className="text-slate-400">5xx Errors</p>
              <p className={`font-medium ${(data?.http.totalErrors || 0) > 0 ? 'text-red-400' : ''}`}>
                {data?.http.totalErrors || 0}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Rate Limits</p>
              <p className={`font-medium ${(data?.http.rateLimitHits || 0) > 50 ? 'text-yellow-400' : ''}`}>
                {data?.http.rateLimitHits || 0}
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-xl border p-4 ${
          !data?.backup.isStale
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className={`w-5 h-5 ${!data?.backup.isStale ? 'text-green-400' : 'text-red-400'}`} />
              <span className="font-medium">Backup Status</span>
            </div>
            <StatusBadge 
              healthy={!data?.backup.isStale} 
              label={data?.backup.isStale ? 'Stale' : 'Current'}
            />
          </div>
          <div className="text-sm">
            <div className="mb-2">
              <p className="text-slate-400">Last Success</p>
              <p className="font-medium">
                {data?.backup.lastSuccess 
                  ? formatTimestamp(data.backup.lastSuccess)
                  : 'Never'
                }
              </p>
            </div>
            <div>
              <p className="text-slate-400">Max Age Threshold</p>
              <p className="font-medium">{data?.backup.staleThresholdHours || 24} hours</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="font-medium">Sentry Issues</span>
            </div>
            <span className={`text-lg font-bold ${
              (data?.sentry.unresolvedCount || 0) > 10 ? 'text-red-400' : 'text-slate-300'
            }`}>
              {data?.sentry.unresolvedCount || 0}
            </span>
          </div>
          <div className="text-sm">
            <div className="mb-2">
              <p className="text-slate-400">New Issues (1h)</p>
              <p className={`font-medium ${(data?.sentry.newIssuesCount || 0) > 5 ? 'text-yellow-400' : ''}`}>
                {data?.sentry.newIssuesCount || 0}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Unresolved</p>
              <p className="font-medium">{data?.sentry.unresolvedCount || 0}</p>
            </div>
          </div>
        </div>
        </div>
      </RefreshingOverlay>

      {/* System Resources - with refresh overlay */}
      <RefreshingOverlay isRefreshing={isRefreshing}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span className="font-medium">CPU Usage</span>
          </div>
          <div className="text-3xl font-bold mb-2">
            <span className={getStatusColor(
              data?.system.cpu.current || 0, 
              thresholds.cpuUsagePercent - 10, 
              thresholds.cpuUsagePercent
            )}>
              {(data?.system.cpu.current || 0).toFixed(1)}%
            </span>
          </div>
          <ProgressBar 
            value={data?.system.cpu.current || 0} 
            warning={thresholds.cpuUsagePercent - 10}
            critical={thresholds.cpuUsagePercent}
          />
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-400">
            <div>Avg: {(data?.system.cpu.average || 0).toFixed(1)}%</div>
            <div>Max: {(data?.system.cpu.max || 0).toFixed(1)}%</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-purple-400" />
            <span className="font-medium">Memory Usage</span>
          </div>
          <div className="text-3xl font-bold mb-2">
            <span className={getStatusColor(
              data?.system.memory.current || 0, 
              thresholds.memoryUsagePercent - 10, 
              thresholds.memoryUsagePercent
            )}>
              {(data?.system.memory.current || 0).toFixed(1)}%
            </span>
          </div>
          <ProgressBar 
            value={data?.system.memory.current || 0}
            warning={thresholds.memoryUsagePercent - 10}
            critical={thresholds.memoryUsagePercent}
          />
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-400">
            <div>Used: {formatBytes(data?.system.memory.usedBytes || 0)}</div>
            <div>Total: {formatBytes(data?.system.memory.totalBytes || 0)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-green-400" />
            <span className="font-medium">System Info</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Uptime</span>
              <span className="font-medium">{formatUptime(data?.system.uptime || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Node.js</span>
              <span className="font-medium">{data?.system.nodeVersion || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Platform</span>
              <span className="font-medium">{data?.system.platform || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Event Loop Lag</span>
              <span className={`font-medium ${
                (data?.system.eventLoop.current || 0) > 50 ? 'text-yellow-400' : ''
              }`}>
                {(data?.system.eventLoop.current || 0).toFixed(1)}ms
              </span>
            </div>
          </div>
        </div>
        </div>
      </RefreshingOverlay>

      {/* Per-Tenant Usage - with refresh overlay */}
      <RefreshingOverlay isRefreshing={isRefreshing}>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-lg">Per-Tenant Usage & Error Rates</span>
          </div>
          <span className="text-sm text-slate-400">
            {(data?.tenants || []).length} active tenants
          </span>
        </div>
        
        {(data?.tenants || []).length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No tenant data available yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Tenant ID</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Requests</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Errors</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Error Rate</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Avg Response</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {(data?.tenants || []).slice(0, 10).map((tenant, index) => (
                  <tr 
                    key={tenant.tenantId} 
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${
                      tenant.errorRate > 0.1 ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-xs">{tenant.tenantId}</td>
                    <td className="py-3 px-4 text-right">{tenant.requests.toLocaleString()}</td>
                    <td className={`py-3 px-4 text-right ${tenant.errors > 0 ? 'text-red-400' : ''}`}>
                      {tenant.errors}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        tenant.errorRate > 0.1 
                          ? 'bg-red-500/20 text-red-400' 
                          : tenant.errorRate > 0.05 
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                      }`}>
                        {(tenant.errorRate * 100).toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{tenant.avgResponseTime}ms</td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {tenant.lastActivity 
                        ? new Date(tenant.lastActivity).toLocaleTimeString()
                        : 'N/A'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.tenants || []).length > 10 && (
              <div className="text-center py-3 text-sm text-slate-400">
                Showing 10 of {(data?.tenants || []).length} tenants
              </div>
            )}
          </div>
        )}
        </div>
      </RefreshingOverlay>

      {/* Top API Paths - with refresh overlay */}
      <RefreshingOverlay isRefreshing={isRefreshing}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="font-medium">Top API Endpoints</span>
          </div>
          <div className="space-y-3">
            {(data?.http.topPaths || []).slice(0, 5).map((path, index) => (
              <div key={path.path} className="flex items-center gap-3">
                <span className="text-slate-500 w-4">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono truncate">{path.path}</p>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>{path.count.toLocaleString()} reqs</span>
                    <span>{path.avgDuration}ms avg</span>
                    {path.errors > 0 && (
                      <span className="text-red-400">{path.errors} errors</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="font-medium">Recent Errors</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(data?.http.recentErrors || []).length === 0 ? (
              <div className="text-center py-4 text-slate-500">
                No recent errors 🎉
              </div>
            ) : (
              (data?.http.recentErrors || []).slice(0, 10).map((error, index) => (
                <div key={index} className="flex items-start gap-3 text-sm border-b border-slate-700/50 pb-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    error.status >= 500 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {error.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs truncate">{error.method} {error.path}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </RefreshingOverlay>

      {/* Alert Thresholds Info */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-slate-400" />
          <span className="font-medium">Alert Thresholds</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
          <div>
            <p className="text-slate-400">CPU</p>
            <p className="font-medium">{thresholds.cpuUsagePercent}%</p>
          </div>
          <div>
            <p className="text-slate-400">Memory</p>
            <p className="font-medium">{thresholds.memoryUsagePercent}%</p>
          </div>
          <div>
            <p className="text-slate-400">5xx Rate</p>
            <p className="font-medium">{(thresholds.http5xxRate * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-slate-400">Rate Limits/min</p>
            <p className="font-medium">{thresholds.rateLimitHitsPerMinute}</p>
          </div>
          <div>
            <p className="text-slate-400">Event Loop</p>
            <p className="font-medium">{data?.thresholds?.eventLoopLagMs || 100}ms</p>
          </div>
          <div>
            <p className="text-slate-400">DB Error Rate</p>
            <p className="font-medium">{((data?.thresholds?.dbConnectionErrorRate || 0.01) * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p className="text-slate-400">Backup Age</p>
            <p className="font-medium">{data?.thresholds?.backupMaxAgeHours || 24}h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
