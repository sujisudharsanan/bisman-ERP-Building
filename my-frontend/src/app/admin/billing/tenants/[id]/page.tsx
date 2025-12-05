'use client';

/**
 * Billing Admin Console - Tenant Billing Management
 * BISMAN ERP - Full Admin Control for Tenant Billing
 *
 * Features:
 * - View Stripe customer ID and subscription details
 * - Force invoice generation
 * - Issue credits/adjustments
 * - Manual plan changes
 * - Webhook history viewer
 * - Billing override controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  DollarSign,
  FileText,
  Settings,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Plus,
  Minus,
  ExternalLink,
  Clock,
  History,
  Zap,
  Shield,
  Ban,
  Activity,
  Send,
  Eye,
  Edit2,
  X,
  ChevronRight,
  Building,
  Globe,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TenantBilling {
  tenant: {
    id: string;
    name: string;
    slug: string;
    email: string;
    createdAt: string;
  };
  stripe: {
    customerId: string | null;
    subscriptionId: string | null;
    paymentMethodId: string | null;
  };
  subscription: {
    plan: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
    quantity: number;
  };
  billing: {
    balance: number;
    creditBalance: number;
    totalPaid: number;
    totalInvoices: number;
    failedPayments: number;
    lastPaymentDate: string | null;
    nextInvoiceDate: string | null;
    nextInvoiceAmount: number;
  };
  paymentMethod: {
    type: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  usage: {
    users: { used: number; limit: number };
    storage: { used: number; limit: number };
    apiCalls: { used: number; limit: number };
  };
  recentInvoices: {
    id: string;
    number: string;
    date: string;
    amount: number;
    status: string;
    pdfUrl: string | null;
  }[];
  webhookEvents: {
    id: string;
    type: string;
    timestamp: string;
    status: 'succeeded' | 'failed';
    data: Record<string, any>;
  }[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'paid':
    case 'succeeded':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    case 'trialing':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    case 'past_due':
    case 'failed':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    case 'canceled':
    case 'unpaid':
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400';
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Tenant Header Card
function TenantHeaderCard({ tenant, stripe }: { tenant: TenantBilling['tenant']; stripe: TenantBilling['stripe'] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 mb-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Building className="w-8 h-8 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{tenant.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.email}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Created: {formatDate(tenant.createdAt)}
            </p>
          </div>
        </div>
        <div className="text-right">
          {stripe.customerId && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Stripe Customer ID</p>
              <a
                href={`https://dashboard.stripe.com/customers/${stripe.customerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 justify-end"
              >
                {stripe.customerId}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {stripe.subscriptionId && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Subscription ID</p>
              <a
                href={`https://dashboard.stripe.com/subscriptions/${stripe.subscriptionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 justify-end"
              >
                {stripe.subscriptionId}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Subscription Status Card
function SubscriptionStatusCard({
  subscription,
  onChangePlan,
  onCancelSubscription,
  onReactivate,
}: {
  subscription: TenantBilling['subscription'];
  onChangePlan: () => void;
  onCancelSubscription: () => void;
  onReactivate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-violet-500" />
          Subscription
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
          {subscription.status === 'trialing' ? 'Trial' : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <span className="text-gray-600 dark:text-gray-400">Current Plan</span>
          <span className="font-semibold text-gray-900 dark:text-white capitalize">{subscription.plan}</span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <span className="text-gray-600 dark:text-gray-400">Current Period</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}
          </span>
        </div>

        {subscription.trialEnd && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <span className="text-blue-700 dark:text-blue-400">Trial Ends</span>
            <span className="font-medium text-blue-700 dark:text-blue-400">
              {formatDate(subscription.trialEnd)}
            </span>
          </div>
        )}

        {subscription.cancelAtPeriodEnd && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Scheduled for cancellation</span>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Subscription will end on {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <span className="text-gray-600 dark:text-gray-400">Seats</span>
          <span className="font-medium text-gray-900 dark:text-white">{subscription.quantity}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onChangePlan}
          className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Change Plan
        </button>
        {subscription.cancelAtPeriodEnd ? (
          <button
            onClick={onReactivate}
            className="flex-1 px-4 py-2 rounded-lg border border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reactivate
          </button>
        ) : subscription.status !== 'canceled' ? (
          <button
            onClick={onCancelSubscription}
            className="flex-1 px-4 py-2 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium flex items-center justify-center gap-2"
          >
            <Ban className="w-4 h-4" />
            Cancel
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

// Billing Summary Card
function BillingSummaryCard({
  billing,
  paymentMethod,
  onIssueCredit,
  onForceInvoice,
}: {
  billing: TenantBilling['billing'];
  paymentMethod: TenantBilling['paymentMethod'];
  onIssueCredit: () => void;
  onForceInvoice: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-violet-500" />
        Billing Summary
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Paid</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(billing.totalPaid)}</p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Credit Balance</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(billing.creditBalance)}</p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding Balance</p>
          <p className={`text-xl font-bold ${billing.balance > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {formatCurrency(billing.balance)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Failed Payments</p>
          <p className={`text-xl font-bold ${billing.failedPayments > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {billing.failedPayments}
          </p>
        </div>
      </div>

      {/* Payment Method */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</p>
        {paymentMethod ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {paymentMethod.brand} •••• {paymentMethod.last4}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm">
            No payment method on file
          </div>
        )}
      </div>

      {/* Next Invoice */}
      <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-violet-700 dark:text-violet-400">Next Invoice</span>
          <span className="font-semibold text-violet-700 dark:text-violet-400">
            {formatCurrency(billing.nextInvoiceAmount)}
          </span>
        </div>
        {billing.nextInvoiceDate && (
          <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
            Due: {formatDate(billing.nextInvoiceDate)}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onIssueCredit}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium flex items-center justify-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Issue Credit
        </button>
        <button
          onClick={onForceInvoice}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium flex items-center justify-center gap-1"
        >
          <FileText className="w-4 h-4" />
          Force Invoice
        </button>
      </div>
    </motion.div>
  );
}

