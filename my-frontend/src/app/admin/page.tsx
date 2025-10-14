'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'ADMIN');

  // Redirect if user is not authenticated or doesn't have ADMIN access
  React.useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.roleName === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (user.roleName === 'MANAGER') {
        router.push('/manager');
      } else if (user.roleName === 'STAFF') {
        router.push('/hub-incharge');
      } else if (user.roleName && !['ADMIN', 'SUPER_ADMIN'].includes(user.roleName)) {
        router.push('/auth/login');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roleName || (user.roleName === 'SUPER_ADMIN') || !['ADMIN', 'SUPER_ADMIN'].includes(user.roleName)) {
    return null;
  }

  return (
    <DashboardLayout role={user.roleName || 'ADMIN'}>
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
          {/* No inline grid when using dock */}
        </div>
      </div>
    </DashboardLayout>
  );
}
