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
  Activity
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
}

export function PrivilegeManagement({ className = '' }: PrivilegeManagementProps) {
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
  
  // Database Health
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
          newFormData[privilege.id] = {
            can_view: privilege.role_privilege?.can_view || false,
            can_create: privilege.role_privilege?.can_create || false,
            can_edit: privilege.role_privilege?.can_edit || false,
            can_delete: privilege.role_privilege?.can_delete || false,
            can_hide: privilege.role_privilege?.can_hide || false,
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
      const response = await apiCall<DatabaseHealth>('/health/database');
      
      if (response.success) {
        setDbHealth(response.data);
      }
    } catch (error) {
      console.error('Failed to check database health:', error);
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
            <button
              onClick={savePrivileges}
              disabled={!hasUnsavedChanges || loading.saving}
              className={`
                flex items-center px-4 py-2 rounded-lg text-sm font-medium
                ${hasUnsavedChanges && !loading.saving
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

      {/* Privilege Table */}
      <PrivilegeTable
        privileges={privileges}
        selectedRole={selectedRole}
        selectedUser={selectedUser}
        onPrivilegeChange={handlePrivilegeChange}
        loading={loading.privileges}
        error={errors.privileges}
        readOnly={false}
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
