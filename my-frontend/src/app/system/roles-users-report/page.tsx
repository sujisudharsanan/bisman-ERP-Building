"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { FiUsers, FiPackage, FiGrid, FiShield, FiRefreshCw, FiChevronUp } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import ClientManagementTabs from "@/components/common/ClientManagementTabs";
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

  // Selection states
  const [selectedClientId, setSelectedClientId] = useState<string | number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  // Track assigned roles PER CLIENT using a Map
  const [clientRolesMap, setClientRolesMap] = useState<Record<string, number[]>>({});
  const [isRoleAssignMode, setIsRoleAssignMode] = useState(false);

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

      {/* Main 3-Column Grid - takes 45% of remaining space */}
      <div className="flex-[45] min-h-0 overflow-hidden">
        <div className="grid grid-cols-3 gap-2 h-full">
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

          {/* Column 2: Roles */}
          <div className="rounded-lg border bg-white/40 dark:bg-gray-900/30 p-3 flex flex-col h-full overflow-hidden">
            <div className="text-sm font-semibold mb-2 flex items-center gap-2 flex-shrink-0">
              <FiShield className="text-purple-600" />
              Roles
              <span className="text-xs font-normal text-gray-500">
                {selectedClientId ? `(${assignedRoleIds.length}/${visibleRoles.length} assigned)` : `${visibleRoles.length} total`}
              </span>
            </div>
            
            {/* Action buttons for role assignment */}
            {selectedClientId && visibleRoles.length > 0 && (
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <button
                  onClick={() => setAssignedRoleIds(visibleRoles.map(r => r.id))}
                  className="text-[10px] px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200"
                >
                  Select All
                </button>
                <button
                  onClick={() => setAssignedRoleIds([])}
                  className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Deselect All
                </button>
                <div className="flex-1" />
                {rolesSaveStatus === 'success' && (
                  <span className="text-[10px] text-green-600 font-medium">✓ Saved!</span>
                )}
                <button
                  onClick={handleSaveClientRoles}
                  disabled={rolesSaving}
                  className={`text-xs px-3 py-1 rounded font-medium transition ${
                    rolesSaving
                      ? 'bg-gray-400 text-white cursor-wait'
                      : rolesSaveStatus === 'success'
                      ? 'bg-green-500 text-white'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {rolesSaving ? 'Saving...' : rolesSaveStatus === 'success' ? '✓ Saved' : 'Save'}
                </button>
              </div>
            )}
            
            <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
              {!selectedClientId ? (
                <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-300 dark:border-yellow-700">
                  ⚠️ Select a Client to assign roles
                </div>
              ) : visibleRoles.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No roles available in the system.
                </div>
              ) : (
                visibleRoles.map(role => {
                  const isSelectedForViewing = selectedRoleId === role.id;
                  const isAssigned = assignedRoleIds.includes(role.id);
                  const userCount = role.userCount || role.users?.length || 0;
                  return (
                    <div
                      key={role.id}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition ${
                        isSelectedForViewing
                          ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-300'
                          : isAssigned
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100'
                          : 'border-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      {/* Checkbox for assigning role */}
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => {
                          setAssignedRoleIds(prev =>
                            prev.includes(role.id)
                              ? prev.filter(id => id !== role.id)
                              : [...prev, role.id]
                          );
                        }}
                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      {/* Role info - click to select for viewing pages */}
                      <button
                        onClick={() => setSelectedRoleId(role.id)}
                        className="flex-1 text-left"
                      >
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
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 3: Pages */}
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
                  onClick={handleSaveRolePages}
                  disabled={!rolePagesHasChanges || rolePagesSaving}
                  className={`text-xs px-3 py-1 rounded font-medium transition ${
                    rolePagesHasChanges && !rolePagesSaving
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {rolePagesSaving ? 'Saving...' : rolePagesHasChanges ? 'Save' : 'Saved'}
                </button>
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
                      onClick={() => toggleRolePageSelection(page.id)}
                      className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition ${
                        isSelected
                          ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRolePageSelection(page.id)}
                        className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
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

      {/* All Roles Overview - Static Bottom Section */}
      <div className="flex-shrink-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-t-2 border-purple-200 dark:border-purple-800 rounded-t-xl shadow-lg">
        {/* Header Bar with Title, Filter, and Stats */}
        <div 
          className="flex items-center justify-between px-4 py-2 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-100 dark:border-purple-800 rounded-t-xl cursor-pointer"
          onClick={() => setIsRolesDrawerExpanded(!isRolesDrawerExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-600 rounded-lg">
              <FiShield className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">All Roles Overview</span>
            <span className="text-xs text-gray-500">({visibleRoles.length} roles)</span>
            {/* Filter buttons */}
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
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats badges */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-green-700 dark:text-green-400">{assignedRoleIds.length}</span>
              </span>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span className="text-red-700 dark:text-red-400">{visibleRoles.length - assignedRoleIds.length}</span>
              </span>
            </div>
            {/* Add/Remove button */}
            {selectedClientId && (
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
            {/* Total users */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <FiUsers className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                {visibleRoles.reduce((sum, r) => sum + (r.userCount || r.users?.length || 0), 0)} users
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

        {/* Always Visible: One Row of Roles */}
        <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
            {visibleRoles
              .filter((role) => {
                const isAssigned = assignedRoleIds.includes(role.id);
                return rolesFilter === 'all' || 
                  (rolesFilter === 'assigned' && isAssigned) ||
                  (rolesFilter === 'unassigned' && !isAssigned);
              })
              .slice(0, 9)
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
            {/* Show more indicator */}
            {visibleRoles.filter((role) => {
              const isAssigned = assignedRoleIds.includes(role.id);
              return rolesFilter === 'all' || 
                (rolesFilter === 'assigned' && isAssigned) ||
                (rolesFilter === 'unassigned' && !isAssigned);
            }).length > 9 && !isRolesDrawerExpanded && (
              <button
                onClick={() => setIsRolesDrawerExpanded(true)}
                className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                +{visibleRoles.filter((role) => {
                  const isAssigned = assignedRoleIds.includes(role.id);
                  return rolesFilter === 'all' || 
                    (rolesFilter === 'assigned' && isAssigned) ||
                    (rolesFilter === 'unassigned' && !isAssigned);
                }).length - 9} more
              </button>
            )}
          </div>
        </div>

        {/* Expanded Content - Additional rows */}
        <div className={`overflow-hidden transition-all duration-300 ${
          isRolesDrawerExpanded ? 'max-h-[40vh] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            {/* Remaining Roles Grid (skip first 9 shown above) */}
            <div className="max-h-[30vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
                {visibleRoles
                  .filter((role) => {
                    const isAssigned = assignedRoleIds.includes(role.id);
                    return rolesFilter === 'all' || 
                      (rolesFilter === 'assigned' && isAssigned) ||
                      (rolesFilter === 'unassigned' && !isAssigned);
                  })
                  .slice(9)
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
              
              {/* Empty state when no additional roles match filter */}
              {allRoles.filter((role) => {
                const isAssigned = assignedRoleIds.includes(role.id);
                return rolesFilter === 'all' || 
                  (rolesFilter === 'assigned' && isAssigned) ||
                  (rolesFilter === 'unassigned' && !isAssigned);
              }).slice(9).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-xs">No additional roles match your filter</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// Build cache bust: 20251226_190000
