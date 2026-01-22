"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { FiPackage, FiGrid, FiUsers, FiCheckCircle, FiSearch, FiChevronUp, FiLock, FiPlus, FiX, FiExternalLink, FiShield, FiFile, FiMinus, FiList } from "react-icons/fi";
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
  id: number | string;
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

type Role = {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  level?: number;
  is_active?: boolean;
  module_key?: string;
};

type SuperAdmin = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  productType?: string;
  assignedModules?: Array<number | string>;
  assignedRoles?: number[];
};

// Selection context type for bottom panel
type SelectionContext = 'module' | 'role' | 'page';

// Color scheme for each row type (synced top and bottom)
const ROW_COLORS = {
  module: {
    border: 'border-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    ring: 'ring-blue-300',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-600',
    light: 'bg-blue-50 dark:bg-blue-900/20',
    header: 'bg-blue-50 dark:bg-blue-900/30',
  },
  role: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    ring: 'ring-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-600',
    light: 'bg-emerald-50 dark:bg-emerald-900/20',
    header: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  page: {
    border: 'border-purple-500',
    bg: 'bg-purple-100 dark:bg-purple-900/40',
    ring: 'ring-purple-300',
    text: 'text-purple-700 dark:text-purple-300',
    icon: 'text-purple-600',
    light: 'bg-purple-50 dark:bg-purple-900/20',
    header: 'bg-purple-50 dark:bg-purple-900/30',
  },
};

