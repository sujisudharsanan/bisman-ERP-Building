'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  CreditCard,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  Edit,
  MoreVertical,
  Download,
  Mail,
  RefreshCw,
  Users,
  Package
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  billingCycle: 'monthly' | 'annually';
  currentBalance: number;
  nextBillingDate: string;
  userCount: number;
  storageUsed: number;
  storageLimit: number;
  lastPayment: {
    amount: number;
    date: string;
    status: 'success' | 'failed' | 'pending';
  };
  createdAt: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockTenants: Tenant[] = [
  {
    id: 'TEN001',
    name: 'Acme Corporation',
    email: 'billing@acme.com',
    plan: 'enterprise',
    status: 'active',
    billingCycle: 'annually',
    currentBalance: 0,
    nextBillingDate: '2024-02-15',
    userCount: 150,
    storageUsed: 85,
    storageLimit: 100,
    lastPayment: { amount: 24000, date: '2024-01-15', status: 'success' },
    createdAt: '2022-03-01'
  },
  {
    id: 'TEN002',
    name: 'TechStart Inc',
    email: 'accounts@techstart.io',
    plan: 'professional',
    status: 'active',
    billingCycle: 'monthly',
    currentBalance: 0,
    nextBillingDate: '2024-02-01',
    userCount: 45,
    storageUsed: 28,
    storageLimit: 50,
    lastPayment: { amount: 299, date: '2024-01-01', status: 'success' },
    createdAt: '2023-06-15'
  },
  {
    id: 'TEN003',
    name: 'Global Industries',
    email: 'finance@globalind.com',
    plan: 'enterprise',
    status: 'suspended',
    billingCycle: 'annually',
    currentBalance: 4500,
    nextBillingDate: '2024-01-20',
    userCount: 200,
    storageUsed: 120,
    storageLimit: 150,
    lastPayment: { amount: 36000, date: '2023-12-20', status: 'failed' },
    createdAt: '2021-09-01'
  },
  {
    id: 'TEN004',
    name: 'StartupHub',
    email: 'team@startuphub.co',
    plan: 'starter',
    status: 'trial',
    billingCycle: 'monthly',
    currentBalance: 0,
    nextBillingDate: '2024-02-10',
    userCount: 8,
    storageUsed: 2,
    storageLimit: 10,
    lastPayment: { amount: 0, date: '', status: 'pending' },
    createdAt: '2024-01-10'
  },
  {
    id: 'TEN005',
    name: 'Legacy Systems Ltd',
    email: 'admin@legacysys.com',
    plan: 'professional',
    status: 'cancelled',
    billingCycle: 'monthly',
    currentBalance: 0,
    nextBillingDate: '',
    userCount: 0,
    storageUsed: 0,
    storageLimit: 50,
    lastPayment: { amount: 299, date: '2023-11-01', status: 'success' },
    createdAt: '2022-01-15'
  }
];

const stats = {
  totalTenants: 156,
  activeTenants: 142,
  monthlyRevenue: 45890,
  overdueAmount: 12500
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Tenant['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    trial: { label: 'Trial', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
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

function PlanBadge({ plan }: { plan: Tenant['plan'] }) {
  const config = {
    starter: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  }[plan];

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${config}`}>
      {plan}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: 'success' | 'failed' | 'pending' }) {
  const config = {
    success: 'text-green-600 dark:text-green-400',
    failed: 'text-red-600 dark:text-red-400',
    pending: 'text-yellow-600 dark:text-yellow-400'
  }[status];

  return <span className={`text-xs font-medium ${config}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

// ============================================================================
// Main Component
// ============================================================================

export default function TenantBillingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const filteredTenants = useMemo(() => {
    return mockTenants.filter(tenant => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [searchQuery, statusFilter, planFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenant Billing</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage tenant subscriptions and billing</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
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
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTenants}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tenants</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeTenants}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Tenants</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.monthlyRevenue)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Revenue</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.overdueAmount)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue Amount</p>
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
              placeholder="Search tenants by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Users</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Billing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{tenant.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={tenant.plan} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">{tenant.billingCycle}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tenant.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                      <Users className="w-4 h-4 text-gray-400" />
                      {tenant.userCount}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${tenant.currentBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {formatCurrency(tenant.currentBalance)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tenant.lastPayment.date ? (
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{formatCurrency(tenant.lastPayment.amount)}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">{tenant.lastPayment.date}</span>
                          <PaymentStatusBadge status={tenant.lastPayment.status} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No payment</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {tenant.nextBillingDate || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="View Details">
                        <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="Send Invoice">
                        <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded" title="More">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTenants.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mt-4">
            <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No tenants found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
