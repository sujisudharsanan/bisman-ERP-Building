/**
 * Task Card Component
 * Displays a task in card format for dashboards and lists
 */

import React from 'react';
import { Task } from '@/types/task';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, className = '' }) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
        p-4 cursor-pointer hover:shadow-md transition-shadow duration-200
        ${isOverdue ? 'border-l-4 border-l-red-500' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 flex-1">
          {task.title}
        </h3>
        <PriorityBadge priority={task.priority} className="ml-2 flex-shrink-0" />
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          
          {/* Assignee */}
          {/* Assignee */}
          {task.assignee && task.assignee.firstName && task.assignee.lastName && (
            <div className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                {task.assignee.firstName[0]}{task.assignee.lastName[0]}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {task.assignee.firstName} {task.assignee.lastName}
              </span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {/* Messages count */}
          {task.messageCount && task.messageCount > 0 && (
            <span className="flex items-center gap-1">
              💬 {task.messageCount}
            </span>
          )}
          
          {/* Attachments count */}
          {task.attachmentCount && task.attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              📎 {task.attachmentCount}
            </span>
          )}
          
          {/* Due date */}
          {task.dueDate && (
            <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {task.progress !== undefined && task.progress > 0 && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {task.progress}% complete
          </span>
        </div>
      )}
    </div>
  );
};
