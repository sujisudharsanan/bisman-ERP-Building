"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { FiUsers, FiPackage, FiGrid, FiCheckCircle, FiUnlock, FiExternalLink, FiShield, FiPlus, FiX, FiChevronUp, FiChevronDown, FiSearch, FiLock, FiGlobe, FiInfo, FiFile, FiMinus, FiAlertCircle } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { usePageRefresh } from "@/contexts/RefreshContext";
import { isModuleProtected, getProtectedModuleMessage, isRoleProtected, getProtectedRoleMessage, getDefaultRoleNames } from "@/common/config/protected-access";
import { PAGE_REGISTRY, MODULES } from "@/common/config/page-registry";
import Link from "next/link";

// Common pages that are shared across all modules - always visible
// Note: Only include pages that exist and are active in the database
// Last verified: 2026-01-26
const COMMON_PAGES = [
  { id: '/dashboard', path: '/dashboard', name: 'Dashboard' },
  { id: '/common/about-me', path: '/common/about-me', name: 'About Me' },
  { id: '/common/user-settings', path: '/common/user-settings', name: 'User Settings' },
  { id: '/common/security-settings', path: '/common/security-settings', name: 'Security Settings' },
  { id: '/common/calendar', path: '/common/calendar', name: 'Calendar' },
  { id: '/assistant', path: '/assistant', name: 'AI Assistant' },
];

// Removed pages (deleted/inactive/duplicates in DB):
// - /profile (doesn't exist)
// - /notifications (inactive)
// - /help (doesn't exist)
// - /common/documentation (inactive)
// - /audit-logs (doesn't exist)
// - /settings (deactivated - use /admin/settings for role-specific)
// - /calendar (deactivated - duplicate of /common/calendar)
// - /task-dashboard (deleted)
// - /ai-training (deleted)
// - /clients/usage-dashboard (deleted)
// - /hub-incharge (deleted)
// - /legal (deleted)
// - /banker (deleted)
// - /staff (deleted)
// - /trace (deleted)
// - /tasks/clarifications (deleted)
// - /tasks/reviews (deleted)

// Enterprise Admin is the topmost role - can see and assign ALL pages
// No module exclusions needed

