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
  
  // Get user role, normalize it for comparison
  const userRole = (user?.roleName || user?.role || '').toUpperCase().replace(/[_\s-]/g, '_');
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'Hub Incharge');

  // Redirect if user is not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      console.log('🚫 No user authenticated, redirecting to login');
      router.push('/auth/login');
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

  // Allow access for authenticated users (Hub Incharge, STAFF, or compatible roles)
  if (!user) {
    console.log('🚫 No user, not rendering page');
    return null;
  }

  console.log('✅ Rendering Hub Incharge page for user:', user.username, 'role:', user.roleName || user.role);

  return (
    <DashboardLayout role={user.roleName || user.role || 'Hub Incharge'}>
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

              {/* Extended section removed as requested */}
            </main>
          {/* No inline grid when using dock */}
        </div>
      </div>
    </DashboardLayout>
  );
}
