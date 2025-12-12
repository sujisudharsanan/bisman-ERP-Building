'use client';

import React, { useState } from 'react';
import { Task, ViewMode, TaskAction, taskApi } from '@/lib/api/taskApi';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  XIcon, 
  PlayIcon, 
  SendIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  HistoryIcon,
  AlertTriangleIcon,
  Loader2Icon
} from 'lucide-react';

interface TaskActionModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  onTransitionComplete: () => void;
}

interface ActionConfig {
  action: TaskAction;
  label: string;
  icon: React.ReactNode;
  className: string;
  requiresReason?: boolean;
  confirmMessage?: string;
}

export function TaskActionModal({ 
  task, 
  isOpen, 
  onClose, 
  viewMode,
  onTransitionComplete 
}: TaskActionModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showConfirm, setShowConfirm] = useState<TaskAction | null>(null);

  // Get audit trail
  const { data: auditTrail } = useQuery({
    queryKey: ['task-audit', task.id],
    queryFn: () => taskApi.getAuditTrail(String(task.id)),
    enabled: isOpen,
  });

  // Transition mutation
  const transitionMutation = useMutation({
    mutationFn: (params: { action: TaskAction; reason?: string }) =>
      taskApi.transition(String(task.id), {
        action: params.action,
        reason: params.reason,
        expectedVersion: task.version ? Number(task.version) : undefined,
      }),
    onSuccess: () => {
      onTransitionComplete();
    },
  });

  if (!isOpen) return null;

  // Determine available actions based on status and user role
  const getAvailableActions = (): ActionConfig[] => {
    const status = task.status?.toUpperCase();
    const isAssigneeView = viewMode === 'my-work';
    const isCreatorView = viewMode === 'my-requests';

    const actions: ActionConfig[] = [];

    if (isAssigneeView) {
      // Assignee actions
      if (status === 'ASSIGNED') {
        actions.push({
          action: 'START_WORK',
          label: 'Start Work',
          icon: <PlayIcon className="w-4 h-4" />,
          className: 'bg-blue-500 hover:bg-blue-600 text-white',
        });
      }
      if (status === 'IN_PROGRESS') {
        actions.push({
          action: 'SUBMIT_FOR_REVIEW',
          label: 'Submit for Review',
          icon: <SendIcon className="w-4 h-4" />,
          className: 'bg-purple-500 hover:bg-purple-600 text-white',
          confirmMessage: 'Submit this task for review by the creator?',
        });
      }
      if (status === 'EDITING' || (status === 'IN_PROGRESS' && task.rejection_count && task.rejection_count > 0)) {
        actions.push({
          action: 'RESUBMIT',
          label: 'Resubmit for Review',
          icon: <SendIcon className="w-4 h-4" />,
          className: 'bg-purple-500 hover:bg-purple-600 text-white',
          confirmMessage: 'Resubmit this task for review?',
        });
      }
    }

    if (isCreatorView) {
      // Creator actions
      if (status === 'IN_REVIEW') {
        actions.push({
          action: 'APPROVE',
          label: 'Approve',
          icon: <CheckCircleIcon className="w-4 h-4" />,
          className: 'bg-green-500 hover:bg-green-600 text-white',
          confirmMessage: 'Approve this task and mark it as done?',
        });
        actions.push({
          action: 'REJECT',
          label: 'Request Changes',
          icon: <XCircleIcon className="w-4 h-4" />,
          className: 'bg-orange-500 hover:bg-orange-600 text-white',
          requiresReason: true,
        });
      }
    }

    return actions;
  };

  const availableActions = getAvailableActions();

  const handleAction = (action: TaskAction, requiresReason?: boolean) => {
    if (requiresReason && !rejectionReason.trim()) {
      return;
    }
    
    transitionMutation.mutate({
      action,
      reason: action === 'REJECT' ? rejectionReason : undefined,
    });
  };

  const STATUS_LABELS: Record<string, string> = {
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review',
    EDITING: 'Needs Revision',
    DONE: 'Completed',
    COMPLETED: 'Completed',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{task.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                task.status === 'DONE' || task.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-700'
                  : task.status === 'IN_REVIEW'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {STATUS_LABELS[task.status] || task.status}
              </span>
              <span className="text-xs text-gray-500">
                Priority: {task.priority}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {task.rejection_reason && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-700 mb-1">
                <AlertTriangleIcon className="w-4 h-4" />
                <span className="font-medium text-sm">Changes Requested</span>
              </div>
              <p className="text-sm text-orange-600">{task.rejection_reason}</p>
            </div>
          )}

          {/* Task Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Created by:</span>
              <span className="ml-2 font-medium">{task.creator_name || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-500">Assigned to:</span>
              <span className="ml-2 font-medium">{task.assignee_name || 'Unassigned'}</span>
            </div>
            {task.due_date && (
              <div>
                <span className="text-gray-500">Due date:</span>
                <span className="ml-2 font-medium">
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {task.submitted_for_review_at && (
              <div>
                <span className="text-gray-500">Submitted:</span>
                <span className="ml-2 font-medium">
                  {new Date(task.submitted_for_review_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Rejection Reason Input (for REJECT action) */}
          {availableActions.some(a => a.action === 'REJECT') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback for Changes (required for rejection)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain what changes are needed..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
          )}

          {/* Audit Trail */}
          {auditTrail && auditTrail.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4" />
                Activity History
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {auditTrail.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-xs bg-gray-50 rounded p-2">
                    <div className="flex-1">
                      <span className="font-medium">{entry.actor_name}</span>
                      <span className="text-gray-500"> {entry.action.toLowerCase().replace(/_/g, ' ')}</span>
                      <span className="text-gray-400"> • {entry.from_status} → {entry.to_status}</span>
                      {entry.reason && (
                        <p className="text-gray-600 mt-1">Reason: {entry.reason}</p>
                      )}
                    </div>
                    <span className="text-gray-400 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="border-t p-4 bg-gray-50">
          {transitionMutation.error && (
            <div className="mb-3 p-2 bg-red-50 text-red-600 text-sm rounded-lg">
              {(transitionMutation.error as Error).message || 'Failed to update task'}
            </div>
          )}

          {availableActions.length > 0 ? (
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              
              {availableActions.map((actionConfig) => (
                <button
                  key={actionConfig.action}
                  onClick={() => handleAction(actionConfig.action, actionConfig.requiresReason)}
                  disabled={
                    transitionMutation.isPending || 
                    (actionConfig.requiresReason && !rejectionReason.trim())
                  }
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${actionConfig.className} disabled:opacity-50`}
                >
                  {transitionMutation.isPending ? (
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                  ) : (
                    actionConfig.icon
                  )}
                  {actionConfig.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">
              No actions available for this task in the current view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskActionModal;
