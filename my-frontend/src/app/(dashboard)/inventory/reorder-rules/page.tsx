'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  ArrowUpDown, 
  AlertTriangle, 
  TrendingUp, 
  Search, 
  Filter,
  Download,
  Plus,
  ChevronDown,
  Settings,
  RefreshCw,
  Edit,
  Eye,
  BarChart2
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  reorderQty: number;
  unitCost: number;
  leadTime: number; // days
  safetyStock: number;
  avgDailyUsage: number;
  status: 'optimal' | 'low' | 'critical' | 'overstock';
  lastReorder?: string;
  supplier: string;
}

interface ReorderSuggestion {
  itemId: string;
  itemName: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
  estimatedCost: number;
  urgency: 'high' | 'medium' | 'low';
  daysUntilStockout: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockStockItems: StockItem[] = [
  {
    id: 'I001',
    sku: 'IVA-001',
    name: 'Industrial Valve Assembly',
    category: 'Mechanical Parts',
    currentStock: 45,
    minStock: 50,
    maxStock: 200,
    reorderPoint: 75,
    reorderQty: 100,
    unitCost: 125.00,
    leadTime: 14,
    safetyStock: 25,
    avgDailyUsage: 5,
    status: 'low',
    lastReorder: '2024-01-05',
    supplier: 'Valve Tech Industries'
  },
  {
    id: 'I002',
    sku: 'CPM-002',
    name: 'Control Panel Module',
    category: 'Electronics',
    currentStock: 12,
    minStock: 20,
    maxStock: 100,
    reorderPoint: 30,
    reorderQty: 50,
    unitCost: 450.00,
    leadTime: 21,
    safetyStock: 10,
    avgDailyUsage: 3,
    status: 'critical',
    lastReorder: '2024-01-02',
    supplier: 'ElectroParts Co.'
  },
  {
    id: 'I003',
    sku: 'SAK-003',
    name: 'Sensor Array Kit',
    category: 'Electronics',
    currentStock: 180,
    minStock: 50,
    maxStock: 150,
    reorderPoint: 80,
    reorderQty: 100,
    unitCost: 85.00,
    leadTime: 7,
    safetyStock: 30,
    avgDailyUsage: 8,
    status: 'overstock',
    lastReorder: '2024-01-10',
    supplier: 'Sensor Solutions Ltd.'
  },
  {
    id: 'I004',
    sku: 'HPU-004',
    name: 'Hydraulic Pump Unit',
    category: 'Mechanical Parts',
    currentStock: 95,
    minStock: 30,
    maxStock: 120,
    reorderPoint: 50,
    reorderQty: 40,
    unitCost: 680.00,
    leadTime: 28,
    safetyStock: 20,
    avgDailyUsage: 2,
    status: 'optimal',
    lastReorder: '2023-12-20',
    supplier: 'HydroPower Systems'
  },
  {
    id: 'I005',
    sku: 'SFS-005',
    name: 'Steel Frame Structure',
    category: 'Raw Materials',
    currentStock: 28,
    minStock: 25,
    maxStock: 100,
    reorderPoint: 40,
    reorderQty: 50,
    unitCost: 320.00,
    leadTime: 10,
    safetyStock: 15,
    avgDailyUsage: 3,
    status: 'low',
    lastReorder: '2024-01-08',
    supplier: 'Steel Masters Inc.'
  },
  {
    id: 'I006',
    sku: 'CBL-006',
    name: 'Industrial Cable Assembly',
    category: 'Electronics',
    currentStock: 520,
    minStock: 100,
    maxStock: 500,
    reorderPoint: 150,
    reorderQty: 200,
    unitCost: 45.00,
    leadTime: 5,
    safetyStock: 50,
    avgDailyUsage: 15,
    status: 'overstock',
    lastReorder: '2024-01-12',
    supplier: 'Cable Works Ltd.'
  }
];

const mockReorderSuggestions: ReorderSuggestion[] = [
  { itemId: 'I002', itemName: 'Control Panel Module', sku: 'CPM-002', currentStock: 12, reorderPoint: 30, suggestedQty: 50, estimatedCost: 22500, urgency: 'high', daysUntilStockout: 4 },
  { itemId: 'I001', itemName: 'Industrial Valve Assembly', sku: 'IVA-001', currentStock: 45, reorderPoint: 75, suggestedQty: 100, estimatedCost: 12500, urgency: 'medium', daysUntilStockout: 9 },
  { itemId: 'I005', itemName: 'Steel Frame Structure', sku: 'SFS-005', currentStock: 28, reorderPoint: 40, suggestedQty: 50, estimatedCost: 16000, urgency: 'medium', daysUntilStockout: 9 },
];

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: StockItem['status'] }) {
  const config = {
    optimal: { label: 'Optimal', className: 'bg-green-100 text-green-700' },
    low: { label: 'Low Stock', className: 'bg-yellow-100 text-yellow-700' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
    overstock: { label: 'Overstock', className: 'bg-blue-100 text-blue-700' },
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: ReorderSuggestion['urgency'] }) {
  const config = {
    high: { label: 'High', className: 'bg-red-100 text-red-700' },
    medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'Low', className: 'bg-green-100 text-green-700' },
  }[urgency];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function StockLevelBar({ current, min, max, reorder }: { current: number; min: number; max: number; reorder: number }) {
  const percentage = Math.min((current / max) * 100, 100);
  const reorderPercentage = (reorder / max) * 100;
  const minPercentage = (min / max) * 100;

  let barColor = 'bg-green-500';
  if (current <= min) barColor = 'bg-red-500';
  else if (current <= reorder) barColor = 'bg-yellow-500';
  else if (current > max) barColor = 'bg-blue-500';

  return (
    <div className="relative">
      <div className="w-full bg-gray-200 rounded-full h-3 relative">
        {/* Min Stock Marker */}
        <div 
          className="absolute w-0.5 h-5 bg-red-500 -top-1 z-10"
          style={{ left: `${minPercentage}%` }}
          title={`Min: ${min}`}
        />
        {/* Reorder Point Marker */}
        <div 
          className="absolute w-0.5 h-5 bg-yellow-500 -top-1 z-10"
          style={{ left: `${reorderPercentage}%` }}
          title={`Reorder: ${reorder}`}
        />
        {/* Stock Level */}
        <div 
          className={`h-3 rounded-full ${barColor} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>0</span>
        <span>{current}/{max}</span>
      </div>
    </div>
  );
}

function StockItemRow({ item, onEdit }: { item: StockItem; onEdit: () => void }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">{item.sku}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
      <td className="px-4 py-3 w-48">
        <StockLevelBar 
          current={item.currentStock}
          min={item.minStock}
          max={item.maxStock}
          reorder={item.reorderPoint}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        <div className="flex flex-col">
          <span>Min: {item.minStock}</span>
          <span>Reorder: {item.reorderPoint}</span>
          <span>Max: {item.maxStock}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        <div>
          <p>{item.avgDailyUsage} units/day</p>
          <p className="text-xs text-gray-500">Lead: {item.leadTime} days</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">${item.unitCost.toFixed(2)}</td>
      <td className="px-4 py-3">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button className="p-1 hover:bg-gray-100 rounded" title="View">
            <Eye className="w-4 h-4 text-blue-600" />
          </button>
          <button onClick={onEdit} className="p-1 hover:bg-gray-100 rounded" title="Edit">
            <Edit className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded" title="Analytics">
            <BarChart2 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function ReorderCard({ suggestion }: { suggestion: ReorderSuggestion }) {
  return (
    <div className={`bg-white border rounded-lg p-4 ${
      suggestion.urgency === 'high' ? 'border-red-200 bg-red-50' :
      suggestion.urgency === 'medium' ? 'border-yellow-200 bg-yellow-50' :
      'border-gray-200'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{suggestion.itemName}</h4>
          <p className="text-sm text-gray-500">{suggestion.sku}</p>
        </div>
        <UrgencyBadge urgency={suggestion.urgency} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-gray-500">Current Stock</p>
          <p className="font-semibold text-gray-900">{suggestion.currentStock} units</p>
        </div>
        <div>
          <p className="text-gray-500">Reorder Point</p>
          <p className="font-semibold text-gray-900">{suggestion.reorderPoint} units</p>
        </div>
        <div>
          <p className="text-gray-500">Suggested Qty</p>
          <p className="font-semibold text-blue-600">{suggestion.suggestedQty} units</p>
        </div>
        <div>
          <p className="text-gray-500">Estimated Cost</p>
          <p className="font-semibold text-gray-900">${suggestion.estimatedCost.toLocaleString()}</p>
        </div>
      </div>
      <div className={`p-2 rounded text-sm ${
        suggestion.daysUntilStockout <= 5 ? 'bg-red-100 text-red-700' :
        suggestion.daysUntilStockout <= 10 ? 'bg-yellow-100 text-yellow-700' :
        'bg-green-100 text-green-700'
      }`}>
        <AlertTriangle className="w-4 h-4 inline mr-2" />
        {suggestion.daysUntilStockout} days until stockout
      </div>
      <div className="mt-4 flex gap-2">
        <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          Create PO
        </button>
        <button className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
          Defer
        </button>
      </div>
    </div>
  );
}

function EditModal({ item, onClose }: { item: StockItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Edit Reorder Rules</h2>
          <p className="text-gray-500">{item.name}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock Level</label>
            <input 
              type="number" 
              defaultValue={item.minStock}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Stock Level</label>
            <input 
              type="number" 
              defaultValue={item.maxStock}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
            <input 
              type="number" 
              defaultValue={item.reorderPoint}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Quantity</label>
            <input 
              type="number" 
              defaultValue={item.reorderQty}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Safety Stock</label>
            <input 
              type="number" 
              defaultValue={item.safetyStock}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
            <input 
              type="number" 
              defaultValue={item.leadTime}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ReorderRulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const filteredItems = useMemo(() => {
    return mockStockItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    total: mockStockItems.length,
    critical: mockStockItems.filter(i => i.status === 'critical').length,
    low: mockStockItems.filter(i => i.status === 'low').length,
    overstock: mockStockItems.filter(i => i.status === 'overstock').length,
    optimal: mockStockItems.filter(i => i.status === 'optimal').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reorder Rules</h1>
            <p className="text-gray-500">Configure and manage inventory reorder parameters</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
              Recalculate
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Settings className="w-4 h-4" />
              Bulk Settings
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-500">Total Items</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-sm text-red-600">Critical</p>
            <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-600">Low Stock</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.low}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600">Overstock</p>
            <p className="text-2xl font-bold text-blue-700">{stats.overstock}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-600">Optimal</p>
            <p className="text-2xl font-bold text-green-700">{stats.optimal}</p>
          </div>
        </div>

        {/* Reorder Suggestions */}
        {mockReorderSuggestions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reorder Suggestions</h2>
            <div className="grid grid-cols-3 gap-4">
              {mockReorderSuggestions.map((suggestion) => (
                <ReorderCard key={suggestion.itemId} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="critical">Critical</option>
            <option value="low">Low Stock</option>
            <option value="optimal">Optimal</option>
            <option value="overstock">Overstock</option>
          </select>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thresholds</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <StockItemRow 
                  key={item.id} 
                  item={item}
                  onEdit={() => setSelectedItem(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedItem && (
        <EditModal 
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
