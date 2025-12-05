"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { FiUsers, FiPackage, FiGrid, FiCheckCircle, FiUnlock, FiExternalLink, FiShield, FiPlus, FiX } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { usePageRefresh } from "@/contexts/RefreshContext";

type Module = {
  id: number | string;
  moduleKey: string;
  name: string;
  productType?: string;
  businessCategory?: string;
  alwaysAccessible?: boolean; // Modules accessible by all users (common, chat)
  pages?: Array<{ id: string; name?: string; path: string }>;
};

// Client type for SUPER_ADMIN managing their clients
type Client = {
  id: string;
  name: string;
  email?: string;
  client_code?: string;
  productType?: string;
  status?: string;
  is_active?: boolean;
};

type SuperAdmin = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  productType?: string;
  assignedModules?: Array<number | string>;
  pagePermissions?: Record<string, string[]>; // moduleId -> pageIds
  allowedRoles?: string[]; // Roles allowed for this Super Admin
};
type Registry = {
  pages?: Array<{ path: string; title?: string; module?: string; moduleKey?: string }>;
};

// Role type from roles-users API
type Role = {
  id: number;
  name: string;
  display_name?: string;
  description?: string;
  level?: number;
  is_active?: boolean;
  users?: Array<{ id: number; username: string; email: string }>;
  userCount?: number;
};

function arr<T = any>(obj: any, key: string): T[] {
  if (!obj || typeof obj !== "object") return [];
  const v = obj[key];
  return Array.isArray(v) ? (v as T[]) : [];
}

// Normalize page id/token; returns a canonical id without leading slash
function canonicalPageId(id: string): string {
  const s = String(id || "");
  return s.replace(/^\//, "");
}

// For compatibility, generate both forms (with and without leading slash)
function bothForms(id: string): [string, string] {
  const noSlash = canonicalPageId(id);
  const withSlash = noSlash ? `/${noSlash}` : noSlash;
  return [withSlash, noSlash];
}

// Normalize any "assigned module" value coming from API into an id (number) or a module key (string)
function normalizeAssigned(value: any): number | string | null {
  if (value == null) return null;
  // If it's already a primitive
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    return value; // keep string (will be lower-cased on comparison)
  }
  // If it's an object, try common fields
  if (typeof value === 'object') {
    const candidateKeys = [
      'id', 'moduleId', 'module_id',
      'moduleKey', 'module_key', 'module', 'module_name',
      'key', 'slug', 'name'
    ];
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
    // some backends: access: { modules: [...] }
    if (v && typeof v === 'object') {
      const inner = (v as any).modules || (v as any).moduleIds || (v as any).module_ids;
      if (Array.isArray(inner)) candidates.push(inner);
    }
  }
  // Prefer the longest plausible array
  let best: any[] = [];
  for (const arrCand of candidates) {
    if (arrCand.length > best.length) best = arrCand;
  }
  return best;
}

// Decide if a module is assigned to a given list of raw assigned values
function isModuleAssigned(m: Module, rawAssigned: any[]): boolean {
  if (!Array.isArray(rawAssigned)) return false;
  const id = Number(m.id);
  const keyLc = String(m.moduleKey || '').toLowerCase();
  const nameLc = String(m.name || '').toLowerCase();
  for (const v of rawAssigned) {
    const norm = normalizeAssigned(v);
    if (norm == null) continue;
    if (typeof norm === 'number') {
      if (Number.isFinite(id) && id === norm) return true;
    } else {
      const s = String(norm).toLowerCase();
      if (s === keyLc || s === nameLc) return true;
    }
  }
  return false;
}

