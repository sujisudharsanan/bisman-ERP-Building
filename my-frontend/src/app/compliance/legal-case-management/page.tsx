'use client';

import React, { useState, useMemo } from 'react';
import {
  Scale,
  FileText,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Download,
  MoreVertical,
  ChevronRight,
  Briefcase,
  DollarSign,
  Building2,
  UserCheck,
  Tag,
  MessageSquare
} from 'lucide-react';

// Types
interface LegalCase {
  id: string;
  caseNumber: string;
  title: string;
  type: 'litigation' | 'contract' | 'regulatory' | 'employment' | 'ip' | 'corporate';
  status: 'open' | 'in-progress' | 'pending' | 'closed' | 'won' | 'lost' | 'settled';
  priority: 'high' | 'medium' | 'low';
  plaintiff: string;
  defendant: string;
  assignedTo: string;
  filedDate: string;
  nextHearing: string | null;
  estimatedValue: number;
  description: string;
  court: string;
}

// Mock data
const mockCases: LegalCase[] = [
  {
    id: '1',
    caseNumber: 'LIT-2026-001',
    title: 'Patent Infringement Claim',
    type: 'ip',
    status: 'in-progress',
    priority: 'high',
    plaintiff: 'Acme Corp',
    defendant: 'BISMAN Industries',
    assignedTo: 'Sarah Chen',
    filedDate: '2025-11-15',
    nextHearing: '2026-01-28',
    estimatedValue: 2500000,
    description: 'Patent infringement claim regarding manufacturing process',
    court: 'Federal District Court'
  },
  {
    id: '2',
    caseNumber: 'EMP-2026-002',
    title: 'Wrongful Termination Suit',
    type: 'employment',
    status: 'pending',
    priority: 'medium',
    plaintiff: 'John Smith',
    defendant: 'BISMAN Industries',
    assignedTo: 'Mike Johnson',
    filedDate: '2025-12-01',
    nextHearing: '2026-02-15',
    estimatedValue: 150000,
    description: 'Former employee alleges wrongful termination',
    court: 'State Superior Court'
  },
  {
    id: '3',
    caseNumber: 'REG-2026-003',
    title: 'Environmental Compliance Review',
    type: 'regulatory',
    status: 'open',
    priority: 'high',
    plaintiff: 'EPA',
    defendant: 'BISMAN Manufacturing',
    assignedTo: 'Lisa Wang',
    filedDate: '2026-01-05',
    nextHearing: null,
    estimatedValue: 500000,
    description: 'Environmental agency review of manufacturing practices',
    court: 'Administrative Court'
  },
  {
    id: '4',
    caseNumber: 'CON-2025-045',
    title: 'Vendor Contract Dispute',
    type: 'contract',
    status: 'settled',
    priority: 'low',
    plaintiff: 'BISMAN Industries',
    defendant: 'GlobalSupply Inc',
    assignedTo: 'David Brown',
    filedDate: '2025-08-20',
    nextHearing: null,
    estimatedValue: 75000,
    description: 'Breach of contract for delayed deliveries',
    court: 'Commercial Arbitration'
  },
  {
    id: '5',
    caseNumber: 'LIT-2025-032',
    title: 'Product Liability Claim',
    type: 'litigation',
    status: 'won',
    priority: 'high',
    plaintiff: 'Consumer Group',
    defendant: 'BISMAN Products',
    assignedTo: 'Sarah Chen',
    filedDate: '2025-03-10',
    nextHearing: null,
    estimatedValue: 1000000,
    description: 'Dismissed product liability claim',
    court: 'Federal District Court'
  }
];

const caseMetrics = {
  totalCases: 24,
  activeCases: 15,
  closedThisMonth: 3,
  pendingHearings: 8,
  totalExposure: 4250000,
  wonCases: 12,
  settledCases: 6
};

export default function LegalCaseManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredCases = useMemo(() => {
    return mockCases.filter((c) => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.plaintiff.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.defendant.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [searchTerm, statusFilter, typeFilter, priorityFilter]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'open': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'pending': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'closed': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'won': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'lost': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'settled': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    };
    return colors[status] || colors['closed'];
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'litigation': <Scale className="w-4 h-4" />,
      'contract': <FileText className="w-4 h-4" />,
      'regulatory': <Building2 className="w-4 h-4" />,
      'employment': <Users className="w-4 h-4" />,
      'ip': <Tag className="w-4 h-4" />,
      'corporate': <Briefcase className="w-4 h-4" />
    };
    return icons[type] || icons['litigation'];
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'high': 'text-red-500',
      'medium': 'text-yellow-500',
      'low': 'text-green-500'
    };
    return colors[priority] || colors['medium'];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Scale className="w-8 h-8 text-indigo-500" />
              Legal Case Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track and manage all legal cases, litigation, and regulatory matters
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span>New Case</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Active Cases</span>
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{caseMetrics.activeCases}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">of {caseMetrics.totalCases} total</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Pending Hearings</span>
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{caseMetrics.pendingHearings}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">scheduled hearings</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Total Exposure</span>
            <DollarSign className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(caseMetrics.totalExposure)}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">potential liability</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Success Rate</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-500">
            {Math.round((caseMetrics.wonCases / (caseMetrics.wonCases + caseMetrics.settledCases)) * 100)}%
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{caseMetrics.wonCases} won, {caseMetrics.settledCases} settled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="p-4 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cases by number, title, or parties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="settled">Settled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Types</option>
              <option value="litigation">Litigation</option>
              <option value="contract">Contract</option>
              <option value="regulatory">Regulatory</option>
              <option value="employment">Employment</option>
              <option value="ip">Intellectual Property</option>
              <option value="corporate">Corporate</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Case</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Parties</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Next Hearing</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Assigned</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCases.map((caseItem) => (
                <tr key={caseItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${getPriorityColor(caseItem.priority)}`} />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{caseItem.caseNumber}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{caseItem.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      {getTypeIcon(caseItem.type)}
                      <span className="text-sm capitalize">{caseItem.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 dark:text-white">{caseItem.plaintiff}</div>
                      <div className="text-gray-500 dark:text-gray-400">vs. {caseItem.defendant}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                      {caseItem.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {caseItem.nextHearing || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(caseItem.estimatedValue)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {caseItem.assignedTo.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{caseItem.assignedTo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredCases.length === 0 && (
          <div className="text-center py-12">
            <Scale className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No cases found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredCases.length} of {mockCases.length} cases
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Previous
            </button>
            <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
