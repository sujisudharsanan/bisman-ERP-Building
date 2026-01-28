'use client';

import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Search, Filter, Check, X, Eye, Edit2, Trash2, ArrowRight } from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  status: 'Draft' | 'Posted' | 'Reversed';
  createdBy: string;
}

export default function JournalEntriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewEntry, setShowNewEntry] = useState(false);

  const entries: JournalEntry[] = [
    { id: 'JE-2025-001', date: '2025-01-15', reference: 'INV-2025-0123', description: 'Revenue from sales - ABC Corp', debitAccount: 'Accounts Receivable', creditAccount: 'Sales Revenue', amount: 450000, status: 'Posted', createdBy: 'Finance Manager' },
    { id: 'JE-2025-002', date: '2025-01-15', reference: 'EXP-2025-0045', description: 'Office supplies expense', debitAccount: 'Office Supplies Expense', creditAccount: 'Accounts Payable', amount: 25000, status: 'Posted', createdBy: 'Accountant' },
    { id: 'JE-2025-003', date: '2025-01-14', reference: 'SAL-2025-01', description: 'January salary accrual', debitAccount: 'Salary Expense', creditAccount: 'Salaries Payable', amount: 1200000, status: 'Draft', createdBy: 'HR Manager' },
    { id: 'JE-2025-004', date: '2025-01-14', reference: 'DEP-2025-01', description: 'Monthly depreciation', debitAccount: 'Depreciation Expense', creditAccount: 'Accumulated Depreciation', amount: 85000, status: 'Posted', createdBy: 'Finance Manager' },
    { id: 'JE-2025-005', date: '2025-01-13', reference: 'ADJ-2025-001', description: 'Inventory adjustment', debitAccount: 'Inventory Write-off', creditAccount: 'Inventory', amount: 15000, status: 'Reversed', createdBy: 'Warehouse Manager' },
    { id: 'JE-2025-006', date: '2025-01-12', reference: 'INT-2025-001', description: 'Interest income accrual', debitAccount: 'Interest Receivable', creditAccount: 'Interest Income', amount: 32000, status: 'Posted', createdBy: 'Accountant' },
  ];

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = entry.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    total: entries.length,
    posted: entries.filter(e => e.status === 'Posted').length,
    draft: entries.filter(e => e.status === 'Draft').length,
    totalAmount: entries.filter(e => e.status === 'Posted').reduce((sum, e) => sum + e.amount, 0)
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles = {
      Posted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Reversed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-purple-600" />Journal Entries
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create and manage accounting journal entries</p>
        </div>
        <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
          <Plus className="w-4 h-4" />New Journal Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Entries', value: stats.total, icon: BookOpen, color: 'blue' },
          { label: 'Posted', value: stats.posted, icon: Check, color: 'green' },
          { label: 'Drafts', value: stats.draft, icon: Edit2, color: 'yellow' },
          { label: 'Posted Value', value: formatCurrency(stats.totalAmount), icon: ArrowRight, color: 'purple' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </div>
              <stat.icon className={`w-8 h-8 text-${stat.color}-600 opacity-20`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search entries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Posted">Posted</option>
            <option value="Draft">Draft</option>
            <option value="Reversed">Reversed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entry ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Debit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Credit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3"><span className="text-sm font-medium text-purple-600">{entry.id}</span><div className="text-xs text-gray-500">{entry.reference}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">{entry.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.debitAccount}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.creditAccount}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(entry.amount)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(entry.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {entry.status === 'Draft' && <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>}
                      {entry.status === 'Posted' && <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Reverse"><X className="w-4 h-4 text-red-500" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewEntry(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Journal Entry</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference</label><input type="text" placeholder="e.g., INV-2025-0124" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
            </div>
            <div className="mb-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label><input type="text" placeholder="Journal entry description" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Debit Account</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"><option>Select account...</option><option>Cash</option><option>Accounts Receivable</option><option>Inventory</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Credit Account</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"><option>Select account...</option><option>Sales Revenue</option><option>Accounts Payable</option><option>Capital</option></select></div>
            </div>
            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label><input type="number" placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowNewEntry(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">Save as Draft</button>
              <button className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">Post Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
