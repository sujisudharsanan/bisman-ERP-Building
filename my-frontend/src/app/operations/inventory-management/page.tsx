'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Eye,
  Edit,
  MoreVertical,
  Warehouse,
  BarChart3,
  MapPin,
  Tag,
  Clock,
  ShoppingCart,
  Truck,
  Box
} from 'lucide-react';

// Types
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  totalValue: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock';
  lastUpdated: string;
  supplier: string;
}

// Mock data
const mockInventory: InventoryItem[] = [
  { id: '1', sku: 'SKU-001', name: 'Steel Pipes 2"', category: 'Raw Materials', location: 'Warehouse A', quantity: 500, reorderLevel: 200, unitCost: 45, totalValue: 22500, status: 'in-stock', lastUpdated: '2026-01-17', supplier: 'Steel Corp' },
  { id: '2', sku: 'SKU-002', name: 'Copper Wire 10mm', category: 'Raw Materials', location: 'Warehouse A', quantity: 150, reorderLevel: 200, unitCost: 120, totalValue: 18000, status: 'low-stock', lastUpdated: '2026-01-16', supplier: 'Copper Ltd' },
  { id: '3', sku: 'SKU-003', name: 'Industrial Bolts M8', category: 'Components', location: 'Warehouse B', quantity: 2500, reorderLevel: 1000, unitCost: 2.5, totalValue: 6250, status: 'in-stock', lastUpdated: '2026-01-15', supplier: 'FastenPro' },
  { id: '4', sku: 'SKU-004', name: 'Electric Motors 5HP', category: 'Equipment', location: 'Warehouse C', quantity: 0, reorderLevel: 10, unitCost: 850, totalValue: 0, status: 'out-of-stock', lastUpdated: '2026-01-10', supplier: 'Motor Works' },
  { id: '5', sku: 'SKU-005', name: 'PVC Fittings Set', category: 'Components', location: 'Warehouse A', quantity: 800, reorderLevel: 300, unitCost: 15, totalValue: 12000, status: 'in-stock', lastUpdated: '2026-01-17', supplier: 'PlastiPipe' },
  { id: '6', sku: 'SKU-006', name: 'Hydraulic Fluid 20L', category: 'Consumables', location: 'Warehouse B', quantity: 45, reorderLevel: 50, unitCost: 85, totalValue: 3825, status: 'low-stock', lastUpdated: '2026-01-14', supplier: 'LubeCo' },
  { id: '7', sku: 'SKU-007', name: 'Safety Helmets', category: 'Safety', location: 'Warehouse C', quantity: 250, reorderLevel: 50, unitCost: 35, totalValue: 8750, status: 'overstock', lastUpdated: '2026-01-12', supplier: 'SafetyFirst' },
  { id: '8', sku: 'SKU-008', name: 'Welding Rods 2.5mm', category: 'Consumables', location: 'Warehouse A', quantity: 1000, reorderLevel: 500, unitCost: 8, totalValue: 8000, status: 'in-stock', lastUpdated: '2026-01-16', supplier: 'WeldSupply' }
];

const inventoryMetrics = {
  totalItems: 1245,
  totalValue: 2850000,
  lowStockItems: 45,
  outOfStock: 12,
  overstock: 28,
  pendingOrders: 18,
  warehouseCount: 5,
  turnoverRate: 4.2
};

const categoryBreakdown = [
  { name: 'Raw Materials', count: 320, value: 1250000, percentage: 44 },
  { name: 'Components', count: 450, value: 850000, percentage: 30 },
  { name: 'Equipment', count: 85, value: 450000, percentage: 16 },
  { name: 'Consumables', count: 280, value: 200000, percentage: 7 },
  { name: 'Safety', count: 110, value: 100000, percentage: 3 }
];

const warehouseStats = [
  { name: 'Warehouse A', items: 520, capacity: 85, value: 1200000 },
  { name: 'Warehouse B', items: 380, capacity: 72, value: 850000 },
  { name: 'Warehouse C', items: 280, capacity: 45, value: 650000 },
  { name: 'Warehouse D', items: 65, capacity: 25, value: 150000 }
];

export default function InventoryManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredInventory = useMemo(() => {
    let filtered = mockInventory.filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
    });

    return filtered.sort((a, b) => {
      const aVal = a[sortField as keyof InventoryItem];
      const bVal = b[sortField as keyof InventoryItem];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }, [searchTerm, categoryFilter, statusFilter, locationFilter, sortField, sortDirection]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'in-stock': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'low-stock': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'out-of-stock': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'overstock': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return colors[status] || colors['in-stock'];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-stock': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'low-stock': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'out-of-stock': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'overstock': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const categories = [...new Set(mockInventory.map(i => i.category))];
  const locations = [...new Set(mockInventory.map(i => i.location))];

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-indigo-500" />
              Inventory Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track stock levels, manage warehouses, and optimize inventory
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Sync</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Total Inventory Value</span>
            <Box className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(inventoryMetrics.totalValue)}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {inventoryMetrics.totalItems.toLocaleString()} items
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Low Stock Alerts</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {inventoryMetrics.lowStockItems}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Items need reorder</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Out of Stock</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {inventoryMetrics.outOfStock}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Critical items</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Turnover Rate</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {inventoryMetrics.turnoverRate}x
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Annual inventory turns</p>
        </div>
      </div>

      {/* Warehouse & Category Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Warehouse Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-indigo-500" />
            Warehouse Capacity
          </h2>
          <div className="space-y-4">
            {warehouseStats.map((warehouse) => (
              <div key={warehouse.name} className="flex items-center gap-4">
                <div className="w-28 text-sm font-medium text-gray-600 dark:text-gray-400">{warehouse.name}</div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <div 
                      className={`h-full ${warehouse.capacity > 80 ? 'bg-red-500' : warehouse.capacity > 60 ? 'bg-yellow-500' : 'bg-green-500'} flex items-center justify-end pr-2`}
                      style={{ width: `${warehouse.capacity}%` }}
                    >
                      <span className="text-xs font-medium text-white">{warehouse.capacity}%</span>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-gray-600 dark:text-gray-400">
                  {warehouse.items} items
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Inventory by Category
          </h2>
          <div className="space-y-4">
            {categoryBreakdown.map((category) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{category.count} items</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right">
                    {formatCurrency(category.value)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
        <div className="p-4 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, SKU, or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => handleSort('sku')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
                    SKU <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white">
                    Item <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Location</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => handleSort('quantity')} className="flex items-center gap-1 justify-end w-full hover:text-gray-900 dark:hover:text-white">
                    Qty <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Reorder Level</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => handleSort('totalValue')} className="flex items-center gap-1 justify-end w-full hover:text-gray-900 dark:hover:text-white">
                    Value <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-indigo-600 dark:text-indigo-400">{item.sku}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.supplier}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {item.category}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      {item.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-semibold ${item.quantity <= item.reorderLevel ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                      {item.quantity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                    {item.reorderLevel.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(item.totalValue)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      {item.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="More">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredInventory.length} of {mockInventory.length} items
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
