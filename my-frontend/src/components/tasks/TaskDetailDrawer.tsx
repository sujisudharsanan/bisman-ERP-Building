/**
 * TaskDetailDrawer
 * Enhanced task detail panel with comments, attachments, and AI panel
 * Supports inline editing of task properties
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Paperclip, 
  Sparkles, 
  Send,
  Calendar,
  User,
  Flag,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Upload,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  MoreVertical,
  Loader2,
  Pencil,
  Check,
  ChevronDown,
  Play,
  SendHorizonal,
  RotateCcw,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useTask, 
  useTaskMessages, 
  useTaskAttachments, 
  useCreateTaskMessage,
  useUploadAttachment,
  useUpdateTaskStatus,
  useUpdateTask,
  useDeleteTask,
  useTransitionTask
} from '@/hooks/useTasks';
import { useTaskSocket } from '@/hooks/useTaskSocket';
import { useAuth } from '@/hooks/useAuth';
import { Task, TaskMessage, TaskAttachment, TaskStatus, TaskPriority } from '@/lib/api/taskApi';

// ============================================
// TYPES
// ============================================

interface TaskDetailDrawerProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskDeleted?: (taskId: string) => void;
}

type TabType = 'comments' | 'attachments' | 'ai';

// ============================================
// PRIORITY CONFIG
// ============================================

const priorityConfig = {
  LOW: { color: 'bg-blue-100 text-blue-700', icon: Flag, label: 'Low' },
  MEDIUM: { color: 'bg-yellow-100 text-yellow-700', icon: Flag, label: 'Medium' },
  HIGH: { color: 'bg-orange-100 text-orange-700', icon: Flag, label: 'High' },
  URGENT: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Urgent' },
};

const statusConfig: Record<string, { color: string; icon: typeof User; label: string }> = {
  ASSIGNED: { color: 'bg-slate-100 text-slate-700', icon: User, label: 'Assigned' },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-700', icon: Clock, label: 'In Progress' },
  IN_REVIEW: { color: 'bg-purple-100 text-purple-700', icon: Clock, label: 'In Review' },
  EDITING: { color: 'bg-orange-100 text-orange-700', icon: AlertCircle, label: 'Needs Revision' },
  NEED_ATTENTION: { color: 'bg-amber-100 text-amber-700', icon: AlertCircle, label: 'Needs Attention' },
  DONE: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Completed' },
  COMPLETED: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Completed' },
  CANCELLED: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Cancelled' },
};

// ============================================
// MAIN COMPONENT
// ============================================

export function TaskDetailDrawer({ taskId, isOpen, onClose, onTaskDeleted }: TaskDetailDrawerProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('comments');
  const [messageInput, setMessageInput] = useState('');
  const [showActions, setShowActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  // Fetch task data
  const { data: task, isLoading: taskLoading, error: taskError } = useTask(taskId);
  const { data: messages = [], isLoading: messagesLoading } = useTaskMessages(taskId);
  const { data: attachments = [], isLoading: attachmentsLoading } = useTaskAttachments(taskId);

  // Mutations
  const createMessage = useCreateTaskMessage(taskId || '');
  const uploadAttachment = useUploadAttachment(taskId || '');
  const updateStatus = useUpdateTaskStatus();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const transitionTask = useTransitionTask();
  
  // State for rejection comment
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  // Socket for real-time updates
  const { connected, typingUsers, sendTyping } = useTaskSocket({
    taskId: taskId || undefined,
    onNewMessage: (id, message) => {
      if (id === taskId) {
        scrollToBottom();
      }
    },
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Check user permissions for Maker-Checker workflow
  const currentUserId = user?.id;
  const isCreator = task?.creator_id === currentUserId;
  const isAssignee = task?.assignee_id === currentUserId || task?.assigned_to === currentUserId;
  
  // Maker-Checker workflow permissions
  const taskStatus = task?.status || '';
  const canAcceptAndStart = isAssignee && taskStatus === 'ASSIGNED';
  const canSubmitForReview = isAssignee && taskStatus === 'IN_PROGRESS';
  const canResubmit = isAssignee && (taskStatus === 'NEED_ATTENTION' || taskStatus === 'EDITING');
  const canApprove = isCreator && taskStatus === 'IN_REVIEW';
  const canReject = isCreator && taskStatus === 'IN_REVIEW';
  const canCancel = isCreator && !['DONE', 'CANCELLED', 'COMPLETED'].includes(taskStatus);
  
  // Legacy permissions (kept for compatibility)
  const canComplete = false; // Now uses workflow instead

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !taskId) return;

    try {
      await createMessage.mutateAsync({ content: messageInput.trim() });
      setMessageInput('');
      sendTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;

    try {
      await uploadAttachment.mutateAsync(file);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!taskId) return;

    try {
      await updateStatus.mutateAsync({ id: taskId, input: { status: newStatus } });
      setShowActions(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Maker-Checker Workflow Actions
  const handleAcceptAndStart = async () => {
    if (!taskId) return;
    try {
      await transitionTask.mutateAsync({ id: taskId, action: 'START_WORK' });
    } catch (error) {
      console.error('Failed to start task:', error);
    }
  };

  const handleSubmitForReview = async () => {
    if (!taskId) return;
    try {
      await transitionTask.mutateAsync({ id: taskId, action: 'SUBMIT_FOR_REVIEW' });
    } catch (error) {
      console.error('Failed to submit for review:', error);
    }
  };

  const handleApprove = async () => {
    if (!taskId) return;
    try {
      await transitionTask.mutateAsync({ id: taskId, action: 'APPROVE' });
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async () => {
    if (!taskId || !rejectComment.trim()) return;
    try {
      await transitionTask.mutateAsync({ id: taskId, action: 'REJECT', reason: rejectComment });
      setShowRejectModal(false);
      setRejectComment('');
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const handleResubmit = async () => {
    if (!taskId) return;
    try {
      await transitionTask.mutateAsync({ id: taskId, action: 'RESUBMIT' });
    } catch (error) {
      console.error('Failed to resubmit:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!taskId || !confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask.mutateAsync(taskId);
      onTaskDeleted?.(taskId);
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Handle typing indicator
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  // Inline editing handlers
  const handleStartEditTitle = () => {
    if (!canEdit) return;
    setEditTitle(task?.title || '');
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!taskId || !editTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateTask.mutateAsync({ id: taskId, input: { title: editTitle.trim() } });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleStartEditDescription = () => {
    if (!canEdit) return;
    setEditDescription(task?.description || '');
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    if (!taskId) {
      setIsEditingDescription(false);
      return;
    }
    try {
      await updateTask.mutateAsync({ id: taskId, input: { description: editDescription.trim() } });
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Failed to update description:', error);
    }
  };

  const handleUpdatePriority = async (priority: TaskPriority) => {
    if (!taskId) return;
    try {
      await updateTask.mutateAsync({ id: taskId, input: { priority } });
      setShowPriorityDropdown(false);
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const handleUpdateDueDate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!taskId) return;
    try {
      await updateTask.mutateAsync({ id: taskId, input: { due_date: e.target.value || undefined } });
      setShowDueDatePicker(false);
    } catch (error) {
      console.error('Failed to update due date:', error);
    }
  };

  // Check edit permission (creator or assignee can edit)
  const canEdit = isCreator || isAssignee;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] max-w-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          {connected && (
            <span className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
          )}
          <h2 className="font-semibold text-gray-900">Task Details</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {taskLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : taskError ? (
          <div className="p-4 text-center text-red-500">
            Failed to load task details
          </div>
        ) : task ? (
          <>
            {/* Task Info */}
            <div className="p-4 border-b border-gray-100">
              {/* Editable Title */}
              {isEditingTitle ? (
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-lg font-semibold text-gray-900 border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                  />
                  <button
                    onClick={handleSaveTitle}
                    disabled={updateTask.isPending}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div 
                  className={cn(
                    "group flex items-center gap-2 mb-2",
                    canEdit && "cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                  )}
                  onClick={handleStartEditTitle}
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {task.title}
                  </h3>
                  {canEdit && (
                    <Pencil className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              )}

              {/* Status & Priority Badges */}
              <div className="flex flex-wrap gap-2 mb-3 relative">
                {task.status && statusConfig[task.status] && (
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                    statusConfig[task.status].color
                  )}>
                    {React.createElement(statusConfig[task.status].icon, { className: 'w-3 h-3' })}
                    {statusConfig[task.status].label}
                  </span>
                )}
                
                {/* Editable Priority */}
                <div className="relative">
                  <button
                    onClick={() => canEdit && setShowPriorityDropdown(!showPriorityDropdown)}
                    disabled={!canEdit}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      task.priority && priorityConfig[task.priority]?.color,
                      canEdit && 'hover:ring-2 hover:ring-blue-300 cursor-pointer'
                    )}
                  >
                    <Flag className="w-3 h-3" />
                    {task.priority && priorityConfig[task.priority]?.label || 'Set Priority'}
                    {canEdit && <ChevronDown className="w-3 h-3 ml-1" />}
                  </button>
                  
                  {showPriorityDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((priority) => (
                        <button
                          key={priority}
                          onClick={() => handleUpdatePriority(priority)}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2',
                            priorityConfig[priority]?.color
                          )}
                        >
                          <Flag className="w-3 h-3" />
                          {priorityConfig[priority]?.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Description */}
              {isEditingDescription ? (
                <div className="mb-3">
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-sm text-gray-600 border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    autoFocus
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleSaveDescription}
                      disabled={updateTask.isPending}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className={cn(
                    "group mb-3",
                    canEdit && "cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                  )}
                  onClick={handleStartEditDescription}
                >
                  {task.description ? (
                    <p className="text-sm text-gray-600 flex items-start gap-2">
                      {task.description}
                      {canEdit && (
                        <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                      )}
                    </p>
                  ) : canEdit ? (
                    <p className="text-sm text-gray-400 italic flex items-center gap-2">
                      Click to add description
                      <Pencil className="w-3 h-3" />
                    </p>
                  ) : null}
                </div>
              )}

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                {task.assignee && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Assigned to: {task.assignee.username}</span>
                  </div>
                )}
                
                {/* Editable Due Date */}
                <div className="flex items-center gap-1 relative">
                  <Calendar className="w-3 h-3" />
                  {showDueDatePicker ? (
                    <input
                      type="date"
                      defaultValue={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                      onChange={handleUpdateDueDate}
                      onBlur={() => setShowDueDatePicker(false)}
                      className="border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => canEdit && setShowDueDatePicker(true)}
                      disabled={!canEdit}
                      className={cn(
                        "hover:underline",
                        canEdit && "cursor-pointer"
                      )}
                    >
                      {task.due_date 
                        ? `Due: ${new Date(task.due_date).toLocaleDateString()}`
                        : canEdit ? 'Set due date' : 'No due date'
                      }
                    </button>
                  )}
                </div>
                
                {task.tags && task.tags.length > 0 && (
                  <div className="col-span-2 flex items-center gap-1 flex-wrap">
                    <Tag className="w-3 h-3" />
                    {task.tags.map((tag, i) => (
                      <span key={i} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons - Maker-Checker Workflow */}
              <div className="flex flex-col gap-2 mt-4">
                {/* Worker Actions */}
                {canAcceptAndStart && (
                  <button
                    onClick={handleAcceptAndStart}
                    disabled={transitionTask.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {transitionTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Accept & Start
                  </button>
                )}
                
                {canSubmitForReview && (
                  <button
                    onClick={handleSubmitForReview}
                    disabled={transitionTask.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {transitionTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
                    Submit for Review
                  </button>
                )}
                
                {canResubmit && (
                  <button
                    onClick={handleResubmit}
                    disabled={transitionTask.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {transitionTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Resubmit for Review
                  </button>
                )}
                
                {/* Manager/Checker Actions */}
                {(canApprove || canReject) && (
                  <div className="flex gap-2">
                    {canApprove && (
                      <button
                        onClick={handleApprove}
                        disabled={transitionTask.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
                      >
                        {transitionTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                        Approve
                      </button>
                    )}
                    {canReject && (
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={transitionTask.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Request Changes
                      </button>
                    )}
                  </div>
                )}
                
                {/* Status indicator for IN_REVIEW (worker sees this) */}
                {taskStatus === 'IN_REVIEW' && isAssignee && !isCreator && (
                  <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    Awaiting Manager Approval
                  </div>
                )}
                
                {/* Additional Actions Dropdown */}
                <div className="flex gap-2">
                  {canCancel && (
                    <button
                      onClick={() => handleStatusChange('CANCELLED')}
                      disabled={updateStatus.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Task
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowActions(!showActions)}
                      className="p-2 hover:bg-gray-100 rounded-lg border border-gray-200"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {showActions && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        {isCreator && (
                          <button
                            onClick={handleDelete}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Task
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('comments')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'comments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Comments ({messages.length})
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'attachments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Paperclip className="w-4 h-4" />
                Files ({attachments.length})
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'ai'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Sparkles className="w-4 h-4" />
                AI
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="p-4 space-y-3">
                  {messagesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No comments yet</p>
                  ) : (
                    messages.map((message) => (
                      <MessageBubble 
                        key={message.id} 
                        message={message} 
                        isOwn={message.sender_id === currentUserId}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                  
                  {/* Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className="text-xs text-gray-400 italic">
                      {typingUsers.map(u => u.name).join(', ')} typing...
                    </div>
                  )}
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <div className="p-4 space-y-3">
                  {attachmentsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="text-center py-8">
                      <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-400">No attachments yet</p>
                    </div>
                  ) : (
                    attachments.map((attachment) => (
                      <AttachmentItem key={attachment.id} attachment={attachment} />
                    ))
                  )}
                  
                  {/* Upload button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadAttachment.isPending}
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-gray-500 hover:text-blue-500"
                  >
                    {uploadAttachment.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    <span>Upload File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  />
                </div>
              )}

              {/* AI Tab */}
              {activeTab === 'ai' && (
                <div className="p-4">
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-2" />
                    <p className="text-gray-600 font-medium mb-1">AI Assistant</p>
                    <p className="text-sm text-gray-400">
                      Ask Bey for help with this task
                    </p>
                  </div>
                  {/* AI chat can be integrated here */}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Message Input (only for comments tab) */}
      {activeTab === 'comments' && task && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <textarea
              value={messageInput}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={2}
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || createMessage.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
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
      
      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] max-w-[90%] p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Changes</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please provide feedback on what needs to be revised.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Enter your feedback..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              rows={4}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComment('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectComment.trim() || transitionTask.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
              >
                {transitionTask.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsDown className="w-4 h-4" />
                )}
                Send Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function MessageBubble({ message, isOwn }: { message: TaskMessage; isOwn: boolean }) {
  const isSystem = message.message_type === 'system';
  const isAI = message.message_type === 'ai';

  if (isSystem) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        {message.content}
      </div>
    );
  }

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
          isOwn
            ? 'bg-blue-600 text-white'
            : isAI
            ? 'bg-purple-100 text-purple-900'
            : 'bg-gray-100 text-gray-900'
        )}
      >
        {!isOwn && (
          <div className={cn(
            'text-xs font-medium mb-1',
            isAI ? 'text-purple-600' : 'text-gray-500'
          )}>
            {isAI ? '🤖 Bey AI' : message.sender?.username || 'User'}
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        <div className={cn(
          'text-xs mt-1',
          isOwn ? 'text-blue-200' : 'text-gray-400'
        )}>
          {new Date(message.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: TaskAttachment }) {
  const isImage = attachment.file_type.startsWith('image/');
  const Icon = isImage ? ImageIcon : FileText;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="p-2 bg-white rounded-lg shadow-sm">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.file_name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      <a
        href={attachment.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        title="Download"
      >
        <Download className="w-4 h-4 text-gray-500" />
      </a>
    </div>
  );
}

export default TaskDetailDrawer;
