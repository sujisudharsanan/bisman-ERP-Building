'use client';

/**
 * 🛡️ Enterprise Security Operations Dashboard
 * BISMAN ERP - Comprehensive Security & Monitoring Center
 * 
 * Displays ALL security infrastructure data:
 * - Security scan results (routes, raw SQL, cache, audit, connections)
 * - Service-table usage tracking with suspicious marking
 * - Bypass detection alerts
 * - Rate limiting statistics
 * - Distributed lock status
 * - Cache health & PUB/SUB activity
 * - Audit log viewer
 * - Cleanup job status
 * - Permission cache health
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePageRefresh } from '@/contexts/RefreshContext';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Server,
  Activity,
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
  FileCode,
  Route,
  Table,
  Users,
  Key,
  Trash2,
  Zap,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Radio,
  Wifi,
  WifiOff,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';

interface SecurityScanResult {
  unprotectedRoutes: RouteIssue[];
  rawSqlUsage: SqlIssue[];
  staleCacheEntries: CacheIssue[];
  auditAnalysis: AuditIssue[];
  connectionInfo: ConnectionInfo;
  overallRisk: RiskLevel;
  scanTimestamp: string;
}

interface RouteIssue {
  method: string;
  path: string;
  handler: string;
  hasRbac: boolean;
  hasAuth: boolean;
  risk: RiskLevel;
  suggestion: string;
}

interface SqlIssue {
  file: string;
  line: number;
  code: string;
  risk: RiskLevel;
  suggestion: string;
}

interface CacheIssue {
  key: string;
  ttl: number;
  idleTime: number;
  risk: RiskLevel;
}

interface AuditIssue {
  type: string;
  count: number;
  lastOccurrence: string;
  risk: RiskLevel;
  description: string;
}

interface ConnectionInfo {
  active: number;
  idle: number;
  waiting: number;
  maxConnections: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface ServiceTableUsage {
  serviceName: string;
  tableName: string;
  operation: string;
  count: number;
  lastAccess: string;
  isSuspicious: boolean;
  isSensitive: boolean;
}

interface RateLimitStats {
  endpoint: string;
  currentCount: number;
  limit: number;
  windowMs: number;
  blocked: number;
  percentUsed: number;
}

interface CacheHealth {
  totalKeys: number;
  memoryUsage: string;
  hitRate: number;
  missRate: number;
  evictions: number;
  pubsubChannels: string[];
  connectedClients: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface CleanupJobStatus {
  jobName: string;
  lastRun: string | null;
  nextRun: string;
  status: 'running' | 'completed' | 'scheduled' | 'failed';
  recordsProcessed: number;
  duration: string | null;
}

interface AuditLogEntry {
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

interface DistributedLockInfo {
  key: string;
  owner: string;
  ttl: number;
  acquiredAt: string;
}

// ============================================================================
// API HELPER FUNCTIONS
// ============================================================================

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const fetchApi = async function<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      console.warn(`[API] ${url} returned ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.warn(`[API] ${url} error:`, error);
    return null;
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getRiskColor = (risk: RiskLevel): string => {
  switch (risk) {
    case 'CRITICAL': return 'text-red-600 bg-red-100 border-red-200';
    case 'HIGH': return 'text-orange-600 bg-orange-100 border-orange-200';
    case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'LOW': return 'text-green-600 bg-green-100 border-green-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

const getRiskBadge = (risk: RiskLevel): string => {
  switch (risk) {
    case 'CRITICAL': return 'bg-red-500 text-white';
    case 'HIGH': return 'bg-orange-500 text-white';
    case 'MEDIUM': return 'bg-yellow-500 text-white';
    case 'LOW': return 'bg-green-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy':
    case 'completed':
    case 'pass':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'warning':
    case 'running':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'critical':
    case 'failed':
    case 'fail':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'scheduled':
      return <Clock className="w-5 h-5 text-blue-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SectionHeader: React.FC<{
  title: string;
  icon: React.ReactNode;
  status?: 'healthy' | 'warning' | 'critical';
}> = ({ title, icon, status }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center space-x-2">
      {icon}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {status && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
          status === 'healthy' ? 'bg-green-100 text-green-700' :
          status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {status.toUpperCase()}
        </span>
      )}
    </div>
  </div>
);

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'healthy' | 'warning' | 'critical';
}> = ({ title, value, subtitle, icon, trend, trendValue, status }) => (
  <div className={`p-4 rounded-lg border ${
    status === 'critical' ? 'bg-red-50 border-red-200' :
    status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
    'bg-white border-gray-200'
  }`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 text-gray-500">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      {trend && (
        <div className={`flex items-center text-xs ${
          trend === 'up' ? 'text-green-600' :
          trend === 'down' ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> :
           trend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
          {trendValue}
        </div>
      )}
    </div>
    <div className="mt-2">
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {subtitle && <span className="ml-2 text-sm text-gray-500">{subtitle}</span>}
    </div>
  </div>
);

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  badgeColor?: string;
}> = ({ title, icon, children, defaultOpen = false, badge, badgeColor = 'bg-gray-100 text-gray-700' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
          {badge !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
      </button>
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD SECTIONS
// ============================================================================

const OverviewSection: React.FC<{
  scanResult: SecurityScanResult | null;
  cacheHealth: CacheHealth | null;
  rateLimitStats: RateLimitStats[];
}> = ({ scanResult, cacheHealth, rateLimitStats }) => {
  const totalBlocked = rateLimitStats.reduce((sum, s) => sum + s.blocked, 0);
  
  // Safe array extraction with proper type checking
  const routes = Array.isArray(scanResult?.unprotectedRoutes) ? scanResult.unprotectedRoutes : [];
  const sqlIssues = Array.isArray(scanResult?.rawSqlUsage) ? scanResult.rawSqlUsage : [];
  const auditIssues = Array.isArray(scanResult?.auditAnalysis) ? scanResult.auditAnalysis : [];
  
  const issuesCount = scanResult ? (
    routes.filter(r => r.risk !== 'LOW').length +
    sqlIssues.length +
    auditIssues.filter(a => a.risk !== 'LOW').length
  ) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Overall Risk"
        value={scanResult?.overallRisk || 'N/A'}
        icon={<Shield className="w-5 h-5" />}
        status={scanResult?.overallRisk === 'CRITICAL' ? 'critical' :
                scanResult?.overallRisk === 'HIGH' ? 'warning' : 'healthy'}
      />
      <MetricCard
        title="Active Issues"
        value={issuesCount}
        subtitle="requiring attention"
        icon={<AlertTriangle className="w-5 h-5" />}
        status={issuesCount > 5 ? 'critical' : issuesCount > 2 ? 'warning' : 'healthy'}
      />
      <MetricCard
        title="Cache Hit Rate"
        value={cacheHealth ? `${cacheHealth.hitRate}%` : 'N/A'}
        icon={<Database className="w-5 h-5" />}
        trend={cacheHealth && cacheHealth.hitRate > 90 ? 'up' : 'down'}
        trendValue={cacheHealth ? `${cacheHealth.hitRate}%` : ''}
        status={cacheHealth?.status}
      />
      <MetricCard
        title="Requests Blocked"
        value={totalBlocked}
        subtitle="by rate limiting"
        icon={<Lock className="w-5 h-5" />}
        status={totalBlocked > 10 ? 'warning' : 'healthy'}
      />
    </div>
  );
};

const SecurityScanSection: React.FC<{
  scanResult: SecurityScanResult | null;
}> = ({ scanResult }) => {
  // Safe array extraction
  const routes = Array.isArray(scanResult?.unprotectedRoutes) ? scanResult.unprotectedRoutes : [];
  const sqlIssues = Array.isArray(scanResult?.rawSqlUsage) ? scanResult.rawSqlUsage : [];
  const auditIssues = Array.isArray(scanResult?.auditAnalysis) ? scanResult.auditAnalysis : [];
  
  return (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <SectionHeader
      title="Security Scan Results"
      icon={<Shield className="w-5 h-5 text-blue-600" />}
      status={scanResult?.overallRisk === 'CRITICAL' ? 'critical' :
              scanResult?.overallRisk === 'HIGH' ? 'warning' : 'healthy'}
    />
    
    {scanResult && (
      <div className="space-y-4">
        {/* Unprotected Routes */}
        <CollapsibleSection
          title="Route Security Analysis"
          icon={<Route className="w-4 h-4 text-blue-500" />}
          badge={routes.filter(r => r.risk !== 'LOW').length}
          badgeColor={routes.some(r => r.risk === 'HIGH' || r.risk === 'CRITICAL') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
          defaultOpen
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Method</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Path</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Auth</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">RBAC</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Risk</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Suggestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {routes.map((route, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                        route.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                        route.method === 'POST' ? 'bg-green-100 text-green-700' :
                        route.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                        route.method === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-gray-100'
                      }`}>{route.method}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">{route.path}</td>
                    <td className="px-3 py-2">{route.hasAuth ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}</td>
                    <td className="px-3 py-2">{route.hasRbac ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-300" />}</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskBadge(route.risk)}`}>{route.risk}</span></td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{route.suggestion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* Raw SQL Detection */}
        <CollapsibleSection
          title="Raw SQL Usage Detection"
          icon={<FileCode className="w-4 h-4 text-orange-500" />}
          badge={sqlIssues.length}
          badgeColor={sqlIssues.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
        >
          {sqlIssues.length === 0 ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>No raw SQL injection risks detected</span>
            </div>
          ) : (
            <div className="space-y-3">
              {sqlIssues.map((sql, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${getRiskColor(sql.risk)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm">{sql.file}:{sql.line}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskBadge(sql.risk)}`}>{sql.risk}</span>
                  </div>
                  <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">{sql.code}</pre>
                  <p className="mt-2 text-sm text-gray-600">💡 {sql.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Audit Analysis */}
        <CollapsibleSection
          title="Audit Log Analysis"
          icon={<Eye className="w-4 h-4 text-purple-500" />}
          badge={auditIssues.length}
        >
          <div className="space-y-2">
            {auditIssues.map((item, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${getRiskColor(item.risk)}`}>
                <div>
                  <span className="font-medium">{item.type}</span>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">{item.count}</span>
                  <p className="text-xs text-gray-500">{formatDate(item.lastOccurrence)}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* DB Connections */}
        <CollapsibleSection
          title="Database Connections"
          icon={<Database className="w-4 h-4 text-green-500" />}
          badge={scanResult.connectionInfo ? `${scanResult.connectionInfo.active}/${scanResult.connectionInfo.maxConnections}` : 'N/A'}
          badgeColor={scanResult.connectionInfo?.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
        >
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{scanResult.connectionInfo?.active ?? 0}</div>
              <div className="text-xs text-gray-600">Active</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{scanResult.connectionInfo?.idle ?? 0}</div>
              <div className="text-xs text-gray-600">Idle</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{scanResult.connectionInfo?.waiting ?? 0}</div>
              <div className="text-xs text-gray-600">Waiting</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{scanResult.connectionInfo?.maxConnections ?? 0}</div>
              <div className="text-xs text-gray-600">Max</div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    )}
  </div>
  );
};

const ServiceTableUsageSection: React.FC<{
  usage: ServiceTableUsage[];
  onMarkSuspicious: (serviceName: string) => void;
  loading: boolean;
}> = ({ usage, onMarkSuspicious, loading }) => {
  const [filter, setFilter] = useState<'all' | 'sensitive' | 'suspicious'>('all');
  
  const filteredUsage = usage.filter(u => {
    if (filter === 'sensitive') return u.isSensitive;
    if (filter === 'suspicious') return u.isSuspicious;
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <SectionHeader
        title="Service → Table Access Tracking"
        icon={<Table className="w-5 h-5 text-indigo-600" />}
      />
      
      <div className="flex space-x-2 mb-4">
        {(['all', 'sensitive', 'suspicious'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'suspicious' && usage.filter(u => u.isSuspicious).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {usage.filter(u => u.isSuspicious).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Service</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Table</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Operation</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Count</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Last Access</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsage.map((item, idx) => (
              <tr key={idx} className={`hover:bg-gray-50 ${item.isSuspicious ? 'bg-red-50' : ''}`}>
                <td className="px-3 py-2 font-mono text-gray-700">{item.serviceName}</td>
                <td className="px-3 py-2 font-mono text-gray-700">
                  {item.tableName}
                  {item.isSensitive && <span className="ml-1 text-xs text-red-500">🔒</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    item.operation === 'SELECT' ? 'bg-blue-100 text-blue-700' :
                    item.operation === 'INSERT' ? 'bg-green-100 text-green-700' :
                    item.operation === 'UPDATE' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>{item.operation}</span>
                </td>
                <td className="px-3 py-2 font-medium">{item.count.toLocaleString()}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(item.lastAccess)}</td>
                <td className="px-3 py-2">
                  {item.isSuspicious ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">SUSPICIOUS</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {!item.isSuspicious && (
                    <button
                      onClick={() => onMarkSuspicious(item.serviceName)}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline"
                    >
                      Mark Suspicious
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RateLimitingSection: React.FC<{
  stats: RateLimitStats[];
  activeLocks: DistributedLockInfo[];
}> = ({ stats, activeLocks }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    {/* Rate Limiting Stats */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <SectionHeader
        title="Rate Limiting Status"
        icon={<Zap className="w-5 h-5 text-yellow-600" />}
      />
      <div className="space-y-3">
        {stats.map((stat, idx) => (
          <div key={idx} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-gray-700">{stat.endpoint}</span>
              <span className={`text-xs font-medium ${stat.blocked > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stat.blocked > 0 ? `${stat.blocked} blocked` : 'No blocks'}
              </span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                  stat.percentUsed > 80 ? 'bg-red-500' :
                  stat.percentUsed > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${stat.percentUsed}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{stat.currentCount}/{stat.limit} requests</span>
              <span>{formatDuration(stat.windowMs)} window</span>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Distributed Locks */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <SectionHeader
        title="Active Distributed Locks"
        icon={<Lock className="w-5 h-5 text-purple-600" />}
      />
      {activeLocks.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500">
          <Unlock className="w-8 h-8 mr-2 text-gray-400" />
          <span>No active locks</span>
        </div>
      ) : (
        <div className="space-y-3">
          {activeLocks.map((lock, idx) => (
            <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-purple-700">{lock.key}</span>
                <span className="text-xs text-purple-600">TTL: {lock.ttl}s</span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Owner: {lock.owner}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Acquired: {formatDate(lock.acquiredAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const CacheHealthSection: React.FC<{
  health: CacheHealth | null;
}> = ({ health }) => {
  if (!health) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <SectionHeader
        title="Redis Cache Health"
        icon={<Database className="w-5 h-5 text-red-600" />}
        status={health.status}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{health.totalKeys.toLocaleString()}</div>
          <div className="text-xs text-gray-600">Total Keys</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{health.memoryUsage}</div>
          <div className="text-xs text-gray-600">Memory Usage</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{health.hitRate}%</div>
          <div className="text-xs text-gray-600">Hit Rate</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{health.connectedClients}</div>
          <div className="text-xs text-gray-600">Connected Clients</div>
        </div>
      </div>

      {/* PUB/SUB Channels */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Radio className="w-4 h-4 mr-2 text-green-500" />
          Active PUB/SUB Channels
        </h4>
        <div className="flex flex-wrap gap-2">
          {health.pubsubChannels.map((channel, idx) => (
            <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-mono flex items-center">
              <Wifi className="w-3 h-3 mr-1" />
              {channel}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const CleanupJobsSection: React.FC<{
  jobs: CleanupJobStatus[];
}> = ({ jobs }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
    <SectionHeader
      title="Background Cleanup Jobs"
      icon={<Trash2 className="w-5 h-5 text-gray-600" />}
    />
    
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Job Name</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Last Run</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Next Run</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Records</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {jobs.map((job, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-mono text-gray-700">{job.jobName}</td>
              <td className="px-3 py-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  job.status === 'completed' ? 'bg-green-100 text-green-700' :
                  job.status === 'running' ? 'bg-blue-100 text-blue-700' :
                  job.status === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {getStatusIcon(job.status)}
                  <span className="ml-1">{job.status}</span>
                </span>
              </td>
              <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(job.lastRun)}</td>
              <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(job.nextRun)}</td>
              <td className="px-3 py-2 font-medium">{job.recordsProcessed.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-500">{job.duration || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AuditLogSection: React.FC<{
  logs: AuditLogEntry[];
}> = ({ logs }) => {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <SectionHeader
        title="Recent Audit Logs"
        icon={<Eye className="w-5 h-5 text-purple-600" />}
      />
      
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                  log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-700' :
                  log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>{log.action}</span>
                <span className="font-mono text-sm text-gray-700">{log.tableName}</span>
                <span className="text-gray-500">by</span>
                <span className="font-medium text-gray-900">{log.username}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500">{formatDate(log.createdAt)}</span>
                {expandedLog === log.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </button>
            {expandedLog === log.id && (
              <div className="p-4 bg-white text-sm">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-gray-500">Record ID:</span>
                    <span className="ml-2 font-mono">{log.recordId}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <span className="ml-2 font-mono">{log.serviceName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">IP Address:</span>
                    <span className="ml-2 font-mono">{log.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">User Agent:</span>
                    <span className="ml-2 text-xs truncate">{log.userAgent}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 block mb-1">Old Values:</span>
                    <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto">
                      {log.oldValues ? JSON.stringify(log.oldValues, null, 2) : 'null'}
                    </pre>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">New Values:</span>
                    <pre className="text-xs bg-green-50 p-2 rounded overflow-x-auto">
                      {log.newValues ? JSON.stringify(log.newValues, null, 2) : 'null'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface EnterpriseSecurityDashboardProps {
  className?: string;
}

const EnterpriseSecurityDashboard: React.FC<EnterpriseSecurityDashboardProps> = ({
  className = '',
}) => {
  // State
  const [scanResult, setScanResult] = useState<SecurityScanResult | null>(null);
  const [serviceTableUsage, setServiceTableUsage] = useState<ServiceTableUsage[]>([]);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats[]>([]);
  const [cacheHealth, setCacheHealth] = useState<CacheHealth | null>(null);
  const [cleanupJobs, setCleanupJobs] = useState<CleanupJobStatus[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activeLocks, setActiveLocks] = useState<DistributedLockInfo[]>([]);
  
  const [loading, setLoading] = useState({
    scan: false,
    usage: false,
    audit: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Real API Calls
  const fetchSecurityScan = useCallback(async () => {
    setLoading(prev => ({ ...prev, scan: true }));
    try {
      const data = await fetchApi<SecurityScanResult>('/api/security/scan');
      if (data) {
        setScanResult(data);
      }
    } catch (error) {
      console.error('Failed to fetch security scan:', error);
      setError('Failed to fetch security scan');
    } finally {
      setLoading(prev => ({ ...prev, scan: false }));
    }
  }, []);

  const fetchServiceTableUsage = useCallback(async () => {
    setLoading(prev => ({ ...prev, usage: true }));
    try {
      const data = await fetchApi<{ data: ServiceTableUsage[] }>('/api/admin/service-table-usage');
      if (data?.data) {
        setServiceTableUsage(data.data);
      } else if (Array.isArray(data)) {
        setServiceTableUsage(data);
      }
    } catch (error) {
      console.error('Failed to fetch service table usage:', error);
    } finally {
      setLoading(prev => ({ ...prev, usage: false }));
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setError(null);
    
    // Fetch all data in parallel using real API endpoints
    const [
      scanData,
      usageData,
      cacheData,
      rateLimitData,
      jobsData,
      auditData,
      locksData,
    ] = await Promise.allSettled([
      fetchApi<SecurityScanResult>('/api/security/scan'),
      fetchApi<{ data: ServiceTableUsage[] }>('/api/admin/service-table-usage'),
      fetchApi<CacheHealth>('/api/security-dashboard/cache-health'),
      fetchApi<{ stats: RateLimitStats[] }>('/api/security-dashboard/rate-limit-stats'),
      fetchApi<{ jobs: CleanupJobStatus[] }>('/api/security-dashboard/job-status'),
      fetchApi<{ logs: AuditLogEntry[] }>('/api/audit/logs?limit=20'),
      fetchApi<{ locks: DistributedLockInfo[] }>('/api/security-dashboard/active-locks'),
    ]);

    // Update state with fetched data
    if (scanData.status === 'fulfilled' && scanData.value) {
      setScanResult(scanData.value);
    }
    if (usageData.status === 'fulfilled' && usageData.value) {
      const usage = usageData.value.data || usageData.value;
      if (Array.isArray(usage)) setServiceTableUsage(usage);
    }
    if (cacheData.status === 'fulfilled' && cacheData.value) {
      setCacheHealth(cacheData.value);
    }
    if (rateLimitData.status === 'fulfilled' && rateLimitData.value?.stats) {
      setRateLimitStats(rateLimitData.value.stats);
    }
    if (jobsData.status === 'fulfilled' && jobsData.value?.jobs) {
      setCleanupJobs(jobsData.value.jobs);
    }
    if (auditData.status === 'fulfilled' && auditData.value?.logs) {
      setAuditLogs(auditData.value.logs);
    }
    if (locksData.status === 'fulfilled' && locksData.value?.locks) {
      setActiveLocks(locksData.value.locks);
    }

    setLastRefresh(new Date());
  }, []);

  const handleMarkSuspicious = useCallback(async (serviceName: string) => {
    try {
      const response = await fetch('/api/admin/mark-suspicious', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ serviceName }),
      });
      
      if (response.ok) {
        setServiceTableUsage(prev => prev.map(u =>
          u.serviceName === serviceName ? { ...u, isSuspicious: true } : u
        ));
      } else {
        console.error('Failed to mark suspicious:', await response.text());
      }
    } catch (error) {
      console.error('Failed to mark suspicious:', error);
    }
  }, []);

  // Register with navbar refresh button
  usePageRefresh('enterprise-security-dashboard', fetchAllData);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Shield className="w-7 h-7 mr-2 text-blue-600" />
                Security Operations Dashboard
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Comprehensive security monitoring & infrastructure health
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {lastRefresh && (
                <span className="text-sm text-gray-500">
                  Last refresh: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => {/* Export functionality */}}
                className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Cards */}
        <OverviewSection
          scanResult={scanResult}
          cacheHealth={cacheHealth}
          rateLimitStats={rateLimitStats}
        />

        {/* Security Scan Results */}
        <SecurityScanSection
          scanResult={scanResult}
        />

        {/* Service Table Usage */}
        <ServiceTableUsageSection
          usage={serviceTableUsage}
          onMarkSuspicious={handleMarkSuspicious}
          loading={loading.usage}
        />

        {/* Rate Limiting & Locks */}
        <RateLimitingSection
          stats={rateLimitStats}
          activeLocks={activeLocks}
        />

        {/* Cache Health */}
        <CacheHealthSection health={cacheHealth} />

        {/* Cleanup Jobs */}
        <CleanupJobsSection jobs={cleanupJobs} />

        {/* Audit Logs */}
        <AuditLogSection
          logs={auditLogs}
        />
      </div>
    </div>
  );
};

export default EnterpriseSecurityDashboard;
