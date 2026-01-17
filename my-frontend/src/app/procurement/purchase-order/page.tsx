'use client';

import React, { useState } from 'react';
import { FileText, Plus, Search, Eye, Edit2, Send, Printer, CheckCircle, Clock, XCircle, DollarSign, Truck, Package } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  poDate: string;
  vendor: string;
  vendorCode: string;
  deliveryDate: string;
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentTerms: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Sent to Vendor' | 'Partially Received' | 'Completed' | 'Cancelled';
  createdBy: string;
  approvedBy?: string;
  approvedDate?: string;
}

export default function PurchaseOrderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const orders: PurchaseOrder[] = [
    { id: 'PO-001', poNumber: 'PO-2025-001', poDate: '2025-01-15', vendor: 'ABC Supplies Co.', vendorCode: 'VND-001', deliveryDate: '2025-01-25', itemCount: 8, subtotal: 250000, tax: 45000, total: 295000, currency: 'INR', paymentTerms: 'Net 30', status: 'Sent to Vendor', createdBy: 'Procurement Officer', approvedBy: 'Procurement Head', approvedDate: '2025-01-15' },
    { id: 'PO-002', poNumber: 'PO-2025-002', poDate: '2025-01-14', vendor: 'Tech Solutions Ltd', vendorCode: 'VND-005', deliveryDate: '2025-01-28', itemCount: 5, subtotal: 180000, tax: 32400, total: 212400, currency: 'INR', paymentTerms: 'Net 15', status: 'Partially Received', createdBy: 'Procurement Officer', approvedBy: 'IT Manager', approvedDate: '2025-01-14' },
    { id: 'PO-003', poNumber: 'PO-2025-003', poDate: '2025-01-14', vendor: 'Industrial Parts Inc', vendorCode: 'VND-003', deliveryDate: '2025-02-05', itemCount: 12, subtotal: 450000, tax: 81000, total: 531000, currency: 'INR', paymentTerms: 'Net 45', status: 'Pending Approval', createdBy: 'Production Manager' },
    { id: 'PO-004', poNumber: 'PO-2025-004', poDate: '2025-01-13', vendor: 'Office Supplies Pro', vendorCode: 'VND-008', deliveryDate: '2025-01-20', itemCount: 15, subtotal: 35000, tax: 6300, total: 41300, currency: 'INR', paymentTerms: 'Net 30', status: 'Completed', createdBy: 'Admin Officer', approvedBy: 'Admin Manager', approvedDate: '2025-01-13' },
    { id: 'PO-005', poNumber: 'PO-2025-005', poDate: '2025-01-12', vendor: 'Raw Materials Corp', vendorCode: 'VND-002', deliveryDate: '2025-01-22', itemCount: 6, subtotal: 380000, tax: 68400, total: 448400, currency: 'INR', paymentTerms: 'Net 30', status: 'Approved', createdBy: 'Procurement Officer', approvedBy: 'Procurement Head', approvedDate: '2025-01-12' },
    { id: 'PO-006', poNumber: 'PO-2025-006', poDate: '2025-01-15', vendor: 'Packaging Solutions', vendorCode: 'VND-010', deliveryDate: '2025-02-01', itemCount: 4, subtotal: 95000, tax: 17100, total: 112100, currency: 'INR', paymentTerms: 'Net 15', status: 'Draft', createdBy: 'Production Assistant' },
  ];

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.vendorCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending Approval').length,
    inProgress: orders.filter(o => ['Approved', 'Sent to Vendor', 'Partially Received'].includes(o.status)).length,
    totalValue: orders.filter(o => o.status !== 'Cancelled' && o.status !== 'Draft').reduce((sum, o) => sum + o.total, 0)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      'Pending Approval': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Sent to Vendor': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Partially Received': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      Completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />Purchase Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create and manage purchase orders to vendors</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" />Create PO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
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
            <Truck className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-green-600">₹{(stats.totalValue / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search PO number, vendor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Sent to Vendor">Sent to Vendor</option>
            <option value="Partially Received">Partially Received</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">PO Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Delivery Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Subtotal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tax</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{order.poNumber}</div>
                      <div className="text-xs text-gray-500">{new Date(order.poDate).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{order.vendor}</div>
                    <div className="text-xs text-gray-500">{order.vendorCode}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(order.deliveryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <Package className="w-4 h-4" />{order.itemCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">₹{order.subtotal.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">₹{order.tax.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">₹{order.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {order.status === 'Draft' && (
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      )}
                      {(order.status === 'Approved' || order.status === 'Sent to Vendor') && (
                        <button className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="Print"><Printer className="w-4 h-4 text-blue-600" /></button>
                      )}
                      {order.status === 'Approved' && (
                        <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Send"><Send className="w-4 h-4 text-green-600" /></button>
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
