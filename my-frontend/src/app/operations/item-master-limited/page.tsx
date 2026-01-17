'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Boxes,
  Tag,
  Layers,
  MapPin
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface ItemMaster {
  id: string;
  itemCode: string;
  name: string;
  description: string;
  category: string;
  type: 'raw_material' | 'finished_good' | 'semi_finished' | 'consumable' | 'service';
  status: 'active' | 'inactive' | 'discontinued';
  unit: string;
  standardCost: number;
  lastPurchasePrice: number;
  currentStock: number;
  reorderLevel: number;
  reorderQty: number;
  leadTime: number;
  defaultWarehouse: string;
  manufacturer?: string;
  barcode?: string;
  lastUpdated: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockItems: ItemMaster[] = [
  {
    id: 'ITM001',
    itemCode: 'RM-STL-001',
    name: 'Steel Sheet 1mm',
    description: 'Cold rolled steel sheet, 1mm thickness, 1200x2400mm',
    category: 'Raw Materials',
    type: 'raw_material',
    status: 'active',
    unit: 'Sheet',
    standardCost: 45.00,
    lastPurchasePrice: 42.50,
    currentStock: 250,
    reorderLevel: 50,
    reorderQty: 100,
    leadTime: 5,
    defaultWarehouse: 'Main Warehouse',
    manufacturer: 'SteelCo',
    barcode: '4901234567890',
    lastUpdated: '2024-01-15'
  },
  {
    id: 'ITM002',
    itemCode: 'FG-WGT-500',
    name: 'Widget Pro X500',
    description: 'Premium widget with advanced features',
    category: 'Finished Goods',
    type: 'finished_good',
    status: 'active',
    unit: 'Unit',
    standardCost: 245.50,
    lastPurchasePrice: 0,
    currentStock: 85,
    reorderLevel: 20,
    reorderQty: 50,
    leadTime: 3,
    defaultWarehouse: 'Finished Goods',
    barcode: '4901234567891',
    lastUpdated: '2024-01-18'
  },
  {
    id: 'ITM003',
    itemCode: 'SF-ASM-100',
    name: 'Assembly Module A',
    description: 'Pre-assembled electronic module',
    category: 'Semi-Finished',
    type: 'semi_finished',
    status: 'active',
    unit: 'Unit',
    standardCost: 85.00,
    lastPurchasePrice: 78.00,
    currentStock: 120,
    reorderLevel: 30,
    reorderQty: 60,
    leadTime: 2,
    defaultWarehouse: 'WIP Storage',
    manufacturer: 'ElectroTech',
    barcode: '4901234567892',
    lastUpdated: '2024-01-10'
  },
  {
    id: 'ITM004',
    itemCode: 'CON-LUB-001',
    name: 'Machine Lubricant',
    description: 'Industrial grade lubricant, 5L container',
    category: 'Consumables',
    type: 'consumable',
    status: 'active',
    unit: 'Container',
    standardCost: 35.00,
    lastPurchasePrice: 32.00,
    currentStock: 45,
    reorderLevel: 15,
    reorderQty: 30,
    leadTime: 3,
    defaultWarehouse: 'Maintenance Store',
    manufacturer: 'LubriMax',
    barcode: '4901234567893',
    lastUpdated: '2024-01-05'
  },
  {
    id: 'ITM005',
    itemCode: 'RM-PLT-002',
    name: 'Plastic Granules ABS',
    description: 'ABS plastic granules for injection molding',
    category: 'Raw Materials',
    type: 'raw_material',
    status: 'active',
    unit: 'Kg',
    standardCost: 2.50,
    lastPurchasePrice: 2.35,
    currentStock: 15,
    reorderLevel: 500,
    reorderQty: 1000,
    leadTime: 7,
    defaultWarehouse: 'Raw Materials',
    manufacturer: 'PlastiChem',
    barcode: '4901234567894',
    lastUpdated: '2024-01-12'
  }
];

const stats = {
  totalItems: 1250,
  activeItems: 1180,
  lowStock: 23,
  totalValue: 2450000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: ItemMaster['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle },
    discontinued: { label: 'Discontinued', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: ItemMaster['type'] }) {
  const config = {
    raw_material: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    finished_good: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    semi_finished: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    consumable: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    service: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
  }[type];

  const labels = {
    raw_material: 'Raw Material',
    finished_good: 'Finished Good',
    semi_finished: 'Semi-Finished',
    consumable: 'Consumable',
    service: 'Service'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config}`}>
      {labels[type]}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function StockIndicator({ current, reorderLevel }: { current: number; reorderLevel: number }) {
  const percentage = (current / reorderLevel) * 100;
  const isLow = percentage <= 100;
  const isCritical = percentage <= 50;

  return (
    <div className="flex items-center gap-2">
      <span className={`font-medium ${isCritical ? 'text-red-600 dark:text-red-400' : isLow ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
        {current}
      </span>
      {isCritical && <AlertTriangle className="w-4 h-4 text-red-500" />}
      {!isCritical && isLow && <Clock className="w-4 h-4 text-yellow-500" />}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ItemMasterLimitedPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const filteredItems = useMemo(() => {
    return mockItems.filter(item => {
      const matchesSearch =
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(searchQuery.toLowerCase() || '');
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
  }, [searchQuery, typeFilter, categoryFilter, statusFilter]);

  const categories = [...new Set(mockItems.map(i => i.category))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Item Master</h1>
            <p className="text-gray-500 dark:text-gray-400">View and search item catalog (limited access)</p>
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
                <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalItems.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeItems.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Items</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lowStock}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Inventory Value</p>
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
              placeholder="Search by item code, name, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="raw_material">Raw Material</option>
            <option value="finished_good">Finished Good</option>
            <option value="semi_finished">Semi-Finished</option>
            <option value="consumable">Consumable</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>

        {/* Items Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Std Cost</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <Package className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.itemCode}</p>
                        <p className="text-sm text-gray-500">{item.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={item.type} />
                    <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StockIndicator current={item.currentStock} reorderLevel={item.reorderLevel} />
                    <p className="text-xs text-gray-500">{item.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.standardCost)}</p>
                    {item.lastPurchasePrice > 0 && (
                      <p className="text-xs text-gray-500">Last: {formatCurrency(item.lastPurchasePrice)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="w-3 h-3" />
                      {item.defaultWarehouse}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No items found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
