/**
 * Task Chat Sidebar Component
 * Split sidebar with Users (top) and Tasks (bottom) sections
 */

'use client';

import React from 'react';
import { StatusBadge } from './StatusBadge';
import { UserAvatar } from './UserAvatar';

interface User {
  id: number;
  name: string;
  role?: string;
  online?: boolean;
  unreadCount?: number;
}

interface TaskItem {
  id: number;
  title: string;
  status: string;
  unreadCount?: number;
  assignee?: {
    id: number;
    name: string;
  };
}

interface TaskChatSidebarProps {
  users: User[];
  tasks: TaskItem[];
  selectedUserId?: number;
  selectedTaskId?: number;
  onUserSelect: (userId: number) => void;
  onTaskSelect: (taskId: number) => void;
}

export const TaskChatSidebar: React.FC<TaskChatSidebarProps> = ({
  users,
  tasks,
  selectedUserId,
  selectedTaskId,
  onUserSelect,
  onTaskSelect,
}) => {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Users Section (Top 50%) */}
      <div className="flex-1 overflow-y-auto border-b border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Users ({users.length})
          </h3>
        </div>
        
        <div className="p-2 space-y-1">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onUserSelect(user.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${selectedUserId === user.id
                  ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              {/* Avatar with Online Status */}
              <div className="relative">
                <UserAvatar name={user.name} size="md" />
                {user.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.name}
                  </span>
                  {user.unreadCount && user.unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                      {user.unreadCount > 99 ? '99+' : user.unreadCount}
                    </span>
                  )}
                </div>
                {user.role && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.role}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Section (Bottom 50%) */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Tasks ({tasks.length})
          </h3>
        </div>
        
        <div className="p-2 space-y-1">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskSelect(task.id)}
              className={`
                w-full px-3 py-2 rounded-lg transition-colors text-left
                ${selectedTaskId === task.id
                  ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              {/* Task Title */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                  {task.title}
                </span>
                {task.unreadCount && task.unreadCount > 0 && (
                  <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {task.unreadCount > 99 ? '99+' : task.unreadCount}
                  </span>
                )}
              </div>

              {/* Task Metadata */}
              <div className="flex items-center justify-between">
                <StatusBadge status={task.status as any} />
                {task.assignee && (
                  <UserAvatar name={task.assignee.name} size="sm" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
