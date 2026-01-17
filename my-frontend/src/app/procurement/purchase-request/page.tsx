'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  User,
  Building2,
  Calendar,
  Package,
  Send,
  Trash2
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface PurchaseRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'converted';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requester: {
    name: string;
    department: string;
  };
  requestDate: string;
  requiredDate: string;
  lineItems: number;
  estimatedTotal: number;
  currency: string;
  approver?: string;
  approvalDate?: string;
  notes?: string;
  attachments: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockRequests: PurchaseRequest[] = [
  {
    id: 'PR001',
    requestNumber: 'PR-2024-0156',
    title: 'IT Equipment Upgrade',
    description: 'Laptops and monitors for new team members',
    status: 'under_review',
    priority: 'high',
    requester: { name: 'Mike Johnson', department: 'IT Department' },
    requestDate: '2024-01-18',
    requiredDate: '2024-02-15',
    lineItems: 5,
    estimatedTotal: 15000,
    currency: 'USD',
    approver: 'David Miller',
    attachments: 2
  },
  {
    id: 'PR002',
    requestNumber: 'PR-2024-0155',
    title: 'Office Supplies Q1',
    description: 'Quarterly office supplies replenishment',
    status: 'approved',
    priority: 'low',
    requester: { name: 'Sarah Chen', department: 'Administration' },
    requestDate: '2024-01-17',
    requiredDate: '2024-01-31',
    lineItems: 12,
    estimatedTotal: 2500,
    currency: 'USD',
    approver: 'Lisa Wong',
    approvalDate: '2024-01-18',
    attachments: 0
  },
  {
    id: 'PR003',
    requestNumber: 'PR-2024-0154',
    title: 'Raw Materials - Steel',
    description: 'Steel sheets and rods for production Q1',
    status: 'converted',
    priority: 'high',
    requester: { name: 'Tom Anderson', department: 'Production' },
    requestDate: '2024-01-15',
    requiredDate: '2024-02-01',
    lineItems: 8,
    estimatedTotal: 45000,
    currency: 'USD',
    approver: 'David Miller',
    approvalDate: '2024-01-16',
    notes: 'Converted to PO-2024-0089',
    attachments: 3
  },
  {
    id: 'PR004',
    requestNumber: 'PR-2024-0153',
    title: 'Marketing Materials',
    description: 'Brochures and promotional items for trade show',
    status: 'submitted',
    priority: 'medium',
    requester: { name: 'Jennifer Lee', department: 'Marketing' },
    requestDate: '2024-01-16',
    requiredDate: '2024-02-20',
    lineItems: 6,
    estimatedTotal: 8500,
    currency: 'USD',
    attachments: 1
  },
  {
    id: 'PR005',
    requestNumber: 'PR-2024-0152',
    title: 'Safety Equipment',
    description: 'PPE and safety gear for warehouse staff',
    status: 'rejected',
    priority: 'medium',
    requester: { name: 'Robert Brown', department: 'Warehouse' },
    requestDate: '2024-01-14',
    requiredDate: '2024-01-28',
    lineItems: 4,
    estimatedTotal: 3200,
    currency: 'USD',
    approver: 'Lisa Wong',
    notes: 'Budget exceeded. Please revise quantities.',
    attachments: 0
  }
];

const stats = {
  totalRequests: 156,
  pendingApproval: 23,
  approvedThisMonth: 45,
  totalValue: 285000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: PurchaseRequest['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
    submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Send },
    under_review: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    converted: { label: 'Converted to PO', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: PurchaseRequest['priority'] }) {
  const config = {
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  }[priority];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {priority}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function PurchaseRequestPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredRequests = useMemo(() => {
    return mockRequests.filter(request => {
      const matchesSearch =
        request.requestNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requester.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchQuery, statusFilter, priorityFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Requests</h1>
            <p className="text-gray-500 dark:text-gray-400">Create and manage purchase requests</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Request
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRequests}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApproval}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approvedThisMonth}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Approved This Month</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by request number, title, or requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Request</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Requester</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Est. Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Required By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{request.requestNumber}</p>
                    <p className="text-sm text-gray-500 truncate max-w-[200px]">{request.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{request.requester.name}</p>
                        <p className="text-xs text-gray-500">{request.requester.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-gray-900 dark:text-white">{request.lineItems}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(request.estimatedTotal)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{request.requiredDate}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={request.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      {['draft', 'rejected'].includes(request.status) && (
                        <>
                          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                            <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Delete">
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </>
                      )}
                      {request.status === 'draft' && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Submit">
                          <Send className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No purchase requests found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
