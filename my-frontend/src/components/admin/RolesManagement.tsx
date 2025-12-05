// Roles Management Component
'use client';
import React, { useState, useEffect } from 'react';
import { useRoles } from '../../hooks/useRBAC';
import { Plus, Edit, Trash2, Shield, Users as UsersIcon, AlertCircle } from 'lucide-react';
import PermissionTreePicker from '../privilege-management/PermissionTreePicker';
import type { Module } from '../privilege-management/PermissionTreePicker';

// Feature flag for the permission tree picker
const FEATURE_ROLE_PAGE_PICKER = process.env.NEXT_PUBLIC_FEATURE_ROLE_PAGE_PICKER === 'true';

// Role level options
const ROLE_LEVELS = [
  { value: 10, label: 'Basic (10)', description: 'Standard user access' },
  { value: 30, label: 'Staff (30)', description: 'Basic staff permissions' },
  { value: 50, label: 'Manager (50)', description: 'Team management access' },
  { value: 70, label: 'Senior Manager (70)', description: 'Department-wide access' },
  { value: 80, label: 'Admin (80)', description: 'Administrative privileges' },
  { value: 90, label: 'Super Admin (90)', description: 'Full business admin' },
  { value: 100, label: 'Enterprise Admin (100)', description: 'System-wide access' },
];

// Sample modules structure - in production, fetch from API
const SAMPLE_MODULES: Module[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard and overview',
    pages: [
      {
        id: 'overview',
        name: 'Overview',
        actions: [
          { id: 'view', name: 'View' },
          { id: 'export', name: 'Export Data' },
        ]
      },
      {
        id: 'analytics',
        name: 'Analytics',
        actions: [
          { id: 'view', name: 'View' },
          { id: 'create', name: 'Create Reports' },
        ]
      }
    ]
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage system users',
    pages: [
      {
        id: 'list',
        name: 'User List',
        actions: [
          { id: 'view', name: 'View' },
          { id: 'create', name: 'Create' },
          { id: 'edit', name: 'Edit' },
          { id: 'delete', name: 'Delete' },
        ]
      },
      {
        id: 'roles',
        name: 'Role Assignment',
        actions: [
          { id: 'view', name: 'View' },
          { id: 'assign', name: 'Assign Roles' },
        ]
      }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory',
    description: 'Inventory management',
    pages: [
      {
        id: 'products',
        name: 'Products',
        actions: [
          { id: 'view', name: 'View' },
          { id: 'create', name: 'Create' },
          { id: 'edit', name: 'Edit' },
          { id: 'delete', name: 'Delete' },
        ]
      },
      {
        id: 'stock',
        name: 'Stock Management',
        actions: [
          { id: 'view', name: 'View Stock' },
          { id: 'adjust', name: 'Adjust Stock' },
          { id: 'transfer', name: 'Transfer Stock' },
        ]
      }
    ]
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Financial management',
    pages: [
      {
        id: 'invoices',
        name: 'Invoices',
        actions: [
          { id: 'view', name: 'View' },
          { id: 'create', name: 'Create' },
          { id: 'approve', name: 'Approve' },
        ]
      },
      {
        id: 'payments',
        name: 'Payments',
        actions: [
          { id: 'view', name: 'View' },
          { id: 'process', name: 'Process' },
        ]
      }
    ]
  }
];

interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  level?: number;
  is_active: boolean;
  created_at: string;
}

interface RolesManagementProps {
  searchTerm: string;
}

export default function RolesManagement({ searchTerm }: RolesManagementProps) {
  const { roles, loading, error, createRole, deleteRole } = useRoles();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const filteredRoles = roles.filter(
    (role: Role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateRole = async (formData: {
    name: string;
    description: string;
  }) => {
    try {
      await createRole(formData);
      setShowCreateModal(false);
    } catch (error) {
      // Error handling is managed by the hook
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteRole(roleId);
      } catch (error) {
        // Error handling is managed by the hook
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">System Roles</h3>
          <p className="text-sm text-gray-500">
            Manage user roles and their access levels
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>Create Role</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role: Role) => (
          <div
            key={role.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {role.name}
                  </h4>
                  <p className="text-sm text-gray-500">{role.slug}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingRole(role)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit role"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete role"
                  disabled={role.name === 'ADMIN'} // Prevent deleting admin role
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <p className="text-gray-600 mt-3 text-sm">{role.description}</p>

            <div className="mt-4 flex items-center justify-between">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  role.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {role.is_active ? 'Active' : 'Inactive'}
              </span>
              <div className="flex items-center text-sm text-gray-500">
                <UsersIcon size={16} className="mr-1" />
                <span>0 users</span>{' '}
                {/* This would come from a user count API */}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredRoles.length === 0 && !loading && (
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No roles found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Get started by creating a new role'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="-ml-1 mr-2 h-4 w-4" />
              Create Role
            </button>
          )}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRole}
        />
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSubmit={handleCreateRole} // Using same handler for simplicity
        />
      )}
    </div>
  );
}

// Create Role Modal Component
function CreateRoleModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; level?: number; permission_ids?: string[] }) => Promise<void>;
}) {
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '',
    level: 10 // Default to Basic level
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Validate: if permission picker is enabled, require at least one permission
    if (FEATURE_ROLE_PAGE_PICKER && selectedPermissions.length === 0) {
      setError('Please select at least one permission for this role');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        ...formData,
        permission_ids: selectedPermissions.length > 0 ? selectedPermissions : undefined
      });
    } catch (err: any) {
      // Handle specific error codes
      if (err.code === 'ROLE_LEVEL_TOO_LOW') {
        setError('You do not have sufficient privileges to create a role at this level');
      } else if (err.code === 'ROLE_LEVEL_VIOLATION') {
        setError('Cannot assign permissions that require a higher role level than yours');
      } else if (err.code === 'PERMISSIONS_NOT_FOUND') {
        setError('Some selected permissions are invalid');
      } else {
        setError(err.message || 'Failed to create role');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Create New Role
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define the role name, level, and permissions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Error display */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Manager, Staff, Viewer"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the role's purpose and responsibilities"
              />
            </div>

            {/* Role Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role Level *
              </label>
              <select
                value={formData.level}
                onChange={e => setFormData({ ...formData, level: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {ROLE_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Higher levels have more privileges. You can only create roles at or below your own level.
              </p>
            </div>

            {/* Permission Tree Picker (behind feature flag) */}
            {FEATURE_ROLE_PAGE_PICKER && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permissions
                </label>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <PermissionTreePicker
                    modules={SAMPLE_MODULES}
                    selected={selectedPermissions}
                    onChange={setSelectedPermissions}
                    showDescriptions={false}
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {FEATURE_ROLE_PAGE_PICKER && (
                <span>{selectedPermissions.length} permissions selected</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting || !formData.name.trim() || (FEATURE_ROLE_PAGE_PICKER && selectedPermissions.length === 0)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Edit Role Modal Component (similar to create but with pre-filled data)
function EditRoleModal({
  role,
  onClose,
  onSubmit,
}: {
  role: Role;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: role.name,
    description: role.description || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Role</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={role.name === 'ADMIN'} // Prevent editing admin role name
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
