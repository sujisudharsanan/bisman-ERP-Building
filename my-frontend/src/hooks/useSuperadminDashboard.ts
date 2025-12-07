/**
 * SuperAdmin Dashboard Hooks
 * Custom React hooks for fetching dashboard data with loading/error states
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  TimeRange,
  TenantStats,
  TenantTrendPoint,
  BillingStats,
  RevenueTrendPoint,
  HealthSummary,
  DeploymentStats,
  DeploymentTrendPoint,
  IncidentStats,
  SecurityStats,
  AIUsageStats,
  AuditStats,
  BackupStats,
  RiskStats,
} from '@/types/superadmin-dashboard';
import {
  fetchAllDashboardData,
  fetchTenantTrend,
  fetchRevenueTrend,
  fetchDeploymentTrend,
  type DashboardData,
} from '@/services/superadminDashboardService';

// ============================================================================
// Generic Hook State
// ============================================================================

interface UseDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Dashboard Data Hook
// ============================================================================

export function useDashboardData(autoRefreshMs?: number): UseDataState<DashboardData> & {
  lastRefresh: Date | null;
} {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllDashboardData();
      setData(result);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();

    if (autoRefreshMs && autoRefreshMs > 0) {
      const interval = setInterval(refetch, autoRefreshMs);
      return () => clearInterval(interval);
    }
  }, [refetch, autoRefreshMs]);

  return { data, loading, error, refetch, lastRefresh };
}

// ============================================================================
// Trend Data Hooks
// ============================================================================

export function useTenantTrend(timeRange: TimeRange): UseDataState<TenantTrendPoint[]> {
  const [data, setData] = useState<TenantTrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTenantTrend(timeRange);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tenant trend');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useRevenueTrend(timeRange: TimeRange): UseDataState<RevenueTrendPoint[]> {
  const [data, setData] = useState<RevenueTrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRevenueTrend(timeRange);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch revenue trend');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useDeploymentTrend(timeRange: TimeRange): UseDataState<DeploymentTrendPoint[]> {
  const [data, setData] = useState<DeploymentTrendPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDeploymentTrend(timeRange);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deployment trend');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// ============================================================================
// Time Range Hook
// ============================================================================

export function useTimeRange(defaultRange: TimeRange = '7days') {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultRange);

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '14days', label: 'Last 14 Days' },
    { value: '30days', label: 'Last 30 Days' },
  ];

  return { timeRange, setTimeRange, timeRangeOptions };
}

// ============================================================================
// Auto-refresh Hook
// ============================================================================

export function useAutoRefresh(
  onRefresh: () => void,
  intervalMs: number,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const interval = setInterval(onRefresh, intervalMs);
    return () => clearInterval(interval);
  }, [onRefresh, intervalMs, enabled]);
}
