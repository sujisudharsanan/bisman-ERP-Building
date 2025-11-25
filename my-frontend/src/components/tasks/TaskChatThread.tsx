/**
 * Task Chat Thread Component
 * Task metadata header + message thread with real-time updates
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { UserAvatar } from './UserAvatar';
import { useTaskAPI } from '@/hooks/useTaskAPI';
import { useTaskEvents, useTypingIndicator } from '@/contexts/SocketContext';

interface Message {
  id: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
}

interface TaskChatThreadProps {
  taskId: number;
  task: {
    title: string;
    status: string;
    priority: string;
    assignee: {
      id: number;
      name: string;
    };
    dueDate?: string;
    description?: string;
  };
  messages: Message[];
  currentUserId: number;
  onMessagesUpdate?: (messages: Message[]) => void;
}

export const TaskChatThread: React.FC<TaskChatThreadProps> = ({
  taskId,
  task,
  messages,
  currentUserId,
  onMessagesUpdate,
}) => {
  const { addMessage, startTask, completeTask, approveTask, rejectTask, loading } = useTaskAPI();
  const [messageInput, setMessageInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Socket.IO real-time updates
  const { typingUsers } = useTypingIndicator(taskId);
  const { events } = useTaskEvents(taskId);
  
  // Handle real-time events
  useEffect(() => {
    events.forEach((event) => {
      if (event.type === 'MESSAGE_ADDED') {
        const newMessage: Message = {
          id: Date.now(),
          userId: event.userId,
          userName: 'User', // TODO: Get from event data
          content: (event.data as any).message || '',
          createdAt: event.timestamp,
        };
        setLocalMessages((prev) => [...prev, newMessage]);
        onMessagesUpdate?.([...localMessages, newMessage]);
      } else if (event.type === 'STATUS_CHANGED') {
        // Refresh task data would be handled by parent
        console.log('Task status changed:', event.data);
      }
    });
  }, [events]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, typingUsers]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || loading) return;

    const messageData = {
      taskId,
      messageText: messageInput.trim(),
    };
    const success = await addMessage(taskId, messageData);
    if (success) {
      setMessageInput('');
    }
  };

  const handleStatusAction = async (action: 'start' | 'complete' | 'approve' | 'reject') => {
    const actions = {
      start: () => startTask(taskId),
      complete: () => completeTask(taskId, ''),
      approve: () => approveTask(taskId, ''),
      reject: () => rejectTask(taskId, ''),
    };
    
    await actions[action]();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const canSendMessages = task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Task Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {task.title}
          </h2>
          <div className="flex gap-2">
            <StatusBadge status={task.status as any} />
            <PriorityBadge priority={task.priority as any} />
          </div>
        </div>

        {/* Task Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <UserAvatar name={task.assignee.name} size="sm" />
            <span>{task.assignee.name}</span>
          </div>
          {task.dueDate && (
            <div>
              📅 Due: {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Description */}
        {task.description && (
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            {task.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {task.status === 'OPEN' && (
            <button
              onClick={() => handleStatusAction('start')}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm
                       font-medium transition-colors disabled:opacity-50"
            >
              ▶ Start Task
            </button>
          )}
          {task.status === 'IN_PROGRESS' && (
            <button
              onClick={() => handleStatusAction('complete')}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm
                       font-medium transition-colors disabled:opacity-50"
            >
              ✓ Mark Complete
            </button>
          )}
          {task.status === 'IN_REVIEW' && (
            <>
              <button
                onClick={() => handleStatusAction('approve')}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm
                         font-medium transition-colors disabled:opacity-50"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => handleStatusAction('reject')}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm
                         font-medium transition-colors disabled:opacity-50"
              >
                ✗ Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {localMessages.map((message) => {
          const isOwnMessage = message.userId === currentUserId;
          
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
            >
              <UserAvatar name={message.userName} size="sm" />
              
              <div className={`flex-1 ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {message.userName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                
                <div
                  className={`
                    px-4 py-2 rounded-lg max-w-md
                    ${isOwnMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }
                  `}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            disabled={!canSendMessages || loading}
            placeholder={canSendMessages ? 'Type a message...' : 'Task is closed'}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          <button
            type="submit"
            disabled={!messageInput.trim() || !canSendMessages || loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
