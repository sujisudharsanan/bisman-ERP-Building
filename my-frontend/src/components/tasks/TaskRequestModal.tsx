'use client';

/**
 * Task Request Modal
 * Shows when a subordinate attempts to assign a task to a superior
 * 
 * Provides a smooth UX for the request-based workflow without
 * using negative language like "permission denied"
 */

import React, { useState } from 'react';
import { 
  ArrowUpCircle, 
  Send, 
  X, 
  AlertCircle,
  UserCheck,
  Clock,
  ChevronRight
} from 'lucide-react';

interface TaskRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRequest: (data: {
    title: string;
    description?: string;
    priority: string;
    suggestedDueDate?: string;
    requestedTo: string;  // UUID string
  }) => Promise<void>;
  // Pre-filled data from the attempted task creation
  taskData: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    assigneeId: string;  // UUID string
    assigneeName: string;
    assigneeRoleName: string;
  };
  // Hierarchy info
  hierarchyInfo: {
    creatorLevel: number;
    assigneeLevel: number;
    creatorRoleName: string;
    assigneeRoleName: string;
  };
  loading?: boolean;
}

export default function TaskRequestModal({
  isOpen,
  onClose,
  onSendRequest,
  taskData,
  hierarchyInfo,
  loading = false
}: TaskRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendRequest = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSendRequest({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || 'MEDIUM',
        suggestedDueDate: taskData.dueDate,
        requestedTo: taskData.assigneeId
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ArrowUpCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Assignment Requires Approval
                </h2>
                <p className="text-sm text-purple-100">
                  Request-based workflow
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Explanation */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  <strong>{taskData.assigneeName}</strong> ({hierarchyInfo.assigneeRoleName}) 
                  holds a senior role. Tasks to senior colleagues require their approval 
                  before assignment.
                </p>
              </div>
            </div>
          </div>

          {/* Hierarchy Visualization */}
          <div className="flex items-center justify-center gap-3 py-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-2">
                <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">You</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                L{hierarchyInfo.creatorLevel} • {hierarchyInfo.creatorRoleName}
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <ChevronRight className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-400 mt-1">Request</span>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-2">
                <UserCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {taskData.assigneeName.split(' ')[0]}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                L{hierarchyInfo.assigneeLevel} • {hierarchyInfo.assigneeRoleName}
              </p>
            </div>
          </div>

          {/* Task Summary */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Task Summary
            </h4>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {taskData.title}
            </p>
            {taskData.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {taskData.description}
              </p>
            )}
            <div className="flex items-center gap-3 pt-2">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                taskData.priority === 'URGENT' || taskData.priority === 'CRITICAL'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : taskData.priority === 'HIGH'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {taskData.priority || 'MEDIUM'}
              </span>
              {taskData.dueDate && (
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(taskData.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* What happens next */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              What happens next?
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>Your request will be sent to {taskData.assigneeName}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>They can accept, delegate, or ask for more details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-0.5">•</span>
                <span>You'll be notified of their decision</span>
              </li>
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Change Assignee
          </button>
          <button
            onClick={handleSendRequest}
            disabled={isSubmitting || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send as Task Request</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
