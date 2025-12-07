"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * QA Role & Access Explorer - Dynamic ERP Data Sync
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This page provides an interactive dashboard for exploring the actual ERP system's
 * role hierarchy, permissions, routes, and workflows. Unlike the static version,
 * this dynamically syncs with the live database.
 * 
 * Features:
 * - Real-time role data from rbac_roles table
 * - Live permission matrices from rbac_permissions/rbac_role_permissions
 * - Dynamic route access from rbac_routes/rbac_role_routes
 * - Automatic sync indicator showing last update time
 * 
             </div>
          </div>
        )}
      </div>
  );
}══════════════════════════════════════════════════════════════════════════
 */

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

// Types for ERP data
interface RoleStats {
  totalPermissions: number;
  totalRoutes: number;
  totalUsers: number;
  fullAccess: number;
  partialAccess: number;
  noAccess: number;
  chartData: [number, number, number];
}

interface RolePermission {
  id: number;
  name: string;
  resource: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface RoleRoute {
  id: number;
  path: string;
  name: string;
  module: string;
}

interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
  level: number;
  displayOrder: number;
  isActive: boolean;
  isSystemRole: boolean;
  parentRoleId: number | null;
  stats: RoleStats;
  permissions: RolePermission[];
  routes: RoleRoute[];
}

interface HierarchyNode {
  id: number;
  name: string;
  level: number;
  children: HierarchyNode[];
}

interface PermissionMatrixItem {
  permissionName: string;
  resource: string;
  access: Record<string, 'full' | 'partial' | 'none'>;
}

interface RouteMatrixItem {
  routePath: string;
  routeName: string;
  module: string;
  access: Record<string, 'yes' | 'no'>;
}

interface ERPAction {
  id: number;
  name: string;
  description: string;
}

interface ERPModule {
  id: number;
  name: string;
  key: string;
  isActive: boolean;
}

interface ERPSyncData {
  success: boolean;
  syncedAt: string;
  syncDuration: string;
  summary: {
    totalRoles: number;
    totalPermissions: number;
    totalRoutes: number;
    totalActions: number;
    totalUsers: number;
    totalModules: number;
    totalUserRoleAssignments: number;
  };
  roles: Role[];
  roleHierarchy: HierarchyNode[];
  permissionMatrix: PermissionMatrixItem[];
  routeMatrix: RouteMatrixItem[];
  actions: ERPAction[];
  modules: ERPModule[];
}

type ViewKey = 'matrix' | 'routes' | 'hierarchy' | 'summary';

const navBtnBase =
  'px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100';
const navBtnActive = 'bg-blue-600 text-white shadow-sm hover:bg-blue-700';

