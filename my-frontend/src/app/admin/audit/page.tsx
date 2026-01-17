'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSearch,
  Calendar,
  User,
  Activity,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Search
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'warning' | 'error';
}

const mockAuditLogs: AuditLog[] = [
  { id: '1', timestamp: '2026-01-17T14:30:00', user: 'admin@bisman.com', userRole: 'SUPER_ADMIN', action: 'LOGIN', resource: 'Authentication', resourceId: '-', details: 'Successful login from Chrome browser', ipAddress: '192.168.1.100', status: 'success' },
  { id: '2', timestamp: '2026-01-17T14:25:00', user: 'finance@bisman.com', userRole: 'FINANCE_CONTROLLER', action: 'UPDATE', resource: 'Payment', resourceId: 'PAY-2026-0045', details: 'Updated payment status to Approved', ipAddress: '192.168.1.102', status: 'success' },
  { id: '3', timestamp: '2026-01-17T14:20:00', user: 'ops@bisman.com', userRole: 'OPERATIONS_MANAGER', action: 'CREATE', resource: 'Stock Entry', resourceId: 'SE-2026-0089', details: 'Created new stock receipt entry', ipAddress: '192.168.1.105', status: 'success' },
  { id: '4', timestamp: '2026-01-17T14:15:00', user: 'unknown@test.com', userRole: '-', action: 'LOGIN_FAILED', resource: 'Authentication', resourceId: '-', details: 'Failed login attempt - invalid credentials', ipAddress: '203.45.67.89', status: 'error' },
  { id: '5', timestamp: '2026-01-17T14:10:00', user: 'hr@bisman.com', userRole: 'HR_MANAGER', action: 'DELETE', resource: 'User', resourceId: 'USR-0034', details: 'Deactivated user account', ipAddress: '192.168.1.110', status: 'warning' },
  { id: '6', timestamp: '2026-01-17T14:05:00', user: 'admin@bisman.com', userRole: 'SUPER_ADMIN', action: 'PERMISSION_CHANGE', resource: 'Role', resourceId: 'ROLE-005', details: 'Modified permissions for Finance Controller role', ipAddress: '192.168.1.100', status: 'warning' },
];

export default function AuditDashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');

  const filteredLogs = useMemo(() => {
    return mockAuditLogs.filter(log => {
      const matchesSearch = 
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      return matchesSearch && matchesAction && matchesStatus;
    });
  }, [searchQuery, actionFilter, statusFilter]);

  const stats = {
    totalEvents: mockAuditLogs.length,
    successEvents: mockAuditLogs.filter(l => l.status === 'success').length,
    warningEvents: mockAuditLogs.filter(l => l.status === 'warning').length,
    errorEvents: mockAuditLogs.filter(l => l.status === 'error').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileSearch className="w-7 h-7 text-blue-600" />
              Audit Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Comprehensive audit logging and compliance tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEvents}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats.successEvents}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warningEvents}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Errors</p>
                <p className="text-2xl font-bold text-red-600">{stats.errorEvents}</p>
              </div>
              <Shield className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="PERMISSION_CHANGE">Permission Change</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{log.user}</p>
                        <p className="text-xs text-gray-500">{log.userRole}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div>
                        <p>{log.resource}</p>
                        <p className="text-xs text-gray-500">{log.resourceId}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {log.details}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(log.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