// Usage Card
function UsageCard({ usage }: { usage: TenantBilling['usage'] }) {
  const metrics: Array<{
    name: string;
    used: number;
    limit: number;
    unit?: string;
    icon: React.ElementType;
    color: string;
  }> = [
    { name: 'Users', ...usage.users, icon: Users, color: '#8b5cf6' },
    { name: 'Storage', ...usage.storage, unit: 'GB', icon: Activity, color: '#06b6d4' },
    { name: 'API Calls', ...usage.apiCalls, icon: Zap, color: '#22c55e' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-violet-500" />
        Current Usage
      </h3>

      <div className="space-y-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const percentage = metric.limit > 0 ? (metric.used / metric.limit) * 100 : 0;
          const isOverage = percentage > 100;

          return (
            <div key={metric.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: metric.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{metric.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {metric.used.toLocaleString()}{metric.unit ? ` ${metric.unit}` : ''} / {metric.limit === -1 ? '∞' : metric.limit.toLocaleString()}{metric.unit ? ` ${metric.unit}` : ''}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isOverage ? 'bg-red-500' : ''}`}
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor: !isOverage ? metric.color : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Recent Invoices Card
function RecentInvoicesCard({ invoices }: { invoices: TenantBilling['recentInvoices'] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-violet-500" />
        Recent Invoices
      </h3>

      {invoices.length > 0 ? (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{inv.number}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(inv.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                  {inv.status}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(inv.amount)}</span>
                {inv.pdfUrl && (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No invoices yet</p>
        </div>
      )}
    </motion.div>
  );
}

// Webhook Events Card
function WebhookEventsCard({ events }: { events: TenantBilling['webhookEvents'] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-violet-500" />
        Webhook History
      </h3>

      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  {event.status === 'succeeded' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <div className="text-left">
                    <p className="font-mono text-sm text-gray-900 dark:text-white">{event.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(event.timestamp)}</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded === event.id ? 'rotate-90' : ''}`} />
              </button>
              {expanded === event.id && (
                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-200 dark:border-slate-600">
                  <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No webhook events</p>
        </div>
      )}
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TenantBillingAdminPage() {
  const params = useParams();
  const tenantId = params?.id as string || '';
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [billingData, setBillingData] = useState<TenantBilling | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchBillingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${baseURL}/api/admin/billing/tenants/${tenantId}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setBillingData(data);
      } else {
        generateDemoData();
      }
    } catch {
      generateDemoData();
    } finally {
      setIsLoading(false);
    }
  }, [baseURL, tenantId]);

  const generateDemoData = () => {
    setBillingData({
      tenant: {
        id: tenantId,
        name: 'Acme Corporation',
        slug: 'acme-corp',
        email: 'billing@acme.com',
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      },
      stripe: {
        customerId: 'cus_' + Math.random().toString(36).substring(7),
        subscriptionId: 'sub_' + Math.random().toString(36).substring(7),
        paymentMethodId: 'pm_' + Math.random().toString(36).substring(7),
      },
      subscription: {
        plan: 'pro',
        status: 'active',
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        trialEnd: null,
        quantity: 10,
      },
      billing: {
        balance: 0,
        creditBalance: 50,
        totalPaid: 594,
        totalInvoices: 6,
        failedPayments: 0,
        lastPaymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        nextInvoiceDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        nextInvoiceAmount: 79,
      },
      paymentMethod: {
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2026,
      },
      usage: {
        users: { used: 12, limit: 50 },
        storage: { used: 45, limit: 100 },
        apiCalls: { used: 67500, limit: 100000 },
      },
      recentInvoices: [
        { id: 'inv_1', number: 'INV-2024-006', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), amount: 79, status: 'paid', pdfUrl: '#' },
        { id: 'inv_2', number: 'INV-2024-005', date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), amount: 79, status: 'paid', pdfUrl: '#' },
        { id: 'inv_3', number: 'INV-2024-004', date: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(), amount: 79, status: 'paid', pdfUrl: '#' },
      ],
      webhookEvents: [
        { id: 'evt_1', type: 'invoice.paid', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), status: 'succeeded', data: { invoice_id: 'inv_1', amount: 7900 } },
        { id: 'evt_2', type: 'customer.subscription.updated', timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), status: 'succeeded', data: { plan: 'pro', quantity: 10 } },
        { id: 'evt_3', type: 'payment_method.attached', timestamp: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), status: 'succeeded', data: { type: 'card', last4: '4242' } },
      ],
    });
  };

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleIssueCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await fetch(`${baseURL}/api/admin/billing/tenants/${tenantId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount, reason: creditReason }),
      });
      fetchBillingData();
    } catch (error) {
      console.error('Failed to issue credit:', error);
    }
    setShowCreditModal(false);
    setCreditAmount('');
    setCreditReason('');
  };

  const handleForceInvoice = async () => {
    if (!confirm('Are you sure you want to generate an invoice now?')) return;
    try {
      await fetch(`${baseURL}/api/admin/billing/tenants/${tenantId}/invoice`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchBillingData();
    } catch (error) {
      console.error('Failed to force invoice:', error);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;
    try {
      await fetch(`${baseURL}/api/admin/billing/tenants/${tenantId}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ plan: selectedPlan }),
      });
      fetchBillingData();
    } catch (error) {
      console.error('Failed to change plan:', error);
    }
    setShowPlanModal(false);
    setSelectedPlan('');
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    try {
      await fetch(`${baseURL}/api/admin/billing/tenants/${tenantId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchBillingData();
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  const handleReactivate = async () => {
    try {
      await fetch(`${baseURL}/api/admin/billing/tenants/${tenantId}/reactivate`, {
        method: 'POST',
        credentials: 'include',
      });
      fetchBillingData();
    } catch (error) {
      console.error('Failed to reactivate:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading tenant billing...</p>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Tenant Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Unable to load billing information for this tenant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin/billing"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-violet-500" />
              Billing Admin Console
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage billing for tenant: {billingData.tenant.name}
            </p>
          </div>
        </div>

        {/* Tenant Header */}
        <TenantHeaderCard tenant={billingData.tenant} stripe={billingData.stripe} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SubscriptionStatusCard
            subscription={billingData.subscription}
            onChangePlan={() => setShowPlanModal(true)}
            onCancelSubscription={handleCancelSubscription}
            onReactivate={handleReactivate}
          />
          <BillingSummaryCard
            billing={billingData.billing}
            paymentMethod={billingData.paymentMethod}
            onIssueCredit={() => setShowCreditModal(true)}
            onForceInvoice={handleForceInvoice}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <UsageCard usage={billingData.usage} />
          <RecentInvoicesCard invoices={billingData.recentInvoices} />
          <WebhookEventsCard events={billingData.webhookEvents} />
        </div>

        {/* Issue Credit Modal */}
        <AnimatePresence>
          <ActionModal
            isOpen={showCreditModal}
            onClose={() => setShowCreditModal(false)}
            title="Issue Credit"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Credit Amount (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white"
                  placeholder="Reason for credit..."
                />
              </div>
              <button
                onClick={handleIssueCredit}
                disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50"
              >
                Issue Credit
              </button>
            </div>
          </ActionModal>
        </AnimatePresence>

        {/* Change Plan Modal */}
        <AnimatePresence>
          <ActionModal
            isOpen={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            title="Change Plan"
          >
            <div className="space-y-4">
              {['free', 'starter', 'pro', 'enterprise'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedPlan === plan
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">{plan}</p>
                  {billingData?.subscription.plan === plan && (
                    <span className="text-xs text-violet-600 dark:text-violet-400">Current Plan</span>
                  )}
                </button>
              ))}
              <button
                onClick={handleChangePlan}
                disabled={!selectedPlan || selectedPlan === billingData?.subscription.plan}
                className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-50"
              >
                Change to {selectedPlan || '...'} Plan
              </button>
            </div>
          </ActionModal>
        </AnimatePresence>
      </div>
    </div>
  );
}
