'use client';

// User Flow & Management Page - Organization hierarchy visualization with user list
import { useState, useCallback } from 'react';
import OrbitFlowVisualization from './OrbitFlowVisualization';
import UsersManagement from '@/components/admin/UsersManagement';
import { CreateFullUserModal } from '@/components/user-management';
import { UserPlus, Users, Workflow, Search } from 'lucide-react';

export default function UserFlowManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUserCreated = useCallback(() => {
    setShowCreateUserModal(false);
    // Trigger refresh of user list
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="bg-gray-50">
      {/* Organization Flow Diagram */}
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Organization Flow</h2>
            </div>
            <p className="text-sm text-gray-500">Interactive visualization of roles and departments</p>
          </div>
          <OrbitFlowVisualization key={`orbit-${refreshKey}`} />
        </div>
      </div>

      {/* User List Section */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
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
                    className="pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
                  />
                </div>
                {/* Quick Create User Button */}
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>
          </div>
          <div className="p-4">
            <UsersManagement searchTerm={searchTerm} key={`users-${refreshKey}`} />
          </div>
        </div>
      </div>

      {/* Create User Modal - Same as in Subscription/Billing page */}
      <CreateFullUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={handleUserCreated}
      />
    </div>
  );
}
