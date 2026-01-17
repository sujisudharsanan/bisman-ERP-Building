'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  MoreVertical,
  Phone,
  Navigation,
  Calendar,
  User,
  Box,
  ArrowRight,
  RefreshCw,
  Download,
  Map,
  BarChart2
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
    pincode: string;
  };
  origin: {
    hub: string;
    city: string;
  };
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  carrier: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  items: number;
  weight: string;
  dimensions: string;
  shipmentType: 'standard' | 'express' | 'same_day';
  createdAt: string;
  lastUpdate: string;
  trackingHistory: TrackingEvent[];
}

interface TrackingEvent {
  timestamp: string;
  status: string;
  location: string;
  description: string;
}

interface ShipmentStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  failed: number;
  onTimeRate: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockShipments: Shipment[] = [
  {
    id: 'SHP001',
    trackingNumber: 'BSM1234567890',
    orderId: 'ORD-2024-001234',
    customer: {
      name: 'Rahul Sharma',
      phone: '+91-9876543210',
      address: '123 MG Road, Andheri East',
      city: 'Mumbai',
      pincode: '400069'
    },
    origin: { hub: 'Mumbai Central Hub', city: 'Mumbai' },
    status: 'in_transit',
    carrier: 'BlueDart',
    estimatedDelivery: '2024-01-17',
    items: 3,
    weight: '2.5 kg',
    dimensions: '30x20x15 cm',
    shipmentType: 'express',
    createdAt: '2024-01-15 10:30',
    lastUpdate: '2024-01-16 14:30',
    trackingHistory: [
      { timestamp: '2024-01-16 14:30', status: 'In Transit', location: 'Pune Hub', description: 'Package arrived at Pune hub' },
      { timestamp: '2024-01-16 06:00', status: 'In Transit', location: 'Mumbai', description: 'Package departed from origin' },
      { timestamp: '2024-01-15 18:00', status: 'Picked Up', location: 'Mumbai Central Hub', description: 'Package picked up' },
      { timestamp: '2024-01-15 10:30', status: 'Order Created', location: 'Mumbai', description: 'Shipment created' }
    ]
  },
  {
    id: 'SHP002',
    trackingNumber: 'BSM1234567891',
    orderId: 'ORD-2024-001235',
    customer: {
      name: 'Priya Patel',
      phone: '+91-9876543211',
      address: '456 Koramangala 4th Block',
      city: 'Bangalore',
      pincode: '560034'
    },
    origin: { hub: 'Bangalore Hub', city: 'Bangalore' },
    status: 'out_for_delivery',
    carrier: 'DTDC',
    estimatedDelivery: '2024-01-16',
    items: 1,
    weight: '0.8 kg',
    dimensions: '15x10x5 cm',
    shipmentType: 'same_day',
    createdAt: '2024-01-16 08:00',
    lastUpdate: '2024-01-16 12:00',
    trackingHistory: [
      { timestamp: '2024-01-16 12:00', status: 'Out for Delivery', location: 'Koramangala', description: 'With delivery agent' },
      { timestamp: '2024-01-16 10:00', status: 'At Local Hub', location: 'Bangalore East Hub', description: 'Package at local hub' },
      { timestamp: '2024-01-16 08:00', status: 'Order Created', location: 'Bangalore Hub', description: 'Shipment created' }
    ]
  },
  {
    id: 'SHP003',
    trackingNumber: 'BSM1234567892',
    orderId: 'ORD-2024-001230',
    customer: {
      name: 'Amit Kumar',
      phone: '+91-9876543212',
      address: '789 Sector 18',
      city: 'Noida',
      pincode: '201301'
    },
    origin: { hub: 'Delhi Hub', city: 'Delhi' },
    status: 'delivered',
    carrier: 'Delhivery',
    estimatedDelivery: '2024-01-15',
    actualDelivery: '2024-01-15 16:45',
    items: 2,
    weight: '1.2 kg',
    dimensions: '25x20x10 cm',
    shipmentType: 'standard',
    createdAt: '2024-01-13 14:00',
    lastUpdate: '2024-01-15 16:45',
    trackingHistory: [
      { timestamp: '2024-01-15 16:45', status: 'Delivered', location: 'Noida', description: 'Delivered to customer' },
      { timestamp: '2024-01-15 10:00', status: 'Out for Delivery', location: 'Noida Hub', description: 'With delivery agent' },
      { timestamp: '2024-01-14 18:00', status: 'In Transit', location: 'Delhi', description: 'Package in transit' },
      { timestamp: '2024-01-13 14:00', status: 'Order Created', location: 'Delhi Hub', description: 'Shipment created' }
    ]
  },
  {
    id: 'SHP004',
    trackingNumber: 'BSM1234567893',
    orderId: 'ORD-2024-001236',
    customer: {
      name: 'Sneha Reddy',
      phone: '+91-9876543213',
      address: '321 Jubilee Hills',
      city: 'Hyderabad',
      pincode: '500033'
    },
    origin: { hub: 'Hyderabad Hub', city: 'Hyderabad' },
    status: 'pending',
    carrier: 'Pending Assignment',
    estimatedDelivery: '2024-01-19',
    items: 5,
    weight: '4.5 kg',
    dimensions: '40x30x25 cm',
    shipmentType: 'standard',
    createdAt: '2024-01-16 09:00',
    lastUpdate: '2024-01-16 09:00',
    trackingHistory: [
      { timestamp: '2024-01-16 09:00', status: 'Order Created', location: 'Hyderabad Hub', description: 'Shipment created, awaiting pickup' }
    ]
  },
  {
    id: 'SHP005',
    trackingNumber: 'BSM1234567894',
    orderId: 'ORD-2024-001220',
    customer: {
      name: 'Vikram Singh',
      phone: '+91-9876543214',
      address: '567 Civil Lines',
      city: 'Jaipur',
      pincode: '302006'
    },
    origin: { hub: 'Delhi Hub', city: 'Delhi' },
    status: 'failed',
    carrier: 'BlueDart',
    estimatedDelivery: '2024-01-14',
    items: 1,
    weight: '0.5 kg',
    dimensions: '10x10x5 cm',
    shipmentType: 'express',
    createdAt: '2024-01-12 11:00',
    lastUpdate: '2024-01-14 18:30',
    trackingHistory: [
      { timestamp: '2024-01-14 18:30', status: 'Delivery Failed', location: 'Jaipur', description: 'Customer not available' },
      { timestamp: '2024-01-14 14:00', status: 'Out for Delivery', location: 'Jaipur Hub', description: 'With delivery agent' },
      { timestamp: '2024-01-13 16:00', status: 'In Transit', location: 'Delhi', description: 'Package in transit' },
      { timestamp: '2024-01-12 11:00', status: 'Order Created', location: 'Delhi Hub', description: 'Shipment created' }
    ]
  }
];

