'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bug,
  ArrowLeft,
  Edit2,
  Save,
  X,
  MessageSquare,
  Send,
  Paperclip,
  ExternalLink,
  Clock,
  User,
  Monitor,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Link as LinkIcon
} from 'lucide-react';
import { useQAIssue, useQAUsers, QAIssueHistory } from '@/hooks/useQA';
import {
  StatusBadge,
  SeverityBadge,
  ModuleTag,
  UserAvatar,
  IssueTimeline,
  IssueEditor
} from '@/components/qa';
import type { TimelineItemData } from '@/components/qa/TimelineItem';
import type { IssueStatus } from '@/components/qa/StatusBadge';
import type { Severity } from '@/components/qa/SeverityBadge';

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const issueId = params?.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    title: string;
    description: string;
    steps_to_reproduce: string;
    expected_behavior: string;
    actual_behavior: string;
  } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { issue, history, loading, error, refresh, updateIssue, addComment } = useQAIssue(issueId);
  const { users } = useQAUsers();

  // Transform history to TimelineItemData format
  const timelineItems: TimelineItemData[] = history.map((h: QAIssueHistory) => {
    const user = users.find(u => u.id === h.changed_by);
    let type: TimelineItemData['type'] = 'comment';
    
    if (h.field_name === 'status') type = 'status_change';
    else if (h.field_name === 'severity') type = 'severity_change';
    else if (h.field_name === 'assigned_to') type = 'assignment_change';
    else if (h.field_name === 'description') type = 'description_update';
    else if (h.field_name === 'git_commit') type = 'git_commit';
    else if (h.comment) type = 'comment';
    
    return {
      id: h.id,
      type,
      fieldName: h.field_name,
      oldValue: h.old_value,
      newValue: h.new_value,
      comment: h.comment,
      changedBy: user ? { id: user.id, name: user.name } : null,
      changedAt: h.changed_at,
    };
  });

  // Get comments from history (items with comment field)
  const comments = history.filter((h: QAIssueHistory) => h.comment);

  const handleStartEdit = () => {
    if (issue) {
      setEditData({
        title: issue.title,
        description: issue.description || '',
        steps_to_reproduce: issue.steps_to_reproduce || '',
        expected_behavior: issue.expected_behavior || '',
        actual_behavior: issue.actual_behavior || '',
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(null);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;

    try {
      await updateIssue(editData);
      setIsEditing(false);
      setEditData(null);
    } catch (error) {
      console.error('Error updating issue:', error);
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    try {
      await updateIssue({ status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSeverityChange = async (newSeverity: Severity) => {
    try {
      await updateIssue({ severity: newSeverity });
    } catch (error) {
      console.error('Error updating severity:', error);
    }
  };

  const handleAssigneeChange = async (userId: string | null) => {
    try {
      await updateIssue({ assigned_to: userId ? Number(userId) : undefined });
    } catch (error) {
      console.error('Error updating assignee:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      await addComment(newComment);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-red-700 font-medium">Failed to load issue</p>
            <p className="text-red-600 text-sm">The issue may have been deleted or you don't have access.</p>
          </div>
        </div>
        <Link
          href="/qa/issues"
          className="inline-flex items-center gap-2 mt-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Issues
        </Link>
      </div>
    );
  }

  const assignee = users.find((u: any) => u.id === issue.assigned_to);
  const reporter = users.find((u: any) => u.id === issue.opened_by);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/qa/issues"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-gray-500">{issue.issue_code}</span>
              <StatusBadge status={issue.status} />
              <SeverityBadge level={issue.severity} />
            </div>
            {isEditing ? (
              <input
                type="text"
                value={editData?.title || ''}
                onChange={(e) => setEditData({ ...editData!, title: e.target.value })}
                className="mt-1 text-xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none w-full"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900 mt-1">{issue.title}</h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEdit}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Description
            </h2>
            {isEditing ? (
              <textarea
                value={editData?.description || ''}
                onChange={(e) => setEditData({ ...editData!, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the issue..."
              />
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {issue.description || 'No description provided.'}
              </p>
            )}
          </div>

          {/* Steps to Reproduce */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Steps to Reproduce</h2>
            {isEditing ? (
              <textarea
                value={editData?.steps_to_reproduce || ''}
                onChange={(e) => setEditData({ ...editData!, steps_to_reproduce: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
              />
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">
                {issue.steps_to_reproduce || 'No steps provided.'}
              </p>
            )}
          </div>

          {/* Expected vs Actual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Expected Behavior
              </h3>
              {isEditing ? (
                <textarea
                  value={editData?.expected_behavior || ''}
                  onChange={(e) => setEditData({ ...editData!, expected_behavior: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                />
              ) : (
                <p className="text-green-700 text-sm">
                  {issue.expected_behavior || 'Not specified.'}
                </p>
              )}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Actual Behavior
              </h3>
              {isEditing ? (
                <textarea
                  value={editData?.actual_behavior || ''}
                  onChange={(e) => setEditData({ ...editData!, actual_behavior: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                />
              ) : (
                <p className="text-red-700 text-sm">
                  {issue.actual_behavior || 'Not specified.'}
                </p>
              )}
            </div>
          </div>

          {/* Environment Info */}
          {(issue.browser || issue.os || issue.environment) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {issue.browser && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{issue.browser}</span>
                  </div>
                )}
                {issue.os && (
                  <div className="flex items-center gap-2 text-sm">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{issue.os}</span>
                  </div>
                )}
                {issue.environment && (
                  <div className="flex items-center gap-2 text-sm">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 truncate">{issue.environment}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-400" />
              Comments ({comments.length})
            </h2>

            {comments.length > 0 ? (
              <div className="space-y-4 mb-6">
                {comments.map((comment: any) => {
                  const author = users.find((u: any) => u.id === comment.user_id);
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <UserAvatar name={author?.name || 'Unknown'} size="sm" />
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 text-sm">
                            {author?.name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mb-4">No comments yet.</p>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmittingComment}
                className="self-end px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </div>

          {/* History Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              History
            </h2>
            <IssueTimeline items={timelineItems} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
            <IssueEditor
              issueId={issue.id}
              currentStatus={issue.status}
              currentSeverity={issue.severity}
              currentPriority={issue.priority}
              currentAssignee={assignee ? { id: assignee.id, name: assignee.name } : null}
              availableUsers={users}
              onUpdate={async (data) => {
                await updateIssue({
                  status: data.status,
                  severity: data.severity,
                  priority: data.priority,
                  assigned_to: data.assignedTo ?? undefined,
                  comment: data.comment,
                });
              }}
            />
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-4">Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Module</p>
                <ModuleTag module={issue.module} />
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reporter</p>
                {reporter ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar name={reporter.name} size="sm" />
                    <span className="text-sm text-gray-900">{reporter.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Unknown</span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Assignee</p>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar name={assignee.name} size="sm" />
                    <span className="text-sm text-gray-900">{assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Unassigned</span>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(issue.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {new Date(issue.updated_at).toLocaleString()}
                </p>
              </div>

              {issue.related_task_id && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Related Task</p>
                  <Link
                    href={`/qa/test-tasks/${issue.related_task_id}`}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    View Task
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          {issue.attachments && issue.attachments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-gray-400" />
                Attachments
              </h3>
              <div className="space-y-2">
                {issue.attachments.map((attachment: string, index: number) => (
                  <a
                    key={index}
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-sm"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 truncate">Attachment {index + 1}</span>
                    <ExternalLink className="w-3 h-3 text-gray-400 ml-auto" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
