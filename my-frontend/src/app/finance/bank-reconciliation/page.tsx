'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Download,
  Upload,
  Filter,
  Search,
  Calendar,
  ArrowUpDown,
  Eye,
  FileText,
  DollarSign
} from 'lucide-react';

interface ReconciliationItem {
  id: string;
  date: string;
  description: string;
  bankAmount: number;
  bookAmount: number;
  difference: number;
  status: 'matched' | 'unmatched' | 'pending';
  reference: string;
  type: 'credit' | 'debit';
}

const mockReconciliationData: ReconciliationItem[] = [
  { id: '1', date: '2026-01-15', description: 'Customer Payment - INV-2024-001', bankAmount: 50000, bookAmount: 50000, difference: 0, status: 'matched', reference: 'TXN001', type: 'credit' },
  { id: '2', date: '2026-01-14', description: 'Vendor Payment - PO-2024-045', bankAmount: 25000, bookAmount: 25000, difference: 0, status: 'matched', reference: 'TXN002', type: 'debit' },
  { id: '3', date: '2026-01-13', description: 'Salary Disbursement', bankAmount: 150000, bookAmount: 148500, difference: 1500, status: 'unmatched', reference: 'TXN003', type: 'debit' },
  { id: '4', date: '2026-01-12', description: 'Interest Income', bankAmount: 2500, bookAmount: 0, difference: 2500, status: 'pending', reference: 'TXN004', type: 'credit' },
  { id: '5', date: '2026-01-11', description: 'Utility Payment', bankAmount: 8500, bookAmount: 8500, difference: 0, status: 'matched', reference: 'TXN005', type: 'debit' },
];

export default function BankReconciliationPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const filteredData = useMemo(() => {
    return mockReconciliationData.filter(item => {
      const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.reference.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const matched = mockReconciliationData.filter(i => i.status === 'matched').length;
    const unmatched = mockReconciliationData.filter(i => i.status === 'unmatched').length;
    const pending = mockReconciliationData.filter(i => i.status === 'pending').length;
    const totalDifference = mockReconciliationData.reduce((sum, i) => sum + Math.abs(i.difference), 0);
    return { matched, unmatched, pending, totalDifference };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      matched: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      unmatched: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    const icons = {
      matched: <CheckCircle2 className="w-3 h-3" />,
      unmatched: <XCircle className="w-3 h-3" />,
      pending: <AlertTriangle className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              Bank Reconciliation
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Match bank transactions with book entries and identify discrepancies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Upload className="w-4 h-4" />
              Import Statement
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Auto Reconcile
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Matched</p>
              <p className="text-2xl font-bold text-green-600">{summary.matched}</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-100 dark:text-green-900" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unmatched</p>
              <p className="text-2xl font-bold text-red-600">{summary.unmatched}</p>
            </div>
            <XCircle className="w-10 h-10 text-red-100 dark:text-red-900" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-yellow-100 dark:text-yellow-900" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Difference</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalDifference)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-gray-100 dark:text-gray-700" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="matched">Matched</option>
            <option value="unmatched">Unmatched</option>
            <option value="pending">Pending</option>
          </select>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(filteredData.map(i => i.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  <button className="inline-flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
                    Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Bank Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Book Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Difference</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                    {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{item.reference}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">{item.description}</td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${item.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.bankAmount)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${item.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.type === 'credit' ? '+' : '-'}{formatCurrency(item.bookAmount)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${item.difference === 0 ? 'text-gray-500' : 'text-orange-600'}`}>
                    {formatCurrency(item.difference)}
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(item.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Match">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium">{filteredData.length}</span> of <span className="font-medium">{mockReconciliationData.length}</span> transactions
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
