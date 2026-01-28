'use client';

import React, { useState, useMemo } from 'react';
import { Wrench, Plus, Search, Eye, Edit2, Play, Pause, CheckCircle, Clock, AlertTriangle, Calendar, Package, Users, Settings } from 'lucide-react';

interface WorkOrder {
  id: string;
  orderNumber: string;
  product: string;
  productCode: string;
  quantity: number;
  unit: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  completedQty: number;
  status: 'Draft' | 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  workstation: string;
  assignedTo: string;
}

export default function WorkOrderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const workOrders: WorkOrder[] = [
    { id: 'WO-001', orderNumber: 'WO-2025-0034', product: 'Assembly Unit A', productCode: 'ASM-001', quantity: 100, unit: 'Units', plannedStart: '2025-01-15', plannedEnd: '2025-01-20', actualStart: '2025-01-15', completedQty: 45, status: 'In Progress', priority: 'High', workstation: 'Assembly Line 1', assignedTo: 'Production Team A' },
    { id: 'WO-002', orderNumber: 'WO-2025-0035', product: 'Component B', productCode: 'CMP-002', quantity: 500, unit: 'Pieces', plannedStart: '2025-01-16', plannedEnd: '2025-01-18', completedQty: 0, status: 'Not Started', priority: 'Medium', workstation: 'CNC Machine 2', assignedTo: 'Machining Team' },
    { id: 'WO-003', orderNumber: 'WO-2025-0036', product: 'Finished Product X', productCode: 'FP-X01', quantity: 50, unit: 'Units', plannedStart: '2025-01-14', plannedEnd: '2025-01-17', actualStart: '2025-01-14', completedQty: 50, status: 'Completed', priority: 'High', workstation: 'Final Assembly', assignedTo: 'Production Team B' },
    { id: 'WO-004', orderNumber: 'WO-2025-0037', product: 'Sub-Assembly C', productCode: 'SUB-003', quantity: 200, unit: 'Units', plannedStart: '2025-01-17', plannedEnd: '2025-01-22', completedQty: 0, status: 'Draft', priority: 'Low', workstation: 'Assembly Line 2', assignedTo: 'Unassigned' },
    { id: 'WO-005', orderNumber: 'WO-2025-0038', product: 'Part D', productCode: 'PRT-004', quantity: 1000, unit: 'Pieces', plannedStart: '2025-01-13', plannedEnd: '2025-01-15', actualStart: '2025-01-13', completedQty: 650, status: 'On Hold', priority: 'Critical', workstation: 'CNC Machine 1', assignedTo: 'Machining Team' },
    { id: 'WO-006', orderNumber: 'WO-2025-0039', product: 'Assembly Unit E', productCode: 'ASM-005', quantity: 75, unit: 'Units', plannedStart: '2025-01-18', plannedEnd: '2025-01-23', completedQty: 0, status: 'Not Started', priority: 'Medium', workstation: 'Assembly Line 1', assignedTo: 'Production Team A' },
  ];

  const filteredOrders = useMemo(() => {
    return workOrders.filter((order) => {
      const matchesSearch = order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.productCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    total: workOrders.length,
    inProgress: workOrders.filter(o => o.status === 'In Progress').length,
    completed: workOrders.filter(o => o.status === 'Completed').length,
    onHold: workOrders.filter(o => o.status === 'On Hold').length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      'Not Started': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'On Hold': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      Low: 'text-gray-500',
      Medium: 'text-blue-600',
      High: 'text-orange-600',
      Critical: 'text-red-600'
    };
    return <span className={`text-xs font-medium ${styles[priority]}`}>{priority}</span>;
  };

  const getProgress = (order: WorkOrder) => {
    return Math.round((order.completedQty / order.quantity) * 100);
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Wrench className="w-8 h-8 text-orange-600" />Work Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage production work orders and track progress</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
          <Plus className="w-4 h-4" />Create Work Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Wrench className="w-8 h-8 text-gray-400 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            <Settings className="w-8 h-8 text-yellow-600 opacity-50 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">On Hold</p>
              <p className="text-2xl font-bold text-orange-600">{stats.onHold}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search work orders..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Work Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Quantity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Schedule</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Workstation</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-orange-600">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3 h-3" />{order.assignedTo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900 dark:text-white">{order.product}</div>
                        <div className="text-xs text-gray-500">{order.productCode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 dark:text-white">{order.quantity} {order.unit}</div>
                    <div className="text-xs text-gray-500">Completed: {order.completedQty}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600 dark:text-gray-300">Start: {new Date(order.plannedStart).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-500">End: {new Date(order.plannedEnd).toLocaleDateString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">{getProgress(order)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${order.status === 'Completed' ? 'bg-green-600' : 'bg-orange-600'}`} style={{ width: `${getProgress(order)}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{order.workstation}</td>
                  <td className="px-4 py-3 text-center">{getPriorityBadge(order.priority)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {order.status === 'Not Started' && <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Start"><Play className="w-4 h-4 text-green-600" /></button>}
                      {order.status === 'In Progress' && <button className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded" title="Pause"><Pause className="w-4 h-4 text-orange-600" /></button>}
                      {(order.status === 'Draft' || order.status === 'Not Started') && <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>}
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