function arr<T = unknown>(obj: unknown, key: string): T[] {
  if (!obj || typeof obj !== "object") return [];
  const v = (obj as Record<string, unknown>)[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

// Try to collect any assigned-modules array from a super admin object using several common keys
function pickAssignedArray(source: unknown): unknown[] {
  if (!source || typeof source !== 'object') return [];
  const candidates: unknown[][] = [];
  const keys = [
    'assignedModules', 'assigned_modules', 'modules', 'moduleIds', 'module_ids',
    'assigned_module_ids', 'assigned_module_keys', 'access', 'accessToModules', 'access_to_modules'
  ];
  for (const k of keys) {
    const v = (source as Record<string, unknown>)[k];
    if (Array.isArray(v)) candidates.push(v);
    if (v && typeof v === 'object') {
      const inner = (v as Record<string, unknown>).modules || (v as Record<string, unknown>).moduleIds || (v as Record<string, unknown>).module_ids;
      if (Array.isArray(inner)) candidates.push(inner);
    }
  }
  let best: unknown[] = [];
  for (const arrCand of candidates) {
    if (arrCand.length > best.length) best = arrCand;
  }
  return best;
}

// Normalize any "assigned module" value into an id (number) or a module key (string)
function normalizeAssigned(value: unknown): number | string | null {
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
      if (k in (value as object)) {
        const v = (value as Record<string, unknown>)[k];
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
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  
  // Selection states - Flow: Category → Super Admin → Module → Role → Page
  const [category, setCategory] = useState<'business' | 'pump' | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  
  // Track what the user last clicked for bottom panel context
  const [selectionContext, setSelectionContext] = useState<SelectionContext>('module');
  
  // Drawer state for bottom section
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(true);
  
  // Drawer states for roles and pages sections
  const [isRolesDrawerExpanded, setIsRolesDrawerExpanded] = useState(true);
  const [isPagesDrawerExpanded, setIsPagesDrawerExpanded] = useState(false);
  const [rolesFilter, setRolesFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string | null>(null);
  
  // Add Super Admin modal state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);
  
  // Checked items for assign mode (modules or roles)
  const [checkedItems, setCheckedItems] = useState<Set<number | string>>(new Set());
  
  // Assign mode state
  const [isAssignMode, setIsAssignMode] = useState(false);
  const [assigningItems, setAssigningItems] = useState(false);

  // Toast notification state for protected module warnings
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'warning' | 'error' | 'info' | 'success' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show toast message
  const showToast = useCallback((message: string, type: 'warning' | 'error' | 'info' | 'success' = 'warning') => {
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

        const [modulesRes, adminsRes, rolesRes] = await Promise.all([
          fetch('/api/enterprise-admin/master-modules', { credentials: 'include' }),
          fetch('/api/enterprise-admin/super-admins', { credentials: 'include' }),
          fetch('/api/reports/roles-users', { credentials: 'include' }).catch(() => ({ ok: false } as Response))
        ]);

        if (!modulesRes.ok) {
          throw new Error('Failed to fetch modules');
        }

        const modulesJson = await modulesRes.json();
        const modulesData = arr<Module>(modulesJson, 'modules');
        setModules(modulesData);

        if (adminsRes.ok) {
          const adminsJson = await adminsRes.json();
          const admins = arr<Record<string, unknown>>(adminsJson, 'superAdmins').map((a) => ({
            id: Number(a.id),
            name: (a.username as string) ?? (a.name as string),
            email: a.email as string,
            role: (a.role as string) ?? 'SUPER_ADMIN',
            productType: a.productType as string,
            assignedModules: pickAssignedArray(a)
              .map((x: unknown) => normalizeAssigned(x))
              .filter((v): v is number | string => v !== null),
            assignedRoles: Array.isArray(a.assignedRoles) ? (a.assignedRoles as number[]) : [],
          })) as SuperAdmin[];
          setSuperAdmins(admins);
        }

        // Fetch roles
        if (rolesRes.ok) {
          const rolesJson = await rolesRes.json();
          // API returns { success, summary, data: [...] } - data array contains role objects
          const rolesArray = rolesJson.data || rolesJson.roles || [];
          const rolesData = (Array.isArray(rolesArray) ? rolesArray : []).map((r: any) => ({
            id: Number(r.roleId || r.id),
            name: String(r.roleName || r.name || ''),
            display_name: String(r.roleDisplayName || r.display_name || r.roleName || r.name || ''),
            description: r.roleDescription || r.description,
            level: r.roleLevel || r.level,
            is_active: r.is_active !== false,
            module_key: r.module_key,
          })) as Role[];
          console.log('[ModuleManagement] Loaded roles:', rolesData.length, rolesData.slice(0, 3));
          setAllRoles(rolesData);
        } else {
          console.warn('[ModuleManagement] Failed to fetch roles:', rolesRes.status);
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
    if (!category) return [];
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

    return result;
  }, [modules, category]);

  // Filter Super Admins by category
  const filteredSuperAdmins = useMemo(() => {
    if (!category) return [];
    return superAdmins.filter(admin => {
      const adminProductType = (admin.productType || '').toLowerCase();
      if (category === 'pump') {
        return adminProductType.includes('pump') || adminProductType === 'pump_erp';
      } else {
        // Business ERP - exclude pump-only admins, include all others
        return !adminProductType.includes('pump') || adminProductType === '' || adminProductType === 'business_erp' || adminProductType === 'all';
      }
    });
  }, [superAdmins, category]);

  // Get Super Admin counts per category
  const superAdminCounts = useMemo(() => {
    const business = superAdmins.filter(admin => {
      const pt = (admin.productType || '').toLowerCase();
      return !pt.includes('pump') || pt === '' || pt === 'business_erp' || pt === 'all';
    }).length;
    const pump = superAdmins.filter(admin => {
      const pt = (admin.productType || '').toLowerCase();
      return pt.includes('pump') || pt === 'pump_erp';
    }).length;
    return { business, pump };
  }, [superAdmins]);

  // Get selected module
  const selectedModule = useMemo(() => {
    return modules.find(m => m.id === selectedModuleId) || null;
  }, [modules, selectedModuleId]);

  // Get selected admin for detailed view
  const selectedAdmin = useMemo(() => {
    return superAdmins.find(a => a.id === selectedAdminId) || null;
  }, [superAdmins, selectedAdminId]);

  // Get assigned modules for selected admin (includes protected modules)
  const selectedAdminAssignedModules = useMemo(() => {
    if (!selectedAdmin) return [];
    const assigned = selectedAdmin.assignedModules || [];
    const adminRole = selectedAdmin.role || 'SUPER_ADMIN';
    
    return filteredModules.filter(m => {
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
          return moduleKey.toLowerCase() === keyLc ||
                 (m.module_name || '').toLowerCase() === keyLc || 
                 (m.display_name || '').toLowerCase() === keyLc;
        }
        return false;
      });
    });
  }, [selectedAdmin, filteredModules]);

  // Get unassigned modules for selected admin
  const selectedAdminUnassignedModules = useMemo(() => {
    if (!selectedAdmin) return [];
    const assignedIds = new Set(selectedAdminAssignedModules.map(m => m.id));
    return filteredModules.filter(m => !assignedIds.has(m.id));
  }, [selectedAdmin, selectedAdminAssignedModules, filteredModules]);

  // Get all roles assigned to the selected Super Admin
  const rolesForSelectedAdmin = useMemo(() => {
    if (!selectedAdmin) return [];
    const assignedRoleIds = new Set(selectedAdmin.assignedRoles || []);
    
    // If admin has specific assigned roles, filter by those
    if (assignedRoleIds.size > 0) {
      return allRoles.filter(r => assignedRoleIds.has(r.id));
    }
    
    // Otherwise, show ALL roles (roles are general, not module-specific)
    return allRoles;
  }, [selectedAdmin, allRoles]);

  // Get roles for selected module (for now, show all roles since roles are not module-specific)
  const rolesForSelectedModule = useMemo(() => {
    // Just return all roles for the admin - roles are not filtered by module
    return rolesForSelectedAdmin;
  }, [rolesForSelectedAdmin]);

  // Get pages for selected role
  const pagesForSelectedRole = useMemo(() => {
    if (!selectedModule) return [];
    // Return module pages - in a real implementation, filter by role permissions
    return selectedModule.pages || [];
  }, [selectedModule]);

  // Get selected role
  const selectedRole = useMemo(() => {
    return allRoles.find(r => r.id === selectedRoleId) || null;
  }, [allRoles, selectedRoleId]);

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

  // Get all pages grouped by module for the Pages Overview section
  const allPagesGroupedByModule = useMemo(() => {
    const grouped: { module: Module; pages: ModulePage[] }[] = [];
    for (const m of modules) {
      if (m.pages && m.pages.length > 0) {
        grouped.push({ module: m, pages: m.pages });
      }
    }
    return grouped;
  }, [modules]);

  // Filtered pages based on selected module filter
  const filteredPagesForOverview = useMemo(() => {
    if (!selectedModuleFilter) return allPagesGroupedByModule;
    return allPagesGroupedByModule.filter(g => 
      g.module.id === selectedModuleFilter || 
      g.module.module_name === selectedModuleFilter
    );
  }, [allPagesGroupedByModule, selectedModuleFilter]);

  // Total pages count
  const totalPagesCount = useMemo(() => {
    return allPagesGroupedByModule.reduce((sum, g) => sum + g.pages.length, 0);
  }, [allPagesGroupedByModule]);

  // Assigned role IDs for selected admin
  const assignedRoleIdsForAdmin = useMemo(() => {
    if (!selectedAdmin) return [];
    return selectedAdmin.assignedRoles || [];
  }, [selectedAdmin]);

  // Get context-aware unassigned items for bottom panel
  const unassignedItems = useMemo(() => {
    if (selectionContext === 'module') {
      return selectedAdminUnassignedModules;
    } else if (selectionContext === 'role') {
      // Unassigned roles for selected module
      if (!selectedAdmin || !selectedModule) return [];
      const assignedRoleIds = new Set(selectedAdmin.assignedRoles || []);
      return rolesForSelectedModule.filter(r => !assignedRoleIds.has(r.id));
    } else {
      // Unassigned pages for selected role
      return pagesForSelectedRole;
    }
  }, [selectionContext, selectedAdminUnassignedModules, selectedAdmin, selectedModule, rolesForSelectedModule, pagesForSelectedRole]);

  // Toggle item checkbox
  const toggleCheckedItem = (itemId: number | string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Assign checked items
  const assignCheckedItems = async () => {
    if (!selectedAdminId || checkedItems.size === 0) return;
    
    setAssigningItems(true);
    try {
      const itemIds = Array.from(checkedItems);
      
      if (selectionContext === 'module') {
        // Assign modules
        for (const moduleId of itemIds) {
          await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/assign-module`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ moduleId }),
          });
        }
        
        // Update local state
        setSuperAdmins(prev => prev.map(admin => {
          if (admin.id === selectedAdminId) {
            return {
              ...admin,
              assignedModules: [...(admin.assignedModules || []), ...itemIds],
            };
          }
          return admin;
        }));
      } else if (selectionContext === 'role') {
        // Assign roles (would need backend endpoint)
        for (const roleId of itemIds) {
          await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/assign-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ roleId }),
          });
        }
        
        setSuperAdmins(prev => prev.map(admin => {
          if (admin.id === selectedAdminId) {
            return {
              ...admin,
              assignedRoles: [...(admin.assignedRoles || []), ...(itemIds.filter(id => typeof id === 'number') as number[])],
            };
          }
          return admin;
        }));
      }

      // Clear checked items and exit assign mode
      setCheckedItems(new Set());
      setIsAssignMode(false);
    } catch (err) {
      console.error('Error assigning items:', err);
    } finally {
      setAssigningItems(false);
    }
  };

  // Cancel assign mode
  const cancelAssignMode = () => {
    setCheckedItems(new Set());
    setIsAssignMode(false);
  };

  // Get Super Admins NOT assigned to selected module
  const unassignedAdmins = useMemo(() => {
    if (!selectedModuleId) return [];
    return superAdmins.filter(a => {
      const assigned = a.assignedModules || [];
      return !assigned.some(v => {
        if (typeof v === 'number') return v === selectedModuleId;
        if (typeof v === 'string') {
          const n = Number(v);
          if (Number.isFinite(n)) return n === selectedModuleId;
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
      showToast('Failed to assign module to admin', 'error');
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* 1. Category & Super Admin (Merged Column) */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            {/* Category Section */}
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>Category</span>
              <span className="text-xs font-normal text-gray-500">
                {category === 'business' ? 'Business ERP' : category === 'pump' ? 'Pump' : 'Select'}
              </span>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setCategory('business');
                  setSelectedAdminId(null);
                  setSelectedModuleId(null);
                  setSelectedRoleId(null);
                  setSelectedPageId(null);
                }}
                className={`w-full text-left rounded-md border px-3 py-2 text-xs transition-all ${
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
                      {superAdminCounts.business} super admins
                    </div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  setCategory('pump');
                  setSelectedAdminId(null);
                  setSelectedModuleId(null);
                  setSelectedRoleId(null);
                  setSelectedPageId(null);
                }}
                className={`w-full text-left rounded-md border px-3 py-2 text-xs transition-all ${
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
                      {superAdminCounts.pump} super admins
                    </div>
                  </div>
                </div>
              </button>
            </div>
            
            {/* Super Admin Section (below Category in same card) - Only show after category is selected */}
            {category && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiUsers className="text-emerald-600" />
                  <span>Super Admin</span>
                </div>
                <span className="text-xs font-normal text-gray-500">
                  {filteredSuperAdmins.length}
                </span>
              </div>
              
              <div className="space-y-1 max-h-[280px] overflow-y-auto">
                {filteredSuperAdmins.length === 0 ? (
                  <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                    No Super Admins for this category.
                  </div>
                ) : (
                  filteredSuperAdmins.map((admin) => {
                    const isSelected = selectedAdminId === admin.id;
                    const assignedCount = (admin.assignedModules || []).length;
                    
                    return (
                      <button
                        key={admin.id}
                        onClick={() => {
                          setSelectedAdminId(admin.id);
                          setSelectedModuleId(null);
                          setSelectedRoleId(null);
                          setSelectedPageId(null);
                          setCheckedItems(new Set());
                          setSelectionContext('module');
                        }}
                        className={`w-full text-left rounded-md border px-3 py-2 text-xs transition ${
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
            )}
          </div>

          {/* 2. Modules Column */}
          <div className={`rounded-lg border p-3 ${selectionContext === 'module' ? ROW_COLORS.module.header : 'bg-white/40 dark:bg-gray-900/30'}`}>
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiPackage className={ROW_COLORS.module.icon} />
                <span>Modules</span>
                {selectedAdmin && (
                  <span className="text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded truncate max-w-[80px]">
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
                  ⚠️ Select a Super Admin
                </div>
              ) : selectedAdminAssignedModules.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                  No modules assigned.
                </div>
              ) : (
                selectedAdminAssignedModules.map((m) => {
                  const totalPages = m.pages?.length || 0;
                  const moduleKey = m.module_name || m.name || m.display_name || '';
                  const sidebarPages = getSidebarPageCount(moduleKey as ModuleKey) || totalPages;
                  const isSelected = selectedModuleId === m.id;
                  const adminRole = selectedAdmin?.role || 'SUPER_ADMIN';
                  const isProtected = isModuleProtected(moduleKey, adminRole);
                  
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModuleId(isSelected ? null : m.id);
                        setSelectedRoleId(null);
                        setSelectedPageId(null);
                        setSelectionContext('module');
                      }}
                      className={`w-full text-left flex items-center gap-2 p-2 rounded-md border transition ${
                        isSelected
                          ? `${ROW_COLORS.module.border} ${ROW_COLORS.module.bg} ring-2 ${ROW_COLORS.module.ring} shadow-sm`
                          : isProtected
                          ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-400"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                      title={isProtected ? `Core module for ${adminRole}` : `${sidebarPages} pages`}
                    >
                      {isProtected ? (
                        <FiLock className={`w-3.5 h-3.5 shrink-0 ${isSelected ? ROW_COLORS.module.icon : 'text-amber-500'}`} />
                      ) : (
                        <FiCheckCircle className={`w-3.5 h-3.5 shrink-0 ${isSelected ? ROW_COLORS.module.icon : 'text-gray-400'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate flex items-center gap-1 ${isSelected ? ROW_COLORS.module.text : ''}`}>
                          {m.display_name || m.name || m.module_name}
                          {isProtected && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 font-bold">
                              CORE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {sidebarPages} pages
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Roles Column */}
          <div className={`rounded-lg border p-3 ${selectionContext === 'role' ? ROW_COLORS.role.header : 'bg-white/40 dark:bg-gray-900/30'}`}>
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiShield className={ROW_COLORS.role.icon} />
                <span>Roles</span>
                {selectedAdmin && (
                  <span className="text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                    {selectedAdmin.name || selectedAdmin.email}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {selectedModule && (
                  <span className="text-[9px] font-normal text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded">
                    {selectedModule.display_name || selectedModule.module_name}
                  </span>
                )}
                <span className="text-xs font-normal text-gray-500">
                  {selectedModule ? rolesForSelectedModule.length : rolesForSelectedAdmin.length}
                </span>
              </div>
            </div>
            
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {!selectedAdmin ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Super Admin
                </div>
              ) : (selectedModule ? rolesForSelectedModule : rolesForSelectedAdmin).length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                  {selectedModule ? 'No roles for this module.' : 'No roles assigned to this admin.'}
                </div>
              ) : (
                (selectedModule ? rolesForSelectedModule : rolesForSelectedAdmin).map((r) => {
                  const isSelected = selectedRoleId === r.id;
                  
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRoleId(isSelected ? null : r.id);
                        setSelectedPageId(null);
                        setSelectionContext('role');
                      }}
                      className={`w-full text-left flex items-center gap-2 p-2 rounded-md border transition ${
                        isSelected
                          ? `${ROW_COLORS.role.border} ${ROW_COLORS.role.bg} ring-2 ${ROW_COLORS.role.ring} shadow-sm`
                          : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                      }`}
                    >
                      <FiShield className={`w-3.5 h-3.5 shrink-0 ${isSelected ? ROW_COLORS.role.icon : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate ${isSelected ? ROW_COLORS.role.text : ''}`}>
                          {r.display_name || r.name}
                        </div>
                        {r.module_key && (
                          <div className="text-[9px] text-blue-500 dark:text-blue-400 truncate">
                            {r.module_key}
                          </div>
                        )}
                        {r.description && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {r.description}
                          </div>
                        )}
                      </div>
                      {r.level && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          L{r.level}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Pages Column */}
          <div className={`rounded-lg border p-3 ${selectionContext === 'page' ? ROW_COLORS.page.header : 'bg-white/40 dark:bg-gray-900/30'}`}>
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiFile className={ROW_COLORS.page.icon} />
                <span>Pages</span>
                {selectedRole && (
                  <span className="text-xs font-normal text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                    {selectedRole.display_name || selectedRole.name}
                  </span>
                )}
              </div>
              <span className="text-xs font-normal text-gray-500">
                {pagesForSelectedRole.length}
              </span>
            </div>
            
            <div className="space-y-1 max-h-[520px] overflow-y-auto">
              {!selectedRoleId ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Role
                </div>
              ) : pagesForSelectedRole.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                  No pages for this role.
                </div>
              ) : (
                pagesForSelectedRole.map((p, idx) => {
                  const isSelected = selectedPageId === p.id;
                  
                  return (
                    <Link
                      key={`${p.id}-${idx}`}
                      href={p.path || '#'}
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedPageId(isSelected ? null : p.id);
                        setSelectionContext('page');
                      }}
                      className={`w-full text-left flex items-center gap-2 p-2 rounded-md border transition block ${
                        isSelected
                          ? `${ROW_COLORS.page.border} ${ROW_COLORS.page.bg} ring-2 ${ROW_COLORS.page.ring} shadow-sm`
                          : "border-gray-200 dark:border-gray-700 hover:border-purple-300 hover:bg-purple-50/50"
                      }`}
                    >
                      <FiFile className={`w-3.5 h-3.5 shrink-0 ${isSelected ? ROW_COLORS.page.icon : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium truncate ${isSelected ? ROW_COLORS.page.text : ''}`}>
                          {p.name || p.id}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {p.path}
                        </div>
                      </div>
                      <FiExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Roles Overview - Static Bottom Section */}
      <div className="flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t-2 border-emerald-200 dark:border-emerald-800 rounded-t-xl shadow-lg">
        {/* Header Bar with Title, Filter, and Stats */}
        <div 
          className="flex items-center justify-between px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-100 dark:border-emerald-800 rounded-t-xl cursor-pointer"
          onClick={() => setIsRolesDrawerExpanded(!isRolesDrawerExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-emerald-600 rounded-lg">
              <FiShield className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">All Roles Overview</span>
            <span className="text-xs text-gray-500">({allRoles.length} roles)</span>
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setRolesFilter('all')}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  rolesFilter === 'all' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm font-medium' : 'text-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRolesFilter('assigned')}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  rolesFilter === 'assigned' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm font-medium' : 'text-gray-600'
                }`}
              >
                Assigned
              </button>
              <button
                onClick={() => setRolesFilter('unassigned')}
                className={`px-2 py-0.5 text-xs rounded transition ${
                  rolesFilter === 'unassigned' ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm font-medium' : 'text-gray-600'
                }`}
              >
                Unassigned
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats badges */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-green-700 dark:text-green-400">{assignedRoleIdsForAdmin.length}</span>
              </span>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span className="text-red-700 dark:text-red-400">{allRoles.length - assignedRoleIdsForAdmin.length}</span>
              </span>
            </div>
            {/* Expand/Collapse button */}
            <button 
              className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform duration-300 hover:bg-gray-50 ${
                isRolesDrawerExpanded ? 'rotate-180' : ''
              }`}
            >
              <FiChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Roles Grid */}
        {isRolesDrawerExpanded && (
          <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50">
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
              {allRoles
                .filter((role) => {
                  const isAssigned = assignedRoleIdsForAdmin.includes(role.id);
                  return rolesFilter === 'all' || 
                    (rolesFilter === 'assigned' && isAssigned) ||
                    (rolesFilter === 'unassigned' && !isAssigned);
                })
                .map((role) => {
                  const isSelected = selectedRoleId === role.id;
                  const isAssigned = assignedRoleIdsForAdmin.includes(role.id);
                  
                  return (
                    <button
                      key={role.id}
                      onClick={() => {
                        setSelectedRoleId(isSelected ? null : role.id);
                        setSelectionContext('role');
                      }}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-300 shadow-sm'
                          : isAssigned
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20 hover:border-green-400'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {isAssigned ? (
                          <FiCheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                        ) : (
                          <FiMinus className="w-3 h-3 text-red-400 shrink-0" />
                        )}
                        <span className={`text-xs font-medium truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                          {role.display_name || role.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                          {role.module_key || 'General'}
                        </span>
                        {role.level && (
                          <span className={`text-[9px] px-1 py-0.5 rounded ${
                            isAssigned ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            L{role.level}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* All Pages Overview - Static Bottom Section */}
      <div className="flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t-2 border-purple-200 dark:border-purple-800 shadow-lg">
        {/* Header Bar with Title, Module Filter, and Stats */}
        <div 
          className="flex items-center justify-between px-4 py-2 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-100 dark:border-purple-800 cursor-pointer"
          onClick={() => setIsPagesDrawerExpanded(!isPagesDrawerExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-600 rounded-lg">
              <FiFile className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">All Pages Overview</span>
            <span className="text-xs text-gray-500">({totalPagesCount} pages)</span>
            {/* Module filter dropdown */}
            <div onClick={(e) => e.stopPropagation()}>
              <select
                value={selectedModuleFilter || ''}
                onChange={(e) => setSelectedModuleFilter(e.target.value || null)}
                className="ml-2 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="">All Modules</option>
                {modules.filter(m => m.pages && m.pages.length > 0).map(m => (
                  <option key={m.id} value={String(m.id)}>
                    {m.display_name || m.module_name} ({m.pages?.length || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <FiPackage className="w-3 h-3 text-purple-600" />
                <span className="text-purple-700 dark:text-purple-400">{allPagesGroupedByModule.length} modules</span>
              </span>
            </div>
            {/* Expand/Collapse button */}
            <button 
              className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform duration-300 hover:bg-gray-50 ${
                isPagesDrawerExpanded ? 'rotate-180' : ''
              }`}
            >
              <FiChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Pages Grid grouped by Module */}
        {isPagesDrawerExpanded && (
          <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50 max-h-64 overflow-y-auto">
            {filteredPagesForOverview.length === 0 ? (
              <div className="text-center py-6">
                <FiFile className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No pages available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPagesForOverview.map(({ module: mod, pages }) => (
                  <div key={mod.id} className="space-y-2">
                    {/* Module header */}
                    <div className="flex items-center gap-2 pb-1 border-b border-purple-100 dark:border-purple-800">
                      <FiPackage className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {mod.display_name || mod.module_name}
                      </span>
                      <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        {pages.length} pages
                      </span>
                    </div>
                    {/* Pages grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                      {pages.map((page, idx) => (
                        <Link
                          key={`${page.id}-${idx}`}
                          href={page.path || '#'}
                          className="p-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <FiFile className="w-3 h-3 text-purple-500" />
                            <FiExternalLink className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                            {page.name || page.id}
                          </div>
                          <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                            {page.path}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg animate-slide-up flex items-start gap-3 ${
          toastMessage.type === 'warning' 
            ? 'bg-yellow-50 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/90 dark:border-yellow-700 dark:text-yellow-200'
            : toastMessage.type === 'error'
            ? 'bg-red-50 border border-red-300 text-red-800 dark:bg-red-900/90 dark:border-red-700 dark:text-red-200'
            : toastMessage.type === 'success'
            ? 'bg-green-50 border border-green-300 text-green-800 dark:bg-green-900/90 dark:border-green-700 dark:text-green-200'
            : 'bg-blue-50 border border-blue-300 text-blue-800 dark:bg-blue-900/90 dark:border-blue-700 dark:text-blue-200'
        }`}>
          <FiLock className={`w-5 h-5 shrink-0 mt-0.5 ${
            toastMessage.type === 'warning' ? 'text-yellow-600' : 
            toastMessage.type === 'error' ? 'text-red-600' : 
            toastMessage.type === 'success' ? 'text-green-600' :
            'text-blue-600'
          }`} />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {toastMessage.type === 'warning' ? 'Warning' : 
               toastMessage.type === 'error' ? 'Error' : 
               toastMessage.type === 'success' ? 'Success' : 'Info'}
            </p>
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
