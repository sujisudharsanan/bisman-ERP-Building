/**
 * 🛡️ useSecurityGovernance Hook
 * 
 * React Query hooks for the Security & Audit Control UI.
 * Used by Enterprise Admins and Super Admins for governance dashboards.
 * 
 * Features:
 * - Security overview dashboard data
 * - Security violations log with pagination/filtering
 * - RBAC structure hierarchy
 * - Audit health status
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================
// TYPES
// ============================================

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL';
export type ScopeType = 'ENTERPRISE' | 'MODULE';
export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SecurityCard {
  id: string;
  title: string;
  value: string;
  status: HealthStatus;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
  description: string;
  icon: string;
  detail?: string;
}

export interface SecurityOverviewResponse {
  ok: boolean;
  scope: {
    type: ScopeType;
    moduleId: string | null;
  };
  lastUpdated: string;
  healthStatus: {
    status: HealthStatus;
    label: string;
    color: string;
    description: string;
  };
  cards: SecurityCard[];
  summary: {
    totalUsers: number;
    activeModules: number;
    activeClients: number;
    recentDenials: number;
    recentViolations: number;
    auditLogCount: number;
  };
}

export interface SecurityViolation {
  id: string | number;
  timestamp: string;
  user: string;
  userId: number | null;
  roleLevel: string;
  moduleId: string | null;
  clientId: string | null;
  action: string;
  tableName: string | null;
  recordId: string | null;
  reason: string;
  severity: ViolationSeverity;
  ipAddress: string | null;
}

export interface ViolationsResponse {
  ok: boolean;
  scope: {
    type: ScopeType;
    moduleId: string | null;
  };
  violations: SecurityViolation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    applied: Record<string, unknown>;
    available: {
      severities: ViolationSeverity[];
    };
  };
}

export interface RoleDefinition {
  level: number;
  label: string;
  description: string;
  scope: 'ENTERPRISE' | 'MODULE' | 'CLIENT';
  color: string;
  children: string[];
}

export interface RBACNode {
  role: string;
  level: number;
  label: string;
  description: string;
  scope: string;
  color: string;
  userCount?: number;
  moduleId?: string;
  moduleName?: string;
  moduleEmail?: string;
  clientId?: string;
  clientName?: string;
  children?: RBACNode[];
}

export interface RBACStructureResponse {
  ok: boolean;
  scope: {
    type: ScopeType;
    moduleId: string | null;
  };
  hierarchy: RBACNode;
  roleDefinitions: Record<string, RoleDefinition>;
  statistics: {
    totalModules: number;
    totalClients: number;
    roleDistribution: Record<string, number>;
  };
  explanation: {
    title: string;
    paragraphs: string[];
    keyPoints: Array<{ icon: string; text: string }>;
  };
}

export interface AuditHealthResponse {
  ok: boolean;
  status: HealthStatus;
  summary: {
    logsLast24h: number;
    logsLast7d: number;
    completenessRate: string;
    totalIssues: number;
  };
  issues: {
    missingUser: number;
    missingAction: number;
    futureTimestamp: number;
  };
  topActions: Array<{ action: string; count: number }>;
  confidence: {
    isReliable: boolean;
    statement: string;
  };
}

export interface ViolationFilters {
  page?: number;
  limit?: number;
  moduleId?: string;
  dateFrom?: string;
  dateTo?: string;
  severity?: ViolationSeverity;
}

// ============================================
// HOOKS
// ============================================

/**
 * Fetch security overview dashboard data
 */
export function useSecurityOverview() {
  return useQuery<SecurityOverviewResponse>({
    queryKey: ['security-governance', 'overview'],
    queryFn: async () => {
      const response = await api.get('/security-governance/overview');
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto refresh every minute
  });
}

/**
 * Fetch security violations log with pagination/filtering
 */
export function useSecurityViolations(filters: ViolationFilters = {}) {
  const { page = 1, limit = 25, moduleId, dateFrom, dateTo, severity } = filters;
  
  return useQuery<ViolationsResponse>({
    queryKey: ['security-governance', 'violations', { page, limit, moduleId, dateFrom, dateTo, severity }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (moduleId) params.set('moduleId', moduleId);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (severity) params.set('severity', severity);
      
      const response = await api.get(`/security-governance/violations?${params.toString()}`);
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch RBAC structure hierarchy
 */
export function useRBACStructure() {
  return useQuery<RBACStructureResponse>({
    queryKey: ['security-governance', 'rbac-structure'],
    queryFn: async () => {
      const response = await api.get('/security-governance/rbac-structure');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - structure changes rarely
  });
}

/**
 * Fetch audit log health status
 */
export function useAuditHealth() {
  return useQuery<AuditHealthResponse>({
    queryKey: ['security-governance', 'audit-health'],
    queryFn: async () => {
      const response = await api.get('/security-governance/audit-health');
      return response.data;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Auto refresh every 2 minutes
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get color class for health status
 */
export function getHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'HEALTHY':
      return 'text-green-600 dark:text-green-400';
    case 'WARNING':
      return 'text-amber-600 dark:text-amber-400';
    case 'CRITICAL':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

/**
 * Get background color class for health status
 */
export function getHealthStatusBgColor(status: HealthStatus): string {
  switch (status) {
    case 'HEALTHY':
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    case 'WARNING':
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    case 'CRITICAL':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
  }
}

/**
 * Get severity badge classes
 */
export function getSeverityClasses(severity: ViolationSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'LOW':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
}

/**
 * Get role scope color
 */
export function getRoleScopeColor(scope: string): string {
  switch (scope) {
    case 'ENTERPRISE':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
    case 'MODULE':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
    case 'CLIENT':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300';
  }
}

/**
 * Format timestamp for display
 */
export function formatViolationTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return timestamp;
  }
}

/**
 * Format large numbers for display
 */
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toLocaleString();
}