export default function Page() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.toUpperCase() === 'SUPER_ADMIN' || user?.userType === 'SUPER_ADMIN';
  
  const [loading, setLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [clients, setClients] = useState<Client[]>([]); // Clients for SUPER_ADMIN
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]); // All available roles from API
  const [category, setCategory] = useState<string | null>("all"); // Default to show all modules
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null); // Selected client for SUPER_ADMIN
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null); // Selected role
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]); // Selected/allowed roles for Super Admin
  const [saving, setSaving] = useState(false);
  const [authHint, setAuthHint] = useState<string | null>(null);
  const [isAssignMode, setIsAssignMode] = useState(false); // Toggle for showing + icons on unassigned modules
  const [isRoleAssignMode, setIsRoleAssignMode] = useState(false); // Toggle for role assignment mode
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [bottomView, setBottomView] = useState<'roles' | 'modules'>('modules'); // What to show in bottom section
  const [assignedRoleIds, setAssignedRoleIds] = useState<number[]>([]); // Roles assigned to selected Super Admin
  
  // Create Super Admin modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    productType: 'BUSINESS_ERP' as 'BUSINESS_ERP' | 'PUMP_ERP'
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(''); // Track last saved state to avoid duplicate saves
  const isInitialLoadRef = useRef<boolean>(true); // Flag to skip auto-save on initial page selection
  const initialPageIdsRef = useRef<string[]>([]); // Track initial pages loaded for a module to detect changes
  const isRolesInitializedRef = useRef<boolean>(false); // Flag to prevent saving on initial load
  const rolesSaveTimerRef = useRef<NodeJS.Timeout | null>(null); // Debounce timer for role saves
  const lastLoadedAdminIdRef = useRef<number | null>(null); // Track which admin's roles we last loaded

  // Load role assignments when a Super Admin is selected
  useEffect(() => {
    if (!selectedAdminId) {
      setAssignedRoleIds([]);
      isRolesInitializedRef.current = false;
      lastLoadedAdminIdRef.current = null;
      return;
    }
    
    // Don't reload if we already loaded for this admin
    if (lastLoadedAdminIdRef.current === selectedAdminId) {
      return;
    }
    
    const loadRolesForAdmin = async () => {
      try {
        console.log('� Loading roles for Super Admin:', selectedAdminId);
        const response = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/roles`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok && Array.isArray(data.roleIds)) {
            setAssignedRoleIds(data.roleIds);
            console.log('✅ Loaded', data.roleIds.length, 'roles for Super Admin');
          } else {
            // No roles assigned yet - start with empty
            setAssignedRoleIds([]);
            console.log('📋 No roles assigned to Super Admin yet');
          }
        } else {
          console.warn('⚠️ Failed to load roles, starting with empty');
          setAssignedRoleIds([]);
        }
        
        lastLoadedAdminIdRef.current = selectedAdminId;
        isRolesInitializedRef.current = true;
      } catch (error) {
        console.error('❌ Error loading roles:', error);
        setAssignedRoleIds([]);
      }
    };
    
    loadRolesForAdmin();
  }, [selectedAdminId]);

  // Save assigned role IDs to database for the selected Super Admin (debounced)
  useEffect(() => {
    if (!selectedAdminId || !isRolesInitializedRef.current) {
      return;
    }
    
    // Clear existing timer
    if (rolesSaveTimerRef.current) {
      clearTimeout(rolesSaveTimerRef.current);
    }
    
    // Debounce save to database
    rolesSaveTimerRef.current = setTimeout(async () => {
      try {
        console.log('💾 Saving', assignedRoleIds.length, 'roles to Super Admin:', selectedAdminId);
        const response = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/assign-roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ roleIds: assignedRoleIds })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Roles saved to Super Admin:', data.message || 'Success');
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('❌ Failed to save roles to Super Admin:', response.status, errorText);
          // Show user-friendly error
          if (typeof window !== 'undefined') {
            alert(`Failed to save roles: ${response.status === 500 ? 'Server error - please check if database table exists' : errorText}`);
          }
        }
      } catch (error) {
        console.error('❌ Error saving roles:', error);
        if (typeof window !== 'undefined') {
          alert(`Error saving roles: ${error instanceof Error ? error.message : 'Network error'}`);
        }
      }
    }, 500); // 500ms debounce
    
    // Cleanup timer on unmount
    return () => {
      if (rolesSaveTimerRef.current) {
        clearTimeout(rolesSaveTimerRef.current);
      }
    };
  }, [assignedRoleIds, selectedAdminId]);

  // Compute whether there are unsaved changes by comparing current selection with initial state
  const hasChanges = useMemo(() => {
    if (!selectedAdminId || !selectedModuleId) return false;
    const sortedCurrent = [...selectedPageIds].sort();
    const sortedInitial = [...initialPageIdsRef.current].sort();
    if (sortedCurrent.length !== sortedInitial.length) return true;
    return sortedCurrent.some((id, i) => id !== sortedInitial[i]);
  }, [selectedPageIds, selectedAdminId, selectedModuleId]);

  // Auto-save function - saves page permissions to database
  const savePagePermissions = useCallback(async (adminId: number, moduleId: number, pageIds: string[]) => {
    // Sort for consistent comparison
    const sortedPageIds = [...pageIds].sort();
    const saveKey = `${adminId}-${moduleId}-${sortedPageIds.join(',')}`;
    
    // Skip if same as last save
    if (saveKey === lastSavedRef.current) {
      console.log('⏭️ Skip auto-save: no changes');
      return; // No changes to save
    }
    
    // Skip if this is the initial load (user just clicked on module)
    if (isInitialLoadRef.current) {
      console.log('⏭️ Skip auto-save: initial load');
      isInitialLoadRef.current = false;
      lastSavedRef.current = saveKey;
      return;
    }
    
    console.log('💾 Auto-saving page permissions:', { adminId, moduleId, pageCount: pageIds.length });
    setAutoSaveStatus('saving');
    
    try {
      const response = await fetch(`/api/enterprise-admin/super-admins/${adminId}/assign-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          moduleId, 
          pageIds,
          pages: pageIds,
          pageIdsNormalized: pageIds.map(canonicalPageId),
        }),
      });
      
      if (response.ok) {
        lastSavedRef.current = saveKey;
        initialPageIdsRef.current = [...pageIds]; // Update initial state after auto-save
        setAutoSaveStatus('saved');
        console.log('✅ Auto-save successful');
        
        // Update local state to reflect saved permissions
        setSuperAdmins(prev => prev.map(admin => {
          if (admin.id === adminId) {
            return {
              ...admin,
              pagePermissions: {
                ...admin.pagePermissions,
                [String(moduleId)]: pageIds
              }
            };
          }
          return admin;
        }));
        
        // Reset status after 2 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } else {
        console.error('❌ Auto-save failed:', response.status);
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('❌ Auto-save error:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, []);

  // Auto-save effect - debounced save when selectedPageIds changes
  useEffect(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Only auto-save if we have admin and module selected
    if (!selectedAdminId || !selectedModuleId) return;
    
    // Debounce: wait 800ms after last change before saving
    autoSaveTimerRef.current = setTimeout(() => {
      savePagePermissions(selectedAdminId, selectedModuleId, selectedPageIds);
    }, 800);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [selectedPageIds, selectedAdminId, selectedModuleId, savePagePermissions]);

  useEffect(() => {
    const load = async (isRefresh = false) => {
      if (isRefresh) {
        setIsDataRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        // Load different data based on user role
        const [modsRes, usersRes, regRes, rolesRes, clientsRes] = await Promise.all([
          fetch("/api/enterprise-admin/master-modules", { credentials: "include" }),
          fetch("/api/enterprise-admin/super-admins", { credentials: "include" }),
          fetch("/layout_registry.json").catch(() => new Response("{}")),
          fetch("/api/reports/roles-users", { credentials: "include" }).catch(() => new Response("{}")),
          // Load clients for SUPER_ADMIN
          fetch("/api/system/clients", { credentials: "include" }).catch(() => new Response("{}")),
        ]);
        const modsJson = await modsRes.json().catch(() => ({}));
        const rolesJson = await rolesRes.json().catch(() => ({}));
        
        // Load clients for SUPER_ADMIN
        const clientsJson = await clientsRes.json().catch(() => ({}));
        if (clientsJson.success && Array.isArray(clientsJson.data)) {
          const clientsList = clientsJson.data.map((c: any) => ({
            id: c.id,
            name: c.name || c.legal_name || c.trade_name || 'Unnamed Client',
            email: c.email,
            client_code: c.client_code,
            productType: c.productType,
            status: c.status,
            is_active: c.is_active !== false,
          })) as Client[];
          console.log('📋 Loaded clients:', clientsList.length);
          setClients(clientsList);
        }
        
        let usersJson: any = {};
        if (usersRes.ok) {
          usersJson = await usersRes.json().catch(() => ({}));
        } else {
          // Fallback to enterprise route (less strict) to keep UI functional in dev
          const alt = await fetch("/api/enterprise/super-admins", { credentials: "include" });
          if (alt.ok) {
            usersJson = await alt.json().catch(() => ({}));
            setAuthHint('Super Admins loaded via fallback. For strict mode, ensure your role is ENTERPRISE_ADMIN.');
          } else if (usersRes.status === 403 || usersRes.status === 401) {
            // Don't show error hint for SUPER_ADMIN - they manage clients, not super admins
            if (!isSuperAdmin) {
              setAuthHint('Access to Super Admins is forbidden. Ensure you are logged in as ENTERPRISE_ADMIN.');
            }
          }
        }
  const registryData = await regRes.json().catch(() => ({}));

        // Parse roles data - API returns { success, summary, data: [...] }
        // The data array contains role objects with users
        const rolesArray = rolesJson.data || rolesJson.roles || [];
        const rolesData = (Array.isArray(rolesArray) ? rolesArray : []).map((r: any) => ({
          id: Number(r.roleId || r.id),
          name: String(r.roleName || r.name || ''),
          display_name: String(r.roleDisplayName || r.display_name || r.roleName || r.name || ''),
          description: r.roleDescription || r.description,
          level: r.roleLevel || r.level,
          is_active: r.roleStatus === 'active' || r.is_active !== false,
          users: Array.isArray(r.users) ? r.users : [],
          userCount: r.userCount || (Array.isArray(r.users) ? r.users.length : 0),
        })) as Role[];
        console.log('📋 Loaded roles:', rolesData.length, rolesData);
        setAllRoles(rolesData);
        
        // Note: Role assignments are now loaded per Super Admin when one is selected
        // See the useEffect with selectedAdminId dependency

        let mods = arr<any>(modsJson, "modules").map((m) => ({
          id: Number.isFinite(Number(m.id)) ? Number(m.id) : String(m.id ?? m.module_name ?? ""),
          moduleKey: String(m.module_name ?? m.id ?? ""),
          name: String(m.display_name ?? m.name ?? m.module_name ?? ""),
          productType: m.productType,
          businessCategory: m.businessCategory,
          alwaysAccessible: m.alwaysAccessible || m.is_always_accessible || false,
          pages: Array.isArray(m.pages) ? m.pages : [],
        })) as Module[];

        const admins = arr<any>(usersJson, "superAdmins").map((a) => {
          // Build page permissions map if backend provided it (various shapes supported)
          const pagePerms: Record<string, string[]> = (() => {
            if (a.pagePermissions && typeof a.pagePermissions === 'object') {
              // Ensure all keys are strings and values are string arrays
              const normalized: Record<string, string[]> = {};
              Object.entries(a.pagePermissions).forEach(([key, value]) => {
                normalized[String(key)] = Array.isArray(value) ? value.map(String) : [];
              });
              console.log('📦 Loaded pagePermissions from API:', normalized);
              return normalized;
            }
            const perms: Record<string, string[]> = {};
            const assigned = Array.isArray(a.assignedModules) ? a.assignedModules : (Array.isArray(a.moduleAssignments) ? a.moduleAssignments : []);
            assigned.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const midRaw = item.module_id ?? item.moduleId ?? item.id ?? item.module?.id;
                const pages = item.assigned_pages ?? item.page_permissions ?? item.pages;
                if (midRaw != null && Array.isArray(pages)) {
                  const mid = String(Number.isFinite(Number(midRaw)) ? Number(midRaw) : midRaw);
                  perms[mid] = pages.map((p: any) => String(p));
                }
              }
            });
            return perms;
          })();

          return {
            id: Number(a.id),
            name: a.username ?? a.name,
            email: a.email,
            role: a.role ?? "SUPER_ADMIN",
            productType: a.productType,
            assignedModules: pickAssignedArray(a)
              .map((x: any) => normalizeAssigned(x))
              .filter((v: any) => v !== null),
            pagePermissions: pagePerms,
          } as SuperAdmin;
        }) as SuperAdmin[];

        setModules(mods);
        setSuperAdmins(admins);
        setRegistry(registryData);
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
        setIsDataRefreshing(false);
      }
    };
    load();
  }, []);

  // Register with global refresh context
  usePageRefresh('modules', () => {
    const refreshLoad = async () => {
      setIsDataRefreshing(true);
      setError(null);
      try {
        const [modsRes, usersRes] = await Promise.all([
          fetch("/api/enterprise-admin/master-modules", { credentials: "include" }),
          fetch("/api/enterprise-admin/super-admins", { credentials: "include" }),
        ]);
        const modsJson = await modsRes.json().catch(() => ({}));
        const usersJson = await usersRes.json().catch(() => ({}));
        // Update state as needed
      } finally {
        setIsDataRefreshing(false);
      }
    };
    refreshLoad();
  });

  const categoryCounts = useMemo(() => {
    const list = Array.isArray(modules) ? modules : [];
    const isPump = (m: Module) =>
      (m.businessCategory ?? "").toLowerCase().includes("pump") || m.productType === "PUMP_ERP";
    // Modules with businessCategory 'All' or alwaysAccessible should appear in BOTH categories
    const isSharedModule = (m: Module) =>
      (m.businessCategory ?? "").toLowerCase() === "all" || m.alwaysAccessible === true;
    
    const sharedCount = list.filter(isSharedModule).length;
    const businessOnly = list.filter((m) => !isSharedModule(m) && !isPump(m)).length;
    const pumpOnly = list.filter((m) => !isSharedModule(m) && isPump(m)).length;
    
    return {
      // Total modules visible in each category (including shared)
      business: businessOnly + sharedCount,
      pump: pumpOnly + sharedCount,
      // For reference: unique counts
      businessOnly,
      pumpOnly,
      shared: sharedCount,
    };
  }, [modules]);

  const modulesById = useMemo(() => {
    const map = new Map<number, Module>();
    modules.forEach((m) => {
      const n = Number(m.id);
      if (Number.isFinite(n)) map.set(n, m);
    });
    return map;
  }, [modules]);

  const modulesByKey = useMemo(() => {
    const map = new Map<string, Module>();
    modules.forEach((m) => {
      const key = String(m.moduleKey || '').toLowerCase();
      if (key) map.set(key, m);
    });
    return map;
  }, [modules]);

  const selectedAdmin = useMemo(() => {
    const admin = superAdmins.find((a) => a.id === selectedAdminId);
    if (admin) {
      console.log('👤 Selected Admin:', {
        id: admin.id,
        name: admin.name,
        assignedModules: admin.assignedModules,
        assignedModulesCount: admin.assignedModules?.length || 0,
        pagePermissions: admin.pagePermissions,
        pagePermissionsKeys: admin.pagePermissions ? Object.keys(admin.pagePermissions) : [],
        allowedRoles: admin.allowedRoles
      });
    }
    return admin;
  }, [superAdmins, selectedAdminId]);

  // Roles allowed for the selected Super Admin
  // Enterprise Admin sees ALL roles; Super Admin sees roles they're allowed to manage
  const rolesForSelectedAdmin = useMemo(() => {
    // Enterprise Admin always sees all roles
    return allRoles;
  }, [allRoles]);

  // Get the selected role object
  const selectedRole = useMemo(() => {
    return allRoles.find(r => r.id === selectedRoleId) || null;
  }, [allRoles, selectedRoleId]);

  const filteredAdmins = useMemo(() => {
    const list = Array.isArray(superAdmins) ? superAdmins : [];
    if (!category) return list;
    return list.filter((s) => {
      if (!s.productType) return true;
      const isPump = s.productType === "PUMP_ERP" || s.productType?.toLowerCase().includes("pump");
      return category === "pump" ? isPump : !isPump;
    });
  }, [superAdmins, category]);

  const filteredModules = useMemo(() => {
    const list = Array.isArray(modules) ? modules : [];
    // Show all modules regardless of category
    if (category === "all" || !category) {
      // If admin selected, show assigned modules first (green), then unassigned (red) at bottom
      if (selectedAdminId && selectedAdmin) {
        const assignedMods = selectedAdmin.assignedModules || [];
        const idSet = new Set<number>();
        const keySet = new Set<string>();
        assignedMods.forEach((v) => {
          const n = Number(v);
          if (Number.isFinite(n)) idSet.add(n);
          if (v != null) keySet.add(String(v).toLowerCase());
        });
        const isAssigned = (m: Module) => idSet.has(Number(m.id)) || keySet.has(String(m.moduleKey || '').toLowerCase());
        const assigned = list.filter(isAssigned);
        const unassigned = list.filter((m) => !isAssigned(m));
        return [...assigned, ...unassigned];
      }
      return list;
    }
    const isPump = (m: Module) =>
      (m.businessCategory ?? "").toLowerCase().includes("pump") || m.productType === "PUMP_ERP";
    // Modules with businessCategory 'All' or alwaysAccessible should appear in BOTH categories
    const isSharedModule = (m: Module) =>
      (m.businessCategory ?? "").toLowerCase() === "all" || m.alwaysAccessible === true;
    const categoryFiltered = list.filter((m) => isSharedModule(m) || (category === "pump" ? isPump(m) : !isPump(m)));
    
    // If admin selected, show assigned modules first (green), then unassigned (red) at bottom
    if (selectedAdminId && selectedAdmin) {
      const assignedMods = selectedAdmin.assignedModules || [];
      const idSet = new Set<number>();
      const keySet = new Set<string>();
      assignedMods.forEach((v) => {
        const n = Number(v);
        if (Number.isFinite(n)) idSet.add(n);
        if (v != null) keySet.add(String(v).toLowerCase());
      });
      const isAssigned = (m: Module) => idSet.has(Number(m.id)) || keySet.has(String(m.moduleKey || '').toLowerCase());
      const assigned = categoryFiltered.filter(isAssigned);
      const unassigned = categoryFiltered.filter((m) => !isAssigned(m));
      return [...assigned, ...unassigned];
    }
    
    return categoryFiltered;
  }, [modules, category, selectedAdminId, selectedAdmin]);

  // Modules that the selected role has access to (based on role-module mapping)
  // For now, we'll show all modules but can be enhanced with actual role-module permissions
  const modulesForSelectedRole = useMemo(() => {
    if (!selectedRoleId) return [];
    // Return all modules for now - can be enhanced with actual role-module mapping from backend
    return filteredModules;
  }, [selectedRoleId, filteredModules]);

  // Assigned count within the filtered (visible) modules
  const assignedInCategory = useMemo(() => {
  if (!selectedAdmin || !Array.isArray(filteredModules)) return 0;
  const raw = selectedAdmin.assignedModules || [];
  return filteredModules.reduce((cnt, m) => cnt + (isModuleAssigned(m, raw) ? 1 : 0), 0);
  }, [filteredModules, selectedAdmin]);

  // Split visible modules into assigned/unassigned groups for rendering
  const moduleGroups = useMemo(() => {
    const result = { assigned: [] as Module[], unassigned: [] as Module[] };
    if (!Array.isArray(filteredModules)) return result;
    if (!selectedAdmin) {
      // No admin selected: treat all as unassigned for grouping (but we hide the list until admin is chosen)
      result.unassigned = filteredModules;
      return result;
    }
    const assignedMods = selectedAdmin.assignedModules || [];
    const idSet = new Set<number>();
    const keySet = new Set<string>();
    
    // assignedModules is already normalized to numbers/strings during parsing
    assignedMods.forEach((v) => {
      if (typeof v === 'number') {
        idSet.add(v);
      } else if (typeof v === 'string') {
        const n = Number(v);
        if (Number.isFinite(n)) {
          idSet.add(n);
        } else {
          keySet.add(v.toLowerCase());
        }
      } else if (v && typeof v === 'object') {
        // Fallback: handle objects if not normalized
        const normalized = normalizeAssigned(v);
        if (typeof normalized === 'number') {
          idSet.add(normalized);
        } else if (typeof normalized === 'string') {
          keySet.add(normalized.toLowerCase());
        }
      }
    });
    
    filteredModules.forEach((m) => {
      const moduleId = Number(m.id);
      const isExplicitlyAssigned = idSet.has(moduleId) || keySet.has(String(m.moduleKey || '').toLowerCase()) || keySet.has(String(m.name || '').toLowerCase());
      // Always accessible modules (common, chat) should be treated as "assigned"
      const isAlwaysAccessible = m.alwaysAccessible || m.moduleKey === 'common' || m.moduleKey === 'chat';
      const isAssigned = isExplicitlyAssigned || isAlwaysAccessible;
      
      (isAssigned ? result.assigned : result.unassigned).push(m);
    });
    
    return result;
  }, [filteredModules, selectedAdmin]);

  // Count assigned modules for the current user (if pump admin)
  const assignedModulesCount = useMemo(() => {
    if (!selectedAdmin) return 0;
    return selectedAdmin.assignedModules?.length || 0;
  }, [selectedAdmin]);

  const pagesForSelectedModule = useMemo(() => {
    if (!selectedModuleId) return [] as { id: string; title?: string; path: string; isAssigned?: boolean }[];
    const mod = modulesById.get(selectedModuleId);
    const isAlwaysAccessibleModule = mod?.alwaysAccessible || mod?.moduleKey === 'common' || mod?.moduleKey === 'chat';
    const fromModule = (mod?.pages ?? []).map((p) => ({ 
      id: canonicalPageId(p.id ?? p.path), 
      title: p.name, 
      path: p.path,
      isAssigned: false // Will be determined below
    }));
    
    let pages = fromModule.length ? fromModule : [];
    
    // Fallback to registry heuristic if module config has no pages
    if (!pages.length && registry && selectedModuleKey) {
      const regPages = Array.isArray(registry.pages) ? registry.pages : [];
      const matched = regPages.filter((p) => {
        const mk = (p as any).moduleKey || (p as any).module;
        if (mk && typeof mk === "string") return mk.toLowerCase().includes(selectedModuleKey.toLowerCase());
        return p.path?.toLowerCase().includes(selectedModuleKey.toLowerCase());
      });
  pages = matched.map((p) => ({ id: canonicalPageId(p.path), title: p.title, path: p.path, isAssigned: false }));
    }
    
    // If admin is selected, mark pages as assigned based on pagePermissions
    if (selectedAdmin && selectedModuleId) {
      const modKey = String(selectedModuleId);
      const moduleKey = mod?.moduleKey || '';
      // Check by both numeric id and module key string
      const assignedForModule = selectedAdmin.pagePermissions?.[modKey] 
        || selectedAdmin.pagePermissions?.[moduleKey] 
        || [];
      
      // Debug logging
      console.log('📋 Page Permissions Debug:', {
        selectedModuleId,
        modKey,
        moduleKey,
        isAlwaysAccessibleModule,
        allPagePermissions: selectedAdmin.pagePermissions,
        assignedForModule,
        pageCount: pages.length
      });
      
      const assignedSet = new Set<string>();
      (assignedForModule || []).forEach((x) => {
        const [withSlash, noSlash] = bothForms(String(x));
        if (withSlash) assignedSet.add(withSlash);
        if (noSlash) assignedSet.add(noSlash);
      });
      
      console.log('📋 Assigned Set:', Array.from(assignedSet));
      
      pages = pages.map((p) => {
        const [withSlash, noSlash] = bothForms(String(p.id));
        const isAssigned = assignedSet.has(withSlash) || assignedSet.has(noSlash);
        // Removed: Don't auto-mark all pages as assigned for always accessible modules
        // Users must explicitly select pages
        console.log('📋 Page check:', p.id, '→', isAssigned, 'forms:', [withSlash, noSlash]);
        return { ...p, isAssigned };
      });

      // Sort: assigned pages first, then unassigned
      const assigned = pages.filter(p => p.isAssigned);
      const unassigned = pages.filter(p => !p.isAssigned);
      return [...assigned, ...unassigned];
    }
    
    return pages;
  }, [modulesById, registry, selectedModuleId, selectedModuleKey, selectedAdmin]);

  // Helper to check if module is shared (available in both ERP and Pump)
  const isSharedModule = (m: Module) =>
    (m.businessCategory ?? "").toLowerCase() === "all" || m.alwaysAccessible === true;

  // Derived counts - count UNIQUE assigned modules across admins, resolve by id OR moduleKey
  const assignedBusinessCount = (() => {
    const unique = new Set<string>();
    superAdmins.forEach((sa) => {
      (sa.assignedModules || []).forEach((mid) => {
        let m: Module | undefined;
        const n = Number(mid);
        if (Number.isFinite(n)) m = modulesById.get(n);
        if (!m && mid != null) m = modulesByKey.get(String(mid).toLowerCase());
        if (m) {
          const isPump = (m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP';
          // Include shared modules in business count
          if (isSharedModule(m) || !isPump) unique.add(String(m.moduleKey || '').toLowerCase());
        }
      });
    });
    return unique.size;
  })();

  const assignedPumpCount = (() => {
    const unique = new Set<string>();
    superAdmins.forEach((sa) => {
      (sa.assignedModules || []).forEach((mid) => {
        let m: Module | undefined;
        const n = Number(mid);
        if (Number.isFinite(n)) m = modulesById.get(n);
        if (!m && mid != null) m = modulesByKey.get(String(mid).toLowerCase());
        if (m) {
          const isPump = (m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP';
          // Include shared modules in pump count
          if (isSharedModule(m) || isPump) unique.add(String(m.moduleKey || '').toLowerCase());
        }
      });
    });
    return unique.size;
  })();

  // Top-row assigned counters: if a Super Admin is selected, show THEIR assigned counts.
  // Otherwise, fall back to the global assigned counters across all super admins.
  const topAssigned = useMemo(() => {
    const list = Array.isArray(modules) ? modules : [];
    const isPump = (m: Module) => (m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP';
    if (selectedAdmin) {
      const raw = selectedAdmin.assignedModules || [];
      // Include shared modules in both counts
      const business = list.filter(m => (isSharedModule(m) || !isPump(m)) && isModuleAssigned(m, raw)).length;
      const pump = list.filter(m => (isSharedModule(m) || isPump(m)) && isModuleAssigned(m, raw)).length;
      return { business, pump };
    }
    return { business: assignedBusinessCount, pump: assignedPumpCount };
  }, [modules, selectedAdmin, assignedBusinessCount, assignedPumpCount]);

  const togglePage = (id: string) => {
    console.log('🔄 Toggle page:', id, 'Current selection:', selectedPageIds);
    setSelectedPageIds((prev) => {
      const newSelection = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      console.log('✅ New selection:', newSelection);
      return newSelection;
    });
  };
  const toggleAllPages = () => {
    const all = pagesForSelectedModule.map((p) => p.id);
    const allSelected = selectedPageIds.length === all.length;
    console.log('🔄 Toggle all pages:', allSelected ? 'Deselect' : 'Select', 'Count:', all.length);
    setSelectedPageIds(allSelected ? [] : all);
  };

  const assignPages = async () => {
    // Require admin, module, and at least one selected page for assignment
    console.log('🚀 Assign Pages called:', {
      selectedAdminId,
      selectedModuleId,
      selectedPageIdsCount: selectedPageIds.length,
      selectedPageIds: selectedPageIds
    });
    
    if (!selectedAdminId || !selectedModuleId || selectedPageIds.length === 0) {
      console.warn('⚠️ Cannot assign: Missing requirements', {
        hasAdmin: !!selectedAdminId,
        hasModule: !!selectedModuleId,
        hasPages: selectedPageIds.length > 0
      });
      return;
    }
    
    try {
      setSaving(true);
      console.log('📤 Sending assign request...');
      const resAssign = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/assign-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // Send both pageIds and pages for maximum backend compatibility
        body: JSON.stringify({ 
          moduleId: selectedModuleId, 
          pageIds: selectedPageIds,
          pages: selectedPageIds,
          // Also send normalized without leading slash
          pageIdsNormalized: selectedPageIds.map(canonicalPageId),
        }),
      });
      if (!resAssign.ok) {
        const text = await resAssign.text().catch(() => '');
        console.error('❌ Assign failed', resAssign.status, text);
        if (typeof window !== 'undefined') alert(`Assign failed: ${resAssign.status}`);
        return;
      }
      
      console.log('✅ Assign successful!');
      
      // Update initialPageIdsRef to reflect saved state (for hasChanges detection)
      initialPageIdsRef.current = [...selectedPageIds];
      
      // Refresh super admins data after assignment to update green/red indicators
        const usersRes = await fetch("/api/enterprise-admin/super-admins", { credentials: "include" });
      if (usersRes.ok) {
        const usersJson = await usersRes.json().catch(() => ({}));
        const admins = arr<any>(usersJson, "superAdmins").map((a) => {
          const pagePerms: Record<string, string[]> = (() => {
            if (a.pagePermissions && typeof a.pagePermissions === 'object') return a.pagePermissions as Record<string, string[]>;
            const perms: Record<string, string[]> = {};
            const assigned = Array.isArray(a.assignedModules) ? a.assignedModules : (Array.isArray(a.moduleAssignments) ? a.moduleAssignments : []);
            assigned.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const midRaw = item.module_id ?? item.moduleId ?? item.id ?? item.module?.id;
                const pages = item.assigned_pages ?? item.page_permissions ?? item.pages;
                if (midRaw != null && Array.isArray(pages)) {
                  const mid = String(Number.isFinite(Number(midRaw)) ? Number(midRaw) : midRaw);
                  perms[mid] = pages.map((p: any) => String(p));
                }
              }
            });
            return perms;
          })();

          return {
            id: Number(a.id),
            name: a.username ?? a.name,
            email: a.email,
            role: a.role ?? "SUPER_ADMIN",
            productType: a.productType,
            assignedModules: pickAssignedArray(a)
              .map((x: any) => normalizeAssigned(x))
              .filter((v: any) => v !== null),
            pagePermissions: pagePerms,
          } as SuperAdmin;
        }) as SuperAdmin[];
        setSuperAdmins(admins);
      }
    } finally {
      setSaving(false);
    }
  };

  const unassignPages = async () => {
    if (!selectedAdminId || !selectedModuleId) return;
    try {
      setSaving(true);
      const resUnassign = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/unassign-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // Send both pageIds and pages for maximum backend compatibility
        body: JSON.stringify({ 
          moduleId: selectedModuleId, 
          pageIds: selectedPageIds,
          pages: selectedPageIds,
          pageIdsNormalized: selectedPageIds.map(canonicalPageId),
        }),
      });
      if (!resUnassign.ok) {
        const text = await resUnassign.text().catch(() => '');
        console.error('Unassign failed', resUnassign.status, text);
        if (typeof window !== 'undefined') alert(`Unassign failed: ${resUnassign.status}`);
        return;
      }

      // Refresh super admins data after unassignment
      const usersRes = await fetch("/api/enterprise-admin/super-admins", { credentials: "include" });
      if (usersRes.ok) {
        const usersJson = await usersRes.json().catch(() => ({}));
        const admins = arr<any>(usersJson, "superAdmins").map((a) => ({
          id: Number(a.id),
          name: a.username ?? a.name,
          email: a.email,
          role: a.role ?? "SUPER_ADMIN",
          productType: a.productType,
          assignedModules: pickAssignedArray(a)
            .map((x: any) => normalizeAssigned(x))
            .filter((v: any) => v !== null),
        })) as SuperAdmin[];
        setSuperAdmins(admins);
      }
    } finally {
      setSaving(false);
    }
  };

  // Quick assign a module (assigns all pages by default)
  const quickAssignModule = async (moduleToAssign: Module) => {
    if (!selectedAdminId) return;
    
    const moduleId = Number.isFinite(Number(moduleToAssign.id)) ? Number(moduleToAssign.id) : null;
    if (!moduleId) return;
    
    // Get all page IDs for this module
    const allPageIds = (moduleToAssign.pages || []).map(p => canonicalPageId(p.id ?? p.path));
    
    try {
      setSaving(true);
      const resAssign = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/assign-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          moduleId: moduleId, 
          pageIds: allPageIds,
          pages: allPageIds,
          pageIdsNormalized: allPageIds,
        }),
      });
      
      if (!resAssign.ok) {
        const text = await resAssign.text().catch(() => '');
        console.error('❌ Quick assign failed', resAssign.status, text);
        return;
      }
      
      console.log('✅ Quick assign successful for', moduleToAssign.name);
      
      // Refresh super admins data
      const usersRes = await fetch("/api/enterprise-admin/super-admins", { credentials: "include" });
      if (usersRes.ok) {
        const usersJson = await usersRes.json().catch(() => ({}));
        const admins = arr<any>(usersJson, "superAdmins").map((a) => {
          const pagePerms: Record<string, string[]> = (() => {
            if (a.pagePermissions && typeof a.pagePermissions === 'object') return a.pagePermissions as Record<string, string[]>;
            const perms: Record<string, string[]> = {};
            const assigned = Array.isArray(a.assignedModules) ? a.assignedModules : (Array.isArray(a.moduleAssignments) ? a.moduleAssignments : []);
            assigned.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const midRaw = item.module_id ?? item.moduleId ?? item.id ?? item.module?.id;
                const pages = item.assigned_pages ?? item.page_permissions ?? item.pages;
                if (midRaw != null && Array.isArray(pages)) {
                  const mid = String(Number.isFinite(Number(midRaw)) ? Number(midRaw) : midRaw);
                  perms[mid] = pages.map((p: any) => String(p));
                }
              }
            });
            return perms;
          })();

          return {
            id: Number(a.id),
            name: a.username ?? a.name,
            email: a.email,
            role: a.role ?? "SUPER_ADMIN",
            productType: a.productType,
            assignedModules: pickAssignedArray(a)
              .map((x: any) => normalizeAssigned(x))
              .filter((v: any) => v !== null),
            pagePermissions: pagePerms,
          } as SuperAdmin;
        }) as SuperAdmin[];
        setSuperAdmins(admins);
      }
    } finally {
      setSaving(false);
    }
  };

  // Quick unassign a module (removes all pages)
  const quickUnassignModule = async (moduleToUnassign: Module) => {
    if (!selectedAdminId) return;
    
    const moduleId = Number.isFinite(Number(moduleToUnassign.id)) ? Number(moduleToUnassign.id) : null;
    if (!moduleId) return;
    
    // Get all page IDs for this module to unassign
    const allPageIds = (moduleToUnassign.pages || []).map(p => canonicalPageId(p.id ?? p.path));
    
    try {
      setSaving(true);
      const resUnassign = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/unassign-module`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          moduleId: moduleId, 
          pageIds: allPageIds,
          pages: allPageIds,
          pageIdsNormalized: allPageIds,
        }),
      });
      
      if (!resUnassign.ok) {
        const text = await resUnassign.text().catch(() => '');
        console.error('❌ Quick unassign failed', resUnassign.status, text);
        return;
      }
      
      console.log('✅ Quick unassign successful for', moduleToUnassign.name);
      
      // Refresh super admins data
      const usersRes = await fetch("/api/enterprise-admin/super-admins", { credentials: "include" });
      if (usersRes.ok) {
        const usersJson = await usersRes.json().catch(() => ({}));
        const admins = arr<any>(usersJson, "superAdmins").map((a) => {
          const pagePerms: Record<string, string[]> = (() => {
            if (a.pagePermissions && typeof a.pagePermissions === 'object') return a.pagePermissions as Record<string, string[]>;
            const perms: Record<string, string[]> = {};
            const assigned = Array.isArray(a.assignedModules) ? a.assignedModules : (Array.isArray(a.moduleAssignments) ? a.moduleAssignments : []);
            assigned.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const midRaw = item.module_id ?? item.moduleId ?? item.id ?? item.module?.id;
                const pages = item.assigned_pages ?? item.page_permissions ?? item.pages;
                if (midRaw != null && Array.isArray(pages)) {
                  const mid = String(Number.isFinite(Number(midRaw)) ? Number(midRaw) : midRaw);
                  perms[mid] = pages.map((p: any) => String(p));
                }
              }
            });
            return perms;
          })();

          return {
            id: Number(a.id),
            name: a.username ?? a.name,
            email: a.email,
            role: a.role ?? "SUPER_ADMIN",
            productType: a.productType,
            assignedModules: pickAssignedArray(a)
              .map((x: any) => normalizeAssigned(x))
              .filter((v: any) => v !== null),
            pagePermissions: pagePerms,
          } as SuperAdmin;
        }) as SuperAdmin[];
        setSuperAdmins(admins);
      }
    } finally {
      setSaving(false);
    }
  };

  // Create Super Admin function
  const handleCreateSuperAdmin = async () => {
    setCreateError(null);
    
    // Validate form
    if (!createForm.username.trim()) {
      setCreateError('Username is required');
      return;
    }
    if (!createForm.email.trim()) {
      setCreateError('Email is required');
      return;
    }
    if (!createForm.email.includes('@')) {
      setCreateError('Please enter a valid email address');
      return;
    }
    if (!createForm.password) {
      setCreateError('Password is required');
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters');
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Passwords do not match');
      return;
    }
    
    try {
      setIsCreating(true);
      const response = await fetch('/api/enterprise-admin/super-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: createForm.username.trim(),
          email: createForm.email.trim().toLowerCase(),
          password: createForm.password,
          productType: createForm.productType
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setCreateError(result.message || 'Failed to create Super Admin');
        return;
      }
      
      console.log('✅ Super Admin created:', result);
      
      // Refresh the super admins list
      const usersRes = await fetch("/api/enterprise-admin/super-admins", { credentials: "include" });
      if (usersRes.ok) {
        const usersJson = await usersRes.json().catch(() => ({}));
        const admins = arr<any>(usersJson, "superAdmins").map((a) => {
          const pagePerms: Record<string, string[]> = (() => {
            if (a.pagePermissions && typeof a.pagePermissions === 'object') return a.pagePermissions as Record<string, string[]>;
            const perms: Record<string, string[]> = {};
            const assigned = Array.isArray(a.assignedModules) ? a.assignedModules : (Array.isArray(a.moduleAssignments) ? a.moduleAssignments : []);
            assigned.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const midRaw = item.module_id ?? item.moduleId ?? item.id ?? item.module?.id;
                const pages = item.assigned_pages ?? item.page_permissions ?? item.pages;
                if (midRaw != null && Array.isArray(pages)) {
                  const mid = String(Number.isFinite(Number(midRaw)) ? Number(midRaw) : midRaw);
                  perms[mid] = pages.map((p: any) => String(p));
                }
              }
            });
            return perms;
          })();

          return {
            id: Number(a.id),
            name: a.username ?? a.name,
            email: a.email,
            role: a.role ?? "SUPER_ADMIN",
            productType: a.productType,
            assignedModules: pickAssignedArray(a)
              .map((x: any) => normalizeAssigned(x))
              .filter((v: any) => v !== null),
            pagePermissions: pagePerms,
          } as SuperAdmin;
        }) as SuperAdmin[];
        setSuperAdmins(admins);
      }
      
      // Reset form and close modal
      setCreateForm({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        productType: 'BUSINESS_ERP'
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating Super Admin:', error);
      setCreateError('An error occurred while creating Super Admin');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] text-gray-900 dark:text-gray-100">
      {authHint && (
        <div className="rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 text-xs mb-4">
          {authHint}
        </div>
      )}

      {/* Scrollable top section with 4 columns */}
      <div className="flex-1 overflow-auto min-h-0 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 1. Category Selection */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="text-sm font-semibold mb-2 flex items-center justify-between">
            <span>Category</span>
            <span className="text-xs font-normal text-gray-500">
              {category === 'business' ? 'Business ERP' : category === 'pump' ? 'Pump' : 'Select'}
            </span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setCategory('business')}
              className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                category === 'business'
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">💼</span>
                <div>
                  <div className="font-medium">Business ERP</div>
                  <div className="text-[10px] text-gray-500">
                    {modules.filter(m => 
                      !((m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP') ||
                      (m.businessCategory ?? '').toLowerCase() === 'all' || m.alwaysAccessible
                    ).length} modules
                  </div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setCategory('pump')}
              className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                category === 'pump'
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 ring-2 ring-orange-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">⛽</span>
                <div>
                  <div className="font-medium">Pump Management</div>
                  <div className="text-[10px] text-gray-500">
                    {modules.filter(m => 
                      ((m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP') ||
                      (m.businessCategory ?? '').toLowerCase() === 'all' || m.alwaysAccessible
                    ).length} modules
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Users column - Clients for SUPER_ADMIN, Super Admins for ENTERPRISE_ADMIN */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="text-sm font-semibold mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{isSuperAdmin ? 'Clients' : 'Super Admins'}</span>
              {!isSuperAdmin && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1 rounded-md bg-green-500 hover:bg-green-600 text-white transition"
                  title="Create Super Admin"
                >
                  <FiPlus className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-xs font-normal text-gray-500">
              {isSuperAdmin ? clients.length : superAdmins.length}
            </span>
          </div>
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {isSuperAdmin ? (
              /* Show Clients for SUPER_ADMIN */
              <>
                {clients.length === 0 && (
                  <div className="text-xs text-gray-500">No Clients found</div>
                )}
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClientId(c.id)}
                    className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                      selectedClientId === c.id
                        ? "border-blue-500 bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-300 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                    title={c.email || c.client_code}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {selectedClientId === c.id && <span className="text-blue-600 font-bold">✓</span>}
                        <span className={`truncate font-medium ${selectedClientId === c.id ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                          {c.name}
                        </span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        c.is_active 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                      }`}>
                        {c.status || (c.is_active ? 'Active' : 'Inactive')}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            ) : (
              /* Show Super Admins for ENTERPRISE_ADMIN */
              <>
                {filteredAdmins.length === 0 && (
                  <div className="text-xs text-gray-500">No Super Admins</div>
                )}
                {filteredAdmins.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAdminId(a.id)}
                    className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                      selectedAdminId === a.id
                        ? "border-blue-500 bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-300 shadow-sm"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50"
                    }`}
                    title={a.email}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {selectedAdminId === a.id && <span className="text-blue-600 font-bold">✓</span>}
                        <span className={`truncate font-medium ${selectedAdminId === a.id ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                          {a.name || a.email || String(a.id)}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {a.role || "SUPER_ADMIN"}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 3. Roles - Only show allocated/assigned roles */}
        <div 
          onClick={() => setBottomView('roles')}
          className={`rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3 cursor-pointer transition hover:border-purple-400 hover:shadow-md ${
            bottomView === 'roles' ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800' : ''
          }`}
        >
          <div className="text-sm font-semibold mb-2 flex items-center justify-between">
            <div className={`flex items-center gap-2 ${bottomView === 'roles' ? 'text-purple-600' : ''}`}>
              <FiShield className="text-purple-600" />
              Roles
              <span className="text-xs font-normal text-gray-500">{assignedRoleIds.length}</span>
              {bottomView === 'roles' && <span className="text-[10px] text-purple-500">▼</span>}
            </div>
          </div>
          <div className="space-y-1 max-h-[520px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Top section always shows only assigned/allocated roles */}
            {(() => {
              if (!selectedAdminId) {
                return (
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                    ⚠️ Select a Super Admin to view/manage their roles
                  </div>
                );
              }
              
              const rolesToShow = rolesForSelectedAdmin.filter(r => assignedRoleIds.includes(r.id));
              
              if (rolesToShow.length === 0) {
                return (
                  <div className="text-xs text-gray-500 text-center py-4">
                    No roles allocated. Click below to manage roles.
                  </div>
                );
              }
              
              return rolesToShow.map((role) => {
                const isSelected = selectedRoleId === role.id;
                const userCount = role.userCount || role.users?.length || 0;
                
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                      isSelected
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-300 shadow-sm"
                        : "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                    }`}
                    title={role.description || role.name}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">●</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓</span>
                        )}
                        <span className={`truncate font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : ''}`}>
                          {role.display_name || role.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <FiUsers className="w-3 h-3" />
                          {userCount}
                        </span>
                        {role.level && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            role.level <= 2 
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : role.level <= 4
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            L{role.level}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* 4. Modules - Show assigned modules for selected Super Admin */}
        <div 
          onClick={() => setBottomView('modules')}
          className={`rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3 cursor-pointer transition hover:border-emerald-400 hover:shadow-md ${
            bottomView === 'modules' ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800' : ''
          }`}
        >
          <div className="text-sm font-semibold mb-2 flex items-center justify-between">
            <div className={`flex items-center gap-2 ${bottomView === 'modules' ? 'text-emerald-600' : ''}`}>
              <FiPackage className="text-emerald-600" />
              Modules
              <span className="text-xs font-normal text-gray-500">{selectedAdminId ? moduleGroups.assigned.length : filteredModules.length}</span>
              {bottomView === 'modules' && <span className="text-[10px] text-emerald-500">▼</span>}
            </div>
          </div>
          <div className="space-y-1 max-h-[520px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {!selectedAdminId ? (
              <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                ⚠️ Select a Super Admin to see assigned modules
              </div>
            ) : moduleGroups.assigned.length === 0 ? (
              <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                No modules assigned to this Super Admin.
              </div>
            ) : (
              /* Show only assigned modules for the selected Super Admin */
              moduleGroups.assigned.map((m) => {
                const isAlwaysAccessible = m.alwaysAccessible || m.moduleKey === 'common' || m.moduleKey === 'chat';
                const isSelected = (selectedModuleKey && selectedModuleKey === m.moduleKey) || (selectedModuleId != null && Number.isFinite(Number(m.id)) && selectedModuleId === Number(m.id));
                
                return (
                  <div key={m.id} className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const nextModuleId = Number.isFinite(Number(m.id)) ? Number(m.id) : null;
                        setSelectedModuleId(nextModuleId);
                        setSelectedModuleKey(m.moduleKey);
                        // Clear page selection when changing modules
                        isInitialLoadRef.current = true;
                        setSelectedPageIds([]);
                        initialPageIdsRef.current = [];
                        lastSavedRef.current = '';
                      }}
                      className={`flex-1 text-left rounded-md border px-3 py-2 text-xs transition cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-700"
                          : isAlwaysAccessible
                          ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          : "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                      }`}
                      title={`${m.moduleKey} - ${isAlwaysAccessible ? 'Always Accessible' : 'Available'}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate flex items-center gap-1.5">
                            {isAlwaysAccessible ? (
                              <FiUnlock className="text-blue-600 dark:text-blue-400 text-sm" />
                            ) : (
                              <FiPackage className="text-green-600 dark:text-green-400 text-sm" />
                            )}
                            <span className="font-medium">{m.name}</span>
                          </span>
                          <span className="text-[10px] text-gray-500 shrink-0">
                            {m.pages?.length || 0} pages
                          </span>
                        </div>
                        <div className="flex items-center gap-1 pl-5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            (m.businessCategory ?? '').toLowerCase() === 'all' || m.alwaysAccessible
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : (m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          }`}>
                            {(m.businessCategory ?? '').toLowerCase() === 'all' || m.alwaysAccessible
                              ? '🔄 Shared'
                              : (m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP'
                              ? '⛽ Pump'
                              : '💼 ERP'}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Static bottom section - Toggle between Roles and Modules */}
      <div className="flex-shrink-0 rounded-lg border bg-white/40 dark:bg-gray-900/30 p-4">
        {bottomView === 'roles' ? (
          /* Show All Roles Grid */
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <FiShield className="text-purple-600" />
                  All Roles Overview
                  <span className="text-xs font-normal text-gray-500">({allRoles.length} roles)</span>
                </div>
                {/* Add/Remove button - only show when Super Admin is selected */}
                {selectedAdminId ? (
                  <button
                    onClick={() => setIsRoleAssignMode(!isRoleAssignMode)}
                    className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition flex items-center gap-2 shadow-sm ${
                      isRoleAssignMode
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {isRoleAssignMode ? "✓ Done" : "Add/Remove Roles"}
                  </button>
                ) : (
                  <span className="text-xs text-gray-500 italic">Select a Super Admin to assign roles</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  Assigned ({assignedRoleIds.length})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span>
                  Not Assigned ({allRoles.length - assignedRoleIds.length})
                </span>
                <span className="flex items-center gap-1">
                  <FiUsers className="w-3 h-3 text-blue-500" />
                  Total Users: {allRoles.reduce((sum, r) => sum + (r.userCount || r.users?.length || 0), 0)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {allRoles.map((role) => {
                const isSelected = selectedRoleId === role.id;
                const userCount = role.userCount || role.users?.length || 0;
                const isAssigned = assignedRoleIds.includes(role.id);
                
                return (
                  <div key={role.id} className="relative">
                    {/* Show +/- button overlay when in role assign mode AND Super Admin is selected */}
                    {isRoleAssignMode && selectedAdminId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignedRoleIds(prev => 
                            prev.includes(role.id) 
                              ? prev.filter(id => id !== role.id)
                              : [...prev, role.id]
                          );
                        }}
                        className={`absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full flex items-center justify-center text-lg font-bold shadow-lg transition-transform hover:scale-110 ${
                          isAssigned 
                            ? "bg-red-500 hover:bg-red-600 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                        title={isAssigned ? `Remove ${role.name}` : `Add ${role.name}`}
                      >
                        {isAssigned ? '−' : '+'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isRoleAssignMode && selectedAdminId) {
                          setAssignedRoleIds(prev => 
                            prev.includes(role.id) 
                              ? prev.filter(id => id !== role.id)
                              : [...prev, role.id]
                          );
                        } else {
                          setSelectedRoleId(role.id);
                          setBottomView('modules'); // Switch to modules after selecting a role
                        }
                      }}
                      className={`w-full text-left rounded-md border px-3 py-2 text-xs cursor-pointer transition hover:ring-2 ${
                        isSelected
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-300 hover:ring-purple-300"
                          : isAssigned
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 hover:ring-green-300"
                          : "border-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 hover:ring-red-300"
                      }`}
                      title={role.description || role.name}
                    >
                      <div className="flex items-center gap-1.5">
                        {isAssigned ? (
                          <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-bold text-sm">✗</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{role.display_name || role.name}</div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <FiUsers className="w-3 h-3" />
                              {userCount} users
                            </span>
                            {role.level && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                role.level <= 2 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : role.level <= 4
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                L{role.level}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Show All Modules Grid */
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <FiPackage className="text-emerald-600" />
                  {category === 'pump' ? 'Pump Management' : 'Business ERP'} Modules {selectedAdmin ? `- ${selectedAdmin.name}` : ''} {selectedRole ? `| Role: ${selectedRole.display_name || selectedRole.name}` : ''}
                </div>
                {/* Add/Remove button - prominent placement */}
                <button
                  onClick={() => setIsAssignMode(!isAssignMode)}
                  className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition flex items-center gap-2 shadow-sm ${
                    isAssignMode
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {isAssignMode ? "✓ Done" : "Add/Remove"}
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  Assigned {selectedAdminId ? `(${moduleGroups.assigned.filter(m => !m.alwaysAccessible).length})` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-500"></span>
                  Not Assigned {selectedAdminId ? `(${moduleGroups.unassigned.length})` : ''}
                </span>
                <span className="flex items-center gap-1">
                  <FiUnlock className="w-3 h-3 text-blue-500" />
                  Always Accessible ({modules.filter(m => m.alwaysAccessible).length})
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {filteredModules.map((m) => {
                const isExplicitlyAssigned = selectedAdmin ? isModuleAssigned(m, selectedAdmin.assignedModules || []) : false;
                const isPump = (m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP' || m.productType === 'PUMP_MANAGEMENT';
                const isAlwaysAccessible = m.alwaysAccessible || m.moduleKey === 'common' || m.moduleKey === 'chat';
                const isShared = (m.businessCategory ?? '').toLowerCase() === 'all' || m.alwaysAccessible === true;
                const canAssign = isAssignMode && !isExplicitlyAssigned && !isAlwaysAccessible && selectedAdminId;
                const canUnassign = isAssignMode && isExplicitlyAssigned && !isAlwaysAccessible && selectedAdminId;
                
                return (
                  <div key={m.id} className="relative">
                    {/* Show + button overlay when in assign mode for unassigned modules */}
                    {canAssign && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          quickAssignModule(m);
                        }}
                        disabled={saving}
                        className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-lg font-bold shadow-lg transition-transform hover:scale-110"
                        title={`Assign ${m.name}`}
                      >
                        +
                      </button>
                    )}
                    {/* Show - button overlay when in assign mode for assigned modules */}
                    {canUnassign && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          quickUnassignModule(m);
                        }}
                        disabled={saving}
                        className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-lg font-bold shadow-lg transition-transform hover:scale-110"
                        title={`Unassign ${m.name}`}
                      >
                        −
                      </button>
                    )}
                    {/* Clickable card for editing page permissions */}
                    <button
                      onClick={() => {
                        const nextModuleId = Number.isFinite(Number(m.id)) ? Number(m.id) : null;
                        setSelectedModuleId(nextModuleId);
                        setSelectedModuleKey(m.moduleKey);
                        if (selectedAdmin && nextModuleId) {
                          const existing = selectedAdmin.pagePermissions?.[String(nextModuleId)] 
                            || selectedAdmin.pagePermissions?.[m.moduleKey] 
                            || [];
                          // Use saved permissions - do NOT auto-select all pages
                          const initialPages = existing.map(canonicalPageId);
                          isInitialLoadRef.current = true;
                          setSelectedPageIds(initialPages);
                          // Initialize lastSavedRef to prevent auto-save from triggering on initial load
                          lastSavedRef.current = `${selectedAdmin.id}-${nextModuleId}-${[...initialPages].sort().join(',')}`;
                        } else {
                          isInitialLoadRef.current = true;
                          setSelectedPageIds([]);
                          lastSavedRef.current = '';
                        }
                      }}
                      className={`w-full text-left rounded-md border px-3 py-2 text-xs cursor-pointer transition hover:ring-2 hover:ring-blue-300 ${
                        isAlwaysAccessible
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          : !selectedAdminId
                          ? "border-gray-300 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                          : isExplicitlyAssigned
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                          : "border-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                      }`}
                      title={`${m.name} - ${isAlwaysAccessible ? 'Always Accessible - Click to edit page permissions' : !selectedAdminId ? 'Select a Super Admin to see status' : isExplicitlyAssigned ? 'Assigned - Click to manage pages' : 'Not Assigned'}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isAlwaysAccessible ? (
                          <FiUnlock className="text-blue-600 dark:text-blue-400 text-sm" />
                        ) : !selectedAdminId ? (
                          <span className="text-gray-400 text-sm">○</span>
                        ) : isExplicitlyAssigned ? (
                          <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-bold text-sm">✗</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{m.name}</div>
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              isShared || isAlwaysAccessible
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                : isPump
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                : (m.businessCategory ?? '').toLowerCase().includes('enterprise')
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }`}>
                              {isShared || isAlwaysAccessible
                                ? '🔄 Shared'
                                : isPump
                                ? '⛽ Pump'
                                : (m.businessCategory ?? '').toLowerCase().includes('enterprise')
                                ? '🏢 Enterprise'
                                : '💼 ERP'}
                            </span>
                            <span className="text-[10px] text-gray-400">{m.pages?.length || 0} pgs</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create Super Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold">Create Super Admin</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md text-sm">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Enter password (min 6 chars)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Confirm password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Type</label>
                <select
                  value={createForm.productType}
                  onChange={(e) => setCreateForm({ ...createForm, productType: e.target.value as 'BUSINESS_ERP' | 'PUMP_ERP' })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="BUSINESS_ERP">BISMAN ERP</option>
                  <option value="PUMP_ERP">PUMP ERP</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSuperAdmin}
                  disabled={isCreating}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