type Module = {
  id: number | string;
  module_name?: string; // The module key like 'enterprise-admin'
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
  productType?: string; // 'ALL' | 'BUSINESS_ERP' | 'PUMP_ERP'
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
  const [category, setCategory] = useState<'common' | 'business' | 'pump' | 'all' | null>("all"); // Default to show all modules
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
  const [isPageAssignMode, setIsPageAssignMode] = useState(false); // Toggle for page assignment mode in bottom section
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  // Bottom section always shows roles only (modules are managed via page permissions in column 4)
  const [assignedRoleIds, setAssignedRoleIds] = useState<number[]>([]); // Roles assigned to selected Super Admin
  
  // Pages for selected role
  const [rolePagesLoading, setRolePagesLoading] = useState(false);
  const [rolePages, setRolePages] = useState<Array<{ id: string; routeId?: number; path: string; name: string; module?: string; granted?: boolean }>>([]);
  const [rolePagesSaving, setRolePagesSaving] = useState(false);
  const [rolePagesSelectedIds, setRolePagesSelectedIds] = useState<Set<string>>(new Set());
  const [rolePagesInitialIds, setRolePagesInitialIds] = useState<Set<string>>(new Set());
  const [rolePagesHasChanges, setRolePagesHasChanges] = useState(false);
  
  // Database-driven pages (single source of truth)
  const [dbPagesLoading, setDbPagesLoading] = useState(false);
  const [dbPagesByRole, setDbPagesByRole] = useState<Array<{ roleId: string; roleName: string; roleLevel: number; pages: Array<{ id: string; code: string; name: string; path: string; icon: string; module: string; moduleName: string; showInSidebar: boolean; status: string }> }>>([]);
  const [dbPagesByModule, setDbPagesByModule] = useState<Array<{ moduleId: string; moduleName: string; pages: Array<{ id: string; code: string; name: string; path: string; icon: string; showInSidebar: boolean; status: string; roles: string[] }> }>>([]);
  const [dbRoles, setDbRoles] = useState<Array<{ id: string; name: string; displayName: string; level: number }>>([]);
  const [dbTotalPages, setDbTotalPages] = useState(0);
  
  // Role-scoped pages from /api/governance/role-pages (single source of truth for selected role)
  // This contains ONLY pages relevant to the selected role, properly filtered by role scope
  const [roleScopedPages, setRoleScopedPages] = useState<{
    assignedPages: Array<{ id: string; pageCode: string; displayName: string; route: string; icon: string; showInSidebar: boolean; category: string; pageType: string; moduleCode: string; moduleName: string; canView: boolean; canEdit: boolean; canDelete: boolean; accessType: string }>;
    inheritedPages: Array<{ id: string; pageCode: string; displayName: string; route: string; icon: string; showInSidebar: boolean; category: string; pageType: string; moduleCode: string; moduleName: string; canView: boolean; canEdit: boolean; canDelete: boolean; accessType: string }>;
    candidatePages: Array<{ id: string; pageCode: string; displayName: string; route: string; icon: string; showInSidebar: boolean; category: string; pageType: string; moduleCode: string; moduleName: string }>;
    counts: { assigned: number; inherited: number; candidate: number; total: number };
  } | null>(null);
  const [roleScopedPagesLoading, setRoleScopedPagesLoading] = useState(false);
  
  // SuperAdmin Page Pool - pages that Enterprise Admin has granted to this Super Admin
  // This defines the maximum pages the Super Admin can assign to their roles
  const [superAdminPagePool, setSuperAdminPagePool] = useState<Array<{ id: number; pageCode: string; displayName: string; route: string; moduleId: number | null; showInSidebar: boolean }>>([]);
  const [superAdminPagePoolLoading, setSuperAdminPagePoolLoading] = useState(false);
  const [superAdminPagePoolIds, setSuperAdminPagePoolIds] = useState<Set<number>>(new Set());
  
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
  
  // Collapsible Roles Drawer state - default to expanded so roles are visible
  const [isRolesDrawerExpanded, setIsRolesDrawerExpanded] = useState(true);
  const [rolesSearchQuery, setRolesSearchQuery] = useState('');
  const [rolesFilter, setRolesFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const rolesDrawerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Bottom section view mode: 'roles' or 'pages'
  const [bottomViewMode, setBottomViewMode] = useState<'roles' | 'pages'>('roles');
  const [isPagesDrawerExpanded, setIsPagesDrawerExpanded] = useState(true);
  const [pagesModuleFilter, setPagesModuleFilter] = useState<string | null>(null);
  const [pagesAssignedFilter, setPagesAssignedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [bottomSelectedPageId, setBottomSelectedPageId] = useState<string | null>(null);
  // Pages grouping mode: 'module' or 'role'
  const [pagesGroupBy, setPagesGroupBy] = useState<'module' | 'role'>('role');
  const [pagesRoleFilter, setPagesRoleFilter] = useState<string | null>(null);
  // Bottom section search query for both roles and pages
  const [bottomSearchQuery, setBottomSearchQuery] = useState('');
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(''); // Track last saved state to avoid duplicate saves
  const isInitialLoadRef = useRef<boolean>(true); // Flag to skip auto-save on initial page selection
  const initialPageIdsRef = useRef<string[]>([]); // Track initial pages loaded for a module to detect changes
  const isRolesInitializedRef = useRef<boolean>(false); // Flag to prevent saving on initial load
  const rolesSaveTimerRef = useRef<NodeJS.Timeout | null>(null); // Debounce timer for role saves
  const lastLoadedAdminIdRef = useRef<number | null>(null); // Track which admin's roles we last loaded

  // Toast notification state for protected module warnings
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'warning' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // FILTERED ROLE PAGES - Show ONLY pages assigned to the selected role
  // Excludes: common module pages (shown separately) and API routes
  // ============================================================================
  const commonPagePaths = useMemo(() => new Set(COMMON_PAGES.map(p => p.path)), []);
  
  const filteredRolePages = useMemo(() => {
    return rolePages.filter(page => {
      const path = page.path || page.id;
      const moduleUpper = (page.module || '').toUpperCase();
      // Exclude:
      // 1. Non-granted pages (only show pages assigned to this role)
      // 2. Pages in COMMON module (shown separately in top section)
      // 3. Pages in hardcoded COMMON_PAGES list (shown separately)
      // 4. API routes (not actual pages)
      if (!page.granted) return false;
      if (moduleUpper === 'COMMON') return false;  // Exclude all COMMON module pages
      if (commonPagePaths.has(path)) return false;
      if (path.startsWith('/api/')) return false;
      return true;
    });
  }, [rolePages, commonPagePaths]);

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

  // ============================================================================
  // CASCADE RESET HANDLERS - Ensure proper state cleanup on parent selection change
  // ============================================================================
  
  // Handle category change with cascade reset
  const handleCategoryChange = useCallback((newCategory: typeof category) => {
    if (newCategory === category) return; // No change
    setCategory(newCategory);
    // Cascade reset: clear all downstream selections
    setSelectedAdminId(null);
    setSelectedRoleId(null);
    setRolePagesSelectedIds(new Set());
    setRolePagesInitialIds(new Set());
    setRolePages([]);
    setPagesAssignedFilter('all');
    setBottomSelectedPageId(null);
    console.log('[CASCADE] Category changed to:', newCategory, '→ Reset SA, Role, Pages');
  }, [category]);

  // Handle SuperAdmin selection with cascade reset
  const handleAdminChange = useCallback((adminId: number | null) => {
    if (adminId === selectedAdminId) return; // No change
    setSelectedAdminId(adminId);
    // Cascade reset: clear role and page selections
    setSelectedRoleId(null);
    setRolePagesSelectedIds(new Set());
    setRolePagesInitialIds(new Set());
    setRolePages([]);
    setPagesAssignedFilter('all');
    setBottomSelectedPageId(null);
    console.log('[CASCADE] Admin changed to:', adminId, '→ Reset Role, Pages');
  }, [selectedAdminId]);

  // Handle Role selection (no cascade needed, just load pages)
  const handleRoleChange = useCallback((roleId: number | null) => {
    setSelectedRoleId(roleId);
    setPagesAssignedFilter('all');
    setBottomSelectedPageId(null);
    console.log('[CASCADE] Role changed to:', roleId);
  }, []);

  // Helper function to toggle role assignment with protection check
  const toggleRoleAssignment = useCallback((roleId: number, roleName: string) => {
    const selectedAdmin = superAdmins.find(a => a.id === selectedAdminId);
    const adminRole = selectedAdmin?.role || 'SUPER_ADMIN';
    
    // Check if this is an attempt to remove a protected role
    const isCurrentlyAssigned = assignedRoleIds.includes(roleId);
    if (isCurrentlyAssigned && isRoleProtected(roleName, adminRole)) {
      const message = getProtectedRoleMessage(roleName, adminRole);
      showToast(message, 'warning');
      return;
    }
    
    // Otherwise, toggle the role
    setAssignedRoleIds(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  }, [selectedAdminId, superAdmins, assignedRoleIds, showToast]);

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
        console.log('📋 Loading roles for Super Admin:', selectedAdminId);
        
        // Get the admin's role type to determine default roles
        const selectedAdmin = superAdmins.find(a => a.id === selectedAdminId);
        const adminRoleType = selectedAdmin?.role || 'SUPER_ADMIN';
        const defaultRoleNames = getDefaultRoleNames(adminRoleType);
        
        const response = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/roles`, {
          credentials: 'include'
        });
        
        let loadedRoleIds: number[] = [];
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok && Array.isArray(data.roleIds)) {
            loadedRoleIds = data.roleIds;
            console.log('✅ Loaded', loadedRoleIds.length, 'roles from database');
          }
        }
        
        // Always include default/protected roles based on admin's role type
        // Find role IDs for the default role names
        const defaultRoleIds = allRoles
          .filter(r => defaultRoleNames.some(name => 
            r.name.toUpperCase() === name.toUpperCase() || 
            (r.display_name || '').toUpperCase() === name.toUpperCase()
          ))
          .map(r => r.id);
        
        // Merge default roles with loaded roles (avoiding duplicates)
        const mergedRoleIds = [...new Set([...defaultRoleIds, ...loadedRoleIds])];
        
        console.log('🔒 Default roles for', adminRoleType, ':', defaultRoleNames, '→ IDs:', defaultRoleIds);
        console.log('📋 Final assigned roles:', mergedRoleIds);
        
        setAssignedRoleIds(mergedRoleIds);
        
        lastLoadedAdminIdRef.current = selectedAdminId;
        isRolesInitializedRef.current = true;
      } catch (error) {
        console.error('❌ Error loading roles:', error);
        setAssignedRoleIds([]);
      }
    };
    
    // Only load if allRoles has been populated
    if (allRoles.length > 0) {
      loadRolesForAdmin();
    }
  }, [selectedAdminId, superAdmins, allRoles]);

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
        // Filter out any invalid IDs (negative, zero, or NaN)
        const validRoleIds = assignedRoleIds.filter(id => Number.isFinite(id) && id > 0);
        console.log('💾 Saving', validRoleIds.length, 'roles to Super Admin:', selectedAdminId, '(filtered from', assignedRoleIds.length, ')');
        
        const response = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/assign-roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ roleIds: validRoleIds })
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

  // Load SuperAdmin's page pool when a Super Admin is selected
  // This determines which pages the Super Admin can assign to roles
  useEffect(() => {
    if (!selectedAdminId) {
      setSuperAdminPagePool([]);
      setSuperAdminPagePoolIds(new Set());
      return;
    }
    
    const loadPagePool = async () => {
      setSuperAdminPagePoolLoading(true);
      try {
        console.log('📦 Loading page pool for Super Admin:', selectedAdminId);
        
        const response = await fetch(`/api/enterprise-admin/super-admins/${selectedAdminId}/page-pool`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.ok && Array.isArray(data.pages)) {
            setSuperAdminPagePool(data.pages);
            setSuperAdminPagePoolIds(new Set(data.pages.map((p: { id: number }) => p.id)));
            console.log('✅ Page pool loaded:', data.pages.length, 'pages available for Super Admin', selectedAdminId);
          } else {
            console.warn('⚠️ Page pool response invalid:', data);
            setSuperAdminPagePool([]);
            setSuperAdminPagePoolIds(new Set());
          }
        } else {
          console.error('❌ Failed to load page pool:', response.status);
          setSuperAdminPagePool([]);
          setSuperAdminPagePoolIds(new Set());
        }
      } catch (error) {
        console.error('❌ Error loading page pool:', error);
        setSuperAdminPagePool([]);
        setSuperAdminPagePoolIds(new Set());
      } finally {
        setSuperAdminPagePoolLoading(false);
      }
    };
    
    loadPagePool();
  }, [selectedAdminId]);

  // Load pages for the selected role (with race condition protection)
  useEffect(() => {
    if (!selectedRoleId) {
      setRolePages([]);
      setRolePagesSelectedIds(new Set());
      setRolePagesInitialIds(new Set());
      setRolePagesHasChanges(false);
      return;
    }
    
    // AbortController for race condition protection during rapid role switching
    const abortController = new AbortController();
    const currentRoleId = selectedRoleId; // Capture for stale closure check
    
    // Find the selected role's name for filtering
    const selectedRole = allRoles.find(r => r.id === selectedRoleId);
    const selectedRoleName = (selectedRole?.name || '').toUpperCase();
    
    // Normalize role name for matching (remove spaces, underscores, etc.)
    const normalizeRoleName = (name: string): string => {
      return name.toUpperCase().replace(/[\s_-]+/g, '').replace(/OPERATIONS/g, 'OPS');
    };
    
    const normalizedSelectedRole = normalizeRoleName(selectedRoleName);
    
    // Create variations of the role name for matching
    const getRoleVariations = (roleName: string): string[] => {
      const normalized = normalizeRoleName(roleName);
      const variations = [
        roleName.toUpperCase(),
        normalized,
        roleName.toUpperCase().replace(/\s+/g, '_'),
        roleName.toUpperCase().replace(/_/g, ''),
      ];
      // Add common mappings
      const mappings: Record<string, string[]> = {
        'ADMINISTRATOR': ['ADMIN', 'ADMINISTRATOR'],
        'ADMIN': ['ADMIN', 'ADMINISTRATOR'],
        'ADMINOPERATIONS': ['ADMIN_OPS', 'ADMINOPS', 'ADMIN_OPERATIONS', 'OPERATIONS_MANAGER'],
        'ADMINOPS': ['ADMIN_OPS', 'ADMINOPS', 'ADMIN_OPERATIONS', 'OPERATIONS_MANAGER'],
        'OPERATIONSMANAGER': ['OPERATIONS_MANAGER', 'OPS_MANAGER', 'OPSMANAGER'],
        'CHIEFOPERATINGOFFICER': ['COO', 'CHIEF_OPERATING_OFFICER'],
        'COO': ['COO', 'CHIEF_OPERATING_OFFICER'],
      };
      if (mappings[normalized]) {
        variations.push(...mappings[normalized]);
      }
      return [...new Set(variations)];
    };
    
    const roleVariations = getRoleVariations(selectedRoleName);
    
    const loadRolePages = async () => {
      setRolePagesLoading(true);
      try {
        console.log('📄 Loading pages for role:', selectedRoleId, 'name:', selectedRoleName, 'variations:', roleVariations);
        
        // Get scoped pages from API (now returns assigned, inherited, candidate)
        const response = await fetch(`/api/rbac/roles/${selectedRoleId}/pages`, {
          credentials: 'include',
          signal: abortController.signal
        });
        
        // Stale response check - if role changed during fetch, ignore result
        if (currentRoleId !== selectedRoleId) {
          console.log('⚠️ Stale response ignored for role:', currentRoleId);
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.pages)) {
            // API returns scoped pages with accessType (ASSIGNED, INHERITED, CANDIDATE)
            const apiPages = data.pages.map((p: { 
              id?: string; path: string; name?: string; module?: string; 
              granted?: boolean; accessType?: string; inherited?: boolean 
            }) => ({
              id: p.path || p.id || '',
              path: p.path,
              name: p.name || p.path,
              module: p.module || 'General',
              granted: p.granted || false,
              inherited: p.inherited || p.accessType === 'INHERITED',
              accessType: p.accessType || (p.granted ? 'ASSIGNED' : 'CANDIDATE')
            }));
            
            // Count by access type
            const assignedCount = apiPages.filter((p: { accessType: string }) => p.accessType === 'ASSIGNED').length;
            const inheritedCount = apiPages.filter((p: { accessType: string }) => p.accessType === 'INHERITED').length;
            const candidateCount = apiPages.filter((p: { accessType: string }) => p.accessType === 'CANDIDATE').length;
            
            console.log('✅ API returned', apiPages.length, 'scoped pages:',
              assignedCount, 'assigned,', inheritedCount, 'inherited,', candidateCount, 'candidate');
            
            setRolePages(apiPages);
            // Selected = assigned + inherited pages
            const grantedPaths = new Set<string>(
              apiPages
                .filter((p: { accessType: string }) => p.accessType === 'ASSIGNED' || p.accessType === 'INHERITED')
                .map((p: { path: string }) => p.path)
            );
            setRolePagesSelectedIds(grantedPaths);
            setRolePagesInitialIds(new Set(grantedPaths));
            setRolePagesHasChanges(false);
          } else {
            console.warn('⚠️ No pages in API response');
            setRolePages([]);
            setRolePagesSelectedIds(new Set());
            setRolePagesInitialIds(new Set());
          }
        } else {
          console.error('⚠️ API request failed:', response.status);
          setRolePages([]);
          setRolePagesSelectedIds(new Set());
          setRolePagesInitialIds(new Set());
        }
        
      } catch (error) {
        // Ignore abort errors (expected during rapid switching)
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🔄 Fetch aborted for role:', currentRoleId, '(rapid switch)');
          return;
        }
        console.error('❌ Error loading role pages:', error);
        setRolePages([]);
        setRolePagesSelectedIds(new Set());
        setRolePagesInitialIds(new Set());
      } finally {
        // Only clear loading if this is still the current request
        if (currentRoleId === selectedRoleId) {
          setRolePagesLoading(false);
        }
      }
    };
    
    loadRolePages();
    
    // Cleanup: abort fetch if role changes before response arrives
    return () => {
      abortController.abort();
    };
  }, [selectedRoleId, allRoles]);

  // ============================================================================
  // LOAD ROLE-SCOPED PAGES (single source of truth for pages list)
  // Fetches assigned, inherited, and candidate pages filtered by role scope
  // This replaces the global pages list with a role-specific one
  // ============================================================================
  useEffect(() => {
    if (!selectedRoleId) {
      setRoleScopedPages(null);
      return;
    }

    const selectedRole = allRoles.find(r => r.id === selectedRoleId);
    const selectedRoleName = selectedRole?.name || '';
    
    if (!selectedRoleName) {
      console.log('⚠️ No role name found for ID:', selectedRoleId);
      return;
    }

    const abortController = new AbortController();
    
    const loadRoleScopedPages = async () => {
      setRoleScopedPagesLoading(true);
      try {
        console.log('📋 Loading role-scoped pages for:', selectedRoleName);
        
        const response = await fetch(`/api/governance/role-pages?roleName=${encodeURIComponent(selectedRoleName)}`, {
          credentials: 'include',
          signal: abortController.signal
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            console.log(`✅ Role-scoped pages: ${data.data.counts.assigned} assigned, ${data.data.counts.inherited} inherited, ${data.data.counts.candidate} candidates`);
            setRoleScopedPages(data.data);
            
            // SYNC: Also populate rolePagesSelectedIds with assigned + inherited page paths
            // This ensures the toggle state matches what the API returns as "assigned"
            const assignedPaths = new Set<string>([
              ...data.data.assignedPages.map((p: { route: string }) => p.route),
              ...data.data.inheritedPages.map((p: { route: string }) => p.route)
            ]);
            setRolePagesSelectedIds(assignedPaths);
            setRolePagesInitialIds(new Set(assignedPaths));
            setRolePagesHasChanges(false);
          } else {
            console.warn('⚠️ Invalid role-scoped pages response:', data);
            setRoleScopedPages(null);
          }
        } else {
          console.error('❌ Failed to load role-scoped pages:', response.status);
          setRoleScopedPages(null);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🔄 Role-scoped pages fetch aborted');
          return;
        }
        console.error('❌ Error loading role-scoped pages:', error);
        setRoleScopedPages(null);
      } finally {
        setRoleScopedPagesLoading(false);
      }
    };

    loadRoleScopedPages();

    return () => {
      abortController.abort();
    };
  }, [selectedRoleId, allRoles]);

  // Track changes for role pages
  useEffect(() => {
    const currentIds = [...rolePagesSelectedIds].sort().join(',');
    const initialIds = [...rolePagesInitialIds].sort().join(',');
    setRolePagesHasChanges(currentIds !== initialIds);
  }, [rolePagesSelectedIds, rolePagesInitialIds]);

  // Save role pages handler
  const handleSaveRolePages = async () => {
    if (!selectedRoleId) return;
    
    setRolePagesSaving(true);
    try {
      const pageIds = Array.from(rolePagesSelectedIds);
      console.log('💾 Saving', pageIds.length, 'pages for role:', selectedRoleId);
      
      const response = await fetch(`/api/rbac/roles/${selectedRoleId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pageIds })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Saved role pages:', data);
        // Update initial to current (no more unsaved changes)
        setRolePagesInitialIds(new Set(rolePagesSelectedIds));
        setRolePagesHasChanges(false);
      } else {
        console.error('❌ Save failed:', response.status);
        alert('Failed to save role pages');
      }
    } catch (error) {
      console.error('❌ Save error:', error);
      alert('Error saving role pages');
    } finally {
      setRolePagesSaving(false);
    }
  };

  // Toggle page selection for role - uses path for consistent matching
  const toggleRolePageSelection = (pagePath: string) => {
    setRolePagesSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pagePath)) {
        newSet.delete(pagePath);
      } else {
        newSet.add(pagePath);
      }
      return newSet;
    });
  };

  // Select all / Deselect all for role pages (including common pages) - use paths
  const handleSelectAllRolePages = () => {
    // Include both category-specific pages AND common pages - use path for consistency
    const allPaths = new Set([
      ...rolePages.map(p => p.path),
      ...COMMON_PAGES.map(p => p.path)
    ]);
    setRolePagesSelectedIds(allPaths);
  };

  const handleDeselectAllRolePages = () => {
    setRolePagesSelectedIds(new Set());
  };

  // Toggle all pages for a specific role group (used in "By Role" view in bottom section)
  const handleToggleRoleGroupPages = useCallback((pages: { path: string }[], selectAll: boolean) => {
    setRolePagesSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selectAll) {
        // Add all page paths from this role group
        pages.forEach(page => newSet.add(page.path));
      } else {
        // Remove all page paths from this role group
        pages.forEach(page => newSet.delete(page.path));
      }
      return newSet;
    });
  }, []);

  // Check if all pages in a role group are selected
  const isRoleGroupFullySelected = useCallback((pages: { path: string }[]) => {
    if (pages.length === 0) return false;
    return pages.every(page => rolePagesSelectedIds.has(page.path));
  }, [rolePagesSelectedIds]);

  // Check if some pages in a role group are selected (partial)
  const isRoleGroupPartiallySelected = useCallback((pages: { path: string }[]) => {
    if (pages.length === 0) return false;
    const selectedCount = pages.filter(page => rolePagesSelectedIds.has(page.path)).length;
    return selectedCount > 0 && selectedCount < pages.length;
  }, [rolePagesSelectedIds]);

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
      setDbPagesLoading(true);
      try {
        // Load different data based on user role
        const [modsRes, usersRes, regRes, rolesRes, clientsRes, dbPagesRes] = await Promise.all([
          fetch("/api/enterprise-admin/master-modules", { credentials: "include" }),
          fetch("/api/enterprise-admin/super-admins", { credentials: "include" }),
          fetch("/layout_registry.json").catch(() => new Response("{}")),
          fetch("/api/reports/roles-users", { credentials: "include" }).catch(() => new Response("{}")),
          // Load clients for SUPER_ADMIN
          fetch("/api/system/clients", { credentials: "include" }).catch(() => new Response("{}")),
          // Load pages from database (single source of truth)
          fetch("/api/governance/pages-by-role", { credentials: "include" }).catch(() => new Response("{}")),
        ]);
        const modsJson = await modsRes.json().catch(() => ({}));
        const rolesJson = await rolesRes.json().catch(() => ({}));
        
        // Load database pages (single source of truth for role management)
        const dbPagesJson = await dbPagesRes.json().catch(() => ({}));
        if (dbPagesJson.success && dbPagesJson.data) {
          console.log('📋 Loaded database pages:', dbPagesJson.data.totalPages, 'pages,', dbPagesJson.data.totalRoles, 'roles');
          setDbPagesByRole(dbPagesJson.data.byRole || []);
          setDbPagesByModule(dbPagesJson.data.byModule || []);
          setDbRoles(dbPagesJson.data.roles || []);
          setDbTotalPages(dbPagesJson.data.totalPages || 0);
        } else {
          console.warn('⚠️ Could not load database pages:', dbPagesJson);
        }
        setDbPagesLoading(false);
        
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
          // SECURITY: Don't fallback to alternative endpoints - show error instead
          console.warn('[EnterpriseModules] Could not load Super Admins:', usersRes.status, usersRes.statusText);
          if (usersRes.status === 403 || usersRes.status === 401) {
            // Don't show error hint for SUPER_ADMIN - they manage clients, not super admins
            if (!isSuperAdmin) {
              setAuthHint('Access to Super Admins is forbidden. Ensure you are logged in as ENTERPRISE_ADMIN.');
            }
          } else {
            setAuthHint('Could not load Super Admins. Please try again or contact support.');
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
          productType: r.productType || r.product_type || 'ALL',
        })) as Role[];
        
        // Note: SUPER_ADMIN and ENTERPRISE_ADMIN should come from the API with proper IDs
        // If they don't appear, they need to be added to the database, not with synthetic negative IDs
        
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

  // Compute page counts for pump-related modules from database (single source of truth)
  const pumpPagesCount = useMemo(() => {
    if (dbPagesByModule.length === 0) return 0;
    const pumpModuleKeys = ['pump', 'pump-management', 'pump_management'];
    const pumpModules = dbPagesByModule.filter(m => 
      pumpModuleKeys.some(key => 
        m.moduleId.toLowerCase().includes(key) ||
        m.moduleName.toLowerCase().includes(key)
      )
    );
    return pumpModules.reduce((sum, m) => sum + m.pages.length, 0);
  }, [dbPagesByModule]);

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

  // Roles allowed for the selected Super Admin, filtered by selected category
  // Enterprise Admin sees ALL roles; Super Admin sees roles they're allowed to manage
  // Roles are filtered by:
  // 1. productType based on selected category (pump/business/all) - for backwards compatibility
  // 2. Whether they actually have pages assigned in modules_master/pages_master (database truth)
  const rolesForSelectedAdmin = useMemo(() => {
    let filteredRoles = allRoles;
    
    // ============================================================================
    // CRITICAL FIX: Filter roles by whether they have pages in the category's modules
    // When 'pump' category is selected, only show roles that have pages in pump-related modules
    // This ensures Pump Management (with 0 pages in DB) shows 0 roles
    // ============================================================================
    if (category === 'pump' && dbPagesByModule.length > 0) {
      // Find all pump-related modules in the database
      const pumpModuleKeys = ['pump', 'pump-management', 'pump_management'];
      const pumpModuleData = dbPagesByModule.filter(m => 
        pumpModuleKeys.some(key => 
          m.moduleId.toLowerCase().includes(key) ||
          m.moduleName.toLowerCase().includes(key)
        )
      );
      
      // Get all unique role names from pages in pump modules
      const rolesWithPagesInPump = new Set<string>();
      for (const mod of pumpModuleData) {
        for (const page of mod.pages) {
          if (page.roles && Array.isArray(page.roles)) {
            for (const roleName of page.roles) {
              rolesWithPagesInPump.add(roleName.toUpperCase());
            }
          }
        }
      }
      
      // Filter by productType first (for compatibility), then by actual page assignments
      const productTypeFiltered = allRoles.filter(r => {
        const pt = (r.productType || 'ALL').toUpperCase();
        return pt === 'PUMP_ERP' || pt === 'PUMP' || pt === 'ALL';
      });
      
      // Further filter to only roles that actually have pages in pump modules
      filteredRoles = productTypeFiltered.filter(r => {
        const roleName = (r.name || '').toUpperCase();
        return rolesWithPagesInPump.has(roleName);
      });
      
      console.log(`📋 Pump category: ${pumpModuleData.length} modules, ${pumpModuleData.reduce((sum, m) => sum + m.pages.length, 0)} pages, ${rolesWithPagesInPump.size} unique roles, showing ${filteredRoles.length} roles`);
    } else if (category === 'business') {
      // For business, filter by productType - business modules have plenty of pages
      filteredRoles = allRoles.filter(r => {
        const pt = (r.productType || 'ALL').toUpperCase();
        return pt === 'BUSINESS_ERP' || pt === 'BUSINESS' || pt === 'ERP' || pt === 'ALL';
      });
    }
    // For 'all' or 'common', show all roles
    
    return filteredRoles;
  }, [allRoles, category, dbPagesByModule]);

  // Get the selected role object
  const selectedRole = useMemo(() => {
    return allRoles.find(r => r.id === selectedRoleId) || null;
  }, [allRoles, selectedRoleId]);

  // Create a map of role name -> page count from database (single source of truth)
  // When a SuperAdmin is selected, filter to only count pages in their pool
  const rolePageCountMap = useMemo(() => {
    const map = new Map<string, number>();
    dbPagesByRole.forEach(r => {
      let pageCount = r.pages.length;
      
      // If a SuperAdmin is selected, only count pages that are in their page pool
      if (selectedAdminId && superAdminPagePoolIds.size > 0) {
        pageCount = r.pages.filter(p => {
          const pageId = parseInt(p.id);
          return superAdminPagePoolIds.has(pageId);
        }).length;
      }
      
      // Store by role ID (which is the role name string like 'SUPER_ADMIN')
      map.set(r.roleId.toUpperCase(), pageCount);
      // Also store by display name for fallback matching
      if (r.roleName) {
        map.set(r.roleName.toUpperCase(), pageCount);
      }
    });
    return map;
  }, [dbPagesByRole, selectedAdminId, superAdminPagePoolIds]);

  // Get page count for a role (from database, filtered by SuperAdmin's page pool)
  const getPageCountForRole = (role: Role): number => {
    const roleName = (role.name || '').toUpperCase();
    const displayName = (role.display_name || '').toUpperCase();
    return rolePageCountMap.get(roleName) ?? rolePageCountMap.get(displayName) ?? 0;
  };
  
  // Get the total pages available in SuperAdmin's pool (for display)
  const totalPagesInPool = useMemo(() => {
    return superAdminPagePool.length;
  }, [superAdminPagePool]);

  // ============================================================================
  // ROLE-SCOPED PAGES COMPUTED VALUES (single source of truth when role selected)
  // These replace global page lists with role-specific data
  // ============================================================================
  
  // Get total pages for selected role (assigned + inherited)
  const roleScopedTotalPages = useMemo(() => {
    if (!roleScopedPages) return 0;
    return roleScopedPages.counts.assigned + roleScopedPages.counts.inherited;
  }, [roleScopedPages]);
  
  // Get candidate pages for selected role (pages that CAN be assigned)
  const roleScopedCandidateCount = useMemo(() => {
    if (!roleScopedPages) return 0;
    return roleScopedPages.counts.candidate;
  }, [roleScopedPages]);
  
  // Get pages grouped by module for the selected role (for bottom section)
  // Combines assigned + inherited + candidate pages, grouped by module
  const roleScopedPagesByModule = useMemo(() => {
    if (!roleScopedPages) return [];
    
    const moduleMap = new Map<string, {
      moduleId: string;
      moduleName: string;
      pages: Array<{
        id: string;
        name: string;
        path: string;
        module: string;
        accessType: string;
        isAssigned: boolean;
        isInherited: boolean;
      }>;
    }>();
    
    // Add assigned pages
    for (const page of roleScopedPages.assignedPages) {
      const key = page.moduleCode || 'GENERAL';
      if (!moduleMap.has(key)) {
        moduleMap.set(key, { moduleId: key, moduleName: page.moduleName || key, pages: [] });
      }
      moduleMap.get(key)!.pages.push({
        id: page.id,
        name: page.displayName,
        path: page.route,
        module: page.moduleCode,
        accessType: 'ASSIGNED',
        isAssigned: true,
        isInherited: false
      });
    }
    
    // Add inherited pages
    for (const page of roleScopedPages.inheritedPages) {
      const key = page.moduleCode || 'GENERAL';
      if (!moduleMap.has(key)) {
        moduleMap.set(key, { moduleId: key, moduleName: page.moduleName || key, pages: [] });
      }
      moduleMap.get(key)!.pages.push({
        id: page.id,
        name: page.displayName,
        path: page.route,
        module: page.moduleCode,
        accessType: 'INHERITED',
        isAssigned: false,
        isInherited: true
      });
    }
    
    // Add candidate pages (not yet assigned)
    for (const page of roleScopedPages.candidatePages) {
      const key = page.moduleCode || 'GENERAL';
      if (!moduleMap.has(key)) {
        moduleMap.set(key, { moduleId: key, moduleName: page.moduleName || key, pages: [] });
      }
      moduleMap.get(key)!.pages.push({
        id: page.id,
        name: page.displayName,
        path: page.route,
        module: page.moduleCode,
        accessType: 'CANDIDATE',
        isAssigned: false,
        isInherited: false
      });
    }
    
    return Array.from(moduleMap.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  }, [roleScopedPages]);

  // Get all pages grouped by module for the Pages Overview section (using DATABASE)
  // When SuperAdmin is selected, filter to only show pages in their pool
  const allPagesGroupedByModule = useMemo(() => {
    // Use database data as single source of truth
    if (dbPagesByModule.length > 0) {
      console.log(`📋 Using DATABASE pages: ${dbTotalPages} pages in ${dbPagesByModule.length} modules`);
      
      // If SuperAdmin is selected and has a page pool, filter pages
      if (selectedAdminId && superAdminPagePoolIds.size > 0) {
        console.log(`📦 Filtering to SuperAdmin's page pool: ${superAdminPagePoolIds.size} pages`);
        return dbPagesByModule
          .map(m => ({
            moduleId: m.moduleId,
            moduleName: m.moduleName,
            pages: m.pages
              .filter(p => {
                const pageId = parseInt(p.id);
                return superAdminPagePoolIds.has(pageId);
              })
              .map(p => ({
                id: p.id,
                name: p.name,
                path: p.path,
                status: p.status,
                roles: p.roles || []
              }))
          }))
          .filter(m => m.pages.length > 0); // Only include modules with pages
      }
      
      return dbPagesByModule.map(m => ({
        moduleId: m.moduleId,
        moduleName: m.moduleName,
        pages: m.pages.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          status: p.status,
          roles: p.roles || []
        }))
      }));
    }
    
    // Fallback to PAGE_REGISTRY only if database is not loaded yet
    const moduleMap = new Map<string, { moduleId: string; moduleName: string; pages: { id: string; name: string; path: string; status: string }[] }>();
    
    let skippedCount = 0;
    for (const page of PAGE_REGISTRY) {
      if (page.status !== 'active') continue;
      
      const moduleId = page.module;
      
      // Only skip hidden modules based on MODULES metadata
      const moduleMeta = MODULES[moduleId];
      if (moduleMeta?.hidden) {
        skippedCount++;
        continue;
      }
      
      if (!moduleMap.has(moduleId)) {
        moduleMap.set(moduleId, {
          moduleId,
          moduleName: moduleMeta?.name || moduleId,
          pages: []
        });
      }
      moduleMap.get(moduleId)!.pages.push({
        id: page.id,
        name: page.name,
        path: page.path,
        status: page.status
      });
    }
    
    const result = Array.from(moduleMap.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
    const totalPages = result.reduce((sum, g) => sum + g.pages.length, 0);
    console.log(`📋 Fallback to PAGE_REGISTRY: ${PAGE_REGISTRY.length} total, Skipped: ${skippedCount}, Showing: ${totalPages} pages in ${result.length} modules`);
    return result;
  }, [dbPagesByModule, dbTotalPages, selectedAdminId, superAdminPagePoolIds]);

  // Get all pages grouped by ROLE for the Pages Overview section (using PAGE_REGISTRY)
  // Get all pages grouped by ROLE for the Pages Overview section (using DATABASE)
  // When SuperAdmin is selected, filter to only show pages in their pool
  const allPagesGroupedByRole = useMemo(() => {
    // Use database data as single source of truth
    if (dbPagesByRole.length > 0) {
      console.log(`📋 Using DATABASE pages grouped by role: ${dbPagesByRole.length} roles`);
      
      // If SuperAdmin is selected and has a page pool, filter pages
      if (selectedAdminId && superAdminPagePoolIds.size > 0) {
        console.log(`📦 Filtering role pages to SuperAdmin's pool: ${superAdminPagePoolIds.size} pages`);
        return dbPagesByRole.map(r => ({
          roleId: r.roleId,
          roleName: r.roleName,
          roleLevel: r.roleLevel,
          pages: r.pages
            .filter(p => {
              const pageId = parseInt(p.id);
              return superAdminPagePoolIds.has(pageId);
            })
            .map(p => ({
              id: p.id,
              name: p.name,
              path: p.path,
              status: p.status,
              module: p.module
            }))
        }))
        .filter(r => r.pages.length > 0) // Only include roles with pages
        .sort((a, b) => {
          if (a.roleId === '_unassigned') return 1;
          if (b.roleId === '_unassigned') return -1;
          return b.roleLevel - a.roleLevel || a.roleName.localeCompare(b.roleName);
        });
      }
      
      return dbPagesByRole.map(r => ({
        roleId: r.roleId,
        roleName: r.roleName,
        roleLevel: r.roleLevel,
        pages: r.pages.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          status: p.status,
          module: p.module
        }))
      })).sort((a, b) => {
        if (a.roleId === '_unassigned') return 1;
        if (b.roleId === '_unassigned') return -1;
        return b.roleLevel - a.roleLevel || a.roleName.localeCompare(b.roleName);
      });
    }
    
    // Fallback to PAGE_REGISTRY only if database is not loaded yet
    const roleMap = new Map<string, { roleId: string; roleName: string; pages: { id: string; name: string; path: string; status: string; module: string }[] }>();
    
    for (const page of PAGE_REGISTRY) {
      if (page.status !== 'active') continue;
      
      // Only skip hidden modules based on MODULES metadata
      const moduleMeta = MODULES[page.module];
      if (moduleMeta?.hidden) continue;
      
      // Get roles for this page (default to empty array if not defined)
      const pageRoles = (page as any).roles || [];
      
      // If no roles defined, put in "Unassigned" group
      if (pageRoles.length === 0) {
        const roleKey = '_unassigned';
        if (!roleMap.has(roleKey)) {
          roleMap.set(roleKey, {
            roleId: roleKey,
            roleName: 'Unassigned (No Role)',
            pages: []
          });
        }
        roleMap.get(roleKey)!.pages.push({
          id: page.id,
          name: page.name,
          path: page.path,
          status: page.status,
          module: page.module
        });
      } else {
        // Add page to each role it belongs to
        for (const roleName of pageRoles) {
          const roleKey = String(roleName).toUpperCase();
          if (!roleMap.has(roleKey)) {
            roleMap.set(roleKey, {
              roleId: roleKey,
              roleName: roleKey.replace(/_/g, ' '),
              pages: []
            });
          }
          roleMap.get(roleKey)!.pages.push({
            id: page.id,
            name: page.name,
            path: page.path,
            status: page.status,
            module: page.module
          });
        }
      }
    }
    
    // Sort: put unassigned at the end, rest alphabetically
    const result = Array.from(roleMap.values()).sort((a, b) => {
      if (a.roleId === '_unassigned') return 1;
      if (b.roleId === '_unassigned') return -1;
      return a.roleName.localeCompare(b.roleName);
    });
    
    return result;
  }, [dbPagesByRole, selectedAdminId, superAdminPagePoolIds]);

  // Filtered pages based on selected role filter
  const filteredPagesForOverviewByRole = useMemo(() => {
    if (!pagesRoleFilter) return allPagesGroupedByRole;
    return allPagesGroupedByRole.filter(g => 
      g.roleId === pagesRoleFilter || 
      g.roleName.toLowerCase().includes(pagesRoleFilter.toLowerCase())
    );
  }, [allPagesGroupedByRole, pagesRoleFilter]);

  // ============================================================================
  // SCOPED PAGES FOR SELECTED ROLE (Critical fix for bottom section)
  // When a role is selected in the bottom drawer, show ONLY pages for that role
  // Uses the same data source as the top section (rolePages from API)
  // ============================================================================
  const pagesForSelectedRoleInBottom = useMemo(() => {
    // If no role selected in bottom section, return empty (user must select a role first)
    if (!selectedRoleId) {
      return { all: [], assigned: [], unassigned: [], roleSelected: false, roleName: '' };
    }
    
    // Find the selected role's name
    const selectedRole = allRoles.find(r => r.id === selectedRoleId);
    const selectedRoleName = selectedRole?.name?.toUpperCase() || '';
    
    // Use the same pages as the top section (rolePages from API + COMMON_PAGES)
    // Combine filteredRolePages (category pages) with COMMON_PAGES
    // Note: Use 'COMMON' (uppercase) to match DB module naming convention
    const allPagesForRole = [
      ...COMMON_PAGES.map(p => ({
        id: p.id,
        name: p.name,
        path: p.path,
        module: 'COMMON'  // Use uppercase to match DB module naming
      })),
      ...filteredRolePages.map(p => ({
        id: p.id,
        name: p.name || p.path,
        path: p.path,
        module: p.module || 'OTHER'
      }))
    ];
    
    // Split into assigned/unassigned based on rolePagesSelectedIds
    const assigned = allPagesForRole.filter(page => 
      rolePagesSelectedIds.has(page.path)
    );
    const unassigned = allPagesForRole.filter(page => 
      !rolePagesSelectedIds.has(page.path)
    );
    
    return {
      all: allPagesForRole,
      assigned,
      unassigned,
      roleSelected: true,
      roleName: selectedRoleName
    };
  }, [selectedRoleId, allRoles, rolePagesSelectedIds, filteredRolePages]);

  // Filtered pages based on selected module filter
  const filteredPagesForOverview = useMemo(() => {
    if (!pagesModuleFilter) return allPagesGroupedByModule;
    return allPagesGroupedByModule.filter(g => 
      g.moduleId === pagesModuleFilter || 
      g.moduleName.toLowerCase().includes(pagesModuleFilter.toLowerCase())
    );
  }, [allPagesGroupedByModule, pagesModuleFilter]);

  // Total pages count - prefer database count
  const totalPagesCount = useMemo(() => {
    if (dbTotalPages > 0) return dbTotalPages;
    return allPagesGroupedByModule.reduce((sum, g) => sum + g.pages.length, 0);
  }, [dbTotalPages, allPagesGroupedByModule]);

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
    let list = Array.isArray(modules) ? modules : [];
    
    // Filter out only hidden modules based on MODULES metadata
    // Enterprise Admin is the topmost role - can see all modules
    list = list.filter(m => {
      const moduleKey = (m.moduleKey || '').toLowerCase();
      // Only check MODULES metadata for hidden flag
      const moduleMeta = MODULES[moduleKey];
      if (moduleMeta?.hidden) return false;
      return true;
    });
    
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

  // RBAC: Derive module accessibility status from page permissions
  // Modules are NOT directly assigned - they are accessible when at least one page inside is allowed
  const getModuleAccessStatus = useCallback((m: Module): { status: 'accessible' | 'partial' | 'no-access'; pageCount: number; allowedCount: number } => {
    const modulePages = m.pages || [];
    const totalPages = modulePages.length;
    
    if (!selectedAdmin || !selectedModuleId) {
      // Check from pagePermissions if admin is selected
      if (selectedAdmin) {
        const modKey = String(m.id);
        const moduleKey = m.moduleKey || '';
        const assignedPages = selectedAdmin.pagePermissions?.[modKey] 
          || selectedAdmin.pagePermissions?.[moduleKey] 
          || [];
        const allowedCount = assignedPages.length;
        
        if (allowedCount === 0) return { status: 'no-access', pageCount: totalPages, allowedCount: 0 };
        if (allowedCount >= totalPages) return { status: 'accessible', pageCount: totalPages, allowedCount };
        return { status: 'partial', pageCount: totalPages, allowedCount };
      }
      return { status: 'no-access', pageCount: totalPages, allowedCount: 0 };
    }
    
    // For always accessible modules
    if (m.alwaysAccessible || m.moduleKey === 'common' || m.moduleKey === 'chat') {
      return { status: 'accessible', pageCount: totalPages, allowedCount: totalPages };
    }
    
    // Count allowed pages from pagePermissions
    const modKey = String(m.id);
    const moduleKey = m.moduleKey || '';
    const assignedPages = selectedAdmin.pagePermissions?.[modKey] 
      || selectedAdmin.pagePermissions?.[moduleKey] 
      || [];
    const allowedCount = assignedPages.length;
    
    if (allowedCount === 0) return { status: 'no-access', pageCount: totalPages, allowedCount: 0 };
    if (allowedCount >= totalPages) return { status: 'accessible', pageCount: totalPages, allowedCount };
    return { status: 'partial', pageCount: totalPages, allowedCount };
  }, [selectedAdmin, selectedModuleId]);

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
    
    // Get the selected admin's role and the module key to check protection
    const selectedAdmin = superAdmins.find(a => a.id === selectedAdminId);
    const selectedModule = modules.find(m => m.id === selectedModuleId || Number(m.id) === Number(selectedModuleId));
    const adminRole = selectedAdmin?.role || 'SUPER_ADMIN';
    // Backend sends module_name as the key (e.g. 'enterprise-admin'), id is numeric database ID
    const moduleKey = selectedModule?.module_name || selectedModule?.moduleKey || selectedModule?.name || '';
    
    // Check if this module is protected for the admin's role
    if (isModuleProtected(moduleKey, adminRole)) {
      const message = getProtectedModuleMessage(moduleKey, adminRole);
      showToast(message, 'warning');
      return;
    }
    
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
    // Password complexity validation
    const passwordErrors = [];
    if (createForm.password.length < 12) {
      passwordErrors.push('at least 12 characters');
    }
    if (!/[a-z]/.test(createForm.password)) {
      passwordErrors.push('a lowercase letter');
    }
    if (!/[A-Z]/.test(createForm.password)) {
      passwordErrors.push('an uppercase letter');
    }
    if (!/\d/.test(createForm.password)) {
      passwordErrors.push('a number');
    }
    if (!/[@$!%*?&#]/.test(createForm.password)) {
      passwordErrors.push('a special character (@$!%*?&#)');
    }
    if (passwordErrors.length > 0) {
      setCreateError(`Password must contain: ${passwordErrors.join(', ')}`);
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Loading roles...</p>
      </div>
    </div>
  );
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] text-gray-900 dark:text-gray-100">
      {authHint && (
        <div className="rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 text-xs mb-4">
          {authHint}
        </div>
      )}

      {/* Scrollable top section with 4 columns - narrower first 3, wider Pages column */}
      <div className="flex-1 overflow-auto min-h-0 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(280px,2fr)] gap-3">
          {/* 1. Category Selection */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-2">
          <div className="text-sm font-semibold mb-2 flex items-center justify-between">
            <span>Category</span>
            <span className="text-xs font-normal text-gray-500">
              {category === 'common' ? 'Common' : category === 'business' ? 'Business ERP' : category === 'pump' ? 'Pump' : 'Select'}
            </span>
          </div>
          <div className="space-y-1">
            {/* Common / Shared Option */}
            <button
              onClick={() => handleCategoryChange('common')}
              className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition-all ${
                category === 'common'
                  ? "border-gray-500 bg-gray-100 dark:bg-gray-800/50 ring-2 ring-gray-400 dark:ring-gray-600"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <FiGlobe className={`text-lg ${category === 'common' ? 'text-gray-700' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium ${category === 'common' ? 'text-gray-700 dark:text-gray-300' : ''}`}>Common / Shared</span>
                    {category === 'common' && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-500 text-white flex-shrink-0">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {COMMON_PAGES.length} shared pages
                  </div>
                </div>
              </div>
            </button>

            {/* Business ERP Option */}
            <button
              onClick={() => handleCategoryChange('business')}
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
                    {modules.filter(m => 
                      !((m.businessCategory ?? '').toLowerCase().includes('pump') || m.productType === 'PUMP_ERP') ||
                      (m.businessCategory ?? '').toLowerCase() === 'all' || m.alwaysAccessible
                    ).length} modules
                  </div>
                </div>
              </div>
            </button>

            {/* Pump Management Option */}
            <button
              onClick={() => handleCategoryChange('pump')}
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
                    {pumpPagesCount > 0 
                      ? `${pumpPagesCount} pages` 
                      : 'No pages configured'
                    }
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Users column - Clients for SUPER_ADMIN, Super Admins for ENTERPRISE_ADMIN */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-2">
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
                    onClick={() => handleAdminChange(a.id)}
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
          className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-2"
        >
          <div className="text-sm font-semibold mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiShield className="text-purple-600" />
              Roles
              <span className="text-xs font-normal text-gray-500">{assignedRoleIds.length}</span>
            </div>
          </div>
          <div className="space-y-1 max-h-[520px] overflow-y-auto">
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
                const hasUsers = userCount > 0;
                
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleChange(role.id)}
                    className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                      isSelected
                        ? "border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-300 shadow-sm"
                        : hasUsers
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                        : "border-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    }`}
                    title={`${role.description || role.name} (Level ${role.level || 0})`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isSelected ? (
                          <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">●</span>
                        ) : hasUsers ? (
                          <span className="text-green-600 dark:text-green-400 font-bold text-sm">✓</span>
                        ) : (
                          <span className="text-amber-500 dark:text-amber-400 font-bold text-sm">○</span>
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
                        {role.level !== undefined && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                            role.level >= 9 
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : role.level >= 7
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : role.level >= 5
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : role.level >= 3
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
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

        {/* 4. Pages - Show pages for the selected role with Common + Category sections */}
        <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-2">
          <div className="text-sm font-semibold mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiFile className="text-purple-600" />
              Pages
              {selectedRoleId && selectedRole && (
                <span className="text-xs font-normal text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                  {selectedRole.display_name || selectedRole.name}
                </span>
              )}
            </div>
            <span className="text-xs font-normal text-gray-500">
              {selectedRoleId ? `${rolePagesSelectedIds.size} pages assigned` : ''}
            </span>
          </div>

          {/* Breadcrumb - Permission Path */}
          {(selectedAdminId || selectedRoleId) && (
            <div className="mb-2 p-2 bg-gradient-to-r from-purple-50 to-gray-50 dark:from-purple-900/20 dark:to-gray-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
              <div className="flex items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-400 flex-wrap">
                <span className="font-medium text-gray-700 dark:text-gray-300">Category:</span>
                <span className={`px-1.5 py-0.5 rounded ${
                  category === 'common' ? 'bg-gray-200 text-gray-700' :
                  category === 'pump' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {category === 'common' ? 'Common' : category === 'pump' ? 'Pump' : 'Business ERP'}
                </span>
                {selectedAdminId && (
                  <>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Admin:</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 truncate max-w-[60px]">
                      {superAdmins.find(a => a.id === selectedAdminId)?.name || 'Admin'}
                    </span>
                  </>
                )}
                {selectedRole && (
                  <>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Role:</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 truncate max-w-[60px]">
                      {selectedRole.display_name || selectedRole.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Microcopy */}
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 italic">
            Check pages to grant access to this role.
          </div>

          {/* Action buttons - Select All, Deselect All, Save */}
          {selectedRoleId && (rolePages.length > 0 || category === 'common') && (
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSelectAllRolePages}
                className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAllRolePages}
                className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              >
                Deselect All
              </button>
              <div className="flex-1" />
              {rolePagesLoading && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Loading...
                </span>
              )}
              {rolePagesSaving && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  Saving...
                </span>
              )}
              <button
                onClick={handleSaveRolePages}
                disabled={!rolePagesHasChanges || rolePagesSaving}
                className={`text-xs px-3 py-1 rounded font-medium transition ${
                  rolePagesHasChanges && !rolePagesSaving
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700'
                }`}
              >
                {rolePagesSaving ? 'Saving...' : rolePagesHasChanges ? 'Save' : 'Saved'}
              </button>
            </div>
          )}

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {!selectedRoleId ? (
              <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                ⚠️ Select a Role to see pages
              </div>
            ) : rolePagesLoading ? (
              <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-700 flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Loading pages for {selectedRole?.display_name || selectedRole?.name}...
              </div>
            ) : (
              <>
                {/* Section A: Common Pages (Only show assigned) */}
                {(() => {
                  const assignedCommonPages = COMMON_PAGES.filter(p => rolePagesSelectedIds.has(p.path));
                  if (assignedCommonPages.length === 0) return null;
                  return (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <FiGlobe className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Common Pages</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        Shared
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">{assignedCommonPages.length}</span>
                  </div>
                  <div className="p-2 space-y-1 bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="text-[9px] text-gray-500 dark:text-gray-400 px-2 py-1 italic flex items-center gap-1">
                      <FiInfo className="w-3 h-3" />
                      These pages apply across all modules.
                    </div>
                    {assignedCommonPages.map((page) => {
                      const isSelected = rolePagesSelectedIds.has(page.path);
                      return (
                        <div
                          key={page.id}
                          onClick={() => toggleRolePageSelection(page.path)}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition ${
                            isSelected
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                              : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRolePageSelection(page.path)}
                            className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                              {page.name}
                            </div>
                            <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                              {page.path}
                            </div>
                          </div>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 font-medium shrink-0">
                            COMMON
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                  );
                })()}

                {/* Section B: Category Pages (Only show assigned) */}
                {category !== 'common' && (() => {
                  const assignedCategoryPages = filteredRolePages.filter(p => rolePagesSelectedIds.has(p.path));
                  if (assignedCategoryPages.length === 0) return null;
                  return (
                  <div className={`border rounded-lg overflow-hidden ${
                    category === 'pump' ? 'border-orange-200 dark:border-orange-800' : 'border-blue-200 dark:border-blue-800'
                  }`}>
                    <div className={`flex items-center justify-between px-3 py-2 ${
                      category === 'pump' 
                        ? 'bg-orange-50 dark:bg-orange-900/30' 
                        : 'bg-blue-50 dark:bg-blue-900/30'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FiPackage className={`w-3.5 h-3.5 ${category === 'pump' ? 'text-orange-600' : 'text-blue-600'}`} />
                        <span className={`text-xs font-semibold ${category === 'pump' ? 'text-orange-700 dark:text-orange-300' : 'text-blue-700 dark:text-blue-300'}`}>
                          {category === 'pump' ? 'Pump Management Pages' : 'Business ERP Pages'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">{assignedCategoryPages.length}</span>
                    </div>
                    
                    <div className={`p-2 space-y-1 ${
                      category === 'pump' ? 'bg-orange-50/30 dark:bg-orange-900/10' : 'bg-blue-50/30 dark:bg-blue-900/10'
                    }`}>
                      {assignedCategoryPages.map((page, pageIndex) => {
                          const isSelected = rolePagesSelectedIds.has(page.path);
                          const uniqueKey = `${page.routeId || pageIndex}-${page.id || page.path}`;
                          const scopeBadge = category === 'pump' ? 'PUMP' : 'ERP';
                          const scopeColor = category === 'pump' 
                            ? 'bg-orange-200 text-orange-700 dark:bg-orange-800 dark:text-orange-300' 
                            : 'bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-300';
                          
                          return (
                            <div
                              key={uniqueKey}
                              onClick={() => toggleRolePageSelection(page.path)}
                              className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition ${
                                isSelected
                                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                                  : category === 'pump'
                                  ? 'border-orange-200 bg-white dark:bg-gray-800 dark:border-orange-800 hover:bg-orange-50/50'
                                  : 'border-blue-200 bg-white dark:bg-gray-800 dark:border-blue-800 hover:bg-blue-50/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRolePageSelection(page.path)}
                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {page.name || page.path || page.id}
                                </div>
                                <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-2">
                                  <span>{page.path || page.id}</span>
                                  {page.module && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                      {page.module}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-medium shrink-0 ${scopeColor}`}>
                                {scopeBadge}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  );
                })()}

                {/* Show message if no assigned pages */}
                {rolePagesSelectedIds.size === 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-4 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <FiInfo className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                    No pages assigned to this role yet.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Unified Bottom Section - Shows Roles or Pages based on toggle */}
      <div className={`flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t-2 ${
        bottomViewMode === 'pages' ? 'border-purple-200 dark:border-purple-800' : 'border-emerald-200 dark:border-emerald-800'
      } rounded-t-xl shadow-lg relative z-20`}>
        {/* Header Bar with Toggle between Roles and Pages - entire bar is clickable to expand/collapse */}
        <div 
          onClick={(e) => {
            // Only toggle if clicking on the bar itself, not on buttons/selects/inputs inside
            if ((e.target as HTMLElement).closest('button, select, input, .no-toggle')) return;
            if (bottomViewMode === 'pages') {
              setIsPagesDrawerExpanded(!isPagesDrawerExpanded);
            } else {
              setIsRolesDrawerExpanded(!isRolesDrawerExpanded);
            }
          }}
          className={`flex items-center justify-between px-4 py-2 border-b rounded-t-xl cursor-pointer transition-colors ${
            bottomViewMode === 'pages' 
              ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50' 
              : 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
          }`}
        >
          {/* Expand/Collapse Toggle - Always visible at the left */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (bottomViewMode === 'pages') {
                setIsPagesDrawerExpanded(!isPagesDrawerExpanded);
              } else {
                setIsRolesDrawerExpanded(!isRolesDrawerExpanded);
              }
            }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all mr-3 ${
              bottomViewMode === 'pages'
                ? 'hover:bg-purple-200 dark:hover:bg-purple-800/50'
                : 'hover:bg-emerald-200 dark:hover:bg-emerald-800/50'
            }`}
            title={`Click to ${(bottomViewMode === 'pages' ? isPagesDrawerExpanded : isRolesDrawerExpanded) ? 'collapse' : 'expand'}`}
          >
            <div 
              className={`p-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform duration-300 ${
                (bottomViewMode === 'pages' ? isPagesDrawerExpanded : isRolesDrawerExpanded) ? 'rotate-180' : ''
              }`}
            >
              <FiChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">
              {(bottomViewMode === 'pages' ? isPagesDrawerExpanded : isRolesDrawerExpanded) ? 'Collapse' : 'Expand'}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap flex-1">
            {/* Toggle Buttons - Roles / Pages */}
            <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => {
                  setBottomViewMode('roles');
                  setIsRolesDrawerExpanded(true);
                  setBottomSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  bottomViewMode === 'roles'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <FiShield className="w-3.5 h-3.5" />
                All Roles
              </button>
              <button
                onClick={() => {
                  setBottomViewMode('pages');
                  setIsPagesDrawerExpanded(true);
                  setBottomSearchQuery('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  bottomViewMode === 'pages'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <FiFile className="w-3.5 h-3.5" />
                All Pages
              </button>
            </div>

            {/* Context-specific filters */}
            {bottomViewMode === 'roles' ? (
              <>
                <span className="text-xs text-gray-500">({rolesForSelectedAdmin.length} roles)</span>
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
                    Assigned ({assignedRoleIds.length})
                  </button>
                  <button
                    onClick={() => setRolesFilter('unassigned')}
                    className={`px-2 py-0.5 text-xs rounded transition ${
                      rolesFilter === 'unassigned' ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm font-medium' : 'text-gray-600'
                    }`}
                  >
                    Unassigned ({rolesForSelectedAdmin.length - assignedRoleIds.length})
                  </button>
                </div>
                {/* Search bar for roles */}
                <div className="relative ml-2" onClick={(e) => e.stopPropagation()}>
                  <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={bottomSearchQuery}
                    onChange={(e) => setBottomSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </>
            ) : (
              <>
                <span className="text-xs text-gray-500">
                  {selectedRoleId && roleScopedPages
                    ? `(${roleScopedPages.counts.assigned + roleScopedPages.counts.inherited}/${roleScopedPages.counts.assigned + roleScopedPages.counts.inherited + roleScopedPages.counts.candidate} pages for role)`
                    : selectedAdminId && totalPagesInPool > 0
                    ? `(${totalPagesInPool} pages in pool)`
                    : `(${totalPagesCount} pages total)`
                  }
                </span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ml-2">
                  <button
                    onClick={() => setPagesAssignedFilter('all')}
                    className={`px-2 py-0.5 text-xs rounded transition ${
                      pagesAssignedFilter === 'all' ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm font-medium' : 'text-gray-600'
                    }`}
                  >
                    All {selectedRoleId && roleScopedPages ? `(${roleScopedPages.counts.assigned + roleScopedPages.counts.inherited + roleScopedPages.counts.candidate})` : ''}
                  </button>
                  <button
                    onClick={() => setPagesAssignedFilter('assigned')}
                    className={`px-2 py-0.5 text-xs rounded transition ${
                      pagesAssignedFilter === 'assigned' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm font-medium' : 'text-gray-600'
                    }`}
                    disabled={!selectedRoleId}
                    title={!selectedRoleId ? 'Select a role first' : undefined}
                  >
                    Assigned ({selectedRoleId && roleScopedPages ? roleScopedPages.counts.assigned + roleScopedPages.counts.inherited : '-'})
                  </button>
                  <button
                    onClick={() => setPagesAssignedFilter('unassigned')}
                    className={`px-2 py-0.5 text-xs rounded transition ${
                      pagesAssignedFilter === 'unassigned' ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm font-medium' : 'text-gray-600'
                    }`}
                    disabled={!selectedRoleId}
                    title={!selectedRoleId ? 'Select a role first' : undefined}
                  >
                    Unassigned ({selectedRoleId && roleScopedPages ? roleScopedPages.counts.candidate : '-'})
                  </button>
                </div>
                {/* Group By Toggle: Module or Role */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setPagesGroupBy('role');
                      setPagesModuleFilter(null);
                      setPagesRoleFilter(null);
                    }}
                    className={`px-2 py-0.5 text-xs rounded transition flex items-center gap-1 ${
                      pagesGroupBy === 'role' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm font-medium' : 'text-gray-600'
                    }`}
                  >
                    <FiShield className="w-3 h-3" />
                    By Role
                  </button>
                  <button
                    onClick={() => {
                      setPagesGroupBy('module');
                      setPagesModuleFilter(null);
                      setPagesRoleFilter(null);
                    }}
                    className={`px-2 py-0.5 text-xs rounded transition flex items-center gap-1 ${
                      pagesGroupBy === 'module' ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm font-medium' : 'text-gray-600'
                    }`}
                  >
                    <FiPackage className="w-3 h-3" />
                    By Module
                  </button>
                </div>
                {/* Filter dropdown based on groupBy mode */}
                <div onClick={(e) => e.stopPropagation()}>
                  {pagesGroupBy === 'role' ? (
                    <select
                      value={pagesRoleFilter || ''}
                      onChange={(e) => setPagesRoleFilter(e.target.value || null)}
                      className="ml-2 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      <option value="">All Roles</option>
                      {allPagesGroupedByRole.map(g => (
                        <option key={g.roleId} value={g.roleId}>
                          {g.roleName} ({g.pages.length})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={pagesModuleFilter || ''}
                      onChange={(e) => setPagesModuleFilter(e.target.value || null)}
                      className="ml-2 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                    >
                      <option value="">All Modules</option>
                      {allPagesGroupedByModule.map(g => (
                        <option key={g.moduleId} value={g.moduleId}>
                          {g.moduleName} ({g.pages.length})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Search bar for pages */}
                <div className="relative ml-2" onClick={(e) => e.stopPropagation()}>
                  <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search pages..."
                    value={bottomSearchQuery}
                    onChange={(e) => setBottomSearchQuery(e.target.value)}
                    className="pl-7 pr-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-36 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats and actions */}
            {bottomViewMode === 'roles' ? (
              <>
                {selectedAdminId && (
                  <button
                    onClick={() => setIsRoleAssignMode(!isRoleAssignMode)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                      isRoleAssignMode
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {isRoleAssignMode ? "✓ Done" : "Add/Remove"}
                  </button>
                )}
                {/* Stats badge */}
                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <FiUsers className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {allRoles.reduce((sum, r) => sum + (r.userCount || r.users?.length || 0), 0)} users
                  </span>
                </div>
              </>
            ) : (
              /* Pages view - Add/Remove button */
              <>
                {selectedRoleId && (
                  <button
                    onClick={async () => {
                      if (isPageAssignMode && rolePagesHasChanges) {
                        // Save changes when clicking "Done" if there are unsaved changes
                        await handleSaveRolePages();
                      }
                      setIsPageAssignMode(!isPageAssignMode);
                    }}
                    disabled={isPageAssignMode && rolePagesSaving}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                      isPageAssignMode
                        ? rolePagesSaving 
                          ? "bg-yellow-600 text-white cursor-wait"
                          : "bg-green-600 text-white hover:bg-green-700"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {isPageAssignMode 
                      ? rolePagesSaving 
                        ? "Saving..." 
                        : rolePagesHasChanges 
                          ? "✓ Save & Done" 
                          : "✓ Done" 
                      : "Add/Remove"}
                  </button>
                )}
                {/* Stats badge for pages - format depends on pagesGroupBy mode */}
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <FiPackage className="w-3 h-3 text-purple-600" />
                  <span className="text-purple-700 dark:text-purple-400">
                    {selectedRoleId && roleScopedPages
                      ? pagesGroupBy === 'role'
                        // By Role mode: show X/X (assigned/assigned) - only showing assigned pages
                        ? `${roleScopedPages.counts.assigned + roleScopedPages.counts.inherited}/${roleScopedPages.counts.assigned + roleScopedPages.counts.inherited} pages`
                        // By Module mode: show X/Y (assigned/total candidates)
                        : `${roleScopedPages.counts.assigned + roleScopedPages.counts.inherited}/${roleScopedPages.counts.assigned + roleScopedPages.counts.inherited + roleScopedPages.counts.candidate} pages`
                      : selectedAdminId && totalPagesInPool > 0
                      ? `${totalPagesInPool} pages in pool`
                      : `${allPagesGroupedByModule.length} modules`}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Content Area - Shows Roles or Pages */}
        {((bottomViewMode === 'pages' && isPagesDrawerExpanded) || (bottomViewMode === 'roles' && isRolesDrawerExpanded)) && (
          <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50 max-h-64 overflow-y-auto">
            {/* ROLES CONTENT */}
            {bottomViewMode === 'roles' && (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
                {rolesForSelectedAdmin
                  .filter((role) => {
                    const isAssigned = assignedRoleIds.includes(role.id);
                    const matchesFilter = rolesFilter === 'all' || 
                      (rolesFilter === 'assigned' && isAssigned) ||
                      (rolesFilter === 'unassigned' && !isAssigned);
                    // Search filter
                    const searchLower = bottomSearchQuery.toLowerCase().trim();
                    const matchesSearch = !searchLower || 
                      (role.name || '').toLowerCase().includes(searchLower) ||
                      (role.display_name || '').toLowerCase().includes(searchLower);
                    return matchesFilter && matchesSearch;
                  })
                  .map((role) => {
                    const isSelected = selectedRoleId === role.id;
                    const userCount = role.userCount || role.users?.length || 0;
                    const isAssigned = assignedRoleIds.includes(role.id);
                    const selectedAdmin = superAdmins.find(a => a.id === selectedAdminId);
                    const adminRole = selectedAdmin?.role || 'SUPER_ADMIN';
                    const isProtectedRole = isRoleProtected(role.name, adminRole);
                    
                    return (
                      <div key={role.id} className="relative">
                        {isRoleAssignMode && selectedAdminId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRoleAssignment(role.id, role.name);
                            }}
                            className={`absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-transform hover:scale-110 ${
                              isProtectedRole && isAssigned
                                ? "bg-amber-500 hover:bg-amber-600 text-white cursor-not-allowed"
                                : isAssigned 
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                            title={isProtectedRole && isAssigned ? 'This role is protected and cannot be removed' : undefined}
                          >
                            {isProtectedRole && isAssigned ? '🔒' : isAssigned ? '−' : '+'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (isRoleAssignMode && selectedAdminId) {
                              toggleRoleAssignment(role.id, role.name);
                            } else {
                              setSelectedRoleId(role.id);
                            }
                          }}
                          title={role.display_name || role.name}
                          className={`w-full text-left rounded-lg border p-2 text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900/40 ring-2 ring-yellow-400 shadow-md'
                              : isAssigned
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20 hover:border-green-400'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-yellow-300 hover:bg-yellow-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-xs font-medium truncate ${
                              isSelected 
                                ? 'text-yellow-800 dark:text-yellow-200' 
                                : isAssigned 
                                ? 'text-green-700 dark:text-green-300' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {role.display_name || role.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-gray-500 dark:text-gray-400">
                                {userCount} users
                              </span>
                              <span className="text-[9px] text-purple-600 dark:text-purple-400 font-medium">
                                {getPageCountForRole(role)} pages
                              </span>
                            </div>
                            {role.level && (
                              <span className={`text-[9px] px-1 py-0.5 rounded ${
                                isSelected ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' : isAssigned ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                L{role.level}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* PAGES CONTENT */}
            {bottomViewMode === 'pages' && (
              <>
                {/* ========== ROLE-SCOPED VIEW (when a role is selected) ========== */}
                {selectedRoleId && roleScopedPages ? (
                  <div className="space-y-4">
                    {/* Show info banner about which role's pages are shown */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <FiInfo className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                      <span className="text-xs text-yellow-700 dark:text-yellow-300">
                        Showing pages for role: <strong>{selectedRole?.name?.replace(/_/g, ' ')}</strong>
                        {pagesGroupBy === 'role' 
                          ? <span className="ml-2 text-indigo-600 dark:text-indigo-400">(By Role: showing only assigned pages)</span>
                          : <span className="ml-2 text-purple-600 dark:text-purple-400">(By Module: showing all candidate pages)</span>
                        }
                        {roleScopedPages.counts.inherited > 0 && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">(includes {roleScopedPages.counts.inherited} inherited BASE_USER pages)</span>
                        )}
                      </span>
                    </div>
                    
                    {/* Loading indicator */}
                    {roleScopedPagesLoading && (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                        <p className="text-xs text-gray-500 mt-2">Loading role pages...</p>
                      </div>
                    )}
                    
                    {/* Get pages to display based on pagesGroupBy mode AND assignedFilter */}
                    {!roleScopedPagesLoading && (() => {
                      // Combine assigned and inherited into one "assigned" group
                      const assignedPages = [
                        ...roleScopedPages.assignedPages.map(p => ({
                          id: p.id,
                          name: p.displayName,
                          path: p.route,
                          module: p.moduleCode,
                          accessType: p.accessType
                        })),
                        ...roleScopedPages.inheritedPages.map(p => ({
                          id: p.id,
                          name: p.displayName,
                          path: p.route,
                          module: p.moduleCode,
                          accessType: p.accessType
                        }))
                      ];
                      
                      const candidatePages = roleScopedPages.candidatePages.map(p => ({
                        id: p.id,
                        name: p.displayName,
                        path: p.route,
                        module: p.moduleCode,
                        accessType: 'CANDIDATE'
                      }));
                      
                      // KEY FIX: pagesGroupBy determines what pages to show:
                      // - "role" mode: Show ONLY assigned pages (pages this role HAS)
                      // - "module" mode: Show ALL candidate pages (pages this role COULD have)
                      let pagesToShow: typeof assignedPages;
                      if (pagesGroupBy === 'role') {
                        // "By Role" mode: Show only assigned pages, apply assignedFilter within assigned
                        pagesToShow = pagesAssignedFilter === 'unassigned' 
                          ? [] // In By Role mode, there are no unassigned pages to show
                          : assignedPages;
                      } else {
                        // "By Module" mode: Show all candidates, apply assignedFilter
                        pagesToShow = pagesAssignedFilter === 'assigned' 
                          ? assignedPages
                          : pagesAssignedFilter === 'unassigned'
                          ? candidatePages
                          : [...assignedPages, ...candidatePages];
                      }
                      
                      if (pagesToShow.length === 0) {
                        return (
                          <div className="text-center py-6">
                            <FiFile className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {pagesGroupBy === 'role' && pagesAssignedFilter === 'unassigned'
                                ? 'Switch to "By Module" mode to see unassigned pages'
                                : pagesAssignedFilter === 'assigned' 
                                ? 'No pages assigned to this role yet'
                                : pagesAssignedFilter === 'unassigned'
                                ? 'All pages for this role are assigned'
                                : 'No pages available for this role'}
                            </p>
                            {pagesGroupBy === 'role' && pagesAssignedFilter === 'unassigned' && (
                              <button
                                onClick={() => setPagesGroupBy('module')}
                                className="mt-2 text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                              >
                                Switch to By Module
                              </button>
                            )}
                          </div>
                        );
                      }
                      
                      // Group pages by module
                      const moduleMap = new Map<string, typeof pagesToShow>();
                      pagesToShow.forEach(page => {
                        const mod = page.module || 'Other';
                        if (!moduleMap.has(mod)) moduleMap.set(mod, []);
                        moduleMap.get(mod)!.push(page);
                      });
                      
                      return Array.from(moduleMap.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([moduleName, pages]) => (
                          <div key={moduleName} className="space-y-2">
                            <div className="flex items-center gap-2 pb-1 border-b border-purple-100 dark:border-purple-800">
                              <FiPackage className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                {moduleName}
                              </span>
                              <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                                {pages.length} pages
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                              {pages.map((page, idx) => {
                                const isSelected = bottomSelectedPageId === page.id;
                                // Use rolePagesSelectedIds for real-time toggle state
                                const isInLocalSelection = rolePagesSelectedIds.has(page.path);
                                const isInherited = page.accessType === 'BASE_USER' || page.accessType === 'INHERITED';
                                // isAssigned reflects the CURRENT toggle state from rolePagesSelectedIds
                                const isAssigned = isInLocalSelection || isInherited;
                                const isCandidate = !isAssigned && !isInherited;
                                return (
                                  <div
                                    key={`${page.id}-${idx}`}
                                    className="relative"
                                  >
                                    {/* Add/Remove button overlay - only for non-inherited pages */}
                                    {isPageAssignMode && !isInherited && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleRolePageSelection(page.path);
                                        }}
                                        className={`absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-transform hover:scale-110 ${
                                          isInLocalSelection 
                                            ? "bg-red-500 hover:bg-red-600 text-white"
                                            : "bg-green-500 hover:bg-green-600 text-white"
                                        }`}
                                      >
                                        {isInLocalSelection ? '−' : '+'}
                                      </button>
                                    )}
                                    {/* Inherited badge */}
                                    {isInherited && (
                                      <div className="absolute -top-1 -right-1 z-10 px-1.5 py-0.5 text-[8px] font-bold bg-blue-500 text-white rounded-full" title="Inherited from BASE_USER">
                                        BASE
                                      </div>
                                    )}
                                    <div
                                      onClick={() => {
                                        if (isPageAssignMode && !isInherited) {
                                          toggleRolePageSelection(page.path);
                                        } else if (!isPageAssignMode) {
                                          setBottomSelectedPageId(isSelected ? null : page.id);
                                        }
                                      }}
                                      className={`p-2 rounded-lg border cursor-pointer transition-colors group ${
                                        isSelected
                                          ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-300 shadow-sm'
                                          : isInherited
                                          ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:border-blue-400'
                                          : isInLocalSelection
                                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20 hover:border-green-400'
                                          : 'border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-900/10 hover:border-gray-400'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-0.5">
                                        {isInherited ? (
                                          <FiLock className="w-3 h-3 text-blue-500" title="Inherited - cannot be removed" />
                                        ) : isInLocalSelection ? (
                                          <FiCheckCircle className="w-3 h-3 text-green-500" />
                                        ) : (
                                          <FiPlus className="w-3 h-3 text-gray-400" />
                                        )}
                                        <Link href={page.path || '#'} onClick={(e) => e.stopPropagation()}>
                                          <FiExternalLink className="w-2.5 h-2.5 text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                      </div>
                                      <div className={`text-xs font-medium truncate ${isSelected ? 'text-purple-700 dark:text-purple-300' : isInherited ? 'text-blue-700 dark:text-blue-300' : isInLocalSelection ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {page.name || page.id}
                                      </div>
                                      <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                                        {page.path}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                ) : (
                  /* ========== NO ROLE SELECTED - Show overview ========== */
                  <>
                    {/* Prompt to select a role */}
                    <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <FiInfo className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-xs text-blue-700 dark:text-blue-300">
                        Select a role above to see its assigned/unassigned pages. Currently showing all pages overview.
                      </span>
                    </div>
                    
                    {(pagesGroupBy === 'module' ? filteredPagesForOverview : filteredPagesForOverviewByRole).length === 0 ? (
                      <div className="text-center py-6">
                        <FiFile className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No pages available</p>
                      </div>
                    ) : pagesGroupBy === 'role' ? (
                      /* ========== PAGES GROUPED BY ROLE (Overview) ========== */
                      <div className="space-y-4">
                        {filteredPagesForOverviewByRole.map(({ roleId, roleName, pages }) => {
                          const isFullySelected = isRoleGroupFullySelected(pages);
                          const isPartiallySelected = isRoleGroupPartiallySelected(pages);
                          return (
                          <div key={roleId} className="space-y-2">
                            <div className="flex items-center gap-2 pb-1 border-b border-indigo-100 dark:border-indigo-800">
                              {/* Select All checkbox for this role group */}
                              {selectedRoleId && (
                                <input
                                  type="checkbox"
                                  checked={isFullySelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = isPartiallySelected && !isFullySelected;
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleRoleGroupPages(pages, !isFullySelected);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                                  title={isFullySelected ? 'Deselect all pages in this role' : 'Select all pages in this role'}
                                />
                              )}
                              <FiShield className="w-3.5 h-3.5 text-indigo-600" />
                              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                {roleName}
                              </span>
                              <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                                {pages.length} pages
                              </span>
                              {/* Show selected count when a role is selected */}
                              {selectedRoleId && (
                                <span className="text-[10px] text-green-600 dark:text-green-400 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 rounded">
                                  {pages.filter(p => rolePagesSelectedIds.has(p.path)).length} selected
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                              {pages.map((page, idx) => {
                                const isSelected = bottomSelectedPageId === page.id;
                                const isPageChecked = rolePagesSelectedIds.has(page.path);
                                return (
                                  <div
                                    key={`${page.id}-${idx}`}
                                    onClick={() => {
                                      if (selectedRoleId) {
                                        // Toggle page selection when role is selected
                                        setRolePagesSelectedIds(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(page.path)) {
                                            newSet.delete(page.path);
                                          } else {
                                            newSet.add(page.path);
                                          }
                                          return newSet;
                                        });
                                      } else {
                                        setBottomSelectedPageId(isSelected ? null : page.id);
                                      }
                                    }}
                                    className={`p-2 rounded-lg border cursor-pointer transition-colors group ${
                                      isSelected
                                        ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-300 shadow-sm'
                                        : isPageChecked
                                        ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                                        : 'border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 hover:border-indigo-400'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      {selectedRoleId ? (
                                        <input
                                          type="checkbox"
                                          checked={isPageChecked}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            setRolePagesSelectedIds(prev => {
                                              const newSet = new Set(prev);
                                              if (newSet.has(page.path)) {
                                                newSet.delete(page.path);
                                              } else {
                                                newSet.add(page.path);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-3.5 h-3.5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                                        />
                                      ) : (
                                        <FiFile className={`w-3 h-3 ${isSelected ? 'text-indigo-600' : 'text-indigo-500'}`} />
                                      )}
                                      <Link href={page.path || '#'} onClick={(e) => e.stopPropagation()}>
                                        <FiExternalLink className="w-2.5 h-2.5 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </Link>
                                    </div>
                                    <div className={`text-xs font-medium truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {page.name || page.id}
                                    </div>
                                    <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                                      {page.module}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    ) : (
                      /* ========== PAGES GROUPED BY MODULE (Overview) ========== */
                      <div className="space-y-4">
                        {filteredPagesForOverview.map(({ moduleId, moduleName, pages }) => {
                          const isFullySelected = isRoleGroupFullySelected(pages);
                          const isPartiallySelected = isRoleGroupPartiallySelected(pages);
                          return (
                          <div key={moduleId} className="space-y-2">
                            <div className="flex items-center gap-2 pb-1 border-b border-purple-100 dark:border-purple-800">
                              {/* Select All checkbox for this module group */}
                              {selectedRoleId && (
                                <input
                                  type="checkbox"
                                  checked={isFullySelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = isPartiallySelected && !isFullySelected;
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleRoleGroupPages(pages, !isFullySelected);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500 cursor-pointer"
                                  title={isFullySelected ? 'Deselect all pages in this module' : 'Select all pages in this module'}
                                />
                              )}
                              <FiPackage className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                                {moduleName}
                              </span>
                              <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                                {pages.length} pages
                              </span>
                              {/* Show selected count when a role is selected */}
                              {selectedRoleId && (
                                <span className="text-[10px] text-green-600 dark:text-green-400 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/30 rounded">
                                  {pages.filter(p => rolePagesSelectedIds.has(p.path)).length} selected
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                              {pages.map((page, idx) => {
                                const isSelected = bottomSelectedPageId === page.id;
                                const isPageChecked = rolePagesSelectedIds.has(page.path);
                                return (
                                  <div
                                    key={`${page.id}-${idx}`}
                                    onClick={() => {
                                      if (selectedRoleId) {
                                        // Toggle page selection when role is selected
                                        setRolePagesSelectedIds(prev => {
                                          const newSet = new Set(prev);
                                          if (newSet.has(page.path)) {
                                            newSet.delete(page.path);
                                          } else {
                                            newSet.add(page.path);
                                          }
                                          return newSet;
                                        });
                                      } else {
                                        setBottomSelectedPageId(isSelected ? null : page.id);
                                      }
                                    }}
                                    className={`p-2 rounded-lg border cursor-pointer transition-colors group ${
                                      isSelected
                                        ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-300 shadow-sm'
                                        : isPageChecked
                                        ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                                        : 'border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 hover:border-purple-400'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      {selectedRoleId ? (
                                        <input
                                          type="checkbox"
                                          checked={isPageChecked}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            setRolePagesSelectedIds(prev => {
                                              const newSet = new Set(prev);
                                              if (newSet.has(page.path)) {
                                                newSet.delete(page.path);
                                              } else {
                                                newSet.add(page.path);
                                              }
                                              return newSet;
                                            });
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-3.5 h-3.5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                                        />
                                      ) : (
                                        <FiFile className={`w-3 h-3 ${isSelected ? 'text-purple-600' : 'text-purple-500'}`} />
                                      )}
                                      <Link href={page.path || '#'} onClick={(e) => e.stopPropagation()}>
                                        <FiExternalLink className="w-2.5 h-2.5 text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </Link>
                                    </div>
                                    <div className={`text-xs font-medium truncate ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {page.name || page.id}
                                    </div>
                                    <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                                      {page.path}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
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

      {/* Toast Notification for Protected Modules and Missing Selections */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 max-w-md px-4 py-3 rounded-lg shadow-lg animate-slide-up flex items-start gap-3 ${
          toastMessage.type === 'warning' 
            ? 'bg-yellow-50 border border-yellow-300 text-yellow-800 dark:bg-yellow-900/90 dark:border-yellow-700 dark:text-yellow-200'
            : toastMessage.type === 'error'
            ? 'bg-red-50 border border-red-300 text-red-800 dark:bg-red-900/90 dark:border-red-700 dark:text-red-200'
            : 'bg-blue-50 border border-blue-300 text-blue-800 dark:bg-blue-900/90 dark:border-blue-700 dark:text-blue-200'
        }`}>
          {toastMessage.type === 'warning' ? (
            <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-yellow-600" />
          ) : toastMessage.type === 'error' ? (
            <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          ) : (
            <FiInfo className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {toastMessage.type === 'warning' ? 'Warning' : toastMessage.type === 'error' ? 'Error' : 'Info'}
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
