'use client';

/**
 * Usage & Overages Page
 * BISMAN ERP - Usage Tracking and Overage Charges
 *
 * Features:
 * - Current period usage (API calls, storage, seats)
 * - Quota tracking with visual progress bars
 * - Estimated overage charges
 * - Usage history and trends
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  HardDrive,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  DollarSign,
  ChevronDown,
  Info,
  BarChart3,
  Zap,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UsageMetric {
  name: string;
  description: string;
  used: number;
  limit: number;
  unit: string;
  overageRate: number;
  icon: 'api' | 'storage' | 'users' | 'bandwidth';
  color: string;
}

interface UsageData {
  period: {
    start: string;
    end: string;
    daysRemaining: number;
  };
  metrics: UsageMetric[];
  overageCharges: {
    total: number;
    breakdown: {
      metric: string;
      amount: number;
      quantity: number;
    }[];
  };
  history: {
    date: string;
    apiCalls: number;
    storage: number;
    users: number;
  }[];
  projections: {
    apiCalls: number;
    storage: number;
    estimatedOverage: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getIconComponent(icon: UsageMetric['icon']) {
  switch (icon) {
    case 'api':
      return Activity;
    case 'storage':
      return HardDrive;
    case 'users':
      return Users;
    case 'bandwidth':
      return Zap;
    default:
      return Activity;
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Billing Period Header
function BillingPeriodHeader({ period }: { period: UsageData['period'] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Billing Period</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatFullDate(period.start)} — {formatFullDate(period.end)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Days Remaining</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{period.daysRemaining}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Usage Metric Card
function UsageMetricCard({ metric, index }: { metric: UsageMetric; index: number }) {
  const Icon = getIconComponent(metric.icon);
  const percentage = metric.limit > 0 ? (metric.used / metric.limit) * 100 : 0;
  const isOverage = percentage > 100;
  const isWarning = percentage >= 80 && percentage < 100;
  const isCritical = percentage >= 95;

  const overageAmount = isOverage ? metric.used - metric.limit : 0;
  const overageCost = overageAmount * metric.overageRate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${metric.color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color: metric.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{metric.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{metric.description}</p>
          </div>
        </div>
        {isOverage && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            Overage
          </span>
        )}
        {isWarning && !isOverage && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            Warning
          </span>
        )}
      </div>

      {/* Usage Display */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatNumber(metric.used)}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">{metric.unit}</span>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500 dark:text-gray-400">of </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {metric.limit === -1 ? 'Unlimited' : formatNumber(metric.limit)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {metric.limit > 0 && (
        <div className="relative mb-4">
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percentage, 100)}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${
                isOverage
                  ? 'bg-red-500'
                  : isCritical
                  ? 'bg-red-500'
                  : isWarning
                  ? 'bg-yellow-500'
                  : ''
              }`}
              style={{
                backgroundColor: !isOverage && !isCritical && !isWarning ? metric.color : undefined,
              }}
            />
          </div>
          {/* Limit Marker */}
          <div
            className="absolute top-0 w-0.5 h-3 bg-gray-600 dark:bg-gray-400"
            style={{ left: '100%' }}
          />
        </div>
      )}

      {/* Usage Percentage */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          {percentage.toFixed(1)}% of quota used
        </span>
        {isOverage && (
          <span className="text-red-500 font-medium">
            +{formatNumber(overageAmount)} overage
          </span>
        )}
      </div>

      {/* Overage Cost */}
      {isOverage && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-700 dark:text-red-400">Estimated overage charge</span>
            <span className="font-semibold text-red-700 dark:text-red-400">
              {formatCurrency(overageCost)}
            </span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Rate: {formatCurrency(metric.overageRate)} per {metric.unit}
          </p>
        </div>
      )}

      {/* Rate Info */}
      {!isOverage && metric.overageRate > 0 && (
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Info className="w-3 h-3" />
          Overage rate: {formatCurrency(metric.overageRate)} per {metric.unit}
        </div>
      )}
    </motion.div>
  );
}

// Overage Summary Card
function OverageSummaryCard({
  overageCharges,
}: {
  overageCharges: UsageData['overageCharges'];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-violet-500" />
        Estimated Overage Charges
      </h3>

      {overageCharges.total > 0 ? (
        <>
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-gray-500 dark:text-gray-400">Total estimated</span>
            <span className="text-3xl font-bold text-red-600">
              {formatCurrency(overageCharges.total)}
            </span>
          </div>

          <div className="space-y-3">
            {overageCharges.breakdown.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.metric}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatNumber(item.quantity)} units
                  </p>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                Overage charges will be added to your next invoice. Consider upgrading your plan to
                avoid additional charges.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">No overage charges this period</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            You&apos;re within your plan limits
          </p>
        </div>
      )}
    </motion.div>
  );
}

// Usage History Chart
function UsageHistoryChart({ history }: { history: UsageData['history'] }) {
  const [selectedMetric, setSelectedMetric] = useState<'apiCalls' | 'storage' | 'users'>('apiCalls');

  const metricConfig = {
    apiCalls: { label: 'API Calls', color: '#8b5cf6', format: formatNumber },
    storage: { label: 'Storage (GB)', color: '#06b6d4', format: (v: number) => `${v.toFixed(1)} GB` },
    users: { label: 'Active Users', color: '#22c55e', format: (v: number) => v.toString() },
  };

  const chartData = history.map((h) => ({
    date: formatDate(h.date),
    value: h[selectedMetric],
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-500" />
          Usage History
        </h3>
        <div className="flex items-center gap-2">
          {(['apiCalls', 'storage', 'users'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedMetric === metric
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {metricConfig[metric].label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickFormatter={(v: number) => formatNumber(v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => [metricConfig[selectedMetric].format(value), metricConfig[selectedMetric].label]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={metricConfig[selectedMetric].color}
              fill={metricConfig[selectedMetric].color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// Projections Card
function ProjectionsCard({ projections }: { projections: UsageData['projections'] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-violet-500" />
        End of Period Projections
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Based on your current usage rate, here&apos;s what we expect by the end of this billing period:
      </p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-violet-500" />
            <span className="text-gray-700 dark:text-gray-300">Projected API Calls</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatNumber(projections.apiCalls)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-cyan-500" />
            <span className="text-gray-700 dark:text-gray-300">Projected Storage</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {projections.storage.toFixed(1)} GB
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-violet-500" />
            <span className="text-gray-700 dark:text-gray-300">Estimated Additional Cost</span>
          </div>
          <span
            className={`font-semibold ${
              projections.estimatedOverage > 0
                ? 'text-red-600'
                : 'text-green-600'
            }`}
          >
            {projections.estimatedOverage > 0
              ? formatCurrency(projections.estimatedOverage)
              : 'No overage expected'}
          </span>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm">
        💡 Projections are estimates based on your current usage patterns and may change.
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UsageOveragesPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchUsageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/billing/usage`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      } else {
        generateDemoData();
      }
    } catch {
      generateDemoData();
    } finally {
      setIsLoading(false);
    }
  }, [baseURL]);

  const generateDemoData = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Generate history data
    const history = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      history.push({
        date: date.toISOString(),
        apiCalls: Math.floor(2000 + Math.random() * 3000),
        storage: 45 + (30 - i) * 0.5 + Math.random() * 2,
        users: Math.floor(8 + Math.random() * 4),
      });
    }

    setUsageData({
      period: {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
        daysRemaining,
      },
      metrics: [
        {
          name: 'API Calls',
          description: 'Total API requests this period',
          used: 85000,
          limit: 100000,
          unit: 'calls',
          overageRate: 0.001,
          icon: 'api',
          color: '#8b5cf6',
        },
        {
          name: 'Storage',
          description: 'Data storage used',
          used: 78,
          limit: 100,
          unit: 'GB',
          overageRate: 0.1,
          icon: 'storage',
          color: '#06b6d4',
        },
        {
          name: 'Active Users',
          description: 'Users with activity this period',
          used: 12,
          limit: 50,
          unit: 'users',
          overageRate: 10,
          icon: 'users',
          color: '#22c55e',
        },
        {
          name: 'Bandwidth',
          description: 'Data transfer this period',
          used: 120,
          limit: 100,
          unit: 'GB',
          overageRate: 0.08,
          icon: 'bandwidth',
          color: '#f59e0b',
        },
      ],
      overageCharges: {
        total: 1.6,
        breakdown: [
          {
            metric: 'Bandwidth',
            amount: 1.6,
            quantity: 20,
          },
        ],
      },
      history,
      projections: {
        apiCalls: 110000,
        storage: 85,
        estimatedOverage: 11.6,
      },
    });
  };

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsageData();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (!usageData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Usage Data Unavailable
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Unable to load usage information. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/billing"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Activity className="w-7 h-7 text-violet-500" />
                Usage & Overages
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Monitor your resource consumption and overage charges
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Billing Period */}
        <BillingPeriodHeader period={usageData.period} />

        {/* Usage Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {usageData.metrics.map((metric, idx) => (
            <UsageMetricCard key={metric.name} metric={metric} index={idx} />
          ))}
        </div>

        {/* Charts and Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <UsageHistoryChart history={usageData.history} />
          </div>
          <OverageSummaryCard overageCharges={usageData.overageCharges} />
        </div>

        {/* Projections */}
        <ProjectionsCard projections={usageData.projections} />
      </div>
    </div>
  );
}
