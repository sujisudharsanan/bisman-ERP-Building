'use client';

// User Flow & Management Page - Organization hierarchy visualization with user list
import { useState } from 'react';
import Link from 'next/link';
import OrbitFlowVisualization from './OrbitFlowVisualization';
import UsersManagement from '@/components/admin/UsersManagement';
import { UserPlus, Users, Workflow, Search } from 'lucide-react';

export default function UserFlowManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Workflow className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Flow & Management</h1>
              <p className="text-sm text-gray-500">Organization hierarchy and user administration</p>
            </div>
          </div>
          <Link
            href="/admin/users/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Create New User</span>
          </Link>
        </div>
      </div>

      {/* Organization Flow Diagram */}
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Organization Flow</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">Interactive visualization of roles and departments</p>
          </div>
          <OrbitFlowVisualization />
        </div>
      </div>

      {/* User List Section */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">User Directory</h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                  />
                </div>
                {/* Quick Create User Link */}
                <Link
                  href="/admin/users/create"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </Link>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">Manage all system users and their role assignments</p>
          </div>
          <div className="p-6">
            <UsersManagement searchTerm={searchTerm} />
          </div>
        </div>
      </div>
    </div>
  );
}
