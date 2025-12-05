'use client';

/**
 * Billing & Subscription Management Page
 * BISMAN ERP - Stripe Integration
 *
 * Features:
 * - Current subscription plan display
 * - Plan pricing and renewal date
 * - Trial expiry countdown
 * - Upgrade/downgrade with Stripe Checkout
 * - Billing history and invoices
 * - Customer portal access
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Check,
  X,
  AlertTriangle,
  Clock,
  Download,
  ExternalLink,
  RefreshCw,
  Zap,
  Building,
  Users,
  HardDrive,
  Shield,
  Star,
  ArrowRight,
  Calendar,
  Receipt,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { usePageRefresh } from '@/contexts/RefreshContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PlanQuotas {
  apiCallsPerMinute: number;
  apiCallsPerDay: number;
  storageLimitBytes: number;
  maxUsers: number;
}

interface Plan {
  id: string;
  name: string;
  quotas: PlanQuotas;
  price?: number;
  interval?: 'month' | 'year';
  features?: string[];
}

interface SubscriptionStatus {
  plan: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  quotas: PlanQuotas;
}

interface Invoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amount: number;
  currency: string;
  created: string;
  dueDate?: string;
  paidAt?: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

// Plan pricing (display only - actual prices from Stripe)
const PLAN_DETAILS: Record<string, { price: number; features: string[] }> = {
  free: {
    price: 0,
    features: [
      '3 team members',
      '5,000 API calls/day',
      '1 GB storage',
      'Email support',
      'Basic analytics',
    ],
  },
  pro: {
    price: 49,
    features: [
      '25 team members',
      '50,000 API calls/day',
      '10 GB storage',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
    ],
  },
  enterprise: {
    price: 199,
    features: [
      'Unlimited team members',
      '500,000 API calls/day',
      '100 GB storage',
      'Dedicated support',
      'Enterprise analytics',
      'SSO/SAML',
      'Custom SLA',
      'On-premise option',
    ],
  },
  trial: {
    price: 0,
    features: [
      'All Pro features',
      '14-day free trial',
      'No credit card required',
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${bytes} B`;
}

function formatNumber(num: number): string {
  if (num < 0) return 'Unlimited';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

function getDaysRemaining(dateStr: string): number {
  const now = new Date();
  const end = new Date(dateStr);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return COLORS.success;
    case 'trialing':
      return COLORS.info;
    case 'past_due':
    case 'unpaid':
      return COLORS.danger;
    case 'canceled':
      return COLORS.warning;
    default:
      return COLORS.primary;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial';
    case 'past_due':
      return 'Past Due';
    case 'unpaid':
      return 'Unpaid';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Trial countdown banner
function TrialBanner({ trialEnd }: { trialEnd: string }) {
  const daysRemaining = getDaysRemaining(trialEnd);
  const isUrgent = daysRemaining <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg p-4 mb-6 flex items-center justify-between ${
        isUrgent
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
        <div>
          <p className={`font-medium ${isUrgent ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'}`}>
            {daysRemaining === 0
              ? 'Your trial ends today!'
              : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining in your trial`}
          </p>
          <p className={`text-sm ${isUrgent ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
            Trial expires on {formatDate(trialEnd)}
          </p>
        </div>
      </div>
      <a
        href="#plans"
        className={`px-4 py-2 rounded-lg font-medium text-white ${
          isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        Upgrade Now
      </a>
    </motion.div>
  );
}

// Past due warning banner
function PastDueBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600" />
        <div>
          <p className="font-medium text-red-800 dark:text-red-300">Payment Past Due</p>
          <p className="text-sm text-red-700 dark:text-red-400">
            Please update your payment method to avoid service interruption.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Current subscription card
function CurrentPlanCard({
  subscription,
  onManage,
  isLoading,
}: {
  subscription: SubscriptionStatus;
  onManage: () => void;
  isLoading: boolean;
}) {
  const planDetails = PLAN_DETAILS[subscription.plan] || PLAN_DETAILS.free;
  const daysUntilRenewal = getDaysRemaining(subscription.currentPeriodEnd);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg p-6 text-white"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Current Plan</h2>
            <p className="text-white/80 text-sm">Your active subscription</p>
          </div>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium bg-white/20"
        >
          {getStatusLabel(subscription.status)}
        </span>
      </div>

      <div className="mb-6">
        <p className="text-4xl font-bold capitalize mb-1">{subscription.plan}</p>
        <p className="text-white/80">
          {planDetails.price === 0 ? 'Free' : `$${planDetails.price}/month`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-white/70 mb-1">Renewal Date</p>
          <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
          <p className="text-white/70 text-xs">{daysUntilRenewal} days remaining</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-white/70 mb-1">Billing Cycle</p>
          <p className="font-medium">Monthly</p>
          <p className="text-white/70 text-xs">Auto-renew enabled</p>
        </div>
      </div>

      {subscription.cancelAtPeriodEnd && (
        <div className="bg-white/10 rounded-lg p-3 mb-4">
          <p className="text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Cancels on {formatDate(subscription.currentPeriodEnd)}
          </p>
        </div>
      )}

      <button
        onClick={onManage}
        disabled={isLoading}
        className="w-full py-3 bg-white text-violet-600 font-medium rounded-lg hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Manage Subscription <ExternalLink className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.div>
  );
}

// Plan quotas display
function QuotasCard({ quotas }: { quotas: PlanQuotas }) {
  const items = [
    { icon: Users, label: 'Team Members', value: quotas.maxUsers < 0 ? 'Unlimited' : quotas.maxUsers },
    { icon: Zap, label: 'API Calls/Day', value: formatNumber(quotas.apiCallsPerDay) },
    { icon: HardDrive, label: 'Storage', value: formatBytes(quotas.storageLimitBytes) },
    { icon: Clock, label: 'API Rate', value: `${quotas.apiCallsPerMinute}/min` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-violet-500" />
        Plan Quotas
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
              <item.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.label}</p>
              <p className="font-medium text-gray-900 dark:text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Plan comparison card
function PlanCard({
  plan,
  currentPlan,
  onSelect,
  isLoading,
}: {
  plan: Plan;
  currentPlan: string;
  onSelect: (planId: string) => void;
  isLoading: boolean;
}) {
  const details = PLAN_DETAILS[plan.id] || { price: 0, features: [] };
  const isCurrent = plan.id === currentPlan;
  const isUpgrade = getPlanTier(plan.id) > getPlanTier(currentPlan);
  const isDowngrade = getPlanTier(plan.id) < getPlanTier(currentPlan);
  const isPopular = plan.id === 'pro';

  function getPlanTier(planId: string): number {
    const tiers: Record<string, number> = { free: 0, trial: 1, pro: 2, enterprise: 3 };
    return tiers[planId] || 0;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 p-6 ${
        isCurrent
          ? 'border-violet-500'
          : isPopular
          ? 'border-violet-300 dark:border-violet-700'
          : 'border-gray-200 dark:border-slate-700'
      }`}
    >
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-violet-500 text-white text-xs font-medium rounded-full">
            Most Popular
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
            Current Plan
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white capitalize mb-2">
          {plan.name}
        </h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            ${details.price}
          </span>
          <span className="text-gray-500 dark:text-gray-400">/month</span>
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {details.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent || isLoading || plan.id === 'trial'}
        className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
          isCurrent
            ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            : plan.id === 'trial'
            ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
            : isUpgrade
            ? 'bg-violet-600 hover:bg-violet-700 text-white'
            : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white'
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isCurrent ? (
          'Current Plan'
        ) : plan.id === 'trial' ? (
          'Trial Only'
        ) : isUpgrade ? (
          <>
            Upgrade <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          'Downgrade'
        )}
      </button>
    </motion.div>
  );
}

// Invoice history
function InvoiceHistory({
  invoices,
  isLoading,
}: {
  invoices: Invoice[];
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayedInvoices = expanded ? invoices : invoices.slice(0, 3);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-violet-500" />
          Billing History
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (invoices.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-violet-500" />
          Billing History
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No invoices yet
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-violet-500" />
        Billing History
      </h3>

      <div className="space-y-3">
        <AnimatePresence>
          {displayedInvoices.map((invoice) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-200 dark:bg-slate-600 rounded-lg">
                  <Receipt className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Invoice #{invoice.number}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(invoice.created)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      invoice.status === 'paid'
                        ? 'text-green-600'
                        : invoice.status === 'open'
                        ? 'text-blue-600'
                        : 'text-red-600'
                    }`}
                  >
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
                {invoice.invoicePdf && (
                  <a
                    href={invoice.invoicePdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {invoices.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-2 text-sm text-violet-600 dark:text-violet-400 hover:underline flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              Show Less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show All ({invoices.length}) <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch billing data
  const fetchBillingData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

      // Fetch subscription status and plans
      const [statusRes, plansRes] = await Promise.all([
        fetch(`${baseURL}/api/billing/status`, { credentials: 'include' }),
        fetch(`${baseURL}/api/billing/plans`, { credentials: 'include' }),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setSubscription(data);

        // Mock invoices for now (would come from Stripe API)
        setInvoices([
          {
            id: 'inv_001',
            number: 'INV-2024-001',
            status: 'paid',
            amount: 4900,
            currency: 'usd',
            created: '2024-11-01T00:00:00Z',
            paidAt: '2024-11-01T00:00:00Z',
            invoicePdf: '#',
          },
          {
            id: 'inv_002',
            number: 'INV-2024-002',
            status: 'paid',
            amount: 4900,
            currency: 'usd',
            created: '2024-10-01T00:00:00Z',
            paidAt: '2024-10-01T00:00:00Z',
            invoicePdf: '#',
          },
          {
            id: 'inv_003',
            number: 'INV-2024-003',
            status: 'paid',
            amount: 4900,
            currency: 'usd',
            created: '2024-09-01T00:00:00Z',
            paidAt: '2024-09-01T00:00:00Z',
            invoicePdf: '#',
          },
        ]);
      } else {
        // Default subscription for demo
        setSubscription({
          plan: 'pro',
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          quotas: {
            apiCallsPerMinute: 300,
            apiCallsPerDay: 50000,
            storageLimitBytes: 10 * 1024 * 1024 * 1024,
            maxUsers: 25,
          },
        });
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      } else {
        // Default plans for demo
        setPlans([
          { id: 'free', name: 'Free', quotas: { apiCallsPerMinute: 60, apiCallsPerDay: 5000, storageLimitBytes: 1073741824, maxUsers: 3 } },
          { id: 'pro', name: 'Pro', quotas: { apiCallsPerMinute: 300, apiCallsPerDay: 50000, storageLimitBytes: 10737418240, maxUsers: 25 } },
          { id: 'enterprise', name: 'Enterprise', quotas: { apiCallsPerMinute: 1000, apiCallsPerDay: 500000, storageLimitBytes: 107374182400, maxUsers: -1 } },
        ]);
      }
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle plan selection
  const handlePlanSelect = async (planId: string) => {
    if (!subscription || planId === subscription.plan) return;

    setIsActionLoading(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/billing/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to start checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to start checkout process');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle manage subscription (Stripe portal)
  const handleManageSubscription = async () => {
    setIsActionLoading(true);
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/billing/portal`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to open billing portal');
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError('Failed to open billing portal');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Register refresh handler
  usePageRefresh('billing-page', fetchBillingData);

  // Initial fetch
  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Billing & Subscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your subscription, view invoices, and update payment methods
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Trial or past due banners */}
        {subscription?.status === 'trialing' && subscription.trialEnd && (
          <TrialBanner trialEnd={subscription.trialEnd} />
        )}
        {subscription?.status === 'past_due' && <PastDueBanner />}

        {/* Current plan and quotas */}
        {subscription && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <CurrentPlanCard
              subscription={subscription}
              onManage={handleManageSubscription}
              isLoading={isActionLoading}
            />
            <QuotasCard quotas={subscription.quotas} />
          </div>
        )}

        {/* Plan comparison */}
        <div id="plans" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Available Plans
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Choose the plan that fits your needs
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans
              .filter((p) => p.id !== 'trial')
              .map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlan={subscription?.plan || 'free'}
                  onSelect={handlePlanSelect}
                  isLoading={isActionLoading}
                />
              ))}
          </div>
        </div>

        {/* Invoice history */}
        <InvoiceHistory invoices={invoices} isLoading={isLoading} />
      </div>
    </div>
  );
}
