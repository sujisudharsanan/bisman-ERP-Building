"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { 
  FiFileText, 
  FiDatabase, 
  FiServer, 
  FiPackage, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiSearch,
  FiChevronDown,
  FiChevronRight,
  FiRefreshCw
} from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { PAGE_REGISTRY, MODULES } from "@/common/config/page-registry";
import { usePageRefresh, useRefreshTrigger } from "@/contexts/RefreshContext";

type BackendPage = {
  key: string;
  name: string;
  module: string;
};

type ModuleWithPages = {
  id: number;
  module_name: string;
  display_name: string;
  pages?: Array<{ id: string; path: string; name?: string }>;
};

type PageStatus = {
  id: string;
  name: string;
  path?: string;
  module?: string;
  inRegistry: boolean;
  inBackend: boolean;
  inModules: boolean;
  mappedModuleName?: string;
};

export default function PagesReportPage() {
  useAuth();
  const { isRefreshing, lastRefresh: globalLastRefresh } = useRefreshTrigger();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendPages, setBackendPages] = useState<BackendPage[]>([]);
  const [modulesWithPages, setModulesWithPages] = useState<ModuleWithPages[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'synced' | 'missing-backend' | 'missing-registry' | 'unmapped'>('all');

  // Refetch data function for global refresh
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [pagesRes, modulesRes] = await Promise.all([
        fetch('/api/pages', { credentials: 'include' }),
        fetch('/api/enterprise-admin/master-modules', { credentials: 'include' })
      ]);

      if (pagesRes.ok) {
        const pagesJson = await pagesRes.json();
        if (pagesJson.success && Array.isArray(pagesJson.data)) {
          setBackendPages(pagesJson.data);
        }
      }

      if (modulesRes.ok) {
        const modulesJson = await modulesRes.json();
        if (Array.isArray(modulesJson.modules)) {
          setModulesWithPages(modulesJson.modules);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Register refresh handler with global context
  usePageRefresh('enterprise-admin-pages-report', fetchData);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get all pages mapped under modules
  const modulesMappedPages = useMemo(() => {
    const mapped = new Map<string, string>();
    modulesWithPages.forEach(mod => {
      (mod.pages || []).forEach(page => {
        mapped.set(page.id, mod.display_name || mod.module_name);
      });
    });
    return mapped;
  }, [modulesWithPages]);

  // Create a unified list of all pages from all sources
  const allPages = useMemo((): PageStatus[] => {
    const pageMap = new Map<string, PageStatus>();

    // Add pages from registry
    PAGE_REGISTRY.forEach(page => {
      pageMap.set(page.id, {
        id: page.id,
        name: page.name,
        path: page.path,
        module: page.module,
        inRegistry: true,
        inBackend: false,
        inModules: false,
      });
    });

    // Mark pages that exist in backend
    backendPages.forEach(page => {
      const existing = pageMap.get(page.key);
      if (existing) {
        existing.inBackend = true;
      } else {
        pageMap.set(page.key, {
          id: page.key,
          name: page.name,
          module: page.module,
          inRegistry: false,
          inBackend: true,
          inModules: false,
        });
      }
    });

    // Mark pages that are mapped to modules
    modulesMappedPages.forEach((moduleName, pageId) => {
      const existing = pageMap.get(pageId);
      if (existing) {
        existing.inModules = true;
        existing.mappedModuleName = moduleName;
      } else {
        pageMap.set(pageId, {
          id: pageId,
          name: pageId,
          inRegistry: false,
          inBackend: false,
          inModules: true,
          mappedModuleName: moduleName,
        });
      }
    });

    return Array.from(pageMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [backendPages, modulesMappedPages]);

  // Statistics
  const stats = useMemo(() => {
    const total = allPages.length;
    const inRegistry = allPages.filter(p => p.inRegistry).length;
    const inBackend = allPages.filter(p => p.inBackend).length;
    const inModules = allPages.filter(p => p.inModules).length;
    const fullySynced = allPages.filter(p => p.inRegistry && p.inBackend).length;
    const missingBackend = allPages.filter(p => p.inRegistry && !p.inBackend).length;
    const missingRegistry = allPages.filter(p => !p.inRegistry && p.inBackend).length;
    const unmapped = allPages.filter(p => !p.inModules).length;

    return { total, inRegistry, inBackend, inModules, fullySynced, missingBackend, missingRegistry, unmapped };
  }, [allPages]);

  // Filtered pages
  const filteredPages = useMemo(() => {
    let result = allPages;

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.module || '').toLowerCase().includes(q) ||
        (p.mappedModuleName || '').toLowerCase().includes(q)
      );
    }

    // Filter by status
    switch (filterStatus) {
      case 'synced':
        result = result.filter(p => p.inRegistry && p.inBackend);
        break;
      case 'missing-backend':
        result = result.filter(p => p.inRegistry && !p.inBackend);
        break;
      case 'missing-registry':
        result = result.filter(p => !p.inRegistry && p.inBackend);
        break;
      case 'unmapped':
        result = result.filter(p => !p.inModules);
        break;
    }

    return result;
  }, [allPages, searchQuery, filterStatus]);

  // Group pages by module
  const pagesByModule = useMemo(() => {
    const grouped: Record<string, PageStatus[]> = {};
    filteredPages.forEach(page => {
      const mod = page.module || 'Unknown';
      if (!grouped[mod]) {
        grouped[mod] = [];
      }
      grouped[mod].push(page);
    });
    return grouped;
  }, [filteredPages]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(Object.keys(pagesByModule)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiFileText className="text-purple-600" />
            Pages Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compare pages across Registry, Backend, and Module mappings
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {globalLastRefresh && (
            <span>Last refresh: {globalLastRefresh.toLocaleTimeString()}</span>
          )}
          {isRefreshing && <FiRefreshCw className="w-4 h-4 animate-spin text-purple-600" />}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
            <FiFileText className="w-5 h-5" />
            <span className="text-xs font-medium">Total Pages</span>
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.total}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <FiDatabase className="w-5 h-5" />
            <span className="text-xs font-medium">In Registry</span>
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.inRegistry}</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <FiServer className="w-5 h-5" />
            <span className="text-xs font-medium">In Backend</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.inBackend}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
            <FiPackage className="w-5 h-5" />
            <span className="text-xs font-medium">Mapped to Modules</span>
          </div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.inModules}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
            <FiCheckCircle className="w-5 h-5" />
            <span className="text-xs font-medium">Fully Synced</span>
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.fullySynced}</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-xl p-4 border border-red-200 dark:border-red-700">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
            <FiAlertCircle className="w-5 h-5" />
            <span className="text-xs font-medium">Missing Backend</span>
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.missingBackend}</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-2">
            <FiAlertCircle className="w-5 h-5" />
            <span className="text-xs font-medium">Unmapped</span>
          </div>
          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.unmapped}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-400 focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'synced', label: 'Synced' },
              { key: 'missing-backend', label: 'Missing Backend' },
              { key: 'missing-registry', label: 'Missing Registry' },
              { key: 'unmapped', label: 'Unmapped' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilterStatus(opt.key as typeof filterStatus)}
                className={`px-3 py-1.5 text-xs rounded-md transition ${
                  filterStatus === opt.key
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expand/Collapse */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredPages.length} of {stats.total} pages
      </div>

      {/* Pages by Module */}
      <div className="space-y-3">
        {Object.keys(pagesByModule).sort().map(moduleId => {
          const pages = pagesByModule[moduleId];
          const isExpanded = expandedModules.has(moduleId);
          const moduleInfo = MODULES[moduleId as keyof typeof MODULES];

          return (
            <div key={moduleId} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Module Header */}
              <button
                onClick={() => toggleModule(moduleId)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <FiPackage className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">{moduleInfo?.name || moduleId}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {pages.length} pages
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                    {pages.filter(p => p.inRegistry && p.inBackend).length} synced
                  </span>
                  {pages.filter(p => !p.inModules).length > 0 && (
                    <span className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded">
                      {pages.filter(p => !p.inModules).length} unmapped
                    </span>
                  )}
                </div>
              </button>

              {/* Pages List */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Page ID</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Name</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-500">Registry</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-500">Backend</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-500">Mapped</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Mapped Module</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map(page => (
                        <tr key={page.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400">{page.id}</td>
                          <td className="px-4 py-2">{page.name}</td>
                          <td className="px-4 py-2 text-center">
                            {page.inRegistry ? (
                              <FiCheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <FiAlertCircle className="w-4 h-4 text-red-500 mx-auto" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {page.inBackend ? (
                              <FiCheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <FiAlertCircle className="w-4 h-4 text-red-500 mx-auto" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {page.inModules ? (
                              <FiCheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <FiAlertCircle className="w-4 h-4 text-yellow-500 mx-auto" />
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500">
                            {page.mappedModuleName || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FiFileText className="text-purple-600" />
          Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-blue-600 mb-2">Frontend Registry</h4>
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-bold">{stats.inRegistry}</span> pages defined in <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">page-registry.ts</code>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              This is the source of truth for all frontend routes and navigation.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-emerald-600 mb-2">Backend Routes</h4>
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-bold">{stats.inBackend}</span> pages in <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">pagesRoutes.js</code>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Backend API returns these pages for RBAC permission management.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-orange-600 mb-2">Module Mappings</h4>
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-bold">{stats.inModules}</span> pages mapped to modules
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Pages assigned to modules via the Module Management interface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
