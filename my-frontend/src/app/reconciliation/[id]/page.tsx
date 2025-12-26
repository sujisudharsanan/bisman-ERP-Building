'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import api from '@/lib/api';

// Types
interface BatchSummary {
  batch: {
    id: string;
    status: 'open' | 'in_progress' | 'review' | 'locked' | 'finalized';
    created_at: string;
    locked_at: string | null;
    finalized_at: string | null;
    statement: {
      id: string;
      original_filename: string;
      total_rows: number;
      total_credits: number;
      total_debits: number;
    };
  };
  statistics: {
    total_lines: number;
    matched: number;
    pending: number;
    exceptions: number;
    ignored: number;
    match_rate: string;
    unresolved_exceptions: number;
  };
}

interface BankLine {
  id: string;
  line_number: number;
  transaction_date: string;
  description: string;
  amount: number;
  is_credit: boolean;
  extracted_utr: string | null;
  status: 'pending' | 'matched' | 'exception' | 'ignored';
  matches?: {
    id: string;
    settlement: {
      id: string;
      utr: string;
      total_amount: number;
    };
  }[];
}

interface Settlement {
  id: string;
  utr: string | null;
  total_amount: number;
  payment_date: string;
  payment_requests: {
    vendor_name: string;
    amount: number;
  }[];
}

interface Match {
  id: string;
  match_type: string;
  confidence: string;
  bank_line: BankLine;
  settlement: {
    id: string;
    utr: string;
    total_amount: number;
  };
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    open: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    review: 'bg-yellow-100 text-yellow-800',
    locked: 'bg-orange-100 text-orange-800',
    finalized: 'bg-green-100 text-green-800',
    pending: 'bg-gray-100 text-gray-600',
    matched: 'bg-green-100 text-green-800',
    exception: 'bg-red-100 text-red-800',
    ignored: 'bg-gray-100 text-gray-400',
  };

  const statusLabels: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    review: 'Under Review',
    locked: 'Locked',
    finalized: 'Finalized',
    pending: 'Pending',
    matched: 'Matched',
    exception: 'Exception',
    ignored: 'Ignored',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const styles: Record<string, string> = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-orange-100 text-orange-800',
    manual: 'bg-purple-100 text-purple-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[confidence] || 'bg-gray-100'}`}>
      {confidence.toUpperCase()}
    </span>
  );
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

type TabType = 'pending' | 'matched' | 'exceptions';

