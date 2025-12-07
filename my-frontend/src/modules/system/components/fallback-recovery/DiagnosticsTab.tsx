/**
 * Diagnostics Tab
 * System health overview, crash logs viewer, and quick diagnostic checks
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Activity,
  Database,
  Server,
  HardDrive,
  Wifi,
  Play,
  ChevronDown,
  ChevronUp,
} from '@/lib/ssr-safe-icons';
import {
  getHealthSummary,
  runFullHealthCheck,
  getCrashLogs,
  pingService,
  getCurrentIncident,
} from '@/services/fallbackService';
import type { 
  ServiceHealthStatus, 
  HealthStatus, 
  CrashLogEntry,
  PingResult,
} from '@/types/fallback';

// Health status indicator component
function HealthStatusIndicator({ status }: { status: HealthStatus }) {
  const config = {
    ok: { bg: 'bg-green-500', pulse: false, label: 'Healthy' },
    degraded: { bg: 'bg-yellow-500', pulse: true, label: 'Degraded' },
    down: { bg: 'bg-red-500', pulse: true, label: 'Down' },
    unknown: { bg: 'bg-gray-400', pulse: false, label: 'Unknown' },
  }[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${config.bg} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className={`text-sm font-medium ${
        status === 'ok' ? 'text-green-700 dark:text-green-300' :
        status === 'degraded' ? 'text-yellow-700 dark:text-yellow-300' :
        status === 'down' ? 'text-red-700 dark:text-red-300' :
        'text-gray-600 dark:text-gray-400'
      }`}>
        {config.label}
      </span>
    </div>
  );
}

// Service health card component
function ServiceHealthCard({ service }: { service: ServiceHealthStatus }) {
  const getIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'api': return Activity;
      case 'database': return Database;
      case 'cache': return Server;
      case 'queue': return Server;
      case 'storage': return HardDrive;
      default: return Server;
    }
  };

  const Icon = getIcon(service.name);

  const getBgColor = (status: HealthStatus) => {
    switch (status) {
      case 'ok': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'degraded': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'down': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600';
    }
  };

  const formatLatency = (latency?: number) => {
    if (latency === undefined) return '—';
    return `${latency}ms`;
  };

  const formatLastChecked = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);

      if (diffSecs < 60) return `${diffSecs}s ago`;
      if (diffMins < 60) return `${diffMins}m ago`;
      return date.toLocaleTimeString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getBgColor(service.status)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            service.status === 'ok' ? 'bg-green-100 dark:bg-green-900/40' :
            service.status === 'degraded' ? 'bg-yellow-100 dark:bg-yellow-900/40' :
            service.status === 'down' ? 'bg-red-100 dark:bg-red-900/40' :
            'bg-gray-100 dark:bg-gray-600'
          }`}>
            <Icon className={`w-5 h-5 ${
              service.status === 'ok' ? 'text-green-600 dark:text-green-400' :
              service.status === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
              service.status === 'down' ? 'text-red-600 dark:text-red-400' :
              'text-gray-600 dark:text-gray-400'
            }`} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {service.displayName || service.name}
            </h4>
            <HealthStatusIndicator status={service.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Latency</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{formatLatency(service.latency)}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Last Checked</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{formatLastChecked(service.lastChecked)}</p>
        </div>
      </div>

      {service.message && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 pt-2">
          {service.message}
        </p>
      )}
    </div>
  );
}

// Crash log entry component
function CrashLogEntryComponent({ log }: { log: CrashLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'fatal': return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30';
      case 'error': return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30';
      case 'warn': return 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700';
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getLevelColor(log.level)}`}>
            {log.level.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatTimestamp(log.timestamp)}
          </span>
          <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
            {log.message}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="p-4 bg-gray-900 dark:bg-gray-950">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs">
              {log.service && (
                <div>
                  <span className="text-gray-500">Service:</span>
                  <span className="ml-1 text-gray-300">{log.service}</span>
                </div>
              )}
              {log.requestId && (
                <div>
                  <span className="text-gray-500">Request ID:</span>
                  <span className="ml-1 text-gray-300 font-mono">{log.requestId}</span>
                </div>
              )}
              {log.userId && (
                <div>
                  <span className="text-gray-500">User ID:</span>
                  <span className="ml-1 text-gray-300">{log.userId}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-200 mb-2">{log.message}</p>
              {log.stack && (
                <pre className="text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap bg-black/30 p-3 rounded">
                  {log.stack}
                </pre>
              )}
            </div>

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div>
                <span className="text-xs text-gray-500">Metadata:</span>
                <pre className="text-xs text-gray-400 font-mono mt-1 overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Ping result component
function PingResultDisplay({ service, result, loading }: { service: string; result: PingResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Pinging...
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className={`flex items-center gap-2 text-sm ${
      result.status === 'ok' ? 'text-green-600 dark:text-green-400' :
      result.status === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
      'text-red-600 dark:text-red-400'
    }`}>
      {result.status === 'ok' ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      <span>{result.latency}ms</span>
      {result.message && <span className="text-gray-500">- {result.message}</span>}
    </div>
  );
}

// Toast component
function Toast({ 
  type, 
  message, 
  onClose 
}: { 
  type: 'success' | 'error'; 
  message: string; 
  onClose: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`
      fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
      ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
    `}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">×</button>
    </div>
  );
}

export default function DiagnosticsTab() {
  // State
  const [services, setServices] = useState<ServiceHealthStatus[]>([]);
  const [overallStatus, setOverallStatus] = useState<HealthStatus>('unknown');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Health check state
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);

  // Crash logs state
  const [crashLogs, setCrashLogs] = useState<CrashLogEntry[]>([]);
  const [crashLogsLoading, setCrashLogsLoading] = useState(false);
  const [crashLogsError, setCrashLogsError] = useState<string | null>(null);
  const [currentIncidentId, setCurrentIncidentId] = useState<string | null>(null);

  // Ping states
  const [pingResults, setPingResults] = useState<Record<string, PingResult | null>>({});
  const [pingLoading, setPingLoading] = useState<Record<string, boolean>>({});

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch health summary
  const fetchHealthSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getHealthSummary();
      setServices(response.services || []);
      setOverallStatus(response.overall);
      setLastChecked(response.timestamp);
    } catch (err) {
      console.error('Failed to fetch health summary:', err);
      setError('Failed to load system health. Please try again.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch current incident for crash logs
  const fetchCurrentIncident = useCallback(async () => {
    try {
      const response = await getCurrentIncident();
      if (response.hasActiveIncident && response.incident) {
        setCurrentIncidentId(response.incident.id);
      } else {
        setCurrentIncidentId(null);
      }
    } catch (err) {
      console.error('Failed to fetch current incident:', err);
      setCurrentIncidentId(null);
    }
  }, []);

  useEffect(() => {
    fetchHealthSummary();
    fetchCurrentIncident();
  }, [fetchHealthSummary, fetchCurrentIncident]);

  // Run full health check
  const handleFullHealthCheck = async () => {
    setHealthCheckLoading(true);
    try {
      const result = await runFullHealthCheck();
      setServices(result.services || []);
      setOverallStatus(result.overall);
      setLastChecked(result.timestamp);
      
      if (result.success) {
        setToast({ type: 'success', message: 'Health check completed successfully' });
      } else {
        setToast({ type: 'error', message: 'Health check completed with issues' });
      }
    } catch (err: any) {
      console.error('Health check failed:', err);
      setToast({ type: 'error', message: err?.message || 'Health check failed' });
    } finally {
      setHealthCheckLoading(false);
    }
  };

  // Load crash logs
  const handleLoadCrashLogs = async () => {
    if (!currentIncidentId) {
      setCrashLogsError('No active incident to load crash logs for.');
      return;
    }

    setCrashLogsLoading(true);
    setCrashLogsError(null);
    try {
      const response = await getCrashLogs(currentIncidentId);
      setCrashLogs(response.logs || []);
      if (response.logs.length === 0) {
        setCrashLogsError('No crash logs available for this incident.');
      }
    } catch (err: any) {
      console.error('Failed to load crash logs:', err);
      setCrashLogsError(err?.message || 'Failed to load crash logs.');
      setCrashLogs([]);
    } finally {
      setCrashLogsLoading(false);
    }
  };

  // Ping service
  const handlePingService = async (service: 'database' | 'cache' | 'storage' | 'queue') => {
    setPingLoading(prev => ({ ...prev, [service]: true }));
    try {
      const result = await pingService(service);
      setPingResults(prev => ({ ...prev, [service]: result }));
    } catch (err: any) {
      console.error(`Ping ${service} failed:`, err);
      setPingResults(prev => ({ 
        ...prev, 
        [service]: { 
          service, 
          status: 'down', 
          latency: 0, 
          message: err?.message || 'Ping failed' 
        } 
      }));
    } finally {
      setPingLoading(prev => ({ ...prev, [service]: false }));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Failed to Load Diagnostics
        </h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchHealthSummary}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section A: System Health Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              System Health Overview
            </h3>
            {lastChecked && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last checked: {new Date(lastChecked).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Overall:</span>
              <HealthStatusIndicator status={overallStatus} />
            </div>
            <button
              onClick={handleFullHealthCheck}
              disabled={healthCheckLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {healthCheckLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {healthCheckLoading ? 'Checking...' : 'Run Full Health Check'}
            </button>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Service Data Available
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              Run a health check to see service status.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => (
              <ServiceHealthCard key={service.name} service={service} />
            ))}
          </div>
        )}
      </div>

      {/* Section B: Crash Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Crash Logs
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentIncidentId 
                ? `Viewing logs for incident: ${currentIncidentId.slice(0, 8)}...` 
                : 'No active incident detected'
              }
            </p>
          </div>
          <button
            onClick={handleLoadCrashLogs}
            disabled={crashLogsLoading || !currentIncidentId}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {crashLogsLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
            {crashLogsLoading ? 'Loading...' : 'Load Crash Logs'}
          </button>
        </div>

        {crashLogsError && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">{crashLogsError}</p>
          </div>
        )}

        {crashLogs.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {crashLogs.map((log) => (
              <CrashLogEntryComponent key={log.id} log={log} />
            ))}
          </div>
        ) : !crashLogsError && !crashLogsLoading && (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Crash Logs Loaded
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              {currentIncidentId 
                ? 'Click "Load Crash Logs" to view logs for the current incident.'
                : 'There is no active incident. Crash logs are only available during incidents.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Section C: Quick Checks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Connectivity Checks
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Test connectivity to individual services to diagnose issues.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['database', 'cache', 'storage', 'queue'] as const).map((service) => (
            <div key={service} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {service}
                </h4>
                <button
                  onClick={() => handlePingService(service)}
                  disabled={pingLoading[service]}
                  className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-colors"
                >
                  {pingLoading[service] ? 'Pinging...' : 'Ping'}
                </button>
              </div>
              <PingResultDisplay
                service={service}
                result={pingResults[service] || null}
                loading={pingLoading[service] || false}
              />
              {!pingResults[service] && !pingLoading[service] && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Click "Ping" to test connectivity
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
