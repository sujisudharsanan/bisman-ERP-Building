'use client';

import React, { useState } from 'react';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShoppingCart,
  Truck,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  Warehouse,
  ClipboardList,
  RefreshCw
} from 'lucide-react';

interface StoreMetric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'overstock' | 'expiring' | 'reorder';
  item: string;
  sku: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
}

interface PendingTask {
  id: string;
  type: string;
  description: string;
  priority: 'urgent' | 'high' | 'normal';
  dueDate: string;
  status: 'pending' | 'in_progress';
}

const storeMetrics: StoreMetric[] = [
  { label: 'Total SKUs', value: '2,456', change: 12, trend: 'up', icon: <Package className="w-6 h-6" /> },
  { label: 'Stock Value', value: '₹45.2L', change: 8.5, trend: 'up', icon: <BarChart3 className="w-6 h-6" /> },
  { label: 'Low Stock Items', value: 23, change: -15, trend: 'down', icon: <AlertTriangle className="w-6 h-6" /> },
  { label: 'Pending Receipts', value: 8, change: 3, trend: 'up', icon: <Truck className="w-6 h-6" /> },
];

const inventoryAlerts: InventoryAlert[] = [
  { id: '1', type: 'low_stock', item: 'Hydraulic Pump HP-200', sku: 'HP-200', message: 'Stock below minimum level (5 units remaining)', severity: 'high', timestamp: '10 min ago' },
  { id: '2', type: 'reorder', item: 'Bearing Assembly BA-150', sku: 'BA-150', message: 'Reorder point reached - Place order', severity: 'medium', timestamp: '1 hour ago' },
  { id: '3', type: 'expiring', item: 'Lubricant Oil LO-500', sku: 'LO-500', message: 'Batch expires in 30 days', severity: 'medium', timestamp: '2 hours ago' },
  { id: '4', type: 'overstock', item: 'Gasket Set GS-100', sku: 'GS-100', message: 'Stock exceeds maximum level by 150 units', severity: 'low', timestamp: '3 hours ago' },
];

const pendingTasks: PendingTask[] = [
  { id: '1', type: 'Stock Receipt', description: 'Receive PO-2026-0089 from ABC Suppliers', priority: 'urgent', dueDate: 'Today', status: 'pending' },
  { id: '2', type: 'Stock Count', description: 'Monthly cycle count for Zone A', priority: 'high', dueDate: 'Tomorrow', status: 'in_progress' },
  { id: '3', type: 'Transfer', description: 'Transfer 50 units of HP-200 to Branch Warehouse', priority: 'normal', dueDate: 'Jan 18', status: 'pending' },
  { id: '4', type: 'Quality Check', description: 'Inspect incoming shipment from XYZ Corp', priority: 'high', dueDate: 'Today', status: 'pending' },
];

export default function StoreInchargeDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      normal: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[priority]}`}>{priority}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Warehouse className="w-7 h-7 text-blue-600" />
              Store Incharge Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage inventory, stock movements, and store operations
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${refreshing ? 'opacity-75' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {storeMetrics.map((metric, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                  {metric.icon}
                </div>
                <div className={`flex items-center gap-1 text-sm ${metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                  {metric.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(metric.change)}%
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Inventory Alerts
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {inventoryAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{alert.item}</p>
                      <p className="text-sm opacity-75">SKU: {alert.sku}</p>
                      <p className="text-sm mt-1">{alert.message}</p>
                    </div>
                    <span className="text-xs opacity-75">{alert.timestamp}</span>
                  </div>
                </div>
              ))}
              {inventoryAlerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No alerts - All inventory levels normal</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                Pending Tasks
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          {task.type}
                        </span>
                        {getPriorityBadge(task.priority)}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white mt-2">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      Due: {task.dueDate}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${task.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}>
                      {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <Package className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Stock Entry</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              <Truck className="w-8 h-8 text-green-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Receive Stock</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <Box className="w-8 h-8 text-purple-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock Transfer</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
              <ClipboardList className="w-8 h-8 text-orange-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stock Count</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
