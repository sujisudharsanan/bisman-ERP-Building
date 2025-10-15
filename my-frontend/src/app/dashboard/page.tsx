'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
// Ensure the path below matches your actual file structure.
// For example, if the file is at src/components/layout/DashboardLayout.tsx:
import DashboardLayout from '../../components/layout/DashboardLayout';
import HubInchargeTabs, { HubInchargeBottomBar } from '@/components/hub-incharge/HubInchargeTabs';
import KanbanColumn from '../../components/dashboard/KanbanColumn';
import RightPanel from '../../components/dashboard/RightPanel';
import { useAuth } from '../../hooks/useAuth';
import { useDashboardData } from '../../hooks/useDashboardData';

export default function DashboardPage() {
  const auth = useAuth();
  const user = typeof auth === 'object' && auth !== null && 'user' in auth ? (auth as { user?: any }).user : undefined;
  const authLoading = typeof auth === 'object' && auth !== null && 'loading' in auth ? (auth as { loading?: boolean }).loading : false;
  const router = useRouter();
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'USER');

  // Redirect if user is not authenticated or is SUPER_ADMIN
  React.useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.roleName === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (user.roleName === 'STAFF') {
        router.push('/hub-incharge');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Task Management...</p>
        </div>
      </div>
    );
  }

  if (!user || user.roleName === 'SUPER_ADMIN' || user.roleName === 'STAFF') {
    return null;
  }

  return (
    <DashboardLayout role={user.roleName || 'USER'}>
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
      {/* Hub Incharge Tabs (if present) */}
  <HubInchargeTabs />

      {/* Split: content below Daily Plan and Schedule card */}
      <section aria-label="Extended Dashboard Section" className="mt-6 border-t border-gray-800 pt-6">
        <div className="text-gray-400 text-sm">Extended dashboard area (add analytics, reports, etc.).</div>
      </section>
    </DashboardLayout>
  );
}
