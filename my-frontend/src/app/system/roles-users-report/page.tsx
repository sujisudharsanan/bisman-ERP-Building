"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { FiUsers, FiPackage, FiGrid, FiShield, FiRefreshCw, FiChevronUp, FiCreditCard, FiFile, FiExternalLink, FiCheckCircle, FiMinus } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import ClientManagementTabs from "@/components/common/ClientManagementTabs";
import { PAGE_REGISTRY, MODULES } from "@/common/config/page-registry";
import Link from "next/link";
// Note: Layout is provided by /app/system/layout.tsx

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
  const [isRoleAssignMode, setIsRoleAssignMode] = useState(false);
  
  // Edit mode states for roles and pages
  const [isRoleEditMode, setIsRoleEditMode] = useState(false);
  const [isPageEditMode, setIsPageEditMode] = useState(false);
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
  const [bottomSectionContext, setBottomSectionContext] = useState<'roles' | 'pages'>('roles');
  const [isPagesDrawerExpanded, setIsPagesDrawerExpanded] = useState(false);
  const [pagesAssignedFilter, setPagesAssignedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string | null>(null);
  const [bottomSelectedPageId, setBottomSelectedPageId] = useState<string | null>(null);

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

  // Get all pages grouped by module for the Pages Overview section (using PAGE_REGISTRY)
  const allPagesGroupedByModule = useMemo(() => {
    // Group pages from PAGE_REGISTRY by module
    const moduleMap = new Map<string, { moduleId: string; moduleName: string; pages: { id: string; name: string; path: string; status: string }[] }>();
    
    for (const page of PAGE_REGISTRY) {
      if (page.status !== 'active') continue; // Skip disabled/coming-soon pages
      
      const moduleId = page.module;
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
  }, []);

  // Filtered pages based on selected module filter and assigned filter
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
    
    return groups;
  }, [allPagesGroupedByModule, selectedModuleFilter, pagesAssignedFilter, rolePagesSelectedIds, selectedRoleId]);

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
            setRolePages(data.pages);
            const grantedIds = new Set<string>(
              data.pages.filter((p: RolePage) => p.granted).map((p: RolePage) => p.id)
            );
            setRolePagesSelectedIds(grantedIds);
            setRolePagesInitialIds(new Set(grantedIds));
            setRolePagesHasChanges(false);
            console.log('✅ Loaded', data.pages.length, 'pages,', grantedIds.size, 'granted');
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

  // Select/Deselect all
  const handleSelectAllRolePages = () => {
    setRolePagesSelectedIds(new Set(rolePages.map(p => p.id)));
  };

  const handleDeselectAllRolePages = () => {
    setRolePagesSelectedIds(new Set());
  };

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

          {/* Column 3: Roles */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3 flex flex-col h-full overflow-hidden">
            <div className="text-sm font-semibold mb-2 flex items-center gap-2 flex-shrink-0">
              <FiShield className="text-purple-600" />
              Roles
              <span className="text-xs font-normal text-gray-500">
                {selectedClientId ? `(${assignedRoleIds.length} assigned)` : ''}
              </span>
            </div>
            
            <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
              {!selectedClientId ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Client to assign roles
                </div>
              ) : assignedRoleIds.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4 bg-gray-50 dark:bg-gray-800 rounded border border-dashed border-gray-300 dark:border-gray-600">
                  No roles assigned to this client.
                  <br />
                  <span className="text-[10px]">Use the bottom section to assign roles.</span>
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

          {/* Column 4: Pages */}
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
                  {selectedRoleId ? `(${rolePagesSelectedIds.size}/${rolePages.length} selected)` : ''}
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
              Check pages to grant access to this role.
            </div>

            {/* Action buttons */}
            {selectedRoleId && rolePages.length > 0 && (
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                {isPageEditMode ? (
                  <>
                    <button
                      onClick={handleSelectAllRolePages}
                      className="text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAllRolePages}
                      className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      Deselect All
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={async () => {
                        await handleSaveRolePages();
                        setIsPageEditMode(false);
                      }}
                      disabled={rolePagesSaving}
                      className={`text-xs px-3 py-1 rounded font-medium transition ${
                        rolePagesSaving
                          ? 'bg-gray-400 text-white cursor-wait'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {rolePagesSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setIsPageEditMode(false)}
                      className="text-xs px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1" />
                    <span className="text-[10px] text-gray-500">
                      {rolePagesHasChanges ? '' : 'Saved'}
                    </span>
                    <button
                      onClick={() => setIsPageEditMode(true)}
                      className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
              {!selectedRoleId ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Role from Column 2 to see pages
                </div>
              ) : rolePagesLoading ? (
                <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-300 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  Loading pages...
                </div>
              ) : rolePages.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-300">
                  No pages available in the system.
                </div>
              ) : (
                rolePages.map((page, pageIndex) => {
                  const isSelected = rolePagesSelectedIds.has(page.id);
                  const uniqueKey = `${page.routeId || pageIndex}-${page.id || page.path}`;
                  return (
                    <div
                      key={uniqueKey}
                      onClick={() => isPageEditMode && toggleRolePageSelection(page.id)}
                      className={`flex items-center gap-2 p-2 rounded-md border transition ${
                        isPageEditMode ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isSelected
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      {/* Checkbox only in edit mode */}
                      {isPageEditMode ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRolePageSelection(page.id)}
                          className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        /* Checkmark indicator when not in edit mode */
                        isSelected && <span className="text-green-600 text-sm">✓</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                          {page.name || page.path || page.id}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate flex items-center gap-2">
                          <span>{page.path || page.id}</span>
                          {page.module && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              {page.module}
                            </span>
                          )}
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
          className={`flex items-center justify-between px-4 py-2 border-b rounded-t-xl ${
            bottomSectionContext === 'pages' 
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800' 
              : 'bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800'
          }`}
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Toggle Buttons - Roles / Pages */}
            <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => {
                  setBottomSectionContext('roles');
                  setIsRolesDrawerExpanded(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  bottomSectionContext === 'roles'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <FiShield className="w-3.5 h-3.5" />
                All Roles Overview
              </button>
              <button
                onClick={() => {
                  setBottomSectionContext('pages');
                  setIsPagesDrawerExpanded(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  bottomSectionContext === 'pages'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <FiFile className="w-3.5 h-3.5" />
                All Pages
              </button>
            </div>

            {/* Context-specific filters */}
            {bottomSectionContext === 'roles' ? (
              <>
                <span className="text-xs text-gray-500">({visibleRoles.length} roles)</span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setRolesFilter('all')}
                    className={`px-2 py-0.5 text-xs rounded transition ${
                      rolesFilter === 'all' ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm font-medium' : 'text-gray-600'
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
              </>
            ) : (
              <>
                <span className="text-xs text-gray-500">({totalPagesCount} pages)</span>
                {selectedRoleId && (
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setPagesAssignedFilter('all')}
                      className={`px-2 py-0.5 text-xs rounded transition ${
                        pagesAssignedFilter === 'all' ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm font-medium' : 'text-gray-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setPagesAssignedFilter('assigned')}
                      className={`px-2 py-0.5 text-xs rounded transition ${
                        pagesAssignedFilter === 'assigned' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm font-medium' : 'text-gray-600'
                      }`}
                    >
                      Assigned
                    </button>
                    <button
                      onClick={() => setPagesAssignedFilter('unassigned')}
                      className={`px-2 py-0.5 text-xs rounded transition ${
                        pagesAssignedFilter === 'unassigned' ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm font-medium' : 'text-gray-600'
                      }`}
                    >
                      Unassigned
                    </button>
                  </div>
                )}
                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={selectedModuleFilter || ''}
                    onChange={(e) => setSelectedModuleFilter(e.target.value || null)}
                    className="ml-2 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">All Modules</option>
                    {allPagesGroupedByModule.map(g => (
                      <option key={g.moduleId} value={g.moduleId}>
                        {g.moduleName} ({g.pages.length})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-2">
              {bottomSectionContext === 'roles' ? (
                <>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-green-700 dark:text-green-400">{assignedRoleIds.length}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span className="text-red-700 dark:text-red-400">{visibleRoles.length - assignedRoleIds.length}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-green-700 dark:text-green-400">{rolePagesSelectedIds.size}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <FiPackage className="w-3 h-3 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-400">{allPagesGroupedByModule.length} modules</span>
                  </span>
                </>
              )}
            </div>
            
            {/* Add/Remove button for roles */}
            {bottomSectionContext === 'roles' && selectedClientId && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsRoleAssignMode(!isRoleAssignMode); }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm ${
                  isRoleAssignMode
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {isRoleAssignMode ? "✓ Done" : "Add/Remove"}
              </button>
            )}
            
            {/* Total users for roles */}
            {bottomSectionContext === 'roles' && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <FiUsers className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  {visibleRoles.reduce((sum, r) => sum + (r.userCount || r.users?.length || 0), 0)} users
                </span>
              </div>
            )}
            
            {/* Expand/Collapse button */}
            <button 
              onClick={() => {
                if (bottomSectionContext === 'pages') {
                  setIsPagesDrawerExpanded(!isPagesDrawerExpanded);
                } else {
                  setIsRolesDrawerExpanded(!isRolesDrawerExpanded);
                }
              }}
              className={`p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-transform duration-300 hover:bg-gray-50 ${
                (bottomSectionContext === 'pages' ? isPagesDrawerExpanded : isRolesDrawerExpanded) ? 'rotate-180' : ''
              }`}
            >
              <FiChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content Area - Shows Roles or Pages */}
        {((bottomSectionContext === 'pages' && isPagesDrawerExpanded) || (bottomSectionContext === 'roles' && isRolesDrawerExpanded)) && (
          <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50 max-h-64 overflow-y-auto">
            {/* ROLES CONTENT */}
            {bottomSectionContext === 'roles' && (
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
                {visibleRoles
                  .filter((role) => {
                    const isAssigned = assignedRoleIds.includes(role.id);
                    return rolesFilter === 'all' || 
                      (rolesFilter === 'assigned' && isAssigned) ||
                      (rolesFilter === 'unassigned' && !isAssigned);
                  })
                  .map((role) => {
                    const isSelected = selectedRoleId === role.id;
                    const userCount = role.userCount || role.users?.length || 0;
                    const isAssigned = assignedRoleIds.includes(role.id);
                    
                    return (
                      <div key={role.id} className="relative">
                        {isRoleAssignMode && selectedClientId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssignedRoleIds(prev => 
                                prev.includes(role.id) 
                                  ? prev.filter(id => id !== role.id)
                                  : [...prev, role.id]
                              );
                            }}
                            className={`absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-transform hover:scale-110 ${
                              isAssigned 
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                          >
                            {isAssigned ? '−' : '+'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (isRoleAssignMode && selectedClientId) {
                              setAssignedRoleIds(prev => 
                                prev.includes(role.id) 
                                  ? prev.filter(id => id !== role.id)
                                  : [...prev, role.id]
                              );
                            } else {
                              setSelectedRoleId(role.id);
                            }
                          }}
                          className={`w-full text-left rounded-lg border px-2 py-1.5 text-xs cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isSelected
                              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 ring-2 ring-purple-300"
                              : isAssigned
                              ? "border-green-400 bg-green-50/80 dark:bg-green-900/20 hover:bg-green-100"
                              : "border-red-300 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100"
                          }`}
                          title={`${role.description || role.name} (Level ${role.level || 0})`}
                        >
                          <div className="flex items-center gap-1">
                            {isAssigned ? (
                              <span className="text-green-600 text-xs">✓</span>
                            ) : (
                              <span className="text-red-500 text-xs">✗</span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-[11px]">{role.display_name || role.name}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-gray-500">{userCount} users</span>
                                {role.level !== undefined && (
                                  <span className={`text-[8px] px-1 rounded font-bold ${
                                    role.level >= 9 ? 'bg-purple-100 text-purple-700'
                                      : role.level >= 7 ? 'bg-blue-100 text-blue-700'
                                      : role.level >= 5 ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
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
            )}

            {/* PAGES CONTENT */}
            {bottomSectionContext === 'pages' && (
              <>
                {/* Show from rolePages when Assigned filter is active and role is selected */}
                {pagesAssignedFilter === 'assigned' && selectedRoleId && rolePages.length > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {/* Header for assigned pages from API */}
                      <div className="flex items-center gap-2 pb-1 border-b border-green-100 dark:border-green-800">
                        <FiCheckCircle className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                          Assigned Pages for {selectedRole?.display_name || selectedRole?.name}
                        </span>
                        <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {rolePages.filter(p => p.granted).length} pages
                        </span>
                      </div>
                      {/* Pages grid from API data */}
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                        {rolePages.filter(p => p.granted).map((page, idx) => {
                          const isSelected = bottomSelectedPageId === page.id;
                          return (
                            <div
                              key={`${page.id}-${idx}`}
                              onClick={() => setBottomSelectedPageId(isSelected ? null : page.id)}
                              className={`p-2 rounded-lg border cursor-pointer transition-colors group ${
                                isSelected
                                  ? 'border-green-500 bg-green-100 dark:bg-green-900/40 ring-2 ring-green-300 shadow-sm'
                                  : 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:border-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <FiCheckCircle className="w-3 h-3 text-green-600" />
                                <Link href={page.path || '#'} onClick={(e) => e.stopPropagation()}>
                                  <FiExternalLink className="w-2.5 h-2.5 text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                              </div>
                              <div className={`text-xs font-medium truncate ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                {page.name || page.id}
                              </div>
                              <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                <span>{page.path}</span>
                                {page.module && (
                                  <span className="text-[8px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                                    {page.module}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : filteredPagesForOverview.length === 0 ? (
                  <div className="text-center py-6">
                    <FiFile className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {pagesAssignedFilter !== 'all' && selectedRoleId 
                        ? `No ${pagesAssignedFilter} pages found` 
                        : pagesAssignedFilter !== 'all' && !selectedRoleId
                        ? 'Select a role to filter by assigned/unassigned'
                        : 'No pages available'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredPagesForOverview.map(({ moduleId, moduleName, pages }) => (
                      <div key={moduleId} className="space-y-2">
                        {/* Module header */}
                        <div className="flex items-center gap-2 pb-1 border-b border-blue-100 dark:border-blue-800">
                          <FiPackage className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {moduleName}
                          </span>
                          <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                            {pages.length} pages
                          </span>
                        </div>
                        {/* Pages grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                          {pages.map((page, idx) => {
                            const isSelected = bottomSelectedPageId === page.id;
                            const isAssigned = rolePagesSelectedIds.has(page.id) || rolePagesSelectedIds.has(page.path);
                            return (
                              <div
                                key={`${page.id}-${idx}`}
                                onClick={() => setBottomSelectedPageId(isSelected ? null : page.id)}
                                className={`p-2 rounded-lg border cursor-pointer transition-colors group ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-300 shadow-sm'
                                    : isAssigned
                                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:border-green-400 hover:bg-green-100'
                                    : 'border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  {isAssigned ? (
                                    <FiCheckCircle className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <FiFile className={`w-3 h-3 ${isSelected ? 'text-blue-600' : 'text-blue-500'}`} />
                                  )}
                                  <Link href={page.path || '#'} onClick={(e) => e.stopPropagation()}>
                                    <FiExternalLink className="w-2.5 h-2.5 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </Link>
                                </div>
                                <div className={`text-xs font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
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
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
// Build cache bust: 20251226_190000
