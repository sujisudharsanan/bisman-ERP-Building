'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Check,
  X,
  AlertTriangle,
  Calendar,
  DollarSign,
  User,
  Building2,
  ChevronDown,
  MessageSquare
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  type: 'standard' | 'adjustment' | 'closing' | 'reversing' | 'accrual';
  debitTotal: number;
  creditTotal: number;
  status: 'pending' | 'approved' | 'rejected' | 'draft';
  submittedBy: string;
  submittedDate: string;
  department: string;
  costCenter: string;
  attachments: number;
  lineItems: number;
  notes?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockEntries: JournalEntry[] = [
  {
    id: 'JE001',
    entryNumber: 'JE-2024-0156',
    date: '2024-01-20',
    description: 'Q4 Revenue accrual adjustment',
    type: 'accrual',
    debitTotal: 125000,
    creditTotal: 125000,
    status: 'pending',
    submittedBy: 'Sarah Chen',
    submittedDate: '2024-01-19',
    department: 'Finance',
    costCenter: 'CC-FIN-001',
    attachments: 3,
    lineItems: 8,
    notes: 'Accrual for services rendered but not yet invoiced'
  },
  {
    id: 'JE002',
    entryNumber: 'JE-2024-0155',
    date: '2024-01-19',
    description: 'Fixed asset depreciation - January',
    type: 'standard',
    debitTotal: 45000,
    creditTotal: 45000,
    status: 'pending',
    submittedBy: 'Mike Johnson',
    submittedDate: '2024-01-18',
    department: 'Accounting',
    costCenter: 'CC-ACC-002',
    attachments: 1,
    lineItems: 12
  },
  {
    id: 'JE003',
    entryNumber: 'JE-2024-0154',
    date: '2024-01-18',
    description: 'Intercompany transfer adjustment',
    type: 'adjustment',
    debitTotal: 89500,
    creditTotal: 89500,
    status: 'approved',
    submittedBy: 'Lisa Wong',
    submittedDate: '2024-01-17',
    department: 'Corporate',
    costCenter: 'CC-CORP-001',
    attachments: 5,
    lineItems: 4
  },
  {
    id: 'JE004',
    entryNumber: 'JE-2024-0153',
    date: '2024-01-17',
    description: 'Bad debt write-off',
    type: 'adjustment',
    debitTotal: 15750,
    creditTotal: 15750,
    status: 'rejected',
    submittedBy: 'David Brown',
    submittedDate: '2024-01-16',
    department: 'AR',
    costCenter: 'CC-AR-001',
    attachments: 2,
    lineItems: 2,
    notes: 'Insufficient documentation provided'
  },
  {
    id: 'JE005',
    entryNumber: 'JE-2024-0152',
    date: '2024-01-16',
    description: 'Prepaid expense amortization',
    type: 'standard',
    debitTotal: 32000,
    creditTotal: 32000,
    status: 'pending',
    submittedBy: 'Jennifer Lee',
    submittedDate: '2024-01-15',
    department: 'Finance',
    costCenter: 'CC-FIN-001',
    attachments: 1,
    lineItems: 6
  }
];

const stats = {
  pendingApproval: 8,
  approvedToday: 5,
  rejectedToday: 2,
  totalValue: 287250
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: JournalEntry['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: JournalEntry['type'] }) {
  const config = {
    standard: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    adjustment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    closing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    reversing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    accrual: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {type}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function JournalEntriesApprovalPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  const filteredEntries = useMemo(() => {
    return mockEntries.filter(entry => {
      const matchesSearch =
        entry.entryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.submittedBy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, statusFilter, typeFilter]);

  const toggleSelectEntry = (id: string) => {
    setSelectedEntries(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEntries.length === filteredEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(filteredEntries.map(e => e.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal Entries Approval</h1>
            <p className="text-gray-500 dark:text-gray-400">Review and approve pending journal entries</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approvedToday}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Approved Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejectedToday}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rejected Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Value</p>
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
              placeholder="Search entries..."
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="standard">Standard</option>
            <option value="adjustment">Adjustment</option>
            <option value="closing">Closing</option>
            <option value="reversing">Reversing</option>
            <option value="accrual">Accrual</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedEntries.length > 0 && (
          <div className="flex items-center gap-4 p-3 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-sm text-blue-700 dark:text-blue-400">{selectedEntries.length} entries selected</span>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                <Check className="w-4 h-4" />
                Approve Selected
              </button>
              <button className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                <X className="w-4 h-4" />
                Reject Selected
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Entry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Submitted By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedEntries.includes(entry.id)}
                      onChange={() => toggleSelectEntry(entry.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{entry.entryNumber}</p>
                    <p className="text-xs text-gray-500">{entry.date}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-1">{entry.description}</p>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>{entry.lineItems} lines</span>
                      <span>•</span>
                      <span>{entry.attachments} attachments</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={entry.type} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(entry.debitTotal)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{entry.submittedBy}</p>
                        <p className="text-xs text-gray-500">{entry.submittedDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      {entry.status === 'pending' && (
                        <>
                          <button className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Approve">
                            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </button>
                          <button className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="Reject">
                            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </>
                      )}
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Comment">
                        <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No journal entries found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
