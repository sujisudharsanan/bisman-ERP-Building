'use client';

import React, { useState, useMemo } from 'react';
import { Book, Search, Filter, Download, Package, TrendingUp, TrendingDown, ArrowUpDown, Calendar, Warehouse, BarChart3 } from 'lucide-react';

interface StockLedgerEntry {
  id: string;
  date: string;
  item: string;
  itemCode: string;
  warehouse: string;
  transactionType: 'Receipt' | 'Issue' | 'Transfer In' | 'Transfer Out' | 'Adjustment';
  reference: string;
  inQty: number;
  outQty: number;
  balance: number;
  rate: number;
  value: number;
}

export default function StockLedgerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [itemFilter, setItemFilter] = useState('');

  const stockLedger: StockLedgerEntry[] = [
    { id: 'SL-001', date: '2025-01-15', item: 'Raw Material A', itemCode: 'RM-001', warehouse: 'Main Warehouse', transactionType: 'Receipt', reference: 'PR-2025-0156', inQty: 500, outQty: 0, balance: 2500, rate: 150, value: 375000 },
    { id: 'SL-002', date: '2025-01-15', item: 'Raw Material A', itemCode: 'RM-001', warehouse: 'Main Warehouse', transactionType: 'Issue', reference: 'WO-2025-0034', inQty: 0, outQty: 100, balance: 2400, rate: 150, value: 360000 },
    { id: 'SL-003', date: '2025-01-14', item: 'Component B', itemCode: 'CMP-002', warehouse: 'Main Warehouse', transactionType: 'Transfer Out', reference: 'TR-2025-0045', inQty: 0, outQty: 200, balance: 800, rate: 250, value: 200000 },
    { id: 'SL-004', date: '2025-01-14', item: 'Component B', itemCode: 'CMP-002', warehouse: 'Branch Warehouse', transactionType: 'Transfer In', reference: 'TR-2025-0045', inQty: 200, outQty: 0, balance: 350, rate: 250, value: 87500 },
    { id: 'SL-005', date: '2025-01-13', item: 'Finished Product X', itemCode: 'FP-X01', warehouse: 'Main Warehouse', transactionType: 'Receipt', reference: 'WO-2025-0036', inQty: 50, outQty: 0, balance: 150, rate: 5000, value: 750000 },
    { id: 'SL-006', date: '2025-01-13', item: 'Finished Product X', itemCode: 'FP-X01', warehouse: 'Main Warehouse', transactionType: 'Issue', reference: 'SO-2025-0125', inQty: 0, outQty: 30, balance: 120, rate: 5000, value: 600000 },
    { id: 'SL-007', date: '2025-01-12', item: 'Raw Material A', itemCode: 'RM-001', warehouse: 'Main Warehouse', transactionType: 'Adjustment', reference: 'ADJ-2025-0012', inQty: 0, outQty: 25, balance: 2000, rate: 150, value: 300000 },
    { id: 'SL-008', date: '2025-01-12', item: 'Sub-Assembly D', itemCode: 'SUB-004', warehouse: 'Main Warehouse', transactionType: 'Receipt', reference: 'WO-2025-0038', inQty: 75, outQty: 0, balance: 225, rate: 1200, value: 270000 },
  ];

  const warehouses = ['Main Warehouse', 'Branch Warehouse'];
  const items = [...new Set(stockLedger.map(e => e.item))];

  const filteredLedger = useMemo(() => {
    return stockLedger.filter((entry) => {
      const matchesSearch = entry.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarehouse = warehouseFilter === 'all' || entry.warehouse === warehouseFilter;
      const matchesItem = !itemFilter || entry.item === itemFilter;
      return matchesSearch && matchesWarehouse && matchesItem;
    });
  }, [searchQuery, warehouseFilter, itemFilter]);

  const stats = {
    totalReceipts: stockLedger.filter(e => e.transactionType === 'Receipt').reduce((sum, e) => sum + e.inQty, 0),
    totalIssues: stockLedger.filter(e => e.transactionType === 'Issue').reduce((sum, e) => sum + e.outQty, 0),
    totalValue: stockLedger.reduce((sum, e) => sum + e.value, 0) / stockLedger.length * 2,
    transactions: stockLedger.length
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Receipt': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'Issue': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'Transfer In': return <ArrowUpDown className="w-4 h-4 text-blue-600" />;
      case 'Transfer Out': return <ArrowUpDown className="w-4 h-4 text-orange-600" />;
      default: return <Package className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Receipt: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Issue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'Transfer In': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Transfer Out': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      Adjustment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[type]}`}>{getTypeIcon(type)}{type}</span>;
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Book className="w-8 h-8 text-cyan-600" />Stock Ledger
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View stock movement history and balances</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">
          <Download className="w-4 h-4" />Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Receipts</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalReceipts}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalIssues}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Stock Value</p>
              <p className="text-2xl font-bold text-cyan-600">{formatCurrency(stats.totalValue)}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-cyan-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.transactions}</p>
            </div>
            <ArrowUpDown className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by item or reference..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Warehouses</option>
            {warehouses.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="">All Items</option>
            {items.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Item</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">In</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Out</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLedger.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">{entry.item}</div>
                        <div className="text-xs text-gray-500">{entry.itemCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Warehouse className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{entry.warehouse}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getTypeBadge(entry.transactionType)}</td>
                  <td className="px-4 py-3 text-sm text-cyan-600">{entry.reference}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600 text-right">{entry.inQty > 0 ? `+${entry.inQty}` : '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600 text-right">{entry.outQty > 0 ? `-${entry.outQty}` : '-'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">{entry.balance}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">{formatCurrency(entry.rate)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(entry.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
