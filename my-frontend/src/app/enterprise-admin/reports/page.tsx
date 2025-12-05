"use client";
import { useEffect, useState, useCallback } from 'react';
import { usePageRefresh } from '@/contexts/RefreshContext';
import { useReportContext, ReportType } from '@/contexts/ReportContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  BarChart3, 
  Zap, 
  RefreshCw,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react';

// Real-time connection indicator
function ConnectionStatus({ connected, lastUpdate }: { connected: boolean; lastUpdate?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {connected ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">Connecting...</span>
        </>
      )}
      {lastUpdate && (
        <span className="text-gray-400 text-xs ml-2">
          Updated {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

// Live value with animation
function LiveValue({ value, previousValue, format = 'number' }: { 
  value: number; 
  previousValue?: number;
  format?: 'number' | 'currency' | 'percent';
}) {
  const hasChanged = previousValue !== undefined && previousValue !== value;
  const isIncrease = previousValue !== undefined && value > previousValue;
  
  const formatValue = (v: number) => {
    switch (format) {
      case 'currency':
        return `₹${v.toLocaleString()}`;
      case 'percent':
        return `${v.toFixed(1)}%`;
      default:
        return v.toLocaleString();
    }
  };

  return (
    <motion.span
      key={value}
      initial={hasChanged ? { scale: 1.2, color: isIncrease ? '#10b981' : '#ef4444' } : {}}
      animate={{ scale: 1, color: 'inherit' }}
      transition={{ duration: 0.5 }}
      className="font-bold text-2xl"
    >
      {formatValue(value)}
      {hasChanged && (
        <motion.span
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -20 }}
          transition={{ duration: 1 }}
          className={`ml-2 text-sm ${isIncrease ? 'text-green-500' : 'text-red-500'}`}
        >
          {isIncrease ? '↑' : '↓'}
        </motion.span>
      )}
    </motion.span>
  );
}

export default function Page() {
  const { 
    connected, 
    subscribe, 
    unsubscribe, 
    reportData, 
    lastUpdate,
    refresh: socketRefresh 
  } = useReportContext();

  const [system, setSystem] = useState<any>(null);
  const [growth, setGrowth] = useState<any[]>([]);
  const [clientActivity, setClientActivity] = useState<any[]>([]);
  const [adoption, setAdoption] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previousValues, setPreviousValues] = useState<Record<string, number>>({});

  // Report types to subscribe to
  const reportTypes: ReportType[] = ['system-health', 'active-users', 'dashboard-kpi', 'tenant-usage'];

  // Subscribe to real-time reports when connected
  useEffect(() => {
    if (connected) {
      reportTypes.forEach(type => subscribe(type));
    }
    return () => {
      if (connected) {
        reportTypes.forEach(type => unsubscribe(type));
      }
    };
  }, [connected, subscribe, unsubscribe]);

  // Update state from socket data
  useEffect(() => {
    if (reportData['system-health']) {
      // Store previous values for animation
      if (system) {
        setPreviousValues(prev => ({
          ...prev,
          totalUsers: system.totalUsers,
          activeOrgs: system.activeOrgs,
        }));
      }
      setSystem(reportData['system-health']);
    }
    if (reportData['active-users']) {
      setClientActivity(reportData['active-users']);
    }
    if (reportData['dashboard-kpi']) {
      setMetrics(reportData['dashboard-kpi']);
    }
  }, [reportData]);

  // Fallback to API fetch for initial data and non-socket data
  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsDataRefreshing(true);
        // Also trigger socket refresh
        reportTypes.forEach(type => socketRefresh(type));
      } else {
        setLoading(true);
      }
      const [s, g, c, a, m] = await Promise.all([
        fetch('/api/enterprise-admin/reports/system-overview', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/enterprise-admin/reports/user-growth?months=12', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/enterprise-admin/reports/client-activity?days=30', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/enterprise-admin/reports/module-adoption', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/enterprise-admin/reports/performance', { credentials: 'include' }).then(r => r.json()),
      ]);
      setSystem(s.report);
      setGrowth(g.growth || []);
      setClientActivity(c.activity || []);
      setAdoption(a.adoption || []);
      setMetrics(m.metrics);
    } catch (e: any) {
      setErr(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setIsDataRefreshing(false);
    }
  }, [socketRefresh]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Register with global refresh context
  usePageRefresh('reports', () => fetchReports(true));

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex items-center gap-4">
          <ConnectionStatus 
            connected={connected} 
            lastUpdate={lastUpdate['system-health']} 
          />
          <button
            onClick={() => fetchReports(true)}
            disabled={isDataRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isDataRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
        >
          {err}
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* System Overview - Real-time KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <LiveCard
                title="Total Users"
                value={system?.totalUsers || 0}
                previousValue={previousValues.totalUsers}
                icon={<Users className="w-5 h-5" />}
                color="blue"
                isLive={connected}
              />
              <LiveCard
                title="Active Organizations"
                value={system?.activeOrgs || 0}
                previousValue={previousValues.activeOrgs}
                icon={<Activity className="w-5 h-5" />}
                color="green"
                isLive={connected}
              />
              <LiveCard
                title="Modules Enabled"
                value={system?.modulesEnabled || 0}
                icon={<BarChart3 className="w-5 h-5" />}
                color="purple"
                isLive={connected}
              />
              <LiveCard
                title="System Health"
                value={system?.healthScore || 100}
                icon={<Zap className="w-5 h-5" />}
                color="yellow"
                suffix="%"
                isLive={connected}
              />
            </div>

            {/* User Growth Chart */}
            <Card title="User Growth (12 months)" icon={<TrendingUp className="w-5 h-5" />}>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {growth.map((g: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center"
                  >
                    <div className="text-xs text-gray-500 dark:text-gray-400">{g.month}</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{g.count}</div>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Client Activity */}
            <Card title="Client Activity (30 days)" icon={<Activity className="w-5 h-5" />}>
              {clientActivity.length > 0 ? (
                <div className="space-y-2">
                  {clientActivity.slice(0, 10).map((activity: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                    >
                      <span className="text-sm">{activity.client || activity.name}</span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {activity.actions || activity.count} actions
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No activity data available</p>
              )}
            </Card>

            {/* Module Adoption */}
            <Card title="Module Adoption" icon={<BarChart3 className="w-5 h-5" />}>
              {adoption.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {adoption.map((mod: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{mod.module || mod.name}</span>
                        <span className="text-sm text-green-600 dark:text-green-400">
                          {mod.adoptionRate || mod.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${mod.adoptionRate || mod.percentage}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05 }}
                          className="bg-blue-600 h-2 rounded-full"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No adoption data available</p>
              )}
            </Card>

            {/* Performance Metrics */}
            <Card title="Performance Metrics" icon={<Zap className="w-5 h-5" />}>
              {metrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricItem label="API Uptime" value={metrics.uptime || '99.9%'} />
                  <MetricItem label="Avg Response" value={metrics.avgResponseTime || '120ms'} />
                  <MetricItem label="Error Rate" value={metrics.errorRate || '0.1%'} />
                  <MetricItem label="Active Sessions" value={metrics.activeSessions || 0} />
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No performance data available</p>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// Live Card component with real-time indicator
function LiveCard({ 
  title, 
  value, 
  previousValue,
  icon, 
  color, 
  suffix = '',
  isLive = false 
}: { 
  title: string; 
  value: number; 
  previousValue?: number;
  icon: React.ReactNode; 
  color: 'blue' | 'green' | 'purple' | 'yellow';
  suffix?: string;
  isLive?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  };

  const hasChanged = previousValue !== undefined && previousValue !== value;

  return (
    <motion.div
      layout
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {isLive && (
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-green-600 dark:text-green-400">Live</span>
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</div>
      <motion.div
        key={value}
        initial={hasChanged ? { scale: 1.1 } : {}}
        animate={{ scale: 1 }}
        className="text-2xl font-bold text-gray-900 dark:text-white"
      >
        {value.toLocaleString()}{suffix}
      </motion.div>
    </motion.div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 font-semibold mb-4 text-gray-900 dark:text-white">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
