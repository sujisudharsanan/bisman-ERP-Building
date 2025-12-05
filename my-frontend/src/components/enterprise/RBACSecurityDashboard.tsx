'use client';

/**
 * 🔐 RBAC Security Monitoring Dashboard
 * BISMAN ERP - Enterprise Admin RBAC Security Center
 * 
 * Comprehensive RBAC security monitoring showing:
 * - Privilege escalation attempts
 * - Cross-tenant access violations
 * - Permission change activity
 * - Role level distribution
 * - Recent RBAC audit events
 * - Tenant-scoped activity
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePageRefresh } from '@/contexts/RefreshContext';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  UserX,
  UserCheck,
  Building2,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface RBACMetrics {
  permissionChanges: {
    total: number;
    last24h: number;
    last7d: number;
    byRoleLevel: Record<string, number>;
  };
  violations: {
    roleLevelViolations: number;
    crossTenantViolations: number;
    globalRoleAttempts: number;
    last24h: number;
  };
  roleDistribution: {
    level: number;
    name: string;
    count: number;
    activeUsers: number;
  }[];
  tenantActivity: {
    tenantId: string;
    tenantName: string;
    permissionChanges: number;
    violations: number;
    lastActivity: string;
  }[];
  recentAuditEvents: AuditEvent[];
  systemHealth: {
    cacheInvalidations: number;
    auditLogErrors: number;
    permissionCheckErrors: number;
    lastCacheInvalidation: string | null;
  };
}

interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  userId: number;
  userEmail: string;
  roleId?: number;
  roleName?: string;
  tenantId?: string;
  action: string;
  details: Record<string, unknown>;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

interface ViolationAlert {
  id: string;
  type: 'ROLE_LEVEL_VIOLATION' | 'CROSS_TENANT_VIOLATION' | 'GLOBAL_ROLE_MODIFICATION';
  timestamp: string;
  userId: number;
  userEmail: string;
  attemptedAction: string;
  userLevel: number;
  attemptedLevel?: number;
  userTenant?: string;
  targetTenant?: string;
  blocked: boolean;
}

// ============================================================================
// MOCK DATA (Replace with API calls)
// ============================================================================

const mockMetrics: RBACMetrics = {
  permissionChanges: {
    total: 0,
    last24h: 0,
    last7d: 0,
    byRoleLevel: {},
  },
  violations: {
    roleLevelViolations: 0,
    crossTenantViolations: 0,
    globalRoleAttempts: 0,
    last24h: 0,
  },
  roleDistribution: [
    { level: 100, name: 'Enterprise Admin', count: 1, activeUsers: 1 },
    { level: 90, name: 'Super Admin', count: 1, activeUsers: 1 },
    { level: 80, name: 'Admin', count: 2, activeUsers: 2 },
    { level: 50, name: 'Manager', count: 3, activeUsers: 3 },
    { level: 30, name: 'Staff', count: 5, activeUsers: 5 },
    { level: 10, name: 'Basic', count: 4, activeUsers: 4 },
  ],
  tenantActivity: [
    { tenantId: 'default', tenantName: 'Default Tenant', permissionChanges: 0, violations: 0, lastActivity: new Date().toISOString() },
  ],
  recentAuditEvents: [
    // Empty by default - real data comes from API
  ],
  systemHealth: {
    cacheInvalidations: 0,
    auditLogErrors: 0,
    permissionCheckErrors: 0,
    lastCacheInvalidation: null,
  },
};

const mockViolationAlerts: ViolationAlert[] = [
  // Empty by default - real data comes from API
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getRoleLevelColor(level: number): string {
  if (level >= 100) return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30';
  if (level >= 90) return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
  if (level >= 80) return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30';
  if (level >= 50) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
  if (level >= 30) return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
  return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700';
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'WARNING':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    default:
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
  }
}

function getViolationTypeLabel(type: string): string {
  switch (type) {
    case 'ROLE_LEVEL_VIOLATION':
      return 'Privilege Escalation';
    case 'CROSS_TENANT_VIOLATION':
      return 'Cross-Tenant Access';
    case 'GLOBAL_ROLE_MODIFICATION':
      return 'Global Role Modification';
    default:
      return type;
  }
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="flex items-center mt-2">
              {trend === 'up' ? (
                <ArrowUpRight className="w-4 h-4 text-red-500" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="w-4 h-4 text-green-500" />
              ) : null}
              <span className={`text-sm ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// Role Level Distribution Chart
function RoleLevelChart({ data }: { data: RBACMetrics['roleDistribution'] }) {
  const maxUsers = Math.max(...data.map((d) => d.activeUsers));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Role Level Distribution
        </h3>
        <Layers className="w-5 h-5 text-gray-400" />
      </div>
      <div className="space-y-4">
        {data.map((role) => (
          <div key={role.level} className="flex items-center">
            <div className="w-32 flex-shrink-0">
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getRoleLevelColor(role.level)}`}>
                L{role.level} {role.name}
              </span>
            </div>
            <div className="flex-1 mx-4">
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${(role.activeUsers / maxUsers) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-24 text-right">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {role.activeUsers}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                /{role.count}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Violation Alerts Panel
function ViolationAlertsPanel({ alerts }: { alerts: ViolationAlert[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          Security Violations
          {alerts.length > 0 && (
            <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-medium">
              {alerts.length}
            </span>
          )}
        </h3>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No security violations detected</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
                className="w-full px-4 py-3 flex items-center justify-between bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShieldX className="w-5 h-5 text-red-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {getViolationTypeLabel(alert.type)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {alert.userEmail} • {formatTimeAgo(alert.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {alert.blocked && (
                    <span className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-xs font-medium">
                      Blocked
                    </span>
                  )}
                  {expanded === alert.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expanded === alert.id && (
                <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-red-200 dark:border-red-800">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">User ID</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{alert.userId}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">User Level</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{alert.userLevel}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Attempted Action</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{alert.attemptedAction}</dd>
                    </div>
                    {alert.attemptedLevel && (
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Attempted Level</dt>
                        <dd className="font-medium text-red-600">{alert.attemptedLevel}</dd>
                      </div>
                    )}
                    {alert.userTenant && (
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">User Tenant</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">{alert.userTenant}</dd>
                      </div>
                    )}
                    {alert.targetTenant && (
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Target Tenant</dt>
                        <dd className="font-medium text-red-600">{alert.targetTenant}</dd>
                      </div>
                    )}
                    <div className="col-span-2">
                      <dt className="text-gray-500 dark:text-gray-400">Timestamp</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">
                        {formatTimestamp(alert.timestamp)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tenant Activity Table
function TenantActivityTable({ data }: { data: RBACMetrics['tenantActivity'] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-500" />
          Tenant Activity
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Tenant
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Permission Changes
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Violations
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((tenant) => (
              <tr
                key={tenant.tenantId}
                className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {tenant.tenantName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {tenant.permissionChanges}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {tenant.violations > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {tenant.violations}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      0
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right text-sm text-gray-500 dark:text-gray-400">
                  {formatTimeAgo(tenant.lastActivity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Audit Events Timeline
function AuditEventsTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          Recent RBAC Events
        </h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {events.map((event, index) => (
          <div
            key={event.id}
            className={`relative pl-6 pb-4 ${
              index < events.length - 1 ? 'border-l-2 border-gray-200 dark:border-gray-700' : ''
            }`}
          >
            {/* Timeline dot */}
            <div
              className={`absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full ${
                event.severity === 'CRITICAL'
                  ? 'bg-red-500'
                  : event.severity === 'WARNING'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
            />

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(event.severity)}`}>
                    {event.eventType.replace(/_/g, ' ')}
                  </span>
                  {event.roleName && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      → {event.roleName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{event.action}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  by {event.userEmail}
                  {event.tenantId && ` • Tenant: ${event.tenantId}`}
                </p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {formatTimeAgo(event.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// System Health Panel
function SystemHealthPanel({ health }: { health: RBACMetrics['systemHealth'] }) {
  const isHealthy = health.auditLogErrors === 0 && health.permissionCheckErrors < 5;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          {isHealthy ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          )}
          System Health
        </h3>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            isHealthy
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
        >
          {isHealthy ? 'Healthy' : 'Degraded'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Cache Invalidations</span>
            <RefreshCw className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {health.cacheInvalidations}
          </p>
          {health.lastCacheInvalidation && (
            <p className="text-xs text-gray-400 mt-1">
              Last: {formatTimeAgo(health.lastCacheInvalidation)}
            </p>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Audit Log Errors</span>
            {health.auditLogErrors === 0 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
          <p className={`text-2xl font-bold mt-1 ${
            health.auditLogErrors === 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {health.auditLogErrors}
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Permission Check Errors</span>
            {health.permissionCheckErrors < 5 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
          </div>
          <p className={`text-2xl font-bold mt-1 ${
            health.permissionCheckErrors < 5 ? 'text-gray-900 dark:text-white' : 'text-yellow-600'
          }`}>
            {health.permissionCheckErrors}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RBACSecurityDashboard() {
  const [metrics, setMetrics] = useState<RBACMetrics>(mockMetrics);
  const [violations, setViolations] = useState<ViolationAlert[]>(mockViolationAlerts);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch real data from the security dashboard API
      const response = await fetch('/api/security-dashboard/rbac-metrics', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('[RBAC Dashboard] API Response:', result);
      
      if (result.success && result.data) {
        const data = result.data;
        
        console.log('[RBAC Dashboard] Role Distribution from API:', data.roleDistribution);
        console.log('[RBAC Dashboard] Tenant Activity from API:', data.tenantActivity);
        
        // Transform API response to match our component's data structure
        const transformedMetrics: RBACMetrics = {
          permissionChanges: {
            total: data.summary?.permissionChangesWeek || 0,
            last24h: data.summary?.permissionChanges24h || 0,
            last7d: data.summary?.permissionChangesWeek || 0,
            byRoleLevel: {},
          },
          violations: {
            roleLevelViolations: data.summary?.roleLevelViolations24h || 0,
            crossTenantViolations: data.summary?.crossTenantViolations24h || 0,
            globalRoleAttempts: 0,
            last24h: (data.summary?.roleLevelViolations24h || 0) + (data.summary?.crossTenantViolations24h || 0),
          },
          roleDistribution: (data.roleDistribution || []).length > 0 
            ? data.roleDistribution.map((r: { level: number; name: string; count: number; activeUsers: number }) => ({
                level: r.level,
                name: r.name,
                count: r.count,
                activeUsers: r.activeUsers,
              }))
            : mockMetrics.roleDistribution,
          tenantActivity: (data.tenantActivity || []).length > 0
            ? data.tenantActivity.map((t: { tenantId: string; tenantName: string; permissionChanges: number; violations: number; lastActivity: string }) => ({
                tenantId: t.tenantId,
                tenantName: t.tenantName,
                permissionChanges: t.permissionChanges,
                violations: t.violations,
                lastActivity: t.lastActivity,
              }))
            : mockMetrics.tenantActivity,
          recentAuditEvents: (data.recentActivity || []).map((event: { id: string; action: string; created_at: string; user_id: number; resource: string; details: unknown }) => ({
            id: event.id,
            timestamp: event.created_at,
            eventType: event.action,
            userId: event.user_id,
            userEmail: 'N/A',
            action: event.action.replace(/_/g, ' ').toLowerCase(),
            details: event.resource || '',
            severity: event.action.includes('VIOLATION') || event.action.includes('BLOCKED') ? 'critical' : 'info',
          })),
          systemHealth: {
            cacheInvalidations: 0,
            auditLogErrors: 0,
            permissionCheckErrors: 0,
            lastCacheInvalidation: null,
          },
        };
        
        // Transform alerts
        const transformedAlerts: ViolationAlert[] = (data.activeAlerts || []).map((alert: { id: string; type: string; message: string; timestamp: string; userId: number }) => ({
          id: alert.id,
          type: alert.type === 'escalation' ? 'privilege_escalation' : 'cross_tenant',
          severity: 'critical' as const,
          message: alert.message,
          timestamp: alert.timestamp,
          userId: alert.userId,
          userEmail: 'N/A',
          acknowledged: false,
        }));
        
        setMetrics(transformedMetrics);
        setViolations(transformedAlerts);
      } else {
        // Fallback to mock data if API returns no data
        setMetrics(mockMetrics);
        setViolations(mockViolationAlerts);
      }
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch RBAC metrics:', error);
      // Use mock data on error
      setMetrics(mockMetrics);
      setViolations(mockViolationAlerts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Register refresh handler for global page refresh
  usePageRefresh('rbac-security', fetchData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            RBAC Security Monitoring
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor role-based access control security and detect potential threats
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {formatTimeAgo(lastRefresh.toISOString())}
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Permission Changes (24h)"
          value={metrics.permissionChanges.last24h}
          subtitle={`${metrics.permissionChanges.total} total`}
          icon={Key}
          color="blue"
        />
        <MetricCard
          title="Privilege Violations"
          value={metrics.violations.roleLevelViolations}
          subtitle={`${metrics.violations.last24h} in last 24h`}
          icon={ShieldAlert}
          trend={metrics.violations.last24h > 0 ? 'up' : 'neutral'}
          trendValue={metrics.violations.last24h > 0 ? `+${metrics.violations.last24h}` : ''}
          color="red"
        />
        <MetricCard
          title="Cross-Tenant Violations"
          value={metrics.violations.crossTenantViolations}
          subtitle="Blocked attempts"
          icon={Building2}
          color="yellow"
        />
        <MetricCard
          title="Active Users by Role"
          value={metrics.roleDistribution.reduce((sum, r) => sum + r.activeUsers, 0)}
          subtitle={`${metrics.roleDistribution.length} role levels`}
          icon={Users}
          color="green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Distribution */}
        <div className="lg:col-span-2 space-y-6">
          <RoleLevelChart data={metrics.roleDistribution} />
          <TenantActivityTable data={metrics.tenantActivity} />
        </div>

        {/* Right Column - Alerts & Events */}
        <div className="space-y-6">
          <ViolationAlertsPanel alerts={violations} />
          <SystemHealthPanel health={metrics.systemHealth} />
        </div>
      </div>

      {/* Audit Timeline */}
      <AuditEventsTimeline events={metrics.recentAuditEvents} />

      {/* Permission Changes by Role Level Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Permission Changes by Role Level
          </h3>
        </div>
        <div className="grid grid-cols-6 gap-4">
          {Object.entries(metrics.permissionChanges.byRoleLevel).map(([level, count]) => {
            const maxCount = Math.max(...Object.values(metrics.permissionChanges.byRoleLevel));
            const heightPercent = (count / maxCount) * 100;
            return (
              <div key={level} className="flex flex-col items-center">
                <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-end">
                  <div
                    className={`w-full rounded-lg transition-all duration-500 ${getRoleLevelColor(parseInt(level)).replace('text-', 'bg-').replace('bg-', '').split(' ')[0]}`}
                    style={{ 
                      height: `${heightPercent}%`,
                      backgroundColor: parseInt(level) >= 90 ? '#ef4444' : 
                                       parseInt(level) >= 80 ? '#f97316' : 
                                       parseInt(level) >= 50 ? '#eab308' : 
                                       parseInt(level) >= 30 ? '#3b82f6' : '#6b7280'
                    }}
                  />
                </div>
                <span className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">L{level}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
