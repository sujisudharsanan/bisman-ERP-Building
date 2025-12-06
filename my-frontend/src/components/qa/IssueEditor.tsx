'use client';

import React, { useState } from 'react';
import { StatusBadge, IssueStatus } from './StatusBadge';
import { SeverityBadge, Severity } from './SeverityBadge';

interface User {
  id: number;
  name: string;
}

interface IssueEditorProps {
  issueId: number | string;
  currentStatus: IssueStatus | string;
  currentSeverity: Severity | string;
  currentPriority?: string;
  currentAssignee?: User | null;
  availableUsers?: User[];
  onUpdate: (data: {
    status?: string;
    severity?: string;
    priority?: string;
    assignedTo?: number | null;
    gitCommit?: string;
    comment?: string;
  }) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const ISSUE_STATUSES: { value: IssueStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
  { value: 'wont_fix', label: "Won't Fix" },
  { value: 'duplicate', label: 'Duplicate' },
];

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export function IssueEditor({
  currentStatus,
  currentSeverity,
  currentPriority,
  currentAssignee,
  availableUsers = [],
  onUpdate,
  loading = false,
  className = '',
}: IssueEditorProps) {
  const [status, setStatus] = useState(currentStatus);
  const [severity, setSeverity] = useState(currentSeverity);
  const [priority, setPriority] = useState(currentPriority || 'medium');
  const [assignedTo, setAssignedTo] = useState<number | null>(currentAssignee?.id || null);
  const [gitCommit, setGitCommit] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasChanges =
    status !== currentStatus ||
    severity !== currentSeverity ||
    priority !== currentPriority ||
    assignedTo !== (currentAssignee?.id || null) ||
    gitCommit.trim() !== '' ||
    comment.trim() !== '';

  const handleSubmit = async () => {
    if (!hasChanges || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updateData: Record<string, unknown> = {};
      
      if (status !== currentStatus) updateData.status = status;
      if (severity !== currentSeverity) updateData.severity = severity;
      if (priority !== currentPriority) updateData.priority = priority;
      if (assignedTo !== (currentAssignee?.id || null)) updateData.assignedTo = assignedTo;
      if (gitCommit.trim()) updateData.gitCommit = gitCommit.trim();
      if (comment.trim()) updateData.comment = comment.trim();

      await onUpdate(updateData);
      
      // Reset transient fields
      setGitCommit('');
      setComment('');
    } catch (error) {
      console.error('Failed to update issue:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Update Issue
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as IssueStatus)}
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {ISSUE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="mt-1">
            <StatusBadge status={status} size="sm" />
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Severity
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="mt-1">
            <SeverityBadge level={severity} size="sm" />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Assigned To
          </label>
          <select
            value={assignedTo || ''}
            onChange={(e) => setAssignedTo(e.target.value ? parseInt(e.target.value, 10) : null)}
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Unassigned</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      >
        {showAdvanced ? '▼' : '▶'} Advanced options
      </button>

      {showAdvanced && (
        <div className="mt-4 space-y-4">
          {/* Git Commit */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Git Commit (optional)
            </label>
            <input
              type="text"
              value={gitCommit}
              onChange={(e) => setGitCommit(e.target.value)}
              placeholder="e.g., abc1234 or full SHA"
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Update Note (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note about this update..."
              rows={3}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* Submit button */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasChanges || isSubmitting || loading}
          className={`
            px-4 py-2 text-sm font-medium rounded-md
            ${hasChanges && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }
            transition-colors duration-200
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Updating...
            </span>
          ) : (
            'Update Issue'
          )}
        </button>
      </div>
    </div>
  );
}

export default IssueEditor;
