'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  ChevronRight,
  ChevronDown,
  Plus,
  Eye,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Printer,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// Types
interface LedgerEntry {
  id: string;
  date: string;
  journalNumber: string;
  description: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  createdBy: string;
  status: 'posted' | 'pending' | 'reversed';
}

interface AccountSummary {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: number;
}

// Mock data
const mockLedgerEntries: LedgerEntry[] = [
  { id: '1', date: '2026-01-17', journalNumber: 'JE-2026-0156', description: 'Sales Revenue - Acme Corp', accountCode: '4000', accountName: 'Sales Revenue', debit: 0, credit: 125000, balance: 2450000, reference: 'SI-2026-0245', createdBy: 'Sarah Chen', status: 'posted' },
  { id: '2', date: '2026-01-17', journalNumber: 'JE-2026-0156', description: 'Accounts Receivable - Acme Corp', accountCode: '1200', accountName: 'Accounts Receivable', debit: 125000, credit: 0, balance: 554500, reference: 'SI-2026-0245', createdBy: 'Sarah Chen', status: 'posted' },
  { id: '3', date: '2026-01-16', journalNumber: 'JE-2026-0155', description: 'Office Supplies Purchase', accountCode: '5200', accountName: 'Office Expenses', debit: 2500, credit: 0, balance: 45200, reference: 'PO-2026-0089', createdBy: 'Mike Johnson', status: 'posted' },
  { id: '4', date: '2026-01-16', journalNumber: 'JE-2026-0155', description: 'Accounts Payable - Office Pro', accountCode: '2100', accountName: 'Accounts Payable', debit: 0, credit: 2500, balance: 234650, reference: 'PO-2026-0089', createdBy: 'Mike Johnson', status: 'posted' },
  { id: '5', date: '2026-01-15', journalNumber: 'JE-2026-0154', description: 'Bank Deposit - Collections', accountCode: '1100', accountName: 'Cash and Bank', debit: 78000, credit: 0, balance: 1250000, reference: 'DEP-2026-0034', createdBy: 'Lisa Wang', status: 'posted' },
  { id: '6', date: '2026-01-15', journalNumber: 'JE-2026-0154', description: 'AR Collection - HealthCare Plus', accountCode: '1200', accountName: 'Accounts Receivable', debit: 0, credit: 78000, balance: 429500, reference: 'DEP-2026-0034', createdBy: 'Lisa Wang', status: 'posted' },
  { id: '7', date: '2026-01-14', journalNumber: 'JE-2026-0153', description: 'Salary Expense - January', accountCode: '5100', accountName: 'Salaries & Wages', debit: 185000, credit: 0, balance: 1850000, reference: 'PAY-2026-001', createdBy: 'HR System', status: 'posted' },
  { id: '8', date: '2026-01-14', journalNumber: 'JE-2026-0153', description: 'Bank Payment - Payroll', accountCode: '1100', accountName: 'Cash and Bank', debit: 0, credit: 185000, balance: 1065000, reference: 'PAY-2026-001', createdBy: 'HR System', status: 'posted' },
  { id: '9', date: '2026-01-13', journalNumber: 'JE-2026-0152', description: 'Depreciation - Fixed Assets', accountCode: '5300', accountName: 'Depreciation Expense', debit: 15000, credit: 0, balance: 180000, reference: 'DEP-JAN', createdBy: 'System', status: 'pending' },
  { id: '10', date: '2026-01-13', journalNumber: 'JE-2026-0152', description: 'Accumulated Depreciation', accountCode: '1550', accountName: 'Accumulated Depreciation', debit: 0, credit: 15000, balance: 450000, reference: 'DEP-JAN', createdBy: 'System', status: 'pending' }
];

