'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Download,
  Upload,
  Users,
  Calendar,
  History,
  BookOpen,
  Shield,
  MoreVertical,
  ChevronRight
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Policy {
  id: string;
  title: string;
  code: string;
  category: string;
  version: string;
  status: 'active' | 'draft' | 'under_review' | 'archived' | 'expired';
  effectiveDate: string;
  expiryDate?: string;
  owner: string;
  department: string;
  approvedBy?: string;
  approvalDate?: string;
  lastReviewDate: string;
  nextReviewDate: string;
  description: string;
  applicableTo: string[];
  acknowledgementRequired: boolean;
  acknowledgedCount?: number;
  totalEmployees?: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockPolicies: Policy[] = [
  {
    id: 'POL001',
    title: 'Information Security Policy',
    code: 'ISP-001',
    category: 'IT Security',
    version: '4.0',
    status: 'active',
    effectiveDate: '2024-01-01',
    expiryDate: '2025-12-31',
    owner: 'CISO Office',
    department: 'IT',
    approvedBy: 'Board of Directors',
    approvalDate: '2023-12-15',
    lastReviewDate: '2023-12-01',
    nextReviewDate: '2024-06-01',
    description: 'Comprehensive information security guidelines for all employees',
    applicableTo: ['All Employees', 'Contractors'],
    acknowledgementRequired: true,
    acknowledgedCount: 245,
    totalEmployees: 280
  },
  {
    id: 'POL002',
    title: 'Data Privacy Policy',
    code: 'DPP-001',
    category: 'Privacy',
    version: '3.2',
    status: 'active',
    effectiveDate: '2023-06-01',
    expiryDate: '2024-06-01',
    owner: 'DPO',
    department: 'Legal',
    approvedBy: 'CEO',
    approvalDate: '2023-05-20',
    lastReviewDate: '2023-11-01',
    nextReviewDate: '2024-05-01',
    description: 'Data privacy and GDPR compliance requirements',
    applicableTo: ['All Employees'],
    acknowledgementRequired: true,
    acknowledgedCount: 280,
    totalEmployees: 280
  },
  {
    id: 'POL003',
    title: 'Anti-Corruption Policy',
    code: 'ACP-001',
    category: 'Ethics',
    version: '2.1',
    status: 'under_review',
    effectiveDate: '2022-01-01',
    owner: 'Compliance Officer',
    department: 'Compliance',
    lastReviewDate: '2024-01-10',
    nextReviewDate: '2024-02-10',
    description: 'Guidelines for preventing corruption and bribery',
    applicableTo: ['All Employees', 'Partners'],
    acknowledgementRequired: true
  },
  {
    id: 'POL004',
    title: 'Remote Work Policy',
    code: 'RWP-001',
    category: 'HR',
    version: '1.5',
    status: 'draft',
    effectiveDate: '',
    owner: 'HR Director',
    department: 'HR',
    lastReviewDate: '2024-01-15',
    nextReviewDate: '2024-02-15',
    description: 'Guidelines for remote and hybrid work arrangements',
    applicableTo: ['Eligible Employees'],
    acknowledgementRequired: false
  },
  {
    id: 'POL005',
    title: 'Vendor Management Policy',
    code: 'VMP-001',
    category: 'Procurement',
    version: '2.0',
    status: 'expired',
    effectiveDate: '2022-01-01',
    expiryDate: '2023-12-31',
    owner: 'Procurement Lead',
    department: 'Procurement',
    lastReviewDate: '2022-12-01',
    nextReviewDate: '2024-01-15',
    description: 'Third-party vendor selection and management guidelines',
    applicableTo: ['Procurement', 'Finance'],
    acknowledgementRequired: false
  }
];

const categories = [
  'All Categories',
  'IT Security',
  'Privacy',
  'Ethics',
  'HR',
  'Procurement',
  'Operations',
  'Finance'
];

const stats = {
  total: 45,
  active: 38,
  underReview: 4,
  expiringSoon: 6
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Policy['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
    under_review: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    archived: { label: 'Archived', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
    expired: { label: 'Expired', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function AcknowledgementProgress({ acknowledged, total }: { acknowledged: number; total: number }) {
  const percentage = Math.round((acknowledged / total) * 100);
  return (
    <div className="w-32">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">{acknowledged}/{total}</span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${percentage >= 90 ? 'bg-green-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function PolicyManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');

  const filteredPolicies = useMemo(() => {
    return mockPolicies.filter(policy => {
      const matchesSearch =
        policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;
      const matchesCategory = categoryFilter === 'All Categories' || policy.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [searchQuery, statusFilter, categoryFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Policy Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage organizational policies and procedures</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Policy
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
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Policies</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.underReview}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Under Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expiringSoon}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Soon</p>
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
              placeholder="Search policies..."
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
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="under_review">Under Review</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Policies Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Policy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Review</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acknowledgement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPolicies.map((policy) => (
                <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{policy.title}</p>
                        <span className="text-xs text-gray-500">v{policy.version}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{policy.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                      {policy.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={policy.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <p className="text-gray-900 dark:text-white">{policy.owner}</p>
                      <p className="text-gray-500 dark:text-gray-400">{policy.department}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {policy.nextReviewDate}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {policy.acknowledgementRequired && policy.acknowledgedCount && policy.totalEmployees ? (
                      <AcknowledgementProgress
                        acknowledged={policy.acknowledgedCount}
                        total={policy.totalEmployees}
                      />
                    ) : (
                      <span className="text-sm text-gray-400">Not required</span>
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
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="History">
                        <History className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="More">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPolicies.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mt-4">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No policies found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
