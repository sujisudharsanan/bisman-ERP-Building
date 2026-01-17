'use client';

import React, { useState } from 'react';
import { Terminal, Plus, Search, Play, RefreshCw, Download, Clock, CheckCircle, XCircle, AlertTriangle, Settings, Server, Database, Cloud } from 'lucide-react';

interface DeploymentTask {
  id: string;
  name: string;
  type: 'Deploy' | 'Rollback' | 'Restart' | 'Backup' | 'Migration' | 'Update';
  environment: 'Production' | 'Staging' | 'Development';
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Scheduled';
  startTime?: string;
  endTime?: string;
  duration?: string;
  triggeredBy: string;
  version?: string;
}

export default function DeploymentToolsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('all');

  const tasks: DeploymentTask[] = [
    { id: 'DEP-001', name: 'Frontend Build & Deploy', type: 'Deploy', environment: 'Production', status: 'Completed', startTime: '2025-01-15 14:30:00', endTime: '2025-01-15 14:35:22', duration: '5m 22s', triggeredBy: 'admin@bisman.com', version: 'v2.1.5' },
    { id: 'DEP-002', name: 'Backend API Update', type: 'Update', environment: 'Production', status: 'Running', startTime: '2025-01-15 15:00:00', triggeredBy: 'devops@bisman.com', version: 'v3.2.1' },
    { id: 'DEP-003', name: 'Database Migration', type: 'Migration', environment: 'Staging', status: 'Scheduled', triggeredBy: 'admin@bisman.com' },
    { id: 'DEP-004', name: 'Full System Backup', type: 'Backup', environment: 'Production', status: 'Completed', startTime: '2025-01-15 02:00:00', endTime: '2025-01-15 02:45:12', duration: '45m 12s', triggeredBy: 'System' },
    { id: 'DEP-005', name: 'Hotfix Deployment', type: 'Deploy', environment: 'Production', status: 'Failed', startTime: '2025-01-14 18:20:00', endTime: '2025-01-14 18:22:45', duration: '2m 45s', triggeredBy: 'devops@bisman.com', version: 'v2.1.4-hotfix' },
    { id: 'DEP-006', name: 'Staging Environment Refresh', type: 'Deploy', environment: 'Staging', status: 'Completed', startTime: '2025-01-15 10:00:00', endTime: '2025-01-15 10:12:33', duration: '12m 33s', triggeredBy: 'qa@bisman.com', version: 'v2.2.0-beta' },
    { id: 'DEP-007', name: 'Rollback to v2.1.3', type: 'Rollback', environment: 'Production', status: 'Pending', triggeredBy: 'admin@bisman.com', version: 'v2.1.3' },
  ];

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEnvironment = environmentFilter === 'all' || task.environment === environmentFilter;
    return matchesSearch && matchesEnvironment;
  });

  const stats = {
    total: tasks.length,
    running: tasks.filter(t => t.status === 'Running').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    failed: tasks.filter(t => t.status === 'Failed').length
  };

  const quickActions = [
    { name: 'Deploy Frontend', icon: Cloud, color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Deploy Backend', icon: Server, color: 'bg-green-600 hover:bg-green-700' },
    { name: 'Run Backup', icon: Database, color: 'bg-purple-600 hover:bg-purple-700' },
    { name: 'Restart Services', icon: RefreshCw, color: 'bg-orange-600 hover:bg-orange-700' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: JSX.Element }> = {
      Pending: { bg: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', icon: <Clock className="w-3 h-3" /> },
      Running: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
      Completed: { bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
      Failed: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
      Scheduled: { bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> }
    };
    const style = styles[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg}`}>
        {style.icon}{status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Deploy: 'bg-blue-100 text-blue-700',
      Rollback: 'bg-orange-100 text-orange-700',
      Restart: 'bg-yellow-100 text-yellow-700',
      Backup: 'bg-purple-100 text-purple-700',
      Migration: 'bg-pink-100 text-pink-700',
      Update: 'bg-green-100 text-green-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>{type}</span>;
  };

  const getEnvironmentBadge = (env: string) => {
    const styles: Record<string, string> = {
      Production: 'bg-red-100 text-red-700',
      Staging: 'bg-yellow-100 text-yellow-700',
      Development: 'bg-green-100 text-green-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[env]}`}>{env}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Terminal className="w-8 h-8 text-gray-600" />Deployment Tools
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage deployments, backups, and system operations</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">
          <Plus className="w-4 h-4" />New Task
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {quickActions.map((action, index) => (
          <button key={index} className={`p-4 rounded-xl text-white ${action.color} flex items-center gap-3 transition-colors`}>
            <action.icon className="w-6 h-6" />
            <span className="font-medium">{action.name}</span>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Running</p>
              <p className="text-2xl font-bold text-blue-600">{stats.running}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={environmentFilter} onChange={(e) => setEnvironmentFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Environments</option>
            <option value="Production">Production</option>
            <option value="Staging">Staging</option>
            <option value="Development">Development</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Task</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Environment</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Version</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Triggered By</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{task.name}</div>
                      <div className="text-xs text-gray-500">{task.id}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getTypeBadge(task.type)}</td>
                  <td className="px-4 py-3 text-center">{getEnvironmentBadge(task.environment)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">{task.version || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{task.duration || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{task.triggeredBy}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(task.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {task.status === 'Pending' && (
                        <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Run"><Play className="w-4 h-4 text-green-600" /></button>
                      )}
                      {task.status === 'Completed' && (
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Download Logs"><Download className="w-4 h-4 text-gray-500" /></button>
                      )}
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Settings"><Settings className="w-4 h-4 text-gray-500" /></button>
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
