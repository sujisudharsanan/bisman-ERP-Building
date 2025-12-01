'use client';

import React, { useState, useEffect, useMemo } from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import ClientManagementTabs from '@/components/common/ClientManagementTabs';
import { FiGrid, FiUsers, FiFile, FiUserPlus } from 'react-icons/fi';
import { useToast } from '@/components/ui/toast';

export const dynamic = 'force-dynamic';

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

export default function RolesUsersReportPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<RoleReport[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModuleName, setSelectedModuleName] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [pagePermissions, setPagePermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Total unique users across all roles (used for per-module user count display)
  const totalUniqueUsers = useMemo(() => {
    const ids = new Set<number>();
    for (const r of reportData) {
      for (const u of r.users) ids.add(u.userId);
    }
    return ids.size;
  }, [reportData]);

  // Row color identification palette (stable, cyclical)
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
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

  // Helpers to map roles to modules heuristically (until backend provides explicit mapping)
  const normalize = (s: string) => s.replace(/[_-]+/g, ' ').toLowerCase();
  const getModuleKeywords = (m?: Module | null): string[] => {
    if (!m) return [];
    const base = normalize(String(m.display_name || m.name || m.module_name || ''));
    const words = base.split(/\s+/).filter(Boolean);
    const slug = (m.module_name || '').toLowerCase();
    const extras: Record<string, string[]> = {
      finance: ['finance', 'account', 'accounts', 'ledger', 'payable', 'receivable', 'bank', 'banker', 'cfo', 'controller', 'general ledger'],
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

  const filteredRoles = useMemo(() => {
    // Show all roles regardless of module selection
    // The heuristic module-role matching was too strict and hiding valid roles
    return reportData;
  }, [reportData]);

  const selectedRole = useMemo(() => {
    if (!selectedRoleId) return null;
    return reportData.find(r => r.roleId === selectedRoleId) || null;
  }, [reportData, selectedRoleId]);

  const selectedModule = useMemo(() => {
    if (!selectedModuleName) return null;
    const found = filteredModules.find(m => m.module_name === selectedModuleName) || null;
    return found;
  }, [filteredModules, selectedModuleName]);

  // Helper: count pages for any module (normalizes strings/objects)
  const getModulePageCount = (m: Module): number => {
    const raw = Array.isArray(m.pages) ? m.pages : [];
    const normalized = raw.map((p, idx) => {
      if (typeof p === 'string') return { key: p };
      const key = (p?.id || p?.path || p?.name || p?.title || `page_${idx}`).toString();
      return { key };
    });
    const uniq = new Set<string>();
    normalized.forEach(p => uniq.add(p.key));
    return uniq.size;
  };

  // Compute unique users in a module by aggregating users of roles that match that module
  const getModuleUsersCount = (m: Module): number => {
    const relevantRoles = reportData.filter(r => roleMatchesModule(r, m));
    const ids = new Set<number>();
    relevantRoles.forEach(r => r.users.forEach(u => ids.add(u.userId)));
    return ids.size;
  };

  // Normalize module pages into { key, label } to handle strings or objects from API
  const modulePages = useMemo(() => {
    if (!selectedModule || !Array.isArray(selectedModule.pages)) return [] as { key: string; label: string }[];
    const normalized = (selectedModule.pages as Array<string | { id?: string; name?: string; path?: string; title?: string }>)
      .map((p, idx) => {
        if (typeof p === 'string') return { key: p, label: p };
        const key = (p?.id || p?.path || p?.name || p?.title || `page_${idx}`).toString();
        const label = (p?.title || p?.name || p?.path || p?.id || `Page ${idx + 1}`).toString();
        return { key, label };
      });
    const uniq = new Map<string, { key: string; label: string }>();
    normalized.forEach(item => { if (!uniq.has(item.key)) uniq.set(item.key, item); });
    return Array.from(uniq.values());
  }, [selectedModule]);

  useEffect(() => {
    if (selectedModuleName) {
      // Debugging info intentionally omitted in production.
    }
  }, [selectedModuleName, modulePages]);

  const togglePagePermission = (pageName: string) => {
    setPagePermissions(prev => ({
      ...prev,
      [pageName]: !prev[pageName],
    }));
  };

  // Assign selected role to selected module by granting all pages (quick setup)
  const handleAssignRoleToModule = async () => {
    if (!selectedModuleName) {
      toast({ variant: 'destructive', title: 'Select a module', description: 'Choose a module to assign the role to.' });
      return;
    }
    if (!selectedRoleId) {
      toast({ variant: 'destructive', title: 'Select a role', description: 'Choose a role to assign to this module.' });
      return;
    }
    try {
      setSaving(true);
      // allow all pages in the current module by default
      const allowedPages = (modulePages || []).map(p => p.key);
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleId: selectedRoleId, moduleName: selectedModuleName, allowedPages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Failed to assign role');
      }
      // reflect in UI
      const state: Record<string, boolean> = {};
      (modulePages || []).forEach(p => { state[p.key] = true; });
      setPagePermissions(state);
      toast({ variant: 'success', title: 'Role assigned', description: 'All pages enabled for this role in the module.' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Assignment failed', description: msg });
    } finally {
      setSaving(false);
    }
  };

  // Load existing permissions for selected role/user + module and prefill toggles
  useEffect(() => {
    const loadRolePerms = async () => {
      if (!selectedModuleName) return;
      if (!selectedRoleId && !selectedUserId) return;
      
      // Clear permissions while loading
      setPagePermissions({});
      
      try {
        const query = selectedUserId
          ? `/api/permissions?userId=${selectedUserId}`
          : `/api/permissions?roleId=${selectedRoleId}`;
        const res = await fetch(query, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        const allowed: string[] = data?.data?.allowedPages || data?.allowedPages || [];
        
        console.log('[RolesUsersReport] Loaded permissions:', { userId: selectedUserId, roleId: selectedRoleId, allowed });
        
        // Set permissions based on what's in database
        const state: Record<string, boolean> = {};
        (modulePages || []).forEach(p => { 
          // Only mark as allowed if it's in the database
          state[p.key] = allowed.includes(p.key) || allowed.includes(p.label);
        });
        setPagePermissions(state);
        
        if (allowed.length > 0) {
          toast({ title: 'Permissions loaded', description: `Loaded ${allowed.length} permissions from database.` });
        } else {
          toast({ title: 'No permissions', description: 'User has no permissions yet. Toggle pages to grant access.' });
        }
      } catch (error) {
        console.error('[RolesUsersReport] Error loading permissions:', error);
        // On error, set all to false (no permissions)
        const state: Record<string, boolean> = {};
        (modulePages || []).forEach(p => { state[p.key] = false; });
        setPagePermissions(state);
        toast({ variant: 'destructive', title: 'Load failed', description: 'Failed to load permissions from database.' });
      }
    };
    loadRolePerms();
  }, [selectedRoleId, selectedUserId, selectedModuleName, modulePages]);

  const reloadFromServer = async () => {
    if (!selectedModuleName) return;
    if (!selectedRoleId && !selectedUserId) return;
    try {
      const query = selectedUserId
        ? `/api/permissions?userId=${selectedUserId}`
        : `/api/permissions?roleId=${selectedRoleId}`;
      const res = await fetch(query, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      const allowed: string[] = data?.data?.allowedPages || data?.allowedPages || [];
      
      const state: Record<string, boolean> = {};
      (modulePages || []).forEach(p => { 
        // Only mark as allowed if it's in the database
        state[p.key] = allowed.includes(p.key) || allowed.includes(p.label);
      });
      setPagePermissions(state);
      toast({ title: 'Reloaded', description: `Refreshed ${allowed.length} permissions from server.` });
    } catch {
      toast({ variant: 'destructive', title: 'Reload failed', description: 'Could not fetch from server.' });
    }
  };

  const handleSave = async () => {
    if (!selectedModuleName) {
      setSaveError('Select a module before saving');
      return;
    }
    if (!selectedRoleId && !selectedUserId) {
      setSaveError('Select a role and user before saving');
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      // Get current allowed pages from this module
      const currentModulePages = (modulePages || [])
        .filter(p => pagePermissions[p.key] !== false)
        .map(p => p.key);
      
      // Load existing permissions from database to merge
      const query = selectedUserId
        ? `/api/permissions?userId=${selectedUserId}`
        : `/api/permissions?roleId=${selectedRoleId}`;
      const res = await fetch(query, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      const existingAllowed: string[] = data?.data?.allowedPages || data?.allowedPages || [];
      
      // Remove this module's pages from existing, then add current selections
      const otherModulesPages = existingAllowed.filter(page => {
        // Keep pages that aren't in current module
        return !modulePages.some(mp => mp.key === page || mp.label === page);
      });
      
      const finalAllowedPages = [...new Set([...otherModulesPages, ...currentModulePages])];
      
      console.log('[RolesUsersReport] Saving:', {
        currentModulePages,
        existingAllowed,
        otherModulesPages,
        finalAllowedPages
      });
      
      const saveRes = await fetch('/api/permissions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          selectedUserId
            ? { userId: selectedUserId, allowedPages: finalAllowedPages }
            : { roleId: selectedRoleId, allowedPages: finalAllowedPages }
        ),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok || saveData?.success === false) {
        throw new Error(saveData?.error || 'Failed to save');
      }
      setSaveSuccess('Permissions saved');
      toast({ variant: 'success', title: 'Saved', description: `Updated ${finalAllowedPages.length} total permissions.` });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
      toast({ variant: 'destructive', title: 'Save failed', description: String(msg) });
    } finally {
      setSaving(false);
      setTimeout(() => { setSaveSuccess(null); setSaveError(null); }, 2500);
    }
  };

  // expandedRoles and expand/collapse helpers removed (unused in UI)

  if (loading) {
    return (
      <SuperAdminShell title="Modules & Roles">
        <div className="p-4 md:p-6">
          <ClientManagementTabs />
          <div className="p-4">Loading...</div>
        </div>
      </SuperAdminShell>
    );
  }

  return (
    <SuperAdminShell title="Modules & Roles">
      <div className="p-4 md:p-6">
        {/* Shared Tabs Navigation */}
        <ClientManagementTabs />
        
        <div className="space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md p-2 border-l-4 border-l-purple-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-purple-600 dark:text-purple-400">Total Modules</div>
                <div className="text-lg font-bold text-purple-900 dark:text-purple-100">{filteredModules.length}</div>
              </div>
              <FiGrid className="w-4 h-4 text-purple-500" />
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-2 border-l-4 border-l-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Total Roles</div>
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{summary?.totalRoles || 0}</div>
              </div>
              <FiUsers className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-2 border-l-4 border-l-green-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-green-600 dark:text-green-400">Total Users</div>
                <div className="text-lg font-bold text-green-900 dark:text-green-100">{summary?.totalUsers || 0}</div>
              </div>
              <FiFile className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-2 border-l-4 border-l-orange-400">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-orange-600 dark:text-orange-400">Active Category</div>
                <div className="text-sm font-bold text-orange-900 dark:text-orange-100">Business ERP</div>
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

  {/* Quick action removed as requested */}

        {/* Save status */}
        {(saveError || saveSuccess) && (
          <div className={`p-2 text-xs rounded border ${saveError ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' : 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'}`}>
            {saveError || saveSuccess}
          </div>
        )}

        {/* Four Column Layout: Modules | Roles | Users | Pages */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 1. Modules */}
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>Modules</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800" title="Total modules">{filteredModules.length}</span>
                <button
                  onClick={handleAssignRoleToModule}
                  disabled={!selectedModuleName || !selectedRoleId || saving}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${(!selectedModuleName || !selectedRoleId || saving) ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  title={(!selectedModuleName || !selectedRoleId) ? 'Select a module and a role to assign' : 'Assign selected role to this module'}
                >
                  <FiUserPlus className="w-3 h-3" />
                  Assign Role
                </button>
              </div>
            </div>
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {filteredModules.length === 0 && <div className="text-xs text-gray-500">No Modules</div>}
              {filteredModules.map((m, idx) => {
                const isSelected = selectedModuleName === m.module_name;
                const pageCount = getModulePageCount(m);
                const usersCount = getModuleUsersCount(m);
                const barColor = colorForIndex(idx);
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
                            // ignore - fallback below
                            const rect = fourthRow.getBoundingClientRect();
                            window.scrollTo({ top: window.scrollY + rect.top - 80, behavior: 'smooth' });
                          }
                        }
                      });
                    }}
                    className={`relative pl-2 w-full text-left rounded-md border p-3 transition ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                    title={m.display_name || m.name}
                  >
                    <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${barColor}`} />
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs truncate font-medium">{m.display_name || m.name}</div>
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" title="Pages in this module">
                          {pageCount}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" title="Total users (all roles)">
                          {usersCount}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Roles */}
          <div className="rounded-lg border bg-white dark:bg-gray-900 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>Roles</span>
              <span className="text-xs font-normal px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">{filteredRoles.length}</span>
            </div>
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {filteredRoles.length === 0 && <div className="text-xs text-gray-500">No Roles</div>}
              {filteredRoles.map((r, idx) => {
                const isSelected = selectedRoleId === r.roleId;
                const barColor = colorForIndex(idx);
                return (
                  <button
                    key={r.roleId}
        onClick={() => { setSelectedRoleId(r.roleId); setSelectedUserId(null); }}
                    className={`relative pl-2 w-full text-left rounded-md border px-3 py-2 text-xs transition ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}
                    title={r.roleName}
                  >
                    <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${barColor}`} />
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
              {selectedRole && selectedRole.users.map((user, idx) => (
                <button
                  type="button"
                  onClick={() => setSelectedUserId(user.userId)}
                  key={user.userId}
                  className={`text-left w-full relative pl-2 rounded-md border p-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedUserId === user.userId ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700'}`}
                >
                  <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${colorForIndex(idx)}`} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user.username}</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 truncate mt-0.5">{user.email}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">ID: {user.userId} • Created: {new Date(user.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                </button>
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
                        {!selectedUserId && (
                          <div className="col-span-full rounded-md border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 p-2 text-xs text-yellow-800 dark:text-yellow-200">
                            Select a user to enable page toggles.
                          </div>
                        )}
                        {modulePages.map((page, idx) => {
                          const isAllowed = pagePermissions[page.key] === true; // Default to false
                          return (
                            <div key={page.key} className={`relative pl-2 flex items-center justify-between p-3 rounded-lg border transition-all ${isAllowed ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'}`}>
                              <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${colorForIndex(idx)}`} />
                              <div className="flex-1 min-w-0 mr-3">
                                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{page.label}</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{isAllowed ? '✓ Allowed' : '✗ Disallowed'}</div>
                              </div>
                              <button
                                onClick={() => selectedUserId && togglePagePermission(page.key)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isAllowed ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                role="switch"
                                aria-checked={isAllowed}
                                disabled={!selectedUserId}
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
                        onClick={handleSave}
                        disabled={saving || !selectedUserId}
                        className={`px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        title={saving ? 'Saving...' : 'Save permissions'}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={reloadFromServer}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                        disabled={!selectedUserId}
                        title="Reload from server"
                      >
                        Reload
                      </button>
                      <button
                        onClick={() => {
                          const resetPermissions: Record<string, boolean> = {};
                          modulePages.forEach(page => {
                            resetPermissions[page.key] = true;
                          });
                          setPagePermissions(resetPermissions);
                          toast({ title: 'Reset', description: 'Toggles reset to allowed.' });
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                        disabled={!selectedUserId}
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
      </div>
    </SuperAdminShell>
  );
}
