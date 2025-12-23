/**
 * Status Badge Component
 * Displays task status with color coding
 * Purple color reserved for WAITING_FOR_CLARIFICATION state
 * Yellow overlay for COMPLETED + Under Review state
 */

import React from 'react';
import { TaskStatus } from '@/types/task';
import { HelpCircle, Eye } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus | string;
  className?: string;
  showIcon?: boolean;
  hasPendingReview?: boolean; // Yellow overlay for completed tasks under review
}

interface StatusConfigItem {
  label: string;
  color: string;
  darkColor: string;
  icon: React.ComponentType<{ className?: string }> | null;
}

const statusConfig: Record<string, StatusConfigItem> = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    darkColor: 'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    icon: null,
  },
  OPEN: {
    label: 'Open',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    darkColor: 'dark:bg-blue-900 dark:text-blue-300 dark:border-blue-600',
    icon: null,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    darkColor: 'dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-600',
    icon: null,
  },
  IN_REVIEW: {
    label: 'In Review',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    darkColor: 'dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-600',
    icon: null,
  },
  BLOCKED: {
    label: 'Blocked',
    color: 'bg-red-100 text-red-700 border-red-300',
    darkColor: 'dark:bg-red-900 dark:text-red-300 dark:border-red-600',
    icon: null,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-green-100 text-green-700 border-green-300',
    darkColor: 'dark:bg-green-900 dark:text-green-300 dark:border-green-600',
    icon: null,
  },
  // Special status for completed tasks that have pending reviews
  COMPLETED_UNDER_REVIEW: {
    label: 'Completed • Under Review',
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    darkColor: 'dark:bg-amber-900 dark:text-amber-300 dark:border-amber-600',
    icon: Eye,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    darkColor: 'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    icon: null,
  },
  ARCHIVED: {
    label: 'Archived',
    color: 'bg-gray-100 text-gray-500 border-gray-300',
    darkColor: 'dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
    icon: null,
  },
  WAITING_FOR_CLARIFICATION: {
    label: 'Awaiting Clarification',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    darkColor: 'dark:bg-purple-900 dark:text-purple-300 dark:border-purple-600',
    icon: HelpCircle,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  className = '', 
  showIcon = true,
  hasPendingReview = false 
}) => {
  // Determine effective status - use yellow overlay for completed tasks under review
  const effectiveStatus = (status === 'COMPLETED' || status === TaskStatus.COMPLETED) && hasPendingReview
    ? 'COMPLETED_UNDER_REVIEW'
    : status;
  
  const config = statusConfig[effectiveStatus] || statusConfig.DRAFT;
  const IconComponent = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${config.color} ${config.darkColor} ${className}
      `}
    >
      {showIcon && IconComponent && <IconComponent className="w-3 h-3" />}
      {config.label}
    </span>
  );
};
