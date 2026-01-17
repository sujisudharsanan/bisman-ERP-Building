'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  User,
  Building2,
  Calendar,
  Package,
  Truck,
  FileText
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    code: string;
    contact?: string;
  };
  orderDate: string;
  deliveryDate: string;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  currency: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  lineItems: number;
  deliveryAddress: string;
  paymentTerms: string;
  salesRep: string;
  notes?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockOrders: SalesOrder[] = [
  {
    id: 'SO001',
    orderNumber: 'SO-2024-0156',
    customer: { name: 'Global Industries Inc', code: 'CUST001', contact: 'John Smith' },
    orderDate: '2024-01-18',
    deliveryDate: '2024-01-25',
    status: 'processing',
    priority: 'high',
    currency: 'USD',
    subtotal: 45000,
    tax: 3600,
    shipping: 500,
    total: 49100,
    lineItems: 5,
    deliveryAddress: '456 Industrial Way, Chicago, IL 60601',
    paymentTerms: 'Net 30',
    salesRep: 'Sarah Chen'
  },
  {
    id: 'SO002',
    orderNumber: 'SO-2024-0155',
    customer: { name: 'TechStart Solutions', code: 'CUST015', contact: 'Mike Johnson' },
    orderDate: '2024-01-17',
    deliveryDate: '2024-01-24',
    status: 'shipped',
    priority: 'medium',
    currency: 'USD',
    subtotal: 28500,
    tax: 2280,
    shipping: 350,
    total: 31130,
    lineItems: 3,
    deliveryAddress: '789 Tech Park, Austin, TX 78701',
    paymentTerms: 'Net 30',
    salesRep: 'David Brown'
  },
  {
    id: 'SO003',
    orderNumber: 'SO-2024-0154',
    customer: { name: 'Premium Products Ltd', code: 'CUST008', contact: 'Lisa Wong' },
    orderDate: '2024-01-16',
    deliveryDate: '2024-01-23',
    status: 'delivered',
    priority: 'medium',
    currency: 'USD',
    subtotal: 15750,
    tax: 1260,
    shipping: 200,
    total: 17210,
    lineItems: 8,
    deliveryAddress: '321 Commerce St, New York, NY 10001',
    paymentTerms: 'Net 15',
    salesRep: 'Sarah Chen'
  },
  {
    id: 'SO004',
    orderNumber: 'SO-2024-0153',
    customer: { name: 'QuickServe Retail', code: 'CUST022', contact: 'Jennifer Lee' },
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-18',
    status: 'confirmed',
    priority: 'urgent',
    currency: 'USD',
    subtotal: 8900,
    tax: 712,
    shipping: 150,
    total: 9762,
    lineItems: 2,
    deliveryAddress: '555 Retail Plaza, Denver, CO 80201',
    paymentTerms: 'COD',
    salesRep: 'Mike Anderson'
  },
  {
    id: 'SO005',
    orderNumber: 'SO-2024-0152',
    customer: { name: 'BuildCorp Enterprises', code: 'CUST003' },
    orderDate: '2024-01-14',
    deliveryDate: '2024-01-28',
    status: 'draft',
    priority: 'low',
    currency: 'USD',
    subtotal: 125000,
    tax: 10000,
    shipping: 1500,
    total: 136500,
    lineItems: 15,
    deliveryAddress: '888 Construction Ave, Seattle, WA 98101',
    paymentTerms: 'Net 45',
    salesRep: 'David Brown',
    notes: 'Large project order - requires approval'
  }
];

const stats = {
  totalOrders: 156,
  pendingShipment: 23,
  totalValue: 2850000,
  avgOrderValue: 18269
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: SalesOrder['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
    confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    processing: { label: 'Processing', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    shipped: { label: 'Shipped', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
    delivered: { label: 'Delivered', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: SalesOrder['priority'] }) {
  const config = {
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  }[priority];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {priority}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function SalesOrderViewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    return mockOrders.filter(order => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchQuery, statusFilter, priorityFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Orders</h1>
            <p className="text-gray-500 dark:text-gray-400">View and track customer orders</p>
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
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Orders</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Package className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingShipment}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Shipment</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.avgOrderValue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Order Value</p>
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
              placeholder="Search by order number or customer..."
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
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Dates</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.lineItems} items</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer.name}</p>
                        <p className="text-xs text-gray-500">{order.customer.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{order.orderDate}</p>
                    <p className="text-xs text-gray-500">Delivery: {order.deliveryDate}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-gray-500">{order.paymentTerms}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={order.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      {['draft', 'confirmed'].includes(order.status) && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No sales orders found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
