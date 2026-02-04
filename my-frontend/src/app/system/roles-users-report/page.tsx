"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { FiUsers, FiPackage, FiGrid, FiShield, FiRefreshCw, FiChevronUp, FiCreditCard, FiFile, FiExternalLink, FiCheckCircle, FiLock, FiSearch, FiAlertCircle } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { triggerPermissionsRefresh } from "@/hooks/useEffectiveAccess";
import ClientManagementTabs from "@/components/common/ClientManagementTabs";
import { PAGE_REGISTRY, MODULES } from "@/common/config/page-registry";
import Link from "next/link";
// Note: Layout is provided by /app/system/layout.tsx

// ===== PAGE CLASSIFICATION LEGEND =====
// 🟢 Role Permitted: Page is assigned to this role (active and accessible)
// 🟡 Subscription Allowed: Page is available in subscription but not yet enabled for this role
// 🔴 Super Admin Restricted: Page is outside SA's pool - visible but CANNOT be enabled

// Types
type Module = {
  id: number | string;
  moduleKey: string;
  name: string;
  module_name?: string;
  display_name?: string;
  productType?: string;
  businessCategory?: string;
  pages?: Array<{ id: string; name?: string; path: string }>;
};

type Client = {
  id: string | number;  // Can be UUID string or integer
  name: string;
  email?: string;
  client_code?: string;
  productType?: string;
  status?: string;
  is_active?: boolean;
  modules_enabled?: string[] | null;  // Modules assigned by Enterprise Admin
};

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

type RolePage = {
  id: string;
  routeId?: number;
  path: string;
  name: string;
  module?: string;
  granted?: boolean;
  inherited?: boolean;
  accessType?: 'ASSIGNED' | 'INHERITED' | 'CANDIDATE';
  // New classification fields
  inSaPool?: boolean;  // Is this page in SA's approved pool from EA?
  inSubscription?: boolean;  // Is this page available in client's subscription?
};

type SubscriptionPlan = {
  id: number;
  plan_code: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  is_active?: boolean;
  is_popular?: boolean;
  sort_order?: number;
};

// Classification badge component
const PageClassificationBadge = ({ 
  accessType, 
  inSaPool, 
  inSubscription,
  isRestricted 
}: { 
  accessType?: string; 
  inSaPool?: boolean; 
  inSubscription?: boolean;
  isRestricted?: boolean;
}) => {
  if (isRestricted || !inSaPool) {
    return (
      <span 
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
        title="This page is outside your approved pool from Enterprise Admin. You cannot enable it."
      >
        🔴 SA Restricted
      </span>
    );
  }
  
  if (accessType === 'ASSIGNED') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
        🟢 Role Allowed
      </span>
    );
  }
  
  // CANDIDATE - in pool but not assigned
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
      🟡 Subscription Allowed
    </span>
  );
};

