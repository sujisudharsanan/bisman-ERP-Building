'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { taskKeys } from '@/hooks/useTasks';
import { 
  X, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  Calendar,
  AlertTriangle,
  Paperclip,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Image as ImageIcon,
  File,
  XCircle,
  Play,
  SendHorizontal,
  ArrowUpCircle,
  Send
} from 'lucide-react';

interface TaskAttachment {
  id: number;
  filename: string;
  original_name?: string;
  file_type?: string;
  file_size?: number;
  file_url?: string;
  uploaded_at?: string;
}

interface TaskMessage {
  id: number;
  senderId?: number;
  senderName?: string;
  senderType?: string;
  content: string;
  createdAt?: string;
}

interface TaskCreator {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface TaskDetail {
  id: string | number;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
  attachmentCount?: number;
  creator?: TaskCreator;
  assignee?: TaskCreator;
  messages?: TaskMessage[];
  attachments?: TaskAttachment[];
  creatorId?: number;
}

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
  onMarkComplete?: (taskId: string) => void;
  onCancel?: (taskId: string, reason: string) => void;
  currentUserId?: number;
}

const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500' },
  MEDIUM: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  HIGH: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  URGENT: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  OPEN: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  IN_PROGRESS: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  IN_REVIEW: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  NEED_ATTENTION: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  BLOCKED: { bg: 'bg-red-500/20', text: 'text-red-400' },
  COMPLETED: { bg: 'bg-green-500/20', text: 'text-green-400' },
  DONE: { bg: 'bg-green-500/20', text: 'text-green-400' },
  CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

