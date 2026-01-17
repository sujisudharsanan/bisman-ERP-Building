'use client';

import React, { useState, useMemo } from 'react';
import { FileText, Plus, Search, Eye, Edit2, Check, X, Send, Clock, CheckCircle, AlertCircle, Building2, Calendar, DollarSign } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  glAccount: string;
  costCenter: string;
  status: 'Pending' | 'Posted' | 'Rejected' | 'On Hold';
  poNumber: string;
}

export default function InvoicePostingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  const invoices: Invoice[] = [
    { id: 'INV-001', invoiceNumber: 'VND-2025-0123', vendor: 'ABC Suppliers Pvt Ltd', invoiceDate: '2025-01-10', dueDate: '2025-02-09', amount: 450000, taxAmount: 81000, totalAmount: 531000, glAccount: '5001 - COGS', costCenter: 'CC-MFG-001', status: 'Pending', poNumber: 'PO-2025-0089' },
    { id: 'INV-002', invoiceNumber: 'VND-2025-0124', vendor: 'XYZ Manufacturing Co', invoiceDate: '2025-01-12', dueDate: '2025-02-26', amount: 180000, taxAmount: 32400, totalAmount: 212400, glAccount: '5002 - Raw Materials', costCenter: 'CC-MFG-002', status: 'Pending', poNumber: 'PO-2025-0092' },
    { id: 'INV-003', invoiceNumber: 'VND-2025-0125', vendor: 'Tech Components Inc', invoiceDate: '2025-01-08', dueDate: '2025-02-07', amount: 320000, taxAmount: 57600, totalAmount: 377600, glAccount: '5003 - Components', costCenter: 'CC-IT-001', status: 'Posted', poNumber: 'PO-2025-0078' },
    { id: 'INV-004', invoiceNumber: 'VND-2025-0126', vendor: 'Office World', invoiceDate: '2025-01-15', dueDate: '2025-01-30', amount: 25000, taxAmount: 4500, totalAmount: 29500, glAccount: '5101 - Office Supplies', costCenter: 'CC-ADM-001', status: 'On Hold', poNumber: 'PO-2025-0098' },
    { id: 'INV-005', invoiceNumber: 'VND-2025-0127', vendor: 'Logistics Pro', invoiceDate: '2025-01-14', dueDate: '2025-02-13', amount: 75000, taxAmount: 13500, totalAmount: 88500, glAccount: '5200 - Freight', costCenter: 'CC-LOG-001', status: 'Rejected', poNumber: 'PO-2025-0095' },
    { id: 'INV-006', invoiceNumber: 'VND-2025-0128', vendor: 'Premium Packaging Solutions', invoiceDate: '2025-01-13', dueDate: '2025-01-28', amount: 95000, taxAmount: 17100, totalAmount: 112100, glAccount: '5004 - Packaging', costCenter: 'CC-MFG-001', status: 'Pending', poNumber: 'PO-2025-0088' },
  ];

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.poNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    pending: invoices.filter(i => i.status === 'Pending').length,
    pendingAmount: invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + i.totalAmount, 0),
    posted: invoices.filter(i => i.status === 'Posted').length,
    onHold: invoices.filter(i => i.status === 'On Hold').length
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Posted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'On Hold': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    };
    const icons = { Pending: Clock, Posted: CheckCircle, Rejected: AlertCircle, 'On Hold': Clock };
    const Icon = icons[status as keyof typeof icons];
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}><Icon className="w-3 h-3" />{status}</span>;
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvoices(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.filter(i => i.status === 'Pending').length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.filter(i => i.status === 'Pending').map(i => i.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-rose-600" />Invoice Posting
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Review and post vendor invoices to general ledger</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedInvoices.size > 0 && (
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              <Check className="w-4 h-4" />Post Selected ({selectedInvoices.size})
            </button>
          )}
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700">
            <Plus className="w-4 h-4" />New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Invoices</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Amount</p>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(stats.pendingAmount)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-rose-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Posted Today</p>
              <p className="text-2xl font-bold text-green-600">{stats.posted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">On Hold</p>
              <p className="text-2xl font-bold text-gray-600">{stats.onHold}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Posted">Posted</option>
            <option value="Rejected">Rejected</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selectedInvoices.size === filteredInvoices.filter(i => i.status === 'Pending').length && selectedInvoices.size > 0} onChange={toggleSelectAll} className="rounded border-gray-300" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Dates</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">GL Account</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tax</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    {inv.status === 'Pending' && (
                      <input type="checkbox" checked={selectedInvoices.has(inv.id)} onChange={() => toggleSelect(inv.id)} className="rounded border-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-rose-600">{inv.invoiceNumber}</div>
                    <div className="text-xs text-gray-500">PO: {inv.poNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{inv.vendor}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600 dark:text-gray-300">Inv: {new Date(inv.invoiceDate).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{inv.glAccount}</div>
                    <div className="text-xs text-gray-500">{inv.costCenter}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">{formatCurrency(inv.taxAmount)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(inv.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {inv.status === 'Pending' && (
                        <>
                          <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Post"><Check className="w-4 h-4 text-green-600" /></button>
                          <button className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="Reject"><X className="w-4 h-4 text-red-600" /></button>
                        </>
                      )}
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
