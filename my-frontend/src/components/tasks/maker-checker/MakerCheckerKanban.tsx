'use client';

import React, { useState, useMemo } from 'react';
import { Task, ViewMode, taskApi } from '@/lib/api/taskApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TaskCard } from './TaskCard';
import { TaskActionModal } from './TaskActionModal';
import { PlusIcon, RefreshCwIcon, BriefcaseIcon, ClipboardListIcon } from 'lucide-react';

interface MakerCheckerKanbanProps {
  onCreateTask?: () => void;
}

type KanbanColumn = 'ASSIGNED' | 'IN_PROGRESS' | 'NEED_ATTENTION' | 'DONE';

const COLUMN_CONFIG: Record<KanbanColumn, { label: string; color: string; bgColor: string }> = {
  ASSIGNED: { label: 'Assigned', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  NEED_ATTENTION: { label: 'Need Attention', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  DONE: { label: 'Done', color: 'text-green-600', bgColor: 'bg-green-50' },
};

export function MakerCheckerKanban({ onCreateTask }: MakerCheckerKanbanProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('my-work');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: kanbanData, isLoading, error, refetch } = useQuery({
    queryKey: ['kanban-tasks', viewMode],
    queryFn: () => taskApi.getKanban(viewMode),
    staleTime: 30000,
  });

  // Group tasks into columns
  const columns = useMemo(() => {
    if (!kanbanData) {
      return {
        ASSIGNED: [],
        IN_PROGRESS: [],
        NEED_ATTENTION: [],
        DONE: [],
      };
    }

    return {
      ASSIGNED: kanbanData.ASSIGNED || [],
      IN_PROGRESS: kanbanData.IN_PROGRESS || [],
      NEED_ATTENTION: [
        ...(kanbanData.NEED_ATTENTION || []),
        ...(kanbanData.IN_REVIEW || []),
        ...(kanbanData.EDITING || []),
      ],
      DONE: kanbanData.DONE || [],
    };
  }, [kanbanData]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleTransitionComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
    handleModalClose();
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">Failed to load tasks</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Task Dashboard</h1>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('my-work')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'my-work'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <BriefcaseIcon className="w-4 h-4" />
              My Work
            </button>
            <button
              onClick={() => setViewMode('my-requests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'my-requests'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <ClipboardListIcon className="w-4 h-4" />
              My Requests
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCwIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          {onCreateTask && (
            <button
              onClick={onCreateTask}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <PlusIcon className="w-4 h-4" />
              Create Task
            </button>
          )}
        </div>
      </div>

      {/* View Mode Description */}
      <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
        {viewMode === 'my-work' ? (
          <span>📋 Tasks assigned to you - Complete and submit for review</span>
        ) : (
          <span>📝 Tasks you created - Review and approve completed work</span>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-w-max h-full">
          {(Object.keys(COLUMN_CONFIG) as KanbanColumn[]).map((columnKey) => {
            const config = COLUMN_CONFIG[columnKey];
            const tasks = columns[columnKey];

            return (
              <div
                key={columnKey}
                className={`flex-shrink-0 w-80 ${config.bgColor} rounded-lg flex flex-col`}
              >
                {/* Column Header */}
                <div className={`p-3 ${config.color} font-medium flex items-center justify-between`}>
                  <span>{config.label}</span>
                  <span className="bg-white px-2 py-0.5 rounded-full text-sm">
                    {tasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500" />
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No tasks
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        viewMode={viewMode}
                        onClick={() => handleTaskClick(task)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Action Modal */}
      {selectedTask && (
        <TaskActionModal
          task={selectedTask}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          viewMode={viewMode}
          onTransitionComplete={handleTransitionComplete}
        />
      )}
    </div>
  );
}

export default MakerCheckerKanban;
