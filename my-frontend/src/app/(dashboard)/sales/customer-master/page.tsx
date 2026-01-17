'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Eye,
  MoreVertical,
  ShoppingBag,
  DollarSign,
  Star,
  Tag,
  Download,
  Upload,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Building2
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  type: 'individual' | 'business' | 'wholesale';
  status: 'active' | 'inactive' | 'blocked';
  segment: 'regular' | 'vip' | 'premium';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  creditLimit: number;
  outstandingBalance: number;
  createdAt: string;
  notes?: string;
}

interface CustomerStats {
  total: number;
  active: number;
  newThisMonth: number;
  vip: number;
  totalRevenue: number;
  avgOrderValue: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockCustomers: Customer[] = [
  {
    id: 'CUS001',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@email.com',
    phone: '+91-9876543210',
    company: 'Sharma Electronics',
    address: '123 MG Road, Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400069',
    type: 'business',
    status: 'active',
    segment: 'vip',
    totalOrders: 156,
    totalSpent: 2450000,
    lastOrderDate: '2024-01-15',
    creditLimit: 500000,
    outstandingBalance: 125000,
    createdAt: '2022-03-15',
    notes: 'Preferred customer, always pays on time'
  },
  {
    id: 'CUS002',
    name: 'Priya Patel',
    email: 'priya.patel@business.com',
    phone: '+91-9876543211',
    company: 'Patel Traders',
    address: '456 Commercial Street',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    type: 'wholesale',
    status: 'active',
    segment: 'premium',
    totalOrders: 89,
    totalSpent: 1850000,
    lastOrderDate: '2024-01-14',
    creditLimit: 300000,
    outstandingBalance: 45000,
    createdAt: '2022-06-20'
  },
  {
    id: 'CUS003',
    name: 'Amit Kumar',
    email: 'amit.kumar@gmail.com',
    phone: '+91-9876543212',
    address: '789 Sector 18',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    type: 'individual',
    status: 'active',
    segment: 'regular',
    totalOrders: 12,
    totalSpent: 45000,
    lastOrderDate: '2024-01-10',
    creditLimit: 0,
    outstandingBalance: 0,
    createdAt: '2023-08-01'
  },
  {
    id: 'CUS004',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@techcorp.in',
    phone: '+91-9876543213',
    company: 'TechCorp Solutions',
    address: '321 Jubilee Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500033',
    type: 'business',
    status: 'active',
    segment: 'vip',
    totalOrders: 234,
    totalSpent: 4500000,
    lastOrderDate: '2024-01-16',
    creditLimit: 1000000,
    outstandingBalance: 320000,
    createdAt: '2021-01-10'
  },
  {
    id: 'CUS005',
    name: 'Vikram Singh',
    email: 'vikram.singh@email.com',
    phone: '+91-9876543214',
    address: '567 Civil Lines',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302006',
    type: 'individual',
    status: 'inactive',
    segment: 'regular',
    totalOrders: 3,
    totalSpent: 8500,
    lastOrderDate: '2023-06-15',
    creditLimit: 0,
    outstandingBalance: 0,
    createdAt: '2023-03-01'
  },
  {
    id: 'CUS006',
    name: 'Meera Joshi',
    email: 'meera@joshigroup.com',
    phone: '+91-9876543215',
    company: 'Joshi Group',
    address: '890 Station Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    type: 'wholesale',
    status: 'blocked',
    segment: 'regular',
    totalOrders: 45,
    totalSpent: 890000,
    lastOrderDate: '2023-11-30',
    creditLimit: 200000,
    outstandingBalance: 185000,
    createdAt: '2022-09-01',
    notes: 'Blocked due to payment defaults'
  }
];

const mockStats: CustomerStats = {
  total: 1256,
  active: 1089,
  newThisMonth: 45,
  vip: 128,
  totalRevenue: 45600000,
  avgOrderValue: 35000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Customer['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700', icon: Clock },
    blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function SegmentBadge({ segment }: { segment: Customer['segment'] }) {
  const config = {
    regular: { label: 'Regular', className: 'bg-gray-100 text-gray-600' },
    premium: { label: 'Premium', className: 'bg-blue-100 text-blue-600' },
    vip: { label: 'VIP', className: 'bg-yellow-100 text-yellow-700' },
  }[segment];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: Customer['type'] }) {
  const config = {
    individual: { label: 'Individual', className: 'bg-purple-100 text-purple-600' },
    business: { label: 'Business', className: 'bg-green-100 text-green-600' },
    wholesale: { label: 'Wholesale', className: 'bg-orange-100 text-orange-600' },
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount}`;
}

function CustomerDetailModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                {customer.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{customer.name}</h2>
                {customer.company && (
                  <p className="text-gray-500">{customer.company}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <TypeBadge type={customer.type} />
                  <SegmentBadge segment={customer.segment} />
                  <StatusBadge status={customer.status} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Contact Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                    {customer.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p>{customer.address}</p>
                    <p>{customer.city}, {customer.state} - {customer.pincode}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Financial Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Credit Limit</span>
                  <span className="font-medium">{formatCurrency(customer.creditLimit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Outstanding Balance</span>
                  <span className={`font-medium ${customer.outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(customer.outstandingBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Available Credit</span>
                  <span className="font-medium">
                    {formatCurrency(customer.creditLimit - customer.outstandingBalance)}
                  </span>
                </div>
                {customer.creditLimit > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Credit Utilization</span>
                      <span>{Math.round((customer.outstandingBalance / customer.creditLimit) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${customer.outstandingBalance / customer.creditLimit > 0.8 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${(customer.outstandingBalance / customer.creditLimit) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <ShoppingBag className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{customer.totalOrders}</p>
              <p className="text-xs text-gray-500">Total Orders</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(customer.totalSpent)}</p>
              <p className="text-xs text-gray-500">Total Spent</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(customer.totalSpent / customer.totalOrders)}</p>
              <p className="text-xs text-gray-500">Avg. Order</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <Calendar className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-lg font-bold">{customer.lastOrderDate}</p>
              <p className="text-xs text-gray-500">Last Order</p>
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{customer.notes}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <ShoppingBag className="w-4 h-4" />
              Create Order
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Mail className="w-4 h-4" />
              Send Email
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <MessageSquare className="w-4 h-4" />
              Add Note
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end">
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

export default function CustomerMasterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    return mockCustomers.filter(customer => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        (customer.company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesType = typeFilter === 'all' || customer.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      const matchesSegment = segmentFilter === 'all' || customer.segment === segmentFilter;
      return matchesSearch && matchesType && matchesStatus && matchesSegment;
    });
  }, [searchQuery, typeFilter, statusFilter, segmentFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Master</h1>
            <p className="text-gray-500">Manage customer database and relationships</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <UserPlus className="w-4 h-4" />
              Add Customer
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
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.total.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Total Customers</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.active.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.newThisMonth}</p>
                <p className="text-sm text-gray-500">New This Month</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.vip}</p>
                <p className="text-sm text-gray-500">VIP Customers</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(mockStats.totalRevenue)}</p>
                <p className="text-sm text-gray-500">Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(mockStats.avgOrderValue)}</p>
                <p className="text-sm text-gray-500">Avg Order Value</p>
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
              placeholder="Search by name, email, phone, or company..."
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
            <option value="individual">Individual</option>
            <option value="business">Business</option>
            <option value="wholesale">Wholesale</option>
          </select>
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Segments</option>
            <option value="regular">Regular</option>
            <option value="premium">Premium</option>
            <option value="vip">VIP</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Segment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={customer.type} />
                  </td>
                  <td className="px-4 py-3">
                    <SegmentBadge segment={customer.segment} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={customer.status} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {customer.totalOrders}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {formatCurrency(customer.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {customer.lastOrderDate}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedCustomer(customer)}
                        className="p-1 hover:bg-gray-100 rounded" 
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
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

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border mt-4">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No customers found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}
