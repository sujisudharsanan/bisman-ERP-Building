/**
 * System Health & Performance Dashboard
 * BISMAN ERP - Infrastructure & Performance Overview
 * 
 * Full-featured admin dashboard showing:
 * - Live system metrics
 * - Implementation status
 * - Performance charts
 * - Real-time alerts
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Gauge,
  Server,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  RefreshCw,
  Download,
  Edit,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type FeatureStatus = 'implemented' | 'in_progress' | 'not_started';
type MetricStatus = 'healthy' | 'warning' | 'critical';
type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
type TrendDirection = 'up' | 'down' | 'stable';

interface MetricSummary {
  name: string;
  value: number;
  unit: string;
  status: MetricStatus;
  trend: TrendDirection;
  trendValue: number; // percentage change
  threshold: {
    warning: number;
    critical: number;
  };
  icon: React.ReactNode;
}

interface ImplementationFeature {
  id: string;
  name: string;
  status: FeatureStatus;
  lastCheckedAt: string;
  details: string;
  category: 'performance' | 'reliability' | 'security' | 'monitoring';
  configPath?: string;
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  label?: string;
}

interface AlertEvent {
  id: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  source: string;
  resolved: boolean;
}

interface SystemHealthData {
  metricsSummary: MetricSummary[];
  implementationFeatures: ImplementationFeature[];
  latencySeries: TimeSeriesPoint[];
  errorRateSeries: TimeSeriesPoint[];
  alerts: AlertEvent[];
  systemInfo: {
    uptime: string;
    lastBackup: string;
    backupLocation: string;
    nodeVersion: string;
    databaseSize: string;
  };
}

interface SystemConfig {
  thresholds: {
    latency: { warning: number; critical: number };
    p95Latency: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
    cacheHitRate: { warning: number; critical: number };
    slowQueries: { warning: number; critical: number };
    cpuUsage: { warning: number; critical: number };
    memoryUsage: { warning: number; critical: number };
  };
  backupLocation: string;
  refreshInterval: number;
}

// ============================================================================
// MOCK DATA (Replace with API calls)
// ============================================================================

const mockSystemHealth = (): SystemHealthData => ({
  metricsSummary: [
    {
      name: 'Avg API Latency',
      value: 245,
      unit: 'ms',
      status: 'healthy',
      trend: 'down',
      trendValue: -12.5,
      threshold: { warning: 400, critical: 800 },
      icon: <Activity className="w-5 h-5" />,
    },
    {
      name: 'P95 Latency',
      value: 456,
      unit: 'ms',
      status: 'healthy',
      trend: 'down',
      trendValue: -8.3,
      threshold: { warning: 500, critical: 1000 },
      icon: <Gauge className="w-5 h-5" />,
    },
    {
      name: 'Error Rate',
      value: 0.12,
      unit: '%',
      status: 'healthy',
      trend: 'stable',
      trendValue: 0.02,
      threshold: { warning: 1, critical: 5 },
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      name: 'Redis Cache Hit Rate',
      value: 98.5,
      unit: '%',
      status: 'healthy',
      trend: 'up',
      trendValue: 2.1,
      threshold: { warning: 90, critical: 80 },
      icon: <Database className="w-5 h-5" />,
    },
    {
      name: 'Slow Queries',
      value: 3,
      unit: 'queries',
      status: 'warning',
      trend: 'up',
      trendValue: 50,
      threshold: { warning: 5, critical: 10 },
      icon: <Clock className="w-5 h-5" />,
    },
    {
      name: 'CPU Usage',
      value: 45.2,
      unit: '%',
      status: 'healthy',
      trend: 'stable',
      trendValue: 1.2,
      threshold: { warning: 70, critical: 90 },
      icon: <Server className="w-5 h-5" />,
    },
    {
      name: 'Memory Usage',
      value: 62.8,
      unit: '%',
      status: 'healthy',
      trend: 'up',
      trendValue: 5.4,
      threshold: { warning: 80, critical: 95 },
      icon: <Server className="w-5 h-5" />,
    },
  ],
  implementationFeatures: [
    {
      id: 'redis-cache',
      name: 'Redis Caching',
      status: 'implemented',
      lastCheckedAt: new Date().toISOString(),
      details: 'Session storage, query cache, rate limiting storage',
      category: 'performance',
      configPath: '/api/config/redis',
    },
    {
      id: 'cdn-cloudflare',
      name: 'CDN / Cloudflare',
      status: 'implemented',
      lastCheckedAt: new Date().toISOString(),
      details: 'Rate limiting (5 rules), DDoS protection, static asset caching',
      category: 'performance',
      configPath: '/api/config/cloudflare',
    },
    {
      id: 'rate-limiting',
      name: 'Rate Limiting',
      status: 'implemented',
      lastCheckedAt: new Date().toISOString(),
      details: 'Multi-tier protection: Cloudflare + Backend (login: 5/15min, API: 100/5min)',
      category: 'security',
      configPath: '/api/config/rate-limit',
    },
    {
      id: 'monitoring',
      name: 'Monitoring & Alerting',
      status: 'in_progress',
      lastCheckedAt: new Date().toISOString(),
      details: 'Database health checks enabled. Prometheus/Grafana setup pending.',
      category: 'monitoring',
      configPath: '/api/config/monitoring',
    },
    {
      id: 'load-testing',
      name: 'Load Testing (k6)',
      status: 'implemented',
      lastCheckedAt: new Date().toISOString(),
      details: 'K6 scripts for login, dashboard. Last test: P95=456ms, P99=892ms',
      category: 'monitoring',
      configPath: '/api/config/load-testing',
    },
    {
      id: 'db-optimization',
      name: 'DB Slow Query Logging & Indexing',
      status: 'implemented',
      lastCheckedAt: new Date().toISOString(),
      details: 'Slow query log enabled (>100ms). Index audit system deployed.',
      category: 'performance',
      configPath: '/api/config/database',
    },
    {
      id: 'stateless-arch',
      name: 'Stateless Architecture / Session Store',
      status: 'in_progress',
      lastCheckedAt: new Date().toISOString(),
      details: 'Redis session storage configured. Full stateless refactor in progress.',
      category: 'reliability',
      configPath: '/api/config/sessions',
    },
    {
      id: 'backup-recovery',
      name: 'Backup & Recovery',
      status: 'implemented',
      lastCheckedAt: new Date().toISOString(),
      details: 'Daily automated backups. 30-day retention. Last backup: 2 hours ago.',
      category: 'reliability',
      configPath: '/api/config/backup',
    },
    {
      id: 'image-optimization',
      name: 'Image Optimization',
      status: 'implemented',
      lastCheckedAt: new Date().toISOString(),
      details: 'WebP/AVIF conversion, lazy loading, 70-90% size reduction',
      category: 'performance',
      configPath: '/api/config/images',
    },
  ],
  latencySeries: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: Math.floor(200 + Math.random() * 150 + Math.sin(i / 4) * 50),
    label: `${i}h ago`,
  })),
  errorRateSeries: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    value: Math.random() * 0.5,
    label: `${i}h ago`,
  })),
  alerts: [
    {
      id: '1',
      severity: 'warning',
      message: 'High latency detected on /api/dashboard endpoint (P95 = 950ms)',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      source: 'API Monitor',
      resolved: false,
    },
    {
      id: '2',
      severity: 'info',
      message: 'Database backup completed successfully (156MB → 18MB)',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      source: 'Backup System',
      resolved: true,
    },
    {
      id: '3',
      severity: 'warning',
      message: 'Slow query detected on invoices table (1.2s execution time)',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      source: 'Database Monitor',
      resolved: false,
    },
    {
      id: '4',
      severity: 'critical',
      message: 'Redis connection lost',
      timestamp: new Date(Date.now() - 3 * 3600000).toISOString(),
      source: 'Redis Monitor',
      resolved: true,
    },
    {
      id: '5',
      severity: 'info',
      message: 'Redis connection restored',
      timestamp: new Date(Date.now() - 3 * 3600000 + 2 * 60000).toISOString(),
      source: 'Redis Monitor',
      resolved: true,
    },
  ],
  systemInfo: {
    uptime: '45 days 12 hours',
    lastBackup: '2 hours ago',
    backupLocation: './backups/database',
    nodeVersion: 'v18.17.0',
    databaseSize: '156 MB',
  },
});

// Production API calls with proper error handling
const fetchSystemHealth = async (): Promise<SystemHealthData> => {
  try {
    const response = await fetch('/api/system-health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/auth/login';
        throw new Error('Unauthorized');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch system health:', error);
    // Fallback to mock data in development only
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock data for development');
      return mockSystemHealth();
    }
    throw error;
  }
};

const fetchSystemConfig = async (): Promise<SystemConfig> => {
  try {
    const response = await fetch('/api/system-health/config', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch system config:', error);
    // Return default config as fallback
    return {
      thresholds: {
        latency: { warning: 400, critical: 800 },
        p95Latency: { warning: 500, critical: 1000 },
        errorRate: { warning: 1, critical: 5 },
        cacheHitRate: { warning: 90, critical: 80 },
        slowQueries: { warning: 5, critical: 10 },
        cpuUsage: { warning: 70, critical: 90 },
        memoryUsage: { warning: 80, critical: 95 },
      },
      backupLocation: './backups/database',
      refreshInterval: 30000,
    };
  }
};

const updateSystemConfig = async (config: Partial<SystemConfig>): Promise<void> => {
  try {
    const response = await fetch('/api/system-health/config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      credentials: 'include',
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error('Failed to update configuration');
    }
  } catch (error) {
    console.error('Failed to update config:', error);
    throw error;
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Metric Card Component
 */
