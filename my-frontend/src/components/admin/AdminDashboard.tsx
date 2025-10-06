// Admin Dashboard Component
'use client';
import React, { useState } from 'react';
import {
  Users,
  Shield,
  Key,
  MapPin,
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
} from 'lucide-react';
import RolesManagement from './RolesManagement';
import UsersManagement from './UsersManagement';
import RoutesManagement from './RoutesManagement';
import PermissionsManagement from './PermissionsManagement';

interface AdminDashboardProps {
  user: any;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('');

  const sidebarItems = [
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'routes', label: 'Routes', icon: MapPin },
    { id: 'permissions', label: 'Permissions', icon: Key },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Manage roles, users, and permissions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Welcome, {user?.username || 'Admin'}
              </span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {(user?.username || 'A')[0].toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 bg-white rounded-lg shadow-sm p-6">
            <nav className="space-y-2">
              {sidebarItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-lg shadow-sm">
            {/* Content Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">
                    {activeTab} Management
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {getTabDescription(activeTab)}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Search */}
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder={`Search ${activeTab}...`}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Filter (for routes) */}
                  {activeTab === 'routes' && (
                    <select
                      value={filterModule}
                      onChange={e => setFilterModule(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Modules</option>
                      <option value="Core">Core</option>
                      <option value="Admin">Admin</option>
                      <option value="Operations">Operations</option>
                      <option value="Reports">Reports</option>
                    </select>
                  )}

                  {/* Add Button */}
                  {(activeTab === 'roles' || activeTab === 'users') && (
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      <Plus size={20} />
                      <span>Add {activeTab.slice(0, -1)}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6">
              {renderTabContent(activeTab, searchTerm, filterModule)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTabDescription(tab: string): string {
  const descriptions = {
    roles: 'Define and manage user roles with different permission levels',
    users: 'Manage system users and assign roles',
    routes: 'View and configure application routes and access points',
    permissions: 'Configure role-based permissions for routes and actions',
    settings: 'System configuration and administrative settings',
  };
  return descriptions[tab as keyof typeof descriptions] || '';
}

function renderTabContent(
  tab: string,
  searchTerm: string,
  filterModule: string
) {
  switch (tab) {
    case 'roles':
      return <RolesManagement searchTerm={searchTerm} />;
    case 'users':
      return <UsersManagement searchTerm={searchTerm} />;
    case 'routes':
      return <RoutesManagement searchTerm={searchTerm} />;
    case 'permissions': {
      const PermissionsComp =
        PermissionsManagement as unknown as React.ComponentType<{
          searchTerm: string;
        }>;
      return <PermissionsComp searchTerm={searchTerm} />;
    }
    case 'settings':
      return <SettingsContent />;
    default:
      return <div>Content for {tab}</div>;
  }
}

function SettingsContent() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
        <p className="text-sm text-gray-500">
          Configure system-wide RBAC settings
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="space-y-6">
            {/* Permission Caching */}
            <div>
              <h4 className="text-base font-medium text-gray-900">
                Permission Caching
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Control how permissions are cached to improve performance
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Enable permission caching
                  </span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Cache duration (minutes)
                  </span>
                  <input
                    type="number"
                    defaultValue={15}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Audit Logging */}
            <div className="border-t pt-6">
              <h4 className="text-base font-medium text-gray-900">
                Audit Logging
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Track permission changes and access attempts
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Enable audit logging
                  </span>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Log retention (days)
                  </span>
                  <input
                    type="number"
                    defaultValue={90}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="border-t pt-6">
              <h4 className="text-base font-medium text-gray-900">
                Security Settings
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                Configure security-related RBAC settings
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Require 2FA for admin actions
                  </span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Session timeout (minutes)
                  </span>
                  <input
                    type="number"
                    defaultValue={60}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="border-t pt-6">
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