export default function TaskDetailView({ taskId, onClose, onMarkComplete, onCancel, currentUserId: propUserId }: TaskDetailViewProps) {
  // Get current user from auth context as fallback
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = propUserId ?? (user as any)?.id;
  
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    attachments: true,
    messages: true,
  });
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);
  const [completing, setCompleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [startingWork, setStartingWork] = useState(false);
  const [sendingForReview, setSendingForReview] = useState(false);
  const [changingPriority, setChangingPriority] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.messages]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tasks/${taskId}/quick-view`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch task');
      }

      const data = await response.json();
      const taskInfo = data.task || data.data || data;
      
      // Fetch attachments separately if not included
      let attachments: TaskAttachment[] = [];
      try {
        const attachRes = await fetch(`/api/tasks/${taskId}/attachments`, {
          credentials: 'include',
        });
        if (attachRes.ok) {
          const attachData = await attachRes.json();
          attachments = attachData.data || attachData || [];
        }
      } catch (e) {
        console.warn('Could not fetch attachments');
      }

      setTask({
        ...taskInfo,
        messages: data.messages || [],
        attachments: attachments,
      });
    } catch (err) {
      console.error('Error fetching task:', err);
      setError(err instanceof Error ? err.message : 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!task) return;
    
    try {
      setCompleting(true);
      const response = await fetch(`/api/v2/tasks/${taskId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (response.ok) {
        setTask(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
        // Invalidate kanban queries to refresh the board
        queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
        onMarkComplete?.(taskId);
      }
    } catch (err) {
      console.error('Error completing task:', err);
    } finally {
      setCompleting(false);
    }
  };

  const handleCancelTask = async () => {
    if (!task || !cancelReason.trim()) return;
    
    try {
      setCancelling(true);
      
      // First add the cancel message via Bey
      const messageResponse = await fetch(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: `Task cancelled by creator. Reason: ${cancelReason}`,
          senderType: 'SYSTEM'
        }),
      });
      
      // Then update the status
      const response = await fetch(`/api/v2/tasks/${taskId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (response.ok) {
        setTask(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
        // Invalidate kanban queries to refresh the board
        queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
        onCancel?.(taskId, cancelReason);
        setShowCancelDialog(false);
        setCancelReason('');
      }
    } catch (err) {
      console.error('Error cancelling task:', err);
    } finally {
      setCancelling(false);
    }
  };

  // Start Work - Accept task and change status to IN_PROGRESS
  const handleStartWork = async () => {
    if (!task) return;
    
    try {
      setStartingWork(true);
      const response = await fetch(`/api/v2/tasks/${taskId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });

      if (response.ok) {
        setTask(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
        // Post system message with user name and timestamp for visibility
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const userName = task.assignee?.firstName || task.assignee?.username || 'Assignee';
        await fetch(`/api/tasks/${taskId}/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: `🚀 ${userName} started work on this task at ${timeStr}`,
            senderType: 'SYSTEM'
          }),
        });
        // Invalidate kanban queries to refresh the board
        queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to start work:', response.status, errorData);
      }
    } catch (err) {
      console.error('Error starting work:', err);
    } finally {
      setStartingWork(false);
    }
  };

  // Send for Review - Change status to IN_REVIEW
  const handleSendForReview = async () => {
    if (!task) return;
    
    try {
      setSendingForReview(true);
      const response = await fetch(`/api/v2/tasks/${taskId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_REVIEW' }),
      });

      if (response.ok) {
        setTask(prev => prev ? { ...prev, status: 'IN_REVIEW' } : null);
        // Post system message with user name and timestamp
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const userName = task.assignee?.firstName || task.assignee?.username || 'Assignee';
        const creatorName = task.creator?.firstName || task.creator?.username || 'creator';
        await fetch(`/api/tasks/${taskId}/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: `📋 ${userName} sent this task for review to ${creatorName} at ${timeStr}`,
            senderType: 'SYSTEM'
          }),
        });
        // Invalidate kanban queries to refresh the board
        queryClient.invalidateQueries({ queryKey: taskKeys.kanban() });
        queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to send for review:', response.status, errorData);
      }
    } catch (err) {
      console.error('Error sending for review:', err);
    } finally {
      setSendingForReview(false);
    }
  };

  // Change priority
  const handleChangePriority = async (newPriority: string) => {
    if (!task) return;
    
    try {
      setChangingPriority(true);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (response.ok) {
        setTask(prev => prev ? { ...prev, priority: newPriority } : null);
        setShowPriorityDropdown(false);
      }
    } catch (err) {
      console.error('Error changing priority:', err);
    } finally {
      setChangingPriority(false);
    }
  };

  const handleSendMessage = async () => {
    if (!task || !newMessage.trim()) return;
    
    try {
      setSendingMessage(true);
      const response = await fetch(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        const newMsg = data.message || data.data || data;
        setTask(prev => prev ? {
          ...prev,
          messages: [...(prev.messages || []), newMsg]
        } : null);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDownload = (attachment: TaskAttachment) => {
    const url = attachment.file_url || `/api/tasks/${taskId}/attachments/${attachment.id}/download`;
    window.open(url, '_blank');
  };

  const handlePreview = (attachment: TaskAttachment) => {
    setPreviewAttachment(attachment);
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="w-4 h-4" />;
    if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if current user is the task creator
  const isTaskCreator = currentUserId && task?.creator?.id === currentUserId;
  const isTaskAssignee = currentUserId && task?.assignee?.id === currentUserId;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1e1e2e]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1e1e2e]">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-400 text-sm">{error || 'Task not found'}</p>
          <button
            onClick={onClose}
            className="mt-3 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const priority = task.priority || 'MEDIUM';
  const priorityStyle = priorityColors[priority] || priorityColors.MEDIUM;
  const statusStyle = statusColors[task.status] || statusColors.DRAFT;
  const isCompleted = task.status === 'COMPLETED' || task.status === 'DONE';
  const isOpen = task.status === 'OPEN' || task.status === 'ASSIGNED' || task.status === 'DRAFT';
  const isInProgress = task.status === 'IN_PROGRESS';
  const isInReview = task.status === 'IN_REVIEW';

  // Calculate remaining time to due date
  const getRemainingTime = () => {
    if (!task.dueDate) return null;
    const now = new Date();
    const due = new Date(task.dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff < 0) return { text: 'Overdue', isOverdue: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return { text: `${days}d ${remainingHours}h remaining`, isOverdue: false };
    } else if (hours > 0) {
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return { text: `${hours}h ${mins}m remaining`, isOverdue: false };
    } else {
      const mins = Math.floor(diff / (1000 * 60));
      return { text: `${mins}m remaining`, isOverdue: false };
    }
  };

  const remainingTime = getRemainingTime();

  // Helper to display name or "me"
  const getDisplayName = (userId?: number, firstName?: string, lastName?: string, username?: string) => {
    if (userId === currentUserId) return 'me';
    if (firstName && lastName) return `${firstName} ${lastName}`;
    return username || 'Unknown';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e2e] overflow-hidden">
      {/* Context Header - Professional Design */}
      <div className="px-4 py-3 border-b border-gray-700/50 bg-gradient-to-r from-[#252836] to-[#2a2d3e]">
        {/* Top Row: Task ID, Status, Remaining Time, Close */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Task ID - Bold Blue */}
            <span className="text-sm font-bold text-blue-400 font-mono">
              TSK-{String(task.id).padStart(5, '0')}
            </span>
            {/* Single Status Pill */}
            <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
              {task.status.replace(/_/g, ' ')}
            </span>
            {/* Remaining Time Badge */}
            {remainingTime && !isCompleted && task.status !== 'CANCELLED' && (
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full flex items-center gap-1 ${
                remainingTime.isOverdue 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                <Clock className="w-3 h-3" />
                {remainingTime.text}
              </span>
            )}
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        
        {/* Title */}
        <h2 className="text-white text-base font-semibold leading-snug mb-2">{task.title}</h2>
        
        {/* Date/Time Row - Prominent */}
        <div className="flex items-center gap-4 text-xs mb-3">
          {task.createdAt && (
            <div className="flex items-center gap-1.5 text-gray-300">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium">
                {new Date(task.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
          {task.dueDate && (
            <div className={`flex items-center gap-1.5 ${new Date(task.dueDate) < new Date() ? 'text-red-400' : 'text-orange-400'}`}>
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium">
                Due: {new Date(task.dueDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Creator/Assignee Row */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-4">
            {task.creator && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">From:</span>
                <span className="text-white font-medium">
                  {getDisplayName(task.creator.id, task.creator.firstName, task.creator.lastName, task.creator.username)}
                </span>
              </div>
            )}
            {task.assignee && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">To:</span>
                <span className="text-white font-medium">
                  {getDisplayName(task.assignee.id, task.assignee.firstName, task.assignee.lastName, task.assignee.username)}
                </span>
              </div>
            )}
          </div>
          
          {/* Priority Dropdown - Only for task creator when not completed */}
          {isTaskCreator && !isCompleted && task.status !== 'CANCELLED' && (
            <div className="relative">
              <button
                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                disabled={changingPriority}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-full flex items-center gap-1 ${priorityStyle.bg} ${priorityStyle.text} border ${priorityStyle.border} hover:opacity-80 transition-opacity`}
              >
                {changingPriority ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
                {priority}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showPriorityDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-[#2a2d3e] border border-gray-700 rounded-lg shadow-lg z-10 min-w-[100px]">
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleChangePriority(p)}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-700/50 first:rounded-t-lg last:rounded-b-lg ${
                        p === priority ? 'text-blue-400 font-medium' : 'text-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2">
          {/* Start Work Button - For assignee when status is OPEN */}
          {isTaskAssignee && isOpen && (
            <button
              onClick={handleStartWork}
              disabled={startingWork}
              className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {startingWork ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Work
            </button>
          )}

          {/* Send for Review Button - For assignee when IN_PROGRESS */}
          {isTaskAssignee && isInProgress && (
            <button
              onClick={handleSendForReview}
              disabled={sendingForReview}
              className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {sendingForReview ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SendHorizontal className="w-4 h-4" />
              )}
              Send for Review
            </button>
          )}

          {/* Complete Button - For creator when IN_REVIEW */}
          {isTaskCreator && isInReview && (
            <button
              onClick={handleMarkComplete}
              disabled={completing}
              className="flex-1 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {completing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Approve & Complete
            </button>
          )}

          {/* Cancel Button - For creator when not completed */}
          {isTaskCreator && !isCompleted && task.status !== 'CANCELLED' && (
            <button
              onClick={() => setShowCancelDialog(true)}
              disabled={cancelling}
              className="px-3 py-2 text-sm font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors flex items-center gap-1.5"
              title="Cancel Task"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description Section */}
        <div className="bg-[#252836] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('details')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
          >
            <span className="text-white font-medium text-sm">Description & Details</span>
            {expandedSections.details ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSections.details && (
            <div className="px-3 pb-3">
              {task.description ? (
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-gray-500 text-sm italic">Start work to see the description and attachments</p>
              )}
            </div>
          )}
        </div>

        {/* Attachments Section - Only show if there are attachments */}
        {task.attachments && task.attachments.length > 0 && (
        <div className="bg-[#252836] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('attachments')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium text-sm">
                Attachments ({task.attachments.length})
              </span>
            </div>
            {expandedSections.attachments ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSections.attachments && (
            <div className="px-3 pb-3">
                <div className="space-y-2">
                  {task.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-2 bg-[#1e1e2e] rounded-lg group"
                    >
                      <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-400">
                        {getFileIcon(attachment.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {attachment.original_name || attachment.filename}
                        </p>
                        {attachment.file_size && (
                          <p className="text-xs text-gray-500">{formatFileSize(attachment.file_size)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePreview(attachment)}
                          className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4 text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDownload(attachment)}
                          className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-green-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          )}
        </div>
        )}

        {/* Activity/Messages Section - Unified Timeline */}
        <div className="bg-[#252836] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('messages')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium text-sm">
                Timeline ({task.messages?.length || 0})
              </span>
            </div>
            {expandedSections.messages ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSections.messages && (
            <div className="px-3 pb-3 max-h-60 overflow-y-auto">
              {task.messages && task.messages.length > 0 ? (
                <div className="space-y-3">
                  {task.messages.map((message) => {
                    // Check if this is a system/activity message
                    const isSystemMessage = message.senderType === 'SYSTEM' || 
                      message.content?.startsWith('🚀') || 
                      message.content?.startsWith('📋') ||
                      message.content?.startsWith('✅') ||
                      message.content?.startsWith('❌');
                    
                    if (isSystemMessage) {
                      // Render as activity log entry
                      return (
                        <div key={message.id} className="flex items-center gap-2 py-1.5 px-2 bg-gray-700/20 rounded-lg border-l-2 border-blue-500/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-300">{message.content}</p>
                            {message.createdAt && (
                              <span className="text-[10px] text-gray-500">
                                {formatDate(message.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Render as regular chat message
                    return (
                      <div key={message.id} className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white flex-shrink-0">
                          {message.senderName?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white">
                              {message.senderName || 'Unknown'}
                            </span>
                            {message.createdAt && (
                              <span className="text-[10px] text-gray-500">
                                {formatDate(message.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-300 mt-0.5">{message.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No activity yet</p>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Chat Input Box - Professional Design */}
      <div className="p-3 border-t border-gray-700/50 bg-[#252836]">
        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          <button
            className="p-2 hover:bg-gray-700/30 rounded-lg transition-colors text-gray-400 hover:text-gray-300"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          
          {/* Input Container */}
          <div className="flex-1 flex items-end bg-[#1e1e2e] rounded-xl px-3 py-2 border border-gray-700/50 focus-within:border-blue-500/50 transition-colors">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message about this task..."
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
              disabled={sendingMessage}
            />
          </div>
          
          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sendingMessage}
            className={`p-2.5 rounded-xl transition-all ${
              newMessage.trim() && !sendingMessage
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            }`}
            title="Send message"
          >
            {sendingMessage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Cancel Task Dialog - Requires note via Bey */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#252836] rounded-lg w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                  🤖
                </div>
                <div>
                  <h3 className="text-white font-semibold">Cancel Task</h3>
                  <p className="text-gray-400 text-sm">Bey needs a reason to cancel this task</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="bg-[#1e1e2e] rounded-lg p-3 mb-4">
                <p className="text-gray-300 text-sm mb-2">
                  <span className="text-blue-400 font-medium">Bey:</span> Please provide a reason for cancelling task "{task?.title}". This will be recorded in the task history.
                </p>
              </div>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                rows={3}
                className="w-full bg-[#1e1e2e] border border-gray-700 rounded-lg p-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowCancelDialog(false);
                    setCancelReason('');
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelTask}
                  disabled={!cancelReason.trim() || cancelling}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#252836] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <span className="text-white font-medium truncate">
                {previewAttachment.original_name || previewAttachment.filename}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className="p-2 hover:bg-gray-700 rounded transition-colors"
                >
                  <Download className="w-4 h-4 text-green-400" />
                </button>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-2 hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[300px]">
              {previewAttachment.file_type?.startsWith('image/') ? (
                <img
                  src={previewAttachment.file_url || `/api/tasks/${taskId}/attachments/${previewAttachment.id}/download`}
                  alt={previewAttachment.original_name || 'Attachment'}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : previewAttachment.file_type?.includes('pdf') ? (
                <iframe
                  src={previewAttachment.file_url || `/api/tasks/${taskId}/attachments/${previewAttachment.id}/download`}
                  className="w-full h-[70vh]"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center">
                  <File className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDownload(previewAttachment)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500"
                  >
                    Download to view
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
