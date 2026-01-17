'use client';

import React, { useState, useMemo } from 'react';
import {
  Scale,
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
  FileText,
  User,
  Building2,
  MapPin,
  MoreVertical,
  Download,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface LegalCase {
  id: string;
  caseNumber: string;
  title: string;
  type: 'civil' | 'criminal' | 'regulatory' | 'arbitration' | 'employment' | 'ip';
  status: 'open' | 'in_progress' | 'on_hold' | 'settled' | 'closed' | 'won' | 'lost';
  priority: 'critical' | 'high' | 'medium' | 'low';
  plaintiff: string;
  defendant: string;
  court: string;
  judge?: string;
  filingDate: string;
  nextHearing?: string;
  estimatedValue: number;
  actualCost: number;
  assignedTo: string;
  externalCounsel?: string;
  description: string;
  lastUpdated: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockCases: LegalCase[] = [
  {
    id: 'CASE001',
    caseNumber: 'LIT-2024-001',
    title: 'Trademark Infringement - Brand Protection',
    type: 'ip',
    status: 'in_progress',
    priority: 'high',
    plaintiff: 'Acme Corporation',
    defendant: 'Competitor Inc',
    court: 'US District Court, Southern District',
    judge: 'Hon. Sarah Mitchell',
    filingDate: '2023-09-15',
    nextHearing: '2024-02-15',
    estimatedValue: 500000,
    actualCost: 85000,
    assignedTo: 'Legal Team',
    externalCounsel: 'Baker & Associates',
    description: 'Trademark infringement case against competitor for brand imitation',
    lastUpdated: '2024-01-18'
  },
  {
    id: 'CASE002',
    caseNumber: 'LIT-2024-002',
    title: 'Employment Dispute - Wrongful Termination',
    type: 'employment',
    status: 'open',
    priority: 'medium',
    plaintiff: 'John Smith',
    defendant: 'Acme Corporation',
    court: 'State Labor Court',
    filingDate: '2024-01-05',
    nextHearing: '2024-03-10',
    estimatedValue: 150000,
    actualCost: 12000,
    assignedTo: 'HR Legal',
    description: 'Former employee claims wrongful termination',
    lastUpdated: '2024-01-20'
  },
  {
    id: 'CASE003',
    caseNumber: 'LIT-2023-045',
    title: 'Contract Dispute - Vendor Agreement',
    type: 'civil',
    status: 'settled',
    priority: 'low',
    plaintiff: 'Acme Corporation',
    defendant: 'Supplier Co',
    court: 'Commercial Arbitration',
    filingDate: '2023-06-20',
    estimatedValue: 75000,
    actualCost: 28000,
    assignedTo: 'Procurement Legal',
    description: 'Dispute over breach of supply contract terms',
    lastUpdated: '2024-01-10'
  },
  {
    id: 'CASE004',
    caseNumber: 'LIT-2024-003',
    title: 'Regulatory Compliance Investigation',
    type: 'regulatory',
    status: 'in_progress',
    priority: 'critical',
    plaintiff: 'Regulatory Authority',
    defendant: 'Acme Corporation',
    court: 'Administrative Tribunal',
    filingDate: '2024-01-10',
    nextHearing: '2024-02-28',
    estimatedValue: 2000000,
    actualCost: 45000,
    assignedTo: 'Compliance Legal',
    externalCounsel: 'Regulatory Specialists LLP',
    description: 'Investigation into compliance practices',
    lastUpdated: '2024-01-19'
  },
  {
    id: 'CASE005',
    caseNumber: 'LIT-2023-032',
    title: 'Patent Dispute Resolution',
    type: 'ip',
    status: 'won',
    priority: 'high',
    plaintiff: 'Acme Corporation',
    defendant: 'Tech Rival LLC',
    court: 'Patent Trial and Appeal Board',
    filingDate: '2023-03-15',
    estimatedValue: 1500000,
    actualCost: 320000,
    assignedTo: 'IP Legal',
    externalCounsel: 'Patent Pros LLC',
    description: 'Patent validity dispute, successfully defended',
    lastUpdated: '2023-12-15'
  }
];

const stats = {
  totalCases: 28,
  activeCases: 12,
  settledThisYear: 8,
  totalExposure: 5200000,
  wonRate: 78
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: LegalCase['status'] }) {
  const config = {
    open: { label: 'Open', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    on_hold: { label: 'On Hold', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    settled: { label: 'Settled', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    closed: { label: 'Closed', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    won: { label: 'Won', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    lost: { label: 'Lost', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: LegalCase['priority'] }) {
  const config = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }[priority];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {priority}
    </span>
  );
}

function TypeBadge({ type }: { type: LegalCase['type'] }) {
  const labels = {
    civil: 'Civil',
    criminal: 'Criminal',
    regulatory: 'Regulatory',
    arbitration: 'Arbitration',
    employment: 'Employment',
    ip: 'IP/Patent'
  };

  return (
    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
      {labels[type]}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function LitigationTrackerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<LegalCase | null>(null);

  const filteredCases = useMemo(() => {
    return mockCases.filter(c => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.plaintiff.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.defendant.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, statusFilter, typeFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Litigation Tracker</h1>
            <p className="text-gray-500 dark:text-gray-400">Track and manage legal cases and disputes</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Case
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCases}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Cases</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeCases}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Cases</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.settledThisYear}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Settled (YTD)</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalExposure)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Exposure</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.wonRate}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
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
              placeholder="Search cases..."
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
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="settled">Settled</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="civil">Civil</option>
            <option value="regulatory">Regulatory</option>
            <option value="employment">Employment</option>
            <option value="ip">IP/Patent</option>
            <option value="arbitration">Arbitration</option>
          </select>
        </div>

        {/* Cases Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Case</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Parties</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Hearing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{c.caseNumber}</p>
                        <PriorityBadge priority={c.priority} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{c.title}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <p className="text-gray-900 dark:text-white">{c.plaintiff}</p>
                      <p className="text-gray-500 dark:text-gray-400">vs {c.defendant}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={c.type} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(c.estimatedValue)}</p>
                      <p className="text-gray-500 dark:text-gray-400">Cost: {formatCurrency(c.actualCost)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {c.nextHearing ? (
                      <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {c.nextHearing}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
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
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="Documents">
                        <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
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

        {filteredCases.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mt-4">
            <Scale className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No cases found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
