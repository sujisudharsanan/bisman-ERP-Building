'use client';

/**
 * Tenant Usage Dashboard
 * BISMAN ERP - Usage Metrics, Quotas & Billing Overview
 *
 * Features:
 * - API calls used today vs quota
 * - Storage used vs quota
 * - Active users count
 * - Monthly usage trends (line & bar charts)
 * - Quota warning banners when nearing limits
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { usePageRefresh } from '@/contexts/RefreshContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QuotaUsage {
  used: number;
  limit: number;
  unit: string;
  percentage: number;
}

interface UsageData {
  apiCalls: QuotaUsage;
  storage: QuotaUsage;
  activeUsers: { count: number; limit: number };
  bandwidth: QuotaUsage;
}

interface DailyUsage {
  date: string;
  apiCalls: number;
  storage: number;
  activeUsers: number;
}

interface MonthlyTrend {
  month: string;
  apiCalls: number;
  storage: number;
  activeUsers: number;
}

interface BillingInfo {
  plan: string;
  status: 'active' | 'trial' | 'past_due' | 'canceled';
  currentPeriodEnd: string;
  amount: number;
  currency: string;
}

interface SLAMetrics {
  uptime: number;
  avgLatency: number;
  errorBudgetRemaining: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#6b7280',
};

const QUOTA_THRESHOLDS = {
  warning: 80,
  critical: 95,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(percentage: number): string {
  if (percentage >= QUOTA_THRESHOLDS.critical) return COLORS.danger;
  if (percentage >= QUOTA_THRESHOLDS.warning) return COLORS.warning;
  return COLORS.success;
}

function getStatusLabel(percentage: number): string {
  if (percentage >= QUOTA_THRESHOLDS.critical) return 'Critical';
  if (percentage >= QUOTA_THRESHOLDS.warning) return 'Warning';
  return 'Healthy';
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Alert Banner for quota warnings
function QuotaAlertBanner({ usage }: { usage: UsageData }) {
  const criticalItems: string[] = [];
  const warningItems: string[] = [];

  if (usage.apiCalls.percentage >= QUOTA_THRESHOLDS.critical) {
    criticalItems.push('API Calls');
  } else if (usage.apiCalls.percentage >= QUOTA_THRESHOLDS.warning) {
    warningItems.push('API Calls');
  }

  if (usage.storage.percentage >= QUOTA_THRESHOLDS.critical) {
    criticalItems.push('Storage');
  } else if (usage.storage.percentage >= QUOTA_THRESHOLDS.warning) {
    warningItems.push('Storage');
  }

  if (usage.bandwidth.percentage >= QUOTA_THRESHOLDS.critical) {
    criticalItems.push('Bandwidth');
  } else if (usage.bandwidth.percentage >= QUOTA_THRESHOLDS.warning) {
    warningItems.push('Bandwidth');
  }

  if (criticalItems.length === 0 && warningItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {criticalItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-800 dark:text-red-300">Critical: Quota Nearly Exhausted</h4>
            <p className="text-sm text-red-700 dark:text-red-400">
              {criticalItems.join(', ')} usage is above 95%. Consider upgrading your plan to avoid service interruption.
            </p>
          </div>
        </motion.div>
      )}
      {warningItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 dark:text-amber-300">Warning: Approaching Quota Limit</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {warningItems.join(', ')} usage is above 80%. Monitor your usage or consider upgrading.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Progress bar for quota display
function QuotaProgressBar({
  label,
  used,
  limit,
  unit,
  icon: Icon,
  formatValue = formatNumber,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  formatValue?: (n: number) => string;
}) {
  const percentage = Math.min((used / limit) * 100, 100);
  const statusColor = getStatusColor(percentage);
  const statusLabel = getStatusLabel(percentage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${statusColor}20` }}
          >
            <Icon className="w-5 h-5" style={{ color: statusColor }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatValue(used)} / {formatValue(limit)} {unit}
            </p>
          </div>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${statusColor}20`,
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: statusColor }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{percentage.toFixed(1)}% used</span>
        <span>{formatValue(limit - used)} remaining</span>
      </div>
    </motion.div>
  );
}

// Stats card component
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = COLORS.primary,
  isLoading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  color?: string;
  isLoading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{title}</p>
          {isLoading ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
          {trend && trendValue !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <ArrowUp className="w-3 h-3 text-green-500" />
              ) : trend === 'down' ? (
                <ArrowDown className="w-3 h-3 text-red-500" />
              ) : (
                <span className="w-3 h-3 text-gray-400">—</span>
              )}
              <span
                className={`text-xs font-medium ${
                  trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}% vs last month
              </span>
            </div>
          )}
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
}

// Billing status card
function BillingStatusCard({ billing, isLoading }: { billing: BillingInfo; isLoading: boolean }) {
  const statusColors: Record<string, string> = {
    active: COLORS.success,
    trial: COLORS.info,
    past_due: COLORS.warning,
    canceled: COLORS.danger,
  };

  const statusLabels: Record<string, string> = {
    active: 'Active',
    trial: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Billing Status</h3>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${statusColors[billing.status]}20`,
            color: statusColors[billing.status],
          }}
        >
          {statusLabels[billing.status]}
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Plan</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">{billing.plan}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Monthly Cost</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {billing.currency === 'usd' ? '$' : billing.currency.toUpperCase()}
              {(billing.amount / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Period Ends</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {new Date(billing.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// SLA Metrics card
function SLAMetricsCard({ sla, isLoading }: { sla: SLAMetrics; isLoading: boolean }) {
  const uptimeColor = sla.uptime >= 99.9 ? COLORS.success : sla.uptime >= 99 ? COLORS.warning : COLORS.danger;
  const latencyColor = sla.avgLatency <= 200 ? COLORS.success : sla.avgLatency <= 500 ? COLORS.warning : COLORS.danger;
  const errorBudgetColor = sla.errorBudgetRemaining >= 50 ? COLORS.success : sla.errorBudgetRemaining >= 20 ? COLORS.warning : COLORS.danger;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">SLA Compliance</h3>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Uptime (30d)</span>
              <span className="font-medium" style={{ color: uptimeColor }}>{sla.uptime.toFixed(2)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${sla.uptime}%`, backgroundColor: uptimeColor }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Avg Latency</span>
              <span className="font-medium" style={{ color: latencyColor }}>{sla.avgLatency}ms</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min((sla.avgLatency / 500) * 100, 100)}%`, backgroundColor: latencyColor }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Error Budget Remaining</span>
              <span className="font-medium" style={{ color: errorBudgetColor }}>{sla.errorBudgetRemaining.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${sla.errorBudgetRemaining}%`, backgroundColor: errorBudgetColor }}
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UsageDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data state
  const [usage, setUsage] = useState<UsageData>({
    apiCalls: { used: 0, limit: 100000, unit: 'calls', percentage: 0 },
    storage: { used: 0, limit: 10737418240, unit: 'bytes', percentage: 0 },
    activeUsers: { count: 0, limit: 50 },
    bandwidth: { used: 0, limit: 107374182400, unit: 'bytes', percentage: 0 },
  });

  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);

  const [billing, setBilling] = useState<BillingInfo>({
    plan: 'professional',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 9900,
    currency: 'usd',
  });

  const [sla, setSla] = useState<SLAMetrics>({
    uptime: 99.95,
    avgLatency: 145,
    errorBudgetRemaining: 72,
  });

  // Fetch usage data
  const fetchUsageData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

      // Fetch all data in parallel
      const [usageRes, billingRes, metricsRes] = await Promise.all([
        fetch(`${baseURL}/api/admin/tenants/usage`, { credentials: 'include' }),
        fetch(`${baseURL}/api/admin/tenants/billing`, { credentials: 'include' }),
        fetch(`${baseURL}/api/admin/tenants/metrics`, { credentials: 'include' }),
      ]);

      // Process usage data
      if (usageRes.ok) {
        const data = await usageRes.json();
        if (data.ok) {
          // Current usage
          const apiUsed = data.usage?.apiCalls?.today || 0;
          const apiLimit = data.usage?.apiCalls?.dailyLimit || 100000;
          const storageUsed = data.usage?.storage?.used || 0;
          const storageLimit = data.usage?.storage?.limit || 10737418240;
          const bandwidthUsed = data.usage?.bandwidth?.used || 0;
          const bandwidthLimit = data.usage?.bandwidth?.limit || 107374182400;

          setUsage({
            apiCalls: {
              used: apiUsed,
              limit: apiLimit,
              unit: 'calls',
              percentage: (apiUsed / apiLimit) * 100,
            },
            storage: {
              used: storageUsed,
              limit: storageLimit,
              unit: 'bytes',
              percentage: (storageUsed / storageLimit) * 100,
            },
            activeUsers: {
              count: data.usage?.activeUsers || 0,
              limit: data.usage?.userLimit || 50,
            },
            bandwidth: {
              used: bandwidthUsed,
              limit: bandwidthLimit,
              unit: 'bytes',
              percentage: (bandwidthUsed / bandwidthLimit) * 100,
            },
          });

          // Daily breakdown
          if (data.dailyBreakdown) {
            setDailyUsage(
              data.dailyBreakdown.map((d: any) => ({
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                apiCalls: d.apiCalls || 0,
                storage: d.storage || 0,
                activeUsers: d.activeUsers || 0,
              }))
            );
          }

          // Monthly trends
          if (data.monthlyTrends) {
            setMonthlyTrends(
              data.monthlyTrends.map((m: any) => ({
                month: m.month,
                apiCalls: m.apiCalls || 0,
                storage: m.storage || 0,
                activeUsers: m.activeUsers || 0,
              }))
            );
          }
        }
      }

      // Process billing data
      if (billingRes.ok) {
        const data = await billingRes.json();
        if (data.ok && data.billing) {
          setBilling({
            plan: data.billing.plan || 'professional',
            status: data.billing.status || 'active',
            currentPeriodEnd: data.billing.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            amount: data.billing.amount || 9900,
            currency: data.billing.currency || 'usd',
          });
        }
      }

      // Process SLA metrics
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        if (data.ok && data.sla) {
          setSla({
            uptime: data.sla.uptime || 99.95,
            avgLatency: data.sla.avgLatency || 145,
            errorBudgetRemaining: data.sla.errorBudgetRemaining || 72,
          });
        }
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Register refresh handler
  usePageRefresh('usage-dashboard', () => fetchUsageData(true));

  // Initial fetch
  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Usage Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor your usage, quotas, and billing status
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400" suppressHydrationWarning>
              Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </div>
            <button
              onClick={() => fetchUsageData(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Quota Alert Banners */}
        <QuotaAlertBanner usage={usage} />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="API Calls Today"
            value={formatNumber(usage.apiCalls.used)}
            subtitle={`of ${formatNumber(usage.apiCalls.limit)} daily limit`}
            icon={Zap}
            color={getStatusColor(usage.apiCalls.percentage)}
            isLoading={isLoading}
          />
          <StatsCard
            title="Storage Used"
            value={formatBytes(usage.storage.used)}
            subtitle={`of ${formatBytes(usage.storage.limit)} total`}
            icon={HardDrive}
            color={getStatusColor(usage.storage.percentage)}
            isLoading={isLoading}
          />
          <StatsCard
            title="Active Users"
            value={usage.activeUsers.count}
            subtitle={`of ${usage.activeUsers.limit} seats`}
            icon={Users}
            color={COLORS.info}
            isLoading={isLoading}
          />
          <StatsCard
            title="Bandwidth Used"
            value={formatBytes(usage.bandwidth.used)}
            subtitle={`of ${formatBytes(usage.bandwidth.limit)} monthly`}
            icon={Activity}
            color={getStatusColor(usage.bandwidth.percentage)}
            isLoading={isLoading}
          />
        </div>

        {/* Quota Progress Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <QuotaProgressBar
            label="API Calls"
            used={usage.apiCalls.used}
            limit={usage.apiCalls.limit}
            unit="calls"
            icon={Zap}
          />
          <QuotaProgressBar
            label="Storage"
            used={usage.storage.used}
            limit={usage.storage.limit}
            unit=""
            icon={HardDrive}
            formatValue={formatBytes}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily API Calls - Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              Daily API Calls (Last 7 Days)
            </h3>
            {isLoading ? (
              <div className="h-64 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dailyUsage}>
                  <defs>
                    <linearGradient id="apiCallsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatNumber} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [formatNumber(value), 'API Calls']}
                  />
                  <Area
                    type="monotone"
                    dataKey="apiCalls"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fill="url(#apiCallsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Monthly Usage Trends - Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Monthly Usage Trends
            </h3>
            {isLoading ? (
              <div className="h-64 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatNumber} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number) => [formatNumber(value), '']}
                  />
                  <Legend />
                  <Bar dataKey="apiCalls" name="API Calls" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="activeUsers" name="Active Users" fill={COLORS.info} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* Active Users Trend - Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-8"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Active Users Over Time
          </h3>
          {isLoading ? (
            <div className="h-64 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  name="Active Users"
                  stroke={COLORS.info}
                  strokeWidth={2}
                  dot={{ fill: COLORS.info, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Billing & SLA Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BillingStatusCard billing={billing} isLoading={isLoading} />
          <SLAMetricsCard sla={sla} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
