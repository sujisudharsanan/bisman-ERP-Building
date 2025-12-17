/**
 * TaskCardV2 - Modern Task Card Component
 * Clean, minimal design with hover effects
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  MessageSquare,
  Paperclip,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { calculateTimeStatus } from '@/lib/utils/timeTracking';

// ============================================
// TYPES
// ============================================

interface TaskCardV2Props {
  task: Task;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'kanban';
  selected?: boolean;
  dragging?: boolean;
}

// ============================================
// CONFIGS
// ============================================

const priorityConfig: Record<TaskPriority, { dot: string; text: string }> = {
  [TaskPriority.LOW]: { dot: 'bg-slate-400', text: 'text-slate-600' },
  [TaskPriority.MEDIUM]: { dot: 'bg-blue-500', text: 'text-blue-600' },
  [TaskPriority.HIGH]: { dot: 'bg-orange-500', text: 'text-orange-600' },
  [TaskPriority.URGENT]: { dot: 'bg-red-500', text: 'text-red-600' },
  [TaskPriority.CRITICAL]: { dot: 'bg-purple-500', text: 'text-purple-600' },
};

const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
  OPEN: { bg: 'bg-blue-100', text: 'text-blue-700', icon: AlertCircle },
  IN_PROGRESS: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  IN_REVIEW: { bg: 'bg-purple-100', text: 'text-purple-700', icon: AlertCircle },
  BLOCKED: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-500', icon: AlertCircle },
  ARCHIVED: { bg: 'bg-gray-100', text: 'text-gray-400', icon: Clock },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (date: string | null | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isOverdue = (date: string | null | undefined, status: TaskStatus): boolean => {
  if (!date || status === TaskStatus.COMPLETED || status === TaskStatus.CANCELLED) return false;
  return new Date(date) < new Date(new Date().toDateString());
};

// ============================================
// MAIN COMPONENT
// ============================================

export function TaskCardV2({
  task,
  onClick,
  variant = 'default',
  selected = false,
  dragging = false,
}: TaskCardV2Props) {
  const priority = priorityConfig[task.priority] || priorityConfig[TaskPriority.MEDIUM];
  const status = statusConfig[task.status] || statusConfig.OPEN;
  const displayId = task.unique_id || task.serialNumber || `TSK-${String(task.id).padStart(5, '0')}`;

  const StatusIcon = status.icon;
  
  // State for live time updates
  const [, setTick] = useState(0);
  
  // Calculate time status for this task
  const timeStatus = useMemo(() => {
    if (!task.dueDate) return null;
    return calculateTimeStatus(task.dueDate, task.completedAt, task.status);
  }, [task.dueDate, task.completedAt, task.status]);
  
  // Update timer every minute for live countdown
  useEffect(() => {
    if (!task.dueDate) return;
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [task.dueDate]);
  
  const overdue = timeStatus?.isOverdue || false;

  // Compact variant (for lists)
  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800',
          'border-b border-gray-100 dark:border-gray-700',
          'hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors',
          selected && 'bg-blue-50 dark:bg-blue-900/20'
        )}
      >
        {/* Priority Dot */}
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', priority.dot)} />

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {task.title}
          </p>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {task.assignee && (
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-medium">
              {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
            </div>
          )}
          {task.dueDate && (
            <span className={overdue ? 'text-red-500 font-medium' : ''}>
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Kanban variant (for board columns)
  if (variant === 'kanban') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'group p-4 bg-white dark:bg-gray-800 rounded-xl',
          'border border-gray-200 dark:border-gray-700',
          'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
          'cursor-pointer transition-all duration-200',
          selected && 'ring-2 ring-blue-500 border-blue-500',
          dragging && 'shadow-xl rotate-2 scale-105',
          overdue && 'border-l-4 border-l-red-500',
          // Add border highlight for urgent tasks (less than 4 hours left)
          timeStatus && !timeStatus.isOverdue && timeStatus.urgencyLevel === 'warning' && 'border-l-4 border-l-amber-500'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
            {displayId}
          </span>
          <div className={cn('w-2 h-2 rounded-full', priority.dot)} title={task.priority} />
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {task.title}
        </h4>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
            {task.description}
          </p>
        )}

        {/* Time Status Badge - Shows remaining time or delayed time */}
        {timeStatus && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && (
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium mb-2',
            timeStatus.isOverdue 
              ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' 
              : timeStatus.urgencyLevel === 'warning'
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                : 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
          )}>
            {timeStatus.isOverdue ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                <span>{timeStatus.displayText}</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                <span>{timeStatus.displayText}</span>
              </>
            )}
          </div>
        )}
        
        {/* Completed on time badge */}
        {timeStatus && task.status === TaskStatus.COMPLETED && (
          <div className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium mb-2',
            timeStatus.isCompletedOnTime 
              ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
          )}>
            <Clock className="w-3 h-3" />
            <span>{timeStatus.displayText}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          {/* Assignee */}
          {task.assignee ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-medium">
                {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 hidden group-hover:inline">
                {task.assignee.firstName}
              </span>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <User className="w-3 h-3 text-gray-400" />
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {(task.messageCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {task.messageCount}
              </span>
            )}
            {(task.attachmentCount ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                {task.attachmentCount}
              </span>
            )}
            {task.dueDate && (
              <span className={cn('flex items-center gap-1', overdue && 'text-red-500')}>
                <Calendar className="w-3 h-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {task.progress !== undefined && task.progress > 0 && (
          <div className="mt-3">
            <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default variant (full card)
  return (
    <div
      onClick={onClick}
      className={cn(
        'group p-5 bg-white dark:bg-gray-800 rounded-2xl',
        'border border-gray-200 dark:border-gray-700',
        'hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600',
        'cursor-pointer transition-all duration-300',
        selected && 'ring-2 ring-blue-500 border-blue-500',
        overdue && 'border-l-4 border-l-red-500'
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {displayId}
          </span>
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', status.bg, status.text)}>
            <StatusIcon className="w-3 h-3" />
            {task.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn('w-2.5 h-2.5 rounded-full', priority.dot)} />
          <span className={cn('text-xs font-medium', priority.text)}>{task.priority}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
        {task.title}
      </h3>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
          {task.description}
        </p>
      )}

      {/* Metadata Row */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        {/* Assignee */}
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {task.assignee.firstName} {task.assignee.lastName}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">Unassigned</span>
          )}
        </div>

        {/* Stats & Due Date */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {(task.messageCount ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {task.messageCount}
            </span>
          )}
          {(task.attachmentCount ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-4 h-4" />
              {task.attachmentCount}
            </span>
          )}
          {task.dueDate && (
            <span className={cn('flex items-center gap-1', overdue && 'text-red-500 font-medium')}>
              <Calendar className="w-4 h-4" />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      {task.progress !== undefined && task.progress > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskCardV2;
