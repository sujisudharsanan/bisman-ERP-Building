'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  Paperclip,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Image as ImageIcon,
  File
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
}

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
  onMarkComplete?: (taskId: string) => void;
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
  BLOCKED: { bg: 'bg-red-500/20', text: 'text-red-400' },
  COMPLETED: { bg: 'bg-green-500/20', text: 'text-green-400' },
  DONE: { bg: 'bg-green-500/20', text: 'text-green-400' },
};

export default function TaskDetailView({ taskId, onClose, onMarkComplete }: TaskDetailViewProps) {
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

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

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
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (response.ok) {
        setTask(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
        onMarkComplete?.(taskId);
      }
    } catch (err) {
      console.error('Error completing task:', err);
    } finally {
      setCompleting(false);
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

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e2e] overflow-hidden">
      {/* Task Header */}
      <div className="p-4 border-b border-gray-700/50 bg-[#252836]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-[10px] font-mono bg-gray-800 text-gray-300 rounded">
                TSK-{String(task.id).padStart(5, '0')}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${priorityStyle.bg} ${priorityStyle.text}`}>
                {priority}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${statusStyle.bg} ${statusStyle.text}`}>
                {task.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h2 className="text-white text-lg font-semibold truncate">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700/50 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          {task.creator && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>
                {task.creator.firstName && task.creator.lastName
                  ? `${task.creator.firstName} ${task.creator.lastName}`
                  : task.creator.username}
              </span>
            </div>
          )}
          {task.createdAt && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(task.createdAt)}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Due: {formatDate(task.dueDate)}</span>
            </div>
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
                <p className="text-gray-500 text-sm italic">No description provided</p>
              )}
              
              {task.assignee && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <p className="text-xs text-gray-400">Assigned to:</p>
                  <p className="text-sm text-white mt-1">
                    {task.assignee.firstName && task.assignee.lastName
                      ? `${task.assignee.firstName} ${task.assignee.lastName}`
                      : task.assignee.username}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Attachments Section */}
        <div className="bg-[#252836] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('attachments')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium text-sm">
                Attachments ({task.attachments?.length || 0})
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
              {task.attachments && task.attachments.length > 0 ? (
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
              ) : (
                <p className="text-gray-500 text-sm italic">No attachments</p>
              )}
            </div>
          )}
        </div>

        {/* Messages/Comments Section */}
        <div className="bg-[#252836] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('messages')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-white font-medium text-sm">
                Messages ({task.messages?.length || 0})
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
                  {task.messages.map((message) => (
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
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No messages yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      {!isCompleted && (
        <div className="p-4 border-t border-gray-700/50 bg-[#252836]">
          <button
            onClick={handleMarkComplete}
            disabled={completing}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-medium rounded-lg transition-colors"
          >
            {completing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            Mark as Complete
          </button>
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
