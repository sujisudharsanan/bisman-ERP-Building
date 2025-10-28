'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, AlertCircle, CheckCircle, Info, XCircle, Clock, User, Tag, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
// Navbar and Sidebar are rendered by the enterprise-admin layout

type Level = 'info' | 'warning' | 'error' | 'success';

interface ActivityLog {
  id: string;
  timestamp: string;
  level: Level;
  action: string;
  user?: string;
  module?: string;
  details?: string;
  ip_address?: string;
}

interface Stats {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

export default function EnterpriseActivityLogsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, errors: 0, warnings: 0, info: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<'all' | Level>('all');
  const [module, setModule] = useState('all');
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    const role = (user.role || user.roleName || '').toUpperCase();
    if (role !== 'ENTERPRISE_ADMIN') {
      router.push('/enterprise-admin/dashboard');
      return;
    }
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, range]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${baseURL}/api/enterprise-admin/logs?range=${range}&limit=500`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          setLogs(data.logs || []);
          setStats(data.stats || { total: 0, errors: 0, warnings: 0, info: 0 });
        }
      }
    } catch (e) {
      console.error('Failed to load activity logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let out = logs;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(l =>
        l.action.toLowerCase().includes(q) ||
        (l.user || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q)
      );
    }
    if (level !== 'all') {
      out = out.filter(l => l.level === level);
    }
    if (module !== 'all') {
      out = out.filter(l => (l.module || '').toLowerCase() === module.toLowerCase());
    }
    return out;
  }, [logs, search, level, module]);

  const getLevelIcon = (lvl: string) => {
    switch (lvl) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getLevelBg = (lvl: string) => {
    switch (lvl) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const exportCsv = () => {
    const csv = [
      ['Timestamp', 'Level', 'Action', 'User', 'Module', 'Details'].join(','),
      ...filtered.map(l => [l.timestamp, l.level, l.action, l.user || 'System', l.module || 'N/A', (l.details || '').replaceAll('\n',' ')].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex">
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <FileText className="w-10 h-10 text-indigo-600" />
                    Activity Logs
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Full activity trail across the system</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Stat label="Total" value={stats.total} color="indigo" icon={<FileText className="w-6 h-6" />} loading={isLoading} />
              <Stat label="Errors" value={stats.errors} color="red" icon={<XCircle className="w-6 h-6" />} loading={isLoading} />
              <Stat label="Warnings" value={stats.warnings} color="yellow" icon={<AlertCircle className="w-6 h-6" />} loading={isLoading} />
              <Stat label="Info" value={stats.info} color="blue" icon={<Info className="w-6 h-6" />} loading={isLoading} />
            </div>

            {/* Filters */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search activity..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white" />
                </div>
                <select value={level} onChange={e => setLevel(e.target.value as any)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white">
                  <option value="all">All Levels</option>
                  <option value="error">Errors</option>
                  <option value="warning">Warnings</option>
                  <option value="success">Success</option>
                  <option value="info">Info</option>
                </select>
                <select value={module} onChange={e => setModule(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white">
                  <option value="all">All Modules</option>
                  <option value="auth">Authentication</option>
                  <option value="enterprise">Enterprise Admin</option>
                  <option value="finance">Finance</option>
                  <option value="system">System</option>
                </select>
                <select value={range} onChange={e => setRange(e.target.value as any)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white">
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </motion.div>

            {/* List */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Entries ({filtered.length})</h2>
              </div>
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No activity found for selected filters</p>
                  </div>
                ) : (
                  filtered.map((log) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`border rounded-lg p-4 ${getLevelBg(log.level)}`}>
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{getLevelIcon(log.level)}</div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{log.action}</h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {mounted ? new Date(log.timestamp).toLocaleString() : '—'}
                            </span>
                          </div>
                          {log.details && <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{log.details}</p>}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            {log.user && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.user}
                              </span>
                            )}
                            {log.module && (
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {log.module}
                              </span>
                            )}
                            {log.ip_address && <span className="flex items-center gap-1">IP: {log.ip_address}</span>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color, loading }: { icon: React.ReactNode; label: string; value: number; color: 'indigo' | 'red' | 'yellow' | 'blue'; loading?: boolean }) {
  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-500 to-yellow-600',
    blue: 'from-blue-500 to-blue-600',
  } as const;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white mb-4`}>{icon}</div>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
        </>
      )}
    </motion.div>
  );
}
