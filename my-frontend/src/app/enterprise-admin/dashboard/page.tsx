'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Layers,
  Building,
  Activity,
  Users,
  Clock,
  ArrowRight,
  Server,
  Database,
  Zap,
  Settings,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usePageRefresh } from '@/contexts/RefreshContext';
import { useReportContext, ReportType } from '@/contexts/ReportContext';

interface DashboardStats {
  totalSuperAdmins: number;
  totalModules: number;
  activeTenants: number;
  systemHealth: 'operational' | 'degraded' | 'down';
}

interface SuperAdminDistribution {
  name: string;
  value: number;
  color: string;
}

interface ModuleUsageTrend {
  month: string;
  users: number;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  user?: string;
}

interface SystemInsight {
  apiUptime: number;
  dbConnections: number;
  lastBackup: string;
}

const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  pink: '#ec4899',
  blue: '#3b82f6',
};

export default function EnterpriseAdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const { 
    connected: socketConnected, 
    subscribe, 
    unsubscribe, 
    reportData, 
    lastUpdate,
    refresh: socketRefresh 
  } = useReportContext();

  const [stats, setStats] = useState<DashboardStats>({
    totalSuperAdmins: 0,
    totalModules: 0,
    activeTenants: 0,
    systemHealth: 'operational',
  });
  const [superAdminDistribution, setSuperAdminDistribution] = useState<SuperAdminDistribution[]>([]);
  const [moduleUsage, setModuleUsage] = useState<ModuleUsageTrend[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [systemInsights, setSystemInsights] = useState<SystemInsight>({
    apiUptime: 99.9,
    dbConnections: 0,
    lastBackup: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const reportTypes: ReportType[] = ['dashboard-kpi', 'active-users', 'system-health'];

  useEffect(() => {
    if (socketConnected) {
      reportTypes.forEach(type => subscribe(type));
    }
    return () => {
      if (socketConnected) {
        reportTypes.forEach(type => unsubscribe(type));
      }
    };
  }, [socketConnected, subscribe, unsubscribe]);

  useEffect(() => {
    if (reportData['dashboard-kpi']) {
      const kpi = reportData['dashboard-kpi'];
      setStats(prev => ({
        ...prev,
        totalSuperAdmins: kpi.totalSuperAdmins ?? prev.totalSuperAdmins,
        totalModules: kpi.totalModules ?? prev.totalModules,
        activeTenants: kpi.activeTenants ?? prev.activeTenants,
      }));
    }
    if (reportData['system-health']) {
      const health = reportData['system-health'];
      setSystemInsights(prev => ({
        ...prev,
        apiUptime: health.apiUptime ?? prev.apiUptime,
        dbConnections: health.dbConnections ?? prev.dbConnections,
      }));
      if (health.status) {
        setStats(prev => ({ ...prev, systemHealth: health.status }));
      }
    }
    if (reportData['active-users']) {
      const activities = reportData['active-users'];
      if (Array.isArray(activities)) {
        setActivityLogs(activities.slice(0, 5));
      }
    }
    if (lastUpdate['dashboard-kpi'] || lastUpdate['system-health']) {
      setLastUpdated(new Date());
    }
  }, [reportData, lastUpdate]);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsDataRefreshing(true);
      reportTypes.forEach(type => socketRefresh(type));
    } else {
      setIsLoading(true);
    }
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

      const [statsRes, distributionRes, activityRes, insightsRes] = await Promise.all([
        fetch(`${baseURL}/api/enterprise-admin/dashboard/stats`, { credentials: 'include' }),
        fetch(`${baseURL}/api/enterprise-admin/dashboard/super-admin-distribution`, { credentials: 'include' }),
        fetch(`${baseURL}/api/enterprise-admin/dashboard/activity`, { credentials: 'include' }),
        fetch(`${baseURL}/api/enterprise-admin/dashboard/insights`, { credentials: 'include' }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.ok && data.stats) setStats(data.stats);
      }
      if (distributionRes.ok) {
        const data = await distributionRes.json();
        if (data.ok && data.distribution) setSuperAdminDistribution(data.distribution);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        if (data.ok && data.activities) setActivityLogs(data.activities);
      }
      if (insightsRes.ok) {
        const data = await insightsRes.json();
        if (data.ok && data.insights) setSystemInsights(data.insights);
      }

      const trendsRes = await fetch(`${baseURL}/api/enterprise-admin/dashboard/module-usage-trends?months=6`, { credentials: 'include' });
      if (trendsRes.ok) {
        const data = await trendsRes.json();
        if (data.ok && data.trends) setModuleUsage(data.trends);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsDataRefreshing(false);
    }
  }, [socketRefresh]);

  usePageRefresh('enterprise-dashboard', () => fetchDashboardData(true));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchDashboardData();
  }, [user, loading, router, fetchDashboardData]);

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '-';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-md" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
          <div className="flex items-baseline gap-1">
            {(isLoading || isDataRefreshing) ? (
              <div className="h-5 w-10 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <span className="text-lg font-bold text-gray-900 dark:text-white">{value}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Enterprise Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">System overview & analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {socketConnected ? (
              <>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                <span className="text-green-600 dark:text-green-400">Live</span>
              </>
            ) : (
              <span className="text-gray-400">Connecting...</span>
            )}
          </div>
          <span className="text-[10px] text-gray-400" suppressHydrationWarning>
            {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard icon={ShieldCheck} label="Super Admins" value={stats.totalSuperAdmins} color={COLORS.secondary} />
        <StatCard icon={Layers} label="Modules" value={stats.totalModules} color={COLORS.pink} />
        <StatCard icon={Building} label="Tenants" value={stats.activeTenants} color={COLORS.blue} />
        <StatCard 
          icon={Activity} 
          label="System" 
          value={stats.systemHealth === 'operational' ? '● OK' : '● Down'} 
          color={stats.systemHealth === 'operational' ? COLORS.success : COLORS.danger} 
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Pie Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Super Admin Distribution</h3>
          {(isLoading || isDataRefreshing) ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={superAdminDistribution} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                  {superAdminDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, padding: '4px 8px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {superAdminDistribution.map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-600 dark:text-gray-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Area Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Module Usage Trends</h3>
          {(isLoading || isDataRefreshing) ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-pink-500 border-t-transparent"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={moduleUsage}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" axisLine={false} tickLine={false} width={25} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '4px 8px' }} />
                <Area type="monotone" dataKey="users" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorUsers)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System Insights */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" /> System Health
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-gray-500">API Uptime</span>
                <span className="text-green-500 font-medium">{systemInsights.apiUptime}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${systemInsights.apiUptime}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-gray-500">DB Connections</span>
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{systemInsights.dbConnections}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-orange-500" />
                <span className="text-[10px] text-gray-500">Last Backup</span>
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatTime(systemInsights.lastBackup)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-500" /> Recent Activity
            </h3>
            <button onClick={() => router.push('/enterprise-admin/activity-logs')} className="text-[10px] text-indigo-500 hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No recent activity</p>
            ) : (
              activityLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <p className="text-[11px] text-gray-700 dark:text-gray-300 flex-1 truncate">{log.action}</p>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatTime(log.timestamp)}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-white/90 mb-2">Quick Actions</h3>
          <div className="space-y-1.5">
            {[
              { icon: Users, label: 'Manage Super Admins', href: '/enterprise-admin/super-admins' },
              { icon: Layers, label: 'Module Management', href: '/enterprise-admin/modules' },
              { icon: Building, label: 'Organizations', href: '/enterprise-admin/organizations' },
            ].map((action) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="w-full flex items-center gap-2 px-2.5 py-2 bg-white/10 hover:bg-white/20 rounded-md transition-colors text-left"
              >
                <action.icon className="w-3.5 h-3.5 text-white/80" />
                <span className="text-[11px] text-white flex-1">{action.label}</span>
                <ArrowRight className="w-3 h-3 text-white/60" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
