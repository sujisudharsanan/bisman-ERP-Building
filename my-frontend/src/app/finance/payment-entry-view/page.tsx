'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Building2,
  User,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  RefreshCw,
  FileText
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface PaymentEntry {
  id: string;
  paymentNumber: string;
  date: string;
  type: 'incoming' | 'outgoing' | 'internal';
  category: 'vendor' | 'customer' | 'employee' | 'utility' | 'loan' | 'tax';
  payee: string;
  description: string;
  amount: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'check' | 'cash' | 'credit_card' | 'wire';
  bankAccount: string;
  reference: string;
  status: 'draft' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdBy: string;
  approvedBy?: string;
  completedDate?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockPayments: PaymentEntry[] = [
  {
    id: 'PAY001',
    paymentNumber: 'PAY-2024-0089',
    date: '2024-01-20',
    type: 'outgoing',
    category: 'vendor',
    payee: 'TechSupply Corp',
    description: 'Invoice #INV-5678 - IT Equipment',
    amount: 45000,
    currency: 'USD',
    paymentMethod: 'wire',
    bankAccount: 'Operating Account ****4521',
    reference: 'INV-5678',
    status: 'completed',
    createdBy: 'John Smith',
    approvedBy: 'Sarah Manager',
    completedDate: '2024-01-20'
  },
  {
    id: 'PAY002',
    paymentNumber: 'PAY-2024-0088',
    date: '2024-01-19',
    type: 'incoming',
    category: 'customer',
    payee: 'Global Industries Inc',
    description: 'Payment for Order #ORD-1234',
    amount: 128500,
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    bankAccount: 'Receivables Account ****7890',
    reference: 'ORD-1234',
    status: 'completed',
    createdBy: 'Lisa Chen',
    completedDate: '2024-01-19'
  },
  {
    id: 'PAY003',
    paymentNumber: 'PAY-2024-0087',
    date: '2024-01-19',
    type: 'outgoing',
    category: 'employee',
    payee: 'January Payroll',
    description: 'Monthly payroll processing',
    amount: 285000,
    currency: 'USD',
    paymentMethod: 'bank_transfer',
    bankAccount: 'Payroll Account ****2345',
    reference: 'PR-JAN-2024',
    status: 'processing',
    createdBy: 'HR System'
  },
  {
    id: 'PAY004',
    paymentNumber: 'PAY-2024-0086',
    date: '2024-01-18',
    type: 'outgoing',
    category: 'utility',
    payee: 'City Power Company',
    description: 'Electricity bill - January',
    amount: 4500,
    currency: 'USD',
    paymentMethod: 'check',
    bankAccount: 'Operating Account ****4521',
    reference: 'UTIL-JAN-001',
    status: 'pending',
    createdBy: 'Mike Johnson'
  },
  {
    id: 'PAY005',
    paymentNumber: 'PAY-2024-0085',
    date: '2024-01-17',
    type: 'outgoing',
    category: 'tax',
    payee: 'IRS',
    description: 'Q4 2023 Federal Tax Payment',
    amount: 125000,
    currency: 'USD',
    paymentMethod: 'wire',
    bankAccount: 'Tax Reserve Account ****6789',
    reference: 'TAX-Q4-2023',
    status: 'completed',
    createdBy: 'Finance Department',
    approvedBy: 'CFO',
    completedDate: '2024-01-17'
  }
];

const stats = {
  totalPayments: 156,
  incomingTotal: 2450000,
  outgoingTotal: 1890000,
  pendingCount: 12
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: PaymentEntry['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: PaymentEntry['type'] }) {
  const config = {
    incoming: { label: 'Incoming', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: ArrowDownRight },
    outgoing: { label: 'Outgoing', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: ArrowUpRight },
    internal: { label: 'Internal', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: RefreshCw }
  }[type];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function PaymentEntryViewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredPayments = useMemo(() => {
    return mockPayments.filter(payment => {
      const matchesSearch =
        payment.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.payee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || payment.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || payment.category === categoryFilter;
      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });
  }, [searchQuery, typeFilter, statusFilter, categoryFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Entries</h1>
            <p className="text-gray-500 dark:text-gray-400">View and manage all payment transactions</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Payment
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPayments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Payments</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ArrowDownRight className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.incomingTotal)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Incoming</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.outgoingTotal)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Outgoing</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by number, payee, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="incoming">Incoming</option>
            <option value="outgoing">Outgoing</option>
            <option value="internal">Internal</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            <option value="vendor">Vendor</option>
            <option value="customer">Customer</option>
            <option value="employee">Employee</option>
            <option value="utility">Utility</option>
            <option value="loan">Loan</option>
            <option value="tax">Tax</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payee / Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Method</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{payment.paymentNumber}</p>
                    <p className="text-xs text-gray-500">{payment.date}</p>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={payment.type} />
                    <p className="text-xs text-gray-500 capitalize mt-1">{payment.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.payee}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{payment.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">{payment.paymentMethod.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">{payment.bankAccount}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={`font-bold ${payment.type === 'incoming' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                      {payment.type === 'incoming' ? '+' : '-'}{formatCurrency(payment.amount)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      {['draft', 'pending'].includes(payment.status) && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Receipt">
                        <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No payment entries found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
