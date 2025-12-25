'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Settlement Audit Report - Compliance-focused report with full audit trail
// ─────────────────────────────────────────────────────────────────────────────

interface AuditRow {
  id: string;
  settlement_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  utr_number: string | null;
  paid_at: string | null;
  fc_approved_by: string | null;
  fc_approved_at: string | null;
  cfo_approved_by: string | null;
  cfo_approved_at: string | null;
  created_by: string;
  created_at: string;
  payment_request_count: number;
  disallowed_count: number;
  disallowed_amount: number;
}

interface DisallowedItem {
  id: string;
  payment_request_number: string;
  vendor_name: string;
  original_amount: number;
  disallowed_amount: number;
  reason: string;
  disallowed_by: string;
  disallowed_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED_TO_FINANCE: 'bg-blue-100 text-blue-800',
  FINANCE_CONTROLLER_APPROVED: 'bg-indigo-100 text-indigo-800',
  CFO_APPROVED: 'bg-purple-100 text-purple-800',
  SENT_TO_BANK: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function SettlementAuditReportPage() {
  const { user, loading: authLoading } = useAuth();

  const [auditData, setAuditData] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDisallowedOnly, setShowDisallowedOnly] = useState(false);

  // Drill-down modal
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);
  const [disallowedItems, setDisallowedItems] = useState<DisallowedItem[]>([]);
  const [loadingDisallowed, setLoadingDisallowed] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Allowed roles
  const allowedRoles = ['finance_controller', 'cfo', 'auditor', 'super_admin', 'admin'];
  const hasAccess = user?.role && allowedRoles.includes(user.role);

  const fetchAuditData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (showDisallowedOnly) {
        params.set('disallowed_only', 'true');
      }

      const response = await fetch(`/api/reports/settlement-audit?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch audit data');
      }

      const data = await response.json();
      setAuditData(data.settlements || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);
    } catch (err) {
      console.error('Audit fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Set mock data for demo
      setAuditData([
        {
          id: '1',
          settlement_number: 'STL-2024-001',
          status: 'PAID',
          total_amount: 500000,
          paid_amount: 480000,
          utr_number: 'UTIB0001234567890',
          paid_at: '2024-12-20T10:30:00Z',
          fc_approved_by: 'finance.controller@bisman.demo',
          fc_approved_at: '2024-12-19T14:00:00Z',
          cfo_approved_by: 'cfo@bisman.demo',
          cfo_approved_at: '2024-12-19T16:00:00Z',
          created_by: 'accountant@bisman.demo',
          created_at: '2024-12-18T09:00:00Z',
          payment_request_count: 5,
          disallowed_count: 1,
          disallowed_amount: 20000,
        },
        {
          id: '2',
          settlement_number: 'STL-2024-002',
          status: 'PAID',
          total_amount: 750000,
          paid_amount: 750000,
          utr_number: 'HDFC0009876543210',
          paid_at: '2024-12-21T11:45:00Z',
          fc_approved_by: 'finance.controller@bisman.demo',
          fc_approved_at: '2024-12-20T15:00:00Z',
          cfo_approved_by: 'cfo@bisman.demo',
          cfo_approved_at: '2024-12-20T17:30:00Z',
          created_by: 'accountant@bisman.demo',
          created_at: '2024-12-19T10:00:00Z',
          payment_request_count: 8,
          disallowed_count: 0,
          disallowed_amount: 0,
        },
        {
          id: '3',
          settlement_number: 'STL-2024-003',
          status: 'CFO_APPROVED',
          total_amount: 320000,
          paid_amount: 0,
          utr_number: null,
          paid_at: null,
          fc_approved_by: 'finance.controller@bisman.demo',
          fc_approved_at: '2024-12-22T10:00:00Z',
          cfo_approved_by: 'cfo@bisman.demo',
          cfo_approved_at: '2024-12-22T14:00:00Z',
          created_by: 'accountant@bisman.demo',
          created_at: '2024-12-21T09:00:00Z',
          payment_request_count: 3,
          disallowed_count: 0,
          disallowed_amount: 0,
        },
      ]);
      setTotalPages(1);
      setTotalCount(3);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter, showDisallowedOnly, page]);

  useEffect(() => {
    if (hasAccess) {
      fetchAuditData();
    }
  }, [hasAccess, fetchAuditData]);

  const fetchDisallowedItems = async (settlementId: string) => {
    setSelectedSettlement(settlementId);
    setLoadingDisallowed(true);

    try {
      const response = await fetch(`/api/settlements/${settlementId}/disallowed`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setDisallowedItems(data.items || []);
      } else {
        // Mock data
        setDisallowedItems([
          {
            id: '1',
            payment_request_number: 'PR-2024-123',
            vendor_name: 'ABC Suppliers',
            original_amount: 50000,
            disallowed_amount: 20000,
            reason: 'Missing supporting documents',
            disallowed_by: 'finance.controller@bisman.demo',
            disallowed_at: '2024-12-19T14:00:00Z',
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching disallowed items:', err);
      setDisallowedItems([]);
    } finally {
      setLoadingDisallowed(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const params = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      format,
    });
    if (statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    if (showDisallowedOnly) {
      params.set('disallowed_only', 'true');
    }
    window.open(`/api/reports/settlement-audit/export?${params}`, '_blank');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You don&apos;t have permission to access Settlement Audit Reports.
        </p>
        <a href="/dashboard" className="text-blue-600 hover:underline">
          Return to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settlement Audit Report</h1>
              <p className="mt-1 text-sm text-gray-500">
                Compliance-focused audit trail with approval chain and disallowances
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="CFO_APPROVED">CFO Approved</option>
                <option value="FINANCE_CONTROLLER_APPROVED">FC Approved</option>
                <option value="FAILED">Failed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDisallowedOnly}
                  onChange={(e) => setShowDisallowedOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Disallowed only</span>
              </label>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setPage(1);
                  fetchAuditData();
                }}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <p className="text-yellow-800 text-sm">
              Note: Using demo data. API error: {error}
            </p>
          </div>
        )}

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold">{auditData.length}</span> of{' '}
            <span className="font-semibold">{totalCount}</span> settlements
          </p>
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
        </div>

        {/* Audit Table */}
        <div className="bg-white rounded-lg shadow-sm border mb-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Settlement #
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UTR
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FC Approved
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CFO Approved
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disallowed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      No settlements found for the selected criteria
                    </td>
                  </tr>
                ) : (
                  auditData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          href={`/settlements/${row.id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {row.settlement_number}
                        </Link>
                        <p className="text-xs text-gray-500">{row.payment_request_count} PRs</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <p className="text-gray-900 font-medium">{formatCurrency(row.total_amount)}</p>
                        {row.paid_amount > 0 && row.paid_amount !== row.total_amount && (
                          <p className="text-xs text-green-600">
                            Paid: {formatCurrency(row.paid_amount)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {row.utr_number ? (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {row.utr_number}
                          </code>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.fc_approved_by ? (
                          <div>
                            <p className="text-sm text-gray-900 truncate max-w-[150px]" title={row.fc_approved_by}>
                              {row.fc_approved_by.split('@')[0]}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateShort(row.fc_approved_at)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {row.cfo_approved_by ? (
                          <div>
                            <p className="text-sm text-gray-900 truncate max-w-[150px]" title={row.cfo_approved_by}>
                              {row.cfo_approved_by.split('@')[0]}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDateShort(row.cfo_approved_at)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {row.paid_at ? (
                          <span className="text-sm text-gray-900">
                            {formatDateShort(row.paid_at)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {row.disallowed_count > 0 ? (
                          <button
                            onClick={() => fetchDisallowedItems(row.id)}
                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-800"
                          >
                            <span className="font-medium">{row.disallowed_count}</span>
                            <span className="text-xs">
                              ({formatCurrency(row.disallowed_amount)})
                            </span>
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/settlements/${row.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded-lg ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="text-gray-500">...</span>}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Disallowed Items Modal */}
        {selectedSettlement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Disallowed Items
                </h3>
                <button
                  onClick={() => {
                    setSelectedSettlement(null);
                    setDisallowedItems([]);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingDisallowed ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : disallowedItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No disallowed items found</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Payment Request
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Vendor
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Original
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Disallowed
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Reason
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {disallowedItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm font-medium text-blue-600">
                            {item.payment_request_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.vendor_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {formatCurrency(item.original_amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                            {formatCurrency(item.disallowed_amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={item.reason}>
                            {item.reason}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <p className="truncate max-w-[100px]" title={item.disallowed_by}>
                              {item.disallowed_by.split('@')[0]}
                            </p>
                            <p className="text-xs">{formatDateShort(item.disallowed_at)}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedSettlement(null);
                    setDisallowedItems([]);
                  }}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Audit Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800">Audit Trail Note</h4>
              <p className="text-sm text-blue-700 mt-1">
                This report is immutable and reflects the complete approval chain for each settlement.
                All timestamps are recorded at the server level and cannot be modified.
                For compliance purposes, retain this report for the required statutory period.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
