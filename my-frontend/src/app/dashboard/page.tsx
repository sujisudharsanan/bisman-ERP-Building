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

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, X, User, Briefcase, ChevronDown } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KanbanColumn from '@/components/dashboard/KanbanColumn';
import RightPanel from '@/components/dashboard/RightPanel';
import { TaskFormV2 } from '@/components/tasks/v2/TaskFormV2';
import { useAuth } from '@/hooks/useAuth';
import { useTaskAPI } from '@/hooks/useTaskAPI';
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

// Performance metrics type
interface PerformanceMetrics {
  onTimeRate: number;
  responseTime: number;
  completionRate: number;
  qualityScore: number;
}

export default function UnifiedDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { createTask, loading: taskCreating } = useTaskAPI();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('my-work');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    onTimeRate: 0,
    responseTime: 0,
    completionRate: 0,
    qualityScore: 0
  });
  
  // Get role-specific configuration
  const roleName = user?.roleName || user?.role || '';
  const config = getDashboardConfig(roleName);
  
  // Fetch kanban data with viewMode support (maker-checker)
  const { data: kanbanData, isLoading: kanbanLoading, refetch: refetchKanban } = useKanbanTasks(viewMode);
  
  // Fetch performance metrics
  useEffect(() => {
    const fetchPerformanceMetrics = async () => {
      try {
        console.log('[Dashboard] Fetching performance metrics...');
        // Use relative URL - the proxy rewrite will forward to backend
        // Cookies are sent with credentials: 'include'
        const response = await fetch('/api/tasks/performance-metrics', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        console.log('[Dashboard] Performance metrics response status:', response.status);
        if (response.ok) {
          const result = await response.json();
          console.log('[Dashboard] Performance metrics result:', result);
          if (result.success && result.data) {
            setPerformanceMetrics(result.data);
          } else if (result.data) {
            // Backend might return data without success wrapper
            setPerformanceMetrics(result.data);
          }
        } else {
          console.error('[Dashboard] Performance metrics fetch failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
      }
    };
    
    if (user?.id) {
      fetchPerformanceMetrics();
    }
  }, [user?.id]);
  
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

  // Calculate task counts for efficiency metrics
  const taskCounts = useMemo(() => ({
    ASSIGNED: groupedTasks.ASSIGNED?.length || 0,
    IN_PROGRESS: groupedTasks.IN_PROGRESS?.length || 0,
    NEED_ATTENTION: groupedTasks.EDITING?.length || 0,
    DONE: groupedTasks.DONE?.length || 0,
  }), [groupedTasks]);

  // Extract upcoming task deadlines for the schedule panel
  const upcomingDeadlines = useMemo(() => {
    const allTasks = [
      ...groupedTasks.ASSIGNED,
      ...groupedTasks.IN_PROGRESS,
      ...groupedTasks.EDITING,
    ];
    
    // Filter tasks with due dates and sort by due date
    const tasksWithDueDate = allTasks
      .filter((task: any) => task.dueDate || task.due_date)
      .map((task: any) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate || task.due_date,
        status: task.status,
        priority: task.priority,
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 6); // Show top 6 upcoming deadlines
    
    return tasksWithDueDate;
  }, [groupedTasks]);

  // Handle metric click - filter to show that column's tasks
  const handleMetricClick = useCallback((column: string) => {
    setStatusFilter(column);
  }, []);
  
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

  // Handle task click - open in chat panel instead of drawer
  const handleTaskClick = (task: any) => {
    // Dispatch event to open task in chat interface
    // The chat handler expects the task object directly in event.detail
    window.dispatchEvent(new CustomEvent('openTaskInChat', { 
      detail: task
    }));
  };

  return (
    <DashboardLayout role={roleName || 'USER'}>
      <div className="h-full max-w-full min-h-0">
        <div className="w-full min-h-0">
          {/* Search Bar, Status Filter, and Profile */}
          <div className="mb-4 px-3 md:px-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* View Mode Toggle - My Work / My Requests (no All tab) */}
              <div className="flex items-center bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('my-work')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'my-work'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>My Work</span>
                </button>
                <button
                  onClick={() => setViewMode('my-requests')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'my-requests'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>My Requests</span>
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Status Filter Dropdown */}
              <div className="relative">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute left-3 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-10 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer min-w-[130px]"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute right-3 pointer-events-none" />
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
              
              {/* User Profile Section - moved from right panel, width matches RightPanel dock mode */}
              <div 
                className="hidden lg:flex items-center justify-between ml-auto w-44 sm:w-48 md:w-52 lg:w-52 xl:w-52 px-2 py-1 bg-panel/60 backdrop-blur-sm border border-theme rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
                onClick={() => router.push('/common/about-me')}
                title="View profile"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <h3 className="text-sm font-bold text-theme truncate">
                    {user?.username 
                      ? user.username.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                      : user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <p className="text-xs text-muted truncate">
                    {user?.roleName?.replace(/_/g, ' ') || user?.role?.replace(/_/g, ' ') || 'User'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                  {user?.profile_pic_url ? (
                    <>
                      <img 
                        src={user.profile_pic_url.startsWith('/uploads/') 
                          ? user.profile_pic_url.replace('/uploads/', '/api/secure-files/') 
                          : user.profile_pic_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-white font-bold text-sm">
                        {(user?.name || user?.username || user?.email || 'U')[0].toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {(user?.name || user?.username || user?.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
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
                
                {/* Right Panel - profile hidden since it's now in top bar */}
                {config.showRightPanel && (
                  <div className="flex-none hidden lg:block h-full">
                    <RightPanel 
                      mode="dock" 
                      hideProfile 
                      viewMode={viewMode}
                      taskCounts={taskCounts}
                      performanceMetrics={performanceMetrics}
                      onMetricClick={handleMetricClick}
                      upcomingDeadlines={upcomingDeadlines}
                    />
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Task Creation Modal */}
      {showTaskForm && config.allowTaskCreation && (
        <TaskFormV2
          mode="create"
          onCancel={() => setShowTaskForm(false)}
          onSubmit={async (data) => {
            await createTask(data);
            setShowTaskForm(false);
            // Invalidate all kanban queries (both view modes) and refetch current view
            queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
            refetchKanban();
            // Switch to "My Requests" to show the newly created task
            setViewMode('my-requests');
          }}
          isLoading={taskCreating}
        />
      )}
    </DashboardLayout>
  );
}
