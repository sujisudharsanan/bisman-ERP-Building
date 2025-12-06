'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useQATask, useQAUsers } from '@/hooks/useQA';
import { StatusBadge, SeverityBadge, ModuleTag, UserAvatar, IssueCard } from '@/components/qa';

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'skipped', label: 'Skipped' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const taskId = resolvedParams.id;
  const router = useRouter();

  const { task, relatedIssues, loading, error, updateTask } = useQATask(taskId);
  const { users } = useQAUsers();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    actual_result: '',
  });
  const [saving, setSaving] = useState(false);

  // Initialize edit data when task loads
  React.useEffect(() => {
    if (task) {
      setEditData({
        status: task.status,
        priority: task.priority,
        assigned_to: task.assigned_to?.toString() || '',
        actual_result: task.actual_result || '',
      });
    }
  }, [task]);

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, unknown> = {};
    
    if (editData.status !== task?.status) updates.status = editData.status;
    if (editData.priority !== task?.priority) updates.priority = editData.priority;
    if (editData.assigned_to !== (task?.assigned_to?.toString() || '')) {
      updates.assigned_to = editData.assigned_to ? parseInt(editData.assigned_to, 10) : null;
    }
    if (editData.actual_result !== (task?.actual_result || '')) {
      updates.actual_result = editData.actual_result;
    }

    if (Object.keys(updates).length > 0) {
      await updateTask(updates);
    }

    setSaving(false);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <
        <div className="p-6 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </>
    );
  }

  if (error || !task) {
    return (
      <
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error || 'Task not found'}</p>
            <Link href="/qa/test-tasks" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
              ← Back to Tasks
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/qa/test-tasks"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              ← Back to Tasks
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {task.title}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={task.status} />
              <SeverityBadge level={task.priority} type="priority" />
              {task.module && <ModuleTag module={task.module} />}
              {task.test_type && (
                <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {task.test_type} test
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Task
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Description
              </h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {task.description || 'No description provided'}
              </p>
            </div>

            {/* Test Steps */}
            {task.test_steps && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Test Steps
                </h2>
                <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  {task.test_steps}
                </pre>
              </div>
            )}

            {/* Expected Result */}
            {task.expected_result && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Expected Result
                </h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {task.expected_result}
                </p>
              </div>
            )}

            {/* Actual Result */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Actual Result
              </h2>
              {isEditing ? (
                <textarea
                  value={editData.actual_result}
                  onChange={(e) => setEditData((prev) => ({ ...prev, actual_result: e.target.value }))}
                  rows={4}
                  placeholder="Enter the actual test result..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {task.actual_result || 'Not tested yet'}
                </p>
              )}
            </div>

            {/* Related Issues */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Related Issues ({relatedIssues.length})
                </h2>
                <Link
                  href={`/qa/issues/new?task_id=${task.id}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Report Issue
                </Link>
              </div>
              {relatedIssues.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No issues reported for this task
                </p>
              ) : (
                <div className="space-y-3">
                  {relatedIssues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={{
                        id: issue.id,
                        issueCode: issue.issue_code,
                        title: issue.title,
                        severity: issue.severity,
                        status: issue.status,
                        issueType: issue.issue_type,
                        createdAt: issue.created_at,
                      }}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Edit Panel */}
            {isEditing && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-5 space-y-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Quick Edit</h3>
                
                <div>
                  <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Status
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-md
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Priority
                  </label>
                  <select
                    value={editData.priority}
                    onChange={(e) => setEditData((prev) => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-md
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Assigned To
                  </label>
                  <select
                    value={editData.assigned_to}
                    onChange={(e) => setEditData((prev) => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-700 rounded-md
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Details Panel */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Assignee</dt>
                  <dd>
                    {task.assignee ? (
                      <UserAvatar
                        userId={task.assignee.id}
                        name={task.assignee.name}
                        size="xs"
                        showName
                      />
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Due Date</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {task.due_date ? formatDate(task.due_date) : '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formatDate(task.created_at)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Updated</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {formatDate(task.updated_at)}
                  </dd>
                </div>
                {task.completed_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Completed</dt>
                    <dd className="text-gray-900 dark:text-white">
                      {formatDate(task.completed_at)}
                    </dd>
                  </div>
                )}
                {task.creator && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Created By</dt>
                    <dd>
                      <UserAvatar
                        userId={task.creator.id}
                        name={task.creator.name}
                        size="xs"
                        showName
                      />
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/qa/issues/new?task_id=${task.id}`}
                  className="block w-full px-4 py-2 text-center bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Report Issue
                </Link>
                {task.status === 'pending' && (
                  <button
                    onClick={async () => {
                      await updateTask({ status: 'in_progress' });
                    }}
                    className="block w-full px-4 py-2 text-center bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Start Testing
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <>
                    <button
                      onClick={async () => {
                        await updateTask({ status: 'passed' });
                      }}
                      className="block w-full px-4 py-2 text-center bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Mark as Passed
                    </button>
                    <button
                      onClick={async () => {
                        await updateTask({ status: 'failed' });
                      }}
                      className="block w-full px-4 py-2 text-center bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Mark as Failed
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
