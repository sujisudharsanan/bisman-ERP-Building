'use client';

import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface BudgetRequest {
  id: string;
  requestNumber: string;
  department: string;
  category: string;
  requestedAmount: number;
  approvedAmount: number | null;
  requestedBy: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision';
  priority: 'low' | 'medium' | 'high' | 'critical';
  fiscalYear: string;
  quarter: string;
  description: string;
}

const mockRequests: BudgetRequest[] = [
  { id: '1', requestNumber: 'BUD-2026-001', department: 'Engineering', category: 'Capital Expenditure', requestedAmount: 5000000, approvedAmount: null, requestedBy: 'John Smith', requestDate: '2026-01-10', status: 'pending', priority: 'high', fiscalYear: 'FY2026', quarter: 'Q1', description: 'New server infrastructure' },
  { id: '2', requestNumber: 'BUD-2026-002', department: 'Marketing', category: 'Operational', requestedAmount: 2500000, approvedAmount: 2000000, requestedBy: 'Sarah Johnson', requestDate: '2026-01-08', status: 'approved', priority: 'medium', fiscalYear: 'FY2026', quarter: 'Q1', description: 'Q1 Marketing Campaign' },
  { id: '3', requestNumber: 'BUD-2026-003', department: 'HR', category: 'Training & Development', requestedAmount: 1500000, approvedAmount: null, requestedBy: 'Mike Davis', requestDate: '2026-01-05', status: 'revision', priority: 'medium', fiscalYear: 'FY2026', quarter: 'Q1', description: 'Employee training programs' },
  { id: '4', requestNumber: 'BUD-2026-004', department: 'Operations', category: 'Maintenance', requestedAmount: 800000, approvedAmount: null, requestedBy: 'Lisa Chen', requestDate: '2026-01-03', status: 'pending', priority: 'critical', fiscalYear: 'FY2026', quarter: 'Q1', description: 'Critical equipment maintenance' },
  { id: '5', requestNumber: 'BUD-2026-005', department: 'Finance', category: 'Software', requestedAmount: 350000, approvedAmount: null, requestedBy: 'Tom Wilson', requestDate: '2026-01-02', status: 'rejected', priority: 'low', fiscalYear: 'FY2026', quarter: 'Q1', description: 'New accounting software license' },
];

export default function BudgetApprovalPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);

  const filteredRequests = useMemo(() => {
    return mockRequests.filter(req => {
      const matchesSearch = req.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           req.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           req.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchTerm, statusFilter, priorityFilter]);

  const summary = useMemo(() => {
    const pending = mockRequests.filter(r => r.status === 'pending').length;
    const totalRequested = mockRequests.reduce((sum, r) => sum + r.requestedAmount, 0);
    const totalApproved = mockRequests.filter(r => r.approvedAmount).reduce((sum, r) => sum + (r.approvedAmount || 0), 0);
    return { pending, totalRequested, totalApproved };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      revision: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[priority as keyof typeof styles]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-blue-600" />
              Budget Approval
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Review and approve budget requests across departments
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{summary.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Requested</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalRequested)}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.totalApproved)}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approval Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">78%</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revision">Needs Revision</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Request #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Category</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Priority</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-blue-600">{request.requestNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{request.requestDate}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{request.department}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{request.requestedBy}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{request.category}</td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(request.requestedAmount)}</p>
                    {request.approvedAmount && (
                      <p className="text-xs text-green-600">Approved: {formatCurrency(request.approvedAmount)}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">{getPriorityBadge(request.priority)}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(request.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedRequest(request)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" 
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Approve">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors" title="Comment">
                        <MessageSquare className="w-4 h-4" />
                      </button>
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
