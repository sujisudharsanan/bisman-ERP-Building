'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  Lock,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  Settings,
  Key,
  Building2,
  FileText,
  MoreVertical,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Square
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  userCount: number;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'approve';
}

interface PermissionGroup {
  module: string;
  displayName: string;
  icon: React.ElementType;
  permissions: Permission[];
}

// ============================================================================
// Mock Data
// ============================================================================

const mockRoles: Role[] = [
  {
    id: 'ROLE001',
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full access to all system features and settings',
    userCount: 2,
    permissions: ['*'],
    isSystem: true,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'ROLE002',
    name: 'enterprise_admin',
    displayName: 'Enterprise Admin',
    description: 'Manage enterprise-level settings and users',
    userCount: 5,
    permissions: ['users.manage', 'settings.manage', 'reports.view', 'audit.view'],
    isSystem: true,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-10'
  },
  {
    id: 'ROLE003',
    name: 'hub_incharge',
    displayName: 'Hub In-Charge',
    description: 'Manage hub operations and team',
    userCount: 15,
    permissions: ['inventory.manage', 'orders.manage', 'team.manage', 'reports.view'],
    isSystem: true,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-05'
  },
  {
    id: 'ROLE004',
    name: 'area_manager',
    displayName: 'Area Manager',
    description: 'Oversee area operations and performance',
    userCount: 25,
    permissions: ['inventory.view', 'orders.view', 'reports.view', 'team.view'],
    isSystem: true,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-08'
  },
  {
    id: 'ROLE005',
    name: 'store_operator',
    displayName: 'Store Operator',
    description: 'Handle store-level transactions',
    userCount: 120,
    permissions: ['orders.create', 'inventory.view', 'customers.view'],
    isSystem: true,
    createdAt: '2023-01-01',
    updatedAt: '2024-01-12'
  },
  {
    id: 'ROLE006',
    name: 'accountant',
    displayName: 'Accountant',
    description: 'Manage financial records and reports',
    userCount: 8,
    permissions: ['finance.manage', 'reports.view', 'invoices.manage'],
    isSystem: false,
    createdAt: '2023-06-15',
    updatedAt: '2024-01-03'
  },
  {
    id: 'ROLE007',
    name: 'auditor',
    displayName: 'Auditor',
    description: 'View-only access for audit purposes',
    userCount: 3,
    permissions: ['*.view', 'audit.view'],
    isSystem: false,
    createdAt: '2023-09-01',
    updatedAt: '2023-12-20'
  }
];

