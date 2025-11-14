// Task Chat Drawer Component
// Opens as a side drawer when user clicks on a task card
// Provides chat interface + task actions (confirm, approve, reject, resubmit)

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Send, CheckCircle, XCircle, RefreshCw, Eye, Paperclip, Calendar } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  creator_id: string;
  creator_type: string;
  current_approver_level: number;
  approver_id?: string;
  approver_type?: string;
  priority?: string;
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
}

interface HistoryItem {
  id: number;
  task_id: string;
  from_status?: string;
  to_status: string;
  action: string;
  actor_id: string;
  actor_name: string;
  actor_role?: string;
  approval_level?: number;
  comment?: string;
  rejection_reason?: string;
  created_at: string;
}

interface Comment {
  id: number;
  task_id: string;
  user_id: string;
  user_type: string;
  user_name: string;
  comment: string;
  comment_type: string;
  is_internal: boolean;
  created_at: string;
}

interface Action {
  action: string;
  label: string;
  color: string;
}

interface TaskChatDrawerProps {
  taskId: string;
  onClose: () => void;
  currentUserId: string;
  currentUserType: string;
  onTaskUpdate?: (task: Task) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  confirmed: '#3B82F6',
  in_progress: '#F59E0B',
  editing: '#EF4444',
  done: '#10B981'
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  editing: 'Editing',
  done: 'Done'
};

export default function TaskChatDrawer({
  taskId,
  onClose,
  currentUserId,
  currentUserType,
  onTaskUpdate
}: TaskChatDrawerProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [availableActions, setAvailableActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Chat input
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  
  // Action confirmation
  const [showActionConfirm, setShowActionConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionComment, setActionComment] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when comments update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [comments, history]);

  // Fetch task details, history, and comments
  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch task with available actions
      const taskRes = await fetch(`/api/tasks/${taskId}`, {
        credentials: 'include'
      });
      
      if (!taskRes.ok) {
        throw new Error('Failed to fetch task');
      }

      const taskData = await taskRes.json();
      setTask(taskData.task);
      setAvailableActions(taskData.availableActions || []);

      // Fetch history
      const historyRes = await fetch(`/api/tasks/${taskId}/history`, {
        credentials: 'include'
      });
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }

      // Fetch comments
      const commentsRes = await fetch(`/api/tasks/${taskId}/comments`, {
        credentials: 'include'
      });
      
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching task details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load task');
      setLoading(false);
    }
  };

  // Send comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    try {
      setSendingComment(true);

      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          comment: newComment.trim(),
          is_internal: false
        })
      });

      if (!res.ok) {
        throw new Error('Failed to send comment');
      }

      const newCommentData = await res.json();
      setComments(prev => [...prev, newCommentData]);
      setNewComment('');
    } catch (err) {
      console.error('Error sending comment:', err);
      alert('Failed to send comment');
    } finally {
      setSendingComment(false);
    }
  };

  // Perform action (confirm, approve, reject, resubmit)
  const handleAction = async (action: string) => {
    // For reject, show confirmation dialog
    if (action === 'reject') {
      setPendingAction(action);
      setShowActionConfirm(true);
      return;
    }

    // For approve, show confirmation
    if (action === 'approve') {
      setPendingAction(action);
      setShowActionConfirm(true);
      return;
    }

    // For others, execute immediately
    await executeAction(action, '');
  };

  const executeAction = async (action: string, comment: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          comment: comment || undefined
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to perform action');
      }

      const result = await res.json();
      
      // Update task state
      setTask(result.task);
      if (onTaskUpdate) {
        onTaskUpdate(result.task);
      }

      // Refresh history and comments
      await fetchTaskDetails();

      // Close confirmation dialog
      setShowActionConfirm(false);
      setPendingAction(null);
      setActionComment('');

      // Show success message
      alert(result.message || `Task ${action}ed successfully`);
    } catch (err) {
      console.error('Error performing action:', err);
      alert(err instanceof Error ? err.message : 'Failed to perform action');
    }
  };

  const confirmAction = () => {
    if (pendingAction) {
      executeAction(pendingAction, actionComment);
    }
  };

  const cancelAction = () => {
    setShowActionConfirm(false);
    setPendingAction(null);
    setActionComment('');
  };

  if (loading) {
    return (
      <div className="fixed right-0 top-0 w-full md:w-[480px] h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading task...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="fixed right-0 top-0 w-full md:w-[480px] h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex items-center justify-center">
        <div className="text-center p-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Task not found'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed right-0 top-0 w-full md:w-[480px] h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{task.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-2 py-1 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: STATUS_COLORS[task.status] }}
              >
                {STATUS_LABELS[task.status]}
              </span>
              {task.priority && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  task.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  task.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {task.priority}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Task Details */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {task.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{task.description}</p>
          )}
          
          {task.due_date && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {availableActions.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Actions:</p>
            <div className="flex flex-wrap gap-2">
              {availableActions.map((action) => (
                <button
                  key={action.action}
                  onClick={() => handleAction(action.action)}
                  className={`px-4 py-2 rounded-lg font-medium text-white ${
                    action.color === 'green' ? 'bg-green-500 hover:bg-green-600' :
                    action.color === 'red' ? 'bg-red-500 hover:bg-red-600' :
                    action.color === 'blue' ? 'bg-blue-500 hover:bg-blue-600' :
                    'bg-gray-500 hover:bg-gray-600'
                  }`}
                >
                  {action.action === 'confirm' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                  {action.action === 'approve' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                  {action.action === 'reject' && <XCircle className="w-4 h-4 inline mr-1" />}
                  {action.action === 'resubmit' && <RefreshCw className="w-4 h-4 inline mr-1" />}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages/History Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* History items */}
          {history.map((item) => (
            <div key={item.id} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border-l-4 border-blue-500">
              <div className="flex items-start justify-between mb-1">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  {item.actor_name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>{item.action}</strong>: {item.from_status} → {item.to_status}
              </p>
              {item.comment && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                  "{item.comment}"
                </p>
              )}
              {item.actor_role && (
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded">
                  {item.actor_role}
                </span>
              )}
            </div>
          ))}

          {/* Chat comments */}
          {comments.map((comment) => (
            <div key={comment.id} className={`flex ${
              comment.user_id === currentUserId && comment.user_type === currentUserType
                ? 'justify-end'
                : 'justify-start'
            }`}>
              <div className={`max-w-[75%] rounded-lg p-3 ${
                comment.user_id === currentUserId && comment.user_type === currentUserType
                  ? 'bg-blue-500 text-white'
                  : comment.comment_type === 'approval'
                  ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
                  : comment.comment_type === 'rejection'
                  ? 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}>
                <p className="text-xs font-medium mb-1">{comment.user_name}</p>
                <p className="text-sm">{comment.comment}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(comment.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendComment} className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              disabled={sendingComment}
            />
            <button
              type="submit"
              disabled={sendingComment || !newComment.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Action Confirmation Modal */}
      {showActionConfirm && pendingAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Confirm {pendingAction}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {pendingAction === 'reject'
                ? 'Please provide a reason for rejection:'
                : `Are you sure you want to ${pendingAction} this task?`}
            </p>
            {pendingAction === 'reject' && (
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder="Reason for rejection (optional)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-4"
              />
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelAction}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 rounded-lg text-white ${
                  pendingAction === 'reject'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
