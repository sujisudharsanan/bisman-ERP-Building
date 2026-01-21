'use client';

import React, { useState, useMemo } from 'react';
import {
  Server,
  Terminal,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Activity,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  details?: string;
}

interface ServerStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  cpu: number;
  memory: number;
  uptime: string;
}

const mockLogs: LogEntry[] = [
  { id: '1', timestamp: '2026-01-17T14:35:22.123Z', level: 'info', source: 'API Gateway', message: 'Request processed successfully', details: 'GET /api/users - 200 OK - 45ms' },
  { id: '2', timestamp: '2026-01-17T14:35:18.456Z', level: 'warn', source: 'Database', message: 'Slow query detected', details: 'Query took 2.3s - Consider adding index on users.email' },
  { id: '3', timestamp: '2026-01-17T14:35:15.789Z', level: 'error', source: 'Auth Service', message: 'Failed login attempt', details: 'IP: 203.45.67.89 - Too many failed attempts' },
  { id: '4', timestamp: '2026-01-17T14:35:10.012Z', level: 'info', source: 'Scheduler', message: 'Cron job completed', details: 'daily-backup: Completed successfully in 45s' },
  { id: '5', timestamp: '2026-01-17T14:35:05.345Z', level: 'debug', source: 'Cache', message: 'Cache hit', details: 'Key: user_permissions_12345 - TTL: 3600s' },
  { id: '6', timestamp: '2026-01-17T14:35:00.678Z', level: 'info', source: 'WebSocket', message: 'New connection established', details: 'Client: dashboard-ui, User: admin@bisman.com' },
  { id: '7', timestamp: '2026-01-17T14:34:55.901Z', level: 'warn', source: 'Memory', message: 'High memory usage detected', details: 'Usage: 85% - Consider scaling or optimization' },
  { id: '8', timestamp: '2026-01-17T14:34:50.234Z', level: 'error', source: 'Email Service', message: 'Failed to send email', details: 'SMTP connection timeout after 30s' },
];

const serverStatus: ServerStatus[] = [
  { name: 'API Server', status: 'online', cpu: 45, memory: 62, uptime: '15d 4h 23m' },
  { name: 'Database', status: 'online', cpu: 32, memory: 78, uptime: '30d 12h 45m' },
  { name: 'Cache Server', status: 'online', cpu: 12, memory: 45, uptime: '30d 12h 45m' },
  { name: 'Worker Queue', status: 'degraded', cpu: 89, memory: 85, uptime: '5d 8h 12m' },
];

export default function ServerLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const filteredLogs = useMemo(() => {
    return mockLogs.filter(log => {
      const matchesSearch = 
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
      const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
      return matchesSearch && matchesLevel && matchesSource;
    });
  }, [searchQuery, levelFilter, sourceFilter]);

  const uniqueSources = [...new Set(mockLogs.map(log => log.source))];

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug': return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLevelBadge = (level: string) => {
    const styles: Record<string, string> = {
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      warn: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      debug: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium uppercase ${styles[level]}`}>
        {getLevelIcon(level)}
        {level}
      </span>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Server className="w-7 h-7 text-blue-600" />
              Server Logs
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Monitor server activity, errors, and system diagnostics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-refresh
            </label>
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

        {/* Server Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {serverStatus.map((server, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(server.status)}`} />
                  <span className="font-medium text-gray-900 dark:text-white">{server.name}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                  server.status === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  server.status === 'degraded' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {server.status}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> CPU
                  </span>
                  <span className={`font-medium ${server.cpu > 80 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {server.cpu}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <HardDrive className="w-3 h-3" /> Memory
                  </span>
                  <span className={`font-medium ${server.memory > 80 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {server.memory}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Uptime
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{server.uptime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 font-mono text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {getLevelBadge(log.level)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {log.source}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{log.message}</p>
                      {log.details && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{log.details}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No logs found matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
