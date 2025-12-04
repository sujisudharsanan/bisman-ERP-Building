/**
 * 🛡️ Security Dashboard API Hook
 * BISMAN ERP - React hook for fetching all security dashboard data
 * 
 * Connects to backend endpoints:
 * - GET /api/security/scan
 * - GET /api/admin/service-table-usage
 * - GET /api/audit/dashboard
 * - GET /api/cache/health
 * - GET /api/jobs/status
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';

export interface RouteIssue {
  method: string;
  path: string;
  handler: string;
  hasRbac: boolean;
  hasAuth: boolean;
  risk: RiskLevel;
  suggestion: string;
}

export interface SqlIssue {
  file: string;
  line: number;
  code: string;
  risk: RiskLevel;
  suggestion: string;
}

export interface CacheIssue {
  key: string;
  ttl: number;
  idleTime: number;
  risk: RiskLevel;
}

export interface AuditIssue {
  type: string;
  count: number;
  lastOccurrence: string;
  risk: RiskLevel;
  description: string;
}

export interface ConnectionInfo {
  active: number;
  idle: number;
  waiting: number;
  maxConnections: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface SecurityScanResult {
  unprotectedRoutes: RouteIssue[];
  rawSqlUsage: SqlIssue[];
  staleCacheEntries: CacheIssue[];
  auditAnalysis: AuditIssue[];
  connectionInfo: ConnectionInfo;
  overallRisk: RiskLevel;
  scanTimestamp: string;
}

export interface ServiceTableUsage {
  serviceName: string;
  tableName: string;
  operation: string;
  count: number;
  lastAccess: string;
  isSuspicious: boolean;
  isSensitive: boolean;
}

export interface RateLimitStats {
  endpoint: string;
  currentCount: number;
  limit: number;
  windowMs: number;
  blocked: number;
  percentUsed: number;
}

export interface CacheHealth {
  totalKeys: number;
  memoryUsage: string;
  hitRate: number;
  missRate: number;
  evictions: number;
  pubsubChannels: string[];
  connectedClients: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface CleanupJobStatus {
  jobName: string;
  lastRun: string | null;
  nextRun: string;
  status: 'running' | 'completed' | 'scheduled' | 'failed';
  recordsProcessed: number;
  duration: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId: number;
  username: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValues: any;
  newValues: any;
  ipAddress: string;
  userAgent: string;
  serviceName: string;
  createdAt: string;
}

export interface DistributedLockInfo {
  key: string;
  owner: string;
  ttl: number;
  acquiredAt: string;
}

export interface SecurityDashboardData {
  scanResult: SecurityScanResult | null;
  serviceTableUsage: ServiceTableUsage[];
  rateLimitStats: RateLimitStats[];
  cacheHealth: CacheHealth | null;
  cleanupJobs: CleanupJobStatus[];
  auditLogs: AuditLogEntry[];
  activeLocks: DistributedLockInfo[];
}

export interface SecurityDashboardState extends SecurityDashboardData {
  loading: {
    scan: boolean;
    usage: boolean;
    audit: boolean;
    cache: boolean;
    jobs: boolean;
    locks: boolean;
  };
  error: string | null;
  lastRefresh: Date | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
};

/**
 * Fetch full security scan results
 * GET /api/security/scan
 */
