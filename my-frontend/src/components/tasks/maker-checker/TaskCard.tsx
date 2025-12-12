'use client';

import React from 'react';
import { Task, ViewMode } from '@/lib/api/taskApi';
import { CalendarIcon, MessageSquareIcon, PaperclipIcon, UserIcon } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  viewMode: ViewMode;
  onClick: () => void;
}

const PRIORITY_COLORS = {
  LOW: 'border-l-blue-400',
  MEDIUM: 'border-l-yellow-400',
  HIGH: 'border-l-orange-400',
  URGENT: 'border-l-red-500',
  CRITICAL: 'border-l-red-600',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  ASSIGNED: { label: 'Assigned', className: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
  IN_REVIEW: { label: 'In Review', className: 'bg-purple-100 text-purple-700' },
  EDITING: { label: 'Needs Revision', className: 'bg-orange-100 text-orange-700' },
  DONE: { label: 'Done', className: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
};

export function TaskCard({ task, viewMode, onClick }: TaskCardProps) {
  const priorityColor = PRIORITY_COLORS[task.priority] || 'border-l-gray-400';
  const statusBadge = STATUS_BADGES[task.status] || { label: task.status, className: 'bg-gray-100 text-gray-700' };
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const isWaitingApproval = task.status === 'IN_REVIEW';
  const hasRejection = task.rejection_count && task.rejection_count > 0;

  // Determine the relevant user label based on view mode
  const userLabel = viewMode === 'my-work' 
    ? `Created by: ${task.creator_name || 'Unknown'}`
    : `Assigned to: ${task.assignee_name || 'Unassigned'}`;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-lg shadow-sm border-l-4 ${priorityColor}
        p-3 cursor-pointer hover:shadow-md transition-shadow
        ${hasRejection ? 'ring-1 ring-orange-300' : ''}
      `}
    >
      {/* Title and Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
          {task.title}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge.className}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Description Preview */}
      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        {isWaitingApproval && viewMode === 'my-requests' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            ⏳ Waiting for Approval
          </span>
        )}
        {hasRejection && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
            🔄 Revision #{task.rejection_count}
          </span>
        )}
        {isOverdue && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            ⚠️ Overdue
          </span>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <UserIcon className="w-3 h-3" />
          <span className="truncate max-w-[120px]">{userLabel}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
              <CalendarIcon className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          
          {((task.message_count ?? 0) > 0 || (task.comments ?? 0) > 0) && (
            <span className="flex items-center gap-1">
              <MessageSquareIcon className="w-3 h-3" />
              {task.message_count || task.comments || 0}
            </span>
          )}
          
          {((task.attachment_count ?? 0) > 0 || (task.attachments ?? 0) > 0) && (
            <span className="flex items-center gap-1">
              <PaperclipIcon className="w-3 h-3" />
              {task.attachment_count || task.attachments || 0}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
