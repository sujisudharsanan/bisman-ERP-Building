'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function ManagerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const { dashboardData, loading: dataLoading } = useDashboardData(user?.roleName || 'MANAGER');

  // Debug logging
  React.useEffect(() => {
    console.log('📊 Manager Page State:', {
      user: user?.email,
      role: user?.roleName || user?.role,
      authLoading,
      dataLoading,
      dashboardData: dashboardData ? 'loaded' : 'empty'
    });
  }, [user, authLoading, dataLoading, dashboardData]);

  // Redirect if user is not authenticated
  React.useEffect(() => {
    if (!authLoading) {
      console.log('🔐 Manager Page Auth Check:', { user: user?.email, role: user?.roleName || user?.role });
      if (!user) {
        console.log('❌ No user, redirecting to login');
        router.push('/auth/login');
      } else {
        const userRole = user.roleName || user.role;
        if (userRole === 'SUPER_ADMIN') {
          console.log('🔀 SUPER_ADMIN detected, redirecting');
          router.push('/super-admin');
        } else if (userRole === 'ADMIN') {
          console.log('🔀 ADMIN detected, redirecting');
          router.push('/admin');
        } else if (userRole === 'STAFF') {
          console.log('🔀 STAFF detected, redirecting to hub-incharge');
          router.push('/hub-incharge');
        } else {
          console.log('✅ Role allowed on manager page:', userRole || 'MANAGER (default)');
        }
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
    if (!authLoading && user && !user.roleName && !user.role) {
      console.error('⚠️ User authenticated but role is missing! Showing fallback UI.');
      // Show a visible error instead of null
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mb-4">
                <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Role Information Missing
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Your account is authenticated, but role information is missing. Please contact your administrator or try logging in again.
              </p>
              <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 mb-4 text-xs font-mono text-left">
                <div>User: {user.email || 'Unknown'}</div>
                <div>Role: <span className="text-red-500">null</span></div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/auth/login')}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    console.log('⚠️ No user or role, rendering null');
    return null;
  }

  console.log('🎨 Rendering Manager Dashboard for:', user.roleName || user.role || 'MANAGER (default)');

  return (
    <ErrorBoundary>
      <DashboardLayout role={user.roleName || 'MANAGER'}>
        <div className="h-full max-w-full min-h-0">
          <div className="w-full">
            <div className="flex justify-between gap-3 md:gap-5 pb-6 ml-3 md:ml-4 mr-3 md:mr-4">
              <div className="flex-1 min-w-0 overflow-x-auto">
                <div className="grid gap-3 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr">
                  <ErrorBoundary fallback={<div className="bg-red-100 dark:bg-red-900/20 p-4 rounded"><p className="text-red-600 text-sm">Column Error</p></div>}>
                    <div>
                      <KanbanColumn title="DRAFT" tasks={dashboardData.DRAFT} />
                    </div>
                  </ErrorBoundary>
                  <ErrorBoundary fallback={<div className="bg-red-100 dark:bg-red-900/20 p-4 rounded"><p className="text-red-600 text-sm">Column Error</p></div>}>
                    <div>
                      <KanbanColumn title="IN PROGRESS" tasks={dashboardData.IN_PROGRESS} />
                    </div>
                  </ErrorBoundary>
                  <ErrorBoundary fallback={<div className="bg-red-100 dark:bg-red-900/20 p-4 rounded"><p className="text-red-600 text-sm">Column Error</p></div>}>
                    <div>
                      <KanbanColumn title="EDITING" tasks={dashboardData.EDITING} />
                    </div>
                  </ErrorBoundary>
                  <ErrorBoundary fallback={<div className="bg-red-100 dark:bg-red-900/20 p-4 rounded"><p className="text-red-600 text-sm">Column Error</p></div>}>
                    <div>
                      <KanbanColumn title="DONE" tasks={dashboardData.DONE} />
                    </div>
                  </ErrorBoundary>
                </div>
              </div>
              <div className="flex-none hidden lg:block">
                <ErrorBoundary fallback={null}>
                  <RightPanel mode="dock" />
                </ErrorBoundary>
              </div>
            </div>
            {/* No inline grid when using dock */}
          </div>
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
}
