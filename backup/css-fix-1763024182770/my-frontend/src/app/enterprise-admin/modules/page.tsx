"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FiUsers, FiPackage, FiGrid, FiCheckCircle } from "react-icons/fi";

type Module = {
  id: number | string;
  moduleKey: string;
  name: string;
  productType?: string;
  businessCategory?: string;
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
          pages: Array.isArray(m.pages) ? m.pages : [],
        })) as Module[];

        // Inject a virtual "Common (Pump)" module if backend doesn't provide one
        try {
          const regPages = Array.isArray((registryData as any).pages) ? (registryData as any).pages : [];
          const commonPages = regPages.filter((p: any) => {
            const mk = (p as any).moduleKey || (p as any).module;
            return String(mk || '').toLowerCase() === 'common';
          });
          const hasPumpCommonAlready = mods.some(
            (m) => String(m.moduleKey || '').toLowerCase() === 'pump-common' || String(m.name || '').toLowerCase().includes('common') && ((m.productType === 'PUMP_ERP') || String(m.businessCategory || '').toLowerCase().includes('pump'))
          );
          if (!hasPumpCommonAlready && commonPages.length) {
            const virtualPumpCommon: Module = {
              id: 'pump-common',
              moduleKey: 'pump-common',
              name: 'Common (Pump)',
              productType: 'PUMP_ERP',
              businessCategory: 'pump',
              pages: commonPages.map((p: any) => ({
                id: String(p.id || p.path),
                name: String(p.name || p.title || p.id || p.path),
                path: String(p.path),
              })),
            };
            mods = [...mods, virtualPumpCommon];
          }
        } catch (e) {
          // non-fatal; continue without virtual module
        }

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
    return {
      business: list.filter((m) => !isPump(m)).length,
      pump: list.filter((m) => isPump(m)).length,
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
    const categoryFiltered = list.filter((m) => (category === "pump" ? isPump(m) : !isPump(m)));
    
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
      const isAssigned = idSet.has(Number(m.id)) || keySet.has(String(m.moduleKey || '').toLowerCase());
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
      const assignedForModule = selectedAdmin.pagePermissions?.[modKey] || [];
      const assignedSet = new Set<string>();
      (assignedForModule || []).forEach((x) => {
        const [withSlash, noSlash] = bothForms(String(x));
        if (withSlash) assignedSet.add(withSlash);
        if (noSlash) assignedSet.add(noSlash);
      });
      pages = pages.map((p) => {
        const [withSlash, noSlash] = bothForms(String(p.id));
        const isAssigned = assignedSet.has(withSlash) || assignedSet.has(noSlash);
        return { ...p, isAssigned };
      });

      // Sort: assigned pages first, then unassigned
      const assigned = pages.filter(p => p.isAssigned);
      const unassigned = pages.filter(p => !p.isAssigned);
      return [...assigned, ...unassigned];
    }
    
    return pages;
  }, [modulesById, registry, selectedModuleId, selectedModuleKey, selectedAdmin]);

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
          if (!isPump) unique.add(String(m.moduleKey || '').toLowerCase());
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
          if (isPump) unique.add(String(m.moduleKey || '').toLowerCase());
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
      const business = list.filter(m => !isPump(m) && isModuleAssigned(m, raw)).length;
      const pump = list.filter(m => isPump(m) && isModuleAssigned(m, raw)).length;
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

  if (loading) return <div className="p-4">Loading…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="space-y-6 text-gray-900 dark:text-gray-100">
      {authHint && (
        <div className="rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 text-xs">
          {authHint}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-md border bg-white/40 dark:bg-gray-900/30 p-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/40">
              <FiUsers className="text-blue-600" />
            </span>
            Total Super Admins
          </div>
          <div className="text-base font-semibold mt-0.5">{superAdmins.length}</div>
        </div>
        <div className="rounded-md border bg-white/40 dark:bg-gray-900/30 p-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/30">
              <FiPackage className="text-purple-600" />
            </span>
            Total Modules
          </div>
          <div className="text-base font-semibold mt-0.5">{modules.length}</div>
        </div>
        <div className="rounded-md border bg-white/40 dark:bg-gray-900/30 p-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-900/30">
              <FiGrid className="text-indigo-600" />
            </span>
            Business ERP (Total)
          </div>
          <div className="text-base font-semibold mt-0.5">{categoryCounts.business}</div>
          <div className="text-[9px] text-gray-500 mt-0.5">Assigned: {topAssigned.business}</div>
        </div>
        <div className="rounded-md border bg-white/40 dark:bg-gray-900/30 p-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-orange-100 dark:bg-orange-900/30">
              <FiGrid className="text-orange-600" />
            </span>
            Pump Management (Total)
          </div>
          <div className="text-base font-semibold mt-0.5">{categoryCounts.pump}</div>
          <div className="text-[9px] text-gray-500 mt-0.5">Assigned: {topAssigned.pump}</div>
        </div>
      </div>

      {/* Guidance tiles */}
      {!category && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 1. Categories */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="text-sm font-semibold mb-2">Categories</div>
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
          <div className="text-sm font-semibold mb-2">Super Admins</div>
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
            <span>Modules</span>
            <div className="flex items-center gap-2">
              {category && (
                <span className="text-xs font-normal px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {filteredModules.length} modules
                </span>
              )}
              {selectedAdmin && (
                <span className="text-xs font-normal px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  {assignedInCategory} assigned
                </span>
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
                ⚠️ Select a Super Admin to see module assignments
              </div>
            )}
            {category && selectedAdminId && filteredModules.length === 0 && (
              <div className="text-xs text-gray-500">No Modules</div>
            )}
            {category && selectedAdminId && (
              <>
                {moduleGroups.assigned.map((m, index) => {
                  const isAssigned = isModuleAssigned(m, selectedAdmin?.assignedModules || []);
              
              // Determine color: yellow if no admin selected, green if assigned, red if unassigned
              const showYellow = !selectedAdminId;
              const showGreen = selectedAdminId && isAssigned;
              const showRed = selectedAdminId && !isAssigned;
              const isSelected = (selectedModuleKey && selectedModuleKey === m.moduleKey) || (selectedModuleId != null && Number.isFinite(Number(m.id)) && selectedModuleId === Number(m.id));
              
                  // Assigned group
                  return (
        <button
                  key={m.id}
                  onClick={() => {
          const nextModuleId = Number.isFinite(Number(m.id)) ? Number(m.id) : null;
          setSelectedModuleId(nextModuleId);
                    setSelectedModuleKey(m.moduleKey);
                    // Preselect already assigned pages for this admin+module if available
                    if (selectedAdmin && nextModuleId) {
                      const existing = selectedAdmin.pagePermissions?.[String(nextModuleId)] || [];
                      setSelectedPageIds(existing.map(canonicalPageId));
                    } else {
                      setSelectedPageIds([]);
                    }
                  }}
                  className={`w-full text-left rounded-md border px-3 py-2 text-xs transition ${
          isSelected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-700"
                      : showYellow
                      ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                      : showGreen
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                      : "border-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                  }`}
                  title={`${m.moduleKey} - ${showYellow ? 'Select admin to see status' : isAssigned ? 'Assigned' : 'Not assigned'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate flex items-center gap-1.5">
                      {showYellow ? (
                        <span className="text-yellow-600 dark:text-yellow-400 font-bold text-sm">⚠</span>
                      ) : showGreen ? (
                        <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-bold text-sm">✗</span>
                      )}
                      <span className={showGreen ? "font-medium" : ""}>{m.name}</span>
                    </span>
                    <span className="text-[10px] text-gray-500 shrink-0">{m.moduleKey}</span>
                  </div>
                </button>
                );
                })}
                {moduleGroups.unassigned.map((m) => {
                  const isSelected = (selectedModuleKey && selectedModuleKey === m.moduleKey) || (selectedModuleId != null && Number.isFinite(Number(m.id)) && selectedModuleId === Number(m.id));
                  const showYellow = !selectedAdminId;
                  const showGreen = false;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        const nextModuleId = Number.isFinite(Number(m.id)) ? Number(m.id) : null;
                        setSelectedModuleId(nextModuleId);
                        setSelectedModuleKey(m.moduleKey);
                        if (selectedAdmin && nextModuleId) {
                          const existing = selectedAdmin.pagePermissions?.[String(nextModuleId)] || [];
                          setSelectedPageIds(existing.map(canonicalPageId));
                        } else {
                          setSelectedPageIds([]);
                        }
                      }}
                      className={`w-full text-left rounded-md border px-3 py-2 text-xs transition ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-300 dark:ring-blue-700"
                          : showYellow
                          ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                          : "border-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                      }`}
                      title={`${m.moduleKey} - Not assigned`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate flex items-center gap-1.5">
                          {showYellow ? (
                            <span className="text-yellow-600 dark:text-yellow-400 font-bold text-sm">⚠</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-bold text-sm">✗</span>
                          )}
                          <span>{m.name}</span>
                        </span>
                        <span className="text-[10px] text-gray-500 shrink-0">{m.moduleKey}</span>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* 4. Pages - Yellow (no selection), Green (assigned), Red (unassigned) */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Pages</div>
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
                        <div className="text-[10px] text-gray-500 truncate">{p.path}</div>
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
  );
}
