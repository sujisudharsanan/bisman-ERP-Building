/**
 * Task List View Component
 * 
 * Displays a scrollable list of task cards with:
 * - Compact task cards showing key info
 * - Infinite scroll / load more
 * - Loading and empty states
 * - Selection highlighting
 */

'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { 
  MessageSquare, 
  Paperclip, 
  Clock, 
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { WorkbenchTask } from './useTaskWorkbench';

interface TaskListViewProps {
  tasks: WorkbenchTask[];
  loading: boolean;
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  emptyMessage?: string;
}

export function TaskListView({
  tasks,
  loading,
  selectedTaskId,
  onTaskSelect,
  hasMore,
  onLoadMore,
  loadingMore,
  emptyMessage = 'No tasks found.',
}: TaskListViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-3 space-y-2">
        {[...Array(6)].map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={listRef} className="h-full overflow-y-auto p-3 space-y-2">
      {tasks.map((task) => (
        <TaskListCard
          key={task.id}
          task={task}
          isSelected={selectedTaskId === task.id}
          onClick={() => onTaskSelect(task.id)}
        />
      ))}

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {loadingMore ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <button
              onClick={onLoadMore}
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Compact task card for list view
interface TaskListCardProps {
  task: WorkbenchTask;
  isSelected: boolean;
  onClick: () => void;
}

function TaskListCard({ task, isSelected, onClick }: TaskListCardProps) {
  const priorityColors: Record<string, string> = {
    CRITICAL: 'border-l-red-500',
    URGENT: 'border-l-orange-500',
    HIGH: 'border-l-amber-500',
    MEDIUM: 'border-l-blue-500',
    LOW: 'border-l-gray-400',
  };

  const priorityDotColors: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    URGENT: 'bg-orange-500',
    HIGH: 'bg-amber-500',
    MEDIUM: 'bg-blue-500',
    LOW: 'bg-gray-400',
  };

  const timeAgo = getTimeAgo(new Date(task.createdAt));
  const borderColor = priorityColors[task.priority] || priorityColors.MEDIUM;

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-white dark:bg-slate-800 rounded-lg 
        border-l-4 ${borderColor}
        border border-gray-200 dark:border-slate-700
        p-3 cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-gray-300 dark:hover:border-slate-600
        ${isSelected 
          ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-md' 
          : ''
        }
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
          {task.title}
        </h3>
        
        {/* Priority dot */}
        <div 
          className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${priorityDotColors[task.priority] || priorityDotColors.MEDIUM}`}
          title={task.priority}
        />
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
          {task.description}
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between text-xs">
        {/* Left side: Creator avatar + time */}
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          {task.creator && (
            <div 
              className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-[10px] font-medium flex items-center justify-center"
              title={task.creator.username}
            >
              {getInitials(task.creator)}
            </div>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        </div>

        {/* Right side: Indicators */}
        <div className="flex items-center gap-2">
          {/* Overdue indicator */}
          {task.isOverdue && (
            <span className="flex items-center gap-0.5 text-red-500" title="Overdue">
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Message count */}
          {task.messageCount > 0 && (
            <span className="flex items-center gap-0.5 text-gray-400" title={`${task.messageCount} messages`}>
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{task.messageCount}</span>
            </span>
          )}

          {/* Attachment count */}
          {task.attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-gray-400" title={`${task.attachmentCount} attachments`}>
              <Paperclip className="w-3.5 h-3.5" />
              <span>{task.attachmentCount}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading skeleton
function TaskCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 animate-pulse">
      <div className="flex items-start gap-2 mb-2">
        <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded flex-1" />
        <div className="w-2 h-2 bg-gray-200 dark:bg-slate-600 rounded-full" />
      </div>
      <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-3/4 mb-3" />
      <div className="flex justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 dark:bg-slate-600 rounded-full" />
          <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-16" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-8" />
          <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-8" />
        </div>
      </div>
    </div>
  );
}

// Helper: Get initials from user
function getInitials(user: { username: string; firstName?: string; lastName?: string }): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return user.username.substring(0, 2).toUpperCase();
}

// Helper: Get relative time
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default TaskListView;
