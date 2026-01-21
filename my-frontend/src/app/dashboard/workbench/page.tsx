'use client';

/**
 * Task Workbench Page
 * 
 * Full-page task management dashboard with:
 * - 4 tabs: DRAFT | IN PROGRESS | NEED ATTENTION | DONE
 * - Task list with quick preview
 * - Slide-in QuickView panel with chat
 */

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { TaskWorkbench } from '@/components/tasks/TaskWorkbench';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function TaskWorkbenchPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Handle authentication
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  const roleName = user?.roleName || user?.role || 'USER';

  return (
    <DashboardLayout role={roleName}>
      <div className="h-full">
        <TaskWorkbench />
      </div>
    </DashboardLayout>
  );
}
