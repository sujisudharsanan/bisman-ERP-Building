'use client';

/**
 * Invoices & Payments Page
 * BISMAN ERP - Invoice History and Payment Management
 *
 * Features:
 * - Invoice list with date, amount, status (paid/failed/overdue), PDF download
 * - Filter by status, date range
 * - Export CSV/print functionality
 * - Retry failed payments
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Eye,
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  RefreshCw,
  Printer,
  ArrowLeft,
  ExternalLink,
  MoreVertical,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Invoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  currency: string;
  status: 'paid' | 'open' | 'overdue' | 'failed' | 'void' | 'draft';
  description: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  pdfUrl: string | null;
  hostedUrl: string | null;
  paymentMethod: {
    type: string;
    last4: string;
    brand: string;
  } | null;
}

interface InvoiceSummary {
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  invoiceCount: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusConfig(status: Invoice['status']) {
  switch (status) {
    case 'paid':
      return {
        label: 'Paid',
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        icon: CheckCircle,
      };
    case 'open':
      return {
        label: 'Open',
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        icon: Clock,
      };
    case 'overdue':
      return {
        label: 'Overdue',
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        icon: AlertCircle,
      };
    case 'failed':
      return {
        label: 'Failed',
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        icon: XCircle,
      };
    case 'void':
      return {
        label: 'Void',
        color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
        icon: XCircle,
      };
    case 'draft':
      return {
        label: 'Draft',
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        icon: FileText,
      };
    default:
      return {
        label: status,
        color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
        icon: FileText,
      };
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Summary Cards
function SummaryCards({ summary }: { summary: InvoiceSummary }) {
  const cards = [
    { label: 'Total Paid', value: summary.totalPaid, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Outstanding', value: summary.totalOutstanding, icon: Clock, color: 'text-blue-500' },
    { label: 'Overdue', value: summary.totalOverdue, icon: AlertCircle, color: 'text-red-500' },
    { label: 'Total Invoices', value: summary.invoiceCount, icon: FileText, color: 'text-violet-500', isCurrency: false },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {card.isCurrency === false ? card.value : formatCurrency(card.value)}
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Filters
function InvoiceFilters({
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
  searchQuery,
  setSearchQuery,
}: {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  dateRange: { from: string; to: string };
  setDateRange: (v: { from: string; to: string }) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search invoices..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
      >
        <option value="all">All Statuses</option>
        <option value="paid">Paid</option>
        <option value="open">Open</option>
        <option value="overdue">Overdue</option>
        <option value="failed">Failed</option>
        <option value="void">Void</option>
      </select>

      {/* Date Range */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
}

