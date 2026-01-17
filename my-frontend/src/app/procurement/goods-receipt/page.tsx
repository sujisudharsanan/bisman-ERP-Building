'use client';

import React, { useState } from 'react';
import { Package, Plus, Search, Eye, Edit2, Truck, DollarSign, Clock, CheckCircle, AlertTriangle, Calendar, ClipboardCheck } from 'lucide-react';

interface GoodsReceipt {
  id: string;
  grnNumber: string;
  grnDate: string;
  poNumber: string;
  vendor: string;
  deliveryNote: string;
  itemsExpected: number;
  itemsReceived: number;
  itemsRejected: number;
  totalValue: number;
  currency: string;
  receivedBy: string;
  warehouse: string;
  status: 'Pending Inspection' | 'Partially Received' | 'Fully Received' | 'Quality Hold' | 'Completed' | 'Returned';
  qualityStatus: 'Pending' | 'Passed' | 'Failed' | 'Partial Pass';
}

export default function GoodsReceiptPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const receipts: GoodsReceipt[] = [
    { id: 'GRN-001', grnNumber: 'GRN-2025-001', grnDate: '2025-01-15', poNumber: 'PO-2025-001', vendor: 'ABC Supplies Co.', deliveryNote: 'DN-45678', itemsExpected: 8, itemsReceived: 8, itemsRejected: 0, totalValue: 295000, currency: 'INR', receivedBy: 'Warehouse Staff', warehouse: 'Main Warehouse', status: 'Completed', qualityStatus: 'Passed' },
    { id: 'GRN-002', grnNumber: 'GRN-2025-002', grnDate: '2025-01-15', poNumber: 'PO-2025-002', vendor: 'Tech Solutions Ltd', deliveryNote: 'DN-45679', itemsExpected: 5, itemsReceived: 3, itemsRejected: 0, totalValue: 127440, currency: 'INR', receivedBy: 'IT Admin', warehouse: 'IT Store', status: 'Partially Received', qualityStatus: 'Passed' },
    { id: 'GRN-003', grnNumber: 'GRN-2025-003', grnDate: '2025-01-14', poNumber: 'PO-2024-089', vendor: 'Raw Materials Corp', deliveryNote: 'DN-45680', itemsExpected: 10, itemsReceived: 10, itemsRejected: 2, totalValue: 380000, currency: 'INR', receivedBy: 'QC Inspector', warehouse: 'Raw Material Store', status: 'Quality Hold', qualityStatus: 'Partial Pass' },
    { id: 'GRN-004', grnNumber: 'GRN-2025-004', grnDate: '2025-01-14', poNumber: 'PO-2025-004', vendor: 'Office Supplies Pro', deliveryNote: 'DN-45681', itemsExpected: 15, itemsReceived: 15, itemsRejected: 0, totalValue: 41300, currency: 'INR', receivedBy: 'Admin Staff', warehouse: 'Admin Store', status: 'Completed', qualityStatus: 'Passed' },
    { id: 'GRN-005', grnNumber: 'GRN-2025-005', grnDate: '2025-01-15', poNumber: 'PO-2025-003', vendor: 'Industrial Parts Inc', deliveryNote: 'DN-45682', itemsExpected: 12, itemsReceived: 12, itemsRejected: 0, totalValue: 531000, currency: 'INR', receivedBy: 'Warehouse Supervisor', warehouse: 'Main Warehouse', status: 'Pending Inspection', qualityStatus: 'Pending' },
    { id: 'GRN-006', grnNumber: 'GRN-2025-006', grnDate: '2025-01-13', poNumber: 'PO-2024-092', vendor: 'Packaging Solutions', deliveryNote: 'DN-45683', itemsExpected: 6, itemsReceived: 6, itemsRejected: 6, totalValue: 112100, currency: 'INR', receivedBy: 'QC Inspector', warehouse: 'Packaging Store', status: 'Returned', qualityStatus: 'Failed' },
  ];

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesSearch = receipt.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: receipts.length,
    pending: receipts.filter(r => r.status === 'Pending Inspection').length,
    completed: receipts.filter(r => r.status === 'Completed').length,
    totalValue: receipts.filter(r => r.status === 'Completed').reduce((sum, r) => sum + r.totalValue, 0),
    rejected: receipts.reduce((sum, r) => sum + r.itemsRejected, 0)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending Inspection': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Partially Received': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'Fully Received': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Quality Hold': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Returned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getQualityBadge = (status: string) => {
    const styles: Record<string, string> = {
      Pending: 'bg-gray-100 text-gray-700',
      Passed: 'bg-green-100 text-green-700',
      Failed: 'bg-red-100 text-red-700',
      'Partial Pass': 'bg-yellow-100 text-yellow-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-green-600" />Goods Receipt
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Receive and inspect incoming materials</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          <Plus className="w-4 h-4" />New GRN
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total GRNs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rejected Items</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Received Value</p>
              <p className="text-2xl font-bold text-green-600">₹{(stats.totalValue / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search GRN, PO, vendor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Pending Inspection">Pending Inspection</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Quality Hold">Quality Hold</option>
            <option value="Completed">Completed</option>
            <option value="Returned">Returned</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">GRN #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">PO / Vendor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Expected</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Received</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rejected</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Quality</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{receipt.grnNumber}</div>
                      <div className="text-xs text-gray-500">{new Date(receipt.grnDate).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{receipt.vendor}</div>
                    <div className="text-xs text-blue-600">{receipt.poNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{receipt.warehouse}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">{receipt.itemsExpected}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-green-600">{receipt.itemsReceived}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-red-600">{receipt.itemsRejected || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">₹{receipt.totalValue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">{getQualityBadge(receipt.qualityStatus)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(receipt.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {receipt.status === 'Pending Inspection' && (
                        <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Inspect"><ClipboardCheck className="w-4 h-4 text-green-600" /></button>
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
