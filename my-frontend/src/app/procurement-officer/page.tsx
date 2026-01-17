'use client';

import React, { useState, useMemo } from 'react';
import {
  Briefcase,
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
  TrendingUp,
  Package,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ShoppingCart,
  Truck,
  ClipboardList
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface PendingApproval {
  id: string;
  type: 'purchase_request' | 'purchase_order' | 'rfq';
  reference: string;
  title: string;
  requestedBy: string;
  amount: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  date: string;
}

interface TopSupplier {
  id: string;
  name: string;
  category: string;
  totalValue: number;
  orderCount: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// Mock Data
// ============================================================================

const stats = {
  pendingApprovals: 12,
  activeOrders: 45,
  monthlySpend: 285000,
  savingsAchieved: 32500,
  supplierCount: 156,
  pendingDeliveries: 18
};

const pendingApprovals: PendingApproval[] = [
  { id: 'PA001', type: 'purchase_order', reference: 'PO-2024-0089', title: 'Raw Materials - Steel Sheets', requestedBy: 'David Miller', amount: 45000, priority: 'high', date: '2024-01-18' },
  { id: 'PA002', type: 'purchase_request', reference: 'PR-2024-0156', title: 'Office Supplies Q1', requestedBy: 'Sarah Chen', amount: 2500, priority: 'low', date: '2024-01-17' },
  { id: 'PA003', type: 'rfq', reference: 'RFQ-2024-0034', title: 'IT Equipment Upgrade', requestedBy: 'Mike Johnson', amount: 125000, priority: 'medium', date: '2024-01-16' },
  { id: 'PA004', type: 'purchase_order', reference: 'PO-2024-0088', title: 'Packaging Materials', requestedBy: 'Lisa Wong', amount: 18500, priority: 'urgent', date: '2024-01-18' }
];

const topSuppliers: TopSupplier[] = [
  { id: 'SUP001', name: 'Global Steel Corp', category: 'Raw Materials', totalValue: 450000, orderCount: 24, rating: 4.8, trend: 'up' },
  { id: 'SUP002', name: 'TechComponents Inc', category: 'Electronics', totalValue: 285000, orderCount: 18, rating: 4.5, trend: 'stable' },
  { id: 'SUP003', name: 'PackPro Solutions', category: 'Packaging', totalValue: 125000, orderCount: 32, rating: 4.2, trend: 'up' },
  { id: 'SUP004', name: 'Industrial Supplies Co', category: 'MRO', totalValue: 95000, orderCount: 45, rating: 4.6, trend: 'down' }
];

const quickActions = [
  { label: 'New Purchase Request', icon: FileText, href: '/procurement/purchase-request' },
  { label: 'Create Purchase Order', icon: ShoppingCart, href: '/procurement/purchase-orders/create' },
  { label: 'Manage Suppliers', icon: Users, href: '/procurement/supplier-master' },
  { label: 'View Quotations', icon: ClipboardList, href: '/procurement/supplier-quotation' }
];

// ============================================================================
// Sub-Components
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

function PriorityBadge({ priority }: { priority: PendingApproval['priority'] }) {
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

function TypeBadge({ type }: { type: PendingApproval['type'] }) {
  const labels = {
    purchase_request: 'PR',
    purchase_order: 'PO',
    rfq: 'RFQ'
  };

  const config = {
    purchase_request: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purchase_order: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rfq: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config}`}>
      {labels[type]}
    </span>
  );
}

function TrendIndicator({ trend }: { trend: TopSupplier['trend'] }) {
  if (trend === 'up') {
    return <ArrowUpRight className="w-4 h-4 text-green-500" />;
  } else if (trend === 'down') {
    return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  }
  return <span className="w-4 h-4 text-gray-400">―</span>;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProcurementOfficerPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Procurement Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage purchases, suppliers, and procurement activities</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Purchase
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApprovals}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Approvals</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeOrders}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Orders</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.monthlySpend)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Spend</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.savingsAchieved)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Savings Achieved</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.supplierCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Suppliers</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingDeliveries}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Deliveries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
            >
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <action.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Pending Approvals</h3>
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium">
                {pendingApprovals.length} pending
              </span>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={item.type} />
                      <span className="font-medium text-gray-900 dark:text-white">{item.reference}</span>
                    </div>
                    <PriorityBadge priority={item.priority} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{item.title}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{item.requestedBy}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                      Approve
                    </button>
                    <button className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Top Suppliers</h3>
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {topSuppliers.map((supplier) => (
                <div key={supplier.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{supplier.name}</p>
                      <p className="text-xs text-gray-500">{supplier.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendIndicator trend={supplier.trend} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">Total Value</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(supplier.totalValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Orders</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{supplier.orderCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rating</p>
                      <p className="font-semibold text-gray-900 dark:text-white">★ {supplier.rating}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
