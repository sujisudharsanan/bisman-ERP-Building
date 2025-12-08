'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function PurchaseOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'PROCUREMENT_OFFICER');

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
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading Procurement Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout role={user.roleName || 'PROCUREMENT_OFFICER'}>
      <div className="h-full max-w-full min-h-0">
        <div className="w-full min-h-0">
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="w-full flex-1 overflow-hidden">
              <div className="flex justify-between gap-3 md:gap-5 mb-1 ml-3 md:ml-4 mr-3 md:mr-4 h-full">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="grid gap-3 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr h-full overflow-y-auto pr-1 pb-0 mb-0 custom-scrollbar min-h-0">
                    <div>
                      <KanbanColumn title="DRAFT" tasks={dashboardData.DRAFT} showCreate onCreate={() => { window.location.href = '/tasks/create'; }} />
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
                <div className="flex-none hidden lg:block h-full">
                  <RightPanel mode="dock" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
