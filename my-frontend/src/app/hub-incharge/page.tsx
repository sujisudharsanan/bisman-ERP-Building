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
    <div className="h-full max-w-full min-h-0">
  <div className="w-full min-h-0">
            {/* main content area; grid will scroll and split stays at bottom */}
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

              {/* sticky split section pinned to bottom */}
              <section aria-label="Extended Hub Incharge Section" className="ml-3 md:ml-4 mr-3 md:mr-4 border-t border-gray-800 pt-0 sticky bottom-0 bg-transparent z-10">
                <div className="w-full rounded-xl border border-gray-800 bg-gray-900/40 p-3 md:p-4">
                  <h2 className="text-sm font-semibold tracking-wide text-gray-300 uppercase mb-2">Extended Section</h2>
                  <p className="text-gray-400 text-xs md:text-sm">Full-width area below Daily Plan & Schedule card. Add KPIs, logs, analytics, or widgets here.</p>
                </div>
              </section>
            </main>
          {/* No inline grid when using dock */}
        </div>
      </div>
    </DashboardLayout>
  );
}
