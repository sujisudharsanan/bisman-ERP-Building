"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { FiPackage, FiGrid, FiUsers, FiCheckCircle, FiSearch, FiChevronUp, FiLock, FiPlus, FiX, FiExternalLink } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { isModuleProtected, getProtectedModuleMessage } from "@/common/config/protected-access";
import { getSidebarPageCount, getTotalPageCount, ModuleKey } from "@/common/config/page-mapping";

type ModulePage = {
  id: string;
  path: string;
  name?: string;
};

type Module = {
  id: number | string; // Can be numeric ID or string key like 'enterprise-admin'
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
  const [selectedModuleId, setSelectedModuleId] = useState<number | string | null>(null);
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');
  
  // Drawer state for Pages Preview
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(true);
  
  // Add Super Admin modal state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);
  
  // Selected Super Admin for detailed view
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  
  // Checked unassigned modules (for showing pages in overview)
  const [checkedUnassignedModules, setCheckedUnassignedModules] = useState<Set<number | string>>(new Set());
  
  // Assign mode state
  const [isAssignMode, setIsAssignMode] = useState(false);
  const [assigningModules, setAssigningModules] = useState(false);
  
  // Selected module for pages preview (from either assigned or unassigned)
  const [selectedPreviewModuleId, setSelectedPreviewModuleId] = useState<number | string | null>(null);

  // Toast notification state for protected module warnings
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'warning' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show toast message
  const showToast = useCallback((message: string, type: 'warning' | 'error' | 'info' = 'warning') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

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

  // Get selected admin for detailed view
  const selectedAdmin = useMemo(() => {
    return superAdmins.find(a => a.id === selectedAdminId) || null;
  }, [superAdmins, selectedAdminId]);

  // Get assigned modules for selected admin (includes protected modules that are always assigned)
  const selectedAdminAssignedModules = useMemo(() => {
    if (!selectedAdmin) return [];
    const assigned = selectedAdmin.assignedModules || [];
    const adminRole = selectedAdmin.role || 'SUPER_ADMIN';
    
    return modules.filter(m => {
      // Get the module key - backend sends module_name as the key (e.g. 'enterprise-admin')
      // id is the numeric database ID, so use module_name first
      const moduleKey = m.module_name || m.name || m.display_name || '';
      
      // Protected modules are always considered "assigned"
      if (isModuleProtected(moduleKey, adminRole)) {
        return true;
      }
      
      return assigned.some(v => {
        if (typeof v === 'number') return v === m.id;
        if (typeof v === 'string') {
          const n = Number(v);
          if (Number.isFinite(n)) return n === m.id;
          const keyLc = String(v).toLowerCase();
          // Check against module_name, name, and display_name
          return moduleKey.toLowerCase() === keyLc ||
                 (m.module_name || '').toLowerCase() === keyLc || 
                 (m.display_name || '').toLowerCase() === keyLc;
        }
        return false;
      });
    });
  }, [selectedAdmin, modules]);

  // Get unassigned modules for selected admin
  const selectedAdminUnassignedModules = useMemo(() => {
    if (!selectedAdmin) return [];
    const assignedIds = new Set(selectedAdminAssignedModules.map(m => m.id));
    return filteredModules.filter(m => !assignedIds.has(m.id));
  }, [selectedAdmin, selectedAdminAssignedModules, filteredModules]);

  // Get selected module for preview
  const selectedPreviewModule = useMemo(() => {
    if (!selectedPreviewModuleId) return null;
    return modules.find(m => m.id === selectedPreviewModuleId) || null;
  }, [selectedPreviewModuleId, modules]);

  // Get pages for the selected preview module
  const selectedModulePages = useMemo(() => {
    if (!selectedPreviewModule) return [];
    return (selectedPreviewModule.pages || []).map(p => ({ 
      ...p, 
      moduleName: selectedPreviewModule.display_name || selectedPreviewModule.module_name 
    }));
  }, [selectedPreviewModule]);

  // Toggle unassigned module checkbox
  const toggleUnassignedModule = (moduleId: number | string) => {
    setCheckedUnassignedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Assign checked modules to selected admin
  const assignModulesToAdmin = async () => {
    if (!selectedAdminId || checkedUnassignedModules.size === 0) return;
    
    setAssigningModules(true);
    try {
      // Assign each checked module
      const moduleIds = Array.from(checkedUnassignedModules);
      
      for (const moduleId of moduleIds) {
        const response = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/assign-module`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ moduleId }),
        });

        if (!response.ok) {
          console.error(`Failed to assign module ${moduleId}`);
        }
      }

      // Update local state - add modules to admin's assigned list
      setSuperAdmins(prev => prev.map(admin => {
        if (admin.id === selectedAdminId) {
          return {
            ...admin,
            assignedModules: [...(admin.assignedModules || []), ...moduleIds],
          };
        }
        return admin;
      }));

      // Clear checked modules and exit assign mode
      setCheckedUnassignedModules(new Set());
      setIsAssignMode(false);
    } catch (err) {
      console.error('Error assigning modules:', err);
    } finally {
      setAssigningModules(false);
    }
  };

  // Cancel assign mode
  const cancelAssignMode = () => {
    setCheckedUnassignedModules(new Set());
    setIsAssignMode(false);
  };

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

          {/* 2. Super Admins Column */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiUsers className="text-emerald-600" />
                <span>Super Admins</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-gray-500">
                  {superAdmins.length}
                </span>
              </div>
            </div>
            
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {superAdmins.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                  No Super Admins found.
                </div>
              ) : (
                superAdmins.map((admin) => {
                  const isSelected = selectedAdminId === admin.id;
                  const assignedCount = (admin.assignedModules || []).length;
                  
                  return (
                    <button
                      key={admin.id}
                      onClick={() => {
                        setSelectedAdminId(admin.id);
                        setCheckedUnassignedModules(new Set());
                      }}
                      className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-300 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected && <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          <div className="min-w-0">
                            <div className={`font-medium truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                              {admin.name || admin.email || `Admin #${admin.id}`}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {admin.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {assignedCount} modules
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Assigned Modules Column */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiPackage className="text-blue-600" />
                <span>Assigned Modules</span>
                {selectedAdmin && (
                  <span className="text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                    {selectedAdmin.name || selectedAdmin.email}
                  </span>
                )}
              </div>
              <span className="text-xs font-normal text-gray-500">
                {selectedAdmin ? selectedAdminAssignedModules.length : 0}
              </span>
            </div>
            
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {!selectedAdmin ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Super Admin to view assigned modules
                </div>
              ) : selectedAdminAssignedModules.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                  No modules assigned to this Super Admin.
                </div>
              ) : (
                selectedAdminAssignedModules.map((m) => {
                  const totalPages = m.pages?.length || 0;
                  const moduleKey = m.module_name || m.name || m.display_name || '';
                  // Get sidebar page count from unified mapping, fallback to total
                  const sidebarPages = getSidebarPageCount(moduleKey as ModuleKey) || totalPages;
                  const isAlwaysAccessible = m.alwaysAccessible || m.is_always_accessible;
                  const isSelected = selectedPreviewModuleId === m.id;
                  // Get the module key - backend sends module_name as key (e.g. 'enterprise-admin')
                  const adminRole = selectedAdmin?.role || 'SUPER_ADMIN';
                  const isProtected = isModuleProtected(moduleKey, adminRole);
                  
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedPreviewModuleId(isSelected ? null : m.id)}
                      className={`w-full text-left flex items-center gap-2 p-2 rounded-md border transition ${
                        isSelected
                          ? "border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-300 shadow-sm"
                          : isProtected
                          ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-400"
                          : isAlwaysAccessible
                          ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 hover:border-green-400"
                          : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-400"
                      }`}
                      title={isProtected ? `Core module for ${adminRole} - cannot be removed` : `${sidebarPages} sidebar / ${totalPages} total pages`}
                    >
                      {isProtected ? (
                        <FiLock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-purple-600' : 'text-amber-500'}`} />
                      ) : (
                        <FiCheckCircle className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-purple-600' : isAlwaysAccessible ? 'text-green-500' : 'text-blue-500'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate flex items-center gap-1 ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>
                          {m.display_name || m.name || m.module_name}
                          {isProtected && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 font-bold">
                              CORE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <FiGrid className="w-2.5 h-2.5" />
                          {sidebarPages !== totalPages ? `${sidebarPages} menu / ${totalPages} total` : `${totalPages} pages`}
                          {isAlwaysAccessible && !isProtected && (
                            <span className="ml-1 text-green-600 dark:text-green-400 flex items-center gap-0.5">
                              <FiLock className="w-2.5 h-2.5" />
                              Always
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Unassigned Modules Column */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiPackage className="text-orange-600" />
                <span>Unassigned Modules</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-gray-500">
                  {selectedAdmin ? selectedAdminUnassignedModules.length : 0}
                </span>
                {selectedAdmin && selectedAdminUnassignedModules.length > 0 && !isAssignMode && (
                  <button
                    onClick={() => setIsAssignMode(true)}
                    className="px-2 py-1 text-xs font-medium rounded-md bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-800/50 text-orange-700 dark:text-orange-300 transition-colors flex items-center gap-1"
                  >
                    <FiPlus className="w-3 h-3" />
                    Assign
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-1 max-h-[480px] overflow-y-auto">
              {!selectedAdmin ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Super Admin from the list to view unassigned modules
                </div>
              ) : selectedAdminUnassignedModules.length === 0 ? (
                <div className="text-xs text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-300 dark:border-green-700">
                  ✓ All modules are assigned to this Super Admin
                </div>
              ) : (
                selectedAdminUnassignedModules.map((m) => {
                  const isChecked = checkedUnassignedModules.has(m.id);
                  const totalPages = m.pages?.length || 0;
                  const moduleKey = m.module_name || m.name || m.display_name || '';
                  const sidebarPages = getSidebarPageCount(moduleKey as ModuleKey) || totalPages;
                  const isSelected = selectedPreviewModuleId === m.id;
                  
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-2 p-2 rounded-md border transition cursor-pointer ${
                        isAssignMode && isChecked
                          ? "border-orange-400 bg-orange-50 dark:bg-orange-900/30 ring-1 ring-orange-300"
                          : isSelected && !isAssignMode
                          ? "border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-300 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50/50"
                      }`}
                      onClick={() => {
                        if (isAssignMode) {
                          toggleUnassignedModule(m.id);
                        } else {
                          setSelectedPreviewModuleId(isSelected ? null : m.id);
                        }
                      }}
                      title={`${sidebarPages} sidebar / ${totalPages} total pages`}
                    >
                      {isAssignMode && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUnassignedModule(m.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate ${isSelected && !isAssignMode ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>
                          {m.display_name || m.name || m.module_name}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <FiGrid className="w-2.5 h-2.5" />
                          {sidebarPages !== totalPages ? `${sidebarPages} menu / ${totalPages} total` : `${totalPages} pages`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Assign Mode Actions */}
            {isAssignMode && selectedAdmin && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {checkedUnassignedModules.size > 0 && (
                  <div className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                    {checkedUnassignedModules.size} module(s) selected
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={assignModulesToAdmin}
                    disabled={checkedUnassignedModules.size === 0 || assigningModules}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                  >
                    {assigningModules ? (
                      <>Assigning...</>
                    ) : (
                      <>
                        <FiCheckCircle className="w-3 h-3" />
                        Confirm
                      </>
                    )}
                  </button>
                  <button
                    onClick={cancelAssignMode}
                    disabled={assigningModules}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pages Preview - Static Bottom Section */}
      <div className="flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t-2 border-purple-200 dark:border-purple-800 rounded-t-xl shadow-lg">
        {/* Header Bar */}
        <div 
          className="flex items-center justify-between px-4 py-2 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-100 dark:border-purple-800 rounded-t-xl cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-600 rounded-lg">
              <FiGrid className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">Pages Preview</span>
            {selectedPreviewModule && (
              <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                {selectedPreviewModule.display_name || selectedPreviewModule.module_name} • {selectedModulePages.length} pages
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Expand/Collapse indicator */}
            <div className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform duration-300 ${
              isDrawerExpanded ? 'rotate-180' : ''
            }`}>
              <FiChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        {/* Pages Content */}
        <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50">
          {!selectedPreviewModule ? (
            <div className="text-center py-6">
              <FiGrid className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click on a module in the Assigned or Unassigned Modules column to see its pages here
              </p>
            </div>
          ) : selectedModulePages.length === 0 ? (
            <div className="text-center py-6">
              <FiGrid className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No pages defined for this module
              </p>
            </div>
          ) : (
            <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 ${isDrawerExpanded ? 'max-h-48' : 'max-h-24'} overflow-y-auto transition-all`}>
              {selectedModulePages.map((page, idx) => (
                <Link
                  key={`${page.id}-${idx}`}
                  href={page.path || '#'}
                  className="p-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer group"
                >
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate mb-0.5 flex items-center justify-between">
                    <span>{page.moduleName}</span>
                    <FiExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                    {page.name || page.id || page.path}
                  </div>
                  <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                    {page.path || page.id}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
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

      {/* Toast Notification for Protected Modules */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg animate-slide-up flex items-start gap-3 ${
          toastMessage.type === 'warning' 
            ? 'bg-yellow-50 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/90 dark:border-yellow-700 dark:text-yellow-200'
            : toastMessage.type === 'error'
            ? 'bg-red-50 border border-red-300 text-red-800 dark:bg-red-900/90 dark:border-red-700 dark:text-red-200'
            : 'bg-blue-50 border border-blue-300 text-blue-800 dark:bg-blue-900/90 dark:border-blue-700 dark:text-blue-200'
        }`}>
          <FiLock className={`w-5 h-5 shrink-0 mt-0.5 ${
            toastMessage.type === 'warning' ? 'text-yellow-600' : toastMessage.type === 'error' ? 'text-red-600' : 'text-blue-600'
          }`} />
          <div className="flex-1">
            <p className="text-sm font-medium">Protected Module</p>
            <p className="text-xs mt-0.5">{toastMessage.message}</p>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-black/10 rounded"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
