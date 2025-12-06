'use client';

import React from 'react';
import { StatusBadge, TaskStatus } from './StatusBadge';
import { SeverityBadge, Priority } from './SeverityBadge';
import { ModuleTag } from './ModuleTag';
import { UserAvatar } from './UserAvatar';
import Link from 'next/link';

export interface TaskCardData {
  id: number | string;
  title: string;
  description?: string | null;
  module?: string | null;
  testType?: string;
  priority?: Priority | string;
  status: TaskStatus | string;
  assignedTo?: {
    id: number;
    name: string;
    imageUrl?: string;
  } | null;
  dueDate?: string | null;
  createdAt?: string;
}

interface TaskCardProps {
  task: TaskCardData;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isOverdue = (dueDate: string | null | undefined): boolean => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

export function TaskCard({ task, compact = false, onClick, className = '' }: TaskCardProps) {
  const overdue = isOverdue(task.dueDate) && !['passed', 'closed', 'skipped'].includes(task.status);

  const content = (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
        hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md
        transition-all duration-200 cursor-pointer
        ${compact ? 'p-3' : 'p-4'}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-medium text-gray-900 dark:text-gray-100 ${compact ? 'text-sm' : 'text-base'} line-clamp-2`}>
          {task.title}
        </h3>
        <StatusBadge status={task.status} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Description (non-compact only) */}
      {!compact && task.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Meta info */}
      <div className={`flex flex-wrap items-center gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
        {task.module && <ModuleTag module={task.module} size="sm" />}
        {task.priority && <SeverityBadge level={task.priority} type="priority" size="sm" />}
        {task.testType && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded capitalize">
            {task.testType}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between ${compact ? 'mt-2' : 'mt-3'}`}>
        {/* Assignee */}
        <div className="flex items-center gap-2">
          {task.assignedTo ? (
            <UserAvatar
              userId={task.assignedTo.id}
              name={task.assignedTo.name}
              imageUrl={task.assignedTo.imageUrl}
              size="xs"
              showName={!compact}
            />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Unassigned</span>
          )}
        </div>

        {/* Due date */}
        {task.dueDate && (
          <span
            className={`text-xs ${
              overdue
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {overdue && '⚠️ '}
            Due: {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Link href={`/qa/test-tasks/${task.id}`} className="block">
      {content}
    </Link>
  );
}

export default TaskCard;
