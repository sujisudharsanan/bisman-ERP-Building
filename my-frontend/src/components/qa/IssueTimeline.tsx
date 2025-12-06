'use client';

import React from 'react';
import { TimelineItem, TimelineItemData } from './TimelineItem';

interface IssueTimelineProps {
  items: TimelineItemData[];
  loading?: boolean;
  className?: string;
}

export function IssueTimeline({ items, loading = false, className = '' }: IssueTimelineProps) {
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-2">📝</div>
        <p className="text-gray-500 dark:text-gray-400">No history yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Changes and comments will appear here
        </p>
      </div>
    );
  }

  // Sort by date descending (newest first)
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return (
    <div className={`${className}`}>
      {sortedItems.map((item, index) => (
        <TimelineItem
          key={item.id}
          item={item}
          isLast={index === sortedItems.length - 1}
        />
      ))}
    </div>
  );
}

export default IssueTimeline;
