'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  Send,
  Copy,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  DollarSign,
  Calendar,
  User,
  Building2,
  MoreVertical,
  Printer,
  Mail
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface QuotationItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerCompany?: string;
  customerEmail: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  items: QuotationItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  validUntil: string;
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  notes?: string;
  terms?: string;
  createdBy: string;
}

interface QuotationStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  conversionRate: number;
  totalValue: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockQuotations: Quotation[] = [
  {
    id: 'QUO001',
    quotationNumber: 'QT-2024-00156',
    customerId: 'CUS001',
    customerName: 'Rajesh Sharma',
    customerCompany: 'Sharma Electronics',
    customerEmail: 'rajesh@sharma.com',
    status: 'sent',
    items: [
      { id: 'I1', name: 'Industrial Motor 5HP', sku: 'MOT-001', quantity: 5, unitPrice: 45000, discount: 5, tax: 18, total: 252675 },
      { id: 'I2', name: 'Control Panel', sku: 'PNL-002', quantity: 5, unitPrice: 12000, discount: 0, tax: 18, total: 70800 }
    ],
    subtotal: 285000,
    totalDiscount: 11250,
    totalTax: 49275,
    grandTotal: 323025,
    validUntil: '2024-02-15',
    createdAt: '2024-01-15 10:30',
    sentAt: '2024-01-15 14:00',
    notes: 'Delivery within 2 weeks of order confirmation',
    terms: 'Payment: 50% advance, 50% on delivery',
    createdBy: 'sales@bisman.com'
  },
  {
    id: 'QUO002',
    quotationNumber: 'QT-2024-00155',
    customerId: 'CUS002',
    customerName: 'Priya Patel',
    customerCompany: 'Patel Traders',
    customerEmail: 'priya@pateltraders.com',
    status: 'accepted',
    items: [
      { id: 'I1', name: 'Bulk Packaging Materials', sku: 'PKG-010', quantity: 1000, unitPrice: 50, discount: 10, tax: 12, total: 50400 }
    ],
    subtotal: 50000,
    totalDiscount: 5000,
    totalTax: 5400,
    grandTotal: 50400,
    validUntil: '2024-01-30',
    createdAt: '2024-01-10 09:00',
    sentAt: '2024-01-10 10:30',
    viewedAt: '2024-01-10 15:00',
    respondedAt: '2024-01-12 11:00',
    createdBy: 'sales@bisman.com'
  },
  {
    id: 'QUO003',
    quotationNumber: 'QT-2024-00154',
    customerId: 'CUS003',
    customerName: 'Amit Kumar',
    customerEmail: 'amit@email.com',
    status: 'draft',
    items: [
      { id: 'I1', name: 'Office Furniture Set', sku: 'FRN-020', quantity: 10, unitPrice: 15000, discount: 0, tax: 18, total: 177000 }
    ],
    subtotal: 150000,
    totalDiscount: 0,
    totalTax: 27000,
    grandTotal: 177000,
    validUntil: '2024-02-28',
    createdAt: '2024-01-16 08:00',
    createdBy: 'sales@bisman.com'
  },
  {
    id: 'QUO004',
    quotationNumber: 'QT-2024-00153',
    customerId: 'CUS004',
    customerName: 'Sneha Reddy',
    customerCompany: 'TechCorp Solutions',
    customerEmail: 'sneha@techcorp.in',
    status: 'viewed',
    items: [
      { id: 'I1', name: 'Server Rack', sku: 'SRV-001', quantity: 2, unitPrice: 85000, discount: 5, tax: 18, total: 190570 },
      { id: 'I2', name: 'Network Switch', sku: 'NET-005', quantity: 10, unitPrice: 15000, discount: 8, tax: 18, total: 163080 }
    ],
    subtotal: 320000,
    totalDiscount: 28100,
    totalTax: 52543,
    grandTotal: 344443,
    validUntil: '2024-02-10',
    createdAt: '2024-01-14 14:30',
    sentAt: '2024-01-14 16:00',
    viewedAt: '2024-01-15 09:00',
    createdBy: 'sales@bisman.com'
  },
  {
    id: 'QUO005',
    quotationNumber: 'QT-2024-00150',
    customerId: 'CUS005',
    customerName: 'Vikram Singh',
    customerEmail: 'vikram@email.com',
    status: 'rejected',
    items: [
      { id: 'I1', name: 'Industrial Pump', sku: 'PMP-008', quantity: 3, unitPrice: 75000, discount: 0, tax: 18, total: 265500 }
    ],
    subtotal: 225000,
    totalDiscount: 0,
    totalTax: 40500,
    grandTotal: 265500,
    validUntil: '2024-01-25',
    createdAt: '2024-01-08 11:00',
    sentAt: '2024-01-08 12:00',
    viewedAt: '2024-01-09 10:00',
    respondedAt: '2024-01-10 15:30',
    notes: 'Customer found better pricing elsewhere',
    createdBy: 'sales@bisman.com'
  },
  {
    id: 'QUO006',
    quotationNumber: 'QT-2024-00148',
    customerId: 'CUS006',
    customerName: 'Meera Joshi',
    customerCompany: 'Joshi Group',
    customerEmail: 'meera@joshigroup.com',
    status: 'expired',
    items: [
      { id: 'I1', name: 'Heavy Machinery Parts', sku: 'MCH-100', quantity: 20, unitPrice: 8000, discount: 15, tax: 18, total: 160480 }
    ],
    subtotal: 160000,
    totalDiscount: 24000,
    totalTax: 24480,
    grandTotal: 160480,
    validUntil: '2024-01-05',
    createdAt: '2023-12-20 10:00',
    sentAt: '2023-12-20 11:00',
    createdBy: 'sales@bisman.com'
  }
];

