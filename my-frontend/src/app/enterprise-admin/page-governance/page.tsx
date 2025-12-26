'use client';

import React, { useMemo, useState } from 'react';
import { Shield, Check, X, AlertTriangle, Search, FileText, Eye, EyeOff, Filter } from 'lucide-react';
import { PAGE_REGISTRY, PageMetadata } from '@/common/config/page-registry';

type FilterStatus = 'all' | 'active' | 'coming-soon' | 'disabled';
type FilterVisibility = 'all' | 'visible' | 'hidden';
type FilterReviewed = 'all' | 'reviewed' | 'unreviewed';

export default function PageGovernancePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<FilterVisibility>('all');
  const [reviewedFilter, setReviewedFilter] = useState<FilterReviewed>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  // Extract unique modules
  const modules = useMemo(() => {
    const moduleSet = new Set(PAGE_REGISTRY.map(p => p.module));
    return ['all', ...Array.from(moduleSet).sort()];
  }, []);

  // Filter and sort pages
  const filteredPages = useMemo(() => {
    return PAGE_REGISTRY.filter((page) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          page.name.toLowerCase().includes(searchLower) ||
          page.path.toLowerCase().includes(searchLower) ||
          page.id.toLowerCase().includes(searchLower) ||
          page.module.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && page.status !== statusFilter) return false;

      // Visibility filter
      const isVisible = page.showInSidebar !== false;
      if (visibilityFilter === 'visible' && !isVisible) return false;
      if (visibilityFilter === 'hidden' && isVisible) return false;

      // Reviewed filter
      const isReviewed = Boolean(page.reviewed_by);
      if (reviewedFilter === 'reviewed' && !isReviewed) return false;
      if (reviewedFilter === 'unreviewed' && isReviewed) return false;

      // Module filter
      if (moduleFilter !== 'all' && page.module !== moduleFilter) return false;

      return true;
    }).sort((a, b) => {
      // Sort by module, then by order, then by name
      if (a.module !== b.module) return a.module.localeCompare(b.module);
      if ((a.order ?? 999) !== (b.order ?? 999)) return (a.order ?? 999) - (b.order ?? 999);
      return a.name.localeCompare(b.name);
    });
  }, [search, statusFilter, visibilityFilter, reviewedFilter, moduleFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = PAGE_REGISTRY.length;
    const active = PAGE_REGISTRY.filter(p => p.status === 'active').length;
    const reviewed = PAGE_REGISTRY.filter(p => p.reviewed_by).length;
    const inSidebar = PAGE_REGISTRY.filter(p => p.showInSidebar !== false).length;
    return { total, active, reviewed, inSidebar };
  }, []);

  const getStatusBadge = (status: PageMetadata['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check size={12} /> Active
          </span>
        );
      case 'coming-soon':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <AlertTriangle size={12} /> Coming Soon
          </span>
        );
      case 'disabled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <X size={12} /> Disabled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Page Governance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Registry overview for all ERP pages
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Pages</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">In Sidebar</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inSidebar}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Reviewed</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.reviewed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {modules.map((mod) => (
              <option key={mod} value={mod}>
                {mod === 'all' ? 'All Modules' : mod.charAt(0).toUpperCase() + mod.slice(1)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="coming-soon">Coming Soon</option>
            <option value="disabled">Disabled</option>
          </select>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as FilterVisibility)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Visibility</option>
            <option value="visible">In Sidebar</option>
            <option value="hidden">Hidden</option>
          </select>

          {/* Reviewed Filter */}
          <select
            value={reviewedFilter}
            onChange={(e) => setReviewedFilter(e.target.value as FilterReviewed)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Review Status</option>
            <option value="reviewed">Reviewed</option>
            <option value="unreviewed">Unreviewed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sidebar
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Owner / Reviewed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{page.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{page.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                      {page.path}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {page.module}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(page.status)}</td>
                  <td className="px-4 py-3">
                    {page.showInSidebar !== false ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {page.roles.slice(0, 3).map((role) => (
                        <span
                          key={role}
                          className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        >
                          {role}
                        </span>
                      ))}
                      {page.roles.length > 3 && (
                        <span className="text-xs text-gray-500">+{page.roles.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {page.owner || page.reviewed_by ? (
                      <div className="text-xs">
                        {page.owner && (
                          <div className="text-gray-700 dark:text-gray-300">{page.owner}</div>
                        )}
                        {page.reviewed_by && (
                          <div className="text-gray-500 dark:text-gray-400">
                            ✓ {page.reviewed_by}
                            {page.reviewed_at && ` (${new Date(page.reviewed_at).toLocaleDateString()})`}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPages.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No pages match your filters
          </div>
        )}

        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredPages.length} of {PAGE_REGISTRY.length} pages
          </div>
        </div>
      </div>
    </div>
  );
}
