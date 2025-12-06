'use client';

import React from 'react';
import { UserAvatar } from './UserAvatar';

export interface TimelineItemData {
  id: number | string;
  type: 'status_change' | 'severity_change' | 'assignment_change' | 'description_update' | 'git_commit' | 'comment' | 'created';
  fieldName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  comment?: string | null;
  gitCommit?: string | null;
  changedBy?: {
    id: number;
    name: string;
    imageUrl?: string;
  } | null;
  changedAt: string;
}

interface TimelineItemProps {
  item: TimelineItemData;
  isLast?: boolean;
}

const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
  status_change: { icon: '🔄', color: 'bg-blue-500', label: 'Status Changed' },
  severity_change: { icon: '⚠️', color: 'bg-orange-500', label: 'Severity Changed' },
  assignment_change: { icon: '👤', color: 'bg-purple-500', label: 'Reassigned' },
  description_update: { icon: '✏️', color: 'bg-gray-500', label: 'Description Updated' },
  git_commit: { icon: '🔗', color: 'bg-green-500', label: 'Commit Added' },
  comment: { icon: '💬', color: 'bg-cyan-500', label: 'Comment' },
  created: { icon: '🆕', color: 'bg-emerald-500', label: 'Issue Created' },
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function TimelineItem({ item, isLast = false }: TimelineItemProps) {
  const config = typeConfig[item.type] || typeConfig.comment;
  const isComment = item.type === 'comment';

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Icon */}
      <div
        className={`
          relative z-10 flex-shrink-0 w-10 h-10 rounded-full
          ${config.color} flex items-center justify-center text-white text-lg
        `}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isComment ? 'pt-0' : ''}`}>
        {isComment ? (
          // Comment as chat bubble
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <UserAvatar
                userId={item.changedBy?.id}
                name={item.changedBy?.name || 'Unknown'}
                imageUrl={item.changedBy?.imageUrl}
                size="xs"
              />
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {item.changedBy?.name || 'Unknown User'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(item.changedAt)}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {item.comment || item.newValue}
            </p>
          </div>
        ) : (
          // Change entry
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {item.changedBy?.name || 'System'}
              </span>
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                {config.label}
              </span>
              {item.fieldName && item.fieldName !== 'comment' && (
                <span className="text-gray-500 dark:text-gray-500 text-xs">
                  ({item.fieldName})
                </span>
              )}
            </div>

            {/* Old → New values */}
            {item.oldValue !== undefined && item.newValue !== undefined && item.type !== 'created' && (
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded line-through">
                  {item.oldValue || '(empty)'}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                  {item.newValue || '(empty)'}
                </span>
              </div>
            )}

            {/* Comment attached to change */}
            {item.comment && item.type !== 'comment' && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                &ldquo;{item.comment}&rdquo;
              </p>
            )}

            {/* Git commit link */}
            {item.gitCommit && (
              <a
                href={`https://github.com/commit/${item.gitCommit}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {item.gitCommit.substring(0, 7)}
                </code>
              </a>
            )}

            {/* Timestamp */}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {formatDate(item.changedAt)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelineItem;
