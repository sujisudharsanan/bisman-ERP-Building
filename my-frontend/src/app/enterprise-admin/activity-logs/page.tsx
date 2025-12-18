'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Search,
  Filter,
  CheckCircle,
  Info,
  XCircle,
  Clock,
  User,
  Building2,
  Shield,
  RefreshCw,
  Download,
  ChevronRight,
  WifiOff,
  AlertTriangle,
  Settings,
  Database,
  CreditCard,
  Link2,
  FileText,
  Lock,
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  Key,
  Globe,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usePageRefresh } from '@/contexts/RefreshContext';
import { useReportContext } from '@/contexts/ReportContext';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  action: string;
  user?: string;
  module?: string;
  details?: string;
  ip_address?: string;
}

interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  info: number;
}

interface FilterOption {
  name: string;
  count?: number;
}

interface FilterOptions {
  modules: FilterOption[];
  users: FilterOption[];
  clients: { id: string; name: string }[];
  superAdmins: { id: string; name: string; email: string }[];
}

type TabType = 'all' | 'security' | 'users' | 'system';

const moduleIcons: Record<string, React.ReactNode> = {
  auth: <Lock className="w-4 h-4" />,
  user: <User className="w-4 h-4" />,
  client: <Building2 className="w-4 h-4" />,
  super_admin: <Shield className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  system: <Database className="w-4 h-4" />,
  security: <Shield className="w-4 h-4" />,
  integrations: <Link2 className="w-4 h-4" />,
  billing: <CreditCard className="w-4 h-4" />,
  data: <FileText className="w-4 h-4" />,
};

const actionIcons: Record<string, React.ReactNode> = {
  LOGIN: <LogIn className="w-4 h-4" />,
  LOGOUT: <LogOut className="w-4 h-4" />,
  CREATE: <Plus className="w-4 h-4" />,
  UPDATE: <Edit className="w-4 h-4" />,
  DELETE: <Trash2 className="w-4 h-4" />,
  VIEW: <Eye className="w-4 h-4" />,
  EXPORT: <Download className="w-4 h-4" />,
  PERMISSION: <Key className="w-4 h-4" />,
};

const tabsConfig: { id: TabType; label: string; icon: React.ReactNode; filter?: string[] }[] = [
  { id: 'all', label: 'All Activity', icon: <Activity className="w-4 h-4" /> },
  { id: 'security', label: 'Security Events', icon: <Shield className="w-4 h-4" />, filter: ['auth', 'security'] },
  { id: 'users', label: 'User Actions', icon: <User className="w-4 h-4" />, filter: ['user', 'super_admin', 'client'] },
  { id: 'system', label: 'System Events', icon: <Database className="w-4 h-4" />, filter: ['system', 'settings', 'integrations', 'billing'] },
];

const getLevelColor = (level: string) => {
  switch (level) {
    case 'error': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    case 'success': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    default: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
  }
};

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'error': return <XCircle className="w-4 h-4" />;
    case 'warning': return <AlertTriangle className="w-4 h-4" />;
    case 'success': return <CheckCircle className="w-4 h-4" />;
    default: return <Info className="w-4 h-4" />;
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';
  if (diffDays < 7) return diffDays + 'd ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatFullTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
};

