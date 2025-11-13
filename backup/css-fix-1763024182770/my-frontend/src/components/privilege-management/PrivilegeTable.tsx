'use client';

import React from 'react';
import { Eye, Plus, Edit, Trash2, EyeOff, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import type { PrivilegeTableProps, PrivilegeTableRow } from '@/types/privilege-management';

export function PrivilegeTable({ 
  privileges, 
  selectedRole, 
  selectedUser, 
  onPrivilegeChange, 
  loading = false, 
  error = null,
  readOnly = false,
  formData
}: PrivilegeTableProps) {
  
  const groupedPrivileges = privileges.reduce((acc, privilege) => {
    if (!acc[privilege.module]) {
      acc[privilege.module] = [];
    }
    acc[privilege.module].push(privilege);
    return acc;
  }, {} as Record<string, PrivilegeTableRow[]>);

  const handleCheckboxChange = (
    featureId: string, 
    permission: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_hide', 
    checked: boolean
  ) => {
    if (readOnly) return;
    
    onPrivilegeChange(featureId, { [permission]: checked });
  };

  const getPermissionValue = (privilege: PrivilegeTableRow, permission: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' | 'can_hide') => {
    // Overlay unsaved changes from formData if present
    if (formData && formData[privilege.id] && typeof formData[privilege.id][permission] === 'boolean') {
      return !!formData[privilege.id][permission];
    }
    // User override takes precedence
    if (selectedUser && privilege.user_privilege) {
      return privilege.user_privilege[permission];
    }
    // Fall back to role privilege
    if (privilege.role_privilege) {
      return privilege.role_privilege[permission];
    }
    return false;
  };

  const hasUserOverride = (privilege: PrivilegeTableRow) => {
    return selectedUser && privilege.has_user_override;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading privileges...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex items-center text-red-600">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>Error loading privileges: {error}</span>
        </div>
      </div>
    );
  }

  if (!selectedRole) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium mb-1">No Role Selected</h3>
          <p>Please select a role to view and manage privileges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Feature Privileges
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {selectedUser ? 'User-specific overrides' : 'Role default privileges'} • {privileges.length} features
            </p>
          </div>
          {/* Right-side header space kept for status badges if needed */}
          {selectedUser && (
            <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Override Mode
            </div>
          )}
        </div>
      </div>

      {/* Privilege Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feature
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center">
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center">
                  <Plus className="w-4 h-4 mr-1" />
                  Create
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-center">
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(groupedPrivileges).map(([module, modulePrivileges]) => (
              <React.Fragment key={module}>
                {/* Module Header */}
                <tr className="bg-blue-50">
                  <td 
                    colSpan={6} 
                    className="px-6 py-3 text-sm font-semibold text-blue-900 border-b border-blue-200"
                  >
                    📁 {module} Module ({modulePrivileges.length} features)
                  </td>
                </tr>
                
                {/* Module Features */}
                {modulePrivileges.map((privilege) => (
                  <tr 
                    key={privilege.id} 
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${hasUserOverride(privilege) ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''}
                      ${!privilege.is_active ? 'opacity-60' : ''}
                    `}
                  >
                    {/* Feature Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {privilege.name}
                            {hasUserOverride(privilege) && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Override
                              </span>
                            )}
                            {!privilege.is_active && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                Inactive
                              </span>
                            )}
                          </div>
                          {privilege.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {privilege.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Permission Checkboxes */}
                    {(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_hide'] as const).map((permission) => (
                      <td key={permission} className="px-4 py-4 whitespace-nowrap text-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!getPermissionValue(privilege, permission)}
                            onChange={(e) => handleCheckboxChange(privilege.id, permission, e.target.checked)}
                            disabled={readOnly || !privilege.is_active}
                            className={`
                              h-4 w-4 rounded border-gray-300 text-blue-600 
                              focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed
                              ${hasUserOverride(privilege) ? 'ring-2 ring-amber-200' : ''}
                            `}
                          />
                          <span className="sr-only">
                            {permission.replace('can_', '')} {privilege.name}
                          </span>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {privileges.length === 0 && (
        <div className="text-center py-12">
          <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Features Found</h3>
          <p className="text-gray-500">
            No features are configured for this role. Use "Sync with DB Schema" to load features.
          </p>
        </div>
      )}

      {/* Footer Info */}
      {privileges.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <span>
                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                {privileges.filter(p => p.is_active).length} active features
              </span>
              {selectedUser && (
                <span>
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  {privileges.filter(p => p.has_user_override).length} user overrides
                </span>
              )}
            </div>
            <div>
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
