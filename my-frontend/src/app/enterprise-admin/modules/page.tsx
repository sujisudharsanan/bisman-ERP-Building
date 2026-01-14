"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FiPackage, FiGrid, FiUsers, FiCheckCircle, FiSearch, FiChevronUp, FiLock, FiPlus, FiX } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";

type ModulePage = {
  id: string;
  path: string;
  name?: string;
};

type Module = {
  id: number;
  module_name: string;
  display_name: string;
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
  businessCategory?: string;
  productType?: string;
  alwaysAccessible?: boolean;
  is_always_accessible?: boolean;
  pages?: ModulePage[];
};

type SuperAdmin = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  productType?: string;
  assignedModules?: Array<number | string>;
};

function arr<T = any>(obj: any, key: string): T[] {
  if (!obj || typeof obj !== "object") return [];
  const v = obj[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

// Try to collect any assigned-modules array from a super admin object using several common keys
function pickAssignedArray(source: any): any[] {
  if (!source || typeof source !== 'object') return [];
  const candidates: any[] = [];
  const keys = [
    'assignedModules', 'assigned_modules', 'modules', 'moduleIds', 'module_ids',
    'assigned_module_ids', 'assigned_module_keys', 'access', 'accessToModules', 'access_to_modules'
  ];
  for (const k of keys) {
    const v = (source as any)[k];
    if (Array.isArray(v)) candidates.push(v);
    if (v && typeof v === 'object') {
      const inner = (v as any).modules || (v as any).moduleIds || (v as any).module_ids;
      if (Array.isArray(inner)) candidates.push(inner);
    }
  }
  let best: any[] = [];
  for (const arrCand of candidates) {
    if (arrCand.length > best.length) best = arrCand;
  }
  return best;
}

// Normalize any "assigned module" value into an id (number) or a module key (string)
function normalizeAssigned(value: any): number | string | null {
  if (value == null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    return value;
  }
  if (typeof value === 'object') {
    const candidateKeys = ['id', 'moduleId', 'module_id', 'moduleKey', 'module_key', 'module', 'module_name', 'key', 'slug', 'name'];
    for (const k of candidateKeys) {
      if (k in value) {
        const v = (value as any)[k];
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        if (typeof v === 'string') {
          const n = Number(v);
          if (Number.isFinite(n)) return n;
          return v;
        }
      }
    }
  }
  return null;
}

export default function ModuleManagementPage() {
  // Auth check happens via route protection
  useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  
  const [category, setCategory] = useState<'business' | 'pump'>('business');
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  
  // Drawer state for Super Admins
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(true);
  const [adminsSearchQuery, setAdminsSearchQuery] = useState('');
  const [adminsFilter, setAdminsFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  
  // Add Super Admin modal state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [modulesRes, adminsRes] = await Promise.all([
          fetch('/api/enterprise-admin/master-modules', { credentials: 'include' }),
          fetch('/api/enterprise-admin/super-admins', { credentials: 'include' })
        ]);

        if (!modulesRes.ok) {
          throw new Error('Failed to fetch modules');
        }

        const modulesJson = await modulesRes.json();
        const modulesData = arr<Module>(modulesJson, 'modules');
        setModules(modulesData);

        if (adminsRes.ok) {
          const adminsJson = await adminsRes.json();
          const admins = arr<any>(adminsJson, 'superAdmins').map((a) => ({
            id: Number(a.id),
            name: a.username ?? a.name,
            email: a.email,
            role: a.role ?? 'SUPER_ADMIN',
            productType: a.productType,
            assignedModules: pickAssignedArray(a)
              .map((x: any) => normalizeAssigned(x))
              .filter((v: any) => v !== null),
          })) as SuperAdmin[];
          setSuperAdmins(admins);
        }

        // Select first module
        if (modulesData.length > 0 && !selectedModuleId) {
          setSelectedModuleId(modulesData[0].id);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter modules by category
  const filteredModules = useMemo(() => {
    let result = modules;

    // Filter by category
    if (category === 'pump') {
      result = result.filter(m => 
        (m.businessCategory ?? '').toLowerCase().includes('pump') || 
        m.productType === 'PUMP_ERP' ||
        (m.businessCategory ?? '').toLowerCase() === 'all' ||
        m.alwaysAccessible || m.is_always_accessible
      );
    } else {
      result = result.filter(m => 
        !((m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP') ||
        (m.businessCategory ?? '').toLowerCase() === 'all' ||
        m.alwaysAccessible || m.is_always_accessible
      );
    }

    // Filter by search
    if (moduleSearchQuery.trim()) {
      const q = moduleSearchQuery.toLowerCase();
      result = result.filter(m => 
        (m.display_name || m.name || '').toLowerCase().includes(q) ||
        (m.module_name || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [modules, category, moduleSearchQuery]);

  // Get selected module
  const selectedModule = useMemo(() => {
    return modules.find(m => m.id === selectedModuleId) || null;
  }, [modules, selectedModuleId]);

  // Get Super Admins with this module assigned
  const moduleAssignedAdmins = useMemo(() => {
    if (!selectedModuleId) return [];
    return superAdmins.filter(a => {
      const assigned = a.assignedModules || [];
      return assigned.some(v => {
        if (typeof v === 'number') return v === selectedModuleId;
        if (typeof v === 'string') {
          const n = Number(v);
          if (Number.isFinite(n)) return n === selectedModuleId;
          // Check by module name
          const mod = modules.find(m => m.id === selectedModuleId);
          if (mod) {
            const keyLc = String(v).toLowerCase();
            return (mod.module_name || '').toLowerCase() === keyLc || 
                   (mod.display_name || '').toLowerCase() === keyLc;
          }
        }
        return false;
      });
    });
  }, [selectedModuleId, superAdmins, modules]);

  // Get Super Admins NOT assigned to this module
  const unassignedAdmins = useMemo(() => {
    if (!selectedModuleId) return [];
    const assignedIds = new Set(moduleAssignedAdmins.map(a => a.id));
    return superAdmins.filter(a => !assignedIds.has(a.id));
  }, [selectedModuleId, superAdmins, moduleAssignedAdmins]);

  // Filter admins for drawer display
  const filteredAdminsForDrawer = useMemo(() => {
    let result = superAdmins;

    // Search filter
    if (adminsSearchQuery.trim()) {
      const q = adminsSearchQuery.toLowerCase();
      result = result.filter(a => 
        (a.name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q)
      );
    }

    // Assigned/unassigned filter
    if (adminsFilter === 'assigned') {
      result = result.filter(a => moduleAssignedAdmins.some(ma => ma.id === a.id));
    } else if (adminsFilter === 'unassigned') {
      result = result.filter(a => !moduleAssignedAdmins.some(ma => ma.id === a.id));
    }

    return result;
  }, [superAdmins, adminsSearchQuery, adminsFilter, moduleAssignedAdmins]);

  // Module stats
  const moduleStats = useMemo(() => {
    const total = modules.length;
    const business = modules.filter(m => 
      !((m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP')
    ).length;
    const pump = modules.filter(m => 
      (m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP'
    ).length;
    const alwaysAccessible = modules.filter(m => m.alwaysAccessible || m.is_always_accessible).length;
    
    return { total, business, pump, alwaysAccessible };
  }, [modules]);

  // Assign admin to current module
  const assignAdminToModule = async (adminId: number) => {
    if (!selectedModuleId) return;
    
    setAddingAdmin(true);
    try {
      const response = await fetch(`/api/enterprise-admin/super-admins/${adminId}/assign-module`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ moduleId: selectedModuleId }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign module');
      }

      // Update local state
      setSuperAdmins(prev => prev.map(admin => {
        if (admin.id === adminId) {
          return {
            ...admin,
            assignedModules: [...(admin.assignedModules || []), selectedModuleId],
          };
        }
        return admin;
      }));

      setShowAddAdminModal(false);
    } catch (err) {
      console.error('Error assigning module:', err);
      alert('Failed to assign module to admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] text-gray-900 dark:text-gray-100">
      {/* Scrollable top section with 4 columns */}
      <div className="flex-1 overflow-auto min-h-0 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 1. Category Selection */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>Category</span>
              <span className="text-xs font-normal text-gray-500">
                {category === 'business' ? 'Business ERP' : 'Pump'}
              </span>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setCategory('business')}
                className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition-all ${
                  category === 'business'
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-400 dark:ring-emerald-600"
                    : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">💼</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium ${category === 'business' ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>Business ERP</span>
                      {category === 'business' && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white flex-shrink-0">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {moduleStats.business} modules
                    </div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setCategory('pump')}
                className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition-all ${
                  category === 'pump'
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 ring-2 ring-orange-400 dark:ring-orange-600"
                    : "border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⛽</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium ${category === 'pump' ? 'text-orange-700 dark:text-orange-300' : ''}`}>Pump Management</span>
                      {category === 'pump' && (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white flex-shrink-0">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {moduleStats.pump} modules
                    </div>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Module Stats */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-[10px] font-medium text-gray-500 mb-2">Statistics</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Total Modules</span>
                  <span className="font-medium">{moduleStats.total}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Always Accessible</span>
                  <span className="font-medium text-blue-600">{moduleStats.alwaysAccessible}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Super Admins</span>
                  <span className="font-medium">{superAdmins.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Modules Column */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiPackage className="text-blue-600" />
                <span>Modules</span>
              </div>
              <span className="text-xs font-normal text-gray-500">{filteredModules.length}</span>
            </div>
            
            {/* Search */}
            <div className="relative mb-2">
              <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={moduleSearchQuery}
                onChange={(e) => setModuleSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            
            <div className="space-y-1 max-h-[480px] overflow-y-auto">
              {filteredModules.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">No modules found</div>
              ) : (
                filteredModules.map((m) => {
                  const isSelected = selectedModuleId === m.id;
                  const isAlwaysAccessible = m.alwaysAccessible || m.is_always_accessible;
                  const assignedCount = superAdmins.filter(a => 
                    (a.assignedModules || []).some(v => {
                      if (typeof v === 'number') return v === m.id;
                      const n = Number(v);
                      return Number.isFinite(n) ? n === m.id : false;
                    })
                  ).length;
                  const pageCount = m.pages?.length || 0;
                  
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedModuleId(m.id)}
                      className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-300 shadow-sm"
                          : isAlwaysAccessible
                          ? "border-green-300 bg-green-50/50 dark:bg-green-900/20 hover:bg-green-100/50"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected && <span className="text-blue-600 font-bold">✓</span>}
                          <span className={`truncate font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                            {m.display_name || m.name || m.module_name}
                          </span>
                          {isAlwaysAccessible && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-0.5">
                              <FiLock className="w-2.5 h-2.5" />
                              Always
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5" title="Pages">
                            <FiGrid className="w-3 h-3" />
                            {pageCount}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5" title="Assigned Super Admins">
                            <FiUsers className="w-3 h-3" />
                            {assignedCount}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Pages Column */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiGrid className="text-purple-600" />
                <span>Pages</span>
                {selectedModule && (
                  <span className="text-xs font-normal text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                    {selectedModule.display_name || selectedModule.name}
                  </span>
                )}
              </div>
              <span className="text-xs font-normal text-gray-500">
                {selectedModule?.pages?.length || 0}
              </span>
            </div>
            
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {!selectedModule ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Module to view its pages
                </div>
              ) : !selectedModule.pages || selectedModule.pages.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                  No pages defined for this module.
                </div>
              ) : (
                selectedModule.pages.map((page, idx) => (
                  <div
                    key={page.id || page.path || idx}
                    className="flex items-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <FiCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {page.name || page.id || page.path}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {page.path || page.id}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Assigned Super Admins Column */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiUsers className="text-emerald-600" />
                <span>Assigned Super Admins</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-gray-500">
                  {moduleAssignedAdmins.length}
                </span>
                {selectedModule && !selectedModule.alwaysAccessible && !selectedModule.is_always_accessible && (
                  <button
                    onClick={() => setShowAddAdminModal(true)}
                    className="p-1 rounded-md bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 text-emerald-600 dark:text-emerald-400 transition-colors"
                    title="Add Super Admin to this module"
                  >
                    <FiPlus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {!selectedModule ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Module to view assigned Super Admins
                </div>
              ) : selectedModule.alwaysAccessible || selectedModule.is_always_accessible ? (
                <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-300 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-1">
                    <FiLock className="w-3.5 h-3.5" />
                    <span className="font-medium">Always Accessible Module</span>
                  </div>
                  <p className="text-[10px] opacity-80">
                    This module is available to all Super Admins automatically. No assignment needed.
                  </p>
                </div>
              ) : moduleAssignedAdmins.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                  No Super Admins have been assigned this module.
                </div>
              ) : (
                moduleAssignedAdmins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center gap-2 p-2 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                  >
                    <FiCheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {admin.name || admin.email || `Admin #${admin.id}`}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {admin.email}
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {admin.role || 'SUPER_ADMIN'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Super Admins Overview - Static Bottom Section */}
      <div className="flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t-2 border-emerald-200 dark:border-emerald-800 rounded-t-xl shadow-lg">
        {/* Header Bar with Title and Stats - Fully clickable */}
        <div 
          className="flex items-center justify-between px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-100 dark:border-emerald-800 rounded-t-xl cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
          onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-600 rounded-lg">
              <FiUsers className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">All Super Admins Overview</span>
            <span className="text-xs text-gray-500">({superAdmins.length} admins)</span>
            
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-white/70 dark:bg-gray-800/70 rounded-lg p-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setAdminsFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  adminsFilter === 'all' ? 'bg-emerald-600 text-white shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAdminsFilter('assigned')}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  adminsFilter === 'assigned' ? 'bg-green-600 text-white shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Has Module ({moduleAssignedAdmins.length})
              </button>
              <button
                onClick={() => setAdminsFilter('unassigned')}
                className={`px-2.5 py-1 text-xs rounded-md transition ${
                  adminsFilter === 'unassigned' ? 'bg-red-600 text-white shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                No Module ({superAdmins.length - moduleAssignedAdmins.length})
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {/* Total modules assigned */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <FiPackage className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                {modules.length} modules
              </span>
            </div>
            {/* Expand/Collapse indicator */}
            <div className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform duration-300 ${
              isDrawerExpanded ? 'rotate-180' : ''
            }`}>
              <FiChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        {/* Always Visible: One Row of Super Admins */}
        <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
            {filteredAdminsForDrawer.slice(0, 9).map((admin) => {
              const isAssignedModule = selectedModuleId ? moduleAssignedAdmins.some(a => a.id === admin.id) : false;
              const assignedCount = (admin.assignedModules || []).length;
              
              return (
                <div
                  key={admin.id}
                  className={`relative p-2 rounded-lg border text-center cursor-default transition ${
                    isAssignedModule
                      ? 'border-green-300 bg-green-50 dark:bg-green-900/30 dark:border-green-700'
                      : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isAssignedModule && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </div>
                  )}
                  <div className="text-xs font-medium truncate text-gray-800 dark:text-gray-200">
                    {admin.name || 'Admin'}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {admin.email}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {assignedCount} modules
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible: More Super Admins */}
        {isDrawerExpanded && filteredAdminsForDrawer.length > 9 && (
          <div className="px-4 pb-3 bg-white/50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2 pt-3">
              {filteredAdminsForDrawer.slice(9).map((admin) => {
                const isAssignedModule = selectedModuleId ? moduleAssignedAdmins.some(a => a.id === admin.id) : false;
                const assignedCount = (admin.assignedModules || []).length;
                
                return (
                  <div
                    key={admin.id}
                    className={`relative p-2 rounded-lg border text-center cursor-default transition ${
                      isAssignedModule
                        ? 'border-green-300 bg-green-50 dark:bg-green-900/30 dark:border-green-700'
                        : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {isAssignedModule && (
                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-bold">
                        ✓
                      </div>
                    )}
                    <div className="text-xs font-medium truncate text-gray-800 dark:text-gray-200">
                      {admin.name || 'Admin'}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {admin.email}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {assignedCount} modules
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Super Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Add Super Admin
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Assign to: {selectedModule?.display_name || selectedModule?.module_name}
                </p>
              </div>
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-4">
              {unassignedAdmins.length === 0 ? (
                <div className="text-center py-8">
                  <FiUsers className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    All Super Admins are already assigned to this module.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedAdmins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {admin.name || 'Admin'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {admin.email}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {(admin.assignedModules || []).length} modules assigned
                        </div>
                      </div>
                      <button
                        onClick={() => assignAdminToModule(admin.id)}
                        disabled={addingAdmin}
                        className="ml-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 dark:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {addingAdmin ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
