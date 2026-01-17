'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  Lock,
  FileText,
  Activity,
  Server,
  HardDrive,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Shield
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface IntegrityCheck {
  id: string;
  checkName: string;
  category: 'database' | 'security' | 'compliance' | 'performance' | 'backup';
  status: 'passed' | 'failed' | 'warning' | 'running' | 'pending';
  lastRun: string;
  nextScheduled: string;
  duration: string;
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedRecords?: number;
}

interface AuditMetric {
  label: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  color: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const integrityChecks: IntegrityCheck[] = [
  {
    id: 'CHK001',
    checkName: 'Database Referential Integrity',
    category: 'database',
    status: 'passed',
    lastRun: '2024-01-20 03:00',
    nextScheduled: '2024-01-21 03:00',
    duration: '45 min',
    details: 'All foreign key relationships verified. No orphaned records found.',
    severity: 'critical',
    affectedRecords: 0
  },
  {
    id: 'CHK002',
    checkName: 'Audit Trail Continuity',
    category: 'security',
    status: 'passed',
    lastRun: '2024-01-20 04:00',
    nextScheduled: '2024-01-21 04:00',
    duration: '12 min',
    details: 'All audit logs sequential and complete. No gaps detected.',
    severity: 'critical',
    affectedRecords: 0
  },
  {
    id: 'CHK003',
    checkName: 'Financial Reconciliation',
    category: 'compliance',
    status: 'warning',
    lastRun: '2024-01-20 02:00',
    nextScheduled: '2024-01-21 02:00',
    duration: '28 min',
    details: '3 transactions require manual review. Total variance: $12.45',
    severity: 'high',
    affectedRecords: 3
  },
  {
    id: 'CHK004',
    checkName: 'Data Encryption Verification',
    category: 'security',
    status: 'passed',
    lastRun: '2024-01-20 01:00',
    nextScheduled: '2024-01-21 01:00',
    duration: '8 min',
    details: 'All sensitive fields properly encrypted. Encryption keys rotated.',
    severity: 'critical',
    affectedRecords: 0
  },
  {
    id: 'CHK005',
    checkName: 'Backup Integrity Validation',
    category: 'backup',
    status: 'passed',
    lastRun: '2024-01-20 00:30',
    nextScheduled: '2024-01-21 00:30',
    duration: '65 min',
    details: 'Daily backup verified. Checksum validation successful.',
    severity: 'critical',
    affectedRecords: 0
  },
  {
    id: 'CHK006',
    checkName: 'Index Fragmentation Analysis',
    category: 'performance',
    status: 'warning',
    lastRun: '2024-01-19 23:00',
    nextScheduled: '2024-01-20 23:00',
    duration: '15 min',
    details: '2 indexes above 30% fragmentation threshold. Rebuild recommended.',
    severity: 'medium',
    affectedRecords: 2
  },
  {
    id: 'CHK007',
    checkName: 'Permission Audit',
    category: 'security',
    status: 'running',
    lastRun: '2024-01-20 06:00',
    nextScheduled: '2024-01-21 06:00',
    duration: '~20 min',
    details: 'Checking user permissions against role definitions...',
    severity: 'high'
  },
  {
    id: 'CHK008',
    checkName: 'Transaction Log Integrity',
    category: 'database',
    status: 'pending',
    lastRun: '2024-01-19 05:00',
    nextScheduled: '2024-01-20 07:00',
    duration: '35 min',
    details: 'Scheduled to run after permission audit completes.',
    severity: 'high'
  }
];

const metrics: AuditMetric[] = [
  { label: 'Total Checks', value: 24, icon: ShieldCheck, color: 'blue' },
  { label: 'Passed', value: 20, change: 2, trend: 'up', icon: CheckCircle, color: 'green' },
  { label: 'Warnings', value: 3, change: -1, trend: 'down', icon: AlertTriangle, color: 'yellow' },
  { label: 'Failed', value: 1, change: 0, trend: 'stable', icon: XCircle, color: 'red' }
];

const systemHealth = {
  databaseIntegrity: 99.8,
  auditCoverage: 100,
  backupStatus: 'Healthy',
  lastFullAudit: '2024-01-15',
  complianceScore: 98
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: IntegrityCheck['status'] }) {
  const config = {
    passed: { label: 'Passed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    warning: { label: 'Warning', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertTriangle },
    running: { label: 'Running', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: RefreshCw },
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}

function CategoryIcon({ category }: { category: IntegrityCheck['category'] }) {
  const icons = {
    database: Database,
    security: Lock,
    compliance: FileText,
    performance: Activity,
    backup: HardDrive
  };
  const Icon = icons[category];
  return <Icon className="w-4 h-4" />;
}

function SeverityIndicator({ severity }: { severity: IntegrityCheck['severity'] }) {
  const config = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500'
  }[severity];

  return (
    <span className={`w-2 h-2 rounded-full ${config}`} title={`${severity} severity`}></span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AuditIntegrityDashboardPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredChecks = useMemo(() => {
    return integrityChecks.filter(check => {
      const matchesCategory = categoryFilter === 'all' || check.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || check.status === statusFilter;
      return matchesCategory && matchesStatus;
    });
  }, [categoryFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit & Integrity Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Monitor system integrity and audit compliance</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <RefreshCw className="w-4 h-4" />
              Run All Checks
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-${metric.color}-100 dark:bg-${metric.color}-900/30 rounded-lg`}>
                  <metric.icon className={`w-5 h-5 text-${metric.color}-600 dark:text-${metric.color}-400`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">System Health Overview</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Database Integrity</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{systemHealth.databaseIntegrity}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${systemHealth.databaseIntegrity}%` }}></div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Audit Coverage</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{systemHealth.auditCoverage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${systemHealth.auditCoverage}%` }}></div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Compliance Score</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{systemHealth.complianceScore}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${systemHealth.complianceScore}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Backup Status</span>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                  {systemHealth.backupStatus}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Last Full Audit</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{systemHealth.lastFullAudit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Active Monitors</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">24 / 24</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="database">Database</option>
            <option value="security">Security</option>
            <option value="compliance">Compliance</option>
            <option value="performance">Performance</option>
            <option value="backup">Backup</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="passed">Passed</option>
            <option value="warning">Warning</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
        </div>

        {/* Integrity Checks Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Check</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Last Run</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Details</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredChecks.map((check) => (
                <tr key={check.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <SeverityIndicator severity={check.severity} />
                      <span className="font-medium text-gray-900 dark:text-white">{check.checkName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={check.category} />
                      <span className="text-sm capitalize text-gray-600 dark:text-gray-300">{check.category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{check.lastRun}</p>
                    <p className="text-xs text-gray-500">Next: {check.nextScheduled}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{check.duration}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={check.status} />
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{check.details}</p>
                    {check.affectedRecords !== undefined && check.affectedRecords > 0 && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">{check.affectedRecords} records affected</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Details">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Run Now">
                        <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
