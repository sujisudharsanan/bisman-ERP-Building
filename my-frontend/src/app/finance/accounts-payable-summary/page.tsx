'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  RefreshCw,
  PieChart,
  BarChart3
} from 'lucide-react';

// Types
interface PayableItem {
  id: string;
  vendorName: string;
  vendorCode: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'pending' | 'partial' | 'overdue' | 'paid' | 'disputed';
  category: string;
  paymentTerms: string;
}

// Mock data
const mockPayables: PayableItem[] = [
  { id: '1', vendorName: 'Global Supplies Inc', vendorCode: 'VND-001', invoiceNumber: 'INV-2026-0145', invoiceDate: '2026-01-05', dueDate: '2026-02-04', amount: 45000, paidAmount: 0, status: 'pending', category: 'Raw Materials', paymentTerms: 'Net 30' },
  { id: '2', vendorName: 'Tech Solutions Ltd', vendorCode: 'VND-002', invoiceNumber: 'INV-2026-0128', invoiceDate: '2025-12-20', dueDate: '2026-01-19', amount: 28500, paidAmount: 0, status: 'overdue', category: 'IT Services', paymentTerms: 'Net 30' },
  { id: '3', vendorName: 'Office Pro Supplies', vendorCode: 'VND-003', invoiceNumber: 'INV-2026-0099', invoiceDate: '2026-01-10', dueDate: '2026-01-25', amount: 5200, paidAmount: 2600, status: 'partial', category: 'Office Supplies', paymentTerms: 'Net 15' },
  { id: '4', vendorName: 'Premium Logistics', vendorCode: 'VND-004', invoiceNumber: 'INV-2025-3892', invoiceDate: '2025-12-15', dueDate: '2026-01-14', amount: 18750, paidAmount: 18750, status: 'paid', category: 'Logistics', paymentTerms: 'Net 30' },
  { id: '5', vendorName: 'Industrial Parts Co', vendorCode: 'VND-005', invoiceNumber: 'INV-2026-0156', invoiceDate: '2026-01-08', dueDate: '2026-02-07', amount: 67800, paidAmount: 0, status: 'pending', category: 'Manufacturing', paymentTerms: 'Net 30' },
  { id: '6', vendorName: 'Utility Services', vendorCode: 'VND-006', invoiceNumber: 'INV-2025-3901', invoiceDate: '2025-12-28', dueDate: '2026-01-12', amount: 12400, paidAmount: 0, status: 'disputed', category: 'Utilities', paymentTerms: 'Net 15' },
  { id: '7', vendorName: 'Marketing Agency XYZ', vendorCode: 'VND-007', invoiceNumber: 'INV-2026-0112', invoiceDate: '2026-01-02', dueDate: '2026-01-17', amount: 35000, paidAmount: 35000, status: 'paid', category: 'Marketing', paymentTerms: 'Net 15' },
  { id: '8', vendorName: 'Security Systems Corp', vendorCode: 'VND-008', invoiceNumber: 'INV-2026-0178', invoiceDate: '2026-01-12', dueDate: '2026-02-11', amount: 22000, paidAmount: 0, status: 'pending', category: 'Security', paymentTerms: 'Net 30' }
];

const summaryMetrics = {
  totalPayables: 234650,
  currentDue: 89500,
  overdue: 40900,
  paidThisMonth: 125800,
  averagePaymentDays: 24,
  vendorCount: 45,
  overdueCount: 8,
  disputedCount: 2
};

const agingBuckets = [
  { label: 'Current', amount: 134800, percentage: 57, color: 'bg-green-500' },
  { label: '1-30 Days', amount: 58500, percentage: 25, color: 'bg-yellow-500' },
  { label: '31-60 Days', amount: 28500, percentage: 12, color: 'bg-orange-500' },
  { label: '60+ Days', amount: 12850, percentage: 6, color: 'bg-red-500' }
];

export default function AccountsPayableSummaryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('30d');

  const filteredPayables = useMemo(() => {
    return mockPayables.filter((p) => {
      const matchesSearch = 
        p.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.vendorCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchTerm, statusFilter, categoryFilter]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'partial': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'overdue': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'paid': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'disputed': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    };
    return colors[status] || colors['pending'];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const categories = [...new Set(mockPayables.map(p => p.category))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-red-500" />
              Accounts Payable Summary
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track vendor invoices, payments, and outstanding liabilities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Total Payables</span>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(summaryMetrics.totalPayables)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {summaryMetrics.vendorCount} vendors
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Currently Due</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {formatCurrency(summaryMetrics.currentDue)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Due within 30 days</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Overdue</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(summaryMetrics.overdue)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {summaryMetrics.overdueCount} invoices overdue
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Paid This Month</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(summaryMetrics.paidThisMonth)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-sm text-green-500">
            <TrendingUp className="w-4 h-4" />
            <span>12% vs last month</span>
          </div>
        </div>
      </div>

      {/* Aging Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Aging Analysis
          </h2>
          <div className="space-y-4">
            {agingBuckets.map((bucket) => (
              <div key={bucket.label} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-600 dark:text-gray-400">{bucket.label}</div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <div 
                      className={`h-full ${bucket.color} flex items-center justify-end pr-2`}
                      style={{ width: `${bucket.percentage}%` }}
                    >
                      <span className="text-xs font-medium text-white">{bucket.percentage}%</span>
                    </div>
                  </div>
                </div>
                <div className="w-28 text-right font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(bucket.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-500" />
            Quick Stats
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Avg Payment Days</span>
              <span className="font-semibold text-gray-900 dark:text-white">{summaryMetrics.averagePaymentDays} days</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Active Vendors</span>
              <span className="font-semibold text-gray-900 dark:text-white">{summaryMetrics.vendorCount}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Overdue Invoices</span>
              <span className="font-semibold text-red-500">{summaryMetrics.overdueCount}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600 dark:text-gray-400">Disputed</span>
              <span className="font-semibold text-purple-500">{summaryMetrics.disputedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="p-4 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by vendor, invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
              <option value="disputed">Disputed</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payables Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPayables.map((item) => {
                const daysUntilDue = getDaysUntilDue(item.dueDate);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.vendorName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.vendorCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{item.invoiceNumber}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.invoiceDate}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {item.category}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{item.dueDate}</div>
                      <div className={`text-xs ${daysUntilDue < 0 ? 'text-red-500' : daysUntilDue <= 7 ? 'text-yellow-500' : 'text-gray-500'}`}>
                        {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</div>
                      {item.paidAmount > 0 && item.paidAmount < item.amount && (
                        <div className="text-sm text-green-500">Paid: {formatCurrency(item.paidAmount)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Download">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="More">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredPayables.length} of {mockPayables.length} invoices
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Previous
            </button>
            <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
