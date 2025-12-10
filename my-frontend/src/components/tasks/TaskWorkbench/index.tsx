/**
 * Task Workbench Component
 * 
 * A 4-tab task management dashboard:
 * - DRAFT: Tasks not yet started
 * - IN PROGRESS: Active tasks being worked on
 * - NEED ATTENTION: Overdue, blocked, or pending approval
 * - DONE: Completed tasks
 * 
 * Features:
 * - Tab-based navigation with task counts
 * - Task list with quick preview
 * - Slide-in QuickView panel with chat
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { FileEdit, PlayCircle, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useTaskWorkbench, WorkbenchTab } from './useTaskWorkbench';
import { TaskListView } from './TaskListView';
import { TaskQuickView } from './TaskQuickView';

interface TaskWorkbenchProps {
  className?: string;
}

// Tab configuration
const TABS: {
  id: WorkbenchTab;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}[] = [
  {
    id: 'DRAFT',
    label: 'Draft',
    icon: <FileEdit className="w-4 h-4" />,
    color: 'text-gray-500 border-gray-500',
    description: 'Tasks not yet started',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    icon: <PlayCircle className="w-4 h-4" />,
    color: 'text-blue-500 border-blue-500',
    description: 'Active tasks being worked on',
  },
  {
    id: 'NEED_ATTENTION',
    label: 'Need Attention',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-amber-500 border-amber-500',
    description: 'Overdue or blocked tasks',
  },
  {
    id: 'DONE',
    label: 'Done',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-500 border-green-500',
    description: 'Completed tasks',
  },
];

export function TaskWorkbench({ className = '' }: TaskWorkbenchProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  const {
    activeTab,
    setActiveTab,
    tasks,
    loading,
    error,
    tabCounts,
    refreshTasks,
    hasMore,
    loadMore,
    loadingMore,
  } = useTaskWorkbench();

  // Handle task selection
  const handleTaskSelect = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  // Handle QuickView close
  const handleQuickViewClose = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  // Handle task update from QuickView
  const handleTaskUpdate = useCallback(() => {
    refreshTasks();
  }, [refreshTasks]);

  // Find selected task
  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  return (
    <div className={`flex flex-col h-full bg-gray-50 dark:bg-slate-900 ${className}`}>
      {/* Header with tabs */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Task Workbench
          </h1>
          <button
            onClick={refreshTasks}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-t border-gray-100 dark:border-slate-700">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id] || 0;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3
                  text-sm font-medium transition-all duration-200
                  border-b-2 hover:bg-gray-50 dark:hover:bg-slate-700/50
                  ${isActive
                    ? `${tab.color} bg-gray-50 dark:bg-slate-700/30`
                    : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
                title={tab.description}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span className={`
                    px-1.5 py-0.5 text-xs rounded-full
                    ${isActive
                      ? 'bg-current/10 text-current'
                      : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300'
                    }
                  `}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task List */}
        <div className={`
          flex-1 overflow-hidden transition-all duration-300
          ${selectedTaskId ? 'hidden lg:block lg:w-1/2 xl:w-2/5' : 'w-full'}
        `}>
          {error ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                <button
                  onClick={refreshTasks}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <TaskListView
              tasks={tasks}
              loading={loading}
              selectedTaskId={selectedTaskId}
              onTaskSelect={handleTaskSelect}
              hasMore={hasMore}
              onLoadMore={loadMore}
              loadingMore={loadingMore}
              emptyMessage={getEmptyMessage(activeTab)}
            />
          )}
        </div>

        {/* Quick View Panel */}
        {selectedTaskId && (
          <div className={`
            fixed inset-0 z-50 lg:relative lg:z-0
            lg:w-1/2 xl:w-3/5 lg:border-l lg:border-gray-200 dark:lg:border-slate-700
          `}>
            {/* Mobile overlay */}
            <div 
              className="absolute inset-0 bg-black/50 lg:hidden"
              onClick={handleQuickViewClose}
            />
            
            {/* Panel content */}
            <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg lg:max-w-none lg:relative bg-white dark:bg-slate-800">
              <TaskQuickView
                taskId={selectedTaskId}
                task={selectedTask}
                onClose={handleQuickViewClose}
                onTaskUpdate={handleTaskUpdate}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getEmptyMessage(tab: WorkbenchTab): string {
  switch (tab) {
    case 'DRAFT':
      return 'No draft tasks. Create a new task to get started.';
    case 'IN_PROGRESS':
      return 'No tasks in progress. Start working on a draft task.';
    case 'NEED_ATTENTION':
      return 'Great! No tasks need your attention right now.';
    case 'DONE':
      return 'No completed tasks yet. Keep working!';
    default:
      return 'No tasks found.';
  }
}

export default TaskWorkbench;
