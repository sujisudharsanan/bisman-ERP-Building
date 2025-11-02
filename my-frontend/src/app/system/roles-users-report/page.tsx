'use client';

import React, { useState, useEffect, useMemo } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import { FiGrid, FiUsers, FiFile } from 'react-icons/fi';

type Module = {
  id: number | string;
  module_name: string;
  display_name?: string;
  name: string;
  productType?: string;
  businessCategory?: string;
  enabled?: boolean;
  pages?: string[];
};

type ReportSummary = {
  totalRoles: number;
  totalUsers: number;
  rolesWithUsers: number;
  rolesWithoutUsers: number;
  generatedAt: string;
};

type UserDetail = {
  userId: number;
  username: string;
  email: string;
  createdAt: string;
};

type RoleReport = {
  roleId: number;
  roleName: string;
  roleDisplayName: string;
  roleDescription: string | null;
  roleStatus: string;
  userCount: number;
  users: UserDetail[];
};

export default function RolesUsersReportPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<RoleReport[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModuleName, setSelectedModuleName] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());
  const [pagePermissions, setPagePermissions] = useState<Record<string, boolean>>({});

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rolesRes, modulesRes] = await Promise.all([
        fetch('/api/reports/roles-users', { credentials: 'include' }),
        fetch('/api/enterprise-admin/master-modules', { credentials: 'include' }),
      ]);

      if (!rolesRes.ok) {
        throw new Error(`Failed to load report: ${rolesRes.statusText}`);
      }

      const rolesData = await rolesRes.json();

      if (rolesData.success) {
        setReportData(rolesData.data);
        setSummary(rolesData.summary);
      } else {
        throw new Error(rolesData.error || 'Failed to load report');
      }

      const modulesData = await modulesRes.json().catch(() => ({}));
      const modsList: Module[] = modulesData.ok && Array.isArray(modulesData.modules)
        ? modulesData.modules
        : Array.isArray(modulesData.data)
          ? modulesData.data
          : Array.isArray(modulesData)
            ? modulesData
            : [];

      setModules(modsList);
    } catch (err: any) {
      setError(err.message);
      console.error('[RolesUsersReport] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const filteredModules = useMemo(() => {
    const isPump = (m: Module) =>
      (m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP';
    return modules.filter(m => !isPump(m));
  }, [modules]);

  const filteredRoles = useMemo(() => {
    if (!selectedModuleName) return reportData;
    return reportData;
  }, [reportData, selectedModuleName]);

  const selectedRole = useMemo(() => {
    if (!selectedRoleId) return null;
    return reportData.find(r => r.roleId === selectedRoleId) || null;
  }, [reportData, selectedRoleId]);

  const selectedModule = useMemo(() => {
    if (!selectedModuleName) return null;
    const module = filteredModules.find(m => m.module_name === selectedModuleName) || null;
    return module;
  }, [filteredModules, selectedModuleName]);

  const modulePages = useMemo(() => {
    if (!selectedModule) return [] as string[];
    if (!selectedModule.pages || !Array.isArray(selectedModule.pages)) return [] as string[];
    return selectedModule.pages;
  }, [selectedModule]);

  useEffect(() => {
    if (selectedModuleName) {
      console.log('[DEBUG] Module selected:', selectedModuleName);
      console.log('[DEBUG] modulePages:', modulePages);
    }
  }, [selectedModuleName, modulePages]);

  const togglePagePermission = (pageName: string) => {
    setPagePermissions(prev => ({
      ...prev,
      [pageName]: !prev[pageName],
    }));
  };

  const expandAll = () => setExpandedRoles(new Set(reportData.map(r => r.roleId)));
  const collapseAll = () => setExpandedRoles(new Set());

  return (
    <SuperAdminShell title="Modules & Roles">
      <div className="space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Total Modules</div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{filteredModules.length}</div>
              </div>
              <FiGrid className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Total Roles</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{summary?.totalRoles || 0}</div>
              </div>
              <FiUsers className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600 dark:text-green-400">Total Users</div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{summary?.totalUsers || 0}</div>
              </div>
              <FiFile className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Active Category</div>
                <div className="text-lg font-bold text-orange-900 dark:text-orange-100">Business ERP</div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
            </div>
          </div>
        )}

        {/* Quick action: Jump to 4th column (Pages) */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              const el = document.querySelector('[data-fourth-row]') as HTMLElement | null;
              if (el) {
                try {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } catch {}
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            title="Jump to Page Permissions panel"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 10a1 1 0 011-1h8.586L9.293 5.707A1 1 0 1110.707 4.293l5 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L12.586 11H4a1 1 0 01-1-1z"/></svg>
            Go to Page Permissions
          </button>
        </div>

        {/* Four Column Layout: Modules | Roles | Users | Pages */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 1. Modules */}
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>Modules</span>
              <span className="text-xs font-normal px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{filteredModules.length}</span>
            </div>
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {filteredModules.length === 0 && <div className="text-xs text-gray-500">No Modules</div>}
              {filteredModules.map((m) => {
                const isSelected = selectedModuleName === m.module_name;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModuleName(m.module_name);
                      setSelectedRoleId(null);
                      requestAnimationFrame(() => {
                        const fourthRow = document.querySelector('[data-fourth-row]') as HTMLElement | null;
                        if (fourthRow?.scrollIntoView) {
                          try {
                            fourthRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          } catch {
                            const rect = fourthRow.getBoundingClientRect();
                            window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: 'smooth' });
                          }
                        }
                      });
                    }}
                    className={`w-full text-left rounded-md border p-3 transition ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                    title={m.display_name || m.name}
                  >
                    <div className="text-xs truncate font-medium">{m.display_name || m.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Roles */}
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>Roles</span>
              {selectedModuleName && (
                <span className="text-xs font-normal px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{filteredRoles.length}</span>
              )}
            </div>
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {!selectedModuleName && (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300">⚠️ Select a module to view roles</div>
              )}
              {selectedModuleName && filteredRoles.length === 0 && <div className="text-xs text-gray-500">No Roles</div>}
              {selectedModuleName && filteredRoles.map((r) => {
                const isSelected = selectedRoleId === r.roleId;
                return (
                  <button
                    key={r.roleId}
                    onClick={() => setSelectedRoleId(r.roleId)}
                    className={`w-full text-left rounded-md border px-3 py-2 text-xs transition ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                    title={r.roleName}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{r.roleDisplayName}</span>
                      <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold ${r.userCount > 0 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>{r.userCount}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{r.roleName}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Users */}
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>Users</span>
              {selectedRole && (
                <span className="text-xs font-normal px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{selectedRole.users.length}</span>
              )}
            </div>
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {!selectedRoleId && (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300">⚠️ Select a role to view users</div>
              )}
              {selectedRoleId && !selectedRole && <div className="text-xs text-gray-500">Loading users...</div>}
              {selectedRole && selectedRole.users.length === 0 && <div className="text-xs text-gray-500">No users assigned to this role</div>}
              {selectedRole && selectedRole.users.map((user) => (
                <div key={user.userId} className="rounded-md border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user.username}</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 truncate mt-0.5">{user.email}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">ID: {user.userId} • Created: {new Date(user.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Pages */}
          <div data-fourth-row className="rounded-lg border bg-white dark:bg-gray-900 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>
                Pages{selectedModuleName ? (<>
                  {' '}in {String(selectedModule?.display_name || selectedModule?.name || selectedModuleName)}
                </>) : null}
              </span>
              {selectedModuleName && modulePages.length > 0 && (
                <span className="text-xs font-normal px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{modulePages.length}</span>
              )}
            </div>

            {!selectedModuleName && (
              <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300">⚠️ Select a module to view pages</div>
            )}

            {selectedModuleName && (
              <>
                {modulePages.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-2">
                        {modulePages.map((page) => {
                          const isAllowed = pagePermissions[page] !== false; // Default to true
                          return (
                            <div key={page} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isAllowed ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'}`}>
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{page}</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{isAllowed ? '✓ Allowed' : '✗ Disallowed'}</div>
                              </div>
                              <button
                                onClick={() => togglePagePermission(page)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isAllowed ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                role="switch"
                                aria-checked={isAllowed}
                                title={isAllowed ? 'Click to disallow' : 'Click to allow'}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAllowed ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Save/Reset Buttons */}
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <button
                        onClick={() => {
                          console.log('[PagePermissions] Saving permissions:', pagePermissions);
                          alert('Page permissions saved! (Backend integration pending)');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          const resetPermissions: Record<string, boolean> = {};
                          modulePages.forEach(page => {
                            resetPermissions[page] = true;
                          });
                          setPagePermissions(resetPermissions);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Reset
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-3">
                    <div className="text-xs text-yellow-700 dark:text-yellow-300">⚠️ This module has no pages defined in the API response. Pages will appear here once the backend includes page data.</div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-2">Expected API field: <code className="bg-gray-800 text-green-400 px-1 rounded">{`pages: ["page1", "page2", ...]`}</code></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
