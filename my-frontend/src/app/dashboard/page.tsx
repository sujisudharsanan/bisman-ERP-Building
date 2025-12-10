'use client';

/**
 * Unified Dashboard Page
 * 
 * Single dashboard that dynamically handles ALL user roles.
 * Replaces 24+ separate role-specific dashboard pages.
 * 
 * How it works:
 * 1. Fetches user from auth context
 * 2. Gets role-specific config from dashboardConfig.ts
 * 3. Renders appropriate columns, colors, and features for that role
 * 4. Admin roles (ADMIN, SUPER_ADMIN, ENTERPRISE_ADMIN) redirect to their specialized dashboards
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { TaskCreationForm } from '@/components/tasks/TaskCreationForm';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useWorkflowTasks } from '@/hooks/useWorkflowTasks';
import { 
  getDashboardConfig, 
  isAdminRole, 
  isSuperAdminRole, 
  isEnterpriseAdminRole 
} from '@/config/dashboardConfig';

export default function UnifiedDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showTaskForm, setShowTaskForm] = useState(false);
  
  // Get role-specific configuration
  const roleName = user?.roleName || user?.role || '';
  const config = getDashboardConfig(roleName);
  
  // Fetch data based on config (standard or workflow tasks)
  const { dashboardData, loading: standardLoading } = useDashboardData(roleName || 'USER');
  const { groupedTasks, loading: workflowLoading } = useWorkflowTasks();
  
  // Use appropriate loading state
  const dataLoading = config.useWorkflowTasks ? workflowLoading : standardLoading;

  // Handle authentication and admin redirects
  React.useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      const role = user.roleName || user.role;
      
      // Redirect admin roles to their specialized dashboards
      if (isEnterpriseAdminRole(role)) {
        router.push('/enterprise-admin/dashboard');
        return;
      }
      if (isSuperAdminRole(role)) {
        router.push('/super-admin');
        return;
      }
      if (isAdminRole(role)) {
        router.push('/admin');
        return;
      }
    }
  }, [user, authLoading, router]);

  // Loading state with role-specific styling
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-4 ${config.accentColor} border-t-transparent mx-auto mb-4`}></div>
          <p className="text-gray-600 dark:text-gray-400">{config.loadingText}</p>
        </div>
      </div>
    );
  }

  // Don't render if redirecting
  if (!user || isAdminRole(user.roleName || user.role) || isSuperAdminRole(user.roleName || user.role) || isEnterpriseAdminRole(user.roleName || user.role)) {
    return null;
  }

  // Get tasks for a column based on config
  const getTasksForColumn = (dataKey: string) => {
    if (config.useWorkflowTasks) {
      return groupedTasks[dataKey as keyof typeof groupedTasks] || [];
    }
    return dashboardData[dataKey as keyof typeof dashboardData] || [];
  };

  // Handle task creation
  const handleCreateTask = () => {
    setShowTaskForm(true);
  };

  return (
    <DashboardLayout role={roleName || 'USER'}>
      <div className="h-full max-w-full min-h-0">
        <div className="w-full min-h-0">
          {/* Optional welcome message */}
          {config.welcomeMessage && (
            <div className="mb-4 px-4">
              <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {config.welcomeMessage}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {config.displayName} Dashboard
              </p>
            </div>
          )}
          
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="w-full flex-1 overflow-hidden">
              <div className="flex justify-between gap-3 md:gap-5 mb-1 ml-3 md:ml-4 mr-3 md:mr-4 h-full">
                {/* Kanban Columns */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="grid gap-3 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr h-full overflow-y-auto pr-1 pb-0 mb-0 custom-scrollbar min-h-0">
                    {config.columns.map((column) => (
                      <div key={column.key}>
                        <KanbanColumn
                          title={column.title}
                          tasks={getTasksForColumn(column.dataKey)}
                          showCreate={column.showCreate && config.allowTaskCreation}
                          onCreate={column.showCreate ? handleCreateTask : undefined}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Right Panel */}
                {config.showRightPanel && (
                  <div className="flex-none hidden lg:block h-full">
                    <RightPanel mode="dock" />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Task Creation Modal */}
      {showTaskForm && config.allowTaskCreation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <TaskCreationForm 
              onCancel={() => setShowTaskForm(false)} 
              onTaskCreated={() => {
                setShowTaskForm(false);
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
