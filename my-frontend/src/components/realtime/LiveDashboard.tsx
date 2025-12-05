/**
 * Real-Time Dashboard Components
 * Reusable components for displaying live ERP data
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReport, useReportContext, ReportType } from '@/contexts/ReportContext';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Loader2
} from 'lucide-react';

// ============================================================================
// Live Connection Indicator
// ============================================================================

interface ConnectionIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionIndicator({ className = '', showLabel = true }: ConnectionIndicatorProps) {
  const { connected, connecting, error } = useReportContext();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        {connecting ? (
          <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
        ) : connected ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </>
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${
          connecting ? 'text-yellow-600' : connected ? 'text-green-600' : 'text-red-600'
        }`}>
          {connecting ? 'Connecting...' : connected ? 'Live' : error || 'Disconnected'}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Live KPI Card
// ============================================================================

interface LiveKPICardProps {
  title: string;
  reportType: ReportType;
  dataKey: string;
  icon?: React.ReactNode;
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  showTrend?: boolean;
  className?: string;
  iconBgColor?: string;
}

export function LiveKPICard({
  title,
  reportType,
  dataKey,
  icon,
  format = (v) => v?.toLocaleString() ?? '0',
  prefix = '',
  suffix = '',
  showTrend = true,
  className = '',
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/30'
}: LiveKPICardProps) {
  const { data, loading, lastUpdate, refresh, connected } = useReport(reportType);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  // Get nested value from data
  const getValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  const value = getValue(data, dataKey);
  const change = getValue(data, `${dataKey}Change`) || getValue(data, 'change');
  const trend = getValue(data, `${dataKey}Trend`) || getValue(data, 'trend');

  // Flash animation on value change
  useEffect(() => {
    if (value !== undefined && value !== prevValue && prevValue !== null) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevValue(value);
  }, [value, prevValue]);

  const trendIcon = useMemo(() => {
    if (trend === 'up' || (typeof change === 'number' && change > 0)) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (trend === 'down' || (typeof change === 'number' && change < 0)) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  }, [trend, change]);

  const trendColor = useMemo(() => {
    if (trend === 'up' || (typeof change === 'number' && change > 0)) {
      return 'text-green-600 dark:text-green-400';
    } else if (trend === 'down' || (typeof change === 'number' && change < 0)) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-500';
  }, [trend, change]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6
        ${flash ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        transition-all duration-300
        ${className}
      `}
    >
      {/* Live indicator */}
      <div className="absolute top-3 right-3">
        {connected && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        )}
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          
          {loading && !data ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.p
                key={value}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                {prefix}{format(value)}{suffix}
              </motion.p>
            </AnimatePresence>
          )}

          {showTrend && change !== undefined && (
            <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
              {trendIcon}
              <span className="text-sm font-medium">
                {typeof change === 'number' ? `${change > 0 ? '+' : ''}${change}%` : change}
              </span>
            </div>
          )}
        </div>

        {icon && (
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Last update timestamp */}
      {lastUpdate && (
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span>Updated {new Date(lastUpdate).toLocaleTimeString()}</span>
          <button
            onClick={refresh}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Live Data Table
// ============================================================================

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface LiveDataTableProps<T> {
  reportType: ReportType;
  dataKey?: string;
  columns: Column<T>[];
  title?: string;
  emptyMessage?: string;
  maxRows?: number;
  className?: string;
}

export function LiveDataTable<T extends Record<string, any>>({
  reportType,
  dataKey,
  columns,
  title,
  emptyMessage = 'No data available',
  maxRows = 10,
  className = ''
}: LiveDataTableProps<T>) {
  const { data, loading, lastUpdate, connected } = useReport(reportType);

  const rows: T[] = useMemo(() => {
    if (!data) return [];
    const tableData = dataKey ? data[dataKey] : data;
    if (!Array.isArray(tableData)) return [];
    return tableData.slice(0, maxRows);
  }, [data, dataKey, maxRows]);

  const getValue = (row: T, key: string): any => {
    return key.split('.').reduce((acc, part) => acc?.[part], row);
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <ConnectionIndicator showLabel={false} />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {rows.map((row, idx) => (
                  <motion.tr
                    key={row.id || idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {col.render ? col.render(getValue(row, String(col.key)), row) : getValue(row, String(col.key))}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {lastUpdate && (
        <div className="px-6 py-2 bg-gray-50 dark:bg-slate-700/30 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last updated: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Live Activity Feed
// ============================================================================

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  user?: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

interface LiveActivityFeedProps {
  reportType?: ReportType;
  dataKey?: string;
  title?: string;
  maxItems?: number;
  className?: string;
}

export function LiveActivityFeed({
  reportType = 'active-users',
  dataKey = 'recentActivity',
  title = 'Live Activity',
  maxItems = 10,
  className = ''
}: LiveActivityFeedProps) {
  const { data, connected } = useReport(reportType);

  const activities: Activity[] = useMemo(() => {
    if (!data) return [];
    const activityData = dataKey ? data[dataKey] : data;
    if (!Array.isArray(activityData)) return [];
    return activityData.slice(0, maxItems).map((item, idx) => ({
      id: item.id || `activity-${idx}`,
      type: item.action || item.type || 'activity',
      message: item.message || `${item.username || 'User'} ${item.action || 'performed action'}`,
      timestamp: item.timestamp || new Date().toISOString(),
      user: item.username || item.user,
      severity: item.severity || 'info'
    }));
  }, [data, dataKey, maxItems]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <ConnectionIndicator />
      </div>

      <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {activities.map((activity, idx) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="px-6 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/30"
            >
              <div className={`p-1.5 rounded-full ${getSeverityColor(activity.severity || 'info')}`}>
                {getSeverityIcon(activity.severity || 'info')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-200 truncate">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                  {activity.user && ` • ${activity.user}`}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {activities.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Live Stats Row
// ============================================================================

interface StatConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  format?: (value: number) => string;
  color?: string;
}

interface LiveStatsRowProps {
  reportType: ReportType;
  stats: StatConfig[];
  className?: string;
}

export function LiveStatsRow({ reportType, stats, className = '' }: LiveStatsRowProps) {
  const { data, loading, connected } = useReport(reportType);

  const getValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-${Math.min(stats.length, 6)} gap-4 ${className}`}>
      {stats.map((stat) => {
        const value = getValue(data, stat.key);
        const formattedValue = stat.format ? stat.format(value) : value?.toLocaleString() ?? '0';

        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color || 'bg-blue-100 dark:bg-blue-900/30'}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                {loading && value === undefined ? (
                  <div className="h-6 w-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formattedValue}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Live Alert Banner
// ============================================================================

interface LiveAlertBannerProps {
  className?: string;
}

export function LiveAlertBanner({ className = '' }: LiveAlertBannerProps) {
  const { onAlert } = useReportContext();
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAlert((alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 5));
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a !== alert));
      }, 10000);
    });

    return unsubscribe;
  }, [onAlert]);

  if (alerts.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence>
        {alerts.map((alert, idx) => (
          <motion.div
            key={`${alert.reportType}-${alert.timestamp}-${idx}`}
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className={`
              px-4 py-3 rounded-lg flex items-center gap-3
              ${alert.alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                alert.alert.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200' :
                alert.alert.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
              }
            `}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{alert.alert.message}</p>
              <p className="text-xs opacity-75">{alert.reportType} • {new Date(alert.timestamp).toLocaleTimeString()}</p>
            </div>
            <button
              onClick={() => setAlerts(prev => prev.filter(a => a !== alert))}
              className="p-1 hover:bg-black/10 rounded"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Prebuilt Dashboard Widgets
// ============================================================================

export function RevenueWidget({ className = '' }: { className?: string }) {
  return (
    <LiveKPICard
      title="Total Revenue"
      reportType="revenue"
      dataKey="total"
      icon={<DollarSign className="w-6 h-6 text-green-600" />}
      format={(v) => `$${(v / 1000).toFixed(1)}K`}
      iconBgColor="bg-green-100 dark:bg-green-900/30"
      className={className}
    />
  );
}

export function OrdersWidget({ className = '' }: { className?: string }) {
  return (
    <LiveKPICard
      title="Orders Today"
      reportType="sales-live"
      dataKey="ordersToday"
      icon={<ShoppingCart className="w-6 h-6 text-blue-600" />}
      iconBgColor="bg-blue-100 dark:bg-blue-900/30"
      className={className}
    />
  );
}

export function InventoryWidget({ className = '' }: { className?: string }) {
  return (
    <LiveKPICard
      title="Stock Items"
      reportType="stock-levels"
      dataKey="totalItems"
      icon={<Package className="w-6 h-6 text-purple-600" />}
      iconBgColor="bg-purple-100 dark:bg-purple-900/30"
      showTrend={false}
      className={className}
    />
  );
}

export function ActiveUsersWidget({ className = '' }: { className?: string }) {
  return (
    <LiveKPICard
      title="Active Users"
      reportType="active-users"
      dataKey="online"
      icon={<Users className="w-6 h-6 text-orange-600" />}
      iconBgColor="bg-orange-100 dark:bg-orange-900/30"
      showTrend={false}
      className={className}
    />
  );
}

export function PerformanceWidget({ className = '' }: { className?: string }) {
  return (
    <LiveKPICard
      title="System Performance"
      reportType="system-health"
      dataKey="uptime"
      icon={<Activity className="w-6 h-6 text-cyan-600" />}
      iconBgColor="bg-cyan-100 dark:bg-cyan-900/30"
      suffix="%"
      showTrend={false}
      className={className}
    />
  );
}

// Export all components
export default {
  ConnectionIndicator,
  LiveKPICard,
  LiveDataTable,
  LiveActivityFeed,
  LiveStatsRow,
  LiveAlertBanner,
  RevenueWidget,
  OrdersWidget,
  InventoryWidget,
  ActiveUsersWidget,
  PerformanceWidget
};
