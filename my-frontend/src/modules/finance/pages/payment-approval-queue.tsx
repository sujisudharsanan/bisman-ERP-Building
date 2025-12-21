'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import { Search, RefreshCw, ChevronRight, Clock, AlertTriangle, CheckCircle, XCircle, Filter } from '@/lib/ssr-safe-icons';
import { useRouter } from 'next/navigation';

// Types for the approval queue
interface ApprovalTask {
  taskId: string;
  taskTitle: string;
  taskType: string;
  initiatedBy: string;
  initiatedByName: string;
  currentStage: string;
  currentStageOrder: number;
  totalStages: number;
  amount: number | null;
  status: string;
  createdAt: string;
  hasFallback: boolean;
  daysInQueue: number;
}

interface ApprovalQueueResponse {
  success: boolean;
  data: {
    tasks: ApprovalTask[];
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', icon: <Clock className="w-3 h-3" /> },
    draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', icon: null },
    completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', icon: <CheckCircle className="w-3 h-3" /> },
    rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200', icon: <XCircle className="w-3 h-3" /> },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.icon}
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

// Stage progress component
const StageProgress: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {current}/{total}
      </span>
    </div>
  );
};

export default function PaymentApprovalQueue() {
  const { hasAccess, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch approval queue
  const fetchApprovalQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (entityTypeFilter !== 'all') params.append('entityType', entityTypeFilter);

      const response = await fetch(`/api/approvals/admin/queue?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
          'x-enterprise-id': '',
          'x-user-role': user?.role || user?.roleName || 'USER',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approval queue');
      }

      const data: ApprovalQueueResponse = await response.json();
      
      if (data.success) {
        setTasks(data.data.tasks);
        setTotal(data.data.total);
      } else {
        throw new Error('Failed to load approval queue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, entityTypeFilter]);

  useEffect(() => {
    fetchApprovalQueue();
  }, [fetchApprovalQueue]);

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.taskTitle?.toLowerCase().includes(query) ||
      task.taskType?.toLowerCase().includes(query) ||
      task.initiatedByName?.toLowerCase().includes(query) ||
      task.currentStage?.toLowerCase().includes(query)
    );
  });

  // Navigate to task detail
  const handleTaskClick = (taskId: string) => {
    router.push(`/finance/approval-details/${taskId}`);
  };

  // Format currency
  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Access check - allow ADMIN, SUPER_ADMIN, ENTERPRISE_ADMIN, CFO, FINANCE CONTROLLER
  const userRole = user?.roleName || user?.role || '';
  const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN', 'CFO', 'FINANCE CONTROLLER', 'FINANCE_CONTROLLER', 'TREASURY'];
  const hasPageAccess = allowedRoles.some(role => 
    userRole.toUpperCase().includes(role) || userRole.toUpperCase() === role
  ) || hasAccess('executive-dashboard');

  if (!hasPageAccess) {
    return (
      <SuperAdminLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to view this page.
            </p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title="Task Approval Department"
      description="Manage and approve pending tasks across your organization"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Task Approval Department
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {total} pending task{total !== 1 ? 's' : ''} requiring approval
            </p>
          </div>
          <div className="flex items-center space-x-2">
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
            </button>
            <button
              onClick={fetchApprovalQueue}
              disabled={loading}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Type
              </label>
              <select
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Types</option>
                <option value="payment_request">Payment Request</option>
                <option value="expense_claim">Expense Claim</option>
                <option value="purchase_order">Purchase Order</option>
                <option value="vendor_onboarding">Vendor Onboarding</option>
              </select>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by title, type, initiator, or stage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Task Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading approval queue...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                All Caught Up!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No pending tasks require your approval at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Initiated By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Stage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.taskId}
                      onClick={() => handleTaskClick(task.taskId)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {task.hasFallback && (
                            <span className="w-2 h-2 bg-yellow-400 rounded-full" title="Has fallback stages" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {task.taskTitle || `Task #${task.taskId.slice(0, 8)}`}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {task.taskType.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {task.initiatedByName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(task.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {task.currentStage}
                        </span>
                      </td>
                      <td className="px-4 py-4 min-w-[120px]">
                        <StageProgress current={task.currentStageOrder} total={task.totalStages} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatAmount(task.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm ${task.daysInQueue > 3 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                          {task.daysInQueue === 0 ? 'Today' : `${task.daysInQueue}d`}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ChevronRight className="w-5 h-5 text-gray-400 inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            <span>Has fallback stages (Admin intervention may be needed)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400 font-medium">3d+</span>
            <span>Overdue tasks</span>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
