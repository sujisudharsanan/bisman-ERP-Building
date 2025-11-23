'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Users, ArrowLeft, Loader2 } from '@/lib/ssr-safe-icons';
import { useRouter } from 'next/navigation';
import { CreateFullUserModal } from '@/components/user-management/CreateFullUserModal';
import type { UserRole, Branch } from '@/types/user-management';

export default function UserCreationPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch roles and branches on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch roles
        const rolesResponse = await fetch('/api/roles', {
          credentials: 'include',
        });
        
        if (!rolesResponse.ok) {
          throw new Error('Failed to fetch roles');
        }
        
        const rolesData = await rolesResponse.json();
        setRoles(rolesData.roles || []);

        // Fetch branches
        const branchesResponse = await fetch('/api/branches', {
          credentials: 'include',
        });
        
        if (!branchesResponse.ok) {
          throw new Error('Failed to fetch branches');
        }
        
        const branchesData = await branchesResponse.json();
        setBranches(branchesData.branches || []);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load required data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSuccess = () => {
    // Close modal and optionally navigate to user management
    setIsModalOpen(false);
    // Optional: Show success message and redirect
    setTimeout(() => {
      router.push('/system/user-management');
    }, 1500);
  };

  const handleCancel = () => {
    // Navigate back to user management
    router.push('/system/user-management');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Loading user creation form...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Failed to Load Form
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => router.push('/system/user-management')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to User Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
          <button
          onClick={() => router.push('/system/user-management')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to User Management</span>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New User
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Register a new user in the system with complete profile and access settings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-1">
              User Creation Workflow
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• Fill in all required user information</li>
              <li>• Assign appropriate role and permissions</li>
              <li>• Upload KYC documents if required</li>
              <li>• User will receive login credentials via email</li>
            </ul>
          </div>
        </div>
      </div>

      {/* User Creation Modal/Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        {isModalOpen ? (
          <CreateFullUserModal
            isOpen={isModalOpen}
            onClose={handleCancel}
            onSuccess={handleSuccess}
            roles={roles}
            branches={branches}
          />
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              User Created Successfully!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Redirecting to user management...
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/system/user-management')}
          className="flex items-center justify-center space-x-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            View All Users
          </span>
        </button>

        <button
          onClick={() => router.push('/system/permission-manager')}
          className="flex items-center justify-center space-x-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Manage Permissions
          </span>
        </button>

        <button
          onClick={() => router.push('/system/roles-users-report')}
          className="flex items-center justify-center space-x-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            View Reports
          </span>
        </button>
      </div>
    </div>
  );
}
