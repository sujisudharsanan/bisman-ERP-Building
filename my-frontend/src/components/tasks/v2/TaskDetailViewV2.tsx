/**
 * TaskDetailViewV2 - Modern Task Detail Panel
 * Professional design with tabs for comments, attachments, activity
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Paperclip,
  Activity,
  Calendar,
  Clock,
  User,
  Flag,
  Send,
  Upload,
  Download,
  Trash2,
  MoreHorizontal,
  Edit3,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  Play,
  Pause,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTask,
  useTaskMessages,
  useTaskAttachments,
  useCreateTaskMessage,
  useUploadAttachment,
  useUpdateTask,
  useUpdateTaskStatus,
} from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { Task, TaskMessage, TaskAttachment, TaskStatus, TaskPriority } from '@/lib/api/taskApi';

// ============================================
// TYPES
// ============================================

interface TaskDetailViewV2Props {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: (task: Task) => void;
}

type TabType = 'comments' | 'attachments' | 'activity';

// ============================================
// CONFIGS
// ============================================

const priorityConfig: Record<TaskPriority, { color: string; bg: string; label: string }> = {
  LOW: { color: 'text-slate-600', bg: 'bg-slate-100', label: 'Low' },
  MEDIUM: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Medium' },
  HIGH: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'High' },
  URGENT: { color: 'text-red-600', bg: 'bg-red-100', label: 'Urgent' },
};

const statusConfig: Record<TaskStatus, { color: string; bg: string; label: string }> = {
  ASSIGNED: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Assigned' },
  IN_PROGRESS: { color: 'text-amber-600', bg: 'bg-amber-100', label: 'In Progress' },
  IN_REVIEW: { color: 'text-purple-600', bg: 'bg-purple-100', label: 'In Review' },
  EDITING: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Needs Revision' },
  NEED_ATTENTION: { color: 'text-red-600', bg: 'bg-red-100', label: 'Needs Attention' },
  DONE: { color: 'text-green-600', bg: 'bg-green-100', label: 'Done' },
  COMPLETED: { color: 'text-green-600', bg: 'bg-green-100', label: 'Completed' },
  CANCELLED: { color: 'text-gray-500', bg: 'bg-gray-100', label: 'Cancelled' },
};

const statusTransitions: Record<TaskStatus, TaskStatus[]> = {
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IN_REVIEW', 'NEED_ATTENTION', 'DONE', 'CANCELLED'],
  IN_REVIEW: ['DONE', 'IN_PROGRESS', 'CANCELLED'],
  EDITING: ['IN_REVIEW', 'CANCELLED'],
  NEED_ATTENTION: ['IN_PROGRESS', 'CANCELLED'],
  DONE: [],
  COMPLETED: [],
  CANCELLED: [],
};

// ============================================
// HELPER COMPONENTS
// ============================================

function formatTimeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string): React.ElementType {
  if (type.startsWith('image/')) return ImageIcon;
  return FileText;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TaskDetailViewV2({ taskId, isOpen, onClose, onTaskUpdated }: TaskDetailViewV2Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('comments');
  const [messageInput, setMessageInput] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: task, isLoading: taskLoading } = useTask(taskId);
  const { data: messages = [], isLoading: messagesLoading } = useTaskMessages(taskId);
  const { data: attachments = [], isLoading: attachmentsLoading } = useTaskAttachments(taskId);

  // Mutations
  const createMessage = useCreateTaskMessage(taskId || '');
  const uploadAttachment = useUploadAttachment(taskId || '');
  const updateTask = useUpdateTask();
  const updateStatus = useUpdateTaskStatus();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && activeTab === 'comments') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Init edit values
  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
    }
  }, [task]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  const currentUserId = user?.id;
  const isAssignee = task?.assigned_to === currentUserId;
  const isCreator = task?.creator_id === currentUserId;
  const canEdit = isAssignee || isCreator;

  const priority = task ? priorityConfig[task.priority] || priorityConfig.MEDIUM : priorityConfig.MEDIUM;
  const status = task ? statusConfig[task.status] || statusConfig.IN_PROGRESS : statusConfig.IN_PROGRESS;
  const allowedTransitions = task ? statusTransitions[task.status] || [] : [];

  // Handlers
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !taskId) return;
    try {
      await createMessage.mutateAsync({ content: messageInput.trim() });
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;
    try {
      await uploadAttachment.mutateAsync(file);
    } catch (error) {
      console.error('Failed to upload:', error);
    }
    e.target.value = '';
  };

  const handleSaveTitle = async () => {
    if (!task || editTitle.trim() === task.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateTask.mutateAsync({ id: task.id.toString(), input: { title: editTitle.trim() } });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleSaveDescription = async () => {
    if (!task) {
      setIsEditingDescription(false);
      return;
    }
    try {
      await updateTask.mutateAsync({ id: task.id.toString(), input: { description: editDescription.trim() } });
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to update description:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    try {
      await updateStatus.mutateAsync({ id: task.id.toString(), input: { status: newStatus as TaskStatus } });
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    if (!task) return;
    try {
      await updateTask.mutateAsync({ id: task.id.toString(), input: { priority: newPriority } });
      setShowPriorityMenu(false);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Loading State */}
        {taskLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {task && (
          <>
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Task ID */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500">
                      {`TSK-${String(task.id).slice(0, 8).toUpperCase()}`}
                    </span>

                    {/* Status Badge */}
                    <div className="relative">
                      <button
                        onClick={() => canEdit && setShowStatusMenu(!showStatusMenu)}
                        disabled={!canEdit || allowedTransitions.length === 0}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all',
                          status.bg,
                          status.color,
                          canEdit && allowedTransitions.length > 0 && 'hover:ring-2 hover:ring-offset-1 hover:ring-current cursor-pointer'
                        )}
                      >
                        {status.label}
                        {canEdit && allowedTransitions.length > 0 && <ChevronDown className="w-3 h-3" />}
                      </button>

                      {showStatusMenu && allowedTransitions.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[140px]">
                          {allowedTransitions.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(s)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              {statusConfig[s]?.label || s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Priority Badge */}
                    <div className="relative">
                      <button
                        onClick={() => canEdit && setShowPriorityMenu(!showPriorityMenu)}
                        disabled={!canEdit}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all',
                          priority.bg,
                          priority.color,
                          canEdit && 'hover:ring-2 hover:ring-offset-1 hover:ring-current cursor-pointer'
                        )}
                      >
                        <Flag className="w-3 h-3" />
                        {priority.label}
                        {canEdit && <ChevronDown className="w-3 h-3" />}
                      </button>

                      {showPriorityMenu && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                          {Object.entries(priorityConfig).map(([key, config]) => (
                            <button
                              key={key}
                              onClick={() => handlePriorityChange(key as TaskPriority)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                              <div className={cn('w-2 h-2 rounded-full', config.bg.replace('bg-', 'bg-').replace('-100', '-500'))} />
                              {config.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                        className="flex-1 px-2 py-1 text-xl font-semibold border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        autoFocus
                      />
                      <button onClick={handleSaveTitle} className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsEditingTitle(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h2
                      onClick={() => canEdit && setIsEditingTitle(true)}
                      className={cn(
                        'text-xl font-semibold text-gray-900 dark:text-white',
                        canEdit && 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors'
                      )}
                    >
                      {task.title}
                      {canEdit && <Edit3 className="w-4 h-4 inline ml-2 opacity-0 group-hover:opacity-100" />}
                    </h2>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Metadata */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Assignee */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Assignee</p>
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                          {task.assignee.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.assignee.username}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Due Date</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className={cn(
                        'text-sm font-medium',
                        task.due_date && new Date(task.due_date) < new Date() && task.status !== 'DONE'
                          ? 'text-red-500'
                          : 'text-gray-900 dark:text-white'
                      )}>
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                      </span>
                    </div>
                  </div>

                  {/* Created */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatTimeAgo(task.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Creator */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Creator</p>
                    {task.creator ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-medium">
                          {task.creator.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.creator.username}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unknown</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveDescription} className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600">
                          Save
                        </button>
                        <button onClick={() => setIsEditingDescription(false)} className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      onClick={() => canEdit && setIsEditingDescription(true)}
                      className={cn(
                        'text-sm text-gray-700 dark:text-gray-300',
                        canEdit && 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400',
                        !task.description && 'text-gray-400 italic'
                      )}
                    >
                      {task.description || 'Add a description...'}
                    </p>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex-shrink-0 px-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-6">
                  {[
                    { id: 'comments', label: 'Comments', icon: MessageSquare, count: messages.length },
                    { id: 'attachments', label: 'Files', icon: Paperclip, count: attachments.length },
                    { id: 'activity', label: 'Activity', icon: Activity, count: 0 },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={cn(
                        'flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors',
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Comments Tab */}
                {activeTab === 'comments' && (
                  <div className="p-6 space-y-4">
                    {messagesLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No comments yet</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Start the conversation below</p>
                      </div>
                    ) : (
                      messages.map((msg: TaskMessage) => (
                        <div key={msg.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-medium">
                            {msg.sender?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {msg.sender?.username || 'User'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(msg.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Attachments Tab */}
                {activeTab === 'attachments' && (
                  <div className="p-6">
                    {attachmentsLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      </div>
                    ) : attachments.length === 0 ? (
                      <div className="text-center py-8">
                        <Paperclip className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No attachments</p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Upload a file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {attachments.map((file: TaskAttachment) => {
                          const FileIcon = getFileIcon(file.file_type || '');
                          return (
                            <div
                              key={file.id}
                              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <FileIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {file.file_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(file.file_size || 0)} • {formatTimeAgo(file.created_at)}
                                </p>
                              </div>
                              <a
                                href={file.file_url}
                                download
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Download className="w-4 h-4 text-gray-500" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <div className="p-6">
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">Activity log coming soon</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input */}
              {activeTab === 'comments' && (
                <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Paperclip className="w-5 h-5 text-gray-500" />
                    </button>
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Write a comment..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || createMessage.isPending}
                      className={cn(
                        'px-4 py-2.5 rounded-xl font-medium transition-all',
                        messageInput.trim()
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      {createMessage.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TaskDetailViewV2;
