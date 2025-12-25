'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// UTR Trace Page - Cross-entity traceability for Finance, CFO, Auditor, Support
// ─────────────────────────────────────────────────────────────────────────────

interface PartialPayment {
  id: string;
  payment_request_id: string;
  payment_request_number: string;
  paid_amount: number;
  original_amount: number;
  paid_at: string;
  status: string;
}

interface PaymentRequestTrace {
  id: string;
  payment_request_number: string;
  vendor_name: string;
  vendor_bank_details: {
    account_number?: string;
    ifsc_code?: string;
    bank_name?: string;
  };
  requested_amount: number;
  approved_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
}

interface SettlementTrace {
  id: string;
  settlement_number: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  utr_number: string;
  paid_at: string;
  bank_account_from: string;
  fc_approved_by: string | null;
  fc_approved_at: string | null;
  cfo_approved_by: string | null;
  cfo_approved_at: string | null;
  created_by: string;
  created_at: string;
}

interface TraceResult {
  settlement: SettlementTrace;
  partial_payments: PartialPayment[];
  payment_requests: PaymentRequestTrace[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED_TO_FINANCE: 'bg-blue-100 text-blue-800',
  FINANCE_CONTROLLER_APPROVED: 'bg-indigo-100 text-indigo-800',
  CFO_APPROVED: 'bg-purple-100 text-purple-800',
  SENT_TO_BANK: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  PARTIALLY_PAID: 'bg-teal-100 text-teal-800',
  FAILED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

export default function TracePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [utrInput, setUtrInput] = useState('');
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Allowed roles for trace page
  const allowedRoles = ['finance_controller', 'cfo', 'auditor', 'super_admin', 'admin'];
  const hasAccess = user?.role && allowedRoles.includes(user.role);

  const handleSearch = useCallback(async () => {
    if (!utrInput.trim()) {
      setError('Please enter a UTR number');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchPerformed(true);

    try {
      const response = await fetch(`/api/settlements/trace?utr=${encodeURIComponent(utrInput.trim())}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          setTraceResult(null);
          setError('No settlement found with this UTR');
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to search');
        }
        return;
      }

      const data = await response.json();
      setTraceResult(data);
    } catch (err) {
      console.error('Trace search error:', err);
      setError('An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  }, [utrInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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

  const getStatusBadge = (status: string) => {
    const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
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
          You don&apos;t have permission to access the UTR Trace page.
        </p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          Return to Dashboard
        </Link>
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
              <h1 className="text-2xl font-bold text-gray-900">UTR Trace</h1>
              <p className="mt-1 text-sm text-gray-500">
                Trace payments across settlements and payment requests
              </p>
            </div>
            <Link
              href="/settlements"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Settlements
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <label htmlFor="utr-input" className="block text-sm font-medium text-gray-700 mb-2">
            Enter UTR Number
          </label>
          <div className="flex gap-4">
            <input
              id="utr-input"
              type="text"
              value={utrInput}
              onChange={(e) => setUtrInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., UTIB0001234567890"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSearching}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Trace
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Enter the full UTR number to trace the complete payment chain
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* No Results State */}
        {searchPerformed && !traceResult && !error && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <svg
              className="h-12 w-12 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500">
              No settlement found with UTR number &quot;{utrInput}&quot;
            </p>
          </div>
        )}

        {/* Trace Results */}
        {traceResult && (
          <div className="space-y-8">
            {/* Section 1: Settlement Information */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Settlement Information
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Settlement #</label>
                    <Link
                      href={`/settlements/${traceResult.settlement.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {traceResult.settlement.settlement_number}
                    </Link>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(traceResult.settlement.status)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">UTR Number</label>
                    <p className="font-mono text-sm font-medium text-gray-900">
                      {traceResult.settlement.utr_number}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Paid At</label>
                    <p className="text-gray-900">{formatDate(traceResult.settlement.paid_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="text-gray-900 font-semibold">
                      {formatCurrency(traceResult.settlement.total_amount)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Paid Amount</label>
                    <p className="text-green-600 font-semibold">
                      {formatCurrency(traceResult.settlement.paid_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Bank Account</label>
                    <p className="text-gray-900">{traceResult.settlement.bank_account_from || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Created</label>
                    <p className="text-gray-900">{formatDate(traceResult.settlement.created_at)}</p>
                  </div>
                </div>

                {/* Approval Chain */}
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Approval Chain</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">Created By</p>
                      <p className="font-medium">{traceResult.settlement.created_by || '-'}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(traceResult.settlement.created_at)}
                      </p>
                    </div>
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex-1 p-4 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-indigo-600">FC Approved</p>
                      <p className="font-medium">{traceResult.settlement.fc_approved_by || '-'}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(traceResult.settlement.fc_approved_at)}
                      </p>
                    </div>
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div className="flex-1 p-4 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600">CFO Approved</p>
                      <p className="font-medium">{traceResult.settlement.cfo_approved_by || '-'}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(traceResult.settlement.cfo_approved_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Partial Payments */}
            {traceResult.partial_payments && traceResult.partial_payments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-6 py-4 border-b bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="h-5 w-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Partial Payments
                    <span className="ml-2 px-2 py-0.5 text-xs bg-teal-100 text-teal-800 rounded-full">
                      {traceResult.partial_payments.length}
                    </span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Request
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Original Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid Amount
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {traceResult.partial_payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link
                              href={`/payment-requests/${payment.payment_request_id}`}
                              className="text-blue-600 hover:underline font-medium"
                            >
                              {payment.payment_request_number}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {formatCurrency(payment.original_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-medium">
                            {formatCurrency(payment.paid_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {getStatusBadge(payment.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {formatDate(payment.paid_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section 3: Original Payment Requests */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Original Payment Requests
                  <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">
                    {traceResult.payment_requests.length}
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Details
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approved
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {traceResult.payment_requests.map((pr) => (
                      <tr key={pr.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/payment-requests/${pr.id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {pr.payment_request_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-gray-900 font-medium">{pr.vendor_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900 font-mono">
                              {pr.vendor_bank_details?.account_number || '-'}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {pr.vendor_bank_details?.bank_name} • {pr.vendor_bank_details?.ifsc_code}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {formatCurrency(pr.requested_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                          {formatCurrency(pr.approved_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-medium">
                          {formatCurrency(pr.paid_amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(pr.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-6">
              <h3 className="text-sm font-medium text-blue-800 mb-4">Trace Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {traceResult.payment_requests.length}
                  </p>
                  <p className="text-sm text-blue-600">Payment Requests</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {traceResult.partial_payments?.length || 0}
                  </p>
                  <p className="text-sm text-blue-600">Partial Payments</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(traceResult.settlement.total_amount)}
                  </p>
                  <p className="text-sm text-blue-600">Total Settlement</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(traceResult.settlement.paid_amount || 0)}
                  </p>
                  <p className="text-sm text-green-600">Total Paid</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Initial State - No search yet */}
        {!searchPerformed && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <svg
              className="h-16 w-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Enter a UTR Number to Trace
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              The trace will show you the complete payment chain including the settlement,
              any partial payments, and all original payment requests linked to this UTR.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
