'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Download,
  MoreVertical,
  Building2,
  User,
  Briefcase,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Contract {
  id: string;
  title: string;
  contractNumber: string;
  type: 'service' | 'sales' | 'purchase' | 'employment' | 'nda' | 'lease';
  party: {
    name: string;
    type: 'vendor' | 'customer' | 'employee' | 'partner';
  };
  status: 'draft' | 'pending_review' | 'active' | 'expired' | 'terminated';
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  renewalType: 'auto' | 'manual' | 'none';
  owner: string;
  department: string;
  createdAt: string;
  tags: string[];
}

// ============================================================================
// Mock Data
// ============================================================================

const mockContracts: Contract[] = [
  {
    id: 'CON001',
    title: 'Annual IT Support Services',
    contractNumber: 'SVC-2024-001',
    type: 'service',
    party: { name: 'TechSupport Pro Ltd', type: 'vendor' },
    status: 'active',
    value: 48000,
    currency: 'USD',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    renewalType: 'auto',
    owner: 'Sarah Johnson',
    department: 'IT',
    createdAt: '2023-12-15',
    tags: ['IT', 'Support', 'Annual']
  },
  {
    id: 'CON002',
    title: 'Enterprise Software License',
    contractNumber: 'PUR-2024-012',
    type: 'purchase',
    party: { name: 'CloudSoft Inc', type: 'vendor' },
    status: 'active',
    value: 120000,
    currency: 'USD',
    startDate: '2024-01-15',
    endDate: '2025-01-14',
    renewalType: 'manual',
    owner: 'Michael Chen',
    department: 'IT',
    createdAt: '2024-01-10',
    tags: ['Software', 'License', 'Enterprise']
  },
  {
    id: 'CON003',
    title: 'Distribution Agreement',
    contractNumber: 'SLS-2023-089',
    type: 'sales',
    party: { name: 'Global Distributors Inc', type: 'customer' },
    status: 'pending_review',
    value: 250000,
    currency: 'USD',
    startDate: '2024-02-01',
    endDate: '2026-01-31',
    renewalType: 'manual',
    owner: 'Emily Davis',
    department: 'Sales',
    createdAt: '2024-01-18',
    tags: ['Distribution', 'Sales', 'Partnership']
  },
  {
    id: 'CON004',
    title: 'Office Lease Agreement',
    contractNumber: 'LSE-2022-004',
    type: 'lease',
    party: { name: 'Premier Properties', type: 'vendor' },
    status: 'active',
    value: 180000,
    currency: 'USD',
    startDate: '2022-06-01',
    endDate: '2025-05-31',
    renewalType: 'none',
    owner: 'James Wilson',
    department: 'Administration',
    createdAt: '2022-05-15',
    tags: ['Lease', 'Office', 'Facilities']
  },
  {
    id: 'CON005',
    title: 'Confidentiality Agreement',
    contractNumber: 'NDA-2024-028',
    type: 'nda',
    party: { name: 'Innovation Labs', type: 'partner' },
    status: 'draft',
    value: 0,
    currency: 'USD',
    startDate: '',
    endDate: '',
    renewalType: 'none',
    owner: 'Legal Team',
    department: 'Legal',
    createdAt: '2024-01-20',
    tags: ['NDA', 'Confidential', 'Partnership']
  },
  {
    id: 'CON006',
    title: 'Maintenance Contract',
    contractNumber: 'SVC-2023-045',
    type: 'service',
    party: { name: 'Facilities Plus', type: 'vendor' },
    status: 'expired',
    value: 24000,
    currency: 'USD',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    renewalType: 'manual',
    owner: 'Robert Brown',
    department: 'Operations',
    createdAt: '2022-12-01',
    tags: ['Maintenance', 'Facilities', 'Service']
  }
];

const stats = {
  total: 156,
  active: 89,
  pendingReview: 12,
  expiringThisMonth: 8,
  totalValue: 2450000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Contract['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
    pending_review: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    expired: { label: 'Expired', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: Contract['type'] }) {
  const config = {
    service: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    sales: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    purchase: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    employment: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    nda: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    lease: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${config}`}>
      {type}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredContracts = useMemo(() => {
    return mockContracts.filter(contract => {
      const matchesSearch =
        contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.party.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      const matchesType = typeFilter === 'all' || contract.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, statusFilter, typeFilter]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const getDaysRemaining = (endDate: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contract Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage all business contracts and agreements</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <a href="/admin/contracts/create" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Contract
            </a>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Contracts</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingReview}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expiringThisMonth}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Soon</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue, 'USD')}</p>
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
              placeholder="Search contracts..."
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
            <option value="pending_review">Pending Review</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="service">Service</option>
            <option value="sales">Sales</option>
            <option value="purchase">Purchase</option>
            <option value="employment">Employment</option>
            <option value="nda">NDA</option>
            <option value="lease">Lease</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contract</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Party</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredContracts.map((contract) => {
                const daysRemaining = getDaysRemaining(contract.endDate);
                return (
                  <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{contract.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{contract.contractNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={contract.type} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{contract.party.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{contract.party.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {contract.value > 0 ? formatCurrency(contract.value, contract.currency) : '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {contract.startDate && contract.endDate ? (
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{contract.startDate} - {contract.endDate}</p>
                          {daysRemaining !== null && contract.status === 'active' && (
                            <p className={`text-xs ${daysRemaining < 30 ? 'text-red-500' : daysRemaining < 90 ? 'text-yellow-500' : 'text-gray-500'}`}>
                              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={contract.status} />
                      {contract.renewalType !== 'none' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          {contract.renewalType} renewal
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="View">
                          <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="Download">
                          <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="More">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredContracts.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mt-4">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No contracts found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
