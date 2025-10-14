'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function HubInchargePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'STAFF');

  // Redirect if user is not authenticated or doesn't have STAFF access
  React.useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.roleName === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (user.roleName === 'ADMIN') {
        router.push('/admin');
      } else if (user.roleName === 'MANAGER') {
        router.push('/manager');
      } else if (user.roleName && !['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)) {
        router.push('/auth/login');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Hub Incharge Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roleName || !['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)) {
    return null;
  }

  return (
    <DashboardLayout role={user.roleName || 'STAFF'}>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Kanban Board - Left Side */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-6 min-w-max lg:min-w-0">
            <KanbanColumn
              title="DRAFT"
              tasks={dashboardData.DRAFT}
            />
            <KanbanColumn
              title="IN PROGRESS"
              tasks={dashboardData.IN_PROGRESS}
            />
            <KanbanColumn
              title="EDITING"
              tasks={dashboardData.EDITING}
            />
            <KanbanColumn
              title="DONE"
              tasks={dashboardData.DONE}
            />
          </div>
        </div>

        {/* Analytics Panel - Right Side */}
        <RightPanel />
      </div>
    </DashboardLayout>
  );
}
