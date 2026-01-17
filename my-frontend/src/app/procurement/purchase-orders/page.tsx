'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Truck,
  Package,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Send,
  Printer,
  Copy
} from 'lucide-react';

// Types
interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  vendorCode: string;
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'partial' | 'received' | 'cancelled';
  items: number;
  priority: 'high' | 'medium' | 'low';
  buyer: string;
  paymentTerms: string;
}

// Mock data
const mockPurchaseOrders: PurchaseOrder[] = [
  { id: '1', poNumber: 'PO-2026-0156', vendor: 'Steel Corp Industries', vendorCode: 'VND-001', orderDate: '2026-01-15', expectedDelivery: '2026-01-30', totalAmount: 125000, status: 'approved', items: 8, priority: 'high', buyer: 'John Smith', paymentTerms: 'Net 30' },
  { id: '2', poNumber: 'PO-2026-0155', vendor: 'Tech Solutions Ltd', vendorCode: 'VND-002', orderDate: '2026-01-14', expectedDelivery: '2026-01-28', totalAmount: 45000, status: 'sent', items: 5, priority: 'medium', buyer: 'Sarah Chen', paymentTerms: 'Net 45' },
  { id: '3', poNumber: 'PO-2026-0154', vendor: 'Office Pro Supplies', vendorCode: 'VND-003', orderDate: '2026-01-12', expectedDelivery: '2026-01-20', totalAmount: 8500, status: 'partial', items: 12, priority: 'low', buyer: 'Mike Johnson', paymentTerms: 'Net 15' },
  { id: '4', poNumber: 'PO-2026-0153', vendor: 'Global Manufacturing', vendorCode: 'VND-004', orderDate: '2026-01-10', expectedDelivery: '2026-01-25', totalAmount: 87500, status: 'received', items: 6, priority: 'high', buyer: 'Lisa Wang', paymentTerms: 'Net 30' },
  { id: '5', poNumber: 'PO-2026-0152', vendor: 'Premium Materials Inc', vendorCode: 'VND-005', orderDate: '2026-01-08', expectedDelivery: '2026-01-22', totalAmount: 156000, status: 'pending', items: 10, priority: 'high', buyer: 'David Brown', paymentTerms: 'Net 60' },
  { id: '6', poNumber: 'PO-2026-0151', vendor: 'FastParts Supplier', vendorCode: 'VND-006', orderDate: '2026-01-05', expectedDelivery: '2026-01-15', totalAmount: 23400, status: 'received', items: 15, priority: 'medium', buyer: 'John Smith', paymentTerms: 'Net 30' },
  { id: '7', poNumber: 'PO-2026-0150', vendor: 'Industrial Components', vendorCode: 'VND-007', orderDate: '2026-01-03', expectedDelivery: '2026-01-18', totalAmount: 67000, status: 'cancelled', items: 4, priority: 'low', buyer: 'Sarah Chen', paymentTerms: 'Net 30' },
  { id: '8', poNumber: 'PO-2026-0149', vendor: 'Quality Goods Ltd', vendorCode: 'VND-008', orderDate: '2026-01-02', expectedDelivery: '2026-01-17', totalAmount: 34500, status: 'draft', items: 7, priority: 'medium', buyer: 'Mike Johnson', paymentTerms: 'Net 45' }
];

const poMetrics = {
  totalOrders: 156,
  pendingApproval: 12,
  inTransit: 28,
  receivedThisMonth: 45,
  totalValue: 2850000,
  onTimeDelivery: 94.5,
  avgLeadTime: 12,
  openOrders: 42
};

const statusCounts = [
  { status: 'draft', count: 8, color: 'bg-gray-500' },
  { status: 'pending', count: 12, color: 'bg-yellow-500' },
  { status: 'approved', count: 15, color: 'bg-blue-500' },
  { status: 'sent', count: 18, color: 'bg-indigo-500' },
  { status: 'partial', count: 5, color: 'bg-orange-500' },
  { status: 'received', count: 45, color: 'bg-green-500' },
  { status: 'cancelled', count: 3, color: 'bg-red-500' }
];

export default function PurchaseOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('30d');

  const filteredOrders = useMemo(() => {
    return mockPurchaseOrders.filter((po) => {
      const matchesSearch = 
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.buyer.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || po.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchTerm, statusFilter, priorityFilter]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'approved': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'sent': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'partial': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'received': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    return colors[status] || colors['draft'];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'partial': return <Package className="w-4 h-4" />;
      case 'received': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
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

  const getDaysUntilDelivery = (deliveryDate: string) => {
    const today = new Date();
    const delivery = new Date(deliveryDate);
    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-indigo-500" />
              Purchase Orders
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create, track, and manage purchase orders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create PO</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Open Orders</span>
            <ShoppingCart className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{poMetrics.openOrders}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatCurrency(poMetrics.totalValue)} total value
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Pending Approval</span>
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{poMetrics.pendingApproval}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Awaiting review</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">In Transit</span>
            <Truck className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{poMetrics.inTransit}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Expected this week: 12</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">On-Time Delivery</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">{poMetrics.onTimeDelivery}%</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Last 30 days</p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Status Overview</h2>
        <div className="flex flex-wrap gap-4">
          {statusCounts.map((item) => (
            <button
              key={item.status}
              onClick={() => setStatusFilter(item.status)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                statusFilter === item.status 
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${item.color}`}></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{item.status}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">({item.count})</span>
            </button>
          ))}
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              statusFilter === 'all' 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="p-4 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by PO number, vendor, or buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
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
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">PO Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Order Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Delivery</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((po) => {
                const daysUntilDelivery = getDaysUntilDelivery(po.expectedDelivery);
                return (
                  <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${getPriorityColor(po.priority)}`} />
                        <div>
                          <div className="font-medium text-indigo-600 dark:text-indigo-400">{po.poNumber}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{po.buyer}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{po.vendor}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{po.vendorCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {po.orderDate}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">{po.expectedDelivery}</div>
                      <div className={`text-xs ${daysUntilDelivery < 0 ? 'text-red-500' : daysUntilDelivery <= 3 ? 'text-yellow-500' : 'text-gray-500'}`}>
                        {daysUntilDelivery < 0 ? `${Math.abs(daysUntilDelivery)} days overdue` : daysUntilDelivery === 0 ? 'Today' : `${daysUntilDelivery} days left`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(po.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                      {po.items}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                        {getStatusIcon(po.status)}
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Print">
                          <Printer className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Duplicate">
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="More">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No purchase orders found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredOrders.length} of {mockPurchaseOrders.length} orders
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
