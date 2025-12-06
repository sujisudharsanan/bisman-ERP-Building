'use client';

import React from 'react';
import { StatusBadge, IssueStatus } from './StatusBadge';
import { SeverityBadge, Severity } from './SeverityBadge';
import { ModuleTag } from './ModuleTag';
import { UserAvatar } from './UserAvatar';
import Link from 'next/link';

export interface IssueCardData {
  id: number | string;
  issueCode: string;
  title: string;
  description?: string | null;
  module?: string | null;
  severity?: Severity | string;
  priority?: string;
  status: IssueStatus | string;
  issueType?: string;
  assignedTo?: {
    id: number;
    name: string;
    imageUrl?: string;
  } | null;
  openedBy?: {
    id: number;
    name: string;
    imageUrl?: string;
  } | null;
  createdAt?: string;
  relatedTaskId?: number | null;
}

interface IssueCardProps {
  issue: IssueCardData;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function IssueCard({ issue, compact = false, onClick, className = '' }: IssueCardProps) {
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
      {/* Header with issue code */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
              {issue.issueCode}
            </code>
            {issue.issueType && (
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {issue.issueType}
              </span>
            )}
          </div>
          <h3 className={`font-medium text-gray-900 dark:text-gray-100 ${compact ? 'text-sm' : 'text-base'} line-clamp-2`}>
            {issue.title}
          </h3>
        </div>
        <StatusBadge status={issue.status} size={compact ? 'sm' : 'md'} />
      </div>

      {/* Description (non-compact only) */}
      {!compact && issue.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {issue.description}
        </p>
      )}

      {/* Meta info */}
      <div className={`flex flex-wrap items-center gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
        {issue.severity && <SeverityBadge level={issue.severity} size="sm" />}
        {issue.module && <ModuleTag module={issue.module} size="sm" />}
        {issue.relatedTaskId && (
          <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">
            Task #{issue.relatedTaskId}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between ${compact ? 'mt-2' : 'mt-3'}`}>
        {/* Assignee */}
        <div className="flex items-center gap-2">
          {issue.assignedTo ? (
            <>
              <UserAvatar
                userId={issue.assignedTo.id}
                name={issue.assignedTo.name}
                imageUrl={issue.assignedTo.imageUrl}
                size="xs"
              />
              {!compact && (
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {issue.assignedTo.name}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Unassigned</span>
          )}
        </div>

        {/* Created date */}
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(issue.createdAt)}
        </span>
      </div>
    </div>
  );

  return (
    <Link href={`/qa/issues/${issue.id}`} className="block">
      {content}
    </Link>
  );
}

export default IssueCard;
