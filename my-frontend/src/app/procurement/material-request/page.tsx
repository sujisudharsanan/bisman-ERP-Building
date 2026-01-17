'use client';

import React, { useState } from 'react';
import { ShoppingCart, Plus, Search, Eye, Edit2, Send, CheckCircle, Clock, XCircle, DollarSign, Package, AlertTriangle } from 'lucide-react';

interface MaterialRequest {
  id: string;
  requestNumber: string;
  requestDate: string;
  requiredDate: string;
  requestedBy: string;
  department: string;
  itemCount: number;
  totalValue: number;
  currency: string;
  purpose: string;
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Ordered' | 'Fulfilled';
  approver?: string;
  approvedDate?: string;
}

export default function MaterialRequestPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const requests: MaterialRequest[] = [
    { id: 'MR-001', requestNumber: 'MR-2025-001', requestDate: '2025-01-15', requiredDate: '2025-01-25', requestedBy: 'Rajesh Kumar', department: 'Production', itemCount: 5, totalValue: 125000, currency: 'INR', purpose: 'Raw materials for new batch', priority: 'High', status: 'Pending Approval', approver: 'Production Manager' },
    { id: 'MR-002', requestNumber: 'MR-2025-002', requestDate: '2025-01-14', requiredDate: '2025-01-20', requestedBy: 'Priya Sharma', department: 'IT', itemCount: 3, totalValue: 85000, currency: 'INR', purpose: 'Hardware upgrade', priority: 'Normal', status: 'Approved', approver: 'IT Manager', approvedDate: '2025-01-15' },
    { id: 'MR-003', requestNumber: 'MR-2025-003', requestDate: '2025-01-14', requiredDate: '2025-01-18', requestedBy: 'Amit Patel', department: 'Maintenance', itemCount: 8, totalValue: 45000, currency: 'INR', purpose: 'Spare parts for machinery', priority: 'Urgent', status: 'Ordered', approver: 'Operations Head', approvedDate: '2025-01-14' },
    { id: 'MR-004', requestNumber: 'MR-2025-004', requestDate: '2025-01-13', requiredDate: '2025-01-30', requestedBy: 'Sunita Devi', department: 'Admin', itemCount: 12, totalValue: 35000, currency: 'INR', purpose: 'Office supplies', priority: 'Low', status: 'Fulfilled', approver: 'Admin Manager', approvedDate: '2025-01-13' },
    { id: 'MR-005', requestNumber: 'MR-2025-005', requestDate: '2025-01-12', requiredDate: '2025-01-22', requestedBy: 'Vikram Singh', department: 'Quality', itemCount: 4, totalValue: 95000, currency: 'INR', purpose: 'Testing equipment', priority: 'High', status: 'Rejected', approver: 'Quality Manager', approvedDate: '2025-01-13' },
    { id: 'MR-006', requestNumber: 'MR-2025-006', requestDate: '2025-01-15', requiredDate: '2025-01-28', requestedBy: 'Meera Joshi', department: 'HR', itemCount: 2, totalValue: 15000, currency: 'INR', purpose: 'Training materials', priority: 'Normal', status: 'Draft' },
  ];

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'Pending Approval').length,
    approved: requests.filter(r => r.status === 'Approved' || r.status === 'Ordered' || r.status === 'Fulfilled').length,
    totalValue: requests.filter(r => r.status !== 'Rejected' && r.status !== 'Draft').reduce((sum, r) => sum + r.totalValue, 0)
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      'Pending Approval': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Ordered: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Fulfilled: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      Urgent: 'bg-red-100 text-red-700',
      High: 'bg-orange-100 text-orange-700',
      Normal: 'bg-blue-100 text-blue-700',
      Low: 'bg-gray-100 text-gray-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>{priority}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-cyan-600" />Material Requests
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create and manage material requisitions</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">
          <Plus className="w-4 h-4" />New Request
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cyan-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-cyan-600">₹{(stats.totalValue / 1000).toFixed(0)}K</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Ordered">Ordered</option>
            <option value="Fulfilled">Fulfilled</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Priority</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Request #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Requested By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Purpose</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Required By</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{req.requestNumber}</div>
                      <div className="text-xs text-gray-500">{new Date(req.requestDate).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{req.requestedBy}</div>
                    <div className="text-xs text-gray-500">{req.department}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{req.purpose}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <Package className="w-4 h-4" />{req.itemCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">₹{req.totalValue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(req.requiredDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">{getPriorityBadge(req.priority)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(req.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {req.status === 'Draft' && (
                        <>
                          <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                          <button className="p-1.5 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded" title="Submit"><Send className="w-4 h-4 text-cyan-600" /></button>
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
