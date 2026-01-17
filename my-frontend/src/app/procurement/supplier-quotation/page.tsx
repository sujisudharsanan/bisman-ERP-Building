'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
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
  Building2,
  Calendar,
  FileText,
  Send,
  Award,
  TrendingDown,
  ArrowRight
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Quotation {
  id: string;
  quotationNumber: string;
  rfqReference: string;
  supplier: {
    name: string;
    code: string;
    rating: number;
  };
  status: 'received' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected' | 'expired';
  submissionDate: string;
  validUntil: string;
  lineItems: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  deliveryTerms: string;
  paymentTerms: string;
  leadTime: number;
  ranking?: number;
  notes?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockQuotations: Quotation[] = [
  {
    id: 'QT001',
    quotationNumber: 'QT-2024-0089',
    rfqReference: 'RFQ-2024-0034',
    supplier: { name: 'Global Steel Corporation', code: 'SUP-001', rating: 4.8 },
    status: 'shortlisted',
    submissionDate: '2024-01-16',
    validUntil: '2024-02-16',
    lineItems: 5,
    subtotal: 42000,
    discount: 2100,
    tax: 3192,
    total: 43092,
    currency: 'USD',
    deliveryTerms: 'FOB Origin',
    paymentTerms: 'Net 30',
    leadTime: 7,
    ranking: 1
  },
  {
    id: 'QT002',
    quotationNumber: 'QT-2024-0088',
    rfqReference: 'RFQ-2024-0034',
    supplier: { name: 'MetalWorks Inc', code: 'SUP-008', rating: 4.2 },
    status: 'under_review',
    submissionDate: '2024-01-17',
    validUntil: '2024-02-17',
    lineItems: 5,
    subtotal: 45500,
    discount: 0,
    tax: 3640,
    total: 49140,
    currency: 'USD',
    deliveryTerms: 'CIF Destination',
    paymentTerms: 'Net 45',
    leadTime: 10,
    ranking: 2
  },
  {
    id: 'QT003',
    quotationNumber: 'QT-2024-0087',
    rfqReference: 'RFQ-2024-0033',
    supplier: { name: 'TechComponents Inc', code: 'SUP-002', rating: 4.5 },
    status: 'accepted',
    submissionDate: '2024-01-10',
    validUntil: '2024-02-10',
    lineItems: 12,
    subtotal: 125000,
    discount: 6250,
    tax: 9500,
    total: 128250,
    currency: 'USD',
    deliveryTerms: 'DDP',
    paymentTerms: 'Net 30',
    leadTime: 5,
    notes: 'Best value - awarded contract'
  },
  {
    id: 'QT004',
    quotationNumber: 'QT-2024-0086',
    rfqReference: 'RFQ-2024-0033',
    supplier: { name: 'ElectroParts Ltd', code: 'SUP-015', rating: 3.9 },
    status: 'rejected',
    submissionDate: '2024-01-11',
    validUntil: '2024-02-11',
    lineItems: 12,
    subtotal: 135000,
    discount: 5000,
    tax: 10400,
    total: 140400,
    currency: 'USD',
    deliveryTerms: 'FOB Origin',
    paymentTerms: 'Net 60',
    leadTime: 14,
    notes: 'Price too high, long lead time'
  },
  {
    id: 'QT005',
    quotationNumber: 'QT-2024-0085',
    rfqReference: 'RFQ-2024-0032',
    supplier: { name: 'PackPro Solutions', code: 'SUP-003', rating: 4.2 },
    status: 'received',
    submissionDate: '2024-01-18',
    validUntil: '2024-02-18',
    lineItems: 8,
    subtotal: 18500,
    discount: 925,
    tax: 1406,
    total: 18981,
    currency: 'USD',
    deliveryTerms: 'FOB Origin',
    paymentTerms: 'Net 15',
    leadTime: 3
  }
];

const stats = {
  totalQuotations: 89,
  underReview: 15,
  shortlisted: 8,
  potentialSavings: 45000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Quotation['status'] }) {
  const config = {
    received: { label: 'Received', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: FileText },
    under_review: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    shortlisted: { label: 'Shortlisted', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Award },
    accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    expired: { label: 'Expired', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function RankingBadge({ ranking }: { ranking?: number }) {
  if (!ranking) return null;
  
  const config = {
    1: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    2: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    3: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  }[ranking] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold ${config}`}>
      #{ranking}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierQuotationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rfqFilter, setRfqFilter] = useState<string>('all');

  const filteredQuotations = useMemo(() => {
    return mockQuotations.filter(quotation => {
      const matchesSearch =
        quotation.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quotation.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quotation.rfqReference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
      const matchesRfq = rfqFilter === 'all' || quotation.rfqReference === rfqFilter;
      return matchesSearch && matchesStatus && matchesRfq;
    });
  }, [searchQuery, statusFilter, rfqFilter]);

  const rfqList = [...new Set(mockQuotations.map(q => q.rfqReference))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supplier Quotations</h1>
            <p className="text-gray-500 dark:text-gray-400">Review and compare supplier quotations</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Send className="w-4 h-4" />
              Send RFQ
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
                <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalQuotations}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Quotations</p>
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
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.shortlisted}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Shortlisted</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.potentialSavings)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Potential Savings</p>
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
              placeholder="Search by quotation #, supplier, or RFQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={rfqFilter}
            onChange={(e) => setRfqFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All RFQs</option>
            {rfqList.map(rfq => (
              <option key={rfq} value={rfq}>{rfq}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="received">Received</option>
            <option value="under_review">Under Review</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Quotations Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Quotation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Lead Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Terms</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Valid Until</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RankingBadge ranking={quotation.ranking} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{quotation.quotationNumber}</p>
                        <p className="text-xs text-gray-500">Ref: {quotation.rfqReference}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{quotation.supplier.name}</p>
                        <p className="text-xs text-gray-500">★ {quotation.supplier.rating}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(quotation.total)}</p>
                    {quotation.discount > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">-{formatCurrency(quotation.discount)} discount</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium text-gray-900 dark:text-white">{quotation.leadTime} days</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{quotation.paymentTerms}</p>
                    <p className="text-xs text-gray-500">{quotation.deliveryTerms}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{quotation.validUntil}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={quotation.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      {['received', 'under_review'].includes(quotation.status) && (
                        <>
                          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Shortlist">
                            <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Accept">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </button>
                        </>
                      )}
                      {quotation.status === 'shortlisted' && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Convert to PO">
                          <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredQuotations.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No quotations found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
