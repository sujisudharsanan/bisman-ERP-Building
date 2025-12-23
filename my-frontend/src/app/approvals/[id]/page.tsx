'use client';

/**
 * ============================================================================
 * TASK APPROVAL DETAIL PAGE - Enterprise Governance
 * ============================================================================
 * 
 * Full detail view for a single approval instance.
 * Shows complete timeline, audit log, and action controls.
 * 
 * Access controlled by:
 * - Query-level visibility (API enforces role rules)
 * - Cross-department restrictions
 * - Confidential task isolation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Shield,
  RefreshCw, User, Calendar, Building2, FileText, Lock, Zap,
  RotateCcw, MessageSquare, History, Activity, ChevronDown, ChevronUp
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface StageData {
  stageInstanceId: string;
  stageOrder: number;
  status: string;
  stageName: string;
  stageCode: string;
  assignedRole: string;
  approverId: string;
  approverName: string;
  approverEmail: string;
  actionerName: string | null;
  actionerEmail: string | null;
  actionComment: string | null;
  activatedAt: string | null;
  actionedAt: string | null;
  dueAt: string | null;
  escalatedAt: string | null;
  escalatedToName: string | null;
  fallbackApplied: string | null;
  fallbackReason: string | null;
  hoursAtStage: number | null;
  slaHours: number | null;
}

interface AuditLogEntry {
  id: string;
  actionType: string;
  performedById: string;
  performedByName: string;
  comment: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  isOverride: boolean;
  overrideType: string | null;
}

interface InstanceData {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  entityReference: string;
  status: string;
  amount: number | null;
  createdAt: string;
  initiatedAt: string;
  completedAt: string | null;
  initiatedBy: string;
  createdByName: string;
  createdByEmail: string;
  currentStageOrder: number;
  rejectionCount: number;
  lastRejectionReason: string | null;
  departmentId: string | null;
  isConfidential: boolean;
}

interface Permissions {
  canApprove: boolean;
  canReject: boolean;
  canRequestRework: boolean;
  canOverride: boolean;
  canViewTimeline: boolean;
  canViewOverrideLogs: boolean;
}

interface TaskDetailData {
  instance: InstanceData;
  stages: StageData[];
  auditLog: AuditLogEntry[];
  currentStage: StageData | null;
  permissions: Permissions;
}

// ============================================================================
// COMPONENTS
// ============================================================================

const StatusBadge: React.FC<{ status: string; large?: boolean }> = ({ status, large }) => {
  const configs: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    active: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', icon: <Clock className="w-4 h-4" /> },
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-200', icon: <Clock className="w-4 h-4" /> },
    approved: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', icon: <CheckCircle className="w-4 h-4" /> },
    completed: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', icon: <CheckCircle className="w-4 h-4" /> },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', icon: <XCircle className="w-4 h-4" /> },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', icon: <Activity className="w-4 h-4" /> },
    skipped: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300', icon: null },
    escalated: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-200', icon: <Zap className="w-4 h-4" /> },
    auto_approved: { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-200', icon: <Shield className="w-4 h-4" /> },
  };

  const config = configs[status] || configs.pending;
  const sizeClass = large ? 'px-4 py-2 text-sm' : 'px-2 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClass}`}>
      {config.icon}
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ApprovalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const instanceId = params.id as string;
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TaskDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ userLevel: number; isAdmin: boolean } | null>(null);

  // Sections expansion
  const [showTimeline, setShowTimeline] = useState(true);
  const [showAuditLog, setShowAuditLog] = useState(true);

  // Action state
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject' | 'rework' | 'override' | null }>({ type: null });
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/task-approvals/${instanceId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          setError(errorData.error || 'Access denied to this task');
        } else if (response.status === 404) {
          setError('Task not found');
        } else {
          throw new Error(errorData.error || 'Failed to load task');
        }
        return;
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    if (instanceId) {
      fetchDetail();
    }
  }, [instanceId, fetchDetail]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const performAction = async (action: 'approve' | 'reject' | 'rework' | 'override') => {
    if (action !== 'approve' && !actionComment.trim()) {
      alert('Please provide a reason');
      return;
    }
    if (action === 'override' && actionComment.trim().length < 10) {
      alert('Override requires detailed comment (minimum 10 characters)');
      return;
    }

    try {
      setActionLoading(true);
      
      const endpoint = action === 'rework' ? 'request-rework' : action;
      const response = await fetch(`/api/task-approvals/${instanceId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          comment: actionComment,
          overrideType: action === 'override' ? 'executive_override' : undefined
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setActionModal({ type: null });
        setActionComment('');
        fetchDetail();
        
        if (result.data?.workflowCompleted) {
          alert('Workflow completed successfully!');
        } else if (result.data?.workflowRejected) {
          alert('Workflow has been rejected.');
        }
      } else {
        alert(result.error || `${action} failed`);
      }
    } catch (err) {
      alert(`Failed to ${action}: ` + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (hours: number | null) => {
    if (!hours) return '-';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${Math.round(hours / 24)} days`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/approvals')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Approvals
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { instance, stages, auditLog, currentStage, permissions } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/approvals')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                {instance.isConfidential && <Lock className="w-5 h-5 text-purple-500" />}
                {instance.entityReference || `${instance.entityType.replace('_', ' ')} Approval`}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Instance ID: {instance.id.slice(0, 8)}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={instance.status} large />
            <button
              onClick={fetchDetail}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatAmount(instance.amount)}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created By</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{instance.createdByName}</div>
            <div className="text-xs text-gray-500">{instance.createdByEmail}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Stage Progress</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {stages.filter(s => s.status === 'approved').length} / {stages.length} Approved
            </div>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${(stages.filter(s => s.status === 'approved').length / stages.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Time in Queue</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {formatDuration((Date.now() - new Date(instance.createdAt).getTime()) / 3600000)}
            </div>
            <div className="text-xs text-gray-500">Since {formatDateTime(instance.createdAt)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        {(permissions.canApprove || permissions.canReject || permissions.canOverride) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Available Actions</h3>
            <div className="flex flex-wrap gap-3">
              {permissions.canApprove && (
                <button
                  onClick={() => setActionModal({ type: 'approve' })}
                  className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              )}
              {permissions.canReject && (
                <button
                  onClick={() => setActionModal({ type: 'reject' })}
                  className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              )}
              {permissions.canRequestRework && (
                <button
                  onClick={() => setActionModal({ type: 'rework' })}
                  className="px-6 py-2.5 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Request Rework
                </button>
              )}
              {permissions.canOverride && (
                <button
                  onClick={() => setActionModal({ type: 'override' })}
                  className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Admin Override
                </button>
              )}
            </div>
          </div>
        )}

        {/* Rejection Warning */}
        {instance.rejectionCount > 0 && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">
                  Rejected {instance.rejectionCount} time{instance.rejectionCount > 1 ? 's' : ''}
                </h4>
                {instance.lastRejectionReason && (
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                    Last reason: {instance.lastRejectionReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approval Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Approval Timeline
            </h3>
            {showTimeline ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showTimeline && (
            <div className="p-6 pt-0 border-t border-gray-100 dark:border-gray-700">
              <div className="space-y-0">
                {stages.map((stage, idx) => (
                  <div key={stage.stageInstanceId} className="flex">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center mr-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        stage.status === 'approved' ? 'bg-green-100 dark:bg-green-900/50 text-green-600' :
                        stage.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600' :
                        stage.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/50 text-red-600' :
                        stage.status === 'escalated' ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-600' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      }`}>
                        {stage.status === 'approved' ? <CheckCircle className="w-5 h-5" /> :
                         stage.status === 'active' ? <Clock className="w-5 h-5" /> :
                         stage.status === 'rejected' ? <XCircle className="w-5 h-5" /> :
                         stage.status === 'escalated' ? <Zap className="w-5 h-5" /> :
                         <span className="text-sm font-medium">{idx + 1}</span>}
                      </div>
                      {idx < stages.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-16 ${
                          stage.status === 'approved' ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-600'
                        }`} />
                      )}
                    </div>

                    {/* Stage content */}
                    <div className="flex-1 pb-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">{stage.stageName}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{stage.stageCode} • {stage.assignedRole}</p>
                        </div>
                        <StatusBadge status={stage.status} />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Assigned to:</span>
                          <span className="ml-2 text-gray-900 dark:text-gray-100">{stage.approverName}</span>
                        </div>
                        {stage.slaHours && (
                          <div>
                            <span className="text-gray-500">SLA:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">{stage.slaHours} hours</span>
                          </div>
                        )}
                        {stage.activatedAt && (
                          <div>
                            <span className="text-gray-500">Started:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">{formatDateTime(stage.activatedAt)}</span>
                          </div>
                        )}
                        {stage.actionedAt && (
                          <div>
                            <span className="text-gray-500">Completed:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">{formatDateTime(stage.actionedAt)}</span>
                          </div>
                        )}
                        {stage.hoursAtStage && (
                          <div>
                            <span className="text-gray-500">Time at stage:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">{formatDuration(stage.hoursAtStage)}</span>
                          </div>
                        )}
                        {stage.actionerName && (
                          <div>
                            <span className="text-gray-500">Actioned by:</span>
                            <span className="ml-2 text-gray-900 dark:text-gray-100">{stage.actionerName}</span>
                          </div>
                        )}
                      </div>

                      {/* Fallback warning */}
                      {stage.fallbackApplied && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-medium">Fallback Applied: {stage.fallbackApplied.replace(/_/g, ' ')}</span>
                          </div>
                          {stage.fallbackReason && (
                            <p className="text-orange-600 dark:text-orange-400 text-sm mt-1">{stage.fallbackReason}</p>
                          )}
                        </div>
                      )}

                      {/* Escalation info */}
                      {stage.escalatedAt && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                          <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-sm">
                            <Zap className="w-4 h-4" />
                            <span>Escalated to {stage.escalatedToName} at {formatDateTime(stage.escalatedAt)}</span>
                          </div>
                        </div>
                      )}

                      {/* Comment */}
                      {stage.actionComment && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                            <p className="text-gray-700 dark:text-gray-300 text-sm">&quot;{stage.actionComment}&quot;</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Audit Log */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Audit Log
              {permissions.canViewOverrideLogs && meta?.isAdmin && (
                <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                  Full Access
                </span>
              )}
            </h3>
            {showAuditLog ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showAuditLog && (
            <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700">
              <div className="space-y-3">
                {auditLog.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-3 rounded-lg ${
                      log.isOverride 
                        ? 'bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700' 
                        : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {log.isOverride && <Shield className="w-4 h-4 text-purple-600" />}
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                        {log.overrideType && (
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            [{log.overrideType}]
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{formatDateTime(log.createdAt)}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      by {log.performedByName}
                    </div>
                    {log.comment && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                        &quot;{log.comment}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Modal */}
        {actionModal.type && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                {actionModal.type === 'approve' && <><CheckCircle className="w-5 h-5 text-green-600" /> Approve Task</>}
                {actionModal.type === 'reject' && <><XCircle className="w-5 h-5 text-red-600" /> Reject Task</>}
                {actionModal.type === 'rework' && <><RotateCcw className="w-5 h-5 text-yellow-600" /> Request Rework</>}
                {actionModal.type === 'override' && <><Shield className="w-5 h-5 text-purple-600" /> Admin Override</>}
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {actionModal.type === 'approve' ? 'Comment (optional)' : 
                   actionModal.type === 'override' ? 'Reason (required, min 10 chars)' :
                   'Reason (required)'}
                </label>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={actionModal.type === 'approve' ? 'Optional approval comment...' : 'Please provide a detailed reason...'}
                />
              </div>

              {actionModal.type === 'override' && (
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Admin overrides are logged and audited. This action will approve all pending stages and complete the workflow.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setActionModal({ type: null }); setActionComment(''); }}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => performAction(actionModal.type!)}
                  disabled={actionLoading || (actionModal.type !== 'approve' && !actionComment.trim()) || (actionModal.type === 'override' && actionComment.trim().length < 10)}
                  className={`flex-1 px-4 py-2 text-white font-medium rounded-lg disabled:opacity-50 ${
                    actionModal.type === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    actionModal.type === 'override' ? 'bg-purple-600 hover:bg-purple-700' :
                    'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
