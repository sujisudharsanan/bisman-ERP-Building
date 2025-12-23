/**
 * Task Card Component - Professional Redesign
 * Clean header/content structure with status pills and hover actions
 * 
 * Global UX Rule: All entities displayed with Name • ID format
 */

import React, { useState } from 'react';
import { Task } from '@/types/task';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { MessageSquare, Paperclip, Calendar, MoreHorizontal, User, ExternalLink } from 'lucide-react';
import { formatEntityId, getUserDisplayName } from '@/lib/utils/entityDisplay';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onOpenChat?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onClick, 
  onOpenChat,
  onViewDetails,
  className = '' 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
  
  // Generate display ID from unique_id or fallback to formatted id
  const taskDisplayId = task.unique_id || task.serialNumber || `TSK-${String(task.id).padStart(5, '0')}`;

  // Truncate title to 50 characters
  const displayTitle = task.title.length > 50 ? task.title.substring(0, 50) + '...' : task.title;

  // Status pill colors
  const getStatusPillStyle = (status: string) => {
    const statusMap: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
      IN_REVIEW: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
      COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
      DONE: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
      BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
      CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
      DRAFT: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    };
    return statusMap[status] || statusMap.DRAFT;
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        bg-white dark:bg-[#1e1e2e] rounded-xl border border-gray-200 dark:border-gray-700/50
        p-4 cursor-pointer transition-all duration-200 group
        hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20
        hover:border-blue-200 dark:hover:border-blue-500/30
        ${isOverdue ? 'border-l-4 border-l-red-500' : ''}
        ${className}
      `}
    >
      {/* Header: Task ID + Status Pill */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Task ID - Bold, Primary Color */}
          <span 
            className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono"
            title={`Task ID: ${taskDisplayId}`}
          >
            {taskDisplayId}
          </span>
          {/* Status Pill */}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${getStatusPillStyle(task.status)}`}>
            {task.status.replace(/_/g, ' ')}
          </span>
        </div>
        <PriorityBadge priority={task.priority} className="flex-shrink-0" />
      </div>

      {/* Title - Clear, Second Line */}
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 leading-snug">
        {displayTitle}
      </h3>

      {/* Description - Subtle */}
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Assignee - Displayed with Name • U-ID format */}
      {task.assignee && task.assignee.firstName && task.assignee.lastName && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300">
            {task.assignee.firstName[0]}{task.assignee.lastName[0]}
          </div>
          <span className="truncate flex items-center gap-1">
            <span>{task.assignee.firstName} {task.assignee.lastName}</span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
              {formatEntityId(task.assignee.id, 'USER')}
            </span>
          </span>
        </div>
      )}

      {/* Footer: Metadata + Hover Actions */}
      <div className="flex items-center justify-between">
        {/* Metadata Icons */}
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          {task.messageCount && task.messageCount > 0 && (
            <span className="flex items-center gap-1" title={`${task.messageCount} messages`}>
              <MessageSquare className="w-3.5 h-3.5" />
              {task.messageCount}
            </span>
          )}
          {task.attachmentCount && task.attachmentCount > 0 && (
            <span className="flex items-center gap-1" title={`${task.attachmentCount} attachments`}>
              <Paperclip className="w-3.5 h-3.5" />
              {task.attachmentCount}
            </span>
          )}
          {task.dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`} title="Due date">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Hover Action Buttons */}
        <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          {onOpenChat && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenChat();
              }}
              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Open Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          {onViewDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="View Details"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar - More subtle */}
      {task.progress !== undefined && task.progress > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span className="font-medium">{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
