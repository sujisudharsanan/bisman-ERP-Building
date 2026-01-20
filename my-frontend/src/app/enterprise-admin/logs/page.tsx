'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
  User,
  Tag,
  Building2,
  Shield,
  Users,
} from 'lucide-react';
// Navbar and Sidebar are provided by the enterprise-admin layout
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SystemLogViewer from '@/components/system/SystemLogViewer';
import { usePageRefresh } from '@/contexts/RefreshContext';

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

interface ClientOption {
  id: string;
  name: string;
}

interface SuperAdminOption {
  id: string;
  name: string;
  email: string;
}

interface FilterOptions {
  modules: FilterOption[];
  users: FilterOption[];
  clients: ClientOption[];
  superAdmins: SuperAdminOption[];
}

export default function LogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    errors: 0,
    warnings: 0,
    info: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterSuperAdmin, setFilterSuperAdmin] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');
  const [mounted, setMounted] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    modules: [],
    users: [],
    clients: [],
    superAdmins: [],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(
        `${baseURL}/api/enterprise-admin/logs/filter-options`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setFilterOptions({
            modules: data.modules || [],
            users: data.users || [],
            clients: data.clients || [],
            superAdmins: data.superAdmins || [],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  }, []);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsDataRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const params = new URLSearchParams({
        range: dateRange,
        ...(filterModule !== 'all' && { module: filterModule }),
        ...(filterUser !== 'all' && { user: filterUser }),
        ...(filterClient !== 'all' && { clientId: filterClient }),
        ...(filterSuperAdmin !== 'all' && { superAdminId: filterSuperAdmin }),
      });
      
      const response = await fetch(
        `${baseURL}/api/enterprise-admin/logs?${params.toString()}`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setLogs(data.logs);
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
      setIsDataRefreshing(false);
    }
  }, [dateRange, filterModule, filterUser, filterClient, filterSuperAdmin]);

  useEffect(() => {
    if (!mounted) return;
    if (!user || user.role !== 'ENTERPRISE_ADMIN') {
      router.push('/auth/login');
      return;
    }
    fetchFilterOptions();
    fetchLogs();
  }, [user, router, mounted, fetchLogs, fetchFilterOptions]);

  // Re-fetch when filters change
  useEffect(() => {
    if (mounted && user) {
      fetchLogs();
    }
  }, [filterModule, filterUser, filterClient, filterSuperAdmin, dateRange]);

  // Register with global refresh context
  usePageRefresh('logs', () => fetchLogs(true));

  useEffect(() => {
    applyFilters();
  }, [logs, searchQuery, filterLevel]);

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.details?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Level filter (client-side since level is derived)
    if (filterLevel !== 'all') {
      filtered = filtered.filter((log) => log.level === filterLevel);
    }

    setFilteredLogs(filtered);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
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

  const getLevelColor = (level: string) => {
    switch (level) {
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

  // export/refresh actions removed per request

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex">
        <main className="flex-1 p-8">
          <div className="w-full">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                System Logs
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Monitor system activities, errors, and performance metrics
              </p>
            </div>

            {/* Stats Cards - NOW AT TOP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
              >
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-indigo-100 dark:bg-indigo-900/20 rounded-full opacity-50" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Logs</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {isLoading ? '...' : stats.total.toLocaleString()}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
              >
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-red-100 dark:bg-red-900/20 rounded-full opacity-50" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 mb-4">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Errors</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                    {isLoading ? '...' : stats.errors.toLocaleString()}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
              >
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-amber-100 dark:bg-amber-900/20 rounded-full opacity-50" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 mb-4">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Warnings</p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {isLoading ? '...' : stats.warnings.toLocaleString()}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
              >
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-blue-100 dark:bg-blue-900/20 rounded-full opacity-50" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-4">
                    <Info className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Info</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {isLoading ? '...' : stats.info.toLocaleString()}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Filters - Improved Design */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">Filters</h3>
              </div>
              
              {/* First Row - Search and Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all"
                  />
                </div>

                {/* Level Filter */}
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all cursor-pointer"
                >
                  <option value="all">All Levels</option>
                  <option value="error">Errors</option>
                  <option value="warning">Warnings</option>
                  <option value="success">Success</option>
                  <option value="info">Info</option>
                </select>

                {/* Module Filter - Dynamic */}
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all cursor-pointer"
                >
                  <option value="all">All Modules</option>
                  {filterOptions.modules.map((mod) => (
                    <option key={mod.name} value={mod.name}>
                      {mod.name} {mod.count ? `(${mod.count})` : ''}
                    </option>
                  ))}
                </select>

                {/* Date Range */}
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all cursor-pointer"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {/* Second Row - User, Client, Super Admin Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* User Filter */}
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all cursor-pointer appearance-none"
                  >
                    <option value="all">All Users</option>
                    {filterOptions.users.map((u) => (
                      <option key={u.name} value={u.name}>
                        {u.name} {u.count ? `(${u.count})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Client Filter */}
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all cursor-pointer appearance-none"
                  >
                    <option value="all">All Clients</option>
                    {filterOptions.clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Super Admin Filter */}
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={filterSuperAdmin}
                    onChange={(e) => setFilterSuperAdmin(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all cursor-pointer appearance-none"
                  >
                    <option value="all">All Super Admins</option>
                    {filterOptions.superAdmins.map((sa) => (
                      <option key={sa.id} value={sa.id}>
                        {sa.name || sa.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters Button */}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterLevel('all');
                    setFilterModule('all');
                    setFilterUser('all');
                    setFilterClient('all');
                    setFilterSuperAdmin('all');
                    setDateRange('today');
                  }}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Clear Filters
                </button>
              </div>
            </motion.div>

            {/* System Log Viewer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <SystemLogViewer />
            </motion.div>

            {/* Logs List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  Log Entries
                  <span className="ml-2 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm rounded-full">
                    {filteredLogs.length}
                  </span>
                </h2>
              </div>

              <div className="space-y-3">
                {isLoading ? (
                  Array(10)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No logs found matching your filters</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`border rounded-lg p-4 ${getLevelColor(log.level)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">{getLevelIcon(log.level)}</div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {log.action}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              {mounted ? new Date(log.timestamp).toLocaleString() : 'Loading...'}
                            </span>
                          </div>
                          
                          {log.details && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {log.details}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {log.user && (
                              <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                <User className="w-3 h-3" />
                                {log.user}
                              </span>
                            )}
                            {log.module && (
                              <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                                <Tag className="w-3 h-3" />
                                {log.module}
                              </span>
                            )}
                            {log.ip_address && (
                              <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                IP: {log.ip_address}
                              </span>
                            )}
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