const formatAction = (action: string) => {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const getActionIcon = (action: string) => {
  const upperAction = action.toUpperCase();
  for (const [key, icon] of Object.entries(actionIcons)) {
    if (upperAction.includes(key)) return icon;
  }
  return <Activity className="w-4 h-4" />;
};

export default function ActivityAuditLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>({ total: 0, errors: 0, warnings: 0, info: 0 });
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('week');
  const [mounted, setMounted] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ modules: [], users: [], clients: [], superAdmins: [] });
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [newLogCount, setNewLogCount] = useState(0);
  const { connected, subscribe, unsubscribe, onReportUpdate } = useReportContext();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (connected) {
      subscribe('active-users' as any);
      const unsubscribeCallback = onReportUpdate('active-users' as any, (data) => {
        const recentData = data?.recentActivity || [];
        if (Array.isArray(recentData) && recentData.length > 0) {
          setNewLogCount((c) => c + recentData.length);
        }
      });
      return () => { unsubscribe('active-users' as any); unsubscribeCallback(); };
    }
  }, [connected, subscribe, unsubscribe, onReportUpdate]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(baseURL + '/api/enterprise-admin/logs/filter-options', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setFilterOptions({ modules: data.modules || [], users: data.users || [], clients: data.clients || [], superAdmins: data.superAdmins || [] });
        }
      }
    } catch (error) { console.error('Error fetching filter options:', error); }
  }, []);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) { setIsDataRefreshing(true); } else { setIsLoading(true); }
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const params = new URLSearchParams({ range: dateRange });
      if (filterModule !== 'all') params.set('module', filterModule);
      if (filterUser !== 'all') params.set('user', filterUser);
      if (filterClient !== 'all') params.set('clientId', filterClient);
      const response = await fetch(baseURL + '/api/enterprise-admin/logs?' + params.toString(), { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.ok) { setLogs(data.logs); setStats(data.stats); setNewLogCount(0); }
      }
    } catch (error) { console.error('Error fetching logs:', error); }
    finally { setIsLoading(false); setIsDataRefreshing(false); }
  }, [dateRange, filterModule, filterUser, filterClient]);

  useEffect(() => {
    if (!mounted) return;
    if (!user || user.role !== 'ENTERPRISE_ADMIN') { router.push('/auth/login'); return; }
    fetchFilterOptions();
    fetchLogs();
  }, [user, router, mounted, fetchLogs, fetchFilterOptions]);

  useEffect(() => { if (mounted && user) { fetchLogs(); } }, [filterModule, filterUser, filterClient, dateRange, mounted, user, fetchLogs]);

  usePageRefresh('activity-logs', () => fetchLogs(true));

  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    const currentTab = tabsConfig.find(t => t.id === activeTab);
    if (currentTab?.filter) { filtered = filtered.filter(log => log.module && currentTab.filter!.includes(log.module)); }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) => log.action.toLowerCase().includes(query) || log.user?.toLowerCase().includes(query) || log.module?.toLowerCase().includes(query) || log.details?.toLowerCase().includes(query));
    }
    if (filterLevel !== 'all') { filtered = filtered.filter((log) => log.level === filterLevel); }
    return filtered;
  }, [logs, searchQuery, filterLevel, activeTab]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {};
    filteredLogs.forEach((log) => { const date = new Date(log.timestamp).toDateString(); if (!groups[date]) groups[date] = []; groups[date].push(log); });
    return Object.entries(groups);
  }, [filteredLogs]);

  const toggleLogExpand = (id: string) => {
    setExpandedLogs((prev) => { const next = new Set(prev); if (next.has(id)) { next.delete(id); } else { next.add(id); } return next; });
  };

  const handleExport = async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(baseURL + '/api/enterprise-admin/logs/export?range=' + dateRange, { credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'activity-audit-logs-' + dateRange + '-' + Date.now() + '.csv'; a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) { console.error('Export failed:', error); }
  };

  const clearFilters = () => {
    setSearchQuery(''); setFilterLevel('all'); setFilterModule('all'); setFilterUser('all'); setFilterClient('all'); setDateRange('week'); setActiveTab('all');
  };

  const securityStats = useMemo(() => {
    const securityLogs = logs.filter(l => l.module === 'auth' || l.module === 'security');
    const loginLogs = logs.filter(l => l.action.toUpperCase().includes('LOGIN'));
    const failedLogins = loginLogs.filter(l => l.level === 'error' || l.action.toUpperCase().includes('FAILED'));
    const uniqueUsers = new Set(logs.map(l => l.user).filter(Boolean)).size;
    return { totalSecurityEvents: securityLogs.length, loginAttempts: loginLogs.length, failedLogins: failedLogins.length, uniqueUsers };
  }, [logs]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Activity & Audit Logs</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monitor system activities, security events, and user actions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              {connected ? (
                <><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span><span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span></>
              ) : (
                <><WifiOff className="w-3 h-3 text-slate-400" /><span className="text-xs text-slate-500">Offline</span></>
              )}
            </div>
            {newLogCount > 0 && (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => fetchLogs(true)} className="px-3 py-1.5 text-sm bg-violet-600 text-white rounded-full flex items-center gap-1 hover:bg-violet-700 transition-colors">
                <RefreshCw className="w-3 h-3" />{newLogCount} new
              </motion.button>
            )}
            <button onClick={() => fetchLogs(true)} disabled={isDataRefreshing} className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw className={'w-4 h-4 text-slate-600 dark:text-slate-400 ' + (isDataRefreshing ? 'animate-spin' : '')} />
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300">
              <Download className="w-4 h-4" />Export
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Total Events', value: stats.total, icon: <FileText className="w-5 h-5" />, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600 dark:text-blue-400' },
          { title: 'Security Events', value: securityStats.totalSecurityEvents, icon: <Shield className="w-5 h-5" />, color: 'from-violet-500 to-violet-600', textColor: 'text-violet-600 dark:text-violet-400' },
          { title: 'Failed Logins', value: securityStats.failedLogins, icon: <XCircle className="w-5 h-5" />, color: 'from-red-500 to-red-600', textColor: 'text-red-600 dark:text-red-400' },
          { title: 'Active Users', value: securityStats.uniqueUsers, icon: <User className="w-5 h-5" />, color: 'from-green-500 to-green-600', textColor: 'text-green-600 dark:text-green-400' },
        ].map((stat) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <p className={'text-3xl font-bold mt-1 ' + stat.textColor}>{isLoading ? '—' : stat.value.toLocaleString()}</p>
              </div>
              <div className={'p-3 rounded-xl bg-gradient-to-br ' + stat.color + ' text-white shadow-lg'}>{stat.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700">
          {tabsConfig.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={'flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ' + (activeTab === tab.id ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300')}>
              {tab.icon}{tab.label}
              {tab.id === 'security' && securityStats.totalSecurityEvents > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">{securityStats.totalSecurityEvents}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Filters</span>
            <button onClick={clearFilters} className="ml-auto text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400">Clear all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search logs..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
            </div>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="all">All Levels</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
            </select>
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="all">All Modules</option>
              {filterOptions.modules.map((mod) => (<option key={mod.name} value={mod.name}>{mod.name} ({mod.count})</option>))}
            </select>
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="all">All Users</option>
              {filterOptions.users.map((u) => (<option key={u.name} value={u.name}>{u.name} ({u.count})</option>))}
            </select>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm focus:ring-2 focus:ring-violet-500">
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">{filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}</span>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mb-3" />
            <p className="text-slate-500">Loading logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No logs found</p>
            <p className="text-sm text-slate-400 dark:text-slate-500">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {groupedLogs.map(([date, logsForDate]) => (
              <div key={date}>
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700/50 sticky top-0 z-10">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{date === new Date().toDateString() ? 'Today' : date}</span>
                </div>
                {logsForDate.map((log) => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0" onClick={() => toggleLogExpand(log.id)}>
                    <div className="flex items-start gap-3">
                      <div className={'flex-shrink-0 p-1.5 rounded-lg border ' + getLevelColor(log.level)}>{getLevelIcon(log.level)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{formatAction(log.action)}</span>
                          {log.module && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {moduleIcons[log.module] || <Activity className="w-3 h-3" />}{log.module}
                            </span>
                          )}
                          <span className="text-slate-400">{getActionIcon(log.action)}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {log.user && (<span className="flex items-center gap-1"><User className="w-3 h-3" />{log.user}</span>)}
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimestamp(log.timestamp)}</span>
                          {log.ip_address && (<span className="flex items-center gap-1 hidden sm:flex"><Globe className="w-3 h-3" />{log.ip_address}</span>)}
                        </div>
                        <AnimatePresence>
                          {expandedLogs.has(log.id) && log.details && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden">
                              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Calendar className="w-3 h-3" /><span>{formatFullTimestamp(log.timestamp)}</span></div>
                                <pre className="text-xs overflow-x-auto text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                  {typeof log.details === 'string' ? (() => { try { return JSON.stringify(JSON.parse(log.details), null, 2); } catch { return log.details; } })() : JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {log.details && (<motion.div animate={{ rotate: expandedLogs.has(log.id) ? 90 : 0 }} className="flex-shrink-0 text-slate-400"><ChevronRight className="w-4 h-4" /></motion.div>)}
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
