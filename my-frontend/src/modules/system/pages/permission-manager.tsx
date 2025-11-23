'use client';

import React, { useState } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import { Shield, Plus, Edit, Trash2, Search } from '@/lib/ssr-safe-icons';
function ShieldIcon({ className = '' }: { className?: string }) {
  return <Shield className={className} aria-hidden />;
}

function PlusIcon({ className = '' }: { className?: string }) {
  return <Plus className={className} aria-hidden />;
}

function Edit3Icon({ className = '' }: { className?: string }) {
  return <Edit className={className} aria-hidden />;
}

function Trash2Icon({ className = '' }: { className?: string }) {
  return <Trash2 className={className} aria-hidden />;
}

function SearchIcon({ className = '' }: { className?: string }) {
  return <Search className={className} aria-hidden />;
}

export default function PermissionManager() {
  const { hasAccess } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  if (!hasAccess('user-management')) {
    return (
      <SuperAdminLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to view this page.</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  const permissions = [
    { id: 1, name: 'system-settings', description: 'Manage system settings', module: 'System' },
    { id: 2, name: 'user-management', description: 'Manage users', module: 'System' },
    { id: 3, name: 'financial-statements', description: 'View financial statements', module: 'Finance' },
    { id: 4, name: 'purchase-order', description: 'Manage purchase orders', module: 'Procurement' },
  ];

  return (
    <SuperAdminLayout title="Permission Manager" description="Manage system permissions and access control">
      <div className="space-y-6">
        {/* Header */}
          <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Permissions</h2>
            <p className="text-gray-600 dark:text-gray-400">Define and manage access permissions</p>
          </div>
          <button className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-2">
            <PlusIcon className="w-4 h-4" />
            <span>Add Permission</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Permissions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Permission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {permissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                      <div className="flex items-center">
                      <ShieldIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{permission.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{permission.description}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                      {permission.module}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                      <button className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                        <Trash2Icon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