export const fetchSecurityScan = async (): Promise<SecurityScanResult> => {
  const response = await fetch('/api/security/scan', {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleApiResponse<SecurityScanResult>(response);
};

/**
 * Fetch unprotected routes only
 * GET /api/security/routes
 */
export const fetchUnprotectedRoutes = async (): Promise<RouteIssue[]> => {
  const response = await fetch('/api/security/routes', {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  const data = await handleApiResponse<{ routes: RouteIssue[] }>(response);
  return data.routes;
};

/**
 * Fetch raw SQL usage analysis
 * GET /api/security/raw-sql
 */
export const fetchRawSqlUsage = async (): Promise<SqlIssue[]> => {
  const response = await fetch('/api/security/raw-sql', {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  const data = await handleApiResponse<{ rawSqlUsage: SqlIssue[] }>(response);
  return data.rawSqlUsage;
};

/**
 * Fetch service-table usage data
 * GET /api/admin/service-table-usage
 */
export const fetchServiceTableUsage = async (
  options: { sensitiveOnly?: boolean; limit?: number; offset?: number } = {}
): Promise<{ data: ServiceTableUsage[]; total: number }> => {
  const params = new URLSearchParams();
  if (options.sensitiveOnly) params.set('sensitiveOnly', 'true');
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));

  const response = await fetch(`/api/admin/service-table-usage?${params}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleApiResponse<{ data: ServiceTableUsage[]; total: number }>(response);
};

/**
 * Mark a service as suspicious
 * POST /api/admin/mark-suspicious
 */
export const markServiceSuspicious = async (
  serviceName: string,
  reason?: string
): Promise<{ success: boolean }> => {
  const response = await fetch('/api/admin/mark-suspicious', {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ serviceName, reason }),
  });
  return handleApiResponse<{ success: boolean }>(response);
};

/**
 * Fetch audit logs
 * GET /api/audit/logs
 */
export const fetchAuditLogs = async (
  options: { limit?: number; offset?: number; action?: string; table?: string } = {}
): Promise<{ logs: AuditLogEntry[]; total: number }> => {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  if (options.action) params.set('action', options.action);
  if (options.table) params.set('table', options.table);

  const response = await fetch(`/api/audit/logs?${params}`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleApiResponse<{ logs: AuditLogEntry[]; total: number }>(response);
};

/**
 * Fetch audit dashboard summary
 * GET /api/audit/dashboard
 */
export const fetchAuditDashboard = async (): Promise<{
  summary: AuditIssue[];
  recentActivity: AuditLogEntry[];
}> => {
  const response = await fetch('/api/audit/dashboard', {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleApiResponse(response);
};

/**
 * Fetch cache health status
 * GET /api/cache/health
 */
export const fetchCacheHealth = async (): Promise<CacheHealth> => {
  const response = await fetch('/api/cache/health', {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  return handleApiResponse<CacheHealth>(response);
};

/**
 * Fetch rate limit statistics
 * GET /api/rate-limit/stats
 */
export const fetchRateLimitStats = async (): Promise<RateLimitStats[]> => {
  const response = await fetch('/api/rate-limit/stats', {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  const data = await handleApiResponse<{ stats: RateLimitStats[] }>(response);
  return data.stats;
};

/**
 * Fetch cleanup job status
 * GET /api/jobs/status
 */
export const fetchCleanupJobStatus = async (): Promise<CleanupJobStatus[]> => {
  const response = await fetch('/api/jobs/status', {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  const data = await handleApiResponse<{ jobs: CleanupJobStatus[] }>(response);
  return data.jobs;
};

/**
 * Fetch active distributed locks
 * GET /api/locks/active
 */
export const fetchActiveLocks = async (): Promise<DistributedLockInfo[]> => {
  const response = await fetch('/api/locks/active', {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  const data = await handleApiResponse<{ locks: DistributedLockInfo[] }>(response);
  return data.locks;
};

// ============================================================================
// REACT HOOK
// ============================================================================

interface UseSecurityDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

export function useSecurityDashboard(options: UseSecurityDashboardOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
  } = options;

  const [state, setState] = useState<SecurityDashboardState>({
    scanResult: null,
    serviceTableUsage: [],
    rateLimitStats: [],
    cacheHealth: null,
    cleanupJobs: [],
    auditLogs: [],
    activeLocks: [],
    loading: {
      scan: false,
      usage: false,
      audit: false,
      cache: false,
      jobs: false,
      locks: false,
    },
    error: null,
    lastRefresh: null,
  });

  // Fetch all data from real APIs
  const fetchAll = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: { scan: true, usage: true, audit: true, cache: true, jobs: true, locks: true },
      error: null,
    }));

    try {
      // Fetch real data from APIs in parallel
      const [
        scanResult,
        usageResult,
        cacheHealth,
        rateLimitStats,
        cleanupJobs,
        auditResult,
        activeLocks,
      ] = await Promise.allSettled([
        fetchSecurityScan(),
        fetchServiceTableUsage({ limit: 50 }),
        fetchCacheHealth(),
        fetchRateLimitStats(),
        fetchCleanupJobStatus(),
        fetchAuditLogs({ limit: 20 }),
        fetchActiveLocks(),
      ]);

      setState(prev => ({
        ...prev,
        scanResult: scanResult.status === 'fulfilled' ? scanResult.value : prev.scanResult,
        serviceTableUsage: usageResult.status === 'fulfilled' ? usageResult.value.data : prev.serviceTableUsage,
        cacheHealth: cacheHealth.status === 'fulfilled' ? cacheHealth.value : prev.cacheHealth,
        rateLimitStats: rateLimitStats.status === 'fulfilled' ? rateLimitStats.value : prev.rateLimitStats,
        cleanupJobs: cleanupJobs.status === 'fulfilled' ? cleanupJobs.value : prev.cleanupJobs,
        auditLogs: auditResult.status === 'fulfilled' ? auditResult.value.logs : prev.auditLogs,
        activeLocks: activeLocks.status === 'fulfilled' ? activeLocks.value : prev.activeLocks,
        loading: { scan: false, usage: false, audit: false, cache: false, jobs: false, locks: false },
        lastRefresh: new Date(),
      }));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setState(prev => ({
        ...prev,
        loading: { scan: false, usage: false, audit: false, cache: false, jobs: false, locks: false },
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, []);

  // Individual fetch functions
  const refreshSecurityScan = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, scan: true } }));
    try {
      const result = await fetchSecurityScan();
      setState(prev => ({
        ...prev,
        scanResult: result,
        loading: { ...prev.loading, scan: false },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, scan: false },
        error: error instanceof Error ? error.message : 'Failed to refresh scan',
      }));
    }
  }, []);

  const refreshServiceUsage = useCallback(async () => {
    setState(prev => ({ ...prev, loading: { ...prev.loading, usage: true } }));
    try {
      const result = await fetchServiceTableUsage({ limit: 50 });
      setState(prev => ({
        ...prev,
        serviceTableUsage: result.data,
        loading: { ...prev.loading, usage: false },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, usage: false },
        error: error instanceof Error ? error.message : 'Failed to refresh usage data',
      }));
    }
  }, []);

  const handleMarkSuspicious = useCallback(async (serviceName: string, reason?: string) => {
    try {
      await markServiceSuspicious(serviceName, reason);
      setState(prev => ({
        ...prev,
        serviceTableUsage: prev.serviceTableUsage.map(u =>
          u.serviceName === serviceName ? { ...u, isSuspicious: true } : u
        ),
      }));
      return true;
    } catch (error) {
      console.error('Failed to mark suspicious:', error);
      return false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchAll, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAll]);

  return {
    ...state,
    fetchAll,
    refreshSecurityScan,
    refreshServiceUsage,
    markSuspicious: handleMarkSuspicious,
  };
}

export default useSecurityDashboard;