export default function QARoleAccessExplorerPage() {
  const [view, setView] = useState<ViewKey>('matrix');
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [data, setData] = useState<ERPSyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Chart.js handling
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  const labels = useMemo(
    () => ['Full Access (✔)', 'Partial / Restricted (▲)', 'No Access (✖)'],
    []
  );

  // Fetch ERP sync data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/qa/erp-sync-data', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ERPSyncData = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to fetch ERP data');
      }

      setData(result);
      setLastSync(result.syncedAt);
      
      // Select first role if none selected
      if (!selectedRoleId && result.roles.length > 0) {
        setSelectedRoleId(result.roles[0].id);
      }
    } catch (err: any) {
      console.error('[QA Explorer] Fetch error:', err);
      setError(err.message || 'Failed to load ERP data');
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Selected role data
  const selectedRole = useMemo(() => {
    if (!data || !selectedRoleId) return null;
    return data.roles.find((r) => r.id === selectedRoleId) || null;
  }, [data, selectedRoleId]);

  // Chart initialization and update
  useEffect(() => {
    if (!chartRef.current || !selectedRole) return;

    let isMounted = true;
    (async () => {
      try {
        const mod = await import('chart.js/auto');
        const Chart: any = (mod as any).default || mod;
        if (!isMounted || !chartRef.current) return;

        // Destroy existing chart
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        const chartData = selectedRole.stats.chartData;
        chartInstanceRef.current = new Chart(chartRef.current.getContext('2d'), {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Permission Count',
                data: chartData,
                backgroundColor: [
                  'rgba(34,139,34,0.6)',
                  'rgba(255,165,0,0.6)',
                  'rgba(220,20,60,0.6)',
                ],
                borderColor: [
                  'rgba(34,139,34,1)',
                  'rgba(255,165,0,1)',
                  'rgba(220,20,60,1)',
                ],
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx: any) => ` ${ctx.raw} Capabilities`,
                },
              },
            },
          },
        });
      } catch (e) {
        console.warn('Chart.js failed to load', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [labels, selectedRole]);

  const thClass = (roleId: number) =>
    'px-4 py-3 font-medium text-center text-xs transition-colors duration-150 ' +
    (selectedRoleId === roleId ? 'bg-indigo-50 dark:bg-indigo-900/30' : '');

  // Render loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading ERP data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 px-6 py-4 rounded-lg dark:bg-red-900/30 dark:text-red-300">
            <p className="font-medium mb-2">Failed to load ERP data</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
        {/* Header with sync status */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                Role & Access Explorer
              </h1>
              <p className="mt-1 text-lg text-slate-600 dark:text-slate-300">
                Live ERP system data - dynamically synced
              </p>
            </div>
            
            {/* Sync Status Panel */}
            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {loading ? 'Syncing...' : 'Live'}
                </span>
              </div>
              {lastSync && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Last sync: {new Date(lastSync).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                🔄 Refresh
              </button>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto (30s)
              </label>
            </div>
          </div>

          {/* Summary Stats */}
          {data && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-bold text-blue-600">{data.summary.totalRoles}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Roles</div>
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-bold text-green-600">{data.summary.totalPermissions}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Permissions</div>
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-bold text-purple-600">{data.summary.totalRoutes}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Routes</div>
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-bold text-orange-600">{data.summary.totalActions}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Actions</div>
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-bold text-pink-600">{data.summary.totalUsers}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Users</div>
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-bold text-teal-600">{data.summary.totalModules}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Modules</div>
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-bold text-indigo-600">{data.summary.totalUserRoleAssignments}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Assignments</div>
              </div>
            </div>
          )}
        </header>

        {/* Navigation */}
        <nav className="flex flex-wrap gap-2 bg-white p-3 rounded-lg shadow-sm border border-slate-200 mb-8 dark:bg-slate-900 dark:border-slate-700">
          <button
            onClick={() => setView('matrix')}
            className={`${navBtnBase} ${view === 'matrix' ? navBtnActive : ''}`}
          >
            Permission Matrix
          </button>
          <button
            onClick={() => setView('routes')}
            className={`${navBtnBase} ${view === 'routes' ? navBtnActive : ''}`}
          >
            Route Access
          </button>
          <button
            onClick={() => setView('hierarchy')}
            className={`${navBtnBase} ${view === 'hierarchy' ? navBtnActive : ''}`}
          >
            Role Hierarchy
          </button>
          <button
            onClick={() => setView('summary')}
            className={`${navBtnBase} ${view === 'summary' ? navBtnActive : ''}`}
          >
            Role Details
          </button>
        </nav>

        {/* 1. PERMISSION MATRIX VIEW */}
        {view === 'matrix' && data && (
          <section className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-3 dark:text-slate-100">Explore by Role</h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-3xl mb-4">
                Select a role to see their permissions and access levels from the live database.
              </p>
              <select
                value={selectedRoleId || ''}
                onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                className="w-full max-w-xs p-3 border border-slate-300 rounded-lg shadow-sm bg-white text-base font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
              >
                {data.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.displayName} ({role.stats.totalUsers} users)
                  </option>
                ))}
              </select>
            </div>

            {selectedRole && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                      {selectedRole.displayName}
                    </h3>
                    {selectedRole.isSystemRole && (
                      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded dark:bg-purple-900/30 dark:text-purple-300">
                        System Role
                      </span>
                    )}
                    {!selectedRole.isActive && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded dark:bg-red-900/30 dark:text-red-300">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                    {selectedRole.description}
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-slate-50 rounded dark:bg-slate-800">
                      <div className="text-lg font-bold text-blue-600">{selectedRole.stats.totalPermissions}</div>
                      <div className="text-xs text-slate-500">Permissions</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded dark:bg-slate-800">
                      <div className="text-lg font-bold text-green-600">{selectedRole.stats.totalRoutes}</div>
                      <div className="text-xs text-slate-500">Routes</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded dark:bg-slate-800">
                      <div className="text-lg font-bold text-purple-600">{selectedRole.stats.totalUsers}</div>
                      <div className="text-xs text-slate-500">Users</div>
                    </div>
                  </div>

                  <h4 className="font-semibold mb-2 dark:text-slate-100">Assigned Permissions:</h4>
                  <div className="max-h-48 overflow-y-auto">
                    <ul className="text-sm space-y-1 text-slate-700 dark:text-slate-200">
                      {selectedRole.permissions.slice(0, 10).map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">[{p.resource}]</span>
                          <span>{p.name}</span>
                          <span className="ml-auto text-xs text-slate-500">
                            {p.canCreate && 'C'}
                            {p.canRead && 'R'}
                            {p.canUpdate && 'U'}
                            {p.canDelete && 'D'}
                          </span>
                        </li>
                      ))}
                      {selectedRole.permissions.length > 10 && (
                        <li className="text-xs text-slate-400 italic">
                          ...and {selectedRole.permissions.length - 10} more
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                  <h3 className="text-xl font-semibold mb-4 dark:text-slate-100">Permission Summary</h3>
                  <div className="relative w-full max-w-2xl mx-auto h-80 sm:h-96 max-h-[400px]">
                    <canvas ref={chartRef} aria-label="Role permission summary chart" />
                  </div>
                </div>
              </div>
            )}

            {/* Full Permission Matrix */}
            <div>
              <h3 className="text-xl font-semibold mb-4 dark:text-slate-100">Full Permission Matrix (Live Data)</h3>
              <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <table className="w-full min-w-[800px] text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Permission</th>
                      <th scope="col" className="px-4 py-3 font-medium">Resource</th>
                      {data.roles.slice(0, 7).map((role) => (
                        <th key={role.id} className={thClass(role.id)}>
                          {role.displayName.split(' ')[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 dark:text-slate-200">
                    {data.permissionMatrix.slice(0, 20).map((row, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-800/50'}>
                        <td className="px-4 py-3 font-medium">{row.permissionName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{row.resource}</td>
                        {data.roles.slice(0, 7).map((role) => (
                          <td key={role.id} className="px-4 py-3 text-center">
                            {row.access[role.name] === 'full' && '✔'}
                            {row.access[role.name] === 'partial' && '▲'}
                            {row.access[role.name] === 'none' && '✖'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.permissionMatrix.length > 20 && (
                <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
                  Showing 20 of {data.permissionMatrix.length} permissions
                </p>
              )}
            </div>
          </section>
        )}

        {/* 2. ROUTE ACCESS VIEW */}
        {view === 'routes' && data && (
          <section>
            <h2 className="text-2xl font-semibold mb-3 dark:text-slate-100">Route/Page Access Matrix</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-3xl mb-6">
              Shows which routes/pages each role can access based on rbac_role_routes table.
            </p>

            <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
              <table className="w-full min-w-[800px] text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Route Path</th>
                    <th scope="col" className="px-4 py-3 font-medium">Module</th>
                    {data.roles.slice(0, 7).map((role) => (
                      <th key={role.id} className="px-4 py-3 font-medium text-center">
                        {role.displayName.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-200">
                  {data.routeMatrix.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? '' : 'bg-slate-50 dark:bg-slate-800/50'}>
                      <td className="px-4 py-3 font-mono text-xs">{row.routePath}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{row.module}</td>
                      {data.roles.slice(0, 7).map((role) => (
                        <td key={role.id} className="px-4 py-3 text-center">
                          {row.access[role.name] === 'yes' ? (
                            <span className="text-green-600">✔</span>
                          ) : (
                            <span className="text-red-400">✖</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.routeMatrix.length > 50 && (
              <p className="text-sm text-slate-500 mt-2 dark:text-slate-400">
                Showing 50 of {data.routeMatrix.length} routes
              </p>
            )}
          </section>
        )}

        {/* 3. HIERARCHY VIEW */}
        {view === 'hierarchy' && data && (
          <section>
            <h2 className="text-2xl font-semibold mb-3 dark:text-slate-100">Role Hierarchy</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-3xl mb-8">
              Visual representation of role hierarchy from the database. Shows parent-child relationships.
            </p>

            <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
              {data.roleHierarchy.length > 0 ? (
                <HierarchyTree nodes={data.roleHierarchy} />
              ) : (
                <div className="text-slate-500 dark:text-slate-400">
                  No hierarchy data available. Roles may not have parent-child relationships defined.
                </div>
              )}

              {/* Flat list fallback */}
              {data.roleHierarchy.length === 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3 dark:text-slate-100">All Roles (Flat List):</h4>
                  <div className="space-y-2">
                    {data.roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded dark:bg-slate-800"
                      >
                        <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-bold text-sm dark:bg-blue-900/30 dark:text-blue-300">
                          {role.level}
                        </span>
                        <div>
                          <div className="font-medium dark:text-slate-100">{role.displayName}</div>
                          <div className="text-xs text-slate-500">{role.description}</div>
                        </div>
                        <div className="ml-auto text-sm text-slate-500">
                          {role.stats.totalUsers} users
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. ROLE DETAILS / SUMMARY VIEW */}
        {view === 'summary' && data && (
          <section>
            <h2 className="text-2xl font-semibold mb-3 dark:text-slate-100">Role Details</h2>
            <p className="text-slate-600 dark:text-slate-300 max-w-3xl mb-6">
              Detailed breakdown of each role including all permissions, routes, and user counts.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.roles.map((role) => (
                <div
                  key={role.id}
                  className={`bg-white p-5 rounded-lg shadow-sm border transition-all cursor-pointer hover:shadow-md ${
                    selectedRoleId === role.id
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                      : 'border-slate-200 dark:border-slate-700'
                  } dark:bg-slate-900`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-blue-700 dark:text-blue-300">
                      {role.displayName}
                    </h3>
                    {role.isSystemRole && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded dark:bg-purple-900/30 dark:text-purple-300">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                    {role.description}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-green-50 rounded dark:bg-green-900/20">
                      <div className="text-lg font-bold text-green-600">{role.stats.fullAccess}</div>
                      <div className="text-[10px] text-slate-500">Full</div>
                    </div>
                    <div className="p-2 bg-orange-50 rounded dark:bg-orange-900/20">
                      <div className="text-lg font-bold text-orange-600">{role.stats.partialAccess}</div>
                      <div className="text-[10px] text-slate-500">Partial</div>
                    </div>
                    <div className="p-2 bg-red-50 rounded dark:bg-red-900/20">
                      <div className="text-lg font-bold text-red-600">{role.stats.noAccess}</div>
                      <div className="text-[10px] text-slate-500">None</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-500">
                    <span>{role.stats.totalPermissions} permissions</span>
                    <span>{role.stats.totalRoutes} routes</span>
                    <span>{role.stats.totalUsers} users</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions & Modules */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-3 dark:text-slate-100">Available Actions</h3>
                <div className="space-y-2">
                  {data.actions.map((action) => (
                    <div key={action.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded dark:bg-slate-800">
                      <span className="text-blue-600 dark:text-blue-400">•</span>
                      <span className="font-medium dark:text-slate-100">{action.name}</span>
                      {action.description && (
                        <span className="text-xs text-slate-500">{action.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-3 dark:text-slate-100">Active Modules</h3>
                <div className="space-y-2">
                  {data.modules.map((mod) => (
                    <div key={mod.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded dark:bg-slate-800">
                      <span className={`w-2 h-2 rounded-full ${mod.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-medium dark:text-slate-100">{mod.name}</span>
                      <span className="text-xs text-slate-500 font-mono">{mod.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
  );
}

// Hierarchy Tree Component
function HierarchyTree({ nodes, depth = 0 }: { nodes: HierarchyNode[]; depth?: number }) {
  return (
    <div className={depth > 0 ? 'ml-6 mt-3 border-l-2 border-slate-300 pl-4' : ''}>
      {nodes.map((node) => (
        <div key={node.id} className="mb-3">
          <div className={`inline-block bg-white border-2 ${depth === 0 ? 'border-blue-500 text-blue-700' : 'border-slate-300 text-slate-700'} rounded-lg px-4 py-2 font-medium shadow-sm dark:bg-slate-900 dark:text-slate-100`}>
            {node.name}
            <span className="ml-2 text-xs text-slate-400">Lvl {node.level}</span>
          </div>
          {node.children.length > 0 && <HierarchyTree nodes={node.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}