const mockPermissionGroups: PermissionGroup[] = [
  {
    module: 'users',
    displayName: 'User Management',
    icon: Users,
    permissions: [
      { id: 'users.view', name: 'users.view', displayName: 'View Users', description: 'View user list and profiles', module: 'users', action: 'view' },
      { id: 'users.create', name: 'users.create', displayName: 'Create Users', description: 'Create new user accounts', module: 'users', action: 'create' },
      { id: 'users.edit', name: 'users.edit', displayName: 'Edit Users', description: 'Modify user information', module: 'users', action: 'edit' },
      { id: 'users.delete', name: 'users.delete', displayName: 'Delete Users', description: 'Remove user accounts', module: 'users', action: 'delete' },
      { id: 'users.manage', name: 'users.manage', displayName: 'Manage Users', description: 'Full user management access', module: 'users', action: 'manage' }
    ]
  },
  {
    module: 'inventory',
    displayName: 'Inventory',
    icon: Building2,
    permissions: [
      { id: 'inventory.view', name: 'inventory.view', displayName: 'View Inventory', description: 'View stock and items', module: 'inventory', action: 'view' },
      { id: 'inventory.create', name: 'inventory.create', displayName: 'Add Items', description: 'Add new inventory items', module: 'inventory', action: 'create' },
      { id: 'inventory.edit', name: 'inventory.edit', displayName: 'Update Stock', description: 'Modify inventory levels', module: 'inventory', action: 'edit' },
      { id: 'inventory.manage', name: 'inventory.manage', displayName: 'Manage Inventory', description: 'Full inventory access', module: 'inventory', action: 'manage' }
    ]
  },
  {
    module: 'orders',
    displayName: 'Orders',
    icon: FileText,
    permissions: [
      { id: 'orders.view', name: 'orders.view', displayName: 'View Orders', description: 'View order history', module: 'orders', action: 'view' },
      { id: 'orders.create', name: 'orders.create', displayName: 'Create Orders', description: 'Place new orders', module: 'orders', action: 'create' },
      { id: 'orders.edit', name: 'orders.edit', displayName: 'Edit Orders', description: 'Modify existing orders', module: 'orders', action: 'edit' },
      { id: 'orders.approve', name: 'orders.approve', displayName: 'Approve Orders', description: 'Approve pending orders', module: 'orders', action: 'approve' },
      { id: 'orders.manage', name: 'orders.manage', displayName: 'Manage Orders', description: 'Full order management', module: 'orders', action: 'manage' }
    ]
  },
  {
    module: 'finance',
    displayName: 'Finance',
    icon: Building2,
    permissions: [
      { id: 'finance.view', name: 'finance.view', displayName: 'View Finance', description: 'View financial data', module: 'finance', action: 'view' },
      { id: 'finance.create', name: 'finance.create', displayName: 'Create Entries', description: 'Create financial entries', module: 'finance', action: 'create' },
      { id: 'finance.approve', name: 'finance.approve', displayName: 'Approve Transactions', description: 'Approve financial transactions', module: 'finance', action: 'approve' },
      { id: 'finance.manage', name: 'finance.manage', displayName: 'Manage Finance', description: 'Full finance access', module: 'finance', action: 'manage' }
    ]
  },
  {
    module: 'settings',
    displayName: 'Settings',
    icon: Settings,
    permissions: [
      { id: 'settings.view', name: 'settings.view', displayName: 'View Settings', description: 'View system settings', module: 'settings', action: 'view' },
      { id: 'settings.edit', name: 'settings.edit', displayName: 'Edit Settings', description: 'Modify settings', module: 'settings', action: 'edit' },
      { id: 'settings.manage', name: 'settings.manage', displayName: 'Manage Settings', description: 'Full settings access', module: 'settings', action: 'manage' }
    ]
  }
];

// ============================================================================
// Sub-Components
// ============================================================================

