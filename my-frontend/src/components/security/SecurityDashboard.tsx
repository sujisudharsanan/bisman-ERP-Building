/**
 * 🔐 Security Monitoring Dashboard Component
 *
 * This component provides real-time security monitoring
 * and displays security audit results in the admin dashboard.
 * Fetches LIVE test results from the backend API.
 * 
 * NEW: Includes real-time security alerts and monitoring stats
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  RefreshCw,
  Database,
  Key,
  Users,
  Bell,
  TrendingUp,
} from '@/lib/ssr-safe-icons';
import { usePageRefresh } from '@/contexts/RefreshContext';

interface TestResult {
  testId: string;
  testFile: string;
  success?: boolean;
  skipped?: boolean;
  reason?: string;
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  duration?: number;
  timestamp?: string;
  error?: string;
  status?: string;
  testResults?: Array<{
    name: string;
    status: string;
    duration: number;
    tests: Array<{
      title: string;
      status: string;
      duration: number;
      failureMessages: string[];
    }>;
  }>;
}

interface TestSummary {
  totalSuites: number;
  ranSuites: number;
  passedSuites: number;
  failedSuites: number;
  skippedSuites: number;
  notRunSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  lastUpdate: string | null;
}

interface SecurityMetric {
  category: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  score: number;
  maxScore: number;
  lastAudit: string;
  issues: number;
  description: string;
}

interface SecurityAlert {
  id: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  acknowledged: boolean;
}

interface SecurityMonitoringData {
  current: {
    failedAuthAttempts: number;
    successfulAuthAttempts: number;
    rateLimitHits: number;
    rbacDenials: number;
    periodStart: string;
  };
  last24Hours: {
    failedAuth: number;
    successfulAuth: number;
    rateLimitHits: number;
    rbacDenials: number;
  };
  auditLogs: {
    lastHour: number;
    last24Hours: number;
    lastCheck: string | null;
  };
  systemHealth: {
    redisConnected: boolean;
    dbConnected: boolean;
  };
}

interface SecurityStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  unacknowledgedAlerts: number;
  scheduledJobs: Record<string, {
    schedule: string;
    lastRun?: string;
    status: string;
  }>;
  monitoring: Record<string, {
    enabled: boolean;
    threshold?: number | string;
    window?: string;
    current?: number;
    schedule?: string;
  }>;
}

interface SecurityDashboardProps {
  className?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  className = '',
}) => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetric[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [overallScore, setOverallScore] = useState(0);
  const [lastAuditTime, setLastAuditTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [runningTests, setRunningTests] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time monitoring state
  const [monitoringData, setMonitoringData] = useState<SecurityMonitoringData | null>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'tests' | 'monitoring' | 'alerts'>('monitoring');

  // Fetch test results from API
  const fetchTestResults = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/tests/summary/all`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch test results');
      const data = await response.json();
      setTestResults(data.results || []);
      setTestSummary(data.summary || null);
      setError(null);
    } catch (err) {
      console.error('Error fetching test results:', err);
      setError('Could not fetch test results. Using cached metrics.');
    }
  }, []);

  // Fetch real-time monitoring data
  const fetchMonitoringData = useCallback(async () => {
    try {
      const [metricsRes, statusRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/security/metrics`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/admin/security/status`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/admin/security/alerts?limit=10`, { credentials: 'include' })
      ]);
      
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMonitoringData(metricsData);
      }
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setSecurityStatus(statusData);
      }
      
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
    }
  }, []);

  // Combined refresh function for all dashboard data
  const refreshAllData = useCallback(async () => {
    await Promise.all([fetchTestResults(), fetchMonitoringData()]);
  }, [fetchTestResults, fetchMonitoringData]);

  // Register with shell's refresh button
  try {
    usePageRefresh('security-dashboard', refreshAllData);
  } catch {
    // Not wrapped in RefreshProvider, ignore
  }

  // Run all tests
  const runAllTests = async () => {
    setRunningTests(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/admin/tests/run-all`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to run tests');
      const data = await response.json();
      setTestResults(data.results || []);
      setTestSummary(data.summary || null);
      setLastAuditTime(new Date().toLocaleString());
    } catch (err) {
      console.error('Error running tests:', err);
      setError('Failed to run tests. Check server connection.');
    } finally {
      setRunningTests(false);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/security/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        setAlerts(prev => prev.map(a => 
          a.id === alertId ? { ...a, acknowledged: true } : a
        ));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  // Run single test
  const runSingleTest = async (testId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/tests/${testId}/run`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to run test');
      await fetchTestResults();
    } catch (err) {
      console.error('Error running test:', err);
    }
  };

  // Initialize with static metrics + fetch live data
  useEffect(() => {
    const staticMetrics: SecurityMetric[] = [
      {
        category: 'Redis Permission Cache',
        status: 'pending',
        score: 0,
        maxScore: 20,
        lastAudit: new Date().toISOString(),
        issues: 0,
        description: 'Redis-backed RBAC with PUB/SUB invalidation',
      },
      {
        category: 'Row-Level Security (RLS)',
        status: 'pending',
        score: 0,
        maxScore: 25,
        lastAudit: new Date().toISOString(),
        issues: 0,
        description: 'PostgreSQL RLS policies for tenant isolation',
      },
      {
        category: 'Tenant Isolation',
        status: 'pending',
        score: 0,
        maxScore: 25,
        lastAudit: new Date().toISOString(),
        issues: 0,
        description: 'Cross-tenant data access prevention',
      },
      {
        category: 'RBAC Middleware',
        status: 'pending',
        score: 0,
        maxScore: 15,
        lastAudit: new Date().toISOString(),
        issues: 0,
        description: 'Role-based access control enforcement',
      },
      {
        category: 'API Calls Security',
        status: 'pending',
        score: 0,
        maxScore: 15,
        lastAudit: new Date().toISOString(),
        issues: 0,
        description: 'API endpoint security validation',
      },
    ];

    setSecurityMetrics(staticMetrics);
    fetchTestResults().finally(() => setLoading(false));
    fetchMonitoringData();
    
    // Refresh monitoring data every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [fetchTestResults, fetchMonitoringData]);

  // Update metrics based on test results
  useEffect(() => {
    if (testResults.length === 0) return;

    const testMap: Record<string, TestResult> = {};
    testResults.forEach(t => {
      testMap[t.testId] = t;
    });

    const updatedMetrics: SecurityMetric[] = [
      {
        category: 'Redis Permission Cache',
        status: testMap['redis']?.success ? 'pass' : 
                testMap['redis']?.skipped ? 'warning' :
                testMap['redis']?.status === 'not_run' ? 'pending' : 'fail',
        score: testMap['redis']?.numPassedTests || 0,
        maxScore: testMap['redis']?.numTotalTests || 10,
        lastAudit: testMap['redis']?.timestamp || new Date().toISOString(),
        issues: testMap['redis']?.numFailedTests || 0,
        description: `${testMap['redis']?.numPassedTests || 0}/${testMap['redis']?.numTotalTests || 0} tests passed`,
      },
      {
        category: 'Row-Level Security (RLS)',
        status: testMap['rls']?.success ? 'pass' :
                testMap['rls']?.skipped ? 'warning' :
                testMap['rls']?.status === 'not_run' ? 'pending' : 'fail',
        score: testMap['rls']?.numPassedTests || 0,
        maxScore: testMap['rls']?.numTotalTests || 9,
        lastAudit: testMap['rls']?.timestamp || new Date().toISOString(),
        issues: testMap['rls']?.numFailedTests || 0,
        description: testMap['rls']?.skipped 
          ? testMap['rls'].reason || 'Database required'
          : `${testMap['rls']?.numPassedTests || 0}/${testMap['rls']?.numTotalTests || 0} tests passed`,
      },
      {
        category: 'Tenant Isolation',
        status: testMap['tenantIsolation']?.success ? 'pass' :
                testMap['tenantIsolation']?.skipped ? 'warning' :
                testMap['tenantIsolation']?.status === 'not_run' ? 'pending' : 'fail',
        score: testMap['tenantIsolation']?.numPassedTests || 0,
        maxScore: testMap['tenantIsolation']?.numTotalTests || 30,
        lastAudit: testMap['tenantIsolation']?.timestamp || new Date().toISOString(),
        issues: testMap['tenantIsolation']?.numFailedTests || 0,
        description: testMap['tenantIsolation']?.skipped
          ? testMap['tenantIsolation'].reason || 'Database required'
          : `${testMap['tenantIsolation']?.numPassedTests || 0}/${testMap['tenantIsolation']?.numTotalTests || 0} tests passed`,
      },
      {
        category: 'RBAC Middleware',
        status: testMap['rbac']?.success ? 'pass' :
                testMap['rbac']?.skipped ? 'warning' :
                testMap['rbac']?.status === 'not_run' ? 'pending' : 'fail',
        score: testMap['rbac']?.numPassedTests || 0,
        maxScore: testMap['rbac']?.numTotalTests || 5,
        lastAudit: testMap['rbac']?.timestamp || new Date().toISOString(),
        issues: testMap['rbac']?.numFailedTests || 0,
        description: `${testMap['rbac']?.numPassedTests || 0}/${testMap['rbac']?.numTotalTests || 0} tests passed`,
      },
      {
        category: 'API Calls Security',
        status: testMap['calls']?.success ? 'pass' :
                testMap['calls']?.skipped ? 'warning' :
                testMap['calls']?.status === 'not_run' ? 'pending' : 'fail',
        score: testMap['calls']?.numPassedTests || 0,
        maxScore: testMap['calls']?.numTotalTests || 5,
        lastAudit: testMap['calls']?.timestamp || new Date().toISOString(),
        issues: testMap['calls']?.numFailedTests || 0,
        description: `${testMap['calls']?.numPassedTests || 0}/${testMap['calls']?.numTotalTests || 0} tests passed`,
      },
    ];

    setSecurityMetrics(updatedMetrics);

    // Calculate overall score
    if (testSummary && testSummary.totalTests > 0) {
      const score = Math.round((testSummary.passedTests / testSummary.totalTests) * 100);
      setOverallScore(score);
    }

    if (testSummary?.lastUpdate) {
      setLastAuditTime(new Date(testSummary.lastUpdate).toLocaleString());
    }
  }, [testResults, testSummary]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-100 border-green-200';
    if (percentage >= 70) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Security Dashboard
          </h2>
          {securityStatus && (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(securityStatus.status)}`}>
              {securityStatus.status.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <span className="flex items-center text-red-600 text-sm">
              <Bell className="w-4 h-4 mr-1" />
              {alerts.filter(a => !a.acknowledged).length} alerts
            </span>
          )}
          <div className="text-sm text-gray-500">Last audit: {lastAuditTime}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'monitoring'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1" />
          Real-time Monitoring
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'tests'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-1" />
          Security Tests
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'alerts'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell className="w-4 h-4 inline mr-1" />
          Alerts
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {alerts.filter(a => !a.acknowledged).length}
            </span>
          )}
        </button>
      </div>

      {/* Real-time Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <>
          {/* Real-time Metrics */}
          {monitoringData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-600 font-medium">Failed Auth</p>
                    <p className="text-2xl font-bold text-red-700">{monitoringData.current.failedAuthAttempts}</p>
                  </div>
                  <Lock className="w-8 h-8 text-red-300" />
                </div>
                <p className="text-xs text-red-500 mt-1">Last 24h: {monitoringData.last24Hours.failedAuth}</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Successful Auth</p>
                    <p className="text-2xl font-bold text-green-700">{monitoringData.current.successfulAuthAttempts}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-300" />
                </div>
                <p className="text-xs text-green-500 mt-1">Last 24h: {monitoringData.last24Hours.successfulAuth}</p>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-yellow-600 font-medium">Rate Limits</p>
                    <p className="text-2xl font-bold text-yellow-700">{monitoringData.current.rateLimitHits}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-300" />
                </div>
                <p className="text-xs text-yellow-500 mt-1">Last 24h: {monitoringData.last24Hours.rateLimitHits}</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-medium">RBAC Denials</p>
                    <p className="text-2xl font-bold text-purple-700">{monitoringData.current.rbacDenials}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-300" />
                </div>
                <p className="text-xs text-purple-500 mt-1">Last 24h: {monitoringData.last24Hours.rbacDenials}</p>
              </div>
            </div>
          )}

          {/* System Health */}
          {monitoringData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-3">System Health</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Redis Cache</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${monitoringData.systemHealth.redisConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {monitoringData.systemHealth.redisConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${monitoringData.systemHealth.dbConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {monitoringData.systemHealth.dbConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Audit Logs</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last Hour</span>
                    <span className="text-sm font-medium">{monitoringData.auditLogs.lastHour}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Last 24 Hours</span>
                    <span className="text-sm font-medium">{monitoringData.auditLogs.last24Hours}</span>
                  </div>
                  {monitoringData.auditLogs.lastCheck && (
                    <p className="text-xs text-gray-400">
                      Last check: {new Date(monitoringData.auditLogs.lastCheck).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scheduled Jobs Status */}
          {securityStatus && (
            <div className="p-4 bg-gray-50 rounded-lg border mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Scheduled Security Jobs</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(securityStatus.scheduledJobs).map(([key, job]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-xs text-gray-500">{job.schedule}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      job.status === 'active' ? 'bg-green-100 text-green-700' : 
                      job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monitoring Thresholds */}
          {securityStatus && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="text-sm font-medium text-blue-700 mb-3">Active Monitoring</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(securityStatus.monitoring).map(([key, config]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-xs text-blue-500">
                      {config.threshold && `Threshold: ${config.threshold}`}
                      {config.window && ` / ${config.window}`}
                      {config.schedule && config.schedule}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tests Tab */}
      {activeTab === 'tests' && (
        <>
          {/* Overall Security Score */}
          <div
            className={`p-4 rounded-lg border-2 mb-6 ${getScoreBg(overallScore)}`}
          >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Overall Security Score
            </h3>
            <p className="text-sm text-gray-600">
              Based on automated security audit
            </p>
          </div>
          <div className="text-right">
            <div
              className={`text-3xl font-bold ${getScoreColor(overallScore)}`}
            >
              {overallScore}%
            </div>
            <div className="text-sm text-gray-500">
              {overallScore >= 90
                ? 'Excellent'
                : overallScore >= 70
                  ? 'Good'
                  : 'Needs Improvement'}
            </div>
          </div>
        </div>
      </div>

      {/* Security Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {securityMetrics.map((metric, index) => (
          <div key={index} className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(metric.status)}
                <h4 className="font-medium text-sm text-gray-900">
                  {metric.category}
                </h4>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {metric.score}/{metric.maxScore}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-2">{metric.description}</p>
            {metric.issues > 0 && (
              <div className="flex items-center space-x-1 text-xs text-yellow-600">
                <AlertTriangle className="w-3 h-3" />
                <span>
                  {metric.issues} issue{metric.issues > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Security Actions */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Security Actions
        </h3>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            className={`flex items-center justify-center space-x-2 p-3 rounded-lg transition-colors ${
              runningTests 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
            onClick={runAllTests}
            disabled={runningTests}
          >
            {runningTests ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Tests...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Run All Security Tests</span>
              </>
            )}
          </button>

          <button
            className="flex items-center justify-center space-x-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            onClick={fetchTestResults}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Results</span>
          </button>

          <button
            className="flex items-center justify-center space-x-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors"
            onClick={() => setExpandedTest(expandedTest ? null : 'all')}
          >
            <Database className="w-4 h-4" />
            <span>{expandedTest ? 'Hide Details' : 'Show Details'}</span>
          </button>
        </div>
      </div>

      {/* Test Summary Stats */}
      {testSummary && testSummary.ranSuites > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-900">{testSummary.totalSuites}</div>
            <div className="text-xs text-gray-500">Test Suites</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{testSummary.passedTests}</div>
            <div className="text-xs text-gray-500">Tests Passed</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{testSummary.failedTests}</div>
            <div className="text-xs text-gray-500">Tests Failed</div>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{testSummary.skippedSuites}</div>
            <div className="text-xs text-gray-500">Suites Skipped</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{testSummary.totalTests}</div>
            <div className="text-xs text-gray-500">Total Tests</div>
          </div>
        </div>
      )}

      {/* Expanded Test Details */}
      {expandedTest && testResults.length > 0 && (
        <div className="mt-6 border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b">
            <h4 className="font-medium text-gray-900">Test Details</h4>
          </div>
          <div className="divide-y">
            {testResults.map((result) => (
              <div key={result.testId} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : result.skipped ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    ) : result.status === 'not_run' ? (
                      <Clock className="w-4 h-4 text-gray-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="font-medium">{result.testFile}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {result.duration ? `${result.duration}ms` : '—'}
                  </div>
                </div>
                
                {result.skipped && (
                  <p className="text-sm text-yellow-600 ml-6">{result.reason}</p>
                )}
                
                {result.error && (
                  <p className="text-sm text-red-600 ml-6">{result.error}</p>
                )}
                
                {result.testResults && result.testResults.length > 0 && (
                  <div className="ml-6 mt-2 space-y-1">
                    {result.testResults[0].tests.slice(0, 5).map((test, i) => (
                      <div key={i} className="flex items-center text-sm">
                        {test.status === 'passed' ? (
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500 mr-2" />
                        )}
                        <span className={test.status === 'passed' ? 'text-gray-600' : 'text-red-600'}>
                          {test.title}
                        </span>
                      </div>
                    ))}
                    {result.testResults[0].tests.length > 5 && (
                      <p className="text-xs text-gray-400 ml-5">
                        +{result.testResults[0].tests.length - 5} more tests
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Security Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Run security audits weekly or after major code changes</li>
          <li>• Monitor failed login attempts and unusual access patterns</li>
          <li>• Keep dependencies updated to patch security vulnerabilities</li>
          <li>• Enable two-factor authentication for admin accounts</li>
          <li>• Regularly review and rotate API keys and secrets</li>
        </ul>
      </div>
        </>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Security Alerts</h3>
            <button
              onClick={fetchMonitoringData}
              className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-600">No security alerts</p>
              <p className="text-sm text-gray-400">All systems operating normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} ${alert.acknowledged ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 mt-0.5" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{alert.type.replace(/_/g, ' ')}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{alert.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="px-3 py-1 text-xs bg-white bg-opacity-50 hover:bg-opacity-75 rounded transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alert Legend */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Alert Severity Levels</h4>
            <div className="flex flex-wrap gap-3">
              <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Critical - Immediate action required</span>
              <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-800">High - Investigate soon</span>
              <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Medium - Review when possible</span>
              <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Low - Informational</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SecurityDashboard;
