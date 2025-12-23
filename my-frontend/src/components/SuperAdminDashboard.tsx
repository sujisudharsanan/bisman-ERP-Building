/**
 * SuperAdmin Dashboard
 * Comprehensive dashboard consolidating all 12 menu items with REAL API data
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardData, useTimeRange, useTenantTrend, useRevenueTrend, useDeploymentTrend } from '@/hooks/useSuperadminDashboard';
import { KPICard, KPIGrid, MiniKPI } from '@/components/dashboard/KPICard';
import { LineChart, BarChart, DonutChart, ChartCard, EmptyChart } from '@/components/dashboard/DashboardCharts';
import type { HealthStatus, TimeRange } from '@/types/superadmin-dashboard';

// ============================================================================
// Icons (SSR-safe inline SVGs)
// ============================================================================

const Icons = {
  Users: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Dollar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Health: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Rocket: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  AI: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Database: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
    </svg>
  ),
};

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

const formatNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

const getHealthColor = (status: HealthStatus): string => {
  switch (status) {
    case 'healthy': return 'text-green-600';
    case 'degraded': return 'text-yellow-600';
    case 'critical': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

// ============================================================================
// Section Header Component
// ============================================================================

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {icon && <span className="text-gray-500">{icon}</span>}
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    </div>
    {action}
  </div>
);

// ============================================================================
// Time Range Selector
// ============================================================================

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ value, onChange }) => {
  const options: { value: TimeRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7days', label: '7 Days' },
    { value: '14days', label: '14 Days' },
    { value: '30days', label: '30 Days' },
  ];

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-md transition-all
            ${value === opt.value
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'}
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// Health Status Component
// ============================================================================

interface HealthComponentCardProps {
  name: string;
  status: HealthStatus;
  latency?: number;
}

const HealthComponentCard: React.FC<HealthComponentCardProps> = ({ name, status, latency }) => {
  const statusDot = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
        <span className="text-sm text-gray-700">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {latency !== undefined && (
          <span className="text-xs text-gray-500">{latency}ms</span>
        )}
        <span className={`text-xs font-medium ${getHealthColor(status)}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Main Dashboard Component
// ============================================================================

export const SuperAdminDashboard: React.FC = () => {
  const router = useRouter();
  const { data, loading, error, refetch, lastRefresh } = useDashboardData(60000); // Auto-refresh every 60s
  const { timeRange, setTimeRange } = useTimeRange('7days');

  // Fetch real trend data from API
  const { data: tenantTrendData } = useTenantTrend(timeRange);
  const { data: revenueTrendData } = useRevenueTrend(timeRange);
  const { data: deploymentTrendData } = useDeploymentTrend(timeRange);

  // Memoize chart data to prevent unnecessary re-renders
  const healthDonutData = useMemo(() => {
    if (!data?.health.components.length) {
      return { labels: ['No Data'], data: [1], colors: ['#E5E7EB'] };
    }

    const statusCounts = {
      healthy: 0,
      degraded: 0,
      critical: 0,
      unknown: 0,
    };

    data.health.components.forEach((c) => {
      statusCounts[c.status]++;
    });

    return {
      labels: ['Healthy', 'Degraded', 'Critical', 'Unknown'],
      data: [statusCounts.healthy, statusCounts.degraded, statusCounts.critical, statusCounts.unknown],
      colors: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
    };
  }, [data?.health.components]);

  // Process real tenant trend data from API
  const tenantTrend = useMemo(() => {
    if (!tenantTrendData?.length) {
      // Fallback with minimal data based on current stats
      const days = timeRange === 'today' ? 24 : timeRange === '7days' ? 7 : timeRange === '14days' ? 14 : 30;
      return {
        labels: Array.from({ length: days }, (_, i) => timeRange === 'today' ? `${i}:00` : `Day ${i + 1}`),
        newTenants: Array.from({ length: days }, () => 0),
        totalActive: Array.from({ length: days }, () => data?.tenants.active || 0),
      };
    }

    return {
      labels: tenantTrendData.map(t => t.date),
      newTenants: tenantTrendData.map(t => t.newTenants || 0),
      totalActive: tenantTrendData.map(t => t.totalActive || 0),
    };
  }, [tenantTrendData, timeRange, data?.tenants.active]);

  // Process real revenue trend data from API
  const revenueTrend = useMemo(() => {
    if (!revenueTrendData?.length) {
      const days = timeRange === 'today' ? 24 : timeRange === '7days' ? 7 : timeRange === '14days' ? 14 : 30;
      const dailyRevenue = (data?.billing.mrr || 0) / 30;
      return {
        labels: Array.from({ length: days }, (_, i) => timeRange === 'today' ? `${i}:00` : `Day ${i + 1}`),
        revenue: Array.from({ length: days }, () => dailyRevenue),
      };
    }

    return {
      labels: revenueTrendData.map(t => t.date),
      revenue: revenueTrendData.map(t => t.revenue || 0),
    };
  }, [revenueTrendData, timeRange, data?.billing.mrr]);

  // Process real deployment trend data from API
  const deploymentTrend = useMemo(() => {
    if (!deploymentTrendData?.length) {
      const days = timeRange === 'today' ? 24 : 7;
      return {
        labels: Array.from({ length: days }, (_, i) => timeRange === 'today' ? `${i}:00` : `Day ${i + 1}`),
        successful: Array.from({ length: days }, () => 0),
        failed: Array.from({ length: days }, () => 0),
      };
    }

    return {
      labels: deploymentTrendData.map(t => t.date),
      successful: deploymentTrendData.map(t => t.successful || 0),
      failed: deploymentTrendData.map(t => t.failed || 0),
    };
  }, [deploymentTrendData, timeRange]);

  // Navigation handlers
  const navigateTo = (path: string) => () => router.push(path);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm border">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Dashboard Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SuperAdmin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            System overview and key performance metrics
            {lastRefresh && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                • Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <button
            onClick={refetch}
            disabled={loading}
            className={`
              p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
              ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
            `}
            title="Refresh data"
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>
              <Icons.Refresh />
            </span>
          </button>
        </div>
      </div>

      {/* ===== TOP KPIs ===== */}
      <KPIGrid columns={6} className="mb-8">
        <KPICard
          title="Total Tenants"
          value={data?.tenants.total || 0}
          subtext={`${data?.tenants.newThisMonth || 0} new this month`}
          icon={<Icons.Users />}
          loading={loading}
          onClick={navigateTo('/super-admin/tenants')}
        />
        <KPICard
          title="Active Tenants"
          value={data?.tenants.active || 0}
          subtext={`${data?.tenants.pending || 0} pending`}
          icon={<Icons.Users />}
          loading={loading}
          onClick={navigateTo('/super-admin/tenants')}
        />
        <KPICard
          title="Monthly Revenue"
          value={formatCurrency(data?.billing.mrr || 0)}
          subtext={`${data?.billing.activeSubscriptions || 0} active subs`}
          icon={<Icons.Dollar />}
          loading={loading}
          onClick={navigateTo('/super-admin/billing')}
        />
        <KPICard
          title="System Health"
          value={data?.health.overall ? data.health.overall.toUpperCase() : 'LOADING'}
          subtext={`${data?.health.uptime?.toFixed(2) || 99.9}% uptime`}
          icon={<Icons.Health />}
          status={data?.health.overall}
          loading={loading}
          onClick={navigateTo('/super-admin/system/health-dashboard')}
        />
        <KPICard
          title="Open Incidents"
          value={data?.incidents.open || 0}
          subtext={`${data?.incidents.criticalOpen || 0} critical`}
          icon={<Icons.Alert />}
          loading={loading}
          onClick={navigateTo('/super-admin/system/fallback-recovery')}
        />
        <KPICard
          title="Deployments Today"
          value={data?.deployments.deploymentsToday || 0}
          subtext={`${data?.deployments.failedDeployments || 0} failed`}
          icon={<Icons.Rocket />}
          loading={loading}
          onClick={navigateTo('/super-admin/system/deployment-tools')}
        />
      </KPIGrid>

      {/* ===== SECTION 1: Tenants & Billing Trends ===== */}
      <SectionHeader title="Tenants & Revenue" icon={<Icons.Users />} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChart
          title="Tenant Growth"
          labels={tenantTrend.labels}
          datasets={[
            { label: 'New Tenants', data: tenantTrend.newTenants, borderColor: '#3B82F6' },
            { label: 'Total Active', data: tenantTrend.totalActive, borderColor: '#10B981', fill: true },
          ]}
          loading={loading}
          height={280}
        />
        <LineChart
          title="Revenue Trend"
          labels={revenueTrend.labels}
          datasets={[
            { label: 'Revenue ($)', data: revenueTrend.revenue, borderColor: '#8B5CF6', fill: true },
          ]}
          loading={loading}
          height={280}
        />
      </div>

      {/* ===== SECTION 2: Deployments & Health ===== */}
      <SectionHeader title="Deployments & System Health" icon={<Icons.Rocket />} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <BarChart
          title="Deployment Activity"
          labels={deploymentTrend.labels}
          datasets={[
            { label: 'Successful', data: deploymentTrend.successful, backgroundColor: '#10B981' },
            { label: 'Failed', data: deploymentTrend.failed, backgroundColor: '#EF4444' },
          ]}
          stacked
          loading={loading}
          height={280}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DonutChart
            title="Health Overview"
            labels={healthDonutData.labels}
            data={healthDonutData.data}
            colors={healthDonutData.colors}
            loading={loading}
            height={200}
            showLegend={false}
          />
          <ChartCard title="Component Status">
            <div className="max-h-[200px] overflow-y-auto">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded" />
                  ))}
                </div>
              ) : data?.health.components.length ? (
                data.health.components.map((comp, i) => (
                  <HealthComponentCard
                    key={i}
                    name={comp.name}
                    status={comp.status}
                    latency={comp.latency}
                  />
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">No components</div>
              )}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ===== SECTION 3: Security & AI ===== */}
      <SectionHeader title="Security & AI Usage" icon={<Icons.Shield />} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Security Snapshot */}
        <ChartCard title="Security Snapshot">
          <div className="space-y-1">
            <MiniKPI
              label="2FA Adoption"
              value={`${data?.security.twoFactorAdoptionRate?.toFixed(1) || 0}%`}
              status={
                (data?.security.twoFactorAdoptionRate || 0) >= 80
                  ? 'good'
                  : (data?.security.twoFactorAdoptionRate || 0) >= 50
                  ? 'warning'
                  : 'danger'
              }
            />
            <MiniKPI label="Active Sessions" value={data?.security.activeSessions || 0} />
            <MiniKPI
              label="Failed Logins (24h)"
              value={data?.security.failedLogins24h || 0}
              status={(data?.security.failedLogins24h || 0) > 10 ? 'warning' : 'good'}
            />
            <MiniKPI
              label="Open Alerts"
              value={data?.security.openAlerts || 0}
              status={(data?.security.openAlerts || 0) > 0 ? 'danger' : 'good'}
            />
          </div>
          <button
            onClick={navigateTo('/super-admin/security/security-center')}
            className="mt-4 w-full px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            View Security Center →
          </button>
        </ChartCard>

        {/* AI Usage */}
        <ChartCard title="AI Usage">
          <div className="space-y-1">
            <MiniKPI label="Requests Today" value={formatNumber(data?.aiUsage.requestsToday || 0)} />
            <MiniKPI label="Tokens Used" value={formatNumber(data?.aiUsage.tokensUsed || 0)} />
            <MiniKPI label="Cost This Month" value={formatCurrency(data?.aiUsage.costThisMonth || 0)} />
            <MiniKPI label="Active Features" value={data?.aiUsage.activeFeatures || 0} />
            <MiniKPI
              label="Errors (24h)"
              value={data?.aiUsage.errors24h || 0}
              status={(data?.aiUsage.errors24h || 0) > 5 ? 'warning' : 'good'}
            />
          </div>
          <button
            onClick={navigateTo('/super-admin/ai-config')}
            className="mt-4 w-full px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            Configure AI →
          </button>
        </ChartCard>
      </div>

      {/* ===== SECTION 4: Audit & Risk ===== */}
      <SectionHeader title="Audit & Reliability" icon={<Icons.Document />} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Audit Overview */}
        <ChartCard title="Audit Overview">
          <div className="space-y-1">
            <MiniKPI label="Logs Today" value={formatNumber(data?.audit.logsToday || 0)} />
            <MiniKPI
              label="Critical Events"
              value={data?.audit.criticalEvents || 0}
              status={(data?.audit.criticalEvents || 0) > 0 ? 'danger' : 'good'}
            />
            <MiniKPI
              label="Security Events"
              value={data?.audit.securityEvents || 0}
              status={(data?.audit.securityEvents || 0) > 10 ? 'warning' : 'neutral'}
            />
            <MiniKPI label="User Activity" value={data?.audit.userActivityEvents || 0} />
          </div>
          <button
            onClick={navigateTo('/super-admin/audit/audit-logs')}
            className="mt-4 w-full px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            View Audit Logs →
          </button>
        </ChartCard>

        {/* Risk & Reliability */}
        <ChartCard title="Risk & Reliability">
          <div className="space-y-1">
            <MiniKPI
              label="Failed Backups"
              value={data?.risk.failedBackups || 0}
              status={(data?.risk.failedBackups || 0) > 0 ? 'danger' : 'good'}
            />
            <MiniKPI
              label="Failed Webhooks"
              value={data?.risk.failedWebhooks || 0}
              status={(data?.risk.failedWebhooks || 0) > 0 ? 'warning' : 'good'}
            />
            <MiniKPI
              label="Pending Recovery"
              value={data?.risk.pendingRecoveryActions || 0}
              status={(data?.risk.pendingRecoveryActions || 0) > 0 ? 'warning' : 'good'}
            />
            <MiniKPI
              label="Maintenance Mode"
              value={data?.risk.maintenanceMode ? 'ON' : 'OFF'}
              status={data?.risk.maintenanceMode ? 'warning' : 'good'}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              onClick={navigateTo('/super-admin/system/fallback-recovery')}
              className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              Recovery →
            </button>
            <button
              onClick={navigateTo('/super-admin/backup/backup-recovery')}
              className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              Backups →
            </button>
          </div>
        </ChartCard>
      </div>

      {/* ===== Quick Links ===== */}
      <SectionHeader title="Quick Access" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Tenants', path: '/super-admin/tenants', icon: <Icons.Users /> },
          { label: 'Billing', path: '/super-admin/billing', icon: <Icons.Dollar /> },
          { label: 'Deployments', path: '/super-admin/system/deployment-tools', icon: <Icons.Rocket /> },
          { label: 'Health', path: '/super-admin/system/health-dashboard', icon: <Icons.Health /> },
          { label: 'Security', path: '/super-admin/security/security-center', icon: <Icons.Shield /> },
          { label: 'Audit Logs', path: '/super-admin/audit/audit-logs', icon: <Icons.Document /> },
          { label: 'AI Config', path: '/super-admin/ai-config', icon: <Icons.AI /> },
          { label: 'Recovery', path: '/super-admin/system/fallback-recovery', icon: <Icons.Alert /> },
          { label: 'Backups', path: '/super-admin/backup/backup-recovery', icon: <Icons.Database /> },
          { label: 'Integrations', path: '/super-admin/integrations', icon: <Icons.Rocket /> },
          { label: 'QA Dashboard', path: '/super-admin/qa-dashboard', icon: <Icons.Health /> },
          { label: 'User Mgmt', path: '/super-admin/users', icon: <Icons.Users /> },
        ].map((link) => (
          <button
            key={link.path}
            onClick={navigateTo(link.path)}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="text-gray-600">{link.icon}</span>
            <span className="text-sm font-medium text-gray-700">{link.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
