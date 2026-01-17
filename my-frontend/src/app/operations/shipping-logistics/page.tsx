'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
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
  MapPin,
  Package,
  Calendar,
  DollarSign,
  User,
  Navigation,
  Globe,
  FileText,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Shipment {
  id: string;
  shipmentNumber: string;
  type: 'outbound' | 'inbound' | 'transfer';
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'cancelled';
  carrier: string;
  trackingNumber?: string;
  origin: {
    name: string;
    address: string;
    city: string;
    country: string;
  };
  destination: {
    name: string;
    address: string;
    city: string;
    country: string;
  };
  scheduledDate: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  packages: number;
  weight: number;
  dimensions?: string;
  cost: number;
  currency: string;
  reference: string;
  priority: 'standard' | 'express' | 'overnight';
  lastUpdate: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockShipments: Shipment[] = [
  {
    id: 'SHP001',
    shipmentNumber: 'SHP-2024-0089',
    type: 'outbound',
    status: 'in_transit',
    carrier: 'FedEx',
    trackingNumber: 'FX123456789',
    origin: { name: 'Main Warehouse', address: '123 Industrial Blvd', city: 'Chicago, IL', country: 'USA' },
    destination: { name: 'Global Industries Inc', address: '456 Business Park', city: 'New York, NY', country: 'USA' },
    scheduledDate: '2024-01-18',
    estimatedDelivery: '2024-01-22',
    packages: 5,
    weight: 125.5,
    cost: 450,
    currency: 'USD',
    reference: 'SO-2024-0156',
    priority: 'express',
    lastUpdate: '2024-01-20 14:30'
  },
  {
    id: 'SHP002',
    shipmentNumber: 'SHP-2024-0088',
    type: 'inbound',
    status: 'pending',
    carrier: 'UPS',
    origin: { name: 'TechSupply Corp', address: '789 Tech Ave', city: 'San Francisco, CA', country: 'USA' },
    destination: { name: 'Main Warehouse', address: '123 Industrial Blvd', city: 'Chicago, IL', country: 'USA' },
    scheduledDate: '2024-01-21',
    estimatedDelivery: '2024-01-25',
    packages: 12,
    weight: 350,
    cost: 890,
    currency: 'USD',
    reference: 'PO-2024-0089',
    priority: 'standard',
    lastUpdate: '2024-01-19 10:00'
  },
  {
    id: 'SHP003',
    shipmentNumber: 'SHP-2024-0087',
    type: 'outbound',
    status: 'delivered',
    carrier: 'DHL',
    trackingNumber: 'DHL987654321',
    origin: { name: 'EU Distribution', address: '100 Logistics Way', city: 'Amsterdam', country: 'Netherlands' },
    destination: { name: 'Premium Products Ltd', address: '200 Commerce St', city: 'London', country: 'UK' },
    scheduledDate: '2024-01-15',
    estimatedDelivery: '2024-01-18',
    actualDelivery: '2024-01-17',
    packages: 3,
    weight: 45.5,
    cost: 280,
    currency: 'EUR',
    reference: 'SO-2024-0148',
    priority: 'express',
    lastUpdate: '2024-01-17 16:45'
  },
  {
    id: 'SHP004',
    shipmentNumber: 'SHP-2024-0086',
    type: 'transfer',
    status: 'out_for_delivery',
    carrier: 'Internal Fleet',
    origin: { name: 'Warehouse A', address: '50 Storage Ln', city: 'Detroit, MI', country: 'USA' },
    destination: { name: 'Warehouse B', address: '75 Distribution Dr', city: 'Cleveland, OH', country: 'USA' },
    scheduledDate: '2024-01-19',
    estimatedDelivery: '2024-01-20',
    packages: 25,
    weight: 1200,
    cost: 350,
    currency: 'USD',
    reference: 'TRF-2024-0012',
    priority: 'standard',
    lastUpdate: '2024-01-20 08:30'
  },
  {
    id: 'SHP005',
    shipmentNumber: 'SHP-2024-0085',
    type: 'outbound',
    status: 'exception',
    carrier: 'FedEx',
    trackingNumber: 'FX111222333',
    origin: { name: 'Main Warehouse', address: '123 Industrial Blvd', city: 'Chicago, IL', country: 'USA' },
    destination: { name: 'QuickServe Retail', address: '555 Retail Plaza', city: 'Denver, CO', country: 'USA' },
    scheduledDate: '2024-01-16',
    estimatedDelivery: '2024-01-19',
    packages: 2,
    weight: 30,
    cost: 125,
    currency: 'USD',
    reference: 'SO-2024-0150',
    priority: 'overnight',
    lastUpdate: '2024-01-18 11:20'
  }
];

const stats = {
  totalShipments: 156,
  inTransit: 23,
  delivered: 125,
  exceptions: 3
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Shipment['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: Clock },
    picked_up: { label: 'Picked Up', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Package },
    in_transit: { label: 'In Transit', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Truck },
    out_for_delivery: { label: 'Out for Delivery', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Navigation },
    delivered: { label: 'Delivered', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    exception: { label: 'Exception', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: Shipment['type'] }) {
  const config = {
    outbound: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    inbound: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    transfer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {type}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Shipment['priority'] }) {
  const config = {
    standard: 'text-gray-500',
    express: 'text-orange-500',
    overnight: 'text-red-500'
  }[priority];

  return (
    <span className={`text-xs font-medium capitalize ${config}`}>
      {priority}
    </span>
  );
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function ShippingLogisticsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');

  const filteredShipments = useMemo(() => {
    return mockShipments.filter(shipment => {
      const matchesSearch =
        shipment.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase() || '') ||
        shipment.destination.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || shipment.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
      const matchesCarrier = carrierFilter === 'all' || shipment.carrier === carrierFilter;
      return matchesSearch && matchesType && matchesStatus && matchesCarrier;
    });
  }, [searchQuery, typeFilter, statusFilter, carrierFilter]);

  const carriers = [...new Set(mockShipments.map(s => s.carrier))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipping & Logistics</h1>
            <p className="text-gray-500 dark:text-gray-400">Track and manage shipments</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <RefreshCw className="w-4 h-4" />
              Sync Tracking
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Shipment
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
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalShipments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Shipments</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Truck className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inTransit}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">In Transit</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.delivered}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Delivered</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.exceptions}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Exceptions</p>
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
              placeholder="Search by shipment #, tracking, or destination..."
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
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
            <option value="transfer">Transfer</option>
          </select>
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Carriers</option>
            {carriers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="exception">Exception</option>
          </select>
        </div>

        {/* Shipments List */}
        <div className="space-y-4">
          {filteredShipments.map((shipment) => (
            <div
              key={shipment.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Truck className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{shipment.shipmentNumber}</span>
                      <TypeBadge type={shipment.type} />
                      <StatusBadge status={shipment.status} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{shipment.carrier}</span>
                      {shipment.trackingNumber && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 dark:text-blue-400">{shipment.trackingNumber}</span>
                        </>
                      )}
                      <span>•</span>
                      <PriorityBadge priority={shipment.priority} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Track">
                    <Navigation className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                    <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">From</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{shipment.origin.name}</p>
                  <p className="text-xs text-gray-500">{shipment.origin.city}, {shipment.origin.country}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">To</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{shipment.destination.name}</p>
                  <p className="text-xs text-gray-500">{shipment.destination.city}, {shipment.destination.country}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Delivery</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {shipment.actualDelivery || shipment.estimatedDelivery || 'TBD'}
                  </p>
                  <p className="text-xs text-gray-500">{shipment.packages} pkg, {shipment.weight} kg</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cost</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(shipment.cost, shipment.currency)}</p>
                  <p className="text-xs text-gray-500">Ref: {shipment.reference}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-500">Last update: {shipment.lastUpdate}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredShipments.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No shipments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
