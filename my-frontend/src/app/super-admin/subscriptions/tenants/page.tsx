'use client';

/**
 * SuperAdmin - Tenant Subscription Management
 * 
 * Features:
 * - List all tenants with subscription status
 * - Filter by plan, status, trial expiry
 * - Force plan changes, extend trials
 * - View detailed subscription info
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  MoreVertical,
  Edit,
  TrendingUp,
  Calendar,
  Users,
  ExternalLink,
  X,
  Save,
  Loader2,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TenantSubscription {
  id: string;
  tenantId: string;
  tenantName: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'BUSINESS' | 'ENTERPRISE';
  status: 'TRIAL' | 'ACTIVE' | 'GRACE_PERIOD' | 'SUSPENDED' | 'CANCELLED';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  daysUntilExpiry: number | null;
  userCount: number;
  userLimit: number;
  mrr: number;
  createdAt: string;
  lastPaymentDate: string | null;
  paymentFailures: number;
}

interface FilterState {
  search: string;
  plan: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PLAN_OPTIONS = [
  { value: '', label: 'All Plans' },
  { value: 'STARTER', label: 'Starter' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'GRACE_PERIOD', label: 'Grace Period' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PLAN_COLORS: Record<string, string> = {
  STARTER: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-violet-100 text-violet-700',
  BUSINESS: 'bg-amber-100 text-amber-700',
  ENTERPRISE: 'bg-emerald-100 text-emerald-700',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  TRIAL: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  GRACE_PERIOD: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
  SUSPENDED: { bg: 'bg-red-100', text: 'text-red-700', icon: Pause },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-700', icon: XCircle },
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Subscription Row Component
function TenantRow({
  subscription,
  onAction,
}: {
  subscription: TenantSubscription;
  onAction: (action: string, tenant: TenantSubscription) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const statusConfig = STATUS_COLORS[subscription.status];
  const StatusIcon = statusConfig.icon;

  return (
    <tr className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{subscription.tenantName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">ID: {subscription.tenantId}</p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[subscription.plan]}`}>
          {subscription.plan}
        </span>
      </td>
      <td className="py-4 px-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {subscription.status.replace('_', ' ')}
        </span>
        {subscription.status === 'TRIAL' && subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry <= 7 && (
          <p className="text-xs text-amber-600 mt-1">
            {subscription.daysUntilExpiry} days left
          </p>
        )}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 dark:text-white">
            {subscription.userCount} / {subscription.userLimit === Infinity ? '∞' : subscription.userLimit}
          </span>
        </div>
      </td>
      <td className="py-4 px-4">
        <p className="text-gray-900 dark:text-white font-medium">
          ₹{subscription.mrr.toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-gray-500">{subscription.billingCycle}</p>
      </td>
      <td className="py-4 px-4">
        <p className="text-gray-900 dark:text-white">
          {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN')}
        </p>
        {subscription.paymentFailures > 0 && (
          <p className="text-xs text-red-600">
            {subscription.paymentFailures} failed payment{subscription.paymentFailures !== 1 ? 's' : ''}
          </p>
        )}
      </td>
      <td className="py-4 px-4 relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <MoreVertical className="w-5 h-5 text-gray-500" />
        </button>
        <AnimatePresence>
          {showActions && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowActions(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-20 py-1"
              >
                <button
                  onClick={() => {
                    onAction('view', subscription);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Details
                </button>
                <button
                  onClick={() => {
                    onAction('edit', subscription);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Subscription
                </button>
                {subscription.status === 'TRIAL' && (
                  <button
                    onClick={() => {
                      onAction('extend_trial', subscription);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Extend Trial
                  </button>
                )}
                <button
                  onClick={() => {
                    onAction('change_plan', subscription);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Change Plan
                </button>
                {subscription.status === 'SUSPENDED' ? (
                  <button
                    onClick={() => {
                      onAction('reactivate', subscription);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Reactivate
                  </button>
                ) : subscription.status !== 'CANCELLED' ? (
                  <button
                    onClick={() => {
                      onAction('suspend', subscription);
                      setShowActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Suspend
                  </button>
                ) : null}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
}

// Action Modal Component
function ActionModal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function TenantSubscriptionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    plan: searchParams?.get('plan') || '',
    status: searchParams?.get('filter') === 'trial_expiring' ? 'TRIAL' : searchParams?.get('filter') === 'suspended' ? 'SUSPENDED' : searchParams?.get('status') || '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: string;
    tenant: TenantSubscription | null;
  }>({ isOpen: false, action: '', tenant: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.plan) params.set('plan', filters.plan);
      if (filters.status) params.set('status', filters.status);
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/super-admin/subscriptions/tenants?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setSubscriptions(data.subscriptions || []);
    } catch {
      console.error('Error fetching subscriptions');
      // Mock data for development
      setSubscriptions([
        {
          id: '1',
          tenantId: 'tenant-001',
          tenantName: 'Acme Corporation',
          plan: 'BUSINESS',
          status: 'ACTIVE',
          billingCycle: 'monthly',
          currentPeriodStart: new Date(Date.now() - 15 * 86400000).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 15 * 86400000).toISOString(),
          trialEndsAt: null,
          daysUntilExpiry: 15,
          userCount: 45,
          userLimit: 100,
          mrr: 24999,
          createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
          lastPaymentDate: new Date(Date.now() - 15 * 86400000).toISOString(),
          paymentFailures: 0,
        },
        {
          id: '2',
          tenantId: 'tenant-002',
          tenantName: 'TechStart Inc',
          plan: 'PROFESSIONAL',
          status: 'TRIAL',
          billingCycle: 'monthly',
          currentPeriodStart: new Date(Date.now() - 7 * 86400000).toISOString(),
          currentPeriodEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
          trialEndsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          daysUntilExpiry: 7,
          userCount: 8,
          userLimit: 25,
          mrr: 0,
          createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          lastPaymentDate: null,
          paymentFailures: 0,
        },
        {
          id: '3',
          tenantId: 'tenant-003',
          tenantName: 'Global Traders',
          plan: 'STARTER',
          status: 'GRACE_PERIOD',
          billingCycle: 'yearly',
          currentPeriodStart: new Date(Date.now() - 365 * 86400000).toISOString(),
          currentPeriodEnd: new Date(Date.now() - 5 * 86400000).toISOString(),
          trialEndsAt: null,
          daysUntilExpiry: -5,
          userCount: 4,
          userLimit: 5,
          mrr: 2399,
          createdAt: new Date(Date.now() - 400 * 86400000).toISOString(),
          lastPaymentDate: new Date(Date.now() - 365 * 86400000).toISOString(),
          paymentFailures: 2,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Handle actions
  const handleAction = useCallback((action: string, tenant: TenantSubscription) => {
    if (action === 'view') {
      router.push(`/super-admin/subscriptions/tenants/${tenant.tenantId}`);
      return;
    }
    setModalState({ isOpen: true, action, tenant });
  }, [router]);

  // Execute action
  const executeAction = useCallback(async (data: Record<string, unknown>) => {
    if (!modalState.tenant) return;
    setActionLoading(true);

    try {
      const endpoint = `/api/super-admin/subscriptions/tenants/${modalState.tenant.tenantId}/${modalState.action}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Action failed');

      setModalState({ isOpen: false, action: '', tenant: null });
      fetchSubscriptions();
    } catch (err) {
      console.error('Action error:', err);
      alert('Failed to perform action');
    } finally {
      setActionLoading(false);
    }
  }, [modalState, fetchSubscriptions]);

  // Render modal content based on action
  const renderModalContent = () => {
    if (!modalState.tenant) return null;

    switch (modalState.action) {
      case 'extend_trial':
        return (
          <ExtendTrialForm
            tenant={modalState.tenant}
            onSubmit={(days) => executeAction({ days })}
            loading={actionLoading}
          />
        );
      case 'change_plan':
        return (
          <ChangePlanForm
            tenant={modalState.tenant}
            onSubmit={(plan) => executeAction({ newPlan: plan })}
            loading={actionLoading}
          />
        );
      case 'suspend':
        return (
          <ConfirmAction
            message={`Are you sure you want to suspend ${modalState.tenant.tenantName}? They will lose access to all features.`}
            confirmLabel="Suspend Account"
            confirmColor="bg-red-600 hover:bg-red-700"
            onConfirm={() => executeAction({ reason: 'Admin suspension' })}
            loading={actionLoading}
          />
        );
      case 'reactivate':
        return (
          <ConfirmAction
            message={`Reactivate ${modalState.tenant.tenantName}'s subscription?`}
            confirmLabel="Reactivate"
            confirmColor="bg-emerald-600 hover:bg-emerald-700"
            onConfirm={() => executeAction({})}
            loading={actionLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tenant Subscriptions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage subscription status for all tenants
          </p>
        </div>
        <button
          onClick={() => fetchSubscriptions()}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant name or ID..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 dark:text-gray-300">Filters</span>
            {showFilters ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plan
                  </label>
                  <select
                    value={filters.plan}
                    onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    {PLAN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sort By
                  </label>
                  <select
                    value={`${filters.sortBy}-${filters.sortOrder}`}
                    onChange={(e) => {
                      const [sortBy, sortOrder] = e.target.value.split('-');
                      setFilters({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                    }}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="mrr-desc">MRR (High to Low)</option>
                    <option value="mrr-asc">MRR (Low to High)</option>
                    <option value="tenantName-asc">Name (A-Z)</option>
                    <option value="tenantName-desc">Name (Z-A)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Tenant</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Plan</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Users</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">MRR</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Next Billing</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <TenantRow key={sub.id} subscription={sub} onAction={handleAction} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <ActionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, action: '', tenant: null })}
        title={
          modalState.action === 'extend_trial' ? 'Extend Trial Period' :
          modalState.action === 'change_plan' ? 'Change Subscription Plan' :
          modalState.action === 'suspend' ? 'Suspend Account' :
          modalState.action === 'reactivate' ? 'Reactivate Account' :
          'Action'
        }
      >
        {renderModalContent()}
      </ActionModal>
    </div>
  );
}

// ============================================================================
// FORM COMPONENTS
// ============================================================================

function ExtendTrialForm({
  tenant,
  onSubmit,
  loading,
}: {
  tenant: TenantSubscription;
  onSubmit: (days: number) => void;
  loading: boolean;
}) {
  const [days, setDays] = useState(7);

  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400">
        Extend the trial period for <strong>{tenant.tenantName}</strong>.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Extension (days)
        </label>
        <input
          type="number"
          min="1"
          max="30"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value) || 7)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button
          disabled={loading}
          onClick={() => onSubmit(days)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Extend by {days} days
        </button>
      </div>
    </div>
  );
}

function ChangePlanForm({
  tenant,
  onSubmit,
  loading,
}: {
  tenant: TenantSubscription;
  onSubmit: (plan: string) => void;
  loading: boolean;
}) {
  const [selectedPlan, setSelectedPlan] = useState<string>(tenant.plan);

  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400">
        Change the subscription plan for <strong>{tenant.tenantName}</strong>.
        Current plan: <span className="font-medium">{tenant.plan}</span>
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          New Plan
        </label>
        <select
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
        >
          {PLAN_OPTIONS.filter((p) => p.value).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button
          disabled={loading || selectedPlan === tenant.plan}
          onClick={() => onSubmit(selectedPlan)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Change Plan
        </button>
      </div>
    </div>
  );
}

function ConfirmAction({
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  loading,
}: {
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
      <div className="flex justify-end gap-3 pt-4">
        <button
          disabled={loading}
          onClick={onConfirm}
          className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${confirmColor}`}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
