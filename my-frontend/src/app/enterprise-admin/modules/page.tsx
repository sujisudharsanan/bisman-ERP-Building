"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { FiUsers, FiPackage, FiGrid, FiCheckCircle, FiUnlock, FiExternalLink } from "react-icons/fi";

type Module = {
  id: number | string;
  moduleKey: string;
  name: string;
  productType?: string;
  businessCategory?: string;
  alwaysAccessible?: boolean; // Modules accessible by all users (common, chat)
  pages?: Array<{ id: string; name?: string; path: string }>;
};
type SuperAdmin = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  productType?: string;
  assignedModules?: Array<number | string>;
  pagePermissions?: Record<string, string[]>; // moduleId -> pageIds
};
type Registry = {
  pages?: Array<{ path: string; title?: string; module?: string; moduleKey?: string }>;
};

const CATEGORIES = [
  { key: "business", label: "Business ERP", color: "purple" },
  { key: "pump", label: "Pump Management", color: "orange" },
];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedModuleKey, setSelectedModuleKey] = useState<string | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [authHint, setAuthHint] = useState<string | null>(null);
  const [isAssignMode, setIsAssignMode] = useState(false); // Toggle for showing + icons on unassigned modules
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(''); // Track last saved state to avoid duplicate saves

  // Auto-save function - saves page permissions to database
  const savePagePermissions = useCallback(async (adminId: number, moduleId: number, pageIds: string[]) => {
    const saveKey = `${adminId}-${moduleId}-${pageIds.sort().join(',')}`;
    if (saveKey === lastSavedRef.current) {
      console.log('⏭️ Skip auto-save: no changes');
      return; // No changes to save
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
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [modsRes, usersRes, regRes] = await Promise.all([
          fetch("/api/enterprise-admin/master-modules", { credentials: "include" }),
          fetch("/api/enterprise-admin/super-admins", { credentials: "include" }),
          fetch("/layout_registry.json").catch(() => new Response("{}")),
        ]);
        const modsJson = await modsRes.json().catch(() => ({}));
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
            setAuthHint('Access to Super Admins is forbidden. Ensure you are logged in as ENTERPRISE_ADMIN.');
          }
        }
  const registryData = await regRes.json().catch(() => ({}));

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

        setModules(mods);
        setSuperAdmins(admins);
        setRegistry(registryData);
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
        assignedModulesCount: admin.assignedModules?.length || 0
      });
    }
    return admin;
  }, [superAdmins, selectedAdminId]);

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
    if (!category) return list;
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
    assignedMods.forEach((v) => {
      const n = Number(v);
      if (Number.isFinite(n)) idSet.add(n);
      if (v != null) keySet.add(String(v).toLowerCase());
    });
    filteredModules.forEach((m) => {
      const isExplicitlyAssigned = idSet.has(Number(m.id)) || keySet.has(String(m.moduleKey || '').toLowerCase());
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
        let isAssigned = assignedSet.has(withSlash) || assignedSet.has(noSlash);
        // For always accessible modules with no saved permissions, treat all pages as assigned by default
        if (isAlwaysAccessibleModule && assignedForModule.length === 0) {
          isAssigned = true;
        }
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

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] text-gray-900 dark:text-gray-100">
      {authHint && (
        <div className="rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 text-xs mb-4">
          {authHint}
        </div>
      )}

      {/* Guidance tiles */}
      {!category && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FiGrid className="text-blue-600" /> Select a Category
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Choose Business ERP or Pump Management to view modules
            </p>
          </div>
        </div>
      )}

      {/* Scrollable top section with 4 columns */}
      <div className="flex-1 overflow-auto min-h-0 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 1. Categories */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
            <div className="text-sm font-semibold mb-2 flex items-center justify-between">
              <span>Categories</span>
              <span className="text-xs font-normal text-gray-500">2</span>
            </div>
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => {
                    setCategory(c.key);
                    setSelectedModuleKey(null);
                    setSelectedPageIds([]);
                  }}
                  className={`w-full text-left rounded-md border px-3 py-2 text-sm transition ${
                    category === c.key
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          c.key === "pump" ? "bg-orange-500" : "bg-purple-600"
                        }`}
                      />
                      {c.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {c.key === "pump" ? categoryCounts.pump : categoryCounts.business}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Super Admins */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="text-sm font-semibold mb-2 flex items-center justify-between">
            <span>Super Admins</span>
            <span className="text-xs font-normal text-gray-500">{superAdmins.length}</span>
          </div>
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {filteredAdmins.length === 0 && (
              <div className="text-xs text-gray-500">No Super Admins</div>
            )}
            {filteredAdmins.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAdminId(a.id)}
                className={`w-full text-left rounded-md border px-3 py-2 text-xs transition ${
                  selectedAdminId === a.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                }`}
                title={a.email}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{a.name || a.email || String(a.id)}</span>
                  <span className="text-[10px] text-gray-500">{a.role || "SUPER_ADMIN"}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Modules - Yellow (no selection), Green (assigned), Red (unassigned) */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="text-sm font-semibold mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              Modules
              <span className="text-xs font-normal text-gray-500">{moduleGroups.assigned.length}</span>
            </span>
            <div className="flex items-center gap-2">
              {category && selectedAdminId && (
                <button
                  onClick={() => setIsAssignMode(!isAssignMode)}
                  className={`text-xs font-medium px-2 py-1 rounded-md transition flex items-center gap-1 ${
                    isAssignMode
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-transparent text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  }`}
                >
                  {isAssignMode ? "✓ Done" : "Add/Remove"}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
            {!category && (
              <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                ⚠️ Select a category to view modules
              </div>
            )}
            {category && !selectedAdminId && (
              <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                ⚠️ Select a Super Admin to see assigned modules
              </div>
            )}
            {category && selectedAdminId && moduleGroups.assigned.length === 0 && (
              <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300 dark:border-gray-600">
                No modules assigned to this Super Admin. Use the section below to assign.
              </div>
            )}
            {/* Show ASSIGNED and ALWAYS ACCESSIBLE modules here */}
            {category && selectedAdminId && (
              <>
                {moduleGroups.assigned.map((m) => {
                  const isAlwaysAccessible = m.alwaysAccessible || m.moduleKey === 'common' || m.moduleKey === 'chat';
              const isSelected = (selectedModuleKey && selectedModuleKey === m.moduleKey) || (selectedModuleId != null && Number.isFinite(Number(m.id)) && selectedModuleId === Number(m.id));
              const canRemove = isAssignMode && !isAlwaysAccessible;
              
                  return (
        <div key={m.id} className="flex items-center gap-1">
          <button
                  onClick={() => {
          const nextModuleId = Number.isFinite(Number(m.id)) ? Number(m.id) : null;
          setSelectedModuleId(nextModuleId);
                    setSelectedModuleKey(m.moduleKey);
                    // Preselect already assigned pages for this admin+module if available
                    // For always accessible modules, also try to load saved page permissions
                    if (selectedAdmin && nextModuleId) {
                      // Check by both numeric id and module key string
                      const existing = selectedAdmin.pagePermissions?.[String(nextModuleId)] 
                        || selectedAdmin.pagePermissions?.[m.moduleKey] 
                        || [];
                      // If no saved permissions, for always accessible modules, select all pages by default
                      let initialPages: string[];
                      if (existing.length === 0 && isAlwaysAccessible && m.pages && m.pages.length > 0) {
                        initialPages = m.pages.map(p => canonicalPageId(p.id ?? p.path));
                      } else {
                        initialPages = existing.map(canonicalPageId);
                      }
                      setSelectedPageIds(initialPages);
                      // Initialize lastSavedRef to prevent auto-save from triggering on initial load
                      lastSavedRef.current = `${selectedAdmin.id}-${nextModuleId}-${initialPages.sort().join(',')}`;
                    } else {
                      setSelectedPageIds([]);
                      lastSavedRef.current = '';
                    }
                  }}
                  className={`flex-1 text-left rounded-md border px-3 py-2 text-xs transition cursor-pointer ${
          isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-700"
                      : isAlwaysAccessible
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                      : "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                  }`}
                  title={`${m.moduleKey} - ${isAlwaysAccessible ? 'Always Accessible (Click to edit page permissions)' : 'Assigned'} - Click to manage pages`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate flex items-center gap-1.5">
                      {isAlwaysAccessible ? (
                        <FiUnlock className="text-blue-600 dark:text-blue-400 text-sm" />
                      ) : (
                        <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓</span>
                      )}
                      <span className="font-medium">{m.name}</span>
                    </span>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {isAlwaysAccessible ? '🔓 Edit' : m.moduleKey}
                    </span>
                  </div>
                </button>
                {canRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      quickUnassignModule(m);
                    }}
                    className="p-2 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                    title={`Remove ${m.name}`}
                  >
                    <span className="font-bold text-sm">−</span>
                  </button>
                )}
        </div>
                );
                })}
              </>
            )}
          </div>
        </div>

        {/* 4. Pages - Yellow (no selection), Green (assigned), Red (unassigned) */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold flex items-center gap-2">
              Pages
              <span className="text-xs font-normal text-gray-500">{pagesForSelectedModule.length}</span>
              {/* Auto-save status indicator */}
              {autoSaveStatus === 'saving' && (
                <span className="text-xs text-blue-500 animate-pulse">💾 Saving...</span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-xs text-green-500">✅ Saved</span>
              )}
              {autoSaveStatus === 'error' && (
                <span className="text-xs text-red-500">❌ Save failed</span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {selectedPageIds.length} selected
            </div>
          </div>
          {!selectedModuleId ? (
            <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
              ⚠️ Select a module to view pages
            </div>
          ) : (!selectedAdminId ? (
            <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
              ⚠️ Select a Super Admin to see and assign pages
            </div>
          ) : pagesForSelectedModule.length === 0 ? (
            <div className="text-xs text-gray-500">No pages found for this module</div>
          ) : (
            <div className="space-y-1 max-h-[460px] overflow-y-auto">
              {/* With both selections, show controls */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {selectedPageIds.length} of {pagesForSelectedModule.length} selected
                </span>
                <button
                  onClick={toggleAllPages}
                  className="px-2 py-1 text-xs rounded border hover:bg-blue-50 dark:hover:bg-blue-900/30"
                >
                  {selectedPageIds.length === pagesForSelectedModule.length ? "Deselect All" : "Select All"}
                </button>
                <button
                  disabled={!selectedAdminId || saving || selectedPageIds.length === 0}
                  onClick={assignPages}
                  className="px-2 py-1 text-xs rounded border bg-green-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  title={selectedPageIds.length === 0 ? "Select at least one page" : `Assign ${selectedPageIds.length} page(s)`}
                >
                  {saving ? "Saving..." : `Assign (${selectedPageIds.length})`}
                </button>
                <button
                  disabled={!selectedAdminId || saving || selectedPageIds.length === 0}
                  onClick={unassignPages}
                  className="px-2 py-1 text-xs rounded border bg-red-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  title={selectedPageIds.length === 0 ? "Select at least one page" : `Unassign ${selectedPageIds.length} page(s)`}
                >
                  {saving ? "Saving..." : `Unassign (${selectedPageIds.length})`}
                </button>
              </div>
              {pagesForSelectedModule.map((p) => {
                const checked = selectedPageIds.includes(p.id);
                const isAssigned = p.isAssigned || false;
                const showYellow = !selectedAdminId;
                const showGreen = selectedAdminId && isAssigned;
                const showRed = selectedAdminId && !isAssigned;
                
                // Debug: Log page selection state
                if (checked) {
                  console.log('✅ Page selected:', p.id, p.title);
                }
                
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition ${
                      checked
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700"
                        : showYellow
                        ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                        : showGreen
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                        : "border-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        console.log('📋 Checkbox clicked:', p.id, 'New state:', e.target.checked);
                        togglePage(p.id);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      aria-label={`Select page ${p.title || p.path}`}
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      {/* status icons removed; checkbox shows assigned status */}
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{p.title || p.path}</div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-[10px] text-gray-500 dark:text-gray-400 truncate cursor-default"
                            title={`Page path: ${p.path}`}
                          >
                            {p.path}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open with preview mode - Enterprise Admin viewing as preview
                              const previewUrl = `${p.path}${p.path.includes('?') ? '&' : '?'}preview=enterprise-admin`;
                              window.open(previewUrl, '_blank', 'noopener,noreferrer');
                            }}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline flex items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity"
                            title={`Preview ${p.path} (opens in new tab with preview mode)`}
                          >
                            <FiExternalLink className="w-3 h-3" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </div>
                      {checked && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Selected</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Static bottom section - All Modules Overview */}
      <div className="flex-shrink-0 rounded-lg border bg-white/40 dark:bg-gray-900/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold flex items-center gap-2">
            <FiPackage className="text-purple-600" />
            {category === 'pump' ? 'Pump Management' : 'Business ERP'} Modules {selectedAdmin ? `- ${selectedAdmin.name}` : ''}
            {isAssignMode && <span className="text-xs font-normal text-blue-600 dark:text-blue-400">(Click + to assign)</span>}
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
                      let initialPages: string[];
                      if (existing.length === 0 && isAlwaysAccessible && m.pages && m.pages.length > 0) {
                        initialPages = m.pages.map(p => canonicalPageId(p.id ?? p.path));
                      } else {
                        initialPages = existing.map(canonicalPageId);
                      }
                      setSelectedPageIds(initialPages);
                      // Initialize lastSavedRef to prevent auto-save from triggering on initial load
                      lastSavedRef.current = `${selectedAdmin.id}-${nextModuleId}-${initialPages.sort().join(',')}`;
                    } else {
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
                      <div className="text-[10px] text-gray-500 truncate">
                        {isAlwaysAccessible ? '🔓 Click to edit' : isShared ? '🔄 Both' : isPump ? 'Pump' : 'ERP'}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
