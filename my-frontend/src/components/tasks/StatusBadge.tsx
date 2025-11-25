/**
 * Status Badge Component
 * Displays task status with color coding
 */

import React from 'react';
import { TaskStatus } from '@/types/task';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    darkColor: 'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  },
  OPEN: {
    label: 'Open',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    darkColor: 'dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    darkColor: 'dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-600',
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    darkColor: 'dark:bg-purple-900 dark:text-purple-300 dark:border-purple-600',
  },
  BLOCKED: {
    label: 'Blocked',
    color: 'bg-red-100 text-red-700 border-red-300',
    darkColor: 'dark:bg-red-900 dark:text-red-300 dark:border-red-600',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700 border-green-300',
    darkColor: 'dark:bg-green-900 dark:text-green-300 dark:border-green-600',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    darkColor: 'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'bg-gray-100 text-gray-500 border-gray-300',
    darkColor: 'dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${config.color} ${config.darkColor} ${className}
      `}
    >
      {config.label}
    </span>
  );
};
