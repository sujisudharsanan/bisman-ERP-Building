'use client';

import React, { useState } from 'react';
import { Shield, Search, Filter, Eye, Download, Clock, User, Server, AlertTriangle, CheckCircle, Activity, Key, Lock, Database } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  category: 'Authentication' | 'Authorization' | 'Data Access' | 'Configuration' | 'System' | 'Security';
  severity: 'Info' | 'Warning' | 'Error' | 'Critical';
  user: string;
  userId: string;
  resource: string;
  action: string;
  result: 'Success' | 'Failure' | 'Partial';
  ipAddress: string;
  userAgent: string;
  details: string;
}

export default function SystemAuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const logs: AuditLog[] = [
    { id: 'LOG-001', timestamp: '2025-01-15 15:32:18', eventType: 'USER_LOGIN', category: 'Authentication', severity: 'Info', user: 'admin@bisman.com', userId: 'USR-001', resource: '/api/auth/login', action: 'Login', result: 'Success', ipAddress: '192.168.1.100', userAgent: 'Chrome/120.0', details: 'Successful login with MFA' },
    { id: 'LOG-002', timestamp: '2025-01-15 15:30:45', eventType: 'PERMISSION_DENIED', category: 'Authorization', severity: 'Warning', user: 'viewer@bisman.com', userId: 'USR-025', resource: '/api/admin/users', action: 'Access Denied', result: 'Failure', ipAddress: '192.168.1.105', userAgent: 'Firefox/121.0', details: 'User attempted to access admin panel without privileges' },
    { id: 'LOG-003', timestamp: '2025-01-15 15:28:12', eventType: 'DATA_EXPORT', category: 'Data Access', severity: 'Info', user: 'finance@bisman.com', userId: 'USR-010', resource: '/api/reports/financial', action: 'Export', result: 'Success', ipAddress: '192.168.1.110', userAgent: 'Chrome/120.0', details: 'Exported Q4 financial report (2.5 MB)' },
    { id: 'LOG-004', timestamp: '2025-01-15 15:25:33', eventType: 'CONFIG_CHANGE', category: 'Configuration', severity: 'Warning', user: 'admin@bisman.com', userId: 'USR-001', resource: '/api/settings/security', action: 'Update', result: 'Success', ipAddress: '192.168.1.100', userAgent: 'Chrome/120.0', details: 'Changed password policy - minimum length: 8 → 12' },
    { id: 'LOG-005', timestamp: '2025-01-15 15:22:08', eventType: 'LOGIN_FAILED', category: 'Authentication', severity: 'Error', user: 'unknown', userId: '-', resource: '/api/auth/login', action: 'Login', result: 'Failure', ipAddress: '203.45.67.89', userAgent: 'Unknown', details: 'Multiple failed login attempts (5) for user "admin"' },
    { id: 'LOG-006', timestamp: '2025-01-15 15:18:55', eventType: 'DATABASE_BACKUP', category: 'System', severity: 'Info', user: 'system', userId: 'SYS', resource: 'PostgreSQL', action: 'Backup', result: 'Success', ipAddress: 'localhost', userAgent: 'System', details: 'Automated daily backup completed (1.2 GB)' },
    { id: 'LOG-007', timestamp: '2025-01-15 15:15:22', eventType: 'SUSPICIOUS_ACTIVITY', category: 'Security', severity: 'Critical', user: 'unknown', userId: '-', resource: '/api/admin', action: 'Scan', result: 'Failure', ipAddress: '185.23.45.67', userAgent: 'curl/7.68.0', details: 'SQL injection attempt detected and blocked' },
    { id: 'LOG-008', timestamp: '2025-01-15 15:10:00', eventType: 'USER_ROLE_CHANGE', category: 'Authorization', severity: 'Warning', user: 'admin@bisman.com', userId: 'USR-001', resource: 'User USR-030', action: 'Role Update', result: 'Success', ipAddress: '192.168.1.100', userAgent: 'Chrome/120.0', details: 'Changed role from "Viewer" to "Editor"' },
  ];

  const categories = ['Authentication', 'Authorization', 'Data Access', 'Configuration', 'System', 'Security'];
  const severities = ['Info', 'Warning', 'Error', 'Critical'];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const stats = {
    total: logs.length,
    info: logs.filter(l => l.severity === 'Info').length,
    warnings: logs.filter(l => l.severity === 'Warning').length,
    errors: logs.filter(l => l.severity === 'Error').length,
    critical: logs.filter(l => l.severity === 'Critical').length
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, { bg: string; icon: JSX.Element }> = {
      Info: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Activity className="w-3 h-3" /> },
      Warning: { bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <AlertTriangle className="w-3 h-3" /> },
      Error: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertTriangle className="w-3 h-3" /> },
      Critical: { bg: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300', icon: <AlertTriangle className="w-3 h-3" /> }
    };
    const style = styles[severity];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg}`}>
        {style.icon}{severity}
      </span>
    );
  };

  const getResultBadge = (result: string) => {
    const styles: Record<string, string> = {
      Success: 'bg-green-100 text-green-700',
      Failure: 'bg-red-100 text-red-700',
      Partial: 'bg-yellow-100 text-yellow-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[result]}`}>{result}</span>;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, JSX.Element> = {
      Authentication: <Key className="w-4 h-4 text-blue-500" />,
      Authorization: <Lock className="w-4 h-4 text-purple-500" />,
      'Data Access': <Database className="w-4 h-4 text-green-500" />,
      Configuration: <Server className="w-4 h-4 text-orange-500" />,
      System: <Server className="w-4 h-4 text-gray-500" />,
      Security: <Shield className="w-4 h-4 text-red-500" />
    };
    return icons[category] || <Activity className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-600" />System Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Security and system event monitoring</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
          <Download className="w-4 h-4" />Export Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Info</p>
              <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Errors</p>
              <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Severities</option>
            {severities.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Event</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Resource</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Result</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{log.eventType}</div>
                    <div className="text-xs text-gray-500 max-w-xs truncate">{log.details}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(log.category)}
                      <span className="text-sm text-gray-600 dark:text-gray-300">{log.category}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{log.user}</div>
                    <div className="text-xs text-gray-500">{log.ipAddress}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono max-w-xs truncate">{log.resource}</td>
                  <td className="px-4 py-3 text-center">{getResultBadge(log.result)}</td>
                  <td className="px-4 py-3 text-center">{getSeverityBadge(log.severity)}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Details"><Eye className="w-4 h-4 text-gray-500" /></button>
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
