'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import { 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  DollarSign,
  FileText,
  ChevronDown,
  ChevronUp,
  Zap
} from '@/lib/ssr-safe-icons';

// Types
interface ApprovalStage {
  id: string;
  stageName: string;
  stageCode: string;
  stageOrder: number;
  status: string;
  approverName: string | null;
  approverEmail: string | null;
  fallbackApplied: string | null;
  fallbackReason: string | null;
  actionedAt: string | null;
  actionComment: string | null;
  slaHours: number;
  isOverdue: boolean;
}

interface AuditLogEntry {
  id: string;
  action: string;
  performedByName: string | null;
  performedAt: string;
  comment: string | null;
}

interface ApprovalInstance {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  entity_reference: string | null;
  status: string;
  current_stage_order: number;
  requested_amount: number | null;
  initiated_by: string;
  initiated_at: string;
  completed_at: string | null;
  rejection_count: number;
}

interface ApprovalDetailsResponse {
  success: boolean;
  data: {
    instance: ApprovalInstance;
    stages: ApprovalStage[];
    auditLog: AuditLogEntry[];
  };
}

// Status icon component
const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const icons: Record<string, React.ReactNode> = {
    approved: <CheckCircle className="w-5 h-5 text-green-500" />,
    auto_approved: <CheckCircle className="w-5 h-5 text-green-400" />,
    rejected: <XCircle className="w-5 h-5 text-red-500" />,
    active: <Clock className="w-5 h-5 text-blue-500 animate-pulse" />,
    pending: <Clock className="w-5 h-5 text-gray-400" />,
    skipped: <ChevronDown className="w-5 h-5 text-gray-400" />,
    escalated: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  };
  return icons[status] || <Clock className="w-5 h-5 text-gray-400" />;
};

