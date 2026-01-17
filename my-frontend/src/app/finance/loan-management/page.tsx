'use client';

import React, { useState, useMemo } from 'react';
import { Wallet, Plus, Search, Calendar, Building2, DollarSign, TrendingUp, Clock, CheckCircle, AlertCircle, Eye, Edit2, FileText } from 'lucide-react';

interface Loan {
  id: string;
  loanNumber: string;
  type: 'Term Loan' | 'Working Capital' | 'Equipment Finance' | 'Overdraft';
  lender: string;
  principal: number;
  interestRate: number;
  tenure: number;
  startDate: string;
  endDate: string;
  emiAmount: number;
  outstanding: number;
  status: 'Active' | 'Closed' | 'Overdue';
  nextPaymentDate: string;
}

export default function LoanManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loans: Loan[] = [
    { id: 'L001', loanNumber: 'LN-2022-001', type: 'Term Loan', lender: 'HDFC Bank', principal: 50000000, interestRate: 9.5, tenure: 60, startDate: '2022-04-01', endDate: '2027-03-31', emiAmount: 1050000, outstanding: 35000000, status: 'Active', nextPaymentDate: '2025-02-01' },
    { id: 'L002', loanNumber: 'LN-2023-002', type: 'Working Capital', lender: 'ICICI Bank', principal: 25000000, interestRate: 10.25, tenure: 12, startDate: '2024-06-15', endDate: '2025-06-14', emiAmount: 2200000, outstanding: 15500000, status: 'Active', nextPaymentDate: '2025-02-15' },
    { id: 'L003', loanNumber: 'LN-2021-003', type: 'Equipment Finance', lender: 'Axis Bank', principal: 15000000, interestRate: 8.75, tenure: 48, startDate: '2021-08-01', endDate: '2025-07-31', emiAmount: 370000, outstanding: 2960000, status: 'Active', nextPaymentDate: '2025-02-01' },
    { id: 'L004', loanNumber: 'LN-2024-004', type: 'Overdraft', lender: 'State Bank of India', principal: 10000000, interestRate: 11.0, tenure: 12, startDate: '2024-09-01', endDate: '2025-08-31', emiAmount: 0, outstanding: 7500000, status: 'Active', nextPaymentDate: '2025-01-31' },
    { id: 'L005', loanNumber: 'LN-2020-005', type: 'Term Loan', lender: 'Kotak Bank', principal: 30000000, interestRate: 9.0, tenure: 48, startDate: '2020-01-15', endDate: '2024-01-14', emiAmount: 750000, outstanding: 0, status: 'Closed', nextPaymentDate: '-' },
  ];

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const matchesSearch = loan.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.lender.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    totalPrincipal: loans.filter(l => l.status === 'Active').reduce((sum, l) => sum + l.principal, 0),
    totalOutstanding: loans.filter(l => l.status === 'Active').reduce((sum, l) => sum + l.outstanding, 0),
    activeLoans: loans.filter(l => l.status === 'Active').length,
    monthlyEmi: loans.filter(l => l.status === 'Active').reduce((sum, l) => sum + l.emiAmount, 0)
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles = {
      Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Closed: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>{status}</span>;
  };

  const getProgress = (loan: Loan) => {
    if (loan.status === 'Closed') return 100;
    const paid = loan.principal - loan.outstanding;
    return Math.round((paid / loan.principal) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-emerald-600" />Loan Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track and manage company loans and borrowings</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" />Add Loan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Principal</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalPrincipal)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Loans</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.activeLoans}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly EMI</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.monthlyEmi)}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search loans..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Loan Details</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Lender</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Principal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Interest</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">EMI</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Outstanding</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Progress</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Next Payment</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{loan.loanNumber}</div>
                        <div className="text-xs text-gray-500">{loan.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{loan.lender}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(loan.principal)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">{loan.interestRate}% p.a.</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{loan.emiAmount > 0 ? formatCurrency(loan.emiAmount) : '-'}</td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${loan.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(loan.outstanding)}</td>
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">{getProgress(loan)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${loan.status === 'Closed' ? 'bg-gray-400' : 'bg-emerald-600'}`} style={{ width: `${getProgress(loan)}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-center">{loan.nextPaymentDate !== '-' ? new Date(loan.nextPaymentDate).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(loan.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Schedule"><Calendar className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Documents"><FileText className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Showing {filteredLoans.length} of {loans.length} loans</span>
            <div className="flex items-center gap-4">
              <span className="text-gray-500">Total Outstanding: <span className="font-semibold text-red-600">{formatCurrency(stats.totalOutstanding)}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
