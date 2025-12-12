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

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { TaskCreationForm } from '@/components/tasks/TaskCreationForm';
import { TaskDetailDrawer } from '@/components/tasks/TaskDetailDrawer';
import { useAuth } from '@/hooks/useAuth';
import { useKanbanTasks, taskKeys } from '@/hooks/useTasks';
import { useTaskSocket } from '@/hooks/useTaskSocket';
import { useQueryClient } from '@tanstack/react-query';
import { ViewMode } from '@/lib/api/taskApi';
import { 
  getDashboardConfig, 
  isAdminRole, 
  isSuperAdminRole, 
  isEnterpriseAdminRole 
} from '@/config/dashboardConfig';

export default function UnifiedDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  
  // Get role-specific configuration
  const roleName = user?.roleName || user?.role || '';
  const config = getDashboardConfig(roleName);
  
  // Fetch kanban data with viewMode support (maker-checker)
  const { data: kanbanData, isLoading: kanbanLoading, refetch: refetchKanban } = useKanbanTasks(viewMode);
  
  // Real-time socket updates
  useTaskSocket({
    enabled: !!user,
    onTaskCreated: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
    }, [queryClient]),
    onTaskUpdated: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
    }, [queryClient]),
    onTaskDeleted: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
    }, [queryClient]),
    onTaskMoved: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
    }, [queryClient]),
  });
  
  // Transform kanban data for compatibility with existing Kanban columns
  const groupedTasks = useMemo(() => {
    if (!kanbanData) {
      return { ASSIGNED: [], IN_PROGRESS: [], IN_REVIEW: [], EDITING: [], DONE: [] };
    }
    
    // Type assertion for kanban data structure
    const data = kanbanData as unknown as Record<string, any[]>;
    
    // Map backend columns to display columns
    // IN_REVIEW maps to NEED_ATTENTION for display, EDITING is kept as-is
    return {
      ASSIGNED: data.ASSIGNED || [],
      IN_PROGRESS: data.IN_PROGRESS || [],
      EDITING: data.IN_REVIEW || data.EDITING || data.NEED_ATTENTION || [],
      DONE: data.DONE || [],
    };
  }, [kanbanData]);
  
  // Use kanban loading state
  const dataLoading = kanbanLoading;

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

  // Get tasks for a column - now always uses maker-checker data
  const getTasksForColumn = (dataKey: string) => {
    return groupedTasks[dataKey as keyof typeof groupedTasks] || [];
  };

  // Filter tasks based on search query and status filter
  const getFilteredTasksForColumn = (dataKey: string, columnTitle: string) => {
    let tasks: any[] = getTasksForColumn(dataKey);
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      tasks = tasks.filter((task) => 
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.subItems?.some((item: any) => item.text?.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'ALL') {
      // Map status filter to column title
      const statusColumnMap: Record<string, string[]> = {
        'ASSIGNED': ['ASSIGNED'],
        'IN_PROGRESS': ['IN PROGRESS', 'IN_PROGRESS'],
        'NEED_ATTENTION': ['NEED ATTENTION', 'NEED_ATTENTION', 'EDITING'],
        'DONE': ['DONE', 'COMPLETED'],
      };
      const allowedColumns = statusColumnMap[statusFilter] || [statusFilter];
      if (!allowedColumns.includes(columnTitle) && !allowedColumns.includes(dataKey)) {
        return [];
      }
    }
    
    return tasks;
  };

  // Status filter options
  const statusOptions = [
    { value: 'ALL', label: 'All Status' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'NEED_ATTENTION', label: 'Need Attention' },
    { value: 'DONE', label: 'Done' },
  ];

  // Handle task creation
  const handleCreateTask = () => {
    setShowTaskForm(true);
  };

  // Handle task click - open task detail drawer
  const handleTaskClick = (task: any) => {
    setSelectedTaskId(task.id);
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
          
          {/* Search Bar and Status Filter */}
          <div className="mb-4 px-3 md:px-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-panel/80 backdrop-blur-sm border border-theme rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Status Filter Dropdown */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-panel/80 backdrop-blur-sm border border-theme rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none pr-8 cursor-pointer"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-gray-800">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Active filter indicator */}
              {(searchQuery || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded-lg border border-indigo-500/30"
                >
                  <X className="w-3 h-3" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          
          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="w-full flex-1 overflow-hidden">
              {/* Standard Kanban View with Maker-Checker data source */}
              <div className="flex justify-between gap-3 md:gap-5 mb-1 ml-3 md:ml-4 mr-3 md:mr-4 h-full">
                {/* Kanban Columns */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="grid gap-3 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr h-full overflow-y-auto pr-1 pb-0 mb-0 custom-scrollbar min-h-0">
                    {config.columns.map((column) => {
                      // Hide Create button in "My Work" view (tasks assigned TO me - I don't create here)
                      const canShowCreate = column.showCreate && config.allowTaskCreation && viewMode !== 'my-work';
                      return (
                        <div key={column.key}>
                          <KanbanColumn
                            title={column.title}
                            tasks={getFilteredTasksForColumn(column.dataKey, column.title)}
                            showCreate={canShowCreate}
                            onCreate={canShowCreate ? handleCreateTask : undefined}
                            onTaskClick={handleTaskClick}
                          />
                        </div>
                      );
                    })}
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
                // Invalidate and refetch instead of full page reload
                refetchKanban();
              }}
            />
          </div>
        </div>
      )}
      
      {/* Task Detail Drawer */}
      {selectedTaskId && (
        <TaskDetailDrawer
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </DashboardLayout>
  );
}
