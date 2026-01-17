'use client';

import React, { useState } from 'react';
import { MessageSquare, Search, Filter, Eye, Send, Clock, User, CheckCircle, XCircle, AlertTriangle, MessageCircle } from 'lucide-react';

interface Clarification {
  id: string;
  requestNumber: string;
  subject: string;
  description: string;
  category: 'Technical' | 'Process' | 'Data' | 'Approval' | 'General';
  requestedBy: string;
  department: string;
  assignedTo: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Pending Response' | 'Resolved' | 'Closed' | 'Escalated';
  createdDate: string;
  dueDate: string;
  responses: number;
  relatedDocument?: string;
}

export default function ClarificationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const clarifications: Clarification[] = [
    { id: 'CLR-001', requestNumber: 'CLR-2025-001', subject: 'PO Approval Threshold Clarification', description: 'Need clarity on approval limits for purchase orders above ₹5L', category: 'Approval', requestedBy: 'Procurement Officer', department: 'Procurement', assignedTo: 'Finance Manager', priority: 'High', status: 'Open', createdDate: '2025-01-15', dueDate: '2025-01-17', responses: 0, relatedDocument: 'PO-2025-015' },
    { id: 'CLR-002', requestNumber: 'CLR-2025-002', subject: 'Invoice Discrepancy - Vendor ABC', description: 'Invoice amount does not match PO. Need guidance on proceeding.', category: 'Data', requestedBy: 'Accounts Payable', department: 'Finance', assignedTo: 'Procurement Head', priority: 'High', status: 'Pending Response', createdDate: '2025-01-14', dueDate: '2025-01-16', responses: 2, relatedDocument: 'INV-2025-089' },
    { id: 'CLR-003', requestNumber: 'CLR-2025-003', subject: 'Stock Transfer Process Query', description: 'What is the correct procedure for inter-warehouse stock transfer?', category: 'Process', requestedBy: 'Warehouse Staff', department: 'Warehouse', assignedTo: 'Operations Manager', priority: 'Medium', status: 'Resolved', createdDate: '2025-01-13', dueDate: '2025-01-15', responses: 3 },
    { id: 'CLR-004', requestNumber: 'CLR-2025-004', subject: 'System Access Request', description: 'New employee needs access to inventory module', category: 'Technical', requestedBy: 'HR Manager', department: 'HR', assignedTo: 'IT Admin', priority: 'Medium', status: 'Closed', createdDate: '2025-01-12', dueDate: '2025-01-14', responses: 4 },
    { id: 'CLR-005', requestNumber: 'CLR-2025-005', subject: 'Tax Rate Confirmation', description: 'Confirm applicable GST rate for new product category', category: 'General', requestedBy: 'Sales Team', department: 'Sales', assignedTo: 'Tax Consultant', priority: 'High', status: 'Escalated', createdDate: '2025-01-15', dueDate: '2025-01-16', responses: 1 },
    { id: 'CLR-006', requestNumber: 'CLR-2025-006', subject: 'Leave Policy Interpretation', description: 'Clarification needed on carry-forward leave policy', category: 'Process', requestedBy: 'Employee', department: 'Production', assignedTo: 'HR Manager', priority: 'Low', status: 'Open', createdDate: '2025-01-15', dueDate: '2025-01-20', responses: 0 },
  ];

  const filteredClarifications = clarifications.filter((clr) => {
    const matchesSearch = clr.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clr.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clr.requestedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || clr.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || clr.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: clarifications.length,
    open: clarifications.filter(c => c.status === 'Open').length,
    pending: clarifications.filter(c => c.status === 'Pending Response').length,
    resolved: clarifications.filter(c => c.status === 'Resolved' || c.status === 'Closed').length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Pending Response': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      Closed: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Escalated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      High: 'bg-red-100 text-red-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      Low: 'bg-green-100 text-green-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>{priority}</span>;
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      Technical: 'bg-purple-100 text-purple-700',
      Process: 'bg-blue-100 text-blue-700',
      Data: 'bg-orange-100 text-orange-700',
      Approval: 'bg-green-100 text-green-700',
      General: 'bg-gray-100 text-gray-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[category]}`}>{category}</span>;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'Resolved' || status === 'Closed') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />Clarifications
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and track clarification requests</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <MessageCircle className="w-4 h-4" />New Clarification
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open</p>
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            </div>
          </div>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search clarifications..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Open">Open</option>
            <option value="Pending Response">Pending Response</option>
            <option value="Resolved">Resolved</option>
            <option value="Escalated">Escalated</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Request</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">From</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Responses</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredClarifications.map((clr) => (
                <tr key={clr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{clr.subject}</div>
                      <div className="text-xs text-gray-500">{clr.requestNumber}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getCategoryBadge(clr.category)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{clr.requestedBy}</div>
                    <div className="text-xs text-gray-500">{clr.department}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{clr.assignedTo}</td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${isOverdue(clr.dueDate, clr.status) ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                      {new Date(clr.dueDate).toLocaleDateString()}
                    </div>
                    {isOverdue(clr.dueDate, clr.status) && (
                      <div className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />Overdue
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-sm ${clr.responses > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      <MessageCircle className="w-4 h-4" />{clr.responses}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{getPriorityBadge(clr.priority)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(clr.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {(clr.status === 'Open' || clr.status === 'Pending Response') && (
                        <button className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="Respond"><Send className="w-4 h-4 text-blue-600" /></button>
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