function RoleCard({ role, onEdit, onDelete, onViewPermissions }: {
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
  onViewPermissions: () => void;
}) {
  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${role.isSystem ? 'border-blue-200' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Shield className={`w-5 h-5 ${role.isSystem ? 'text-blue-600' : 'text-gray-600'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{role.displayName}</h3>
            <code className="text-xs text-gray-500">{role.name}</code>
          </div>
        </div>
        {role.isSystem && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">System</span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">{role.description}</p>

      <div className="flex justify-between items-center text-sm mb-4">
        <div className="flex items-center gap-1 text-gray-500">
          <Users className="w-4 h-4" />
          <span>{role.userCount} users</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <Key className="w-4 h-4" />
          <span>{role.permissions.length === 1 && role.permissions[0] === '*' ? 'All' : role.permissions.length} permissions</span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t">
        <button 
          onClick={onViewPermissions}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg"
        >
          <Eye className="w-4 h-4" />
          Permissions
        </button>
        <button 
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        {!role.isSystem && (
          <button 
            onClick={onDelete}
            className="flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function PermissionMatrix({ role, groups }: { role: Role; groups: PermissionGroup[] }) {
  const hasPermission = (perm: string) => {
    if (role.permissions.includes('*')) return true;
    if (role.permissions.includes(`${perm.split('.')[0]}.*`)) return true;
    if (role.permissions.includes(`*.${perm.split('.')[1]}`)) return true;
    return role.permissions.includes(perm);
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.module} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center gap-2">
              <Icon className="w-5 h-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">{group.displayName}</h4>
            </div>
            <div className="divide-y">
              {group.permissions.map((perm) => (
                <div key={perm.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{perm.displayName}</p>
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  </div>
                  {hasPermission(perm.name) ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoleDetailModal({ role, onClose }: { role: Role; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Shield className={`w-6 h-6 ${role.isSystem ? 'text-blue-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{role.displayName}</h2>
                <code className="text-sm text-gray-500">{role.name}</code>
              </div>
            </div>
            {role.isSystem && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">System Role</span>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600">{role.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{role.userCount}</p>
              <p className="text-sm text-gray-500">Users assigned</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Key className="w-5 h-5 text-green-600 mb-2" />
              <p className="text-2xl font-bold">
                {role.permissions.includes('*') ? 'All' : role.permissions.length}
              </p>
              <p className="text-sm text-gray-500">Permissions</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <Settings className="w-5 h-5 text-purple-600 mb-2" />
              <p className="text-sm font-medium">{role.updatedAt}</p>
              <p className="text-sm text-gray-500">Last updated</p>
            </div>
          </div>

          <h3 className="font-medium text-gray-900 mb-4">Permission Details</h3>
          <PermissionMatrix role={role} groups={mockPermissionGroups} />
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Edit Role
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateRoleModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: unknown) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    permissions: [] as string[]
  });

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const toggleModule = (module: string, permissions: Permission[]) => {
    const modulePerms = permissions.map(p => p.name);
    const allSelected = modulePerms.every(p => formData.permissions.includes(p));
    
    setFormData(prev => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !modulePerms.includes(p))
        : [...new Set([...prev.permissions, ...modulePerms])]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Create New Role</h2>
          <p className="text-sm text-gray-500">Define a custom role with specific permissions</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  name: e.target.value.toLowerCase().replace(/\s+/g, '_')
                }))}
                placeholder="e.g., warehouse_manager"
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="e.g., Warehouse Manager"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the role's responsibilities..."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
            <div className="space-y-4 max-h-[300px] overflow-auto">
              {mockPermissionGroups.map((group) => {
                const Icon = group.icon;
                const modulePerms = group.permissions.map(p => p.name);
                const allSelected = modulePerms.every(p => formData.permissions.includes(p));
                const someSelected = modulePerms.some(p => formData.permissions.includes(p));

                return (
                  <div key={group.module} className="border rounded-lg">
                    <div 
                      className="bg-gray-50 px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleModule(group.module, group.permissions)}
                    >
                      {allSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : someSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-300" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">{group.displayName}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {modulePerms.filter(p => formData.permissions.includes(p)).length}/{modulePerms.length}
                      </span>
                    </div>
                    <div className="px-4 py-2 grid grid-cols-2 gap-2">
                      {group.permissions.map((perm) => (
                        <label 
                          key={perm.id} 
                          className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(perm.name)}
                            onChange={() => togglePermission(perm.name)}
                            className="rounded"
                          />
                          <span className="text-gray-700">{perm.displayName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between sticky bottom-0">
          <div className="text-sm text-gray-500">
            {formData.permissions.length} permissions selected
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
              Cancel
            </button>
            <button 
              onClick={() => onCreate(formData)}
              disabled={!formData.name || !formData.displayName}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Create Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function RolesPermissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredRoles = useMemo(() => {
    return mockRoles.filter(role => {
      const matchesSearch = role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           role.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || 
                         (typeFilter === 'system' && role.isSystem) ||
                         (typeFilter === 'custom' && !role.isSystem);
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter]);

  const systemRoles = mockRoles.filter(r => r.isSystem);
  const customRoles = mockRoles.filter(r => !r.isSystem);
  const totalUsers = mockRoles.reduce((sum, r) => sum + r.userCount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-500">Manage access control and authorization</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockRoles.length}</p>
                <p className="text-sm text-gray-500">Total Roles</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Lock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{systemRoles.length}</p>
                <p className="text-sm text-gray-500">System Roles</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customRoles.length}</p>
                <p className="text-sm text-gray-500">Custom Roles</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-gray-500">Users Assigned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'system', 'custom'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-4 py-2 rounded-lg capitalize ${
                    typeFilter === type 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => console.log('Edit', role.id)}
              onDelete={() => console.log('Delete', role.id)}
              onViewPermissions={() => setSelectedRole(role)}
            />
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No roles found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedRole && (
        <RoleDetailModal
          role={selectedRole}
          onClose={() => setSelectedRole(null)}
        />
      )}

      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => {
            console.log('Create role:', data);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
