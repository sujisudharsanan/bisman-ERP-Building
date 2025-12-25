'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

// Types
interface SettlementItem {
  id: string;
  paymentRequestId: string;
  amount: number;
  status: string;
  disallowed: boolean;
  disallowedReason: string | null;
  disallowedById: number | null;
  disallowedBy: { name: string } | null;
  paymentRequest: {
    id: string;
    requestId: string;
    clientName: string;
    totalAmount: number;
    status: string;
  };
}

interface AuditEntry {
  id: string;
  action: string;
  actorId: number;
  actor: { name: string; email: string };
  timestamp: string;
  details: Record<string, unknown>;
}

interface Settlement {
  id: string;
  createdAt: string;
  updatedAt: string;
  period: string;
  totalAmount: number;
  currency: string;
  status: string;
  utr: string | null;
  executedAt: string | null;
  failureReason: string | null;
  retryCount: number;
  createdById: number;
  createdBy: { id: number; name: string; email: string };
  fcApprovedById: number | null;
  fcApprovedBy: { name: string } | null;
  fcApprovedAt: string | null;
  cfoApprovedById: number | null;
  cfoApprovedBy: { name: string } | null;
  cfoApprovedAt: string | null;
  executedById: number | null;
  executedBy: { name: string } | null;
  items: SettlementItem[];
  auditTrail: AuditEntry[];
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SUBMITTED_TO_FINANCE: 'bg-blue-100 text-blue-800',
    FINANCE_CONTROLLER_APPROVED: 'bg-indigo-100 text-indigo-800',
    CFO_APPROVED: 'bg-purple-100 text-purple-800',
    SENT_TO_BANK: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };

  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED_TO_FINANCE: 'Submitted',
    FINANCE_CONTROLLER_APPROVED: 'FC Approved',
    CFO_APPROVED: 'CFO Approved',
    SENT_TO_BANK: 'Sent to Bank',
    PAID: 'Paid',
    FAILED: 'Failed',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

