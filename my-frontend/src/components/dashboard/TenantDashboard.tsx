/**
 * Tenant Dashboard Components
 * 
 * React components for displaying per-tenant metrics to admins.
 */

import React, { useEffect, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================
interface QuotaUsage {
  apiCallsToday: number;
  apiCallsLimit: number;
  apiCallsPercent: number;
  storageUsed: number;
  storageLimit: number;
  storagePercent: number;
  activeUsers: number;
  activeUsersLimit: number;
  activeUsersPercent: number;
}

interface Subscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'trial' | 'canceling' | 'payment_failed' | 'trial_expired';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface Metric {
  current: number;
  target: number;
  compliant: boolean;
  unit: string;
}

interface SLAMetrics {
  availability: Metric;
  p95Latency: Metric;
  errorRate: Metric;
}

interface ErrorBudget {
  total: number;
  remaining: number;
  percentRemaining: number;
  unit: string;
}

// ============================================================================
// QuotaUsageBar Component
// ============================================================================
interface QuotaUsageBarProps {
  label: string;
  current: number;
  limit: number;
  percent: number;
  unit?: string;
  formatValue?: (value: number) => string;
}

export const QuotaUsageBar: React.FC<QuotaUsageBarProps> = ({
  label,
  current,
  limit,
  percent,
  unit = '',
  formatValue = (v) => v.toLocaleString()
}) => {
  const getBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-red-500';
    if (pct >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = (pct: number) => {
    if (pct >= 80) return 'text-red-600 dark:text-red-400';
    if (pct >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className={`text-sm font-semibold ${getTextColor(percent)}`}>
          {formatValue(current)} / {formatValue(limit)} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${getBarColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="text-right">
        <span className={`text-xs ${getTextColor(percent)}`}>
          {percent}% used
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// QuotaUsageCard Component
// ============================================================================
interface QuotaUsageCardProps {
  quotaUsage: QuotaUsage;
}

export const QuotaUsageCard: React.FC<QuotaUsageCardProps> = ({ quotaUsage }) => {
  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quota Usage
      </h3>
      <div className="space-y-6">
        <QuotaUsageBar
          label="API Calls Today"
          current={quotaUsage.apiCallsToday}
          limit={quotaUsage.apiCallsLimit}
          percent={quotaUsage.apiCallsPercent}
        />
        <QuotaUsageBar
          label="Storage"
          current={quotaUsage.storageUsed}
          limit={quotaUsage.storageLimit}
          percent={quotaUsage.storagePercent}
          formatValue={formatBytes}
        />
        <QuotaUsageBar
          label="Active Users"
          current={quotaUsage.activeUsers}
          limit={quotaUsage.activeUsersLimit}
          percent={quotaUsage.activeUsersPercent}
        />
      </div>
    </div>
  );
};

// ============================================================================
// BillingStatusCard Component
// ============================================================================
interface BillingStatusCardProps {
  subscription: Subscription;
  pricing: { price: number; currency: string; interval: string };
  trial: { endsAt: string | null; expired: boolean; daysRemaining: number };
  nextInvoice: { date: string | null; amount: number; currency: string };
  onUpgrade: (plan: string) => void;
}

export const BillingStatusCard: React.FC<BillingStatusCardProps> = ({
  subscription,
  pricing,
  trial,
  nextInvoice,
  onUpgrade
}) => {
  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pro': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'trial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'canceling': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'payment_failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Billing Status
      </h3>
      
      <div className="space-y-4">
        {/* Plan and Status Badges */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanBadgeColor(subscription.plan)}`}>
            {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(subscription.status)}`}>
            {subscription.status.replace('_', ' ').charAt(0).toUpperCase() + subscription.status.slice(1).replace('_', ' ')}
          </span>
        </div>

        {/* Trial Warning */}
        {subscription.status === 'trial' && trial.daysRemaining <= 7 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Trial ends in {trial.daysRemaining} days. Upgrade now to keep your features.
            </p>
          </div>
        )}

        {/* Payment Failed Warning */}
        {subscription.status === 'payment_failed' && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-800 dark:text-red-200">
              ❌ Payment failed. Please update your payment method.
            </p>
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            ${pricing.price}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            /{pricing.interval}
          </span>
        </div>

        {/* Next Invoice */}
        {nextInvoice.date && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Next invoice: <span className="font-medium">{formatDate(nextInvoice.date)}</span>
            {' '}for ${nextInvoice.amount}
          </div>
        )}

        {/* Upgrade Buttons */}
        {subscription.plan !== 'enterprise' && (
          <div className="pt-4 space-y-2">
            {subscription.plan === 'free' && (
              <button
                onClick={() => onUpgrade('pro')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Upgrade to Pro - $49/mo
              </button>
            )}
            <button
              onClick={() => onUpgrade('enterprise')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Upgrade to Enterprise - $199/mo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SLAComplianceCard Component
// ============================================================================
interface SLAComplianceCardProps {
  metrics: SLAMetrics;
  errorBudget: ErrorBudget;
  slaCompliant: boolean;
  tier: string;
}

export const SLAComplianceCard: React.FC<SLAComplianceCardProps> = ({
  metrics,
  errorBudget,
  slaCompliant,
  tier
}) => {
  const MetricGauge: React.FC<{ metric: Metric; label: string; inverse?: boolean }> = ({
    metric,
    label,
    inverse = false
  }) => {
    // For error rate, lower is better (inverse)
    const isGood = inverse 
      ? metric.current <= metric.target
      : metric.current >= metric.target;
    
    return (
      <div className="text-center">
        <div className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
          {metric.current}{metric.unit === '%' ? '%' : metric.unit}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Target: {metric.target}{metric.unit}
        </div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
          {label}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          SLA Compliance
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          slaCompliant 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {slaCompliant ? '✓ Compliant' : '✗ At Risk'}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricGauge metric={metrics.availability} label="Availability" />
        <MetricGauge metric={metrics.p95Latency} label="P95 Latency" inverse />
        <MetricGauge metric={metrics.errorRate} label="Error Rate" inverse />
      </div>

      {/* Error Budget */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Error Budget</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {errorBudget.remaining.toFixed(1)} / {errorBudget.total.toFixed(1)} {errorBudget.unit}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              errorBudget.percentRemaining > 50 ? 'bg-green-500' :
              errorBudget.percentRemaining > 20 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${errorBudget.percentRemaining}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
          {errorBudget.percentRemaining}% remaining
        </div>
      </div>

      {/* SLA Tier */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          SLA Tier: <span className="font-medium">{tier.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// AlertBanner Component
// ============================================================================
interface AlertBannerProps {
  alerts: {
    trialExpiring?: boolean;
    paymentFailed?: boolean;
    quotaWarning?: boolean;
  };
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts }) => {
  const activeAlerts = [];
  
  if (alerts.paymentFailed) {
    activeAlerts.push({
      type: 'error',
      message: 'Payment failed. Please update your payment method to avoid service interruption.',
      icon: '❌'
    });
  }
  
  if (alerts.trialExpiring) {
    activeAlerts.push({
      type: 'warning',
      message: 'Your trial is expiring soon. Upgrade now to keep your features.',
      icon: '⚠️'
    });
  }
  
  if (alerts.quotaWarning) {
    activeAlerts.push({
      type: 'warning',
      message: 'You are approaching your API quota limit for today.',
      icon: '📊'
    });
  }

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {activeAlerts.map((alert, index) => (
        <div
          key={index}
          className={`p-4 rounded-md ${
            alert.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
              : 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
          }`}
        >
          <p className={`text-sm ${
            alert.type === 'error'
              ? 'text-red-800 dark:text-red-200'
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {alert.icon} {alert.message}
          </p>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// TenantDashboard Main Component
// ============================================================================
interface TenantDashboardProps {
  tenantId: string;
}

export const TenantDashboard: React.FC<TenantDashboardProps> = ({ tenantId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usageRes, billingRes, metricsRes, summaryRes] = await Promise.all([
        fetch(`/api/admin/tenants/${tenantId}/usage`),
        fetch(`/api/admin/tenants/${tenantId}/billing`),
        fetch(`/api/admin/tenants/${tenantId}/metrics?days=30`),
        fetch(`/api/admin/tenants/${tenantId}/summary`)
      ]);

      if (!usageRes.ok || !billingRes.ok || !metricsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [usage, billing, metrics, summary] = await Promise.all([
        usageRes.json(),
        billingRes.json(),
        metricsRes.json(),
        summaryRes.json()
      ]);

      setUsageData(usage.data);
      setBillingData(billing.data);
      setMetricsData(metrics.data);
      setSummaryData(summary.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleUpgrade = async (plan: string) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { data } = await response.json();
      window.location.href = data.checkoutUrl;
    } catch (err) {
      alert('Failed to start upgrade process. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {summaryData?.tenant?.name || 'Tenant'} Dashboard
        </h1>
        <button
          onClick={fetchDashboardData}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Alerts */}
      {summaryData?.alerts && <AlertBanner alerts={summaryData.alerts} />}

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quota Usage */}
        {usageData?.quotaUsage && (
          <QuotaUsageCard quotaUsage={usageData.quotaUsage} />
        )}

        {/* Billing Status */}
        {billingData?.subscription && (
          <BillingStatusCard
            subscription={billingData.subscription}
            pricing={billingData.pricing}
            trial={billingData.trial}
            nextInvoice={billingData.nextInvoice}
            onUpgrade={handleUpgrade}
          />
        )}

        {/* SLA Compliance */}
        {metricsData?.metrics && (
          <SLAComplianceCard
            metrics={metricsData.metrics}
            errorBudget={metricsData.errorBudget}
            slaCompliant={metricsData.sla.compliant}
            tier={metricsData.sla.tier}
          />
        )}
      </div>
    </div>
  );
};

export default TenantDashboard;
