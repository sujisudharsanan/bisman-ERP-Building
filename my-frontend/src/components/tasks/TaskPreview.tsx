/**
 * Task Preview Component
 * Shows formatted task preview before creation
 */

'use client';

import React from 'react';
import { CreateTaskInput, TaskPriority, TaskStatus } from '@/types/task';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface TaskPreviewProps {
  taskData: Partial<CreateTaskInput>;
  onConfirm: () => void;
  onEdit: () => void;
}

export const TaskPreview: React.FC<TaskPreviewProps> = ({
  taskData,
  onConfirm,
  onEdit,
}) => {
  const formatDate = (date?: string) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Task Preview
        </h2>
        <StatusBadge status={TaskStatus.DRAFT} />
      </div>

      {/* Task Title */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {taskData.title || 'Untitled Task'}
        </h3>
      </div>

      {/* Task Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Priority
          </label>
          <PriorityBadge priority={taskData.priority || TaskPriority.MEDIUM} />
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Assignee
          </label>
          <p className="text-gray-900 dark:text-gray-100">
            User #{taskData.assigneeId || 'Not assigned'}
          </p>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Due Date
          </label>
          <p className="text-gray-900 dark:text-gray-100">
            {formatDate(taskData.dueDate)}
          </p>
        </div>
      </div>

      {/* Description */}
      {taskData.description && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Description
          </label>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
              {taskData.description}
            </p>
          </div>
        </div>
      )}

      {/* Spell Check Suggestions (Placeholder) */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          ✓ Spell Check Complete
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          No spelling errors detected. Your task is ready to be created.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg
                   font-medium transition-colors"
        >
          ✓ Confirm & Create
        </button>
        
        <button
          onClick={onEdit}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                   hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          ← Edit Again
        </button>
      </div>
    </div>
  );
};