const mockStats: QuotationStats = {
  total: 156,
  pending: 45,
  accepted: 78,
  rejected: 18,
  conversionRate: 62.5,
  totalValue: 8500000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Quotation['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700', icon: FileText },
    sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700', icon: Send },
    viewed: { label: 'Viewed', className: 'bg-purple-100 text-purple-700', icon: Eye },
    accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
    expired: { label: 'Expired', className: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function QuotationDetailModal({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold">{quotation.quotationNumber}</h2>
                <StatusBadge status={quotation.status} />
              </div>
              <p className="text-sm text-gray-500">Created: {quotation.createdAt}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Print">
                <Printer className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Download PDF">
                <Download className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Duplicate">
                <Copy className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Customer & Validity */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Details
              </h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{quotation.customerName}</p>
                {quotation.customerCompany && (
                  <p className="text-gray-600">{quotation.customerCompany}</p>
                )}
                <p className="text-gray-600">{quotation.customerEmail}</p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Validity & Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Valid Until</span>
                  <span className={`font-medium ${new Date(quotation.validUntil) < new Date() ? 'text-red-600' : ''}`}>
                    {quotation.validUntil}
                  </span>
                </div>
                {quotation.sentAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sent</span>
                    <span>{quotation.sentAt}</span>
                  </div>
                )}
                {quotation.viewedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Viewed</span>
                    <span>{quotation.viewedAt}</span>
                  </div>
                )}
                {quotation.respondedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Response</span>
                    <span>{quotation.respondedAt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tax</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotation.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 text-right text-sm">{item.discount}%</td>
                    <td className="px-4 py-3 text-right text-sm">{item.tax}%</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(quotation.totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span>{formatCurrency(quotation.totalTax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Grand Total</span>
                <span>{formatCurrency(quotation.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(quotation.notes || quotation.terms) && (
            <div className="grid grid-cols-2 gap-4">
              {quotation.notes && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Terms & Conditions</h4>
                  <p className="text-sm text-gray-600">{quotation.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            {quotation.status === 'draft' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Send className="w-4 h-4" />
                Send to Customer
              </button>
            )}
            {quotation.status === 'accepted' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <CheckCircle className="w-4 h-4" />
                Convert to Order
              </button>
            )}
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function QuotationManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  const filteredQuotations = useMemo(() => {
    return mockQuotations.filter(quotation => {
      const matchesSearch =
        quotation.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quotation.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (quotation.customerCompany?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotation Management</h1>
            <p className="text-gray-500">Create and manage sales quotations</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Quotation
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.accepted}</p>
                <p className="text-sm text-gray-500">Accepted</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.rejected}</p>
                <p className="text-sm text-gray-500">Rejected</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.conversionRate}%</p>
                <p className="text-sm text-gray-500">Conversion</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">₹{(mockStats.totalValue / 100000).toFixed(1)}L</p>
                <p className="text-sm text-gray-500">Total Value</p>
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
              placeholder="Search by quotation number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quotation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-medium text-blue-600">{quotation.quotationNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{quotation.customerName}</p>
                      {quotation.customerCompany && (
                        <p className="text-xs text-gray-500">{quotation.customerCompany}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={quotation.status} />
                  </td>
                  <td className="px-4 py-3 text-sm">{quotation.items.length} items</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatCurrency(quotation.grandTotal)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={new Date(quotation.validUntil) < new Date() ? 'text-red-600' : ''}>
                      {quotation.validUntil}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {quotation.createdAt.split(' ')[0]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedQuotation(quotation)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      {quotation.status === 'draft' && (
                        <button className="p-1 hover:bg-gray-100 rounded" title="Send">
                          <Send className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                      <button className="p-1 hover:bg-gray-100 rounded" title="More">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQuotations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border mt-4">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No quotations found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedQuotation && (
        <QuotationDetailModal
          quotation={selectedQuotation}
          onClose={() => setSelectedQuotation(null)}
        />
      )}
    </div>
  );
}