export default function ReconciliationBatchPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = (Array.isArray(params?.id) ? params?.id[0] : params?.id) ?? '';
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [lines, setLines] = useState<BankLine[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Manual match modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState<BankLine | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<string>('');
  const [matchReason, setMatchReason] = useState('');

  // Role-based access
  const canMatch = ['ACCOUNTANT', 'ADMIN'].includes(user?.role || '');
  const canFinalize = ['ACCOUNTANT', 'ADMIN'].includes(user?.role || '');
  const isViewOnly = ['CFO', 'AUDITOR', 'FINANCE_CONTROLLER'].includes(user?.role || '');
  const isBatchEditable = summary?.batch.status !== 'locked' && summary?.batch.status !== 'finalized';

  // Fetch batch summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get(`/api/reconciliation/batches/${batchId}`);
      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch batch';
      setError(message);
    }
  }, [batchId]);

  // Fetch lines based on status
  const fetchLines = useCallback(async (status: string) => {
    try {
      setLoading(true);
      const statementId = summary?.batch.statement.id;
      if (!statementId) return;

      const response = await api.get(`/api/reconciliation/statements/${statementId}/lines`, {
        params: { status, limit: 100 },
      });
      
      if (response.data.success) {
        setLines(response.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch lines:', err);
    } finally {
      setLoading(false);
    }
  }, [summary?.batch.statement.id]);

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/reconciliation/batches/${batchId}/matches`);
      if (response.data.success) {
        setMatches(response.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch matches:', err);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  // Fetch unreconciled settlements for manual matching
  const fetchSettlements = useCallback(async () => {
    try {
      const response = await api.get('/api/reconciliation/settlements/unreconciled', {
        params: { limit: 100 },
      });
      if (response.data.success) {
        setSettlements(response.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch settlements:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!authLoading && isAuthenticated && batchId) {
      fetchSummary();
      fetchSettlements();
    }
  }, [authLoading, isAuthenticated, batchId, fetchSummary, fetchSettlements]);

  // Load tab data
  useEffect(() => {
    if (summary) {
      if (activeTab === 'matched') {
        fetchMatches();
      } else {
        fetchLines(activeTab === 'pending' ? 'pending' : 'exception');
      }
    }
  }, [activeTab, summary, fetchLines, fetchMatches]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Run auto-match
  const handleAutoMatch = async () => {
    try {
      setActionLoading(true);
      setError(null);
      
      const response = await api.post(`/api/reconciliation/batches/${batchId}/auto-match`);
      
      if (response.data.success) {
        const results = response.data.data.results;
        setSuccess(
          `Auto-matching complete! Exact: ${results.exact}, Amount+Date: ${results.amountDate}, Fuzzy: ${results.fuzzy}, Unmatched: ${results.unmatched}`
        );
        fetchSummary();
        fetchLines('pending');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Auto-match failed';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Create manual match
  const handleManualMatch = async () => {
    if (!selectedLine || !selectedSettlement || matchReason.length < 10) {
      setError('Please select a settlement and provide a detailed reason (min 10 characters)');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await api.post('/api/reconciliation/matches', {
        batchId,
        lineId: selectedLine.id,
        settlementId: selectedSettlement,
        reason: matchReason,
      });

      if (response.data.success) {
        setSuccess('Manual match created successfully');
        setShowMatchModal(false);
        setSelectedLine(null);
        setSelectedSettlement('');
        setMatchReason('');
        fetchSummary();
        fetchLines('pending');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Match failed';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Unmatch
  const handleUnmatch = async (matchId: string) => {
    const reason = prompt('Please provide a reason for unmatching:');
    if (!reason || reason.length < 10) {
      setError('Reason is required (min 10 characters)');
      return;
    }

    try {
      setActionLoading(true);
      await api.delete(`/api/reconciliation/matches/${matchId}`, {
        data: { reason },
      });
      setSuccess('Match removed successfully');
      fetchSummary();
      fetchMatches();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unmatch failed';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Lock batch
  const handleLock = async () => {
    if (!confirm('Lock this batch? No further matching changes will be allowed.')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/api/reconciliation/batches/${batchId}/lock`);
      setSuccess('Batch locked successfully');
      fetchSummary();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lock failed';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  // Finalize batch
  const handleFinalize = async () => {
    if (summary?.statistics.unresolved_exceptions && summary.statistics.unresolved_exceptions > 0) {
      setError(`Cannot finalize: ${summary.statistics.unresolved_exceptions} unresolved exceptions`);
      return;
    }

    if (!confirm('Finalize this batch? This will mark all matched settlements as reconciled. This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/api/reconciliation/batches/${batchId}/finalize`);
      setSuccess('Batch finalized successfully! All matched settlements are now marked as reconciled.');
      fetchSummary();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Finalize failed';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || (!summary && loading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/reconciliation')}
                className="mr-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {summary?.batch.statement.original_filename || 'Loading...'}
                </h1>
                <div className="mt-1 flex items-center space-x-4">
                  <StatusBadge status={summary?.batch.status || ''} />
                  <span className="text-sm text-gray-500">
                    {summary?.batch.created_at && format(new Date(summary.batch.created_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {canMatch && isBatchEditable && (
                <button
                  onClick={handleAutoMatch}
                  disabled={actionLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Auto-Match
                </button>
              )}
              
              {canFinalize && summary?.batch.status === 'review' && (
                <button
                  onClick={handleLock}
                  disabled={actionLoading}
                  className="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Lock Batch
                </button>
              )}
              
              {canFinalize && summary?.batch.status === 'locked' && (
                <button
                  onClick={handleFinalize}
                  disabled={actionLoading || (summary?.statistics.unresolved_exceptions || 0) > 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finalize
                </button>
              )}
            </div>
          </div>

          {isViewOnly && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700">
                <span className="font-medium">View-only mode:</span> You can view reconciliation details but cannot make changes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {summary && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Lines</p>
              <p className="text-2xl font-bold text-gray-900">{summary.statistics.total_lines.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Matched</p>
              <p className="text-2xl font-bold text-green-600">{summary.statistics.matched}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-600">{summary.statistics.pending}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Exceptions</p>
              <p className="text-2xl font-bold text-red-600">{summary.statistics.exceptions}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Match Rate</p>
              <p className="text-2xl font-bold text-blue-600">{summary.statistics.match_rate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="mt-1 text-xs text-red-500 underline">Dismiss</button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-700">{success}</p>
            <button onClick={() => setSuccess(null)} className="mt-1 text-xs text-green-500 underline">Dismiss</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {(['pending', 'matched', 'exceptions'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {tab}
                {summary && (
                  <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${
                    tab === 'pending' ? 'bg-gray-100 text-gray-900' :
                    tab === 'matched' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {tab === 'pending' ? summary.statistics.pending :
                     tab === 'matched' ? summary.statistics.matched :
                     summary.statistics.exceptions}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'matched' ? (
          /* Matches Table */
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {matches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No matches yet. Run auto-match or create manual matches.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Line</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settlement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                    {canMatch && isBatchEditable && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches.map((match) => (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(match.bank_line.amount)}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {match.bank_line.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(match.settlement.total_amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          UTR: {match.settlement.utr || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {match.match_type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ConfidenceBadge confidence={match.confidence} />
                      </td>
                      {canMatch && isBatchEditable && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleUnmatch(match.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Unmatch
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Pending/Exception Lines Table */
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {lines.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">
                  {activeTab === 'pending' ? 'All lines have been matched or flagged.' : 'No exceptions to review.'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {canMatch && isBatchEditable && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lines.map((line) => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {line.line_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(line.transaction_date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="truncate max-w-xs" title={line.description}>
                          {line.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={line.is_credit ? 'text-green-600' : 'text-red-600'}>
                          {line.is_credit ? '+' : '-'}{formatCurrency(line.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {line.extracted_utr || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={line.status} />
                      </td>
                      {canMatch && isBatchEditable && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedLine(line);
                              setShowMatchModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Match
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Manual Match Modal */}
      {showMatchModal && selectedLine && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Manual Match</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a settlement to match with this bank line
              </p>
            </div>

            <div className="px-6 py-4">
              {/* Selected Line Info */}
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <p className="text-sm font-medium text-gray-700">Bank Statement Line</p>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Date:</span>{' '}
                    {format(new Date(selectedLine.transaction_date), 'dd MMM yyyy')}
                  </div>
                  <div>
                    <span className="text-gray-500">Amount:</span>{' '}
                    <span className={selectedLine.is_credit ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(selectedLine.amount)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Description:</span>{' '}
                    {selectedLine.description}
                  </div>
                </div>
              </div>

              {/* Settlement Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Settlement
                </label>
                <select
                  value={selectedSettlement}
                  onChange={(e) => setSelectedSettlement(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Select a settlement...</option>
                  {settlements.map((settlement) => (
                    <option key={settlement.id} value={settlement.id}>
                      {formatCurrency(settlement.total_amount)} | {settlement.utr || 'No UTR'} | {format(new Date(settlement.payment_date), 'dd MMM')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Manual Match <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={matchReason}
                  onChange={(e) => setMatchReason(e.target.value)}
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Explain why this manual match is being made (min 10 characters)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {matchReason.length}/10 characters minimum
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMatchModal(false);
                  setSelectedLine(null);
                  setSelectedSettlement('');
                  setMatchReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleManualMatch}
                disabled={!selectedSettlement || matchReason.length < 10 || actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Matching...' : 'Create Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
