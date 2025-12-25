'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import api from '@/lib/api';

// Types
interface ReconciliationBatch {
  id: string;
  status: 'open' | 'in_progress' | 'review' | 'locked' | 'finalized';
  created_at: string;
  locked_at: string | null;
  finalized_at: string | null;
  statement: {
    original_filename: string;
    total_rows: number;
  };
  _count: {
    matches: number;
    exceptions: number;
  };
}

interface BankStatement {
  id: string;
  original_filename: string;
  status: 'uploading' | 'parsing' | 'parsed' | 'failed';
  total_rows: number;
  parsed_rows: number;
  total_credits: number;
  total_debits: number;
  created_at: string;
  template: {
    bank_name: string;
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
    uploading: 'bg-gray-100 text-gray-600',
    parsing: 'bg-blue-100 text-blue-800',
    parsed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    review: 'Under Review',
    locked: 'Locked',
    finalized: 'Finalized',
    uploading: 'Uploading',
    parsing: 'Parsing...',
    parsed: 'Ready',
    failed: 'Failed',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
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

// Tab type
type TabType = 'batches' | 'statements';

export default function ReconciliationPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('batches');
  const [batches, setBatches] = useState<ReconciliationBatch[]>([]);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchPagination, setBatchPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [statementPagination, setStatementPagination] = useState({ page: 1, limit: 20, total: 0 });

  // Role-based access
  const canUpload = ['ACCOUNTANT', 'ADMIN'].includes(user?.role || '');
  const canMatch = ['ACCOUNTANT', 'ADMIN'].includes(user?.role || '');
  const isViewOnly = ['CFO', 'AUDITOR', 'FINANCE_CONTROLLER'].includes(user?.role || '');

  // Fetch batches
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/reconciliation/batches', {
        params: {
          page: batchPagination.page,
          limit: batchPagination.limit,
        },
      });

      if (response.data.success) {
        setBatches(response.data.data);
        setBatchPagination(prev => ({ ...prev, total: response.data.pagination.total }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch batches';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [batchPagination.page, batchPagination.limit]);

  // Fetch statements
  const fetchStatements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/reconciliation/statements', {
        params: {
          page: statementPagination.page,
          limit: statementPagination.limit,
        },
      });

      if (response.data.success) {
        setStatements(response.data.data);
        setStatementPagination(prev => ({ ...prev, total: response.data.pagination.total }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch statements';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statementPagination.page, statementPagination.limit]);

  // Load data based on active tab
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (activeTab === 'batches') {
        fetchBatches();
      } else {
        fetchStatements();
      }
    }
  }, [authLoading, isAuthenticated, activeTab, fetchBatches, fetchStatements]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bank Reconciliation</h1>
              <p className="mt-1 text-sm text-gray-500">
                Match bank statements with settlements for accurate financial records
              </p>
            </div>
            
            {canUpload && (
              <button
                onClick={() => router.push('/reconciliation/upload')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Statement
              </button>
            )}
          </div>

          {isViewOnly && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700">
                <span className="font-medium">View-only mode:</span> You can view reconciliation status and audit trail, but cannot make changes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('batches')}
              className={`${
                activeTab === 'batches'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Reconciliation Batches
              {batches.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {batchPagination.total}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('statements')}
              className={`${
                activeTab === 'statements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Uploaded Statements
              {statements.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {statementPagination.total}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'batches' ? (
          /* Batches Table */
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {batches.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reconciliation batches</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by uploading a bank statement.</p>
                {canUpload && (
                  <div className="mt-6">
                    <button
                      onClick={() => router.push('/reconciliation/upload')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Upload Statement
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matched</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exceptions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{batch.statement.original_filename}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch.statement.total_rows.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="text-green-600 font-medium">{batch._count.matches}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {batch._count.exceptions > 0 ? (
                          <span className="text-red-600 font-medium">{batch._count.exceptions}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(batch.created_at), 'dd MMM yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/reconciliation/${batch.id}`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Statements Table */
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {statements.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No statements uploaded</h3>
                <p className="mt-1 text-sm text-gray-500">Upload a bank statement to get started.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rows</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statements.map((statement) => (
                    <tr key={statement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{statement.original_filename}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {statement.template?.bank_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={statement.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {statement.parsed_rows?.toLocaleString() || statement.total_rows?.toLocaleString() || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {statement.total_credits ? formatCurrency(statement.total_credits) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {statement.total_debits ? formatCurrency(statement.total_debits) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(statement.created_at), 'dd MMM yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination */}
        {((activeTab === 'batches' && batches.length > 0) || (activeTab === 'statements' && statements.length > 0)) && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {activeTab === 'batches' ? batchPagination.page : statementPagination.page} of{' '}
              {Math.ceil((activeTab === 'batches' ? batchPagination.total : statementPagination.total) / 20)}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (activeTab === 'batches') {
                    setBatchPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
                  } else {
                    setStatementPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
                  }
                }}
                disabled={(activeTab === 'batches' ? batchPagination.page : statementPagination.page) === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => {
                  if (activeTab === 'batches') {
                    setBatchPagination(prev => ({ ...prev, page: prev.page + 1 }));
                  } else {
                    setStatementPagination(prev => ({ ...prev, page: prev.page + 1 }));
                  }
                }}
                disabled={
                  activeTab === 'batches'
                    ? batchPagination.page * batchPagination.limit >= batchPagination.total
                    : statementPagination.page * statementPagination.limit >= statementPagination.total
                }
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
