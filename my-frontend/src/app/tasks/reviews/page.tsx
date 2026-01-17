'use client';

import React, { useState } from 'react';
import { ClipboardCheck, Search, Eye, CheckCircle, XCircle, Clock, User, MessageSquare, FileText, Calendar, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ReviewTask {
  id: string;
  reviewNumber: string;
  title: string;
  type: 'Document' | 'Purchase Order' | 'Invoice' | 'Report' | 'Request' | 'Contract';
  requestedBy: string;
  department: string;
  submittedDate: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending Review' | 'Under Review' | 'Approved' | 'Rejected' | 'Changes Requested';
  reviewer: string;
  value?: number;
  attachments: number;
  comments: number;
}

export default function ReviewsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const reviews: ReviewTask[] = [
    { id: 'REV-001', reviewNumber: 'REV-2025-001', title: 'Purchase Order - Raw Materials Q1', type: 'Purchase Order', requestedBy: 'Procurement Officer', department: 'Procurement', submittedDate: '2025-01-15', dueDate: '2025-01-17', priority: 'High', status: 'Pending Review', reviewer: 'Procurement Head', value: 450000, attachments: 3, comments: 0 },
    { id: 'REV-002', reviewNumber: 'REV-2025-002', title: 'Monthly Financial Report - December', type: 'Report', requestedBy: 'Finance Manager', department: 'Finance', submittedDate: '2025-01-14', dueDate: '2025-01-16', priority: 'High', status: 'Under Review', reviewer: 'CFO', attachments: 5, comments: 2 },
    { id: 'REV-003', reviewNumber: 'REV-2025-003', title: 'Vendor Agreement - ABC Supplies', type: 'Contract', requestedBy: 'Legal Team', department: 'Legal', submittedDate: '2025-01-13', dueDate: '2025-01-18', priority: 'Medium', status: 'Changes Requested', reviewer: 'Legal Head', attachments: 2, comments: 4 },
    { id: 'REV-004', reviewNumber: 'REV-2025-004', title: 'Invoice - Tech Solutions Ltd', type: 'Invoice', requestedBy: 'Accounts Payable', department: 'Finance', submittedDate: '2025-01-14', dueDate: '2025-01-15', priority: 'High', status: 'Approved', reviewer: 'Finance Manager', value: 125000, attachments: 2, comments: 1 },
    { id: 'REV-005', reviewNumber: 'REV-2025-005', title: 'Leave Request - Extended Medical', type: 'Request', requestedBy: 'Employee', department: 'Production', submittedDate: '2025-01-12', dueDate: '2025-01-14', priority: 'Medium', status: 'Approved', reviewer: 'HR Manager', attachments: 1, comments: 2 },
    { id: 'REV-006', reviewNumber: 'REV-2025-006', title: 'Budget Proposal - Marketing Q2', type: 'Document', requestedBy: 'Marketing Head', department: 'Marketing', submittedDate: '2025-01-15', dueDate: '2025-01-20', priority: 'Medium', status: 'Pending Review', reviewer: 'CFO', value: 500000, attachments: 4, comments: 0 },
    { id: 'REV-007', reviewNumber: 'REV-2025-007', title: 'Capital Expenditure Request', type: 'Request', requestedBy: 'Operations Manager', department: 'Operations', submittedDate: '2025-01-11', dueDate: '2025-01-13', priority: 'High', status: 'Rejected', reviewer: 'CEO', value: 1200000, attachments: 6, comments: 3 },
  ];

  const types = ['Document', 'Purchase Order', 'Invoice', 'Report', 'Request', 'Contract'];

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.reviewNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.requestedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    const matchesType = typeFilter === 'all' || review.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'Pending Review').length,
    underReview: reviews.filter(r => r.status === 'Under Review').length,
    approved: reviews.filter(r => r.status === 'Approved').length,
    rejected: reviews.filter(r => r.status === 'Rejected' || r.status === 'Changes Requested').length
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: JSX.Element }> = {
      'Pending Review': { bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
      'Under Review': { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Eye className="w-3 h-3" /> },
      Approved: { bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
      Rejected: { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
      'Changes Requested': { bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <AlertTriangle className="w-3 h-3" /> }
    };
    const style = styles[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg}`}>
        {style.icon}{status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      High: 'bg-red-100 text-red-700',
      Medium: 'bg-yellow-100 text-yellow-700',
      Low: 'bg-green-100 text-green-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>{priority}</span>;
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      Document: 'bg-blue-100 text-blue-700',
      'Purchase Order': 'bg-purple-100 text-purple-700',
      Invoice: 'bg-green-100 text-green-700',
      Report: 'bg-cyan-100 text-cyan-700',
      Request: 'bg-orange-100 text-orange-700',
      Contract: 'bg-pink-100 text-pink-700'
    };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[type]}`}>{type}</span>;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'Approved' || status === 'Rejected') return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-indigo-600" />Reviews
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and complete assigned review tasks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Reviews</p>
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
            <Eye className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Under Review</p>
              <p className="text-2xl font-bold text-blue-600">{stats.underReview}</p>
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
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rejected/Changes</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search reviews..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="all">All Status</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Changes Requested">Changes Requested</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Review</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">From</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Due Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Attachments</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredReviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{review.title}</div>
                      <div className="text-xs text-gray-500">{review.reviewNumber}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getTypeBadge(review.type)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-300">{review.requestedBy}</div>
                    <div className="text-xs text-gray-500">{review.department}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${isOverdue(review.dueDate, review.status) ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                      {new Date(review.dueDate).toLocaleDateString()}
                    </div>
                    {isOverdue(review.dueDate, review.status) && (
                      <div className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />Overdue
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {review.value ? `₹${review.value.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                        <FileText className="w-4 h-4" />{review.attachments}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                        <MessageSquare className="w-4 h-4" />{review.comments}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{getPriorityBadge(review.priority)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(review.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View"><Eye className="w-4 h-4 text-gray-500" /></button>
                      {(review.status === 'Pending Review' || review.status === 'Under Review') && (
                        <>
                          <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Approve"><ThumbsUp className="w-4 h-4 text-green-600" /></button>
                          <button className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="Reject"><ThumbsDown className="w-4 h-4 text-red-600" /></button>
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
