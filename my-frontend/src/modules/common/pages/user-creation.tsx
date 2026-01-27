'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CreateFullUserModal } from '@/components/user-management/CreateFullUserModal';
import type { UserRole, Branch } from '@/types/user-management';
import { useAuth } from '@/contexts/AuthContext';

export default function UserCreationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Determine redirect path based on user role
  const getRedirectPath = () => {
    const role = user?.role || user?.userType;
    // SUPER_ADMIN goes to client management, others go to dashboard
    if (role === 'SUPER_ADMIN') {
      return '/system/user-management';
    }
    return '/dashboard';
  };

  // Fetch roles and branches on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let rolesList: any[] = [];
        
        // Fetch roles - use assignable-roles endpoint which respects Enterprise Admin assignments
        const rolesResponse = await fetch('/api/privileges/assignable-roles', {
          credentials: 'include',
        });
        
        if (rolesResponse.ok) {
          const rolesData = await rolesResponse.json();
          rolesList = rolesData.data || rolesData.roles || [];
          console.log('[UserCreation] assignable-roles response:', rolesData.source, 'count:', rolesList.length);
        }
        
        // Fallback to /api/roles if assignable-roles fails or returns empty
        if (rolesList.length === 0) {
          console.warn('[UserCreation] assignable-roles empty/failed, falling back to /api/roles');
          const fallbackResponse = await fetch('/api/roles', { credentials: 'include' });
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            rolesList = fallbackData.roles || fallbackData.data || [];
            console.log('[UserCreation] fallback /api/roles count:', rolesList.length);
          }
        }
        
        if (rolesList.length > 0) {
          // Map to UserRole format (type cast since API may not return all fields)
          setRoles(rolesList.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            displayName: r.displayName || r.display_name || r.name,
            level: r.level,
            description: r.description || '',
            permissions: r.permissions || {},
            is_system_role: r.is_system_role || false,
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.updated_at || new Date().toISOString(),
          } as UserRole)));
        } else {
          console.error('[UserCreation] No roles found from any source');
        }

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
    setIsModalOpen(false);
    setShowSuccess(true);
    setTimeout(() => {
      router.push(getRedirectPath());
    }, 1500);
  };

  const handleCancel = () => {
    router.push(getRedirectPath());
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading user creation form...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Failed to Load Form
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => router.push(getRedirectPath())}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Success state after user creation
  if (showSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            User Created Successfully!
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  // Modal is rendered as a true modal overlay - no page content behind it
  return (
    <CreateFullUserModal
      isOpen={isModalOpen}
      onClose={handleCancel}
      onSuccess={handleSuccess}
      roles={roles}
      branches={branches}
    />
  );
}