const accountSummaries: AccountSummary[] = [
  { code: '1100', name: 'Cash and Bank', type: 'asset', openingBalance: 1150000, totalDebit: 78000, totalCredit: 185000, closingBalance: 1043000, entries: 45 },
  { code: '1200', name: 'Accounts Receivable', type: 'asset', openingBalance: 485000, totalDebit: 125000, totalCredit: 78000, closingBalance: 532000, entries: 38 },
  { code: '1500', name: 'Fixed Assets', type: 'asset', openingBalance: 2500000, totalDebit: 0, totalCredit: 0, closingBalance: 2500000, entries: 5 },
  { code: '2100', name: 'Accounts Payable', type: 'liability', openingBalance: 232150, totalDebit: 0, totalCredit: 2500, closingBalance: 234650, entries: 28 },
  { code: '3000', name: 'Retained Earnings', type: 'equity', openingBalance: 1875000, totalDebit: 0, totalCredit: 0, closingBalance: 1875000, entries: 2 },
  { code: '4000', name: 'Sales Revenue', type: 'revenue', openingBalance: 2325000, totalDebit: 0, totalCredit: 125000, closingBalance: 2450000, entries: 156 },
  { code: '5100', name: 'Salaries & Wages', type: 'expense', openingBalance: 1665000, totalDebit: 185000, totalCredit: 0, closingBalance: 1850000, entries: 24 },
  { code: '5200', name: 'Office Expenses', type: 'expense', openingBalance: 42700, totalDebit: 2500, totalCredit: 0, closingBalance: 45200, entries: 18 }
];

const periodSummary = {
  totalDebits: 405500,
  totalCredits: 405500,
  isBalanced: true,
  entriesCount: 156,
  journalsCount: 45,
  pendingReview: 8
};

export default function GeneralLedgerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('mtd');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'entries' | 'summary'>('entries');
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);

  const filteredEntries = useMemo(() => {
    return mockLedgerEntries.filter((entry) => {
      const matchesSearch = 
        entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.journalNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.accountCode.includes(searchTerm) ||
        entry.accountName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAccount = accountFilter === 'all' || entry.accountCode === accountFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      
      return matchesSearch && matchesAccount && matchesStatus;
    });
  }, [searchTerm, accountFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'posted': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'reversed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[status] || colors['pending'];
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'asset': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'liability': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'equity': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'revenue': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'expense': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    };
    return colors[type] || colors['asset'];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const toggleAccountExpand = (code: string) => {
    setExpandedAccounts(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-500" />
              General Ledger
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage all ledger transactions and account balances
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="today">Today</option>
              <option value="wtd">Week to Date</option>
              <option value="mtd">Month to Date</option>
              <option value="qtd">Quarter to Date</option>
              <option value="ytd">Year to Date</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Printer className="w-4 h-4" />
              <span className="text-sm">Print</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Total Debits</span>
            <ArrowUpRight className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(periodSummary.totalDebits)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This period</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Total Credits</span>
            <ArrowDownRight className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(periodSummary.totalCredits)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This period</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Balance Status</span>
            {periodSummary.isBalanced ? (
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-500">
                <TrendingDown className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className={`text-3xl font-bold ${periodSummary.isBalanced ? 'text-green-500' : 'text-red-500'}`}>
            {periodSummary.isBalanced ? 'Balanced' : 'Unbalanced'}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Debits = Credits
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Pending Review</span>
            <FileText className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {periodSummary.pendingReview}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Entries awaiting approval
          </p>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="p-4 flex flex-col lg:flex-row gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('entries')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'entries'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Ledger Entries
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'summary'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Account Summary
            </button>
          </div>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search entries, accounts, or references..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Accounts</option>
              {accountSummaries.map(acc => (
                <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="posted">Posted</option>
              <option value="pending">Pending</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'entries' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Journal #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Debit</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Credit</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{entry.date}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{entry.journalNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{entry.accountCode}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{entry.accountName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{entry.description}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {entry.reference}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(entry.balance)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredEntries.length} of {mockLedgerEntries.length} entries
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
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Opening Balance</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Debit</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Credit</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Closing Balance</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Entries</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {accountSummaries.map((account) => (
                  <tr key={account.code} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleAccountExpand(account.code)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {expandedAccounts.includes(account.code) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{account.code}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{account.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getAccountTypeColor(account.type)}`}>
                        {account.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(account.openingBalance)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(account.totalDebit)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(account.totalCredit)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(account.closingBalance)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                      {account.entries}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
