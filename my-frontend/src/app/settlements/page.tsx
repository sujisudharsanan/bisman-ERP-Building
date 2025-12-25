'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

// Types
interface Settlement {
  id: string;
  createdAt: string;
  period: string;
  totalAmount: number;
  currency: string;
  status: string;
  utr: string | null;
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
  itemCount: number;
}

interface SettlementFilters {
  dateFrom: string;
  dateTo: string;
  status: string;
  amountMin: string;
  amountMax: string;
  utr: string;
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

export default function SettlementsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  
  const [filters, setFilters] = useState<SettlementFilters>({
    dateFrom: '',
    dateTo: '',
    status: '',
    amountMin: '',
    amountMax: '',
    utr: '',
  });

  // Role-based column visibility
  const isBanker = user?.role === 'BANKER';
  const canViewFullDetails = ['ACCOUNTANT', 'FINANCE_CONTROLLER', 'CFO', 'AUDITOR', 'SUPER_ADMIN'].includes(user?.role || '');

  // Fetch settlements
  const fetchSettlements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.status) params.append('status', filters.status);
      if (filters.amountMin) params.append('amountMin', filters.amountMin);
      if (filters.amountMax) params.append('amountMax', filters.amountMax);
      if (filters.utr) params.append('utr', filters.utr);

      const response = await fetch(`/api/settlements?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to fetch settlements');
      }

      const data = await response.json();
      setSettlements(data.settlements || data || []);
      if (data.pagination) {
        setPagination(prev => ({ ...prev, total: data.pagination.total }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSettlements();
    }
  }, [authLoading, isAuthenticated, fetchSettlements]);

  // Handle filter changes
  const handleFilterChange = (key: keyof SettlementFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle row click
  const handleRowClick = (settlementId: string) => {
    router.push(`/settlements/${settlementId}`);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: '',
      amountMin: '',
      amountMax: '',
      utr: '',
    });
  };

  if (authLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8" data-testid="settlements-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settlements</h1>
          <p className="mt-1 text-sm text-gray-500">Consolidated payment instructions</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6" data-testid="settlement-filters">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                data-testid="filter-date-from"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                data-testid="filter-date-to"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                data-testid="filter-status"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED_TO_FINANCE">Submitted</option>
                <option value="FINANCE_CONTROLLER_APPROVED">FC Approved</option>
                <option value="CFO_APPROVED">CFO Approved</option>
                <option value="PAID">Paid</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Amount Min */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
              <input
                type="number"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                data-testid="filter-amount-min"
              />
            </div>

            {/* Amount Max */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
              <input
                type="number"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
                placeholder="No limit"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                data-testid="filter-amount-max"
              />
            </div>

            {/* UTR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UTR</label>
              <input
                type="text"
                value={filters.utr}
                onChange={(e) => handleFilterChange('utr', e.target.value)}
                placeholder="Search UTR..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                data-testid="filter-utr"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
              data-testid="clear-filters"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6" data-testid="error-message">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : settlements.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-lg shadow p-12 text-center" data-testid="empty-state">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No settlements found</h3>
            <p className="mt-1 text-sm text-gray-500">No settlements found for selected filters.</p>
          </div>
        ) : (
          /* Settlements Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200" data-testid="settlements-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Settlement ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  {canViewFullDetails && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UTR
                  </th>
                  {canViewFullDetails && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settlements.map((settlement) => (
                  <tr
                    key={settlement.id}
                    onClick={() => handleRowClick(settlement.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                    data-testid={`settlement-row-${settlement.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {settlement.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(settlement.createdAt), 'dd MMM yyyy')}
                    </td>
                    {canViewFullDetails && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {settlement.period || 'Custom'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(settlement.totalAmount, settlement.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={settlement.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {settlement.status === 'PAID' && settlement.utr ? (
                        <span className="font-mono text-xs">{settlement.utr}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    {canViewFullDetails && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {settlement.createdBy?.name || 'Unknown'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total || settlements.length)} of {pagination.total || settlements.length} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={settlements.length < pagination.limit}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
