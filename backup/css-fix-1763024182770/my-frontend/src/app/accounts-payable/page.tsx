'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function AccountsPayableDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'ACCOUNTS_PAYABLE');

  React.useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.roleName !== 'ACCOUNTS_PAYABLE') {
        // Redirect to appropriate dashboard based on role
        if (user.roleName === 'SUPER_ADMIN') router.push('/super-admin');
        else router.push('/dashboard');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Accounts Payable Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout role={user.roleName || 'ACCOUNTS_PAYABLE'}>
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
