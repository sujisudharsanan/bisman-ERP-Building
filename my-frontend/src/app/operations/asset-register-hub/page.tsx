'use client';

import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Wrench,
  BarChart3,
  TrendingDown,
  FileText,
  QrCode
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  type: string;
  status: 'active' | 'maintenance' | 'disposed' | 'transferred' | 'idle';
  location: {
    hub: string;
    building: string;
    floor?: string;
    room?: string;
  };
  acquisitionDate: string;
  acquisitionCost: number;
  currentValue: number;
  depreciationRate: number;
  accumulatedDepreciation: number;
  usefulLife: number;
  remainingLife: number;
  custodian: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  warrantyExpiry?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockAssets: Asset[] = [
  {
    id: 'AST001',
    assetCode: 'IT-LAPTOP-001',
    name: 'Dell Latitude 5520',
    category: 'IT Equipment',
    type: 'Laptop',
    status: 'active',
    location: { hub: 'Main Office', building: 'HQ Building', floor: '3rd', room: '301' },
    acquisitionDate: '2022-06-15',
    acquisitionCost: 1500,
    currentValue: 900,
    depreciationRate: 20,
    accumulatedDepreciation: 600,
    usefulLife: 5,
    remainingLife: 3,
    custodian: 'John Smith',
    lastMaintenanceDate: '2023-12-01',
    nextMaintenanceDate: '2024-06-01',
    warrantyExpiry: '2025-06-15',
    serialNumber: 'DL5520-789456',
    manufacturer: 'Dell',
    model: 'Latitude 5520'
  },
  {
    id: 'AST002',
    assetCode: 'OFF-FURN-015',
    name: 'Executive Office Desk',
    category: 'Furniture',
    type: 'Desk',
    status: 'active',
    location: { hub: 'Main Office', building: 'HQ Building', floor: '5th', room: '501' },
    acquisitionDate: '2020-03-10',
    acquisitionCost: 2500,
    currentValue: 1750,
    depreciationRate: 10,
    accumulatedDepreciation: 750,
    usefulLife: 10,
    remainingLife: 6,
    custodian: 'Sarah Chen',
    manufacturer: 'Steelcase',
    model: 'Frame One'
  },
  {
    id: 'AST003',
    assetCode: 'MACH-CNC-003',
    name: 'CNC Milling Machine',
    category: 'Machinery',
    type: 'Production Equipment',
    status: 'maintenance',
    location: { hub: 'Factory A', building: 'Production Hall', floor: 'Ground' },
    acquisitionDate: '2019-08-20',
    acquisitionCost: 125000,
    currentValue: 87500,
    depreciationRate: 12,
    accumulatedDepreciation: 37500,
    usefulLife: 15,
    remainingLife: 10,
    custodian: 'Production Team',
    lastMaintenanceDate: '2024-01-15',
    nextMaintenanceDate: '2024-04-15',
    warrantyExpiry: '2024-08-20',
    serialNumber: 'CNC-M-789012',
    manufacturer: 'Haas',
    model: 'VF-2SS'
  },
  {
    id: 'AST004',
    assetCode: 'VEH-TRUCK-002',
    name: 'Delivery Truck - Ford Transit',
    category: 'Vehicles',
    type: 'Commercial Vehicle',
    status: 'active',
    location: { hub: 'Warehouse B', building: 'Vehicle Bay' },
    acquisitionDate: '2021-11-01',
    acquisitionCost: 45000,
    currentValue: 33750,
    depreciationRate: 15,
    accumulatedDepreciation: 11250,
    usefulLife: 8,
    remainingLife: 6,
    custodian: 'Fleet Management',
    lastMaintenanceDate: '2024-01-05',
    nextMaintenanceDate: '2024-04-05',
    serialNumber: 'FT-VIN-123456',
    manufacturer: 'Ford',
    model: 'Transit 350'
  },
  {
    id: 'AST005',
    assetCode: 'IT-SERVER-001',
    name: 'HP ProLiant DL380',
    category: 'IT Equipment',
    type: 'Server',
    status: 'disposed',
    location: { hub: 'Data Center', building: 'Server Room' },
    acquisitionDate: '2018-02-15',
    acquisitionCost: 15000,
    currentValue: 0,
    depreciationRate: 20,
    accumulatedDepreciation: 15000,
    usefulLife: 5,
    remainingLife: 0,
    custodian: 'IT Department',
    serialNumber: 'HP-DL380-456789',
    manufacturer: 'HP',
    model: 'ProLiant DL380 Gen10'
  }
];

const stats = {
  totalAssets: 456,
  totalValue: 2850000,
  underMaintenance: 12,
  depreciationMTD: 45000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Asset['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    maintenance: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Wrench },
    disposed: { label: 'Disposed', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle },
    transferred: { label: 'Transferred', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
    idle: { label: 'Idle', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertTriangle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function AssetRegisterHubPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hubFilter, setHubFilter] = useState<string>('all');

  const filteredAssets = useMemo(() => {
    return mockAssets.filter(asset => {
      const matchesSearch =
        asset.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase() || '');
      const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      const matchesHub = hubFilter === 'all' || asset.location.hub === hubFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesHub;
    });
  }, [searchQuery, categoryFilter, statusFilter, hubFilter]);

  const categories = [...new Set(mockAssets.map(a => a.category))];
  const hubs = [...new Set(mockAssets.map(a => a.location.hub))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Register Hub</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and track all organizational assets</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Asset
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
                <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAssets}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Assets</p>
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
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Wrench className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.underMaintenance}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Under Maintenance</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.depreciationMTD)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Depreciation MTD</p>
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
              placeholder="Search by asset code, name, or serial number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
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
            value={hubFilter}
            onChange={(e) => setHubFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Locations</option>
            {hubs.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="idle">Idle</option>
            <option value="disposed">Disposed</option>
          </select>
        </div>

        {/* Assets Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Location</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Custodian</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                        <HardDrive className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{asset.assetCode}</p>
                        <p className="text-sm text-gray-500">{asset.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white">{asset.category}</p>
                    <p className="text-xs text-gray-500">{asset.type}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-900 dark:text-white">{asset.location.hub}</p>
                        <p className="text-xs text-gray-500">{asset.location.building}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(asset.currentValue)}</p>
                    <p className="text-xs text-gray-500">Cost: {formatCurrency(asset.acquisitionCost)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{asset.custodian}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={asset.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="QR Code">
                        <QrCode className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAssets.length === 0 && (
            <div className="text-center py-12">
              <HardDrive className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No assets found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
