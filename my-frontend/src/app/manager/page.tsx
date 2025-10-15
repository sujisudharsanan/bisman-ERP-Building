'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function ManagerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'MANAGER');

  // Redirect if user is not authenticated
  React.useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.roleName === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (user.roleName === 'ADMIN') {
        router.push('/admin');
      } else if (user.roleName === 'STAFF') {
        router.push('/hub-incharge');
      }
      // All other roles can access manager dashboard
    }
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roleName) {
    return null;
  }

  return (
    <DashboardLayout role={user.roleName || 'MANAGER'}>
      <div className="h-full max-w-full min-h-0">
  <div className="w-full">
          <div className="flex justify-between gap-3 md:gap-5 pb-6 ml-3 md:ml-4 mr-3 md:mr-4">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <div className="grid gap-3 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
                <div>
                  <KanbanColumn title="DRAFT" tasks={dashboardData.DRAFT} />
                </div>
                <div>
                  <KanbanColumn title="IN PROGRESS" tasks={dashboardData.IN_PROGRESS} />
                </div>
                <div>
                  <KanbanColumn title="EDITING" tasks={dashboardData.EDITING} />
                </div>
                <div>
                  <KanbanColumn title="DONE" tasks={dashboardData.DONE} />
                </div>
              </div>
            </div>
            <div className="flex-none hidden lg:block">
              <RightPanel mode="dock" />
            </div>
          </div>
          {/* No inline grid when using dock */}
        </div>
      </div>
    </DashboardLayout>
  );
}
