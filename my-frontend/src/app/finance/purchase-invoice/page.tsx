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
  Building2,
  Calendar,
  Paperclip,
  Check,
  X,
  MoreVertical,
  Send,
  Printer
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  vendorInvoiceNo: string;
  vendor: {
    name: string;
    code: string;
  };
  purchaseOrder?: string;
  invoiceDate: string;
  dueDate: string;
  receivedDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'partially_paid' | 'cancelled' | 'disputed';
  paymentTerms: string;
  lineItems: number;
  attachments: number;
  createdBy: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockInvoices: PurchaseInvoice[] = [
  {
    id: 'PI001',
    invoiceNumber: 'PI-2024-0156',
    vendorInvoiceNo: 'INV-TS-5678',
    vendor: { name: 'TechSupply Corp', code: 'VEN001' },
    purchaseOrder: 'PO-2024-0089',
    invoiceDate: '2024-01-15',
    dueDate: '2024-02-14',
    receivedDate: '2024-01-16',
    currency: 'USD',
    subtotal: 42500,
    taxAmount: 2550,
    totalAmount: 45050,
    paidAmount: 0,
    balanceDue: 45050,
    status: 'pending_approval',
    paymentTerms: 'Net 30',
    lineItems: 5,
    attachments: 2,
    createdBy: 'John Smith'
  },
  {
    id: 'PI002',
    invoiceNumber: 'PI-2024-0155',
    vendorInvoiceNo: 'INV-DC-1234',
    vendor: { name: 'DataCloud Solutions', code: 'VEN003' },
    purchaseOrder: 'PO-2024-0085',
    invoiceDate: '2024-01-10',
    dueDate: '2024-02-09',
    receivedDate: '2024-01-11',
    currency: 'USD',
    subtotal: 28000,
    taxAmount: 0,
    totalAmount: 28000,
    paidAmount: 28000,
    balanceDue: 0,
    status: 'paid',
    paymentTerms: 'Net 30',
    lineItems: 3,
    attachments: 1,
    createdBy: 'Sarah Chen'
  },
  {
    id: 'PI003',
    invoiceNumber: 'PI-2024-0154',
    vendorInvoiceNo: 'INV-SEC-9999',
    vendor: { name: 'SecurePay Ltd', code: 'VEN002' },
    invoiceDate: '2024-01-08',
    dueDate: '2024-01-23',
    receivedDate: '2024-01-09',
    currency: 'USD',
    subtotal: 15000,
    taxAmount: 900,
    totalAmount: 15900,
    paidAmount: 7950,
    balanceDue: 7950,
    status: 'partially_paid',
    paymentTerms: 'Net 15',
    lineItems: 2,
    attachments: 3,
    createdBy: 'Mike Johnson'
  },
  {
    id: 'PI004',
    invoiceNumber: 'PI-2024-0153',
    vendorInvoiceNo: 'INV-OFF-4567',
    vendor: { name: 'Office Pro Supplies', code: 'VEN008' },
    purchaseOrder: 'PO-2024-0080',
    invoiceDate: '2024-01-05',
    dueDate: '2024-01-20',
    receivedDate: '2024-01-06',
    currency: 'USD',
    subtotal: 5500,
    taxAmount: 385,
    totalAmount: 5885,
    paidAmount: 0,
    balanceDue: 5885,
    status: 'disputed',
    paymentTerms: 'Net 15',
    lineItems: 8,
    attachments: 4,
    createdBy: 'Lisa Wong'
  },
  {
    id: 'PI005',
    invoiceNumber: 'PI-2024-0152',
    vendorInvoiceNo: 'INV-LOG-2345',
    vendor: { name: 'Global Logistics Inc', code: 'VEN005' },
    purchaseOrder: 'PO-2024-0078',
    invoiceDate: '2024-01-03',
    dueDate: '2024-02-02',
    receivedDate: '2024-01-04',
    currency: 'USD',
    subtotal: 18500,
    taxAmount: 1295,
    totalAmount: 19795,
    paidAmount: 0,
    balanceDue: 19795,
    status: 'approved',
    paymentTerms: 'Net 30',
    lineItems: 4,
    attachments: 2,
    createdBy: 'David Brown'
  }
];

const stats = {
  totalInvoices: 156,
  pendingApproval: 12,
  totalPayable: 285000,
  overdueAmount: 45000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: PurchaseInvoice['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
    pending_approval: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    paid: { label: 'Paid', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    partially_paid: { label: 'Partial', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Clock },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle },
    disputed: { label: 'Disputed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function isOverdue(dueDate: string, status: string): boolean {
  if (['paid', 'cancelled'].includes(status)) return false;
  return new Date(dueDate) < new Date();
}

// ============================================================================
// Main Component
// ============================================================================

export default function PurchaseInvoicePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  const filteredInvoices = useMemo(() => {
    return mockInvoices.filter(invoice => {
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.vendorInvoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.vendor.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      const matchesVendor = vendorFilter === 'all' || invoice.vendor.code === vendorFilter;
      return matchesSearch && matchesStatus && matchesVendor;
    });
  }, [searchQuery, statusFilter, vendorFilter]);

  const vendors = [...new Set(mockInvoices.map(i => i.vendor.name))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Invoices</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage vendor invoices and payables</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Invoice
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalInvoices}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoices</p>
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
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalPayable)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Payable</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.overdueAmount)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
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
              placeholder="Search by invoice number or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Vendors</option>
            {vendors.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        {/* Invoices Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Dates</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{invoice.vendorInvoiceNo}</p>
                    {invoice.purchaseOrder && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">PO: {invoice.purchaseOrder}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{invoice.vendor.name}</p>
                        <p className="text-xs text-gray-500">{invoice.vendor.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{invoice.invoiceDate}</p>
                    <p className={`text-xs ${isOverdue(invoice.dueDate, invoice.status) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500'}`}>
                      Due: {invoice.dueDate}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.totalAmount)}</p>
                    <p className="text-xs text-gray-500">Tax: {formatCurrency(invoice.taxAmount)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={`font-bold ${invoice.balanceDue > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(invoice.balanceDue)}
                    </p>
                    {invoice.paidAmount > 0 && (
                      <p className="text-xs text-gray-500">Paid: {formatCurrency(invoice.paidAmount)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={invoice.status} />
                    <div className="flex gap-2 mt-1 text-xs text-gray-500">
                      <span>{invoice.lineItems} items</span>
                      {invoice.attachments > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Paperclip className="w-3 h-3" />
                          {invoice.attachments}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      {['draft', 'pending_approval'].includes(invoice.status) && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                      {invoice.status === 'pending_approval' && (
                        <button className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Approve">
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                      )}
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Print">
                        <Printer className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No purchase invoices found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