// Fallback badge component
const FallbackBadge: React.FC<{ strategy: string; reason?: string }> = ({ strategy, reason }) => {
  const strategyLabels: Record<string, { label: string; color: string }> = {
    auto_assign_admin: { label: 'Admin Assigned', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    auto_approve: { label: 'Auto-Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    escalate_to_owner: { label: 'Escalated to Owner', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    skip_stage: { label: 'Stage Skipped', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  };

  const config = strategyLabels[strategy] || { label: strategy, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`} title={reason || ''}>
      <Zap className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export default function ApprovalDetailsPage() {
  const params = useParams<{ taskId: string }>();
  const taskId = params?.taskId;
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [executingPayment, setExecutingPayment] = useState(false);
  const [instance, setInstance] = useState<ApprovalInstance | null>(null);
  const [stages, setStages] = useState<ApprovalStage[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    transactionNumber: '',
    amount: '',
    paymentMethod: 'bank_transfer',
    bankReference: '',
    notes: '',
  });
  const [expandedAudit, setExpandedAudit] = useState(false);

  // Fetch approval details
  const fetchDetails = useCallback(async () => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/approvals/tasks/${taskId}/approval-details`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
          'x-enterprise-id': '',
          'x-user-role': user?.role || user?.roleName || 'USER',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approval details');
      }

      const data: ApprovalDetailsResponse = await response.json();
      
      if (data.success) {
        setInstance(data.data.instance);
        setStages(data.data.stages);
        setAuditLog(data.data.auditLog);
        
        // Pre-fill payment amount if available
        if (data.data.instance.requested_amount) {
          setPaymentForm(prev => ({
            ...prev,
            amount: data.data.instance.requested_amount?.toString() || '',
          }));
        }
      } else {
        throw new Error('Failed to load approval details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [taskId, user]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Approve a single stage
  const handleApproveStage = async (stageId: string, comment?: string) => {
    try {
      setApproving(stageId);
      
      const response = await fetch(`/api/approvals/stages/${stageId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
          'x-enterprise-id': '',
          'x-user-role': user?.role || user?.roleName || 'USER',
        },
        body: JSON.stringify({ comment }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchDetails(); // Refresh the data
      } else {
        setError(data.error || 'Failed to approve stage');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve stage');
    } finally {
      setApproving(null);
    }
  };

  // Bulk approve all fallback stages
  const handleBulkApprove = async () => {
    if (!taskId) return;
    
    try {
      setBulkApproving(true);
      
      const response = await fetch(`/api/approvals/tasks/${taskId}/approve-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
          'x-enterprise-id': '',
          'x-user-role': user?.role || user?.roleName || 'USER',
        },
        body: JSON.stringify({ comment: 'Bulk approved by admin' }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchDetails(); // Refresh the data
      } else {
        setError(data.error || 'Failed to bulk approve');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to bulk approve');
    } finally {
      setBulkApproving(false);
    }
  };

  // Execute payment
  const handleExecutePayment = async () => {
    if (!taskId) return;
    
    try {
      setExecutingPayment(true);
      
      const response = await fetch(`/api/approvals/tasks/${taskId}/execute-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': String(user?.id || ''),
          'x-enterprise-id': '',
          'x-user-role': user?.role || user?.roleName || 'USER',
        },
        body: JSON.stringify({
          transactionNumber: paymentForm.transactionNumber,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          bankReference: paymentForm.bankReference,
          notes: paymentForm.notes,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowPaymentModal(false);
        await fetchDetails(); // Refresh the data
      } else {
        setError(data.error || 'Failed to execute payment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute payment');
    } finally {
      setExecutingPayment(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format currency
  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Check if there are fallback stages to bulk approve
  const hasFallbackStages = stages.some(
    s => s.fallbackApplied && ['active', 'pending'].includes(s.status)
  );

  // Check if ready for payment execution
  const isReadyForPayment = instance?.status === 'completed' || 
    stages.find(s => s.stageCode === 'PAYMENT_EXECUTION' && s.status === 'active');

  if (loading) {
    return (
      <SuperAdminLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (!instance) {
    return (
      <SuperAdminLayout title="Not Found">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Approval Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The approval workflow you're looking for doesn't exist.
            </p>
            <button
              onClick={() => router.push('/finance/payment-approval-queue')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Return to Approval Queue
            </button>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title={`Approval Details - ${instance.entity_reference || instance.id.slice(0, 8)}`}
      description="View and manage approval workflow"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/finance/payment-approval-queue')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {instance.entity_reference || `Task #${instance.id.slice(0, 8)}`}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 capitalize">
                {instance.entity_type.replace('_', ' ')} • Status: {instance.status.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasFallbackStages && (
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 flex items-center gap-2 disabled:opacity-50"
              >
                {bulkApproving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Approve All Fallback
              </button>
            )}
            {isReadyForPayment && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Execute Payment
              </button>
            )}
            <button
              onClick={fetchDetails}
              disabled={loading}
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                ×
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {instance.entity_type.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatAmount(instance.requested_amount)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stage Progress</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {instance.current_stage_order} / {stages.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Initiated</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDate(instance.initiated_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Approval Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Approval Timeline
          </h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            
            {/* Stages */}
            <div className="space-y-6">
              {stages.map((stage, index) => (
                <div key={stage.id} className="relative flex gap-4">
                  {/* Status Icon */}
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-200 dark:border-gray-700">
                    <StatusIcon status={stage.status} />
                  </div>
                  
                  {/* Stage Content */}
                  <div className={`flex-1 p-4 rounded-lg border ${
                    stage.status === 'active' 
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {stage.stageName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                          Stage {stage.stageOrder}
                        </span>
                        {stage.fallbackApplied && (
                          <FallbackBadge strategy={stage.fallbackApplied} reason={stage.fallbackReason || undefined} />
                        )}
                        {stage.isOverdue && (
                          <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                            Overdue
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${
                        stage.status === 'approved' || stage.status === 'auto_approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : stage.status === 'rejected'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : stage.status === 'active'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {stage.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {stage.approverName && (
                        <p>
                          <span className="font-medium">Approver:</span> {stage.approverName}
                          {stage.approverEmail && ` (${stage.approverEmail})`}
                        </p>
                      )}
                      {stage.actionedAt && (
                        <p>
                          <span className="font-medium">Actioned:</span> {formatDate(stage.actionedAt)}
                        </p>
                      )}
                      {stage.actionComment && (
                        <p className="italic">"{stage.actionComment}"</p>
                      )}
                      <p className="text-xs text-gray-500">SLA: {stage.slaHours} hours</p>
                    </div>

                    {/* Action Button for Active Stage */}
                    {stage.status === 'active' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleApproveStage(stage.id)}
                          disabled={approving === stage.id}
                          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                        >
                          {approving === stage.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <button
            onClick={() => setExpandedAudit(!expandedAudit)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Audit Log ({auditLog.length} entries)
            </h3>
            {expandedAudit ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedAudit && (
            <div className="mt-4 space-y-3">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <div className="text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {formatDate(entry.performedAt)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {entry.action.replace('_', ' ')}
                    </span>
                    {entry.performedByName && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {' '}by {entry.performedByName}
                      </span>
                    )}
                    {entry.comment && (
                      <p className="text-gray-500 dark:text-gray-400 italic mt-1">
                        "{entry.comment}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Execute Payment
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Number *
                </label>
                <input
                  type="text"
                  value={paymentForm.transactionNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionNumber: e.target.value }))}
                  placeholder="e.g., TXN-2024-001234"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (INR) *
                </label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI</option>
                  <option value="rtgs">RTGS</option>
                  <option value="neft">NEFT</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Reference
                </label>
                <input
                  type="text"
                  value={paymentForm.bankReference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, bankReference: e.target.value }))}
                  placeholder="Optional bank reference"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePayment}
                disabled={executingPayment || !paymentForm.transactionNumber || !paymentForm.amount}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                {executingPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Execute Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