export default function RolesUsersReportPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.toUpperCase() === 'SUPER_ADMIN' || user?.userType === 'SUPER_ADMIN';

  // Roles to hide from SUPER_ADMIN (they shouldn't be able to assign these to clients)
  const HIDDEN_ROLES = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'];

  // Loading states
  const [loading, setLoading] = useState(true);
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [modules, setModules] = useState<Module[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);

  // Selection states
  const [selectedClientId, setSelectedClientId] = useState<string | number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  // Track assigned roles PER CLIENT using a Map
  const [clientRolesMap, setClientRolesMap] = useState<Record<string, number[]>>({});
  // Track current subscription plan PER CLIENT
  const [clientPlanMap, setClientPlanMap] = useState<Record<string, number | null>>({});
  
  // NOTE: Role/Page assignment modes REMOVED 
  // SA can now only ENABLE/DISABLE pages within their EA-approved pool
  // No Add/Remove functionality - only toggle switches
  
  // Edit mode for subscription only (kept for subscription management)
  const [isSubEditMode, setIsSubEditMode] = useState(false);

  // Get current plan for selected client
  const clientCurrentPlanId = useMemo(() => {
    if (!selectedClientId) return null;
    return clientPlanMap[String(selectedClientId)] ?? null;
  }, [selectedClientId, clientPlanMap]);

  // Get current plan details
  const clientCurrentPlan = useMemo(() => {
    if (!clientCurrentPlanId) return null;
    return subscriptionPlans.find(p => p.id === clientCurrentPlanId) || null;
  }, [clientCurrentPlanId, subscriptionPlans]);

  // Get assigned roles for current client
  const assignedRoleIds = useMemo(() => {
    if (!selectedClientId) return [];
    return clientRolesMap[String(selectedClientId)] || [];
  }, [selectedClientId, clientRolesMap]);

  // Set assigned roles for current client
  const setAssignedRoleIds = (roleIds: number[] | ((prev: number[]) => number[])) => {
    if (!selectedClientId) return;
    setClientRolesMap(prev => {
      const newRoleIds = typeof roleIds === 'function' 
        ? roleIds(prev[String(selectedClientId)] || [])
        : roleIds;
      return {
        ...prev,
        [String(selectedClientId)]: newRoleIds
      };
    });
  };

  // Pages for selected role
  const [rolePagesLoading, setRolePagesLoading] = useState(false);
  const [rolePages, setRolePages] = useState<RolePage[]>([]);
  const [rolePagesSaving, setRolePagesSaving] = useState(false);
  const [rolePagesSelectedIds, setRolePagesSelectedIds] = useState<Set<string>>(new Set());
  const [rolePagesInitialIds, setRolePagesInitialIds] = useState<Set<string>>(new Set());
  const [rolePagesHasChanges, setRolePagesHasChanges] = useState(false);

  // Collapsible Roles Drawer state
  const [isRolesDrawerExpanded, setIsRolesDrawerExpanded] = useState(false);
  const [rolesFilter, setRolesFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  
  // Bottom section context - toggle between roles and pages
  const [bottomSectionContext, setBottomSectionContext] = useState<'roles' | 'pages'>('pages');
  const [isPagesDrawerExpanded, setIsPagesDrawerExpanded] = useState(true);
  const [pagesAssignedFilter, setPagesAssignedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string | null>(null);
  const [bottomSelectedPageId, setBottomSelectedPageId] = useState<string | null>(null);
  const [pagesSearchQuery, setPagesSearchQuery] = useState<string>('');  // Search query for pages

  // Ref to track if roles were loaded (to prevent overwrite on load)
  const isRolesInitializedRef = useRef<boolean>(false);

  // Filter out SUPER_ADMIN and ENTERPRISE_ADMIN roles for display
  const visibleRoles = useMemo(() => {
    return allRoles.filter(role => {
      const roleName = (role.name || '').toUpperCase();
      return !HIDDEN_ROLES.includes(roleName);
    });
  }, [allRoles]);

  // Get selected client
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Get selected role
  const selectedRole = useMemo(() => {
    if (!selectedRoleId) return null;
    return allRoles.find(r => r.id === selectedRoleId) || null;
  }, [allRoles, selectedRoleId]);

  // Modules to hide from SUPER_ADMIN (enterprise-admin specific modules)
  const HIDDEN_MODULES = ['enterprise-admin', 'super-admin'];

  // SA-approved pages fetched from API
  const [saApprovedPages, setSaApprovedPages] = useState<{ moduleId: string; moduleName: string; pages: { id: string; name: string; path: string; status: string }[] }[]>([]);
  const [saApprovedPagesLoaded, setSaApprovedPagesLoaded] = useState(false);

  // Get all pages grouped by module for the Pages Overview section
  // For SUPER_ADMIN: When a role is selected, show only pages assigned to that role (from rolePages)
  // Otherwise, use SA-approved pages from API
  const allPagesGroupedByModule = useMemo(() => {
    // PRIORITY: When a role is selected, use rolePages (pages EA assigned to that role)
    // This ensures bottom section matches the top section (role-specific pages)
    if (isSuperAdmin && selectedRoleId && rolePages.length > 0) {
      const moduleMap = new Map<string, { moduleId: string; moduleName: string; pages: { id: string; name: string; path: string; status: string }[] }>();
      
      for (const page of rolePages) {
        const moduleId = page.module || 'other';
        
        if (!moduleMap.has(moduleId)) {
          const moduleMeta = MODULES[moduleId];
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
          status: 'active'
        });
      }
      
      return Array.from(moduleMap.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
    }
    
    // For SUPER_ADMIN without role selected: Use SA-approved pages from API
    if (isSuperAdmin && saApprovedPagesLoaded && saApprovedPages.length > 0) {
      // Filter by client's enabled modules if selected
      const clientEnabledModules = selectedClient?.modules_enabled 
        ? (Array.isArray(selectedClient.modules_enabled) ? selectedClient.modules_enabled : [])
        : null;
      
      if (clientEnabledModules && clientEnabledModules.length > 0) {
        return saApprovedPages
          .filter(m => clientEnabledModules.includes(m.moduleId))
          .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
      }
      return saApprovedPages;
    }
    
    // Fallback to PAGE_REGISTRY for non-SA or while loading
    const moduleMap = new Map<string, { moduleId: string; moduleName: string; pages: { id: string; name: string; path: string; status: string }[] }>();
    
    // Get client's enabled modules (if super admin and client selected)
    const clientEnabledModules = isSuperAdmin && selectedClient?.modules_enabled 
      ? (Array.isArray(selectedClient.modules_enabled) ? selectedClient.modules_enabled : [])
      : null;
    
    for (const page of PAGE_REGISTRY) {
      if (page.status !== 'active') continue; // Skip disabled/coming-soon pages
      
      const moduleId = page.module;
      
      // For SUPER_ADMIN: Hide enterprise-admin and super-admin modules
      if (isSuperAdmin && HIDDEN_MODULES.includes(moduleId)) {
        continue;
      }
      
      // For SUPER_ADMIN with client selected: Only show pages from client's enabled modules
      if (isSuperAdmin && clientEnabledModules && clientEnabledModules.length > 0) {
        if (!clientEnabledModules.includes(moduleId)) continue;
      }
      
      if (!moduleMap.has(moduleId)) {
        const moduleMeta = MODULES[moduleId];
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
    
    // Convert to array and sort by module name
    return Array.from(moduleMap.values()).sort((a, b) => a.moduleName.localeCompare(b.moduleName));
  }, [isSuperAdmin, selectedClient, saApprovedPages, saApprovedPagesLoaded, selectedRoleId, rolePages]);

  // Filtered pages based on selected module filter, assigned filter, and search query
  const filteredPagesForOverview = useMemo(() => {
    let groups = allPagesGroupedByModule;
    
    // Filter by module
    if (selectedModuleFilter) {
      groups = groups.filter(g => 
        g.moduleId === selectedModuleFilter || 
        g.moduleName.toLowerCase().includes(selectedModuleFilter.toLowerCase())
      );
    }
    
    // Filter by assigned status (check against rolePagesSelectedIds)
    if (pagesAssignedFilter !== 'all' && selectedRoleId) {
      groups = groups.map(g => ({
        ...g,
        pages: g.pages.filter(page => {
          const isAssigned = rolePagesSelectedIds.has(page.id) || rolePagesSelectedIds.has(page.path);
          return pagesAssignedFilter === 'assigned' ? isAssigned : !isAssigned;
        })
      })).filter(g => g.pages.length > 0);
    }
    
    // Filter by search query
    const searchLower = pagesSearchQuery.toLowerCase().trim();
    if (searchLower) {
      groups = groups.map(g => ({
        ...g,
        pages: g.pages.filter(page => 
          page.name.toLowerCase().includes(searchLower) ||
          page.path.toLowerCase().includes(searchLower)
        )
      })).filter(g => g.pages.length > 0);
    }
    
    return groups;
  }, [allPagesGroupedByModule, selectedModuleFilter, pagesAssignedFilter, rolePagesSelectedIds, selectedRoleId, pagesSearchQuery]);

  // Total pages count
  const totalPagesCount = useMemo(() => {
    return allPagesGroupedByModule.reduce((sum, g) => sum + g.pages.length, 0);
  }, [allPagesGroupedByModule]);

  // Load initial data
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsDataRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';

      // Fetch modules
      let modsList: Module[] = [];
      try {
        const modulesRes = await fetch(`/api/enterprise-admin/master-modules${cacheBuster}`, { 
          credentials: 'include',
          cache: forceRefresh ? 'no-store' : 'default'
        });
        if (modulesRes.ok) {
          const modulesData = await modulesRes.json();
          modsList = modulesData.ok && Array.isArray(modulesData.modules)
            ? modulesData.modules
            : Array.isArray(modulesData.data)
              ? modulesData.data
              : [];
        }
      } catch (modErr) {
        console.warn('[RolesUsersReport] Could not load modules:', modErr);
      }
      setModules(modsList);

      // Fetch clients
      try {
        const clientsRes = await fetch(`/api/system/clients${cacheBuster}`, { 
          credentials: 'include',
          cache: forceRefresh ? 'no-store' : 'default'
        });
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          const clientsList: Client[] = Array.isArray(clientsData.data)
            ? clientsData.data
            : Array.isArray(clientsData.clients)
              ? clientsData.clients
              : Array.isArray(clientsData)
                ? clientsData
                : [];
          setClients(clientsList);
        }
      } catch (clientErr) {
        console.warn('[RolesUsersReport] Could not load clients:', clientErr);
      }

      // Fetch all roles from reports endpoint
      try {
        const rolesRes = await fetch(`/api/reports/roles-users${cacheBuster}`, { 
          credentials: 'include',
          cache: forceRefresh ? 'no-store' : 'default'
        });
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          // The reports endpoint returns { success, summary, data: [...] }
          // where data contains roleId, roleName, roleDisplayName, roleLevel, userCount, users
          const rolesList = Array.isArray(rolesData.data)
            ? rolesData.data
            : [];
          console.log('[RolesUsersReport] Loaded', rolesList.length, 'roles from reports API');
          setAllRoles(rolesList.map((r: any) => ({
            id: r.roleId || r.id,
            name: r.roleName || r.name,
            display_name: r.roleDisplayName || r.display_name || r.roleName || r.name,
            description: r.roleDescription || r.description,
            level: r.roleLevel || r.level || 0,
            is_active: r.roleStatus === 'active' || r.is_active !== false,
            userCount: r.userCount || r.users?.length || 0,
            users: r.users || []
          })));
        } else {
          console.warn('[RolesUsersReport] Roles API returned:', rolesRes.status);
        }
      } catch (rolesErr) {
        console.warn('[RolesUsersReport] Could not load roles:', rolesErr);
      }

      // Fetch subscription plans (SuperAdmin only)
      if (isSuperAdmin) {
        try {
          const plansRes = await fetch(`/api/super-admin/subscriptions/plans${cacheBuster}`, { 
            credentials: 'include',
            cache: forceRefresh ? 'no-store' : 'default'
          });
          if (plansRes.ok) {
            const plansData = await plansRes.json();
            const plansList: SubscriptionPlan[] = plansData.ok && Array.isArray(plansData.plans)
              ? plansData.plans
              : [];
            console.log('[RolesUsersReport] Loaded', plansList.length, 'subscription plans');
            setSubscriptionPlans(plansList);
          }
        } catch (plansErr) {
          console.warn('[RolesUsersReport] Could not load subscription plans:', plansErr);
        }

        // Fetch SA-approved pages (only the pages Enterprise Admin has approved for this Super Admin)
        try {
          const approvedPagesRes = await fetch(`/api/super-admin/my-approved-pages${cacheBuster}`, { 
            credentials: 'include',
            cache: forceRefresh ? 'no-store' : 'default'
          });
          if (approvedPagesRes.ok) {
            const approvedData = await approvedPagesRes.json();
            if (approvedData.success && Array.isArray(approvedData.data)) {
              console.log('[RolesUsersReport] Loaded', approvedData.totalPages, 'SA-approved pages in', approvedData.totalModules, 'modules');
              setSaApprovedPages(approvedData.data);
              setSaApprovedPagesLoaded(true);
            }
          }
        } catch (approvedErr) {
          console.warn('[RolesUsersReport] Could not load SA-approved pages:', approvedErr);
          setSaApprovedPagesLoaded(true); // Mark as loaded to fallback to PAGE_REGISTRY
        }
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('[RolesUsersReport] Error:', err);
    } finally {
      setLoading(false);
      setIsDataRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load assigned roles when client is selected
  useEffect(() => {
    if (!selectedClientId) {
      setSelectedRoleId(null);
      isRolesInitializedRef.current = false;
      return;
    }

    // Check if we already have roles for this client in the map
    const existingRoles = clientRolesMap[String(selectedClientId)];
    if (existingRoles !== undefined) {
      // Already loaded, don't overwrite
      isRolesInitializedRef.current = true;
      return;
    }

    // Load saved roles for client (if any) from backend
    const loadClientRoles = async () => {
      try {
        console.log('🔄 Loading roles for client:', selectedClientId);
        const response = await fetch(`/api/system/clients/${selectedClientId}/roles`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const roleIds = Array.isArray(data.roles)
            ? data.roles.map((r: any) => typeof r === 'number' ? r : r.id)
            : Array.isArray(data.roleIds)
              ? data.roleIds
              : [];
          // Store in the map for this client
          setClientRolesMap(prev => ({
            ...prev,
            [String(selectedClientId)]: roleIds
          }));
          console.log('✅ Loaded', roleIds.length, 'roles for client');
        } else {
          // Initialize with empty array if backend fails
          setClientRolesMap(prev => ({
            ...prev,
            [String(selectedClientId)]: []
          }));
        }
        // Don't clear on failure - let user assign manually
      } catch (error) {
        console.warn('⚠️ Could not load client roles (will start with none):', error);
        // Initialize with empty array on error so user can assign
        setClientRolesMap(prev => ({
          ...prev,
          [String(selectedClientId)]: []
        }));
      }
      isRolesInitializedRef.current = true;
    };

    loadClientRoles();
  }, [selectedClientId, clientRolesMap]);

  // Load client's current subscription when client is selected
  useEffect(() => {
    if (!selectedClientId || !isSuperAdmin) return;

    // Check if we already have plan for this client in the map
    const existingPlan = clientPlanMap[String(selectedClientId)];
    if (existingPlan !== undefined) {
      // Already loaded, reset selectedPlanId to current plan
      setSelectedPlanId(existingPlan);
      return;
    }

    // Load current subscription for client from backend
    const loadClientSubscription = async () => {
      try {
        console.log('🔄 Loading subscription for client:', selectedClientId);
        const response = await fetch(`/api/system/clients/${selectedClientId}/subscription`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const planId = data.plan_id || data.planId || null;
          // Store in the map for this client
          setClientPlanMap(prev => ({
            ...prev,
            [String(selectedClientId)]: planId
          }));
          setSelectedPlanId(planId);
          console.log('✅ Loaded subscription plan:', planId);
        } else {
          // Initialize with null if backend fails
          setClientPlanMap(prev => ({
            ...prev,
            [String(selectedClientId)]: null
          }));
          setSelectedPlanId(null);
        }
      } catch (error) {
        console.warn('⚠️ Could not load client subscription:', error);
        setClientPlanMap(prev => ({
          ...prev,
          [String(selectedClientId)]: null
        }));
        setSelectedPlanId(null);
      }
    };

    loadClientSubscription();
  }, [selectedClientId, clientPlanMap, isSuperAdmin]);

  // State for role saving
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesSaveStatus, setRolesSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Save roles when user clicks save
  const handleSaveClientRoles = async () => {
    if (!selectedClientId) return;
    
    setRolesSaving(true);
    setRolesSaveStatus('idle');
    
    try {
      console.log('💾 Saving roles for client:', selectedClientId, 'roles:', assignedRoleIds);
      const response = await fetch(`/api/system/clients/${selectedClientId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roleIds: assignedRoleIds })
      });

      if (response.ok) {
        console.log('✅ Roles saved successfully');
        setRolesSaveStatus('success');
        // Clear success after 2 seconds
        setTimeout(() => setRolesSaveStatus('idle'), 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Save failed:', response.status, errorData);
        setRolesSaveStatus('error');
        alert(`Failed to save roles: ${errorData.error || response.status}`);
      }
    } catch (error) {
      console.error('❌ Error saving roles:', error);
      setRolesSaveStatus('error');
      alert('Error saving roles. Check console for details.');
    } finally {
      setRolesSaving(false);
    }
  };

  // Load pages for selected role
  useEffect(() => {
    if (!selectedRoleId) {
      setRolePages([]);
      setRolePagesSelectedIds(new Set());
      setRolePagesInitialIds(new Set());
      setRolePagesHasChanges(false);
      return;
    }

    const loadRolePages = async () => {
      setRolePagesLoading(true);
      try {
        console.log('📄 Loading pages for role:', selectedRoleId);
        const response = await fetch(`/api/rbac/roles/${selectedRoleId}/pages`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.pages)) {
            // API now returns scoped pages with accessType (ASSIGNED, INHERITED, CANDIDATE)
            setRolePages(data.pages);
            // Selected = assigned + inherited pages (not candidates)
            const grantedIds = new Set<string>(
              data.pages
                .filter((p: RolePage) => p.granted || p.accessType === 'ASSIGNED' || p.accessType === 'INHERITED')
                .map((p: RolePage) => p.id)
            );
            setRolePagesSelectedIds(grantedIds);
            setRolePagesInitialIds(new Set(grantedIds));
            setRolePagesHasChanges(false);
            
            const assignedCount = data.pages.filter((p: RolePage) => p.accessType === 'ASSIGNED').length;
            const inheritedCount = data.pages.filter((p: RolePage) => p.accessType === 'INHERITED').length;
            const candidateCount = data.pages.filter((p: RolePage) => p.accessType === 'CANDIDATE').length;
            console.log('✅ Loaded', data.pages.length, 'scoped pages:', 
              assignedCount, 'assigned,', inheritedCount, 'inherited,', candidateCount, 'candidate');
          } else {
            setRolePages([]);
            setRolePagesSelectedIds(new Set());
            setRolePagesInitialIds(new Set());
          }
        } else {
          console.error('⚠️ API failed:', response.status);
          setRolePages([]);
          setRolePagesSelectedIds(new Set());
          setRolePagesInitialIds(new Set());
        }
      } catch (error) {
        console.error('❌ Error loading role pages:', error);
        setRolePages([]);
        setRolePagesSelectedIds(new Set());
        setRolePagesInitialIds(new Set());
      } finally {
        setRolePagesLoading(false);
      }
    };

    loadRolePages();
  }, [selectedRoleId]);

  // Track changes for role pages
  useEffect(() => {
    const currentIds = [...rolePagesSelectedIds].sort().join(',');
    const initialIds = [...rolePagesInitialIds].sort().join(',');
    setRolePagesHasChanges(currentIds !== initialIds);
  }, [rolePagesSelectedIds, rolePagesInitialIds]);

  // Save role pages
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
        console.log('✅ Saved role pages');
        setRolePagesInitialIds(new Set(rolePagesSelectedIds));
        setRolePagesHasChanges(false);
        
        // 🔔 Trigger cache invalidation for all users with this role
        if (selectedRole) {
          console.log('🔔 Triggering permissions refresh for role:', selectedRole.name);
          triggerPermissionsRefresh(selectedRole.name);
        }
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

  // Toggle page selection
  const toggleRolePageSelection = (pageId: string) => {
    setRolePagesSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) {
        newSet.delete(pageId);
      } else {
        newSet.add(pageId);
      }
      return newSet;
    });
  };

  // NOTE: Bulk select/deselect removed - SA can only toggle individual pages
  // within their EA-approved pool using enable/disable switches

  // Render
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-500">Loading module management...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => loadData(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>
      {/* Navigation Tabs */}
      <ClientManagementTabs />
      
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mb-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Module Management</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Assign roles and pages to clients/admins
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={isDataRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <FiRefreshCw className={isDataRefreshing ? 'animate-spin' : ''} size={14} />
          Refresh
        </button>
      </div>

      {/* Main 4-Column Grid - takes 45% of remaining space */}
      <div className="flex-[45] min-h-0 overflow-hidden">
        <div className="grid grid-cols-4 gap-2 h-full">
          {/* Column 1: Clients */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-2 flex flex-col h-full overflow-hidden">
            <div className="text-sm font-semibold mb-1 flex items-center gap-2 flex-shrink-0">
              <FiUsers className="text-green-600" />
              Clients
              <span className="text-xs font-normal text-gray-500">{clients.length}</span>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
              {clients.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">No clients found</div>
              ) : (
                clients.map(client => {
                  const isSelected = selectedClientId === client.id;
                  return (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setSelectedRoleId(null);
                      }}
                      className={`w-full text-left rounded-md border px-3 py-2.5 text-xs transition ${
                        isSelected
                          ? "border-green-500 bg-green-100 dark:bg-green-900/40 ring-2 ring-green-300"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isSelected && <span className="text-green-600">✓</span>}
                          <span className="font-medium truncate">{client.name}</span>
                        </div>
                        {client.client_code && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {client.client_code}
                          </span>
                        )}
                      </div>
                      {client.email && (
                        <div className="text-[10px] text-gray-500 truncate mt-0.5">{client.email}</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Subscriptions */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-2 flex flex-col h-full overflow-hidden">
            <div className="text-sm font-semibold mb-1 flex items-center gap-2 flex-shrink-0">
              <FiCreditCard className="text-orange-600" />
              Subscriptions
              <span className="text-xs font-normal text-gray-500">{subscriptionPlans.length}</span>
            </div>
            
            {/* Action buttons for subscription assignment */}
            {selectedClientId && subscriptionPlans.length > 0 && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                {isSubEditMode ? (
                  <>
                    <div className="flex-1" />
                    <button
                      onClick={() => {
                        // TODO: Save subscription assignment to backend
                        // For now, update the local map
                        if (selectedClientId && selectedPlanId !== null) {
                          setClientPlanMap(prev => ({
                            ...prev,
                            [String(selectedClientId)]: selectedPlanId
                          }));
                        }
                        setIsSubEditMode(false);
                      }}
                      className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        // Reset selection to current plan
                        setSelectedPlanId(clientCurrentPlanId);
                        setIsSubEditMode(false);
                      }}
                      className="text-xs px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1" />
                    <button
                      onClick={() => setIsSubEditMode(true)}
                      className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            )}
            
            <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
              {!selectedClientId ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Client to view plans
                </div>
              ) : subscriptionPlans.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No subscription plans available.
                </div>
              ) : !isSubEditMode ? (
                // VIEW MODE: Show only current plan
                clientCurrentPlan ? (
                  <div className="p-3 rounded-md border border-orange-500 bg-orange-50 dark:bg-orange-900/30">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600 text-sm">✓</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-orange-800 dark:text-orange-200">{clientCurrentPlan.name}</span>
                            {clientCurrentPlan.is_popular && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">
                                Popular
                              </span>
                            )}
                          </div>
                          {clientCurrentPlan.price_monthly !== undefined && (
                            <span className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                              ${clientCurrentPlan.price_monthly}/mo
                            </span>
                          )}
                        </div>
                        {clientCurrentPlan.description && (
                          <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">{clientCurrentPlan.description}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-4 bg-gray-50 dark:bg-gray-800 rounded border border-dashed border-gray-300 dark:border-gray-600">
                    No subscription assigned.
                    <br />
                    <span className="text-[10px]">Click Edit to assign a plan.</span>
                  </div>
                )
              ) : (
                // EDIT MODE: Show all active plans
                subscriptionPlans.filter(p => p.is_active !== false).map(plan => {
                  const isSelected = selectedPlanId === plan.id;
                  const isCurrentPlan = clientCurrentPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition ${
                        isSelected
                          ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/40 ring-2 ring-orange-300'
                          : 'border-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      {/* Radio button for single selection */}
                      <input
                        type="radio"
                        name="subscription-plan"
                        checked={isSelected}
                        onChange={() => setSelectedPlanId(plan.id)}
                        className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      {/* Plan info */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs truncate">{plan.name}</span>
                            {isCurrentPlan && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                                Current
                              </span>
                            )}
                            {plan.is_popular && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">
                                Popular
                              </span>
                            )}
                          </div>
                          {plan.price_monthly !== undefined && (
                            <span className="text-[10px] text-gray-500">
                              ${plan.price_monthly}/mo
                            </span>
                          )}
                        </div>
                        {plan.description && (
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">{plan.description}</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 3: Roles (View Only - assigned by EA) */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3 flex flex-col h-full overflow-hidden">
            <div className="text-sm font-semibold mb-2 flex items-center gap-2 flex-shrink-0">
              <FiShield className="text-purple-600" />
              Roles
              <span className="text-xs font-normal text-gray-500">
                {selectedClientId ? `(${assignedRoleIds.length} assigned)` : ''}
              </span>
            </div>

            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 italic flex-shrink-0">
              Roles assigned by Enterprise Admin (read-only)
            </div>
            
            <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
              {!selectedClientId ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Client to view roles
                </div>
              ) : assignedRoleIds.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4 bg-gray-50 dark:bg-gray-800 rounded border border-dashed border-gray-300 dark:border-gray-600">
                  No roles assigned to this client.
                  <br />
                  <span className="text-[10px]">Contact Enterprise Admin to assign roles.</span>
                </div>
              ) : (
                visibleRoles.filter(role => assignedRoleIds.includes(role.id)).map(role => {
                  const isSelectedForViewing = selectedRoleId === role.id;
                  const userCount = role.userCount || role.users?.length || 0;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded-md border cursor-pointer transition ${
                        isSelectedForViewing
                          ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-300'
                          : 'border-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100'
                      }`}
                    >
                      {/* Checkmark indicator */}
                      <span className="text-green-600 text-sm">✓</span>
                      
                      {/* Role info - click to select for viewing pages */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs truncate">{role.display_name || role.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                              <FiUsers className="w-3 h-3" />
                              {userCount}
                            </span>
                            {role.level !== undefined && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                role.level >= 9 
                                  ? 'bg-purple-100 text-purple-700'
                                  : role.level >= 7
                                  ? 'bg-blue-100 text-blue-700'
                                  : role.level >= 5
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                L{role.level}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 4: Pages - Simplified with Enable/Disable toggles */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3 flex flex-col h-full overflow-hidden">
            <div className="text-sm font-semibold mb-1 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <FiGrid className="text-blue-600" />
                Pages
                {selectedRoleId && selectedRole && (
                  <span className="text-xs font-normal text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                    {selectedRole.display_name || selectedRole.name}
                  </span>
                )}
                <span className="text-xs font-normal text-gray-500">
                  {selectedRoleId ? `(${rolePages.filter(p => p.accessType === 'ASSIGNED').length} enabled)` : ''}
                </span>
              </div>
              {rolePagesLoading && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Loading...</span>
              )}
              {rolePagesSaving && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Saving...</span>
              )}
            </div>

            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 italic flex-shrink-0">
              Toggle switches to enable/disable page access
            </div>

            {/* Save button - shows when there are unsaved changes */}
            {selectedRoleId && rolePagesHasChanges && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <span className="text-[10px] text-orange-600 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" /> Unsaved changes
                </span>
                <div className="flex-1" />
                <button
                  onClick={handleSaveRolePages}
                  disabled={rolePagesSaving}
                  className={`text-xs px-3 py-1 rounded font-medium transition ${
                    rolePagesSaving
                      ? 'bg-gray-400 text-white cursor-wait'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {rolePagesSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
              {!selectedRoleId ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Role from Column 3 to manage pages
                </div>
              ) : rolePagesLoading ? (
                <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-300 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  Loading pages...
                </div>
              ) : rolePages.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300">
                  No pages available for this role.
                </div>
              ) : (
                rolePages.map((page, pageIndex) => {
                  const isEnabled = page.accessType === 'ASSIGNED';
                  const isInSaPool = page.inSaPool !== false;
                  const isRestricted = !isInSaPool;
                  const uniqueKey = `${page.routeId || pageIndex}-${page.id || page.path}`;
                  
                  return (
                    <div
                      key={uniqueKey}
                      className={`flex items-center gap-2 p-2 rounded-md border transition ${
                        isRestricted
                          ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10 opacity-60'
                          : isEnabled
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 bg-white dark:bg-gray-800'
                      }`}
                      title={isRestricted ? 'Restricted by EA - cannot enable' : ''}
                    >
                      {/* Toggle switch */}
                      <button
                        onClick={() => !isRestricted && toggleRolePageSelection(page.id)}
                        disabled={isRestricted}
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors flex-shrink-0 ${
                          isRestricted
                            ? 'bg-gray-300 cursor-not-allowed'
                            : isEnabled
                            ? 'bg-green-500 cursor-pointer'
                            : 'bg-gray-300 cursor-pointer hover:bg-gray-400'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
                            isEnabled ? 'translate-x-3' : 'translate-x-0.5'
                          }`}
                        />
                      </button>

                      {/* Page info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium truncate ${
                            isRestricted ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {page.name || page.path || page.id}
                          </span>
                          <PageClassificationBadge 
                            accessType={page.accessType}
                            inSaPool={isInSaPool}
                            isRestricted={isRestricted}
                          />
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {page.path || page.id}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Bottom Section - Shows Roles or Pages based on context */}
      <div className={`flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t-2 ${
        bottomSectionContext === 'pages' ? 'border-blue-200 dark:border-blue-800' : 'border-purple-200 dark:border-purple-800'
      } rounded-t-xl shadow-lg`}>
        {/* Header Bar with Toggle between Roles and Pages */}
        <div 
          className={`flex items-center justify-between px-4 py-2 border-b rounded-t-xl cursor-pointer transition-colors ${
            bottomSectionContext === 'pages' 
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50' 
              : 'bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50'
          }`}
          onClick={() => {
            if (bottomSectionContext === 'pages') {
              setIsPagesDrawerExpanded(!isPagesDrawerExpanded);
            } else {
              setIsRolesDrawerExpanded(!isRolesDrawerExpanded);
            }
          }}
        >
          {/* Expand/Collapse Toggle - Always visible at the left */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              if (bottomSectionContext === 'pages') {
                setIsPagesDrawerExpanded(!isPagesDrawerExpanded);
              } else {
                setIsRolesDrawerExpanded(!isRolesDrawerExpanded);
              }
            }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all mr-3 ${
              bottomSectionContext === 'pages'
                ? 'hover:bg-blue-200 dark:hover:bg-blue-800/50'
                : 'hover:bg-purple-200 dark:hover:bg-purple-800/50'
            }`}
            title={`Click to ${(bottomSectionContext === 'pages' ? isPagesDrawerExpanded : isRolesDrawerExpanded) ? 'collapse' : 'expand'}`}
          >
            <div 
              className={`p-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform duration-300 ${
                (bottomSectionContext === 'pages' ? isPagesDrawerExpanded : isRolesDrawerExpanded) ? 'rotate-180' : ''
              }`}
            >
              <FiChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">
              {(bottomSectionContext === 'pages' ? isPagesDrawerExpanded : isRolesDrawerExpanded) ? 'Collapse' : 'Expand'}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap flex-1" onClick={(e) => e.stopPropagation()}>
            {/* Section Header - Pages only (removed All Roles Overview toggle) */}
            <div className="flex items-center gap-2">
              <FiFile className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Pages for Selected Role
              </span>
            </div>

            {/* Context-specific filters - Pages only */}
            <span className="text-xs text-gray-500">({totalPagesCount} pages)</span>
            {/* REMOVED: All/Assigned/Unassigned filter buttons - SA only sees pages in their pool */}
            {/* REMOVED: Module dropdown - flat page list, no module grouping */}
            {/* Search bar for pages - kept for filtering */}
            <div className="relative ml-2" onClick={(e) => e.stopPropagation()}>
              <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search pages..."
                value={pagesSearchQuery}
                onChange={(e) => setPagesSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 w-36 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats - Pages only */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-green-700 dark:text-green-400">{rolePages.filter(p => p.accessType === 'ASSIGNED').length} enabled</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content Area - Pages only (removed Roles section) */}
        {isPagesDrawerExpanded && (
          <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50 max-h-64 overflow-y-auto">
            {/* PAGES CONTENT - SIMPLIFIED: No modules, just Role → Pages with Enable/Disable toggles */}
            {!selectedRoleId ? (
              <div className="text-center py-6">
                <FiShield className="w-10 h-10 mx-auto text-purple-300 dark:text-purple-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a role from the Roles column to manage page access
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  You can only enable/disable pages within your EA-approved pool
                </p>
              </div>
            ) : rolePages.length === 0 ? (
              <div className="text-center py-6">
                <FiFile className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No pages available for this role
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Legend */}
                <div className="flex items-center gap-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Legend:</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700">
                    🟢 Role Allowed
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-yellow-100 text-yellow-700">
                    🟡 Subscription Allowed
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-700">
                    🔴 SA Restricted
                  </span>
                  {rolePagesHasChanges && (
                    <button
                      onClick={handleSaveRolePages}
                      disabled={rolePagesSaving}
                      className="ml-auto px-3 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {rolePagesSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>

                {/* Role header */}
                <div className="flex items-center gap-3 pb-2">
                  <FiShield className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    {selectedRole?.display_name || selectedRole?.name}
                  </span>
                  <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                    {rolePages.filter(p => p.accessType === 'ASSIGNED').length} enabled / {rolePages.length} total
                  </span>
                </div>

                {/* Pages list - flat, no module grouping */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {rolePages
                    .filter(page => {
                      // Apply filter
                      if (pagesAssignedFilter === 'assigned') {
                        return page.accessType === 'ASSIGNED';
                      }
                      if (pagesAssignedFilter === 'unassigned') {
                        return page.accessType !== 'ASSIGNED';
                      }
                      // Search filter
                      const searchLower = pagesSearchQuery.toLowerCase().trim();
                      if (searchLower) {
                        return (page.name || '').toLowerCase().includes(searchLower) ||
                               (page.path || '').toLowerCase().includes(searchLower);
                      }
                      return true;
                    })
                    .map((page, idx) => {
                      const isEnabled = page.accessType === 'ASSIGNED';
                      // For now, all pages in rolePages are in SA pool (from scoped API)
                      // In future, we can add inSaPool field from API
                      const isInSaPool = page.inSaPool !== false; // Default true if not specified
                      const isRestricted = !isInSaPool;

                      return (
                        <div
                          key={`${page.id}-${idx}`}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            isRestricted
                              ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10 opacity-60 cursor-not-allowed'
                              : isEnabled
                              ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 bg-white dark:bg-gray-800'
                          }`}
                          title={isRestricted ? 'This page is restricted by Enterprise Admin. Contact EA to enable.' : ''}
                        >
                          {/* Toggle Switch */}
                          <button
                            onClick={() => !isRestricted && toggleRolePageSelection(page.id)}
                            disabled={isRestricted}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              isRestricted
                                ? 'bg-gray-300 cursor-not-allowed'
                                : isEnabled
                                ? 'bg-green-500 focus:ring-green-500 cursor-pointer'
                                : 'bg-gray-300 focus:ring-gray-500 cursor-pointer hover:bg-gray-400'
                            }`}
                            aria-label={isEnabled ? 'Disable page' : 'Enable page'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                              }`}
                            />
                            {isRestricted && (
                              <FiLock className="absolute inset-0 m-auto w-2.5 h-2.5 text-gray-500" />
                            )}
                          </button>

                          {/* Page info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium truncate ${
                                isRestricted ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100'
                              }`}>
                                {page.name || page.id}
                              </span>
                              <PageClassificationBadge 
                                accessType={page.accessType}
                                inSaPool={isInSaPool}
                                isRestricted={isRestricted}
                              />
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {page.path}
                            </div>
                          </div>

                          {/* External link */}
                          <Link 
                            href={page.path || '#'} 
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <FiExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      );
                    })}
                </div>

                {/* Empty state for filtered results */}
                {rolePages.filter(page => {
                  if (pagesAssignedFilter === 'assigned') return page.accessType === 'ASSIGNED';
                  if (pagesAssignedFilter === 'unassigned') return page.accessType !== 'ASSIGNED';
                  const searchLower = pagesSearchQuery.toLowerCase().trim();
                  if (searchLower) {
                    return (page.name || '').toLowerCase().includes(searchLower) ||
                           (page.path || '').toLowerCase().includes(searchLower);
                  }
                  return true;
                }).length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No pages match the current filter</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// Build cache bust: 20250204_SA_RBAC_UI_REFACTOR_v3
// Changes:
// 1. REMOVED Add/Remove buttons for roles (SA can only view EA-assigned roles)
// 2. REMOVED Add/Remove buttons for pages (replaced with Enable/Disable toggles)
// 3. REMOVED module grouping in pages section (flat Role → Pages list)
// 4. REMOVED All Roles Overview toggle button - pages only in bottom section
// 5. REMOVED All/Assigned/Unassigned filter buttons
// 6. REMOVED module dropdown
// 7. ADDED classification badges: 🟢 Role Allowed, 🟡 Subscription Allowed, 🔴 SA Restricted
// 8. ADDED toggle switches for enable/disable within SA's EA-approved pool
// 9. Restricted pages visible but disabled with hover explanation

