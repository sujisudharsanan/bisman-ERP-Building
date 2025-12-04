'use client';

// Cache bust: 2025-12-03-2320
import React, { useState, useEffect, useMemo } from 'react';
import { FiGrid, FiUsers, FiFile, FiUserPlus } from 'react-icons/fi';

type Module = {
  id: number | string;
  module_name: string;
  display_name?: string;
  name: string;
  productType?: string;
  businessCategory?: string;
  enabled?: boolean;
  pages?: Array<string | { id?: string; name?: string; path?: string; title?: string }>;
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

export default function ModulesRolesContent() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<RoleReport[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModuleName, setSelectedModuleName] = useState<string | null>(null);
  const [allowedRoleIds, setAllowedRoleIds] = useState<number[]>([]); // Roles allowed by Enterprise Admin

  // Row color identification palette
  const ROW_COLORS = [
    'bg-indigo-500',
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-cyan-500',
    'bg-fuchsia-500',
  ] as const;
  const colorForIndex = (idx: number) => ROW_COLORS[idx % ROW_COLORS.length];

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rolesRes, modulesRes, allowedRolesRes] = await Promise.all([
        fetch('/api/reports/roles-users', { credentials: 'include' }),
        fetch('/api/enterprise-admin/master-modules', { credentials: 'include' }),
        fetch('/api/admin/role-assignments', { credentials: 'include' }),
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

      // Get allowed role IDs from Enterprise Admin assignments
      const allowedData = await allowedRolesRes.json().catch(() => ({}));
      if (allowedData.ok && Array.isArray(allowedData.assignedRoleIds)) {
        setAllowedRoleIds(allowedData.assignedRoleIds);
        console.log('[ModulesRoles] Allowed roles from Enterprise Admin:', allowedData.assignedRoleIds);
      } else {
        // If no role assignments found, default to showing all roles (backward compatibility)
        console.log('[ModulesRoles] No role restrictions found, showing all roles');
        setAllowedRoleIds([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('[ModulesRoles] Error:', err);
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

  // Helpers to map roles to modules
  const normalize = (s: string) => s.replace(/[_-]+/g, ' ').toLowerCase();
  const getModuleKeywords = (m?: Module | null): string[] => {
    if (!m) return [];
    const base = normalize(String(m.display_name || m.name || m.module_name || ''));
    const words = base.split(/\s+/).filter(Boolean);
    const slug = (m.module_name || '').toLowerCase();
    const extras: Record<string, string[]> = {
      finance: ['finance', 'account', 'accounts', 'ledger', 'payable', 'receivable', 'bank', 'banker', 'cfo', 'controller'],
      administration: ['admin', 'administrator', 'compliance'],
      inventory: ['inventory', 'stock', 'warehouse'],
      legal: ['legal', 'law'],
      common: ['common', 'shared', 'general'],
      'system administration': ['system', 'sysadmin', 'super admin', 'settings'],
      'super admin': ['super admin', 'superadmin'],
      'human resources': ['hr', 'human resources', 'recruit', 'payroll', 'attendance'],
    };
    const add = extras[base] || extras[slug] || [];
    return Array.from(new Set([...words, ...add]));
  };
  
  const roleMatchesModule = (r: RoleReport, m?: Module | null) => {
    if (!m) return true;
    const keys = getModuleKeywords(m);
    if (keys.length === 0) return true;
    const a = normalize(r.roleName);
    const b = normalize(r.roleDisplayName);
    return keys.some(k => a.includes(k) || b.includes(k));
  };

  // Filter roles: first by Enterprise Admin allowed roles, then by selected module
  const filteredRoles = useMemo(() => {
    // First, filter by allowed roles from Enterprise Admin
    // If allowedRoleIds is empty, show all roles (backward compatibility)
    let roles = reportData;
    if (allowedRoleIds.length > 0) {
      roles = reportData.filter(r => allowedRoleIds.includes(r.roleId));
    }
    
    // Then filter by selected module
    if (!selectedModuleName) return roles;
    const mod = filteredModules.find(mm => mm.module_name === selectedModuleName) || null;
    return roles.filter(r => roleMatchesModule(r, mod));
  }, [reportData, selectedModuleName, filteredModules, allowedRoleIds]);

  // Helper: count pages for module
  const getModulePageCount = (m: Module): number => {
    const raw = Array.isArray(m.pages) ? m.pages : [];
    return raw.length;
  };

  // Compute unique users in module
  const getModuleUsersCount = (m: Module): number => {
    const relevantRoles = reportData.filter(r => roleMatchesModule(r, m));
    const ids = new Set<number>();
    relevantRoles.forEach(r => r.users.forEach(u => ids.add(u.userId)));
    return ids.size;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading modules and roles...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button 
          onClick={loadReport}
          className="mt-2 px-3 py-1 text-sm bg-red-100 dark:bg-red-900/40 rounded hover:bg-red-200 dark:hover:bg-red-900/60"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FiUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Roles</p>
                <p className="text-2xl font-semibold dark:text-white">
                  {allowedRoleIds.length > 0 ? allowedRoleIds.length : summary.totalRoles}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FiUserPlus className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-semibold dark:text-white">{summary.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FiGrid className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Modules</p>
                <p className="text-2xl font-semibold dark:text-white">{filteredModules.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <FiFile className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Roles with Users</p>
                <p className="text-2xl font-semibold dark:text-white">{summary.rolesWithUsers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filter by Module</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedModuleName(null)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              !selectedModuleName
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Modules
          </button>
          {filteredModules.map((m) => (
            <button
              key={m.module_name}
              onClick={() => setSelectedModuleName(m.module_name)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedModuleName === m.module_name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {m.display_name || m.name} ({getModulePageCount(m)} pages)
            </button>
          ))}
        </div>
      </div>

      {/* Roles List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium dark:text-white">
            Roles {selectedModuleName && `for ${filteredModules.find(m => m.module_name === selectedModuleName)?.display_name || selectedModuleName}`}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredRoles.length} roles
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredRoles.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No roles found for this module
            </div>
          ) : (
            filteredRoles.map((role, idx) => (
              <div
                key={role.roleId}
                className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${colorForIndex(idx)}`} />
                  <div>
                    <div className="font-medium dark:text-white">{role.roleDisplayName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {role.roleName} {role.roleDescription && `• ${role.roleDescription}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm font-medium dark:text-white">{role.userCount}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">users</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    role.roleStatus === 'active' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                  }`}>
                    {role.roleStatus}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

