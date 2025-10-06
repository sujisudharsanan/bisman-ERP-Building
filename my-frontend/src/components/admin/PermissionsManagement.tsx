// Permissions Management Component
'use client';
import React, { useState } from 'react';
import {
  usePermissions,
  useRoles,
  useRoutes,
  useActions,
} from '../../hooks/useRBAC';
import {
  Shield,
  Users,
  Route,
  Activity,
  Check,
  X,
  Edit,
  Save,
  Filter,
} from 'lucide-react';

interface Permission {
  id: number;
  roleId: number;
  actionId: number;
  routeId: number;
  roleName: string;
  actionName: string;
  routeName: string;
  routePath: string;
  granted: boolean;
}

interface PermissionsManagementProps {
  searchTerm: string;
}

export default function PermissionsManagement({
  searchTerm,
}: PermissionsManagementProps) {
  const { roles } = useRoles();
  const { routes } = useRoutes();
  const { actions } = useActions();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const { permissions, loading, error, updatePermission } =
    usePermissions(selectedRole as number | undefined);
  const [editingPermissions, setEditingPermissions] = useState<Set<string>>(
    new Set()
  );
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(
    new Map()
  );

  // Filter permissions based on search term and filters
  const filteredPermissions = permissions.filter((permission: Permission) => {
    const matchesSearch =
      permission.roleName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.actionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.routeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.routePath?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !selectedRole || permission.roleId === selectedRole;

    const route = (routes as any[]).find(r => r.id === permission.routeId);
    const matchesModule = !selectedModule || route?.module === selectedModule;

    return matchesSearch && matchesRole && matchesModule;
  });

  // Group permissions by role for grid view
  const permissionsByRole = filteredPermissions.reduce(
    (acc: any, permission: Permission) => {
      if (!acc[permission.roleName]) {
        acc[permission.roleName] = [];
      }
      acc[permission.roleName].push(permission);
      return acc;
    },
    {}
  );

  // Get unique modules from routes
  const modules = [
    ...new Set(routes.map((route: any) => route.module).filter(Boolean)),
  ];

  const handlePermissionToggle = (permission: Permission) => {
    const key = `${permission.roleId}-${permission.actionId}-${permission.routeId}`;
    const currentValue = pendingChanges.has(key)
      ? pendingChanges.get(key)
      : permission.granted;
    const newValue = !currentValue;

    setPendingChanges(prev => new Map(prev.set(key, newValue)));
    setEditingPermissions(prev => new Set(prev.add(key)));
  };
  const handleSavePermissions = async () => {
    try {
      const savePromises = Array.from(pendingChanges.entries()).map(
        ([key, granted]) => {
          const [roleId, actionId, routeId] = key.split('-').map(Number);
          // updatePermission(roleId, routeId, actionId, isGranted)
          return updatePermission(roleId, routeId, actionId, granted);
        }
      );

      await Promise.all(savePromises);
      setPendingChanges(new Map());
      setEditingPermissions(new Set());
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const getEffectivePermissionValue = (permission: Permission) => {
    const key = `${permission.roleId}-${permission.actionId}-${permission.routeId}`;
    return pendingChanges.has(key)
      ? pendingChanges.get(key)
      : permission.granted;
  };

  const hasChanges = pendingChanges.size > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Permission Matrix
          </h3>
          <p className="text-sm text-gray-500">
            Manage role-based permissions for routes and actions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <button
              onClick={handleSavePermissions}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes ({pendingChanges.size})
            </button>
          )}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium border ${
                viewMode === 'grid'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } rounded-l-md`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium border-t border-r border-b ${
                viewMode === 'list'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } rounded-r-md`}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Role
              </label>
              <select
                value={selectedRole || ''}
                onChange={e =>
                  setSelectedRole(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                {roles.map((role: any) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Module
              </label>
              <select
                value={selectedModule || ''}
                onChange={e => setSelectedModule(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Modules</option>
                {modules.map((module: string) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {Object.entries(permissionsByRole).map(
            ([roleName, rolePermissions]: [string, any]) => (
              <div
                key={roleName}
                className="bg-white shadow overflow-hidden sm:rounded-lg"
              >
                <div className="px-4 py-5 sm:px-6 bg-gray-50">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-gray-400" />
                    {roleName} Role
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {rolePermissions.length} permission
                    {rolePermissions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {rolePermissions.map((permission: Permission) => {
                      const key = `${permission.roleId}-${permission.actionId}-${permission.routeId}`;
                      const isEditing = editingPermissions.has(key);
                      const effectiveValue =
                        getEffectivePermissionValue(permission);

                      return (
                        <div
                          key={key}
                          className={`p-4 border rounded-lg transition-all ${
                            isEditing
                              ? 'border-orange-200 bg-orange-50'
                              : effectiveValue
                                ? 'border-green-200 bg-green-50'
                                : 'border-red-200 bg-red-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <Route className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {permission.routeName}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mb-2">
                                <Activity className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-600 truncate">
                                  {permission.actionName}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                                {permission.routePath}
                              </div>
                            </div>
                            <button
                              onClick={() => handlePermissionToggle(permission)}
                              className={`ml-2 p-1 rounded-full transition-colors ${
                                effectiveValue
                                  ? 'text-green-600 hover:bg-green-100'
                                  : 'text-red-600 hover:bg-red-100'
                              }`}
                            >
                              {effectiveValue ? (
                                <Check className="h-5 w-5" />
                              ) : (
                                <X className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Path
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permission
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPermissions.map((permission: Permission) => {
                const key = `${permission.roleId}-${permission.actionId}-${permission.routeId}`;
                const isEditing = editingPermissions.has(key);
                const effectiveValue = getEffectivePermissionValue(permission);

                return (
                  <tr
                    key={key}
                    className={`hover:bg-gray-50 ${isEditing ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {permission.roleName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {permission.routeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {permission.actionName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {permission.routePath}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handlePermissionToggle(permission)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          effectiveValue
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {effectiveValue ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Granted
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Denied
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredPermissions.length === 0 && (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No permissions found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? 'Try adjusting your search terms or filters'
                  : 'No permissions are configured'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {permissions.filter((p: Permission) => p.granted).length}
            </div>
            <div className="text-sm text-gray-500">Granted Permissions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {permissions.filter((p: Permission) => !p.granted).length}
            </div>
            <div className="text-sm text-gray-500">Denied Permissions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {roles.length}
            </div>
            <div className="text-sm text-gray-500">Total Roles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {routes.length}
            </div>
            <div className="text-sm text-gray-500">Total Routes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
