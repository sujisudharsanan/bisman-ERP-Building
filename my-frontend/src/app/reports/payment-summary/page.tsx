'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// Payment Summary Report - Executive dashboard with KPIs, summary table, charts
// ─────────────────────────────────────────────────────────────────────────────

interface KPIData {
  total_paid: number;
  total_outstanding: number;
  partially_settled_count: number;
  failed_count: number;
  total_settlements: number;
  total_payment_requests: number;
  avg_settlement_amount: number;
  avg_approval_time_hours: number;
}

interface SummaryRow {
  period: string;
  settlements_count: number;
  payment_requests_count: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  failed_count: number;
}

interface ChartDataPoint {
  label: string;
  value: number;
}

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export default function PaymentSummaryReportPage() {
  const { user, loading: authLoading } = useAuth();

  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  // Allowed roles
  const allowedRoles = ['finance_controller', 'cfo', 'auditor', 'super_admin', 'admin'];
  const hasAccess = user?.role && allowedRoles.includes(user.role);

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period_type: periodType,
        date_from: dateFrom,
        date_to: dateTo,
      });

      const response = await fetch(`/api/reports/payment-summary?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch report data');
      }

      const data = await response.json();
      setKpis(data.kpis);
      setSummaryData(data.summary || []);
      setStatusDistribution(data.status_distribution || []);
    } catch (err) {
      console.error('Report fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Set mock data for demo
      setKpis({
        total_paid: 12500000,
        total_outstanding: 3200000,
        partially_settled_count: 15,
        failed_count: 3,
        total_settlements: 142,
        total_payment_requests: 567,
        avg_settlement_amount: 88028,
        avg_approval_time_hours: 4.2,
      });
      setSummaryData([
        { period: 'Dec 2024', settlements_count: 45, payment_requests_count: 189, total_amount: 4500000, paid_amount: 4200000, pending_amount: 300000, failed_count: 1 },
        { period: 'Nov 2024', settlements_count: 52, payment_requests_count: 198, total_amount: 5200000, paid_amount: 5000000, pending_amount: 200000, failed_count: 1 },
        { period: 'Oct 2024', settlements_count: 45, payment_requests_count: 180, total_amount: 4500000, paid_amount: 4300000, pending_amount: 200000, failed_count: 1 },
      ]);
      setStatusDistribution([
        { label: 'PAID', value: 65 },
        { label: 'PENDING', value: 20 },
        { label: 'FAILED', value: 5 },
        { label: 'PARTIALLY_SETTLED', value: 10 },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [periodType, dateFrom, dateTo]);

  useEffect(() => {
    if (hasAccess) {
      fetchReportData();
    }
  }, [hasAccess, fetchReportData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    // In a real implementation, this would trigger a download
    const params = new URLSearchParams({
      period_type: periodType,
      date_from: dateFrom,
      date_to: dateTo,
      format,
    });
    window.open(`/api/reports/payment-summary/export?${params}`, '_blank');
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
          You don&apos;t have permission to access Payment Summary Reports.
        </p>
        <a href="/dashboard" className="text-blue-600 hover:underline">
          Return to Dashboard
        </a>
      </div>
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    PAID: '#22c55e',
    PENDING: '#eab308',
    FAILED: '#ef4444',
    PARTIALLY_SETTLED: '#06b6d4',
    REJECTED: '#f97316',
    CANCELLED: '#6b7280',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Summary Report</h1>
              <p className="mt-1 text-sm text-gray-500">
                Executive overview of payment and settlement metrics
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
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
            <div className="flex items-end">
              <button
                onClick={fetchReportData}
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

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Paid */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(kpis.total_paid)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formatNumber(kpis.total_settlements)} settlements
              </p>
            </div>

            {/* Outstanding */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Outstanding</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {formatCurrency(kpis.total_outstanding)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Pending settlements
              </p>
            </div>

            {/* Partially Settled */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Partially Settled</p>
                  <p className="text-2xl font-bold text-cyan-600 mt-1">
                    {formatNumber(kpis.partially_settled_count)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-cyan-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Require completion
              </p>
            </div>

            {/* Failed */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Failed</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatNumber(kpis.failed_count)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Need attention
              </p>
            </div>
          </div>
        )}

        {/* Secondary KPIs */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
              <p className="text-sm font-medium opacity-80">Total Payment Requests</p>
              <p className="text-3xl font-bold mt-2">{formatNumber(kpis.total_payment_requests)}</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
              <p className="text-sm font-medium opacity-80">Avg Settlement Amount</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(kpis.avg_settlement_amount)}</p>
            </div>
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg shadow-sm p-6 text-white">
              <p className="text-sm font-medium opacity-80">Avg Approval Time</p>
              <p className="text-3xl font-bold mt-2">{kpis.avg_approval_time_hours.toFixed(1)}h</p>
            </div>
          </div>
        )}

        {/* Summary Table */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Period Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Settlements
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Requests
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Failed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No data available for the selected period
                    </td>
                  </tr>
                ) : (
                  summaryData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {row.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        {formatNumber(row.settlements_count)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        {formatNumber(row.payment_requests_count)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                        {formatCurrency(row.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-green-600 font-medium">
                        {formatCurrency(row.paid_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-yellow-600">
                        {formatCurrency(row.pending_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {row.failed_count > 0 ? (
                          <span className="text-red-600 font-medium">{row.failed_count}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {summaryData.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr className="font-semibold">
                    <td className="px-6 py-4 text-gray-900">Total</td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {formatNumber(summaryData.reduce((sum, r) => sum + r.settlements_count, 0))}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {formatNumber(summaryData.reduce((sum, r) => sum + r.payment_requests_count, 0))}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {formatCurrency(summaryData.reduce((sum, r) => sum + r.total_amount, 0))}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600">
                      {formatCurrency(summaryData.reduce((sum, r) => sum + r.paid_amount, 0))}
                    </td>
                    <td className="px-6 py-4 text-right text-yellow-600">
                      {formatCurrency(summaryData.reduce((sum, r) => sum + r.pending_amount, 0))}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600">
                      {summaryData.reduce((sum, r) => sum + r.failed_count, 0)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Status Distribution Chart (Simple Bar Chart) */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Status Distribution</h2>
          <div className="space-y-4">
            {statusDistribution.map((item) => {
              const maxValue = Math.max(...statusDistribution.map((d) => d.value));
              const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              const color = STATUS_COLORS[item.label] || '#6b7280';
              
              return (
                <div key={item.label} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium text-gray-700">
                    {item.label.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="w-16 text-right text-sm font-semibold" style={{ color }}>
                    {item.value}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
