'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Star,
  Eye,
  MoreVertical,
  BarChart2,
  Clock,
  Package,
  DollarSign,
  Settings,
  Building2,
  Globe
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Carrier {
  id: string;
  name: string;
  code: string;
  type: 'air' | 'ground' | 'express' | 'freight' | 'local';
  status: 'active' | 'inactive' | 'suspended';
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  address: string;
  serviceAreas: string[];
  rating: number;
  onTimeRate: number;
  avgDeliveryDays: number;
  shipmentsThisMonth: number;
  pricing: {
    baseRate: number;
    perKg: number;
    perKm?: number;
  };
  features: string[];
  contractExpiry: string;
  createdAt: string;
}

interface CarrierStats {
  total: number;
  active: number;
  avgRating: number;
  totalShipments: number;
  topCarrier: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockCarriers: Carrier[] = [
  {
    id: 'CAR001',
    name: 'BlueDart Express',
    code: 'BDE',
    type: 'express',
    status: 'active',
    contact: {
      name: 'Rajesh Kumar',
      email: 'rajesh@bluedart.com',
      phone: '+91-9876543210'
    },
    address: 'Mumbai, Maharashtra',
    serviceAreas: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Delhi', 'Karnataka'],
    rating: 4.5,
    onTimeRate: 96.5,
    avgDeliveryDays: 2.3,
    shipmentsThisMonth: 1250,
    pricing: { baseRate: 50, perKg: 15, perKm: 0.5 },
    features: ['Real-time Tracking', 'COD', 'Insurance', 'Sunday Delivery'],
    contractExpiry: '2025-06-30',
    createdAt: '2022-01-15'
  },
  {
    id: 'CAR002',
    name: 'Delhivery',
    code: 'DLV',
    type: 'ground',
    status: 'active',
    contact: {
      name: 'Priya Sharma',
      email: 'priya@delhivery.com',
      phone: '+91-9876543211'
    },
    address: 'Gurugram, Haryana',
    serviceAreas: ['Pan India'],
    rating: 4.3,
    onTimeRate: 94.2,
    avgDeliveryDays: 3.5,
    shipmentsThisMonth: 2100,
    pricing: { baseRate: 40, perKg: 12 },
    features: ['Real-time Tracking', 'COD', 'Reverse Logistics'],
    contractExpiry: '2024-12-31',
    createdAt: '2021-06-01'
  },
  {
    id: 'CAR003',
    name: 'DTDC Courier',
    code: 'DTDC',
    type: 'ground',
    status: 'active',
    contact: {
      name: 'Amit Patel',
      email: 'amit@dtdc.com',
      phone: '+91-9876543212'
    },
    address: 'Bangalore, Karnataka',
    serviceAreas: ['Karnataka', 'Tamil Nadu', 'Kerala', 'Andhra Pradesh', 'Telangana'],
    rating: 4.1,
    onTimeRate: 92.8,
    avgDeliveryDays: 3.8,
    shipmentsThisMonth: 890,
    pricing: { baseRate: 35, perKg: 10 },
    features: ['Real-time Tracking', 'COD'],
    contractExpiry: '2024-09-30',
    createdAt: '2020-03-15'
  },
  {
    id: 'CAR004',
    name: 'FedEx India',
    code: 'FDX',
    type: 'air',
    status: 'active',
    contact: {
      name: 'Suresh Menon',
      email: 'suresh@fedex.com',
      phone: '+91-9876543213'
    },
    address: 'Mumbai, Maharashtra',
    serviceAreas: ['International', 'Pan India'],
    rating: 4.7,
    onTimeRate: 98.1,
    avgDeliveryDays: 1.5,
    shipmentsThisMonth: 450,
    pricing: { baseRate: 150, perKg: 50, perKm: 1.2 },
    features: ['International', 'Real-time Tracking', 'Insurance', 'Priority Handling', 'Temperature Control'],
    contractExpiry: '2025-03-31',
    createdAt: '2022-08-01'
  },
  {
    id: 'CAR005',
    name: 'Local Express',
    code: 'LCL',
    type: 'local',
    status: 'active',
    contact: {
      name: 'Vikram Singh',
      email: 'vikram@localexp.com',
      phone: '+91-9876543214'
    },
    address: 'Delhi NCR',
    serviceAreas: ['Delhi', 'Noida', 'Gurugram', 'Ghaziabad', 'Faridabad'],
    rating: 4.0,
    onTimeRate: 95.0,
    avgDeliveryDays: 0.5,
    shipmentsThisMonth: 3200,
    pricing: { baseRate: 25, perKg: 5 },
    features: ['Same-day Delivery', 'COD', 'Real-time Tracking'],
    contractExpiry: '2024-06-30',
    createdAt: '2023-01-01'
  },
  {
    id: 'CAR006',
    name: 'Gati Logistics',
    code: 'GTI',
    type: 'freight',
    status: 'suspended',
    contact: {
      name: 'Ramesh Gupta',
      email: 'ramesh@gati.com',
      phone: '+91-9876543215'
    },
    address: 'Hyderabad, Telangana',
    serviceAreas: ['Pan India'],
    rating: 3.8,
    onTimeRate: 88.5,
    avgDeliveryDays: 5.0,
    shipmentsThisMonth: 0,
    pricing: { baseRate: 100, perKg: 8, perKm: 0.3 },
    features: ['Heavy Freight', 'Warehouse Storage', 'B2B'],
    contractExpiry: '2024-01-31',
    createdAt: '2019-11-01'
  }
];

const mockStats: CarrierStats = {
  total: 6,
  active: 5,
  avgRating: 4.23,
  totalShipments: 7890,
  topCarrier: 'Local Express'
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Carrier['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700', icon: XCircle },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: Carrier['type'] }) {
  const config = {
    air: { label: 'Air', className: 'bg-blue-100 text-blue-700' },
    ground: { label: 'Ground', className: 'bg-green-100 text-green-700' },
    express: { label: 'Express', className: 'bg-purple-100 text-purple-700' },
    freight: { label: 'Freight', className: 'bg-orange-100 text-orange-700' },
    local: { label: 'Local', className: 'bg-yellow-100 text-yellow-700' },
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star}
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-sm font-medium ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function CarrierCard({ carrier, onView }: { carrier: Carrier; onView: () => void }) {
  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
      carrier.status === 'suspended' ? 'border-red-200 bg-red-50/30' : ''
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
            {carrier.code}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{carrier.name}</h3>
            <div className="flex items-center gap-2">
              <TypeBadge type={carrier.type} />
              <StatusBadge status={carrier.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-blue-600">{carrier.onTimeRate}%</p>
          <p className="text-xs text-gray-500">On-Time</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-green-600">{carrier.avgDeliveryDays}d</p>
          <p className="text-xs text-gray-500">Avg. Days</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-bold text-purple-600">{carrier.shipmentsThisMonth}</p>
          <p className="text-xs text-gray-500">This Month</p>
        </div>
      </div>

      <div className="mb-3">
        <RatingStars rating={carrier.rating} />
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {carrier.features.slice(0, 3).map((feature) => (
          <span key={feature} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            {feature}
          </span>
        ))}
        {carrier.features.length > 3 && (
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            +{carrier.features.length - 3}
          </span>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t">
        <button 
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
        <button className="flex items-center justify-center px-3 py-2 text-sm hover:bg-gray-100 rounded-lg border">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CarrierDetailModal({ carrier, onClose }: { carrier: Carrier; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                {carrier.code}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{carrier.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <TypeBadge type={carrier.type} />
                  <StatusBadge status={carrier.status} />
                </div>
              </div>
            </div>
            <RatingStars rating={carrier.rating} />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Contact Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{carrier.contact.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${carrier.contact.email}`} className="text-blue-600 hover:underline">
                    {carrier.contact.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{carrier.contact.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{carrier.address}</span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Pricing</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Base Rate</span>
                  <span className="font-medium">₹{carrier.pricing.baseRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Per Kg</span>
                  <span className="font-medium">₹{carrier.pricing.perKg}</span>
                </div>
                {carrier.pricing.perKm && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Per Km</span>
                    <span className="font-medium">₹{carrier.pricing.perKm}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t mt-2">
                  <span className="text-gray-500">Contract Expires</span>
                  <span className="font-medium">{carrier.contractExpiry}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{carrier.onTimeRate}%</p>
              <p className="text-xs text-gray-500">On-Time Rate</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Truck className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{carrier.avgDeliveryDays}</p>
              <p className="text-xs text-gray-500">Avg. Delivery Days</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <Package className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{carrier.shipmentsThisMonth}</p>
              <p className="text-xs text-gray-500">Shipments/Month</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <Star className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{carrier.rating}</p>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
          </div>

          {/* Service Areas */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Service Areas
            </h3>
            <div className="flex flex-wrap gap-2">
              {carrier.serviceAreas.map((area) => (
                <span key={area} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Features & Services</h3>
            <div className="flex flex-wrap gap-2">
              {carrier.features.map((feature) => (
                <span key={feature} className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
              <Edit className="w-4 h-4" />
              Edit Carrier
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
              <BarChart2 className="w-4 h-4" />
              View Analytics
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

export default function CarrierManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCarrier, setSelectedCarrier] = useState<Carrier | null>(null);

  const filteredCarriers = useMemo(() => {
    return mockCarriers.filter(carrier => {
      const matchesSearch = 
        carrier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        carrier.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || carrier.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || carrier.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Carrier Management</h1>
            <p className="text-gray-500">Manage shipping carriers and partners</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Add Carrier
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.total}</p>
                <p className="text-sm text-gray-500">Total Carriers</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.avgRating}</p>
                <p className="text-sm text-gray-500">Avg Rating</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(mockStats.totalShipments / 1000).toFixed(1)}K</p>
                <p className="text-sm text-gray-500">Shipments</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{mockStats.topCarrier}</p>
                <p className="text-sm text-gray-500">Top Carrier</p>
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
              placeholder="Search carriers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="air">Air</option>
            <option value="ground">Ground</option>
            <option value="express">Express</option>
            <option value="freight">Freight</option>
            <option value="local">Local</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Carriers Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredCarriers.map((carrier) => (
            <CarrierCard
              key={carrier.id}
              carrier={carrier}
              onView={() => setSelectedCarrier(carrier)}
            />
          ))}
        </div>

        {filteredCarriers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No carriers found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCarrier && (
        <CarrierDetailModal
          carrier={selectedCarrier}
          onClose={() => setSelectedCarrier(null)}
        />
      )}
    </div>
  );
}
