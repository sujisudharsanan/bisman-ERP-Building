'use client';

import React from 'react';
import { Warehouse, Package, TrendingUp, TrendingDown, AlertTriangle, Truck, ClipboardList, Users, Clock, CheckCircle, ArrowRight, BarChart3 } from 'lucide-react';

export default function HubInchargeDashboard() {
  const stats = [
    { label: 'Total Stock Items', value: '1,245', change: '+5.2%', isPositive: true, icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'Low Stock Alerts', value: '12', change: '+3', isPositive: false, icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
    { label: 'Pending Receipts', value: '8', change: '-2', isPositive: true, icon: Truck, color: 'text-orange-600 bg-orange-100' },
    { label: 'Pending Dispatches', value: '15', change: '+4', isPositive: false, icon: ClipboardList, color: 'text-purple-600 bg-purple-100' },
  ];

  const lowStockItems = [
    { item: 'Raw Material A', sku: 'RM-001', current: 25, minimum: 50, unit: 'kg' },
    { item: 'Component X', sku: 'CP-045', current: 100, minimum: 200, unit: 'pcs' },
    { item: 'Packaging Box M', sku: 'PK-012', current: 150, minimum: 300, unit: 'pcs' },
    { item: 'Chemical Y', sku: 'CH-089', current: 5, minimum: 20, unit: 'L' },
    { item: 'Spare Part Z', sku: 'SP-034', current: 8, minimum: 15, unit: 'pcs' },
  ];

  const pendingReceipts = [
    { grn: 'GRN-2025-015', vendor: 'ABC Supplies', items: 8, expected: '2025-01-16' },
    { grn: 'GRN-2025-016', vendor: 'XYZ Corp', items: 5, expected: '2025-01-16' },
    { grn: 'GRN-2025-017', vendor: 'Industrial Parts', items: 12, expected: '2025-01-17' },
  ];

  const pendingDispatches = [
    { dn: 'DN-2025-089', customer: 'ABC Corp', items: 15, scheduleDate: '2025-01-16' },
    { dn: 'DN-2025-090', customer: 'XYZ Ltd', items: 8, scheduleDate: '2025-01-16' },
    { dn: 'DN-2025-091', customer: 'DEF Industries', items: 22, scheduleDate: '2025-01-17' },
  ];

  const warehouseZones = [
    { zone: 'Zone A', capacity: 85, items: 450, status: 'Normal' },
    { zone: 'Zone B', capacity: 92, items: 380, status: 'Near Full' },
    { zone: 'Zone C', capacity: 45, items: 215, status: 'Available' },
    { zone: 'Zone D', capacity: 78, items: 290, status: 'Normal' },
  ];

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 90) return 'bg-red-500';
    if (capacity >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Warehouse className="w-8 h-8 text-indigo-600" />Hub Incharge Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Warehouse and inventory operations overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>{stat.change}</span>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />Low Stock Alerts
            </h2>
            <a href="#" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Current</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Minimum</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lowStockItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.item}</div>
                      <div className="text-xs text-gray-500">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-red-600 font-medium">{item.current} {item.unit}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">{item.minimum} {item.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        -{item.minimum - item.current} {item.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warehouse Zones */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />Warehouse Capacity
            </h2>
          </div>
          <div className="p-4 space-y-4">
            {warehouseZones.map((zone, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{zone.zone}</span>
                  <span className="text-sm text-gray-500">{zone.items} items • {zone.capacity}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${getCapacityColor(zone.capacity)}`} style={{ width: `${zone.capacity}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Receipts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-500" />Pending Receipts
            </h2>
            <a href="#" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="p-4 space-y-3">
            {pendingReceipts.map((receipt, index) => (
              <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{receipt.grn}</div>
                  <div className="text-xs text-gray-500">{receipt.vendor} • {receipt.items} items</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{new Date(receipt.expected).toLocaleDateString()}</span>
                  <button className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded">
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Dispatches */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-500" />Pending Dispatches
            </h2>
            <a href="#" className="text-sm text-blue-600 hover:underline">View all</a>
          </div>
          <div className="p-4 space-y-3">
            {pendingDispatches.map((dispatch, index) => (
              <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{dispatch.dn}</div>
                  <div className="text-xs text-gray-500">{dispatch.customer} • {dispatch.items} items</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{new Date(dispatch.scheduleDate).toLocaleDateString()}</span>
                  <button className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded">
                    <ArrowRight className="w-4 h-4 text-purple-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
