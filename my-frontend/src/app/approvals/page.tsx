'use client';

/**
 * ============================================================================
 * TASK APPROVAL PAGE - Enterprise Governance
 * ============================================================================
 * 
 * PURPOSE: Authority, Review, and Decision-Making
 * NOT for task execution - only for approvals.
 * 
 * VISIBILITY RULES:
 * - L1-L5 (Staff/Officers): See ONLY tasks awaiting their approval
 * - L6-L8 (Managers/Dept Heads): See tasks awaiting approval + subordinate completions
 * - L9-L10 (Admin/Super Admin): Control tower - sees everything
 * 
 * "Show me all tasks that require MY decision, review, or acknowledgment."
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, XCircle, Clock, AlertTriangle, Shield, RefreshCw,
  ChevronRight, Filter, Search, ChevronDown, ChevronUp,
  FileCheck, Users, Building2, Eye, RotateCcw, Lock,
  Calendar, TrendingUp, AlertCircle, Zap, Activity
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ApprovalTask {
  taskId: string;
  entityId: string;
  entityType: string;
  taskTitle: string;
  workflowStatus: string;
  amount: number | null;
  createdAt: string;
  initiatedAt: string;
  createdById: string;
  createdByName: string;
  createdByEmail: string;
  createdByRole: string;
  departmentId: string | null;
  departmentName: string | null;
  stageInstanceId: string;
  stageStatus: string;
  currentStageOrder: number;
  currentStageName: string;
  assignedRole: string;
  approverId: string;
  approverName: string;
  slaDeadline: string | null;
  slaBreach: boolean;
  hoursToDeadline: number | null;
  escalatedAt: string | null;
  escalatedToId: string | null;
  escalatedToName: string | null;
  fallbackApplied: string | null;
  fallbackReason: string | null;
  isConfidential: boolean;
  totalStages: number;
  approvedStages: number;
  canApprove: boolean;
  canReject: boolean;
  canOverride: boolean;
  daysInQueue: number;
}

interface TaskStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  escalatedCount: number;
  slaBreach: number;
}

interface TaskDetailData {
  instance: {
    id: string;
    entityType: string;
    entityReference: string;
    status: string;
    amount: number | null;
    createdAt: string;
    initiatedBy: string;
    createdByName: string;
    createdByEmail: string;
    rejectionCount: number;
    lastRejectionReason: string | null;
  };
  stages: Array<{
    stageInstanceId: string;
    stageOrder: number;
    status: string;
    stageName: string;
    stageCode: string;
    assignedRole: string;
    approverName: string;
    approverEmail: string;
    actionerName: string;
    actionerEmail: string;
    actionComment: string;
    activatedAt: string;
    actionedAt: string;
    dueAt: string;
    escalatedAt: string;
    escalatedToName: string;
    fallbackApplied: string;
    fallbackReason: string;
    hoursAtStage: number;
  }>;
  auditLog: Array<{
    id: string;
    actionType: string;
    performedByName: string;
    comment: string;
    createdAt: string;
    isOverride: boolean;
    overrideType: string;
  }>;
  currentStage: object | null;
  permissions: {
    canApprove: boolean;
    canReject: boolean;
    canRequestRework: boolean;
    canOverride: boolean;
    canViewTimeline: boolean;
    canViewOverrideLogs: boolean;
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Status Badge Component
const StatusBadge: React.FC<{ status: string; slaBreach?: boolean }> = ({ status, slaBreach }) => {
  const configs: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    active: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', icon: <Clock className="w-3 h-3" /> },
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-200', icon: <Clock className="w-3 h-3" /> },
    approved: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', icon: <CheckCircle className="w-3 h-3" /> },
    completed: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-200', icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-200', icon: <XCircle className="w-3 h-3" /> },
    escalated: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-200', icon: <AlertTriangle className="w-3 h-3" /> },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-200', icon: <Activity className="w-3 h-3" /> },
  };

  const config = configs[status] || configs.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${slaBreach ? 'ring-2 ring-red-500' : ''}`}>
      {config.icon}
      {status.replace('_', ' ').toUpperCase()}
      {slaBreach && <AlertTriangle className="w-3 h-3 text-red-500 ml-1" />}
    </span>
  );
};

// SLA Countdown Component
const SLACountdown: React.FC<{ hoursToDeadline: number | null; slaBreach: boolean }> = ({ hoursToDeadline, slaBreach }) => {
  if (hoursToDeadline === null) return <span className="text-gray-400 text-sm">No SLA</span>;

  if (slaBreach) {
    const hoursOverdue = Math.abs(hoursToDeadline);
    return (
      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium text-sm">
        <AlertTriangle className="w-4 h-4" />
        {hoursOverdue.toFixed(1)}h OVERDUE
      </span>
    );
  }

  if (hoursToDeadline < 4) {
    return (
      <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium text-sm">
        <Clock className="w-4 h-4" />
        {hoursToDeadline.toFixed(1)}h left
      </span>
    );
  }

  return (
    <span className="text-gray-600 dark:text-gray-400 text-sm">
      {hoursToDeadline.toFixed(1)}h remaining
    </span>
  );
};

// Stage Progress Bar
const StageProgress: React.FC<{ approved: number; total: number }> = ({ approved, total }) => {
  const percentage = total > 0 ? (approved / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-24">
        <div 
          className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {approved}/{total}
      </span>
    </div>
  );
};

// Stats Card
const StatsCard: React.FC<{ 
  label: string; 
  value: number; 
  icon: React.ReactNode; 
  color: string;
  onClick?: () => void;
}> = ({ label, value, icon, color, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100').replace('-400', '-900/30')}`}>
        {icon}
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TaskApprovalPage() {
  const { user } = useAuth();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [stats, setStats] = useState<TaskStats>({ pendingCount: 0, approvedCount: 0, rejectedCount: 0, escalatedCount: 0, slaBreach: 0 });
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [slaBreachOnly, setSlaBreachOnly] = useState(false);
  const [confidentialOnly, setConfidentialOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Detail panel
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskDetail, setTaskDetail] = useState<TaskDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action modals
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject' | 'rework' | 'override' | null; taskId: string | null }>({ type: null, taskId: null });
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Departments (admin only)
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  // Meta info from API
  const [meta, setMeta] = useState<{ userLevel: number; isAdmin: boolean; visibilityScope: string } | null>(null);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      if (entityTypeFilter !== 'all') params.append('entityType', entityTypeFilter);
      if (slaBreachOnly) params.append('slaBreached', 'true');
      if (confidentialOnly) params.append('confidential', 'true');
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const response = await fetch(`/api/task-approvals?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch approvals');
      }

      const data = await response.json();
      
      if (data.success) {
        setTasks(data.data.tasks);
        setStats(data.data.stats);
        setTotal(data.data.total);
        setMeta(data.meta);
      } else {
        throw new Error(data.error || 'Failed to load approvals');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, departmentFilter, entityTypeFilter, slaBreachOnly, confidentialOnly, searchQuery, page, limit]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch('/api/task-approvals/admin/departments', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDepartments(data.data);
        }
      }
    } catch {
      // Silently fail - departments are admin-only
    }
  }, []);

  const fetchTaskDetail = useCallback(async (taskId: string) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/task-approvals/${taskId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch task details');
      }

      const data = await response.json();
      if (data.success) {
        setTaskDetail(data.data);
      }
    } catch (err) {
      console.error('Error fetching task detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleApprove = async () => {
    if (!actionModal.taskId) return;
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/task-approvals/${actionModal.taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: actionComment }),
      });

      const data = await response.json();
      if (data.success) {
        setActionModal({ type: null, taskId: null });
        setActionComment('');
        fetchTasks();
        if (selectedTaskId === actionModal.taskId) {
          fetchTaskDetail(actionModal.taskId);
        }
      } else {
        alert(data.error || 'Approval failed');
      }
    } catch (err) {
      alert('Failed to approve: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!actionModal.taskId || !actionComment.trim()) {
      alert('Rejection reason is required');
      return;
    }
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/task-approvals/${actionModal.taskId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: actionComment }),
      });

      const data = await response.json();
      if (data.success) {
        setActionModal({ type: null, taskId: null });
        setActionComment('');
        fetchTasks();
      } else {
        alert(data.error || 'Rejection failed');
      }
    } catch (err) {
      alert('Failed to reject: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!actionModal.taskId || actionComment.trim().length < 10) {
      alert('Override requires detailed comment (minimum 10 characters)');
      return;
    }
    
    try {
      setActionLoading(true);
      const response = await fetch(`/api/task-approvals/${actionModal.taskId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: actionComment, overrideType: 'executive_override' }),
      });

      const data = await response.json();
      if (data.success) {
        setActionModal({ type: null, taskId: null });
        setActionComment('');
        fetchTasks();
        alert(`Override completed. ${data.data.approvedCount} stages approved.`);
      } else {
        alert(data.error || 'Override failed');
      }
    } catch (err) {
      alert('Failed to override: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (meta?.isAdmin) {
      fetchDepartments();
    }
  }, [meta?.isAdmin, fetchDepartments]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchTaskDetail(selectedTaskId);
    }
  }, [selectedTaskId, fetchTaskDetail]);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              Task Approvals
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Tasks requiring your decision or review
              {meta && (
                <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {meta.visibilityScope === 'all' ? 'All Departments' : 
                   meta.visibilityScope === 'department_subordinates' ? 'Your Department' : 
                   'Personal Queue'}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
                showFilters 
                  ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => fetchTasks()}
              disabled={loading}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard 
            label="Pending" 
            value={Number(stats.pendingCount) || 0} 
            icon={<Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />} 
            color="text-blue-600 dark:text-blue-400"
            onClick={() => setStatusFilter('pending')}
          />
          <StatsCard 
            label="Approved" 
            value={Number(stats.approvedCount) || 0} 
            icon={<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />} 
            color="text-green-600 dark:text-green-400"
            onClick={() => setStatusFilter('completed')}
          />
          <StatsCard 
            label="Rejected" 
            value={Number(stats.rejectedCount) || 0} 
            icon={<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />} 
            color="text-red-600 dark:text-red-400"
            onClick={() => setStatusFilter('rejected')}
          />
          <StatsCard 
            label="Escalated" 
            value={Number(stats.escalatedCount) || 0} 
            icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />} 
            color="text-orange-600 dark:text-orange-400"
            onClick={() => setStatusFilter('escalated')}
          />
          <StatsCard 
            label="SLA Breach" 
            value={Number(stats.slaBreach) || 0} 
            icon={<AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />} 
            color="text-red-600 dark:text-red-400"
            onClick={() => { setSlaBreachOnly(true); setStatusFilter('pending'); }}
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by reference, creator, stage..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>

              {/* Entity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Types</option>
                  <option value="payment_request">Payment Request</option>
                  <option value="expense_claim">Expense Claim</option>
                  <option value="purchase_order">Purchase Order</option>
                  <option value="leave_request">Leave Request</option>
                  <option value="invoice_approval">Invoice Approval</option>
                </select>
              </div>

              {/* Department (Admin only) */}
              {meta?.isAdmin && departments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Toggle Filters */}
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slaBreachOnly}
                    onChange={(e) => setSlaBreachOnly(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">SLA Breach Only</span>
                </label>
                {meta?.isAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confidentialOnly}
                      onChange={(e) => setConfidentialOnly(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Confidential</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Main Content: Table + Detail Panel */}
        <div className="flex gap-6">
          {/* Task Table */}
          <div className={`flex-1 ${selectedTaskId ? 'hidden lg:block lg:w-1/2' : 'w-full'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading approvals...</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-12 text-center">
                  <FileCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">No tasks requiring approval</p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                    {statusFilter === 'pending' ? 'All caught up! No pending approvals.' : 'No tasks match your filters.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Task</th>
                        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Created By</th>
                        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Stage</th>
                        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Progress</th>
                        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">SLA</th>
                        <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                        <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {tasks.map((task) => (
                        <tr 
                          key={task.taskId}
                          onClick={() => setSelectedTaskId(task.taskId)}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${selectedTaskId === task.taskId ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {task.isConfidential && <Lock className="w-4 h-4 text-purple-500" />}
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-48">
                                  {task.taskTitle || `${task.entityType.replace('_', ' ')} #${task.entityId.slice(0, 8)}`}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  {task.departmentName && (
                                    <>
                                      <Building2 className="w-3 h-3" />
                                      {task.departmentName}
                                    </>
                                  )}
                                  {task.amount && <span className="ml-2 font-medium">{formatAmount(task.amount)}</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 dark:text-gray-100">{task.createdByName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{task.createdByRole}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 dark:text-gray-100">{task.currentStageName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{task.assignedRole}</div>
                            {task.fallbackApplied && (
                              <span className="text-xs text-orange-600 dark:text-orange-400">⚠ Fallback</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <StageProgress approved={task.approvedStages} total={task.totalStages} />
                          </td>
                          <td className="px-4 py-4">
                            <SLACountdown hoursToDeadline={task.hoursToDeadline} slaBreach={task.slaBreach} />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={task.stageStatus} slaBreach={task.slaBreach} />
                              {task.escalatedAt && (
                                <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  Escalated
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {task.canApprove && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'approve', taskId: task.taskId }); }}
                                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                                >
                                  Approve
                                </button>
                              )}
                              {task.canReject && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'reject', taskId: task.taskId }); }}
                                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
                                >
                                  Reject
                                </button>
                              )}
                              {task.canOverride && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'override', taskId: task.taskId }); }}
                                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700"
                                  title="Admin Override"
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedTaskId(task.taskId); }}
                                className="p-1.5 text-gray-500 hover:text-blue-600"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page * limit >= total}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedTaskId && (
            <div className="w-full lg:w-1/2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Task Details</h3>
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              {detailLoading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                </div>
              ) : taskDetail ? (
                <div className="p-4 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {/* Instance Info */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Instance Info</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Reference:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{taskDetail.instance.entityReference}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{taskDetail.instance.entityType.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Amount:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium">{formatAmount(taskDetail.instance.amount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className="ml-2"><StatusBadge status={taskDetail.instance.status} /></span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created By:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{taskDetail.instance.createdByName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created At:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">{formatDateTime(taskDetail.instance.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Approval Timeline */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Approval Timeline</h4>
                    <div className="space-y-4">
                      {taskDetail.stages.map((stage, idx) => (
                        <div key={stage.stageInstanceId} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              stage.status === 'approved' ? 'bg-green-100 text-green-600' :
                              stage.status === 'active' ? 'bg-blue-100 text-blue-600' :
                              stage.status === 'rejected' ? 'bg-red-100 text-red-600' :
                              'bg-gray-100 text-gray-400'
                            }`}>
                              {stage.status === 'approved' ? <CheckCircle className="w-4 h-4" /> :
                               stage.status === 'active' ? <Clock className="w-4 h-4" /> :
                               stage.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
                               <span className="text-sm">{idx + 1}</span>}
                            </div>
                            {idx < taskDetail.stages.length - 1 && (
                              <div className={`w-0.5 flex-1 mt-1 ${stage.status === 'approved' ? 'bg-green-300' : 'bg-gray-200'}`} />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{stage.stageName}</span>
                              <StatusBadge status={stage.status} />
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              <div>Role: {stage.assignedRole}</div>
                              <div>Approver: {stage.approverName}</div>
                              {stage.actionedAt && (
                                <div>Actioned: {formatDateTime(stage.actionedAt)} by {stage.actionerName}</div>
                              )}
                              {stage.hoursAtStage && (
                                <div>Time at stage: {stage.hoursAtStage.toFixed(1)} hours</div>
                              )}
                              {stage.fallbackApplied && (
                                <div className="text-orange-600 mt-1">
                                  ⚠ Fallback: {stage.fallbackApplied} - {stage.fallbackReason}
                                </div>
                              )}
                              {stage.escalatedAt && (
                                <div className="text-orange-600 mt-1">
                                  ⚡ Escalated to {stage.escalatedToName}
                                </div>
                              )}
                              {stage.actionComment && (
                                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                                  &quot;{stage.actionComment}&quot;
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Audit Log */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Audit Log</h4>
                    <div className="space-y-2 text-sm">
                      {taskDetail.auditLog.map((log) => (
                        <div key={log.id} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{log.actionType.replace('_', ' ')}</span>
                            <span className="text-gray-500 ml-2">by {log.performedByName}</span>
                            {log.isOverride && <span className="ml-2 text-purple-600">[OVERRIDE]</span>}
                            {log.comment && <div className="text-gray-500 text-xs mt-1">{log.comment}</div>}
                          </div>
                          <span className="text-gray-400 text-xs">{formatDateTime(log.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  {(taskDetail.permissions.canApprove || taskDetail.permissions.canReject || taskDetail.permissions.canOverride) && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                      {taskDetail.permissions.canApprove && (
                        <button
                          onClick={() => setActionModal({ type: 'approve', taskId: selectedTaskId })}
                          className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
                        >
                          Approve
                        </button>
                      )}
                      {taskDetail.permissions.canReject && (
                        <button
                          onClick={() => setActionModal({ type: 'reject', taskId: selectedTaskId })}
                          className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
                        >
                          Reject
                        </button>
                      )}
                      {taskDetail.permissions.canRequestRework && (
                        <button
                          onClick={() => setActionModal({ type: 'rework', taskId: selectedTaskId })}
                          className="flex-1 px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700"
                        >
                          <RotateCcw className="w-4 h-4 inline mr-2" />
                          Rework
                        </button>
                      )}
                      {taskDetail.permissions.canOverride && (
                        <button
                          onClick={() => setActionModal({ type: 'override', taskId: selectedTaskId })}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
                        >
                          <Shield className="w-4 h-4 inline mr-2" />
                          Override
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Failed to load task details
                </div>
              )}
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
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder={actionModal.type === 'approve' ? 'Optional approval comment...' : 'Please provide a reason...'}
                />
              </div>

              {actionModal.type === 'override' && (
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                  <Shield className="w-4 h-4 inline mr-2" />
                  Admin overrides are logged and audited. This action will approve all pending stages.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setActionModal({ type: null, taskId: null }); setActionComment(''); }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (actionModal.type === 'approve') handleApprove();
                    else if (actionModal.type === 'reject') handleReject();
                    else if (actionModal.type === 'override') handleOverride();
                  }}
                  disabled={actionLoading || (actionModal.type !== 'approve' && !actionComment.trim()) || (actionModal.type === 'override' && actionComment.trim().length < 10)}
                  className={`flex-1 px-4 py-2 text-white font-medium rounded-lg disabled:opacity-50 ${
                    actionModal.type === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    actionModal.type === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    actionModal.type === 'override' ? 'bg-purple-600 hover:bg-purple-700' :
                    'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
