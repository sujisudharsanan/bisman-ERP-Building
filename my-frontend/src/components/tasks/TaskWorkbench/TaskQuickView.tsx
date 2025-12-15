/**
 * Task Quick View Component
 * 
 * Slide-in panel showing:
 * - Task details header (status, priority, assignee)
 * - Scrollable chat/message history
 * - Message input at bottom
 * - Quick action buttons
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Send,
  Paperclip,
  Clock,
  User,
  Calendar,
  MessageSquare,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  AlertTriangle,
  MoreVertical,
  Loader2,
  Bot,
} from 'lucide-react';
import { WorkbenchTask } from './useTaskWorkbench';
import { TaskStatus } from '@/types/task';

interface TaskQuickViewProps {
  taskId: string;
  task: WorkbenchTask | null;
  onClose: () => void;
  onTaskUpdate?: () => void;
}

interface Message {
  id: string;
  senderId: number;
  senderName: string;
  senderType: 'user' | 'system' | 'assistant';
  content: string;
  createdAt: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
  }[];
}

interface TaskDetails {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  creatorId: number;
  assigneeId?: number;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  creator?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  assignee?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

export function TaskQuickView({
  taskId,
  task: initialTask,
  onClose,
  onTaskUpdate,
}: TaskQuickViewProps) {
  const [task, setTask] = useState<TaskDetails | null>(initialTask as any);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages update
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch task details and messages
  const fetchTaskData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}/quick-view`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task details');
      }

      const data = await response.json();
      
      if (data.success) {
        setTask(data.task);
        setMessages(data.messages || []);
      } else {
        throw new Error(data.error || 'Failed to fetch task');
      }
    } catch (err) {
      console.error('Error fetching task:', err);
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskData();
  }, [fetchTaskData]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
      } else {
        // Optimistically add the message anyway
        setMessages(prev => [...prev, {
          id: `temp-${Date.now()}`,
          senderId: 0,
          senderName: 'You',
          senderType: 'user',
          content: messageText,
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Show the message with error state
      setMessages(prev => [...prev, {
        id: `temp-${Date.now()}`,
        senderId: 0,
        senderName: 'You',
        senderType: 'user',
        content: messageText,
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Update task status
  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setTask(prev => prev ? { ...prev, status: newStatus } : null);
        onTaskUpdate?.();
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-slate-800">
        <QuickViewHeader onClose={onClose} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !task) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-slate-800">
        <QuickViewHeader onClose={onClose} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 dark:text-red-400">{error || 'Task not found'}</p>
            <button
              onClick={fetchTaskData}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {task.title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="hidden lg:block p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 pb-3 flex items-center gap-2">
          {task.status === 'DRAFT' && (
            <ActionButton
              icon={<PlayCircle className="w-4 h-4" />}
              label="Start"
              onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}
              color="blue"
            />
          )}
          {task.status === 'IN_PROGRESS' && (
            <>
              <ActionButton
                icon={<PauseCircle className="w-4 h-4" />}
                label="Pause"
                onClick={() => handleStatusChange(TaskStatus.BLOCKED)}
                color="amber"
              />
              <ActionButton
                icon={<CheckCircle className="w-4 h-4" />}
                label="Complete"
                onClick={() => handleStatusChange(TaskStatus.COMPLETED)}
                color="green"
              />
            </>
          )}
          {task.status === 'BLOCKED' && (
            <ActionButton
              icon={<PlayCircle className="w-4 h-4" />}
              label="Resume"
              onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}
              color="blue"
            />
          )}
        </div>

        {/* Task Meta */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>{task.assignee.firstName || task.assignee.username}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Description (collapsible) */}
      {task.description && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/50">
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
            {task.description}
          </p>
        </div>
      )}

      {/* Messages / Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <MessageSquare className="w-10 h-10 mb-2" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation below</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input (hidden for completed/cancelled tasks) */}
      {task && !['DONE', 'COMPLETED', 'CANCELLED'].includes(task.status) && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-slate-700 p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-3 py-2 pr-10 text-sm bg-gray-100 dark:bg-slate-700 border-0 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                style={{ maxHeight: '120px', minHeight: '40px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick View Header (for loading/error states)
function QuickViewHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 bg-gray-200 dark:bg-slate-600 rounded animate-pulse" />
        <button
          onClick={onClose}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Message Bubble
function MessageBubble({ message }: { message: Message }) {
  const isSystem = message.senderType === 'system';
  const isAssistant = message.senderType === 'assistant';
  const isUser = message.senderType === 'user';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAssistant 
            ? 'bg-gradient-to-br from-purple-500 to-indigo-500' 
            : 'bg-gradient-to-br from-blue-500 to-cyan-500'
        } text-white`}>
          {isAssistant ? (
            <Bot className="w-4 h-4" />
          ) : (
            <span className="text-xs font-medium">
              {message.senderName.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      )}
      
      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {message.senderName}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatTime(new Date(message.createdAt))}
            </span>
          </div>
        )}
        
        <div className={`px-3 py-2 rounded-lg text-sm ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : isAssistant
              ? 'bg-purple-100 dark:bg-purple-900/30 text-gray-800 dark:text-gray-200 rounded-bl-sm'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
        }`}>
          {message.content}
        </div>

        {isUser && (
          <div className="flex justify-end mt-1">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatTime(new Date(message.createdAt))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Action Button
function ActionButton({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: 'blue' | 'green' | 'amber' | 'red';
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
    green: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
    amber: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50',
    red: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${colors[color]}`}
    >
      {icon}
      {label}
    </button>
  );
}

// Status Badge
function StatusBadge({ status }: { status: TaskStatus }) {
  const config: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    OPEN: { label: 'Open', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    IN_REVIEW: { label: 'Review', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    BLOCKED: { label: 'Blocked', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    COMPLETED: { label: 'Done', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    ARCHIVED: { label: 'Archived', className: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
  };

  const { label, className } = config[status] || config.DRAFT;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { label: string; className: string }> = {
    CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    URGENT: { label: 'Urgent', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    HIGH: { label: 'High', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    LOW: { label: 'Low', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  };

  const { label, className } = config[priority] || config.MEDIUM;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

// Format time
function formatTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default TaskQuickView;
