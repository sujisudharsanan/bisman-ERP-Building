'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  Search,
  Filter,
  Plus,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
  MapPin,
  Calendar,
  FileText,
  Truck,
  User,
  ClipboardCheck
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface StockTransfer {
  id: string;
  transferNumber: string;
  type: 'warehouse_transfer' | 'location_transfer' | 'intercompany';
  status: 'draft' | 'pending_approval' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sourceWarehouse: {
    code: string;
    name: string;
    location: string;
  };
  destinationWarehouse: {
    code: string;
    name: string;
    location: string;
  };
  items: number;
  totalQuantity: number;
  estimatedValue: number;
  requestedBy: string;
  requestedDate: string;
  scheduledDate?: string;
  shipmentDate?: string;
  receivedDate?: string;
  notes?: string;
  reference?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockTransfers: StockTransfer[] = [
  {
    id: 'TRF001',
    transferNumber: 'STR-2024-0045',
    type: 'warehouse_transfer',
    status: 'in_transit',
    priority: 'high',
    sourceWarehouse: { code: 'WH-A', name: 'Main Warehouse', location: 'Chicago, IL' },
    destinationWarehouse: { code: 'WH-B', name: 'East Coast DC', location: 'New Jersey' },
    items: 15,
    totalQuantity: 450,
    estimatedValue: 28500,
    requestedBy: 'David Miller',
    requestedDate: '2024-01-15',
    scheduledDate: '2024-01-18',
    shipmentDate: '2024-01-18',
    reference: 'Replenishment Request #89'
  },
  {
    id: 'TRF002',
    transferNumber: 'STR-2024-0044',
    type: 'location_transfer',
    status: 'pending_approval',
    priority: 'medium',
    sourceWarehouse: { code: 'WH-A-01', name: 'Zone A - Rack 1', location: 'Main Warehouse' },
    destinationWarehouse: { code: 'WH-A-05', name: 'Zone A - Rack 5', location: 'Main Warehouse' },
    items: 8,
    totalQuantity: 120,
    estimatedValue: 4500,
    requestedBy: 'Sarah Chen',
    requestedDate: '2024-01-17',
    notes: 'Reorganization for cycle counting'
  },
  {
    id: 'TRF003',
    transferNumber: 'STR-2024-0043',
    type: 'warehouse_transfer',
    status: 'received',
    priority: 'medium',
    sourceWarehouse: { code: 'WH-B', name: 'East Coast DC', location: 'New Jersey' },
    destinationWarehouse: { code: 'WH-C', name: 'South Hub', location: 'Atlanta, GA' },
    items: 22,
    totalQuantity: 680,
    estimatedValue: 42000,
    requestedBy: 'Mike Johnson',
    requestedDate: '2024-01-10',
    scheduledDate: '2024-01-14',
    shipmentDate: '2024-01-14',
    receivedDate: '2024-01-16',
    reference: 'Customer Order SO-2024-0142'
  },
  {
    id: 'TRF004',
    transferNumber: 'STR-2024-0042',
    type: 'intercompany',
    status: 'approved',
    priority: 'urgent',
    sourceWarehouse: { code: 'WH-A', name: 'Main Warehouse', location: 'Chicago, IL' },
    destinationWarehouse: { code: 'WH-EU', name: 'EU Distribution Center', location: 'Netherlands' },
    items: 5,
    totalQuantity: 200,
    estimatedValue: 85000,
    requestedBy: 'Lisa Wong',
    requestedDate: '2024-01-16',
    scheduledDate: '2024-01-22',
    reference: 'EU Stock Replenishment Q1'
  },
  {
    id: 'TRF005',
    transferNumber: 'STR-2024-0041',
    type: 'warehouse_transfer',
    status: 'draft',
    priority: 'low',
    sourceWarehouse: { code: 'WH-C', name: 'South Hub', location: 'Atlanta, GA' },
    destinationWarehouse: { code: 'WH-A', name: 'Main Warehouse', location: 'Chicago, IL' },
    items: 3,
    totalQuantity: 45,
    estimatedValue: 2800,
    requestedBy: 'Tom Anderson',
    requestedDate: '2024-01-18',
    notes: 'Return excess stock'
  }
];

const stats = {
  totalTransfers: 245,
  inTransit: 12,
  pendingApproval: 8,
  completedThisMonth: 45
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: StockTransfer['status'] }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
    pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
    in_transit: { label: 'In Transit', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Truck },
    received: { label: 'Received', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: ClipboardCheck },
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

function TypeBadge({ type }: { type: StockTransfer['type'] }) {
  const config = {
    warehouse_transfer: { label: 'Warehouse Transfer', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    location_transfer: { label: 'Location Transfer', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
    intercompany: { label: 'Intercompany', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' }
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: StockTransfer['priority'] }) {
  const config = {
    low: 'bg-gray-400',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  }[priority];

  return (
    <span className={`w-2 h-2 rounded-full ${config}`} title={`${priority} priority`}></span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function StockEntryTransferPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredTransfers = useMemo(() => {
    return mockTransfers.filter(transfer => {
      const matchesSearch =
        transfer.transferNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.sourceWarehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.destinationWarehouse.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || transfer.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Entry / Transfer</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage inventory movements between locations</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Transfer
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
                <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTransfers}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Transfers</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Truck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inTransit}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">In Transit</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApproval}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completedThisMonth}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed This Month</p>
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
              placeholder="Search by transfer number or warehouse..."
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
            <option value="warehouse_transfer">Warehouse Transfer</option>
            <option value="location_transfer">Location Transfer</option>
            <option value="intercompany">Intercompany</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="in_transit">In Transit</option>
            <option value="received">Received</option>
          </select>
        </div>

        {/* Transfers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Transfer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">From → To</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Items / Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Requested</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PriorityIndicator priority={transfer.priority} />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{transfer.transferNumber}</p>
                        <TypeBadge type={transfer.type} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        <p className="text-gray-900 dark:text-white">{transfer.sourceWarehouse.name}</p>
                        <p className="text-xs text-gray-500">{transfer.sourceWarehouse.location}</p>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="text-gray-900 dark:text-white">{transfer.destinationWarehouse.name}</p>
                        <p className="text-xs text-gray-500">{transfer.destinationWarehouse.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <p className="font-medium text-gray-900 dark:text-white">{transfer.items} items</p>
                    <p className="text-xs text-gray-500">{transfer.totalQuantity} units</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(transfer.estimatedValue)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{transfer.requestedBy}</p>
                        <p className="text-xs text-gray-500">{transfer.requestedDate}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={transfer.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View Details">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      {transfer.status === 'pending_approval' && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Approve">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                      )}
                      {transfer.status === 'in_transit' && (
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Receive">
                          <ClipboardCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTransfers.length === 0 && (
            <div className="text-center py-12">
              <ArrowRightLeft className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No stock transfers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
