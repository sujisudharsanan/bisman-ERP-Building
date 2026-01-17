'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  DollarSign,
  User,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  BookOpen
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface AdjustmentEntry {
  id: string;
  entryNumber: string;
  period: string;
  type: 'accrual' | 'deferral' | 'depreciation' | 'amortization' | 'revaluation' | 'correction' | 'provision';
  category: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  status: 'draft' | 'pending' | 'approved' | 'posted' | 'reversed';
  recurring: boolean;
  createdBy: string;
  createdDate: string;
  effectiveDate: string;
  notes?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockEntries: AdjustmentEntry[] = [
  {
    id: 'ADJ001',
    entryNumber: 'ADJ-2024-Q4-001',
    period: 'Q4 2024',
    type: 'accrual',
    category: 'Revenue',
    description: 'Accrued revenue for services rendered in December',
    debitAccount: '1200 - Accounts Receivable',
    creditAccount: '4000 - Service Revenue',
    amount: 125000,
    status: 'posted',
    recurring: false,
    createdBy: 'Sarah Chen',
    createdDate: '2024-01-15',
    effectiveDate: '2023-12-31'
  },
  {
    id: 'ADJ002',
    entryNumber: 'ADJ-2024-Q4-002',
    period: 'Q4 2024',
    type: 'depreciation',
    category: 'Fixed Assets',
    description: 'Monthly depreciation for office equipment',
    debitAccount: '6500 - Depreciation Expense',
    creditAccount: '1550 - Accumulated Depreciation',
    amount: 45000,
    status: 'approved',
    recurring: true,
    createdBy: 'Mike Johnson',
    createdDate: '2024-01-10',
    effectiveDate: '2023-12-31'
  },
  {
    id: 'ADJ003',
    entryNumber: 'ADJ-2024-Q4-003',
    period: 'Q4 2024',
    type: 'provision',
    category: 'Liabilities',
    description: 'Bad debt provision adjustment',
    debitAccount: '6100 - Bad Debt Expense',
    creditAccount: '1250 - Allowance for Doubtful Accounts',
    amount: 35000,
    status: 'pending',
    recurring: false,
    createdBy: 'Lisa Wong',
    createdDate: '2024-01-18',
    effectiveDate: '2023-12-31',
    notes: 'Based on aging analysis of receivables'
  },
  {
    id: 'ADJ004',
    entryNumber: 'ADJ-2024-Q4-004',
    period: 'Q4 2024',
    type: 'deferral',
    category: 'Revenue',
    description: 'Deferred revenue for prepaid annual subscriptions',
    debitAccount: '4000 - Service Revenue',
    creditAccount: '2400 - Deferred Revenue',
    amount: 89500,
    status: 'draft',
    recurring: false,
    createdBy: 'David Brown',
    createdDate: '2024-01-19',
    effectiveDate: '2023-12-31'
  },
  {
    id: 'ADJ005',
    entryNumber: 'ADJ-2024-Q4-005',
    period: 'Q4 2024',
    type: 'amortization',
    category: 'Prepaid Expenses',
    description: 'Insurance prepaid expense amortization',
    debitAccount: '6200 - Insurance Expense',
    creditAccount: '1300 - Prepaid Insurance',
    amount: 12000,
    status: 'posted',
    recurring: true,
    createdBy: 'Jennifer Lee',
    createdDate: '2024-01-05',
    effectiveDate: '2023-12-31'
  }
];

const stats = {
  totalAdjustments: 45,
  pendingApproval: 8,
  totalValue: 1250000,
  currentPeriod: 'Q4 2024'
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: AdjustmentEntry['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    posted: { label: 'Posted', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    reversed: { label: 'Reversed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: AdjustmentEntry['type'] }) {
  const config = {
    accrual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    deferral: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    depreciation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    amortization: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    revaluation: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    correction: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    provision: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {type}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function PeriodEndAdjustmentEntriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('Q4 2024');

  const filteredEntries = useMemo(() => {
    return mockEntries.filter(entry => {
      const matchesSearch =
        entry.entryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesPeriod = periodFilter === 'all' || entry.period === periodFilter;
      return matchesSearch && matchesType && matchesStatus && matchesPeriod;
    });
  }, [searchQuery, typeFilter, statusFilter, periodFilter]);

  const totalDebit = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = totalDebit;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Period End Adjustment Entries</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage accruals, deferrals, and closing adjustments</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Adjustment
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
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.currentPeriod}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Period</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAdjustments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Entries</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApproval}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Adjustments</p>
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
              placeholder="Search adjustments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Periods</option>
            <option value="Q4 2024">Q4 2024</option>
            <option value="Q3 2024">Q3 2024</option>
            <option value="Q2 2024">Q2 2024</option>
            <option value="Q1 2024">Q1 2024</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="accrual">Accrual</option>
            <option value="deferral">Deferral</option>
            <option value="depreciation">Depreciation</option>
            <option value="amortization">Amortization</option>
            <option value="revaluation">Revaluation</option>
            <option value="correction">Correction</option>
            <option value="provision">Provision</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="posted">Posted</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>

        {/* Totals Bar */}
        <div className="flex justify-between items-center p-3 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Debit:</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalDebit)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Credit:</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalCredit)}</span>
            </div>
          </div>
          <span className={`flex items-center gap-1 text-sm ${totalDebit === totalCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <CheckCircle className="w-4 h-4" />
            Balanced
          </span>
        </div>

        {/* Entries Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Accounts</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{entry.entryNumber}</p>
                        <p className="text-xs text-gray-500">{entry.effectiveDate}</p>
                      </div>
                      {entry.recurring && (
                        <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-600 dark:text-purple-400">
                          Recurring
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={entry.type} />
                    <p className="text-xs text-gray-500 mt-1">{entry.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-1">{entry.description}</p>
                    {entry.notes && (
                      <p className="text-xs text-gray-500 line-clamp-1">{entry.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs space-y-1">
                      <p className="text-green-600 dark:text-green-400">DR: {entry.debitAccount}</p>
                      <p className="text-red-600 dark:text-red-400">CR: {entry.creditAccount}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(entry.amount)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      {['draft', 'pending'].includes(entry.status) && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {entry.status === 'posted' && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Reverse">
                          <RotateCcw className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No adjustment entries found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
