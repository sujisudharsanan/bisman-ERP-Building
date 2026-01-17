'use client';

import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Package, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  Download,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ArrowUpRight,
  Building
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  maxUsers: number;
  maxStorage: string;
  isPopular?: boolean;
}

interface Subscription {
  id: string;
  businessId: string;
  businessName: string;
  planId: string;
  planName: string;
  status: 'active' | 'trial' | 'expired' | 'cancelled' | 'past_due';
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  amount: number;
  usersCount: number;
  maxUsers: number;
  storageUsed: string;
  maxStorage: string;
}

interface Payment {
  id: string;
  subscriptionId: string;
  businessName: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  date: string;
  invoiceId: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockPlans: SubscriptionPlan[] = [
  {
    id: 'plan_starter',
    name: 'Starter',
    price: 2999,
    billingCycle: 'monthly',
    features: ['Up to 5 users', '10 GB storage', 'Basic reports', 'Email support'],
    maxUsers: 5,
    maxStorage: '10 GB'
  },
  {
    id: 'plan_professional',
    name: 'Professional',
    price: 7999,
    billingCycle: 'monthly',
    features: ['Up to 25 users', '100 GB storage', 'Advanced reports', 'Priority support', 'API access'],
    maxUsers: 25,
    maxStorage: '100 GB',
    isPopular: true
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    price: 19999,
    billingCycle: 'monthly',
    features: ['Unlimited users', '1 TB storage', 'Custom reports', '24/7 support', 'API access', 'Custom integrations'],
    maxUsers: -1,
    maxStorage: '1 TB'
  }
];

const mockSubscriptions: Subscription[] = [
  {
    id: 'sub_001',
    businessId: 'B001',
    businessName: 'Acme Industries',
    planId: 'plan_professional',
    planName: 'Professional',
    status: 'active',
    startDate: '2023-06-15',
    endDate: '2024-06-15',
    nextBillingDate: '2024-02-15',
    amount: 7999,
    usersCount: 18,
    maxUsers: 25,
    storageUsed: '45 GB',
    maxStorage: '100 GB'
  },
  {
    id: 'sub_002',
    businessId: 'B002',
    businessName: 'TechCorp Solutions',
    planId: 'plan_enterprise',
    planName: 'Enterprise',
    status: 'active',
    startDate: '2023-09-01',
    endDate: '2024-09-01',
    nextBillingDate: '2024-02-01',
    amount: 19999,
    usersCount: 85,
    maxUsers: -1,
    storageUsed: '320 GB',
    maxStorage: '1 TB'
  },
  {
    id: 'sub_003',
    businessId: 'B003',
    businessName: 'StartUp Inc',
    planId: 'plan_starter',
    planName: 'Starter',
    status: 'trial',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    nextBillingDate: '2024-02-01',
    amount: 2999,
    usersCount: 3,
    maxUsers: 5,
    storageUsed: '2 GB',
    maxStorage: '10 GB'
  },
  {
    id: 'sub_004',
    businessId: 'B004',
    businessName: 'Legacy Corp',
    planId: 'plan_professional',
    planName: 'Professional',
    status: 'past_due',
    startDate: '2023-03-10',
    endDate: '2024-03-10',
    nextBillingDate: '2024-01-10',
    amount: 7999,
    usersCount: 22,
    maxUsers: 25,
    storageUsed: '78 GB',
    maxStorage: '100 GB'
  },
  {
    id: 'sub_005',
    businessId: 'B005',
    businessName: 'Old Systems Ltd',
    planId: 'plan_starter',
    planName: 'Starter',
    status: 'cancelled',
    startDate: '2023-01-15',
    endDate: '2024-01-15',
    nextBillingDate: '-',
    amount: 2999,
    usersCount: 0,
    maxUsers: 5,
    storageUsed: '0 GB',
    maxStorage: '10 GB'
  }
];

const mockPayments: Payment[] = [
  { id: 'pay_001', subscriptionId: 'sub_001', businessName: 'Acme Industries', amount: 7999, currency: 'INR', status: 'succeeded', paymentMethod: 'Card ****4242', date: '2024-01-15', invoiceId: 'INV-2024-001' },
  { id: 'pay_002', subscriptionId: 'sub_002', businessName: 'TechCorp Solutions', amount: 19999, currency: 'INR', status: 'succeeded', paymentMethod: 'Bank Transfer', date: '2024-01-01', invoiceId: 'INV-2024-002' },
  { id: 'pay_003', subscriptionId: 'sub_004', businessName: 'Legacy Corp', amount: 7999, currency: 'INR', status: 'failed', paymentMethod: 'Card ****1234', date: '2024-01-10', invoiceId: 'INV-2024-003' },
  { id: 'pay_004', subscriptionId: 'sub_001', businessName: 'Acme Industries', amount: 7999, currency: 'INR', status: 'succeeded', paymentMethod: 'Card ****4242', date: '2023-12-15', invoiceId: 'INV-2023-045' },
  { id: 'pay_005', subscriptionId: 'sub_002', businessName: 'TechCorp Solutions', amount: 19999, currency: 'INR', status: 'succeeded', paymentMethod: 'Bank Transfer', date: '2023-12-01', invoiceId: 'INV-2023-042' },
];

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Subscription['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-green-100 text-green-700' },
    trial: { label: 'Trial', className: 'bg-blue-100 text-blue-700' },
    expired: { label: 'Expired', className: 'bg-gray-100 text-gray-700' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
    past_due: { label: 'Past Due', className: 'bg-red-100 text-red-700' },
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
  const config = {
    succeeded: { label: 'Succeeded', className: 'bg-green-100 text-green-700' },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
    refunded: { label: 'Refunded', className: 'bg-purple-100 text-purple-700' },
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  return (
    <div className={`bg-white rounded-lg border p-6 relative ${
      plan.isPopular ? 'border-blue-500 ring-2 ring-blue-500' : ''
    }`}>
      {plan.isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Most Popular
          </span>
        </div>
      )}
      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-3xl font-bold">₹{plan.price.toLocaleString()}</span>
        <span className="text-gray-500">/{plan.billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
      </div>
      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button className="w-full py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium">
        Edit Plan
      </button>
    </div>
  );
}

function SubscriptionTable({ subscriptions }: { subscriptions: Subscription[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Billing</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {subscriptions.map((sub) => (
            <tr key={sub.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{sub.businessName}</p>
                    <p className="text-xs text-gray-500">{sub.businessId}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm font-medium">{sub.planName}</td>
              <td className="px-4 py-3">
                <StatusBadge status={sub.status} />
              </td>
              <td className="px-4 py-3 text-sm">
                {sub.usersCount}/{sub.maxUsers === -1 ? '∞' : sub.maxUsers}
              </td>
              <td className="px-4 py-3 text-sm">
                {sub.storageUsed}/{sub.maxStorage}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{sub.nextBillingDate}</td>
              <td className="px-4 py-3 text-sm font-medium">₹{sub.amount.toLocaleString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded" title="View">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </button>
                  <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTable({ payments }: { payments: Payment[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-600">{payment.date}</td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.businessName}</td>
              <td className="px-4 py-3 text-sm text-blue-600">{payment.invoiceId}</td>
              <td className="px-4 py-3 text-sm font-medium">₹{payment.amount.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{payment.paymentMethod}</td>
              <td className="px-4 py-3">
                <PaymentStatusBadge status={payment.status} />
              </td>
              <td className="px-4 py-3">
                <button className="p-1 hover:bg-gray-100 rounded" title="Download Invoice">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SubscriptionBillingPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'payments' | 'plans'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSubscriptions = useMemo(() => {
    return mockSubscriptions.filter(sub => {
      const matchesSearch = sub.businessName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    totalMRR: mockSubscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount, 0),
    activeSubscriptions: mockSubscriptions.filter(s => s.status === 'active').length,
    trialSubscriptions: mockSubscriptions.filter(s => s.status === 'trial').length,
    pastDue: mockSubscriptions.filter(s => s.status === 'past_due').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
            <p className="text-gray-500">Manage subscriptions, plans, and payments</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Subscription
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-green-100 text-sm">Monthly Recurring Revenue</p>
                <p className="text-3xl font-bold">₹{stats.totalMRR.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
                <p className="text-sm text-gray-500">Active Subscriptions</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.trialSubscriptions}</p>
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
                <p className="text-2xl font-bold">{stats.pastDue}</p>
                <p className="text-sm text-gray-500">Past Due</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'subscriptions', label: 'Subscriptions' },
            { id: 'payments', label: 'Payments' },
            { id: 'plans', label: 'Plans' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'plans' && (
          <div className="grid grid-cols-3 gap-6">
            {mockPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search businesses..."
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
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="bg-white rounded-lg border">
              <SubscriptionTable subscriptions={filteredSubscriptions} />
            </div>
          </>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg border">
            <PaymentTable payments={mockPayments} />
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Subscriptions</h3>
              <SubscriptionTable subscriptions={mockSubscriptions.slice(0, 3)} />
            </div>
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Payments</h3>
              <PaymentTable payments={mockPayments.slice(0, 3)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
