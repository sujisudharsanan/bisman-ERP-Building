'use client';

import React, { useState } from 'react';
import { Receipt, Download, Calendar, Filter, FileText, PieChart, DollarSign, TrendingUp, Building2, Percent } from 'lucide-react';

interface TaxReport {
  id: string;
  name: string;
  period: string;
  type: 'GST' | 'TDS' | 'Income Tax' | 'Professional Tax';
  dueDate: string;
  status: 'Filed' | 'Pending' | 'Overdue';
  amount: number;
}

export default function TaxReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Q3-FY2025');
  const [selectedTaxType, setSelectedTaxType] = useState('all');

  const taxReports: TaxReport[] = [
    { id: 'TR-001', name: 'GSTR-1 - Outward Supplies', period: 'December 2024', type: 'GST', dueDate: '2025-01-11', status: 'Filed', amount: 1850000 },
    { id: 'TR-002', name: 'GSTR-3B - Summary Return', period: 'December 2024', type: 'GST', dueDate: '2025-01-20', status: 'Filed', amount: 2450000 },
    { id: 'TR-003', name: 'TDS Return - 24Q', period: 'Q3 FY2024-25', type: 'TDS', dueDate: '2025-01-31', status: 'Pending', amount: 850000 },
    { id: 'TR-004', name: 'TDS Return - 26Q', period: 'Q3 FY2024-25', type: 'TDS', dueDate: '2025-01-31', status: 'Pending', amount: 320000 },
    { id: 'TR-005', name: 'Advance Tax - Q3', period: 'Q3 FY2024-25', type: 'Income Tax', dueDate: '2024-12-15', status: 'Filed', amount: 5000000 },
    { id: 'TR-006', name: 'Professional Tax', period: 'January 2025', type: 'Professional Tax', dueDate: '2025-01-31', status: 'Pending', amount: 125000 },
    { id: 'TR-007', name: 'GSTR-1 - Outward Supplies', period: 'January 2025', type: 'GST', dueDate: '2025-02-11', status: 'Pending', amount: 0 },
  ];

  const gstSummary = {
    outputGST: 4850000,
    inputGST: 3200000,
    netPayable: 1650000,
    cgst: 825000,
    sgst: 825000,
    igst: 0
  };

  const tdsSummary = {
    section194A: 450000,
    section194C: 280000,
    section194J: 320000,
    section194I: 120000
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Filed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const stats = {
    totalTaxPaid: taxReports.filter(t => t.status === 'Filed').reduce((sum, t) => sum + t.amount, 0),
    pendingAmount: taxReports.filter(t => t.status === 'Pending').reduce((sum, t) => sum + t.amount, 0),
    filed: taxReports.filter(t => t.status === 'Filed').length,
    pending: taxReports.filter(t => t.status === 'Pending').length
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Receipt className="w-8 h-8 text-lime-600" />Tax Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Generate and manage tax compliance reports</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="Q3-FY2025">Q3 FY 2024-25</option>
            <option value="Q2-FY2025">Q2 FY 2024-25</option>
            <option value="Q1-FY2025">Q1 FY 2024-25</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-lime-600 text-white rounded-lg text-sm font-medium hover:bg-lime-700">
            <Download className="w-4 h-4" />Export All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Tax Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalTaxPaid)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Liability</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Returns Filed</p>
              <p className="text-2xl font-bold text-lime-600">{stats.filed}</p>
            </div>
            <FileText className="w-8 h-8 text-lime-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Returns Pending</p>
              <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
            </div>
            <Calendar className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Receipt className="w-5 h-5 text-lime-600" />GST Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Output GST (Sales)</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(gstSummary.outputGST)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Input GST (Purchases)</span><span className="text-sm font-medium text-green-600">({formatCurrency(gstSummary.inputGST)})</span></div>
            <div className="flex justify-between py-2 bg-lime-50 dark:bg-lime-900/20 px-2 rounded"><span className="text-sm font-semibold text-gray-900 dark:text-white">Net GST Payable</span><span className="text-sm font-bold text-lime-600">{formatCurrency(gstSummary.netPayable)}</span></div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">CGST</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(gstSummary.cgst)}</p></div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">SGST</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(gstSummary.sgst)}</p></div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">IGST</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(gstSummary.igst)}</p></div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-lime-600" />TDS Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Section 194A - Interest</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(tdsSummary.section194A)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Section 194C - Contractors</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(tdsSummary.section194C)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Section 194J - Professional</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(tdsSummary.section194J)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Section 194I - Rent</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(tdsSummary.section194I)}</span></div>
            <div className="flex justify-between py-2 bg-lime-50 dark:bg-lime-900/20 px-2 rounded mt-2"><span className="text-sm font-semibold text-gray-900 dark:text-white">Total TDS</span><span className="text-sm font-bold text-lime-600">{formatCurrency(Object.values(tdsSummary).reduce((a, b) => a + b, 0))}</span></div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tax Returns & Filings</h2>
          <select value={selectedTaxType} onChange={(e) => setSelectedTaxType(e.target.value)} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Types</option>
            <option value="GST">GST</option>
            <option value="TDS">TDS</option>
            <option value="Income Tax">Income Tax</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Report Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Period</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {taxReports.filter(r => selectedTaxType === 'all' || r.type === selectedTaxType).map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{report.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{report.period}</td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{report.type}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(report.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{report.amount > 0 ? formatCurrency(report.amount) : '-'}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(report.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><FileText className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Download"><Download className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
