'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Layers,
  Building,
  Activity,
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
// Navbar and Sidebar are provided by the enterprise-admin layout

// Types
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
  icon?: string;
}

interface SystemInsight {
  apiUptime: number;
  dbConnections: number;
  lastBackup: string;
}

const COLORS = {
  businessErp: '#8b5cf6',
  pumpManagement: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const PIE_COLORS = [COLORS.businessErp, COLORS.pumpManagement, '#3b82f6', '#f97316'];

export default function EnterpriseAdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State
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
  // Avoid SSR->CSR text mismatch by not rendering a live time on the server
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

      // Fetch all data in parallel
      const [statsRes, distributionRes, activityRes, insightsRes] = await Promise.all([
        fetch(`${baseURL}/api/enterprise-admin/dashboard/stats`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/enterprise-admin/dashboard/super-admin-distribution`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/enterprise-admin/dashboard/activity`, {
          credentials: 'include',
        }),
        fetch(`${baseURL}/api/enterprise-admin/dashboard/insights`, {
          credentials: 'include',
        }),
      ]);

      // Process stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.ok && statsData.stats) {
          setStats(statsData.stats);
        }
      }

      // Process super admin distribution
      if (distributionRes.ok) {
        const distributionData = await distributionRes.json();
        if (distributionData.ok && distributionData.distribution) {
          setSuperAdminDistribution(distributionData.distribution);
        }
      }

      // Process activity logs
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        if (activityData.ok && activityData.activities) {
          setActivityLogs(activityData.activities);
        }
      }

      // Process system insights
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        if (insightsData.ok && insightsData.insights) {
          setSystemInsights(insightsData.insights);
        }
      }

      // Fetch module usage trends (real data from API)
      const trendsRes = await fetch(`${baseURL}/api/enterprise-admin/dashboard/module-usage-trends?months=6`, {
        credentials: 'include',
      });
      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        if (trendsData.ok && trendsData.trends) {
          setModuleUsage(trendsData.trends);
        }
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for auth state to resolve before deciding
    if (loading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    const role = (user.role || user.roleName || '').toUpperCase();
    if (role !== 'ENTERPRISE_ADMIN') {
      // Send non-enterprise admins to their dashboards
      if (role === 'SUPER_ADMIN') router.push('/super-admin');
      else if (role === 'ADMIN') router.push('/admin');
      else if (role === 'STAFF') router.push('/hub-incharge');
      else router.push('/dashboard');
      return;
    }

    fetchDashboardData();
  }, [user, loading, router]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // KPI Card Component
  const KPICard = ({
    title,
    value,
    subtext,
    icon: Icon,
    color,
    isLoading,
  }: {
    title: string;
    value: string | number;
    subtext: string;
    icon: any;
    color: string;
    isLoading: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtext}</p>
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex">
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Enterprise Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                System-wide overview and analytics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchDashboardData}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">Refresh</span>
              </button>
              <div className="text-sm text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <KPICard
              title="Total Super Admins"
              value={stats.totalSuperAdmins}
              subtext="Active Super Admin Accounts"
              icon={ShieldCheck}
              color={COLORS.businessErp}
              isLoading={isLoading}
            />
            <KPICard
              title="Total Modules"
              value={stats.totalModules}
              subtext="Across Business ERP & Pump Management"
              icon={Layers}
              color={COLORS.pumpManagement}
              isLoading={isLoading}
            />
            <KPICard
              title="Active Tenants"
              value={stats.activeTenants}
              subtext="Registered ERP Clients"
              icon={Building}
              color="#3b82f6"
              isLoading={isLoading}
            />
            <KPICard
              title="System Health"
              value={stats.systemHealth === 'operational' ? 'Operational' : 'Degraded'}
              subtext="System Infrastructure Status"
              icon={Activity}
              color={stats.systemHealth === 'operational' ? COLORS.success : COLORS.warning}
              isLoading={isLoading}
            />
          </div>

          {/* Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Super Admin Distribution */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Super Admin Distribution
              </h3>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading chart...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={superAdminDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {superAdminDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Module Usage Trends */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Module Usage Trends
              </h3>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading chart...</div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={moduleUsage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke={COLORS.businessErp}
                      strokeWidth={2}
                      dot={{ fill: COLORS.businessErp }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* Activity Feed & System Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </h3>
                <button className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
                  View All
                </button>
              </div>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {activityLogs.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{log.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* System Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                System Insights
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">API Uptime</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {systemInsights.apiUptime}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${systemInsights.apiUptime}%` }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">DB Connections</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {systemInsights.dbConnections}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                    Last Backup
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatTimestamp(systemInsights.lastBackup)}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/enterprise-admin/super-admins')}
                className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors text-white"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Manage Super Admins</span>
                </div>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/enterprise-admin/users')}
                className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors text-white"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5" />
                  <span className="font-medium">View All Modules</span>
                </div>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/enterprise-admin/settings')}
                className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors text-white"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5" />
                  <span className="font-medium">System Settings</span>
                </div>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