const mockStats: ShipmentStats = {
  total: 156,
  pending: 12,
  inTransit: 45,
  delivered: 89,
  failed: 10,
  onTimeRate: 94.5
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Shipment['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700', icon: Clock },
    picked_up: { label: 'Picked Up', className: 'bg-blue-100 text-blue-700', icon: Package },
    in_transit: { label: 'In Transit', className: 'bg-yellow-100 text-yellow-700', icon: Truck },
    out_for_delivery: { label: 'Out for Delivery', className: 'bg-purple-100 text-purple-700', icon: Navigation },
    delivered: { label: 'Delivered', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
    returned: { label: 'Returned', className: 'bg-orange-100 text-orange-700', icon: ArrowRight },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ShipmentTypeBadge({ type }: { type: Shipment['shipmentType'] }) {
  const config = {
    standard: { label: 'Standard', className: 'bg-gray-100 text-gray-600' },
    express: { label: 'Express', className: 'bg-blue-100 text-blue-600' },
    same_day: { label: 'Same Day', className: 'bg-green-100 text-green-600' },
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TrackingTimeline({ events }: { events: TrackingEvent[] }) {
  return (
    <div className="relative">
      {events.map((event, idx) => (
        <div key={idx} className="flex gap-4 pb-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            {idx < events.length - 1 && <div className="w-0.5 h-full bg-gray-200 mt-1" />}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex justify-between items-start">
              <div>
                <p className={`font-medium text-sm ${idx === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                  {event.status}
                </p>
                <p className="text-xs text-gray-500">{event.description}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{event.location}</p>
                <p className="text-xs text-gray-400">{event.timestamp}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShipmentDetailModal({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold">{shipment.trackingNumber}</h2>
                <ShipmentTypeBadge type={shipment.shipmentType} />
              </div>
              <p className="text-sm text-gray-500">Order: {shipment.orderId}</p>
            </div>
            <StatusBadge status={shipment.status} />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Customer Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Delivery Address
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{shipment.customer.name}</p>
                <p className="text-gray-600">{shipment.customer.address}</p>
                <p className="text-gray-600">{shipment.customer.city} - {shipment.customer.pincode}</p>
                <div className="flex items-center gap-2 text-blue-600">
                  <Phone className="w-4 h-4" />
                  <span>{shipment.customer.phone}</span>
                </div>
              </div>
            </div>

            {/* Shipment Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Box className="w-4 h-4" />
                Package Details
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Items</p>
                  <p className="font-medium">{shipment.items}</p>
                </div>
                <div>
                  <p className="text-gray-500">Weight</p>
                  <p className="font-medium">{shipment.weight}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dimensions</p>
                  <p className="font-medium">{shipment.dimensions}</p>
                </div>
                <div>
                  <p className="text-gray-500">Carrier</p>
                  <p className="font-medium">{shipment.carrier}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Timeline */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Origin</p>
                  <p className="font-medium text-sm">{shipment.origin.hub}</p>
                </div>
                <div className="flex-1 flex items-center">
                  <div className="flex-1 h-0.5 bg-gray-300" />
                  <Truck className="w-6 h-6 text-blue-600 mx-2" />
                  <div className="flex-1 h-0.5 bg-gray-300" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Destination</p>
                  <p className="font-medium text-sm">{shipment.customer.city}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Est. Delivery:</span>
                <span className="font-medium">{shipment.estimatedDelivery}</span>
              </div>
              {shipment.actualDelivery && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Delivered: {shipment.actualDelivery}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tracking History */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Tracking History</h3>
            <TrackingTimeline events={shipment.trackingHistory} />
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
              <Map className="w-4 h-4" />
              Track on Map
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
              <Download className="w-4 h-4" />
              Download Label
            </button>
          </div>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ShipmentTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const filteredShipments = useMemo(() => {
    return mockShipments.filter(shipment => {
      const matchesSearch = 
        shipment.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipment Tracking</h1>
            <p className="text-gray-500">Track and manage all shipments</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Truck className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.inTransit}</p>
                <p className="text-sm text-gray-500">In Transit</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.delivered}</p>
                <p className="text-sm text-gray-500">Delivered</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.failed}</p>
                <p className="text-sm text-gray-500">Failed</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.onTimeRate}%</p>
                <p className="text-sm text-gray-500">On-Time</p>
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
              placeholder="Search by tracking number, order ID, or customer name..."
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
            <option value="pending">Pending</option>
            <option value="picked_up">Picked Up</option>
            <option value="in_transit">In Transit</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        {/* Shipments Table */}
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carrier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Delivery</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredShipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-mono text-sm font-medium text-blue-600">{shipment.trackingNumber}</p>
                      <p className="text-xs text-gray-500">{shipment.orderId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{shipment.customer.name}</p>
                      <p className="text-xs text-gray-500">{shipment.customer.city}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">{shipment.origin.city}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{shipment.customer.city}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={shipment.status} />
                  </td>
                  <td className="px-4 py-3 text-sm">{shipment.carrier}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <p className={shipment.status === 'failed' ? 'text-red-600' : 'text-gray-900'}>
                        {shipment.estimatedDelivery}
                      </p>
                      {shipment.actualDelivery && (
                        <p className="text-xs text-green-600">✓ {shipment.actualDelivery}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedShipment(shipment)}
                        className="p-1 hover:bg-gray-100 rounded" 
                        title="Track"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="More">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredShipments.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border mt-4">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No shipments found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedShipment && (
        <ShipmentDetailModal
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
        />
      )}
    </div>
  );
}