// Invoice Row
function InvoiceRow({
  invoice,
  onView,
  onDownload,
  onRetry,
}: {
  invoice: Invoice;
  onView: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onRetry: (invoice: Invoice) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{invoice.number}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.description}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-gray-900 dark:text-white">{formatDate(invoice.date)}</p>
        {invoice.dueDate && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Due: {formatDate(invoice.dueDate)}</p>
        )}
      </td>
      <td className="px-4 py-4">
        <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(invoice.amount, invoice.currency)}</p>
        {invoice.amountPaid > 0 && invoice.amountPaid < invoice.amount && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Paid: {formatCurrency(invoice.amountPaid, invoice.currency)}
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-4">
        {invoice.paymentMethod ? (
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              •••• {invoice.paymentMethod.last4}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          {invoice.pdfUrl && (
            <button
              onClick={() => onDownload(invoice)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onView(invoice)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {(invoice.status === 'failed' || invoice.status === 'open' || invoice.status === 'overdue') && (
            <button
              onClick={() => onRetry(invoice)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400"
              title="Retry Payment"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {invoice.hostedUrl && (
            <a
              href={invoice.hostedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400"
              title="View in Stripe"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// Invoice Detail Modal
function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
}: {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !invoice) return null;

  const statusConfig = getStatusConfig(invoice.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Invoice {invoice.number}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(invoice.date)}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Invoice Items */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Items</h3>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-600">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-slate-600 last:border-0">
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{item.description}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.amount, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Tax</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(0, invoice.currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-slate-600">
                <span className="font-medium text-gray-900 dark:text-white">Total</span>
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.amount, invoice.currency)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
                  <span className="text-green-600">{formatCurrency(invoice.amountPaid, invoice.currency)}</span>
                </div>
              )}
              {invoice.amount - invoice.amountPaid > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Balance Due</span>
                  <span className="text-red-600">{formatCurrency(invoice.amount - invoice.amountPaid, invoice.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method */}
          {invoice.paymentMethod && (
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</h4>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white capitalize">
                  {invoice.paymentMethod.brand} •••• {invoice.paymentMethod.last4}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Close
          </button>
          {invoice.pdfUrl && (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InvoicesPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({
    totalPaid: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
    invoiceCount: 0,
  });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/billing/invoices`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setSummary(data.summary || {});
      } else {
        generateDemoData();
      }
    } catch {
      generateDemoData();
    } finally {
      setIsLoading(false);
    }
  }, [baseURL]);

  const generateDemoData = () => {
    const demoInvoices: Invoice[] = [
      {
        id: 'inv_1',
        number: 'INV-2024-001',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 79,
        amountPaid: 79,
        currency: 'USD',
        status: 'paid',
        description: 'Pro Plan - Monthly Subscription',
        items: [{ description: 'Pro Plan (Monthly)', quantity: 1, unitPrice: 79, amount: 79 }],
        pdfUrl: '#',
        hostedUrl: '#',
        paymentMethod: { type: 'card', last4: '4242', brand: 'visa' },
      },
      {
        id: 'inv_2',
        number: 'INV-2024-002',
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 79,
        amountPaid: 0,
        currency: 'USD',
        status: 'open',
        description: 'Pro Plan - Monthly Subscription',
        items: [{ description: 'Pro Plan (Monthly)', quantity: 1, unitPrice: 79, amount: 79 }],
        pdfUrl: '#',
        hostedUrl: '#',
        paymentMethod: null,
      },
      {
        id: 'inv_3',
        number: 'INV-2024-003',
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 79,
        amountPaid: 79,
        currency: 'USD',
        status: 'paid',
        description: 'Pro Plan - Monthly Subscription',
        items: [{ description: 'Pro Plan (Monthly)', quantity: 1, unitPrice: 79, amount: 79 }],
        pdfUrl: '#',
        hostedUrl: '#',
        paymentMethod: { type: 'card', last4: '4242', brand: 'visa' },
      },
      {
        id: 'inv_4',
        number: 'INV-2024-004',
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 29,
        amountPaid: 29,
        currency: 'USD',
        status: 'paid',
        description: 'Starter Plan - Monthly Subscription',
        items: [{ description: 'Starter Plan (Monthly)', quantity: 1, unitPrice: 29, amount: 29 }],
        pdfUrl: '#',
        hostedUrl: '#',
        paymentMethod: { type: 'card', last4: '4242', brand: 'visa' },
      },
      {
        id: 'inv_5',
        number: 'INV-2023-012',
        date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 29,
        amountPaid: 0,
        currency: 'USD',
        status: 'failed',
        description: 'Starter Plan - Monthly Subscription',
        items: [{ description: 'Starter Plan (Monthly)', quantity: 1, unitPrice: 29, amount: 29 }],
        pdfUrl: '#',
        hostedUrl: '#',
        paymentMethod: { type: 'card', last4: '1234', brand: 'mastercard' },
      },
    ];

    setInvoices(demoInvoices);
    setSummary({
      totalPaid: 216,
      totalOutstanding: 79,
      totalOverdue: 29,
      invoiceCount: 5,
    });
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDownload = (invoice: Invoice) => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    }
  };

  const handleRetryPayment = async (invoice: Invoice) => {
    try {
      const response = await fetch(`${baseURL}/api/billing/invoices/${invoice.id}/pay`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        fetchInvoices();
      }
    } catch (error) {
      console.error('Retry payment failed:', error);
    }
  };

  const exportCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Amount', 'Status', 'Description'];
    const rows = filteredInvoices.map((inv) => [
      inv.number,
      formatDate(inv.date),
      formatCurrency(inv.amount, inv.currency),
      inv.status,
      inv.description,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (searchQuery && !inv.number.toLowerCase().includes(searchQuery.toLowerCase()) && !inv.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (dateRange.from && new Date(inv.date) < new Date(dateRange.from)) return false;
    if (dateRange.to && new Date(inv.date) > new Date(dateRange.to)) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/billing"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FileText className="w-7 h-7 text-violet-500" />
                Invoices & Payments
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              View and download your invoice history
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards summary={summary} />

        {/* Filters */}
        <InvoiceFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          dateRange={dateRange}
          setDateRange={setDateRange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Invoice Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map((invoice) => (
                    <InvoiceRow
                      key={invoice.id}
                      invoice={invoice}
                      onView={setSelectedInvoice}
                      onDownload={handleDownload}
                      onRetry={handleRetryPayment}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No invoices found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      currentPage === page
                        ? 'bg-violet-600 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Invoice Detail Modal */}
        <AnimatePresence>
          <InvoiceDetailModal
            invoice={selectedInvoice}
            isOpen={!!selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
