'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Power,
  Download,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  BarChart2
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  plan: string;
  usersCount: number;
  maxUsers: number;
  storageUsed: string;
  maxStorage: string;
  createdAt: string;
  lastLogin: string;
  billingStatus: 'current' | 'past_due' | 'none';
  industry: string;
}

interface TenantStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  totalUsers: number;
  totalStorage: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockTenants: Tenant[] = [
  {
    id: 'T001',
    name: 'Acme Industries',
    slug: 'acme',
    domain: 'acme.bisman.app',
    email: 'admin@acme.com',
    phone: '+91-9876543210',
    address: 'Mumbai, Maharashtra',
    status: 'active',
    plan: 'Professional',
    usersCount: 45,
    maxUsers: 50,
    storageUsed: '78 GB',
    maxStorage: '100 GB',
    createdAt: '2023-03-15',
    lastLogin: '2024-01-15 14:30',
    billingStatus: 'current',
    industry: 'Manufacturing'
  },
  {
    id: 'T002',
    name: 'TechCorp Solutions',
    slug: 'techcorp',
    domain: 'techcorp.bisman.app',
    email: 'it@techcorp.in',
    phone: '+91-9876543211',
    address: 'Bangalore, Karnataka',
    status: 'active',
    plan: 'Enterprise',
    usersCount: 120,
    maxUsers: -1,
    storageUsed: '450 GB',
    maxStorage: '1 TB',
    createdAt: '2023-01-10',
    lastLogin: '2024-01-15 16:45',
    billingStatus: 'current',
    industry: 'IT Services'
  },
  {
    id: 'T003',
    name: 'Green Valley Foods',
    slug: 'greenvalley',
    domain: 'gvf.bisman.app',
    email: 'contact@greenvalley.com',
    phone: '+91-9876543212',
    address: 'Pune, Maharashtra',
    status: 'trial',
    plan: 'Professional',
    usersCount: 8,
    maxUsers: 50,
    storageUsed: '5 GB',
    maxStorage: '100 GB',
    createdAt: '2024-01-01',
    lastLogin: '2024-01-14 10:20',
    billingStatus: 'none',
    industry: 'Food Processing'
  },
  {
    id: 'T004',
    name: 'FastTrack Logistics',
    slug: 'fasttrack',
    domain: 'fasttrack.bisman.app',
    email: 'ops@fasttrack.in',
    phone: '+91-9876543213',
    address: 'Delhi, NCR',
    status: 'active',
    plan: 'Starter',
    usersCount: 12,
    maxUsers: 15,
    storageUsed: '18 GB',
    maxStorage: '25 GB',
    createdAt: '2023-06-20',
    lastLogin: '2024-01-15 09:15',
    billingStatus: 'past_due',
    industry: 'Logistics'
  },
  {
    id: 'T005',
    name: 'Sunrise Pharma',
    slug: 'sunrise',
    domain: 'sunrise.bisman.app',
    email: 'admin@sunrise.com',
    phone: '+91-9876543214',
    address: 'Hyderabad, Telangana',
    status: 'suspended',
    plan: 'Professional',
    usersCount: 0,
    maxUsers: 50,
    storageUsed: '35 GB',
    maxStorage: '100 GB',
    createdAt: '2023-02-28',
    lastLogin: '2023-11-30 12:00',
    billingStatus: 'past_due',
    industry: 'Pharmaceuticals'
  },
  {
    id: 'T006',
    name: 'AutoParts Direct',
    slug: 'autoparts',
    domain: 'apd.bisman.app',
    email: 'sales@autoparts.in',
    phone: '+91-9876543215',
    address: 'Chennai, Tamil Nadu',
    status: 'active',
    plan: 'Professional',
    usersCount: 28,
    maxUsers: 50,
    storageUsed: '42 GB',
    maxStorage: '100 GB',
    createdAt: '2023-08-12',
    lastLogin: '2024-01-15 11:30',
    billingStatus: 'current',
    industry: 'Automotive'
  }
];

