'use client';

import React, { useState } from 'react';
import { Receipt, Search, Filter, Download, Plus, Eye, Edit2, CheckCircle2, Clock, AlertCircle, DollarSign } from 'lucide-react';

interface ExpenseReport {
  id: string;
  reportNumber: string;
  employee: string;
  department: string;
  submittedDate: string;
  totalAmount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  items: number;
  category: string;
}

const mockReports: ExpenseReport[] = [
  { id: '1', reportNumber: 'EXP-2026-001', employee: 'John Smith', department: 'Engineering', submittedDate: '2026-01-15', totalAmount: 45000, status: 'approved', items: 5, category: 'Travel' },
  { id: '2', reportNumber: 'EXP-2026-002', employee: 'Sarah Johnson', department: 'Marketing', submittedDate: '2026-01-14', totalAmount: 28500, status: 'submitted', items: 3, category: 'Client Entertainment' },
  { id: '3', reportNumber: 'EXP-2026-003', employee: 'Mike Davis', department: 'Sales', submittedDate: '2026-01-12', totalAmount: 62000, status: 'paid', items: 8, category: 'Travel' },
  { id: '4', reportNumber: 'EXP-2026-004', employee: 'Lisa Chen', department: 'Operations', submittedDate: '2026-01-10', totalAmount: 15000, status: 'rejected', items: 2, category: 'Office Supplies' },
  { id: '5', reportNumber: 'EXP-2026-005', employee: 'Tom Wilson', department: 'HR', submittedDate: '2026-01-08', totalAmount: 35000, status: 'draft', items: 4, category: 'Training' },
];

export default function ExpenseReportPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      paid: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const filteredReports = mockReports.filter(r => {
    const matchesSearch = r.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) || r.employee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const summary = {
    total: mockReports.length,
    pending: mockReports.filter(r => r.status === 'submitted').length,
    approved: mockReports.filter(r => r.status === 'approved' || r.status === 'paid').length,
    totalAmount: mockReports.reduce((sum, r) => sum + r.totalAmount, 0),
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Receipt className="w-8 h-8 text-blue-600" />
            Expense Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and track employee expense submissions</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" />New Report</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Reports</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{summary.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{summary.approved}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalAmount)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search reports..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Report #</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Category</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Items</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Amount</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4"><p className="text-sm font-medium text-blue-600">{report.reportNumber}</p><p className="text-xs text-gray-500">{report.submittedDate}</p></td>
                <td className="px-6 py-4"><p className="text-sm text-gray-900 dark:text-white">{report.employee}</p><p className="text-xs text-gray-500">{report.department}</p></td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{report.category}</td>
                <td className="px-6 py-4 text-sm text-center text-gray-900 dark:text-white">{report.items}</td>
                <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">{formatCurrency(report.totalAmount)}</td>
                <td className="px-6 py-4 text-center">{getStatusBadge(report.status)}</td>
                <td className="px-6 py-4"><div className="flex items-center justify-center gap-2"><button className="p-1.5 text-gray-400 hover:text-blue-600"><Eye className="w-4 h-4" /></button><button className="p-1.5 text-gray-400 hover:text-green-600"><Edit2 className="w-4 h-4" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
