'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';

export const dynamic = 'force-dynamic';

const TaskManagementDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'USER');

  // Redirect if user is not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading Task Management...</p>
        </div>
      </div>
    );
  }

  if (!user || user.roleName === 'SUPER_ADMIN') {
    return null;
  }

  return (
    <DashboardLayout role={user.roleName || 'USER'}>
      <div className="h-full max-w-full min-h-0">
  <div className="w-full">
          <div className="flex justify-between gap-3 md:gap-5 pb-6 ml-3 md:ml-4">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="flex gap-3 md:gap-5 flex-nowrap">
                <div className="flex-none">
                  <KanbanColumn title="DRAFT" tasks={dashboardData.DRAFT} />
                </div>
                <div className="flex-none">
                  <KanbanColumn title="IN PROGRESS" tasks={dashboardData.IN_PROGRESS} />
                </div>
                <div className="flex-none">
                  <KanbanColumn title="EDITING" tasks={dashboardData.EDITING} />
                </div>
                <div className="flex-none">
                  <KanbanColumn title="DONE" tasks={dashboardData.DONE} />
                </div>
              </div>
            </div>
            <div className="flex-none hidden lg:block">
              <RightPanel mode="dock" />
            </div>
          </div>
          {/* Inline widgets centered below the board in four rows */}
          {/* Inline grid is not used on this page when dock is present */}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TaskManagementDashboard;
