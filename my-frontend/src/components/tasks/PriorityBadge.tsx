/**
 * Priority Badge Component
 * Displays task priority with color coding
 */

import React from 'react';
import { TaskPriority } from '@/types/task';

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const priorityConfig = {
  LOW: {
    label: 'Low',
    icon: '↓',
    color: 'bg-gray-100 text-gray-700',
    darkColor: 'dark:bg-gray-800 dark:text-gray-300',
  },
  MEDIUM: {
    label: 'Medium',
    icon: '→',
    color: 'bg-blue-100 text-blue-700',
    darkColor: 'dark:bg-blue-900 dark:text-blue-300',
  },
  HIGH: {
    label: 'High',
    icon: '↑',
    color: 'bg-orange-100 text-orange-700',
    darkColor: 'dark:bg-orange-900 dark:text-orange-300',
  },
  URGENT: {
    label: 'Urgent',
    icon: '⇈',
    color: 'bg-red-100 text-red-700',
    darkColor: 'dark:bg-red-900 dark:text-red-300',
  },
  CRITICAL: {
    label: 'Critical',
    icon: '🔥',
    color: 'bg-red-600 text-white',
    darkColor: 'dark:bg-red-700 dark:text-white',
  },
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className = '' }) => {
  const config = priorityConfig[priority] || priorityConfig.MEDIUM;

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
        ${config.color} ${config.darkColor} ${className}
      `}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};