const MetricCard: React.FC<{
  metric: MetricSummary;
  onClick?: () => void;
}> = ({ metric, onClick }) => {
  const statusColors = {
    healthy: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    critical: 'bg-red-50 border-red-200 text-red-700',
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    stable: <Minus className="w-4 h-4" />,
  };

  const trendColors = {
    up: metric.value > metric.threshold.warning ? 'text-red-500' : 'text-green-500',
    down: 'text-green-500',
    stable: 'text-gray-500',
  };

  return (
    <div
      className={`p-6 rounded-lg border-2 ${statusColors[metric.status]} cursor-pointer hover:shadow-lg transition-all duration-200`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {metric.icon}
          <h3 className="font-semibold text-sm">{metric.name}</h3>
        </div>
        <div className={`flex items-center space-x-1 text-xs ${trendColors[metric.trend]}`}>
          {trendIcons[metric.trend]}
          <span>{Math.abs(metric.trendValue).toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold">{metric.value.toFixed(metric.unit === '%' ? 1 : 0)}</span>
        <span className="text-sm opacity-75">{metric.unit}</span>
      </div>
      <div className="mt-3 text-xs opacity-75">
        Warning: {metric.threshold.warning}
        {metric.unit} | Critical: {metric.threshold.critical}
        {metric.unit}
      </div>
    </div>
  );
};

/**
 * Implementation Status Table
 */
const ImplementationTable: React.FC<{
  features: ImplementationFeature[];
  onEdit?: (feature: ImplementationFeature) => void;
}> = ({ features, onEdit }) => {
  const statusConfig = {
    implemented: {
      label: 'Implemented',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    in_progress: {
      label: 'In Progress',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: <Clock className="w-3 h-3" />,
    },
    not_started: {
      label: 'Not Started',
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: <Minus className="w-3 h-3" />,
    },
  };

  const categoryColors = {
    performance: 'text-blue-600',
    reliability: 'text-green-600',
    security: 'text-red-600',
    monitoring: 'text-purple-600',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Feature
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Check
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Details
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {features.map((feature) => {
            const config = statusConfig[feature.status];
            return (
              <tr key={feature.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{feature.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-xs font-medium ${categoryColors[feature.category]}`}>
                    {feature.category.charAt(0).toUpperCase() + feature.category.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
                  >
                    {config.icon}
                    <span>{config.label}</span>
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(feature.lastCheckedAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{feature.details}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => onEdit?.(feature)}
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Config</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Alerts Panel
 */
const AlertsPanel: React.FC<{ alerts: AlertEvent[] }> = ({ alerts }) => {
  const severityConfig = {
    info: {
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: <Activity className="w-4 h-4 text-blue-600" />,
    },
    warning: {
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
    },
    error: {
      color: 'bg-orange-50 border-orange-200 text-orange-800',
      icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
    },
    critical: {
      color: 'bg-red-50 border-red-200 text-red-800',
      icon: <Shield className="w-4 h-4 text-red-600" />,
    },
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const config = severityConfig[alert.severity];
        return (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border ${config.color} ${alert.resolved ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start space-x-3">
              {config.icon}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{alert.message}</span>
                  {alert.resolved && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      Resolved
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs opacity-75">
                  <span>{alert.source}</span>
                  <span>•</span>
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Config Modal
 */
const ConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  config: SystemConfig;
  onSave: (config: SystemConfig) => Promise<void>;
}> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Reset local config when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalConfig(config);
      setSaveStatus('idle');
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">System Configuration</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Thresholds Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Performance Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(localConfig.thresholds).map(([key, value]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase())
                      .trim()}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Warning</label>
                      <input
                        type="number"
                        value={value.warning}
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            thresholds: {
                              ...localConfig.thresholds,
                              [key]: { ...value, warning: parseFloat(e.target.value) },
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Critical</label>
                      <input
                        type="number"
                        value={value.critical}
                        onChange={(e) =>
                          setLocalConfig({
                            ...localConfig,
                            thresholds: {
                              ...localConfig.thresholds,
                              [key]: { ...value, critical: parseFloat(e.target.value) },
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Backup Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Backup Configuration</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Backup Location</label>
              <input
                type="text"
                value={localConfig.backupLocation}
                onChange={(e) => setLocalConfig({ ...localConfig, backupLocation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="./backups/database"
              />
            </div>
          </div>

          {/* Refresh Interval */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Dashboard Settings</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refresh Interval (seconds)
              </label>
              <input
                type="number"
                value={localConfig.refreshInterval / 1000}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, refreshInterval: parseFloat(e.target.value) * 1000 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                min="5"
                max="300"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            disabled={saveStatus === 'saving'}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setSaveStatus('saving');
              try {
                await onSave(localConfig);
                setSaveStatus('success');
                setTimeout(() => {
                  onClose();
                  setSaveStatus('idle');
                }, 1000);
              } catch (error) {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus('idle'), 3000);
              }
            }}
            disabled={saveStatus === 'saving'}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              saveStatus === 'success'
                ? 'bg-green-600 text-white'
                : saveStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveStatus === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
            <span>
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'success'
                ? 'Saved!'
                : saveStatus === 'error'
                ? 'Failed'
                : 'Save Configuration'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SystemHealthDashboard: React.FC = () => {
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load data with error handling
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, configData] = await Promise.all([fetchSystemHealth(), fetchSystemConfig()]);
      setData(healthData);
      setConfig(configData);
      setLastRefresh(new Date());
      setError(null);
    } catch (error) {
      console.error('Failed to load system health data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      
      // Show user-friendly error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        setError('Session expired. Please login again.');
      } else if (error instanceof Error && error.message.includes('Network')) {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !config) return;

    const interval = setInterval(() => {
      loadData();
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, config]);

  // Export data
  const exportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: data?.metricsSummary,
      features: data?.implementationFeatures,
      alerts: data?.alerts,
      systemInfo: data?.systemInfo,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-health-${new Date().toISOString()}.json`;
    a.click();
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading system health data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  if (!data || !config) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">System Health & Performance Center</h1>
              <p className="text-blue-100 mt-1">BISMAN ERP – Infrastructure & Performance Overview</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                  autoRefresh ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span>{autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}</span>
              </button>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Configure</span>
              </button>
              <button
                onClick={exportData}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-4 text-sm text-blue-100">
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            <span>•</span>
            <span>Uptime: {data.systemInfo.uptime}</span>
            <span>•</span>
            <span>Node: {data.systemInfo.nodeVersion}</span>
            <span>•</span>
            <span>DB Size: {data.systemInfo.databaseSize}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {data.metricsSummary.map((metric) => (
            <MetricCard key={metric.name} metric={metric} onClick={() => setIsConfigModalOpen(true)} />
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Latency Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>API Latency Over Time</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.latencySeries}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Latency']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorLatency)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Error Rate Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Error Rate Over Time</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.errorRateSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Error Rate']}
                />
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Implementation Status */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Implementation Status</span>
            </h3>
          </div>
          <ImplementationTable features={data.implementationFeatures} onEdit={() => setIsConfigModalOpen(true)} />
        </div>

        {/* Alerts Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Recent Alerts & Events</span>
          </h3>
          <AlertsPanel alerts={data.alerts} />
        </div>

        {/* System Info Footer */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Last Backup</div>
              <div className="text-lg font-semibold">{data.systemInfo.lastBackup}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Backup Location</div>
              <div className="text-lg font-semibold">{data.systemInfo.backupLocation}</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Database Size</div>
              <div className="text-lg font-semibold">{data.systemInfo.databaseSize}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onSave={async (newConfig) => {
          await updateSystemConfig(newConfig);
          setConfig(newConfig);
          loadData();
        }}
      />
    </div>
  );
};

export default SystemHealthDashboard;
