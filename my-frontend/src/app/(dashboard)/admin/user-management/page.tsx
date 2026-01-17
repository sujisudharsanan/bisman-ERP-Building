'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Building2,
  Star,
  Key,
  Settings,
  Download,
  Upload,
  Lock,
  Unlock
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
  twoFactorEnabled: boolean;
  hub?: string;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  newThisMonth: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockUsers: User[] = [
  {
    id: 'USR001',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@bisman.com',
    phone: '+91-9876543210',
    role: 'Enterprise Admin',
    department: 'Administration',
    status: 'active',
    lastLogin: '2024-01-16 14:30',
    createdAt: '2022-03-15',
    permissions: ['users.manage', 'settings.manage', 'reports.view'],
    twoFactorEnabled: true,
    hub: 'Mumbai Central'
  },
  {
    id: 'USR002',
    name: 'Priya Patel',
    email: 'priya.patel@bisman.com',
    phone: '+91-9876543211',
    role: 'Hub In-Charge',
    department: 'Operations',
    status: 'active',
    lastLogin: '2024-01-16 10:15',
    createdAt: '2022-06-20',
    permissions: ['inventory.manage', 'orders.manage', 'team.manage'],
    twoFactorEnabled: true,
    hub: 'Bangalore Hub'
  },
  {
    id: 'USR003',
    name: 'Amit Kumar',
    email: 'amit.kumar@bisman.com',
    phone: '+91-9876543212',
    role: 'Area Manager',
    department: 'Sales',
    status: 'active',
    lastLogin: '2024-01-15 16:45',
    createdAt: '2023-01-10',
    permissions: ['orders.view', 'reports.view', 'customers.manage'],
    twoFactorEnabled: false,
    hub: 'Delhi NCR'
  },
  {
    id: 'USR004',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@bisman.com',
    phone: '+91-9876543213',
    role: 'Store Operator',
    department: 'Operations',
    status: 'active',
    lastLogin: '2024-01-16 09:00',
    createdAt: '2023-06-15',
    permissions: ['orders.create', 'inventory.view'],
    twoFactorEnabled: false,
    hub: 'Hyderabad Hub'
  },
  {
    id: 'USR005',
    name: 'Vikram Singh',
    email: 'vikram.singh@bisman.com',
    phone: '+91-9876543214',
    role: 'Accountant',
    department: 'Finance',
    status: 'inactive',
    lastLogin: '2023-12-20 11:30',
    createdAt: '2022-09-01',
    permissions: ['finance.manage', 'reports.view'],
    twoFactorEnabled: true
  },
  {
    id: 'USR006',
    name: 'Meera Joshi',
    email: 'meera.joshi@bisman.com',
    phone: '+91-9876543215',
    role: 'Store Operator',
    department: 'Operations',
    status: 'suspended',
    lastLogin: '2023-11-15 10:00',
    createdAt: '2023-03-20',
    permissions: ['orders.create', 'inventory.view'],
    twoFactorEnabled: false,
    hub: 'Pune Hub'
  },
  {
    id: 'USR007',
    name: 'Suresh Menon',
    email: 'suresh.menon@bisman.com',
    phone: '+91-9876543216',
    role: 'Warehouse Manager',
    department: 'Warehouse',
    status: 'pending',
    lastLogin: '-',
    createdAt: '2024-01-14',
    permissions: [],
    twoFactorEnabled: false,
    hub: 'Chennai Hub'
  }
];

const mockStats: UserStats = {
  total: 156,
  active: 128,
  inactive: 18,
  pending: 5,
  newThisMonth: 12
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: User['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700', icon: Clock },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700', icon: XCircle },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700', icon: Clock },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function UserDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{user.name}</h2>
                <p className="text-gray-500">{user.role}</p>
              </div>
            </div>
            <StatusBadge status={user.status} />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Contact Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">
                    {user.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{user.phone}</span>
                </div>
                {user.hub && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{user.hub}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Account Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Department</span>
                  <span>{user.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Role</span>
                  <span>{user.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{user.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Login</span>
                  <span>{user.lastLogin}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="border rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security Settings
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Two-Factor Authentication</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                user.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Permissions */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Permissions</h3>
            {user.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.permissions.map((perm) => (
                  <span key={perm} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    {perm}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No permissions assigned</p>
            )}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Edit className="w-4 h-4" />
              Edit User
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
              <Key className="w-4 h-4" />
              Reset Password
            </button>
            {user.status === 'active' ? (
              <button className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                <Lock className="w-4 h-4" />
                Suspend
              </button>
            ) : user.status === 'suspended' ? (
              <button className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50">
                <Unlock className="w-4 h-4" />
                Reactivate
              </button>
            ) : null}
          </div>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = useMemo(() => {
    return mockUsers.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [searchQuery, statusFilter, roleFilter]);

  const roles = [...new Set(mockUsers.map(u => u.role))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500">Manage system users and access</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.total}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.inactive}</p>
                <p className="text-sm text-gray-500">Inactive</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.newThisMonth}</p>
                <p className="text-sm text-gray-500">New This Month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">2FA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.role}</td>
                  <td className="px-4 py-3 text-sm">{user.department}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3">
                    {user.twoFactorEnabled ? (
                      <Shield className="w-4 h-4 text-green-500" />
                    ) : (
                      <Shield className="w-4 h-4 text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{user.lastLogin}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="More">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
