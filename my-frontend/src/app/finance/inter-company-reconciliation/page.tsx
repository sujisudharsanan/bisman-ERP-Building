'use client';

import React, { useState, useMemo } from 'react';
import { Layers, Plus, Search, Building2, DollarSign, ArrowLeftRight, CheckCircle, Clock, AlertTriangle, Eye, FileText, RefreshCw } from 'lucide-react';

interface ICTransaction {
  id: string;
  date: string;
  sourceCompany: string;
  targetCompany: string;
  type: 'Invoice' | 'Payment' | 'Adjustment';
  description: string;
  sourceAmount: number;
  targetAmount: number;
  difference: number;
  status: 'Matched' | 'Unmatched' | 'Pending Review';
}

export default function InterCompanyReconciliationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const transactions: ICTransaction[] = [
    { id: 'IC-2025-001', date: '2025-01-15', sourceCompany: 'Bisman Holdings Pvt Ltd', targetCompany: 'Bisman Manufacturing Ltd', type: 'Invoice', description: 'Management fee - Q4 2024', sourceAmount: 2500000, targetAmount: 2500000, difference: 0, status: 'Matched' },
    { id: 'IC-2025-002', date: '2025-01-14', sourceCompany: 'Bisman Manufacturing Ltd', targetCompany: 'Bisman Retail Ltd', type: 'Invoice', description: 'Product transfer - Batch 2025-01', sourceAmount: 8500000, targetAmount: 8450000, difference: 50000, status: 'Unmatched' },
    { id: 'IC-2025-003', date: '2025-01-13', sourceCompany: 'Bisman Retail Ltd', targetCompany: 'Bisman Holdings Pvt Ltd', type: 'Payment', description: 'Dividend payment - FY 2024', sourceAmount: 5000000, targetAmount: 5000000, difference: 0, status: 'Matched' },
    { id: 'IC-2025-004', date: '2025-01-12', sourceCompany: 'Bisman Holdings Pvt Ltd', targetCompany: 'Bisman Logistics Ltd', type: 'Invoice', description: 'Shared services allocation', sourceAmount: 1200000, targetAmount: 0, difference: 1200000, status: 'Pending Review' },
    { id: 'IC-2025-005', date: '2025-01-10', sourceCompany: 'Bisman Logistics Ltd', targetCompany: 'Bisman Manufacturing Ltd', type: 'Invoice', description: 'Freight charges - Dec 2024', sourceAmount: 750000, targetAmount: 750000, difference: 0, status: 'Matched' },
    { id: 'IC-2025-006', date: '2025-01-08', sourceCompany: 'Bisman Manufacturing Ltd', targetCompany: 'Bisman Holdings Pvt Ltd', type: 'Adjustment', description: 'Prior period adjustment', sourceAmount: 320000, targetAmount: 280000, difference: 40000, status: 'Unmatched' },
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.sourceCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.targetCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    total: transactions.length,
    matched: transactions.filter(t => t.status === 'Matched').length,
    unmatched: transactions.filter(t => t.status === 'Unmatched').length,
    totalDifference: transactions.reduce((sum, t) => sum + t.difference, 0)
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles = {
      Matched: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Unmatched: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Pending Review': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    };
    const icons = { Matched: CheckCircle, Unmatched: AlertTriangle, 'Pending Review': Clock };
    const Icon = icons[status as keyof typeof icons];
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}><Icon className="w-3 h-3" />{status}</span>;
  };

  const companies = ['Bisman Holdings Pvt Ltd', 'Bisman Manufacturing Ltd', 'Bisman Retail Ltd', 'Bisman Logistics Ltd'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Layers className="w-8 h-8 text-fuchsia-600" />Inter-Company Reconciliation
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Reconcile transactions between group companies</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />Auto-Match
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-medium hover:bg-fuchsia-700">
            <Plus className="w-4 h-4" />New Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Layers className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Matched</p>
              <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unmatched</p>
              <p className="text-2xl font-bold text-red-600">{stats.unmatched}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Difference</p>
              <p className="text-2xl font-bold text-fuchsia-600">{formatCurrency(stats.totalDifference)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-fuchsia-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Group Companies</h3>
          <div className="space-y-2">
            {companies.map((company, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{company}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search transactions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
              <option value="all">All Status</option>
              <option value="Matched">Matched</option>
              <option value="Unmatched">Unmatched</option>
              <option value="Pending Review">Pending Review</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Companies</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Source</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Target</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Diff</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-fuchsia-600">{tx.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[80px]" title={tx.sourceCompany}>{tx.sourceCompany.split(' ')[0]}</span>
                        <ArrowLeftRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[80px]" title={tx.targetCompany}>{tx.targetCompany.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{tx.description}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(tx.sourceAmount)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(tx.targetAmount)}</td>
                    <td className={`px-4 py-3 text-sm font-medium text-right ${tx.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>{tx.difference > 0 ? formatCurrency(tx.difference) : '-'}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(tx.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Documents"><FileText className="w-4 h-4 text-gray-500" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