const mockStats: TenantStats = {
  total: 6,
  active: 4,
  trial: 1,
  suspended: 1,
  totalUsers: 213,
  totalStorage: '628 GB'
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Tenant['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700', icon: Power },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
    trial: { label: 'Trial', className: 'bg-blue-100 text-blue-700', icon: Clock },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function BillingBadge({ status }: { status: Tenant['billingStatus'] }) {
  const config = {
    current: { label: 'Current', className: 'bg-green-100 text-green-700' },
    past_due: { label: 'Past Due', className: 'bg-red-100 text-red-700' },
    none: { label: 'No Billing', className: 'bg-gray-100 text-gray-500' },
  }[status];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TenantCard({ tenant, onClick }: { tenant: Tenant; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
        tenant.status === 'suspended' ? 'border-red-200 bg-red-50' :
        tenant.status === 'trial' ? 'border-blue-200 bg-blue-50' :
        tenant.billingStatus === 'past_due' ? 'border-yellow-200' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
            {tenant.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
            <p className="text-sm text-gray-500">{tenant.domain}</p>
          </div>
        </div>
        <StatusBadge status={tenant.status} />
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Plan</span>
          <span className="font-medium">{tenant.plan}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Users</span>
          <span className="font-medium">
            {tenant.usersCount}/{tenant.maxUsers === -1 ? '∞' : tenant.maxUsers}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Storage</span>
          <span className="font-medium">{tenant.storageUsed}/{tenant.maxStorage}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Industry</span>
          <span className="font-medium">{tenant.industry}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t">
        <BillingBadge status={tenant.billingStatus} />
        <span className="text-xs text-gray-400">Last: {tenant.lastLogin}</span>
      </div>
    </div>
  );
}

function TenantDetailModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                {tenant.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{tenant.name}</h2>
                <p className="text-gray-500">{tenant.domain}</p>
              </div>
            </div>
            <StatusBadge status={tenant.status} />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{tenant.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{tenant.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{tenant.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a href={`https://${tenant.domain}`} className="text-blue-600 hover:underline">
                    {tenant.domain}
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Account Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tenant ID</span>
                  <span className="font-mono">{tenant.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slug</span>
                  <span className="font-mono">{tenant.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Industry</span>
                  <span>{tenant.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{tenant.createdAt}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{tenant.usersCount}</p>
              <p className="text-xs text-gray-500">of {tenant.maxUsers === -1 ? '∞' : tenant.maxUsers} users</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Building2 className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{tenant.storageUsed}</p>
              <p className="text-xs text-gray-500">of {tenant.maxStorage}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <CreditCard className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-lg font-bold">{tenant.plan}</p>
              <p className="text-xs text-gray-500">Current Plan</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium">{tenant.lastLogin.split(' ')[0]}</p>
              <p className="text-xs text-gray-500">Last Login</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Eye className="w-4 h-4" />
              View Dashboard
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Edit className="w-4 h-4" />
              Edit Tenant
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Users className="w-4 h-4" />
              Manage Users
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <BarChart2 className="w-4 h-4" />
              Usage Report
            </button>
            {tenant.status === 'active' ? (
              <button className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                <Power className="w-4 h-4" />
                Suspend
              </button>
            ) : tenant.status === 'suspended' ? (
              <button className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-600 rounded-lg hover:bg-green-50">
                <CheckCircle className="w-4 h-4" />
                Reactivate
              </button>
            ) : null}
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

export default function TenantManagementPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const filteredTenants = useMemo(() => {
    return mockTenants.filter(tenant => {
      const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           tenant.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           tenant.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
            <p className="text-gray-500">Manage multi-tenant organizations</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Tenant
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
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.total}</p>
                <p className="text-sm text-gray-500">Total Tenants</p>
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
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.trial}</p>
                <p className="text-sm text-gray-500">In Trial</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.suspended}</p>
                <p className="text-sm text-gray-500">Suspended</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.totalUsers}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Settings className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockStats.totalStorage}</p>
                <p className="text-sm text-gray-500">Storage Used</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-lg w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-4">
            {filteredTenants.map((tenant) => (
              <TenantCard 
                key={tenant.id} 
                tenant={tenant}
                onClick={() => setSelectedTenant(tenant)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                          {tenant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{tenant.name}</p>
                          <p className="text-xs text-gray-500">{tenant.domain}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{tenant.plan}</td>
                    <td className="px-4 py-3 text-sm">
                      {tenant.usersCount}/{tenant.maxUsers === -1 ? '∞' : tenant.maxUsers}
                    </td>
                    <td className="px-4 py-3 text-sm">{tenant.storageUsed}/{tenant.maxStorage}</td>
                    <td className="px-4 py-3">
                      <BillingBadge status={tenant.billingStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedTenant(tenant)}
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
        )}
      </div>

      {/* Detail Modal */}
      {selectedTenant && (
        <TenantDetailModal 
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
        />
      )}
    </div>
  );
}
