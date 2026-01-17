'use client';

import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, Search, Building2, User, Calendar, CheckCircle, Clock, XCircle, Eye, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface Payment {
  id: string;
  date: string;
  type: 'Incoming' | 'Outgoing';
  party: string;
  partyType: 'Customer' | 'Supplier';
  method: string;
  reference: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed';
}

export default function PaymentEntryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showNewPayment, setShowNewPayment] = useState(false);

  const payments: Payment[] = [
    { id: 'PAY-2025-001', date: '2025-01-15', type: 'Incoming', party: 'ABC Corporation', partyType: 'Customer', method: 'Bank Transfer', reference: 'TXN-78234', amount: 450000, status: 'Completed' },
    { id: 'PAY-2025-002', date: '2025-01-15', type: 'Outgoing', party: 'XYZ Suppliers Ltd', partyType: 'Supplier', method: 'NEFT', reference: 'NEFT-12345', amount: 180000, status: 'Completed' },
    { id: 'PAY-2025-003', date: '2025-01-14', type: 'Incoming', party: 'Global Tech Inc', partyType: 'Customer', method: 'Cheque', reference: 'CHQ-5678', amount: 320000, status: 'Pending' },
    { id: 'PAY-2025-004', date: '2025-01-14', type: 'Outgoing', party: 'Office World', partyType: 'Supplier', method: 'UPI', reference: 'UPI-9876543', amount: 25000, status: 'Completed' },
    { id: 'PAY-2025-005', date: '2025-01-13', type: 'Incoming', party: 'Retail Solutions', partyType: 'Customer', method: 'Bank Transfer', reference: 'TXN-45678', amount: 275000, status: 'Failed' },
    { id: 'PAY-2025-006', date: '2025-01-12', type: 'Outgoing', party: 'Logistics Pro', partyType: 'Supplier', method: 'RTGS', reference: 'RTGS-34567', amount: 550000, status: 'Completed' },
  ];

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch = payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.party.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || payment.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter]);

  const stats = {
    totalIncoming: payments.filter(p => p.type === 'Incoming' && p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0),
    totalOutgoing: payments.filter(p => p.type === 'Outgoing' && p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0),
    pending: payments.filter(p => p.status === 'Pending').length,
    today: payments.filter(p => p.date === '2025-01-15').length
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles = {
      Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    const icons = { Completed: CheckCircle, Pending: Clock, Failed: XCircle };
    const Icon = icons[status as keyof typeof icons];
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}><Icon className="w-3 h-3" />{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-600" />Payment Entry
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Record and manage incoming and outgoing payments</p>
        </div>
        <button onClick={() => setShowNewPayment(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" />New Payment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Received</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalIncoming)}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paid Out</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutgoing)}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's Transactions</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.today}</p>
            </div>
            <Calendar className="w-8 h-8 text-indigo-600 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search payments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Types</option>
            <option value="Incoming">Incoming</option>
            <option value="Outgoing">Outgoing</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Party</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Method</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3"><span className="text-sm font-medium text-indigo-600">{payment.id}</span><div className="text-xs text-gray-500">{payment.reference}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(payment.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${payment.type === 'Incoming' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {payment.type === 'Incoming' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}{payment.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {payment.partyType === 'Customer' ? <User className="w-4 h-4 text-gray-400" /> : <Building2 className="w-4 h-4 text-gray-400" />}
                      <div><div className="text-sm text-gray-900 dark:text-white">{payment.party}</div><div className="text-xs text-gray-500">{payment.partyType}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{payment.method}</td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${payment.type === 'Incoming' ? 'text-green-600' : 'text-red-600'}`}>{payment.type === 'Incoming' ? '+' : '-'}{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(payment.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Receipt"><FileText className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNewPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewPayment(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Payment Entry</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Type</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"><option>Incoming</option><option>Outgoing</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label><input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Party</label><input type="text" placeholder="Customer or Supplier name" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label><select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"><option>Bank Transfer</option><option>NEFT</option><option>RTGS</option><option>UPI</option><option>Cheque</option><option>Cash</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reference</label><input type="text" placeholder="Transaction reference" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label><input type="number" placeholder="0.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewPayment(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg">Cancel</button>
              <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