// Format currency
function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default function SettlementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const settlementId = params?.id as string;
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Review mode state (for FC/CFO)
  const [reviewMode, setReviewMode] = useState(false);
  const [disallowedItems, setDisallowedItems] = useState<Set<string>>(new Set());
  const [disallowReasons, setDisallowReasons] = useState<Record<string, string>>({});

  // Banker execution state
  const [utrInput, setUtrInput] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  // Linked requests expanded
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  // Role checks
  const userRole = user?.role || '';
  const isAccountant = userRole === 'ACCOUNTANT';
  const isFC = userRole === 'FINANCE_CONTROLLER';
  const isCFO = userRole === 'CFO';
  const isBanker = userRole === 'BANKER';
  const isAuditor = userRole === 'AUDITOR';

  // Fetch settlement details
  const fetchSettlement = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/settlements/${settlementId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Settlement not found');
        }
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch settlement');
      }

      const data = await response.json();
      setSettlement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [settlementId, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && settlementId) {
      fetchSettlement();
    }
  }, [authLoading, isAuthenticated, settlementId, fetchSettlement]);

  // Handle FC/CFO approval
  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!settlement) return;

    // Validate disallow reasons
    if (action === 'approve' && disallowedItems.size > 0) {
      for (const itemId of disallowedItems) {
        if (!disallowReasons[itemId]?.trim()) {
          setError('Please provide a reason for all disallowed items');
          return;
        }
      }
    }

    // Cannot disallow all items
    if (action === 'approve' && disallowedItems.size === settlement.items.length) {
      setError('Cannot disallow all items. Use reject instead.');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const endpoint = isFC
        ? `/api/settlements/${settlementId}/fc-approve`
        : `/api/settlements/${settlementId}/cfo-approve`;

      const body: Record<string, unknown> = { action };
      if (action === 'approve' && disallowedItems.size > 0) {
        body.disallowedItems = Array.from(disallowedItems).map(id => ({
          itemId: id,
          reason: disallowReasons[id],
        }));
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Action failed');
      }

      // Refresh data
      await fetchSettlement();
      setReviewMode(false);
      setDisallowedItems(new Set());
      setDisallowReasons({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle banker execution
  const handleExecution = async () => {
    if (!utrInput.trim()) {
      setError('UTR number is required');
      return;
    }

    if (utrInput.length < 10) {
      setError('Please enter a valid UTR number');
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/settlements/${settlementId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ utr: utrInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Execution failed');
      }

      // Refresh data
      await fetchSettlement();
      setShowConfirmModal(false);
      setUtrInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle disallow item
  const toggleDisallowItem = (itemId: string) => {
    const newSet = new Set(disallowedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
      const newReasons = { ...disallowReasons };
      delete newReasons[itemId];
      setDisallowReasons(newReasons);
    } else {
      newSet.add(itemId);
    }
    setDisallowedItems(newSet);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  if (error && !settlement) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => router.push('/settlements')}
              className="mt-4 text-blue-600 hover:underline"
            >
              Back to Settlements
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!settlement) return null;

  // Determine available actions based on role and status
  const canFCApprove = isFC && settlement.status === 'SUBMITTED_TO_FINANCE';
  const canCFOApprove = isCFO && settlement.status === 'FINANCE_CONTROLLER_APPROVED';
  const canExecute = isBanker && settlement.status === 'CFO_APPROVED';
  const canRetry = isBanker && settlement.status === 'FAILED' && settlement.retryCount < 3;

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="settlement-detail-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <button
          onClick={() => router.push('/settlements')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Settlements
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="settlement-id">
                {settlement.id}
              </h1>
              <div className="mt-2 flex items-center gap-4">
                <StatusBadge status={settlement.status} />
                <span className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(settlement.totalAmount, settlement.currency)}
                </span>
              </div>
            </div>

            {/* CFO Warning Banner */}
            {canCFOApprove && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ Final approval — funds will move to banking stage
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section A: Settlement Summary */}
            <div className="bg-white rounded-lg shadow p-6" data-testid="settlement-summary">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Settlement Summary</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Settlement ID</dt>
                  <dd className="text-sm font-medium text-gray-900">{settlement.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Created Date</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {format(new Date(settlement.createdAt), 'dd MMM yyyy HH:mm')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Created By</dt>
                  <dd className="text-sm font-medium text-gray-900">{settlement.createdBy?.name || 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Period</dt>
                  <dd className="text-sm font-medium text-gray-900">{settlement.period || 'Custom'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Total Amount</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {formatCurrency(settlement.totalAmount, settlement.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd><StatusBadge status={settlement.status} /></dd>
                </div>
                {settlement.utr && (
                  <div>
                    <dt className="text-sm text-gray-500">UTR</dt>
                    <dd className="text-sm font-mono font-medium text-gray-900" data-testid="settlement-utr">
                      {settlement.utr}
                    </dd>
                  </div>
                )}
                {settlement.executedAt && (
                  <div>
                    <dt className="text-sm text-gray-500">Execution Date</dt>
                    <dd className="text-sm font-medium text-gray-900" data-testid="executed-at">
                      {format(new Date(settlement.executedAt), 'dd MMM yyyy HH:mm')}
                    </dd>
                  </div>
                )}
                {settlement.failureReason && (
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">Failure Reason</dt>
                    <dd className="text-sm font-medium text-red-600" data-testid="failure-reason">
                      {settlement.failureReason}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Section B: Linked Payment Requests */}
            <div className="bg-white rounded-lg shadow" data-testid="linked-requests">
              <button
                onClick={() => setRequestsExpanded(!requestsExpanded)}
                className="w-full p-6 flex items-center justify-between text-left"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Linked Payment Requests</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {settlement.items?.length || 0} requests • {formatCurrency(settlement.totalAmount, settlement.currency)}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transform transition-transform ${requestsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {requestsExpanded && settlement.items && (
                <div className="border-t border-gray-200 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {reviewMode && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Disallow</th>}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {settlement.items.map((item) => (
                        <tr 
                          key={item.id} 
                          className={item.disallowed ? 'bg-red-50' : ''}
                          data-testid={`settlement-item-row-${item.id}`}
                        >
                          {reviewMode && (
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={disallowedItems.has(item.id)}
                                onChange={() => toggleDisallowItem(item.id)}
                                disabled={item.disallowed}
                                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                data-testid={`disallow-checkbox-${item.id}`}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {item.paymentRequest?.requestId || item.paymentRequestId}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {item.paymentRequest?.clientName || 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium" data-testid={`item-amount-${item.id}`}>
                            {formatCurrency(item.amount, settlement.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.disallowed ? (
                              <span className="text-red-600">Disallowed</span>
                            ) : (
                              <span className="text-green-600">Included</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Disallow reasons */}
                  {reviewMode && disallowedItems.size > 0 && (
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Disallow Reasons (Required)</h4>
                      {Array.from(disallowedItems).map((itemId) => (
                        <div key={itemId} className="mb-2">
                          <label className="block text-xs text-gray-500 mb-1">
                            Item {itemId.slice(-8)}
                          </label>
                          <input
                            type="text"
                            value={disallowReasons[itemId] || ''}
                            onChange={(e) => setDisallowReasons(prev => ({ ...prev, [itemId]: e.target.value }))}
                            placeholder="Enter reason for disallowing..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            data-testid={`disallow-reason-${itemId}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section D: Audit Timeline */}
            <div className="bg-white rounded-lg shadow p-6" data-testid="audit-trail">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Timeline</h2>
              <div className="space-y-4">
                {/* Created */}
                <div className="flex items-start gap-3" data-testid="audit-entry-created">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900" data-testid="audit-action">Created</p>
                    <p className="text-xs text-gray-500" data-testid="audit-actor">{settlement.createdBy?.name}</p>
                    <p className="text-xs text-gray-400" data-testid="audit-timestamp" data-timestamp={settlement.createdAt}>
                      {format(new Date(settlement.createdAt), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                {/* FC Approved */}
                {settlement.fcApprovedAt && (
                  <div className="flex items-start gap-3" data-testid="audit-entry-fc">
                    <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900" data-testid="audit-action">FC Approved</p>
                      <p className="text-xs text-gray-500" data-testid="audit-actor">{settlement.fcApprovedBy?.name}</p>
                      <p className="text-xs text-gray-400" data-testid="audit-timestamp" data-timestamp={settlement.fcApprovedAt}>
                        {format(new Date(settlement.fcApprovedAt), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                )}

                {/* CFO Approved */}
                {settlement.cfoApprovedAt && (
                  <div className="flex items-start gap-3" data-testid="audit-entry-cfo">
                    <div className="w-2 h-2 mt-2 rounded-full bg-purple-500"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900" data-testid="audit-action">CFO Approved</p>
                      <p className="text-xs text-gray-500" data-testid="audit-actor">{settlement.cfoApprovedBy?.name}</p>
                      <p className="text-xs text-gray-400" data-testid="audit-timestamp" data-timestamp={settlement.cfoApprovedAt}>
                        {format(new Date(settlement.cfoApprovedAt), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Executed */}
                {settlement.executedAt && (
                  <div className="flex items-start gap-3" data-testid="audit-entry-executed">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900" data-testid="audit-action">Executed</p>
                      <p className="text-xs text-gray-500" data-testid="audit-actor">{settlement.executedBy?.name}</p>
                      <p className="text-xs text-gray-400" data-testid="audit-timestamp" data-timestamp={settlement.executedAt}>
                        {format(new Date(settlement.executedAt), 'dd MMM yyyy HH:mm')}
                      </p>
                      {settlement.utr && (
                        <p className="text-xs text-gray-600 font-mono">UTR: {settlement.utr}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Failed */}
                {settlement.status === 'FAILED' && (
                  <div className="flex items-start gap-3" data-testid="audit-entry-failed">
                    <div className="w-2 h-2 mt-2 rounded-full bg-red-500"></div>
                    <div>
                      <p className="text-sm font-medium text-red-600" data-testid="audit-action">Failed</p>
                      <p className="text-xs text-gray-500">{settlement.failureReason}</p>
                      <p className="text-xs text-gray-400">Retry count: {settlement.retryCount}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section C: Action Panel (Right Side) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6" data-testid="action-panel">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

              {/* Accountant - View Only */}
              {isAccountant && (
                <p className="text-sm text-gray-500">No actions available after submission.</p>
              )}

              {/* Auditor - View Only */}
              {isAuditor && (
                <p className="text-sm text-gray-500">Read-only audit view.</p>
              )}

              {/* Finance Controller Actions */}
              {canFCApprove && (
                <div className="space-y-4">
                  {!reviewMode ? (
                    <button
                      onClick={() => { setReviewMode(true); setRequestsExpanded(true); }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      data-testid="fc-review-button"
                    >
                      Review Settlement
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApproval('approve')}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        data-testid="fc-approve-button"
                      >
                        {actionLoading ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleApproval('reject')}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        data-testid="fc-reject-button"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => { setReviewMode(false); setDisallowedItems(new Set()); setDisallowReasons({}); }}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* CFO Actions */}
              {canCFOApprove && (
                <div className="space-y-4">
                  {!reviewMode ? (
                    <button
                      onClick={() => { setReviewMode(true); setRequestsExpanded(true); }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      data-testid="cfo-review-button"
                    >
                      Review Settlement
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { setConfirmAction('cfo-approve'); setShowConfirmModal(true); }}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        data-testid="cfo-approve-button"
                      >
                        {actionLoading ? 'Processing...' : 'Final Approve'}
                      </button>
                      <button
                        onClick={() => handleApproval('reject')}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        data-testid="cfo-reject-button"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => { setReviewMode(false); setDisallowedItems(new Set()); setDisallowReasons({}); }}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Banker Actions */}
              {canExecute && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UTR Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      placeholder="Enter UTR number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-testid="utr-input"
                    />
                  </div>
                  <button
                    onClick={() => { setConfirmAction('execute'); setShowConfirmModal(true); }}
                    disabled={!utrInput.trim() || actionLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="execute-button"
                  >
                    Mark as Paid
                  </button>
                </div>
              )}

              {/* Retry for Failed */}
              {canRetry && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">
                      This settlement failed. Retries: {settlement.retryCount}/3
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New UTR Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      placeholder="Enter new UTR"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-testid="retry-utr-input"
                    />
                  </div>
                  <button
                    onClick={() => { setConfirmAction('retry'); setShowConfirmModal(true); }}
                    disabled={!utrInput.trim() || actionLoading}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    data-testid="retry-button"
                  >
                    Retry Payment
                  </button>
                </div>
              )}

              {/* No actions available */}
              {!isAccountant && !isAuditor && !canFCApprove && !canCFOApprove && !canExecute && !canRetry && (
                <p className="text-sm text-gray-500">No actions available for current status.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="confirm-modal">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {confirmAction === 'cfo-approve' && 'Confirm Final Approval'}
              {confirmAction === 'execute' && 'Confirm Payment Execution'}
              {confirmAction === 'retry' && 'Confirm Payment Retry'}
            </h3>
            
            <div className="mb-4">
              {confirmAction === 'cfo-approve' && (
                <p className="text-sm text-gray-600">
                  This action will send the settlement to the banking stage. This cannot be undone.
                </p>
              )}
              {(confirmAction === 'execute' || confirmAction === 'retry') && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    You are about to mark this settlement as paid. This action is irreversible.
                  </p>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm"><strong>Amount:</strong> {formatCurrency(settlement.totalAmount, settlement.currency)}</p>
                    <p className="text-sm"><strong>Items:</strong> {settlement.items?.length || 0}</p>
                    <p className="text-sm"><strong>UTR:</strong> {utrInput}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                data-testid="cancel-confirm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'cfo-approve') {
                    handleApproval('approve');
                  } else {
                    handleExecution();
                  }
                  setShowConfirmModal(false);
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                data-testid="confirm-action"
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
