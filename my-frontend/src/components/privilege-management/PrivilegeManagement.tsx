'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  RefreshCw, 
  Database, 
  Download, 
  Upload, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Settings,
  Shield,
  Users,
  Activity,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { RoleSelector } from './RoleSelector';
import { UserSelector } from './UserSelector';
import { PrivilegeTable } from './PrivilegeTable';
import type { 
  Role, 
  User, 
  Feature,
  PrivilegeTableRow,
  PrivilegeFormData,
  UpdatePrivilegeRequest,
  DatabaseHealth,
  ApiResponse
} from '@/types/privilege-management';

interface PrivilegeManagementProps {
  className?: string;
  // Optional: preselect a role by id when opening the page
  initialRoleId?: string | number | null;
}

export function PrivilegeManagement({ className = '', initialRoleId = null }: PrivilegeManagementProps) {
  // State Management
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [privileges, setPrivileges] = useState<PrivilegeTableRow[]>([]);
  const [formData, setFormData] = useState<PrivilegeFormData>({});
  
  // UI State
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    roles: false,
    users: false,
    privileges: false,
    saving: false,
    syncing: false
  });
  const [errors, setErrors] = useState({
    roles: null as string | null,
    users: null as string | null,
    privileges: null as string | null,
    general: null as string | null
  });
  const [updatingRole, setUpdatingRole] = useState(false);
  
  // Database Health
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [onlyOverrides, setOnlyOverrides] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string | 'ALL'>('ALL');

  // API Base URL: use relative path to leverage Next.js rewrites/proxy and same-origin cookies
  const API_BASE = '/api/privileges';

  // Generic API call function
  const apiCall = async <T,>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed
          ...options?.headers,
        },
        // Ensure auth cookies are sent (access_token via SameSite=Lax)
        credentials: 'include',
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'API_ERROR'
        },
        timestamp: new Date().toISOString()
      };
    }
  };

  // Load Roles
  const loadRoles = useCallback(async () => {
    setLoading(prev => ({ ...prev, roles: true }));
    setErrors(prev => ({ ...prev, roles: null }));
    
    try {
      const response = await apiCall<Role[]>('/roles');
      
      if (response.success) {
        setRoles(response.data);
      } else {
        setErrors(prev => ({ ...prev, roles: response.error.message }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, roles: 'Failed to load roles' }));
    } finally {
      setLoading(prev => ({ ...prev, roles: false }));
    }
  }, []);

  // Toggle role active status
  const toggleRoleStatus = useCallback(async () => {
    if (!selectedRole) return;
    const role = roles.find(r => String(r.id) === String(selectedRole));
    if (!role) return;
    setUpdatingRole(true);
    try {
      const resp = await apiCall(`/roles/${selectedRole}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !role.is_active })
      });
      if (resp.success) {
        await loadRoles();
      } else {
        setErrors(prev => ({ ...prev, general: resp.error.message }));
      }
    } catch (e) {
      setErrors(prev => ({ ...prev, general: 'Failed to update role status' }));
    } finally {
      setUpdatingRole(false);
    }
  }, [selectedRole, roles, loadRoles]);

  // Load Users by Role
  const loadUsers = useCallback(async (roleId: string) => {
    if (!roleId) {
      setUsers([]);
      return;
    }

    setLoading(prev => ({ ...prev, users: true }));
    setErrors(prev => ({ ...prev, users: null }));
    
    try {
      const response = await apiCall<User[]>(`/users?role=${roleId}`);
      
      if (response.success) {
        setUsers(response.data);
      } else {
        setErrors(prev => ({ ...prev, users: response.error.message }));
        setUsers([]);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, users: 'Failed to load users' }));
      setUsers([]);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, []);

  // Load Privileges
  const loadPrivileges = useCallback(async (roleId: string, userId?: string) => {
    if (!roleId) {
      setPrivileges([]);
      return;
    }

    setLoading(prev => ({ ...prev, privileges: true }));
    setErrors(prev => ({ ...prev, privileges: null }));
    
    try {
      const endpoint = userId 
        ? `/privileges?role=${roleId}&user=${userId}`
        : `/privileges?role=${roleId}`;
        
      const response = await apiCall<{
        features: Feature[];
        privileges: PrivilegeTableRow[];
      }>(endpoint);
      
      if (response.success) {
        setFeatures(response.data.features);
        setPrivileges(response.data.privileges);
        
        // Initialize form data
        const newFormData: PrivilegeFormData = {};
        response.data.privileges.forEach(privilege => {
          const source = (selectedUser && privilege.user_privilege)
            ? privilege.user_privilege
            : privilege.role_privilege;
          newFormData[privilege.id] = {
            can_view: source?.can_view || false,
            can_create: source?.can_create || false,
            can_edit: source?.can_edit || false,
            can_delete: source?.can_delete || false,
            can_hide: source?.can_hide || false,
          };
        });
        setFormData(newFormData);
        setHasUnsavedChanges(false);
      } else {
        setErrors(prev => ({ ...prev, privileges: response.error.message }));
        setPrivileges([]);
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, privileges: 'Failed to load privileges' }));
      setPrivileges([]);
    } finally {
      setLoading(prev => ({ ...prev, privileges: false }));
    }
  }, []);

  // Check Database Health
  const checkDatabaseHealth = useCallback(async () => {
    try {
      // Call the health endpoint directly (not through /api/privileges)
      const response = await fetch('/api/health/database', {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setDbHealth(data.data);
      } else {
        // Set a default disconnected state
        setDbHealth({
          connected: false,
          ready: false,
          response_time: 0,
          active_connections: 0,
          version: null,
          issues: ['Failed to fetch database health']
        });
      }
    } catch (error) {
      console.error('Failed to check database health:', error);
      // Set a default disconnected state on error
      setDbHealth({
        connected: false,
        ready: false,
        response_time: 0,
        active_connections: 0,
        version: null,
        issues: ['Network error or API unavailable']
      });
    }
  }, []);

  // Save Privileges
  const savePrivileges = useCallback(async () => {
    if (!selectedRole || !hasUnsavedChanges) return;

    setLoading(prev => ({ ...prev, saving: true }));
    setErrors(prev => ({ ...prev, general: null }));

    try {
      const updateRequest: UpdatePrivilegeRequest = {
        type: selectedUser ? 'USER' : 'ROLE',
        target_id: selectedUser || selectedRole,
        privileges: Object.entries(formData).map(([feature_id, privileges]) => ({
          feature_id,
          ...privileges
        }))
      };

      const response = await apiCall('/privileges/update', {
        method: 'PUT',
        body: JSON.stringify(updateRequest)
      });

      if (response.success) {
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        
        // Refresh privileges to get updated data
        await loadPrivileges(selectedRole, selectedUser || undefined);
        
        // Show success message (you can implement toast here)
        console.log('Privileges saved successfully');
      } else {
        setErrors(prev => ({ ...prev, general: response.error.message }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: 'Failed to save privileges' }));
    } finally {
      setLoading(prev => ({ ...prev, saving: false }));
    }
  }, [selectedRole, selectedUser, formData, hasUnsavedChanges, loadPrivileges]);

  // Sync with Database Schema
  const syncWithSchema = useCallback(async () => {
    setLoading(prev => ({ ...prev, syncing: true }));
    setErrors(prev => ({ ...prev, general: null }));

    try {
      const response = await apiCall('/privileges/sync-schema', {
        method: 'POST'
      });

      if (response.success) {
        // Refresh all data
        await Promise.all([
          loadRoles(),
          selectedRole && loadPrivileges(selectedRole, selectedUser || undefined)
        ]);
        
        console.log('Schema synced successfully');
      } else {
        setErrors(prev => ({ ...prev, general: response.error.message }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, general: 'Failed to sync schema' }));
    } finally {
      setLoading(prev => ({ ...prev, syncing: false }));
    }
  }, [selectedRole, selectedUser, loadRoles, loadPrivileges]);

  // Handle privilege changes
  const handlePrivilegeChange = useCallback((featureId: string, privilege: Partial<any>) => {
    setFormData(prev => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        ...privilege
      }
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle role change
  const handleRoleChange = useCallback((roleId: string | null) => {
    setSelectedRole(roleId);
    setSelectedUser(null); // Reset user selection
    setHasUnsavedChanges(false);
    // Persist last used role for deep-link consistency
    try { if (roleId) localStorage.setItem('privilegeEditor.lastRoleId', roleId); } catch { /* noop */ }
    
    if (roleId) {
      loadUsers(roleId);
      loadPrivileges(roleId);
    } else {
      setUsers([]);
      setPrivileges([]);
    }
  }, [loadUsers, loadPrivileges]);

  // Handle user change
  const handleUserChange = useCallback((userId: string | null) => {
    setSelectedUser(userId);
    setHasUnsavedChanges(false);
    
    if (selectedRole) {
      loadPrivileges(selectedRole, userId || undefined);
    }
  }, [selectedRole, loadPrivileges]);

  // Initial load
  useEffect(() => {
    loadRoles();
    checkDatabaseHealth();
    
    // Set up periodic health checks
    const healthInterval = setInterval(checkDatabaseHealth, 30000);
    return () => clearInterval(healthInterval);
  }, [loadRoles, checkDatabaseHealth]);

  // Apply initialRoleId (or saved fallback) once roles are loaded
  useEffect(() => {
    // Determine candidate role: prefer prop, else localStorage
    let candidate: string | null = null;
    if (initialRoleId != null) candidate = String(initialRoleId);
    if (!candidate) {
      try { candidate = localStorage.getItem('privilegeEditor.lastRoleId'); } catch { /* noop */ }
    }
    if (!selectedRole && candidate && roles && roles.length > 0) {
      const exists = roles.some((r: any) => String(r.id) === String(candidate));
      if (exists) {
        handleRoleChange(String(candidate));
      }
    }
  }, [initialRoleId, roles, selectedRole, handleRoleChange]);

  // Derived: modules list and filtered privileges
  const modules = Array.from(new Set(privileges.map(p => p.module)));
  const displayedPrivileges = privileges.filter(p => {
    if (onlyActive && !p.is_active) return false;
    if (onlyOverrides && !p.has_user_override) return false;
    if (moduleFilter !== 'ALL' && p.module !== moduleFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const hay = `${p.name} ${p.module} ${p.description || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Export helpers
  const downloadBlob = (data: BlobPart, mime: string, filename: string) => {
    try {
      const blob = new Blob([data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  const exportPrivileges = useCallback(async (format: 'CSV' | 'JSON') => {
    try {
      const payload = {
        format,
        include_user_overrides: true,
        include_inactive_features: !onlyActive,
        selected_roles: selectedRole ? [selectedRole] : [],
        selected_users: selectedUser ? [selectedUser] : []
      };

      const res = await fetch(`${API_BASE}/privileges/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      if (format === 'CSV') {
        const blob = await res.blob();
        downloadBlob(blob, 'text/csv;charset=utf-8', `privilege_matrix_${new Date().toISOString().slice(0,10)}.csv`);
      } else {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const json = await res.json();
          downloadBlob(JSON.stringify(json, null, 2), 'application/json', `privilege_matrix_${new Date().toISOString().slice(0,10)}.json`);
        } else {
          const text = await res.text();
          downloadBlob(text, 'application/json', `privilege_matrix_${new Date().toISOString().slice(0,10)}.json`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Export failed';
      setErrors(prev => ({ ...prev, general: msg }));
    }
  }, [API_BASE, onlyActive, selectedRole, selectedUser]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              Role & User Privilege Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage role-based permissions and user-specific overrides
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Role enable/disable toggle */}
            {selectedRole && (
              <button
                onClick={toggleRoleStatus}
                disabled={updatingRole}
                className={`inline-flex items-center px-3 py-2 rounded-md border text-sm ${
                  (roles.find(r => String(r.id) === String(selectedRole))?.is_active)
                    ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'bg-yellow-600 border-yellow-700 text-white hover:bg-yellow-700'
                }`}
                title={(roles.find(r => String(r.id) === String(selectedRole))?.is_active) ? 'Disable role' : 'Enable role'}
              >
                {(roles.find(r => String(r.id) === String(selectedRole))?.is_active)
                  ? (<><ToggleRight className="w-4 h-4 mr-2" /> Disable Role</>)
                  : (<><ToggleLeft className="w-4 h-4 mr-2" /> Enable Role</>)}
              </button>
            )}

            {/* Database Health Indicator */}
            {dbHealth && (
              <div className={`flex items-center px-3 py-2 rounded-lg text-sm ${
                dbHealth.connected 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <Database className="w-4 h-4 mr-2" />
                {dbHealth.connected ? 'Connected' : 'Disconnected'}
                <span className="ml-2 text-xs">
                  ({dbHealth.response_time}ms, {dbHealth.active_connections} active)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RoleSelector
            roles={roles}
            selectedRole={selectedRole}
            onRoleChange={handleRoleChange}
            loading={loading.roles}
            error={errors.roles}
          />
          
          <UserSelector
            users={users}
            selectedUser={selectedUser}
            onUserChange={handleUserChange}
            loading={loading.users}
            error={errors.users}
            disabled={!selectedRole}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {selectedRole && roles.find(r => String(r.id) === String(selectedRole))?.is_active === false && (
              <div className="text-xs px-3 py-2 rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                This role is inactive. Enable it to edit privileges.
              </div>
            )}
            <button
              onClick={savePrivileges}
              disabled={!hasUnsavedChanges || loading.saving || (selectedRole ? (roles.find(r => String(r.id) === String(selectedRole))?.is_active === false) : false)}
              className={`
                flex items-center px-4 py-2 rounded-lg text-sm font-medium
                ${hasUnsavedChanges && !loading.saving && (!selectedRole || roles.find(r => String(r.id) === String(selectedRole))?.is_active !== false)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
                transition-colors duration-200
              `}
            >
              {loading.saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </button>
            
            <button
              onClick={syncWithSchema}
              disabled={loading.syncing}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              {loading.syncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Sync with DB Schema
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            {lastSaved && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
            
            {hasUnsavedChanges && (
              <div className="flex items-center text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Unsaved changes
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <AlertTriangle className="w-4 h-4 mr-2" />
              <span className="font-medium">Error:</span>
              <span className="ml-1">{errors.general}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters & Tools */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search features or modules..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center text-sm text-gray-700">
                <input type="checkbox" className="mr-2" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
                Active only
              </label>
              <label className="inline-flex items-center text-sm text-gray-700">
                <input type="checkbox" className="mr-2" checked={onlyOverrides} onChange={(e) => setOnlyOverrides(e.target.checked)} disabled={!selectedUser} />
                Overrides only
              </label>
              <div className="relative">
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value as any)}
                  className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white"
                >
                  <option value="ALL">All Modules</option>
                  {modules.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportPrivileges('CSV')}
              disabled={!selectedRole}
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              title="Export CSV"
            >
              <Download className="w-4 h-4 mr-2" /> CSV
            </button>
            <button
              onClick={() => exportPrivileges('JSON')}
              disabled={!selectedRole}
              className="inline-flex items-center px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              title="Export JSON"
            >
              <Download className="w-4 h-4 mr-2" /> JSON
            </button>
          </div>
        </div>
      </div>

      {/* Privilege Table */}
      <PrivilegeTable
        privileges={displayedPrivileges}
        selectedRole={selectedRole}
        selectedUser={selectedUser}
        onPrivilegeChange={handlePrivilegeChange}
        loading={loading.privileges}
        error={errors.privileges}
        readOnly={selectedRole ? roles.find(r => String(r.id) === String(selectedRole))?.is_active === false : false}
        formData={formData}
      />

      {/* Statistics Footer */}
      {selectedRole && privileges.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="border-r border-gray-200 last:border-r-0">
              <div className="text-2xl font-bold text-blue-600">
                {privileges.filter(p => p.role_privilege?.can_view).length}
              </div>
              <div className="text-sm text-gray-600">View Access</div>
            </div>
            <div className="border-r border-gray-200 last:border-r-0">
              <div className="text-2xl font-bold text-green-600">
                {privileges.filter(p => p.role_privilege?.can_create).length}
              </div>
              <div className="text-sm text-gray-600">Create Access</div>
            </div>
            <div className="border-r border-gray-200 last:border-r-0">
              <div className="text-2xl font-bold text-yellow-600">
                {privileges.filter(p => p.role_privilege?.can_edit).length}
              </div>
              <div className="text-sm text-gray-600">Edit Access</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {privileges.filter(p => p.role_privilege?.can_delete).length}
              </div>
              <div className="text-sm text-gray-600">Delete Access</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
