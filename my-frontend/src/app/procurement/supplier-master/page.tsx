'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
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
  Star,
  Phone,
  Mail,
  MapPin,
  Globe,
  FileText,
  DollarSign,
  Package,
  TrendingUp,
  User
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Supplier {
  id: string;
  code: string;
  name: string;
  type: 'manufacturer' | 'distributor' | 'wholesaler' | 'service_provider';
  status: 'active' | 'inactive' | 'pending_approval' | 'blacklisted';
  category: string[];
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  address: {
    city: string;
    country: string;
  };
  rating: number;
  totalOrders: number;
  totalValue: number;
  paymentTerms: string;
  leadTime: number;
  certifications: string[];
  lastOrderDate?: string;
  createdDate: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockSuppliers: Supplier[] = [
  {
    id: 'SUP001',
    code: 'SUP-001',
    name: 'Global Steel Corporation',
    type: 'manufacturer',
    status: 'active',
    category: ['Raw Materials', 'Metals'],
    contact: { name: 'John Smith', email: 'john.smith@globalsteel.com', phone: '+1 555-0101' },
    address: { city: 'Pittsburgh', country: 'USA' },
    rating: 4.8,
    totalOrders: 156,
    totalValue: 2850000,
    paymentTerms: 'Net 30',
    leadTime: 7,
    certifications: ['ISO 9001', 'ISO 14001'],
    lastOrderDate: '2024-01-15',
    createdDate: '2020-03-15'
  },
  {
    id: 'SUP002',
    code: 'SUP-002',
    name: 'TechComponents Inc',
    type: 'distributor',
    status: 'active',
    category: ['Electronics', 'Components'],
    contact: { name: 'Sarah Johnson', email: 's.johnson@techcomp.com', phone: '+1 555-0102' },
    address: { city: 'San Jose', country: 'USA' },
    rating: 4.5,
    totalOrders: 89,
    totalValue: 1250000,
    paymentTerms: 'Net 45',
    leadTime: 5,
    certifications: ['ISO 9001', 'RoHS'],
    lastOrderDate: '2024-01-18',
    createdDate: '2021-06-20'
  },
  {
    id: 'SUP003',
    code: 'SUP-003',
    name: 'PackPro Solutions',
    type: 'wholesaler',
    status: 'active',
    category: ['Packaging', 'Consumables'],
    contact: { name: 'Mike Chen', email: 'm.chen@packpro.com', phone: '+1 555-0103' },
    address: { city: 'Chicago', country: 'USA' },
    rating: 4.2,
    totalOrders: 234,
    totalValue: 450000,
    paymentTerms: 'Net 15',
    leadTime: 3,
    certifications: ['FSC'],
    lastOrderDate: '2024-01-10',
    createdDate: '2019-01-10'
  },
  {
    id: 'SUP004',
    code: 'SUP-004',
    name: 'Industrial Services Co',
    type: 'service_provider',
    status: 'pending_approval',
    category: ['Services', 'Maintenance'],
    contact: { name: 'Lisa Wong', email: 'l.wong@indservices.com', phone: '+1 555-0104' },
    address: { city: 'Detroit', country: 'USA' },
    rating: 0,
    totalOrders: 0,
    totalValue: 0,
    paymentTerms: 'Net 30',
    leadTime: 1,
    certifications: [],
    createdDate: '2024-01-15'
  },
  {
    id: 'SUP005',
    code: 'SUP-005',
    name: 'QuickParts Ltd',
    type: 'distributor',
    status: 'inactive',
    category: ['Spare Parts', 'MRO'],
    contact: { name: 'Robert Brown', email: 'r.brown@quickparts.com', phone: '+44 20-7123-4567' },
    address: { city: 'London', country: 'UK' },
    rating: 3.8,
    totalOrders: 45,
    totalValue: 180000,
    paymentTerms: 'Net 30',
    leadTime: 10,
    certifications: ['ISO 9001'],
    lastOrderDate: '2023-09-22',
    createdDate: '2020-11-05'
  }
];

const stats = {
  totalSuppliers: 156,
  activeSuppliers: 142,
  pendingApproval: 8,
  avgRating: 4.3
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Supplier['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: XCircle },
    pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    blacklisted: { label: 'Blacklisted', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: Supplier['type'] }) {
  const labels = {
    manufacturer: 'Manufacturer',
    distributor: 'Distributor',
    wholesaler: 'Wholesaler',
    service_provider: 'Service Provider'
  };

  const config = {
    manufacturer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    distributor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    wholesaler: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    service_provider: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config}`}>
      {labels[type]}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  if (rating === 0) {
    return <span className="text-xs text-gray-400">No rating</span>;
  }
  return (
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
      <span className="font-medium text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function SupplierMasterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSuppliers = useMemo(() => {
    return mockSuppliers.filter(supplier => {
      const matchesSearch =
        supplier.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contact.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || supplier.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supplier Master</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage supplier information and relationships</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Supplier
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
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSuppliers}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Suppliers</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeSuppliers}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Suppliers</p>
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
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgRating}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
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
              placeholder="Search by code, name, or contact..."
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
            <option value="manufacturer">Manufacturer</option>
            <option value="distributor">Distributor</option>
            <option value="wholesaler">Wholesaler</option>
            <option value="service_provider">Service Provider</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending_approval">Pending Approval</option>
          </select>
        </div>

        {/* Suppliers Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{supplier.name}</span>
                      <span className="text-xs text-gray-400">{supplier.code}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <TypeBadge type={supplier.type} />
                      <StatusBadge status={supplier.status} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="View">
                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Edit">
                    <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Contact</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{supplier.contact.name}</p>
                  <p className="text-xs text-gray-500">{supplier.contact.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{supplier.address.city}</p>
                  <p className="text-xs text-gray-500">{supplier.address.country}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {supplier.category.map((cat) => (
                  <span key={cat} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
                    {cat}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Rating</p>
                  <RatingStars rating={supplier.rating} />
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Orders</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{supplier.totalOrders}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total Value</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{formatCurrency(supplier.totalValue)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Lead Time</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{supplier.leadTime} days</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No suppliers found</p>
          </div>
        )}
      </div>
    </div>
  );
}
