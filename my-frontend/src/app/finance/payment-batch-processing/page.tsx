'use client';

import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, Search, Send, CheckCircle, Clock, AlertCircle, Eye, Download, Calendar, DollarSign, Building2, Hash, FileText } from 'lucide-react';

interface PaymentBatch {
  id: string;
  batchNumber: string;
  createdDate: string;
  paymentDate: string;
  paymentMethod: string;
  bankAccount: string;
  totalPayments: number;
  totalAmount: number;
  status: 'Draft' | 'Approved' | 'Submitted' | 'Completed' | 'Failed';
  createdBy: string;
}

interface PaymentItem {
  vendor: string;
  invoices: number;
  amount: number;
}

export default function PaymentBatchProcessingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewBatch, setShowNewBatch] = useState(false);

  const batches: PaymentBatch[] = [
    { id: 'B001', batchNumber: 'BATCH-2025-0015', createdDate: '2025-01-15', paymentDate: '2025-01-20', paymentMethod: 'NEFT', bankAccount: 'HDFC - 50100012345678', totalPayments: 12, totalAmount: 4850000, status: 'Approved', createdBy: 'Finance Manager' },
    { id: 'B002', batchNumber: 'BATCH-2025-0014', createdDate: '2025-01-14', paymentDate: '2025-01-18', paymentMethod: 'RTGS', bankAccount: 'ICICI - 12340567890123', totalPayments: 5, totalAmount: 12500000, status: 'Submitted', createdBy: 'Accountant' },
    { id: 'B003', batchNumber: 'BATCH-2025-0013', createdDate: '2025-01-13', paymentDate: '2025-01-15', paymentMethod: 'NEFT', bankAccount: 'HDFC - 50100012345678', totalPayments: 18, totalAmount: 3200000, status: 'Completed', createdBy: 'Finance Manager' },
    { id: 'B004', batchNumber: 'BATCH-2025-0012', createdDate: '2025-01-12', paymentDate: '2025-01-16', paymentMethod: 'Cheque', bankAccount: 'SBI - 38765432109876', totalPayments: 8, totalAmount: 1850000, status: 'Draft', createdBy: 'Accountant' },
    { id: 'B005', batchNumber: 'BATCH-2025-0011', createdDate: '2025-01-10', paymentDate: '2025-01-12', paymentMethod: 'NEFT', bankAccount: 'HDFC - 50100012345678', totalPayments: 15, totalAmount: 5600000, status: 'Failed', createdBy: 'Finance Manager' },
  ];

  const selectedBatchItems: PaymentItem[] = [
    { vendor: 'ABC Suppliers Pvt Ltd', invoices: 3, amount: 1250000 },
    { vendor: 'XYZ Manufacturing Co', invoices: 2, amount: 850000 },
    { vendor: 'Tech Components Inc', invoices: 4, amount: 1500000 },
    { vendor: 'Office World', invoices: 1, amount: 125000 },
    { vendor: 'Logistics Pro', invoices: 2, amount: 1125000 },
  ];

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesSearch = batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    pendingApproval: batches.filter(b => b.status === 'Draft').reduce((sum, b) => sum + b.totalAmount, 0),
    submitted: batches.filter(b => b.status === 'Submitted').reduce((sum, b) => sum + b.totalAmount, 0),
    completedToday: batches.filter(b => b.status === 'Completed').length,
    totalProcessed: batches.filter(b => b.status === 'Completed').reduce((sum, b) => sum + b.totalAmount, 0)
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Submitted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-sky-600" />Payment Batch Processing
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create and process bulk payment batches</p>
        </div>
        <button onClick={() => setShowNewBatch(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700">
          <Plus className="w-4 h-4" />Create Batch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-600">{formatCurrency(stats.pendingApproval)}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Submitted to Bank</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.submitted)}</p>
            </div>
            <Send className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed Today</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Processed</p>
              <p className="text-2xl font-bold text-sky-600">{formatCurrency(stats.totalProcessed)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-sky-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search batches..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
            <option value="Submitted">Submitted</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Batch Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Bank Account</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payments</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBatches.map((batch) => (
                <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-sky-600">{batch.batchNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(batch.createdDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(batch.paymentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{batch.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{batch.bankAccount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">{batch.totalPayments}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">{formatCurrency(batch.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(batch.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {batch.status === 'Approved' && (
                        <button className="p-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/30 rounded" title="Submit"><Send className="w-4 h-4 text-sky-600" /></button>
                      )}
                      {batch.status === 'Completed' && (
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Download"><Download className="w-4 h-4 text-gray-500" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewBatch(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Payment Batch</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label><input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"><option>NEFT</option><option>RTGS</option><option>Cheque</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Account</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"><option>HDFC - 50100012345678</option><option>ICICI - 12340567890123</option><option>SBI - 38765432109876</option></select></div>
            </div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payments in Batch</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Vendor</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Invoices</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedBatchItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{item.vendor}</td>
                      <td className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">{item.invoices}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">Total</td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-sky-600">{formatCurrency(selectedBatchItems.reduce((sum, i) => sum + i.amount, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowNewBatch(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg">Cancel</button>
              <button className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">Save as Draft</button>
              <button className="px-4 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700">Submit for Approval</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
