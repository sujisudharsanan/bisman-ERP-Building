'use client';

import React, { useState } from 'react';
import { Shield, Search, Filter, Eye, Download, Clock, User, CheckCircle, AlertCircle, Activity } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userRole: string;
  action: string;
  module: string;
  entity: string;
  entityId: string;
  details: string;
  ipAddress: string;
  status: 'Success' | 'Failed' | 'Warning';
}

export default function AuditTrailPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const auditLogs: AuditLogEntry[] = [
    { id: 'AUD-001', timestamp: '2025-01-15 14:32:15', user: 'admin@bisman.com', userRole: 'Admin', action: 'UPDATE', module: 'Users', entity: 'User', entityId: 'USR-025', details: 'Updated user role from Viewer to Editor', ipAddress: '192.168.1.100', status: 'Success' },
    { id: 'AUD-002', timestamp: '2025-01-15 14:28:42', user: 'finance@bisman.com', userRole: 'Finance Manager', action: 'CREATE', module: 'Finance', entity: 'Invoice', entityId: 'INV-2025-1234', details: 'Created new invoice for Customer ABC', ipAddress: '192.168.1.105', status: 'Success' },
    { id: 'AUD-003', timestamp: '2025-01-15 14:25:18', user: 'warehouse@bisman.com', userRole: 'Warehouse Manager', action: 'DELETE', module: 'Inventory', entity: 'Stock Entry', entityId: 'SE-0892', details: 'Attempted to delete approved stock entry', ipAddress: '192.168.1.110', status: 'Failed' },
    { id: 'AUD-004', timestamp: '2025-01-15 14:20:05', user: 'hr@bisman.com', userRole: 'HR Manager', action: 'APPROVE', module: 'HR', entity: 'Leave Request', entityId: 'LR-456', details: 'Approved leave request for 3 days', ipAddress: '192.168.1.115', status: 'Success' },
    { id: 'AUD-005', timestamp: '2025-01-15 14:15:33', user: 'sales@bisman.com', userRole: 'Sales Rep', action: 'LOGIN', module: 'Authentication', entity: 'Session', entityId: 'SES-789', details: 'Multiple failed login attempts detected', ipAddress: '192.168.1.120', status: 'Warning' },
    { id: 'AUD-006', timestamp: '2025-01-15 14:10:22', user: 'production@bisman.com', userRole: 'Production Manager', action: 'UPDATE', module: 'Operations', entity: 'Work Order', entityId: 'WO-1234', details: 'Updated work order status to Completed', ipAddress: '192.168.1.125', status: 'Success' },
    { id: 'AUD-007', timestamp: '2025-01-15 14:05:10', user: 'admin@bisman.com', userRole: 'Admin', action: 'EXPORT', module: 'Reports', entity: 'Financial Report', entityId: 'RPT-567', details: 'Exported quarterly financial report', ipAddress: '192.168.1.100', status: 'Success' },
    { id: 'AUD-008', timestamp: '2025-01-15 14:00:45', user: 'procurement@bisman.com', userRole: 'Procurement Officer', action: 'CREATE', module: 'Procurement', entity: 'Purchase Order', entityId: 'PO-2025-890', details: 'Created PO for office supplies', ipAddress: '192.168.1.130', status: 'Success' },
  ];

  const modules = ['Users', 'Finance', 'Inventory', 'HR', 'Authentication', 'Operations', 'Reports', 'Procurement'];

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesModule && matchesStatus;
  });

  const stats = {
    total: auditLogs.length,
    success: auditLogs.filter(l => l.status === 'Success').length,
    failed: auditLogs.filter(l => l.status === 'Failed').length,
    warnings: auditLogs.filter(l => l.status === 'Warning').length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      CREATE: 'bg-blue-100 text-blue-700',
      UPDATE: 'bg-purple-100 text-purple-700',
      DELETE: 'bg-red-100 text-red-700',
      APPROVE: 'bg-green-100 text-green-700',
      LOGIN: 'bg-gray-100 text-gray-700',
      EXPORT: 'bg-cyan-100 text-cyan-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[action] || 'bg-gray-100 text-gray-700'}`}>{action}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />Audit Trail
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and monitor all system activities and changes</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Download className="w-4 h-4" />Export Logs
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Successful</p>
              <p className="text-2xl font-bold text-green-600">{stats.success}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
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
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
            <option value="Warning">Warning</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Module</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Details</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{log.user}</div>
                      <div className="text-xs text-gray-500">{log.userRole}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getActionBadge(log.action)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{log.module}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 dark:text-white">{log.entity}</div>
                    <div className="text-xs text-gray-500">{log.entityId}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{log.details}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(log.status)}</td>
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
