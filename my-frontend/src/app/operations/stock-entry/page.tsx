'use client';

import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit2, CheckCircle, Clock, AlertCircle, Calendar, Warehouse } from 'lucide-react';

interface StockEntry {
  id: string;
  entryNumber: string;
  type: 'Receipt' | 'Issue' | 'Transfer' | 'Adjustment';
  date: string;
  warehouse: string;
  targetWarehouse?: string;
  items: number;
  totalQty: number;
  reference: string;
  status: 'Draft' | 'Submitted' | 'Completed' | 'Cancelled';
  createdBy: string;
}

export default function StockEntryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const stockEntries: StockEntry[] = [
    { id: 'SE-001', entryNumber: 'SE-2025-0156', type: 'Receipt', date: '2025-01-15', warehouse: 'Main Warehouse', items: 5, totalQty: 500, reference: 'PO-2025-0089', status: 'Completed', createdBy: 'Warehouse Manager' },
    { id: 'SE-002', entryNumber: 'SE-2025-0157', type: 'Issue', date: '2025-01-15', warehouse: 'Main Warehouse', items: 3, totalQty: 150, reference: 'SO-2025-0123', status: 'Completed', createdBy: 'Store Keeper' },
    { id: 'SE-003', entryNumber: 'SE-2025-0158', type: 'Transfer', date: '2025-01-14', warehouse: 'Main Warehouse', targetWarehouse: 'Branch Warehouse', items: 8, totalQty: 320, reference: 'TR-2025-0045', status: 'Submitted', createdBy: 'Warehouse Manager' },
    { id: 'SE-004', entryNumber: 'SE-2025-0159', type: 'Adjustment', date: '2025-01-14', warehouse: 'Main Warehouse', items: 2, totalQty: -25, reference: 'ADJ-2025-0012', status: 'Draft', createdBy: 'Inventory Controller' },
    { id: 'SE-005', entryNumber: 'SE-2025-0160', type: 'Receipt', date: '2025-01-13', warehouse: 'Branch Warehouse', items: 12, totalQty: 1200, reference: 'PO-2025-0092', status: 'Completed', createdBy: 'Store Keeper' },
    { id: 'SE-006', entryNumber: 'SE-2025-0161', type: 'Issue', date: '2025-01-13', warehouse: 'Main Warehouse', items: 6, totalQty: 280, reference: 'WO-2025-0034', status: 'Completed', createdBy: 'Production Manager' },
  ];

  const filteredEntries = useMemo(() => {
    return stockEntries.filter((entry) => {
      const matchesSearch = entry.entryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  const stats = {
    receipts: stockEntries.filter(e => e.type === 'Receipt').length,
    issues: stockEntries.filter(e => e.type === 'Issue').length,
    transfers: stockEntries.filter(e => e.type === 'Transfer').length,
    pending: stockEntries.filter(e => e.status === 'Draft' || e.status === 'Submitted').length
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Receipt': return <ArrowDown className="w-4 h-4 text-green-600" />;
      case 'Issue': return <ArrowUp className="w-4 h-4 text-red-600" />;
      case 'Transfer': return <ArrowUpDown className="w-4 h-4 text-blue-600" />;
      default: return <Package className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Receipt: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Issue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Adjustment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}>{getTypeIcon(type)}{type}</span>;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Submitted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-indigo-600" />Stock Entry
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage stock receipts, issues, transfers, and adjustments</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" />New Stock Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receipts</p>
              <p className="text-2xl font-bold text-green-600">{stats.receipts}</p>
            </div>
            <ArrowDown className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Issues</p>
              <p className="text-2xl font-bold text-red-600">{stats.issues}</p>
            </div>
            <ArrowUp className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transfers</p>
              <p className="text-2xl font-bold text-blue-600">{stats.transfers}</p>
            </div>
            <ArrowUpDown className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search entries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Types</option>
            <option value="Receipt">Receipt</option>
            <option value="Issue">Issue</option>
            <option value="Transfer">Transfer</option>
            <option value="Adjustment">Adjustment</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entry Number</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-indigo-600">{entry.entryNumber}</div>
                    <div className="text-xs text-gray-500">{entry.createdBy}</div>
                  </td>
                  <td className="px-4 py-3 text-center">{getTypeBadge(entry.type)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Warehouse className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{entry.warehouse}</span>
                    </div>
                    {entry.targetWarehouse && (
                      <div className="text-xs text-gray-500 ml-5">→ {entry.targetWarehouse}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{entry.reference}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">{entry.items}</td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${entry.totalQty < 0 ? 'text-red-600' : 'text-green-600'}`}>{entry.totalQty > 0 ? '+' : ''}{entry.totalQty}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(entry.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {entry.status === 'Draft' && <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>}
                      {entry.status === 'Submitted' && <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Complete"><CheckCircle className="w-4 h-4 text-green-600" /></button>}
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
