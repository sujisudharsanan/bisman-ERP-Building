'use client';

import React from 'react';

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened' | 'wont_fix' | 'duplicate';
export type TaskStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';

interface StatusBadgeProps {
  status: IssueStatus | TaskStatus | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  // Issue statuses
  open: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Open' },
  in_progress: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', label: 'In Progress' },
  resolved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Resolved' },
  closed: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', label: 'Closed' },
  reopened: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'Reopened' },
  wont_fix: { bg: 'bg-gray-200 dark:bg-gray-600', text: 'text-gray-600 dark:text-gray-300', label: "Won't Fix" },
  duplicate: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', label: 'Duplicate' },
  // Task statuses
  pending: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300', label: 'Pending' },
  passed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Passed' },
  failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Failed' },
  blocked: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', label: 'Blocked' },
  skipped: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-300', label: 'Skipped' },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || { 
    bg: 'bg-gray-100 dark:bg-gray-700', 
    text: 'text-gray-700 dark:text-gray-300', 
    label: status 
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-full font-medium
        ${config.bg} ${config.text} ${sizeClasses[size]} ${className}
      `}
    >
      {config.label}
    </span>
  );
}

export default StatusBadge;
