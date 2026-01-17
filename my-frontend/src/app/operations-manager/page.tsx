'use client';

import React, { useState, useMemo } from 'react';
import {
  Settings,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Users,
  ClipboardList,
  Wrench,
  Target,
  ChevronRight,
  RefreshCw,
  Download
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface KPIMetric {
  id: string;
  name: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  unit?: string;
  target?: number;
  status: 'good' | 'warning' | 'critical';
}

interface ProductionOrder {
  id: string;
  orderNumber: string;
  product: string;
  quantity: number;
  completed: number;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

// ============================================================================
// Mock Data
// ============================================================================

const kpiMetrics: KPIMetric[] = [
  { id: 'KPI1', name: 'OEE', value: 87.5, change: 2.3, changeType: 'increase', unit: '%', target: 90, status: 'good' },
  { id: 'KPI2', name: 'Production Output', value: 1250, change: 5.1, changeType: 'increase', unit: 'units/day', status: 'good' },
  { id: 'KPI3', name: 'Quality Rate', value: 98.2, change: 0.5, changeType: 'increase', unit: '%', target: 99, status: 'good' },
  { id: 'KPI4', name: 'On-Time Delivery', value: 94.5, change: 1.2, changeType: 'decrease', unit: '%', target: 97, status: 'warning' },
  { id: 'KPI5', name: 'Inventory Turnover', value: 12.4, unit: 'x', status: 'good' },
  { id: 'KPI6', name: 'Equipment Uptime', value: 96.8, unit: '%', target: 98, status: 'warning' }
];

const productionOrders: ProductionOrder[] = [
  { id: 'PO001', orderNumber: 'WO-2024-0089', product: 'Widget Pro X500', quantity: 500, completed: 425, status: 'in_progress', dueDate: '2024-01-22', priority: 'high' },
  { id: 'PO002', orderNumber: 'WO-2024-0088', product: 'Gadget Standard A200', quantity: 1000, completed: 1000, status: 'completed', dueDate: '2024-01-20', priority: 'medium' },
  { id: 'PO003', orderNumber: 'WO-2024-0090', product: 'Component Set C100', quantity: 250, completed: 75, status: 'delayed', dueDate: '2024-01-19', priority: 'critical' },
  { id: 'PO004', orderNumber: 'WO-2024-0091', product: 'Assembly Kit B300', quantity: 800, completed: 0, status: 'planned', dueDate: '2024-01-25', priority: 'medium' },
  { id: 'PO005', orderNumber: 'WO-2024-0092', product: 'Premium Unit P400', quantity: 150, completed: 50, status: 'in_progress', dueDate: '2024-01-23', priority: 'high' }
];

const alerts: Alert[] = [
  { id: 'A1', type: 'error', message: 'Machine M-101 requires immediate maintenance', timestamp: '10 min ago', acknowledged: false },
  { id: 'A2', type: 'warning', message: 'Low stock alert: Raw Material RM-456', timestamp: '25 min ago', acknowledged: false },
  { id: 'A3', type: 'warning', message: 'Quality inspection pending for Batch B-789', timestamp: '1 hour ago', acknowledged: true },
  { id: 'A4', type: 'info', message: 'Scheduled maintenance for Line 3 tomorrow', timestamp: '2 hours ago', acknowledged: true }
];

const stats = {
  activeOrders: 12,
  pendingShipments: 8,
  qualityIssues: 3,
  maintenanceDue: 2
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: ProductionOrder['status'] }) {
  const config = {
    planned: { label: 'Planned', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    delayed: { label: 'Delayed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  }[status];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ProductionOrder['priority'] }) {
  const config = {
    low: 'text-gray-500',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500'
  }[priority];

  return (
    <span className={`text-xs font-medium capitalize ${config}`}>
      {priority}
    </span>
  );
}

function AlertIcon({ type }: { type: Alert['type'] }) {
  const config = {
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  }[type];

  return <AlertTriangle className={`w-4 h-4 ${config}`} />;
}

// ============================================================================
// Main Component
// ============================================================================

export default function OperationsManagerPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operations Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Real-time production and operations monitoring</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeOrders}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Orders</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Truck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingShipments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Shipments</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.qualityIssues}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Quality Issues</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Wrench className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.maintenanceDue}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Maintenance Due</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          {kpiMetrics.map((kpi) => (
            <div key={kpi.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{kpi.name}</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</span>
                {kpi.unit && <span className="text-sm text-gray-500 mb-0.5">{kpi.unit}</span>}
              </div>
              {kpi.change && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${
                  kpi.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {kpi.changeType === 'increase' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.change}%
                </div>
              )}
              {kpi.target && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${kpi.status === 'good' ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min((Number(kpi.value) / kpi.target) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Production Orders */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Production Orders</h2>
              <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {productionOrders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{order.orderNumber}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.product}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.completed} / {order.quantity}
                      </p>
                      <PriorityBadge priority={order.priority} />
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        order.status === 'completed' ? 'bg-green-500' :
                        order.status === 'delayed' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${(order.completed / order.quantity) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Due: {order.dueDate}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Alerts</h2>
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                {alerts.filter(a => !a.acknowledged).length} new
              </span>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 ${alert.acknowledged ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <AlertIcon type={alert.type} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
                    </div>
                    {!alert.acknowledged && (
                      <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-5 gap-4">
          {[
            { icon: ClipboardList, label: 'Work Orders', color: 'blue' },
            { icon: Package, label: 'Inventory', color: 'green' },
            { icon: Truck, label: 'Shipping', color: 'purple' },
            { icon: Wrench, label: 'Maintenance', color: 'orange' },
            { icon: BarChart3, label: 'Reports', color: 'teal' }
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col items-center gap-2"
              >
                <div className={`p-3 bg-${action.color}-100 dark:bg-${action.color}-900/30 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${action.color}-600 dark:text-${action.color}-400`} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
