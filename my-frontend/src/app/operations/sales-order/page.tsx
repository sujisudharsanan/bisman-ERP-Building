'use client';

import React, { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Search, Eye, Edit2, CheckCircle, Clock, XCircle, DollarSign, User, Calendar, Package, Send, FileText } from 'lucide-react';

interface SalesOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  customer: string;
  customerCode: string;
  deliveryDate: string;
  items: number;
  totalAmount: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'In Production' | 'Ready to Ship' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  salesPerson: string;
}

export default function SalesOrderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const salesOrders: SalesOrder[] = [
    { id: 'SO-001', orderNumber: 'SO-2025-0123', orderDate: '2025-01-12', customer: 'ABC Corporation', customerCode: 'CUST-001', deliveryDate: '2025-01-25', items: 5, totalAmount: 1850000, status: 'Approved', paymentStatus: 'Partial', salesPerson: 'John Smith' },
    { id: 'SO-002', orderNumber: 'SO-2025-0124', orderDate: '2025-01-13', customer: 'XYZ Industries Ltd', customerCode: 'CUST-002', deliveryDate: '2025-01-28', items: 3, totalAmount: 750000, status: 'In Production', paymentStatus: 'Pending', salesPerson: 'Sarah Johnson' },
    { id: 'SO-003', orderNumber: 'SO-2025-0125', orderDate: '2025-01-14', customer: 'Global Tech Solutions', customerCode: 'CUST-003', deliveryDate: '2025-01-20', items: 8, totalAmount: 3200000, status: 'Ready to Ship', paymentStatus: 'Paid', salesPerson: 'John Smith' },
    { id: 'SO-004', orderNumber: 'SO-2025-0126', orderDate: '2025-01-15', customer: 'Retail Solutions Pvt Ltd', customerCode: 'CUST-004', deliveryDate: '2025-02-01', items: 12, totalAmount: 4500000, status: 'Draft', paymentStatus: 'Pending', salesPerson: 'Mike Wilson' },
    { id: 'SO-005', orderNumber: 'SO-2025-0127', orderDate: '2025-01-10', customer: 'Manufacturing Hub', customerCode: 'CUST-005', deliveryDate: '2025-01-18', items: 6, totalAmount: 2100000, status: 'Delivered', paymentStatus: 'Paid', salesPerson: 'Sarah Johnson' },
    { id: 'SO-006', orderNumber: 'SO-2025-0128', orderDate: '2025-01-15', customer: 'Quality Products Inc', customerCode: 'CUST-006', deliveryDate: '2025-01-30', items: 4, totalAmount: 980000, status: 'Submitted', paymentStatus: 'Pending', salesPerson: 'Mike Wilson' },
  ];

  const filteredOrders = useMemo(() => {
    return salesOrders.filter((order) => {
      const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    totalOrders: salesOrders.length,
    totalValue: salesOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    pending: salesOrders.filter(o => ['Draft', 'Submitted', 'Approved'].includes(o.status)).length,
    delivered: salesOrders.filter(o => o.status === 'Delivered').length
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Approved: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'In Production': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Ready to Ship': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      Delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getPaymentBadge = (status: string) => {
    const styles: Record<string, string> = {
      Pending: 'text-red-600',
      Partial: 'text-yellow-600',
      Paid: 'text-green-600'
    };
    return <span className={`text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-purple-600" />Sales Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage customer sales orders and fulfillment</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
          <Plus className="w-4 h-4" />New Sales Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
            </div>
            <ShoppingCart className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Process</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="In Production">In Production</option>
            <option value="Ready to Ship">Ready to Ship</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order Number</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Delivery Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-purple-600">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><User className="w-3 h-3" />{order.salesPerson}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 dark:text-white">{order.customer}</div>
                    <div className="text-xs text-gray-500">{order.customerCode}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(order.deliveryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">{order.items}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-4 py-3 text-center">{getPaymentBadge(order.paymentStatus)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {order.status === 'Draft' && <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>}
                      {order.status === 'Draft' && <button className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded" title="Submit"><Send className="w-4 h-4 text-purple-600" /></button>}
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Invoice"><FileText className="w-4 h-4 text-gray-500" /></button>
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
